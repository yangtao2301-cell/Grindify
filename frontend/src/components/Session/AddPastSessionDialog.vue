<!--
  - Copyright (c) 2026 FalkenDev
  -
  - This file is part of Grindify.
  -
  - Grindify is free software: you can redistribute it and/or modify
  - it under the terms of the GNU Affero General Public License as
  - published by the Free Software Foundation, either version 3 of
  - the License, or (at your option) any later version.
  -
  - You should have received a copy of the GNU Affero General Public
  - License along with Grindify. If not, see
  - <https://www.gnu.org/licenses/>.
  -->

<template>
  <HistoryDialog v-model="dialogOpen" history-key="calendar:add-past-session" fullscreen :scrim="false" transition="dialog-bottom-transition">
    <v-card class="bg-background d-flex flex-column" style="height: 100dvh">
<!-- 标题 -->
      <BackHeader
        :title="$t('schedule.registerWorkout')"
        :show-menu="false"
        :show-save="true"
        class="sticky-header"
        @close="close"
        @save="submit"
      />

      <div class="pa-5" style="flex: 1 1 auto; overflow-y: auto; -webkit-overflow-scrolling: touch">
<!-- 日期显示 -->
        <v-card
          class="bg-cardBg rounded-lg pa-4 mb-5"
          style="border: 1px solid rgb(var(--v-theme-borderColor)); height: fit-content !important"
        >
          <div class="d-flex align-center ga-3">
            <v-icon color="primary">mdi-calendar</v-icon>
            <div>
              <p class="text-caption text-textSecondary">{{ $t('common.date') }}</p>
              <p class="text-body-1 font-weight-bold">{{ formattedDate }}</p>
            </div>
          </div>
        </v-card>

<!-- 类型切换：训练或活动 -->
        <div class="mb-5">
          <p class="text-caption text-uppercase font-weight-bold text-textSecondary mb-2">
            {{ $t('schedule.selectType') }}
          </p>
          <v-btn-toggle
            v-model="sessionType"
            mandatory
            color="primary"
            variant="outlined"
            class="w-100"
          >
            <v-btn value="workout" class="flex-grow-1">
              <v-icon start>mdi-dumbbell</v-icon>
              {{ $t('schedule.workout') }}
            </v-btn>
            <v-btn value="activity" class="flex-grow-1">
              <v-icon start>mdi-run</v-icon>
              {{ $t('schedule.activity') }}
            </v-btn>
          </v-btn-toggle>
        </div>

<!-- ==================== 训练模式 ==================== -->
        <template v-if="sessionType === 'workout'">
          <div class="mb-5">
            <p class="text-caption text-uppercase font-weight-bold text-textSecondary mb-2">
              {{ $t('schedule.selectWorkout') }}
            </p>
            <v-list
              v-if="workoutList.length > 0"
              class="bg-cardBg rounded-lg"
              style="border: 1px solid rgb(var(--v-theme-borderColor))"
            >
              <v-list-item
                v-for="w in workoutList"
                :key="w.id"
                :active="selectedWorkoutId === w.id"
                color="primary"
                @click="selectedWorkoutId = w.id"
              >
                <template #prepend>
                  <v-icon :color="selectedWorkoutId === w.id ? 'primary' : undefined"
                    >mdi-dumbbell</v-icon
                  >
                </template>
                <v-list-item-title class="font-weight-bold">{{ w.title }}</v-list-item-title>
                <template #append>
                  <v-icon v-if="selectedWorkoutId === w.id" color="primary">mdi-check</v-icon>
                </template>
              </v-list-item>
            </v-list>
          </div>

<!-- 时间字段 -->
          <div class="d-flex ga-3 mb-5">
            <v-text-field
              v-model="startTime"
              type="time"
              :label="$t('schedule.startTime')"
              variant="outlined"
              density="compact"
              hide-details
              class="bg-cardBg rounded-lg"
            />
            <v-text-field
              v-model="endTime"
              type="time"
              :label="$t('schedule.endTime')"
              variant="outlined"
              density="compact"
              hide-details
              class="bg-cardBg rounded-lg"
            />
          </div>

<!-- 带内嵌训练组的训练动作卡片 -->
          <div v-if="selectedWorkout" class="mb-5">
            <p class="text-caption text-uppercase font-weight-bold text-textSecondary mb-2">
              {{ $t('schedule.exercises') }}
            </p>
            <v-card
              v-for="ex in selectedWorkout.exercises"
              :key="ex.id"
              class="bg-cardBg rounded-lg pa-4 mb-3"
              style="border: 1px solid rgb(var(--v-theme-borderColor)); overflow: visible"
            >
              <p class="text-body-1 font-weight-bold mb-3">{{ ex.exercise ? displayExerciseName(ex.exercise, lang) : '' }}</p>

<!-- 训练组标题行 -->
              <div class="d-flex align-center ga-2 mb-1 text-caption text-textSecondary">
                <span style="width: 40px">{{ $t('schedule.setLabel') }}</span>
                <span class="flex-grow-1">{{ $t('schedule.weight') }} (kg)</span>
                <span class="flex-grow-1">{{ $t('schedule.reps') }}</span>
                <span style="width: 40px; text-align: center">
                  <v-icon size="16">mdi-check</v-icon>
                </span>
                <span style="width: 28px"></span>
              </div>

<!-- 训练组行 -->
              <div
                v-for="(s, idx) in exerciseSets[ex.id]"
                :key="`${ex.id}-${idx}`"
                class="d-flex align-center ga-2 mb-1"
              >
                <span class="text-body-2 font-weight-bold" style="width: 40px">{{ s.set }}</span>
                <v-text-field
                  :model-value="s.weight"
                  type="text"
                  inputmode="decimal"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="flex-grow-1"
                  @update:model-value="s.weight = normalizeDecimalStr($event)"
                  @change="onWeightChange(ex.id, idx, s.weight)"
                />
                <v-text-field
                  :model-value="String(s.reps)"
                  type="text"
                  inputmode="numeric"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="flex-grow-1"
                  @update:model-value="s.reps = parseIntInput($event)"
                />
                <v-checkbox
                  v-model="s.done"
                  hide-details
                  density="compact"
                  color="primary"
                  style="width: 40px; flex: none"
                />
                <v-btn
                  icon
                  variant="text"
                  size="x-small"
                  color="error"
                  @click="removeSet(ex.id, idx)"
                >
                  <v-icon size="16">mdi-close</v-icon>
                </v-btn>
              </div>

<!-- 添加训练组按钮 -->
              <v-btn
                variant="text"
                color="primary"
                size="small"
                prepend-icon="mdi-plus"
                class="mt-2"
                @click="addSet(ex.id)"
              >
                {{ $t('session.addSet') }}
              </v-btn>
            </v-card>
          </div>
        </template>

<!-- ==================== 活动模式 ==================== -->
        <template v-if="sessionType === 'activity'">
          <div class="mb-5">
            <p class="text-caption text-uppercase font-weight-bold text-textSecondary mb-2">
              {{ $t('schedule.selectActivity') }}
            </p>
            <v-list
              v-if="activityList.length > 0"
              class="bg-cardBg rounded-lg"
              style="border: 1px solid rgb(var(--v-theme-borderColor))"
            >
              <v-list-item
                v-for="a in activityList"
                :key="a.id"
                :active="selectedActivityId === a.id"
                color="primary"
                @click="selectedActivityId = a.id"
              >
                <template #prepend>
                  <v-icon :color="selectedActivityId === a.id ? 'primary' : undefined"
                    >mdi-run</v-icon
                  >
                </template>
                <v-list-item-title class="font-weight-bold">{{ displayActivityName(a, lang) }}</v-list-item-title>
                <template #append>
                  <v-icon v-if="selectedActivityId === a.id" color="primary">mdi-check</v-icon>
                </template>
              </v-list-item>
            </v-list>
          </div>

<!-- 时长（始终显示） -->
          <v-text-field
            :model-value="activityDurationStr"
            type="text"
            inputmode="decimal"
            :label="$t('schedule.duration')"
            variant="outlined"
            density="compact"
            hide-details
            class="bg-cardBg rounded-lg mb-5"
            suffix="min"
            @update:model-value="activityDurationStr = normalizeDecimalStr($event)"
          />

<!-- 根据所选活动显示的条件跟踪字段 -->
          <template v-if="selectedActivity">
<!-- 距离 -->
            <v-text-field
              v-if="selectedActivity.trackDistance"
              :model-value="activityDistanceStr"
              type="text"
              inputmode="decimal"
              :label="$t('schedule.distance')"
              variant="outlined"
              density="compact"
              hide-details
              class="bg-cardBg rounded-lg mb-4"
              suffix="km"
              @update:model-value="activityDistanceStr = normalizeDecimalStr($event)"
            />

<!-- 计算出的配速（只读） -->
            <v-text-field
              v-if="selectedActivity.trackPace && calculatedPace"
              :model-value="calculatedPace"
              :label="$t('schedule.pace')"
              readonly
              suffix="/km"
              variant="outlined"
              density="compact"
              hide-details
              class="bg-cardBg rounded-lg mb-4"
            />

<!-- 爬升高度 -->
            <v-text-field
              v-if="selectedActivity.trackElevation"
              :model-value="activityElevationGainStr"
              type="text"
              inputmode="decimal"
              :label="$t('schedule.elevationGain')"
              variant="outlined"
              density="compact"
              hide-details
              class="bg-cardBg rounded-lg mb-4"
              suffix="m"
              @update:model-value="activityElevationGainStr = normalizeDecimalStr($event)"
            />

<!-- 最高海拔 -->
            <v-text-field
              v-if="selectedActivity.trackElevation"
              :model-value="activityMaxElevationStr"
              type="text"
              inputmode="decimal"
              :label="$t('schedule.maxElevation')"
              variant="outlined"
              density="compact"
              hide-details
              class="bg-cardBg rounded-lg mb-4"
              suffix="m"
              @update:model-value="activityMaxElevationStr = normalizeDecimalStr($event)"
            />

<!-- 卡路里 -->
            <v-text-field
              v-if="selectedActivity.trackCalories"
              :model-value="activityCaloriesStr"
              type="text"
              inputmode="decimal"
              :label="$t('schedule.calories')"
              variant="outlined"
              density="compact"
              hide-details
              class="bg-cardBg rounded-lg mb-4"
              suffix="kcal"
              @update:model-value="activityCaloriesStr = normalizeDecimalStr($event)"
            />
          </template>
        </template>

<!-- 备注（共享） -->
        <div class="pb-6">
          <p class="text-caption text-uppercase font-weight-bold text-textSecondary mb-2">
            {{ $t('schedule.notes') }}
          </p>
          <v-textarea
            v-model="notesText"
            variant="outlined"
            density="compact"
            rows="2"
            hide-details
            class="bg-cardBg rounded-lg"
            :placeholder="$t('schedule.noNotes')"
          />
        </div>
      </div>

<!-- 体重同步对话框 -->
      <v-dialog v-model="showPropagateDialog" max-width="500" persistent>
        <v-card>
          <v-card-title>{{ $t('session.updateSubsequentSets') }}</v-card-title>
          <v-card-text>
            {{
              $t('session.updateSetsPrompt', {
                sets: propagateSetsLabel,
                weight: pendingWeight,
                reps: pendingReps,
              })
            }}
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn color="grey" variant="text" @click="confirmPropagate(false)">
              {{ $t('session.noJustThisOne') }}
            </v-btn>
            <v-btn color="primary" variant="text" @click="confirmPropagate(true)">
              {{ $t('session.yesUpdateAll') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-card>
  </HistoryDialog>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { useWorkoutStore } from '@/stores/workout.store'
import { useActivityStore } from '@/stores/activity.store'
import { logPastWorkoutSession } from '@/services/workoutSession.service'
import { createActivityLog } from '@/services/activityLog.service'
import type { Activity } from '@/interfaces/Activity.interface'
import type { Workout } from '@/interfaces/Workout.interface'
import { parseDecimalInput, parseIntInput, normalizeDecimalStr } from '@/utils/decimalInput'
import { displayExerciseName, displayActivityName } from '@/utils/exerciseDisplay'
import { useUserLanguage } from '@/composables/useUserLanguage'
import { useUnsavedChanges } from '@/composables/useUnsavedChanges'

interface InlineSet {
  set: number
weight: string // 以字符串存储，以支持输入中的小数形式，例如“90.”
  reps: number
  done: boolean
}

const props = defineProps<{
  modelValue: boolean
date: string // YYYY-MM-DD
  preselectedType?: 'workout' | 'activity'
  preselectedWorkoutId?: number | null
  preselectedActivityId?: number | null
  preselectedScheduledSessionId?: number | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'session-added': []
}>()

const dialogOpen = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val),
})

const { locale } = useI18n()
const { lang } = useUserLanguage()

const workoutStore = useWorkoutStore()
const activityStore = useActivityStore()

// --- 共享状态 ---
const sessionType = ref<'workout' | 'activity'>('workout')
const notesText = ref('')
const isSubmitting = ref(false)
const initialValues = ref('')

// --- 训练状态 ---
const selectedWorkoutId = ref<number | null>(null)
const startTime = ref('09:00')
const endTime = ref('10:00')
const exerciseSets = reactive<Record<number, InlineSet[]>>({})

// --- 体重同步状态 ---
const showPropagateDialog = ref(false)
const pendingExId = ref<number | null>(null)
const pendingSetIndex = ref<number | null>(null)
const pendingWeight = ref(0)
const pendingReps = ref(0)
const propagateSetsLabel = computed(() => {
  if (pendingExId.value == null || pendingSetIndex.value == null) return ''
  const sets = exerciseSets[pendingExId.value] || []
  const indices = sets.slice(pendingSetIndex.value + 1).map(s => s.set)
  if (indices.length === 0) return ''
  if (indices.length === 1) return indices[0].toString()
  if (locale.value === 'zh-CN') return indices.join('、')
  const last = indices.pop()
  return indices.join(', ') + ' & ' + last
})

// --- 活动状态 ---
const selectedActivityId = ref<number | null>(null)
const activityDuration = ref(30)
const activityDistance = ref<number | undefined>(undefined)
const activityElevationGain = ref<number | undefined>(undefined)
const activityMaxElevation = ref<number | undefined>(undefined)
const activityCalories = ref<number | undefined>(undefined)

// 活动小数输入字段的字符串引用
const activityDurationStr = ref('30')
const activityDistanceStr = ref('')
const activityElevationGainStr = ref('')
const activityMaxElevationStr = ref('')
const activityCaloriesStr = ref('')

function currentValues() {
  return JSON.stringify({
    sessionType: sessionType.value,
    notesText: notesText.value,
    selectedWorkoutId: selectedWorkoutId.value,
    startTime: startTime.value,
    endTime: endTime.value,
    exerciseSets: Object.fromEntries(
      Object.entries(exerciseSets)
        .sort(([left], [right]) => Number(left) - Number(right))
        .map(([id, sets]) => [id, sets.map(set => ({ ...set }))]),
    ),
    selectedActivityId: selectedActivityId.value,
    activityDurationStr: activityDurationStr.value,
    activityDistanceStr: activityDistanceStr.value,
    activityElevationGainStr: activityElevationGainStr.value,
    activityMaxElevationStr: activityMaxElevationStr.value,
    activityCaloriesStr: activityCaloriesStr.value,
  })
}

function saveBaseline() {
  initialValues.value = currentValues()
}

function resetForm() {
  sessionType.value = props.preselectedType || 'workout'
  notesText.value = ''
  selectedWorkoutId.value = props.preselectedWorkoutId ?? null
  startTime.value = '09:00'
  endTime.value = '10:00'
  selectedActivityId.value = props.preselectedActivityId ?? null
  activityDuration.value = 30
  activityDistance.value = undefined
  activityElevationGain.value = undefined
  activityMaxElevation.value = undefined
  activityCalories.value = undefined
  activityDurationStr.value = '30'
  activityDistanceStr.value = ''
  activityElevationGainStr.value = ''
  activityMaxElevationStr.value = ''
  activityCaloriesStr.value = ''
  showPropagateDialog.value = false
  Object.keys(exerciseSets).forEach(key => delete exerciseSets[Number(key)])
  saveBaseline()
}

const isDirty = computed(() => currentValues() !== initialValues.value)

// --- 计算属性 ---
const formattedDate = computed(() => {
  const d = new Date(props.date + 'T12:00:00')
  return d.toLocaleDateString(locale.value, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
})

const workoutList = computed(() => workoutStore.workouts || [])
const activityList = computed(() => activityStore.activities || [])

const selectedWorkout = computed<Workout | undefined>(() =>
  workoutList.value.find((w: Workout) => w.id === selectedWorkoutId.value)
)

const selectedActivity = computed<Activity | undefined>(() =>
  activityList.value.find((a: Activity) => a.id === selectedActivityId.value)
)

const calculatedPace = computed(() => {
  const dur = parseDecimalInput(activityDurationStr.value)
  const dist = parseDecimalInput(activityDistanceStr.value)
  if (!dur || !dist) return null
  const paceMinutes = dur / dist
  const minutes = Math.floor(paceMinutes)
  const seconds = Math.round((paceMinutes - minutes) * 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

const canSubmit = computed(() => {
  if (sessionType.value === 'workout') {
    return !!selectedWorkoutId.value && !!startTime.value && !!endTime.value
  } else {
    return !!selectedActivityId.value && parseDecimalInput(activityDurationStr.value) > 0
  }
})

// --- 监听器 ---
watch(dialogOpen, async open => {
  if (open) {
    resetForm()

    await Promise.all([workoutStore.setWorkouts(), activityStore.fetchActivities()])

// store 数据加载后重新应用预选 ID（监听器会触发训练组填充）
    if (props.preselectedType === 'workout' && props.preselectedWorkoutId) {
      selectedWorkoutId.value = props.preselectedWorkoutId
    } else if (props.preselectedType === 'activity' && props.preselectedActivityId) {
      selectedActivityId.value = props.preselectedActivityId
    }
    await nextTick()
    saveBaseline()
  } else {
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')))
  }
})

watch(sessionType, () => {
  selectedWorkoutId.value = null
  selectedActivityId.value = null
  Object.keys(exerciseSets).forEach(k => delete exerciseSets[Number(k)])
})

// 选择训练后，根据训练模板填充内嵌训练组
watch(selectedWorkoutId, () => {
  const workout = selectedWorkout.value
// 清除旧训练组
  Object.keys(exerciseSets).forEach(k => delete exerciseSets[Number(k)])
  if (!workout) return
  for (const ex of workout.exercises) {
    const sets: InlineSet[] = []
    for (let i = 1; i <= ex.sets; i++) {
      sets.push({
        set: i,
        weight: String(ex.weight),
        reps: ex.reps,
        done: true,
      })
    }
    exerciseSets[ex.id] = sets
  }
})

// 活动改变时重置跟踪字段
watch(selectedActivityId, () => {
  activityDistance.value = undefined
  activityElevationGain.value = undefined
  activityMaxElevation.value = undefined
  activityCalories.value = undefined
})

function close() {
  dialogOpen.value = false
}

function addSet(exId: number) {
  const sets = exerciseSets[exId]
  if (!sets) return
  const lastSet = sets[sets.length - 1]
  sets.push({
    set: sets.length + 1,
    weight: lastSet?.weight ?? '0',
    reps: lastSet?.reps ?? 0,
    done: true,
  })
}

function removeSet(exId: number, idx: number) {
  const sets = exerciseSets[exId]
  if (!sets || sets.length <= 1) return
  sets.splice(idx, 1)
  sets.forEach((s, i) => {
    s.set = i + 1
  })
}

function onWeightChange(exId: number, idx: number, newWeightStr: string) {
  const sets = exerciseSets[exId]
  if (!sets) return
  const subsequentSets = sets.slice(idx + 1)
  if (subsequentSets.length > 0) {
    pendingExId.value = exId
    pendingSetIndex.value = idx
    pendingWeight.value = parseDecimalInput(newWeightStr)
    pendingReps.value = sets[idx].reps
    showPropagateDialog.value = true
  }
}

function confirmPropagate(shouldPropagate: boolean) {
  if (shouldPropagate && pendingExId.value != null && pendingSetIndex.value != null) {
    const sets = exerciseSets[pendingExId.value]
    if (sets) {
      for (let i = pendingSetIndex.value + 1; i < sets.length; i++) {
        sets[i].weight = String(pendingWeight.value)
        sets[i].reps = pendingReps.value
      }
    }
  }
  showPropagateDialog.value = false
  pendingExId.value = null
  pendingSetIndex.value = null
}

async function submit(closeAfterSave = true): Promise<boolean> {
  if (!canSubmit.value || isSubmitting.value) return false
  isSubmitting.value = true

  try {
    if (sessionType.value === 'workout') {
      const startedAt = new Date(`${props.date}T${startTime.value}:00`).toISOString()
      const endedAt = new Date(`${props.date}T${endTime.value}:00`).toISOString()

// 根据已完成的训练组构建 completedExercises
      const completedExercises: {
        exerciseId: number
        sets: { setNumber: number; weight: number; reps: number }[]
      }[] = []
      const workout = selectedWorkout.value
      if (workout) {
        for (const ex of workout.exercises) {
          const sets = exerciseSets[ex.id]
          if (!sets) continue
          const doneSets = sets.filter(s => s.done)
          if (doneSets.length > 0) {
            completedExercises.push({
              exerciseId: ex.exercise.id,
              sets: doneSets.map(s => ({
                setNumber: s.set,
                weight: parseDecimalInput(s.weight),
                reps: s.reps,
              })),
            })
          }
        }
      }

      await logPastWorkoutSession({
        workoutId: selectedWorkoutId.value!,
        startedAt,
        endedAt,
        notes: notesText.value || undefined,
        scheduledSessionId: props.preselectedScheduledSessionId ?? undefined,
        completedExercises: completedExercises.length > 0 ? completedExercises : undefined,
      })
    } else {
      await createActivityLog({
        activityId: selectedActivityId.value!,
        date: props.date,
        duration: parseDecimalInput(activityDurationStr.value),
        distance: activityDistanceStr.value
          ? parseDecimalInput(activityDistanceStr.value)
          : undefined,
        elevationGain: activityElevationGainStr.value
          ? parseDecimalInput(activityElevationGainStr.value)
          : undefined,
        maxElevation: activityMaxElevationStr.value
          ? parseDecimalInput(activityMaxElevationStr.value)
          : undefined,
        calories: activityCaloriesStr.value
          ? parseDecimalInput(activityCaloriesStr.value)
          : undefined,
        notes: notesText.value || undefined,
        scheduledSessionId: props.preselectedScheduledSessionId ?? undefined,
      })
    }

    emit('session-added')
    saveBaseline()
    if (closeAfterSave) close()
    return true
  } catch (error) {
    console.error('Failed to log past session:', error)
    return false
  } finally {
    isSubmitting.value = false
  }
}

useUnsavedChanges({
  key: 'calendar:add-past-session',
  layerKey: 'calendar:add-past-session',
  isDirty,
  save: () => submit(false),
  discard: resetForm,
})
</script>
