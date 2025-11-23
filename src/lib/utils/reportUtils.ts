import { DailyReport } from '../types/report'

/**
 * 보고서 관련 유틸리티 함수들
 */

/**
 * 보고서 아이템의 제목을 포맷한다
 * @param item - 보고서 아이템
 * @returns 포맷된 제목 (customer가 있으면 [customer] title 형태)
 */
function formatReportTitle(item: DailyReport): string {
  return item.customer ? `[${item.customer}] ${item.title}` : item.title
}

/**
 * 진행률 텍스트를 생성한다
 * @param progressRate - 진행률 (0-100)
 * @param includeProgress - 진행률 포함 여부
 * @returns 진행률 텍스트 (포함하지 않으면 빈 문자열)
 */
function formatProgressText(progressRate: number, includeProgress: boolean = true): string {
  return includeProgress ? `, ${progressRate}%` : ''
}

/**
 * 보고서 아이템을 문자열로 포맷한다
 * @param item - 보고서 아이템
 * @param includeProgress - 진행률 포함 여부
 * @returns 포맷된 문자열 (예: "- [customer] title(person, 80%)")
 */
export function formatReportItemText(item: DailyReport, includeProgress: boolean = true): string {
  const title = formatReportTitle(item)
  const progress = formatProgressText(item.progressRate, includeProgress)
  return `- ${title}(${item.person}${progress})`
}

/**
 * 보고서 그룹의 제목을 생성한다
 * @param reportType - 보고서 타입 ('진행업무', '예정업무', '완료업무')
 * @param isWeekly - 주간 보고서 여부
 * @returns 포맷된 그룹 제목
 */
export function formatReportGroupTitle(reportType: string, isWeekly: boolean = false): string {
  if (isWeekly) {
    return reportType === '진행업무' ? '금주 진행 사항' : '차주 계획 사항'
  }

  const titleMap: Record<string, string> = {
    '진행업무': '업무 진행 사항',
    '예정업무': '업무 계획 사항',
    '완료업무': '완료된 업무',
  }

  return titleMap[reportType] || `${reportType}`
}
