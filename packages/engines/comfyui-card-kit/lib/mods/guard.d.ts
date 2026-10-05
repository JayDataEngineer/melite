/** The minimum atom shape the gate reads (ModelFacts carries it). */
export interface ModBoarding {
    readonly id: string;
    readonly mods?: readonly string[] | undefined;
}
/**
 * Refuse LOUD unless the atom boarded the pack. Call BEFORE firing
 * the pack's mutation (stackLoras, qvoice stems, lanpaint arms…).
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
 *  union weight FILENAME, and the staged conditioning source —
 *  artifact already won over image_b64 there, the retired
 *  precedence). */
export interface ControlNetPick {
    readonly type: string;
    readonly model: string;
    readonly image: string;
    readonly strength: number;
}
/** A run-record / UI ControlNet row (the retired wire shape:
 *  type + model + preprocessor + image_b64/artifact + strength +
 *  step range + enabled/source — every field the old leaf editor
 *  wrote; the lane reads only what executes). */
export interface ControlNetEntry {
    readonly type?: unknown;
    readonly model?: unknown;
    readonly image_b64?: unknown;
    readonly artifact?: unknown;
    readonly strength?: unknown;
    readonly start_percent?: unknown;
    readonly end_percent?: unknown;
    readonly enabled?: unknown;
}
/**
 * The schedule law (the live node's own limit): ZImageFunControlnet
 * carries NO start/end inputs — it conditions the full schedule.
 * A row at exactly (0.0, 1.0) rides; anything else refuses LOUD
 * here (never a silent full-strength run). One spelling — the kit
 * firing gate and the service wire resolution read this same
 * function.
 */
export declare function assertControlNetSchedule(type: string, start: number, end: number): void;
/**
 * The controlnet firing gate (the z-image restoration): returns the
 * run's ControlNet picks, asserting the boarding FIRST when the
 * list is non-empty. Empty = no mutation = no gate. Per entry:
 * enabled:false skips (a declared off-state, like a muted tile —
 * not a drop); a non-boolean enabled refuses (the wire law, both
 * planes); a stated entry with no conditioning source refuses
 * (artifact already won over image_b64 upstream — neither present
 * is a map-less lock); the pack floor clamps weak entries UP with
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
