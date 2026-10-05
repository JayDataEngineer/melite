// envelope-laws.spec.ts — THE BOOT GATE's two walk arms that no
// registered card reaches (the re-audit, 2026-10-16).
//
// The gate (src/envelope-laws.ts) walks a card's SERIALIZED envelope:
// refs keyed by uid, each node's presentation facts at meta.extra. Two
// arms of that walk are dead against the in-tree card corpus — every
// registered card roots its declaration at a bare object and gives
// every dict key its own Schema instance — so they are driven here
// against hand-built envelopes:
//
//   1. the ROOT BAG — a root schema that carries its own extra is
//      judged under the `·root` field name, never under an empty one;
//   2. the SEEN DEDUPE — a uid reachable twice is walked once. It is
//      the walk's termination guard, so a cycle proves it: the same
//      shape without it never returns.
//
// Schemastery preserves instance identity through Schema.from, so two
// dict keys naming ONE Schema instance is an ordinary declaration, and
// `set` can point a dict row back at the root itself.
import { describe, expect, test } from 'vitest'
import z from '@deepseek-ai/schemastery'
import { assertEnvelopeLaws, EnvelopeLawRefusal } from '../src/envelope-laws.ts'

/** The registration seat the gate reads: the card's boarded families
 *  and its schema carrier. `compose` never runs at registration. */
const def = (schema: unknown): never => ({
  id: 'probe-card',
  identity: 'probe',
  boarded: [],
  schema,
  compose: () => { throw new Error('never reaches compose') },
} as never)

describe('THE ROOT BAG (a root schema carrying its own extra)', () => {
  test('a foreign key in the ROOT bag refuses, named ·root', () => {
    const schema = z.object({ x: z.string() }).extra('extra', { wtype: 'image_lst' })
    expect(() => assertEnvelopeLaws(def(schema))).toThrow(EnvelopeLawRefusal)
    expect(() => assertEnvelopeLaws(def(schema))).toThrow(/field '·root' wtype 'image_lst'/)
  })

  test('the legal root bag registers clean (the root is judged like any node)', () => {
    const schema = z.object({ x: z.string() }).extra('extra', { wtype: 'image_list', max_stack: 4, zone: 'inputs' })
    expect(() => assertEnvelopeLaws(def(schema))).not.toThrow()
  })

  test('the hidden-AND-required law fires on the root bag too', () => {
    const schema = z.object({ x: z.string() }).extra('extra', { hidden: true, required: true })
    // this one law names the raw field, not the `·root` alias the bag
    // grammar uses — the refusal text reads `field ''`.
    expect(() => assertEnvelopeLaws(def(schema))).toThrow(/is hidden AND required — an unreachable input/)
  })
})

describe('THE SEEN DEDUPE (one uid, one visit)', () => {
  test('a Schema instance under TWO dict keys is walked once and registers clean', () => {
    const shared = z.string().extra('extra', { wtype: 'image_list', max_stack: 4 })
    expect(() => assertEnvelopeLaws(def(z.object({ a: shared, b: shared })))).not.toThrow()
  })

  test('a CYCLE terminates — a dict row pointing back at the root is not re-walked', () => {
    const root = z.object({ x: z.string() })
    root.set('self', root)
    // without the seen set this queue never drains
    expect(() => assertEnvelopeLaws(def(root))).not.toThrow()
  })

  test('a cycle THROUGH an illegal node still refuses once, naming the field it was reached under', () => {
    const root = z.object({ x: z.string() })
    const bad = z.string().extra('extra', { wtype: 'image_lst' })
    root.set('self', bad)
    expect(() => assertEnvelopeLaws(def(root))).toThrow(/field 'self' wtype 'image_lst'/)
  })
})
