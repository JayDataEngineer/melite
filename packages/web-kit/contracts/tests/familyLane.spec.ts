// familyLane.spec.ts — THE DERIVED-FAMILY LANE LAW's own walls.
//
// The module's doc comment is the law: lanes in declared order,
// first match wins (minCalls → guideKeys → callGuideKeys), a lane
// with no qualifiers is the fallthrough, no match is the last
// declared lane ('' only for an empty law — a shape the declaration
// judge refuses at boot). reseatDeadKeys drops only stale carry:
// a dead key the MERGED doc states that the PRIOR row also stated.
// A doc whose lane honors every stated key rides unchanged (dropped:
// []), and a dead key this write authors stands (the carry line).
import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import {
  deriveFamilyLane,
  familyKeyPresent,
  reseatDeadKeys,
  type FamilyLaneRow,
  type FamilyLaw,
} from '../src/familyLane.ts'

const OPEN: FamilyLaneRow = { lane: 't4_open' }

describe('familyKeyPresent (the presence grammar every judge shares)', () => {
  test('nullish states nothing', () => {
    assert.equal(familyKeyPresent(null), false)
    assert.equal(familyKeyPresent(undefined), false)
  })

  test('blank strings state nothing; any other text states', () => {
    assert.equal(familyKeyPresent(''), false)
    assert.equal(familyKeyPresent('   '), false)
    assert.equal(familyKeyPresent('a boat'), true)
  })

  test('empty arrays state nothing; a stated element states', () => {
    assert.equal(familyKeyPresent([]), false)
    assert.equal(familyKeyPresent(['x']), true)
  })

  test('any other value states (numbers, booleans, objects)', () => {
    assert.equal(familyKeyPresent(0), true)
    assert.equal(familyKeyPresent(false), true)
    assert.equal(familyKeyPresent({}), true)
  })
})

describe('deriveFamilyLane (first match wins)', () => {
  const law: FamilyLaw = {
    lanes: [
      { lane: 't4_chain', minCalls: 2 },
      { lane: 't4r', guideKeys: ['image', 'keyframes'] },
      { lane: 't4_call', callGuideKeys: ['image'] },
      OPEN,
    ],
    deadKeys: {},
  }

  test('minCalls matches the calls length', () => {
    assert.equal(
      deriveFamilyLane(law, { calls: [{}, {}] }),
      't4_chain',
    )
  })

  test('guideKeys match at the doc level', () => {
    assert.equal(deriveFamilyLane(law, { calls: [], image: 'a.png' }), 't4r')
    assert.equal(deriveFamilyLane(law, { calls: [], keyframes: 'k' }), 't4r')
  })

  test('callGuideKeys match inside a calls row', () => {
    assert.equal(
      deriveFamilyLane(law, { calls: [{ image: 'a.png' }] }),
      't4_call',
    )
  })

  test('a null calls row states nothing — the lane falls through', () => {
    assert.equal(deriveFamilyLane(law, { calls: [null] }), 't4_open')
  })

  test('no qualifiers is the fallthrough — a bare doc rides it', () => {
    assert.equal(deriveFamilyLane(law, { calls: [] }), 't4_open')
  })

  test('no match is the LAST declared lane when it carries qualifiers', () => {
    const noFallthrough: FamilyLaw = {
      lanes: [
        { lane: 'a', minCalls: 2 },
        { lane: 'b', guideKeys: ['image'] },
      ],
      deadKeys: {},
    }
    assert.equal(deriveFamilyLane(noFallthrough, { calls: [] }), 'b')
  })

  test('an empty law derives empty (the boot judge refuses this shape)', () => {
    assert.equal(deriveFamilyLane({ lanes: [], deadKeys: {} }, {}), '')
  })
})

describe('reseatDeadKeys (the reseat drop — stale carry only)', () => {
  const law: FamilyLaw = {
    lanes: [{ lane: 'r', guideKeys: ['mode'] }, { lane: 'open' }],
    deadKeys: { r: ['stale_b', 'stale_a'] },
  }

  test('a lane with no deadKeys rides unchanged by reference', () => {
    const doc = { mode: 'x' }
    const out = reseatDeadKeys({ lanes: [{ lane: 'open' }], deadKeys: {} }, doc, {})
    assert.equal(out.params, doc)
    assert.deepEqual(out.dropped, [])
  })

  test('an empty deadKeys list rides unchanged by reference', () => {
    const doc = { mode: 'x' }
    const out = reseatDeadKeys({ lanes: [{ lane: 'open' }], deadKeys: { open: [] } }, doc, {})
    assert.equal(out.params, doc)
    assert.deepEqual(out.dropped, [])
  })

  test('a dead key the merged doc never states is not a drop', () => {
    const doc = { mode: 'x' }
    const prior = { stale_a: 'old' }
    const out = reseatDeadKeys(law, doc, prior)
    assert.equal(out.params, doc)
    assert.deepEqual(out.dropped, [])
  })

  test('THE CARRY LINE: a dead key only this write states stands — the write door refuses it in the run voice, the drop never launders', () => {
    const doc = { mode: 'x', stale_a: 'authored' }
    const prior = { mode: 'x' }
    const out = reseatDeadKeys(law, doc, prior)
    assert.equal(out.params, doc)
    assert.deepEqual(out.dropped, [])
  })

  test('stale carry drops — every dead key both rows state — sorted, a NEW record', () => {
    const doc = { mode: 'x', stale_b: 'new-b', stale_a: 'new-a', keep: 'c' }
    const prior = { stale_a: 'old-a', stale_b: 'old-b', keep: 'old-c' }
    const out = reseatDeadKeys(law, doc, prior)
    assert.notEqual(out.params, doc)
    assert.deepEqual(out.params, { mode: 'x', keep: 'c' })
    assert.deepEqual(out.dropped, ['stale_a', 'stale_b'])
  })
})
