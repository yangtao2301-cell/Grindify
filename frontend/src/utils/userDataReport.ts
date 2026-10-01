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

import type { ExportRecord, UserDataExport } from '@/interfaces/UserDataExport.interface'
import { resolveRequestUrl } from '@/utils/fetchWrapper'

type ReportMode = 'summary' | 'complete'
type ReportLocale = 'en' | 'zh-CN' | 'sv'
type CanvasImage = HTMLImageElement | null

const WIDTH = 1120
const PAD = 64
const CONTENT_WIDTH = WIDTH - PAD * 2
const GREEN = '#B7F34A'
const INK = '#17211D'
const MUTED = '#66716C'
const PAPER = '#F2F4EF'
const CARD = '#FFFFFF'
const BORDER = '#E1E6DE'

const copy = {
  en: {
    summaryTitle: 'Training report',
    fullTitle: 'Complete training record',
    generated: 'EXPORTED',
    period: 'All time',
    overview: 'At a glance',
    sessions: 'Completed sessions',
    activeDays: 'Active days',
    totalTrainingTime: 'Total training time',
    personalRecords: 'Personal records',
    monthlyActivity: 'Training rhythm',
    lastSixMonths: 'Completed sessions · last 6 months',
    weightProgress: 'Weight progress',
    recentHighlights: 'Recent sessions',
    mostTrained: 'Most trained movements',
    recordHighlights: 'Recent personal records',
    profile: 'Profile & goals',
    exercises: 'Exercise library',
    exerciseCompound: 'Compound',
    exerciseIsolation: 'Isolation',
    exerciseBodyweight: 'Bodyweight',
    workouts: 'Workout plans',
    workoutStrength: 'Strength',
    workoutCardio: 'Cardio',
    workoutHiit: 'HIIT',
    workoutFlexibility: 'Flexibility',
    workoutEndurance: 'Endurance',
    workoutSessions: 'Workout sessions',
    activityLogs: 'Activity records',
    weightLogs: 'Weight records',
    progressPhotos: 'Progress photos',
    exerciseRecords: 'Personal records',
    email: 'Email',
    birthday: 'Date of birth',
    gender: 'Gender',
    genderMale: 'Male',
    genderFemale: 'Female',
    genderOther: 'Other',
    genderPreferNot: 'Prefer not to say',
    currentWeight: 'Current weight',
    height: 'Height',
    goal: 'Primary goal',
    goalBuildMuscle: 'Build muscle',
    goalLoseWeight: 'Lose weight',
    goalGainWeight: 'Gain weight',
    goalImproveEndurance: 'Improve endurance',
    goalGeneralFitness: 'General fitness',
    goalIncreaseStrength: 'Increase strength',
    goalNoSpecific: 'No specific goal',
    weeklyGoal: 'Weekly workout goal',
    currentStreak: 'Current streak',
    joined: 'Member since',
    minutes: 'min',
    hours: 'h',
    activeDaysUnit: 'days',
    records: 'records',
    movements: 'movements',
    plannedTime: 'Planned time',
    type: 'Type',
    equipment: 'Equipment',
    muscles: 'Muscle groups',
    description: 'Description',
    instructions: 'Instructions',
    sets: 'sets',
    reps: 'reps',
    weight: 'Weight',
    status: 'Status',
    duration: 'Duration',
    totalWeight: 'Total volume',
    calories: 'Calories',
    notes: 'Notes',
    distance: 'Distance',
    pace: 'Pace',
    elevation: 'Elevation gain',
    pose: 'Pose',
    front: 'Front',
    side: 'Side',
    back: 'Back',
    achieved: 'Achieved',
    recordMaxWeight: 'Max weight',
    recordMaxVolumeSet: 'Max volume set',
    recordMaxVolumeSession: 'Max session volume',
    recordMaxReps: 'Max reps',
    recordEstimatedOneRepMax: 'Estimated 1RM',
    noData: 'No records yet',
    finished: 'Completed',
    inProgress: 'In progress',
    abandoned: 'Abandoned',
    footer: 'Your training journey, in one place.',
  },
  'zh-CN': {
    summaryTitle: '训练报告',
    fullTitle: '完整训练档案',
    generated: '导出时间',
    period: '全部时间',
    overview: '训练概览',
    sessions: '完成训练',
    activeDays: '活跃天数',
    totalTrainingTime: '累计训练时长',
    personalRecords: '个人纪录',
    monthlyActivity: '训练节奏',
    lastSixMonths: '近 6 个月完成的训练',
    weightProgress: '体重变化',
    recentHighlights: '近期训练',
    mostTrained: '常练动作',
    recordHighlights: '近期个人纪录',
    profile: '个人资料与目标',
    exercises: '动作库',
    exerciseCompound: '复合动作',
    exerciseIsolation: '孤立动作',
    exerciseBodyweight: '自重动作',
    workouts: '训练计划',
    workoutStrength: '力量训练',
    workoutCardio: '有氧训练',
    workoutHiit: '高强度间歇',
    workoutFlexibility: '柔韧训练',
    workoutEndurance: '耐力训练',
    workoutSessions: '训练记录',
    activityLogs: '活动记录',
    weightLogs: '体重记录',
    progressPhotos: '进步照片',
    exerciseRecords: '个人纪录',
    email: '邮箱',
    birthday: '出生日期',
    gender: '性别',
    genderMale: '男',
    genderFemale: '女',
    genderOther: '其他',
    genderPreferNot: '不愿透露',
    currentWeight: '当前体重',
    height: '身高',
    goal: '主要目标',
    goalBuildMuscle: '增肌',
    goalLoseWeight: '减重',
    goalGainWeight: '增重',
    goalImproveEndurance: '提升耐力',
    goalGeneralFitness: '保持健康',
    goalIncreaseStrength: '提升力量',
    goalNoSpecific: '暂无特定目标',
    weeklyGoal: '每周训练目标',
    currentStreak: '当前连续训练',
    joined: '加入时间',
    minutes: '分钟',
    hours: '小时',
    activeDaysUnit: '天',
    records: '条纪录',
    movements: '个动作',
    plannedTime: '计划时长',
    type: '类型',
    equipment: '器械',
    muscles: '肌群',
    description: '说明',
    instructions: '动作要领',
    sets: '组',
    reps: '次',
    weight: '重量',
    status: '状态',
    duration: '时长',
    totalWeight: '总训练量',
    calories: '卡路里',
    notes: '备注',
    distance: '距离',
    pace: '配速',
    elevation: '爬升',
    pose: '姿势',
    front: '正面',
    side: '侧面',
    back: '背面',
    achieved: '达成时间',
    recordMaxWeight: '最大重量',
    recordMaxVolumeSet: '单组最大训练量',
    recordMaxVolumeSession: '单次最大训练量',
    recordMaxReps: '最多次数',
    recordEstimatedOneRepMax: '估算 1RM',
    noData: '暂无记录',
    finished: '已完成',
    inProgress: '进行中',
    abandoned: '已放弃',
    footer: '记录每一次努力，见证持续进步。',
  },
  sv: {
    summaryTitle: 'Träningsrapport',
    fullTitle: 'Fullständig träningshistorik',
    generated: 'EXPORTERAD',
    period: 'Hela perioden',
    overview: 'Översikt',
    sessions: 'Genomförda pass',
    activeDays: 'Aktiva dagar',
    totalTrainingTime: 'Total träningstid',
    personalRecords: 'Personliga rekord',
    monthlyActivity: 'Träningsrytm',
    lastSixMonths: 'Genomförda pass · senaste 6 månaderna',
    weightProgress: 'Viktutveckling',
    recentHighlights: 'Senaste pass',
    mostTrained: 'Mest tränade övningar',
    recordHighlights: 'Senaste personliga rekord',
    profile: 'Profil och mål',
    exercises: 'Övningsbibliotek',
    exerciseCompound: 'Sammansatt',
    exerciseIsolation: 'Isolerande',
    exerciseBodyweight: 'Kroppsvikt',
    workouts: 'Träningsprogram',
    workoutStrength: 'Styrka',
    workoutCardio: 'Kondition',
    workoutHiit: 'HIIT',
    workoutFlexibility: 'Rörlighet',
    workoutEndurance: 'Uthållighet',
    workoutSessions: 'Träningspass',
    activityLogs: 'Aktivitetsloggar',
    weightLogs: 'Viktloggar',
    progressPhotos: 'Framstegsbilder',
    exerciseRecords: 'Personliga rekord',
    email: 'E-post',
    birthday: 'Födelsedatum',
    gender: 'Kön',
    genderMale: 'Man',
    genderFemale: 'Kvinna',
    genderOther: 'Annat',
    genderPreferNot: 'Vill inte ange',
    currentWeight: 'Nuvarande vikt',
    height: 'Längd',
    goal: 'Huvudmål',
    goalBuildMuscle: 'Bygga muskler',
    goalLoseWeight: 'Gå ner i vikt',
    goalGainWeight: 'Gå upp i vikt',
    goalImproveEndurance: 'Förbättra uthållighet',
    goalGeneralFitness: 'Allmän hälsa',
    goalIncreaseStrength: 'Öka styrka',
    goalNoSpecific: 'Inget särskilt mål',
    weeklyGoal: 'Träningsmål per vecka',
    currentStreak: 'Nuvarande svit',
    joined: 'Medlem sedan',
    minutes: 'min',
    hours: 'tim',
    activeDaysUnit: 'dagar',
    records: 'rekord',
    movements: 'övningar',
    plannedTime: 'Planerad tid',
    type: 'Typ',
    equipment: 'Utrustning',
    muscles: 'Muskelgrupper',
    description: 'Beskrivning',
    instructions: 'Instruktioner',
    sets: 'set',
    reps: 'reps',
    weight: 'Vikt',
    status: 'Status',
    duration: 'Längd',
    totalWeight: 'Total volym',
    calories: 'Kalorier',
    notes: 'Anteckningar',
    distance: 'Distans',
    pace: 'Tempo',
    elevation: 'Höjdmeter',
    pose: 'Pose',
    front: 'Framifrån',
    side: 'Från sidan',
    back: 'Bakifrån',
    achieved: 'Uppnått',
    recordMaxWeight: 'Maxvikt',
    recordMaxVolumeSet: 'Maxvolym, set',
    recordMaxVolumeSession: 'Maxvolym, pass',
    recordMaxReps: 'Flest repetitioner',
    recordEstimatedOneRepMax: 'Beräknad 1RM',
    noData: 'Inga poster ännu',
    finished: 'Genomfört',
    inProgress: 'Pågår',
    abandoned: 'Avbrutet',
    footer: 'Din träningsresa, samlad på ett ställe.',
  },
} as const

type Labels = (typeof copy)[ReportLocale]

const profileChoiceKeys: Record<string, keyof Labels> = {
  male: 'genderMale',
  female: 'genderFemale',
  other: 'genderOther',
  prefer_not_to_say: 'genderPreferNot',
  build_muscle: 'goalBuildMuscle',
  lose_weight: 'goalLoseWeight',
  gain_weight: 'goalGainWeight',
  improve_endurance: 'goalImproveEndurance',
  general_fitness: 'goalGeneralFitness',
  increase_strength: 'goalIncreaseStrength',
  no_specific_goal: 'goalNoSpecific',
  compound: 'exerciseCompound',
  isolation: 'exerciseIsolation',
  bodyweight: 'exerciseBodyweight',
  strength: 'workoutStrength',
  cardio: 'workoutCardio',
  hiit: 'workoutHiit',
  flexibility: 'workoutFlexibility',
  endurance: 'workoutEndurance',
  max_weight: 'recordMaxWeight',
  max_volume_set: 'recordMaxVolumeSet',
  max_volume_session: 'recordMaxVolumeSession',
  max_reps: 'recordMaxReps',
  estimated_1rm: 'recordEstimatedOneRepMax',
}

const objectOf = (value: unknown): ExportRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as ExportRecord)
    : {}

const arrayOf = (value: unknown): ExportRecord[] =>
  Array.isArray(value) ? value.map(objectOf) : []

const textOf = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return ''
}

const profileChoice = (value: unknown, labels: Labels) => {
  const text = textOf(value)
  const labelKey = profileChoiceKeys[text]
  if (labelKey) return labels[labelKey]
  return text.replace(/_/g, ' ')
}

const numberOf = (value: unknown): number => {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : 0
}

const localize = (value: unknown, locale: ReportLocale): string => {
  if (typeof value === 'string') return value
  const entry = objectOf(value)
  const languageKey = locale === 'zh-CN' ? 'zho' : locale === 'sv' ? 'swe' : 'eng'
  return textOf(entry[languageKey]) || textOf(entry.default) || textOf(Object.values(entry)[0])
}

const dateValue = (value: unknown): Date | null => {
  if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) return null
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    const localDate = new Date(year, month - 1, day)
    return Number.isNaN(localDate.getTime()) ? null : localDate
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const formatDate = (value: unknown, locale: ReportLocale, style: 'short' | 'long' = 'long') => {
  const date = dateValue(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: style === 'short' ? 'short' : 'long',
    day: style === 'short' ? undefined : 'numeric',
  }).format(date)
}

const getExerciseName = (record: ExportRecord, locale: ReportLocale) =>
  localize(record.title, locale) || textOf(record.name) || textOf(record.id) || '—'

const getWorkoutName = (record: ExportRecord) => textOf(record.title) || textOf(record.name) || '—'

const getActivityName = (record: ExportRecord, locale: ReportLocale) =>
  localize(objectOf(record.activity).title, locale) || textOf(objectOf(record.activity).name) || '—'

const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: string,
  border?: string,
) => {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
  if (border) {
    ctx.strokeStyle = border
    ctx.lineWidth = 1
    ctx.stroke()
  }
}

const setFont = (ctx: CanvasRenderingContext2D, size: number, weight = 400) => {
  ctx.font = `${weight} ${size}px Arial, "Noto Sans CJK SC", sans-serif`
}

const wrappedText = (
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  color: string,
  weight = 400,
  lineHeight = size * 1.5,
) => {
  const text = value.trim() || '—'
  setFont(ctx, size, weight)
  ctx.fillStyle = color
  const lines: string[] = []
  let line = ''
  for (const char of Array.from(text)) {
    const candidate = line + char
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line.trimEnd())
      line = char.trimStart()
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line.trimEnd())
  lines.forEach((item, index) => ctx.fillText(item, x, y + size + index * lineHeight))
  return Math.max(1, lines.length) * lineHeight
}

const textLine = (
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  color: string,
  weight = 400,
) => {
  setFont(ctx, size, weight)
  ctx.fillStyle = color
  ctx.fillText(value, x, y + size)
  return size
}

const sectionTitle = (ctx: CanvasRenderingContext2D, title: string, y: number) => {
  roundRect(ctx, PAD, y + 6, 7, 28, 4, GREEN)
  textLine(ctx, title, PAD + 22, y, 23, INK, 750)
  ctx.strokeStyle = '#DDE3DA'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PAD + 22, y + 45)
  ctx.lineTo(WIDTH - PAD, y + 45)
  ctx.stroke()
  return y + 62
}

const dateKey = (value: unknown) => {
  const date = dateValue(value)
  return date ? `${date.getFullYear()}-${date.getMonth()}` : ''
}

const sessionDuration = (session: ExportRecord) => {
  const direct = numberOf(session.durationMinutes)
  if (direct > 0) return direct
  const started = dateValue(session.startedAt)
  const ended = dateValue(session.endedAt)
  if (!started || !ended || ended < started) return 0
  return Math.round((ended.getTime() - started.getTime()) / 60_000)
}

const finishedSessions = (data: UserDataExport) =>
  data.workoutSessions.filter((session) => textOf(session.status) === 'finished')

const sessionExerciseRows = (session: ExportRecord) => arrayOf(session.exercises)

const sessionSetRows = (exercise: ExportRecord) => arrayOf(exercise.sets)

const weightUnit = (data: UserDataExport) =>
  textOf(objectOf(data.profile).unitScale) === 'imperial' ? 'lbs' : 'kg'

const heightUnit = (data: UserDataExport) =>
  textOf(objectOf(data.profile).unitScale) === 'imperial' ? 'in' : 'cm'

const allActiveDates = (data: UserDataExport) => {
  const dates = new Set<string>()
  data.workoutSessions.forEach((session) => {
    const date = dateValue(session.startedAt)
    if (date) dates.add(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`)
  })
  data.activityLogs.forEach((activity) => {
    const date = dateValue(activity.date)
    if (date) dates.add(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`)
  })
  return dates.size
}

const monthlySessionCounts = (sessions: ExportRecord[], locale: ReportLocale) => {
  const now = new Date()
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1)
    const key = `${date.getFullYear()}-${date.getMonth()}`
    return {
      key,
      label: new Intl.DateTimeFormat(locale, { month: 'short' }).format(date),
      count: 0,
    }
  })
  const byKey = new Map(months.map((month) => [month.key, month]))
  sessions.forEach((session) => {
    const item = byKey.get(dateKey(session.startedAt))
    if (item) item.count += 1
  })
  return months
}

const drawHeader = (
  ctx: CanvasRenderingContext2D,
  height: number,
  title: string,
  data: UserDataExport,
  locale: ReportLocale,
  labels: Labels,
) => {
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, WIDTH, height)
  ctx.fillStyle = INK
  ctx.fillRect(0, 0, WIDTH, 292)
  ctx.fillStyle = GREEN
  ctx.fillRect(0, 0, 15, 292)
  ctx.beginPath()
  ctx.arc(WIDTH - 58, 32, 150, 0, Math.PI * 2)
  ctx.fillStyle = '#26332B'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(WIDTH - 52, 34, 86, 0, Math.PI * 2)
  ctx.fillStyle = GREEN
  ctx.globalAlpha = 0.12
  ctx.fill()
  ctx.globalAlpha = 1

  roundRect(ctx, PAD, 43, 168, 38, 19, GREEN)
  textLine(ctx, 'GRINDIFY', PAD + 19, 52, 17, INK, 800)
  textLine(ctx, title, PAD, 112, 45, '#FFFFFF', 750)
  textLine(ctx, labels.period, PAD, 172, 19, '#D4DDD6', 500)
  const profile = objectOf(data.profile)
  const displayName = `${textOf(profile.firstName)} ${textOf(profile.lastName)}`.trim()
  textLine(ctx, displayName || 'Grindify member', PAD, 222, 18, '#FFFFFF', 600)
  setFont(ctx, 13, 600)
  ctx.fillStyle = '#C2CEC5'
  ctx.textAlign = 'right'
  ctx.fillText(`${labels.generated}  ${formatDate(data.exportedAt, locale)}`, WIDTH - PAD, 68)
  ctx.textAlign = 'left'
  return 332
}

const drawMetric = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  title: string,
  value: string,
  index: number,
) => {
  roundRect(ctx, x, y, width, 126, 18, CARD, BORDER)
  roundRect(ctx, x + 18, y + 19, 5, 42, 3, index % 2 === 0 ? GREEN : '#D9E6D7')
  wrappedText(ctx, title.toLocaleUpperCase(), x + 37, y + 17, width - 55, 12, MUTED, 700, 15)
  textLine(ctx, value, x + 37, y + 52, 34, INK, 750)
}

const drawMonthlyChart = (
  ctx: CanvasRenderingContext2D,
  y: number,
  sessions: ExportRecord[],
  locale: ReportLocale,
  labels: Labels,
) => {
  roundRect(ctx, PAD, y, CONTENT_WIDTH, 332, 20, CARD, BORDER)
  textLine(ctx, labels.monthlyActivity, PAD + 28, y + 25, 22, INK, 700)
  textLine(ctx, labels.lastSixMonths, PAD + 28, y + 59, 14, MUTED, 400)
  const items = monthlySessionCounts(sessions, locale)
  const maxCount = Math.max(1, ...items.map((item) => item.count))
  const chartX = PAD + 56
  const chartY = y + 112
  const chartH = 145
  const chartW = CONTENT_WIDTH - 112
  ctx.strokeStyle = BORDER
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(chartX, chartY + chartH)
  ctx.lineTo(chartX + chartW, chartY + chartH)
  ctx.stroke()
  const gap = 30
  const barW = (chartW - gap * (items.length - 1)) / items.length
  items.forEach((item, index) => {
    const barH = item.count === 0 ? 4 : Math.max(12, (item.count / maxCount) * chartH)
    const x = chartX + index * (barW + gap)
    roundRect(ctx, x, chartY + chartH - barH, barW, barH, 9, index === items.length - 1 ? GREEN : '#D9E9CC')
    setFont(ctx, 13, 600)
    ctx.fillStyle = INK
    ctx.textAlign = 'center'
    ctx.fillText(String(item.count), x + barW / 2, chartY + chartH - barH - 10)
    setFont(ctx, 13, 500)
    ctx.fillStyle = MUTED
    ctx.fillText(item.label, x + barW / 2, chartY + chartH + 28)
  })
  ctx.textAlign = 'left'
  return y + 354
}

const drawWeightChart = (
  ctx: CanvasRenderingContext2D,
  y: number,
  data: UserDataExport,
  locale: ReportLocale,
  labels: Labels,
) => {
  const logs = [...data.weightLogs].sort(
    (a, b) => (dateValue(a.date)?.getTime() ?? 0) - (dateValue(b.date)?.getTime() ?? 0),
  )
  if (logs.length < 2) return y
  roundRect(ctx, PAD, y, CONTENT_WIDTH, 282, 20, CARD, BORDER)
  textLine(ctx, labels.weightProgress, PAD + 28, y + 25, 22, INK, 700)
  const values = logs.map((log) => numberOf(log.weight))
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const range = Math.max(1, maxValue - minValue)
  const plotX = PAD + 56
  const plotY = y + 82
  const plotW = CONTENT_WIDTH - 112
  const plotH = 132
  ctx.strokeStyle = '#DAE2D9'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(plotX, plotY + plotH)
  ctx.lineTo(plotX + plotW, plotY + plotH)
  ctx.stroke()
  ctx.beginPath()
  values.forEach((value, index) => {
    const x = plotX + (values.length === 1 ? 0 : (index / (values.length - 1)) * plotW)
    const pointY = plotY + plotH - ((value - minValue) / range) * (plotH - 20) - 10
    if (index === 0) ctx.moveTo(x, pointY)
    else ctx.lineTo(x, pointY)
  })
  ctx.strokeStyle = '#80B92F'
  ctx.lineWidth = 4
  ctx.stroke()
  values.forEach((value, index) => {
    const x = plotX + (values.length === 1 ? 0 : (index / (values.length - 1)) * plotW)
    const pointY = plotY + plotH - ((value - minValue) / range) * (plotH - 20) - 10
    ctx.beginPath()
    ctx.arc(x, pointY, 5, 0, Math.PI * 2)
    ctx.fillStyle = GREEN
    ctx.fill()
  })
  textLine(ctx, `${minValue}  →  ${maxValue} ${weightUnit(data)}`, plotX, y + 228, 14, MUTED, 500)
  textLine(ctx, `${formatDate(logs[0].date, locale, 'short')} — ${formatDate(logs[logs.length - 1].date, locale, 'short')}`, plotX + plotW - 220, y + 228, 13, MUTED, 400)
  return y + 304
}

const drawSummary = (
  ctx: CanvasRenderingContext2D,
  canvasHeight: number,
  data: UserDataExport,
  locale: ReportLocale,
  labels: Labels,
) => {
  let y = drawHeader(ctx, canvasHeight, labels.summaryTitle, data, locale, labels)
  const sessions = finishedSessions(data)
  const duration = sessions.reduce((sum, session) => sum + sessionDuration(session), 0)
  const durationLabel = duration >= 60 ? `${(duration / 60).toFixed(1)} ${labels.hours}` : `${duration} ${labels.minutes}`
  const metrics = [
    [labels.sessions, String(sessions.length)],
    [labels.totalTrainingTime, durationLabel],
    [labels.activeDays, `${allActiveDates(data)} ${labels.activeDaysUnit}`],
    [labels.personalRecords, String(data.exerciseRecords.length)],
  ] as const
  textLine(ctx, labels.overview, PAD, y, 24, INK, 700)
  y += 52
  const gap = 20
  const metricW = (CONTENT_WIDTH - gap) / 2
  metrics.forEach(([title, value], index) => {
    const col = index % 2
    const row = Math.floor(index / 2)
    drawMetric(ctx, PAD + col * (metricW + gap), y + row * 144, metricW, title, value, index)
  })
  y += 316
  y = drawMonthlyChart(ctx, y, sessions, locale, labels)
  y = drawWeightChart(ctx, y, data, locale, labels)

  const counts = new Map<string, number>()
  sessions.forEach((session) => {
    sessionExerciseRows(session).forEach((exerciseRow) => {
      const name = getExerciseName(objectOf(exerciseRow.exercise), locale)
      counts.set(name, (counts.get(name) ?? 0) + 1)
    })
  })
  const mostTrained = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
  const recent = [...sessions]
    .sort((a, b) => (dateValue(b.startedAt)?.getTime() ?? 0) - (dateValue(a.startedAt)?.getTime() ?? 0))
    .slice(0, 3)
  const recentRecords = [...data.exerciseRecords]
    .sort((a, b) => (dateValue(b.achievedAt)?.getTime() ?? 0) - (dateValue(a.achievedAt)?.getTime() ?? 0))
    .slice(0, 3)

  roundRect(ctx, PAD, y, CONTENT_WIDTH, 250, 20, INK)
  const columnX = PAD + CONTENT_WIDTH / 2
  textLine(ctx, labels.mostTrained, PAD + 28, y + 22, 17, '#FFFFFF', 700)
  textLine(ctx, labels.recordHighlights, columnX + 24, y + 22, 17, '#FFFFFF', 700)
  ctx.strokeStyle = '#35433A'
  ctx.beginPath()
  ctx.moveTo(columnX, y + 62)
  ctx.lineTo(columnX, y + 218)
  ctx.stroke()
  if (mostTrained.length) {
    mostTrained.forEach(([name, count], index) => {
      const rowY = y + 70 + index * 48
      roundRect(ctx, PAD + 28, rowY + 1, 28, 28, 14, GREEN)
      textLine(ctx, String(index + 1), PAD + 38, rowY + 5, 13, INK, 800)
      wrappedText(ctx, name, PAD + 68, rowY, columnX - PAD - 116, 14, '#FFFFFF', 600, 18)
      setFont(ctx, 14, 500)
      ctx.fillStyle = '#C5D0C8'
      ctx.textAlign = 'right'
      ctx.fillText(`${count}×`, columnX - 22, rowY + 18)
      ctx.textAlign = 'left'
    })
  } else {
    textLine(ctx, labels.noData, PAD + 28, y + 76, 14, '#C5D0C8')
  }
  if (recentRecords.length) {
    recentRecords.forEach((record, index) => {
      const rowY = y + 69 + index * 49
      const recordType = textOf(record.recordType)
      const recordValueUnit = recordType === 'max_reps' ? labels.reps : weightUnit(data)
      const title = `${getExerciseName(objectOf(record.exercise), locale)} · ${profileChoice(recordType, labels)}`
      const titleHeight = wrappedText(ctx, title, columnX + 24, rowY, CONTENT_WIDTH / 2 - 56, 13, '#FFFFFF', 600, 17)
      textLine(ctx, `${textOf(record.value)} ${recordValueUnit}`, columnX + 24, rowY + titleHeight + 1, 12, '#C5D0C8', 500)
    })
  } else {
    textLine(ctx, labels.noData, columnX + 24, y + 76, 14, '#C5D0C8')
  }
  y += 274

  roundRect(ctx, PAD, y, CONTENT_WIDTH, 220, 20, CARD, BORDER)
  textLine(ctx, labels.recentHighlights, PAD + 28, y + 25, 20, INK, 700)
  if (recent.length) {
    recent.forEach((session, index) => {
      const rowY = y + 73 + index * 44
      const title = getWorkoutName(objectOf(session.workout))
      const summary = `${formatDate(session.startedAt, locale, 'short')}   ·   ${sessionExerciseRows(session).length} ${labels.movements}   ·   ${sessionDuration(session)} ${labels.minutes}`
      textLine(ctx, title === '—' ? labels.workoutSessions : title, PAD + 28, rowY, 15, INK, 600)
      textLine(ctx, summary, PAD + 300, rowY + 1, 13, MUTED, 400)
      if (index < recent.length - 1) {
        ctx.strokeStyle = BORDER
        ctx.beginPath()
        ctx.moveTo(PAD + 28, rowY + 35)
        ctx.lineTo(WIDTH - PAD - 28, rowY + 35)
        ctx.stroke()
      }
    })
  } else {
    textLine(ctx, labels.noData, PAD + 28, y + 82, 15, MUTED)
  }
  y += 242
  textLine(ctx, labels.footer, PAD, y, 14, MUTED, 500)
  return y + 14
}

const drawInfoRow = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  value: string,
  width: number,
) => {
  textLine(ctx, label.toUpperCase(), x, y, 11, MUTED, 700)
  const used = wrappedText(ctx, value || '—', x, y + 18, width, 15, INK, 500, 21)
  return y + 22 + used
}

const wrappedLineCount = (ctx: CanvasRenderingContext2D, value: string, maxWidth: number, size: number, weight = 400) => {
  setFont(ctx, size, weight)
  let count = 1
  let line = ''
  for (const char of Array.from(value.trim() || '—')) {
    if (line && ctx.measureText(line + char).width > maxWidth) {
      count += 1
      line = char.trimStart()
    } else {
      line += char
    }
  }
  return count
}

const drawRecordCard = (
  ctx: CanvasRenderingContext2D,
  y: number,
  title: string,
  details: string[],
  options: { accent?: boolean; thumbnail?: CanvasImage } = {},
) => {
  const x = PAD
  const width = CONTENT_WIDTH
  const innerX = x + 24 + (options.thumbnail ? 132 : 0)
  const innerWidth = width - 48 - (options.thumbnail ? 132 : 0)
  const titleLines = wrappedLineCount(ctx, title, innerWidth, 17, 700)
  const detailLines = details.reduce((sum, detail) => sum + wrappedLineCount(ctx, detail, innerWidth, 13), 0)
  const height = Math.max(options.thumbnail ? 132 : 92, 42 + titleLines * 23 + detailLines * 21 + details.length * 2)
  roundRect(ctx, x, y, width, height, 16, CARD, BORDER)
  if (options.accent) roundRect(ctx, x, y + 16, 5, height - 32, 3, GREEN)
  if (options.thumbnail) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(x + 20, y + 18, 112, 96)
    ctx.clip()
    ctx.fillStyle = '#E9EEE7'
    ctx.fillRect(x + 20, y + 18, 112, 96)
    const image = options.thumbnail
    const ratio = Math.min(112 / image.width, 96 / image.height)
    const drawW = image.width * ratio
    const drawH = image.height * ratio
    ctx.drawImage(image, x + 20 + (112 - drawW) / 2, y + 18 + (96 - drawH) / 2, drawW, drawH)
    ctx.restore()
  }
  let nextY = y + 18
  nextY += wrappedText(ctx, title, innerX, nextY, innerWidth, 17, INK, 700, 23) + 6
  details.forEach((detail) => {
    if (!detail) return
    nextY += wrappedText(ctx, detail, innerX, nextY, innerWidth, 13, MUTED, 400, 19) + 2
  })
  return y + height + 12
}

interface CompactReportCard {
  title: string
  details: string[]
  accent?: boolean
  eyebrow?: string
}

const compactCardHeight = (ctx: CanvasRenderingContext2D, card: CompactReportCard, width: number) => {
  const innerWidth = width - 44
  const eyebrowHeight = card.eyebrow ? 18 : 0
  const titleLines = wrappedLineCount(ctx, card.title, innerWidth, 17, 700)
  const detailLines = card.details.reduce((sum, detail) => sum + wrappedLineCount(ctx, detail, innerWidth, 13), 0)
  return Math.max(112, 38 + eyebrowHeight + titleLines * 23 + detailLines * 19 + card.details.length * 3)
}

const drawCompactCard = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  card: CompactReportCard,
) => {
  roundRect(ctx, x, y, width, height, 16, CARD, BORDER)
  if (card.accent !== false) roundRect(ctx, x, y + 16, 5, height - 32, 3, GREEN)
  let textY = y + 17
  const innerX = x + 21
  const innerWidth = width - 42
  if (card.eyebrow) {
    textLine(ctx, card.eyebrow.toLocaleUpperCase(), innerX, textY, 10, '#7A8A7E', 700)
    textY += 17
  }
  textY += wrappedText(ctx, card.title, innerX, textY, innerWidth, 17, INK, 700, 23) + 6
  card.details.forEach((detail) => {
    if (detail) textY += wrappedText(ctx, detail, innerX, textY, innerWidth, 13, MUTED, 400, 18) + 2
  })
}

const drawCompactGrid = (
  ctx: CanvasRenderingContext2D,
  y: number,
  cards: CompactReportCard[],
  columns = 2,
  gap = 18,
) => {
  if (!cards.length) return drawRecordCard(ctx, y, '—', [], { accent: false })
  const cardWidth = (CONTENT_WIDTH - gap * (columns - 1)) / columns
  for (let index = 0; index < cards.length; index += columns) {
    const row = cards.slice(index, index + columns)
    const heights = row.map((card) => compactCardHeight(ctx, card, cardWidth))
    const rowHeight = Math.max(...heights)
    row.forEach((card, col) => drawCompactCard(ctx, PAD + col * (cardWidth + gap), y, cardWidth, rowHeight, card))
    y += rowHeight + gap
  }
  return y - gap + 14
}

const profileFields = (data: UserDataExport, locale: ReportLocale, labels: Labels) => {
  const profile = objectOf(data.profile)
  const fields = [
    [labels.email, textOf(profile.email)],
    [labels.birthday, formatDate(profile.dateOfBirth, locale, 'short')],
    [labels.gender, profileChoice(profile.gender, labels)],
    [labels.currentWeight, profile.weight ? `${profile.weight} ${weightUnit(data)}` : ''],
    [labels.height, profile.height ? `${profile.height} ${heightUnit(data)}` : ''],
    [labels.goal, profileChoice(profile.primaryGoal, labels)],
    [labels.weeklyGoal, profile.weeklyWorkoutGoal ? `${profile.weeklyWorkoutGoal}× / week` : ''],
    [labels.currentStreak, profile.currentStreak ? `${profile.currentStreak}` : ''],
    [labels.joined, formatDate(profile.createdAt, locale, 'short')],
  ].filter(([, value]) => Boolean(value)) as [string, string][]
  return fields
}

const drawProfile = (ctx: CanvasRenderingContext2D, y: number, data: UserDataExport, locale: ReportLocale, labels: Labels) => {
  y = sectionTitle(ctx, labels.profile, y)
  const fields = profileFields(data, locale, labels)
  if (!fields.length) return drawRecordCard(ctx, y, labels.noData, [])
  const columns = 3
  const colWidth = (CONTENT_WIDTH - 48) / columns
  const rowCount = Math.ceil(fields.length / columns)
  const cardHeight = Math.max(130, rowCount * 76 + 34)
  roundRect(ctx, PAD, y, CONTENT_WIDTH, cardHeight, 18, CARD, BORDER)
  fields.forEach(([label, value], index) => {
    const col = index % columns
    const row = Math.floor(index / columns)
    drawInfoRow(ctx, PAD + 24 + col * colWidth, y + 20 + row * 76, label, value, colWidth - 24)
  })
  return y + cardHeight + 18
}

const listText = (value: unknown, locale: ReportLocale) => {
  if (Array.isArray(value)) return value.map((item) => localize(item, locale) || textOf(item)).filter(Boolean).join(', ')
  const localizedList = objectOf(value)[locale === 'zh-CN' ? 'zho' : locale === 'sv' ? 'swe' : 'eng'] ?? objectOf(value).default
  if (Array.isArray(localizedList)) {
    return localizedList.map((item) => localize(item, locale) || textOf(item)).filter(Boolean).join(', ')
  }
  return localize(value, locale)
}

const drawExercises = (ctx: CanvasRenderingContext2D, y: number, data: UserDataExport, locale: ReportLocale, labels: Labels) => {
  y = sectionTitle(ctx, `${labels.exercises} · ${data.exercises.length}`, y)
  const sorted = [...data.exercises].sort((a, b) => getExerciseName(a, locale).localeCompare(getExerciseName(b, locale), locale))
  if (!sorted.length) return drawRecordCard(ctx, y, labels.noData, [])
  const cards = sorted.map((exercise): CompactReportCard => {
    const details = [
      [labels.type, profileChoice(exercise.exerciseType, labels)].filter(Boolean).join(': '),
      [labels.muscles, listText(exercise.muscleGroups, locale)].filter(Boolean).join(': '),
      [labels.equipment, listText(exercise.equipment, locale)].filter(Boolean).join(': '),
      [labels.description, localize(exercise.description, locale)].filter(Boolean).join(': '),
      [labels.instructions, listText(exercise.instructions, locale)].filter(Boolean).join(': '),
    ].filter(Boolean)
    const media = arrayOf(exercise.media)
    if (media.length) details.push(`${media.length} media item${media.length === 1 ? '' : 's'}`)
    return { title: getExerciseName(exercise, locale), details, accent: true }
  })
  return drawCompactGrid(ctx, y, cards, 2)
}

const drawWorkouts = (ctx: CanvasRenderingContext2D, y: number, data: UserDataExport, locale: ReportLocale, labels: Labels) => {
  y = sectionTitle(ctx, `${labels.workouts} · ${data.workouts.length}`, y)
  if (!data.workouts.length) return drawRecordCard(ctx, y, labels.noData, [])
  const cards = data.workouts.map((workout): CompactReportCard => {
    const details: string[] = []
    if (workout.time) details.push(`${labels.plannedTime}: ${textOf(workout.time)} ${labels.minutes}`)
    if (workout.type) details.push(`${labels.type}: ${profileChoice(workout.type, labels)}`)
    if (workout.description) details.push(`${labels.description}: ${textOf(workout.description)}`)
    arrayOf(workout.exercises).forEach((planned) => {
      const exercise = objectOf(planned.exercise)
      const plan = `${numberOf(planned.sets)} ${labels.sets} × ${numberOf(planned.reps)} ${labels.reps}`
      const weight = numberOf(planned.weight)
      details.push(`• ${getExerciseName(exercise, locale)} — ${plan}${weight ? ` · ${weight} ${weightUnit(data)}` : ''}`)
    })
    return { title: getWorkoutName(workout), details, accent: true }
  })
  return drawCompactGrid(ctx, y, cards, 2)
}

const statusLabel = (status: unknown, labels: Labels) => {
  switch (textOf(status)) {
    case 'finished': return labels.finished
    case 'in_progress': return labels.inProgress
    case 'abandoned': return labels.abandoned
    default: return textOf(status) || '—'
  }
}

const setSummary = (set: ExportRecord, labels: Labels, unit: string) => {
  const setNo = numberOf(set.setNumber)
  const weight = numberOf(set.weight)
  const reps = numberOf(set.reps)
  const cardio = [set.distance ? `${labels.distance} ${textOf(set.distance)} km` : '', set.duration ? `${textOf(set.duration)} ${labels.minutes}` : '', set.calories ? `${textOf(set.calories)} kcal` : ''].filter(Boolean)
  const strength = [weight ? `${weight} ${unit}` : '', reps ? `${reps} ${labels.reps}` : '', set.rpe ? `RPE ${textOf(set.rpe)}` : ''].filter(Boolean).join(' × ')
  return `${setNo}: ${[strength, ...cardio].filter(Boolean).join(' · ') || '—'}`
}

const drawSessions = (ctx: CanvasRenderingContext2D, y: number, data: UserDataExport, locale: ReportLocale, labels: Labels) => {
  y = sectionTitle(ctx, `${labels.workoutSessions} · ${data.workoutSessions.length}`, y)
  const sessions = [...data.workoutSessions].sort((a, b) => (dateValue(b.startedAt)?.getTime() ?? 0) - (dateValue(a.startedAt)?.getTime() ?? 0))
  if (!sessions.length) return drawRecordCard(ctx, y, labels.noData, [])
  const unit = weightUnit(data)
  const cards = sessions.map((session): CompactReportCard => {
    const workoutName = getWorkoutName(objectOf(session.workout))
    const details = [
      `${labels.duration}: ${sessionDuration(session)} ${labels.minutes}${session.caloriesBurned ? ` · ${labels.calories}: ${textOf(session.caloriesBurned)} kcal` : ''}`,
      session.totalWeight ? `${labels.totalWeight}: ${textOf(session.totalWeight)} ${unit}` : '',
    ].filter(Boolean)
    const exerciseDetails = sessionExerciseRows(session).map((exerciseRow) => {
      const name = getExerciseName(objectOf(exerciseRow.exercise), locale)
      const setDetails = sessionSetRows(exerciseRow).map((set) => setSummary(set, labels, unit))
      const notes = textOf(exerciseRow.notes) ? ` · ${labels.notes}: ${textOf(exerciseRow.notes)}` : ''
      return `• ${name} — ${setDetails.length ? setDetails.join('   ·   ') : labels.noData}${notes}`
    })
    details.push(...exerciseDetails)
    if (textOf(session.notes)) details.push(`${labels.notes}: ${textOf(session.notes)}`)
    return {
      title: workoutName === '—' ? `${labels.workoutSessions} #${textOf(session.id)}` : workoutName,
      eyebrow: `${formatDate(session.startedAt, locale)} · ${statusLabel(session.status, labels)}`,
      details,
      accent: textOf(session.status) === 'finished',
    }
  })
  return drawCompactGrid(ctx, y, cards, 2)
}

const drawActivityLogs = (ctx: CanvasRenderingContext2D, y: number, data: UserDataExport, locale: ReportLocale, labels: Labels) => {
  y = sectionTitle(ctx, `${labels.activityLogs} · ${data.activityLogs.length}`, y)
  const logs = [...data.activityLogs].sort((a, b) => (dateValue(b.date)?.getTime() ?? 0) - (dateValue(a.date)?.getTime() ?? 0))
  if (!logs.length) return drawRecordCard(ctx, y, labels.noData, [])
  const cards = logs.map((log): CompactReportCard => {
    const details = [
      `${labels.duration}: ${textOf(log.duration) || '0'} ${labels.minutes}${log.distance ? ` · ${labels.distance}: ${textOf(log.distance)} km` : ''}`,
      [log.pace ? `${labels.pace}: ${textOf(log.pace)}` : '', log.calories ? `${labels.calories}: ${textOf(log.calories)} kcal` : '', log.elevationGain ? `${labels.elevation}: ${textOf(log.elevationGain)} m` : ''].filter(Boolean).join(' · '),
      textOf(log.notes) ? `${labels.notes}: ${textOf(log.notes)}` : '',
    ].filter(Boolean)
    return { title: getActivityName(log, locale), eyebrow: formatDate(log.date, locale), details, accent: true }
  })
  return drawCompactGrid(ctx, y, cards, 2)
}

const drawWeightLogs = (ctx: CanvasRenderingContext2D, y: number, data: UserDataExport, locale: ReportLocale, labels: Labels) => {
  y = sectionTitle(ctx, `${labels.weightLogs} · ${data.weightLogs.length}`, y)
  const logs = [...data.weightLogs].sort((a, b) => (dateValue(b.date)?.getTime() ?? 0) - (dateValue(a.date)?.getTime() ?? 0))
  if (!logs.length) return drawRecordCard(ctx, y, labels.noData, [])
  const unit = weightUnit(data)
  const columns = 3
  const gap = 16
  const cardWidth = (CONTENT_WIDTH - gap * (columns - 1)) / columns
  for (let index = 0; index < logs.length; index += columns) {
    const row = logs.slice(index, index + columns)
    const heights = row.map((log) => {
      const note = textOf(log.notes)
      return Math.max(120, 99 + (note ? wrappedLineCount(ctx, note, cardWidth - 34, 12) * 17 : 0))
    })
    const rowHeight = Math.max(...heights)
    row.forEach((log, col) => {
      const x = PAD + col * (cardWidth + gap)
      roundRect(ctx, x, y, cardWidth, rowHeight, 16, CARD, BORDER)
      roundRect(ctx, x + 17, y + 18, 32, 4, 2, GREEN)
      textLine(ctx, `${textOf(log.weight)} ${unit}`, x + 17, y + 31, 25, INK, 750)
      textLine(ctx, formatDate(log.date, locale), x + 17, y + 66, 12, MUTED, 500)
      if (textOf(log.notes)) wrappedText(ctx, textOf(log.notes), x + 17, y + 87, cardWidth - 34, 12, MUTED, 400, 17)
    })
    y += rowHeight + gap
  }
  return y - gap + 14
}

const loadPhoto = (photo: ExportRecord, apiBaseUrl: string): Promise<CanvasImage> => {
  const rawUrl = textOf(photo.photoUrl)
  if (!rawUrl) return Promise.resolve(null)
  let resolvedUrl = rawUrl
  try {
    resolvedUrl = resolveRequestUrl(new URL(rawUrl, apiBaseUrl).toString())
  } catch {
    return Promise.resolve(null)
  }
  const image = new Image()
  image.crossOrigin = 'anonymous'
  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => resolve(null), 5000)
    image.onload = () => {
      window.clearTimeout(timeout)
      resolve(image)
    }
    image.onerror = () => {
      window.clearTimeout(timeout)
      resolve(null)
    }
    image.src = resolvedUrl
  })
}

const sortedProgressPhotos = (data: UserDataExport) =>
  [...data.progressPhotos].sort((a, b) => (dateValue(b.date)?.getTime() ?? 0) - (dateValue(a.date)?.getTime() ?? 0))

const drawProgressPhotos = (
  ctx: CanvasRenderingContext2D,
  y: number,
  data: UserDataExport,
  locale: ReportLocale,
  labels: Labels,
  photos: ExportRecord[],
  images: CanvasImage[],
) => {
  y = sectionTitle(ctx, `${labels.progressPhotos} · ${data.progressPhotos.length}`, y)
  if (!data.progressPhotos.length) return drawRecordCard(ctx, y, labels.noData, [])
  const columns = 3
  const gap = 16
  const cardWidth = (CONTENT_WIDTH - gap * (columns - 1)) / columns
  const imageHeight = 142
  for (let start = 0; start < photos.length; start += columns) {
    const row = photos.slice(start, start + columns)
    const heights = row.map((photo) => {
      const note = textOf(photo.notes)
      const pose = textOf(photo.poseTag)
      const poseLabel = pose === 'front' ? labels.front : pose === 'side' ? labels.side : pose === 'back' ? labels.back : ''
      const noteLines = note ? wrappedLineCount(ctx, `${labels.notes}: ${note}`, cardWidth - 34, 12) : 0
      return Math.max(232, 209 + (poseLabel ? 19 : 0) + noteLines * 17)
    })
    const rowHeight = Math.max(...heights)
    row.forEach((photo, col) => {
      const index = start + col
      const x = PAD + col * (cardWidth + gap)
      const image = images[index]
      const pose = textOf(photo.poseTag)
      const poseLabel = pose === 'front' ? labels.front : pose === 'side' ? labels.side : pose === 'back' ? labels.back : ''
      roundRect(ctx, x, y, cardWidth, rowHeight, 16, CARD, BORDER)
      roundRect(ctx, x + 14, y + 14, cardWidth - 28, imageHeight, 10, '#E6ECE4')
      if (image) {
        const ratio = Math.min((cardWidth - 32) / image.width, (imageHeight - 4) / image.height)
        const drawW = image.width * ratio
        const drawH = image.height * ratio
        ctx.save()
        ctx.beginPath()
        ctx.rect(x + 16, y + 16, cardWidth - 32, imageHeight - 4)
        ctx.clip()
        ctx.drawImage(image, x + 16 + ((cardWidth - 32) - drawW) / 2, y + 16 + ((imageHeight - 4) - drawH) / 2, drawW, drawH)
        ctx.restore()
      } else {
        ctx.beginPath()
        ctx.arc(x + cardWidth / 2, y + 74, 28, 0, Math.PI * 2)
        ctx.strokeStyle = '#B7C5B9'
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(x + cardWidth / 2, y + 74, 16, 0, Math.PI * 2)
        ctx.strokeStyle = GREEN
        ctx.stroke()
      }
      textLine(ctx, formatDate(photo.date, locale, 'short'), x + 17, y + 170, 15, INK, 700)
      let detailY = y + 197
      if (poseLabel) detailY += wrappedText(ctx, `${labels.pose}: ${poseLabel}`, x + 17, detailY, cardWidth - 34, 12, MUTED, 500, 17) + 2
      if (textOf(photo.notes)) wrappedText(ctx, `${labels.notes}: ${textOf(photo.notes)}`, x + 17, detailY, cardWidth - 34, 12, MUTED, 400, 17)
    })
    y += rowHeight + gap
  }
  return y - gap + 14
}

const loadProgressPhotos = (photos: ExportRecord[], apiBaseUrl: string) =>
  Promise.all(photos.map((photo) => loadPhoto(photo, apiBaseUrl)))

const drawExerciseRecords = (ctx: CanvasRenderingContext2D, y: number, data: UserDataExport, locale: ReportLocale, labels: Labels) => {
  y = sectionTitle(ctx, `${labels.exerciseRecords} · ${data.exerciseRecords.length}`, y)
  const records = [...data.exerciseRecords].sort((a, b) => (dateValue(b.achievedAt)?.getTime() ?? 0) - (dateValue(a.achievedAt)?.getTime() ?? 0))
  if (!records.length) return drawRecordCard(ctx, y, labels.noData, [])
  const unit = weightUnit(data)
  const columns = 3
  const gap = 16
  const cardWidth = (CONTENT_WIDTH - gap * (columns - 1)) / columns
  const models = records.map((record) => {
    const type = profileChoice(record.recordType, labels)
    const valueUnit = textOf(record.recordType) === 'max_reps' ? labels.reps : unit
    const exerciseName = getExerciseName(objectOf(record.exercise), locale)
    const setDetail = record.setDetails
      ? `${numberOf(objectOf(record.setDetails).weight)} ${unit} × ${numberOf(objectOf(record.setDetails).reps)} ${labels.reps}`
      : ''
    return { type, value: `${textOf(record.value)} ${valueUnit}`, exerciseName, date: formatDate(record.achievedAt, locale), setDetail }
  })
  for (let start = 0; start < models.length; start += columns) {
    const row = models.slice(start, start + columns)
    const heights = row.map((model) => {
      const nameLines = wrappedLineCount(ctx, model.exerciseName, cardWidth - 36, 14, 700)
      const detailLines = model.setDetail ? wrappedLineCount(ctx, model.setDetail, cardWidth - 36, 12) : 0
      return Math.max(152, 118 + nameLines * 20 + detailLines * 16)
    })
    const rowHeight = Math.max(...heights)
    row.forEach((model, col) => {
      const x = PAD + col * (cardWidth + gap)
      roundRect(ctx, x, y, cardWidth, rowHeight, 16, CARD, BORDER)
      const badgeWidth = Math.min(cardWidth - 36, Math.max(86, model.type.length * 12 + 24))
      roundRect(ctx, x + 17, y + 15, badgeWidth, 22, 11, '#EEF5E8')
      textLine(ctx, model.type, x + 26, y + 18, 10, '#58733D', 700)
      textLine(ctx, model.value, x + 17, y + 46, 25, INK, 750)
      let detailY = y + 80
      detailY += wrappedText(ctx, model.exerciseName, x + 17, detailY, cardWidth - 34, 14, INK, 700, 20) + 3
      textLine(ctx, `${labels.achieved}: ${model.date}`, x + 17, detailY, 11, MUTED, 500)
      detailY += 18
      if (model.setDetail) wrappedText(ctx, model.setDetail, x + 17, detailY, cardWidth - 34, 12, MUTED, 400, 16)
    })
    y += rowHeight + gap
  }
  return y - gap + 14
}

const drawArchiveOverview = (ctx: CanvasRenderingContext2D, y: number, data: UserDataExport, labels: Labels) => {
  y = sectionTitle(ctx, labels.overview, y)
  const metrics = [
    [labels.sessions, String(finishedSessions(data).length)],
    [labels.activeDays, `${allActiveDates(data)} ${labels.activeDaysUnit}`],
    [labels.movements, String(data.exercises.length)],
    [labels.personalRecords, String(data.exerciseRecords.length)],
  ] as const
  const gap = 16
  const width = (CONTENT_WIDTH - gap * 3) / 4
  metrics.forEach(([title, value], index) => drawMetric(ctx, PAD + index * (width + gap), y, width, title, value, index))
  return y + 144
}

const drawComplete = (
  ctx: CanvasRenderingContext2D,
  reportHeight: number,
  data: UserDataExport,
  locale: ReportLocale,
  labels: Labels,
  photos: ExportRecord[],
  photoImages: CanvasImage[],
) => {
  let y = drawHeader(ctx, reportHeight, labels.fullTitle, data, locale, labels)
  y = drawArchiveOverview(ctx, y, data, labels)
  y = drawProfile(ctx, y, data, locale, labels)
  if (data.exercises.length) y = drawExercises(ctx, y, data, locale, labels)
  if (data.workouts.length) y = drawWorkouts(ctx, y, data, locale, labels)
  if (data.workoutSessions.length) y = drawSessions(ctx, y, data, locale, labels)
  if (data.activityLogs.length) y = drawActivityLogs(ctx, y, data, locale, labels)
  if (data.weightLogs.length) y = drawWeightLogs(ctx, y, data, locale, labels)
  if (data.progressPhotos.length) y = drawProgressPhotos(ctx, y, data, locale, labels, photos, photoImages)
  if (data.exerciseRecords.length) y = drawExerciseRecords(ctx, y, data, locale, labels)
  textLine(ctx, labels.footer, PAD, y + 12, 14, MUTED, 500)
  return y + 26
}

const saveCanvas = (canvas: HTMLCanvasElement, filename: string) =>
  new Promise<void>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Could not encode report as PNG'))
        return
      }
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      resolve()
    }, 'image/png')
  })

const drawReport = (
  ctx: CanvasRenderingContext2D,
  canvasHeight: number,
  mode: ReportMode,
  data: UserDataExport,
  locale: ReportLocale,
  labels: Labels,
  photos: ExportRecord[],
  photoImages: CanvasImage[],
) => mode === 'summary'
  ? drawSummary(ctx, canvasHeight, data, locale, labels)
  : drawComplete(ctx, canvasHeight, data, locale, labels, photos, photoImages)

export const exportUserDataReport = async (
  data: UserDataExport,
  mode: ReportMode,
  localeValue: string,
  apiUrl: string,
) => {
  const locale: ReportLocale = localeValue === 'zh-CN' || localeValue === 'sv' ? localeValue : 'en'
  const labels = copy[locale]
  const photos = mode === 'complete' ? sortedProgressPhotos(data) : []
  const apiBaseUrl = apiUrl.replace(/\/v1\/?$/, '')
  const photoImages = mode === 'complete' ? await loadProgressPhotos(photos, apiBaseUrl) : []

  // Measure with the same renderer used for the final PNG so optional sections
  // and wrapped record details contribute their exact height.
  const measureCanvas = document.createElement('canvas')
  measureCanvas.width = WIDTH
  measureCanvas.height = 1
  const measureCtx = measureCanvas.getContext('2d')
  if (!measureCtx) throw new Error('Canvas is not available')
  const contentHeight = drawReport(measureCtx, 1, mode, data, locale, labels, photos, photoImages)
  const logicalHeight = Math.max(1, Math.ceil(contentHeight + 40))

  // Keep export pixels crisp without shrinking the width to fit a total-area
  // budget. Very tall reports use native layout resolution and split only when
  // the browser's maximum canvas dimension would otherwise be exceeded.
  const scale = logicalHeight <= 16_000 ? 2 : 1
  const maxCanvasDimension = 32_000
  const maxLogicalPageHeight = Math.floor(maxCanvasDimension / scale)
  const pageCount = Math.ceil(logicalHeight / maxLogicalPageHeight)
  const pageLogicalHeight = Math.ceil(logicalHeight / pageCount)
  const stamp = new Date().toISOString().slice(0, 10)
  const baseName = `grindify-${mode === 'summary' ? 'summary' : 'complete'}-${stamp}`

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const pageStart = pageIndex * pageLogicalHeight
    const thisPageHeight = Math.min(pageLogicalHeight, logicalHeight - pageStart)
    const canvas = document.createElement('canvas')
    canvas.width = WIDTH * scale
    canvas.height = thisPageHeight * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas is not available')
    ctx.scale(scale, scale)
    if (pageStart > 0) ctx.translate(0, -pageStart)
    drawReport(ctx, logicalHeight, mode, data, locale, labels, photos, photoImages)

    const pageSuffix = pageCount > 1
      ? `-part-${String(pageIndex + 1).padStart(2, '0')}-of-${pageCount}`
      : ''
    await saveCanvas(canvas, `${baseName}${pageSuffix}.png`)
  }
}
