/**
 * 보고서 관련 타입 정의
 */

// 보고서 타입 리터럴
export type ReportType = 'daily' | 'weekly' | 'monthly';

// 보고서 그룹 타입 리터럴
export type ReportGroupType = '진행업무' | '예정업무' | '완료업무';

// 날짜 범위 인터페이스
export interface DateRange {
  start: string;
  end: string | null;
}

// 멤버 정보 인터페이스
export interface MemberInfo {
  name: string;
  priority: number;
}

// 멤버 맵 타입
export type MemberMap = Record<string, MemberInfo>;

// 진행률 타입 (0-100)
export type ProgressRate = number;

// 공수 타입
export type ManHour = number;

// 정렬 방향 타입
export type SortDirection = 'asc' | 'desc';

// 보고서 타입 판단 결과
export interface ReportTypeDetermination {
  isHoliday: boolean;
  shouldGenerateDaily: boolean;
  shouldGenerateWeekly: boolean;
  shouldGenerateMonthly: boolean;
}
