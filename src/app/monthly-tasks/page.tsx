'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ListTodo, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, FileSpreadsheet, TrendingUp } from 'lucide-react'
import { GroupPieChart } from '@/components/GroupPieChart'
import memberMap from '@/lib/config/members'
import { DailyReport } from '@/lib/types/report'
import { downloadMonthlyTasksExcel } from '@/lib/utils/excelUtils'

type SortField = 'group' | 'pmsNumber' | 'title' | 'plannedDate' | 'completionDate' | 'manHour' | 'manDay'
type SortDirection = 'asc' | 'desc' | null

interface MonthlyTasksResponse {
  year: number
  month: number
  tasks: DailyReport[]
  total: number
}

// memberMap을 배열로 변환하고 priority로 정렬
const members = Object.entries(memberMap)
  .map(([email, info]) => ({
    email,
    name: info.name,
    priority: info.priority,
  }))
  .sort((a, b) => a.priority - b.priority)

// '전체' 옵션 상수
const ALL_MEMBERS = '전체'

// 현재 연도, 월
const now = new Date()
const currentYear = now.getFullYear()
const currentMonth = now.getMonth() + 1

// 최근 3년치 연도 옵션
const yearOptions = Array.from({ length: 3 }, (_, i) => currentYear - i)

// 월 옵션
const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)

async function fetchMonthlyTasks(year: number, month: number): Promise<MonthlyTasksResponse> {
  const res = await fetch(`/api/monthly-tasks?year=${year}&month=${month}`)

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || '월별 업무 목록 조회 실패')
  }

  return res.json()
}

export default function MonthlyTasksPage() {
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [selectedMember, setSelectedMember] = useState(ALL_MEMBERS)
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  // 2차 필터: 선택된 group (파이차트 클릭)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)

  // 데이터 조회
  const { data, isLoading } = useQuery({
    queryKey: ['monthly-tasks', selectedYear, selectedMonth],
    queryFn: () => fetchMonthlyTasks(selectedYear, selectedMonth),
    staleTime: 5 * 60 * 1000, // 5분
  })

  // 1차 필터 변경 시 group 초기화 및 정렬 초기화
  const handleYearChange = (value: string) => {
    setSelectedYear(parseInt(value))
    setSelectedGroup(null)
    setSortField(null)
    setSortDirection(null)
  }

  const handleMonthChange = (value: string) => {
    setSelectedMonth(parseInt(value))
    setSelectedGroup(null)
    setSortField(null)
    setSortDirection(null)
  }

  const handleMemberChange = (value: string) => {
    setSelectedMember(value)
    setSelectedGroup(null)
    setSortField(null)
    setSortDirection(null)
  }

  // group 클릭 핸들러 (정렬 초기화)
  const handleGroupClick = (group: string | null) => {
    setSelectedGroup(group)
    setSortField(null)
    setSortDirection(null)
  }

  // 정렬 핸들러
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // 같은 필드 클릭: null -> asc -> desc -> null 순환
      if (sortDirection === null) {
        setSortDirection('asc')
      } else if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else {
        setSortField(null)
        setSortDirection(null)
      }
    } else {
      // 다른 필드 클릭: 새로운 필드로 asc 시작
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // 선택된 멤버로 필터링 + 완료일 기준 필터링 (정렬 제외)
  const baseFilteredTasks = useMemo(() => {
    if (!data?.tasks) return []

    return data.tasks.filter((task) => {
      // 멤버 필터 ('전체'가 아닌 경우에만 필터링)
      if (selectedMember !== ALL_MEMBERS && task.person !== selectedMember) return false

      // 완료일 기준 필터링 (Date.end가 있으면 end, 없으면 start 사용)
      const completionDate = task.date.end || task.date.start
      if (!completionDate) return false

      const taskDate = new Date(completionDate)
      const taskYear = taskDate.getFullYear()
      const taskMonth = taskDate.getMonth() + 1

      return taskYear === selectedYear && taskMonth === selectedMonth
    })
  }, [data, selectedMember, selectedYear, selectedMonth])

  // 테이블용 정렬된 태스크 (2차 필터: group 적용)
  const sortedTasks = useMemo(() => {
    // 2차 필터: selectedGroup이 있으면 해당 group만 필터링
    const tasks = selectedGroup
      ? baseFilteredTasks.filter((task) => task.group === selectedGroup)
      : [...baseFilteredTasks]

    // 정렬 적용
    if (sortField && sortDirection) {
      return tasks.sort((a, b) => {
        let compareResult = 0

        switch (sortField) {
          case 'group':
            compareResult = a.group.localeCompare(b.group, 'ko')
            break
          case 'pmsNumber':
            const aNum = a.pmsNumber?.toString() || ''
            const bNum = b.pmsNumber?.toString() || ''
            compareResult = aNum.localeCompare(bNum)
            break
          case 'title':
            compareResult = a.title.localeCompare(b.title, 'ko')
            break
          case 'plannedDate':
            // 계획 완료일은 현재 데이터에 없으므로 0 반환
            compareResult = 0
            break
          case 'completionDate':
            const aDate = a.date.end || a.date.start
            const bDate = b.date.end || b.date.start
            compareResult = new Date(aDate).getTime() - new Date(bDate).getTime()
            break
          case 'manHour':
            compareResult = a.manHour - b.manHour
            break
          case 'manDay':
            const aManDay = a.manHour / 8
            const bManDay = b.manHour / 8
            compareResult = aManDay - bManDay
            break
        }

        return sortDirection === 'asc' ? compareResult : -compareResult
      })
    }

    // 기본 정렬: 완료일 오름차순, 단 특정 Group은 우선순위 낮춤
    const lowPriorityGroups = ['회의', '기타']

    return tasks.sort((a, b) => {
      const aIsLowPriority = lowPriorityGroups.includes(a.group)
      const bIsLowPriority = lowPriorityGroups.includes(b.group)

      // 우선순위가 다르면 우선순위로 정렬
      if (aIsLowPriority !== bIsLowPriority) {
        return aIsLowPriority ? 1 : -1
      }

      // 우선순위가 같으면 완료일로 정렬 (오름차순)
      const aDate = a.date.end || a.date.start
      const bDate = b.date.end || b.date.start

      return new Date(aDate).getTime() - new Date(bDate).getTime()
    })
  }, [baseFilteredTasks, selectedGroup, sortField, sortDirection])

  // 총 공수 계산 (m/d)
  const totalManDays = useMemo(() => {
    const totalManHours = baseFilteredTasks.reduce((sum, task) => sum + task.manHour, 0)
    return (totalManHours / 8).toFixed(1)
  }, [baseFilteredTasks])

  // GroupPieChart용 데이터 변환 (정렬과 무관)
  const pieChartData = useMemo(() => {
    // Group별로 tasks를 집계
    const groupMap = new Map<string, DailyReport[]>()

    baseFilteredTasks.forEach((task) => {
      const existing = groupMap.get(task.group) || []
      groupMap.set(task.group, [...existing, task])
    })

    // GroupPieChart가 기대하는 형태로 변환
    return Array.from(groupMap.entries()).map(([group, tasks]) => ({
      group,
      subGroup: '',
      items: tasks.map((task) => ({
        title: task.title,
        person: task.person,
        progress: task.progressRate,
        manHour: task.manHour,
      })),
    }))
  }, [baseFilteredTasks])

  // 엑셀 다운로드 핸들러
  const handleExcelDownload = async () => {
    if (!data?.tasks) return

    // 모든 멤버별로 필터링된 업무 목록 생성
    const lowPriorityGroups = ['회의', '기타']

    const memberTasksMap = members.map((member) => {
      const tasks = data.tasks
        .filter((task) => {
          // 멤버 필터
          if (task.person !== member.name) return false

          // 완료일 기준 필터링
          const completionDate = task.date.end || task.date.start
          if (!completionDate) return false

          const taskDate = new Date(completionDate)
          const taskYear = taskDate.getFullYear()
          const taskMonth = taskDate.getMonth() + 1

          return taskYear === selectedYear && taskMonth === selectedMonth
        })
        .sort((a, b) => {
          // 기본 정렬: 회의/기타 우선순위 낮춤, 완료일 오름차순
          const aIsLowPriority = lowPriorityGroups.includes(a.group)
          const bIsLowPriority = lowPriorityGroups.includes(b.group)

          if (aIsLowPriority !== bIsLowPriority) {
            return aIsLowPriority ? 1 : -1
          }

          const aDate = a.date.end || a.date.start
          const bDate = b.date.end || b.date.start
          return new Date(aDate).getTime() - new Date(bDate).getTime()
        })

      return { name: member.name, tasks }
    })

    await downloadMonthlyTasksExcel(selectedYear, selectedMonth, memberTasksMap)
  }

  // 정렬 아이콘 렌더링
  const renderSortIcon = (field: SortField) => {
    const isActive = sortField === field && sortDirection !== null
    const iconClass = isActive ? 'ml-2 h-4 w-4 text-primary' : 'ml-2 h-4 w-4'

    if (sortField !== field) {
      return <ArrowUpDown className={iconClass} />
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className={iconClass} />
    }
    if (sortDirection === 'desc') {
      return <ArrowDown className={iconClass} />
    }
    return <ArrowUpDown className={iconClass} />
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header with Filters */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold flex items-center gap-2 flex-shrink-0">
            <ListTodo className="w-6 h-6 text-primary" />
            월별 업무 목록
          </h1>

          {/* Filters */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* 연도/월 선택 */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="year-select" className="text-sm font-medium whitespace-nowrap">
                  연도
                </Label>
                <Select
                  value={selectedYear.toString()}
                  onValueChange={handleYearChange}
                >
                  <SelectTrigger id="year-select" className="w-[110px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}년
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="month-select" className="text-sm font-medium whitespace-nowrap">
                  월
                </Label>
                <Select
                  value={selectedMonth.toString()}
                  onValueChange={handleMonthChange}
                >
                  <SelectTrigger id="month-select" className="w-[90px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((month) => (
                      <SelectItem key={month} value={month.toString()}>
                        {month}월
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 구분선 */}
            <div className="h-6 w-px bg-border" />

            {/* 멤버 선택 */}
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium whitespace-nowrap">담당자</Label>
              <RadioGroup value={selectedMember} onValueChange={handleMemberChange}>
                <div className="flex items-center gap-3">
                  {/* 전체 옵션 */}
                  <div className="flex items-center space-x-1.5">
                    <RadioGroupItem value={ALL_MEMBERS} id="all-members" />
                    <Label
                      htmlFor="all-members"
                      className="text-sm font-normal cursor-pointer whitespace-nowrap"
                    >
                      {ALL_MEMBERS}
                    </Label>
                  </div>
                  {members.map((member) => (
                    <div key={member.email} className="flex items-center space-x-1.5">
                      <RadioGroupItem value={member.name} id={member.email} />
                      <Label
                        htmlFor={member.email}
                        className="text-sm font-normal cursor-pointer whitespace-nowrap"
                      >
                        {member.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
          </div>
        </div>

        {/* Pie Chart */}
        <Card className="shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Group별 업무
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Skeleton className="h-48 w-48 rounded-full" />
              </div>
            ) : baseFilteredTasks.length > 0 ? (
              <GroupPieChart
                tasks={pieChartData}
                selectedGroup={selectedGroup}
                onGroupClick={handleGroupClick}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                데이터가 없습니다
              </div>
            )}
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="shadow-soft">
          <CardHeader className="pt-4 pb-3 px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <span>[{selectedMember}] 업무목록</span>
                <span className="text-sm font-normal text-muted-foreground">
                  총{sortedTasks.length}건 / 총{totalManDays}m/d
                </span>
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExcelDownload}
                disabled={isLoading || !data?.tasks}
                className="flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4" />
                엑셀
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-6 pb-4">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : sortedTasks.length > 0 ? (
              <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead className="w-32">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 h-8 data-[state=open]:bg-accent"
                          onClick={() => handleSort('group')}
                        >
                          <span>업무구분</span>
                          {renderSortIcon('group')}
                        </Button>
                      </TableHead>
                      <TableHead className="w-20">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 h-8 data-[state=open]:bg-accent"
                          onClick={() => handleSort('pmsNumber')}
                        >
                          <span>PMS 관리번호</span>
                          {renderSortIcon('pmsNumber')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 h-8 data-[state=open]:bg-accent"
                          onClick={() => handleSort('title')}
                        >
                          <span>업무 내용</span>
                          {renderSortIcon('title')}
                        </Button>
                      </TableHead>
                      <TableHead className="w-24">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 h-8 data-[state=open]:bg-accent"
                          onClick={() => handleSort('plannedDate')}
                        >
                          <span>계획 완료일</span>
                          {renderSortIcon('plannedDate')}
                        </Button>
                      </TableHead>
                      <TableHead className="w-24">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 h-8 data-[state=open]:bg-accent"
                          onClick={() => handleSort('completionDate')}
                        >
                          <span>완료일</span>
                          {renderSortIcon('completionDate')}
                        </Button>
                      </TableHead>
                      <TableHead className="w-16 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-mr-3 h-8 data-[state=open]:bg-accent ml-auto flex"
                          onClick={() => handleSort('manHour')}
                        >
                          <span>M/H</span>
                          {renderSortIcon('manHour')}
                        </Button>
                      </TableHead>
                      <TableHead className="w-16 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-mr-3 h-8 data-[state=open]:bg-accent ml-auto flex"
                          onClick={() => handleSort('manDay')}
                        >
                          <span>M/D</span>
                          {renderSortIcon('manDay')}
                        </Button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedTasks.map((task, index) => {
                      const manDays = (task.manHour / 8).toFixed(1)
                      return (
                        <TableRow key={`${task.id}-${task.person}`}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell className="truncate max-w-[8rem]" title={task.group}>
                            {task.group}
                          </TableCell>
                          <TableCell>
                            {task.pmsNumber && task.pmsLink ? (
                              <a
                                href={task.pmsLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-1 whitespace-nowrap"
                              >
                                #{task.pmsNumber}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : task.pmsNumber ? (
                              `#${task.pmsNumber}`
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell title={task.title}>
                            {task.title}
                          </TableCell>
                          <TableCell>-</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {task.date.end || task.date.start}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {task.manHour}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {manDays}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ListTodo className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">해당 조건의 업무가 없습니다</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
