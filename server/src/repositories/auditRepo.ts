import { v4 as uuid } from 'uuid';
import db from '../db/client';

export function log(
  action: 'create' | 'update' | 'delete',
  entity: string,
  entityId: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null
): void {
  db.prepare(`
    INSERT INTO audit_log (id, action, entity, entity_id, before_data, after_data, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    uuid(),
    action,
    entity,
    entityId,
    before ? JSON.stringify(before) : null,
    after  ? JSON.stringify(after)  : null,
    new Date().toISOString()
  );
}
