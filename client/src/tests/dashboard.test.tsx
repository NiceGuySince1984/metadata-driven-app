import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import {
  computeKpiValue,
  computeChartData,
  deriveTableColumns,
} from '../renderer/WidgetRenderer';
import KpiCard from '../components/widgets/KpiCard';
import BarChartWidget from '../components/widgets/BarChartWidget';
import DashboardRenderer from '../renderer/DashboardRenderer';
import type { SubmittedRecord, Widget, Dashboard, FullForm, WidgetConfig } from '@shared/types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function record(data: Record<string, unknown>, submittedAt?: string): SubmittedRecord {
  return {
    id: Math.random().toString(36).slice(2),
    formId: 'form_001',
    formVersion: 1,
    applicationId: 'app_001',
    submittedAt: submittedAt ?? '2026-06-03T10:00:00.000Z',
    data,
  };
}

const RECORDS: SubmittedRecord[] = [
  record({ rating: 5, product: 'Product A', firstName: 'Alice' }),
  record({ rating: 4, product: 'Product B', firstName: 'Bob' }),
  record({ rating: 5, product: 'Product A', firstName: 'Carol' }),
  record({ rating: 3, product: 'Product C', firstName: 'Dave' }),
  record({ rating: 4, product: 'Product A', firstName: 'Eve' }),
];

const KPI_CONFIG: WidgetConfig = { sourceFormId: 'form_001', metric: 'count' };

const CHART_CONFIG: WidgetConfig = {
  sourceFormId: 'form_001',
  chartType: 'bar',
  xField: 'rating',
  yMetric: 'count',
};

// ── computeKpiValue ───────────────────────────────────────────────────────────

describe('computeKpiValue', () => {
  it('count: returns total number of records', () => {
    expect(computeKpiValue(RECORDS, { ...KPI_CONFIG, metric: 'count' })).toBe('5');
  });

  it('count: returns 0 for empty records', () => {
    expect(computeKpiValue([], { ...KPI_CONFIG, metric: 'count' })).toBe('0');
  });

  it('sum: sums the specified field across all records', () => {
    // ratings: 5+4+5+3+4 = 21
    expect(computeKpiValue(RECORDS, { ...KPI_CONFIG, metric: 'sum', field: 'rating' })).toBe('21');
  });

  it('sum: returns 0 when no records have the field', () => {
    expect(computeKpiValue(RECORDS, { ...KPI_CONFIG, metric: 'sum', field: 'nonexistent' })).toBe('0');
  });

  it('avg: returns average formatted to 1 decimal place', () => {
    // (5+4+5+3+4)/5 = 21/5 = 4.2
    expect(computeKpiValue(RECORDS, { ...KPI_CONFIG, metric: 'avg', field: 'rating' })).toBe('4.2');
  });

  it('avg: returns 0 for empty records', () => {
    expect(computeKpiValue([], { ...KPI_CONFIG, metric: 'avg', field: 'rating' })).toBe('0');
  });

  it('skips non-numeric field values when computing sum/avg', () => {
    const mixed = [
      record({ score: 10 }),
      record({ score: 'not a number' }),
      record({ score: 20 }),
    ];
    expect(computeKpiValue(mixed, { ...KPI_CONFIG, metric: 'sum', field: 'score' })).toBe('30');
  });
});

// ── computeChartData ──────────────────────────────────────────────────────────

describe('computeChartData', () => {
  it('groups records by xField and counts them', () => {
    const data = computeChartData(RECORDS, CHART_CONFIG);
    // ratings: 3×1, 4×2, 5×2
    const byName = Object.fromEntries(data.map(d => [d.name, d.value]));
    expect(byName['3']).toBe(1);
    expect(byName['4']).toBe(2);
    expect(byName['5']).toBe(2);
  });

  it('sorts numeric keys in ascending order', () => {
    const data = computeChartData(RECORDS, CHART_CONFIG);
    const names = data.map(d => Number(d.name));
    expect(names).toEqual([...names].sort((a, b) => a - b));
  });

  it('sorts string keys alphabetically', () => {
    const data = computeChartData(RECORDS, {
      ...CHART_CONFIG,
      xField: 'product',
    });
    const names = data.map(d => d.name);
    expect(names).toEqual([...names].sort());
  });

  it('groups by product correctly', () => {
    const data = computeChartData(RECORDS, { ...CHART_CONFIG, xField: 'product' });
    const byName = Object.fromEntries(data.map(d => [d.name, d.value]));
    expect(byName['Product A']).toBe(3);
    expect(byName['Product B']).toBe(1);
    expect(byName['Product C']).toBe(1);
  });

  it('returns empty array for empty records', () => {
    expect(computeChartData([], CHART_CONFIG)).toHaveLength(0);
  });

  it('labels unknown xField values as "Unknown"', () => {
    const r = [record({ rating: 5 }), record({})]; // second has no rating
    const data = computeChartData(r, CHART_CONFIG);
    const names = data.map(d => d.name);
    expect(names).toContain('Unknown');
  });

  it('sum yMetric: sums field values per group', () => {
    const data = computeChartData(RECORDS, {
      ...CHART_CONFIG,
      xField: 'product',
      yMetric: 'sum',
      field: 'rating',
    });
    const byName = Object.fromEntries(data.map(d => [d.name, d.value]));
    // Product A: 5+5+4=14
    expect(byName['Product A']).toBe(14);
  });
});

// ── deriveTableColumns ────────────────────────────────────────────────────────

const MOCK_FORM: FullForm = {
  id: 'form_001', applicationId: 'app_001', name: 'Test', version: 1, config: {},
  crossFieldRules: [],
  sections: [{
    id: 's1', formId: 'form_001', title: 'Section', order: 1,
    fields: [
      { id: 'f1', sectionId: 's1', name: 'firstName', label: 'First Name', type: 'text', order: 1, config: {}, validationRules: [] },
      { id: 'f2', sectionId: 's1', name: 'rating',    label: 'Rating',     type: 'number', order: 2, config: {}, validationRules: [] },
    ],
  }],
};

describe('deriveTableColumns', () => {
  it('prepends a submittedAt column', () => {
    const cols = deriveTableColumns({ sourceFormId: 'form_001', columns: [] }, MOCK_FORM);
    expect(cols[0]).toMatchObject({ key: '__submittedAt', type: 'datetime' });
  });

  it('maps widget config columns to field labels from form metadata', () => {
    const cols = deriveTableColumns(
      { sourceFormId: 'form_001', columns: ['firstName', 'rating'] },
      MOCK_FORM,
    );
    expect(cols.find(c => c.key === 'firstName')?.label).toBe('First Name');
    expect(cols.find(c => c.key === 'rating')?.label).toBe('Rating');
  });

  it('uses field.type for column type', () => {
    const cols = deriveTableColumns(
      { sourceFormId: 'form_001', columns: ['rating'] },
      MOCK_FORM,
    );
    expect(cols.find(c => c.key === 'rating')?.type).toBe('number');
  });

  it('falls back to field name as label when form is not provided', () => {
    const cols = deriveTableColumns({ sourceFormId: 'form_001', columns: ['someField'] });
    expect(cols.find(c => c.key === 'someField')?.label).toBe('someField');
  });
});

// ── KpiCard rendering ─────────────────────────────────────────────────────────

describe('KpiCard', () => {
  it('renders the title and value', () => {
    render(<KpiCard title="Total Submissions" value="42" />);
    expect(screen.getByText('Total Submissions')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-value')).toHaveTextContent('42');
  });

  it('renders prefix and suffix when provided', () => {
    render(<KpiCard title="Revenue" value="1,234" prefix="$" suffix="USD" />);
    expect(screen.getByText('$')).toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();
  });

  it('renders a loading skeleton instead of value when isLoading is true', () => {
    render(<KpiCard title="Total" value="42" isLoading />);
    expect(screen.queryByTestId('kpi-value')).not.toBeInTheDocument();
  });
});

// ── BarChartWidget rendering ──────────────────────────────────────────────────

describe('BarChartWidget', () => {
  it('renders the title', () => {
    const data = [{ name: '4', value: 3 }, { name: '5', value: 2 }];
    render(<BarChartWidget title="Rating Distribution" data={data} />);
    expect(screen.getByText('Rating Distribution')).toBeInTheDocument();
  });

  it('shows "No data yet" when data is empty', () => {
    render(<BarChartWidget title="Empty Chart" data={[]} />);
    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });

  it('renders a loading skeleton when isLoading is true', () => {
    const { container } = render(
      <BarChartWidget title="Loading" data={[]} isLoading />,
    );
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});

// ── DashboardRenderer — layout from metadata ──────────────────────────────────

describe('DashboardRenderer', () => {
  const KPI_WIDGET: Widget = {
    id: 'w1',
    type: 'kpi',
    title: 'Total Responses',
    config: { sourceFormId: 'form_001', metric: 'count' },
  };

  const CHART_WIDGET: Widget = {
    id: 'w2',
    type: 'chart',
    title: 'Rating Distribution',
    config: { sourceFormId: 'form_001', chartType: 'bar', xField: 'rating', yMetric: 'count' },
  };

  const DASHBOARD: Dashboard = {
    id: 'dash_001',
    applicationId: 'app_001',
    name: 'Test Dashboard',
    version: 1,
    layout: [
      { widgetId: 'w1', x: 0, y: 0, w: 4,  h: 2 },
      { widgetId: 'w2', x: 4, y: 0, w: 8,  h: 2 },
    ],
  };

  const widgetMap = new Map([['w1', KPI_WIDGET], ['w2', CHART_WIDGET]]);

  it('renders a container for every widget in the layout', () => {
    render(
      <DashboardRenderer
        dashboard={DASHBOARD}
        widgetMap={widgetMap}
        recordsByFormId={{ form_001: RECORDS }}
        formsByFormId={{}}
      />,
    );

    expect(screen.getByText('Total Responses')).toBeInTheDocument();
    expect(screen.getByText('Rating Distribution')).toBeInTheDocument();
  });

  it('positions each widget using layout x/y/w/h as inline grid styles', () => {
    const { container } = render(
      <DashboardRenderer
        dashboard={DASHBOARD}
        widgetMap={widgetMap}
        recordsByFormId={{ form_001: RECORDS }}
        formsByFormId={{}}
      />,
    );

    const w1El = container.querySelector('[data-widget-id="w1"]') as HTMLElement;
    const w2El = container.querySelector('[data-widget-id="w2"]') as HTMLElement;

    expect(w1El.style.gridColumn).toBe('1 / span 4');
    expect(w1El.style.gridRow).toBe('1 / span 2');
    expect(w2El.style.gridColumn).toBe('5 / span 8');
  });

  it('computes KPI value from real record data and renders it', () => {
    render(
      <DashboardRenderer
        dashboard={DASHBOARD}
        widgetMap={widgetMap}
        recordsByFormId={{ form_001: RECORDS }}
        formsByFormId={{}}
      />,
    );
    // 5 records → KPI shows "5"
    expect(screen.getByTestId('kpi-value')).toHaveTextContent('5');
  });

  it('shows an empty state message when the layout has no widgets', () => {
    render(
      <DashboardRenderer
        dashboard={{ ...DASHBOARD, layout: [] }}
        widgetMap={widgetMap}
        recordsByFormId={{}}
        formsByFormId={{}}
      />,
    );
    expect(screen.getByText(/no widgets configured/i)).toBeInTheDocument();
  });

  it('skips layout items whose widgetId is not in widgetMap', () => {
    const sparseLayout: Dashboard = {
      ...DASHBOARD,
      layout: [
        { widgetId: 'w1',      x: 0, y: 0, w: 6, h: 2 },
        { widgetId: 'missing', x: 6, y: 0, w: 6, h: 2 }, // not in map
      ],
    };
    const { container } = render(
      <DashboardRenderer
        dashboard={sparseLayout}
        widgetMap={widgetMap}
        recordsByFormId={{ form_001: RECORDS }}
        formsByFormId={{}}
      />,
    );
    expect(container.querySelectorAll('[data-widget-id]')).toHaveLength(1);
  });
});
