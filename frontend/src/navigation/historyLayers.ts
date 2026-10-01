import type { LocationQuery, LocationQueryRaw, RouteLocationNormalizedLoaded, Router } from 'vue-router'
import { navigateBackTo } from './backNavigation'

export const HISTORY_LAYERS_QUERY = '__layers'

export function readHistoryLayers(query: LocationQuery): string[] {
  const value = query[HISTORY_LAYERS_QUERY]
  const values = Array.isArray(value) ? value : [value]
  return values.filter((item): item is string => typeof item === 'string' && item.length > 0)
}

export function historyLayersLocation(
  route: RouteLocationNormalizedLoaded,
  layers: string[],
): { path: string; query: LocationQueryRaw; hash: string } {
  return {
    path: route.path,
    query: {
      ...route.query,
      [HISTORY_LAYERS_QUERY]: layers.length > 0 ? layers : undefined,
    },
    hash: route.hash,
  }
}

export async function openHistoryLayer(router: Router, route: RouteLocationNormalizedLoaded, key: string) {
  const layers = readHistoryLayers(route.query)
  if (layers.includes(key)) return undefined
  return router.push(historyLayersLocation(route, [...layers, key]))
}

export async function closeHistoryLayer(router: Router, route: RouteLocationNormalizedLoaded, key: string) {
  const layers = readHistoryLayers(route.query)
  const index = layers.lastIndexOf(key)
  if (index < 0) return undefined

  // Closing a parent layer also closes any child layer above it.
  const nextLayers = layers.slice(0, index)
  const target = historyLayersLocation(route, nextLayers)
  return navigateBackTo(router, target)
}
