// @vitest-environment happy-dom
/**
 * motion-rail-seat-census — THE RAIL SEAT PARITY WALL (the
 * motion-params journey audit, 2026-10-16:
 * dev_docs/audits/journey/motion-params-dry-2026-10-16.md, F2 + F3):
 * real registration mount × real served spec × every declared
 * panel-group knob renders. The burn: cfg_type was declared
 * (card.ts, group "guidance", order 0, wtype select) and compose-
 * gated, yet had NO UI seat for the card's whole history — the rail's
 * hand-typed sections list dropped it and the old fixture mirrored
 * the omission (three copies of the truth, two of them wrong).
 *
 * The wall's arms:
 * 1. SEAT PARITY — every knob the DECLARATION seats in the rail's
 *    panel groups renders in the mounted editor (aria-label = the
 *    schema's own description). A declared-but-unrendered knob reds.
 * 2. THE GHOST EDGE — every rendered panel row maps back to a
 *    declared knob of those groups; the panel never seats a ghost
 *    (the family-coverage lesson: both directions of the edge).
 * 3. THE PANEL SPANS THE RAIL — the scrollbar's structural cause
 *    (the audit's F1): the panel is not a half-width track of the
 *    tool-button grid; the wrapper rule pins grid-column + min-width.
 * 4. THE SHELL BELT — the h3 2026-09-22 overflow-x: clip cure
 *    promoted to the ONE shell site so every tenant inherits it
 *    (§3.12: instance-cured in one genre, never walled as a class).
 *
 * The chain group (motion_npz/motion_prompts/motion_constraints)
 * rides the timeline's document seam and the output group the input
 * subcard — the census scopes to the panel's own groups:
 * generation / guidance / clock.
 */
import "../../../../tests/helpers/boot-models.ts";
import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { loadCardDefs } from '@melite/comfyui-cordis'
import type { CardDefinition } from '@melite/comfyui-card-kit/card-definition'
import { resetStudio, stubLoads, mountEditor } from './helpers.ts'

/** The groups whose knobs the rail's panel owns — SANCTIONED ids
 *  only (the group-vocabulary wall: general is the universal
 *  clock/run-level group; the old hand list's "clock" was a group id
 *  the vocabulary never carried). */
const RAIL_GROUPS = new Set(['generation', 'guidance', 'general'])

interface DeclaredKnob { readonly name: string; readonly label: string }

/** The declared panel-group knob roster, derived from the REGISTERED
 *  schema (the real DECL — never a hand list): name + description
 *  (the rendered row's aria-label) per knob. */
function declaredRailKnobs(def: CardDefinition): DeclaredKnob[] {
  const json = (def.schema as unknown as {
    toJSON(): { refs: Record<number, { type?: string; dict?: Record<string, number>; meta?: { description?: string; extra?: { group?: string } } }> }
  }).toJSON()
  const root = Object.values(json.refs).find((n) => n.type === 'object' && n.dict !== undefined)
  if (root?.dict === undefined) throw new Error('the registered motion schema serves no object root')
  const knobs: DeclaredKnob[] = []
  for (const [knob, refId] of Object.entries(root.dict)) {
    const meta = json.refs[refId]?.meta
    const group = meta?.extra?.group
    if (typeof group !== 'string' || !RAIL_GROUPS.has(group)) continue
    knobs.push({ name: knob, label: typeof meta?.description === 'string' ? meta.description : knob })
  }
  return knobs
}

/** The row's seat selector: the atoms' labeling law prefixes the
 *  field label on every input face (the slider atom appends its
 *  aria word, card.module.css's slider row; the seed/select atoms
 *  ride the bare label) — the census matches the PREFIX, the chrome
 *  (info glyphs, seed dice) never claims a field label. */
function seatSelector(label: string): string {
  return `[aria-label^="${label.replaceAll('"', '\\"')}"]`
}

/** A rendered accessible name IS a field face when the element is a
 *  form control, or a button the declaration names (the select
 *  faces); the info glyph (role note) and the seed dice carry their
 *  own chrome copy and never count. */
function isDeclaredFace(el: Element, declared: DeclaredKnob[]): boolean {
  const tag = el.tagName.toLowerCase()
  if (tag === 'input' || tag === 'select' || tag === 'textarea') return true
  if (tag === 'button') return declared.some((k) => (el.getAttribute('aria-label') ?? '').startsWith(k.label))
  return false
}

let def: CardDefinition
beforeAll(async () => {
  def = (await loadCardDefs()).get('motion')!
  expect(def, 'the composition root serves the motion card').toBeTruthy()
})

afterEach(() => resetStudio())

describe('THE RAIL SEAT PARITY (the motion-params journey audit)', () => {
  it('every declared panel-group knob renders in the mounted editor (cfg_type never drops again)', async () => {
    stubLoads()
    mountEditor()
    const knobs = declaredRailKnobs(def)
    expect(knobs.length, 'the declaration serves panel-group knobs to census').toBeGreaterThan(0)
    for (const knob of knobs) {
      await vi.waitFor(() => {
        // The SEAT is the row: the atom's input face, or the row
        // gate's own refusal marker (atoms.tsx data-refused) — a
        // minimal stage carries no user layer, so value-less rows
        // lawfully render the refused face; the census judges the
        // SEAT, value walls judge states. A knob with neither has no
        // rail seat — the cfg_type class.
        const seat = document.body.querySelector(seatSelector(knob.label))
          ?? document.body.querySelector(`[data-refused="${knob.name}"]`)
        if (seat === null) {
          throw new Error(`the declared knob ${knob.name} ("${knob.label}") has no rail seat — the cfg_type class`)
        }
      }, { timeout: 10000 })
    }
  })

  it('every rendered panel row IS a declared panel-group knob — the panel never seats a ghost', async () => {
    stubLoads()
    mountEditor()
    await vi.waitFor(() => {
      if (document.body.querySelector('[data-testid="mo-gen-panel"]') === null) throw new Error('no gen panel')
    }, { timeout: 10000 })
    const declared = declaredRailKnobs(def)
    const rows = document.body.querySelectorAll(
      '[data-testid="mo-gen-panel"] [aria-label], [data-testid="mo-guide-panel"] [aria-label], [data-testid="mo-clock-panel"] [aria-label]',
    )
    expect(rows.length, 'the panels render rows to judge').toBeGreaterThan(0)
    const ghosts = [...rows]
      .filter((r) => isDeclaredFace(r, declared))
      .map((r) => r.getAttribute('aria-label') ?? '')
      .filter((label) => !declared.some((k) => label.startsWith(k.label)))
    expect(ghosts, `rendered rows no declaration backs: ${ghosts.join(', ')}`).toEqual([])
  })

  it('the params panel spans the rail grid — never a half-width tool-button track', () => {
    // The scrollbar's structural cause (the audit's F1): SpecPanel
    // rendered as an ordinary child of .railGrid's 2-column tool
    // grid — one ~120px track against a ~180px slider min-content —
    // and the overflow became the rail's horizontal scrollbar. The
    // wrapper rule spans the grid and lets the panel shrink.
    const css = readFileSync('packages/motion/motion/src/ui/studio/component.module.css', 'utf8')
    const rule = css.match(/\.railPanel \{[^}]*\}/)
    expect(rule, 'the rail panel wrapper rule exists').not.toBeNull()
    expect(rule![0]).toContain('grid-column: 1 / -1')
    expect(rule![0]).toContain('min-width: 0')
  })

  it('the shell rail cell clips overflow-x — the class cure at the ONE shell site', () => {
    // The h3 2026-09-22 precedent (.railCol overflow-x: clip),
    // promoted to card-base's shell so every tenant inherits it: the
    // belt that keeps a future min-content regression a clipped face,
    // never a horizontal wheel on the params rail.
    const css = readFileSync('packages/web/card-base/src/shell.module.css', 'utf8')
    // the scroll-cell rule (the media-query collapse overrides the
    // SAME selector first — pin the rule that carries the scroll)
    const cell = css.match(/\.shell > \*:first-child \{[^}]*?overflow-y: auto[^}]*\}/)
    expect(cell, 'the shell rail cell rule exists').not.toBeNull()
    expect(cell![0]).toContain('overflow-x: clip')
    expect(cell![0]).toContain('overflow-y: auto')
  })
})
