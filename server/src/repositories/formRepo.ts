import { v4 as uuid } from 'uuid';
import db from '../db/client';
import * as audit from './auditRepo';
import type {
  Application, Form, FullForm, Section, SectionWithFields,
  Field, FieldWithRules, ValidationRule, CrossFieldRule,
  Widget, Dashboard,
} from '../../../shared/types';

// ── Deserializers ─────────────────────────────────────────────────────────────

function toApp(row: Record<string, unknown>): Application {
  return {
    id:          row.id as string,
    name:        row.name as string,
    description: row.description as string,
    version:     row.version as number,
    createdAt:   row.created_at as string,
    config:      JSON.parse(row.config as string || '{}'),
  };
}

function toForm(row: Record<string, unknown>): Form {
  return {
    id:            row.id as string,
    applicationId: row.application_id as string,
    name:          row.name as string,
    version:       row.version as number,
    config:        JSON.parse(row.config as string || '{}'),
  };
}

function toSection(row: Record<string, unknown>): Section {
  return {
    id:     row.id as string,
    formId: row.form_id as string,
    title:  row.title as string,
    order:  row.order as number,
  };
}

function toField(row: Record<string, unknown>): Field {
  return {
    id:        row.id as string,
    sectionId: row.section_id as string,
    name:      row.name as string,
    label:     row.label as string,
    type:      row.type as Field['type'],
    order:     row.order as number,
    config:    JSON.parse(row.config as string || '{}'),
  };
}

function toRule(row: Record<string, unknown>): ValidationRule {
  return {
    id:      row.id as string,
    fieldId: row.field_id as string,
    type:    row.type as ValidationRule['type'],
    value:   row.value as string | null,
    message: row.message as string,
  };
}

function toCrossFieldRule(row: Record<string, unknown>): CrossFieldRule {
  return {
    id:         row.id as string,
    formId:     row.form_id as string,
    type:       row.type as CrossFieldRule['type'],
    fields:     JSON.parse(row.fields as string || '[]'),
    config:     JSON.parse(row.config as string || '{}'),
    message:    row.message as string,
    errorField: row.error_field as string,
  };
}

function toWidget(row: Record<string, unknown>): Widget {
  return {
    id:     row.id as string,
    type:   row.type as Widget['type'],
    title:  row.title as string,
    config: JSON.parse(row.config as string || '{}'),
  };
}

function toDashboard(row: Record<string, unknown>): Dashboard {
  return {
    id:            row.id as string,
    applicationId: row.application_id as string,
    name:          row.name as string,
    version:       row.version as number,
    layout:        JSON.parse(row.layout as string || '[]'),
  };
}

// ── Applications ──────────────────────────────────────────────────────────────

export function listApplications(): Application[] {
  return (db.prepare('SELECT * FROM applications ORDER BY created_at DESC').all() as Record<string, unknown>[])
    .map(toApp);
}

export function getApplication(id: string): Application | null {
  const row = db.prepare('SELECT * FROM applications WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? toApp(row) : null;
}

export function createApplication(data: Omit<Application, 'id' | 'createdAt' | 'version'>): Application {
  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO applications (id, name, description, version, created_at, config)
    VALUES (?, ?, ?, 1, ?, ?)
  `).run(id, data.name, data.description || '', now, JSON.stringify(data.config || {}));
  const app = getApplication(id)!;
  audit.log('create', 'application', id, null, app as unknown as Record<string, unknown>);
  return app;
}

// ── Forms ─────────────────────────────────────────────────────────────────────

export function listForms(applicationId?: string): Form[] {
  const rows = applicationId
    ? db.prepare('SELECT * FROM forms WHERE application_id = ?').all(applicationId)
    : db.prepare('SELECT * FROM forms').all();
  return (rows as Record<string, unknown>[]).map(toForm);
}

export function getForm(id: string): Form | null {
  const row = db.prepare('SELECT * FROM forms WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? toForm(row) : null;
}

export function getFullForm(id: string): FullForm | null {
  const formRow = db.prepare('SELECT * FROM forms WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!formRow) return null;
  const form = toForm(formRow);

  const sectionRows = db.prepare('SELECT * FROM sections WHERE form_id = ? ORDER BY "order"').all(id) as Record<string, unknown>[];

  const sections: SectionWithFields[] = sectionRows.map(sRow => {
    const section = toSection(sRow);
    const fieldRows = db.prepare('SELECT * FROM fields WHERE section_id = ? ORDER BY "order"').all(section.id) as Record<string, unknown>[];
    const fields: FieldWithRules[] = fieldRows.map(fRow => {
      const field = toField(fRow);
      const ruleRows = db.prepare('SELECT * FROM validation_rules WHERE field_id = ?').all(field.id) as Record<string, unknown>[];
      return { ...field, validationRules: ruleRows.map(toRule) };
    });
    return { ...section, fields };
  });

  const crossFieldRules: CrossFieldRule[] = (
    db.prepare('SELECT * FROM cross_field_rules WHERE form_id = ?').all(id) as Record<string, unknown>[]
  ).map(toCrossFieldRule);

  return { ...form, sections, crossFieldRules };
}

export function createForm(data: { applicationId: string; name: string; config?: Form['config'] }): FullForm {
  const id = uuid();
  db.prepare(`
    INSERT INTO forms (id, application_id, name, version, config)
    VALUES (?, ?, ?, 1, ?)
  `).run(id, data.applicationId, data.name, JSON.stringify(data.config || {}));
  const form = getFullForm(id)!;
  audit.log('create', 'form', id, null, form as unknown as Record<string, unknown>);
  return form;
}

export function updateForm(id: string, data: { name?: string; config?: Form['config'] }): FullForm | null {
  const existing = getFullForm(id);
  if (!existing) return null;

  // Snapshot current version before mutation
  db.prepare(`
    INSERT INTO metadata_versions (id, entity_type, entity_id, version, snapshot, created_at)
    VALUES (?, 'form', ?, ?, ?, ?)
  `).run(uuid(), id, existing.version, JSON.stringify(existing), new Date().toISOString());

  db.prepare(`
    UPDATE forms SET name = ?, config = ?, version = version + 1 WHERE id = ?
  `).run(
    data.name  ?? existing.name,
    JSON.stringify(data.config ?? existing.config),
    id
  );
  const updated = getFullForm(id)!;
  audit.log('update', 'form', id, existing as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>);
  return updated;
}

export function deleteForm(id: string): boolean {
  const existing = getForm(id);
  if (!existing) return false;
  db.prepare('DELETE FROM forms WHERE id = ?').run(id);
  audit.log('delete', 'form', id, existing as unknown as Record<string, unknown>, null);
  return true;
}

export function getFormVersions(formId: string): unknown[] {
  return db.prepare(
    'SELECT * FROM metadata_versions WHERE entity_type = ? AND entity_id = ? ORDER BY version DESC'
  ).all('form', formId);
}

// ── Sections ──────────────────────────────────────────────────────────────────

export function createSection(data: { formId: string; title: string; order?: number }): Section {
  const id = uuid();
  const maxOrder = (db.prepare('SELECT MAX("order") as m FROM sections WHERE form_id = ?').get(data.formId) as { m: number | null }).m ?? 0;
  db.prepare('INSERT INTO sections (id, form_id, title, "order") VALUES (?, ?, ?, ?)').run(
    id, data.formId, data.title, data.order ?? maxOrder + 1
  );
  const section = db.prepare('SELECT * FROM sections WHERE id = ?').get(id) as Record<string, unknown>;
  audit.log('create', 'section', id, null, section);
  return toSection(section);
}

export function updateSection(id: string, data: { title?: string; order?: number }): Section | null {
  const existing = db.prepare('SELECT * FROM sections WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) return null;
  db.prepare('UPDATE sections SET title = ?, "order" = ? WHERE id = ?').run(
    data.title ?? existing.title,
    data.order ?? existing.order,
    id
  );
  const updated = db.prepare('SELECT * FROM sections WHERE id = ?').get(id) as Record<string, unknown>;
  audit.log('update', 'section', id, existing, updated);
  return toSection(updated);
}

export function deleteSection(id: string): boolean {
  const existing = db.prepare('SELECT * FROM sections WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) return false;
  db.prepare('DELETE FROM sections WHERE id = ?').run(id);
  audit.log('delete', 'section', id, existing, null);
  return true;
}

// ── Fields ────────────────────────────────────────────────────────────────────

export function createField(data: {
  sectionId: string;
  name: string;
  label: string;
  type: Field['type'];
  order?: number;
  config?: Field['config'];
}): FieldWithRules {
  const id = uuid();
  const maxOrder = (db.prepare('SELECT MAX("order") as m FROM fields WHERE section_id = ?').get(data.sectionId) as { m: number | null }).m ?? 0;
  db.prepare(`
    INSERT INTO fields (id, section_id, name, label, type, "order", config)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.sectionId, data.name, data.label, data.type,
    data.order ?? maxOrder + 1, JSON.stringify(data.config || {}));
  const row = db.prepare('SELECT * FROM fields WHERE id = ?').get(id) as Record<string, unknown>;
  audit.log('create', 'field', id, null, row);
  return { ...toField(row), validationRules: [] };
}

export function updateField(id: string, data: {
  name?: string;
  label?: string;
  type?: Field['type'];
  order?: number;
  config?: Field['config'];
}): FieldWithRules | null {
  const existing = db.prepare('SELECT * FROM fields WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) return null;
  db.prepare(`
    UPDATE fields SET name = ?, label = ?, type = ?, "order" = ?, config = ? WHERE id = ?
  `).run(
    data.name   ?? existing.name,
    data.label  ?? existing.label,
    data.type   ?? existing.type,
    data.order  ?? existing.order,
    JSON.stringify(data.config ?? JSON.parse(existing.config as string || '{}')),
    id
  );
  const updated = db.prepare('SELECT * FROM fields WHERE id = ?').get(id) as Record<string, unknown>;
  const rules = (db.prepare('SELECT * FROM validation_rules WHERE field_id = ?').all(id) as Record<string, unknown>[]).map(toRule);
  audit.log('update', 'field', id, existing, updated);
  return { ...toField(updated), validationRules: rules };
}

export function deleteField(id: string): boolean {
  const existing = db.prepare('SELECT * FROM fields WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) return false;
  db.prepare('DELETE FROM fields WHERE id = ?').run(id);
  audit.log('delete', 'field', id, existing, null);
  return true;
}

// ── Validation Rules ──────────────────────────────────────────────────────────

export function createValidationRule(data: {
  fieldId: string;
  type: ValidationRule['type'];
  value?: string | null;
  message: string;
}): ValidationRule {
  const id = uuid();
  db.prepare('INSERT INTO validation_rules (id, field_id, type, value, message) VALUES (?, ?, ?, ?, ?)').run(
    id, data.fieldId, data.type, data.value ?? null, data.message
  );
  const row = db.prepare('SELECT * FROM validation_rules WHERE id = ?').get(id) as Record<string, unknown>;
  audit.log('create', 'validation_rule', id, null, row);
  return toRule(row);
}

export function deleteValidationRule(id: string): boolean {
  const existing = db.prepare('SELECT * FROM validation_rules WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) return false;
  db.prepare('DELETE FROM validation_rules WHERE id = ?').run(id);
  audit.log('delete', 'validation_rule', id, existing, null);
  return true;
}

// ── Cross-field Rules ─────────────────────────────────────────────────────────

export function createCrossFieldRule(data: {
  formId: string;
  type: CrossFieldRule['type'];
  fields: string[];
  config: Record<string, unknown>;
  message: string;
  errorField: string;
}): CrossFieldRule {
  const id = uuid();
  db.prepare(`
    INSERT INTO cross_field_rules (id, form_id, type, fields, config, message, error_field)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.formId, data.type, JSON.stringify(data.fields), JSON.stringify(data.config), data.message, data.errorField);
  const row = db.prepare('SELECT * FROM cross_field_rules WHERE id = ?').get(id) as Record<string, unknown>;
  audit.log('create', 'cross_field_rule', id, null, row);
  return toCrossFieldRule(row);
}

export function deleteCrossFieldRule(id: string): boolean {
  const existing = db.prepare('SELECT * FROM cross_field_rules WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) return false;
  db.prepare('DELETE FROM cross_field_rules WHERE id = ?').run(id);
  audit.log('delete', 'cross_field_rule', id, existing, null);
  return true;
}

// ── Widgets ───────────────────────────────────────────────────────────────────

export function listWidgets(): Widget[] {
  return (db.prepare('SELECT * FROM widgets').all() as Record<string, unknown>[]).map(toWidget);
}

export function getWidget(id: string): Widget | null {
  const row = db.prepare('SELECT * FROM widgets WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? toWidget(row) : null;
}

export function createWidget(data: { type: Widget['type']; title: string; config: Widget['config'] }): Widget {
  const id = uuid();
  db.prepare('INSERT INTO widgets (id, type, title, config) VALUES (?, ?, ?, ?)').run(
    id, data.type, data.title, JSON.stringify(data.config)
  );
  const widget = getWidget(id)!;
  audit.log('create', 'widget', id, null, widget as unknown as Record<string, unknown>);
  return widget;
}

export function updateWidget(id: string, data: Partial<{ type: Widget['type']; title: string; config: Widget['config'] }>): Widget | null {
  const existing = getWidget(id);
  if (!existing) return null;
  db.prepare('UPDATE widgets SET type = ?, title = ?, config = ? WHERE id = ?').run(
    data.type   ?? existing.type,
    data.title  ?? existing.title,
    JSON.stringify(data.config ?? existing.config),
    id
  );
  const updated = getWidget(id)!;
  audit.log('update', 'widget', id, existing as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>);
  return updated;
}

export function deleteWidget(id: string): boolean {
  const existing = getWidget(id);
  if (!existing) return false;
  db.prepare('DELETE FROM widgets WHERE id = ?').run(id);
  audit.log('delete', 'widget', id, existing as unknown as Record<string, unknown>, null);
  return true;
}

// ── Dashboards ────────────────────────────────────────────────────────────────

export function listDashboards(applicationId?: string): Dashboard[] {
  const rows = applicationId
    ? db.prepare('SELECT * FROM dashboards WHERE application_id = ?').all(applicationId)
    : db.prepare('SELECT * FROM dashboards').all();
  return (rows as Record<string, unknown>[]).map(toDashboard);
}

export function getDashboard(id: string): Dashboard | null {
  const row = db.prepare('SELECT * FROM dashboards WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? toDashboard(row) : null;
}

export function createDashboard(data: { applicationId: string; name: string; layout?: Dashboard['layout'] }): Dashboard {
  const id = uuid();
  db.prepare('INSERT INTO dashboards (id, application_id, name, version, layout) VALUES (?, ?, ?, 1, ?)').run(
    id, data.applicationId, data.name, JSON.stringify(data.layout || [])
  );
  const dash = getDashboard(id)!;
  audit.log('create', 'dashboard', id, null, dash as unknown as Record<string, unknown>);
  return dash;
}

export function updateDashboard(id: string, data: Partial<{ name: string; layout: Dashboard['layout'] }>): Dashboard | null {
  const existing = getDashboard(id);
  if (!existing) return null;

  db.prepare(`
    INSERT INTO metadata_versions (id, entity_type, entity_id, version, snapshot, created_at)
    VALUES (?, 'dashboard', ?, ?, ?, ?)
  `).run(uuid(), id, existing.version, JSON.stringify(existing), new Date().toISOString());

  db.prepare('UPDATE dashboards SET name = ?, layout = ?, version = version + 1 WHERE id = ?').run(
    data.name   ?? existing.name,
    JSON.stringify(data.layout ?? existing.layout),
    id
  );
  const updated = getDashboard(id)!;
  audit.log('update', 'dashboard', id, existing as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>);
  return updated;
}

export function deleteDashboard(id: string): boolean {
  const existing = getDashboard(id);
  if (!existing) return false;
  db.prepare('DELETE FROM dashboards WHERE id = ?').run(id);
  audit.log('delete', 'dashboard', id, existing as unknown as Record<string, unknown>, null);
  return true;
}
