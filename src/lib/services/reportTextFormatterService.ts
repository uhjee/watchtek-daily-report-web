import { formatDateToShortFormat, getWeekOfMonth, getCurrentMonthRangeByWednesday } from '../utils/dateUtils'

/**
 * 보고서 데이터를 텍스트로 변환하는 서비스
 */
export class ReportTextFormatterService {
  /**
   * 인원별 공수를 텍스트로 변환
   * @param manHourSummary - 인원별 공수 데이터
   * @returns 포맷된 공수 문자열
   */
  stringifyManHourSummary(
    manHourSummary: Array<{
      name: string
      hours: number
      isCompleted: boolean
    }>
  ): string {
    let result = '[인원별 공수]\n'

    manHourSummary.forEach((person) => {
      let line = `- ${person.name}: ${person.hours} m/h`
      if (person.isCompleted) {
        line += ' (작성 완료)'
      }
      result += line + '\n'
    })

    return result
  }

  /**
   * 진행업무/예정업무를 텍스트로 변환
   * @param tasks - 작업 데이터
   * @param type - '진행업무' | '예정업무'
   * @returns 포맷된 작업 문자열
   */
  stringifyTasks(
    tasks: Array<{
      group: string
      subGroup: string
      items: Array<{
        title: string
        person: string
        progress?: number
        manHour: number
      }>
    }>,
    type: '진행업무' | '예정업무'
  ): string {
    let result = `${type === '진행업무' ? '업무 진행 사항' : '업무 계획 사항'}\n`

    // Group별로 묶기
    const groupedByGroup = new Map<string, Array<{
      subGroup: string
      items: Array<{
        title: string
        person: string
        progress?: number
        manHour: number
      }>
    }>>()

    tasks.forEach((task) => {
      if (!groupedByGroup.has(task.group)) {
        groupedByGroup.set(task.group, [])
      }
      groupedByGroup.get(task.group)!.push({
        subGroup: task.subGroup,
        items: task.items,
      })
    })

    // Group 번호 매기기
    let groupIndex = 1
    groupedByGroup.forEach((subGroups, group) => {
      result += `${groupIndex}. ${group}\n`

      subGroups.forEach((subGroup) => {
        result += `[${subGroup.subGroup}]\n`

        subGroup.items.forEach((item) => {
          let itemText = `- ${item.title}(${item.person}`
          if (type === '진행업무' && item.progress !== undefined) {
            itemText += `, ${item.progress}%`
          }
          itemText += `)\n`
          result += itemText
        })
      })

      result += '\n'
      groupIndex++
    })

    return result
  }

  /**
   * 일일 보고서를 전체 텍스트로 변환
   * @param date - 보고서 날짜
   * @param inProgressTasks - 진행업무
   * @param plannedTasks - 예정업무
   * @returns 포맷된 보고서 전체 문자열
   */
  stringifyDailyReport(
    date: string,
    inProgressTasks: Array<{
      group: string
      subGroup: string
      items: Array<{
        title: string
        person: string
        progress?: number
        manHour: number
      }>
    }>,
    plannedTasks: Array<{
      group: string
      subGroup: string
      items: Array<{
        title: string
        person: string
        manHour: number
      }>
    }>
  ): string {
    const formattedDate = formatDateToShortFormat(date)
    const title = `큐브 파트 일일업무 보고 (${formattedDate})`

    let text = `${title}\n\n`
    text += this.stringifyTasks(inProgressTasks, '진행업무')
    text += '\n'
    text += this.stringifyTasks(plannedTasks, '예정업무')

    return text
  }

  /**
   * 주간 인원별 공수를 텍스트로 변환 (연차/반차 정보 포함)
   * @param manHourSummary - 인원별 공수 데이터 (연차/반차 정보 포함)
   * @returns 포맷된 공수 문자열
   */
  stringifyWeeklyManHourSummary(
    manHourSummary: Array<{
      name: string
      hours: number
      leaveInfo?: string
    }>
  ): string {
    let result = '[인원별 공수]\n'

    manHourSummary.forEach((person) => {
      let line = `- ${person.name}: ${person.hours} m/h`
      if (person.leaveInfo) {
        line += ` (${person.leaveInfo})`
      }
      result += line + '\n'
    })

    return result
  }

  /**
   * 그룹별 공수를 텍스트로 변환
   * @param manHourByGroup - 그룹별 공수 데이터 (공수 내림차순 정렬됨)
   * @returns 포맷된 그룹별 공수 문자열
   */
  stringifyManHourByGroup(
    manHourByGroup: Array<{
      group: string
      hours: number
    }>
  ): string {
    let result = '[그룹별 공수]\n'

    manHourByGroup.forEach((groupData) => {
      // m/d = m/h / 8 (소수점 1자리까지)
      const manDay = Math.round((groupData.hours / 8) * 10) / 10
      result += `- ${groupData.group}: ${groupData.hours} m/h, ${manDay} m/d\n`
    })

    return result
  }

  /**
   * 주간 보고서를 전체 텍스트로 변환 (진행업무만)
   * @param date - 보고서 날짜
   * @param inProgressTasks - 진행업무
   * @returns 포맷된 보고서 전체 문자열
   */
  stringifyWeeklyReport(
    date: string,
    inProgressTasks: Array<{
      group: string
      subGroup: string
      items: Array<{
        title: string
        person: string
        progress?: number
        manHour: number
      }>
    }>
  ): string {
    const weekOfMonth = getWeekOfMonth(date)
    const title = `큐브 파트 주간업무 보고 (${weekOfMonth})`

    let text = `${title}\n\n`
    text += '금주 진행 사항\n'

    inProgressTasks.forEach((task, index) => {
      text += `${index + 1}. ${task.group}\n`
      text += `[${task.subGroup}]\n`

      task.items.forEach((item) => {
        let itemText = `- ${item.title}(${item.person}`
        if (item.progress !== undefined) {
          itemText += `, ${item.progress}%`
        }
        itemText += `)\n`
        text += itemText
      })
      text += '\n'
    })

    return text
  }

  /**
   * 월간 보고서를 전체 텍스트로 변환 (진행업무/완료업무)
   * @param date - 보고서 날짜
   * @param inProgressTasks - 진행업무
   * @param completedTasks - 완료업무
   * @returns 포맷된 보고서 전체 문자열
   */
  stringifyMonthlyReport(
    date: string,
    inProgressTasks: Array<{
      group: string
      subGroup: string
      items: Array<{
        title: string
        person: string
        progress?: number
        manHour: number
      }>
    }>,
    completedTasks: Array<{
      group: string
      subGroup: string
      items: Array<{
        title: string
        person: string
        progress?: number
        manHour: number
      }>
    }>
  ): string {
    const { firstDay } = getCurrentMonthRangeByWednesday(date)
    const monthDate = new Date(firstDay)
    const month = monthDate.getMonth() + 1
    const title = `큐브 파트 월간업무 보고 (${month}월)`

    let text = `${title}\n\n`

    // 진행업무
    text += '진행업무\n'
    inProgressTasks.forEach((task, index) => {
      text += `${index + 1}. ${task.group}\n`
      text += `[${task.subGroup}]\n`

      task.items.forEach((item) => {
        let itemText = `- ${item.title}(${item.person}`
        if (item.progress !== undefined) {
          itemText += `, ${item.progress}%`
        }
        itemText += `)\n`
        text += itemText
      })
      text += '\n'
    })

    // 완료업무
    text += '\n완료업무\n'
    completedTasks.forEach((task, index) => {
      text += `${index + 1}. ${task.group}\n`
      text += `[${task.subGroup}]\n`

      task.items.forEach((item) => {
        const itemText = `- ${item.title}(${item.person})\n`
        text += itemText
      })
      text += '\n'
    })

    return text
  }
}
