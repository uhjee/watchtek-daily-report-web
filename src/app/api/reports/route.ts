import { NextRequest, NextResponse } from 'next/server'
import { ReportService } from '@/lib/services/reportService'

/**
 * GET /api/reports
 * Notion 데이터베이스에서 보고서 데이터만 조회 (Notion 페이지 생성 없음)
 * - Web 화면에 보고서 표시용
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || undefined

    const reportService = new ReportService()

    // 1. 보고서 타입 판단
    const reportTypes = reportService.determineReportTypes(date)

    // 휴일인 경우
    if (reportTypes.isHoliday) {
      return NextResponse.json(
        { error: '휴일에는 보고서를 조회할 수 없습니다.' },
        { status: 400 }
      )
    }

    // 2. 결과 저장 객체
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = {
      reportTypes,
      daily: null,
      weekly: null,
      monthly: null,
    }

    // 3. Daily 보고서 데이터 조회 (Notion 페이지 생성 없음)
    if (reportTypes.shouldGenerateDaily) {
      const dailyReport = await reportService.generateDailyReport(date)
      result.daily = dailyReport
    }

    // 4. Weekly 보고서 데이터 조회 (해당 주의 마지막 평일인 경우)
    if (reportTypes.shouldGenerateWeekly) {
      const weeklyReport = await reportService.generateWeeklyReport(date)
      result.weekly = weeklyReport
    }

    // 5. Monthly 보고서 데이터 조회 (해당 월의 마지막 주 마지막 평일인 경우)
    if (reportTypes.shouldGenerateMonthly) {
      const monthlyReport = await reportService.generateMonthlyReport(date)
      result.monthly = monthlyReport
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('보고서 조회 중 오류:', error)
    return NextResponse.json(
      { error: '보고서 조회에 실패했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/reports
 * Notion 데이터베이스에서 데이터 조회 + Notion 보고서 페이지 생성
 * - '오늘 보고서 만들기' 버튼 클릭 시 호출
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date } = body

    const reportService = new ReportService()

    // 1. 보고서 타입 판단
    const reportTypes = reportService.determineReportTypes(date)

    // 휴일인 경우 보고서 생성 안함
    if (reportTypes.isHoliday) {
      return NextResponse.json(
        { error: '휴일에는 보고서를 생성하지 않습니다.' },
        { status: 400 }
      )
    }

    // 2. 결과 저장 객체
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = {
      reportTypes,
      daily: null,
      weekly: null,
      monthly: null,
    }

    // 3. Daily 보고서 생성 + Notion 페이지 생성
    if (reportTypes.shouldGenerateDaily) {
      const dailyReport = await reportService.generateDailyReport(date)
      const dailyNotionPage = await reportService.createNotionPage(
        dailyReport.date,
        dailyReport.manHourSummary,
        dailyReport.tasks.inProgress,
        dailyReport.tasks.planned,
        dailyReport.manHourByPerson
      )
      result.daily = {
        ...dailyReport,
        notionPageId: dailyNotionPage.id,
        notionPageUrl: (dailyNotionPage as { url?: string }).url,
      }
    }

    // 4. Weekly 보고서 생성 + Notion 페이지 생성 (해당 주의 마지막 평일인 경우)
    if (reportTypes.shouldGenerateWeekly) {
      const weeklyReport = await reportService.generateWeeklyReport(date)
      const weeklyNotionPage = await reportService.createNotionWeeklyPage(
        weeklyReport.date,
        weeklyReport.manHourSummary,
        weeklyReport.manHourByGroup,
        weeklyReport.tasks.inProgress,
        weeklyReport.manHourByPerson
      )
      result.weekly = {
        ...weeklyReport,
        notionPageId: weeklyNotionPage.id,
        notionPageUrl: (weeklyNotionPage as { url?: string }).url,
      }
    }

    // 5. Monthly 보고서 생성 + Notion 페이지 생성 (해당 월의 마지막 주 마지막 평일인 경우)
    if (reportTypes.shouldGenerateMonthly) {
      const monthlyReport = await reportService.generateMonthlyReport(date)
      const monthlyNotionPage = await reportService.createNotionMonthlyPage(
        monthlyReport.date,
        monthlyReport.manHourSummary,
        monthlyReport.tasks.inProgress,
        monthlyReport.tasks.completed,
        monthlyReport.manHourByPerson
      )
      result.monthly = {
        ...monthlyReport,
        notionPageId: monthlyNotionPage.id,
        notionPageUrl: (monthlyNotionPage as { url?: string }).url,
      }
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('보고서 생성 중 오류:', error)
    return NextResponse.json(
      { error: '보고서 생성에 실패했습니다.' },
      { status: 500 }
    )
  }
}
