<template>
  <div class="d-flex flex-column fill-height bg-background">
    <BackHeader :title="displayTitle" :show-menu="false" @close="emit('close')" />
    <div class="flex-grow-1 overflow-y-auto px-5 py-4">
      <v-chip color="primary" variant="outlined" size="small" class="mb-3">
        {{ $t('workoutList.publicPlans') }}
      </v-chip>
      <h1 class="text-h5 font-weight-bold mb-2">{{ displayTitle }}</h1>
      <p v-if="displayDescription" class="text-body-2 text-textSecondary mb-4">{{ displayDescription }}</p>
      <p class="text-body-2 text-textSecondary mb-4">
        {{ workout.time }} {{ $t('units.minShort') }} · {{ workout.exercises.length }} {{ $t('workoutList.exercisesUnit') }}
      </p>
      <p v-if="workout.difficulty" class="text-body-2 text-textSecondary mb-2">
        {{ $t('workoutList.difficultyLabel') }}: {{ workout.difficulty === 'beginner' ? $t('workoutList.beginner') : workout.difficulty }}
      </p>
      <p v-if="workout.equipment?.length" class="text-body-2 text-textSecondary mb-4">
        {{ $t('workoutList.equipmentLabel') }}: {{ workout.equipment.map(item => item === 'gym_machines' ? $t('workoutList.gymMachines') : item).join(', ') }}
      </p>
      <p class="text-body-2 text-textSecondary mb-5">{{ $t('workoutList.presetWeightHint') }}</p>
      <div class="d-flex flex-column ga-3">
        <v-card
          v-for="item in sortedExercises"
          :key="item.id"
          class="bg-cardBg rounded-lg pa-4"
          style="border: 1px solid rgb(var(--v-theme-borderColor)); box-shadow: none"
        >
          <div class="font-weight-bold text-textPrimary">{{ item.order }}. {{ resolveI18n(item.exercise.title, lang) }}</div>
          <div class="text-body-2 text-textSecondary mt-1">
            {{ item.sets }} × {{ item.reps }} · {{ item.weight }} kg · {{ $t('workout.pauseSeconds', { seconds: item.pauseSeconds }) }}
          </div>
        </v-card>
      </div>
    </div>
    <div class="pa-5">
      <v-btn block color="primary" size="large" :loading="adding" @click="addToMine">
        {{ $t('workoutList.addToMine') }}
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Workout } from '@/interfaces/Workout.interface'
import { dublicateWorkout } from '@/services/workout.service'
import { resolveI18n } from '@/utils/exerciseDisplay'
import { useUserLanguage } from '@/composables/useUserLanguage'
import { useI18n } from 'vue-i18n'
import { toast } from 'vuetify-sonner'

const props = defineProps<{ workout: Workout }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'added', id: number): void }>()
const { t } = useI18n({ useScope: 'global' })
const { lang } = useUserLanguage()
const adding = ref(false)
const displayTitle = computed(() => resolveI18n(props.workout.titleI18n, lang.value) || props.workout.title)
const displayDescription = computed(() => resolveI18n(props.workout.descriptionI18n, lang.value) || props.workout.description)
const sortedExercises = computed(() => [...props.workout.exercises].sort((a, b) => a.order - b.order))

async function addToMine() {
  if (adding.value) return
  adding.value = true
  try {
    const copy = await dublicateWorkout(props.workout.id)
    toast.success(t('workoutList.addedToMine'))
    emit('added', copy.id)
  } catch {
    toast.error(t('workoutList.addToMineFailed'))
  } finally {
    adding.value = false
  }
}
</script>
