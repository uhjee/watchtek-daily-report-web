import { NextRequest, NextResponse } from 'next/server'
import { ReportService } from '@/lib/services/reportService'

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

    // 3. Daily 보고서 생성 (항상)
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

    // 4. Weekly 보고서 생성 (해당 주의 마지막 평일인 경우)
    if (reportTypes.shouldGenerateWeekly) {
      const weeklyReport = await reportService.generateWeeklyReport(date)
      const weeklyNotionPage = await reportService.createNotionWeeklyPage(
        weeklyReport.date,
        weeklyReport.manHourSummary,
        weeklyReport.tasks.inProgress,
        weeklyReport.manHourByPerson
      )
      result.weekly = {
        ...weeklyReport,
        notionPageId: weeklyNotionPage.id,
        notionPageUrl: (weeklyNotionPage as { url?: string }).url,
      }
    }

    // 5. Monthly 보고서 생성 (해당 월의 마지막 주 마지막 평일인 경우)
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
