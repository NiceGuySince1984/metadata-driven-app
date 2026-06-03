interface CheckboxInputProps {
  id?: string;
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  error?: string;
  required?: boolean;
}

export default function CheckboxInput({
  id,
  label,
  value,
  onChange,
  error,
  required,
}: CheckboxInputProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-3 py-1">
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={value}
          aria-label={label}
          onClick={() => onChange(!value)}
          className={[
            'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent',
            'transition-colors duration-200 ease-in-out',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
            value ? 'bg-indigo-600' : 'bg-slate-200',
          ].join(' ')}
        >
          <span
            aria-hidden="true"
            className={[
              'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow',
              'transition duration-200 ease-in-out',
              value ? 'translate-x-4' : 'translate-x-0',
            ].join(' ')}
          />
        </button>
        <label
          htmlFor={id}
          className="cursor-pointer select-none text-sm font-medium text-slate-700"
          onClick={() => onChange(!value)}
        >
          {label}
          {required && <span className="ml-1 text-rose-500" aria-hidden="true">*</span>}
        </label>
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-rose-600">
          <svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
