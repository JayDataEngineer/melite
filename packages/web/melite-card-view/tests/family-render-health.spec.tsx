// @contract infra-family-render-health
// family-render-health.spec.tsx — THE RENDER-HEALTH WALL (open-scan
// half-A item 2, the 2026-11-06 gate-green register OWED item 7).
//
// THE LESION IT KILLS: every wall proved the card face's DATA (the
// compose, the served doc, the door parity) — nothing proved the face
// itself MOUNTS HEALTHY. The blocked-panel class (a card face that
// mounts but renders nothing, re-renders without bound, or crashes
// into an error boundary's triage) survived with zero trace anywhere:
// the panel is dead in the studio while every suite stays green.
//
// THE WALL: for the DERIVED family roster — `boardedMap(loadCardDefs())`,
// the same export the form-spec door resolves families with
// (discovery.ts boardedMap; the serve loop's `def.boarded` derivation,
// never a hand list) — it serves each family's real doc through
// `formSpecArm(family)` (the door's own body; the cards-mirror and
// lane-strike seam) over the REAL boot, and mounts the estate's real
// face constructor (`CardForm`, @melite/card-base/client) seeded the
// drill's own way (`seedUser`). One mount per family. Three health
// predicates ride that mount: the face renders its root element with
// content; its React commit count stays under the bound after settle
// (a setState-in-effect loop re-commits unboundedly — the Profiler
// commit count is the render/effect loop's own signal); and nothing
// was caught or threw (no boundary triage, no refused mount).
//
// Run: npx vitest run packages/web/melite-card-view/tests/family-render-health.spec.tsx
import '../../../../tests/helpers/boot-models.ts'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, test } from 'vitest'
import { createElement as h, Profiler } from 'react'
import {
  CardForm,
  seedUser,
  unbindEstateRemote,
  type FormSpecDoc,
  type SpecValues,
} from '@melite/card-base/client'
import { boardedMap, formSpecArm } from '../../../../packages/harness/melite-tools/src/discovery.ts'
import { loadCardDefs } from '@melite/comfyui-cordis'

/** THE LOOP BOUND: a healthy mount commits 1–3 times (initial +
 *  the axes' seed cascade). The bound admits the settled cascade and
 *  refuses a loop — a setState-in-effect cycle re-commits past any
 *  sane ceiling inside the settle window. */
const COMMIT_BOUND = 30

/** THE SETTLE WINDOW: drains the mount cascade's delayed work (the
 *  drill's own settle-barrier mechanic). A timer- or microtask-driven
 *  loop spends this window committing; a healthy face is silent in it. */
const SETTLE_MS = 100

/** One family's mount health. */
interface FaceHealth {
  family: string
  card: string
  /** formSpecArm resolved the family's served doc (false = blocked at the root). */
  served: boolean
  /** the mount produced its root element (the container's first child). */
  mounted: boolean
  /** rendered text length of the face (0 = an empty face — the panel painted nothing). */
  faceChars: number
  /** Profiler commit count across mount + settle (the render/effect loop signal). */
  commits: number
  /** errors React recovered (boundary triage) + uncaught throws during the settle. */
  triage: string[]
  /** the mount itself refused (a render that threw past every boundary). */
  refused: string | null
}

const voice = (e: unknown): string => (e instanceof Error ? e.message : String(e))

/** The two face predicates, shared by the sweep and the control: what
 *  the container must show for the face to count as alive. */
function faceOf(container: HTMLElement): { root: boolean; chars: number } {
  return { root: container.firstElementChild !== null, chars: (container.textContent ?? '').trim().length }
}

/** Mount ONE family's served face the drill's way and record its health. */
async function probeFace(family: string, card: string): Promise<FaceHealth> {
  const row: FaceHealth = { family, card, served: false, mounted: false, faceChars: 0, commits: 0, triage: [], refused: null }
  let doc: FormSpecDoc | null = null
  try {
    doc = await formSpecArm(family)
  } catch (e) {
    row.refused = voice(e)
  }
  if (doc === null) return row
  row.served = true
  const commits = { n: 0 }
  const triage: string[] = []
  const onError = (e: unknown): void => { triage.push(voice(e)) }
  const uncaught = (e: Event): void => { triage.push((e as ErrorEvent).message) }
  const unhandled = (e: PromiseRejectionEvent): void => { triage.push(voice(e.reason)) }
  window.addEventListener('error', uncaught)
  window.addEventListener('unhandledrejection', unhandled)
  try {
    const view = render(
      h(Profiler, { id: `face:${family}`, onRender: () => { commits.n += 1 } },
        h(CardForm, {
          spec: doc,
          user: seedUser(doc, {}) as SpecValues,
          onSet: () => {},
          onPick: () => {},
        })),
      { onRecoverableError: onError },
    )
    await act(async () => { await new Promise((r) => setTimeout(r, SETTLE_MS)) })
    const face = faceOf(view.container)
    row.mounted = face.root
    row.faceChars = face.chars
  } catch (e) {
    row.refused = voice(e)
  } finally {
    window.removeEventListener('error', uncaught)
    window.removeEventListener('unhandledrejection', unhandled)
    row.commits = commits.n
    row.triage = triage
    cleanup()
  }
  return row
}

const rows: FaceHealth[] = []

afterEach(() => {
  cleanup()
  unbindEstateRemote()
})

describe('THE FAMILY RENDER-HEALTH WALL (the blocked-panel class mounts, paints, settles, uncaught)', () => {
  beforeAll(async () => {
    // THE DERIVED ROSTER: family -> owning card, off the real card
    // tier's own boarded arrays (the serve loop's derivation — the
    // 2026-11-09 inpaint cure's footing, generalized over every card).
    const roster = boardedMap(await loadCardDefs())
    for (const [family, card] of roster) rows.push(await probeFace(family, card))
  })

  test('ARM 1 — THE ROSTER FOOTING: the derivation rides real families, and every boarded family serves its doc', () => {
    expect(rows.length, 'the derived roster is non-empty (a wall riding nothing is a lie)').toBeGreaterThan(0)
    const unserved = rows.filter((r) => !r.served).map((r) => `${r.family} (on ${r.card})`)
    expect(unserved,
      'boarded families whose form-spec door serves no doc — the face is blocked at the root (a panel that can never paint). Serve the family\'s doc at discovery or unboard it; then this wall keeps the door open').toEqual([])
  })

  test('ARM 2 — THE NON-EMPTY FACE: every family\'s mount produces its root element with content', () => {
    const blank = rows
      .filter((r) => r.served && (!r.mounted || r.faceChars === 0))
      .map((r) => `${r.family} (on ${r.card}${r.refused === null ? '' : `: ${r.refused}`})`)
    expect(blank,
      'card faces that mounted but painted NOTHING (no root element or an empty face) — the blocked panel, live in the studio under green suites. Cure the face\'s render for that family; then this wall keeps every panel painted').toEqual([])
  })

  test('ARM 3 — THE RENDER COUNT: every family\'s face settles under the commit bound (no runaway loop)', () => {
    const looping = rows
      .filter((r) => r.served && r.commits >= COMMIT_BOUND)
      .map((r) => `${r.family} (on ${r.card}): ${r.commits} commits`)
    expect(looping,
      `card faces whose commit count blew past ${COMMIT_BOUND} during mount + settle — a setState-in-effect loop re-painting without bound (the stuck panel). Break the cycle in that family's face; then this wall keeps the count bounded`).toEqual([])
  })

  test('ARM 4 — NO ERROR TRIAGE: no recoverable error, uncaught throw, or refused mount on any family\'s face', () => {
    const triaged = rows
      .filter((r) => r.triage.length > 0 || r.refused !== null)
      .map((r) => `${r.family} (on ${r.card}): ${r.refused ?? r.triage.join(' | ')}`)
    expect(triaged,
      'card faces whose mount was caught-and-recovered (boundary triage) or threw uncaught — the face survived by dying. Fix the render for that family; then this wall keeps every mount uncaught').toEqual([])
  })

  test('THE CONTROL — the predicates fire on the blocked-panel shape (a face that renders null trips arm 2)', () => {
    // the wall's own teeth: a null-rendering face through the SAME
    // predicates reads as unmounted + empty — the arms can never be
    // always-true against the shape they exist to catch
    const Probe = (): null => null
    const view = render(h(Probe))
    const health = faceOf(view.container)
    expect(health.root, 'a null face reads as unmounted').toBe(false)
    expect(health.chars, 'a null face reads as empty').toBe(0)
    cleanup()
  })
})
