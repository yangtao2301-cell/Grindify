export type CoachCyclePattern = 'four_on_one_off' | 'five_on_one_off'
const cyclePattern = /(?:练|训练|连练)(四|五|4|5)(?:天|日)?(?:再)?(?:休息|休|歇)(?:一|1)(?:天|日)?|(四|五|4|5)练(?:一|1)休|(四|五|4|5)(?:天|日)(?:训练|练)(?:一|1)(?:天|日)(?:休息|休)/g
const cancelledCyclePattern = /(?:不要|不想|取消|不再|别|不用)(?:再)?(?:按|用)?(?:练[四五45]休一|练[四五45]天休息一天|[四五45]练[一1]休|练[45]休1)/
const weeklyPattern = /(?:每周|一周|每星期)(?:练|训练)?(?:[1-7一二三四五六七])(?:次|天|日)|(?:按周|每周|一周内)(?:选)?固定训练日/g

function lastMatchIndex(message: string, pattern: RegExp): number {
  let index = -1
  for (const match of message.matchAll(pattern)) index = match.index
  return index
}

export function confirmedCyclePattern(userMessages: string[]): CoachCyclePattern | null {
  for (let index = userMessages.length - 1; index >= 0; index--) {
    const compact = userMessages[index]!.replace(/[\s，,。．、;；:：\-—]/g, '')
    if (cancelledCyclePattern.test(compact)) return null
    const cycles = [...compact.matchAll(cyclePattern)]
    const latestCycle = cycles[cycles.length - 1]
    const cycleIndex = latestCycle?.index ?? -1
    const weeklyIndex = lastMatchIndex(compact, weeklyPattern)
    if (cycleIndex >= 0 || weeklyIndex >= 0) {
      if (cycleIndex <= weeklyIndex) return null
      const count = latestCycle![1] || latestCycle![2] || latestCycle![3]
      return count === '五' || count === '5' ? 'five_on_one_off' : 'four_on_one_off'
    }
  }
  return null
}
