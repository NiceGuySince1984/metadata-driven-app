import { useState, useEffect, useMemo, useCallback } from 'react';
import type { FullForm, FieldWithRules, Expression, VisibilityRule } from '@shared/types';
import { checkCondition, isFieldVisible, validateField, applyFormValidation } from '@shared/validation';
import Section from '../components/layout/Section';
import FieldRenderer from './FieldRenderer';

// ── Expression evaluation (client-only, UI concern) ───────────────────────────

export function evaluateExpression(
  expr: Expression,
  values: Record<string, unknown>,
): unknown {
  switch (expr.op) {
    case 'concat':
      return (expr.fields ?? [])
        .map(f => String(values[f] ?? ''))
        .filter(v => v !== '')
        .join(expr.separator ?? ' ');

    case 'sum':
      return (expr.fields ?? []).reduce((acc, f) => acc + (Number(values[f]) || 0), 0);

    case 'subtract': {
      const [first, ...rest] = expr.fields ?? [];
      if (!first) return 0;
      return (
        (Number(values[first]) || 0) -
        rest.reduce((acc, f) => acc + (Number(values[f]) || 0), 0)
      );
    }

    case 'multiply':
      return (expr.fields ?? []).reduce((acc, f) => acc * (Number(values[f]) || 0), 1);

    case 'template':
      return (expr.template ?? '').replace(
        /\{\{(\w+)\}\}/g,
        (_, k) => String(values[k] ?? ''),
      );

    default:
      return '';
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface FormRendererProps {
  form: FullForm;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isSubmitting?: boolean;
  serverErrors?: Record<string, string>;
}

export default function FormRenderer({
  form,
  onSubmit,
  isSubmitting,
  serverErrors,
}: FormRendererProps) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Track which fields the user has interacted with (for blur-time validation)
  const [touched, setTouched] = useState<Set<string>>(new Set());

  const allFieldsFlat = useMemo(
    () => form.sections.flatMap(s => s.fields),
    [form.sections],
  );

  // Initialise values from field defaults whenever the form changes
  useEffect(() => {
    const initial: Record<string, unknown> = {};
    for (const field of allFieldsFlat) {
      if (field.type === 'computed') continue;
      const def = field.config.defaultValue;
      initial[field.name] = def !== undefined ? def : field.type === 'checkbox' ? false : '';
    }
    setValues(initial);
    setErrors({});
    setTouched(new Set());
  }, [form.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Merge server-side 422 errors into local error state
  useEffect(() => {
    if (serverErrors && Object.keys(serverErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...serverErrors }));
    }
  }, [serverErrors]);

  // Evaluate all computed fields reactively
  const computedValues = useMemo(() => {
    const result: Record<string, unknown> = {};
    for (const field of allFieldsFlat) {
      if (field.type === 'computed' && field.config.expression) {
        result[field.name] = evaluateExpression(field.config.expression, values);
      }
    }
    return result;
  }, [allFieldsFlat, values]);

  const allValues = useMemo(
    () => ({ ...values, ...computedValues }),
    [values, computedValues],
  );

  const isVisible = useCallback(
    (field: FieldWithRules) => isFieldVisible(field, allValues),
    [allValues],
  );

  // ── Field change ────────────────────────────────────────────────────────────

  function handleChange(name: string, value: unknown) {
    setValues(prev => {
      const next = { ...prev, [name]: value };

      // When a controlling field changes, clear values of fields that become
      // hidden — prevents submitting stale data for invisible fields.
      for (const field of allFieldsFlat) {
        if (field.type === 'computed') continue;
        const vis = field.config.visibility;
        if (vis?.dependsOn === name) {
          const willBeVisible = checkCondition(value, vis.operator, vis.value);
          if (!willBeVisible) {
            next[field.name] = field.type === 'checkbox' ? false : '';
          }
        }
      }

      return next;
    });

    // Re-validate in real-time once the field has been touched
    if (touched.has(name)) {
      const field = allFieldsFlat.find(f => f.name === name);
      if (field && field.type !== 'computed') {
        const msg = validateField(value, field.validationRules);
        setErrors(prev => {
          const next = { ...prev };
          if (msg) next[name] = msg;
          else delete next[name];
          return next;
        });
      }
    }
  }

  // ── Field blur ──────────────────────────────────────────────────────────────

  function handleBlur(name: string) {
    setTouched(prev => new Set([...prev, name]));

    const field = allFieldsFlat.find(f => f.name === name);
    if (!field || field.type === 'computed' || !isVisible(field)) return;

    const msg = validateField(allValues[name], field.validationRules);
    setErrors(prev => {
      const next = { ...prev };
      if (msg) next[name] = msg;
      else delete next[name];
      return next;
    });
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationErrors = applyFormValidation(form, allValues);

    if (validationErrors.length > 0) {
      const errorMap: Record<string, string> = {};
      for (const e of validationErrors) errorMap[e.field] = e.message;
      setErrors(errorMap);

      // Mark all errored fields as touched so they re-validate on change
      setTouched(prev => new Set([...prev, ...Object.keys(errorMap)]));

      // Scroll to the first errored field
      const firstField = allFieldsFlat.find(f => f.name in errorMap);
      if (firstField) {
        document
          .getElementById(`field-${firstField.id}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    await onSubmit(allValues);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const requiredCount = allFieldsFlat.filter(
    f => f.type !== 'computed' && f.validationRules.some(r => r.type === 'required'),
  ).length;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="mb-8">
        <h2 className="font-display text-2xl text-slate-900">{form.name}</h2>
        {form.config.description && (
          <p className="mt-1.5 text-sm text-slate-500">{form.config.description}</p>
        )}
      </div>

      {form.sections.map(section => {
        const visibleFields = section.fields.filter(isVisible);
        if (visibleFields.length === 0) return null;

        return (
          <Section key={section.id} title={section.title}>
            {visibleFields.map(field => (
              <div
                key={field.id}
                className={
                  field.type === 'computed' || field.type === 'checkbox'
                    ? 'sm:col-span-2'
                    : ''
                }
              >
                <FieldRenderer
                  field={field}
                  value={
                    field.type === 'computed'
                      ? computedValues[field.name]
                      : values[field.name]
                  }
                  error={errors[field.name]}
                  onChange={value => handleChange(field.name, value)}
                  onBlur={() => handleBlur(field.name)}
                />
              </div>
            ))}
          </Section>
        );
      })}

      <div className="sticky bottom-0 -mx-8 border-t border-slate-100 bg-white/95 px-8 py-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            <span className="text-rose-500">*</span>{' '}
            {requiredCount} required field{requiredCount !== 1 ? 's' : ''}
          </p>
          <button
            type="submit"
            disabled={isSubmitting}
            className={[
              'flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white',
              'transition-all duration-150',
              isSubmitting
                ? 'cursor-not-allowed bg-indigo-400'
                : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95',
            ].join(' ')}
          >
            {isSubmitting ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Submitting…
              </>
            ) : (
              form.config.submitLabel ?? 'Submit'
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
