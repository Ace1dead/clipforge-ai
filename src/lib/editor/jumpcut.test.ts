import { describe, it, expect } from 'vitest'
import { buildJumpCutPlan, type Silence } from './jumpcut'

describe('buildJumpCutPlan', () => {
  it('returns the single clipped range when no silences fall inside the clip', () => {
    const silences: Silence[] = [{ start: 90, end: 95 }]
    const plan = buildJumpCutPlan(10, 20, silences, { marginSec: 0.1, minCutSec: 0.5 })
    expect(plan).toEqual([{ start: 10, end: 20 }])
  })

  it('splits a clip around a silence fully inside it', () => {
    const silences: Silence[] = [{ start: 14, end: 16 }]
    const plan = buildJumpCutPlan(10, 20, silences, { marginSec: 0.2, minCutSec: 0.5 })
    expect(plan).toEqual([
      { start: 10, end: 13.8 },
      { start: 16.2, end: 20 },
    ])
  })

  it('clamps margins to the clip bounds', () => {
    // silence starts at clipStart: expanded span clamps down to clipStart (10)
    const silences: Silence[] = [{ start: 10.2, end: 11.5 }]
    const plan = buildJumpCutPlan(10, 20, silences, { marginSec: 0.5, minCutSec: 0.5 })
    for (const seg of plan) {
      expect(seg.start).toBeGreaterThanOrEqual(10)
      expect(seg.end).toBeLessThanOrEqual(20)
    }
    expect(plan).toEqual([{ start: 12, end: 20 }])
  })

  it('drops sub-cuts shorter than minCutSec', () => {
    const silences: Silence[] = [{ start: 18.5, end: 19.5 }]
    const plan = buildJumpCutPlan(10, 20, silences, { marginSec: 0, minCutSec: 1 })
    // tail 19.5..20 is 0.5s -> dropped; only the 10..18.5 head survives
    expect(plan).toEqual([{ start: 10, end: 18.5 }])
  })

  it('returns [] when the whole clip is silence', () => {
    const silences: Silence[] = [{ start: 9, end: 21 }]
    const plan = buildJumpCutPlan(10, 20, silences, { marginSec: 0, minCutSec: 0.5 })
    expect(plan).toEqual([])
  })
})