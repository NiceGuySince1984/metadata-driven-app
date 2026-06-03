import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Application, Form } from '@shared/types';
import { getApplications, listForms } from '../api/metadataApi';
import { createApplication, createForm } from '../api/adminApi';

// ── Type badge ────────────────────────────────────────────────────────────────

function VersionBadge({ v }: { v: number }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
      v{v}
    </span>
  );
}

// ── Create form dialog ────────────────────────────────────────────────────────

function CreateFormDialog({
  applications,
  onClose,
  onCreated,
}: {
  applications: Application[];
  onClose: () => void;
  onCreated: (form: { id: string }) => void;
}) {
  const [name, setName] = useState('');
  const [appId, setAppId] = useState(applications[0]?.id ?? '');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim() || !appId) return;
    setCreating(true);
    setError(null);
    try {
      const form = await createForm({ applicationId: appId, name: name.trim() });
      onCreated(form);
    } catch {
      setError('Failed to create form. Try again.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
        <h2 className="font-display text-xl text-slate-900">New form</h2>
        <p className="mt-1 text-sm text-slate-500">
          Create a blank form definition to configure.
        </p>

        <div className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Form name
            </label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. Customer Survey"
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {applications.length > 1 && (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Application
              </label>
              <select
                value={appId}
                onChange={e => setAppId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {applications.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <p className="text-xs text-rose-600">{error}</p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || creating}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create form'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Form card ─────────────────────────────────────────────────────────────────

function FormCard({ form }: { form: Form }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-4 py-3 transition-shadow hover:shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-50">
          <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-900">{form.name}</span>
            <VersionBadge v={form.version} />
          </div>
          {(form.config as { description?: string }).description && (
            <p className="mt-0.5 text-xs text-slate-400">
              {(form.config as { description?: string }).description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link
          to={`/forms/${form.id}`}
          className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          title="Preview form"
        >
          Preview
        </Link>
        <Link
          to={`/admin/forms/${form.id}`}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit
        </Link>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [formsByApp, setFormsByApp]     = useState<Record<string, Form[]>>({});
  const [loading, setLoading]           = useState(true);
  const [showCreate, setShowCreate]     = useState(false);

  useEffect(() => {
    Promise.all([getApplications(), listForms()])
      .then(([apps, forms]) => {
        setApplications(apps);
        const grouped: Record<string, Form[]> = {};
        for (const app of apps) grouped[app.id] = [];
        for (const form of forms) {
          if (!grouped[form.applicationId]) grouped[form.applicationId] = [];
          grouped[form.applicationId].push(form);
        }
        setFormsByApp(grouped);
      })
      .finally(() => setLoading(false));
  }, []);

  function handleCreated(form: { id: string }) {
    setShowCreate(false);
    navigate(`/admin/forms/${form.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-slate-900">Admin</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create and edit form metadata.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New form
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : (
        applications.map(app => (
          <div key={app.id} className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {app.name}
              </h2>
              <div className="h-px flex-1 bg-slate-100" />
            </div>
            {(formsByApp[app.id] ?? []).length === 0 ? (
              <p className="text-sm text-slate-400">No forms yet.</p>
            ) : (
              <div className="space-y-2">
                {(formsByApp[app.id] ?? []).map(form => (
                  <FormCard key={form.id} form={form} />
                ))}
              </div>
            )}
          </div>
        ))
      )}

      {showCreate && (
        <CreateFormDialog
          applications={applications}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
