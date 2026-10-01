import type { RouteLocationRaw, Router } from 'vue-router'
import { unsavedPromptState } from './unsavedPromptState'

const POP_FALLBACK_DELAY_MS = 800
const PROMPT_POLL_DELAY_MS = 150

/**
 * Return to an explicit, manually configured destination. Pop the current
 * browser entry when it points to that destination; otherwise replace the
 * current entry so a back action never adds another copy to the history.
 */
export async function navigateBackTo(router: Router, target: RouteLocationRaw): Promise<boolean> {
  const targetFullPath = router.resolve(target).fullPath
  if (router.currentRoute.value.fullPath === targetFullPath) return true

  const stateBack = window.history.state?.back
  const previousFullPath =
    typeof stateBack === 'string' && stateBack.startsWith('/')
      ? router.resolve(stateBack).fullPath
      : undefined
  if (previousFullPath !== targetFullPath) {
    return replaceWithTarget(router, target, targetFullPath)
  }

  return popToTarget(router, target, targetFullPath)
}

/**
 * Return to the previous Vue Router entry when one exists, with a manually
 * configured fallback for direct links and fresh PWA launches.
 */
export async function navigateBack(router: Router, fallback?: RouteLocationRaw): Promise<boolean> {
  const previousFullPath = window.history.state?.back
  if (typeof previousFullPath === 'string' && previousFullPath.startsWith('/')) {
    const previousTarget = router.resolve(previousFullPath).fullPath
    if (router.currentRoute.value.fullPath === previousTarget) {
      return fallback ? navigateBackTo(router, fallback) : false
    }
    return popToTarget(router, previousTarget, previousTarget)
  }

  return fallback ? navigateBackTo(router, fallback) : false
}

function popToTarget(router: Router, target: RouteLocationRaw, targetFullPath: string): Promise<boolean> {
  const currentFullPath = router.currentRoute.value.fullPath

  return new Promise(resolve => {
    let settled = false
    let timeout: ReturnType<typeof setTimeout> | undefined
    let poll: ReturnType<typeof setTimeout> | undefined
    let removeAfterEach = () => {}

    const cleanup = () => {
      if (timeout) clearTimeout(timeout)
      if (poll) clearTimeout(poll)
      removeAfterEach()
    }

    const finish = (result: boolean) => {
      if (settled) return
      settled = true
      cleanup()
      resolve(result)
    }

    const replaceAfterMissedPop = async () => {
      if (settled) return

      // A dirty form may leave the router guard waiting for the user's choice.
      // Keep the original navigation pending until that choice settles.
      if (unsavedPromptState.open || unsavedPromptState.saving) {
        poll = setTimeout(() => void replaceAfterMissedPop(), PROMPT_POLL_DELAY_MS)
        return
      }

      if (router.currentRoute.value.fullPath === targetFullPath) {
        finish(true)
        return
      }

      try {
        const failure = await router.replace(target)
        finish(!failure && router.currentRoute.value.fullPath === targetFullPath)
      } catch {
        finish(false)
      }
    }

    removeAfterEach = router.afterEach((to, from, failure) => {
      if (from.fullPath !== currentFullPath) return

      // A rejected navigation means the user chose to stay, or a guard blocked
      // the move. Do not override that decision with the fallback replacement.
      if (failure) {
        finish(false)
      } else if (to.fullPath === targetFullPath) {
        finish(true)
      } else {
        void replaceAfterMissedPop()
      }
    })

    timeout = setTimeout(() => void replaceAfterMissedPop(), POP_FALLBACK_DELAY_MS)
    router.back()
  })
}

async function replaceWithTarget(
  router: Router,
  target: RouteLocationRaw,
  targetFullPath: string,
): Promise<boolean> {
  try {
    const failure = await router.replace(target)
    return !failure && router.currentRoute.value.fullPath === targetFullPath
  } catch {
    return false
  }
}
