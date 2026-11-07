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
  activeRecipeId,
  composeCandidateDoc,
  composeValidate,
  dropStaleReopenCarry,
  resolveValue,
  rowsFor,
  type FormSpecDoc,
  type SpecValues,
} from '@melite/card-base/client'
import { CATEGORIES } from '@melite/contracts/planes'

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
 *  @param user the stage's user layer — presence here is authorship,
 *  EXCEPT for keys in `deAuthored` (the drill's own heal ledger: a
 *  key the open heal already wrote null is the drill's verdict, and
 *  the seed's stale copy in the user map is not a hand's word — the
 *  2026-11-15 sweep's tts hop, where the resurrected copy refused
 *  the pick's whole frame at the mirror).
 *  @param base the served base map; absent strikes nothing.
 *  @param deAuthored keys the drill's own heal dropped (the
 *  droppedRef ledger) — authorship yields to the heal's verdict for
 *  these. Unset (the note's read-side seat) keeps the plain law. */
export function strikeDeadLaneStamps(
  spec: FormSpecDoc | null,
  user: SpecValues,
  base: SpecValues | undefined,
  deAuthored?: ReadonlySet<string>,
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
    if (!(k in out) || (k in user && deAuthored?.has(k) !== true)) continue
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
  // (c) THE DEPARTED RECIPE'S GHOSTS (the qwen-img-edit-21 burn,
  // 2026-11-15): the recipe face derives over base ⊕ user
  // (composeCandidateDoc — the drill's pickHeld layer), and the
  // base is the LAST RESOLUTION's stamp plane: the estate refreshes
  // it when it re-resolves, not when a pick re-keys the doc. A
  // recipe switch therefore leaves the departed row's stamps in the
  // base — the layer carries BOTH rows' stamps and activeRecipeId
  // names NEITHER (the twin-stamp dead zone; the live wire: the doc
  // held remove-background's full stamp {prompt, steps 8, cfg 1}
  // while the served base still resolved upstream's
  // sampler/scheduler — the face read the placeholder for good over
  // a doc the pure derivation names). The judge is clause-2's own
  // verb, by difference: when the layer names NO row, strike the
  // base-held recipe-plane keys the user never authored — a pick's
  // authorship lands in the USER map (the atomic pick's merge), so
  // a recipe stamp with no user word and no live row is a ghost —
  // and keep the strike only when the struck layer names a row (the
  // estate doc's own truth decides, never a guessed neighbor). THE
  // REOPEN CASE never strikes: a base whose layer still names a row
  // IS that row's stamp plane — the dead-zone gate closes before
  // any key moves.
  const named = activeRecipeId(spec, composeCandidateDoc(out, user, {}))
  if (named === undefined) {
    const recipeKeys = new Set<string>()
    for (const row of rowsFor(spec, CATEGORIES.recipe)) {
      for (const k of Object.keys(row.defaults)) recipeKeys.add(k)
    }
    const ghosts = Object.keys(out).filter((k) => recipeKeys.has(k) && !(k in user))
    if (ghosts.length > 0) {
      const struck: SpecValues = { ...out }
      for (const k of ghosts) delete struck[k]
      if (activeRecipeId(spec, composeCandidateDoc(struck, user, {})) !== undefined) {
        for (const k of ghosts) {
          delete out[k]
          strikes.push(k)
        }
      }
    }
  }
  return { base: out, strikes }
}
