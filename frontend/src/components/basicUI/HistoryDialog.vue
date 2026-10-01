<template>
  <!-- The URL owns dialog history; Vuetify's back handler would cancel router.back(). -->
  <v-dialog
    v-bind="$attrs"
    :model-value="isOpen"
    :close-on-back="false"
    @update:model-value="onDialogUpdate"
  >
    <slot />
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { LocationQueryRaw, RouteLocationRaw } from 'vue-router'
import { useRoute, useRouter } from 'vue-router'
import { closeHistoryLayer, openHistoryLayer, readHistoryLayers } from '@/navigation/historyLayers'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  modelValue: boolean
  historyKey: string
  backTo?: RouteLocationRaw
  openQuery?: LocationQueryRaw
  clearQueryKeys?: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const route = useRoute()
const router = useRouter()
const opening = ref(false)
const closing = ref(false)

const isOpen = computed(() => readHistoryLayers(route.query).includes(props.historyKey))

watch(
  () => props.modelValue,
  open => {
    if (open === isOpen.value) return
    if (open) {
      void requestOpen()
    } else {
      void requestClose()
    }
  },
)

watch(
  isOpen,
  open => {
    if (props.modelValue !== open) emit('update:modelValue', open)
  },
)

onMounted(() => {
  // Reconcile once both the parent v-model and the URL are available. This
  // avoids an immediate route watcher overwriting an initially-open dialog.
  if (isOpen.value) {
    if (!props.modelValue) emit('update:modelValue', true)
  } else if (props.modelValue) {
    void requestOpen()
  }
})

function onDialogUpdate(open: boolean) {
  if (open) {
    if (!props.modelValue) emit('update:modelValue', true)
  } else {
    void requestClose()
  }
}

async function requestOpen() {
  if (opening.value || isOpen.value) return
  opening.value = true
  try {
    const failure = await openHistoryLayer(router, route, props.historyKey, props.openQuery)
    if (failure) emit('update:modelValue', false)
  } catch (error) {
    console.error(`Could not open history layer ${props.historyKey}`, error)
    emit('update:modelValue', false)
  } finally {
    opening.value = false
  }
}

async function requestClose(): Promise<boolean> {
  if (closing.value) return false
  if (!isOpen.value) return true
  closing.value = true
  try {
    await closeHistoryLayer(router, route, props.historyKey, props.backTo, props.clearQueryKeys)
    // A canceled navigation (for example, Keep editing in the unsaved prompt)
    // leaves the route layer in place, so restore the parent's v-model too.
    if (isOpen.value && !props.modelValue) {
      emit('update:modelValue', true)
    }
    return !isOpen.value
  } catch (error) {
    console.error(`Could not close history layer ${props.historyKey}`, error)
    if (isOpen.value && !props.modelValue) emit('update:modelValue', true)
    return false
  } finally {
    closing.value = false
  }
}

defineExpose({ close: requestClose })
</script>
