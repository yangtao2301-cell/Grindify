<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import {
  coachApi,
  type CoachPlanDraft,
  type CoachPlanPayload,
  type CoachPlanFromMessageRequest,
} from '@/services/coach.service'
import { useWorkoutStore } from '@/stores/workout.store'
import { useScheduledSessionStore } from '@/stores/scheduledSession.store'
import type { CoachCyclePattern } from './planIntent'

const props = defineProps<{
  available: boolean
  compact?: boolean
  sourceRequest?: { messageId: string; requestId: string; suggestedPattern: 'weekly' | CoachCyclePattern; confirmedCycle: boolean } | null
}>()
const emit = defineEmits<{ navigate: [] }>()
const workouts = useWorkoutStore()
const schedules = useScheduledSessionStore()
const weekdays = [
  { id: 0, name: '周一' }, { id: 1, name: '周二' }, { id: 2, name: '周三' },
  { id: 3, name: '周四' }, { id: 4, name: '周五' }, { id: 5, name: '周六' },
  { id: 6, name: '周日' },
]
const cycleDays = (pattern?: string) => pattern === 'four_on_one_off' ? 4 : pattern === 'five_on_one_off' ? 5 : 0
const experienceOptions = [
  { value: 'beginner', text: '刚开始' },
  { value: 'intermediate', text: '已有基础' },
  { value: 'advanced', text: '经验较多' },
] as const
const draft = ref<CoachPlanDraft | null>(null)
const editing = ref<CoachPlanPayload | null>(null)
const busy = ref(false)
const error = ref('')
const appliedCount = ref(0)
const sourceMode = ref(false)
const confirmOpen = ref(false)
const pendingRequestId = ref<string | null>(null)
const conflictChoices = ref<Record<string, 'add' | 'skip' | ''>>({})
function beijingToday(): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const get = (type: string) => parts.find(part => part.type === type)!.value
  return `${get('year')}-${get('month')}-${get('day')}`
}
function addDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00Z`)
  next.setUTCDate(next.getUTCDate() + days)
  return next.toISOString().slice(0, 10)
}
const sourceForm = ref<Omit<CoachPlanFromMessageRequest, 'requestId'>>({
  pattern: 'weekly', cycles: undefined, startDate: beijingToday(), daysOfWeek: [], minutes: 45,
  goal: '', experience: 'beginner', equipment: '', limitations: '',
})
type SourceStep = 'pattern' | 'cycles' | 'startDate' | 'weekdays' | 'goal' | 'experience' | 'minutes' | 'equipment' | 'limitations'
const sourceStep = ref(0)
const needsReviewed = ref(false)
const detailsOpen = ref(false)
const selectedDayIndex = ref(0)
const sourceSteps = computed<SourceStep[]>(() => [
  ...(props.sourceRequest ? [...(props.sourceRequest.confirmedCycle ? [] : ['pattern' as const]), ...(cycleDays(sourceForm.value.pattern) ? ['cycles' as const] : []), 'startDate' as const] : []),
  ...(!props.sourceRequest || sourceForm.value.pattern === 'weekly' ? ['weekdays' as const] : []),
  'goal', 'experience', 'minutes', 'equipment', 'limitations',
])
const currentSourceStep = computed(() => sourceSteps.value[sourceStep.value])
const sourceQuestions: Record<SourceStep, string> = {
  pattern: '你希望按什么节奏训练？',
  cycles: '你希望安排几个完整循环？',
  startDate: '从哪一天开始安排？',
  weekdays: '接下来一周，星期几可以训练？请选择 1–4 天。',
  goal: '这次训练最想达到什么目标？',
  experience: '你目前的训练经验如何？',
  minutes: '每次能训练多少分钟？',
  equipment: '你有哪些可用器械？没有也可以直接说“无”。',
  limitations: '有没有需要避开的动作或身体限制？没有请回答“无”。',
}
function sourceAnswer(step: SourceStep): string {
  const value = sourceForm.value
  if (step === 'pattern') return cycleDays(value.pattern) ? `练${cycleDays(value.pattern)}天、休息一天` : '每周选择固定训练日'
  if (step === 'cycles') return `${value.cycles} 个循环，共 ${(value.cycles || 0) * (cycleDays(value.pattern) + 1)} 天`
  if (step === 'startDate') return value.startDate
  if (step === 'weekdays') return value.daysOfWeek.map(id => weekdays.find(day => day.id === id)?.name).join('、')
  if (step === 'goal') return value.goal
  if (step === 'experience') return { beginner: '刚开始', intermediate: '已有基础', advanced: '经验较多' }[value.experience]
  if (step === 'minutes') return `${value.minutes} 分钟`
  if (step === 'equipment') return value.equipment
  return value.limitations
}
const canContinueSource = computed(() => {
  const step = currentSourceStep.value
  if (step === 'pattern' || step === 'experience') return true
  if (step === 'cycles') return Number.isInteger(sourceForm.value.cycles) && (sourceForm.value.cycles ?? 0) >= 1 && (sourceForm.value.cycles ?? 0) <= 6
  if (step === 'startDate') return sourceForm.value.startDate >= beijingToday() && sourceForm.value.startDate <= addDays(beijingToday(), 6)
  if (step === 'weekdays') return sourceForm.value.daysOfWeek.length >= 1 && sourceForm.value.daysOfWeek.length <= 4
  if (step === 'goal') return !!sourceForm.value.goal.trim()
  if (step === 'minutes') return sourceForm.value.minutes >= 20 && sourceForm.value.minutes <= 120
  if (step === 'equipment') return !!sourceForm.value.equipment.trim()
  if (step === 'limitations') return !!sourceForm.value.limitations.trim()
  return false
})
function nextSourceStep() {
  if (canContinueSource.value && sourceStep.value < sourceSteps.value.length) {
    sourceStep.value++
    if (sourceStep.value === sourceSteps.value.length) needsReviewed.value = true
  }
}
function returnToSummary() {
  if (canGenerateNeeds.value) sourceStep.value = sourceSteps.value.length
}
const sourceRequestId = ref<string | null>(null)
const dirty = computed(() => !!draft.value && !!editing.value &&
  JSON.stringify(editing.value) !== JSON.stringify(draft.value.payload))
const canGenerateNeeds = computed(() => !!sourceForm.value.goal.trim() && !!sourceForm.value.equipment.trim() &&
  !!sourceForm.value.limitations.trim() && sourceForm.value.minutes >= 20 && sourceForm.value.minutes <= 120 &&
  (!props.sourceRequest || (sourceForm.value.startDate >= beijingToday() && sourceForm.value.startDate <= addDays(beijingToday(), 6))) &&
  (props.sourceRequest && cycleDays(sourceForm.value.pattern) > 0 && Number.isInteger(sourceForm.value.cycles) && (sourceForm.value.cycles ?? 0) >= 1 && (sourceForm.value.cycles ?? 0) <= 6 ||
    (sourceForm.value.daysOfWeek.length >= 1 && sourceForm.value.daysOfWeek.length <= 4)))
const daysToAdd = computed(() => editing.value?.days.filter(day => conflictChoices.value[day.date] !== 'skip') || [])
const daysToSkip = computed(() => editing.value?.days.filter(day => conflictChoices.value[day.date] === 'skip') || [])
const unresolvedConflicts = computed(() => draft.value?.conflicts.filter(date => !conflictChoices.value[date]) || [])
const visibleDays = computed(() => editing.value?.days.map((day, index) => ({ day, index }))
  .filter((_, index) => !props.compact || index === selectedDayIndex.value) || [])
const calendarPreview = computed(() => {
  const plan = editing.value
  if (!plan) return []
  const trainingDays = cycleDays(plan.pattern)
  if (!trainingDays) return plan.days.map(day => ({ date: day.date, rest: false }))
  return Array.from({ length: (Date.parse(`${plan.windowEnd}T00:00:00Z`) - Date.parse(`${plan.windowStart}T00:00:00Z`)) / 86400000 + 1 }, (_, offset) => {
    const date = addDays(plan.windowStart, offset)
    return { date, rest: offset % (trainingDays + 1) === trainingDays }
  })
})
const cycleRestDates = computed(() => {
  const plan = editing.value
  const trainingDays = cycleDays(plan?.pattern)
  if (!trainingDays) return []
  const start = new Date(`${plan!.windowStart}T00:00:00Z`)
  return Array.from({ length: (Date.parse(`${plan!.windowEnd}T00:00:00Z`) - start.getTime()) / 86400000 + 1 }, (_, offset) => offset)
    .filter(offset => offset % (trainingDays + 1) === trainingDays)
    .map(offset => new Date(start.getTime() + offset * 86400000).toISOString().slice(0, 10))
})

function copyPayload(value: CoachPlanPayload): CoachPlanPayload {
  return JSON.parse(JSON.stringify(value)) as CoachPlanPayload
}
function setDraft(value: CoachPlanDraft) {
  confirmOpen.value = false
  draft.value = value
  editing.value = copyPayload(value.payload)
  conflictChoices.value = {}
  detailsOpen.value = false
  selectedDayIndex.value = 0
  needsReviewed.value = true
}
function revisitStartDate() {
  draft.value = null
  editing.value = null
  confirmOpen.value = false
  detailsOpen.value = false
  error.value = ''
  sourceStep.value = sourceSteps.value.indexOf('startDate')
}
async function regenerateWithStartDate(date: string) {
  if (!props.sourceRequest || busy.value) return
  draft.value = null
  editing.value = null
  confirmOpen.value = false
  sourceForm.value.startDate = date
  sourceStep.value = sourceSteps.value.length
  await nextTick()
  await generateFromNeeds()
}
function addAllOnSameDay() {
  for (const date of draft.value?.conflicts || []) conflictChoices.value[date] = 'add'
}
function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : '操作失败，请稍后重试。'
}
function uuid(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6]! & 15) | 64
  bytes[8] = (bytes[8]! & 63) | 128
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
function toggleSourceDay(id: number) {
  const days = sourceForm.value.daysOfWeek
  sourceForm.value.daysOfWeek = days.includes(id) ? days.filter(day => day !== id) : [...days, id].sort()
}
watch(sourceForm, () => { sourceRequestId.value = uuid(); pendingRequestId.value = uuid() }, { deep: true })
watch(editing, () => { confirmOpen.value = false }, { deep: true, flush: 'sync' })
watch(conflictChoices, () => { confirmOpen.value = false }, { deep: true, flush: 'sync' })
async function load() {
  const sourceAtStart = props.sourceRequest
  busy.value = true
  try {
    const latest = await coachApi.latestPlan()
    if (latest && props.sourceRequest === sourceAtStart) setDraft(latest)
  } catch (cause) {
    error.value = message(cause)
  } finally {
    busy.value = false
  }
}
async function generateFromNeeds() {
  const source = props.sourceRequest
  if (busy.value || sourceStep.value !== sourceSteps.value.length || !canGenerateNeeds.value) return
  sourceMode.value = !!source
  busy.value = true
  error.value = ''
  appliedCount.value = 0
  try {
    if (source) {
      sourceRequestId.value ||= uuid()
      setDraft(await coachApi.generatePlanFromMessage(source.messageId, {
        ...sourceForm.value,
        cycles: cycleDays(sourceForm.value.pattern) ? sourceForm.value.cycles : undefined,
        daysOfWeek: cycleDays(sourceForm.value.pattern) ? [] : sourceForm.value.daysOfWeek,
        requestId: sourceRequestId.value,
      }))
    } else {
      pendingRequestId.value ||= uuid()
      setDraft(await coachApi.generatePlan({
        requestId: pendingRequestId.value,
        daysOfWeek: sourceForm.value.daysOfWeek,
        goal: sourceForm.value.goal,
        experience: sourceForm.value.experience,
        minutes: sourceForm.value.minutes,
        equipment: sourceForm.value.equipment,
        limitations: sourceForm.value.limitations,
      }))
    }
  } catch (cause) {
    error.value = message(cause)
    if (error.value.includes('已过期')) { sourceRequestId.value = uuid(); pendingRequestId.value = uuid() }
  } finally {
    busy.value = false
  }
}
watch(() => props.sourceRequest, source => {
  confirmOpen.value = false
  if (!source) {
    sourceMode.value = false
    draft.value = null
    editing.value = null
    sourceForm.value = { pattern: 'weekly', cycles: undefined, startDate: beijingToday(), daysOfWeek: [],
      minutes: 45, goal: '', experience: 'beginner', equipment: '', limitations: '' }
    sourceStep.value = 0
    needsReviewed.value = false
    void load()
    return
  }
  draft.value = null
  editing.value = null
  error.value = ''
  appliedCount.value = 0
  sourceMode.value = true
  sourceRequestId.value = source.requestId
  sourceStep.value = 0
  needsReviewed.value = false
  sourceForm.value = { pattern: source.suggestedPattern, cycles: undefined, startDate: beijingToday(), daysOfWeek: [],
    minutes: 45, goal: '', experience: 'beginner', equipment: '', limitations: '' }
})
async function save(): Promise<boolean> {
  if (!draft.value || !editing.value) return false
  if (!dirty.value) return true
  busy.value = true
  error.value = ''
  try {
    const choices = { ...conflictChoices.value }
    setDraft(await coachApi.updatePlan(draft.value.id, draft.value.version, editing.value))
    for (const date of draft.value?.conflicts || []) {
      if (choices[date]) conflictChoices.value[date] = choices[date]
    }
    return true
  } catch (cause) {
    error.value = message(cause)
    return false
  } finally {
    busy.value = false
  }
}
async function refreshDraft() {
  if (!draft.value || busy.value) return
  if (dirty.value && !(await save())) return
  const id = draft.value?.id
  const choices = { ...conflictChoices.value }
  busy.value = true
  error.value = ''
  try {
    const latest = await coachApi.latestPlan()
    if (!latest || latest.id !== id) throw new Error('当前草案已不是最新草案，请重新打开。')
    setDraft(latest)
    for (const date of latest.conflicts) {
      if (choices[date]) conflictChoices.value[date] = choices[date]
    }
  } catch (cause) {
    error.value = message(cause)
  } finally {
    busy.value = false
  }
}
async function openConfirmation() {
  if (!draft.value || !editing.value || busy.value || !props.available) return
  if (dirty.value && !(await save())) return
  const current = draft.value
  if (!current) return
  if (current.restConflicts?.length) {
    error.value = `休息日已有训练：${current.restConflicts.join('、')}。请调整开始日期，或先在日历中处理。`
    return
  }
  if (cycleDays(current.payload.pattern) && daysToSkip.value.length) {
    error.value = '循环训练不能跳过单个训练日；请同日添加或调整开始日期。'
    return
  }
  const unresolved = current.conflicts.filter(date => !conflictChoices.value[date])
  if (unresolved.length) {
    error.value = `请先处理已有安排的日期：${unresolved.join('、')}`
    return
  }
  if (!daysToAdd.value.length) {
    error.value = '请至少保留一个要加入计划的训练日。'
    return
  }
  error.value = ''
  confirmOpen.value = true
}
async function apply() {
  if (!confirmOpen.value || !draft.value || !editing.value || busy.value || !props.available) return
  confirmOpen.value = false
  const current = draft.value
  busy.value = true
  error.value = ''
  try {
    const result = await coachApi.applyPlan(
      current.id, current.version,
      current.conflicts.filter(date => conflictChoices.value[date] === 'add'),
      current.conflicts.filter(date => conflictChoices.value[date] === 'skip'),
    )
    appliedCount.value = result.created.length
    draft.value = null
    editing.value = null
    sourceRequestId.value = uuid()
    pendingRequestId.value = uuid()
    await Promise.all([workouts.setWorkouts(true), schedules.fetchAll(true)])
    await schedules.fetchForRange(current.payload.windowStart, current.payload.windowEnd)
  } catch (cause) {
    error.value = message(cause)
    // Another tab may have changed the calendar or the draft.
    const latest = await coachApi.latestPlan().catch(() => null)
    if (latest) setDraft(latest)
  } finally {
    busy.value = false
  }
}
function removeDay(index: number) {
  if (editing.value && editing.value.days.length > 1) {
    editing.value.days.splice(index, 1)
    selectedDayIndex.value = Math.min(selectedDayIndex.value, editing.value.days.length - 1)
  }
}
function addDay() {
  if (!editing.value || editing.value.days.length >= 4) return
  const used = new Set(editing.value.days.map(day => day.date))
  const start = new Date(`${editing.value.windowStart}T00:00:00Z`)
  for (let offset = 0; offset < 7; offset++) {
    const date = new Date(start.getTime() + offset * 86400000).toISOString().slice(0, 10)
    if (used.has(date)) continue
    const source = editing.value.days[editing.value.days.length - 1]!
    editing.value.days.push({
      date, title: '新增训练', minutes: source.minutes, note: '',
      exercises: source.exercises.map(item => ({ ...item })),
    })
    editing.value.days.sort((a, b) => a.date.localeCompare(b.date))
    return
  }
}
function removeExercise(dayIndex: number, index: number) {
  const items = editing.value?.days[dayIndex]?.exercises
  if (items && items.length > 2) items.splice(index, 1)
}
function addExercise(dayIndex: number) {
  const day = editing.value?.days[dayIndex]
  if (!day || !draft.value || day.exercises.length >= 8) return
  const used = new Set(day.exercises.map(item => item.exerciseId))
  const next = draft.value.exerciseOptions.find(item => !used.has(item.id))
  if (next) day.exercises.push({ exerciseId: next.id, sets: 3, reps: 10, pauseSeconds: 90 })
}
onMounted(() => {
  if (props.sourceRequest) {
    sourceMode.value = true
    sourceStep.value = 0
    sourceForm.value.pattern = props.sourceRequest.suggestedPattern
    sourceRequestId.value = props.sourceRequest.requestId
  } else void load()
})
</script>

<template>
  <div class="plan-root" :class="{ 'plan-root-compact': compact }">
    <h3>{{ cycleDays(editing?.pattern) ? `未来两周 · 练${cycleDays(editing?.pattern)}天休一天` : !draft ? '和教练确认训练需求' : '安排未来一周训练' }}</h3>
    <p v-if="!draft && !appliedCount" class="plan-hint">教练会逐项询问需要确认的信息。回答完成后先查看需求摘要，再生成训练草案。</p>
    <p v-else-if="sourceMode && !appliedCount" class="plan-hint">请核对生成草案的日期、动作和身体限制，再决定是否加入计划。</p>
    <p v-if="!draft && !appliedCount && sourceRequest?.confirmedCycle" class="plan-rest">已按你提出的“练{{ cycleDays(sourceRequest.suggestedPattern) }}天、休息一天”记录训练节奏。请确认要安排几个完整循环。</p>
    <p v-if="cycleDays(editing?.pattern)" class="plan-hint">从 {{ editing?.windowStart }} 开始，连续练 {{ cycleDays(editing?.pattern) }} 天、休息一天，排到 {{ editing?.windowEnd }}。休息日不写入训练。</p>
    <p v-if="error" class="plan-error" role="alert">{{ error }}</p>
    <p v-if="appliedCount" class="plan-success" role="status">
      已将 {{ appliedCount }} 次训练加入计划。<router-link to="/calendar" @click="emit('navigate')">查看日历</router-link>
    </p>
    <p v-if="busy && sourceRequest && !draft" class="plan-hint" role="status">正在按你确认的需求生成训练草案…</p>
    <button v-if="draft" class="plan-link" :disabled="busy" @click="draft = null; editing = null; sourceStep = sourceSteps.length">查看或修改需求</button>

    <section v-if="!draft && !appliedCount" class="plan-dialog" aria-label="教练确认训练需求">
      <div v-for="(step, index) in sourceSteps.slice(0, sourceStep)" v-show="!compact || !currentSourceStep || index === sourceStep - 1" :key="step" class="plan-exchange">
        <p class="plan-question">教练：{{ sourceQuestions[step] }}</p>
        <p class="plan-answer">你：{{ sourceAnswer(step) }} <button type="button" class="plan-link" :disabled="busy" @click="sourceStep = index">修改</button></p>
      </div>
      <div v-if="currentSourceStep" class="plan-exchange">
        <p class="plan-question">教练：{{ sourceQuestions[currentSourceStep] }}</p>
        <div v-if="currentSourceStep === 'pattern'" class="plan-choices">
          <button type="button" :class="{ selected: sourceForm.pattern === 'four_on_one_off' }" @click="sourceForm.pattern = 'four_on_one_off'; nextSourceStep()">练四天、休息一天</button>
          <button type="button" :class="{ selected: sourceForm.pattern === 'five_on_one_off' }" @click="sourceForm.pattern = 'five_on_one_off'; nextSourceStep()">练五天、休息一天</button>
          <button type="button" :class="{ selected: sourceForm.pattern === 'weekly' }" @click="sourceForm.pattern = 'weekly'; nextSourceStep()">一周内选固定训练日</button>
        </div>
        <template v-else-if="currentSourceStep === 'cycles'">
          <input v-model.number="sourceForm.cycles" aria-label="完整循环次数" type="number" min="1" max="6" step="1" placeholder="输入 1 到 6">
          <p class="plan-hint">每个循环是练 {{ cycleDays(sourceForm.pattern) }} 天、休息 1 天；{{ sourceForm.cycles || 0 }} 个循环共 {{ (sourceForm.cycles || 0) * (cycleDays(sourceForm.pattern) + 1) }} 天。</p>
        </template>
        <template v-else-if="currentSourceStep === 'startDate'">
          <input v-model="sourceForm.startDate" aria-label="开始日期" type="date" :min="beijingToday()" :max="addDays(beijingToday(), 6)">
          <p v-if="cycleDays(sourceForm.pattern)" class="plan-hint">从这天起安排 {{ sourceForm.cycles }} 个完整循环，共 {{ (sourceForm.cycles || 0) * (cycleDays(sourceForm.pattern) + 1) }} 天。</p>
        </template>
        <fieldset v-else-if="currentSourceStep === 'weekdays'">
          <label v-for="day in weekdays" :key="day.id" class="plan-weekday">
            <input type="checkbox" :checked="sourceForm.daysOfWeek.includes(day.id)" :disabled="!sourceForm.daysOfWeek.includes(day.id) && sourceForm.daysOfWeek.length >= 4" @change="toggleSourceDay(day.id)">{{ day.name }}
          </label>
        </fieldset>
        <input v-else-if="currentSourceStep === 'goal'" v-model="sourceForm.goal" aria-label="训练目标" maxlength="200" placeholder="例如：提升力量、增肌或建立运动习惯" @keydown.enter.prevent="nextSourceStep">
        <div v-else-if="currentSourceStep === 'experience'" class="plan-choices">
          <button v-for="item in experienceOptions" :key="item.value" type="button" :class="{ selected: sourceForm.experience === item.value }" @click="sourceForm.experience = item.value; nextSourceStep()">{{ item.text }}</button>
        </div>
        <input v-else-if="currentSourceStep === 'minutes'" v-model.number="sourceForm.minutes" aria-label="每次训练分钟数" type="number" min="20" max="120" @keydown.enter.prevent="nextSourceStep">
        <template v-else-if="currentSourceStep === 'equipment'">
          <input v-model="sourceForm.equipment" aria-label="可用器械" maxlength="200" placeholder="例如：哑铃、训练凳" @keydown.enter.prevent="nextSourceStep">
          <button type="button" class="plan-link" @click="sourceForm.equipment = '无'; nextSourceStep()">没有器械</button>
        </template>
        <template v-else-if="currentSourceStep === 'limitations'">
          <textarea v-model="sourceForm.limitations" aria-label="身体限制" maxlength="300" rows="2" placeholder="例如：避免深蹲；有疼痛请咨询专业人士"></textarea>
          <button type="button" class="plan-link" @click="sourceForm.limitations = '无'; nextSourceStep()">没有需要避开的</button>
        </template>
        <div class="plan-actions">
          <button v-if="sourceStep > 0" type="button" class="plan-link" @click="sourceStep--">上一题</button>
          <button v-if="needsReviewed && canGenerateNeeds" type="button" class="plan-link" @click="returnToSummary">返回需求摘要</button>
          <button v-if="currentSourceStep !== 'pattern' && currentSourceStep !== 'experience'" type="button" class="plan-primary" :disabled="!canContinueSource" @click="nextSourceStep">继续</button>
        </div>
      </div>
      <div v-else class="plan-confirm">
        <strong>教练：以上是我记录的训练需求。确认后生成草案吗？</strong>
        <p class="plan-hint">已确认需求、选中的教练回复和近期训练记录会发送至阿里云百炼。草案生成后仍需你确认才会写入日历。</p>
        <div class="plan-actions plan-action-bar">
          <button type="button" class="plan-link" :disabled="busy" @click="sourceStep--">返回修改</button>
          <button type="button" class="plan-primary" :disabled="busy || !available || !canGenerateNeeds" @click="generateFromNeeds">{{ busy ? '正在生成…' : '确认需求并生成草案' }}</button>
        </div>
      </div>
    </section>

    <template v-if="draft && editing">
      <p class="plan-summary">{{ editing.summary }}</p>
      <p v-if="compact" class="plan-hint">{{ editing.windowStart }} 至 {{ editing.windowEnd }} · {{ editing.days.length }} 次训练{{ cycleRestDates.length ? ` · ${cycleRestDates.length} 天休息` : '' }}</p>
      <div v-if="compact" class="plan-calendar-preview" aria-label="计划日期预览">
        <span v-for="item in calendarPreview" :key="item.date" :class="{ rest: item.rest }">{{ item.date.slice(5) }} {{ item.rest ? '休' : '练' }}</span>
      </div>
      <p class="plan-hint">{{ cycleDays(editing.pattern) ? `可调整动作和组数；训练日与休息日固定为练${cycleDays(editing.pattern)}休1。` : '可调整日期、动作和组数。' }}负重留空，开始训练前请按自己的情况设置。</p>
      <p v-if="cycleRestDates.length" class="plan-rest">休息日：{{ cycleRestDates.join('、') }}</p>
      <div v-if="draft.restConflicts?.length" class="plan-conflict" role="alert">
        <strong>休息日已有训练：{{ draft.restConflicts.join('、') }}</strong>
        <p>可调整开始日期，或先到<router-link to="/calendar" @click="emit('navigate')">日历</router-link>处理这些安排。系统不会自动删除原计划。</p>
        <button v-if="cycleDays(editing.pattern) && sourceRequest" class="plan-link" :disabled="busy" @click="revisitStartDate">调整开始日期</button>
        <div v-if="sourceRequest && draft.suggestedStartDates?.length" class="plan-suggestions">
          <span>这些开始日期可避开已有训练的休息日：</span>
          <button v-for="date in draft.suggestedStartDates" :key="date" class="plan-link" :disabled="busy" @click="regenerateWithStartDate(date)">从 {{ date }} 重新生成</button>
        </div>
        <button class="plan-link" :disabled="busy" @click="refreshDraft">重新检查日历</button>
      </div>
      <div v-if="compact && draft.conflicts.length" class="plan-conflict" role="alert">
        <strong>以下训练日已有安排</strong>
        <div v-for="date in draft.conflicts" :key="date" class="plan-conflict-date">
          <span>{{ date }}</span>
          <label><input v-model="conflictChoices[date]" type="radio" :name="`conflict-${date}`" value="add">同日添加</label>
          <label v-if="!cycleDays(editing.pattern)"><input v-model="conflictChoices[date]" type="radio" :name="`conflict-${date}`" value="skip">跳过</label>
        </div>
        <button v-if="cycleDays(editing.pattern) && sourceRequest" class="plan-link" :disabled="busy" @click="revisitStartDate">调整开始日期</button>
        <button v-if="cycleDays(editing.pattern) && unresolvedConflicts.length" class="plan-link" :disabled="busy" @click="addAllOnSameDay">以上训练日全部同日添加</button>
      </div>
      <button v-if="compact" class="plan-link plan-detail-toggle" :aria-expanded="detailsOpen" @click="detailsOpen = !detailsOpen">{{ detailsOpen ? '收起训练日详情' : '查看并调整训练日详情' }}</button>
      <div v-if="compact && detailsOpen" class="plan-date-strip" aria-label="选择训练日">
        <button v-for="(day, index) in editing.days" :key="day.date" :class="{ selected: selectedDayIndex === index }" @click="selectedDayIndex = index">{{ day.date.slice(5) }} · {{ index + 1 }}</button>
      </div>
      <section v-for="{ day, index: dayIndex } in (!compact || detailsOpen ? visibleDays : [])" :key="dayIndex" class="plan-day">
        <div class="plan-day-heading">
          <strong>训练 {{ dayIndex + 1 }}</strong>
          <button v-if="!cycleDays(editing.pattern)" :disabled="editing.days.length <= 1 || busy" @click="removeDay(dayIndex)">移除</button>
        </div>
        <label v-if="!cycleDays(editing.pattern)">日期<input v-model="day.date" type="date" :min="editing.windowStart" :max="editing.windowEnd"></label>
        <p v-else>日期：{{ day.date }}</p>
        <label>名称<input v-model="day.title" maxlength="80"></label>
        <label>预计分钟<input v-model.number="day.minutes" type="number" min="20" max="120"></label>
        <label>备注<textarea v-model="day.note" maxlength="300" rows="2"></textarea></label>
        <div v-for="(exercise, index) in day.exercises" :key="index" class="plan-exercise">
          <select v-model.number="exercise.exerciseId" aria-label="训练动作">
            <option v-for="option in draft.exerciseOptions" :key="option.id" :value="option.id">{{ option.name }}</option>
          </select>
          <div class="plan-exercise-values">
            <label>组<input v-model.number="exercise.sets" type="number" min="1" max="5"></label>
            <label>次<input v-model.number="exercise.reps" type="number" min="1" max="30"></label>
            <label>休息秒<input v-model.number="exercise.pauseSeconds" type="number" min="15" max="300"></label>
            <button :disabled="day.exercises.length <= 2 || busy" aria-label="移除动作" @click="removeExercise(dayIndex, index)">×</button>
          </div>
        </div>
        <button class="plan-link" :disabled="day.exercises.length >= 8 || busy" @click="addExercise(dayIndex)">添加动作</button>
        <div v-if="!compact && draft.conflicts.includes(day.date)" class="plan-conflict">
          <strong>这一天已有安排</strong>
          <label><input v-model="conflictChoices[day.date]" type="radio" :name="`conflict-${day.date}`" value="add">同日继续添加</label>
          <label v-if="!cycleDays(editing.pattern)"><input v-model="conflictChoices[day.date]" type="radio" :name="`conflict-${day.date}`" value="skip">跳过这一天</label>
        </div>
      </section>
      <button v-if="!cycleDays(editing.pattern) && (!compact || detailsOpen)" class="plan-link" :disabled="editing.days.length >= 4 || busy" @click="addDay">添加训练日</button>
      <div v-if="draft.restConflicts?.length || unresolvedConflicts.length" class="plan-conflict" role="status">
        <p v-if="draft.restConflicts?.length">暂不能确认：休息日 {{ draft.restConflicts.join('、') }} 已有训练。请在上方选择新的开始日期，或到日历处理原安排。</p>
        <p v-if="unresolvedConflicts.length">还有 {{ unresolvedConflicts.length }} 个训练日冲突需要选择处理方式。</p>
      </div>
      <p v-if="error" class="plan-error" role="alert">{{ error }}</p>
      <div class="plan-actions plan-action-bar">
        <button class="plan-primary" :disabled="busy || !available || !!draft.restConflicts?.length || !!unresolvedConflicts.length" @click="openConfirmation">{{ busy ? '正在保存…' : draft.restConflicts?.length || unresolvedConflicts.length ? '请先处理冲突' : '预览并确认加入' }}</button>
        <button v-if="dirty" :disabled="busy" @click="save">保存草案</button>
      </div>
      <section v-if="confirmOpen" class="plan-confirm" aria-label="确认加入训练计划">
        <strong>确认加入训练计划？</strong>
        <p>将创建 {{ daysToAdd.length }} 次训练，并添加到以下日期：</p>
        <ul><li v-for="day in daysToAdd" :key="day.date">{{ day.date }} · {{ day.title }} · {{ day.minutes }} 分钟<span v-if="draft.conflicts.includes(day.date)">（已有安排，同日添加）</span></li></ul>
        <p v-if="daysToSkip.length">以下日期将跳过：{{ daysToSkip.map(day => day.date).join('、') }}</p>
        <p v-if="cycleRestDates.length">固定休息日：{{ cycleRestDates.join('、') }}</p>
        <p class="plan-hint">确认后会写入日历；已有安排不会被覆盖。</p>
        <div class="plan-actions plan-action-bar">
          <button :disabled="busy" @click="confirmOpen = false">返回修改</button>
          <button class="plan-primary" :disabled="busy || !available" @click="apply">确认加入计划</button>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.plan-root { display: grid; gap: 14px; font-size: 13px; }
.plan-root h3 { font-size: 17px; }
.plan-hint { color: rgb(var(--v-theme-textSecondary)); line-height: 1.5; }
.plan-error { color: #d85a5a; }
.plan-success { color: #33825b; }
.plan-success a { color: rgb(var(--v-theme-primary)); }
.plan-rest { padding: 9px 11px; border-radius: 8px; background: rgba(var(--v-theme-primary), .1); }
.plan-day { display: grid; gap: 11px; }
.plan-dialog, .plan-exchange { display: grid; gap: 9px; }
.plan-exchange { padding: 10px; border-radius: 10px; background: rgba(var(--v-theme-on-surface), .04); }
.plan-question { font-weight: 600; line-height: 1.5; }
.plan-answer { justify-self: end; max-width: 95%; padding: 7px 9px; border-radius: 9px; background: rgba(var(--v-theme-primary), .12); line-height: 1.5; }
.plan-choices { display: flex; flex-wrap: wrap; gap: 7px; }
.plan-choices button { padding: 7px 10px; border: 1px solid rgba(var(--v-theme-on-surface), .2); border-radius: 8px; text-align: left; }
.plan-choices button.selected { border-color: rgb(var(--v-theme-primary)); color: rgb(var(--v-theme-primary)); }
.plan-calendar-preview { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 5px; }
.plan-calendar-preview span { padding: 5px 3px; border-radius: 6px; text-align: center; background: rgba(var(--v-theme-primary), .11); font-size: 11px; }
.plan-calendar-preview span.rest { background: rgba(var(--v-theme-on-surface), .08); }
.plan-date-strip { display: flex; gap: 5px; overflow-x: auto; padding-bottom: 4px; }
.plan-date-strip button { flex: 0 0 auto; padding: 6px 9px; border: 1px solid rgba(var(--v-theme-on-surface), .2); border-radius: 7px; }
.plan-date-strip button.selected { border-color: rgb(var(--v-theme-primary)); color: rgb(var(--v-theme-primary)); }
.plan-detail-toggle { justify-self: start; }
.plan-conflict-date { display: flex; flex-wrap: wrap; gap: 5px 9px; align-items: center; }
.plan-day label { display: grid; gap: 4px; }
.plan-root input:not([type='checkbox']):not([type='radio']), .plan-root select, .plan-root textarea {
  width: 100%; padding: 8px; border: 1px solid rgba(var(--v-theme-on-surface), .2);
  border-radius: 8px; background: rgb(var(--v-theme-surface)); color: rgb(var(--v-theme-on-surface));
}
.plan-root fieldset { border: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px 12px; }
.plan-root legend { margin-bottom: 7px; }
.plan-root .plan-weekday { display: inline-flex; align-items: center; gap: 3px; }
.plan-day { padding: 12px; border: 1px solid rgba(var(--v-theme-on-surface), .15); border-radius: 12px; }
.plan-day-heading, .plan-actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.plan-root-compact .plan-action-bar { position: sticky; bottom: 0; z-index: 1; padding: 8px 0; background: rgb(var(--v-theme-background)); }
.plan-day-heading button, .plan-link { color: rgb(var(--v-theme-primary)); }
.plan-primary { background: rgb(var(--v-theme-primary)); color: rgb(var(--v-theme-on-primary)); border-radius: 8px; padding: 9px 13px; }
.plan-root button:disabled { opacity: .45; cursor: default; }
.plan-summary { line-height: 1.5; }
.plan-exercise { display: grid; gap: 5px; padding: 8px; background: rgba(var(--v-theme-on-surface), .04); border-radius: 8px; }
.plan-exercise-values { display: grid; grid-template-columns: 1fr 1fr 1.4fr auto; gap: 6px; align-items: end; }
.plan-exercise-values button { font-size: 20px; min-width: 20px; }
.plan-conflict { display: grid; gap: 7px; padding: 10px; border-radius: 8px; background: rgba(235, 160, 35, .12); }
.plan-suggestions { display: flex; flex-wrap: wrap; gap: 7px 12px; align-items: center; }
.plan-suggestions span { flex-basis: 100%; }
.plan-conflict label { display: flex; align-items: center; gap: 5px; }
.plan-confirm { display: grid; gap: 9px; padding: 13px; border: 1px solid rgb(var(--v-theme-primary)); border-radius: 12px; }
.plan-confirm ul { padding-left: 19px; }
</style>
