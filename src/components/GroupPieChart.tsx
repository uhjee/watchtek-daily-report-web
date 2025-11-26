'use client'

import { useState, useCallback, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Sector, Legend } from 'recharts'
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
  /** 클릭으로 선택된 group (외부에서 제어) */
  selectedGroup?: string | null
  /** group 클릭 시 호출되는 콜백 */
  onGroupClick?: (group: string | null) => void
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

interface ShapeProps {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  startAngle: number
  endAngle: number
  fill: string
  payload: ChartDataItem
  percent: number
  value: number
}

// Active Shape 렌더러 (hover 시 확장된 섹터 + 라벨)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderActiveShape = (props: any) => {
  const RADIAN = Math.PI / 180
  const {
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
    value,
  } = props as ShapeProps
  const sin = Math.sin(-RADIAN * midAngle)
  const cos = Math.cos(-RADIAN * midAngle)
  const sx = cx + (outerRadius + 10) * cos
  const sy = cy + (outerRadius + 10) * sin
  const mx = cx + (outerRadius + 25) * cos
  const my = cy + (outerRadius + 25) * sin
  const ex = mx + (cos >= 0 ? 1 : -1) * 16
  const ey = my
  const textAnchor = cos >= 0 ? 'start' : 'end'

  const manDay = Math.round((value / 8) * 10) / 10
  const percentage = Math.round(percent * 100)

  return (
    <g>
      {/* 중앙 텍스트 */}
      <text x={cx} y={cy} dy={-4} textAnchor="middle" className="fill-foreground text-sm font-medium" style={{ pointerEvents: 'none' }}>
        {payload.name}
      </text>
      <text x={cx} y={cy} dy={14} textAnchor="middle" className="fill-muted-foreground text-xs" style={{ pointerEvents: 'none' }}>
        {manDay}m/d ({percentage}%)
      </text>
      {/* 메인 섹터 (확장) */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      {/* 확장된 외곽 섹터 */}
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 16}
        fill={fill}
      />
      {/* 라벨 연결선 */}
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" strokeWidth={2} style={{ pointerEvents: 'none' }} />
      <circle cx={ex} cy={ey} r={3} fill={fill} stroke="none" style={{ pointerEvents: 'none' }} />
      {/* 라벨 텍스트 */}
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 6}
        y={ey}
        textAnchor={textAnchor}
        className="fill-foreground text-xs font-medium"
        style={{ pointerEvents: 'none' }}
      >
        {payload.name}
      </text>
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 6}
        y={ey}
        dy={14}
        textAnchor={textAnchor}
        className="fill-muted-foreground text-[11px]"
        style={{ pointerEvents: 'none' }}
      >
        {`${manDay}m/d (${percentage}%)`}
      </text>
    </g>
  )
}

// 커스텀 범례 렌더러
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderLegend = (props: any) => {
  const { payload } = props
  if (!payload) return null

  // m/d 내림차순으로 정렬
  const sortedPayload = [...payload].sort((a, b) => {
    const aValue = a.payload?.value ?? 0
    const bValue = b.payload?.value ?? 0
    return bValue - aValue
  })

  return (
    <ul className="flex flex-col gap-1.5 text-xs">
      {sortedPayload.map((entry, index) => {
        const manDay = entry.payload?.value ? Math.round((entry.payload.value / 8) * 10) / 10 : 0
        return (
          <li key={`legend-${index}`} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-foreground truncate">{entry.value}</span>
            <span className="text-muted-foreground ml-auto">{manDay}m/d</span>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Group별 공수를 파이 차트로 표시하는 컴포넌트
 */
export function GroupPieChart({ tasks, selectedGroup, onGroupClick }: GroupPieChartProps) {
  // Active 인덱스 상태 (hover용)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  // 툴팁 상태 관리
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [isTooltipHovered, setIsTooltipHovered] = useState(false)
  const [isPieHovered, setIsPieHovered] = useState(false)

  // 마우스 이벤트 핸들러
  const handlePieMouseEnter = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data: ChartDataItem, index: number, e: any) => {
      // Hover 인덱스 업데이트
      setHoverIndex(index)

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
    setHoverIndex(null)
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

  // 클릭 이벤트 핸들러 (Pie 컴포넌트용)
  const handlePieClick = useCallback(
    (data: ChartDataItem, index: number, e: React.MouseEvent) => {
      // 이벤트 버블링 방지 (PieChart의 onClick이 호출되지 않도록)
      e.stopPropagation()

      console.log('Pie onClick triggered:', data, index)
      if (!onGroupClick) return

      const clickedName = data?.name
      if (!clickedName) return

      // 같은 영역 클릭 시 선택 해제, 다른 영역 클릭 시 새로 선택
      if (selectedGroup === clickedName) {
        onGroupClick(null)
      } else {
        onGroupClick(clickedName)
      }
    },
    [onGroupClick, selectedGroup]
  )

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

  // 차트 데이터 형식으로 변환 (items 정보 포함) + m/d 내림차순 정렬
  const chartData: ChartDataItem[] = Object.entries(groupData)
    .map(([name, data]) => ({
      name,
      value: data.totalManHour,
      items: data.items,
    }))
    .sort((a, b) => b.value - a.value)

  // 총 공수 계산
  const totalManHour = chartData.reduce((sum, item) => sum + item.value, 0)
  const totalManDay = Math.round((totalManHour / 8) * 10) / 10

  // 선택된 group의 인덱스 계산
  const selectedIndex = useMemo(() => {
    if (!selectedGroup) return null
    return chartData.findIndex((item) => item.name === selectedGroup)
  }, [selectedGroup, chartData])

  // activeIndex 결정: hover 중이면 hoverIndex, 아니면 selectedIndex
  const activeIndex = hoverIndex !== null ? hoverIndex : (selectedIndex !== null && selectedIndex >= 0 ? selectedIndex : undefined)


  // PieChart 빈 영역 클릭 시 필터 해제
  const handleChartClick = useCallback(() => {
    // 이 핸들러는 Pie 영역 클릭 시에는 호출되지 않음 (이벤트 버블링 방지)
    // 빈 영역 클릭 시에만 호출됨
    if (onGroupClick && selectedGroup) {
      onGroupClick(null)
    }
  }, [onGroupClick, selectedGroup])

  return (
    <div className="h-full flex flex-col">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart
          margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
          onClick={onGroupClick ? handleChartClick : undefined}
        >
          <Pie
            activeIndex={activeIndex}
            activeShape={renderActiveShape}
            data={chartData}
            cx="35%"
            cy="50%"
            innerRadius="40%"
            outerRadius="70%"
            fill="#8884d8"
            dataKey="value"
            isAnimationActive={true}
            onMouseEnter={handlePieMouseEnter}
            onMouseMove={handlePieMouseMove}
            onMouseLeave={handlePieMouseLeave}
            onClick={onGroupClick ? handlePieClick : undefined}
          >
            {chartData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                cursor={onGroupClick ? 'pointer' : 'default'}
              />
            ))}
          </Pie>
          <Legend
            content={renderLegend}
            layout="vertical"
            align="right"
            verticalAlign="middle"
            wrapperStyle={{ paddingLeft: 20 }}
          />
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
