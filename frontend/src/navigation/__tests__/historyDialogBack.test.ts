import { readFileSync } from 'node:fs'
import { parse } from '@vue/compiler-sfc'
import { describe, expect, it } from 'vitest'

describe('history-backed dialogs', () => {
  it('lets Vue Router handle browser back instead of Vuetify canceling it', () => {
    const source = readFileSync(new URL('../../components/basicUI/HistoryDialog.vue', import.meta.url), 'utf8')
    const { descriptor } = parse(source)

    expect(descriptor.template?.content).toMatch(/<v-dialog\b[^>]*:close-on-back="false"/s)
  })
})
