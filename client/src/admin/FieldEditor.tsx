import { useState, useEffect, useRef } from 'react';
import type { FieldWithRules, FieldOption, VisibilityRule, Field } from '@shared/types';
import { updateField, createValidationRule, deleteValidationRule } from '../api/adminApi';

// ── Utilities ─────────────────────────────────────────────────────────────────

export function labelToName(label: string): string {
  const words = label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return words
    .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join('');
}

const FIELD_TYPES: { value: Field['type']; label: string }[] = [
  { value: 'text',     label: 'Text'     },
  { value: 'number',   label: 'Number'   },
  { value: 'date',     label: 'Date'     },
  { value: 'select',   label: 'Select'   },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'computed', label: 'Computed' },
];

const TYPE_COLORS: Record<Field['type'], string> = {
  text:     'bg-slate-100 text-slate-600',
  number:   'bg-blue-50 text-blue-600',
  date:     'bg-emerald-50 text-emerald-700',
  select:   'bg-violet-50 text-violet-600',
  checkbox: 'bg-orange-50 text-orange-600',
  computed: 'bg-slate-100 text-slate-400',
};

const OPERATORS: { value: VisibilityRule['operator']; label: string }[] = [
  { value: 'eq',       label: 'equals'          },
  { value: 'neq',      label: 'does not equal'  },
  { value: 'gt',       label: 'is greater than' },
  { value: 'lt',       label: 'is less than'    },
  { value: 'contains', label: 'contains'        },
];

// ── Small shared elements ─────────────────────────────────────────────────────

function TypeBadge({ type }: { type: Field['type'] }) {
  const label = FIELD_TYPES.find(t => t.value === type)?.label ?? type;
  return (
    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TYPE_COLORS[type]}`}>
      {label}
    </span>
  );
}

function SaveIndicator({ saving }: { saving: boolean }) {
  if (!saving) return null;
  return (
    <span className="text-[11px] text-slate-400 animate-pulse">Saving…</span>
  );
}

// ── Options editor (select type only) ────────────────────────────────────────

function OptionsEditor({
  options,
  onChange,
}: {
  options: FieldOption[];
  onChange: (opts: FieldOption[]) => void;
}) {
  function updateOption(i: number, value: string) {
    const next = options.map((o, idx) =>
      idx === i ? { label: value, value } : o,
    );
    onChange(next);
  }

  function addOption() {
    onChange([...options, { label: '', value: '' }]);
  }

  function removeOption(i: number) {
    onChange(options.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-1.5">
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
          <input
            type="text"
            value={opt.label}
            onChange={e => updateOption(i, e.target.value)}
            placeholder={`Option ${i + 1}`}
            className="flex-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={() => removeOption(i)}
            className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
            title="Remove option"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addOption}
        className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Add option
      </button>
    </div>
  );
}

// ── Visibility editor ─────────────────────────────────────────────────────────

function VisibilityEditor({
  visibility,
  otherFields,
  onChange,
}: {
  visibility: VisibilityRule | null;
  otherFields: FieldWithRules[];
  onChange: (rule: VisibilityRule | null) => void;
}) {
  const dep = visibility?.dependsOn ?? '';
  const op  = visibility?.operator  ?? 'eq';
  const val = visibility?.value !== undefined ? String(visibility.value) : '';

  function update(patch: Partial<{ dependsOn: string; operator: VisibilityRule['operator']; value: string }>) {
    const next = {
      dependsOn: patch.dependsOn ?? dep,
      operator:  patch.operator  ?? op,
      value:     patch.value     ?? val,
    };
    if (!next.dependsOn) { onChange(null); return; }
    onChange({ dependsOn: next.dependsOn, operator: next.operator, value: next.value });
  }

  const selectClass = 'rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-slate-500">Show when</span>
        <select
          value={dep}
          onChange={e => update({ dependsOn: e.target.value })}
          className={selectClass}
        >
          <option value="">— field —</option>
          {otherFields.map(f => (
            <option key={f.id} value={f.name}>{f.label}</option>
          ))}
        </select>
        <select
          value={op}
          onChange={e => update({ operator: e.target.value as VisibilityRule['operator'] })}
          className={selectClass}
          disabled={!dep}
        >
          {OPERATORS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input
          type="text"
          value={val}
          onChange={e => update({ value: e.target.value })}
          placeholder="value"
          disabled={!dep}
          className={`w-28 ${selectClass}`}
        />
      </div>
      {visibility && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs text-slate-400 hover:text-rose-500"
        >
          Clear visibility rule
        </button>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface FieldEditorProps {
  field: FieldWithRules;
  allFormFields: FieldWithRules[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdated: (updated: FieldWithRules) => void;
  onDeleted: () => void;
}

export default function FieldEditor({
  field,
  allFormFields,
  isExpanded,
  onToggleExpand,
  onUpdated,
  onDeleted,
}: FieldEditorProps) {
  // Local controlled state — synced from props when field identity changes
  const [label,      setLabel]      = useState(field.label);
  const [name,       setName]       = useState(field.name);
  const [type,       setType]       = useState(field.type);
  const [options,    setOptions]    = useState(field.config.options ?? []);
  const [visibility, setVisibility] = useState(field.config.visibility ?? null);
  const [saving,     setSaving]     = useState(false);

  // Whether name was auto-derived from label (not manually edited)
  const nameDerived = useRef(field.name === '' || field.name === labelToName(field.label));

  useEffect(() => {
    setLabel(field.label);
    setName(field.name);
    setType(field.type);
    setOptions(field.config.options ?? []);
    setVisibility(field.config.visibility ?? null);
  }, [field.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isRequired = field.validationRules.some(r => r.type === 'required');
  const otherFields = allFormFields.filter(f => f.id !== field.id);

  // ── Save helpers ────────────────────────────────────────────────────────────

  async function save(data: Parameters<typeof updateField>[1]) {
    setSaving(true);
    try {
      const updated = await updateField(field.id, data);
      onUpdated(updated);
    } finally {
      setSaving(false);
    }
  }

  function handleLabelChange(val: string) {
    setLabel(val);
    if (nameDerived.current) setName(labelToName(val));
  }

  function handleLabelBlur() {
    if (label !== field.label || name !== field.name) {
      save({ label, name });
    }
  }

  function handleNameBlur() {
    nameDerived.current = false;
    if (name !== field.name) save({ name });
  }

  async function handleTypeChange(newType: Field['type']) {
    setType(newType);
    const newConfig: typeof field.config = { ...field.config };
    if (newType === 'select' && !newConfig.options) newConfig.options = [];
    await save({ type: newType, config: newConfig });
  }

  async function handleToggleRequired() {
    setSaving(true);
    try {
      if (isRequired) {
        const rule = field.validationRules.find(r => r.type === 'required')!;
        await deleteValidationRule(rule.id);
        onUpdated({
          ...field,
          validationRules: field.validationRules.filter(r => r.id !== rule.id),
        });
      } else {
        const rule = await createValidationRule(field.id, {
          type: 'required',
          message: `${field.label || 'This field'} is required`,
        });
        onUpdated({ ...field, validationRules: [...field.validationRules, rule] });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleOptionsSave(newOptions: FieldOption[]) {
    setOptions(newOptions);
    await save({ config: { ...field.config, options: newOptions } });
  }

  async function handleVisibilityChange(rule: typeof visibility) {
    setVisibility(rule);
    await save({ config: { ...field.config, visibility: rule ?? undefined } });
  }

  // ── Collapsed row ───────────────────────────────────────────────────────────

  return (
    <div className={`rounded-lg border transition-colors ${isExpanded ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-100 bg-white'}`}>
      {/* Header row — always visible */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <TypeBadge type={type} />

        <span className="flex-1 truncate text-sm font-medium text-slate-800">
          {label || <span className="italic text-slate-400">Untitled field</span>}
        </span>

        {isRequired && (
          <span className="text-rose-400" title="Required">*</span>
        )}

        <SaveIndicator saving={saving} />

        <button
          type="button"
          onClick={onToggleExpand}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          title={isExpanded ? 'Collapse' : 'Edit field'}
        >
          <svg
            className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <button
          type="button"
          onClick={onDeleted}
          className="rounded p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
          title="Delete field"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Expanded edit form */}
      {isExpanded && (
        <div className="border-t border-indigo-100 px-3 pb-4 pt-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Label */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-500">Label</label>
              <input
                type="text"
                value={label}
                onChange={e => handleLabelChange(e.target.value)}
                onBlur={handleLabelBlur}
                placeholder="Field label"
                className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Name (key) */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-500">
                Field key{' '}
                <span className="font-normal text-slate-400">(used in records)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); nameDerived.current = false; }}
                onBlur={handleNameBlur}
                placeholder="fieldKey"
                className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 font-mono text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Type */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-500">Type</label>
              <select
                value={type}
                onChange={e => handleTypeChange(e.target.value as Field['type'])}
                className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {FIELD_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Required toggle */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-500">Required</label>
              <button
                type="button"
                onClick={handleToggleRequired}
                className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                  isRequired
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${isRequired ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                {isRequired ? 'Required' : 'Optional'}
              </button>
            </div>
          </div>

          {/* Options — select type only */}
          {type === 'select' && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-slate-500">Options</p>
              <OptionsEditor
                options={options}
                onChange={handleOptionsSave}
              />
            </div>
          )}

          {/* Computed expression — read-only display */}
          {type === 'computed' && field.config.expression && (
            <div className="mt-4 space-y-1">
              <p className="text-xs font-medium text-slate-500">Expression</p>
              <pre className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
                {JSON.stringify(field.config.expression, null, 2)}
              </pre>
            </div>
          )}

          {/* Visibility rule */}
          {type !== 'computed' && otherFields.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-slate-500">
                Conditional visibility
              </p>
              <VisibilityEditor
                visibility={visibility}
                otherFields={otherFields}
                onChange={handleVisibilityChange}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
