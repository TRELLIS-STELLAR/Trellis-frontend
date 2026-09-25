import { runImportPipeline, importStore, ENTITY_SCHEMAS } from '@/lib/import/pipeline';
import { parseCSV } from '@/lib/import/csv-parser';

describe('Import Pipeline & Dry-Run Validation (Issue #37)', () => {
  beforeEach(() => {
    importStore.clear('agents');
    importStore.clear('test-cases');
    importStore.clear('general');
  });

  describe('CSV Parser', () => {
    it('parses valid CSV string with headers and types', () => {
      const csv = `id,name,description,price,active
ag-1,Test Agent,A valid test agent,100,true
ag-2,Second Agent,Another test agent,50.5,false`;

      const rows = parseCSV(csv);
      expect(rows.length).toBe(2);
      expect(rows[0]).toEqual({
        id: 'ag-1',
        name: 'Test Agent',
        description: 'A valid test agent',
        price: 100,
        active: true,
      });
      expect(rows[1].price).toBe(50.5);
      expect(rows[1].active).toBe(false);
    });

    it('handles quoted values with commas and newlines', () => {
      const csv = `id,name,description
ag-1,"Complex, Agent","Line 1
Line 2"`;
      const rows = parseCSV(csv);
      expect(rows.length).toBe(1);
      expect(rows[0].name).toBe('Complex, Agent');
      expect(rows[0].description).toBe('Line 1\nLine 2');
    });
  });

  describe('Dry-Run Validation', () => {
    it('performs dry-run with zero persistent writes', () => {
      const payload = [
        { id: 'ag-1', name: 'Alpha Agent', description: 'Alpha agent description' },
        { id: 'ag-2', name: 'Beta Agent', description: 'Beta agent description' },
      ];

      const result = runImportPipeline(payload, { entityType: 'agents', dryRun: true });

      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.summary.totalRows).toBe(2);
      expect(result.summary.createCount).toBe(2);
      expect(result.summary.validRows).toBe(2);
      expect(result.summary.errorCount).toBe(0);

      // Verify ZERO writes occurred in store
      expect(importStore.getAll('agents').length).toBe(0);
    });

    it('persists records when dryRun is false', () => {
      const payload = [
        { id: 'ag-1', name: 'Alpha Agent', description: 'Alpha agent description' },
      ];

      const result = runImportPipeline(payload, { entityType: 'agents', dryRun: false });

      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(false);
      expect(importStore.getAll('agents').length).toBe(1);
      expect(importStore.getExisting('agents', 'ag-1')?.name).toBe('Alpha Agent');
    });
  });

  describe('Validation & Invalid Row Handling', () => {
    it('detects missing required fields and type violations', () => {
      const payload = [
        { id: 'ag-1', name: '', description: 'No name' }, // missing name
        { id: 'ag-2', name: 'Valid Agent', description: 'Short' }, // description minLength check
      ];

      const result = runImportPipeline(payload, { entityType: 'agents', dryRun: true });

      expect(result.success).toBe(false);
      expect(result.summary.invalidRows).toBe(1); // ag-1 has missing name (required)
      expect(result.rows[0].valid).toBe(false);
      expect(result.rows[0].errors.some((e) => e.field === 'name')).toBe(true);
    });

    it('detects duplicate external IDs within the same batch', () => {
      const payload = [
        { id: 'dup-1', name: 'Agent One', description: 'Description one' },
        { id: 'dup-1', name: 'Agent Duplicate', description: 'Description two' },
      ];

      const result = runImportPipeline(payload, { entityType: 'agents', dryRun: true });

      expect(result.success).toBe(false);
      expect(result.summary.duplicateCount).toBe(1);
      expect(result.rows[1].valid).toBe(false);
      expect(result.rows[1].errors.some((e) => e.message.includes('Duplicate external ID'))).toBe(true);
    });
  });

  describe('Idempotency & Rollback Guidance', () => {
    it('is idempotent on repeated imports and supports update/skip', () => {
      // 1. Initial import
      runImportPipeline(
        [{ id: 'ag-10', name: 'Original Name', description: 'Initial description' }],
        { entityType: 'agents', dryRun: false }
      );

      expect(importStore.getExisting('agents', 'ag-10')?.name).toBe('Original Name');

      // 2. Re-import with allowUpdate: true
      const updateResult = runImportPipeline(
        [{ id: 'ag-10', name: 'Updated Name', description: 'Updated description' }],
        { entityType: 'agents', dryRun: false, allowUpdate: true }
      );

      expect(updateResult.summary.updateCount).toBe(1);
      expect(importStore.getExisting('agents', 'ag-10')?.name).toBe('Updated Name');

      // 3. Re-import with allowUpdate: false (skip)
      const skipResult = runImportPipeline(
        [{ id: 'ag-10', name: 'Ignored Name', description: 'Ignored description' }],
        { entityType: 'agents', dryRun: false, allowUpdate: false }
      );

      expect(skipResult.summary.skipCount).toBe(1);
      expect(importStore.getExisting('agents', 'ag-10')?.name).toBe('Updated Name');
    });

    it('generates compensation steps and rollback guidance', () => {
      const payload = [
        { id: 'rb-1', name: 'Rollback Agent 1', description: 'Valid desc 1' },
        { id: 'rb-2', name: 'Rollback Agent 2', description: 'Valid desc 2' },
      ];

      const result = runImportPipeline(payload, { entityType: 'agents', dryRun: true });

      expect(result.rollbackGuidance).toBeDefined();
      expect(result.rollbackGuidance?.rollbackSupported).toBe(true);
      expect(result.rollbackGuidance?.affectedExternalIds).toEqual(['rb-1', 'rb-2']);
      expect(result.rollbackGuidance?.compensationSteps.length).toBe(2);
      expect(result.rollbackGuidance?.compensationSteps[0].action).toBe('delete');
    });
  });
});
