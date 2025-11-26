import { NextRequest, NextResponse } from 'next/server'
import { NotionApiService } from '@/lib/services/notionApiService'
import memberMap from '@/lib/config/members'
import { DailyReport } from '@/lib/types/report'

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
    const group = props.Group?.select?.name || '미분류'
    const subGroup = props.SubGroup?.select?.name || '미분류'

    // Progress, ManHour
    const progressRate = props.Progress?.number || 0
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
      // isToday, isTomorrow는 필요시 클라이언트에서 계산
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
 * GET /api/monthly-tasks?year=2025&month=11
 * 월별 업무 목록 조회
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

    // 해당 월의 시작일과 종료일 계산
    const startDate = new Date(yearNum, monthNum - 1, 1)
    const endDate = new Date(yearNum, monthNum, 0) // 다음 달 0일 = 이번 달 마지막 날

    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    // Notion API 조회
    const notionService = new NotionApiService()

    // Date 필터: 해당 월에 포함되는 모든 데이터
    const filter = {
      and: [
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

    // Notion 페이지를 DailyReport로 변환
    const tasks: DailyReport[] = results
      .map((page) => transformNotionPageToTask(page as NotionPage))
      .filter((task): task is DailyReport => task !== null)

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
