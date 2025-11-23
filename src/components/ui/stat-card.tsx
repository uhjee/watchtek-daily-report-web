import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

export interface StatCardProps {
  title?: string
  value: string | number
  label?: string
  icon?: LucideIcon
  iconColor?: string
  trend?: {
    value: string
    isPositive: boolean
  }
  className?: string
}

export function StatCard({
  title,
  value,
  label,
  icon: Icon,
  iconColor,
  trend,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn("space-y-1", !title && "pt-6")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {Icon && (
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  iconColor || "bg-primary/10"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    iconColor ? "text-current" : "text-primary"
                  )}
                />
              </div>
            )}
            <div>
              <div className="text-2xl font-bold tracking-tight">{value}</div>
              {label && (
                <p className="text-xs text-muted-foreground">{label}</p>
              )}
            </div>
          </div>
          {trend && (
            <div
              className={cn(
                "flex items-center gap-1 text-sm font-medium",
                trend.isPositive ? "text-chart-3" : "text-destructive"
              )}
            >
              <span>{trend.isPositive ? "↑" : "↓"}</span>
              <span>{trend.value}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
