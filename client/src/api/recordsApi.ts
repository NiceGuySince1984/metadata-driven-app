import type { SubmittedRecord, ValidationError } from '@shared/types';

const BASE = '/api';

export class ApiValidationError extends Error {
  constructor(public readonly errors: ValidationError[]) {
    super('Validation failed');
    this.name = 'ApiValidationError';
  }
}

export async function submitRecord(
  formId: string,
  data: Record<string, unknown>,
): Promise<SubmittedRecord> {
  const res = await fetch(`${BASE}/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ formId, data }),
  });

  if (res.status === 422) {
    const body = await res.json();
    throw new ApiValidationError(body.errors ?? []);
  }
  if (!res.ok) throw new Error(`Submit failed: ${res.status}`);
  return res.json();
}

export async function listRecords(formId: string): Promise<SubmittedRecord[]> {
  const res = await fetch(`${BASE}/records?formId=${encodeURIComponent(formId)}`);
  if (!res.ok) throw new Error(`Failed to fetch records: ${res.status}`);
  return res.json();
}
