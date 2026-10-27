/**
 * lane-strike.ts — THE BASE STRIKE (audits 018 C4 + 016 C5, the
 * client half of the pick⇄base edge).
 *
 * The stage's served base is the LAST RUN's resolved map — a stamp
 * plane for the lane it resolved THEN. After a pick re-keys the lane,
 * base-held stamps the RESOLVED lane no longer serves resurrect
 * through resolveValue's base layer: the pick's null verdicts leave
 * the USER map (the unset law), and the cascade's null-skip reads the
 * base right under them — so the studio re-offers a coordinate the
 * next run refuses (audit 018's live burn: the base's fp16
 * resurrecting under a variant that serves no such quant; audit
 * 016's shape: the departed lane's voice resurrecting after the
 * variant switch). No client verb can write the base layer away —
 * the strike is the read-side cure: judge each base-held stamp
 * against the RESOLVED lane's own law and retire the dead ones
 * BEFORE the cascade, NAMING them (never a silent heal).
 *
 * The two judges are the mirror's own, never a second spelling:
 *  - non-axis params: dropStaleReopenCarry's judge — the resolved
 *    (variant × quant) lane surface; a stated key off it is dead
 *    carry (the reopen heal's same verb, judged at this seat because
 *    the base plane is a reopen-shaped ghost: nobody authored it on
 *    THIS lane).
 *  - the quant stamp (audit 018's departed quant): the mirror's
 *    clause-2 judge by difference — the probe doc WITH the stamp must
 *    refuse MORE than without it. A value-lawful key never strikes:
 *    an envelope violation is the compose gate's banner with its own
 *    unstamp affordance, not a dead seat.
 *
 * User-restated keys never strike: presence is authorship, and the
 * gate banners authored ghosts with the field's own affordance
 * (SD-7). PURE — the caller owns the write.
 */
import {
  composeValidate,
  dropStaleReopenCarry,
  resolveValue,
  type FormSpecDoc,
  type SpecValues,
} from '@melite/card-base/client'

export interface LaneStrike {
  /** The base copy with the dead stamps removed — the map to resolve
   *  against. Never the caller's object (PURE). */
  base: SpecValues
  /** The struck key names, in the base map's own order — the note's
   *  words and the wall's assertion both read this list. */
  strikes: string[]
}

const unstated = (v: unknown): boolean => v === undefined || v === null || v === ''

/** Strike the base-held stamps the resolved lane does not serve.
 *  @param spec the stage's served form spec; null (the spec-less
 *  drill) strikes nothing.
 *  @param user the stage's user layer — presence here is authorship.
 *  @param base the served base map; absent strikes nothing. */
export function strikeDeadLaneStamps(
  spec: FormSpecDoc | null,
  user: SpecValues,
  base: SpecValues | undefined,
): LaneStrike {
  if (spec === null || base === undefined) return { base: base ?? {}, strikes: [] }
  const out: SpecValues = { ...base }
  const strikes: string[] = []
  // (a) NON-AXIS GHOSTS — the resolved surface's own judge over the
  // resurrection (the doc as the cascade would show it): a stated
  // key off the resolved lane's surface is dead carry.
  const resurrected = resolveValue(spec, user, base)
  const dead = dropStaleReopenCarry(spec, resurrected)
  for (const k of Object.keys(dead)) {
    if (!(k in out) || k in user) continue
    delete out[k]
    strikes.push(k)
  }
  // (b) THE DEPARTED AXIS STAMP — a base-held quant the resolved
  // variant does not serve: the mirror refuses the probe doc WITH it
  // and not without (clause 2, the coordinate's own judge). The
  // axis falls UNSTATED — the variant's own cell law seeds it at the
  // next pick/flush, never a guessed neighbor.
  if (unstated(user['quant'])) {
    const held = out['quant']
    if (typeof held === 'string' && held !== '') {
      const withStamp = composeValidate(spec, resurrected)
      const withoutStamp = composeValidate(spec, { ...resurrected, quant: undefined })
      if (withStamp.length > withoutStamp.length) {
        delete out['quant']
        strikes.push('quant')
      }
    }
  }
  return { base: out, strikes }
}
