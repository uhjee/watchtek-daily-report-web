import { NextRequest, NextResponse } from 'next/server'
import { NotionApiService } from '@/lib/services/notionApiService'
import memberMap from '@/lib/config/members'
import { DailyReport } from '@/lib/types/report'
import { getCurrentMonthRangeByWednesday } from '@/lib/utils/dateUtils'

interface NotionPageProperties {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

interface NotionPage {
  id: string
  properties: NotionPageProperties
}

/**
 * Notion 페이지를 DailyReport로 변환
 * (월간 보고서 로직과 동일한 transformNotionData 참조)
 */
function transformNotionPageToTask(page: NotionPage): DailyReport | null {
  try {
    const props = page.properties

    // 필수 필드 확인
    if (!props.Name?.title?.[0]?.plain_text) return null
    if (!props.Date?.date) return null

    const title = props.Name.title[0].plain_text
    const dateInfo = props.Date.date

    // 담당자 정보
    const personEmail = props.Person?.people?.[0]?.person?.email || props.Person?.people?.[0]?.email
    const personName = personEmail ? memberMap[personEmail]?.name || '미지정' : '미지정'

    // Group, SubGroup
    const group = props.Group?.select?.name || '기타'
    const subGroup = props.SubGroup?.select?.name || '일반'

    // Progress (0~1 -> 0~100 변환), ManHour
    const progressRaw = props.Progress?.number ?? 0
    const progressRate = progressRaw * 100
    const manHour = props.ManHour?.number || 0

    // PMS 정보
    const pmsNumber = props.PmsNumber?.number
    const pmsLink = props.PmsLink?.formula?.string || props.PmsLink?.url

    return {
      id: page.id,
      title,
      customer: props.Customer?.select?.name,
      group,
      subGroup,
      person: personName,
      progressRate,
      date: {
        start: dateInfo.start,
        end: dateInfo.end,
      },
      isToday: false,
      isTomorrow: false,
      manHour,
      pmsNumber,
      pmsLink,
    }
  } catch (error) {
    console.error('Notion 페이지 변환 중 오류:', error)
    return null
  }
}

/**
 * 다중 담당자 처리 - 담당자가 여러 명인 경우 각 담당자별로 보고서 복제
 * (월간 보고서 로직의 processMultiplePeopleRaw와 동일)
 */
function processMultiplePeople(pages: NotionPage[]): NotionPage[] {
  const processedPages: NotionPage[] = []

  pages.forEach((page) => {
    const people = page.properties?.Person?.people || []

    if (people.length <= 1) {
      processedPages.push(page)
    } else {
      // 담당자가 2명 이상인 경우 각 담당자별로 복제
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      people.forEach((person: any) => {
        const clonedPage = JSON.parse(JSON.stringify(page))
        clonedPage.properties.Person.people = [person]
        processedPages.push(clonedPage)
      })
    }
  })

  return processedPages
}

/**
 * 중복 체크를 위한 키 생성
 * (월간 보고서 로직의 generateDistinctKey와 동일)
 */
function generateDistinctKey(report: DailyReport): string {
  if (report.pmsNumber && report.pmsNumber !== null) {
    return `${report.person}-${report.pmsNumber}`
  } else {
    const normalizedTitle = report.title.replace(/\s+/g, '')
    return `${report.person}-${normalizedTitle}`
  }
}

/**
 * 중복된 보고서를 제거하고 manHour를 합산
 * (월간 보고서 로직의 distinctReports와 동일)
 */
function distinctReports(reports: DailyReport[]): DailyReport[] {
  const uniqueMap = new Map<string, DailyReport>()
  const manHourSumMap = new Map<string, number>()

  reports.forEach((report) => {
    const key = generateDistinctKey(report)

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

      // 날짜가 더 큰 보고서의 progressRate를 사용
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
 * GET /api/monthly-tasks?year=2025&month=11
 * 월별 업무 목록 조회
 * - Notion 월간 보고서 생성 로직과 동일한 데이터 처리 적용
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    if (!year || !month) {
      return NextResponse.json(
        { error: 'year와 month 파라미터가 필요합니다.' },
        { status: 400 }
      )
    }

    const yearNum = parseInt(year)
    const monthNum = parseInt(month)

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return NextResponse.json(
        { error: '올바른 year, month 값을 입력해주세요.' },
        { status: 400 }
      )
    }

    // 해당 월의 마지막 날을 기준으로 수요일 기준 월 범위 계산 (Monthly Report와 동일)
    const lastDayOfMonth = new Date(yearNum, monthNum, 0) // 다음 달 0일 = 이번 달 마지막 날
    const lastDayStr = lastDayOfMonth.toISOString().split('T')[0]

    // 수요일 기준 월 범위 계산
    const { firstDay: startDateStr, lastDay: endDateStr } = getCurrentMonthRangeByWednesday(lastDayStr)

    // Notion API 조회
    const notionService = new NotionApiService()

    // Date 필터: 해당 월에 포함되는 모든 데이터
    // Person 필터 추가: 담당자가 있는 데이터만 (월간 보고서와 동일)
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
            on_or_after: startDateStr,
          },
        },
        {
          property: 'Date',
          date: {
            on_or_before: endDateStr,
          },
        },
      ],
    }

    const results = await notionService.queryDatabaseAll(filter)

    // 1. 다중 담당자 처리 (월간 보고서와 동일)
    const processedPages = processMultiplePeople(results as NotionPage[])

    // 2. Notion 페이지를 DailyReport로 변환
    const rawTasks: DailyReport[] = processedPages
      .map((page) => transformNotionPageToTask(page))
      .filter((task): task is DailyReport => task !== null)

    // 3. 중복 제거 및 manHour 합산 (월간 보고서와 동일)
    const tasks = distinctReports(rawTasks)

    return NextResponse.json({
      year: yearNum,
      month: monthNum,
      tasks,
      total: tasks.length,
    })
  } catch (error) {
    console.error('월별 업무 목록 조회 중 오류:', error)
    return NextResponse.json(
      { error: '월별 업무 목록 조회 실패' },
      { status: 500 }
    )
  }
}
