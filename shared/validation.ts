import type {
  FullForm,
  FieldWithRules,
  ValidationRule,
  ValidationError,
  VisibilityRule,
} from './types';

// ── Visibility ────────────────────────────────────────────────────────────────

export function checkCondition(
  actual: unknown,
  operator: VisibilityRule['operator'],
  expected: unknown,
): boolean {
  switch (operator) {
    case 'eq':       return actual === expected;
    case 'neq':      return actual !== expected;
    case 'gt':       return Number(actual) > Number(expected);
    case 'lt':       return Number(actual) < Number(expected);
    case 'contains':
      return typeof actual === 'string' && actual.includes(String(expected));
    default:
      return true;
  }
}

export function isFieldVisible(
  field: FieldWithRules,
  values: Record<string, unknown>,
): boolean {
  const vis = field.config.visibility;
  if (!vis) return true;
  return checkCondition(values[vis.dependsOn], vis.operator, vis.value);
}

// ── Per-field validation ──────────────────────────────────────────────────────
// Returns the message of the first failing rule, or undefined if all pass.
// min/max rules are skipped when the value is empty — that is the required
// rule's job.  pattern is skipped on empty strings for the same reason.

export function validateField(
  value: unknown,
  rules: ValidationRule[],
): string | undefined {
  for (const rule of rules) {
    switch (rule.type) {
      case 'required':
        if (value === undefined || value === null || value === '' || value === false)
          return rule.message;
        break;

      case 'minLength':
        if (typeof value === 'string' && value.length < Number(rule.value))
          return rule.message;
        break;

      case 'maxLength':
        if (typeof value === 'string' && value.length > Number(rule.value))
          return rule.message;
        break;

      case 'min':
        if (value !== '' && value !== null && value !== undefined) {
          if (Number(value) < Number(rule.value)) return rule.message;
        }
        break;

      case 'max':
        if (value !== '' && value !== null && value !== undefined) {
          if (Number(value) > Number(rule.value)) return rule.message;
        }
        break;

      case 'pattern':
        if (rule.value && typeof value === 'string' && value !== '') {
          if (!new RegExp(rule.value).test(value)) return rule.message;
        }
        break;
    }
  }
  return undefined;
}

// ── Full-form validation ──────────────────────────────────────────────────────
// Validates all visible, non-computed fields, then cross-field rules.
// Cross-field rules only run when per-field validation passes entirely.

export function applyFormValidation(
  form: FullForm,
  data: Record<string, unknown>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const section of form.sections) {
    for (const field of section.fields) {
      if (field.type === 'computed') continue;
      if (!isFieldVisible(field, data)) continue;
      const msg = validateField(data[field.name], field.validationRules);
      if (msg) errors.push({ field: field.name, message: msg });
    }
  }

  if (errors.length > 0) return errors;

  for (const rule of form.crossFieldRules) {
    if (rule.type === 'conditional') {
      const cfg = rule.config as {
        when: { field: string; operator: VisibilityRule['operator']; value: unknown };
        require: string;
      };
      if (checkCondition(data[cfg.when.field], cfg.when.operator, cfg.when.value)) {
        const v = data[cfg.require];
        if (v === undefined || v === null || v === '') {
          errors.push({ field: rule.errorField, message: rule.message });
        }
      }
    }
  }

  return errors;
}
