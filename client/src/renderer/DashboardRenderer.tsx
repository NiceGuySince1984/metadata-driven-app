import type { Dashboard, Widget, SubmittedRecord, FullForm } from '@shared/types';
import WidgetRenderer from './WidgetRenderer';

interface DashboardRendererProps {
  dashboard: Dashboard;
  // Keyed by widget id — order and presence defined by dashboard.layout
  widgetMap: Map<string, Widget>;
  // Keyed by sourceFormId — fetched once and shared across all widgets
  recordsByFormId: Record<string, SubmittedRecord[]>;
  // Keyed by formId — used for table widget column label derivation
  formsByFormId: Record<string, FullForm>;
  isLoading?: boolean;
}

// One grid-auto-row unit = 160 px.
// h=2  → 320 px  — good for KPI cards and compact charts
// h=4  → 640 px  — good for tables and taller charts
const GRID_ROW_PX = 160;
const GRID_GAP_PX = 16; // gap-4

export default function DashboardRenderer({
  dashboard,
  widgetMap,
  recordsByFormId,
  formsByFormId,
  isLoading,
}: DashboardRendererProps) {
  const { layout } = dashboard;

  if (layout.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-slate-400">This dashboard has no widgets configured.</p>
      </div>
    );
  }

  return (
    <div
      // 12-column grid; rows sized in fixed units so Recharts ResponsiveContainer
      // always has a defined parent height.
      className="grid grid-cols-12 gap-4"
      style={{ gridAutoRows: `${GRID_ROW_PX}px` }}
    >
      {layout.map(item => {
        const widget = widgetMap.get(item.widgetId);
        if (!widget) return null;

        const records = recordsByFormId[widget.config.sourceFormId] ?? [];
        const form    = formsByFormId[widget.config.sourceFormId];

        return (
          <div
            key={item.widgetId}
            data-widget-id={item.widgetId}
            style={{
              gridColumn: `${item.x + 1} / span ${item.w}`,
              gridRow:    `${item.y + 1} / span ${item.h}`,
            }}
          >
            <WidgetRenderer
              widget={widget}
              records={records}
              form={form}
              isLoading={isLoading}
            />
          </div>
        );
      })}
    </div>
  );
}
