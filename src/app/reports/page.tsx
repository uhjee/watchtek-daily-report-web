'use client'

import { useState, useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { TaskCard } from '@/components/ui/task-card'
import { StatCard } from '@/components/ui/stat-card'
import { toast } from 'sonner'
import { GroupPieChart } from '@/components/GroupPieChart'
import { Users, TrendingUp, CheckCircle2 } from 'lucide-react'

// 단일 보고서 데이터 타입
interface SingleReportData {
  date: string
  title: string
  manHourSummary: Array<{
    name: string
    hours: number
    isCompleted?: boolean
    leaveInfo?: string
  }>
  tasks: {
    inProgress: Array<{
      group: string
      subGroup: string
      items: Array<{
        title: string
        person: string
        progress?: number
        manHour: number
      }>
    }>
    planned?: Array<{
      group: string
      subGroup: string
      items: Array<{
        title: string
        person: string
        manHour: number
      }>
    }>
    completed?: Array<{
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
  weeklyTasks?: Array<{
    group: string
    subGroup: string
    items: Array<{
      title: string
      person: string
      progress?: number
      manHour: number
    }>
  }>
  createdAt: string
}

// API 응답 타입 (여러 보고서 포함)
interface ReportResponse {
  reportTypes: {
    isHoliday: boolean
    shouldGenerateDaily: boolean
    shouldGenerateWeekly: boolean
    shouldGenerateMonthly: boolean
  }
  daily: SingleReportData | null
  weekly: SingleReportData | null
  monthly: SingleReportData | null
}

async function createReport(date?: string): Promise<ReportResponse> {
  const res = await fetch('/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date }),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || '보고서 생성 실패')
  }

  return res.json()
}

// 같은 group을 묶어서 표시하기 위한 헬퍼 타입
interface GroupedTask {
  group: string
  subGroups: Array<{
    subGroup: string
    items: Array<{
      title: string
      person: string
      progress?: number
      manHour: number
    }>
  }>
}

export default function ReportsPage() {
  const [reportResponse, setReportResponse] = useState<ReportResponse | null>(null)

  const mutation = useMutation({
    mutationFn: createReport,
    onSuccess: (data) => {
      setReportResponse(data)
      // 생성된 보고서 종류 표시
      const types = []
      if (data.daily) types.push('일간')
      if (data.weekly) types.push('주간')
      if (data.monthly) types.push('월간')
      toast.success(`${types.join(', ')} 보고서가 생성되었습니다!`)
    },
    onError: (error: Error) => {
      toast.error(error.message || '보고서 생성에 실패했습니다.')
    },
  })

  // daily 보고서 데이터 (UI 표시용)
  const report = reportResponse?.daily || null

  const handleCreateReport = () => {
    mutation.mutate(undefined)
  }

  // 같은 Group을 묶어서 표시하기 위한 그룹핑 로직
  const groupedInProgressTasks = useMemo(() => {
    if (!report?.tasks?.inProgress) return []

    const grouped = new Map<string, GroupedTask>()

    report.tasks.inProgress.forEach((task) => {
      if (!grouped.has(task.group)) {
        grouped.set(task.group, {
          group: task.group,
          subGroups: [],
        })
      }

      grouped.get(task.group)!.subGroups.push({
        subGroup: task.subGroup,
        items: task.items,
      })
    })

    return Array.from(grouped.values())
  }, [report])

  // 예정업무도 같은 방식으로 그룹핑
  const groupedPlannedTasks = useMemo(() => {
    if (!report?.tasks?.planned) return []

    const grouped = new Map<string, GroupedTask>()

    report.tasks.planned.forEach((task) => {
      if (!grouped.has(task.group)) {
        grouped.set(task.group, {
          group: task.group,
          subGroups: [],
        })
      }

      grouped.get(task.group)!.subGroups.push({
        subGroup: task.subGroup,
        items: task.items,
      })
    })

    return Array.from(grouped.values())
  }, [report])

  // 주간 전체 작업 데이터 (파이 차트용 - 이번 주 월요일~오늘)
  const weeklyTasks = useMemo(() => {
    if (!report?.weeklyTasks) return []
    return report.weeklyTasks
  }, [report])

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            와치텍 큐브파트 보고서
            {report && (
              <span className="text-2xl text-muted-foreground ml-3">
                ({report.date})
              </span>
            )}
          </h1>
          <p className="text-muted-foreground">Notion 기반 자동 보고서 생성</p>
        </div>
        <Button
          onClick={handleCreateReport}
          disabled={mutation.isPending}
          size="lg"
        >
          {mutation.isPending ? '생성 중...' : '오늘 보고서 만들기'}
        </Button>
      </div>

      <Separator />

      {mutation.isPending && (
        <Card>
          <CardHeader>
            <CardTitle>보고서 생성 중...</CardTitle>
            <CardDescription>잠시만 기다려주세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      )}

      {report && !mutation.isPending && (
        <div className="space-y-6">
          {/* 파이 차트와 인원별 공수를 가로로 배치 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Group별 파이 차트 */}
            <Card>
              <CardHeader>
                <CardTitle>주간 Group별 공수 분포</CardTitle>
                <CardDescription>{report.date} (이번 주 월요일~오늘)</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <GroupPieChart tasks={weeklyTasks} />
              </CardContent>
            </Card>

            {/* 인원별 공수 */}
            <Card>
              <CardHeader>
                <CardTitle>인원별 공수</CardTitle>
                <CardDescription>{report.date}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이름</TableHead>
                      <TableHead>공수 (m/h)</TableHead>
                      <TableHead>작성 완료</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.manHourSummary.map((person, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{person.name}</TableCell>
                        <TableCell>{person.hours}m/h</TableCell>
                        <TableCell className="text-xl">
                          {person.isCompleted ? '✅' : '❌'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* 진행업무 & 예정업무 - 50% 씩 가로 배치 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 진행업무 */}
            <Card>
              <CardHeader>
                <CardTitle>진행업무</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {groupedInProgressTasks.map((groupData, gIndex) => (
                  <div key={gIndex} className="space-y-3">
                    <h3 className="font-semibold text-lg">
                      {gIndex + 1}. {groupData.group}
                    </h3>
                    {groupData.subGroups.map((subGroup, sIndex) => (
                      <div key={sIndex} className="space-y-2 pl-4">
                        <p className="text-sm text-muted-foreground font-medium">[{subGroup.subGroup}]</p>
                        <div className="space-y-2 pl-4">
                          {subGroup.items.map((item, iIndex) => (
                            <TaskCard
                              key={iIndex}
                              title={item.title}
                              person={item.person}
                              manHour={item.manHour}
                              progress={item.progress}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* 예정업무 */}
            <Card>
              <CardHeader>
                <CardTitle>예정업무</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {groupedPlannedTasks.map((groupData, gIndex) => (
                  <div key={gIndex} className="space-y-3">
                    <h3 className="font-semibold text-lg">
                      {gIndex + 1}. {groupData.group}
                    </h3>
                    {groupData.subGroups.map((subGroup, sIndex) => (
                      <div key={sIndex} className="space-y-2 pl-4">
                        <p className="text-sm text-muted-foreground font-medium">[{subGroup.subGroup}]</p>
                        <div className="space-y-2 pl-4">
                          {subGroup.items.map((item, iIndex) => (
                            <TaskCard
                              key={iIndex}
                              title={item.title}
                              person={item.person}
                              manHour={item.manHour}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {!report && !mutation.isPending && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <p>버튼을 클릭하여 오늘의 보고서를 생성하세요</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
