/**
 * commissions.ts — THE STUDIO'S MOD PROJECTION (§9 of the multiwindow
 * unification audit, 2026-11-12).
 *
 * THE BURN it answers (operator, live lane: "the UI that displays the
 * timeline and all the separate clips isn't updating. It looks
 * default, despite the AI agent using the card to string together
 * multiple clips with a mod"): the doc carried the commission, the
 * compose honored it, and the lane rendered as if nothing was armed —
 * the journey's UI hop was unwalled.
 *
 * THE LAW: a mod bag is ARMED when it is a non-empty ARRAY — the
 * card's own predicate (`Array.isArray && length > 0`); an absent bag
 * or an explicit empty array is the unused arm (the film composes and
 * renders byte-identically). This module derives what an armed bag
 * COMMISSIONS — kind, the seats its entry names, and, for the extend,
 * the window composition it will build — for the rail to draw. A
 * present NON-array or a non-object entry is armed-and-doomed at the
 * run door, so it draws a refusal row instead of a clean lane (the
 * burn class inverted: a doc that will refuse must never look fine).
 * It READS; it never writes, never defaults a seat, and never invents
 * a commission the doc does not carry.
 *
 * WHY A DERIVATION AND NOT A MIRROR: the bags live outside `LayerA`
 * and outside the studio's three write channels (calls, keyframes,
 * layerA). They are the agent's commissions, preserved across
 * open→save by the bench's merge-patch — so the rail projects the
 * durable row and holds no state of its own.
 */
import {
  assertGridLength, CONTEXT_OVERLAP_FRAMES, GRID_MAX_FRAMES, solveWindowComposition, type WindowComposition,
} from '@melite/models-h3/timelineContract'
import { STARTER_CALLS } from './docModel.ts'

/** Every mod bag the rail projects, in the card's own declaration
 *  order. The LoRAs joined on 2026-10-30 (F29): the bag reached the
 *  graph but no rail row existed, so the operator could not see the
 *  adapters at all — a bag the compose honors must have a row.
 *  refine + upscale joined on 2026-10-31 (audit
 *  2026-10-31-modpress-row-face): five of seven declared kinds had
 *  no row, so a refine/upscale-only row drew an EMPTY rail — its
 *  whole authored truth invisible beside the starter lie.
 *  `edit` joined on 2026-11-16 (THE READ-LIST COLLAPSE, the one-door
 *  law's UI half): `edit` is the CANONICAL bag — the spelling the
 *  one door's Add writes and the compose door reads. The legacy five
 *  after it are the door's translation for old documents; they ride
 *  the read list only so a legacy doc's armed bags still draw their
 *  rows (§9's law: a bag the compose honors must have a row) — the
 *  canonical bag rides FIRST because it is the one the current door
 *  authors. */
export const COMMISSION_KINDS = ['edit', 'replace', 'repair', 'extend', 'refine', 'upscale', 'reshoot', 'loras'] as const
export type CommissionKind = (typeof COMMISSION_KINDS)[number]

/** One entry seat as the rail names it: the key the compose reads and
 *  the value the doc states (never a default — an unstated seat is
 *  simply absent). */
export interface CommissionSeat {
  key: string
  value: string
}

/** The window composition an extend commission will build (drawn on
 *  the lane so N chained windows are visible, §9's own multiply). */
export type CommissionGeometry = WindowComposition

/** One positioned window's placement in bar space (the frame-offset
 *  segments' tenant data, 2026-11-03): window k of a uniform
 *  composition starts k*(windowFrames − overlap) frames past the
 *  composition's own start — the overlap is the carry seam, the same
 *  constant the solver composed with (one spelling, the contract's
 *  own default).
 *  @param geometry the composition the door will build
 *  @param startAt the composition's first frame in bar space (the
 *  film's end for an extend — the extension appends)
 *  @returns one span per window, film order */
export function windowSpans(
  geometry: CommissionGeometry,
  startAt: number,
): Array<{ start: number, frames: number }> {
  const stride = geometry.windowFrames - CONTEXT_OVERLAP_FRAMES
  return Array.from({ length: geometry.windows }, (_v, k) => ({
    start: startAt + k * stride,
    frames: geometry.windowFrames,
  }))
}

/** A malformed arm the run door refuses: the bag is present but is
 *  not an array, or its entry is not an object. The rail draws the
 *  row (armed by the card's presence predicate) with a note, never a
 *  silent clean lane. */
export type CommissionNote = 'malformed' | 'bad-entry'

/** One armed commission, as the rail renders it. */
export interface DocCommission {
  kind: CommissionKind
  /** The bag entry, verbatim (the rail names its seats). */
  seats: CommissionSeat[]
  /** Extend only (object entry): the composition the door will
   *  compose (N windows, each window's frames, the delivered
   *  frames). Absent for the single-window arms and every non-extend
   *  kind. */
  geometry?: CommissionGeometry
  /** The compose door's refusal voice when the stated seconds compose
   *  nowhere exactly — the rail shows the armed-and-doomed doc
   *  instead of a lane that looks fine. */
  refusal?: string
  /** The malformed-arm note (the door's own refusal is the backstop;
   *  the rail's dictionary names the UI face). */
  note?: CommissionNote
}

/** The frames-per-second the composition's seconds readout divides by
 *  (the film clock — the solver's own divisor). */
const FILM_FPS = 24

/** Read one NON-EMPTY bag's single entry. The ARM predicate is the
 *  card's own (non-empty array, whatever the entry's shape); this
 *  helper only types an object entry, so a non-object entry stays
 *  armed and the caller marks it `bad-entry`.
 * @param bag the armed bag (the caller has already proven array + non-empty)
 * @returns the first entry when it is an object, else undefined */
function bagEntry(bag: unknown[]): Record<string, unknown> | undefined {
  const entry = bag[0]
  // an ARRAY entry is not a seat object (the door refuses its missing
  // seats); the rail marks it bad-entry rather than naming index keys
  return typeof entry === 'object' && entry !== null && !Array.isArray(entry)
    ? (entry as Record<string, unknown>)
    : undefined
}

/** The seats an entry states, in the entry's own key order: strings
 *  verbatim, finite numbers stringified, booleans only when true
 *  (an unstated dial and a stated-false dial compose identically, so
 *  only the stated positive is news to the operator). Nested objects
 *  are skipped — a commission's seats are scalar by the bag law.
 * @param entry the bag's first entry
 * @returns the named seats */
function seatsOf(entry: Record<string, unknown>): CommissionSeat[] {
  const out: CommissionSeat[] = []
  for (const [key, value] of Object.entries(entry)) {
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed !== '') out.push({ key, value: trimmed })
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      out.push({ key, value: String(value) })
    } else if (value === true) {
      out.push({ key, value: 'true' })
    }
  }
  return out
}

/** THE COMPOSITION PROJECTION (extend only): the same solver the
 *  compose door runs, so the rail draws the windows the run will
 *  actually build. A stated extension the solver refuses is NOT
 *  silently hidden — the rail shows the refusal as the commission's
 *  own note, so the operator sees the armed-and-doomed doc before
 *  pressing Run rather than a lane that looks fine.
 * @param entry the extend bag's first entry
 * @returns the composition, or the refusal's voice */
function geometryOf(entry: Record<string, unknown>): {
  geometry?: CommissionGeometry
  refusal?: string
} {
  const seconds = entry.extend_seconds
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return {}
  const frames = Math.round(seconds * FILM_FPS)
  if (frames <= 0) return {}
  try {
    // THE DOOR'S OWN BRANCH (the 2026-11-12 rail audit H1): one
    // window keeps the landed grid law verbatim (its refusal voice is
    // the grid sentence); beyond it the solver composes N uniform
    // windows. Following the same branch keeps the rail's voice the
    // door's voice for the SAME input — never a solver sentence for
    // an input the door never asks the solver.
    if (frames <= GRID_MAX_FRAMES) {
      const windowFrames = assertGridLength(frames, 'h3-timeline extend')
      return { geometry: { windows: 1, windowFrames, deliveredFrames: frames } }
    }
    return { geometry: solveWindowComposition(frames, 'h3-timeline extend') }
  } catch (err) {
    return { refusal: err instanceof Error ? err.message : String(err) }
  }
}

/** Derive the doc's armed commissions, in the card's bag order.
 *  Disarmed bags contribute nothing — the rail's empty state is the
 *  honest "no commission" lane, never a placeholder row.
 * @param params the durable bench row (the doc's own params)
 * @returns one row per armed mod bag */
export function deriveCommissions(params: Record<string, unknown> | undefined): DocCommission[] {
  const out: DocCommission[] = []
  for (const kind of COMMISSION_KINDS) {
    const bag = params?.[kind]
    if (bag === undefined) continue
    // armed iff non-empty array; empty = explicit off (the unused arm)
    if (!Array.isArray(bag)) {
      out.push({ kind, seats: [], note: 'malformed' })
      continue
    }
    if (bag.length === 0) continue
    // THE STACKED BAGS (F29, 2026-10-30; GAPS-19, 2026-11-01): a
    // multi-entry kind projects ONE ROW PER ENTRY. `loras` stacks to
    // the family catalog (max_stack 4 — the distill adapter + the
    // camera adapter) and `refine` stacks to the composed-window
    // ceiling (each entry IS one refine window, max_stack 32), so
    // naming only bag[0] would hide the second adapter / the second
    // window — exactly the invisibility the operator reported on the
    // loras face. Every other bag is one-entry by its own max_stack.
    if (kind === 'loras' || kind === 'refine') {
      for (const row of bag) {
        const stacked = bagEntry([row])
        out.push(stacked === undefined
          ? { kind, seats: [], note: 'bad-entry' }
          : { kind, seats: seatsOf(stacked) })
      }
      continue
    }
    const entry = bagEntry(bag)
    if (entry === undefined) {
      out.push({ kind, seats: [], note: 'bad-entry' })
      continue
    }
    const commission: DocCommission = { kind, seats: seatsOf(entry) }
    if (kind === 'extend') {
      const { geometry, refusal } = geometryOf(entry)
      if (geometry !== undefined) commission.geometry = geometry
      if (refusal !== undefined) commission.refusal = refusal
    }
    out.push(commission)
  }
  return out
}

/** THE CALLS-READING KINDS (the mod-mode calls report, operator
 *  2026-11-14): the kinds whose film action READS the calls text —
 *  reshoot and loras ride the film action (reshoot's prompt is
 *  `"crossview. " + <call text>`), so the calls lane IS their run's
 *  prompt seat. Every other kind (replace, repair, extend, refine,
 *  upscale) composes from the bag entry alone and never reads a
 *  call's text — under those arms the calls lane is dormant. */
export const CALLS_READING_KINDS = ['reshoot', 'loras'] as const

/** What the strip's calls lane IS under the doc's armed commissions
 *  (the honest face the 2026-11-14 report demanded — the lane may
 *  never tell the operator to "describe their video" into a seat the
 *  armed run will not read):
 *  - `plain` — nothing armed: the calls lane is the film's authoring
 *    surface, the default face.
 *  - `prompt` — a calls-reading kind is armed: the lane's text rides
 *    the run (the prompt seat), so the lane stays live and is
 *    labeled as the run's prompt.
 *  - `dormant` — only non-reading kinds are armed: the run composes
 *    from the bag alone, so the starter placeholder stands down (the
 *    lane's hint names the armed kind) and authored prose stays
 *    visible as doc truth the run simply does not read.
 *  - `v2v` — the video-to-video mod (queue 11, operator 2026-11-08:
 *    "WHEN YOU ADD THE MOD FOR VIDEO TO VIDEO, IT CHANGES THE
 *    TIMELINE BAR UNDER THE 'CALLS' SECTION FOR THE VIDEO TO VIDEO
 *    AND CUTS."): the edit bag's presence swaps the calls lane into
 *    THE VIDEO-TO-VIDEO AND CUTS face — the lane's windows ARE the
 *    video-to-video spans and every cut door is live (the strip's
 *    own ADD CUT button, the seam chips, the split seats); only the
 *    prose goes quiet (the edit composes from the mod's own prompt
 *    seat, never a call's text). */
export type CallsLaneFace =
  | { face: 'plain' }
  | { face: 'dormant'; kind: CommissionKind }
  | { face: 'prompt'; kind: CommissionKind }
  | { face: 'v2v'; kind: 'edit' }

/** Derive the calls lane's face from the armed commissions. A reader
 *  wins over any non-reader armed beside it (the run reads calls if
 *  ANY armed action does); the edit bag then wins the v2v face (its
 *  windows are the run's own spans — the cut-authoring lane); with
 *  neither, the lane is dormant under the FIRST armed row's kind
 *  (the commission the hint names).
 * @param commissions the derived armed rows (deriveCommissions)
 * @returns the lane's face */
export function callsLaneFace(commissions: DocCommission[]): CallsLaneFace {
  if (commissions.length === 0) return { face: 'plain' }
  const reader = commissions.find((c) =>
    (CALLS_READING_KINDS as readonly string[]).includes(c.kind))
  if (reader !== undefined) return { face: 'prompt', kind: reader.kind }
  const edit = commissions.find((c) => c.kind === 'edit')
  if (edit !== undefined) return { face: 'v2v', kind: 'edit' }
  const first = commissions[0]!
  return { face: 'dormant', kind: first.kind }
}

/** Whether a call's text is the studio's own starter placeholder
 *  verbatim (trimmed) — the one text the dormant face stands down:
 *  the placeholder is VIEW state inviting prose, never operator
 *  content, so under a non-reading arm painting it is the exact
 *  "describe their video … when that isn't used at all" lie.
 * @param text the call's text
 * @returns true only for the verbatim starter placeholder */
export function isStarterCallText(text: string): boolean {
  return text.trim() === STARTER_CALLS[0]!.text
}
