// @melite/harness-melite-tools — P1-5 at the SERVED face (defect
// board row 5: "ONE vocabulary… Kill window_start, window_length,
// clip_seconds, segment_crf from the agent-facing surface (keep them
// internal)"). The mechanism: a field row carrying internal: true
// stays DECLARED (the compose door admits it — the expert override
// and the preset patches keep composing) but is never SERVED —
// discovery's servedFields drops it, so the agent's field listing
// and the studio form stop teaching the second dialect. THE BURN
// this buries: the audit's Axis 5 census — "25 served fields on the
// edit kind", window_start taught with hand-computed frame recipes
// (skills/edit/SKILL.md), and run-e79f3b304e4b (an agent typed
// window_length: 90 on a 243 f film, repaired 90 of 243 frames,
// reported it as a repair pass). This wall rides the REAL card —
// the real registry boot, the real served form-spec, the h3 edit
// kind exactly as the agent loads it through melite_load.
import "../../../../tests/helpers/boot-models.ts";
import { describe, expect, it, beforeAll } from 'vitest'
import { loadCardDefs } from '@melite/comfyui-cordis'
import { formSpecArm } from '../src/discovery.ts'
import type { FormSpecDoc, ModifierKind } from '@melite/contracts/formSpec'
import type { SpecField } from '@melite/card-base/spec'

/** the second-dialect rows the board kills from the agent's face —
 * kept INTERNAL (admitted), never SERVED. */
const INTERNAL_ROWS = ['window_start', 'window_length', 'clip_seconds', 'overlap_frames', 'segment_crf'] as const

let served: ModifierKind | undefined
let declared: Record<string, unknown> | undefined

beforeAll(async () => {
  const defs = await loadCardDefs()
  const def = defs.get('h3-timeline')!
  // the DECLARATION plane: the card's own edit kind row (admission's
  // truth — the surface cardsCompose admits against)
  declared = ((def.mods as unknown as Array<Record<string, unknown>>).find((k) => k.kind === 'edit'))
  // the SERVED plane: the form-spec exactly as the agent loads it
  const doc = (await formSpecArm('h3-timeline')) as unknown as FormSpecDoc | null
  expect(doc, 'the card alias serves a form doc').not.toBeNull()
  served = doc!.features?.modifiers?.find((k) => k.kind === 'edit')
  expect(served, 'the edit kind serves its modifier row').not.toBeUndefined()
})

describe('P1-5 internal surface — the second dialect is off the agent\'s face, the expert door stays open', () => {
  it('THE ONE NEW CONCEPT IS SERVED: carry rides the edit kind at default true', () => {
    const carry = served!.fields?.find((f: SpecField) => f.name === 'carry')
    expect(carry, 'carry is on the agent\'s field listing').not.toBeUndefined()
    expect((carry as unknown as Record<string, unknown>).default).toBe(true)
  })

  it('THE SECOND DIALECT IS UNSERVED: no window_start, no window_length, no clip_seconds, no overlap_frames, no segment_crf', () => {
    const names = new Set((served!.fields ?? []).map((f: SpecField) => f.name))
    for (const row of INTERNAL_ROWS) {
      expect(names.has(row), `${row} must NOT be served — the agent never types it (defect board row 5)`).toBe(false)
    }
  })

  it('BUT THE DECLARATION KEEPS THEM (admitted, never served): the expert override and the preset patches still compose', () => {
    const declaredNames = new Set(((declared!.fields as unknown as Array<Record<string, unknown>>) ?? []).map((f) => String(f.name)))
    for (const row of INTERNAL_ROWS) {
      expect(declaredNames.has(row), `${row} stays DECLARED — the compose door still admits it`).toBe(true)
    }
    // and the declaration MARKS them internal — the flag the serve
    // plane reads (a declaration without the flag would serve again)
    for (const row of INTERNAL_ROWS) {
      const f = (declared!.fields as unknown as Array<Record<string, unknown>>).find((x) => String(x.name) === row)
      expect(f!.internal, `${row} carries internal: true on the declaration`).toBe(true)
    }
  })

  it('THE PRESET PATCHES STILL RIDE THE INTERNAL KEYS (admission reads the declaration — the refine-2x chip patches clip_seconds, and it keeps composing)', () => {
    // the cell presets are DECLARED patches against the kind's own
    // fields; a preset naming an internal key is the proof the
    // compose door still admits what the agent's face no longer
    // teaches (the expert override, served as one click)
    const sections = (declared!['sections'] as Array<Record<string, unknown>>) ?? []
    const refine2x = sections.find((s) => s.id === 'refine-2x')
    expect(refine2x, 'the refine-2x preset stays declared').not.toBeUndefined()
    const patch = refine2x!['patch'] as Record<string, unknown>
    expect(patch['clip_seconds'], 'the preset patches the internal clip_seconds — internal never means refused').toBe(2.5)
  })
})
