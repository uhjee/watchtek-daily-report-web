import * as XLSX from 'xlsx'
import { DailyReport } from '@/lib/types/report'

interface MemberTasks {
  name: string
  tasks: DailyReport[]
}

/**
 * 월별 업무 목록을 엑셀 파일로 다운로드
 * @param year 연도
 * @param month 월
 * @param memberTasksMap 인원별 업무 목록 맵
 */
export function downloadMonthlyTasksExcel(
  year: number,
  month: number,
  memberTasksMap: MemberTasks[]
) {
  const workbook = XLSX.utils.book_new()

  // 컬럼 정의 (# 제외)
  const columns = [
    { header: '업무구분', key: 'group', width: 15 },
    { header: 'PMS 관리번호', key: 'pmsNumber', width: 15 },
    { header: '업무 내용', key: 'title', width: 50 },
    { header: '계획 완료일', key: 'plannedDate', width: 12 },
    { header: '완료일', key: 'completionDate', width: 12 },
    { header: 'M/H', key: 'manHour', width: 8 },
    { header: 'M/D', key: 'manDay', width: 8 },
  ]

  // 각 멤버별로 시트 생성
  memberTasksMap.forEach(({ name, tasks }) => {
    // 헤더 행
    const headerRow = columns.map((col) => col.header)

    // 데이터 행들
    const dataRows = tasks.map((task) => {
      const completionDate = task.date.end || task.date.start
      const manDay = (task.manHour / 8).toFixed(1)
      const pmsNumberText = task.pmsNumber ? `#${task.pmsNumber}` : '-'

      return [
        task.group,
        pmsNumberText,
        task.title,
        '-', // 계획 완료일 (현재 데이터 없음)
        completionDate,
        task.manHour,
        parseFloat(manDay),
      ]
    })

    // 시트 데이터 생성
    const sheetData = [headerRow, ...dataRows]
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData)

    // 컬럼 너비 설정
    worksheet['!cols'] = columns.map((col) => ({ wch: col.width }))

    // PMS 관리번호 컬럼에 하이퍼링크 추가
    tasks.forEach((task, index) => {
      if (task.pmsNumber && task.pmsLink) {
        const cellAddress = XLSX.utils.encode_cell({ r: index + 1, c: 1 }) // B열 (0-indexed로 1)
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].l = { Target: task.pmsLink, Tooltip: `PMS #${task.pmsNumber}` }
        }
      }
    })

    // 시트를 워크북에 추가 (시트명: 담당자명)
    XLSX.utils.book_append_sheet(workbook, worksheet, name)
  })

  // 파일명 생성: YYYYMM_큐브파트_업무목록.xlsx
  const monthStr = month.toString().padStart(2, '0')
  const fileName = `${year}${monthStr}_큐브파트_업무목록.xlsx`

  // 파일 다운로드
  XLSX.writeFile(workbook, fileName)
}
