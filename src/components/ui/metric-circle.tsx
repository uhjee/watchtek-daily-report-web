import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface MetricCircleProps {
  title?: string
  value: number
  label?: string
  size?: "sm" | "md" | "lg"
  className?: string
  gradient?: {
    from: string
    via?: string
    to: string
  }
}

const sizeConfig = {
  sm: { circle: 80, stroke: 6, fontSize: "text-xl" },
  md: { circle: 120, stroke: 8, fontSize: "text-3xl" },
  lg: { circle: 160, stroke: 10, fontSize: "text-4xl" },
}

export function MetricCircle({
  title,
  value,
  label,
  size = "md",
  className,
  gradient = {
    from: "rgb(255, 87, 51)", // #FF5733
    via: "rgb(255, 178, 77)", // #FFB24D
    to: "rgb(255, 107, 53)", // #FF6B35
  },
}: MetricCircleProps) {
  const config = sizeConfig[size]
  const radius = (config.circle - config.stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  const gradientId = React.useId()

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn("flex flex-col items-center", !title && "pt-6")}>
        <div className="relative" style={{ width: config.circle, height: config.circle }}>
          <svg
            width={config.circle}
            height={config.circle}
            className="rotate-[-90deg]"
          >
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={gradient.from} />
                {gradient.via && <stop offset="50%" stopColor={gradient.via} />}
                <stop offset="100%" stopColor={gradient.to} />
              </linearGradient>
            </defs>
            {/* Background circle */}
            <circle
              cx={config.circle / 2}
              cy={config.circle / 2}
              r={radius}
              stroke="hsl(var(--muted))"
              strokeWidth={config.stroke}
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx={config.circle / 2}
              cy={config.circle / 2}
              r={radius}
              stroke={`url(#${gradientId})`}
              strokeWidth={config.stroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn("font-bold text-foreground", config.fontSize)}>
              {value}%
            </span>
          </div>
        </div>
        {label && (
          <p className="mt-4 text-sm text-muted-foreground">{label}</p>
        )}
      </CardContent>
    </Card>
  )
}
