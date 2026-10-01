import { onBeforeUnmount, type MaybeRefOrGetter, toValue } from 'vue'
import { registerUnsavedChanges } from '@/navigation/unsavedChanges'

export function useUnsavedChanges(options: {
  key: string
  isDirty: MaybeRefOrGetter<boolean>
  save: () => Promise<boolean>
  discard: () => void
  layerKey?: string
  routePath?: string
}) {
  const unregister = registerUnsavedChanges({
    key: options.key,
    isDirty: () => Boolean(toValue(options.isDirty)),
    save: options.save,
    discard: options.discard,
    layerKey: options.layerKey,
    routePath: options.routePath,
  })

  onBeforeUnmount(unregister)
  return { isDirty: () => Boolean(toValue(options.isDirty)) }
}
