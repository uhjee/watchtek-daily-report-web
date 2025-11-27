'use client'

import { useMemo } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { GroupPieChart } from '@/components/GroupPieChart'
import { DashboardLayout } from '@/components/layout'
import { ReportTextFormatterService } from '@/lib/services/reportTextFormatterService'
import { formatDateToShortFormat } from '@/lib/utils/dateUtils'
import {
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Briefcase,
  FileUp,
  RefreshCw,
  ExternalLink,
  FileText,
  Copy,
} from 'lucide-react'

// ReportTextFormatterService 인스턴스 생성
const textFormatter = new ReportTextFormatterService()

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
        pmsLink?: string
      }>
    }>
    planned?: Array<{
      group: string
      subGroup: string
      items: Array<{
        title: string
        person: string
        manHour: number
        pmsLink?: string
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
        pmsLink?: string
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
  notionPageId?: string
  notionPageUrl?: string
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

// GET: 데이터 조회만 (Notion 페이지 생성 없음)
async function fetchReport(date?: string): Promise<ReportResponse> {
  const params = date ? `?date=${date}` : ''
  const res = await fetch(`/api/reports${params}`, {
    method: 'GET',
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || '보고서 조회 실패')
  }

  return res.json()
}

// POST: Notion 페이지 생성
async function createNotionReport(date?: string): Promise<ReportResponse> {
  const res = await fetch('/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date }),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Notion 보고서 생성 실패')
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
      pmsLink?: string
    }>
  }>
}

// Stat Card 컴포넌트
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'primary',
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  variant?: 'primary' | 'success' | 'warning' | 'info'
}) {
  const variantStyles = {
    primary: 'border-l-primary',
    success: 'border-l-[#1ee0ac]',
    warning: 'border-l-[#f4bd0e]',
    info: 'border-l-[#09c2de]',
  }

  const iconStyles = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-[#1ee0ac]/10 text-[#1ee0ac]',
    warning: 'bg-[#f4bd0e]/10 text-[#f4bd0e]',
    info: 'bg-[#09c2de]/10 text-[#09c2de]',
  }

  return (
    <Card className={`border-l-4 ${variantStyles[variant]} shadow-soft hover:shadow-soft-lg transition-shadow`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${iconStyles[variant]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Progress Bar 컴포넌트
function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  const getColor = (val: number) => {
    if (val >= 80) return 'bg-[#1ee0ac]'
    if (val >= 50) return 'bg-primary'
    if (val >= 30) return 'bg-[#f4bd0e]'
    return 'bg-[#e85347]'
  }

  return (
    <div className={`h-1.5 w-full bg-muted rounded-full overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-300 ${getColor(value)}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  )
}

// Task Item 컴포넌트
function TaskItem({
  title,
  person,
  progress,
  manHour,
  pmsLink,
  showManHour = true,
}: {
  title: string
  person: string
  progress?: number
  manHour: number
  pmsLink?: string
  showManHour?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{title}</p>
          {pmsLink && (
            <a
              href={pmsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 text-primary hover:text-primary/80 transition-colors"
              title="PMS 링크"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">{person}</span>
          {showManHour && (
            <>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{manHour}m/h</span>
            </>
          )}
        </div>
      </div>
      {progress !== undefined && (
        <div className="flex items-center gap-2 min-w-[80px]">
          <ProgressBar value={progress} className="flex-1" />
          <span className="text-xs font-medium w-8 text-right">{progress}%</span>
        </div>
      )}
    </div>
  )
}

export default function ReportsPage() {
  // 페이지 로드 시 자동으로 데이터 조회 (Notion 페이지 생성 없음)
  const {
    data: reportResponse,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['reports'],
    queryFn: () => fetchReport(),
    staleTime: 60 * 1000, // 1분
  })

  // Notion 페이지 생성 mutation
  const createMutation = useMutation({
    mutationFn: createNotionReport,
    onSuccess: (data) => {
      const types = []
      if (data.daily?.notionPageUrl) types.push('일간')
      if (data.weekly?.notionPageUrl) types.push('주간')
      if (data.monthly?.notionPageUrl) types.push('월간')

      toast.success(
        <div className="flex flex-col gap-1">
          <span>{types.join(', ')} Notion 보고서가 생성되었습니다!</span>
          {data.daily?.notionPageUrl && (
            <a
              href={data.daily.notionPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline text-sm flex items-center gap-1"
            >
              Notion에서 보기 <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Notion 보고서 생성에 실패했습니다.')
    },
  })

  const report = reportResponse?.daily || null

  // Notion 페이지 생성 버튼 클릭
  const handleCreateNotionReport = () => {
    createMutation.mutate(undefined)
  }

  // 데이터 새로고침
  const handleRefresh = () => {
    refetch()
  }

  const isPageLoading = isLoading || isRefetching

  // 그룹핑 로직
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

  const weeklyTasks = useMemo(() => {
    if (!report?.weeklyTasks) return []
    return report.weeklyTasks
  }, [report])

  // 통계 계산
  const stats = useMemo(() => {
    if (!report) return null

    const totalMembers = report.manHourSummary.length
    const completedMembers = report.manHourSummary.filter((p) => p.isCompleted).length
    const totalManHour = report.manHourSummary.reduce((sum, p) => sum + p.hours, 0)
    const totalTasks = report.tasks.inProgress.reduce(
      (sum, g) => sum + g.items.length,
      0
    )

    return {
      totalMembers,
      completedMembers,
      totalManHour,
      totalTasks,
      completionRate: totalMembers > 0 ? Math.round((completedMembers / totalMembers) * 100) : 0,
    }
  }, [report])

  // 진행업무 복사 함수
  const handleCopyInProgress = async () => {
    if (!report || !report.tasks.inProgress || report.tasks.inProgress.length === 0) return

    const formattedDate = formatDateToShortFormat(report.date)
    const title = `큐브 파트 일일업무 보고 (${formattedDate})`
    const taskText = textFormatter.stringifyTasks(report.tasks.inProgress, '진행업무')
    const text = `${title}\n\n${taskText}`

    try {
      // Clipboard API 사용 (modern browsers)
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text.trim())
        toast.success('진행업무가 클립보드에 복사되었습니다.')
      } else {
        // Fallback: textarea를 사용한 복사 (older browsers)
        const textarea = document.createElement('textarea')
        textarea.value = text.trim()
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        const successful = document.execCommand('copy')
        document.body.removeChild(textarea)

        if (successful) {
          toast.success('진행업무가 클립보드에 복사되었습니다.')
        } else {
          toast.error('클립보드 복사에 실패했습니다.')
        }
      }
    } catch (error) {
      console.error('클립보드 복사 오류:', error)
      toast.error('클립보드 복사에 실패했습니다.')
    }
  }

  // 예정업무 복사 함수
  const handleCopyPlanned = async () => {
    if (!report || !report.tasks.planned || report.tasks.planned.length === 0) return

    const formattedDate = formatDateToShortFormat(report.date)
    const title = `큐브 파트 일일업무 보고 (${formattedDate})`
    const taskText = textFormatter.stringifyTasks(report.tasks.planned, '예정업무')
    const text = `${title}\n\n${taskText}`

    try {
      // Clipboard API 사용 (modern browsers)
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text.trim())
        toast.success('예정업무가 클립보드에 복사되었습니다.')
      } else {
        // Fallback: textarea를 사용한 복사 (older browsers)
        const textarea = document.createElement('textarea')
        textarea.value = text.trim()
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        const successful = document.execCommand('copy')
        document.body.removeChild(textarea)

        if (successful) {
          toast.success('예정업무가 클립보드에 복사되었습니다.')
        } else {
          toast.error('클립보드 복사에 실패했습니다.')
        }
      }
    } catch (error) {
      console.error('클립보드 복사 오류:', error)
      toast.error('클립보드 복사에 실패했습니다.')
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              {report ? `${report.date} 업무 현황` : '업무 현황'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* 새로고침 버튼 */}
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isPageLoading}
              className="shadow-soft"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
            {/* Notion 페이지 생성 버튼 */}
            <Button
              onClick={handleCreateNotionReport}
              disabled={createMutation.isPending || !report}
              className="bg-primary hover:bg-primary/90 text-white shadow-soft"
            >
              <FileUp className="w-4 h-4 mr-2" />
              {createMutation.isPending ? 'Notion 생성 중...' : 'Notion 보고서 생성'}
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isPageLoading && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="shadow-soft">
                <CardContent className="p-5">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Report Content */}
        {report && !isPageLoading && stats && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="참여 인원"
                value={stats.totalMembers}
                subtitle={`${stats.completedMembers}명 작성 완료`}
                icon={Users}
                variant="primary"
              />
              <StatCard
                title="총 공수"
                value={`${stats.totalManHour}m/h`}
                subtitle="이번 주 누적"
                icon={Clock}
                variant="success"
              />
              <StatCard
                title="진행 업무"
                value={stats.totalTasks}
                subtitle="진행 중인 작업"
                icon={Briefcase}
                variant="info"
              />
              <StatCard
                title="작성 완료율"
                value={`${stats.completionRate}%`}
                subtitle="보고서 작성 현황"
                icon={stats.completionRate >= 80 ? CheckCircle : AlertCircle}
                variant={stats.completionRate >= 80 ? 'success' : 'warning'}
              />
            </div>

            {/* Charts & Summary Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <Card className="shadow-soft">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    주간 Group별 공수 분포
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[320px]">
                  <GroupPieChart tasks={weeklyTasks} />
                </CardContent>
              </Card>

              {/* Member Summary */}
              <Card className="shadow-soft">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    인원별 공수 현황
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {report.manHourSummary.map((person, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2 border-b border-border last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-semibold text-primary">
                              {person.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{person.name}</p>
                              {person.leaveInfo && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/15 text-blue-500">
                                  {person.leaveInfo}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {person.hours}m/h
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {person.isCompleted ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#1ee0ac]/15 text-[#1ee0ac]">
                              완료
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#f4bd0e]/15 text-[#f4bd0e]">
                              진행중
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tasks Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 진행업무 */}
              <Card className="shadow-soft">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-primary" />
                      진행업무
                      <span className="text-xs font-normal text-muted-foreground">
                        {stats.totalTasks}건
                      </span>
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCopyInProgress}
                      className="h-8 w-8"
                      title="복사"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="max-h-[500px] overflow-y-auto scrollbar-thin">
                  <div className="space-y-4">
                    {groupedInProgressTasks.map((groupData, gIndex) => (
                      <div key={gIndex}>
                        <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-primary/10 text-primary text-xs flex items-center justify-center">
                            {gIndex + 1}
                          </span>
                          {groupData.group}
                        </h4>
                        {groupData.subGroups.map((subGroup, sIndex) => (
                          <div key={sIndex} className="ml-7 mb-3">
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              [{subGroup.subGroup}]
                            </p>
                            <div className="bg-muted/30 rounded-lg px-3">
                              {subGroup.items.map((item, iIndex) => (
                                <TaskItem
                                  key={iIndex}
                                  title={item.title}
                                  person={item.person}
                                  manHour={item.manHour}
                                  progress={item.progress}
                                  pmsLink={item.pmsLink}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 예정업무 */}
              <Card className="shadow-soft">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#09c2de]" />
                      예정업무
                      <span className="text-xs font-normal text-muted-foreground">
                        {report.tasks.planned?.reduce((sum, g) => sum + g.items.length, 0) || 0}건
                      </span>
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCopyPlanned}
                      className="h-8 w-8"
                      title="복사"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="max-h-[500px] overflow-y-auto scrollbar-thin">
                  {groupedPlannedTasks.length > 0 ? (
                    <div className="space-y-4">
                      {groupedPlannedTasks.map((groupData, gIndex) => (
                        <div key={gIndex}>
                          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-[#09c2de]/10 text-[#09c2de] text-xs flex items-center justify-center">
                              {gIndex + 1}
                            </span>
                            {groupData.group}
                          </h4>
                          {groupData.subGroups.map((subGroup, sIndex) => (
                            <div key={sIndex} className="ml-7 mb-3">
                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                [{subGroup.subGroup}]
                              </p>
                              <div className="bg-muted/30 rounded-lg px-3">
                                {subGroup.items.map((item, iIndex) => (
                                  <TaskItem
                                    key={iIndex}
                                    title={item.title}
                                    person={item.person}
                                    manHour={item.manHour}
                                    pmsLink={item.pmsLink}
                                    showManHour={false}
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Clock className="w-12 h-12 mb-3 opacity-50" />
                      <p className="text-sm">예정된 업무가 없습니다</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Empty State */}
        {!report && !isPageLoading && (
          <Card className="shadow-soft">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Briefcase className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">오늘의 보고서 데이터가 없습니다</h3>
              <p className="text-muted-foreground text-sm mb-6">
                Notion 데이터베이스에 오늘 날짜의 작업이 없습니다
              </p>
              <Button
                variant="outline"
                onClick={handleRefresh}
                className="shadow-soft"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                다시 조회하기
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
