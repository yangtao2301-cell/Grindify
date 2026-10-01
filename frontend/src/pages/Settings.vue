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
  <div class="mx-5 mb-5">
    <v-card
      class="d-flex flex-column align-center justify-center py-5 my-5 rounded-lg"
      color="cardBg"
      :style="{ border: '1px solid rgb(var(--v-theme-borderColor))' }"
    >
      <div class="avatar-wrapper">
        <v-avatar class="mb-4" size="100" color="primary" @click="openAccountDialog">
          <v-img
            v-if="currentUser?.avatar"
            :src="getImageUrl(currentUser.avatar)"
            alt="User avatar"
            cover
          />
          <v-icon v-else size="48"> mdi-account </v-icon>
        </v-avatar>
        <v-btn icon size="small" color="primary" class="edit-avatar-btn" @click="openAccountDialog">
          <v-icon size="16"> mdi-camera </v-icon>
        </v-btn>
      </div>
      <div class="mb-2 text-center">
        <h1 class="text-h5 white--text">
          {{ currentUser?.firstName || '' }} {{ currentUser?.lastName || '' }}
        </h1>
        <p v-if="memberSince" class="text-textSecondary text-subtitle-1">
          {{ $t('settings.memberSince', { date: memberSince }) }}
        </p>
      </div>
    </v-card>
    <div class="d-flex flex-column ga-5">
      <div>
        <h1 class="text-h6 mb-3">
          {{ $t('settings.content') }}
        </h1>
        <v-card
          v-for="item in contentList"
          :key="item.titleKey"
          class="mb-4 d-flex flex-row justify-space-between align-center pa-4 rounded-lg"
          color="cardBg"
          :style="{ border: '1px solid rgb(var(--v-theme-borderColor))' }"
          :disabled="item.disabled"
          @click="setDialogToOpen(item.type)"
        >
          <div class="d-flex align-center ga-2">
            <v-avatar color="avatarBg" size="40">
              <v-icon color="primary">{{ item.icon }}</v-icon>
            </v-avatar>
            <p>{{ $t(item.titleKey) }}</p>
          </div>
          <v-icon v-if="item.showArrow"> mdi-chevron-right </v-icon>
        </v-card>
      </div>
      <div>
        <h1 class="text-h6 mb-3">{{ $t('settings.data') }}</h1>
        <v-card
          v-for="item in dataList"
          :key="item.titleKey"
          class="mb-4 d-flex flex-row justify-space-between align-center pa-4 rounded-lg"
          color="cardBg"
          :style="{ border: '1px solid rgb(var(--v-theme-borderColor))' }"
          :disabled="item.disabled"
          @click="setDialogToOpen(item.type)"
        >
          <div class="d-flex align-center ga-2">
            <v-avatar color="avatarBg" size="40">
              <v-icon color="primary">{{ item.icon }}</v-icon>
            </v-avatar>
            <p>{{ $t(item.titleKey) }}</p>
          </div>
          <v-icon v-if="item.showArrow"> mdi-chevron-right </v-icon>
        </v-card>
      </div>
      <div>
        <h1 class="text-h6 mb-3">{{ $t('settings.preferences') }}</h1>
        <v-list
          class="bg-cardBg rounded-lg"
          :style="{ border: '1px solid rgb(var(--v-theme-borderColor))' }"
        >
          <v-list-item
            v-for="item in preferencesList"
            :key="item.titleKey"
            class="px-5"
            :class="{ 'border-b': item !== preferencesList[preferencesList.length - 1] }"
            :disabled="item.disabled"
            @click="setPreferenceDialogToOpen(item.type)"
          >
            <v-list-item-title class="d-flex flex-row justify-space-between align-center">
              <p>{{ $t(item.titleKey) }}</p>
              <v-icon v-if="item.showArrow"> mdi-chevron-right </v-icon>
              <v-switch
                v-if="item.type === 'darkMode'"
                v-model="isDarkMode"
                color="primary"
                class="d-flex align-center pr-2"
                @update:model-value="toggleDarkMode"
                @click.stop
              />
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </div>

      <div>
        <h1 class="text-h6 mb-3">{{ $t('settings.legal') }}</h1>
        <v-list
          class="bg-cardBg rounded-lg"
          :style="{ border: '1px solid rgb(var(--v-theme-borderColor))' }"
        >
          <v-list-item class="px-5 border-b" @click="isPrivacyPolicyOpen = true">
            <v-list-item-title class="d-flex flex-row justify-space-between align-center">
              <p>{{ $t('settings.privacyPolicy') }}</p>
              <v-icon>mdi-chevron-right</v-icon>
            </v-list-item-title>
          </v-list-item>
          <v-list-item class="px-5 border-b" @click="isTermsOpen = true">
            <v-list-item-title class="d-flex flex-row justify-space-between align-center">
              <p>{{ $t('settings.termsAndConditions') }}</p>
              <v-icon>mdi-chevron-right</v-icon>
            </v-list-item-title>
          </v-list-item>
          <v-list-item class="px-5 border-b" @click="isImprintOpen = true">
            <v-list-item-title class="d-flex flex-row justify-space-between align-center">
              <p>{{ $t('settings.imprint') }}</p>
              <v-icon>mdi-chevron-right</v-icon>
            </v-list-item-title>
          </v-list-item>
          <v-list-item class="px-5" @click="isExportDialogOpen = true">
            <v-list-item-title class="d-flex flex-row justify-space-between align-center">
              <div>
                <p>{{ $t('settings.exportData') }}</p>
              </div>
              <v-icon>mdi-download</v-icon>
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </div>
      <v-btn variant="outlined" @click="setPreferenceDialogToOpen('logout')">
        {{ $t('settings.logout') }}
      </v-btn>
    </div>

<!-- 账号编辑对话框 -->
    <HistoryDialog v-model="isAccountDialogOpen" history-key="settings:account" fullscreen transition="slide-y-transition" persistent>
      <AccountDialog
        :user="currentUser"
        @close="isAccountDialogOpen = false"
        @updated="onUserUpdated"
      />
    </HistoryDialog>

    <HistoryDialog v-model="isExerciseListOpen" history-key="settings:exercise-list" fullscreen transition="slide-y-transition" persistent>
      <ExerciseList @close="isExerciseListOpen = false" />
    </HistoryDialog>
    <HistoryDialog v-model="isActivityListOpen" history-key="settings:activity-list" fullscreen transition="slide-y-transition" persistent>
      <ActivityList @close="isActivityListOpen = false" />
    </HistoryDialog>
    <HistoryDialog v-model="isSessionListOpen" history-key="settings:session-list" fullscreen transition="slide-y-transition" persistent>
      <SessionList @close="isSessionListOpen = false" />
    </HistoryDialog>
    <HistoryDialog v-model="isWorkoutListOpen" history-key="settings:workout-list" fullscreen transition="slide-y-transition" persistent>
      <WorkoutList @close="isWorkoutListOpen = false" />
    </HistoryDialog>

    <HistoryDialog v-model="isAppearanceOpen" history-key="settings:appearance" fullscreen transition="slide-y-transition" persistent>
      <AppearanceDialog
        :user="currentUser"
        @close="isAppearanceOpen = false"
        @updated="onUserUpdated"
      />
    </HistoryDialog>

    <HistoryDialog v-model="isLanguageDialogOpen" history-key="settings:language" max-width="500" fullscreen>
      <LanguageDialog @close="isLanguageDialogOpen = false" />
    </HistoryDialog>

    <HistoryDialog v-model="isVersionHistoryOpen" history-key="settings:version-history" fullscreen transition="slide-y-transition" persistent>
      <VersionHistoryDialog @close="isVersionHistoryOpen = false" />
    </HistoryDialog>

<!-- 目标对话框 -->
    <HistoryDialog v-model="isGoalsDialogOpen" history-key="settings:goals" fullscreen transition="slide-y-transition" persistent>
      <GoalsDialog
        :user="currentUser"
        :weight-tracking-enabled="weightTrackingEnabled"
        @close="isGoalsDialogOpen = false"
        @updated="onUserUpdated"
      />
    </HistoryDialog>

    <PrivacyPolicyDialog v-model="isPrivacyPolicyOpen" />
    <TermsAndConditionsDialog v-model="isTermsOpen" />
    <ImprintDialog v-model="isImprintOpen" />

    <v-dialog v-model="isExportDialogOpen" max-width="520" :persistent="Boolean(exportingReport)">
      <v-card color="cardBg" rounded="xl">
        <v-card-title class="px-6 pt-6 text-h6">
          {{ $t('settings.exportReportTitle') }}
        </v-card-title>
        <v-card-text class="px-6 pb-2 text-textSecondary">
          {{ $t('settings.exportReportDescription') }}
        </v-card-text>
        <v-card-text class="px-6 pt-2">
          <v-card
            class="pa-4 mb-3 export-option"
            color="cardBg"
            variant="outlined"
            :disabled="Boolean(exportingReport)"
            @click="exportSelectedReport('summary')"
          >
            <div class="d-flex align-center ga-4">
              <v-avatar color="avatarBg" size="48">
                <v-icon color="primary">mdi-chart-box-outline</v-icon>
              </v-avatar>
              <div class="flex-grow-1">
                <div class="text-subtitle-1 font-weight-bold">
                  {{ $t('settings.exportSummaryTitle') }}
                </div>
                <div class="text-body-2 text-textSecondary">
                  {{ $t('settings.exportSummaryDescription') }}
                </div>
              </div>
              <v-progress-circular
                v-if="exportingReport === 'summary'"
                indeterminate
                color="primary"
                size="22"
              />
              <v-icon v-else color="primary">mdi-chevron-right</v-icon>
            </div>
          </v-card>
          <v-card
            class="pa-4 export-option"
            color="cardBg"
            variant="outlined"
            :disabled="Boolean(exportingReport)"
            @click="exportSelectedReport('complete')"
          >
            <div class="d-flex align-center ga-4">
              <v-avatar color="avatarBg" size="48">
                <v-icon color="primary">mdi-file-document-multiple-outline</v-icon>
              </v-avatar>
              <div class="flex-grow-1">
                <div class="text-subtitle-1 font-weight-bold">
                  {{ $t('settings.exportCompleteTitle') }}
                </div>
                <div class="text-body-2 text-textSecondary">
                  {{ $t('settings.exportCompleteDescription') }}
                </div>
              </div>
              <v-progress-circular
                v-if="exportingReport === 'complete'"
                indeterminate
                color="primary"
                size="22"
              />
              <v-icon v-else color="primary">mdi-chevron-right</v-icon>
            </div>
          </v-card>
        </v-card-text>
        <v-card-actions class="px-6 pb-5">
          <v-spacer />
          <v-btn variant="text" :disabled="Boolean(exportingReport)" @click="isExportDialogOpen = false">
            {{ $t('common.cancel') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
<script lang="ts" setup>
import { getCurrentUser, getStreakInfo, getUserDataExport } from '@/services/user.service'
import { exportUserDataReport as createUserDataReport } from '@/utils/userDataReport'
import type { User, StreakInfo } from '@/interfaces/User.interface'
import { toast } from 'vuetify-sonner'
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import { useTheme } from 'vuetify'
import PrivacyPolicyDialog from '@/components/legal/PrivacyPolicyDialog.vue'
import TermsAndConditionsDialog from '@/components/legal/TermsAndConditionsDialog.vue'
import ImprintDialog from '@/components/legal/ImprintDialog.vue'
import VersionHistoryDialog from '@/components/Settings/VersionHistoryDialog.vue'

const authStore = useAuthStore()
const appStore = useAppStore()
const { t, locale } = useI18n({ useScope: 'global' })
const theme = useTheme()

const isDarkMode = ref(appStore.darkMode)

const toggleDarkMode = (value: boolean | null) => {
  const isDark = value ?? true
  isDarkMode.value = isDark
  appStore.setDarkMode(isDark)
  theme.global.name.value = isDark ? 'dark' : 'light'
}

const isExerciseListOpen = ref(false)
const isActivityListOpen = ref(false)
const isSessionListOpen = ref(false)
const isWorkoutListOpen = ref(false)
const isAccountDialogOpen = ref(false)
const isAppearanceOpen = ref(false)
const isLanguageDialogOpen = ref(false)
const isVersionHistoryOpen = ref(false)
const isGoalsDialogOpen = ref(false)
const isPrivacyPolicyOpen = ref(false)
const isTermsOpen = ref(false)
const isImprintOpen = ref(false)
const isExportDialogOpen = ref(false)
const exportingReport = ref<'summary' | 'complete' | null>(null)
const currentUser = ref<User | null>(null)
const weightTrackingEnabled = ref(false)
const streakInfo = ref<StreakInfo | null>(null)

const memberSince = computed(() => {
  if (!currentUser.value?.createdAt) return ''
  return new Intl.DateTimeFormat(locale.value, { year: 'numeric', month: 'short' }).format(
    new Date(currentUser.value.createdAt),
  )
})

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:1337/v1'

const getImageUrl = (imagePath: string) => {
  if (imagePath.startsWith('http')) return imagePath
  const baseUrl = apiUrl.replace('/v1', '')
  return `${baseUrl}${imagePath}`
}

const onUserUpdated = (user: User) => {
  currentUser.value = user
  weightTrackingEnabled.value = user.showWeightTracking ?? false
}

const loadUserData = async () => {
  try {
    const user = await getCurrentUser()
    currentUser.value = user
    weightTrackingEnabled.value = user.showWeightTracking ?? false
  } catch (error) {
    console.error('Error loading user data:', error)
    toast.error(t('settings.errorLoadingUserData'), { progressBar: true, duration: 1000 })
  }
}

const openAccountDialog = () => {
  isAccountDialogOpen.value = true
}

const setDialogToOpen = (type: string) => {
  switch (type) {
    case 'exercises':
      isExerciseListOpen.value = true
      break
    case 'activities':
      isActivityListOpen.value = true
      break
    case 'workouts':
      isWorkoutListOpen.value = true
      break
    case 'sessions':
      isSessionListOpen.value = true
      break
    default:
      return
  }
}

const setPreferenceDialogToOpen = async (type?: string) => {
  switch (type) {
    case 'account':
      openAccountDialog()
      break
    case 'appearance':
      isAppearanceOpen.value = true
      break
    case 'goals':
      isGoalsDialogOpen.value = true
      break
    case 'language':
      isLanguageDialogOpen.value = true
      break
    case 'versionHistory':
      isVersionHistoryOpen.value = true
      break
    case 'contact':
      window.location.href = `mailto:${import.meta.env.VITE_CONTACT_EMAIL ?? '3405351711@qq.com'}`
      break
    case 'logout':
      await authStore.logout()
      break
    default:
      return
  }
}

const exportSelectedReport = async (mode: 'summary' | 'complete') => {
  if (exportingReport.value) return
  exportingReport.value = mode
  try {
    const data = await getUserDataExport()
    await createUserDataReport(data, mode, locale.value, apiUrl)
    isExportDialogOpen.value = false
    toast.success(t('settings.exportReportSuccess'), { progressBar: true, duration: 3000 })
  } catch (error) {
    console.error('Error exporting user data report:', error)
    toast.error(t('settings.exportDataError'), { progressBar: true, duration: 3000 })
  } finally {
    exportingReport.value = null
  }
}

const contentList = [
  {
    titleKey: 'settings.exercises',
    showArrow: true,
    type: 'exercises',
    disabled: false,
    icon: 'mdi-dumbbell',
  },
  {
    titleKey: 'settings.workouts',
    showArrow: true,
    type: 'workouts',
    disabled: false,
    icon: 'mdi-calendar-check',
  },
  {
    titleKey: 'settings.activities',
    showArrow: true,
    type: 'activities',
    disabled: false,
    icon: 'mdi-run',
  },
]
const dataList = [
  {
    titleKey: 'settings.sessions',
    showArrow: true,
    type: 'sessions',
    disabled: false,
    icon: 'mdi-timer',
  },
  {
    titleKey: 'settings.weightAndProgression',
    showArrow: false,
    type: 'weightAndProgression',
    disabled: true,
    icon: 'mdi-scale-balance',
  },
  {
    titleKey: 'settings.achievements',
    showArrow: false,
    type: 'achievements',
    disabled: true,
    icon: 'mdi-trophy',
  },
]
const preferencesList = [
  { titleKey: 'settings.userInformation', showArrow: true, disabled: false, type: 'account' },
  { titleKey: 'settings.appearance', showArrow: true, disabled: false, type: 'appearance' },
  { titleKey: 'settings.goals', showArrow: true, disabled: false, type: 'goals' },
  { titleKey: 'settings.darkMode', showArrow: false, disabled: false, type: 'darkMode' },
  { titleKey: 'settings.language', showArrow: true, disabled: false, type: 'language' },
  { titleKey: 'settings.versionHistory', showArrow: true, disabled: false, type: 'versionHistory' },
  { titleKey: 'settings.helpAndSupport', showArrow: true, disabled: false, type: 'contact' },
]

onMounted(() => {
  locale.value = appStore.locale
  loadUserData()
  getStreakInfo()
    .then(info => {
      streakInfo.value = info
    })
    .catch(() => {})
})
</script>

<style scoped>
.avatar-wrapper {
  position: relative;
  cursor: pointer;
}

.edit-avatar-btn {
  position: absolute;
  bottom: 12px;
  right: -4px;
  height: 32px !important;
  width: 32px !important;
}
</style>
