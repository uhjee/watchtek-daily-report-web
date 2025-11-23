import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

export interface TaskCardProps {
  title: string
  person: string
  manHour: number
  progress?: number
  className?: string
  onClick?: () => void
}

export function TaskCard({
  title,
  person,
  manHour,
  progress,
  className,
  onClick,
}: TaskCardProps) {
  return (
    <div
      className={cn(
        "group relative flex items-center justify-between overflow-hidden rounded-lg border bg-card p-4 transition-all hover:shadow-md",
        onClick && "cursor-pointer hover:border-primary/50",
        className
      )}
      onClick={onClick}
    >
      <div className="flex-1 space-y-1">
        <p className="font-medium leading-none">{title}</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{person}</span>
          <span className="text-muted-foreground/50">•</span>
          <span className="text-primary font-medium">{manHour}m/h</span>
        </div>
      </div>

      {progress !== undefined && (
        <Badge
          variant={progress === 100 ? "default" : "secondary"}
          className={cn(
            "ml-4",
            progress === 100 && "bg-chart-3 hover:bg-chart-3/90"
          )}
        >
          {progress}%
        </Badge>
      )}
    </div>
  )
}
