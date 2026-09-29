/*
 * Copyright (c) 2026 FalkenDev
 *
 * This file is part of Grindify.
 *
 * Grindify is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of
 * the License, or (at your option) any later version.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with Grindify. If not, see
 * <https://www.gnu.org/licenses/>.
 */

// stores/authStore.ts（相关认证 store）
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Exercise } from '@/interfaces/Exercise.interface'
import * as exerciseService from '@/services/exercise.service'
import { useAuthStore } from './auth.store'

export const useExerciseStore = defineStore(
  'exerciseStore',
  () => {
    const authStore = useAuthStore()
    const exercises = ref<Exercise[]>([])
    const isLoading = ref<boolean>(false)
    const lastFetched = ref<number | null>(null)
    const cacheDuration = 10 * 1000

    const setExercises = async (reload = false) => {
      const now = Date.now()
      if (
        exercises.value &&
        !reload &&
        lastFetched.value &&
        now - lastFetched.value < cacheDuration
      ) {
        return
      }

      try {
        isLoading.value = true
        exercises.value = await exerciseService.fetchAllExercises()
        lastFetched.value = now
      } catch (error) {
        console.error('Error fetching exercises:', error)
      } finally {
        isLoading.value = false
      }
    }

// 仅在已认证时获取训练动作，避免应用启动时反复收到 401。
    watch(
      () => authStore.isAuthenticated,
      authed => {
        if (authed) {
          void setExercises(true)
        }
      },
      { immediate: true }
    )

// 应用重新获得可见性时重新获取（例如从其他设备/标签页切回来）。
    if (typeof document !== 'undefined' && typeof window !== 'undefined') {
      const onVisible = () => {
        if (document.visibilityState === 'visible' && authStore.isAuthenticated) {
          void setExercises(true)
        }
      }
      const onFocus = () => {
        if (authStore.isAuthenticated) {
          void setExercises(true)
        }
      }
      document.addEventListener('visibilitychange', onVisible)
      window.addEventListener('focus', onFocus)
    }

    const resetStore = async () => {
      exercises.value = []
      isLoading.value = false
      lastFetched.value = null
      if (authStore.isAuthenticated) {
        await setExercises(true)
      }
    }

    return { exercises, isLoading, setExercises, resetStore }
  },
  {
    persist: true,
  }
)
