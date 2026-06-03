interface NumberInputProps {
  id?: string;
  label: string;
  value: number | string;
  onChange: (value: number | '') => void;
  onBlur?: () => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  min?: number;
  max?: number;
}

export default function NumberInput({
  id,
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  required,
  min,
  max,
}: NumberInputProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-rose-500" aria-hidden="true">*</span>}
      </label>
      <input
        id={id}
        type="number"
        value={value === '' ? '' : value}
        min={min}
        max={max}
        onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        onBlur={onBlur}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={[
          'w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 transition-all duration-150',
          'placeholder:text-slate-400',
          '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
          error
            ? 'border-rose-300 bg-rose-50/40 ring-1 ring-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400'
            : 'border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
        ].join(' ')}
      />
      {error && (
        <p id={`${id}-error`} className="flex items-center gap-1.5 text-xs text-rose-600">
          <svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
