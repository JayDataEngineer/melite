// extra-vocabulary.spec.ts — THE HARVEST PIN (2026-10-10, the
// operator's law: the contracts should be so deep that it
// is literally impossible to speak two vocabularies).
//
// Wall 1 (compile): every declaration writes its bag through
// bag() — tsc refuses an unknown key at the literal (ts2353), and
// bag() re-validates at runtime for spread arms.
// Wall 2 (read): every face narrows through extraOf — one spelling
// each, the floor's own constants.
// THIS IS WALL 3 (the net): walk EVERY registered card envelope and
// EVERY absorbed mod envelope, harvest every meta.extra key that
// actually rides the wire, and refuse any key outside EXTRA_KEYS —
// naming card, field, and key. A bypassed write (a spread arm, a
// hand-built schema) can dodge walls 1 and 2; it cannot dodge the
// wire.
//
// The second direction — completeness: every table key the walk
// finds UNUSED is reported in the harvest report (dead vocabulary
// rows get named, never silently kept).
import { describe, expect, test, beforeAll } from 'vitest'
import { EXTRA_KEYS, EXTRA_KEY_SET } from '@melite/contracts/extraKeys'
import { loadCardDefs, theService } from '../src/cardDefs.ts'

interface RefNode {
  meta?: Record<string, unknown>
  dict?: Record<string, number>
  list?: number[]
}
interface Envelope { uid: number; refs: Record<number, RefNode> }

const harvested = new Map<string, string>() // "card#field#key" -> key
/** The CARD-DECLARED MOD KINDS' raw row keys (2026-10-12): these
 *  rows are FLAT SpecField literals — min/max/step are core
 *  columns there, not extra-bag vocabulary, so they never feed
 *  direction 1 (outside-key refusal: that face's drift gate is the
 *  STRICT mods-schema wire gate — unknown keys refuse at
 *  registration). They DO feed direction 2 (liveness): a vocab key
 *  that rides only this face is alive (required_when rides the
 *  mask card's sam3 rows; skipping this face left it reading
 *  dead). */
const kindRowKeys = new Set<string>()

const walkEnvelope = (owner: string, env: Envelope | null): void => {
  if (env == null) return
  const seen = new Set<number>([env.uid])
  const queue: Array<{ id: number; field: string }> = [{ id: env.uid, field: '' }]
  while (queue.length > 0) {
    const { id, field } = queue.shift()!
    const node = env.refs[id]
    if (node === undefined) continue
    const extra = node.meta?.['extra']
    if (typeof extra === 'object' && extra !== null && !Array.isArray(extra)) {
      for (const key of Object.keys(extra as Record<string, unknown>)) {
        harvested.set(owner + '#' + (field || '·root') + '#' + key, key)
      }
    }
    if (node.dict !== undefined) {
      for (const [name, ref] of Object.entries(node.dict)) {
        if (!seen.has(ref)) { seen.add(ref); queue.push({ id: ref, field: name }) }
      }
    }
    if (node.list !== undefined) {
      for (const ref of node.list) {
        if (!seen.has(ref)) { seen.add(ref); queue.push({ id: ref, field }) }
      }
    }
  }
}

beforeAll(async () => {
  await loadCardDefs()
  const svc = theService()
  for (const cardId of svc.cardIds()) {
    const def = svc.getCardDef(cardId)
    for (const family of def?.boarded ?? [cardId]) {
      const schemas = svc.formSchemas(cardId, family)
      walkEnvelope(cardId + ':' + family, schemas?.schema as Envelope | null)
      for (const [pack, env] of Object.entries(schemas?.mods ?? {})) {
        walkEnvelope(cardId + ':' + family + ':mod:' + pack, env as Envelope | null)
      }
    }
    // THE CARD-DECLARED MOD KINDS (2026-10-12): the kinds' raw
    // field rows ride the wire too (the strict mods-schema gate
    // validates them; the form-spec serves them verbatim) — their
    // keys count for LIVENESS (see kindRowKeys above; direction 1
    // stays envelope-pure — the wire gate owns refusal there).
    for (const k of def?.mods ?? []) {
      for (const f of [...(k.fields ?? []), ...(k.kindFields ?? [])] as Array<Record<string, unknown>>) {
        for (const key of Object.keys(f)) {
          if (EXTRA_KEY_SET.has(key)) kindRowKeys.add(key)
        }
      }
    }
  }
})

describe('THE HARVEST PIN: every extra-bag key on the wire is contract vocabulary', () => {
  test('every harvested key is in the table (a bypassed or drifted write refuses, named)', () => {
    expect(harvested.size, 'the walk found extra bags on the wire').toBeGreaterThan(50)
    const outside = [...harvested.keys()].filter((k) => !EXTRA_KEY_SET.has(k.split('#')[2]))
    expect(outside, 'keys outside EXTRA_KEYS — card#field#key').toEqual([])
  })

  test('the vocabulary is live: every table key rides some real envelope (dead rows get named)', () => {
    const used = new Set<string>([...harvested.values(), ...kindRowKeys])
    const dead = EXTRA_KEYS.filter((k) => !used.has(k))
    // 'default' is the one documented exception (anny's dynamic
    // spreads write it; no reader — recorded in the table's owners)
    expect(dead.filter((k) => k !== 'default')).toEqual([])
  })

  test('the wall is armed: bag() refuses a foreign key at runtime (spread arms cannot dodge)', async () => {
    const { bag } = await import('@melite/contracts/extraKeys')
    expect(() => bag({ order: 1, visable_when: 'x=y' } as never))
      .toThrow(/visable_when.*not in the contract's vocabulary/)
  })
})
