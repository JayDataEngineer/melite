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
 * THE BG PICK IS THE ESTATE SQUARE (F4) — the square-dsh-native
 * 4-FACT law's motion arm: the rail seats the estate's ONE
 * input-selection component by import, carries no private file
 * door, no hand bg skin, and the mounted editor renders the square
 * with the three-entry source menu and the detach verb.
 *
 * THE CHROME RIDES THE DSH VARIANTS (F5) — the hand state skins
 * (.railBtn*, .stampBtn, .reposeBtn, .bgBtnIdle + the camera pill's
 * .camBtn/.frameBtn*) are dead: a derived scan over the module css's
 * class roster and the chrome's s.* bindings reds naming any skin
 * that grows back, and the mounted editor's tool toggles render
 * with the primitives' own variant classes.
 *
 * The group scope is the C5 ruling's STATED TRUTH (journey-closure
 * C5, operator 2026-10-17), asserted estate-side in the admission
 * matrix's T8 group-scope arms (estate-queue
 * cards-admission-matrix.spec.ts): the panel's own groups are
 * generation / guidance / general; the chain group
 * (motion_npz/motion_prompts/motion_constraints) rides the document
 * seam — motion_npz chains from the previous motion's last frame as
 * a graph-wired data channel (flowKinds + flowOutputBindings,
 * card.ts:88-93), not a hand-typed param seat — and the output group
 * rides the input subcard. T8's condition arm reds if a
 * named-not-judged channel ever gains a hand-typed admission seat.
 */
import { LOADED_WAIT } from '../../../../tests/helpers/loaded-wait.ts';
import "../../../../tests/helpers/boot-models.ts";
import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadCardDefs } from '@melite/comfyui-cordis'
import type { CardDefinition } from '@melite/comfyui-card-kit/card-definition'
import { resetStudio, stubLoads, mountEditor, repoRoot } from './helpers.ts'
import { MOTION_URL } from './fixtures.ts'

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
    const css = readFileSync(join(repoRoot(), 'packages/motion/motion/src/ui/studio/component.module.css'), 'utf8')
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
    const css = readFileSync(join(repoRoot(), 'packages/web/card-base/src/shell.module.css'), 'utf8')
    // the scroll-cell rule (the media-query collapse overrides the
    // SAME selector first — pin the rule that carries the scroll)
    const cell = css.match(/\.shell > \*:first-child \{[^}]*?overflow-y: auto[^}]*\}/)
    expect(cell, 'the shell rail cell rule exists').not.toBeNull()
    expect(cell![0]).toContain('overflow-x: clip')
    expect(cell![0]).toContain('overflow-y: auto')
  })
})

describe('THE BG PICK IS THE ESTATE SQUARE (the square-dsh-native law\u2019s motion arm — motion-params audit F4)', () => {
  const RAIL = join(repoRoot(), 'packages/motion/motion/src/ui/studio/MotionRail.tsx')
  const CSS = join(repoRoot(), 'packages/motion/motion/src/ui/studio/component.module.css')
  const HAND_SEAT = 'the bg pick renders the hand seat (the ghost "Background" Button + the hidden type="file" input + .bgBtnIdle) \u2014 ride the estate\u2019s input-selection square (SourceRow, the motion-params journey audit F4)'

  it('FACT M1 (source import): the rail seats the estate\u2019s ONE input-selection component \u2014 imported, not imitated', () => {
    const src = readFileSync(RAIL, 'utf8')
    expect(/import\s*\{[^}]*\bSourceRow\b[^}]*\}\s*from\s*'@melite\/card-base\/client'/.test(src), HAND_SEAT).toBe(true)
  })

  it('FACT M2 (source): the rail carries no private file door \u2014 the square grammar owns every file pick', () => {
    const src = readFileSync(RAIL, 'utf8')
    expect(/<input/.test(src), `${HAND_SEAT} \u2014 MotionRail renders its own <input>`).toBe(false)
    expect(/type="file"/.test(src), `${HAND_SEAT} \u2014 a hand type="file" literal`).toBe(false)
  })

  it('FACT M3 (source): the hand skin is gone from both the tsx and the module css', () => {
    const src = readFileSync(RAIL, 'utf8')
    // rule selectors only — prose comments naming the dead skin are
    // documentation, not a bound class (the census scans rules).
    const cssSelectors = readFileSync(CSS, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    expect(src.includes('bgBtnIdle'), `${HAND_SEAT} \u2014 s.bgBtnIdle still referenced`).toBe(false)
    expect(src.includes('hiddenInput'), `${HAND_SEAT} \u2014 s.hiddenInput still referenced`).toBe(false)
    expect(/\.bgBtnIdle/.test(cssSelectors), `${HAND_SEAT} \u2014 the .bgBtnIdle skin rule still exists`).toBe(false)
    expect(/\.hiddenInput/.test(cssSelectors), `${HAND_SEAT} \u2014 the .hiddenInput rule still exists`).toBe(false)
  })

  it('FACT M4 (runtime render): the mounted editor renders the square with the source menu and the detach verb', async () => {
    stubLoads()
    mountEditor({ params: { motion_bg_image: 'https://host/bg.png' } })
    await vi.waitFor(() => {
      const square = document.body.querySelector('[data-motion-bg] [data-slot-square]')
      if (square === null) throw new Error(HAND_SEAT + ' \u2014 no square rendered in [data-motion-bg]')
      if (square.getAttribute('aria-label') !== 'Background source') {
        throw new Error(`the bg seat is not the estate square (aria-label "${square.getAttribute('aria-label')}")`)
      }
      // the held face: the value renders as the square's thumbnail + detach verb
      if (document.body.querySelector('[data-motion-bg] img') === null) throw new Error('the held bg value renders no thumbnail')
      if (document.body.querySelector('[aria-label="Detach Background"]') === null) throw new Error('the held bg square carries no detach verb')
    }, { timeout: 10000 })
  })

  it('FACT M5 (runtime render): the square\u2019s click opens the THREE-ENTRY source menu \u2014 never a bare OS dialog', async () => {
    stubLoads()
    mountEditor()
    await vi.waitFor(() => {
      if (document.body.querySelector('[data-motion-bg] [data-slot-square]') === null) throw new Error('no bg square rendered')
    }, { timeout: 10000 })
    const square = document.body.querySelector('[data-motion-bg] [data-slot-square]') as HTMLElement
    square.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await vi.waitFor(() => {
      const rows = [...document.body.querySelectorAll('[role="menuitem"]')].map((m) => (m.textContent ?? '').trim())
      for (const row of ['From flow', 'From media', 'From file']) {
        if (!rows.includes(row)) {
          throw new Error(`the bg square opened no source menu (${row} missing; saw ${rows.join('|') || 'none'})`)
        }
      }
    }, { timeout: 10000 })
  })
})

describe('THE CHROME RIDES THE DSH VARIANTS (the motion-params audit F5 — the skin scan)', () => {
  const RAIL = join(repoRoot(), 'packages/motion/motion/src/ui/studio/MotionRail.tsx')
  const VIEW = join(repoRoot(), 'packages/motion/motion/src/ui/studio/MotionStageView.tsx')
  const CSS = join(repoRoot(), 'packages/motion/motion/src/ui/studio/component.module.css')
  /** The hand-skin inventory the variant map killed (the audit's five
   *  rail families + the camera pill's reset/faces). The scan derives
   *  the roster from these FAMILIES — a re-planted member reds named. */
  const SKIN_VOCABULARY = /(?:railBtn|stampBtn|reposeBtn|bgBtnIdle|camBtn|frameBtn)/

  /** Every class selector the module css defines — comments are
   *  stripped first: prose naming the dead families never counts
   *  (only rules can bind a class). */
  function cssClassRoster(law: string): string[] {
    const bare = law.replace(/\/\*[\s\S]*?\*\//g, '')
    return [...bare.matchAll(/\.([a-zA-Z][\w-]*)\s*[,{]/g)].map((m) => m[1]!)
  }

  it('the module css carries no hand Button skin — the derived roster is empty', () => {
    const roster = cssClassRoster(readFileSync(CSS, 'utf8')).filter((name) => SKIN_VOCABULARY.test(name))
    expect(
      roster,
      `hand Button skins grew back in the motion chrome: ${roster.join(', ')} \u2014 the toggles/commits/pill ride the DSH variants (outline/primary/ghost, size sm); the grouping belongs to the shell, never hand CSS (the motion-params journey audit F5)`,
    ).toEqual([])
  })

  it('the rail and the stage view bind no skin class \u2014 the variant seats carry no s.* skin', () => {
    for (const file of [RAIL, VIEW]) {
      const src = readFileSync(file, 'utf8')
      const bound = [...src.matchAll(/\bs\.(\w+)\b/g)].map((m) => m[1]!).filter((name) => SKIN_VOCABULARY.test(name))
      expect(
        bound,
        `${file} still binds a hand Button skin (s.${bound.join(', s.')}) \u2014 ride the DSH variants (the motion-params journey audit F5)`,
      ).toEqual([])
    }
  })

  it('the mounted editor\u2019s tool toggles render the primitives\u2019 own variant faces', async () => {
    stubLoads()
    mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
    const names = ['Skeleton', 'In-place', 'Export', 'Rotate view left (45\u00b0)', 'Full body framing']
    await vi.waitFor(() => {
      const faces = names.map((label) => {
        const el = document.body.querySelector(
          `[aria-label="${label}"], [data-slot="rail-section"] [aria-label="${label}"]`,
        ) ?? [...document.body.querySelectorAll('button')].find((b) => (b.textContent ?? '').trim() === label)
        if (el == null) throw new Error(`the ${label} toggle never rendered`)
        const cls = el.className
        if (!/_ghost_|_outline_|_primary_|_toolbar_/.test(cls)) {
          throw new Error(`the ${label} toggle renders no DSH variant face (className "${cls}") \u2014 the hand skins are gone; the primitives own the states`)
        }
        if (SKIN_VOCABULARY.test(cls)) {
          throw new Error(`the ${label} toggle renders a hand skin class (className "${cls}")`)
        }
        return cls
      })
      // the pressed skeleton toggle rides primary, the idle ones outline/ghost —
      // the faces are DISTINCT variant families, never one hand-tinted voice.
      expect(new Set(faces.map((c) => (c.match(/_ghost_|_outline_|_primary_/) ?? ['none'])[0])).size,
        'all tool toggles render one variant — the pressed/idle faces collapsed').toBeGreaterThan(1)
    }, { timeout: LOADED_WAIT() * 0.5 })
  })
})
