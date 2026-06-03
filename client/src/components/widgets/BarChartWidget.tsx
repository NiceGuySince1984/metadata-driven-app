import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';

export interface ChartDatum {
  name: string;
  value: number;
}

interface BarChartWidgetProps {
  title: string;
  data: ChartDatum[];
  chartType?: 'bar' | 'line' | 'pie';
  isLoading?: boolean;
}

// Indigo → slate palette; readable on white
const PALETTE = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#84cc16',
];

const TOOLTIP_STYLE = {
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,.07)',
  fontSize: '12px',
  fontFamily: '"DM Sans", sans-serif',
};

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-sm text-slate-400">No data yet</p>
    </div>
  );
}

function ChartBody({
  data,
  chartType,
}: {
  data: ChartDatum[];
  chartType: 'bar' | 'line' | 'pie';
}) {
  if (data.length === 0) return <EmptyChart />;

  if (chartType === 'bar') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#f8fafc' }} />
          <Bar dataKey="value" name="Count" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={56} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Line
            type="monotone"
            dataKey="value"
            name="Count"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // pie
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius="70%"
          strokeWidth={0}
          label={({ name, percent }) =>
            `${name} ${(percent * 100).toFixed(0)}%`
          }
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default function BarChartWidget({
  title,
  data,
  chartType = 'bar',
  isLoading,
}: BarChartWidgetProps) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="mb-3 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </p>

      <div className="min-h-0 flex-1">
        {isLoading ? (
          <div className="h-full animate-pulse rounded-lg bg-slate-100" />
        ) : (
          <ChartBody data={data} chartType={chartType} />
        )}
      </div>
    </div>
  );
}
