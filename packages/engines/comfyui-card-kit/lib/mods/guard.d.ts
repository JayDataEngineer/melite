/** The minimum atom shape the gate reads (ModelFacts carries it). */
export interface ModBoarding {
    readonly id: string;
    readonly mods?: readonly string[] | undefined;
}
/**
 * DECL.mods marriage grammar (#36): entries are pack names or
 * {pack, marries} rows — every consumer reads PACK NAMES. One
 * spelling across the boot gates (the service's boarding tests),
 * the walls' census arms, and the facts derivation: a verbatim
 * object carry makes `.includes(pack)` false and a boarding family
 * refuses its own mutation (the openjutsu lane burn, 2026-10-28).
 */
export declare function boardedPacks(mods: readonly unknown[] | null | undefined): string[];
/**
 * Refuse LOUD unless the atom boarded the pack. Call BEFORE firing
 * the pack's mutation (stackLoras, qvoice stems…).
 * An empty/absent pick list never reaches here — no mutation, no
 * gate (the gate guards the FIRING, not the knob's existence).
 */
export declare function assertModUse(model: ModBoarding, pack: string): void;
export interface LoraPick {
    readonly name: string;
    readonly strength: number;
}
/**
 * The loras firing gate (the z-image fix): returns the run's LoRA
 * picks, asserting the boarding FIRST when the list is non-empty.
 * Empty = no mutation = no gate (krea-2 runs without loras pass
 * through untouched).
 */
export declare function fireLoras(model: ModBoarding, p: Record<string, unknown>): LoraPick[];
/** One resolved ControlNet pick (the service's wire resolution
 *  normalizes run-record and UI rows to this: the catalog TYPE, the
 *  union weight FILENAME, and the staged conditioning sources —
 *  artifact already won over image_b64 there, the retired
 *  precedence). The still-image channel stays `image` byte-stable;
 *  `clip` (002 H2) is a staged VIDEO artifact for families whose
 *  apply node takes a video-valued control source, and `mask`
 *  (002 H4) is the mask-shaped lane's source — absent for every
 *  still-image pick, so the z-image spelling never moves. */
export interface ControlNetPick {
    readonly type: string;
    readonly model: string;
    readonly image: string;
    readonly strength: number;
    readonly clip?: string;
    readonly mask?: string;
    /** The schedule window (002 H3): full-schedule rows stamp
     *  (0, 1); a ranged row's declared window rides verbatim for
     *  lanes whose apply node carries the start/end dials. */
    readonly start_percent?: number;
    readonly end_percent?: number;
}
/** A run-record / UI ControlNet row (the retired wire shape:
 *  type + model + preprocessor + image_b64/artifact + strength +
 *  step range + enabled/source — every field the old leaf editor
 *  wrote; the lane reads only what executes). The service's wire
 *  resolution STAMPS three row facts back onto the resolved entry
 *  (002 H3/H5): `schedule` and `strength_max` carry the catalog
 *  row's declared capability so this last-line gate re-validates
 *  against the ROW's law, never a foreign family's; `clip`/`mask`
 *  ride as the video/mask conditioning channels. */
export interface ControlNetEntry {
    readonly type?: unknown;
    readonly model?: unknown;
    readonly image_b64?: unknown;
    readonly artifact?: unknown;
    readonly strength?: unknown;
    readonly start_percent?: unknown;
    readonly end_percent?: unknown;
    readonly enabled?: unknown;
    readonly clip?: unknown;
    readonly mask?: unknown;
    /** the catalog row's schedule capability, stamped by the service
     *  resolution ('ranged' = the row's apply node has start/end
     *  inputs); absent on hand-built rows = full-schedule only */
    readonly schedule?: unknown;
    /** the catalog row's strength ceiling, stamped by the service
     *  resolution; absent on hand-built rows = the pack default 2 */
    readonly strength_max?: unknown;
}
/**
 * The schedule law (the row's own node capability, 002 H3): a row
 * whose apply node carries NO start/end inputs is full-schedule
 * only — a range at exactly (0.0, 1.0) rides, anything else
 * refuses LOUD (never a silent full-strength run). A row declaring
 * `schedule: 'ranged'` (H3's Fun-ControlNet Union node has
 * start/end dials) passes any legal range. The refusal names the
 * row's own type, never a foreign family's node. One spelling —
 * the kit firing gate and the service wire resolution read this
 * same function.
 */
export declare function assertControlNetSchedule(type: string, start: number, end: number, schedule?: 'full' | 'ranged'): void;
/**
 * The controlnet firing gate (the z-image restoration): returns the
 * run's ControlNet picks, asserting the boarding FIRST when the
 * list is non-empty. Empty = no mutation = no gate. Per entry:
 * enabled:false skips (a declared off-state, like a muted tile —
 * not a drop); a non-boolean enabled refuses (the wire law, both
 * planes); a stated entry with no conditioning source on ANY
 * channel refuses (artifact already won over image_b64 upstream —
 * image, clip and mask all absent is a map-less lock; the words
 * stay the still-image arm's because the still channel is the one
 * every family serves); the strength ceiling is the ROW's when the
 * service stamped it (002 H5 — H3's dial runs to 10), the pack
 * default 2 otherwise; the schedule law reads the row's stamped
 * capability (002 H3); the pack floor clamps weak entries UP with
 * a log line (the contract's own tooltip law).
 */
export declare function fireControlNets(model: ModBoarding, p: Record<string, unknown>): ControlNetPick[];
/**
 * The ip_adapter firing gate (fate 'refused' — the ray receipt):
 * ray's apply_ipadapters lane wired CLIPVisionLoader → Encode →
 * IPAdapterModelLoader → Apply, but silently degraded (except-break,
 * no-image skip, weight<=0 skip) on SD1.5 weights that never stood
 * on disk — the vocabulary never executed once, on any family. No
 * Z-Image-compatible IP-Adapter exists upstream (HF api: 0 results;
 * S3-DiT has no recipe in any installed pack). So the surface rides
 * (the family's four rows, discovery, the hybrid UI) and EVERY
 * stated entry refuses LOUD with this receipt — never ray's silent
 * skip, never a plain run that drops your reference image.
 */
export declare function refuseIPAdapterFiring(model: ModBoarding, p: Record<string, unknown>): void;
/**
 * The scalar-knob firing gate (the qvoice shape): returns the raw
 * knob value, asserting the boarding FIRST when the knob is
 * stated (non-blank). Blank = no mutation = the lane's absent
 * rendering rides unchanged.
 */
export declare function fireKnob(model: ModBoarding, pack: string, key: string, raw: unknown): string;
export declare const PACK_FATE: Record<string, "fired" | "refused" | "mounted">;
/** Verb ids mount; they never take a pack fate (gate (d) skips them). */
export declare const VERB_FATE: "mounted";
/**
 * Boot gate (d): a DECLARED pack boarding must have a fate — fired
 * or refused. Throws the boot-loud refusal otherwise.
 */
export declare function assertPackFate(pack: string): void;
//# sourceMappingURL=guard.d.ts.map