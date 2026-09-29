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
  <v-card class="bg-background">
    <BackHeader :title="$t('settings.language')" @close="emit('close')" />
    <v-card-text class="pa-0">
      <v-list class="bg-transparent">
        <v-list-item :active="currentLocale === 'en'" @click="selectLanguage('en')">
          <v-list-item-title>{{ $t('settings.english') }}</v-list-item-title>
          <template #append>
            <v-icon v-if="currentLocale === 'en'"> mdi-check </v-icon>
          </template>
        </v-list-item>
        <v-list-item :active="currentLocale === 'sv'" @click="selectLanguage('sv')">
          <v-list-item-title>{{ $t('settings.swedish') }}</v-list-item-title>
          <template #append>
            <v-icon v-if="currentLocale === 'sv'"> mdi-check </v-icon>
          </template>
        </v-list-item>
        <v-list-item :active="currentLocale === 'zh-CN'" @click="selectLanguage('zh-CN')">
          <v-list-item-title>{{ $t('settings.chinese') }}</v-list-item-title>
          <template #append>
            <v-icon v-if="currentLocale === 'zh-CN'"> mdi-check </v-icon>
          </template>
        </v-list-item>
      </v-list>
    </v-card-text>
  </v-card>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth.store'
import { updateUserPreferences } from '@/services/user.service'
import type { SupportedLanguage } from '@/interfaces/i18n.types'
import type { AppLocale } from '@/plugins/i18n'

const emit = defineEmits<{
  close: []
}>()

const appStore = useAppStore()
const authStore = useAuthStore()
const { locale } = useI18n({ useScope: 'global' })

const currentLocale = computed(() => locale.value)

const LOCALE_TO_LANG: Record<string, SupportedLanguage> = {
  en: 'eng',
  sv: 'swe',
  'zh-CN': 'zho',
}

const selectLanguage = async (nextLocale: AppLocale) => {
  appStore.setLocale(nextLocale)
  locale.value = nextLocale

  const lang = LOCALE_TO_LANG[nextLocale] ?? 'default'
  try {
    await updateUserPreferences({ language: lang })
    if (authStore.user) authStore.user.language = lang
  } catch {
// locale 已在本地切换；后端同步失败不会影响主要流程
  }

  emit('close')
}
</script>
