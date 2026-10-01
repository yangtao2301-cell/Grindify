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
  <div class="d-flex flex-column fill-height bg-background content-scroll">
    <BackHeader :title="$t('exerciseForm.createTitle')" :show-menu="false" @close="emit('close')" />

    <v-form ref="formRef" class="mx-5 mt-2 pb-10">
<!-- 训练动作名称 -->
      <v-text-field
        v-model="form.name"
        :label="$t('exerciseForm.nameLabel')"
        variant="outlined"
        required
        :rules="[v => !!v || $t('exerciseForm.nameRequired')]"
      />

<!-- 关于/描述（可选） -->
      <v-textarea
        v-model="form.description"
        :label="$t('exerciseForm.aboutLabel')"
        variant="outlined"
        rows="2"
        auto-grow
        class="mt-1"
      />

<!-- 训练动作类型 -->
      <div class="mt-4">
        <p class="text-body-2 text-textSecondary mb-2">
          {{ $t('exerciseForm.exerciseTypeLabel') }}
        </p>
        <v-chip-group v-model="form.exerciseType" selected-class="bg-primary">
          <v-chip
            v-for="item in exerciseTypeItems"
            :key="item.value"
            :value="item.value"
            variant="outlined"
          >
            {{ $t(`exercise.types.${item.value}`) }}
          </v-chip>
        </v-chip-group>
      </div>

<!-- 目标肌群 -->
      <FullscreenListSelect
        v-model="form.muscleGroupIds"
        history-key="create-exercise:muscle-groups"
        :label="$t('exerciseForm.muscleGroupsLabel')"
        :items="muscleGroupItems.map(g => ({ title: g.name, value: g.id }))"
        multiple
        class="mt-6"
      />

<!-- 主要肌群 -->
      <FullscreenListSelect
        v-model="form.primaryMuscleGroupIds"
        history-key="create-exercise:primary-muscles"
        :label="$t('exerciseForm.primaryMuscleLabel')"
        :items="selectedMuscleGroupItems.map(g => ({ title: g.name, value: g.id }))"
        multiple
        class="mt-6"
        :disabled="form.muscleGroupIds.length === 0"
      />

<!-- 器械（标签输入） -->
      <div class="mt-4">
        <p class="text-body-2 text-textSecondary mb-2">{{ $t('exerciseForm.equipmentLabel') }}</p>
        <ChipTextInput
          v-model="form.equipment"
          :placeholder="$t('exerciseForm.equipmentPlaceholder')"
        />
      </div>

<!-- 媒体上传 -->
      <div class="mt-2">
        <p class="text-body-2 text-textSecondary mb-2">{{ $t('exerciseForm.mediaLabel') }}</p>
        <MediaUpload v-model="newMediaItems" />
      </div>

<!-- 操作方法（可拖动列表） -->
      <div class="mt-6">
        <p class="text-body-2 text-textSecondary mb-2">
          {{ $t('exerciseForm.instructionsLabel') }}
        </p>
        <DraggableTextList
          v-model="form.instructions"
          :placeholder="$t('exerciseForm.instructionsPlaceholder')"
          icon="mdi-numeric"
          numbered
        />
      </div>

<!-- 专业提示（可拖动列表） -->
      <div class="mt-6">
        <p class="text-body-2 text-textSecondary mb-2">{{ $t('exerciseForm.proTipsLabel') }}</p>
        <DraggableTextList
          v-model="form.proTips"
          :placeholder="$t('exerciseForm.proTipsPlaceholder')"
          icon="mdi-lightbulb-on-outline"
          icon-color="primary"
        />
      </div>

<!-- 避免这些错误（可拖动列表） -->
      <div class="mt-6">
        <p class="text-body-2 text-textSecondary mb-2">{{ $t('exerciseForm.mistakesLabel') }}</p>
        <DraggableTextList
          v-model="form.mistakes"
          :placeholder="$t('exerciseForm.mistakesPlaceholder')"
          icon="mdi-close"
          icon-color="error"
        />
      </div>

<!-- 创建按钮 -->
      <v-btn
        color="primary"
        class="w-100 mt-8"
        size="large"
        :loading="isCreating"
        @click="createNewExercise"
      >
        {{ $t('exerciseForm.createButton') }}
      </v-btn>
    </v-form>
  </div>
</template>

<script setup lang="ts">
import type { ExerciseType } from '@/interfaces/Exercise.interface'
import type { MediaItem } from '@/components/basicUI/MediaUpload.vue'
import { createExercise, uploadExerciseMedia } from '@/services/exercise.service'
import { useMuscleGroupStore } from '@/stores/muscleGroup.store'
import { useExerciseStore } from '@/stores/exercise.store'
import { toast } from 'vuetify-sonner'
import { useI18n } from 'vue-i18n'
import { useUnsavedChanges } from '@/composables/useUnsavedChanges'

const props = withDefaults(defineProps<{ historyKey?: string }>(), {
  historyKey: 'exercise-picker:create',
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const exerciseStore = useExerciseStore()
const muscleGroupStore = useMuscleGroupStore()
const isCreating = ref(false)
const newMediaItems = ref<MediaItem[]>([])
const { t } = useI18n({ useScope: 'global' })

const exerciseTypeItems = [
  { value: 'compound' as ExerciseType },
  { value: 'isolation' as ExerciseType },
  { value: 'bodyweight' as ExerciseType },
]

const form = ref({
  name: '',
  description: '',
  exerciseType: null as ExerciseType | null | undefined,
  muscleGroupIds: [] as number[],
  primaryMuscleGroupIds: [] as number[],
  equipment: [] as string[],
  instructions: [] as string[],
  proTips: [] as string[],
  mistakes: [] as string[],
})

const initialForm = ref('')
const currentFormSnapshot = () =>
  JSON.stringify({
    form: form.value,
    media: newMediaItems.value.map(item => ({
      id: item.id,
      url: item.url,
      name: item.file?.name,
      size: item.file?.size,
    })),
  })
initialForm.value = currentFormSnapshot()
const isDirty = computed(() => currentFormSnapshot() !== initialForm.value)

const muscleGroupItems = computed(() =>
  muscleGroupStore.muscleGroups.map(g => ({ name: t(`muscleGroups.${g.name}`), id: g.id }))
)

const selectedMuscleGroupItems = computed(() =>
  muscleGroupItems.value.filter(g => form.value.muscleGroupIds.includes(g.id))
)

// 统一标签组取消选择的值：取消选择时 v-chip-group 会发送 undefined，但我们的类型是 ExerciseType | null
watch(
  () => form.value.exerciseType,
  v => {
    if (v === undefined) form.value.exerciseType = null
  }
)

watch(
  () => form.value.muscleGroupIds,
  ids => {
    form.value.primaryMuscleGroupIds = form.value.primaryMuscleGroupIds.filter(id =>
      ids.includes(id)
    )
  }
)

const resetForm = () => {
  form.value = {
    name: '',
    description: '',
    exerciseType: null as ExerciseType | null | undefined,
    muscleGroupIds: [],
    primaryMuscleGroupIds: [],
    equipment: [],
    instructions: [],
    proTips: [],
    mistakes: [],
  }
  newMediaItems.value = []
  initialForm.value = currentFormSnapshot()
}

useUnsavedChanges({
  key: 'create-exercise',
  layerKey: props.historyKey,
  isDirty,
  save: () => createNewExercise(false),
  discard: resetForm,
})

const createNewExercise = async (closeAfterSave = true): Promise<boolean> => {
  if (!form.value.name.trim()) {
    toast.error(t('exerciseForm.nameRequired'), { progressBar: true, duration: 1000 })
    return false
  }

  isCreating.value = true
  try {
    const payload = {
      name: form.value.name.trim(),
      description: form.value.description.trim() || undefined,
      exerciseType: form.value.exerciseType || undefined,
      muscleGroupIds: form.value.muscleGroupIds,
      primaryMuscleGroupIds: form.value.primaryMuscleGroupIds.length > 0 ? form.value.primaryMuscleGroupIds : undefined,
      equipment: form.value.equipment.length > 0 ? form.value.equipment : undefined,
      instructions:
        form.value.instructions.filter(s => s.trim() !== '').length > 0
          ? form.value.instructions.filter(s => s.trim() !== '')
          : undefined,
      proTips:
        form.value.proTips.filter(s => s.trim() !== '').length > 0
          ? form.value.proTips.filter(s => s.trim() !== '')
          : undefined,
      mistakes:
        form.value.mistakes.filter(s => s.trim() !== '').length > 0
          ? form.value.mistakes.filter(s => s.trim() !== '')
          : undefined,
    }

    const response = await createExercise(payload)

    if (response) {
// 上传媒体项目
      for (const item of newMediaItems.value) {
        if (item.file) {
          try {
            await uploadExerciseMedia(response.id, item.file)
          } catch {
            toast.warning(t('exerciseForm.mediaUploadFailed'), {
              progressBar: true,
              duration: 1500,
            })
          }
        }
      }

      toast.success(t('exercise.created'), { progressBar: true, duration: 1000 })
      resetForm()
      exerciseStore.setExercises(true)
      if (closeAfterSave) emit('close')
      return true
    } else {
      toast.error(t('exercise.failedToCreate'), { progressBar: true, duration: 1000 })
      return false
    }
  } catch {
    toast.error(t('exercise.createGenericError'), { progressBar: true, duration: 1000 })
    return false
  } finally {
    isCreating.value = false
  }
}
</script>

<style scoped>
.content-scroll {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}
</style>
