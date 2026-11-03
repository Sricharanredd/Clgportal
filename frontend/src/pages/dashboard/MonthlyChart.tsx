/** Monthly collections area chart (Recharts) shared by principal/accounts. */
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MonthlyCollection } from '@/shared/api/types';
import { inr } from '@/shared/lib/format';
import { EmptyState } from '@/components/ui/States';

export default function MonthlyChart({ data }: { data: MonthlyCollection[] }) {
  const rows = data.map((m) => ({ month: m.month, amount: Number(m.amount), count: m.count }));

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No collections recorded yet"
        description="Monthly totals appear here once payments are recorded."
        compact
      />
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="collectionsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6D4EC4" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#6D4EC4" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(23,19,38,0.08)" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B6580' }} tickLine={false} axisLine={false} />
          <YAxis
            tick={{ fontSize: 11, fill: '#6B6580' }}
            width={56}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) =>
              v >= 100000 ? `₹${(v / 100000).toFixed(v % 100000 === 0 ? 0 : 1)}L` : `₹${Math.round(v / 1000)}k`
            }
          />
          <Tooltip
            formatter={(value) => [inr(Number(value)), 'Collected']}
            labelFormatter={(label) => `Month ${label}`}
            contentStyle={{
              borderRadius: 12,
              border: '1px solid #E7E4F0',
              boxShadow: '0 10px 24px -14px rgba(23,19,38,0.22)',
              fontSize: 12,
            }}
            labelStyle={{ color: '#6B6580', fontWeight: 600 }}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="#6D4EC4"
            strokeWidth={2}
            fill="url(#collectionsFill)"
            activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
