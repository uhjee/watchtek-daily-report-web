import { DailyReport, LeaveInfo, LeaveType } from '@/lib/types/report'

/**
 * 근태(연차/반차) 판단 및 처리 유틸리티
 */

/**
 * 보고서가 연차/반차 항목인지 확인한다
 * - 연차: Group='기타'이고, (title에 '연차' 포함 또는 subGroup='연차')
 * - 반차: Group='기타'이고, (title에 '반차' 포함 또는 subGroup='반차')
 */
export function isLeaveReport(report: DailyReport): boolean {
  if (report.group !== '기타') return false

  const leaveType = getLeaveType(report)
  return leaveType !== null
}

/**
 * 보고서의 연차/반차 타입을 반환한다
 * @returns '연차' | '반차' | null
 */
export function getLeaveType(report: DailyReport): LeaveType | null {
  if (report.group !== '기타') return null

  const title = report.title?.toLowerCase() || ''
  const subGroup = report.subGroup || ''

  // 반차 판단: title에 '반차' 포함 또는 subGroup이 '반차'
  if (title.includes('반차') || subGroup === '반차') {
    return '반차'
  }

  // 연차 판단: title에 '연차' 포함 또는 subGroup이 '연차'
  if (title.includes('연차') || subGroup === '연차') {
    return '연차'
  }

  return null
}

/**
 * 연차/반차에 따른 공제 공수를 반환한다
 * - 연차: 8m/h
 * - 반차: 4m/h
 */
export function getLeaveDeduction(leaveType: LeaveType): number {
  return leaveType === '연차' ? 8 : 4
}

/**
 * 연차/반차 정보 배열의 총 공제 공수를 계산한다
 */
export function calculateTotalLeaveDeduction(leaveInfoList: LeaveInfo[]): number {
  return leaveInfoList.reduce((total, leave) => {
    return total + getLeaveDeduction(leave.type)
  }, 0)
}

/**
 * 날짜 문자열에서 요일(한글)을 반환한다
 */
function getDayOfWeekKorean(dateStr: string): string {
  const days = ['일', '월', '화', '수', '목', '금', '토']
  const date = new Date(dateStr)
  return days[date.getDay()]
}

/**
 * 보고서에서 연차/반차 정보를 추출한다
 * 기간으로 설정된 경우(예: 11/3 ~ 11/5 연차) 각 날짜를 개별 LeaveInfo로 분리
 */
export function extractLeaveInfo(report: DailyReport): LeaveInfo[] {
  const leaveType = getLeaveType(report)
  if (!leaveType) return []

  const result: LeaveInfo[] = []
  const startDate = report.date.start
  const endDate = report.date.end

  // 단일 날짜 또는 end가 없는 경우
  if (!endDate || startDate === endDate) {
    result.push({
      date: startDate,
      type: leaveType,
      dayOfWeek: getDayOfWeekKorean(startDate),
    })
  } else {
    // 기간으로 설정된 경우: start부터 end까지 각 날짜를 개별 아이템으로 추가
    const start = new Date(startDate)
    const end = new Date(endDate)
    const current = new Date(start)

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0]
      result.push({
        date: dateStr,
        type: leaveType,
        dayOfWeek: getDayOfWeekKorean(dateStr),
      })
      current.setDate(current.getDate() + 1)
    }
  }

  return result
}

/**
 * 보고서 배열에서 인원별 연차/반차 정보를 추출한다
 * @returns Map<담당자명, LeaveInfo[]>
 */
export function extractLeaveInfoByPerson(reports: DailyReport[]): Map<string, LeaveInfo[]> {
  const leaveInfoMap = new Map<string, LeaveInfo[]>()

  reports.forEach((report) => {
    const leaveInfoList = extractLeaveInfo(report)

    if (leaveInfoList.length > 0) {
      const person = report.person
      const existing = leaveInfoMap.get(person) || []
      leaveInfoMap.set(person, [...existing, ...leaveInfoList])
    }
  })

  // 각 멤버의 연차/반차 정보를 날짜순으로 정렬
  leaveInfoMap.forEach((leaveList, person) => {
    leaveList.sort((a, b) => a.date.localeCompare(b.date))
    leaveInfoMap.set(person, leaveList)
  })

  return leaveInfoMap
}

/**
 * 연차/반차 정보를 텍스트로 포맷한다
 * 예: "11/03(월) 연차, 11/04(화) 연차"
 */
export function formatLeaveInfoText(leaveInfoList: LeaveInfo[]): string | undefined {
  if (!leaveInfoList || leaveInfoList.length === 0) return undefined

  return leaveInfoList
    .map((leave) => {
      // MM/DD 형식으로 변환
      const formattedDate = leave.date.slice(5).replace('-', '/')
      return `${formattedDate}(${leave.dayOfWeek}) ${leave.type}`
    })
    .join(', ')
}

// 근태 아이템 타입 (UI 표시용)
export interface LeaveItem {
  person: string
  type: LeaveType
  date: string
  dayOfWeek: string // 요일 (월, 화, 수, ...)
}

/**
 * 보고서 배열에서 근태 아이템 목록을 추출한다 (UI 표시용)
 * @param reports - 전체 보고서 배열
 * @param memberFilter - 담당자 필터 (null이면 전체)
 */
export function extractLeaveItems(
  reports: DailyReport[],
  memberFilter?: string | null
): LeaveItem[] {
  const items: LeaveItem[] = []

  reports.forEach((report) => {
    // 멤버 필터
    if (memberFilter && report.person !== memberFilter) return

    const leaveInfoList = extractLeaveInfo(report)

    leaveInfoList.forEach((leaveInfo) => {
      items.push({
        person: report.person,
        type: leaveInfo.type,
        date: leaveInfo.date,
        dayOfWeek: leaveInfo.dayOfWeek,
      })
    })
  })

  // 날짜순 정렬
  return items.sort((a, b) => a.date.localeCompare(b.date))
}
