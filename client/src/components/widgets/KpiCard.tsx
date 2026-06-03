interface KpiCardProps {
  title: string;
  value: string | number;
  prefix?: string;
  suffix?: string;
  isLoading?: boolean;
}

export default function KpiCard({
  title,
  value,
  prefix,
  suffix,
  isLoading,
}: KpiCardProps) {
  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </p>

      {isLoading ? (
        <div className="space-y-2">
          <div className="h-10 w-28 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
        </div>
      ) : (
        <div className="mt-3">
          <div className="flex items-baseline gap-1.5 leading-none">
            {prefix && (
              <span className="text-xl font-medium text-slate-400">{prefix}</span>
            )}
            <span
              data-testid="kpi-value"
              className="font-display text-5xl text-slate-900"
            >
              {value}
            </span>
            {suffix && (
              <span className="text-sm text-slate-400">{suffix}</span>
            )}
          </div>
        </div>
      )}

      {/* Decorative accent line */}
      <div className="mt-4 h-0.5 w-8 rounded-full bg-indigo-500" />
    </div>
  );
}
