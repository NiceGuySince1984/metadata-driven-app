import type {
  Application, FullForm, Section, FieldWithRules,
  ValidationRule, Field, FieldConfig,
} from '@shared/types';

const BASE = '/api';

async function api<T>(
  path: string,
  method: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `${method} ${path} → ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Applications ──────────────────────────────────────────────────────────────

export function createApplication(data: {
  name: string;
  description?: string;
}): Promise<Application> {
  return api('/applications', 'POST', data);
}

// ── Forms ─────────────────────────────────────────────────────────────────────

export function createForm(data: {
  applicationId: string;
  name: string;
  config?: { description?: string; submitLabel?: string };
}): Promise<FullForm> {
  return api('/forms', 'POST', data);
}

export function updateForm(
  id: string,
  data: { name?: string; config?: { description?: string; submitLabel?: string } },
): Promise<FullForm> {
  return api(`/forms/${id}`, 'PUT', data);
}

export function deleteForm(id: string): Promise<void> {
  return api(`/forms/${id}`, 'DELETE');
}

// ── Sections ──────────────────────────────────────────────────────────────────

export function createSection(
  formId: string,
  data: { title: string },
): Promise<Section> {
  return api(`/forms/${formId}/sections`, 'POST', data);
}

export function updateSection(
  id: string,
  data: { title?: string; order?: number },
): Promise<Section> {
  return api(`/sections/${id}`, 'PUT', data);
}

export function deleteSection(id: string): Promise<void> {
  return api(`/sections/${id}`, 'DELETE');
}

// ── Fields ────────────────────────────────────────────────────────────────────

export function createField(
  sectionId: string,
  data: {
    name: string;
    label: string;
    type: Field['type'];
    config?: FieldConfig;
  },
): Promise<FieldWithRules> {
  return api(`/sections/${sectionId}/fields`, 'POST', data);
}

export function updateField(
  id: string,
  data: {
    name?: string;
    label?: string;
    type?: Field['type'];
    config?: FieldConfig;
  },
): Promise<FieldWithRules> {
  return api(`/fields/${id}`, 'PUT', data);
}

export function deleteField(id: string): Promise<void> {
  return api(`/fields/${id}`, 'DELETE');
}

// ── Validation rules ──────────────────────────────────────────────────────────

export function createValidationRule(
  fieldId: string,
  data: { type: ValidationRule['type']; value?: string | null; message: string },
): Promise<ValidationRule> {
  return api(`/fields/${fieldId}/validation-rules`, 'POST', data);
}

export function deleteValidationRule(id: string): Promise<void> {
  return api(`/validation-rules/${id}`, 'DELETE');
}
