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
  assertGridLength, GRID_MAX_FRAMES, solveWindowComposition, type WindowComposition,
} from '@melite/models-h3/timelineContract'

/** The four mod bags, in the card's own declaration order. */
export const COMMISSION_KINDS = ['replace', 'repair', 'extend', 'reshoot'] as const
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
