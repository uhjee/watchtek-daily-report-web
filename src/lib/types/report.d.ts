// 일일 보고서 아이템 인터페이스
export interface DailyReportItem {
  id: string;
  title: string;
  customer?: string;
  group: string;
  subGroup: string;
  person: string;
  progressRate: number;
  date: {
    start: string;
    end: string | null;
  };
  isToday: boolean;
  isTomorrow: boolean;
  pmsNumber?: number;
  pmsLink?: string;
}

// 일일 보고서 인터페이스 (공수 정보 포함)
export interface DailyReport extends DailyReportItem {
  manHour: number;
}

// 서브그룹별로 그룹화된 보고서 아이템
export interface GroupedReportItem {
  subGroup: string;
  items: DailyReport[];
}

// 그룹별로 포맷된 일일 보고서
export interface FormattedDailyReport {
  group: string;
  subGroups: GroupedReportItem[];
}

// Notion API 응답 타입 (필요한 부분만 정의)
export interface NotionResponse {
  results: NotionPage[];
}

// Notion 페이지 타입
export interface NotionPage {
  properties: {
    Name: {
      title: [
        {
          plain_text: string;
        },
      ];
    };
    Customer: {
      select: {
        name: string;
      };
    };
    Group: {
      select: {
        name: string;
      };
    };
    SubGroup: {
      select: {
        name: string;
      };
    };
    Person: {
      people: [
        {
          person: {
            email: string;
          };
        },
      ];
    };
    Progress: {
      number: number;
    };
    Date: {
      date: {
        start: string;
        end: string | null;
      };
    };
    ManHour: {
      number: number;
    };
    PmsNumber?: {
      number: number;
    };
    PmsLink?: {
      formula: {
        string: string;
      };
    };
  };
}

import { ReportGroupType, ReportType } from './reportTypes';

// 일일 보고서 그룹 (진행업무/예정업무)
export interface DailyReportGroup {
  type: ReportGroupType;
  groups: FormattedDailyReport[];
}

// 보고서 형식 (제목과 내용)
export interface ReportForm {
  title: string;
  text: string;
}



// 일일 보고서 데이터
export interface ReportDailyData extends ReportForm {
  reportType: Extract<ReportType, 'daily'>;
  manHourText: string;
  manHourByGroupText?: string;
  manHourByPerson?: ManHourByPersonWithReports[];
}

// 주간 보고서 데이터
export interface ReportWeeklyData extends Omit<ReportDailyData, 'text'> {
  reportType: Extract<ReportType, 'weekly'>;
  manHourByGroupText: string;
  groupedReports: DailyReportGroup[];
}

// 월간 보고서 데이터
export interface ReportMonthlyData extends ReportWeeklyData {
  reportType: Extract<ReportType, 'monthly'>;
  isMonthlyReport: boolean;
  manHourByPerson?: ManHourByPersonWithReports[];
}

// 전체 보고서 데이터
export interface ReportData {
  dailyData?: ReportDailyData;
  weeklyData?: ReportWeeklyData;
  monthlyData?: ReportMonthlyData;
}

// Notion 페이지 생성에 사용되는 보고서 데이터 타입
export type ReportDataForCreatePage =
  | ReportDailyData
  | ReportWeeklyData
  | ReportMonthlyData;

// 인원별 공수 정보
export interface ManHourByPerson {
  [key: string]: number;
}

// 연차/반차 타입
export type LeaveType = '연차' | '반차';

// 연차/반차 정보
export interface LeaveInfo {
  date: string; // YYYY-MM-DD 형식
  type: LeaveType;
  dayOfWeek: string; // 요일 (월, 화, 수, ...)
}

// 인원별 공수 및 보고서 정보
export interface ManHourByPersonWithReports {
  name: string;
  totalManHour: number;
  reports: DailyReport[];
  leaveInfo?: LeaveInfo[]; // 연차/반차 정보
  isCompleted?: boolean; // 작성 완료 여부 (일간 보고서용)
}
