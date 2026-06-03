import { useState, useMemo } from 'react';
import type { FieldType } from '@shared/types';

export interface Column {
  key: string;
  label: string;
  type: FieldType | 'datetime';
}

interface DataTableProps {
  columns: Column[];
  rows: Record<string, unknown>[];
  isLoading?: boolean;
  emptyMessage?: string;
}

// ── Cell formatting ───────────────────────────────────────────────────────────

function formatDatetime(raw: unknown): string {
  if (!raw) return '';
  try {
    return new Date(String(raw)).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return String(raw);
  }
}

function formatDate(raw: unknown): string {
  if (!raw) return '';
  try {
    return new Date(String(raw)).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return String(raw);
  }
}

function CellValue({ value, type }: { value: unknown; type: Column['type'] }) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-slate-300">—</span>;
  }

  switch (type) {
    case 'checkbox':
      return value === true ? (
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      ) : (
        <span className="text-slate-300">—</span>
      );

    case 'datetime':
      return (
        <span className="whitespace-nowrap text-slate-500 tabular-nums">
          {formatDatetime(value)}
        </span>
      );

    case 'date':
      return (
        <span className="whitespace-nowrap tabular-nums">{formatDate(value)}</span>
      );

    case 'number':
      return (
        <span className="tabular-nums">{String(value)}</span>
      );

    case 'select':
      return (
        <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
          {String(value)}
        </span>
      );

    default: {
      const str = String(value);
      return str.length > 60 ? (
        <span title={str} className="cursor-default">
          {str.slice(0, 60)}<span className="text-slate-400">…</span>
        </span>
      ) : (
        <>{str}</>
      );
    }
  }
}

// ── Sort icon ─────────────────────────────────────────────────────────────────

function SortIcon({ dir }: { dir: 'asc' | 'desc' | null }) {
  if (!dir) {
    return (
      <svg className="h-3.5 w-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    );
  }
  return (
    <svg className="h-3.5 w-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      {dir === 'asc'
        ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        : <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      }
    </svg>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <>
      {[1, 2, 3, 4, 5].map(r => (
        <tr key={r} className="border-b border-slate-100">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-4 py-3">
              <div
                className="h-4 animate-pulse rounded bg-slate-100"
                style={{ width: `${55 + ((r * 17 + c * 31) % 45)}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// ── Main component ────────────────────────────────────────────────────────────

export default function DataTable({
  columns,
  rows,
  isLoading = false,
  emptyMessage = 'No records yet.',
}: DataTableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(0);
  }

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const av = String(a[sortKey] ?? '');
      const bv = String(b[sortKey] ?? '');
      const cmp = av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const pageRows = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const startRow = sorted.length === 0 ? 0 : page * pageSize + 1;
  const endRow = Math.min((page + 1) * pageSize, sorted.length);

  if (!isLoading && rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-600">{emptyMessage}</p>
        <p className="mt-1 text-xs text-slate-400">Submitted responses will appear here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full border-collapse text-sm" data-testid="records-table">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {columns.map(col => (
                <th
                  key={col.key}
                  className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left"
                  onClick={() => toggleSort(col.key)}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      {col.label}
                    </span>
                    <SortIcon dir={sortKey === col.key ? sortDir : null} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? <TableSkeleton cols={columns.length} />
              : pageRows.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/60"
                >
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={[
                        'px-4 py-3 text-sm text-slate-700',
                        col.type === 'number' ? 'text-right tabular-nums' : '',
                        col.type === 'checkbox' ? 'text-center' : '',
                      ].join(' ')}
                    >
                      <CellValue value={row[col.key]} type={col.type} />
                    </td>
                  ))}
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {/* Pagination bar */}
      {!isLoading && sorted.length > 0 && (
        <div className="flex items-center justify-between px-1 pt-3 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <span className="text-xs">Rows per page</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {PAGE_SIZE_OPTIONS.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs">
              {startRow}–{endRow} of {sorted.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="rounded-md p-1 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Previous page"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="min-w-[4rem] text-center text-xs">
                {page + 1} / {Math.max(totalPages, 1)}
              </span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                className="rounded-md p-1 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Next page"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
