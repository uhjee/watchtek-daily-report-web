'use client'

import { useState, useCallback, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import memberMap from '@/lib/config/members'

// 이름으로 priority 찾기 (이름 기반 매핑)
const getPersonPriority = (personName: string): number => {
  const member = Object.values(memberMap).find((m) => m.name === personName)
  return member?.priority ?? 999
}

interface GroupPieChartProps {
  tasks: Array<{
    group: string
    subGroup: string
    items: Array<{
      title: string
      person: string
      progress?: number
      manHour: number
    }>
  }>
}

interface ChartDataItem {
  name: string
  value: number
  items: Array<{
    title: string
    person: string
    progress?: number
    manHour: number
  }>
  [key: string]: unknown
}

interface TooltipData {
  name: string
  value: number
  items: Array<{
    title: string
    person: string
    progress?: number
    manHour: number
  }>
}

const COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // green-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
  '#f97316', // orange-500
  '#6366f1', // indigo-500
]

/**
 * 고정 위치 툴팁 컴포넌트 (Portal 기반)
 */
function FixedTooltip({
  data,
  position,
  onMouseEnter,
  onMouseLeave,
}: {
  data: TooltipData
  position: { x: number; y: number }
  onMouseEnter: () => void
  onMouseLeave: () => void
}) {
  const itemCount = data.items.length
  const manDay = Math.round((data.value / 8) * 10) / 10

  // 아이템 정렬: 1. 진척률 내림차순, 2. 사람 이름 priority 오름차순
  const sortedItems = useMemo(() => {
    return [...data.items].sort((a, b) => {
      // 1. 진척률 내림차순 (undefined는 맨 뒤로)
      const progressA = a.progress ?? -1
      const progressB = b.progress ?? -1
      if (progressB !== progressA) {
        return progressB - progressA
      }

      // 2. 사람 이름 priority 오름차순
      const priorityA = getPersonPriority(a.person)
      const priorityB = getPersonPriority(b.person)
      return priorityA - priorityB
    })
  }, [data.items])

  return (
    <div
      className="fixed text-popover-foreground p-4 border border-border rounded-lg shadow-xl z-[9999] whitespace-nowrap bg-[#2a2e3e]"
      style={{
        left: position.x + 15,
        top: position.y - 10,
        pointerEvents: 'auto',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <h3 className="font-bold text-base mb-2">{data.name}</h3>
      <p className="text-sm text-muted-foreground mb-3">
        {data.value}m/h, {manDay}m/d, {itemCount}건
      </p>
      <div className="space-y-1">
        {sortedItems.map((item, index) => (
          <div key={index} className="text-xs border-l-2 border-muted pl-2 py-0.5">
            {item.title} / {item.person}
            {item.progress !== undefined && ` / ${item.progress}%`}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Group별 공수를 파이 차트로 표시하는 컴포넌트
 */
export function GroupPieChart({ tasks }: GroupPieChartProps) {
  // 툴팁 상태 관리
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [isTooltipHovered, setIsTooltipHovered] = useState(false)
  const [isPieHovered, setIsPieHovered] = useState(false)

  // 마우스 이벤트 핸들러
  const handlePieMouseEnter = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data: ChartDataItem, _index: number, e: any) => {
      // Recharts 이벤트 객체에서 마우스 좌표 추출
      const mouseEvent = e as MouseEvent
      const clientX = mouseEvent?.clientX ?? 0
      const clientY = mouseEvent?.clientY ?? 0

      setTooltipData({
        name: data.name,
        value: data.value,
        items: data.items,
      })
      setTooltipPosition({ x: clientX, y: clientY })
      setIsPieHovered(true)
    },
    []
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePieMouseMove = useCallback((e: any) => {
    const mouseEvent = e as MouseEvent
    const clientX = mouseEvent?.clientX ?? 0
    const clientY = mouseEvent?.clientY ?? 0
    if (clientX > 0 && clientY > 0) {
      setTooltipPosition({ x: clientX, y: clientY })
    }
  }, [])

  const handlePieMouseLeave = useCallback(() => {
    setIsPieHovered(false)
    // 툴팁이 hover되지 않은 경우에만 숨김
    setTimeout(() => {
      setIsPieHovered((prev) => {
        if (!prev) {
          setTooltipData(null)
        }
        return prev
      })
    }, 100)
  }, [])

  const handleTooltipMouseEnter = useCallback(() => {
    setIsTooltipHovered(true)
  }, [])

  const handleTooltipMouseLeave = useCallback(() => {
    setIsTooltipHovered(false)
    setTooltipData(null)
  }, [])

  // 툴팁 표시 여부 (position이 유효할 때만)
  const showTooltip =
    tooltipData &&
    (isPieHovered || isTooltipHovered) &&
    tooltipPosition.x > 0 &&
    tooltipPosition.y > 0

  // Group별 공수 및 items 집계
  const groupData = tasks.reduce(
    (acc, task) => {
      const group = task.group

      if (!acc[group]) {
        acc[group] = {
          totalManHour: 0,
          items: [],
        }
      }

      // 공수 합산
      const totalManHour = task.items.reduce((sum, item) => sum + item.manHour, 0)
      acc[group].totalManHour += totalManHour

      // items 추가
      acc[group].items.push(...task.items)

      return acc
    },
    {} as Record<
      string,
      {
        totalManHour: number
        items: Array<{
          title: string
          person: string
          progress?: number
          manHour: number
        }>
      }
    >
  )

  // 차트 데이터 형식으로 변환 (items 정보 포함)
  const chartData: ChartDataItem[] = Object.entries(groupData).map(([name, data]) => ({
    name,
    value: data.totalManHour,
    items: data.items,
  }))

  // 총 공수 계산
  const totalManHour = chartData.reduce((sum, item) => sum + item.value, 0)
  const totalManDay = Math.round((totalManHour / 8) * 10) / 10

  // 커스텀 라벨 렌더러 (m/d와 % 표시)
  const renderCustomLabel = ({
    name,
    value,
    percent,
  }: {
    name?: string
    value?: number
    percent?: number
  }) => {
    if (!name || value === undefined || percent === undefined) return ''
    const manDay = Math.round((value / 8) * 10) / 10
    const percentage = Math.round(percent * 100)
    return `${name} (${manDay}m/d, ${percentage}%)`
  }

  return (
    <div className="h-full flex flex-col">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            isAnimationActive={false}
            onMouseEnter={handlePieMouseEnter}
            onMouseMove={handlePieMouseMove}
            onMouseLeave={handlePieMouseLeave}
          >
            {chartData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                style={{ cursor: 'pointer' }}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="text-center text-sm text-muted-foreground mt-2">
        총 공수: {totalManHour}m/h, {totalManDay}m/d
      </div>

      {/* 커스텀 툴팁 (Portal 방식으로 body에 렌더링) */}
      {showTooltip && (
        <FixedTooltip
          data={tooltipData}
          position={tooltipPosition}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        />
      )}
    </div>
  )
}
