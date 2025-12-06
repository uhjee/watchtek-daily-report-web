import { NotionApiService } from './notionApiService'
import { ReportTextFormatterService } from './reportTextFormatterService'
import memberMap from '../config/members'
import { DailyReport, ManHourByPersonWithReports, LeaveInfo } from '../types/report'
import {
  getToday,
  getThisWeekMondayToToday,
  getWorkingDaysCount,
  formatDateToShortFormat,
  isHoliday,
  isLastWeekdayOfWeek,
  isLastWeekdayOfMonth,
  getWeekOfMonth,
  getCurrentMonthRangeByWednesday,
} from '../utils/dateUtils'
import {
  isLeaveReport,
  extractLeaveInfoByPerson,
  calculateTotalLeaveDeduction,
  formatLeaveInfoText,
} from '../utils/leaveUtils'
import { ReportTypeDetermination } from '../types/reportTypes'
import {
  createHeading1Block,
  createHeading2Block,
  createHeading3Block,
  createParagraphBlock,
  createBulletedListItemBlock,
  createCodeBlocks,
  createDividerBlock,
  createTableWithLinksAndRows,
  TableCellData,
} from '../utils/notionBlockUtils'
import { formatReportGroupTitle } from '../utils/reportUtils'
import { splitTextIntoChunks } from '../utils/stringUtils'
import { BLOCK_LIMITS } from '../constants/reportConstants'
import { BlockObjectRequest } from '@notionhq/client/build/src/api-endpoints'

/**
 * 보고서 생성 및 데이터 처리 서비스
 */
export class ReportService {
  private notionService: NotionApiService
  private textFormatter: ReportTextFormatterService

  constructor() {
    this.notionService = new NotionApiService()
    this.textFormatter = new ReportTextFormatterService()
  }

  /**
   * 주어진 날짜에 대해 어떤 보고서를 생성해야 하는지 판단한다
   * @param date - YYYY-MM-DD 형식의 날짜 (기본값: 오늘)
   * @returns 보고서 타입 판단 결과
   */
  determineReportTypes(date?: string): ReportTypeDetermination {
    const targetDate = date || getToday()

    // 1. 휴일 체크
    const holiday = isHoliday(targetDate)
    if (holiday) {
      return {
        isHoliday: true,
        shouldGenerateDaily: false,
        shouldGenerateWeekly: false,
        shouldGenerateMonthly: false,
      }
    }

    // 2. 평일인 경우 보고서 타입 판단
    return {
      isHoliday: false,
      // Daily: 휴일이 아니면 항상 생성
      shouldGenerateDaily: true,
      // Weekly: 해당 주의 마지막 평일인 경우 생성
      shouldGenerateWeekly: isLastWeekdayOfWeek(targetDate),
      // Monthly: 해당 월의 마지막 주의 마지막 평일인 경우 생성
      shouldGenerateMonthly: isLastWeekdayOfMonth(targetDate),
    }
  }

  /**
   * 일일 보고서 데이터를 생성한다
   * @param date - YYYY-MM-DD 형식의 날짜 (기본값: 오늘)
   */
  async generateDailyReport(date?: string) {
    // 기준 날짜 설정 (date 파라미터가 없으면 오늘)
    const targetDate = date || getToday()

    // 1. Notion 데이터베이스에서 해당 날짜/다음날 작업 조회
    const rawData = await this.fetchTodayTomorrowTasks(targetDate)

    // 2. 다중 담당자 처리 (원본 데이터에서)
    const processedRawData = this.processMultiplePeopleRaw(rawData)

    // 3. 데이터 변환 및 구조화 (기준 날짜 전달)
    const reports = this.transformNotionData(processedRawData, targetDate)

    // 4. 중복 제거 및 manHour 합산
    const distinctReports = this.distinctReports(reports)

    // 5. 그룹화 (processMultiplePeople는 이미 rawData에서 처리됨)
    const processedReports = distinctReports

    // 5. 그룹화 및 정렬
    // 진행업무: isToday가 true인 작업
    const inProgressTasks = this.groupByProjectAndSubGroup(
      processedReports.filter((r) => r.isToday)
    )
    // 예정업무: isTomorrow가 true이거나, 진행 중이면서 완료되지 않은 작업 (progress < 100)
    // 예외: 연차/반차는 progress와 무관하게 실제 날짜로만 판단 (예정업무로 자동 분류 안 함)
    const plannedTasks = this.groupByProjectAndSubGroup(
      processedReports.filter((r) => {
        // 연차/반차인 경우 isTomorrow일 때만 예정업무로 분류 (유틸 함수 사용)
        if (isLeaveReport(r)) {
          return r.isTomorrow
        }
        // 일반 작업: 기존 로직 유지
        return r.isTomorrow || (r.isToday && r.progressRate < 100)
      })
    )

    // 6. 주간 데이터 조회 및 공수 집계 (일간 보고서 상단용, 기준 날짜 전달)
    const weeklyRawData = await this.fetchWeeklyTasks(targetDate)
    const processedWeeklyRawData = this.processMultiplePeopleRaw(weeklyRawData)
    const weeklyReports = this.transformNotionData(processedWeeklyRawData, targetDate)
    const distinctWeeklyReports = this.distinctReports(weeklyReports)
    const manHourSummary = this.calculateWeeklyManHourSummary(distinctWeeklyReports)

    // 7. 주간 데이터 그룹화 (파이 차트용 - 이번 주 전체 작업)
    const weeklyGroupedTasks = this.groupByProjectAndSubGroup(distinctWeeklyReports)

    // 8. 일간 데이터 기반 개인별 공수 및 진행 상황 생성 (해당 날짜/다음날 작업만)
    const manHourByPerson = this.createManHourByPerson(processedReports)

    // 9. 결과 반환
    const dateStr = targetDate

    return {
      date: dateStr,
      title: `큐브 파트 일일업무 보고 (${dateStr})`,
      manHourSummary,
      tasks: {
        inProgress: inProgressTasks,
        planned: plannedTasks,
      },
      weeklyTasks: weeklyGroupedTasks, // 주간 전체 작업 (파이 차트용)
      manHourByPerson, // 일간 데이터 기반 개인별 공수 및 진행 상황
      createdAt: new Date().toISOString(),
    }
  }

  /**
   * 주간 보고서 데이터를 생성한다
   * @param date - YYYY-MM-DD 형식의 날짜 (기본값: 오늘)
   */
  async generateWeeklyReport(date?: string) {
    const targetDate = date || getToday()

    // 1. Notion 데이터베이스에서 이번 주 전체 작업 조회
    const rawData = await this.fetchWeeklyTasksForReport()

    // 2. 다중 담당자 처리
    const processedRawData = this.processMultiplePeopleRaw(rawData)

    // 3. 데이터 변환 및 구조화
    const reports = this.transformNotionData(processedRawData)

    // 4. 중복 제거 및 manHour 합산
    const distinctReports = this.distinctReports(reports)

    // 5. 주간 보고서 형식으로 그룹화 (진행업무만)
    const inProgressTasks = this.groupByProjectAndSubGroup(distinctReports)

    // 6. 연차/반차 정보를 포함한 인원별 공수 집계
    const manHourByPerson = this.getManHourByPersonWithLeaveInfo(distinctReports)

    // 7. 인원별 공수 요약 (연차/반차 정보 포함)
    const manHourSummary = this.formatManHourSummaryWithLeave(manHourByPerson)

    // 8. 그룹별 공수 계산
    const manHourByGroup = this.getManHourByGroup(distinctReports)

    // 9. 결과 반환
    const weekOfMonth = getWeekOfMonth(targetDate)

    return {
      date: targetDate,
      title: `큐브 파트 주간업무 보고 (${weekOfMonth})`,
      manHourSummary,
      manHourByGroup,
      manHourByPerson,
      tasks: {
        inProgress: inProgressTasks,
      },
      createdAt: new Date().toISOString(),
    }
  }

  /**
   * 월간 보고서 데이터를 생성한다
   * @param date - YYYY-MM-DD 형식의 날짜 (기본값: 오늘)
   */
  async generateMonthlyReport(date?: string) {
    const targetDate = date || getToday()

    // 1. Notion 데이터베이스에서 이번 달 전체 작업 조회 (수요일 기준)
    const rawData = await this.fetchMonthlyTasks(targetDate)

    // 2. 다중 담당자 처리
    const processedRawData = this.processMultiplePeopleRaw(rawData)

    // 3. 데이터 변환 및 구조화
    const reports = this.transformNotionData(processedRawData)

    // 4. 중복 제거 및 manHour 합산
    const distinctReports = this.distinctReports(reports)

    // 5. 월간 보고서 형식으로 그룹화 (진행업무/완료업무)
    const progressReports = distinctReports.filter(
      (report) => report.progressRate > 0 && report.progressRate < 100
    )
    const completedReports = distinctReports.filter(
      (report) => report.progressRate === 100
    )

    const inProgressTasks = this.groupByProjectAndSubGroup(progressReports)
    const completedTasks = this.groupByProjectAndSubGroup(completedReports)

    // 6. 연차/반차 정보를 포함한 인원별 공수 집계
    const manHourByPerson = this.getManHourByPersonWithLeaveInfo(distinctReports)

    // 7. 인원별 공수 요약 (연차/반차 정보 포함)
    const manHourSummary = this.formatManHourSummaryWithLeave(manHourByPerson)

    // 8. 결과 반환
    const { firstDay } = getCurrentMonthRangeByWednesday(targetDate)
    const monthDate = new Date(firstDay)
    const month = monthDate.getMonth() + 1

    return {
      date: targetDate,
      title: `큐브 파트 월간업무 보고 (${month}월)`,
      manHourSummary,
      manHourByPerson,
      tasks: {
        inProgress: inProgressTasks,
        completed: completedTasks,
      },
      createdAt: new Date().toISOString(),
    }
  }

  /**
   * Notion 데이터베이스에서 이번 달 전체 작업을 조회한다 (월간 보고서용)
   * 수요일 기준으로 월 범위를 계산
   * @param date - YYYY-MM-DD 형식의 날짜
   */
  private async fetchMonthlyTasks(date: string) {
    // 수요일 기준으로 월 범위 계산
    const { firstDay, lastDay } = getCurrentMonthRangeByWednesday(date)

    const filter = {
      and: [
        {
          property: 'Person',
          people: {
            is_not_empty: true,
          },
        },
        {
          property: 'Date',
          date: {
            on_or_after: firstDay,
          },
        },
        {
          property: 'Date',
          date: {
            on_or_before: lastDay,
          },
        },
      ],
    }

    const sorts = [
      {
        property: 'Date',
        direction: 'ascending',
      },
    ]

    return await this.notionService.queryDatabaseAll(filter, sorts)
  }

  /**
   * Notion 월간 보고서 페이지를 생성한다
   * @param date - 보고서 날짜 (YYYY-MM-DD 형식)
   * @param manHourSummary - 인원별 공수 요약 (연차/반차 정보 포함)
   * @param inProgressTasks - 진행업무
   * @param completedTasks - 완료업무
   * @param manHourByPerson - 개인별 공수 및 진행 상황
   * @returns 생성된 페이지 정보
   */
  async createNotionMonthlyPage(
    date: string,
    _manHourSummary: Array<{
      name: string
      hours: number
      leaveInfo?: string
    }>,
    inProgressTasks: Array<{
      group: string
      subGroup: string
      items: Array<{
        title: string
        person: string
        progress?: number
        manHour: number
      }>
    }>,
    completedTasks: Array<{
      group: string
      subGroup: string
      items: Array<{
        title: string
        person: string
        progress?: number
        manHour: number
      }>
    }>,
    manHourByPerson?: ManHourByPersonWithReports[]
  ) {
    // 1. 페이지 속성 생성 (원본과 동일한 형식)
    const monthYear = new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
    })
    const title = `${monthYear} 큐브 파트 월간업무 보고`

    const properties = {
      title: {
        title: [
          {
            text: {
              content: title,
            },
          },
        ],
      },
      Date: {
        date: {
          start: date,
        },
      },
      Tags: {
        select: {
          name: '월간',
        },
      },
    }

    const icon = {
      type: 'emoji' as const,
      emoji: '📊',
    }

    // 2. 블록 생성 (원본 프로젝트와 동일한 구조)
    const blocks: BlockObjectRequest[] = []

    // 2-1. 페이지 제목 (Heading 1)
    blocks.push(createHeading1Block(title))

    // 2-2. 진행 중인 업무 섹션
    blocks.push(createHeading2Block('진행 중인 업무', 'yellow_background'))

    // 진행업무 그룹 처리
    const inProgressGrouped = this.groupTasksByGroup(inProgressTasks)
    inProgressGrouped.forEach((groupData, groupIndex) => {
      // Heading 3: 그룹명
      blocks.push(createHeading3Block(`${groupIndex + 1}. ${groupData.group}`))

      // 각 SubGroup별 작업 목록
      groupData.subGroups.forEach((subGroupData) => {
        // Paragraph: [서브그룹명]
        blocks.push(createParagraphBlock(`[${subGroupData.subGroup}]`))

        // BulletedListItem: 각 작업 아이템 (진행률 포함)
        subGroupData.items.forEach((item) => {
          const progressText = item.progress !== undefined ? `, ${item.progress}%` : ''
          const itemText = `${item.title}(${item.person}${progressText})`
          blocks.push(createBulletedListItemBlock(itemText))
        })
      })
    })

    // 2-3. 완료된 업무 섹션 전에 Divider 추가
    blocks.push(createDividerBlock())

    // 2-4. 완료된 업무 섹션
    blocks.push(createHeading2Block('완료된 업무', 'yellow_background'))

    // 완료업무 그룹 처리
    const completedGrouped = this.groupTasksByGroup(completedTasks)
    completedGrouped.forEach((groupData, groupIndex) => {
      // Heading 3: 그룹명
      blocks.push(createHeading3Block(`${groupIndex + 1}. ${groupData.group}`))

      // 각 SubGroup별 작업 목록
      groupData.subGroups.forEach((subGroupData) => {
        // Paragraph: [서브그룹명]
        blocks.push(createParagraphBlock(`[${subGroupData.subGroup}]`))

        // BulletedListItem: 각 작업 아이템 (진행률 포함)
        subGroupData.items.forEach((item) => {
          const progressText = item.progress !== undefined ? `, ${item.progress}%` : ''
          const itemText = `${item.title}(${item.person}${progressText})`
          blocks.push(createBulletedListItemBlock(itemText))
        })
      })
    })

    // 3. 100개 블록 제한을 고려하여 첫 번째 청크로만 페이지 생성
    const BLOCK_LIMIT = BLOCK_LIMITS.NOTION_MAX_BLOCKS_PER_REQUEST
    const initialBlocks = blocks.slice(0, BLOCK_LIMIT)
    const remainingBlocks = blocks.slice(BLOCK_LIMIT)

    const response = await this.notionService.createPage(properties, initialBlocks, icon)

    // 4. 나머지 블록들을 순차적으로 추가
    if (remainingBlocks.length > 0) {
      for (let i = 0; i < remainingBlocks.length; i += BLOCK_LIMIT) {
        const chunk = remainingBlocks.slice(i, i + BLOCK_LIMIT)
        await this.notionService.appendBlocks(response.id, chunk)
      }
    }

    // 5. 개인별 공수 및 진행 상황 섹션 추가
    if (manHourByPerson && manHourByPerson.length > 0) {
      const manHourBlocks = this.createManHourByPersonBlocks(manHourByPerson)

      // 100개씩 청크로 나누어 추가
      for (let i = 0; i < manHourBlocks.length; i += BLOCK_LIMIT) {
        const chunk = manHourBlocks.slice(i, i + BLOCK_LIMIT)
        await this.notionService.appendBlocks(response.id, chunk)
      }
    }

    return response
  }

  /**
   * Notion 데이터베이스에서 이번 주 전체 작업을 조회한다 (주간 보고서용)
   * Notion의 this_week 필터 사용
   */
  private async fetchWeeklyTasksForReport() {
    const filter = {
      and: [
        {
          property: 'Person',
          people: {
            is_not_empty: true,
          },
        },
        {
          property: 'Date',
          date: {
            this_week: {},
          },
        },
      ],
    }

    const sorts = [
      {
        timestamp: 'created_time',
        direction: 'descending',
      },
    ]

    return await this.notionService.queryDatabaseAll(filter, sorts)
  }

  /**
   * 보고서 데이터에서 멤버별 연차/반차 정보를 추출한다
   * @param reports - 보고서 데이터 배열
   * @returns 멤버별 연차/반차 정보 Map
   */
  private getLeaveInfoByPerson(reports: DailyReport[]): Map<string, LeaveInfo[]> {
    // 유틸 함수 사용 (기간으로 설정된 연차/반차도 개별 날짜로 분리됨)
    return extractLeaveInfoByPerson(reports)
  }

  /**
   * 연차/반차 정보를 포함한 인원별 공수 데이터를 생성한다
   * @param reports - 보고서 데이터 배열
   * @returns 연차/반차 정보가 포함된 인원별 공수 데이터
   */
  private getManHourByPersonWithLeaveInfo(reports: DailyReport[]): ManHourByPersonWithReports[] {
    // 1. 기존 로직으로 기본 데이터 생성
    const basicData = this.createManHourByPerson(reports)

    // 2. 연차/반차 정보 추출
    const leaveInfoMap = this.getLeaveInfoByPerson(reports)

    // 3. 각 멤버에 연차/반차 정보 추가
    return basicData.map((personData) => {
      const leaveInfo = leaveInfoMap.get(personData.name) || []

      return {
        ...personData,
        leaveInfo: leaveInfo.length > 0 ? leaveInfo : undefined,
      }
    })
  }

  /**
   * 연차/반차 정보를 포함한 인원별 공수 요약을 생성한다
   * @param manHourByPerson - 인원별 공수 데이터
   * @returns 공수 요약 배열
   */
  private formatManHourSummaryWithLeave(
    manHourByPerson: ManHourByPersonWithReports[]
  ): Array<{ name: string; hours: number; leaveInfo?: string }> {
    return manHourByPerson.map((personData) => {
      let leaveInfoText: string | undefined

      if (personData.leaveInfo && personData.leaveInfo.length > 0) {
        leaveInfoText = personData.leaveInfo
          .map((leave) => {
            const formattedDate = formatDateToShortFormat(leave.date)
            return `${formattedDate}(${leave.dayOfWeek}) ${leave.type}`
          })
          .join(', ')
      }

      return {
        name: personData.name,
        hours: personData.totalManHour,
        leaveInfo: leaveInfoText,
      }
    })
  }

  /**
   * Notion 주간 보고서 페이지를 생성한다
   * @param date - 보고서 날짜 (YYYY-MM-DD 형식)
   * @param manHourSummary - 인원별 공수 요약 (연차/반차 정보 포함)
   * @param manHourByGroup - 그룹별 공수
   * @param inProgressTasks - 진행업무
   * @param manHourByPerson - 개인별 공수 및 진행 상황
   * @returns 생성된 페이지 정보
   */
  async createNotionWeeklyPage(
    date: string,
    manHourSummary: Array<{
      name: string
      hours: number
      leaveInfo?: string
    }>,
    manHourByGroup: Array<{
      group: string
      hours: number
    }>,
    inProgressTasks: Array<{
      group: string
      subGroup: string
      items: Array<{
        title: string
        person: string
        progress?: number
        manHour: number
      }>
    }>,
    manHourByPerson?: ManHourByPersonWithReports[]
  ) {
    // 1. 페이지 속성 생성
    const weekOfMonth = getWeekOfMonth(date)
    const title = `${weekOfMonth} 큐브 파트 주간업무 보고`

    const properties = {
      title: {
        title: [
          {
            text: {
              content: title,
            },
          },
        ],
      },
      Date: {
        date: {
          start: date,
        },
      },
      Tags: {
        select: {
          name: '주간',
        },
      },
    }

    const icon = {
      type: 'emoji' as const,
      emoji: '🔶',
    }

    // 2. 블록 생성 (원본 프로젝트와 동일한 형식)
    const blocks: BlockObjectRequest[] = []

    // 2-1. 페이지 제목 (Heading 1)
    blocks.push(createHeading1Block(title))

    // 2-2. 주간 공수 현황 섹션
    blocks.push(createHeading2Block('주간 공수 현황'))
    const manHourText = this.textFormatter.stringifyWeeklyManHourSummary(manHourSummary)
    blocks.push(createParagraphBlock(manHourText))

    // 2-3. 그룹별 공수 (인원별 공수 바로 다음)
    const manHourByGroupText = this.textFormatter.stringifyManHourByGroup(manHourByGroup)
    blocks.push(createParagraphBlock(manHourByGroupText))

    // 2-4. 금주 진행 사항 (Heading 2 with yellow_background)
    const inProgressTitle = formatReportGroupTitle('진행업무', true) // '금주 진행 사항'
    blocks.push(createHeading2Block(inProgressTitle, 'yellow_background'))

    // 2-4. Group별 작업 목록
    // 같은 Group을 묶어서 처리
    const groupedTasks = this.groupTasksByGroup(inProgressTasks)

    groupedTasks.forEach((groupData, groupIndex) => {
      // Heading 3: 그룹명
      blocks.push(createHeading3Block(`${groupIndex + 1}. ${groupData.group}`))

      // 각 SubGroup별 작업 목록
      groupData.subGroups.forEach((subGroupData) => {
        // Paragraph: [서브그룹명]
        blocks.push(createParagraphBlock(`[${subGroupData.subGroup}]`))

        // BulletedListItem: 각 작업 아이템
        subGroupData.items.forEach((item) => {
          const progressText = item.progress !== undefined ? `, ${item.progress}%` : ''
          const itemText = `${item.title}(${item.person}${progressText})`
          blocks.push(createBulletedListItemBlock(itemText))
        })
      })
    })

    // 3. 100개 블록 제한을 고려하여 첫 번째 청크로만 페이지 생성
    const BLOCK_LIMIT = BLOCK_LIMITS.NOTION_MAX_BLOCKS_PER_REQUEST
    const initialBlocks = blocks.slice(0, BLOCK_LIMIT)
    const remainingBlocks = blocks.slice(BLOCK_LIMIT)

    const response = await this.notionService.createPage(properties, initialBlocks, icon)

    // 4. 나머지 블록들을 순차적으로 추가
    if (remainingBlocks.length > 0) {
      for (let i = 0; i < remainingBlocks.length; i += BLOCK_LIMIT) {
        const chunk = remainingBlocks.slice(i, i + BLOCK_LIMIT)
        await this.notionService.appendBlocks(response.id, chunk)
      }
    }

    // 5. 개인별 공수 및 진행 상황 섹션 추가
    if (manHourByPerson && manHourByPerson.length > 0) {
      const manHourBlocks = this.createManHourByPersonBlocks(manHourByPerson)

      // 100개씩 청크로 나누어 추가
      for (let i = 0; i < manHourBlocks.length; i += BLOCK_LIMIT) {
        const chunk = manHourBlocks.slice(i, i + BLOCK_LIMIT)
        await this.notionService.appendBlocks(response.id, chunk)
      }
    }

    return response
  }

  /**
   * 같은 Group을 가진 작업들을 묶어서 반환한다
   * @param tasks - 작업 목록 (group, subGroup, items 구조)
   * @returns 그룹화된 작업 목록
   */
  private groupTasksByGroup(
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
  ): Array<{
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
  }> {
    const grouped = new Map<
      string,
      {
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
    >()

    tasks.forEach((task) => {
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
  }

  /**
   * Notion 데이터베이스에서 기준 날짜/다음날 작업을 조회한다
   * @param baseDate - YYYY-MM-DD 형식의 기준 날짜 (기본값: 오늘)
   */
  private async fetchTodayTomorrowTasks(baseDate?: string) {
    const targetDate = baseDate || getToday()
    const nextDate = this.getTomorrow(targetDate)

    // 넓은 범위로 조회 (해당 주 전체)
    // transformNotionData에서 isToday/isTomorrow를 정확히 계산하므로
    // 여기서는 넓게 가져오고 나중에 필터링
    const { startDate } = getThisWeekMondayToToday(targetDate)

    const filter = {
      and: [
        {
          property: 'Date',
          date: {
            on_or_after: startDate,
          },
        },
        {
          property: 'Date',
          date: {
            on_or_before: nextDate,
          },
        },
        {
          property: 'Person',
          people: {
            is_not_empty: true,
          },
        },
      ],
    }

    const sorts = [
      {
        timestamp: 'created_time',
        direction: 'descending',
      },
    ]

    return await this.notionService.queryDatabaseAll(filter, sorts)
  }

  /**
   * 다음 날짜를 YYYY-MM-DD 형식으로 반환
   * @param baseDate - 기준 날짜 (YYYY-MM-DD 형식)
   * @returns 다음 날짜 (YYYY-MM-DD 형식)
   */
  private getTomorrow(baseDate: string): string {
    const date = new Date(baseDate)
    date.setDate(date.getDate() + 1)
    return date.toISOString().split('T')[0]
  }

  /**
   * Notion 데이터베이스에서 해당 주 월요일부터 기준 날짜까지의 작업을 조회한다
   * @param baseDate - YYYY-MM-DD 형식의 기준 날짜 (기본값: 오늘)
   */
  private async fetchWeeklyTasks(baseDate?: string) {
    // 해당 주 월요일부터 기준 날짜까지의 날짜 범위 계산
    const targetDate = baseDate || getToday()
    const { startDate } = getThisWeekMondayToToday(targetDate)

    const filter = {
      and: [
        {
          property: 'Person',
          people: {
            is_not_empty: true,
          },
        },
        {
          property: 'Date',
          date: {
            on_or_after: startDate,
          },
        },
        {
          property: 'Date',
          date: {
            on_or_before: targetDate,
          },
        },
      ],
    }

    const sorts = [
      {
        property: 'Date',
        direction: 'ascending',
      },
    ]

    return await this.notionService.queryDatabaseAll(filter, sorts)
  }

  /**
   * Notion 원본 데이터를 내부 데이터 구조로 변환한다
   * isToday, isTomorrow는 기준 날짜를 기준으로 직접 계산
   * @param rawData - Notion API 원본 데이터
   * @param baseDate - YYYY-MM-DD 형식의 기준 날짜 (기본값: 오늘)
   */
  private transformNotionData(rawData: unknown[], baseDate?: string): DailyReport[] {
    const targetDate = baseDate || getToday()
    const nextDate = this.getTomorrow(targetDate)

    return rawData.map((page) => {
      const typedPage = page as { id: string; properties: Record<string, Record<string, unknown>> }
      const properties = typedPage.properties || {}

      // Date 필드에서 날짜 추출
      const dateStart = ((properties.Date as Record<string, Record<string, string>>)?.date?.start as string) ?? ''
      const dateEnd = ((properties.Date as Record<string, Record<string, string | null>>)?.date?.end as string | null) ?? null

      // Date 범위를 고려한 isToday, isTomorrow 계산
      // start ~ end 범위에 today 또는 tomorrow가 포함되는지 확인
      const checkDateInRange = (targetDate: string, start: string, end: string | null): boolean => {
        if (!start) return false
        const target = new Date(targetDate)
        const rangeStart = new Date(start)
        const rangeEnd = end ? new Date(end) : rangeStart

        return target >= rangeStart && target <= rangeEnd
      }

      return {
        id: typedPage.id || '',
        title: this.extractTitle(typedPage as unknown as Record<string, unknown>),
        person: this.extractPerson(typedPage as unknown as Record<string, unknown>),
        group: (this.extractProperty(typedPage as unknown as Record<string, unknown>, 'Group', 'select') as string) || '기타',
        subGroup: (this.extractProperty(typedPage as unknown as Record<string, unknown>, 'SubGroup', 'select') as string) || '일반',
        progressRate: ((this.extractProperty(typedPage as unknown as Record<string, unknown>, 'Progress', 'number') as number) ?? 0) * 100,
        date: {
          start: dateStart,
          end: dateEnd,
        },
        // Date 범위를 고려하여 isToday, isTomorrow 계산 (기준 날짜 기준)
        isToday: checkDateInRange(targetDate, dateStart, dateEnd),
        isTomorrow: checkDateInRange(nextDate, dateStart, dateEnd),
        manHour: (this.extractProperty(typedPage as unknown as Record<string, unknown>, 'ManHour', 'number') as number) ?? 0,
        pmsNumber: this.extractProperty(typedPage as unknown as Record<string, unknown>, 'PmsNumber', 'number') as number | undefined,
        pmsLink: ((this.extractProperty(typedPage as unknown as Record<string, unknown>, 'PmsLink', 'formula') as Record<string, string>)?.string as string) || undefined,
      }
    })
  }

  /**
   * Notion 페이지에서 제목 추출
   */
  private extractTitle(page: Record<string, unknown>): string {
    const properties = (page.properties as Record<string, Record<string, unknown>>) || {}
    const titleProp = properties.Name || properties.Title || properties.title

    if (!titleProp) return ''

    const titleObj = titleProp as Record<string, unknown>
    if (titleObj.type === 'title') {
      const titleArray = titleObj.title as Array<{ plain_text: string }>
      if (titleArray && titleArray.length > 0) {
        return titleArray[0]?.plain_text || ''
      }
    }

    return ''
  }

  /**
   * Notion 페이지에서 담당자 추출
   */
  private extractPerson(page: Record<string, unknown>): string {
    const properties = (page.properties as Record<string, Record<string, unknown>>) || {}
    const personProp = properties.Person as Record<string, unknown[]>

    if (!personProp || !personProp.people || personProp.people.length === 0) {
      return ''
    }

    const firstPerson = personProp.people[0] as Record<string, Record<string, string>>
    const email = firstPerson?.person?.email || (firstPerson as unknown as { email: string }).email
    return this.getMemberNameFromEmail(email)
  }

  /**
   * Notion 페이지에서 속성값 추출
   */
  private extractProperty(page: Record<string, unknown>, propName: string, propType: string): unknown {
    const properties = (page.properties as Record<string, Record<string, unknown>>) || {}
    const prop = properties[propName]
    if (!prop) return null

    switch (propType) {
      case 'select': {
        const selectProp = prop as Record<string, Record<string, string>>
        return selectProp.select?.name || ''
      }
      case 'number': {
        const numberProp = prop as Record<string, number | null>
        return numberProp.number ?? null
      }
      case 'formula':
        return prop.formula
      default:
        return null
    }
  }

  /**
   * 이메일로 멤버 이름 조회
   */
  private getMemberNameFromEmail(email: string | undefined): string {
    if (!email) return ''
    return memberMap[email]?.name || email.split('@')[0]
  }

  /**
   * 멤버 우선순위 조회
   */
  private getMemberPriority(name: string): number {
    const entry = Object.entries(memberMap).find(
      ([, value]) => value.name === name
    )
    return entry ? entry[1].priority : 999
  }

  /**
   * 중복된 보고서를 제거하고 manHour를 합산한다
   * @param reports - 보고서 데이터 배열
   * @returns 중복이 제거된 보고서 데이터 배열
   */
  private distinctReports(reports: DailyReport[]): DailyReport[] {
    const uniqueMap = new Map<string, DailyReport>()
    const manHourSumMap = new Map<string, number>()

    // 보고서 처리
    reports.forEach((report) => {
      const key = this.generateDistinctKey(report)

      // manHour 합산
      const currentManHour = manHourSumMap.get(key) || 0
      manHourSumMap.set(key, currentManHour + (report.manHour || 0))

      // 날짜가 더 큰 보고서로 업데이트 (end 우선, 없으면 start)
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, report)
      } else {
        const existingReport = uniqueMap.get(key)!
        const existingDate = existingReport.date.end
          ? new Date(existingReport.date.end)
          : new Date(existingReport.date.start)
        const currentDate = report.date.end
          ? new Date(report.date.end)
          : new Date(report.date.start)

        if (currentDate > existingDate) {
          uniqueMap.set(key, report)
        }
      }
    })

    // 최종 결과 생성 (manHour 합산 값 적용)
    return Array.from(uniqueMap.entries()).map(([key, report]) => ({
      ...report,
      manHour: manHourSumMap.get(key) || report.manHour || 0,
    }))
  }

  /**
   * 중복 체크를 위한 키 생성
   * @param report - 보고서 데이터
   * @returns 중복 체크 키
   */
  private generateDistinctKey(report: DailyReport): string {
    if (report.pmsNumber && report.pmsNumber !== null) {
      return `${report.person}-${report.pmsNumber}`
    } else {
      const normalizedTitle = report.title.replace(/\s+/g, '')
      return `${report.person}-${normalizedTitle}`
    }
  }

  /**
   * 다중 담당자 처리 - 담당자가 여러 명인 경우 각 담당자별로 보고서 복제
   * 원본 Notion 데이터에서 Person 필드에 여러 명이 있는 경우 각각 분할
   */
  private processMultiplePeopleRaw(reports: unknown[]): unknown[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processedReports: any[] = []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(reports as any[]).forEach((report) => {
      const people = report.properties?.Person?.people || []

      if (people.length <= 1) {
        // 담당자가 1명 이하인 경우 그대로 추가
        processedReports.push(report)
      } else {
        // 담당자가 2명 이상인 경우 각 담당자별로 복제
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        people.forEach((person: any) => {
          const clonedReport = JSON.parse(JSON.stringify(report)) // 깊은 복사
          clonedReport.properties.Person.people = [person] // 담당자 1명만 할당
          processedReports.push(clonedReport)
        })
      }
    })

    return processedReports
  }

  /**
   * 프로젝트와 서브그룹별로 작업을 그룹화하고 정렬한다
   */
  private groupByProjectAndSubGroup(reports: DailyReport[]) {
    const grouped = new Map<string, Map<string, DailyReport[]>>()

    reports.forEach((report) => {
      const group = report.group || '기타'
      const subGroup = report.subGroup || '일반'

      if (!grouped.has(group)) {
        grouped.set(group, new Map())
      }

      const subGroupMap = grouped.get(group)!
      if (!subGroupMap.has(subGroup)) {
        subGroupMap.set(subGroup, [])
      }

      subGroupMap.get(subGroup)!.push(report)
    })

    // Map을 배열로 변환하면서 정렬
    const result: Array<{
      group: string
      subGroup: string
      items: Array<{
        title: string
        person: string
        progress?: number
        manHour: number
      }>
    }> = []

    // Group 정렬: 우선순위 기반 정렬
    const sortedGroups = Array.from(grouped.entries()).sort(([groupA], [groupB]) => {
      // 우선순위 정의
      const highPriorityGroups = ['kt cloud', 'kt cloud - 상주']
      const secondPriorityGroups = ['DCIM 구현', 'DCIM프로젝트']
      const lowPriorityGroups = ['자체결함', '기술지원팀 요청']
      const lowestPriorityGroups = ['회의', '기타']

      const getPriority = (group: string): number => {
        if (highPriorityGroups.includes(group)) return 1
        if (secondPriorityGroups.includes(group)) return 2
        if (lowPriorityGroups.includes(group)) return 4
        if (lowestPriorityGroups.includes(group)) return 5
        return 3 // 일반 그룹
      }

      const priorityA = getPriority(groupA)
      const priorityB = getPriority(groupB)

      // 우선순위가 다르면 우선순위로 정렬
      if (priorityA !== priorityB) {
        return priorityA - priorityB
      }

      // 같은 우선순위 내에서는 정의된 순서대로
      if (priorityA === 1) {
        return highPriorityGroups.indexOf(groupA) - highPriorityGroups.indexOf(groupB)
      }
      if (priorityA === 2) {
        return secondPriorityGroups.indexOf(groupA) - secondPriorityGroups.indexOf(groupB)
      }
      if (priorityA === 4) {
        return lowPriorityGroups.indexOf(groupA) - lowPriorityGroups.indexOf(groupB)
      }
      if (priorityA === 5) {
        return lowestPriorityGroups.indexOf(groupA) - lowestPriorityGroups.indexOf(groupB)
      }

      // 일반 그룹(우선순위 3)은 가나다순
      return groupA.localeCompare(groupB, 'ko')
    })

    sortedGroups.forEach(([group, subGroupMap]) => {
      // SubGroup 정렬: 분석, 설계/분석, 구현, 결함 처리, 개발 관리, 회의, 일반, 기타 순서
      const subGroupOrder = ['분석', '설계/분석', '구현', '결함 처리', '개발 관리', '회의', '일반', '기타']
      const sortedSubGroups = Array.from(subGroupMap.entries()).sort(([subGroupA], [subGroupB]) => {
        const indexA = subGroupOrder.indexOf(subGroupA)
        const indexB = subGroupOrder.indexOf(subGroupB)

        // 둘 다 순서에 있는 경우
        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB
        }

        // A만 순서에 있는 경우
        if (indexA !== -1) return -1

        // B만 순서에 있는 경우
        if (indexB !== -1) return 1

        // 둘 다 순서에 없는 경우 알파벳순
        return subGroupA.localeCompare(subGroupB, 'ko')
      })

      sortedSubGroups.forEach(([subGroup, items]) => {
        // items 정렬: progressRate 내림차순 -> person 우선순위 오름차순
        const sortedItems = items.sort((a, b) => {
          // 1. progressRate 내림차순
          if (a.progressRate !== b.progressRate) {
            return b.progressRate - a.progressRate
          }

          // 2. person 우선순위
          const priorityA = this.getMemberPriority(a.person)
          const priorityB = this.getMemberPriority(b.person)
          if (priorityA !== priorityB) {
            return priorityA - priorityB
          }

          // 3. 이름 가나다순
          return a.person.localeCompare(b.person, 'ko')
        })

        result.push({
          group,
          subGroup,
          items: sortedItems.map((item) => ({
            title: item.title,
            person: item.person,
            progress: item.progressRate > 0 ? Math.round(item.progressRate) : undefined,
            manHour: item.manHour,
            pmsLink: item.pmsLink,
          })),
        })
      })
    })

    return result
  }

  /**
   * 그룹별 공수를 계산한다
   * @param reports - 일일 보고서 데이터 배열
   * @returns 그룹별 공수 합계 (공수 내림차순 정렬)
   */
  private getManHourByGroup(reports: DailyReport[]): Array<{ group: string; hours: number }> {
    const groupMap = reports.reduce((acc, report) => {
      acc[report.group] = (acc[report.group] ?? 0) + report.manHour
      return acc
    }, {} as Record<string, number>)

    // 공수 내림차순 정렬
    return Object.entries(groupMap)
      .map(([group, hours]) => ({ group, hours }))
      .sort((a, b) => b.hours - a.hours)
  }

  /**
   * 인원별 공수를 집계한다
   * @deprecated 현재 사용되지 않음. calculateWeeklyManHourSummary 사용
   */
  private calculateManHourSummary(reports: DailyReport[]) {
    const manHourMap = new Map<string, { hours: number; isCompleted: boolean }>()

    // 1. 인원별 공수 합계 계산
    reports.forEach((report) => {
      const current = manHourMap.get(report.person) || { hours: 0, isCompleted: false }
      manHourMap.set(report.person, {
        hours: current.hours + report.manHour,
        isCompleted: current.isCompleted || false,
      })
    })

    // 2. 배열로 변환 및 우선순위 정렬
    const result = Array.from(manHourMap.entries())
      .map(([name, data]) => ({
        name,
        hours: data.hours,
        isCompleted: data.isCompleted,
        priority: this.getMemberPriority(name),
      }))
      .sort((a, b) => {
        // 우선순위 오름차순
        if (a.priority !== b.priority) {
          return a.priority - b.priority
        }
        // 이름 가나다순
        return a.name.localeCompare(b.name, 'ko')
      })

    return result.map(({ name, hours, isCompleted }) => ({
      name,
      hours,
      isCompleted,
    }))
  }

  /**
   * 주간 데이터 기준으로 인원별 공수를 집계하고 작성 완료 여부를 체크한다
   * 반차/연차 정보를 고려하여 기대 공수를 조정한다
   */
  private calculateWeeklyManHourSummary(reports: DailyReport[]) {
    // 1. 이번 주 월요일부터 오늘까지의 날짜 범위
    const today = getToday()
    const { startDate, endDate } = getThisWeekMondayToToday(today)

    // 2. 기본 기대 공수 계산 (근무일수 * 8)
    const workingDays = getWorkingDaysCount(startDate, endDate)
    const baseExpectedManHour = workingDays * 8

    // 3. 연차/반차 정보 추출 (유틸 함수 사용)
    const leaveInfoByPerson = extractLeaveInfoByPerson(reports)

    // 4. 인원별 공수 합계 계산 (연차/반차 제외)
    const manHourMap = new Map<string, number>()
    reports.forEach((report) => {
      // 연차/반차 항목은 공수 집계에서 제외
      if (isLeaveReport(report)) {
        return
      }
      const current = manHourMap.get(report.person) || 0
      manHourMap.set(report.person, current + report.manHour)
    })

    // 5. 배열로 변환 및 우선순위 정렬, 작성 완료 여부 체크
    const result = Array.from(manHourMap.entries())
      .map(([name, hours]) => {
        // 개인별 연차/반차 공제 계산 (유틸 함수 사용)
        const personLeaveInfo = leaveInfoByPerson.get(name) || []
        const leaveDeduction = calculateTotalLeaveDeduction(personLeaveInfo)
        const expectedManHour = baseExpectedManHour - leaveDeduction

        // 연차/반차 정보 텍스트 생성 (유틸 함수 사용)
        const leaveInfoText = formatLeaveInfoText(personLeaveInfo)

        return {
          name,
          hours,
          isCompleted: hours >= expectedManHour,
          leaveInfo: leaveInfoText,
          priority: this.getMemberPriority(name),
        }
      })
      .sort((a, b) => {
        // 우선순위 오름차순
        if (a.priority !== b.priority) {
          return a.priority - b.priority
        }
        // 이름 가나다순
        return a.name.localeCompare(b.name, 'ko')
      })

    return result.map(({ name, hours, isCompleted, leaveInfo }) => ({
      name,
      hours,
      isCompleted,
      leaveInfo,
    }))
  }

  /**
   * 개인별 공수 및 진행 상황 데이터를 생성한다
   */
  private createManHourByPerson(reports: DailyReport[]): ManHourByPersonWithReports[] {
    // 1. 인원별로 보고서 그룹화
    const personMap = new Map<string, DailyReport[]>()
    reports.forEach((report) => {
      const existing = personMap.get(report.person) || []
      personMap.set(report.person, [...existing, report])
    })

    // 2. 각 인원별 데이터 생성
    const result = Array.from(personMap.entries()).map(([name, personReports]) => {
      const totalManHour = personReports.reduce((sum, report) => sum + report.manHour, 0)
      return {
        name,
        totalManHour,
        reports: personReports,
      }
    })

    // 3. 우선순위 정렬
    return result.sort((a, b) => {
      const priorityA = this.getMemberPriority(a.name)
      const priorityB = this.getMemberPriority(b.name)
      if (priorityA !== priorityB) {
        return priorityA - priorityB
      }
      return a.name.localeCompare(b.name, 'ko')
    })
  }

  /**
   * 인원별 상세 공수 정보 블록들을 생성한다 (테이블 형태)
   * @param manHourByPerson - 인원별 공수 및 보고서 정보 배열
   * @returns 인원별 상세 공수 블록 배열
   */
  private createManHourByPersonBlocks(
    manHourByPerson: ManHourByPersonWithReports[]
  ): BlockObjectRequest[] {
    const blocks: BlockObjectRequest[] = []

    if (manHourByPerson && manHourByPerson.length > 0) {
      // 섹션 제목 추가
      blocks.push(createHeading2Block('개인별 공수 및 진행 상황'))

      // 각 인원별로 상세 정보 블록 추가
      manHourByPerson.forEach((personData) => {
        // 인원명과 총 공수 헤딩 추가
        const personHeading = `${personData.name} - total: ${personData.totalManHour}m/h, ${personData.reports.length}건`
        blocks.push(createHeading3Block(personHeading))

        // manHour가 0보다 큰 보고서만 필터링
        const filteredReports = personData.reports.filter(
          (report) => report.manHour > 0
        )

        // '회의' 그룹을 가장 아래로 정렬
        const sortedReports = filteredReports.sort((a, b) => {
          const aIsMeeting = a.group === '회의'
          const bIsMeeting = b.group === '회의'

          if (aIsMeeting && !bIsMeeting) return 1 // a가 회의면 뒤로
          if (!aIsMeeting && bIsMeeting) return -1 // b가 회의면 뒤로
          return 0 // 둘 다 회의이거나 둘 다 아니면 순서 유지
        })

        // 보고서가 있는 경우에만 테이블 생성
        if (sortedReports.length > 0) {
          // 테이블 헤더
          const tableHeader: TableCellData[] = [
            '번호',
            'PMS 관리 번호',
            '타이틀',
            '그룹',
            '진행도',
            '공수(m/h)',
          ]

          // 테이블 데이터 생성 (PmsLink 활용)
          const tableDataRows: TableCellData[][] = sortedReports.map((report, index) => [
            `${index + 1}`,
            // PmsLink가 있으면 하이퍼링크로, 없으면 일반 텍스트로
            report.pmsLink && report.pmsNumber
              ? { text: this.formatPmsNumber(report.pmsNumber), link: report.pmsLink }
              : this.formatPmsNumber(report.pmsNumber),
            this.cleanTitle(report.title || ''),
            report.group || '',
            `${report.progressRate}%`,
            `${report.manHour}`,
          ])

          const tableData: TableCellData[][] = [tableHeader, ...tableDataRows]

          // 하이퍼링크를 지원하는 테이블 블록 추가
          const tableBlock = createTableWithLinksAndRows(tableData, true)
          blocks.push(tableBlock)
        }
      })
    }

    return blocks
  }

  /**
   * PMS 번호를 포맷한다
   */
  private formatPmsNumber(pmsNumber: number | undefined): string {
    if (pmsNumber === null || pmsNumber === undefined) {
      return ''
    }
    return '#' + pmsNumber.toString()
  }

  /**
   * 타이틀에서 불필요한 접두사를 제거한다
   */
  private cleanTitle(title: string): string {
    if (!title) return ''

    // "#-" 접두사 제거
    if (title.startsWith('#-')) {
      return title.substring(2).trim()
    }

    return title
  }

  /**
   * Notion 보고서 페이지를 생성한다
   * @param date - 보고서 날짜 (YYYY-MM-DD 형식)
   * @param manHourSummary - 인원별 공수 요약
   * @param inProgressTasks - 진행업무
   * @param plannedTasks - 예정업무
   * @param manHourByPerson - 개인별 공수 및 진행 상황 (선택사항)
   * @returns 생성된 페이지 ID
   */
  async createNotionPage(
    date: string,
    manHourSummary: Array<{
      name: string
      hours: number
      isCompleted: boolean
    }>,
    inProgressTasks: Array<{
      group: string
      subGroup: string
      items: Array<{
        title: string
        person: string
        progress?: number
        manHour: number
      }>
    }>,
    plannedTasks: Array<{
      group: string
      subGroup: string
      items: Array<{
        title: string
        person: string
        manHour: number
      }>
    }>,
    manHourByPerson?: ManHourByPersonWithReports[]
  ) {
    // 1. 페이지 속성 생성
    const formattedDate = formatDateToShortFormat(date)
    const title = `큐브 파트 일일업무 보고 (${formattedDate})`

    const properties = {
      title: {
        title: [
          {
            text: {
              content: title,
            },
          },
        ],
      },
      Date: {
        date: {
          start: date,
        },
      },
      Tags: {
        select: {
          name: '일간',
        },
      },
    }

    const icon = {
      type: 'emoji' as const,
      emoji: '📝',
    }

    // 2. 블록 생성
    const manHourText = this.textFormatter.stringifyManHourSummary(manHourSummary)
    const inProgressText = this.textFormatter.stringifyTasks(inProgressTasks, '진행업무')
    const plannedText = this.textFormatter.stringifyTasks(plannedTasks, '예정업무')

    const blocks = [
      createHeading2Block('일일 공수 현황'),
      createParagraphBlock(manHourText),
    ]

    // 진행업무 코드 블록 생성
    const inProgressChunks = splitTextIntoChunks(inProgressText, 2000)
    inProgressChunks.forEach((chunk) => {
      blocks.push(...createCodeBlocks(chunk))
    })

    // 예정업무 코드 블록 생성
    const plannedChunks = splitTextIntoChunks(plannedText, 2000)
    plannedChunks.forEach((chunk) => {
      blocks.push(...createCodeBlocks(chunk))
    })

    // 3. 100개 블록 제한을 고려하여 첫 번째 청크로만 페이지 생성
    const BLOCK_LIMIT = BLOCK_LIMITS.NOTION_MAX_BLOCKS_PER_REQUEST
    const initialBlocks = blocks.slice(0, BLOCK_LIMIT)
    const remainingBlocks = blocks.slice(BLOCK_LIMIT)

    const response = await this.notionService.createPage(properties, initialBlocks, icon)

    // 4. 나머지 블록들을 순차적으로 추가
    if (remainingBlocks.length > 0) {
      for (let i = 0; i < remainingBlocks.length; i += BLOCK_LIMIT) {
        const chunk = remainingBlocks.slice(i, i + BLOCK_LIMIT)
        await this.notionService.appendBlocks(response.id, chunk)
      }
    }

    // 5. 개인별 공수 및 진행 상황 섹션 추가
    if (manHourByPerson && manHourByPerson.length > 0) {
      const manHourBlocks = this.createManHourByPersonBlocks(manHourByPerson)

      // 100개씩 청크로 나누어 추가
      for (let i = 0; i < manHourBlocks.length; i += BLOCK_LIMIT) {
        const chunk = manHourBlocks.slice(i, i + BLOCK_LIMIT)
        await this.notionService.appendBlocks(response.id, chunk)
      }
    }

    return response
  }
}
