import type { LocationQuery, LocationQueryRaw, RouteLocationNormalizedLoaded, RouteLocationRaw, Router } from 'vue-router'
import { navigateBackTo } from './backNavigation'
import { historyLayerBackTargets } from './historyLayerBackTargets'

export const HISTORY_LAYERS_QUERY = '__layers'

export function readHistoryLayers(query: LocationQuery): string[] {
  const value = query[HISTORY_LAYERS_QUERY]
  const values = Array.isArray(value) ? value : [value]
  return values.filter((item): item is string => typeof item === 'string' && item.length > 0)
}

export function historyLayersLocation(
  route: RouteLocationNormalizedLoaded,
  layers: string[],
  clearQueryKeys: string[] = [],
): { path: string; query: LocationQueryRaw; hash: string } {
  const query: LocationQueryRaw = { ...route.query }
  for (const key of clearQueryKeys) query[key] = undefined
  return {
    path: route.path,
    query: {
      ...query,
      [HISTORY_LAYERS_QUERY]: layers.length > 0 ? layers : undefined,
    },
    hash: route.hash,
  }
}

export async function openHistoryLayer(
  router: Router,
  route: RouteLocationNormalizedLoaded,
  key: string,
  openQuery: LocationQueryRaw = {},
) {
  const layers = readHistoryLayers(route.query)
  if (layers.includes(key)) return undefined
  const target = historyLayersLocation(route, [...layers, key])
  return router.push({ ...target, query: { ...target.query, ...openQuery } })
}

export async function closeHistoryLayer(
  router: Router,
  route: RouteLocationNormalizedLoaded,
  key: string,
  explicitBackTo?: RouteLocationRaw,
  clearQueryKeys: string[] = [],
) {
  const layers = readHistoryLayers(route.query)
  const index = layers.lastIndexOf(key)
  if (index < 0) return undefined

  if (explicitBackTo) return navigateBackTo(router, explicitBackTo)

  const backTarget = historyLayerBackTargets[key]
  const previousLayers = layers.slice(0, index)
  let target: RouteLocationRaw

  if (!backTarget) console.warn(`No back target configured for history layer: ${key}`)

  switch (backTarget?.kind) {
    case 'route':
      target = backTarget.to
      break
    case 'current-route':
      target = historyLayersLocation(route, [], clearQueryKeys)
      break
    case 'layer': {
      const parentIndex = previousLayers.lastIndexOf(backTarget.key)
      target = parentIndex >= 0
        ? historyLayersLocation(route, previousLayers.slice(0, parentIndex + 1), clearQueryKeys)
        : backTarget.fallback
      break
    }
    case 'previous-layer':
    default:
      // Keep custom dialog keys usable while their callers adopt a target.
      target = historyLayersLocation(route, previousLayers, clearQueryKeys)
  }

  return navigateBackTo(router, target)
}
