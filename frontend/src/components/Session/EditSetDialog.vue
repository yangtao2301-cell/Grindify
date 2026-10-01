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
  <HistoryDialog
    :model-value="modelValue"
    history-key="session:edit-set"
    fullscreen
    :scrim="false"
    transition="dialog-bottom-transition"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card
      v-if="editableSet"
      class="d-flex flex-column"
    >
      <v-toolbar color="primary">
        <v-toolbar-title>{{ $t('session.editSetTitle', { set: editableSet.set }) }}</v-toolbar-title>
        <v-spacer />
        <v-btn
          variant="text"
          @click="onSave"
        >
          {{ $t('common.save') }}
        </v-btn>
      </v-toolbar>

      <v-card-text class="pa-5">
        <p class="text-grey-lighten-1 mb-2">
          {{ $t('session.weightLabel') }}
        </p>
        <v-text-field
          :model-value="weightStr"
          type="text"
          inputmode="decimal"
          variant="solo-filled"
          flat
          :suffix="$t('units.kgShort')"
          class="mb-4"
          autofocus
          single-line
          @update:model-value="weightStr = normalizeDecimalStr($event)"
        />

        <p class="text-grey-lighten-1 mb-2">
          {{ $t('session.repetitionsLabel') }}
        </p>
        <v-text-field
          :model-value="String(editableSet.reps)"
          type="text"
          inputmode="numeric"
          variant="solo-filled"
          flat
          :suffix="$t('units.repsShort')"
          single-line
          @update:model-value="editableSet.reps = parseIntInput($event)"
        />
      </v-card-text>

      <v-spacer />

      <div class="pa-4">
        <v-btn
          block
          size="large"
          color="red"
          variant="outlined"
          @click="onDelete"
        >
          {{ $t('session.deleteSet') }}
        </v-btn>
      </div>
    </v-card>
  </HistoryDialog>
</template>

<script lang="ts" setup>
import { type PropType } from 'vue';
import { parseDecimalInput, parseIntInput, normalizeDecimalStr, formatDecimalDisplay } from '@/utils/decimalInput';
import { useUnsavedChanges } from '@/composables/useUnsavedChanges'

// 定义训练组的数据结构
interface WorkoutSet {
  set: number;
  previous: string;
  weight: number;
  reps: number;
  done: boolean;
}

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  set: {
    type: Object as PropType<WorkoutSet | null>,
    required: true,
  },
});

const emit = defineEmits(['update:modelValue', 'save', 'delete']);

const editableSet = ref<WorkoutSet | null>(null);
const weightStr = ref('');
const initialForm = ref('')
const currentFormSnapshot = () => JSON.stringify({ set: editableSet.value, weightStr: weightStr.value })
const isDirty = computed(() => currentFormSnapshot() !== initialForm.value)

watch(
  () => props.set,
  (newSet) => {
    editableSet.value = newSet ? JSON.parse(JSON.stringify(newSet)) : null;
    weightStr.value = formatDecimalDisplay(editableSet.value?.weight);
    initialForm.value = currentFormSnapshot()
  },
  { immediate: true },
);

function resetForm() {
  editableSet.value = props.set ? JSON.parse(JSON.stringify(props.set)) : null
  weightStr.value = formatDecimalDisplay(editableSet.value?.weight)
  initialForm.value = currentFormSnapshot()
}

function onSave(closeAfterSave = true): boolean {
  if (editableSet.value) {
    editableSet.value.weight = parseDecimalInput(weightStr.value);
    emit('save', editableSet.value);
    initialForm.value = currentFormSnapshot()
    if (closeAfterSave) emit('update:modelValue', false)
    return true
  }
  return false
}

function onDelete() {
  initialForm.value = currentFormSnapshot()
  emit('delete');
  emit('update:modelValue', false);
}

useUnsavedChanges({
  key: 'edit-workout-set',
  layerKey: 'session:edit-set',
  isDirty,
  save: async () => onSave(false),
  discard: resetForm,
})
</script>
