import type { Widget, SubmittedRecord, FullForm, WidgetConfig } from '@shared/types';
import type { Column } from '../components/widgets/DataTable';
import KpiCard from '../components/widgets/KpiCard';
import BarChartWidget, { type ChartDatum } from '../components/widgets/BarChartWidget';
import DataTable from '../components/widgets/DataTable';

// ── KPI computation ───────────────────────────────────────────────────────────
// Pure function — no side effects, directly testable.

export function computeKpiValue(
  records: SubmittedRecord[],
  config: WidgetConfig,
): string {
  const { metric = 'count', field } = config;

  if (metric === 'count') {
    return records.length.toLocaleString();
  }

  const nums = records
    .map(r => Number(r.data[field ?? '']))
    .filter(n => !isNaN(n) && isFinite(n));

  if (nums.length === 0) return '0';

  if (metric === 'sum') {
    return nums.reduce((a, b) => a + b, 0).toLocaleString();
  }

  // avg
  return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1);
}

// ── Chart computation ─────────────────────────────────────────────────────────
// Groups records by xField and aggregates by yMetric.
// Returns data sorted numerically when xField values are numeric, else alphabetically.

export function computeChartData(
  records: SubmittedRecord[],
  config: WidgetConfig,
): ChartDatum[] {
  const { xField = 'rating', yMetric = 'count', field } = config;

  // Accumulate per-group: { sum, count }
  const groups = new Map<string, { sum: number; count: number }>();

  for (const record of records) {
    const rawKey =
      xField === 'submittedAt'
        ? new Date(record.submittedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })
        : String(record.data[xField] ?? 'Unknown');

    const prev = groups.get(rawKey) ?? { sum: 0, count: 0 };
    const fieldVal = field ? Number(record.data[field]) || 0 : 0;
    groups.set(rawKey, { sum: prev.sum + fieldVal, count: prev.count + 1 });
  }

  const datums: ChartDatum[] = [...groups.entries()].map(([name, { sum, count }]) => {
    let value: number;
    if (yMetric === 'sum' && field) value = sum;
    else if (yMetric === 'avg' && field) value = count > 0 ? parseFloat((sum / count).toFixed(2)) : 0;
    else value = count; // default: count
    return { name, value };
  });

  // Sort numerically if all keys are numeric, otherwise alphabetically
  const allNumeric = datums.every(d => !isNaN(Number(d.name)));
  return datums.sort((a, b) =>
    allNumeric
      ? Number(a.name) - Number(b.name)
      : a.name.localeCompare(b.name),
  );
}

// ── Table column derivation ───────────────────────────────────────────────────
// Derives column labels and types from form field metadata.
// Falls back to the field name as label when form is not available.

export function deriveTableColumns(config: WidgetConfig, form?: FullForm): Column[] {
  const fieldMap = new Map(
    form?.sections.flatMap(s => s.fields).map(f => [f.name, f]) ?? [],
  );

  const keys: string[] = config.columns ?? [];
  return [
    { key: '__submittedAt', label: 'Submitted', type: 'datetime' },
    ...keys.map(name => ({
      key: name,
      label: fieldMap.get(name)?.label ?? name,
      type: (fieldMap.get(name)?.type ?? 'text') as Column['type'],
    })),
  ];
}

// ── Component ─────────────────────────────────────────────────────────────────

interface WidgetRendererProps {
  widget: Widget;
  records: SubmittedRecord[];
  form?: FullForm;
  isLoading?: boolean;
}

export default function WidgetRenderer({
  widget,
  records,
  form,
  isLoading,
}: WidgetRendererProps) {
  const config = widget.config;

  switch (widget.type) {
    case 'kpi': {
      const value = computeKpiValue(records, config);
      return (
        <KpiCard
          title={widget.title}
          value={value}
          prefix={config.prefix}
          suffix={config.suffix}
          isLoading={isLoading}
        />
      );
    }

    case 'chart': {
      const data = computeChartData(records, config);
      return (
        <BarChartWidget
          title={widget.title}
          data={data}
          chartType={config.chartType ?? 'bar'}
          isLoading={isLoading}
        />
      );
    }

    case 'table': {
      const columns = deriveTableColumns(config, form);
      const rows = records.map(r => ({ __submittedAt: r.submittedAt, ...r.data }));
      return (
        <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {widget.title}
          </p>
          <div className="min-h-0 flex-1 overflow-auto">
            <DataTable columns={columns} rows={rows} isLoading={isLoading} />
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}
