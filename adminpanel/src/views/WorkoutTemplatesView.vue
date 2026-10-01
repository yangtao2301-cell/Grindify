<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { adminApi, type AdminMuscleGroup, type CreateGlobalWorkoutPayload, type GlobalExercise, type GlobalWorkout } from '@/services/adminApi'
import { ApiError } from '@/services/api'

type Lang = 'default' | 'eng' | 'zho' | 'swe'
type TemplateExercise = CreateGlobalWorkoutPayload['exercises'][number]
type TemplateForm = {
  titles: Record<Lang, string>
  descriptions: Record<Lang, string>
  time: number
  type: string
  status: 'draft' | 'published' | 'archived'
  difficulty: string
  goal: string
  equipmentText: string
  targetMuscleGroupIds: number[]
  exercises: TemplateExercise[]
}

const langs: Lang[] = ['default', 'eng', 'zho', 'swe']
const workouts = ref<GlobalWorkout[]>([])
const exercises = ref<GlobalExercise[]>([])
const muscleGroups = ref<AdminMuscleGroup[]>([])
const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const error = ref('')
const search = ref('')
const dialogOpen = ref(false)
const editingId = ref<number | null>(null)
const deleteId = ref<number | null>(null)

function emptyForm(): TemplateForm {
  return {
    titles: { default: '', eng: '', zho: '', swe: '' },
    descriptions: { default: '', eng: '', zho: '', swe: '' },
    time: 35, type: 'strength', status: 'draft', difficulty: 'beginner',
    goal: 'general_fitness', equipmentText: 'gym_machines',
    targetMuscleGroupIds: [], exercises: [],
  }
}
const form = ref<TemplateForm>(emptyForm())
const filtered = computed(() => workouts.value.filter(workout => {
  const query = search.value.trim().toLowerCase()
  return !query || [workout.title, workout.titleI18n?.zho, workout.titleI18n?.eng]
    .some(value => value?.toLowerCase().includes(query))
}))

async function fetchAll() {
  loading.value = true
  error.value = ''
  try {
    ;[workouts.value, exercises.value, muscleGroups.value] = await Promise.all([
      adminApi.getGlobalWorkouts(), adminApi.getGlobalExercises(), adminApi.getMuscleGroups(),
    ])
  } catch (cause) {
    error.value = cause instanceof ApiError ? cause.message : 'Failed to load templates'
  } finally {
    loading.value = false
  }
}
onMounted(fetchAll)

function openCreate() {
  editingId.value = null
  form.value = emptyForm()
  error.value = ''
  dialogOpen.value = true
}

function openEdit(workout: GlobalWorkout) {
  editingId.value = workout.id
  form.value = {
    titles: {
      default: workout.titleI18n?.default ?? workout.title,
      eng: workout.titleI18n?.eng ?? '', zho: workout.titleI18n?.zho ?? '', swe: workout.titleI18n?.swe ?? '',
    },
    descriptions: {
      default: workout.descriptionI18n?.default ?? workout.description ?? '',
      eng: workout.descriptionI18n?.eng ?? '', zho: workout.descriptionI18n?.zho ?? '', swe: workout.descriptionI18n?.swe ?? '',
    },
    time: workout.time,
    type: workout.type ?? 'strength',
    status: workout.status,
    difficulty: workout.difficulty ?? 'beginner',
    goal: workout.goal ?? 'general_fitness',
    equipmentText: (workout.equipment ?? []).join(', '),
    targetMuscleGroupIds: workout.targetMuscleGroups?.map(muscle => muscle.id) ?? [],
    exercises: [...workout.exercises].sort((a, b) => a.order - b.order).map((item, index) => ({
      exerciseId: item.exercise.id, order: index + 1, sets: item.sets, reps: item.reps,
      weight: Number(item.weight), pauseSeconds: item.pauseSeconds,
      distance: item.distance ?? undefined,
    })),
  }
  error.value = ''
  dialogOpen.value = true
}

function addExercise() {
  const selected = new Set(form.value.exercises.map(item => item.exerciseId))
  const next = exercises.value.find(exercise => !selected.has(exercise.id))
  if (!next) return
  form.value.exercises.push({ exerciseId: next.id, order: form.value.exercises.length + 1, sets: 2, reps: 10, weight: 0, pauseSeconds: 60 })
}

function removeExercise(index: number) {
  form.value.exercises.splice(index, 1)
  form.value.exercises.forEach((item, position) => { item.order = position + 1 })
}

function moveExercise(index: number, delta: number) {
  const next = index + delta
  if (next < 0 || next >= form.value.exercises.length) return
  ;[form.value.exercises[index], form.value.exercises[next]] = [form.value.exercises[next], form.value.exercises[index]]
  form.value.exercises.forEach((item, position) => { item.order = position + 1 })
}

async function save() {
  const title = form.value.titles.default.trim()
  if (!title || !form.value.exercises.length || Number(form.value.time) < 1) {
    error.value = 'Enter a default title, duration and at least one exercise.'
    return
  }
  const payload: CreateGlobalWorkoutPayload = {
    title,
    description: form.value.descriptions.default,
    titleI18n: { ...form.value.titles, default: title },
    descriptionI18n: { ...form.value.descriptions },
    time: Number(form.value.time), type: form.value.type,
    status: form.value.status, difficulty: form.value.difficulty,
    goal: form.value.goal,
    equipment: form.value.equipmentText.split(',').map(value => value.trim()).filter(Boolean),
    targetMuscleGroupIds: form.value.targetMuscleGroupIds,
    exercises: form.value.exercises.map((item, index) => ({
      exerciseId: Number(item.exerciseId), order: index + 1,
      sets: Number(item.sets), reps: Number(item.reps), weight: Number(item.weight),
      setWeights: Array(Number(item.sets)).fill(Number(item.weight)),
      pauseSeconds: Number(item.pauseSeconds),
      ...(item.distance != null ? { distance: Number(item.distance) } : {}),
    })),
  }
  saving.value = true
  error.value = ''
  try {
    if (editingId.value === null) await adminApi.createGlobalWorkout(payload)
    else await adminApi.updateGlobalWorkout(editingId.value, payload)
    dialogOpen.value = false
    await fetchAll()
  } catch (cause) {
    error.value = cause instanceof ApiError ? cause.message : 'Failed to save template'
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  if (deleteId.value === null) return
  deleting.value = true
  error.value = ''
  try {
    await adminApi.deleteGlobalWorkout(deleteId.value)
    deleteId.value = null
    await fetchAll()
  } catch (cause) {
    error.value = cause instanceof ApiError ? cause.message : 'Failed to delete template'
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="page-head">
    <div class="titles"><h1>Workout Templates</h1><p>Manage single-session plans visible to all users</p></div>
    <button class="btn-primary" @click="openCreate">+ New Template</button>
  </div>
  <input v-model="search" class="mb-4 p-2 bg-surface border border-border-2 rounded-chip text-text" placeholder="Search templates…" />
  <p v-if="error && !dialogOpen" class="text-red text-sm mb-3">{{ error }}</p>
  <div class="bg-surface border border-border rounded-card overflow-hidden">
    <div v-if="loading" class="p-6 text-dim">Loading…</div>
    <table v-else class="w-full text-sm">
      <thead><tr class="border-b border-border text-left text-dim"><th class="p-3">Template</th><th class="p-3">Status</th><th class="p-3">Duration</th><th class="p-3">Exercises</th><th class="p-3">Actions</th></tr></thead>
      <tbody>
        <tr v-for="workout in filtered" :key="workout.id" class="border-b border-border">
          <td class="p-3"><strong>{{ workout.titleI18n?.default || workout.title }}</strong><div class="text-xs text-dim">{{ workout.titleI18n?.zho }}</div></td>
          <td class="p-3 capitalize">{{ workout.status }}</td><td class="p-3">{{ workout.time }} min</td><td class="p-3">{{ workout.exercises.length }}</td>
          <td class="p-3"><button class="btn-secondary mr-2" @click="openEdit(workout)">Edit</button><button class="btn-secondary text-red" @click="deleteId = workout.id">Delete</button></td>
        </tr>
        <tr v-if="!filtered.length"><td colspan="5" class="p-6 text-dim text-center">No templates found.</td></tr>
      </tbody>
    </table>
  </div>

  <div v-if="dialogOpen" class="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" @click.self="dialogOpen = false">
    <div class="bg-surface border border-border rounded-card p-5 w-full max-w-4xl max-h-[92vh] overflow-y-auto">
      <div class="flex justify-between mb-4"><h2 class="font-bold text-lg">{{ editingId === null ? 'New Template' : 'Edit Template' }}</h2><button @click="dialogOpen = false">✕</button></div>
      <p v-if="error" class="text-red text-sm mb-3">{{ error }}</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <label v-for="lang in langs" :key="`title-${lang}`" class="text-xs text-dim">Title ({{ lang }})<input v-model="form.titles[lang]" class="mt-1 w-full p-2 bg-bg border border-border-2 rounded-chip text-text" /></label>
        <label v-for="lang in langs" :key="`desc-${lang}`" class="text-xs text-dim">Description ({{ lang }})<input v-model="form.descriptions[lang]" class="mt-1 w-full p-2 bg-bg border border-border-2 rounded-chip text-text" /></label>
        <label class="text-xs text-dim">Duration (min)<input v-model.number="form.time" type="number" min="1" class="mt-1 w-full p-2 bg-bg border border-border-2 rounded-chip text-text" /></label>
        <label class="text-xs text-dim">Type<select v-model="form.type" class="mt-1 w-full p-2 bg-bg border border-border-2 rounded-chip text-text"><option v-for="type in ['strength', 'cardio', 'hiit', 'flexibility', 'endurance']" :key="type">{{ type }}</option></select></label>
        <label class="text-xs text-dim">Status<select v-model="form.status" class="mt-1 w-full p-2 bg-bg border border-border-2 rounded-chip text-text"><option>draft</option><option>published</option><option>archived</option></select></label>
        <label class="text-xs text-dim">Difficulty<select v-model="form.difficulty" class="mt-1 w-full p-2 bg-bg border border-border-2 rounded-chip text-text"><option>beginner</option><option>intermediate</option><option>advanced</option></select></label>
        <label class="text-xs text-dim">Goal<input v-model="form.goal" class="mt-1 w-full p-2 bg-bg border border-border-2 rounded-chip text-text" /></label>
        <label class="text-xs text-dim">Equipment (comma separated)<input v-model="form.equipmentText" class="mt-1 w-full p-2 bg-bg border border-border-2 rounded-chip text-text" /></label>
      </div>
      <h3 class="font-semibold mb-2">Target muscle groups</h3>
      <div class="flex gap-3 flex-wrap text-xs mb-4"><label v-for="muscle in muscleGroups" :key="muscle.id" class="flex items-center gap-1"><input v-model="form.targetMuscleGroupIds" type="checkbox" :value="muscle.id" />{{ muscle.name }}</label></div>
      <div class="flex justify-between mb-2"><h3 class="font-semibold">Exercises</h3><button class="btn-secondary" @click="addExercise">+ Add exercise</button></div>
      <div v-for="(item, index) in form.exercises" :key="index" class="border border-border rounded-chip p-3 mb-2">
        <div class="flex gap-2 mb-2"><span>{{ index + 1 }}.</span><select v-model.number="item.exerciseId" class="flex-1 p-1 bg-bg border border-border-2 rounded-chip text-text"><option v-for="exercise in exercises" :key="exercise.id" :value="exercise.id">{{ exercise.title?.default }}</option></select><button :disabled="index === 0" @click="moveExercise(index, -1)">↑</button><button :disabled="index === form.exercises.length - 1" @click="moveExercise(index, 1)">↓</button><button class="text-red" @click="removeExercise(index)">✕</button></div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <label>Sets<input v-model.number="item.sets" type="number" min="1" class="mt-1 w-full p-1 bg-bg border border-border-2 rounded-chip text-text" /></label>
          <label>Reps<input v-model.number="item.reps" type="number" min="1" class="mt-1 w-full p-1 bg-bg border border-border-2 rounded-chip text-text" /></label>
          <label>Weight (kg)<input v-model.number="item.weight" type="number" min="0" step="0.5" class="mt-1 w-full p-1 bg-bg border border-border-2 rounded-chip text-text" /></label>
          <label>Rest (sec)<input v-model.number="item.pauseSeconds" type="number" min="0" class="mt-1 w-full p-1 bg-bg border border-border-2 rounded-chip text-text" /></label>
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-5"><button class="btn-secondary" @click="dialogOpen = false">Cancel</button><button class="btn-primary" :disabled="saving" @click="save">{{ saving ? 'Saving…' : 'Save template' }}</button></div>
    </div>
  </div>
  <div v-if="deleteId !== null" class="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
    <div class="bg-surface border border-border rounded-card p-6 max-w-sm w-full"><h2 class="font-bold mb-2">Delete template?</h2><p class="text-sm text-dim mb-4">Existing personal copies remain available.</p><div class="flex justify-end gap-2"><button class="btn-secondary" @click="deleteId = null">Cancel</button><button class="btn-primary" :disabled="deleting" @click="confirmDelete">Delete</button></div></div>
  </div>
</template>
