/**
 * 创建智能会话时间格式化函数
 * - 今天 → HH:mm
 * - 昨天 → 昨天
 * - 本周（7天内）→ 周X
 * - 今年 → MM/DD
 * - 往年 → YYYY/MM/DD
 */
export function createConversationTimeFormatter(
  t: (key: string) => string
): (timestamp: number) => string {
  const weekDays = [
    t('time.sunday'),
    t('time.monday'),
    t('time.tuesday'),
    t('time.wednesday'),
    t('time.thursday'),
    t('time.friday'),
    t('time.saturday'),
  ]

  return (timestamp: number): string => {
    if (!timestamp) return ''

    const date = new Date(timestamp)
    const now = new Date()

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterdayStart = new Date(todayStart.getTime() - 86400000)
    const weekStart = new Date(todayStart.getTime() - 6 * 86400000)
    const yearStart = new Date(now.getFullYear(), 0, 1)

    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const year = date.getFullYear()

    if (date.getTime() >= todayStart.getTime()) {
      return `${hours}:${minutes}`
    }

    if (date.getTime() >= yesterdayStart.getTime()) {
      return t('time.yesterday')
    }

    if (date.getTime() >= weekStart.getTime()) {
      return weekDays[date.getDay()]
    }

    if (date.getTime() >= yearStart.getTime()) {
      return `${month}/${day}`
    }

    return `${year}/${month}/${day}`
  }
}
