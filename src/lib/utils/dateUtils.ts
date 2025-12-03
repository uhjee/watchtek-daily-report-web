/**
 * 날짜 관련 유틸리티 함수 모음
 */

import * as holiday from 'holiday-kr';

// 날짜 포맷터 상수
const KST_DATE_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * 날짜를 YYYY-MM-DD 형식으로 변환
 * @param date - 변환할 날짜 객체
 * @returns YYYY-MM-DD 형식의 문자열
 */
export function formatDateToYYYYMMDD(date: Date): string {
  const [year, month, day] = KST_DATE_FORMATTER.format(date)
    .split('.')
    .map((part) => part.trim().padStart(2, '0'));

  return `${year}-${month}-${day}`;
}

/**
 * 한국 시간(KST) 기준으로 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 * @returns YYYY-MM-DD 형식의 날짜 문자열
 */
export function getToday(): string {
  const now = new Date();
  return formatDateToYYYYMMDD(now);
  // 테스트용 고정 날짜는 주석 처리
  // return '2025-11-21';
}

/**
 * 특정 날짜의 월과 주차 정보를 반환
 * @param dateString - YYYY-MM-DD 형식의 날짜 문자열
 * @returns 'M월 N주차' 형식의 문자열
 */
export function getWeekOfMonth(dateString: string): string {
  const date = new Date(dateString);
  const month = date.getMonth() + 1; // getMonth()는 0부터 시작하므로 1을 더함

  // 해당 월의 1일
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);

  // 1일의 요일 (0: 일요일, 1: 월요일, ..., 6: 토요일)
  const firstDayWeekday = firstDayOfMonth.getDay();

  // 입력된 날짜의 일자
  const currentDate = date.getDate();

  // 주차 계산
  // (해당 일자 + 해당 월의 1일의 요일 - 1) / 7을 올림하여 주차를 구함
  const weekNumber = Math.ceil((currentDate + firstDayWeekday) / 7);

  return `${month}월 ${weekNumber}주차`;
}

/**
 * 특정 날짜가 속한 달의 첫날과 마지막 날을 YYYY-MM-DD 형식으로 반환
 * @param startDate - YYYY-MM-DD 형식의 기준 날짜
 * @returns 해당 달의 첫날과 마지막 날
 */
export function getCurrentMonthRange(startDate: string): {
  firstDay: string;
  lastDay: string;
} {
  const date = new Date(startDate);
  return getMonthRange(date);
}

/**
 * 가장 최근 지난 수요일을 기준으로 현재 월의 첫날과 마지막 날을 YYYY-MM-DD 형식으로 반환
 * 월~화: 이전 주 수요일 기준, 수~일: 이번 주 수요일 기준으로 월 판단
 * @returns 수요일 기준 현재 달의 첫날과 마지막 날
 */
export function getCurrentMonthRangeByWednesday(startDate: string): {
  firstDay: string;
  lastDay: string;
} {
  const now = new Date(startDate);
  const dayOfWeek = now.getDay(); // 0: 일요일, 1: 월요일, ..., 6: 토요일

  // 가장 최근 지난 수요일까지의 일수 계산
  // 수요일은 3, 오늘이 수요일이면 0, 수요일 이후면 (dayOfWeek - 3)
  const daysSinceLastWednesday = dayOfWeek >= 3 ? dayOfWeek - 3 : dayOfWeek + 4; // 일(0), 월(1), 화(2)는 이전 주 수요일까지의 일수

  const lastWednesday = new Date(now);
  lastWednesday.setDate(now.getDate() - daysSinceLastWednesday);

  return getMonthRange(lastWednesday);
}

/**
 * 특정 달의 첫날과 마지막 날을 YYYY-MM-DD 형식으로 반환
 * @param date - 기준 날짜
 * @returns 해당 달의 첫날과 마지막 날
 */
function getMonthRange(date: Date): {
  firstDay: string;
  lastDay: string;
} {
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  return {
    firstDay: formatDateToYYYYMMDD(firstDayOfMonth),
    lastDay: formatDateToYYYYMMDD(lastDayOfMonth),
  };
}

/**
 * 주어진 날짜가 해당 월의 마지막 주인지 확인 (강제 플래그 포함)
 * @param date - 확인할 날짜
 * @param forceFlag - true일 경우 금요일 체크를 건너뛰고 마지막 주차 여부만 확인
 * @returns 마지막 주 금요일 또는 마지막 주차 여부
 */
export function isLastFridayOfMonth(date: Date, forceFlag?: boolean): boolean {
  // forceFlag가 true인 경우 무조건 true 반환
  if (forceFlag === true) {
    return true;
  }

  // 현재 날짜가 금요일인지 확인 (금요일 = 5)
  if (date.getDay() !== 5) {
    return false;
  }

  // 이번 주 수요일 계산 (현재 날짜에서 해당 주의 수요일까지의 거리)
  const dayOfWeek = date.getDay(); // 0: 일요일, 1: 월요일, ..., 6: 토요일
  const daysToWednesday = dayOfWeek >= 3 ? dayOfWeek - 3 : dayOfWeek + 4;

  const thisWednesday = new Date(date);
  thisWednesday.setDate(date.getDate() - daysToWednesday);

  // 다음 주 수요일의 날짜 계산 (이번 주 수요일 + 7일)
  const nextWednesday = new Date(thisWednesday);
  nextWednesday.setDate(thisWednesday.getDate() + 7);

  // 이번 주 수요일과 다음 주 수요일의 월 비교
  const thisWednesdayMonth = thisWednesday.getMonth();
  const nextWednesdayMonth = nextWednesday.getMonth();

  // 이번 주 수요일과 다음 주 수요일이 다른 달에 속하는지 확인
  const result = thisWednesdayMonth !== nextWednesdayMonth;

  return result;
}

/**
 * 날짜를 YY.MM.DD 형식으로 변환 (YYYY-MM-DD → YY.MM.DD)
 * 중복 제거를 위한 공통 함수
 * @param date - YYYY-MM-DD 형식의 날짜 문자열
 * @returns YY.MM.DD 형식의 날짜 문자열
 */
export function formatDateToShortFormat(date: string): string {
  return date.slice(2).replace(/-/g, '.');
}

/**
 * 특정 날짜가 휴일(주말 또는 공휴일)인지 확인
 * @param dateString - YYYY-MM-DD 형식의 날짜 문자열
 * @returns 휴일 여부
 */
export function isHoliday(dateString: string): boolean {
  const date = new Date(dateString);

  // 주말 체크
  const isWeekend = isWeekendDay(date);

  // 공휴일 체크 (양력 기준)
  const isPublicHoliday = holiday.isHoliday(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    false, // isLunar
    false, // isLeapMonth
  );

  return isWeekend || isPublicHoliday;
}

/**
 * 주말 여부 확인
 * @param date - 확인할 날짜
 * @returns 주말 여부
 */
function isWeekendDay(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0: 일요일, 6: 토요일
}

/**
 * 평일(월~금) 중에서 주어진 날짜를 포함한 주의 마지막 평일을 반환
 * 휴일이 아닌 평일 기준으로 계산
 * @param dateString - YYYY-MM-DD 형식의 날짜 문자열
 * @returns 해당 주의 마지막 평일 (YYYY-MM-DD 형식)
 */
export function getLastWeekdayOfWeek(dateString: string): string {
  const date = new Date(dateString);
  const dayOfWeek = date.getDay(); // 0: 일, 1: 월, ..., 6: 토

  // 해당 주의 금요일 계산
  const friday = new Date(date);
  const daysToFriday = 5 - dayOfWeek; // 금요일까지 남은 일수
  friday.setDate(date.getDate() + daysToFriday);

  // 금요일부터 거슬러 올라가면서 첫 번째 평일(비휴일) 찾기
  const lastWeekday = new Date(friday);

  while (lastWeekday.getDay() >= 1 && lastWeekday.getDay() <= 5) {
    // 월~금 범위에서
    const dateStr = formatDateToYYYYMMDD(lastWeekday);
    if (!isHoliday(dateStr)) {
      return dateStr;
    }
    // 하루 전으로 이동
    lastWeekday.setDate(lastWeekday.getDate() - 1);
  }

  // 만약 해당 주에 평일이 없다면 금요일 반환 (예외 상황)
  return formatDateToYYYYMMDD(friday);
}

/**
 * 주어진 날짜가 해당 주의 마지막 평일인지 확인
 * @param dateString - YYYY-MM-DD 형식의 날짜 문자열
 * @returns 해당 주의 마지막 평일 여부
 */
export function isLastWeekdayOfWeek(dateString: string): boolean {
  const lastWeekday = getLastWeekdayOfWeek(dateString);
  return dateString === lastWeekday;
}

/**
 * 주어진 날짜가 해당 월의 마지막 주인지 확인 (수요일 기준)
 * @param dateString - YYYY-MM-DD 형식의 날짜 문자열
 * @returns 마지막 주 여부
 */
export function isLastWeekOfMonth(dateString: string): boolean {
  const date = new Date(dateString);
  const dayOfWeek = date.getDay();

  // 해당 주의 수요일 계산
  const wednesday = new Date(date);
  const daysToWednesday = dayOfWeek >= 3 ? dayOfWeek - 3 : dayOfWeek + 4;
  wednesday.setDate(date.getDate() - daysToWednesday);

  // 다음 주 수요일 계산
  const nextWednesday = new Date(wednesday);
  nextWednesday.setDate(wednesday.getDate() + 7);

  // 이번 주 수요일과 다음 주 수요일의 월 비교
  return wednesday.getMonth() !== nextWednesday.getMonth();
}

/**
 * 주어진 날짜가 해당 월의 마지막 주의 마지막 평일인지 확인
 * @param dateString - YYYY-MM-DD 형식의 날짜 문자열
 * @returns 마지막 주의 마지막 평일 여부
 */
export function isLastWeekdayOfMonth(dateString: string): boolean {
  // 1. 해당 주의 마지막 평일인지 확인
  if (!isLastWeekdayOfWeek(dateString)) {
    return false;
  }

  // 2. 해당 월의 마지막 주인지 확인
  return isLastWeekOfMonth(dateString);
}

/**
 * 이번 주 월요일부터 오늘까지의 날짜 범위를 반환
 * @param today - YYYY-MM-DD 형식의 오늘 날짜
 * @returns 이번 주 월요일과 오늘 날짜
 */
export function getThisWeekMondayToToday(today: string): {
  startDate: string;
  endDate: string;
} {
  const date = new Date(today);
  const dayOfWeek = date.getDay(); // 0: 일, 1: 월, ..., 6: 토

  // 월요일까지의 일수 계산 (일요일인 경우 지난주 월요일)
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const monday = new Date(date);
  monday.setDate(date.getDate() - daysToMonday);

  return {
    startDate: formatDateToYYYYMMDD(monday),
    endDate: today,
  };
}

/**
 * 주어진 기간 내 근무일수를 계산 (월~금 중 휴일이 아닌 날짜 수)
 * @param startDate - YYYY-MM-DD 형식의 시작 날짜
 * @param endDate - YYYY-MM-DD 형식의 종료 날짜
 * @returns 근무일수
 */
export function getWorkingDaysCount(
  startDate: string,
  endDate: string,
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);

  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    const currentDateStr = formatDateToYYYYMMDD(current);
    const dayOfWeek = current.getDay();

    // 월~금 중 휴일이 아닌 날짜만 카운트
    if (dayOfWeek >= 1 && dayOfWeek <= 5 && !isHoliday(currentDateStr)) {
      count++;
    }

    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * 날짜의 요일을 한국어로 반환
 * @param dateString - YYYY-MM-DD 형식의 날짜 문자열
 * @returns 요일 (월, 화, 수, 목, 금, 토, 일)
 */
export function getDayOfWeekKorean(dateString: string): string {
  const date = new Date(dateString);
  const dayOfWeek = date.getDay();

  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[dayOfWeek];
}

/**
 * 특정 월의 주차 목록을 반환 (수요일 기준)
 * 수요일이 속한 월을 기준으로 주차를 계산
 * @param year - 연도
 * @param month - 월 (1-12)
 * @returns 주차 정보 배열 [{ week: 1, startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD' }, ...]
 */
export function getWeeksOfMonth(
  year: number,
  month: number
): Array<{ week: number; startDate: string; endDate: string }> {
  const weeks: Array<{ week: number; startDate: string; endDate: string }> = [];

  // 해당 월의 첫날과 마지막 날
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const lastDayOfMonth = new Date(year, month, 0);

  // 첫 번째 수요일 찾기
  const firstWednesday = new Date(firstDayOfMonth);
  while (firstWednesday.getDay() !== 3) {
    // 3 = 수요일
    firstWednesday.setDate(firstWednesday.getDate() + 1);
  }

  // 첫 번째 수요일이 해당 월에 속하는지 확인
  // 만약 첫 번째 수요일이 이전 달의 마지막 주에 속한다면, 이전 주의 수요일부터 시작
  let currentWednesday = new Date(firstWednesday);

  // 이전 주의 수요일도 확인 (해당 월의 날짜가 포함될 수 있음)
  const prevWednesday = new Date(firstWednesday);
  prevWednesday.setDate(prevWednesday.getDate() - 7);

  // 이전 주 수요일이 해당 월에 속하면 그 주부터 시작
  if (prevWednesday.getMonth() + 1 === month) {
    currentWednesday = prevWednesday;
  }

  let weekNumber = 1;

  // 해당 월에 속하는 모든 주차 계산
  while (true) {
    // 주의 시작일 (수요일 기준 해당 주의 월요일)
    const monday = new Date(currentWednesday);
    monday.setDate(currentWednesday.getDate() - 2); // 수요일 - 2 = 월요일

    // 주의 종료일 (수요일 기준 해당 주의 일요일)
    const sunday = new Date(currentWednesday);
    sunday.setDate(currentWednesday.getDate() + 4); // 수요일 + 4 = 일요일

    // 수요일이 해당 월에 속하는 경우만 포함
    if (currentWednesday.getMonth() + 1 === month) {
      weeks.push({
        week: weekNumber,
        startDate: formatDateToYYYYMMDD(monday),
        endDate: formatDateToYYYYMMDD(sunday),
      });
      weekNumber++;
    }

    // 다음 주 수요일로 이동
    currentWednesday.setDate(currentWednesday.getDate() + 7);

    // 수요일이 다음 달로 넘어가면 종료
    if (currentWednesday.getMonth() + 1 !== month) {
      break;
    }
  }

  return weeks;
}

/**
 * 특정 날짜가 속한 주차를 반환 (수요일 기준)
 * @param dateString - YYYY-MM-DD 형식의 날짜 문자열
 * @returns 주차 번호 (1, 2, 3, ...)
 */
export function getWeekNumberByWednesday(dateString: string): number {
  const date = new Date(dateString);
  const dayOfWeek = date.getDay();

  // 해당 날짜가 속한 주의 수요일 찾기
  const wednesday = new Date(date);
  if (dayOfWeek < 3) {
    // 일(0), 월(1), 화(2) -> 이전 주 수요일
    wednesday.setDate(date.getDate() - (dayOfWeek + 4));
  } else {
    // 수(3), 목(4), 금(5), 토(6) -> 이번 주 수요일
    wednesday.setDate(date.getDate() - (dayOfWeek - 3));
  }

  // 수요일이 속한 월의 주차 목록 가져오기
  const year = wednesday.getFullYear();
  const month = wednesday.getMonth() + 1;
  const weeks = getWeeksOfMonth(year, month);

  // 해당 수요일이 몇 번째 주인지 찾기
  const wednesdayStr = formatDateToYYYYMMDD(wednesday);
  for (const weekInfo of weeks) {
    if (wednesdayStr >= weekInfo.startDate && wednesdayStr <= weekInfo.endDate) {
      return weekInfo.week;
    }
  }

  return 1; // 기본값
}
