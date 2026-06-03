import { useState } from 'react';
import type { SectionWithFields, FieldWithRules, Field } from '@shared/types';
import { updateSection, deleteSection, createField, deleteField } from '../api/adminApi';
import FieldEditor, { labelToName } from './FieldEditor';

interface SectionEditorProps {
  section: SectionWithFields;
  allFormFields: FieldWithRules[];
  onSectionUpdated: (sectionId: string, title: string) => void;
  onSectionDeleted: (sectionId: string) => void;
  onFieldUpdated: (fieldId: string, updated: FieldWithRules) => void;
  onFieldAdded: (sectionId: string, field: FieldWithRules) => void;
  onFieldDeleted: (sectionId: string, fieldId: string) => void;
}

const DEFAULT_TYPES: Field['type'][] = ['text', 'number', 'date', 'select', 'checkbox'];

export default function SectionEditor({
  section,
  allFormFields,
  onSectionUpdated,
  onSectionDeleted,
  onFieldUpdated,
  onFieldAdded,
  onFieldDeleted,
}: SectionEditorProps) {
  const [title,       setTitle]       = useState(section.title);
  const [expandedId,  setExpandedId]  = useState<string | null>(null);
  const [addingField, setAddingField] = useState(false);
  const [newLabel,    setNewLabel]    = useState('');
  const [newType,     setNewType]     = useState<Field['type']>('text');
  const [saving,      setSaving]      = useState(false);

  async function handleTitleBlur() {
    if (title !== section.title && title.trim()) {
      await updateSection(section.id, { title });
      onSectionUpdated(section.id, title);
    }
  }

  async function handleDeleteSection() {
    if (!confirm(`Delete section "${section.title}" and all its fields?`)) return;
    await deleteSection(section.id);
    onSectionDeleted(section.id);
  }

  async function handleAddField() {
    if (!newLabel.trim()) return;
    setSaving(true);
    try {
      const field = await createField(section.id, {
        label: newLabel.trim(),
        name:  labelToName(newLabel.trim()),
        type:  newType,
        config: newType === 'select' ? { options: [] } : {},
      });
      onFieldAdded(section.id, field);
      setNewLabel('');
      setNewType('text');
      setAddingField(false);
      setExpandedId(field.id); // auto-expand the new field for editing
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteField(fieldId: string) {
    const field = section.fields.find(f => f.id === fieldId);
    if (!confirm(`Delete field "${field?.label ?? fieldId}"?`)) return;
    await deleteField(fieldId);
    onFieldDeleted(section.id, fieldId);
    if (expandedId === fieldId) setExpandedId(null);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Section header */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100">
          <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </div>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          className="flex-1 rounded-md px-2 py-1 text-sm font-semibold text-slate-700 focus:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
        <span className="text-xs text-slate-400">
          {section.fields.length} field{section.fields.length !== 1 ? 's' : ''}
        </span>
        <button
          type="button"
          onClick={handleDeleteSection}
          className="rounded p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
          title="Delete section"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Field list */}
      <div className="space-y-1.5 p-3">
        {section.fields.length === 0 && !addingField && (
          <p className="py-2 text-center text-xs text-slate-400">
            No fields yet — add one below.
          </p>
        )}

        {section.fields.map(field => (
          <FieldEditor
            key={field.id}
            field={field}
            allFormFields={allFormFields}
            isExpanded={expandedId === field.id}
            onToggleExpand={() =>
              setExpandedId(expandedId === field.id ? null : field.id)
            }
            onUpdated={updated => onFieldUpdated(field.id, updated)}
            onDeleted={() => handleDeleteField(field.id)}
          />
        ))}

        {/* Add field form */}
        {addingField ? (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-indigo-300 bg-indigo-50/40 p-2.5">
            <input
              autoFocus
              type="text"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddField(); if (e.key === 'Escape') setAddingField(false); }}
              placeholder="Field label"
              className="flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <select
              value={newType}
              onChange={e => setNewType(e.target.value as Field['type'])}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {DEFAULT_TYPES.map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddField}
              disabled={!newLabel.trim() || saving}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? '…' : 'Add'}
            </button>
            <button
              type="button"
              onClick={() => { setAddingField(false); setNewLabel(''); }}
              className="rounded-md px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAddingField(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-200 py-2 text-xs font-medium text-slate-400 transition-colors hover:border-indigo-300 hover:text-indigo-500"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add field
          </button>
        )}
      </div>
    </div>
  );
}
