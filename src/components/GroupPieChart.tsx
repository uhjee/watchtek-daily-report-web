'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

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

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    payload: ChartDataItem
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
 * 커스텀 툴팁 컴포넌트
 */
function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null
  }

  const data = payload[0].payload
  const itemCount = data.items.length

  return (
    <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg max-w-md">
      <h3 className="font-bold text-base mb-2">
        {data.name}
      </h3>
      <p className="text-sm text-gray-600 mb-3">
        {data.value}m/h, {itemCount}건
      </p>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {data.items.map((item, index) => (
          <div key={index} className="text-xs text-gray-700 border-l-2 border-gray-300 pl-2">
            - {item.title} / {item.person}
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
  // 디버깅: 입력 데이터 확인
  console.log('=== GroupPieChart 입력 데이터 ===')
  console.log('tasks 배열:', tasks)

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
      console.log(`  ${group} (${task.subGroup}): +${totalManHour}m/h (items: ${task.items.length}개)`)
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

  // 디버깅: 집계 결과 확인
  console.log('=== Group별 집계 결과 ===')
  chartData.forEach((item) => {
    console.log(`  ${item.name}: ${item.value}m/h (${item.items.length}건)`)
  })

  // 총 공수 계산
  const totalManHour = chartData.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="h-full flex flex-col">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) =>
              `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
            }
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <div className="text-center text-sm text-muted-foreground mt-2">
        총 공수: {totalManHour}m/h
      </div>
    </div>
  )
}
