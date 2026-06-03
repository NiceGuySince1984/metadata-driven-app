import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { FullForm, SubmittedRecord } from '@shared/types';
import { getForm } from '../api/metadataApi';
import { listRecords } from '../api/recordsApi';
import DataTable, { type Column } from '../components/widgets/DataTable';

// ── Column derivation ─────────────────────────────────────────────────────────
// Columns come exclusively from the form's field metadata — zero hard-coding.
// Order: submittedAt first, then fields in section / field order.

function deriveColumns(form: FullForm): Column[] {
  const fieldCols: Column[] = form.sections
    .flatMap(s => s.fields)
    .map(f => ({ key: f.name, label: f.label, type: f.type }));

  return [
    { key: '__submittedAt', label: 'Submitted', type: 'datetime' },
    ...fieldCols,
  ];
}

// Map a SubmittedRecord to a flat row object DataTable can consume.
function toRow(record: SubmittedRecord): Record<string, unknown> {
  return { __submittedAt: record.submittedAt, ...record.data };
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-6 w-48 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="h-9 w-36 animate-pulse rounded-lg bg-slate-100" />
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RecordsPage() {
  const { id } = useParams<{ id: string }>();

  const [form, setForm] = useState<FullForm | null>(null);
  const [records, setRecords] = useState<SubmittedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    Promise.all([getForm(id), listRecords(id)])
      .then(([fetchedForm, fetchedRecords]) => {
        setForm(fetchedForm);
        setRecords(fetchedRecords);
      })
      .catch(() => setError('Could not load records. Make sure the backend is running.'))
      .finally(() => setLoading(false));
  }, [id]);

  const columns = useMemo(() => (form ? deriveColumns(form) : []), [form]);
  const rows = useMemo(() => records.map(toRow), [records]);

  if (loading) return <PageSkeleton />;

  if (error) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50">
          <svg className="h-5 w-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L3.07 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="font-display text-xl text-slate-900">Failed to load</h2>
        <p className="mt-1 text-sm text-slate-500">{error}</p>
      </div>
    );
  }

  if (!form) return null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl text-slate-900">{form.name}</h1>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-600">
              {records.length} {records.length === 1 ? 'response' : 'responses'}
            </span>
          </div>
          {form.config.description && (
            <p className="mt-1 text-sm text-slate-500">{form.config.description}</p>
          )}
        </div>

        <Link
          to={`/forms/${id}`}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Submit response
        </Link>
      </div>

      {/* Column source note — makes the metadata-driven nature explicit */}
      <div className="mb-4 flex items-center gap-2 text-xs text-slate-400">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {columns.length - 1} columns derived from {form.sections.length} form sections
        · {records.length} records
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        isLoading={false}
        emptyMessage="No responses submitted yet."
      />
    </div>
  );
}
