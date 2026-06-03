import { v4 as uuid } from 'uuid';
import db from '../db/client';
import * as audit from './auditRepo';
import type { SubmittedRecord } from '../../../shared/types';

function toRecord(row: Record<string, unknown>): SubmittedRecord {
  return {
    id:            row.id as string,
    formId:        row.form_id as string,
    formVersion:   row.form_version as number,
    applicationId: row.application_id as string,
    submittedAt:   row.submitted_at as string,
    data:          JSON.parse(row.data as string || '{}'),
  };
}

export function createRecord(data: {
  formId: string;
  formVersion: number;
  applicationId: string;
  data: Record<string, unknown>;
}): SubmittedRecord {
  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO records (id, form_id, form_version, application_id, submitted_at, data)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, data.formId, data.formVersion, data.applicationId, now, JSON.stringify(data.data));

  const record = getRecord(id)!;
  audit.log('create', 'record', id, null, record as unknown as Record<string, unknown>);
  return record;
}

export function getRecord(id: string): SubmittedRecord | null {
  const row = db.prepare('SELECT * FROM records WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? toRecord(row) : null;
}

export function listRecords(formId: string): SubmittedRecord[] {
  const rows = db.prepare(
    'SELECT * FROM records WHERE form_id = ? ORDER BY submitted_at DESC'
  ).all(formId) as Record<string, unknown>[];
  return rows.map(toRecord);
}

export function deleteRecord(id: string): boolean {
  const existing = getRecord(id);
  if (!existing) return false;
  db.prepare('DELETE FROM records WHERE id = ?').run(id);
  audit.log('delete', 'record', id, existing as unknown as Record<string, unknown>, null);
  return true;
}
