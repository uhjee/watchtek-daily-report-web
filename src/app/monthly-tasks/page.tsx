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
import { ListTodo, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, FileSpreadsheet, TrendingUp, CalendarDays } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { GroupPieChart } from '@/components/GroupPieChart'
import memberMap from '@/lib/config/members'
import { DailyReport } from '@/lib/types/report'
import { downloadMonthlyTasksExcel } from '@/lib/utils/excelUtils'
import { extractLeaveItems, LeaveItem } from '@/lib/utils/leaveUtils'
import { getWeeksOfMonth, formatDateToShortFormat } from '@/lib/utils/dateUtils'

type SortField = 'group' | 'pmsNumber' | 'title' | 'plannedDate' | 'completionDate' | 'manHour' | 'manDay' | 'person' | 'progress'
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
const ALL_WEEKS = '전체'

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
    throw new Error(error.error || '업무 이력 조회 실패')
  }

  return res.json()
}

// 중복 데이터 병합 함수
// 중복 기준: 업무구분(group), 담당자(person), PMS 관리번호(pmsNumber), 업무 내용(title)
// 병합 기준: 완료일(date.end || date.start)이 가장 최신인 데이터의 모든 속성 사용
function mergeDuplicateTasks(tasks: DailyReport[]): DailyReport[] {
  const taskMap = new Map<string, DailyReport>()

  tasks.forEach((task) => {
    // 중복 판단 키 생성
    const key = `${task.group}|${task.person}|${task.pmsNumber || ''}|${task.title}`

    const existing = taskMap.get(key)
    if (!existing) {
      taskMap.set(key, task)
    } else {
      // 완료일 비교하여 최신 데이터로 교체
      const existingDate = existing.date.end || existing.date.start
      const currentDate = task.date.end || task.date.start

      if (new Date(currentDate).getTime() > new Date(existingDate).getTime()) {
        taskMap.set(key, task)
      }
    }
  })

  return Array.from(taskMap.values())
}

export default function MonthlyTasksPage() {
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [selectedWeek, setSelectedWeek] = useState(ALL_WEEKS)
  const [selectedMember, setSelectedMember] = useState(ALL_MEMBERS)
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  // 2차 필터: 선택된 group (파이차트 클릭)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  // 진행 상태 필터 (전체/완료/진행)
  type ProgressFilter = 'all' | 'completed' | 'in_progress'
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>('all')
  // 회의 제외 필터
  const [excludeMeeting, setExcludeMeeting] = useState(false)
  // 업무구분 필터
  const [selectedTaskGroup, setSelectedTaskGroup] = useState('all')

  // 해당 월의 주차 목록 계산 (수요일 기준)
  const weekOptions = useMemo(() => {
    return getWeeksOfMonth(selectedYear, selectedMonth)
  }, [selectedYear, selectedMonth])

  // 현재 선택된 기간의 날짜 범위 계산 (월~금 기준, 주말 제외)
  const dateRangeText = useMemo(() => {
    if (selectedWeek !== ALL_WEEKS) {
      // 특정 주차 선택 시: 월요일 ~ 금요일
      const weekInfo = weekOptions.find(w => w.week.toString() === selectedWeek)
      if (weekInfo) {
        // startDate는 이미 월요일, endDate(일요일)에서 금요일 계산
        const endDate = new Date(weekInfo.endDate)
        endDate.setDate(endDate.getDate() - 2) // 일요일 - 2 = 금요일
        const fridayStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
        return `${formatDateToShortFormat(weekInfo.startDate)} ~ ${formatDateToShortFormat(fridayStr)}`
      }
    }
    // 전체 주차 선택 시 (월 전체 범위: 1일 ~ 말일)
    const firstDay = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
    const lastDayDate = new Date(selectedYear, selectedMonth, 0)
    const lastDay = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`
    return `${formatDateToShortFormat(firstDay)} ~ ${formatDateToShortFormat(lastDay)}`
  }, [selectedYear, selectedMonth, selectedWeek, weekOptions])

  // 데이터 조회
  const { data, isLoading } = useQuery({
    queryKey: ['monthly-tasks', selectedYear, selectedMonth],
    queryFn: () => fetchMonthlyTasks(selectedYear, selectedMonth),
    staleTime: 5 * 60 * 1000, // 5분
  })

  // 1차 필터 변경 시 group 초기화 및 정렬 초기화
  const handleYearChange = (value: string) => {
    setSelectedYear(parseInt(value))
    setSelectedWeek(ALL_WEEKS)
    setSelectedGroup(null)
    setSortField(null)
    setSortDirection(null)
  }

  const handleMonthChange = (value: string) => {
    setSelectedMonth(parseInt(value))
    setSelectedWeek(ALL_WEEKS)
    setSelectedGroup(null)
    setSortField(null)
    setSortDirection(null)
  }

  const handleWeekChange = (value: string) => {
    setSelectedWeek(value)
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

  // 선택된 멤버로 필터링 + 완료일 기준 필터링 + 주차 필터링 + 중복 병합 (정렬 제외)
  const baseFilteredTasks = useMemo(() => {
    if (!data?.tasks) return []

    // 선택된 주차의 날짜 범위 가져오기
    const selectedWeekInfo = selectedWeek !== ALL_WEEKS
      ? weekOptions.find(w => w.week.toString() === selectedWeek)
      : null

    const filteredTasks = data.tasks.filter((task) => {
      // 멤버 필터 ('전체'가 아닌 경우에만 필터링)
      if (selectedMember !== ALL_MEMBERS && task.person !== selectedMember) return false

      // 완료일 기준 필터링 (Date.end가 있으면 end, 없으면 start 사용)
      const completionDate = task.date.end || task.date.start
      if (!completionDate) return false

      // 주차 필터 ('전체'가 아닌 경우에만 필터링)
      if (selectedWeekInfo) {
        // 완료일이 선택된 주차 범위 내에 있는지 확인
        if (completionDate < selectedWeekInfo.startDate || completionDate > selectedWeekInfo.endDate) {
          return false
        }
      } else {
        // 주차 '전체'인 경우: 기존 연/월 필터 적용
        const taskDate = new Date(completionDate)
        const taskYear = taskDate.getFullYear()
        const taskMonth = taskDate.getMonth() + 1

        if (taskYear !== selectedYear || taskMonth !== selectedMonth) return false
      }

      return true
    })

    // 중복 데이터 병합 적용
    return mergeDuplicateTasks(filteredTasks)
  }, [data, selectedMember, selectedYear, selectedMonth, selectedWeek, weekOptions])

  // 테이블용 정렬된 태스크 (2차 필터: group 적용, 완료건 필터 적용)
  const sortedTasks = useMemo(() => {
    // 2차 필터: selectedGroup이 있으면 해당 group만 필터링
    let tasks = selectedGroup
      ? baseFilteredTasks.filter((task) => task.group === selectedGroup)
      : [...baseFilteredTasks]

    // 회의 제외 필터 적용
    if (excludeMeeting) {
      tasks = tasks.filter((task) => task.group !== '회의' && !task.title.includes('회의'))
    }

    // 업무구분 필터 적용
    if (selectedTaskGroup !== 'all') {
      tasks = tasks.filter((task) => task.group === selectedTaskGroup)
    }

    // 진행 상태 필터 적용
    if (progressFilter === 'completed') {
      tasks = tasks.filter((task) => task.progressRate === 100)
    } else if (progressFilter === 'in_progress') {
      tasks = tasks.filter((task) => task.progressRate !== 100)
    }

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
          case 'person':
            compareResult = a.person.localeCompare(b.person, 'ko')
            break
          case 'progress':
            compareResult = a.progressRate - b.progressRate
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
  }, [baseFilteredTasks, selectedGroup, sortField, sortDirection, progressFilter, excludeMeeting, selectedTaskGroup])

  // 총 공수 계산 (m/d) - 진척도 필터 적용된 sortedTasks 기준
  const totalManDays = useMemo(() => {
    const totalManHours = sortedTasks.reduce((sum, task) => sum + task.manHour, 0)
    return (totalManHours / 8).toFixed(1)
  }, [sortedTasks])

  // 업무구분 옵션 목록 (baseFilteredTasks에서 추출)
  const taskGroupOptions = useMemo(() => {
    const groups = new Set<string>()
    baseFilteredTasks.forEach((task) => groups.add(task.group))
    return Array.from(groups).sort((a, b) => a.localeCompare(b, 'ko'))
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

  // 근태 데이터 추출 (연차/반차) - 유틸 함수 사용
  const leaveItems = useMemo((): LeaveItem[] => {
    if (!data?.tasks) return []

    // 멤버 필터 적용 ('전체'인 경우 null 전달)
    const memberFilter = selectedMember === ALL_MEMBERS ? null : selectedMember

    // 전체 근태 아이템 추출
    const allLeaveItems = extractLeaveItems(data.tasks, memberFilter)

    // 선택된 주차의 날짜 범위 가져오기
    const selectedWeekInfo = selectedWeek !== ALL_WEEKS
      ? weekOptions.find(w => w.week.toString() === selectedWeek)
      : null

    // 주차 필터 적용
    if (selectedWeekInfo) {
      return allLeaveItems.filter(item =>
        item.date >= selectedWeekInfo.startDate && item.date <= selectedWeekInfo.endDate
      )
    }

    return allLeaveItems
  }, [data, selectedMember, selectedWeek, weekOptions])

  // 엑셀 다운로드 핸들러
  const handleExcelDownload = async () => {
    if (!data?.tasks) return

    // 모든 멤버별로 필터링된 업무 목록 생성
    const lowPriorityGroups = ['회의', '기타']

    const memberTasksMap = members.map((member) => {
      const filteredTasks = data.tasks
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

      // 중복 데이터 병합 적용
      const mergedTasks = mergeDuplicateTasks(filteredTasks)

      // 정렬 적용
      const sortedTasks = mergedTasks.sort((a, b) => {
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

      return { name: member.name, tasks: sortedTasks }
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

  // Progress Bar 컴포넌트
  const ProgressBar = ({ value }: { value: number }) => {
    const getColor = (val: number) => {
      if (val >= 80) return 'bg-[#1ee0ac]'
      if (val >= 50) return 'bg-primary'
      if (val >= 30) return 'bg-[#f4bd0e]'
      return 'bg-[#e85347]'
    }

    return (
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${getColor(value)}`}
            style={{ width: `${Math.min(value, 100)}%` }}
          />
        </div>
        <span className="text-xs font-medium w-8 text-right">{value}%</span>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header with Filters */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-shrink-0">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ListTodo className="w-6 h-6 text-primary" />
              업무 이력
            </h1>
            <span className="text-sm text-muted-foreground font-normal">
              ({dateRangeText})
            </span>
          </div>

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

              <div className="flex items-center gap-2">
                <Label htmlFor="week-select" className="text-sm font-medium whitespace-nowrap">
                  주차
                </Label>
                <Select
                  value={selectedWeek}
                  onValueChange={handleWeekChange}
                >
                  <SelectTrigger id="week-select" className="w-[100px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_WEEKS}>전체</SelectItem>
                    {weekOptions.map((weekInfo) => (
                      <SelectItem key={weekInfo.week} value={weekInfo.week.toString()}>
                        {weekInfo.week}주차
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

        {/* Pie Chart & Leave Card Row */}
        <div className="grid grid-cols-4 gap-6">
          {/* Pie Chart (3/4) */}
          <Card className="shadow-soft col-span-3">
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

          {/* 근태 카드 (1/4) */}
          <Card className="shadow-soft col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                근태
                <span className="text-xs font-normal text-muted-foreground">
                  {leaveItems.length}건
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[320px] overflow-y-auto">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : leaveItems.length > 0 ? (
                <div className="space-y-2">
                  {leaveItems.map((item, index) => (
                    <div
                      key={`${item.person}-${item.date}-${index}`}
                      className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-semibold text-primary">
                            {item.person.charAt(0)}
                          </span>
                        </div>
                        <span className="text-sm font-medium">{item.person}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            item.type === '연차'
                              ? 'bg-blue-500/15 text-blue-500'
                              : 'bg-amber-500/15 text-amber-500'
                          }`}
                        >
                          {item.type}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.date.slice(5).replace('-', '/')}({item.dayOfWeek})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <CalendarDays className="w-10 h-10 mb-2 opacity-30" />
                  <span className="text-sm">근태 기록이 없습니다</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

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
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="exclude-meeting"
                    checked={excludeMeeting}
                    onCheckedChange={(checked) => setExcludeMeeting(checked === true)}
                  />
                  <Label
                    htmlFor="exclude-meeting"
                    className="text-sm font-normal cursor-pointer whitespace-nowrap"
                  >
                    회의 제외
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium whitespace-nowrap">업무구분</Label>
                  <Select
                    value={selectedTaskGroup}
                    onValueChange={setSelectedTaskGroup}
                  >
                    <SelectTrigger className="w-[120px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      {taskGroupOptions.map((group) => (
                        <SelectItem key={group} value={group}>
                          {group}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium whitespace-nowrap">진척도</Label>
                  <Select
                    value={progressFilter}
                    onValueChange={(value) => setProgressFilter(value as 'all' | 'completed' | 'in_progress')}
                  >
                    <SelectTrigger className="w-[90px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="completed">완료</SelectItem>
                      <SelectItem value="in_progress">진행</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                      <TableHead className="w-20">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 h-8 data-[state=open]:bg-accent"
                          onClick={() => handleSort('person')}
                        >
                          <span>담당자</span>
                          {renderSortIcon('person')}
                        </Button>
                      </TableHead>
                      <TableHead className="w-28">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 h-8 data-[state=open]:bg-accent"
                          onClick={() => handleSort('progress')}
                        >
                          <span>진척도</span>
                          {renderSortIcon('progress')}
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
                          <TableCell className="whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-[10px] font-semibold text-primary">
                                  {task.person.charAt(0)}
                                </span>
                              </div>
                              <span className="text-sm">{task.person}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <ProgressBar value={task.progressRate} />
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
