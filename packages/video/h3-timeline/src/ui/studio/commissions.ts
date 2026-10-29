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
 * THE LAW: a mod bag is ARMED by presence, exactly as the card reads
 * it (an absent or empty array is the unused arm — the film composes
 * and renders byte-identically). This module derives what an armed
 * bag COMMISSIONS — kind, the seats its entry names, and, for the
 * extend, the window composition it will build — for the rail to
 * draw. It READS; it never writes, never defaults a seat, and never
 * invents a commission the doc does not carry.
 *
 * WHY A DERIVATION AND NOT A MIRROR: the bags live outside `LayerA`
 * and outside the studio's three write channels (calls, keyframes,
 * layerA). They are the agent's commissions, preserved across
 * open→save by the bench's merge-patch — so the rail projects the
 * durable row and holds no state of its own.
 */
import { solveWindowComposition, type WindowComposition } from '@melite/models-h3/timelineContract'

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

/** One armed commission, as the rail renders it. */
export interface DocCommission {
  kind: CommissionKind
  /** The bag entry, verbatim (the rail names its seats). */
  seats: CommissionSeat[]
  /** Extend only: the composition the door will compose (N windows,
   *  each window's frames, the delivered frames). Absent for the
   *  single-window arms and for every non-extend kind. */
  geometry?: CommissionGeometry
  /** Extend only: the compose door's refusal voice when the stated
   *  seconds compose nowhere exactly — the rail shows the armed-and-
   *  doomed doc instead of a lane that looks fine. */
  refusal?: string
}

/** The frames-per-second the composition's seconds readout divides by
 *  (the film clock — the solver's own divisor). */
const FILM_FPS = 24

/** Read one bag's single entry, exactly as the card's arm predicate
 *  does: an absent bag, a non-array, or an empty array is DISARMED.
 * @param params the durable bench row
 * @param kind the bag key
 * @returns the first entry, or undefined when the arm is unused */
function bagEntry(
  params: Record<string, unknown> | undefined,
  kind: CommissionKind,
): Record<string, unknown> | undefined {
  const bag = params?.[kind]
  if (!Array.isArray(bag) || bag.length === 0) return undefined
  const entry = bag[0]
  return typeof entry === 'object' && entry !== null ? (entry as Record<string, unknown>) : undefined
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
    const entry = bagEntry(params, kind)
    if (entry === undefined) continue
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
