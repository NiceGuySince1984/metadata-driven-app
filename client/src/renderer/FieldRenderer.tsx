import type { FieldWithRules } from '@shared/types';
import TextInput from '../components/fields/TextInput';
import NumberInput from '../components/fields/NumberInput';
import DatePicker from '../components/fields/DatePicker';
import SelectInput from '../components/fields/SelectInput';
import CheckboxInput from '../components/fields/CheckboxInput';

interface FieldRendererProps {
  field: FieldWithRules;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
  onBlur?: () => void;
}

export default function FieldRenderer({
  field,
  value,
  error,
  onChange,
  onBlur,
}: FieldRendererProps) {
  const fieldId = `field-${field.id}`;
  const isRequired = field.validationRules.some(r => r.type === 'required');

  if (field.type === 'computed') {
    const displayValue =
      value !== undefined && value !== null && value !== '' ? String(value) : null;

    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="block text-sm font-medium text-slate-700">{field.label}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            computed
          </span>
        </div>
        <div
          data-testid={`computed-${field.name}`}
          className="min-h-[42px] rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm"
        >
          {displayValue !== null ? (
            <span className="text-slate-700">{displayValue}</span>
          ) : (
            <span className="italic text-slate-300">Will be computed…</span>
          )}
        </div>
      </div>
    );
  }

  switch (field.type) {
    case 'text':
      return (
        <TextInput
          id={fieldId}
          label={field.label}
          value={(value as string) ?? ''}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={field.config.placeholder}
          error={error}
          required={isRequired}
        />
      );

    case 'number':
      return (
        <NumberInput
          id={fieldId}
          label={field.label}
          value={value as number | ''}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={field.config.placeholder}
          error={error}
          required={isRequired}
        />
      );

    case 'date':
      return (
        <DatePicker
          id={fieldId}
          label={field.label}
          value={(value as string) ?? ''}
          onChange={onChange}
          onBlur={onBlur}
          error={error}
          required={isRequired}
        />
      );

    case 'select':
      return (
        <SelectInput
          id={fieldId}
          label={field.label}
          value={(value as string) ?? ''}
          onChange={v => onChange(v)}
          onBlur={onBlur}
          options={field.config.options ?? []}
          error={error}
          required={isRequired}
        />
      );

    case 'checkbox':
      return (
        <CheckboxInput
          id={fieldId}
          label={field.label}
          value={(value as boolean) ?? false}
          onChange={onChange}
          error={error}
          required={isRequired}
        />
      );

    default:
      return null;
  }
}
