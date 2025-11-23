declare module 'holiday-kr' {
  export function isHoliday(
    year: number,
    month: number,
    day: number,
    isLunar?: boolean,
    isLeapMonth?: boolean
  ): boolean
}
