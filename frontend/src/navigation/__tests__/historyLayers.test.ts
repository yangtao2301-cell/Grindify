import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RouteLocationNormalizedLoaded, Router } from 'vue-router'
import { closeHistoryLayer } from '../historyLayers'
import { navigateBackTo } from '../backNavigation'

vi.mock('../backNavigation', () => ({
  navigateBackTo: vi.fn().mockResolvedValue(true),
}))

const router = {} as Router

function route(path: string, layers: string[], query = {}) {
  return {
    path,
    query: { ...query, __layers: layers },
    hash: '',
  } as RouteLocationNormalizedLoaded
}

describe('history layer back targets', () => {
  beforeEach(() => vi.clearAllMocks())

  it('closes weight log to its configured home route', async () => {
    await closeHistoryLayer(router, route('/', ['home:weight-log']), 'home:weight-log')
    expect(navigateBackTo).toHaveBeenCalledWith(router, '/')
  })

  it('closes a settings detail to its configured parent layer', async () => {
    await closeHistoryLayer(
      router,
      route('/settings', ['settings:activity-list', 'settings:activity-details']),
      'settings:activity-details',
    )
    expect(navigateBackTo).toHaveBeenCalledWith(router, {
      path: '/settings',
      query: { __layers: ['settings:activity-list'] },
      hash: '',
    })
  })

  it('closes a dialog on a dynamic route without losing other query values', async () => {
    await closeHistoryLayer(
      router,
      route('/workout/42', ['workout-details:exercise'], { view: 'summary' }),
      'workout-details:exercise',
    )
    expect(navigateBackTo).toHaveBeenCalledWith(router, {
      path: '/workout/42',
      query: { view: 'summary', __layers: undefined },
      hash: '',
    })
  })

  it('returns a shared editor to the layer that opened it', async () => {
    await closeHistoryLayer(
      router,
      route('/settings', ['settings:exercise-list', 'settings:exercise-details', 'exercise:edit']),
      'exercise:edit',
    )
    expect(navigateBackTo).toHaveBeenCalledWith(router, {
      path: '/settings',
      query: { __layers: ['settings:exercise-list', 'settings:exercise-details'] },
      hash: '',
    })
  })

  it('returns workout details opened from home to the home workout list', async () => {
    await closeHistoryLayer(
      router,
      route('/', ['home:workout-list', 'settings:workout-details']),
      'settings:workout-details',
    )
    expect(navigateBackTo).toHaveBeenCalledWith(router, {
      path: '/',
      query: { __layers: ['home:workout-list'] },
      hash: '',
    })
  })

  it('closes a shared workout list to the route where it was opened', async () => {
    await closeHistoryLayer(router, route('/workout', ['home:workout-list']), 'home:workout-list')
    expect(navigateBackTo).toHaveBeenCalledWith(router, {
      path: '/workout',
      query: { __layers: undefined },
      hash: '',
    })
  })

  it('lets the opening page override a shared dialog destination', async () => {
    await closeHistoryLayer(router, route('/workout', ['home:workout-list']), 'home:workout-list', '/workout')
    expect(navigateBackTo).toHaveBeenCalledWith(router, '/workout')
  })

  it('keeps the containing details dialog open when its child closes', async () => {
    await closeHistoryLayer(
      router,
      route('/settings', ['settings:session-list', 'settings:session-detail', 'session-detail:exercise']),
      'session-detail:exercise',
    )
    expect(navigateBackTo).toHaveBeenCalledWith(router, {
      path: '/settings',
      query: { __layers: ['settings:session-list', 'settings:session-detail'] },
      hash: '',
    })
  })

  it('uses the configured route when a parent layer is absent', async () => {
    await closeHistoryLayer(router, route('/', ['home:weight-log-entry']), 'home:weight-log-entry')
    expect(navigateBackTo).toHaveBeenCalledWith(router, '/')
  })
})
