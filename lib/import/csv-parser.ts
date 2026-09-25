/**
 * Robust RFC 4180-compliant CSV Parser for Trellis import pipeline.
 * Handles quoted cells, escaped quotes, multiline content, and automatic typed casting.
 */
export function parseCSV(content: string): Record<string, any>[] {
  const clean = content.trim();
  if (!clean) return [];

  const lines = splitCSVLines(clean);
  if (lines.length < 2) return [];

  const headers = parseCSVRow(lines[0]).map((h) => h.trim());
  const records: Record<string, any>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVRow(lines[i]);
    const row: Record<string, any> = {};

    headers.forEach((header, index) => {
      const rawVal = values[index] !== undefined ? values[index].trim() : '';
      row[header] = autoCastValue(rawVal);
    });

    records.push(row);
  }

  return records;
}

function splitCSVLines(text: string): string[] {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if ((char === '\n' || (char === '\r' && text[i + 1] === '\n')) && !inQuotes) {
      if (char === '\r') i++;
      lines.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function parseCSVRow(rowText: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < rowText.length; i++) {
    const char = rowText[i];

    if (char === '"') {
      if (inQuotes && rowText[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells;
}

function autoCastValue(val: string): any {
  if (val === '') return '';
  if (val.toLowerCase() === 'true') return true;
  if (val.toLowerCase() === 'false') return false;
  if (val.toLowerCase() === 'null') return null;
  if (!isNaN(Number(val)) && !val.startsWith('0x') && !(val.startsWith('0') && val.length > 1 && !val.includes('.'))) {
    return Number(val);
  }
  if ((val.startsWith('{') && val.endsWith('}')) || (val.startsWith('[') && val.endsWith(']'))) {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
}
