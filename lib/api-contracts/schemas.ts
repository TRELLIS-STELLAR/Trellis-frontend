/**
 * API Contract Schemas & Drift Detection Validators (Issue #39).
 * Defines required request/response shapes for Trellis frontend public endpoints.
 */

export interface ApiContractDefinition {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  description: string;
  authRequired: boolean;
  queryParams?: Record<string, { type: string; required: boolean; description: string }>;
  requestSchema?: Record<string, any>;
  responseSchema: Record<string, any>;
  errorResponses: Record<number, { code: string; message: string }>;
}

export const API_CONTRACTS: Record<string, ApiContractDefinition> = {
  'GET /api/affiliates': {
    path: '/api/affiliates',
    method: 'GET',
    description: 'Lists all available affiliate endpoints and documentation overview',
    authRequired: false,
    responseSchema: {
      type: 'object',
      required: ['message', 'endpoints'],
      properties: {
        message: { type: 'string' },
        endpoints: { type: 'object' },
      },
    },
    errorResponses: {
      500: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    },
  },
  'GET /api/affiliates/program': {
    path: '/api/affiliates/program',
    method: 'GET',
    description: 'Fetches affiliate program tier rules and commission structures',
    authRequired: false,
    responseSchema: {
      type: 'object',
      required: ['tiers', 'cookieDurationDays'],
      properties: {
        tiers: { type: 'array' },
        cookieDurationDays: { type: 'number' },
      },
    },
    errorResponses: {
      500: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    },
  },
  'GET /api/metrics/panels': {
    path: '/api/metrics/panels',
    method: 'GET',
    description: 'Lists all available metrics monitoring panels',
    authRequired: false,
    responseSchema: {
      type: 'object',
      required: ['source', 'panels'],
      properties: {
        source: { type: 'string' },
        panels: { type: 'array' },
      },
    },
    errorResponses: {
      500: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    },
  },
  'POST /api/import/dry-run': {
    path: '/api/import/dry-run',
    method: 'POST',
    description: 'Validates bulk import datasets without persistent writes',
    authRequired: false,
    queryParams: {
      entityType: { type: 'string', required: false, description: 'Target entity type' },
    },
    responseSchema: {
      type: 'object',
      required: ['success', 'dryRun', 'entityType', 'summary', 'rows'],
      properties: {
        success: { type: 'boolean' },
        dryRun: { type: 'boolean' },
        entityType: { type: 'string' },
        summary: { type: 'object' },
        rows: { type: 'array' },
      },
    },
    errorResponses: {
      422: { code: 'VALIDATION_FAILED', message: 'Input rows failed validation rules' },
      500: { code: 'INTERNAL_ERROR', message: 'Dry run processing error' },
    },
  },
};

/**
 * Validate that an object adheres to a contract schema specification.
 * Returns true if valid, or an array of error messages.
 */
export function validateContractSchema(data: any, schema: Record<string, any>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (schema.type === 'object') {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return { valid: false, errors: [`Expected object, got ${Array.isArray(data) ? 'array' : typeof data}`] };
    }

    if (schema.required && Array.isArray(schema.required)) {
      for (const reqKey of schema.required) {
        if (!(reqKey in data)) {
          errors.push(`Missing required field '${reqKey}'`);
        }
      }
    }

    if (schema.properties) {
      for (const [propKey, propSchema] of Object.entries<any>(schema.properties)) {
        if (propKey in data && data[propKey] !== undefined && data[propKey] !== null) {
          const val = data[propKey];
          if (propSchema.type === 'string' && typeof val !== 'string') {
            errors.push(`Field '${propKey}' expected string, got ${typeof val}`);
          }
          if (propSchema.type === 'number' && typeof val !== 'number') {
            errors.push(`Field '${propKey}' expected number, got ${typeof val}`);
          }
          if (propSchema.type === 'boolean' && typeof val !== 'boolean') {
            errors.push(`Field '${propKey}' expected boolean, got ${typeof val}`);
          }
          if (propSchema.type === 'array' && !Array.isArray(val)) {
            errors.push(`Field '${propKey}' expected array, got ${typeof val}`);
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
