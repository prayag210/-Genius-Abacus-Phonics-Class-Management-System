'use client'

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function CollectionTrendChart({
  title,
  description,
  data,
  height = 300,
}: {
  title: string
  description?: string
  data: { month: string; collected: number; expenses: number }[]
  height?: number
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent>
        {data.every((d) => d.collected === 0 && d.expenses === 0) ? (
          <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
            No financial activity recorded yet.
          </div>
        ) : (
          <div style={{ height }} className="-ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="var(--muted-foreground)"
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                  }
                />
                <Tooltip
                  formatter={(value: number | string, name: string) => {
                    const label = name === 'collected' ? 'Collected' : 'Expenses'
                    return [`₹${Number(value).toLocaleString('en-IN')}`, label]
                  }}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--popover)',
                    fontSize: 12,
                  }}
                />
                <Legend formatter={(v: string) => (v === 'collected' ? 'Fees Collected' : 'Expenses')} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="collected" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="var(--chart-5)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
