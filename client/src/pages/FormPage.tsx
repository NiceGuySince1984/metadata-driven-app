import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { FullForm, SubmittedRecord } from '@shared/types';
import { getForm } from '../api/metadataApi';
import { submitRecord, ApiValidationError } from '../api/recordsApi';
import FormRenderer from '../renderer/FormRenderer';

// ── Sub-states ────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8 space-y-3">
        <div className="h-7 w-1/2 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="mb-8">
          <div className="mb-5 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-100" />
            <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
            <div className="h-px flex-1 bg-slate-100" />
          </div>
          <div className="grid grid-cols-2 gap-5">
            {[1, 2].map(j => (
              <div key={j} className="space-y-2">
                <div className="h-3.5 w-24 animate-pulse rounded bg-slate-200" />
                <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50">
        <svg className="h-6 w-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L3.07 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h2 className="font-display text-xl text-slate-900">Unable to load form</h2>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
    </div>
  );
}

function SuccessCard({
  record,
  formId,
  formName,
  onReset,
}: {
  record: SubmittedRecord;
  formId: string;
  formName: string;
  onReset: () => void;
}) {
  const entries = Object.entries(record.data).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  );

  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center animate-scale-in">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
        <svg className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 className="font-display text-2xl text-slate-900">Response submitted</h2>
      <p className="mt-1.5 text-sm text-slate-500">
        Thank you for completing <span className="font-medium text-slate-700">{formName}</span>.
      </p>

      {/* Summary card */}
      <div className="mt-6 rounded-xl border border-slate-100 bg-white p-4 text-left shadow-sm">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Your response
        </p>
        <dl className="divide-y divide-slate-50">
          {entries.map(([key, val]) => (
            <div key={key} className="flex justify-between gap-4 py-2">
              <dt className="text-xs capitalize text-slate-400">{key}</dt>
              <dd className="text-right text-xs font-medium text-slate-700">
                {String(val)}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          onClick={onReset}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 active:scale-95"
        >
          Submit another
        </button>
        <Link
          to={`/forms/${formId}/records`}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
          </svg>
          View all responses
        </Link>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FormPage() {
  const { id } = useParams<{ id: string }>();

  const [form, setForm] = useState<FullForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string> | undefined>();
  const [submittedRecord, setSubmittedRecord] = useState<SubmittedRecord | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    setSubmittedRecord(null);

    getForm(id)
      .then(setForm)
      .catch(() => setLoadError('Could not load form. Make sure the backend is running on port 3001.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(data: Record<string, unknown>) {
    if (!form) return;
    setIsSubmitting(true);
    setServerErrors(undefined);
    setSubmitError(null);

    try {
      const record = await submitRecord(form.id, data);
      setSubmittedRecord(record);
    } catch (err) {
      if (err instanceof ApiValidationError) {
        const fieldErrors: Record<string, string> = {};
        for (const e of err.errors) fieldErrors[e.field] = e.message;
        setServerErrors(fieldErrors);
      } else {
        setSubmitError('Submission failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) return <LoadingSkeleton />;
  if (loadError) return <ErrorCard message={loadError} />;
  if (submittedRecord && form) {
    return (
      <SuccessCard
        record={submittedRecord}
        formId={form.id}
        formName={form.name}
        onReset={() => setSubmittedRecord(null)}
      />
    );
  }
  if (!form) return null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 pb-28">
      {submitError && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
          <svg className="h-4 w-4 shrink-0 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-rose-700">{submitError}</p>
        </div>
      )}

      <FormRenderer
        form={form}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        serverErrors={serverErrors}
      />
    </div>
  );
}
