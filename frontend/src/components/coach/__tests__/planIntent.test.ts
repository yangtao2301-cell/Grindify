import { describe, expect, it } from 'vitest'
import { confirmedCyclePattern } from '../planIntent'

describe('confirmedCyclePattern', () => {
  it('recognizes a user-requested four-on-one-off cycle', () => {
    expect(confirmedCyclePattern(['帮我安排练四天休息一天'])).toBe('four_on_one_off')
    expect(confirmedCyclePattern(['我想练四休一，只安排未来两周'])).toBe('four_on_one_off')
  })

  it('recognizes a five-on-one-off cycle instead of showing the four-day choice', () => {
    expect(confirmedCyclePattern(['帮我安排练五休一'])).toBe('five_on_one_off')
    expect(confirmedCyclePattern(['练5天休息1天'])).toBe('five_on_one_off')
    expect(confirmedCyclePattern(['练四休一', '改成练五休一'])).toBe('five_on_one_off')
  })

  it('keeps the cycle through a neutral follow-up', () => {
    expect(confirmedCyclePattern(['按四练一休安排', '每次能练45分钟'])).toBe('four_on_one_off')
  })

  it('respects a newer weekly correction or cancellation', () => {
    expect(confirmedCyclePattern(['练四休一', '改成每周练三天'])).toBeNull()
    expect(confirmedCyclePattern(['练四休一', '不要练四休一了'])).toBeNull()
    expect(confirmedCyclePattern(['练四休一', '不想再练四休一'])).toBeNull()
    expect(confirmedCyclePattern(['练四休一', '改成按周固定训练日'])).toBeNull()
    expect(confirmedCyclePattern(['练四休一，改成每周练三天'])).toBeNull()
    expect(confirmedCyclePattern(['我现在每周练三天，以后想练四休一'])).toBe('four_on_one_off')
  })

  it('does not infer the rhythm without a user request', () => {
    expect(confirmedCyclePattern(['帮我安排训练'])).toBeNull()
  })
})
