"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

export interface ChartCardProps {
  title?: string
  description?: string
  data: Array<Record<string, unknown>>
  type?: "line" | "bar" | "area"
  dataKeys: {
    x: string
    y: string | string[]
  }
  colors?: string[]
  height?: number
  className?: string
  showGrid?: boolean
  showLegend?: boolean
  actions?: React.ReactNode
}

const defaultColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

export function ChartCard({
  title,
  description,
  data,
  type = "line",
  dataKeys,
  colors = defaultColors,
  height = 300,
  className,
  showGrid = true,
  showLegend = false,
  actions,
}: ChartCardProps) {
  const yKeys = Array.isArray(dataKeys.y) ? dataKeys.y : [dataKeys.y]

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 5, left: 5, bottom: 5 },
    }

    const axisProps = {
      xAxis: {
        dataKey: dataKeys.x,
        stroke: "hsl(var(--muted-foreground))",
        fontSize: 12,
        tickLine: false,
        axisLine: false,
      },
      yAxis: {
        stroke: "hsl(var(--muted-foreground))",
        fontSize: 12,
        tickLine: false,
        axisLine: false,
        tickFormatter: (value: number) =>
          value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value.toString(),
      },
    }

    switch (type) {
      case "bar":
        return (
          <BarChart {...commonProps}>
            {showGrid && (
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
            )}
            <XAxis {...axisProps.xAxis} />
            <YAxis {...axisProps.yAxis} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
            />
            {showLegend && <Legend />}
            {yKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors[index % colors.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        )

      case "area":
        return (
          <AreaChart {...commonProps}>
            {showGrid && (
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
            )}
            <XAxis {...axisProps.xAxis} />
            <YAxis {...axisProps.yAxis} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
            />
            {showLegend && <Legend />}
            {yKeys.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                fill={colors[index % colors.length]}
                fillOpacity={0.2}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        )

      case "line":
      default:
        return (
          <LineChart {...commonProps}>
            {showGrid && (
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
            )}
            <XAxis {...axisProps.xAxis} />
            <YAxis {...axisProps.yAxis} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
            />
            {showLegend && <Legend />}
            {yKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        )
    }
  }

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      {(title || actions) && (
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            {title && (
              <CardTitle className="text-base font-medium">{title}</CardTitle>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </CardHeader>
      )}
      <CardContent className={cn(!title && !actions && "pt-6")}>
        <ResponsiveContainer width="100%" height={height}>
          {renderChart()}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
