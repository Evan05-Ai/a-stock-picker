/**
 * A股交易时间工具
 * 交易时间：工作日 9:15-11:30, 13:00-15:00（北京时间）
 */

/** 判断指定日期是否为A股交易日（仅判断星期，不判断节假日） */
export function isTradingDay(date: Date = new Date()): boolean {
  const day = date.getDay()
  // 0=周日, 6=周六
  return day !== 0 && day !== 6
}

/** 判断指定时间是否在A股交易时段内 */
export function isTradingTime(date: Date = new Date()): boolean {
  if (!isTradingDay(date)) return false

  const hours = date.getHours()
  const minutes = date.getMinutes()
  const time = hours * 60 + minutes // 转为分钟数，便于比较

  // 上午 9:15 - 11:30
  const morningStart = 9 * 60 + 15  // 555
  const morningEnd = 11 * 60 + 30   // 690

  // 下午 13:00 - 15:00
  const afternoonStart = 13 * 60    // 780
  const afternoonEnd = 15 * 60      // 900

  return (time >= morningStart && time <= morningEnd) ||
         (time >= afternoonStart && time <= afternoonEnd)
}

/** 计算距离下一个交易时段开始的毫秒数 */
export function msUntilNextTradingTime(date: Date = new Date()): number {
  if (isTradingTime(date)) return 0

  const hours = date.getHours()
  const minutes = date.getMinutes()
  const time = hours * 60 + minutes

  const morningStart = 9 * 60 + 15   // 555
  const afternoonStart = 13 * 60     // 780

  if (!isTradingDay(date)) {
    // 周末或节假日：等到下一个工作日 9:15
    const nextDay = new Date(date)
    nextDay.setDate(nextDay.getDate() + 1)
    while (!isTradingDay(nextDay)) {
      nextDay.setDate(nextDay.getDate() + 1)
    }
    nextDay.setHours(9, 15, 0, 0)
    return nextDay.getTime() - date.getTime()
  }

  // 工作日但不在交易时段
  if (time < morningStart) {
    // 9:15 之前：等到 9:15
    const target = new Date(date)
    target.setHours(9, 15, 0, 0)
    return target.getTime() - date.getTime()
  }

  if (time < afternoonStart) {
    // 11:30-13:00 午休：等到 13:00
    const target = new Date(date)
    target.setHours(13, 0, 0, 0)
    return target.getTime() - date.getTime()
  }

  // 15:00 之后：等到下一个工作日 9:15
  const nextDay = new Date(date)
  nextDay.setDate(nextDay.getDate() + 1)
  while (!isTradingDay(nextDay)) {
    nextDay.setDate(nextDay.getDate() + 1)
  }
  nextDay.setHours(9, 15, 0, 0)
  return nextDay.getTime() - date.getTime()
}
