// seams.spec.ts — the viewer seams: one spelling per slot id, shared
// by claims and renderers. The base owns the seams and nothing
// visual (no component is ever registered here — pinned by absence:
// this module exports ids and types only).
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { VIEWER_SLOTS, type ViewerSeamDefs } from '../src/slots.ts'

test('the three seam ids are spelled once', () => {
  assert.deepEqual({ ...VIEWER_SLOTS }, {
    timeline: 'melite.viewer.timeline',
    size: 'melite.viewer.size',
    window: 'melite.viewer.window',
  })
})

test('the seam defs carry the SlotMap contract (kinds, scopes, owners)', () => {
  // Type-level: a def table satisfying ViewerSeamDefs compiles only
  // when every seam's kind/scope/owner matches the merged contract.
  const defs: ViewerSeamDefs = {
    timeline: { kind: 'list', scope: 'session', owner: { runId: 'r1', status: 'running' } },
    size: { kind: 'single', scope: 'session', owner: { mode: 'tile', natural: { width: 0, height: 0 } } },
    window: { kind: 'keyed', scope: 'session', owner: { panelId: 'p', runId: 'r1' } },
  }
  assert.equal(Object.keys(defs).length, 3)
})
