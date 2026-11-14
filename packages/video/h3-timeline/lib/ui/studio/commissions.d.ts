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
import { type WindowComposition } from '@melite/models-h3/timelineContract';
/** Every mod bag the rail projects, in the card's own declaration
 *  order. The LoRAs joined on 2026-10-30 (F29): the bag reached the
 *  graph but no rail row existed, so the operator could not see the
 *  adapters at all — a bag the compose honors must have a row.
 *  refine + upscale joined on 2026-10-31 (audit
 *  2026-10-31-modpress-row-face): five of seven declared kinds had
 *  no row, so a refine/upscale-only row drew an EMPTY rail — its
 *  whole authored truth invisible beside the starter lie.
 *  `edit` joined on 2026-11-09 (THE READ-LIST COLLAPSE, the one-door
 *  law's UI half): `edit` is the CANONICAL bag — the spelling the
 *  one door's Add writes and the compose door reads. The legacy five
 *  after it are the door's translation for old documents; they ride
 *  the read list only so a legacy doc's armed bags still draw their
 *  rows (§9's law: a bag the compose honors must have a row) — the
 *  canonical bag rides FIRST because it is the one the current door
 *  authors. */
export declare const COMMISSION_KINDS: readonly ["edit", "replace", "repair", "extend", "refine", "upscale", "reshoot", "loras"];
export type CommissionKind = (typeof COMMISSION_KINDS)[number];
/** One entry seat as the rail names it: the key the compose reads and
 *  the value the doc states (never a default — an unstated seat is
 *  simply absent). */
export interface CommissionSeat {
    key: string;
    value: string;
}
/** The window composition an extend commission will build (drawn on
 *  the lane so N chained windows are visible, §9's own multiply). */
export type CommissionGeometry = WindowComposition;
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
export declare function windowSpans(geometry: CommissionGeometry, startAt: number): Array<{
    start: number;
    frames: number;
}>;
/** A malformed arm the run door refuses: the bag is present but is
 *  not an array, or its entry is not an object. The rail draws the
 *  row (armed by the card's presence predicate) with a note, never a
 *  silent clean lane. */
export type CommissionNote = 'malformed' | 'bad-entry';
/** One armed commission, as the rail renders it. */
export interface DocCommission {
    kind: CommissionKind;
    /** The bag entry, verbatim (the rail names its seats). */
    seats: CommissionSeat[];
    /** Extend only (object entry): the composition the door will
     *  compose (N windows, each window's frames, the delivered
     *  frames). Absent for the single-window arms and every non-extend
     *  kind. */
    geometry?: CommissionGeometry;
    /** The compose door's refusal voice when the stated seconds compose
     *  nowhere exactly — the rail shows the armed-and-doomed doc
     *  instead of a lane that looks fine. */
    refusal?: string;
    /** The malformed-arm note (the door's own refusal is the backstop;
     *  the rail's dictionary names the UI face). */
    note?: CommissionNote;
}
/** Derive the doc's armed commissions, in the card's bag order.
 *  Disarmed bags contribute nothing — the rail's empty state is the
 *  honest "no commission" lane, never a placeholder row.
 * @param params the durable bench row (the doc's own params)
 * @returns one row per armed mod bag */
export declare function deriveCommissions(params: Record<string, unknown> | undefined): DocCommission[];
/** THE CALLS-READING KINDS (the mod-mode calls report, operator
 *  2026-11-14): the kinds whose film action READS the calls text —
 *  reshoot and loras ride the film action (reshoot's prompt is
 *  `"crossview. " + <call text>`), so the calls lane IS their run's
 *  prompt seat. Every other kind (replace, repair, extend, refine,
 *  upscale) composes from the bag entry alone and never reads a
 *  call's text — under those arms the calls lane is dormant. */
export declare const CALLS_READING_KINDS: readonly ["reshoot", "loras"];
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
export type CallsLaneFace = {
    face: 'plain';
} | {
    face: 'dormant';
    kind: CommissionKind;
} | {
    face: 'prompt';
    kind: CommissionKind;
} | {
    face: 'v2v';
    kind: 'edit';
};
/** Derive the calls lane's face from the armed commissions. THE
 *  EDIT BAG WINS UNCONDITIONALLY (queue 11 reopened 2026-11-08: the
 *  operator's real doc — edit + loras both armed — still drew the
 *  plain prompt face; their law carries no precedence clause:
 *  "WHEN YOU ADD THE MOD FOR VIDEO TO VIDEO, IT CHANGES THE TIMELINE
 *  BAR UNDER THE 'CALLS' SECTION", full stop). A reader beside the
 *  edit bag changes nothing the operator can see: the section IS
 *  the video-to-video face. With no edit armed, the prior law
 *  stands: a reader wins the prompt face (the run reads calls if
 *  any armed action does); with neither, the lane is dormant under
 *  the FIRST armed row's kind (the commission the hint names).
 * @param commissions the derived armed rows (deriveCommissions)
 * @returns the lane's face */
export declare function callsLaneFace(commissions: DocCommission[]): CallsLaneFace;
/** Whether a call's text is the studio's own starter placeholder
 *  verbatim (trimmed) — the one text every NON-PLAIN face stands
 *  down (dormant, v2v, AND the prompt seat — operator 2026-11-18:
 *  "WHY DO I SEE THIS PROMPT ON RESHOOT BY DEFAULT … THIS PROMPT
 *  THAT DOESN'T DO ANYTHING?"): the placeholder is the FILM route's
 *  view-state invitation, never operator content, so under any
 *  armed commission painting it is a lie about what the armed run
 *  reads or books.
 * @param text the call's text
 * @returns true only for the verbatim starter placeholder */
export declare function isStarterCallText(text: string): boolean;
//# sourceMappingURL=commissions.d.ts.map