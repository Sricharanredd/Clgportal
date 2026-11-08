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
              <stop offset="0%" stopColor="#174C32" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#7DA989" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(23,76,50,0.12)" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#5A6B60' }} tickLine={false} axisLine={false} />
          <YAxis
            tick={{ fontSize: 11, fill: '#5A6B60' }}
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
              border: '1px solid #E3EBDD',
              background: '#FFFFFF',
              boxShadow: '0 12px 28px -18px rgba(23,76,50,0.35)',
              fontSize: 12,
            }}
            labelStyle={{ color: '#5A6B60', fontWeight: 600 }}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="#174C32"
            strokeWidth={2}
            fill="url(#collectionsFill)"
            activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
