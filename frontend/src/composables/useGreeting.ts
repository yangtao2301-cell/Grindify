/*
 * Copyright (c) 2026 FalkenDev
 *
 * This file is part of Grindify.
 *
 * Grindify is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of
 * the License, or (at your option) any later version.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with Grindify. If not, see
 * <https://www.gnu.org/licenses/>.
 */

import { computed, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { StreakInfo } from '@/interfaces/User.interface'

/**
 * 从候选池中选择一个确定性的随机元素，同一日保持稳定。
 */
function pickFromPool(pool: unknown[], dayOfYear: number): string {
  if (!Array.isArray(pool) || pool.length === 0) return ''
  return String(pool[dayOfYear % pool.length])
}

/**
 * 按以下优先级返回响应式问候语：
 *  1. 连续打卡里程碑（7、14、30、100+）——里程碑达成后显示 3 天
 *  2. 完成本周目标/距离目标还差一次会话
 *  3. 星期几（周一、周五、周末）
 *  4. 时间段（早上、下午、傍晚、夜间）
 *
 * 每个候选池中的随机选择以一年中的第几天作为种子，
 * 因此同一天内消息保持一致。
 */
export function useGreeting(streakInfo: Ref<StreakInfo | null>) {
  const { t, tm } = useI18n({ useScope: 'global' })

  /** 安全地将 tm() 键解析为字符串数组（与 ProgressBar 的模式一致）。 */
  function getPool(key: string): string[] {
    const v = tm(key)
    return Array.isArray(v) ? (v as string[]) : []
  }

  const greeting = computed(() => {
    const info = streakInfo.value
    const now = new Date()
    const hour = now.getHours()
    const day = now.getDay() // 0 = 周日

    // 基于一年中的第几天生成稳定种子
    const startOfYear = new Date(now.getFullYear(), 0, 0)
    const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24))

    // ── 优先级 1：连续打卡里程碑（里程碑达成后显示 3 天） ──
    if (info) {
      const s = info.currentStreak
      if (s >= 100) return t('greetings.streak100', { streak: s })
      if (s >= 30 && s <= 32) return t('greetings.streak30', { streak: s })
      if (s >= 14 && s <= 16) return t('greetings.streak14', { streak: s })
      if (s >= 7 && s <= 9) return t('greetings.streak7', { streak: s })
    }

    // ── 优先级 2：每周目标状态 ──
    if (info && info.weeklyWorkoutGoal > 0) {
      if (info.currentWeekWorkouts >= info.weeklyWorkoutGoal) {
        return t('greetings.goalHit')
      }
      if (info.currentWeekWorkouts === info.weeklyWorkoutGoal - 1) {
        return t('greetings.goalClose')
      }
    }

    // ── 优先级 3：特定日期的问候语 ──
    if (day === 1) {
      const pool = getPool('greetings.monday')
      if (pool.length) return pickFromPool(pool, dayOfYear)
    }
    if (day === 5) {
      const pool = getPool('greetings.friday')
      if (pool.length) return pickFromPool(pool, dayOfYear)
    }
    if (day === 0 || day === 6) {
      const pool = getPool('greetings.weekend')
      if (pool.length) return pickFromPool(pool, dayOfYear)
    }

    // ── 优先级 4：特定时间段的问候语 ──
    let timeKey: string
    if (hour >= 5 && hour < 12) timeKey = 'morning'
    else if (hour >= 12 && hour < 17) timeKey = 'afternoon'
    else if (hour >= 17 && hour < 21) timeKey = 'evening'
    else timeKey = 'night'

    const pool = getPool(`greetings.${timeKey}`)
    if (pool.length) return pickFromPool(pool, dayOfYear)

    // ── 回退问候语 ──
    return t('home.ready')
  })

  return { greeting }
}
