import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { FullForm, FieldWithRules, SectionWithFields } from '@shared/types';
import { getForm } from '../api/metadataApi';
import { updateForm, createSection } from '../api/adminApi';
import SectionEditor from '../admin/SectionEditor';

// ── Loading skeleton ──────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6 h-8 w-64 animate-pulse rounded-lg bg-slate-200" />
      <div className="mb-4 h-20 animate-pulse rounded-xl bg-slate-100" />
      {[1, 2].map(i => (
        <div key={i} className="mb-4 space-y-2">
          <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-10 animate-pulse rounded-lg bg-slate-50" />
          <div className="h-10 animate-pulse rounded-lg bg-slate-50" />
        </div>
      ))}
    </div>
  );
}

// ── Form settings card ────────────────────────────────────────────────────────

function FormSettingsCard({
  form,
  onSaved,
}: {
  form: FullForm;
  onSaved: (updated: FullForm) => void;
}) {
  const [submitLabel, setSubmitLabel] = useState(form.config.submitLabel ?? '');
  const [description, setDescription] = useState(form.config.description ?? '');
  const [saving,      setSaving]      = useState(false);

  // Keep in sync when parent form changes (e.g. after refresh)
  useEffect(() => {
    setSubmitLabel(form.config.submitLabel ?? '');
    setDescription(form.config.description ?? '');
  }, [form.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    setSaving(true);
    try {
      const updated = await updateForm(form.id, {
        config: { submitLabel, description },
      });
      onSaved(updated);
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        Form settings
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-500">Submit button label</label>
          <input
            type="text"
            value={submitLabel}
            onChange={e => setSubmitLabel(e.target.value)}
            onBlur={save}
            placeholder="Submit"
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-500">Description</label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            onBlur={save}
            placeholder="Optional description shown to respondents"
            className={inputClass}
          />
        </div>
      </div>
      {saving && <p className="mt-2 text-right text-[11px] text-slate-400 animate-pulse">Saving…</p>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FormEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [form,    setForm]    = useState<FullForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getForm(id)
      .then(f => { setForm(f); setFormName(f.name); })
      .catch(() => setError('Could not load form.'))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Name save ───────────────────────────────────────────────────────────────

  async function handleNameBlur() {
    if (!form || formName === form.name || !formName.trim()) return;
    setSavingName(true);
    try {
      const updated = await updateForm(form.id, { name: formName.trim() });
      setForm(updated);
    } finally {
      setSavingName(false);
    }
  }

  // ── Section mutations ───────────────────────────────────────────────────────

  async function handleAddSection() {
    if (!form) return;
    const section = await createSection(form.id, { title: 'New Section' });
    setForm({
      ...form,
      sections: [...form.sections, { ...section, fields: [] }],
    });
  }

  function handleSectionTitleUpdated(sectionId: string, title: string) {
    setForm(f => f && {
      ...f,
      sections: f.sections.map(s => s.id === sectionId ? { ...s, title } : s),
    });
  }

  function handleSectionDeleted(sectionId: string) {
    setForm(f => f && {
      ...f,
      sections: f.sections.filter(s => s.id !== sectionId),
    });
  }

  // ── Field mutations ─────────────────────────────────────────────────────────

  function handleFieldAdded(sectionId: string, field: FieldWithRules) {
    setForm(f => f && {
      ...f,
      sections: f.sections.map(s =>
        s.id === sectionId ? { ...s, fields: [...s.fields, field] } : s,
      ),
    });
  }

  function handleFieldUpdated(fieldId: string, updated: FieldWithRules) {
    setForm(f => f && {
      ...f,
      sections: f.sections.map(s => ({
        ...s,
        fields: s.fields.map(field =>
          field.id === fieldId ? updated : field,
        ),
      })),
    });
  }

  function handleFieldDeleted(sectionId: string, fieldId: string) {
    setForm(f => f && {
      ...f,
      sections: f.sections.map(s =>
        s.id === sectionId
          ? { ...s, fields: s.fields.filter(f => f.id !== fieldId) }
          : s,
      ),
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) return <Skeleton />;

  if (error || !form) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <p className="text-sm text-slate-500">{error ?? 'Form not found.'}</p>
      </div>
    );
  }

  const allFormFields: FieldWithRules[] = form.sections.flatMap(s => s.fields);
  const totalFields = allFormFields.length;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      {/* Top bar */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex flex-1 flex-col gap-1.5">
          <Link
            to="/admin"
            className="flex w-fit items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Admin
          </Link>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              onBlur={handleNameBlur}
              className="rounded-lg px-2 py-1 font-display text-2xl text-slate-900 focus:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            {savingName && <span className="text-xs text-slate-400 animate-pulse">Saving…</span>}
          </div>
          <p className="text-xs text-slate-400">
            {form.sections.length} section{form.sections.length !== 1 ? 's' : ''} · {totalFields} field{totalFields !== 1 ? 's' : ''}
          </p>
        </div>

        <Link
          to={`/forms/${form.id}`}
          target="_blank"
          rel="noopener"
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Preview
        </Link>
      </div>

      {/* Form settings */}
      <FormSettingsCard form={form} onSaved={setForm} />

      {/* Sections */}
      <div className="space-y-4">
        {form.sections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center">
            <p className="text-sm text-slate-400">No sections yet.</p>
            <p className="mt-1 text-xs text-slate-400">Add a section to start building your form.</p>
          </div>
        ) : (
          form.sections.map(section => (
            <SectionEditor
              key={section.id}
              section={section}
              allFormFields={allFormFields}
              onSectionUpdated={handleSectionTitleUpdated}
              onSectionDeleted={handleSectionDeleted}
              onFieldUpdated={handleFieldUpdated}
              onFieldAdded={handleFieldAdded}
              onFieldDeleted={handleFieldDeleted}
            />
          ))
        )}

        {/* Add section */}
        <button
          type="button"
          onClick={handleAddSection}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 py-3 text-sm font-medium text-slate-400 transition-colors hover:border-indigo-300 hover:text-indigo-500"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add section
        </button>
      </div>
    </div>
  );
}
