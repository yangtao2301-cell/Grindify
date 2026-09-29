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
<!-- 只读激活字段 -->
  <div
    class="sheet-select"
    :class="{ 'sheet-select--disabled': disabled }"
    @click="!disabled && (isOpen = true)"
  >
    <v-text-field
      :model-value="displayText"
      :label="label"
      variant="outlined"
      readonly
      :disabled="disabled"
      append-inner-icon="mdi-menu-down"
      hide-details="auto"
      class="pointer-field"
    >
<!-- 多选模式下的标签展示 -->
      <template v-if="multiple && selectedItems.length" #prepend-inner>
        <div class="d-flex flex-wrap ga-1 my-1">
          <v-chip
            v-for="item in selectedItems"
            :key="String(getItemValue(item))"
            size="small"
            :closable="closableChips"
            @click.stop
            @click:close="removeItem(item)"
          >
            {{ getItemTitle(item) }}
          </v-chip>
        </div>
      </template>
    </v-text-field>
  </div>

<!-- 带选项的底部抽屉 -->
  <v-bottom-sheet v-model="isOpen" max-height="60vh">
    <v-card class="rounded-t-xl">
<!-- 标题 -->
      <v-card-title class="d-flex align-center justify-space-between py-3 px-4">
        <span class="text-body-1 font-weight-bold">{{ label }}</span>
        <div class="d-flex ga-2">
          <v-btn
            v-if="clearable && hasSelection"
            variant="text"
            density="compact"
            color="error"
            @click="clearSelection"
          >
            {{ $t('common.clear') }}
          </v-btn>
          <v-btn variant="text" density="compact" color="primary" @click="isOpen = false">
            {{ $t('common.done') }}
          </v-btn>
        </div>
      </v-card-title>

      <v-divider />

<!-- 选项列表 -->
      <v-list
        class="overflow-y-auto pb-safe"
        max-height="50vh"
        :selected="listSelected"
        :select-strategy="multiple ? 'classic' : 'single-leaf'"
        @update:selected="onListUpdate"
      >
        <v-list-item
          v-for="item in normalizedItems"
          :key="String(item.value)"
          :value="item.value"
          :title="item.title"
          :active="isItemSelected(item)"
        >
          <template #append="{ isActive }">
            <v-icon v-if="isActive" color="primary">mdi-check</v-icon>
          </template>
        </v-list-item>
      </v-list>
    </v-card>
  </v-bottom-sheet>
</template>

<script setup lang="ts" generic="T">
/**
 * 通过 itemTitle / itemValue 属性同时支持基本类型数组（['a','b']）和
 * 对象数组（[{ name: 'Foo', id: 1 }]），与 v-select 使用相同的 API。
 */

type NormalizedItem = { title: string; value: unknown; raw: unknown }

const props = withDefaults(
  defineProps<{
    modelValue: T
    items: readonly unknown[]
    itemTitle?: string
    itemValue?: string
    label?: string
    multiple?: boolean
    clearable?: boolean
    closableChips?: boolean
    disabled?: boolean
  }>(),
  {
    itemTitle: 'title',
    itemValue: 'value',
    label: '',
    multiple: false,
    clearable: false,
    closableChips: false,
    disabled: false,
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: T): void
}>()

const isOpen = ref(false)

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object'
}

const normalizedItems = computed<NormalizedItem[]>(() =>
  props.items.map(raw => {
    if (isObject(raw)) {
      return {
        title: String((raw as Record<string, unknown>)[props.itemTitle] ?? ''),
        value: (raw as Record<string, unknown>)[props.itemValue],
        raw,
      }
    }
    return { title: String(raw), value: raw, raw }
  })
)

function getItemTitle(item: unknown): string {
  if (isObject(item)) return String((item as Record<string, unknown>)[props.itemTitle] ?? '')
  return String(item)
}

function getItemValue(item: unknown): unknown {
  if (isObject(item)) return (item as Record<string, unknown>)[props.itemValue]
  return item
}

const selectedValues = computed<unknown[]>(() => {
  if (props.multiple) return Array.isArray(props.modelValue) ? (props.modelValue as unknown[]) : []
  return props.modelValue != null ? [props.modelValue] : []
})

const selectedItems = computed(() =>
  normalizedItems.value.filter(i => selectedValues.value.includes(i.value))
)

const hasSelection = computed(() => selectedValues.value.length > 0)

function isItemSelected(item: NormalizedItem) {
  return selectedValues.value.includes(item.value)
}

const displayText = computed(() => {
  if (props.multiple) return ''
  const sel = selectedItems.value[0]
  return sel ? sel.title : ''
})

const listSelected = computed(() => selectedValues.value as unknown[])

function onListUpdate(vals: unknown[]) {
  if (props.multiple) {
    emit('update:modelValue', [...vals] as T)
  } else {
// 单选：发送第一个选中的值（取消选择时发送 null）
    emit('update:modelValue', (vals.length ? vals[0] : null) as T)
if (vals.length) isOpen.value = false // 单选后自动关闭
  }
}

function removeItem(item: unknown) {
  if (!props.multiple || !Array.isArray(props.modelValue)) return
  const val = getItemValue(item)
  emit('update:modelValue', (props.modelValue as unknown[]).filter(v => v !== val) as T)
}

function clearSelection() {
  if (props.multiple) {
    emit('update:modelValue', [] as unknown as T)
  } else {
    emit('update:modelValue', null as T)
  }
}
</script>

<style scoped>
.sheet-select--disabled {
  opacity: 0.5;
  pointer-events: none;
}

.pointer-field :deep(input) {
  cursor: pointer;
}

/* 在抽屉内部增加底部内边距，使最后一个选项避开 iOS 主屏幕指示条 */
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
</style>
