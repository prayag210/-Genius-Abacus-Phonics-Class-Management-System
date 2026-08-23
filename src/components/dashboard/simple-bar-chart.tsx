'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function formatValue(v: number, format?: 'currency' | 'number'): string {
  if (format === 'currency') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(v)
  }
  return String(v)
}

export function SimpleBarChart({
  title,
  description,
  data,
  dataKey,
  format,
  height = 280,
  color = 'var(--chart-1)',
  emptyMessage = 'No data yet.',
}: {
  title: string
  description?: string
  data: Record<string, string | number>[]
  dataKey: string
  /** Value display format — avoids passing functions across the server/client boundary. */
  format?: 'currency' | 'number'
  height?: number
  color?: string
  emptyMessage?: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div
            className="flex items-center justify-center text-sm text-muted-foreground"
            style={{ height }}
          >
            {emptyMessage}
          </div>
        ) : (
          <div style={{ height }} className="-ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 18, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  stroke="var(--muted-foreground)"
                  interval={0}
                  angle={data.length > 5 ? -20 : 0}
                  textAnchor={data.length > 5 ? 'end' : 'middle'}
                  height={data.length > 5 ? 50 : 24}
                />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" allowDecimals={false} />
                <Tooltip
                  formatter={(value: number | string) => [
                    formatValue(Number(value), format),
                    undefined as never,
                  ]}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--popover)',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={48}>
                  <LabelList
                    dataKey={dataKey}
                    position="top"
                    style={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                    formatter={(v: number) => formatValue(v, format)}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
