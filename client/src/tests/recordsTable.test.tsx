import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DataTable, { type Column } from '../components/widgets/DataTable';
import type { FullForm } from '@shared/types';

// ── Column derivation helper (mirrors RecordsPage logic) ─────────────────────
// Tested independently so we can assert the logic without network calls.

function deriveColumns(form: FullForm): Column[] {
  const fieldCols: Column[] = form.sections
    .flatMap(s => s.fields)
    .map(f => ({ key: f.name, label: f.label, type: f.type }));
  return [
    { key: '__submittedAt', label: 'Submitted', type: 'datetime' },
    ...fieldCols,
  ];
}

// ── Mock form ─────────────────────────────────────────────────────────────────

const MOCK_FORM: FullForm = {
  id: 'form_001',
  applicationId: 'app_001',
  name: 'Customer Feedback',
  version: 1,
  config: { submitLabel: 'Submit' },
  crossFieldRules: [],
  sections: [
    {
      id: 'sec_1',
      formId: 'form_001',
      title: 'Contact',
      order: 1,
      fields: [
        { id: 'f1', sectionId: 'sec_1', name: 'firstName', label: 'First Name',  type: 'text',     order: 1, config: {}, validationRules: [] },
        { id: 'f2', sectionId: 'sec_1', name: 'email',     label: 'Email',        type: 'text',     order: 2, config: {}, validationRules: [] },
      ],
    },
    {
      id: 'sec_2',
      formId: 'form_001',
      title: 'Feedback',
      order: 2,
      fields: [
        { id: 'f3', sectionId: 'sec_2', name: 'product',        label: 'Product',      type: 'select',   order: 1, config: { options: [{ label: 'Product A', value: 'Product A' }] }, validationRules: [] },
        { id: 'f4', sectionId: 'sec_2', name: 'rating',         label: 'Rating',       type: 'number',   order: 2, config: {}, validationRules: [] },
        { id: 'f5', sectionId: 'sec_2', name: 'wouldRecommend', label: 'Would Recommend', type: 'checkbox', order: 3, config: {}, validationRules: [] },
        { id: 'f6', sectionId: 'sec_2', name: 'purchaseDate',   label: 'Purchase Date', type: 'date',    order: 4, config: {}, validationRules: [] },
        { id: 'f7', sectionId: 'sec_2', name: 'fullName',       label: 'Full Name',    type: 'computed', order: 5, config: { expression: { op: 'concat', fields: ['firstName'] } }, validationRules: [] },
      ],
    },
  ],
};

// ── Column derivation tests ───────────────────────────────────────────────────

describe('deriveColumns — metadata-driven column generation', () => {
  it('prepends a submittedAt column as the first column', () => {
    const cols = deriveColumns(MOCK_FORM);
    expect(cols[0]).toEqual({ key: '__submittedAt', label: 'Submitted', type: 'datetime' });
  });

  it('includes one column per form field in section / field order', () => {
    const cols = deriveColumns(MOCK_FORM);
    // 1 submittedAt + 2 contact + 5 feedback fields = 8
    expect(cols).toHaveLength(8);
  });

  it('derives column keys from field.name', () => {
    const cols = deriveColumns(MOCK_FORM);
    const keys = cols.map(c => c.key);
    expect(keys).toContain('firstName');
    expect(keys).toContain('email');
    expect(keys).toContain('product');
    expect(keys).toContain('rating');
    expect(keys).toContain('wouldRecommend');
  });

  it('derives column labels from field.label', () => {
    const cols = deriveColumns(MOCK_FORM);
    const labels = cols.map(c => c.label);
    expect(labels).toContain('First Name');
    expect(labels).toContain('Email');
    expect(labels).toContain('Rating');
  });

  it('derives column type from field.type', () => {
    const cols = deriveColumns(MOCK_FORM);
    expect(cols.find(c => c.key === 'rating')?.type).toBe('number');
    expect(cols.find(c => c.key === 'wouldRecommend')?.type).toBe('checkbox');
    expect(cols.find(c => c.key === 'purchaseDate')?.type).toBe('date');
    expect(cols.find(c => c.key === 'fullName')?.type).toBe('computed');
  });

  it('preserves section and field order', () => {
    const cols = deriveColumns(MOCK_FORM);
    const keys = cols.map(c => c.key).filter(k => k !== '__submittedAt');
    expect(keys).toEqual(['firstName', 'email', 'product', 'rating', 'wouldRecommend', 'purchaseDate', 'fullName']);
  });
});

// ── DataTable rendering tests ─────────────────────────────────────────────────

const COLUMNS: Column[] = [
  { key: '__submittedAt', label: 'Submitted',       type: 'datetime' },
  { key: 'firstName',    label: 'First Name',       type: 'text'     },
  { key: 'rating',       label: 'Rating',           type: 'number'   },
  { key: 'wouldRecommend', label: 'Recommend',      type: 'checkbox' },
  { key: 'product',      label: 'Product',          type: 'select'   },
  { key: 'purchaseDate', label: 'Purchase Date',    type: 'date'     },
];

const ROWS: Record<string, unknown>[] = [
  {
    __submittedAt:  '2026-06-03T10:00:00.000Z',
    firstName:      'Alice',
    rating:         5,
    wouldRecommend: true,
    product:        'Product A',
    purchaseDate:   '2026-05-15',
  },
  {
    __submittedAt:  '2026-06-03T11:00:00.000Z',
    firstName:      'Bob',
    rating:         3,
    wouldRecommend: false,
    product:        'Product B',
    purchaseDate:   '',
  },
];

describe('DataTable — structure', () => {
  it('renders a column header for every column', () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} />);
    expect(screen.getByText(/First Name/i)).toBeInTheDocument();
    expect(screen.getByText(/Rating/i)).toBeInTheDocument();
    expect(screen.getByText(/Recommend/i)).toBeInTheDocument();
    expect(screen.getByText('Product')).toBeInTheDocument();
  });

  it('renders one table row per record', () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} />);
    const table = screen.getByTestId('records-table');
    const bodyRows = within(table).getAllByRole('row').slice(1); // skip header
    expect(bodyRows).toHaveLength(2);
  });

  it('displays text cell values', () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('renders select values as badge chips', () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} />);
    expect(screen.getByText('Product A')).toBeInTheDocument();
    expect(screen.getByText('Product B')).toBeInTheDocument();
  });

  it('renders empty cells as a dash placeholder', () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} />);
    // Bob has no purchaseDate → should show '—'
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);
  });
});

describe('DataTable — cell type rendering', () => {
  it('renders a checkmark for boolean true', () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} />);
    // Alice's wouldRecommend === true → rendered as SVG checkmark
    // The cell contains an svg, not the text "true"
    const table = screen.getByTestId('records-table');
    expect(within(table).queryByText('true')).not.toBeInTheDocument();
  });

  it('formats dates (does not display raw ISO string)', () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} />);
    // Raw value is '2026-05-15'; rendered value should be human-readable
    expect(screen.queryByText('2026-05-15')).not.toBeInTheDocument();
    // Should contain 'May' somewhere in the date column
    expect(screen.getByText(/May/)).toBeInTheDocument();
  });
});

describe('DataTable — empty state', () => {
  it('shows an empty-state message when rows is empty', () => {
    render(<DataTable columns={COLUMNS} rows={[]} emptyMessage="No responses yet." />);
    expect(screen.getByText('No responses yet.')).toBeInTheDocument();
  });

  it('does not render a table element when rows is empty', () => {
    render(<DataTable columns={COLUMNS} rows={[]} />);
    expect(screen.queryByTestId('records-table')).not.toBeInTheDocument();
  });
});

describe('DataTable — sorting', () => {
  it('toggles sort direction when the same column header is clicked twice', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={COLUMNS} rows={ROWS} />);

    const firstNameHeader = screen.getByText(/First Name/i).closest('th')!;

    // First click → ascending (Alice before Bob)
    await user.click(firstNameHeader);
    const rowsAsc = within(screen.getByTestId('records-table'))
      .getAllByRole('row').slice(1)
      .map(r => r.textContent ?? '');
    expect(rowsAsc[0]).toMatch(/Alice/);

    // Second click → descending (Bob before Alice)
    await user.click(firstNameHeader);
    const rowsDesc = within(screen.getByTestId('records-table'))
      .getAllByRole('row').slice(1)
      .map(r => r.textContent ?? '');
    expect(rowsDesc[0]).toMatch(/Bob/);
  });
});

describe('DataTable — pagination', () => {
  // Generate 30 rows to trigger pagination controls
  const manyRows = Array.from({ length: 30 }, (_, i) => ({
    __submittedAt: new Date(2026, 5, i + 1).toISOString(),
    firstName: `Person${i + 1}`,
    rating: (i % 5) + 1,
    wouldRecommend: i % 2 === 0,
    product: 'Product A',
    purchaseDate: '',
  }));

  it('shows only the first page of rows on initial render (default 25 per page)', () => {
    render(<DataTable columns={COLUMNS} rows={manyRows} />);
    const table = screen.getByTestId('records-table');
    const bodyRows = within(table).getAllByRole('row').slice(1);
    expect(bodyRows).toHaveLength(25);
  });

  it('renders pagination controls when rows exceed page size', () => {
    render(<DataTable columns={COLUMNS} rows={manyRows} />);
    expect(screen.getByLabelText('Next page')).toBeInTheDocument();
    expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
  });

  it('navigates to the next page on clicking Next', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={COLUMNS} rows={manyRows} />);

    await user.click(screen.getByLabelText('Next page'));

    // Second page has only 5 rows (30 total, 25 on first page)
    const table = screen.getByTestId('records-table');
    const bodyRows = within(table).getAllByRole('row').slice(1);
    expect(bodyRows).toHaveLength(5);
  });

  it('disables the Previous button on the first page', () => {
    render(<DataTable columns={COLUMNS} rows={manyRows} />);
    expect(screen.getByLabelText('Previous page')).toBeDisabled();
  });
});
