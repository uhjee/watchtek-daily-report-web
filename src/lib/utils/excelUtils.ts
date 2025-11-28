import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
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
export async function downloadMonthlyTasksExcel(
  year: number,
  month: number,
  memberTasksMap: MemberTasks[]
) {
  const workbook = new ExcelJS.Workbook()

  // 컬럼 정의
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
    const worksheet = workbook.addWorksheet(name)

    // 컬럼 설정
    worksheet.columns = columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width,
    }))

    // 헤더 스타일 설정
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true }
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' }

    // 데이터 행 추가
    tasks.forEach((task) => {
      const completionDate = task.date.end || task.date.start
      const manDay = parseFloat((task.manHour / 8).toFixed(1))
      const pmsNumberText = task.pmsNumber ? `#${task.pmsNumber}` : '-'

      const row = worksheet.addRow({
        group: task.group,
        pmsNumber: pmsNumberText,
        title: task.title,
        plannedDate: '-',
        completionDate: completionDate,
        manHour: task.manHour,
        manDay: manDay,
      })

      // PMS 관리번호에 하이퍼링크 설정
      if (task.pmsNumber && task.pmsLink) {
        const pmsCell = row.getCell('pmsNumber')
        pmsCell.value = {
          text: pmsNumberText,
          hyperlink: task.pmsLink,
          tooltip: `PMS #${task.pmsNumber}`,
        }
        pmsCell.font = { color: { argb: '0563C1' }, underline: true }
      }
    })
  })

  // 파일명 생성: YYYYMM_큐브파트_업무목록.xlsx
  const monthStr = month.toString().padStart(2, '0')
  const fileName = `${year}${monthStr}_큐브파트_업무목록.xlsx`

  // 파일 다운로드
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  saveAs(blob, fileName)
}
