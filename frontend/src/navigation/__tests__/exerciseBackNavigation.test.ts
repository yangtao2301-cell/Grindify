import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Router } from 'vue-router'
import { routeBackTarget } from '../backNavigation'
import { closeHistoryLayer, historyLayersLocation } from '../historyLayers'

const emptyPage = { render: () => null }

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/settings', component: emptyPage },
      { path: '/workout/:workoutId', component: emptyPage, meta: { backTo: '/workout' } },
      { path: '/workout', component: emptyPage },
    ],
  })
}

function travel(router: Router, direction: 'back' | 'forward') {
  return new Promise<void>(resolve => {
    const remove = router.afterEach(() => {
      remove()
      resolve()
    })
    router[direction]()
  })
}

afterEach(() => vi.unstubAllGlobals())

describe('exercise detail back navigation', () => {
  it('returns to the settings exercise list and clears its selected ID', async () => {
    const router = makeRouter()
    await router.push('/settings?__layers=settings:exercise-list')
    const parentPath = router.currentRoute.value.fullPath
    await router.push('/settings?__layers=settings:exercise-list&__layers=settings:exercise-details&__settingsExerciseId=59')
    vi.stubGlobal('window', { history: { state: { back: parentPath } } })

    const target = historyLayersLocation(router.currentRoute.value, ['settings:exercise-list'], ['__settingsExerciseId'])
    const closed = await closeHistoryLayer(
      router,
      router.currentRoute.value,
      'settings:exercise-details',
      target,
      ['__settingsExerciseId'],
    )

    expect(closed).toBe(true)
    expect(router.currentRoute.value.fullPath).toBe(parentPath)
    expect(router.currentRoute.value.query.__settingsExerciseId).toBeUndefined()
  })

  it('uses the explicit list target when a detail link has no parent layer', async () => {
    const router = makeRouter()
    await router.push('/settings?__layers=settings:exercise-details&__settingsExerciseId=59')
    vi.stubGlobal('window', { history: { state: {} } })

    const target = historyLayersLocation(router.currentRoute.value, ['settings:exercise-list'], ['__settingsExerciseId'])
    const closed = await closeHistoryLayer(router, router.currentRoute.value, 'settings:exercise-details', target)

    expect(closed).toBe(true)
    expect(router.currentRoute.value.query.__layers).toEqual(['settings:exercise-list'])
    expect(router.currentRoute.value.query.__settingsExerciseId).toBeUndefined()
  })

  it('keeps the outer exercise ID when closing an exercise picker detail', async () => {
    const router = makeRouter()
    await router.push({
      path: '/settings',
      query: {
        __layers: ['settings:exercise-list', 'settings:exercise-details', 'exercise-picker:details'],
        __settingsExerciseId: 59,
        __pickerExerciseId: 60,
      },
    })
    vi.stubGlobal('window', { history: { state: {} } })

    const closed = await closeHistoryLayer(
      router,
      router.currentRoute.value,
      'exercise-picker:details',
      undefined,
      ['__pickerExerciseId'],
    )

    expect(closed).toBe(true)
    expect(router.currentRoute.value.query.__settingsExerciseId).toBe('59')
    expect(router.currentRoute.value.query.__pickerExerciseId).toBeUndefined()
    expect(router.currentRoute.value.query.__layers).toEqual(['settings:exercise-list', 'settings:exercise-details'])
  })

  it('supports browser back, forward, and then the app arrow', async () => {
    const router = makeRouter()
    await router.push('/settings?__layers=settings:exercise-list')
    await router.push('/settings?__layers=settings:exercise-list&__layers=settings:exercise-details&__settingsExerciseId=59')

    await travel(router, 'back')
    expect(router.currentRoute.value.query.__layers).toBe('settings:exercise-list')
    await travel(router, 'forward')
    expect(router.currentRoute.value.query.__settingsExerciseId).toBe('59')

    vi.stubGlobal('window', { history: { state: {} } })
    const target = historyLayersLocation(router.currentRoute.value, ['settings:exercise-list'], ['__settingsExerciseId'])
    await closeHistoryLayer(router, router.currentRoute.value, 'settings:exercise-details', target)
    expect(router.currentRoute.value.query.__layers).toEqual(['settings:exercise-list'])
  })

  it('prefers the opening page over the route fallback', async () => {
    const router = makeRouter()
    await router.push('/workout/42?returnTo=%2Fsettings%3F__layers%3Dsettings%253Aworkout-list')

    expect(routeBackTarget(router.currentRoute.value)).toBe('/settings?__layers=settings%3Aworkout-list')
  })
})
