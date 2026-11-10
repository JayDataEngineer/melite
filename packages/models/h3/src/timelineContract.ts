import { deriveFamilyLane } from '@melite/contracts/familyLane'

export const SEAM_OVERLAP_FRAMES = 22
export const GRID_BASE_FRAMES = 22
export const GRID_STEP_FRAMES = 17
export const GRID_MAX_FRAMES = 362
export const GRID_REMAINDER = 5
export const IMAGE_BUS_SLOTS = 9
/** The family's LAST-FRAME PICK spelling (one home, both readers —
 *  extend.ts's anchor and the seam's keyframe carry): a positive
 *  out-of-band batch index the engine clamps onto the clip's FINAL
 *  row (min(shape−1, index)) under every build; the negative
 *  spelling slices empty on the live estate and is banned
 *  family-wide. */
export const LAST_FRAME_BATCH_INDEX = 16384

export const REF_CAPS = {
  images: 8,
  videos: 3,
  audios: 3,
  // refmods (audit 010/R1, 2026-10-18): the RefMod pack's loader
  // owns MAX_SLOTS = 8 — one slot per mod; strength/copies ride
  // the loader row the compose fills.
  refmods: 8,
} as const

/** THE AV-CONTINUITY LAW, one TS home (defect board row 4, the
 * "derive the carry value" rider). The engine's own vocabulary is
 * AV_TRANSITION_CONTEXT_LENGTHS = (39, 90, 141, 192, 243)
 * (vendor/comfyui_extensions/ComfyUI-MiniMaxH3-Context-Loop/
 * contracts_v05.py:55); on a generated-audio carry join (the edit
 * chain's own mode — context > 0) any other positive boundary
 * refuses AT THE NODE, eight graphs deep
 * (run-1f91718b7cde: "H3 AV generated-audio continuity requires an
 * exact shared video/audio boundary: 39, 90, 141, 192, or 243
 * context frames"). The compose door judges THIS vocabulary at zero
 * GPU so no agent ever discovers it by a burned run; 0 (the cut
 * join, carry: false — the engine's own "cut / independent" preset,
 * contracts_v05.py:158-162) is the one legal value outside it. */
export const AV_CONTINUITY_OVERLAPS = [39, 90, 141, 192, 243] as const

/** The derived carry join (defect board row 4: "join with the same
 * overlap" — the smallest legal boundary, the least context spent;
 * the engine's own reference value and the chain's historical
 * default, now DERIVED instead of typed). */
export const CARRY_JOIN_OVERLAP = 39

/** The carry statement's admission (defect board row 4: "expose
 * exactly one new concept — carry: true"). ABSENT = carry, THE
 * DEFAULT — the gen seam's own law (docModel.ts: "'extend'
 * (ABSENT = carry, THE DEFAULT)"): the film splits on its own
 * timeline and every segment continues from the last frame of the
 * previous. Stated false = the cut join (each segment stands
 * alone; the engine's cut preset, context 0).
 * @param entry the edit-bag entry carrying the carry seat
 * @returns true when segments join with context carry */
export function entryCarries(entry: Record<string, unknown>): boolean {
  const raw = entry['carry']
  if (raw === undefined) return true
  if (typeof raw === 'boolean') return raw
  throw new Error(
    `h3-timeline edit: carry must be a boolean (true = continue each segment from the last frame of the previous; false = cut the joins) — saw ${JSON.stringify(raw)}`,
  )
}

/** THE CARRY-OVERLAP RESOLVER (defect board row 4 — the door the
 * operator asked for five times): the join boundary is DERIVED from
 * the engine's AV-continuity vocabulary, never hand-typed. Unstated
 * → the derived 39 (carry on) or 0 (carry: false); an explicitly
 * stated overlap_frames — the expert override, served on AUTHORED
 * seams' context_length (the plan head itself carries only the
 * AV-legal 39; see chainEdit's planOverlapFeed) — must be 0 or one
 * of the five legal boundaries and REFUSES HERE, at the compose
 * door, quoting the engine's law and naming the stated value, so
 * the run-1f91718b7cde class (a boundary typed legal-looking,
 * refused eight nodes deep) is dead at zero GPU.
 * @param entry the edit-bag entry (overlap_frames / carry seats)
 * @returns the join boundary in frames: 0, 39, 90, 141, 192 or 243 */
export function resolveCarryOverlap(entry: Record<string, unknown>): number {
  const stated = entry['overlap_frames']
  if (stated === undefined || stated === '') return entryCarries(entry)
    ? CARRY_JOIN_OVERLAP
    : 0
  const n = typeof stated === 'number' ? stated : Number(stated)
  if (!Number.isFinite(n) || Math.round(n) !== n) {
    throw new Error(
      `h3-timeline edit: overlap_frames must be a whole number of frames — saw ${JSON.stringify(stated)}`,
    )
  }
  if (n === 0 || (AV_CONTINUITY_OVERLAPS as readonly number[]).includes(n)) return n
  throw new Error(
    `h3-timeline edit: overlap_frames ${n} is not a boundary the engine accepts — H3 AV generated-audio continuity requires an exact shared video/audio boundary: 39, 90, 141, 192, or 243 frames on an AUTHORED seam (0 = the cut join, carry: false — authored windows only); run-1f91718b7cde refused this eight nodes deep. Leave overlap_frames unstated and carry: true (the default) derives the join — never type a boundary`,
  )
}

export interface TimelineSpan {
  readonly start: number
  readonly end: number
  readonly transition?: string
}

export interface TimelineCallSpan {
  readonly start_frame: number
  readonly end_frame: number
  readonly transition?: string
}

/** THE MEDIA-SHAPE PREDICATE (the guide seats' admission law, one
 *  owner for every door that judges it): a guide value names MEDIA —
 *  a $spell, a data: URI, a path/URL (slash), or an extension — never
 *  a bare word. A bare word is a stage/card label (the UI picker's
 *  run-899a8448 crime); it would compose a Load* the engine cannot
 *  resolve. The schema's per-call guide gate and the keyframe pin
 *  gate (actions.ts) share THIS predicate — one law, every guide
 *  spelling. */
export function isMediaRef(v: string): boolean {
  return v.startsWith('$') || v.startsWith('data:') || v.includes('/') || /\.[A-Za-z0-9]+$/.test(v)
}

export function transitionOverlap(transition?: string): number {
  return transition === 'cut' ? 0 : SEAM_OVERLAP_FRAMES
}

/** (2026-11-06, journey audit AUDIO-2 — the three-clock split; ONE
 *  HOME since audit 013 cure 5, 2026-11-12) THE DOC CLOCK'S DEFAULT,
 *  one owner: THIS const. The schema row fps derives it (schema.ts
 *  defaults the walk's fill from here), so the served default and
 *  every frames↔seconds seat agree by construction, never by
 *  matching literals. Before this const the estate spoke three clocks
 *  for one unstated-fps doc — the studio's readers fell to
 *  DEFAULT_SEGMENT_PARAMS.fps (16, the timeline vocabulary's own
 *  default), the schema walk filled 24, and the film mix's
 *  seconds math hardcoded /24 — so the UI booked a 64-frame clip
 *  at 4.0s while the compose stamped it at 2.67s (audio drift,
 *  the audit's worst burn). Every frames↔seconds seat falls to
 *  THIS value: the mix's stanzaSecs/owner map (filmMix.ts), the
 *  stamps' ms() (actions.ts), and the studio's readers
 *  (stemToClip, docCalls' clock, useViewSelection). The derived
 *  wall pins it to the walk's fill — h3schema({}).fps and the
 *  carrier row's declared default — so no second literal can
 *  drift beside it. */
export const DOC_FPS_DEFAULT = 24 as const

/** The doc's LENGTH row default — the schema row's own (56f, the
 *  engine grid's design window 22+17·2), the same seed the walk
 *  fills for span-less calls. One owner, the same law as
 *  DOC_FPS_DEFAULT: the studio's axis fallback reads THIS, never a
 *  second literal (the D-19 cure retired the `: 1` collapse — an
 *  empty-calls axis books the doc's own plan floor, never a
 *  1-frame sliver strip). */
export const DOC_LENGTH_DEFAULT = 56 as const

/** THE LANE-LAW RETIREMENT (2026-11-15, the operator's gate-11 burn:
 *  "WHY DO I SEE THIS BUG … I. NEVER. WANT. TO SEE. THE TESTS GO ALL
 *  GREEN. AND THIS ERROR TO EVER APPEAR AGAIN") — THE DEAD-KEY LAW IS
 *  GONE. This module used to export `T4_ONLY_KEYS` (the 26 post-pass
 *  keys a derived-t4r doc was REFUSED for stating) and
 *  `t4rInjectRefusal` (the voiced spine every door spoke), because
 *  the t4r render arm wired NO post chain: it went straight from the
 *  decode to CreateVideo, so a doc that stated a finish knob composed
 *  it into no node. Keeping the operator's lawful state had required
 *  the studio to strip the keys, the rail to hide the fields, the
 *  recipe rows to withhold Final Cut, and every write door to refuse
 *  the stranded residue — four courts enforcing an engine omission.
 *  The engine now mounts the chain on every arm (actions.ts
 *  renderH3Window: the post block sits ABOVE the family branch; the
 *  t4r mux consumes its output), so EVERY one of those keys fires on
 *  EVERY lane and NO lane refuses any key: FAMILY_LAW.deadKeys is
 *  empty, and the second-pass group renders wherever the doc derives.
 *  A future key that genuinely cannot fire on a lane must be cured by
 *  making it fire (or by the FILM_ONLY gate's precedent: a walk gate
 *  whose repair is a different doc shape, never a lane's dead letter).
 */

/** The knobs only the FILM shape can honor (2026-10-16, audit
 *  3f0b7c1a ui-truth-gap #4; the walk leg closed B6,
 *  timeline-calls-burn §CURES-OWED 5). `duck_depth_db` is read in
 *  exactly one place — computeFilmMix's manifest, inside the
 *  multi-window film boundary (actions.ts) — so on a single-window doc
 *  (t4_open, t4r) the row rendered, persisted and composed into NO
 *  node: the operator set a duck depth the mix desk never saw. TWO
 *  judges read THIS set (one home): the schema walk refuses it loud
 *  on a non-film family (`film-only inject keys`, the t4r gate's
 *  sibling), and the studio's served surface omits it unless the doc
 *  derives t4_chain (the same one-spelling family derivation the t4r
 *  gate uses). */
export const FILM_ONLY_KEYS = ['duck_depth_db'] as const

/** THE FAMILY-LAW DATA (the ERROR g/h cure, 2026-11-08): the
 *  family-conditional key law in the SERVED spelling — the shape
 *  FormSpecDoc.familyLaw carries so the GENERIC seats (the
 *  composeValidate gate, the studio rail's omit) can judge the
 *  family WITHOUT importing this module. THE ONE-SEAT MIGRATION
 *  (2026-11-12): this const IS the derivation — deriveWindowFamily
 *  delegates to the shared evaluator over this data
 *  (@melite/contracts familyLane.ts), so a data copy CANNOT drift
 *  from the walk (the doc-level guide aliases image/image_name/
 *  ref_image are DECLARED here, closing the probe-cell gap where
 *  the walk read seats the data did not name). The lanes spell
 *  deriveWindowFamily's own derivation as data (minCalls →
 *  t4_chain, guideKeys → t4r, the trailing lane is the
 *  fallthrough); deadKeys would name keys a lane's renderer could
 *  not honor (empty for h3 since the 2026-11-15 retirement — the
 *  post chain mounts on every arm). `guideKeys` reads the doc level (the keyframe pin
 *  channel, the last_frame string, the ref surface, the doc-level
 *  guide aliases — presence, never count: a non-empty-after-trim
 *  string or a non-empty array), `callGuideKeys` reads inside each
 *  calls row (the per-call guide fields the derivation's hasGuide
 *  arm names). The evaluator's presence grammar mirrors
 *  normalizeDeclaredRefs's counting law closely enough that the
 *  probe arm pins the agreement on the blank/empty edges (a
 *  whitespace ref_images is ZERO refs on both spellings). */
export const FAMILY_LAW = {
  lanes: [
    { lane: 't4_chain', minCalls: 2 },
    {
      lane: 't4r',
      guideKeys: ['keyframes', 'last_frame', 'ref_images', 'ref_videos', 'ref_audios', 'image', 'image_name', 'ref_image'],
      callGuideKeys: ['image', 'ref_images', 'ref_image', 'image_name'],
    },
    { lane: 't4_open' },
  ],
  // THE LANE-LAW RETIREMENT (2026-11-15): no lane refuses any key.
  // The post chain mounts on every arm (actions.ts), so a finish
  // knob stated on a t4r doc fires there like it does on the open
  // and chain lanes. The empty map keeps the served shape
  // FormSpecDoc.familyLaw declares; the generic dead-key clause in
  // card-base's composeValidate stays for other families' laws.
  deadKeys: {},
} as const

/** THE FAMILY-RESEAT MATH — DEAD SPINE, one spelling (the one-seat
 *  migration, 2026-11-12): the settlement math lives in
 *  @melite/contracts familyLane.ts (reseatDeadKeys), driven by the
 *  FAMILY_LAW data above. Every caller — the registry's reseat
 *  seat, the studio's pick settlement — rides that spelling. This
 *  module keeps only the family's own face: deriveWindowFamily
 *  (the typed derivation over the same data). */

/** (2026-11-06, the family-reseat cure) the doc-level window family
 *  derivation, ONE spelling for every door that needs the family
 *  BEFORE the walk refuses: the walk derives the composed doc's
 *  family; the studio rail gates the second-pass group on the t4r
 *  lane; the reseat heal unstated post keys a family edit stranded
 *  (the live brick: a film legally stamped sr_switch lost its
 *  second call, derived t4r, and EVERY compose refused). Reads
 *  exactly the seats the walk reads — the guide-key union, the pin
 *  channel, the declared input surface (a private spelling elsewhere
 *  is the run-899a8448 disease: one seat missed, the family lies).
 *  @param raw the doc-shaped record (calls/keyframes/ref surface)
 *  @returns the derived window family */
export function deriveWindowFamily(raw: Record<string, unknown>): 't4r' | 't4_open' | 't4_chain' {
  // THE ONE-SEAT DERIVATION (2026-11-12): the family derives through
  // the SHARED evaluator over the FAMILY_LAW data above — the same
  // spelling the client compose mirror and the registry's reseat
  // seat ride. The doc-level guide seats the walk reads (actions.ts
  // guideImage = image ?? image_name; the render's guide0 = image,
  // image_name, ref_image) are DECLARED in the law's guideKeys, so
  // the private spelling below is dead — a seat missed in the data
  // is now a seat every judge misses together, never a split family
  // (the run-899a8448 disease).
  return deriveFamilyLane(FAMILY_LAW, raw) as 't4r' | 't4_open' | 't4_chain'
}

export function spanOverlap(span: TimelineSpan): number {
  return transitionOverlap(span.transition)
}

export function spanStanzaFrames(span: TimelineSpan, carry = 0): number {
  const k = Math.round((span.end - span.start + carry - GRID_BASE_FRAMES) / GRID_STEP_FRAMES)
  return Math.min(GRID_MAX_FRAMES, Math.max(GRID_BASE_FRAMES, GRID_BASE_FRAMES + GRID_STEP_FRAMES * k))
}

export interface CarriedSpanGrid {
  readonly generatedStart: number
  readonly generatedEnd: number
  readonly length: number
  readonly lowerEnd: number
  readonly upperEnd: number
}

export function carriedSpanGrid(span: TimelineSpan, carry = SEAM_OVERLAP_FRAMES): CarriedSpanGrid {
  const generatedStart = span.start - carry
  const requestedLength = span.end - span.start + carry
  const length = spanStanzaFrames(span, carry)
  const rawIndex = (requestedLength - GRID_BASE_FRAMES) / GRID_STEP_FRAMES
  const maxIndex = (GRID_MAX_FRAMES - GRID_BASE_FRAMES) / GRID_STEP_FRAMES
  const lowerIndex = Math.max(0, Math.min(maxIndex, Math.floor(rawIndex)))
  const upperIndex = Math.max(0, Math.min(maxIndex, Math.ceil(rawIndex)))
  const endAt = (index: number): number => generatedStart + GRID_BASE_FRAMES + GRID_STEP_FRAMES * index
  return {
    generatedStart,
    generatedEnd: generatedStart + length,
    length,
    lowerEnd: endAt(lowerIndex),
    upperEnd: endAt(upperIndex),
  }
}

export function assertCarriedSpanGrid(span: TimelineSpan, where: string, carry = SEAM_OVERLAP_FRAMES): number {
  const grid = carriedSpanGrid(span, carry)
  const requestedLength = span.end - span.start + carry
  if (grid.length !== requestedLength) {
    const legal = grid.lowerEnd === grid.upperEnd
      ? `${grid.lowerEnd}`
      : `${grid.lowerEnd} and ${grid.upperEnd}`
    throw new Error(
      `${where}: authored range ${span.start}→${span.end} cannot land on the 22+17k carried grid; ` +
      `generated snapped range ${grid.generatedStart}→${grid.generatedEnd}; ` +
      `legal neighboring end frames ${legal} ` +
      `(a carried window's span is 17f — its 22f seam is the generation head; ` +
      `a first or cut window is 22+17f)`,
    )
  }
  return grid.length
}

/** The booked render clock, one home: the seconds seat rounds its
 *  quotient to milliseconds before it rides the wire, so every
 *  consumer that needs the value the graph will actually carry (the
 *  schema's own rail bounds, the mix ledger) books through here —
 *  never a second copy of the rounding. */
export function bookSeconds(lengthFrames: number, fps: number): number {
  return Math.round((lengthFrames / fps) * 1000) / 1000
}

export function gridSnap(length: number): number {
  const k = Math.round((length - GRID_BASE_FRAMES) / GRID_STEP_FRAMES)
  return Math.min(GRID_MAX_FRAMES, Math.max(GRID_BASE_FRAMES, GRID_BASE_FRAMES + GRID_STEP_FRAMES * k))
}

/** THE GRID PREDICATE, one owner: a length the engine can render is
 *  22+17k inside [22,362]. Every refusal door asks this question, so
 *  knob pins, single windows, cut windows, and carried windows cannot
 *  drift into different laws. */
export function isGridLength(length: number): boolean {
  return Number.isInteger(length) &&
    length >= GRID_BASE_FRAMES &&
    length <= GRID_MAX_FRAMES &&
    (length - GRID_BASE_FRAMES) % GRID_STEP_FRAMES === 0
}

export function assertGridLength(length: unknown, where: string): number {
  if (typeof length !== 'number' || !isGridLength(length)) {
    const nearest = typeof length === 'number' && Number.isFinite(length)
      ? gridSnap(Math.min(GRID_MAX_FRAMES, Math.max(GRID_BASE_FRAMES, Math.round(length))))
      : 124
    throw new Error(
      `${where}: length ${String(length)}f is off-grid — the engine renders ` +
      `22+17k frames in [22,362] (nearest legal: ${nearest}f); ` +
      `the doc-proven geometry is 0→124→243→362`,
    )
  }
  return length
}

/** The chain policy's masked_av context — the overlap every composed
 *  seam after the first carries (the swap's clip law, shared with the
 *  extend's window composition). */
export const CONTEXT_OVERLAP_FRAMES = 39

// ── THE SPLIT LAW (ONE home, THREE doors — the one-bench cure,
// operator 2026-11-10) ─────────────────────────────────────────────
// THE AGENT AND THE USER UI SHARE ONE BENCH. ONE. The windows'
// ONLY storage is the doc's `calls` rows — every writer writes those
// rows, every face (strip, leaf list, compose) reads them. This pure
// law lived client-side (v2vSplit.ts, two UI doors) while the
// agent's write door (melite-construct's patch) could not reach it:
// the agent had ZERO paths into the windows and the window face
// never reflected agent authoring (the operator's burn: the AI
// "claimed to make 3 windows" — nothing it could call). The law
// moved HERE — the contract module every plane already imports — so
// the strip's mutations, the leaf form, and the agent's cuts verb
// are three doors over ONE implementation. A fourth door imports
// THIS, never a copy (the byte-for-byte parity is walled).

/** The three carry states a split seat states (§0.9's vocabulary,
 *  the same three the call card's seam seat and the strip head's
 *  carry menu serve). */
export type SplitCarry = 'cut' | 'extend' | 'carry+keyframe'

/** THE GRID'S TWO VIEWS (encoded 2026-11-10 from the lane burn —
 *  never re-derive this from a refusal string again). The window
 *  grid is ONE law seen from two doors:
 *  - AUTHORED SPAN (the calls rows, this module's law): a first or
 *    cut window authors 22+17k frames (56, 73, 90 … in [22,362]);
 *    a carried window authors 17k frames (17, 34, 51 …) because its
 *    22f seam is the generation head, not the span.
 *  - GENERATED LENGTH (the engine's own gate): the frames a carried
 *    window RENDERS are span + 22, and 17k + 22 ≡ 5 (mod 17) —
 *    which is why the engine's refusal reads "length % 17 == 5" and
 *    names a span five off the authored one. The refusal prints the
 *    GENERATED length; the calls row carries the AUTHORED span.
 *  A calculator in front of this law authored 141f as [0,90)+[90,141)
 *  (a 51f carried span the chain refused as generated 73) and a doc
 *  nearly ossified a "two grids" theory from one error string. There
 *  are not two grids. There is one grid and two views; this comment
 *  is the map. */

/** Is this window's seam a carried join? Index-aware — index 0 is
 *  always a first window (no carry), and a 'cut' seam never
 *  carries. */
export function isCarriedShape(index: number, call: Pick<TimelineCallSpan, 'transition'>): boolean {
  return index > 0 && transitionOverlap(call.transition) > 0
}

/** Is this authored LENGTH legal for the window's shape? A carried
 *  window rides the 17k step (content + 22f carry head ≤ 362); a
 *  first/cut window rides the 22+17k grid. */
export function isLegalCallLength(length: number, carried: boolean): boolean {
  if (carried) {
    return Number.isInteger(length) && length >= GRID_STEP_FRAMES &&
      length + SEAM_OVERLAP_FRAMES <= GRID_MAX_FRAMES && length % GRID_STEP_FRAMES === 0
  }
  return isGridLength(length)
}

/** The splice frame for a split where BOTH halves must be legal —
 *  the gesture's frame when it already qualifies, else the nearest
 *  one that does. NULL when no interior frame qualifies (the §0.5
 *  fence): a window at its shape's floor has no legal split at all
 *  — the caller refuses loud, never repairs. */
export function snapSplitFrame(
  start: number,
  end: number,
  leftCarried: boolean,
  rightCarried: boolean,
  gesture: number,
): number | null {
  let best: number | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (let frame = start + 1; frame < end; frame++) {
    if (!isLegalCallLength(frame - start, leftCarried)) continue
    if (!isLegalCallLength(end - frame, rightCarried)) continue
    const distance = Math.abs(frame - gesture)
    if (distance < bestDistance) {
      bestDistance = distance
      best = frame
    }
  }
  return best
}

/** The seam toggle's re-frame: the 22-frame carry moves from the
 *  generation head to (or from) the authored span. A first window
 *  has no carry either way, so its toggle never moves frames. */
export function reflowSeamSpan(
  call: Pick<TimelineCallSpan, 'start_frame' | 'end_frame' | 'transition'>,
  index: number,
  next: 'extend' | 'cut' | 'carry+keyframe',
): number {
  const wasCarried = isCarriedShape(index, call)
  const willCarried = isCarriedShape(index, { transition: next })
  if (wasCarried === willCarried) return call.end_frame
  const length = call.end_frame - call.start_frame
  return call.start_frame + (willCarried ? length - SEAM_OVERLAP_FRAMES : length + SEAM_OVERLAP_FRAMES)
}

/** Split the doc's calls at a gesture frame with a selected carry —
 *  §0.5's split, verbatim: the gesture frame snaps to the authoring
 *  lattice, one window becomes its own two halves (the row carries
 *  whole into both; the seam the split births states CUT), everything
 *  downstream rebases, and a selected carry mode re-frames the NEW
 *  seam. A gesture with no legal split frame REFUSES (null): the doc
 *  keeps its identity. Generic over the row: the rest of the call
 *  (text, refs, knobs, anchors) carries whole by construction.
 * @param calls the doc's own windows (the calls rows)
 * @param gestureFrame the frame the split is asked at (doc space)
 * @param carry the seam state the NEW split births after the stock
 *  cut ("cut" keeps the split's own default seam)
 * @returns the next calls array, or null when no legal split exists. */
export function splitCallsAt<T extends TimelineCallSpan>(calls: T[], gestureFrame: number, carry: SplitCarry): T[] | null {
  if (calls.length === 0) return null
  const i = calls.findIndex((c) => gestureFrame > c.start_frame && gestureFrame < c.end_frame)
  if (i < 0) {
    // a boundary or past-the-end gesture resolves the TARGET
    // window's midpoint — the press always cuts, never appends
    const target = calls.find((c) => gestureFrame === c.start_frame) ?? calls[calls.length - 1]!
    return splitCallsAt(calls, Math.round((target.start_frame + target.end_frame) / 2), carry)
  }
  const cur = calls[i]!
  // rightCarried is TRUE by construction: the right half is a carried
  // window (17k content) seating transition cut — v2vSplit's law verbatim
  const split = snapSplitFrame(cur.start_frame, cur.end_frame, isCarriedShape(i, cur), true, gestureFrame)
  if (split === null) return null
  // the right half seats transition cut — the reframe computes its end
  const rightEnd = reflowSeamSpan({ ...cur, start_frame: split, transition: 'extend' }, i + 1, 'cut')
  const next = [...calls]
  next[i] = { ...cur, end_frame: split }
  next.splice(i + 1, 0, { ...cur, start_frame: split, end_frame: rightEnd, transition: 'cut' })
  const delta = rightEnd - cur.end_frame
  for (let j = i + 2; j < next.length; j++) {
    next[j] = { ...next[j]!, start_frame: next[j]!.start_frame + delta, end_frame: next[j]!.end_frame + delta }
  }
  if (carry !== 'cut') {
    // the seam re-frames, the next window's start follows (one
    // reflow, tiling preserved)
    const seam = { ...next[i + 1]! }
    const end = reflowSeamSpan(seam, i + 1, carry)
    next[i + 1] = { ...seam, transition: carry, end_frame: end }
    if (i + 1 < next.length - 1) next[i + 2] = { ...next[i + 2]!, start_frame: end }
  }
  return next
}

/** THE CUTS VERB'S OUTCOME — the rows, or the loud refusal (never a
 *  silent drop, never a repair behind the caller's back). */
export type CutsResult<T extends TimelineCallSpan> =
  | { ok: true; calls: T[] }
  | { ok: false; refusal: string }

/** THE CUTS VERB (the agent's door into the one storage): seconds,
 *  never frame math (the run-e79f3b304e4b law — hand-typed frames
 *  repaired 90 of 243 frames once). "2.5, 5" splits the containing
 *  windows at those seconds — each fold rides splitCallsAt, so the
 *  verb IS the split law, not a second arithmetic. The seconds
 *  spelling never persists: every write door expands it into the
 *  calls rows and drops it (ONE storage; a lingering cuts key on a
 *  doc is a bug, refused by the walk).
 * @param calls the doc's own windows the verb splits
 * @param cuts the comma-separated seconds ("2.5, 5")
 * @param carry the seam state every new seam births
 * @returns the next calls array, or the refusal naming the cure. */
export function expandCuts<T extends TimelineCallSpan>(
  calls: T[],
  cuts: string,
  carry: SplitCarry = 'cut',
): CutsResult<T> {
  const parts = cuts.split(',').map((s) => s.trim())
  if (parts.some((p) => p === '')) {
    return { ok: false, refusal: `cuts '${cuts}' states an empty split point — write the split points as seconds, e.g. "2.5, 5" (the door snaps each to the authoring lattice; frames are never typed)` }
  }
  const seconds = parts.map((p) => Number(p))
  if (seconds.some((n) => !Number.isFinite(n))) {
    return { ok: false, refusal: `cuts '${cuts}' states no seconds — write the split points as seconds, e.g. "2.5, 5" (the door snaps each to the authoring lattice; frames are never typed)` }
  }
  let acc = calls
  for (const s of seconds.sort((a, b) => a - b)) {
    const next = splitCallsAt(acc, Math.round(s * DOC_FPS_DEFAULT), carry)
    if (next === null) {
      return {
        ok: false,
        refusal: `cuts: ${s}s has no legal split — the containing window's shortest legal halves don't fit (a window at its shape's floor cannot halve); lengthen it first, or the seconds fall on a boundary every fold resolves the same way`,
      }
    }
    acc = next
  }
  return { ok: true, calls: acc }
}


/** The plan's scene cap (chain_nodes: a 32-scene cap refuses
 *  mis-authored loops) — the composition solver's window ceiling. */
export const MAX_COMPOSED_WINDOWS = 32

/** One legal composition of a stated extension. */
export interface WindowComposition {
  readonly windows: number
  readonly windowFrames: number
  readonly deliveredFrames: number
}

/** The largest 22+17k grid length ≤ x (floored at 22, capped 362). */
const gridFloorFrames = (x: number): number => Math.min(
  GRID_MAX_FRAMES,
  GRID_BASE_FRAMES + GRID_STEP_FRAMES * Math.floor((x - GRID_BASE_FRAMES) / GRID_STEP_FRAMES),
)

/** The smallest 22+17k grid length ≥ x (capped at 362); null when x
 *  exceeds the grid — that window count cannot carry the total. */
const gridCeilFrames = (x: number): number | null => {
  const k = Math.ceil((x - GRID_BASE_FRAMES) / GRID_STEP_FRAMES)
  const length = Math.max(GRID_BASE_FRAMES, GRID_BASE_FRAMES + GRID_STEP_FRAMES * k)
  return length > GRID_MAX_FRAMES ? null : length
}

/** THE COMPOSITION SOLVER (pure; the door's whole law beyond one
 *  window): across every legal window count, the grid lengths on
 *  both sides of the exact requirement — the smallest that delivers
 *  ≥ stated (ceil) and the largest that delivers ≤ stated (floor) —
 *  looking for an EXACT delivery; else a loud refusal naming the
 *  neighboring compositions (max under, min over).
 *
 *  It lives HERE, on the client-safe contract face, because TWO
 *  consumers ask the same question: the extend renderer (what to
 *  compose) and the studio's commission rail (what to DRAW — the
 *  multiwindow unification audit's §9: the operator could not see
 *  the N windows an agent had strung together).
 * @param totalFrames the stated extension, frames at the film clock
 * @param where the refusal's voice ('h3-timeline extend')
 * @param overlap the per-seam context overlap (the policy's 39)
 * @returns the exact composition */
export function solveWindowComposition(
  totalFrames: number,
  where: string,
  overlap: number = CONTEXT_OVERLAP_FRAMES,
): WindowComposition {
  let bestUnder: WindowComposition | null = null
  let bestOver: WindowComposition | null = null
  for (let windows = 1; windows <= MAX_COMPOSED_WINDOWS; windows++) {
    const exact = (totalFrames + (windows - 1) * overlap) / windows
    for (const windowFrames of [gridFloorFrames(exact), gridCeilFrames(exact)] as const) {
      if (windowFrames === null) continue
      const delivered = windows * windowFrames - (windows - 1) * overlap
      if (delivered === totalFrames) return { windows, windowFrames, deliveredFrames: delivered }
      const composition: WindowComposition = { windows, windowFrames, deliveredFrames: delivered }
      if (delivered < totalFrames) {
        if (bestUnder === null || delivered > bestUnder.deliveredFrames) bestUnder = composition
      } else if (bestOver === null || delivered < bestOver.deliveredFrames) {
        bestOver = composition
      }
    }
  }
  const neighbor = (c: WindowComposition | null): string =>
    c === null ? '' :
      ` nearest: ${c.windows} windows of ${c.windowFrames}f deliver ${c.deliveredFrames}f (${(c.deliveredFrames / 24).toFixed(3)}s);`
  throw new Error(
    `${where}: stated ${totalFrames}f composes nowhere exactly — ` +
      `N uniform 22+17k windows under the ${overlap}f context overlap compose exactly nowhere;` +
      `${neighbor(bestUnder)}${neighbor(bestOver)}` +
      ` re-state extend_seconds as a composition's delivered seconds ` +
      `(D frames round-trips D/24 exactly; a single window keeps the 22+17k grid door)`,
  )
}

/** THE UNIFORM SPAN GATE: one refusal for every window shape. A
 *  carried window generates span+carry frames, so its authored span
 *  must be 17k; a first or cut window generates its span verbatim, so
 *  it must be 22+17k. Both are the same engine grid — a carried span
 *  used to be the only shape that refused, while single/cut spans
 *  were silently snapped (the old two-law gap, closed 2026-09-25).
 *  `spanStanzaFrames` stays the render/film clock and is a no-op
 *  identity for admitted spans. */
export function assertSpanGrid(span: TimelineSpan, where: string, carry = 0): number {
  if (carry > 0) return assertCarriedSpanGrid(span, where, carry)
  const length = span.end - span.start
  if (!isGridLength(length)) {
    throw new Error(
      `${where}: authored range ${span.start}→${span.end} has length ${length}f, which cannot land on the 22+17k grid ` +
      `(nearest legal: ${gridSnap(length)}f); the doc-proven geometry is 0→124→243→362 ` +
      `(a first or cut window is 22+17f; a carried window's span is 17f — its 22f seam is the generation head)`,
    )
  }
  return length
}

export function deliveredFrames(call: TimelineCallSpan, index: number): number {
  const span = call.end_frame - call.start_frame
  if (index === 0 || call.transition === 'cut') return span
  return Math.max(0, span - SEAM_OVERLAP_FRAMES)
}

export function imageReferenceCap(hasLastFrame: boolean): number {
  return hasLastFrame ? REF_CAPS.images - 1 : REF_CAPS.images
}

export function splitRefList(value: string | undefined): string[] {
  if (!value) return []
  const out: string[] = []
  let i = 0
  while (i < value.length) {
    while (i < value.length && (value[i] === ',' || value[i] === ' ' || value[i] === '\t')) i++
    if (i >= value.length) break
    const start = i
    const isData = value.startsWith('data:', i)
    let mimeComma = false
    while (i < value.length) {
      if (value[i] === ',') {
        if (isData && !mimeComma) {
          mimeComma = true
          i++
          continue
        }
        break
      }
      i++
    }
    let end = i
    while (end > start && (value[end - 1] === ' ' || value[end - 1] === '\t')) end--
    out.push(value.slice(start, end))
  }
  return out
}

export function normalizeDeclaredRefs(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== '')
  }
  if (typeof value === 'string') return splitRefList(value)
  return []
}

export function joinRefList(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const entries = value.map(String).map((entry) => entry.trim()).filter(Boolean)
    return entries.length > 0 ? entries.join(', ') : undefined
  }
  if (typeof value === 'string' && value.trim()) return value.trim()
  return undefined
}

export function refGenreOf(name: string, url?: string): 'image' | 'video' | 'audio' | 'other' {
  const lowerName = name.toLowerCase()
  if (/^video_w\d+_/.test(lowerName)) {
    if (lowerName.endsWith('_last_frame') || lowerName.includes('_prev')) return 'image'
    return 'video'
  }
  let urlFace = url?.toLowerCase() ?? ''
  const pathMatch = /(?:^|[?&])path=([^&]+)/.exec(urlFace)
  if (pathMatch !== null) {
    try {
      urlFace = decodeURIComponent(pathMatch[1] as string)
    } catch {
      urlFace = pathMatch[1] as string
    }
  }
  const source = `${lowerName} ${urlFace.split('?')[0]}`
  const extension = (source.split('.').pop() as string).split(/[^a-z0-9]/)[0] as string
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'avif'].includes(extension)) return 'image'
  if (['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v'].includes(extension)) return 'video'
  if (['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac', 'opus'].includes(extension)) return 'audio'
  return 'other'
}

export const KNOB_ORDER = [
  'steps', 'denoise', 'sampler_name', 'sched_name',
  'shift_video', 'shift_audio',
  'sla_sparsity', 'sla_block_size',
  'sla_min_seq_len', 'sla_dense_last_steps',
  'sla_protect_audio', 'sla_stabilize_motion',
  'sla_reference_protection', 'sla_dense_backend',
  'sla_dense_steps', 'sla_disable_fp16_accum',
  'sharpen_enabled', 'sharpen_method', 'sharpen_strength',
  'sharpen_radius', 'sharpen_threshold', 'sharpen_iterations',
  'interpolate_enabled', 'interp_model', 'interp_multiplier',
  'length',
] as const

export type KnobKey = (typeof KNOB_ORDER)[number]
export const CALL_KNOB_KEYS: ReadonlySet<string> = new Set(KNOB_ORDER)
/** The master-gated nine (calls-stanza audit #3, 2026-10-16): these
 *  knobs' ONLY read seats live inside the post chain, whose only
 *  door is the DOC-level second_pass_enabled master — a switch the
 *  call plane cannot state. With the master off (the default) a
 *  per-call pin here composes to nothing, silently; the UI fold
 *  gates its rows on this set so a dead knob is never offered. */
export const SECOND_PASS_KNOBS: ReadonlySet<string> = new Set([
  'sharpen_enabled', 'sharpen_method', 'sharpen_strength',
  'sharpen_radius', 'sharpen_threshold', 'sharpen_iterations',
  'interpolate_enabled', 'interp_model', 'interp_multiplier',
])

/** The per-call vocabulary the schema's call walk admits. `clip` and
 *  `audio` LEFT THIS SET (2026-10-16, audit 3f0b7c1a ui-truth-gap
 *  #3): no compose arm reads either — a per-call clip or audio guide
 *  was UI truth over an engine-deaf wire (the studio hydrated them
 *  and painted a speaker dot, the walk admitted them, no node ever
 *  consumed one). A doc stating them now refuses LOUD here
 *  ('unknown per-call key(s)') instead of round-tripping a phantom;
 *  the studio drops legacy rows at hydration with a named warn. */
export const CALL_KEYS: ReadonlySet<string> = new Set([
  'text', 'start_frame', 'end_frame', 'image',
  'transition', 'knobs', 'refs',
  'ref_image', 'image_name', 'ref_images', 'ref_videos', 'ref_audios',
  'beats', 'last_frame', 'first_frame_prev_sec', 'seam_carry',
])

/** THE SEAM VOCABULARY (one home): the three transitions a call
 *  may state — 'cut' (context 0), 'extend' (the carry join), and
 *  'carry+keyframe' (the carry join + a gen-side image anchor).
 *  `transitionOverlap` treats ANY non-'cut' string as carry, so
 *  the schema's walk judges every stated transition against THIS
 *  roster — a typo'd seam never composes as carry in silence. */
export const CALL_TRANSITIONS = ['cut', 'extend', 'carry+keyframe'] as const

export const LEGACY_KNOB_KEY = {
  sampling_steps: 'steps',
  sampler: 'sampler_name',
  scheduler: 'sched_name',
  h3_sla_sparsity: 'sla_sparsity',
  h3_sla_block_size: 'sla_block_size',
  h3_sla_min_seq_len: 'sla_min_seq_len',
  h3_sla_dense_last_steps: 'sla_dense_last_steps',
  h3_sla_protect_audio: 'sla_protect_audio',
  h3_sla_stabilize_motion: 'sla_stabilize_motion',
  h3_sla_reference_protection: 'sla_reference_protection',
  h3_sla_dense_backend: 'sla_dense_backend',
  h3_sla_dense_steps: 'sla_dense_steps',
  h3_sla_disable_fp16_accum: 'sla_disable_fp16_accum',
  interpolate_model: 'interp_model',
  interpolate_multiplier: 'interp_multiplier',
} as const satisfies Record<string, KnobKey>

export function migrateCallKnobKey(key: string): string {
  return (LEGACY_KNOB_KEY as Record<string, string>)[key] ?? key
}
