// @melite/comfyui-card-kit — the sampling layout's own wall (the
// operator's DRY law, stroke 31): group/columns/width/zone spelled
// ONCE here, every diffusion card's sampling extras identical to
// the hand-copied literals they replace. Per-file 100% (the gate).
import { describe, expect, test } from 'vitest'
import { SAMPLING_GROUP, samplingExtra } from '../src/fields.ts'

describe('samplingExtra (the shared sampling layout)', () => {
  test('every kind grids 2-up in the sampling group, params zone, one track', () => {
    for (const kind of ['steps', 'cfg', 'sampler', 'scheduler'] as const) {
      const e = samplingExtra(kind)
      expect(e.group).toBe('sampling')
      expect(e.group).toBe(SAMPLING_GROUP)
      expect(e.columns).toBe(2)
      expect(e.width).toBe(1)
      expect(e.zone).toBe('params')
      expect(e.tooltip).toBeUndefined()
      expect(e.min).toBeUndefined()
      expect(e.max).toBeUndefined()
    }
  })
  test('canonical orders: steps 0, cfg 1, sampler 2, scheduler 3', () => {
    expect(samplingExtra('steps').order).toBe(0)
    expect(samplingExtra('cfg').order).toBe(1)
    expect(samplingExtra('sampler').order).toBe(2)
    expect(samplingExtra('scheduler').order).toBe(3)
  })
  test('wtypes: steps number, sampler/scheduler select, cfg carries NONE (its native face)', () => {
    expect(samplingExtra('steps').wtype).toBe('number')
    expect('wtype' in samplingExtra('cfg')).toBe(false)
    expect(samplingExtra('sampler').wtype).toBe('select')
    expect(samplingExtra('scheduler').wtype).toBe('select')
  })
  test('the shared layout: every atom carries the group columns (the first-seen law keeps the grid)', () => {
    expect(samplingExtra('steps')).toEqual({
      order: 0, group: 'sampling', columns: 2, width: 1, zone: 'params', wtype: 'number',
    })
    expect(samplingExtra('cfg', { tooltip: 'How closely the diffusion follows the prompt. Higher = stricter.' })).toEqual({
      order: 1, group: 'sampling', columns: 2, width: 1,
      tooltip: 'How closely the diffusion follows the prompt. Higher = stricter.', zone: 'params',
    })
    expect(samplingExtra('sampler')).toEqual({
      order: 2, group: 'sampling', columns: 2, width: 1, zone: 'params', wtype: 'select',
    })
    expect(samplingExtra('scheduler')).toEqual({
      order: 3, group: 'sampling', columns: 2, width: 1, zone: 'params', wtype: 'select',
    })
  })
  test('order override (ideogram4: mu/std own 2/3, sampler rides 4)', () => {
    const e = samplingExtra('sampler', { order: 4 })
    expect(e.order).toBe(4)
    expect(e.columns).toBe(2)
    expect(e.wtype).toBe('select')
  })
  test('hint-only range passthrough (video-gen/ideogram4 steps carry extra min/max)', () => {
    const e = samplingExtra('steps', { min: 1, max: 50 })
    expect(e.min).toBe(1)
    expect(e.max).toBe(50)
    expect(e.order).toBe(0)
    expect(e.columns).toBe(2)
  })
})
