import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import type { Dashboard, Widget, SubmittedRecord, FullForm } from '@shared/types';
import { getDashboard, getWidget, getForm } from '../api/metadataApi';
import { listRecords } from '../api/recordsApi';
import DashboardRenderer from '../renderer/DashboardRenderer';

// ── Loading skeleton ──────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 space-y-2">
        <div className="h-7 w-52 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-4 w-36 animate-pulse rounded bg-slate-100" />
      </div>
      {/* Mimic the seeded 3-widget layout */}
      <div className="grid grid-cols-12 gap-4" style={{ gridAutoRows: '160px' }}>
        <div className="col-span-4 row-span-2 animate-pulse rounded-xl bg-slate-100" />
        <div className="col-span-8 row-span-2 animate-pulse rounded-xl bg-slate-100" />
        <div className="col-span-12 row-span-4 animate-pulse rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { id } = useParams<{ id: string }>();

  const [dashboard,      setDashboard]      = useState<Dashboard | null>(null);
  const [widgetMap,      setWidgetMap]      = useState(new Map<string, Widget>());
  const [recordsByFormId, setRecordsByFormId] = useState<Record<string, SubmittedRecord[]>>({});
  const [formsByFormId,   setFormsByFormId]   = useState<Record<string, FullForm>>({});
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    getDashboard(id)
      .then(async dash => {
        setDashboard(dash);

        // Fetch every widget referenced in the layout
        const widgetIds = [...new Set(dash.layout.map(l => l.widgetId))];
        const widgets = await Promise.all(widgetIds.map(wid => getWidget(wid)));
        const map = new Map(widgets.map(w => [w.id, w]));
        setWidgetMap(map);

        // Collect unique sourceFormIds to avoid duplicate fetches
        const formIds = [
          ...new Set(widgets.map(w => w.config.sourceFormId).filter(Boolean)),
        ] as string[];

        // Fetch forms and records in parallel — one fetch per unique formId
        const [forms, recordArrays] = await Promise.all([
          Promise.all(formIds.map(fid => getForm(fid))),
          Promise.all(formIds.map(fid => listRecords(fid))),
        ]);

        const formsMap: Record<string, FullForm>           = {};
        const recordsMap: Record<string, SubmittedRecord[]> = {};
        formIds.forEach((fid, i) => {
          formsMap[fid]   = forms[i];
          recordsMap[fid] = recordArrays[i];
        });

        setFormsByFormId(formsMap);
        setRecordsByFormId(recordsMap);
      })
      .catch(() => setError('Could not load dashboard. Make sure the backend is running.'))
      .finally(() => setLoading(false));
  }, [id]);

  const totalRecords = useMemo(
    () => Object.values(recordsByFormId).reduce((sum, recs) => sum + recs.length, 0),
    [recordsByFormId],
  );

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50">
          <svg className="h-5 w-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L3.07 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="font-display text-xl text-slate-900">Dashboard unavailable</h2>
        <p className="mt-1 text-sm text-slate-500">{error}</p>
      </div>
    );
  }

  if (!dashboard) return null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl text-slate-900">{dashboard.name}</h1>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-600">
              {dashboard.layout.length} widget{dashboard.layout.length !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {totalRecords} total record{totalRecords !== 1 ? 's' : ''} across {Object.keys(recordsByFormId).length} form{Object.keys(recordsByFormId).length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Dashboard grid — layout driven entirely by dashboard.layout metadata */}
      <DashboardRenderer
        dashboard={dashboard}
        widgetMap={widgetMap}
        recordsByFormId={recordsByFormId}
        formsByFormId={formsByFormId}
      />
    </div>
  );
}
