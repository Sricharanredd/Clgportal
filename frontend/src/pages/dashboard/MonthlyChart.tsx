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

export default function MonthlyChart({ data }: { data: MonthlyCollection[] }) {
  const rows = data.map((m) => ({ month: m.month, amount: Number(m.amount), count: m.count }));

  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">No collections recorded yet.</p>;
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="collectionsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7960ad" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#7960ad" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(121,96,173,0.15)" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#81788f' }} tickLine={false} />
          <YAxis
            tick={{ fontSize: 11, fill: '#81788f' }}
            width={56}
            tickFormatter={(v: number) =>
              v >= 100000 ? `₹${(v / 100000).toFixed(v % 100000 === 0 ? 0 : 1)}L` : `₹${Math.round(v / 1000)}k`
            }
          />
          <Tooltip
            formatter={(value) => [inr(Number(value)), 'Collected']}
            labelFormatter={(label) => `Month ${label}`}
            contentStyle={{ borderRadius: 12, border: '1px solid rgba(121,96,173,0.25)' }}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="#7960ad"
            strokeWidth={2}
            fill="url(#collectionsFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
