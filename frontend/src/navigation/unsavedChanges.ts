import type { RouteLocationNormalized } from 'vue-router'
import { readHistoryLayers } from './historyLayers'
import { unsavedPromptState } from './unsavedPromptState'

export { unsavedPromptState }

export interface UnsavedChangeHandler {
  key: string
  isDirty: () => boolean
  save: () => Promise<boolean>
  discard: () => void
  layerKey?: string
  routePath?: string
}

interface RegisteredHandler extends UnsavedChangeHandler {
  token: symbol
}

const handlers = new Map<symbol, RegisteredHandler>()
let activeHandler: RegisteredHandler | null = null
let resolveNavigation: ((allowed: boolean) => void) | null = null
let pendingNavigation: Promise<boolean> | null = null
let handledHandlers = new Set<symbol>()
let pendingFrom: RouteLocationNormalized | null = null
let pendingTo: RouteLocationNormalized | null = null

export function registerUnsavedChanges(handler: UnsavedChangeHandler): () => void {
  const token = Symbol(handler.key)
  handlers.set(token, { ...handler, token })
  return () => handlers.delete(token)
}

function handlerIsLeaving(handler: RegisteredHandler, from: RouteLocationNormalized, to: RouteLocationNormalized) {
  if (handler.layerKey) {
    const fromLayers = readHistoryLayers(from.query)
    const toLayers = readHistoryLayers(to.query)
    return fromLayers.includes(handler.layerKey) && !toLayers.includes(handler.layerKey)
  }

  return Boolean(handler.routePath && from.path === handler.routePath && to.path !== handler.routePath)
}

export function requestUnsavedNavigation(
  from: RouteLocationNormalized,
  to: RouteLocationNormalized,
): Promise<boolean> {
  // Only the navigation that opened the prompt may continue after the user
  // decides. Additional back/forward attempts while the prompt is open stay
  // blocked instead of inheriting that decision.
  if (pendingNavigation) return Promise.resolve(false)

  const navigation = new Promise<boolean>(resolve => {
    resolveNavigation = resolve
  })
  pendingNavigation = navigation
  handledHandlers = new Set()
  pendingFrom = from
  pendingTo = to
  continueNavigation(from, to)
  return navigation
}

function finishNavigation(allowed: boolean) {
  const resolve = resolveNavigation
  resolveNavigation = null
  activeHandler = null
  pendingNavigation = null
  handledHandlers = new Set()
  pendingFrom = null
  pendingTo = null
  unsavedPromptState.open = false
  unsavedPromptState.saving = false
  unsavedPromptState.error = ''
  resolve?.(allowed)
}

function continueNavigation(from: RouteLocationNormalized, to: RouteLocationNormalized) {
  const fromLayers = readHistoryLayers(from.query)
  const nextHandler = [...handlers.values()]
    .map((handler, index) => ({
      handler,
      index,
      depth: handler.layerKey ? fromLayers.lastIndexOf(handler.layerKey) + 1 : 0,
    }))
    .filter(({ handler }) =>
      !handledHandlers.has(handler.token) &&
      handler.isDirty() &&
      handlerIsLeaving(handler, from, to),
    )
    .sort((left, right) => right.depth - left.depth || right.index - left.index)[0]?.handler

  if (!nextHandler) {
    finishNavigation(true)
    return
  }

  activeHandler = nextHandler
  unsavedPromptState.error = ''
  unsavedPromptState.saving = false
  unsavedPromptState.open = true
}

function acceptCurrentHandler() {
  if (!activeHandler || !pendingNavigation) return
  handledHandlers.add(activeHandler.token)
  const from = pendingFrom
  const to = pendingTo
  if (!from || !to) {
    finishNavigation(true)
    return
  }
  activeHandler = null
  continueNavigation(from, to)
}

export function stayOnPage() {
  finishNavigation(false)
}

export function discardChangesAndContinue() {
  try {
    activeHandler?.discard()
    acceptCurrentHandler()
  } catch (error) {
    unsavedPromptState.error = error instanceof Error ? error.message : String(error)
  }
}

export async function saveChangesAndContinue() {
  if (!activeHandler || unsavedPromptState.saving) return

  unsavedPromptState.saving = true
  unsavedPromptState.error = ''
  try {
    const saved = await activeHandler.save()
    if (saved) {
      acceptCurrentHandler()
    } else {
      unsavedPromptState.saving = false
    }
  } catch (error) {
    unsavedPromptState.saving = false
    unsavedPromptState.error = error instanceof Error ? error.message : String(error)
  }
}
