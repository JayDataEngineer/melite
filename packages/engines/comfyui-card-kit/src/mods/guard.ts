// mods/guard.ts — THE CONSUMPTION GATE (paper §3.2.2, the
// satisfaction law: a component activates ONLY at a satisfying
// state — the mutation fires only on an atom that boarded its
// pack, otherwise the run refuses LOUD).
//
// Why this exists (the z-image violation, 2026-09-08): the
// absorption plane is family-scoped (z-image's form carries no
// loras knob — walled), but the compose plane stacked smuggled
// p.loras onto WHATEVER atom resolved, boarding or not. Two
// spellings of one contract; the compose side was ungated. Every
// kit call site that fires a pack mutation calls assertModUse
// FIRST — a smuggled mutation on a non-boarding atom is drift,
// not a skip.
//
// Cordis shape: registration stays service-owned (registerPack /
// registerFlavor refuse loud at boot); the satisfaction check is
// a pure predicate over (atom boarding + pack id) — the kit has
// no ctx at the call site, so the guard rides an import, not a
// service member. The boarding itself rides ModelFacts.mods,
// pinned ≡ DECL.mods by the flows wall (one spelling is truth,
// the other is walled to it).

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
export function assertModUse(model: ModBoarding, pack: string): void {
  if ((model.mods ?? []).includes(pack)) return;
  throw new Error(
    `model '${model.id}' does not board the '${pack}' pack — the mutation fires only on boarding atoms ` +
      `(declare mods: ['${pack}'] on the model and ship its flavor); a smuggled '${pack}' payload on a non-boarding atom is drift, not a skip`,
  );
}

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
export function fireLoras(model: ModBoarding, p: Record<string, unknown>): LoraPick[] {
  const picks = (p.loras ?? []) as LoraPick[];
  if (picks.length > 0) assertModUse(model, "loras");
  return picks;
}

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
export function assertControlNetSchedule(
  type: string,
  start: number,
  end: number,
  schedule?: 'full' | 'ranged',
): void {
  if (start === 0 && end === 1) return;
  if (schedule === 'ranged') return;
  throw new Error(
    `controlnet '${type}' asks for steps ${String(start)}–${String(end)}, ` +
      `but its apply node carries no start/end inputs (full-schedule only) — ` +
      `refusing instead of silently running full-strength`,
  );
}

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
export function fireControlNets(model: ModBoarding, p: Record<string, unknown>): ControlNetPick[] {
  const entries = p.controlnets;
  if (!Array.isArray(entries) || entries.length === 0) return [];
  assertModUse(model, "controlnet");
  const floorRaw = p.controlnet_strength_floor ?? 0;
  if (typeof floorRaw !== "number" || !Number.isFinite(floorRaw) || floorRaw < 0 || floorRaw > 1) {
    throw new Error(
      `controlnet_strength_floor = ${String(p.controlnet_strength_floor)}: a number in [0, 1] is required (0.0 = no floor)`,
    );
  }
  const floor = floorRaw as number;
  const picks: ControlNetPick[] = [];
  for (const raw of entries) {
    const e = (raw ?? {}) as ControlNetEntry;
    if (e.enabled === false) continue;
    // the service refuses non-boolean enabled at the wire — the
    // kit (the last line) refuses it too, never a truthy fire.
    if (e.enabled !== undefined && typeof e.enabled !== "boolean") {
      throw new Error(`a controlnet entry's enabled = ${String(e.enabled)}: a boolean is required`);
    }
    const type = typeof e.type === "string" && e.type !== "" ? e.type : null;
    if (type === null) {
      throw new Error(`a controlnet entry names no type — pick from the served catalog, never hand-spell`);
    }
    const file = typeof e.model === "string" && e.model !== "" ? e.model : null;
    if (file === null) {
      throw new Error(
        `controlnet '${type}' carries no weight file — the service resolves the catalog type to its union file at compose; a hand-built row must name it`,
      );
    }
    // THE ROW'S CEILING (002 H5): the service stamps the catalog
    // row's declared maximum (H3's Fun-ControlNet dial: 10); an
    // unstamped hand-built row rides the pack default.
    const ceiling =
      typeof e.strength_max === "number" && Number.isFinite(e.strength_max) && e.strength_max > 0
        ? e.strength_max
        : 2;
    const strength = e.strength;
    if (typeof strength !== "number" || !Number.isFinite(strength) || strength < 0 || strength > ceiling) {
      throw new Error(`controlnet '${type}' strength = ${String(e.strength)}: a number in [0, ${String(ceiling)}] is required`);
    }
    const start = e.start_percent ?? 0;
    const end = e.end_percent ?? 1;
    if (typeof start !== "number" || !Number.isFinite(start) || start < 0 || start > 1
      || typeof end !== "number" || !Number.isFinite(end) || end < 0 || end > 1 || start > end) {
      throw new Error(
        `controlnet '${type}' step range = ${String(e.start_percent)}–${String(e.end_percent)}: numbers in [0, 1] with start <= end are required`,
      );
    }
    const stampedSchedule = e.schedule === "ranged" || e.schedule === "full" ? e.schedule : undefined;
    assertControlNetSchedule(type, start, end, stampedSchedule);
    const artifact = typeof e.artifact === "string" && e.artifact !== "" ? e.artifact : null;
    const map = typeof e.image_b64 === "string" && e.image_b64 !== "" ? e.image_b64 : null;
    // THE ARTIFACT PRECEDENCE (the retired brick law): a present
    // artifact uploads THAT file as the conditioning image.
    const image = artifact ?? map;
    // THE VIDEO/MASK CHANNELS (002 H2/H4): a staged clip artifact
    // and a mask artifact ride their own channels — the still arm
    // is untouched, and a family whose lane consumes them reads
    // them off the pick.
    const clip = typeof e.clip === "string" && e.clip !== "" ? e.clip : null;
    const mask = typeof e.mask === "string" && e.mask !== "" ? e.mask : null;
    if (image === null && clip === null && mask === null) {
      throw new Error(
        `controlnet '${type}' carries no conditioning image (neither artifact nor image_b64) — a structure lock with no map is drift, not a skip`,
      );
    }
    // THE FLOOR (the contract's clamp-UP law): entries below the
    // pack floor apply AT the floor, with a log line.
    const applied = Math.max(strength, floor);
    if (applied !== strength) {
      console.warn(
        `[controlnet] entry '${type}' strength ${String(strength)} below the pack floor ${String(floor)} — clamped UP (the run applies ${String(applied)})`,
      );
    }
    picks.push({
      type,
      model: file,
      image: image ?? "",
      strength: applied,
      ...(clip === null ? {} : { clip }),
      ...(mask === null ? {} : { mask }),
      start_percent: start,
      end_percent: end,
    });
  }
  return picks;
}

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
export function refuseIPAdapterFiring(model: ModBoarding, p: Record<string, unknown>): void {
  const entries = p.ip_adapters;
  if (!Array.isArray(entries) || entries.length === 0) return;
  assertModUse(model, "ip_adapter");
  const kinds = entries
    .map((e) => (typeof (e as { kind?: unknown })?.kind === "string" ? (e as { kind: string }).kind : "?"))
    .join(", ");
  throw new Error(
    `ip_adapters [${kinds}] refuses: no executable IP-Adapter lane exists in this plane — ` +
      `the declared rows are SD1.5-era files that never stood on disk and cannot patch Z-Image's S3-DiT, ` +
      `and no Z-Image IP-Adapter ships upstream. The ray lane silently skipped used entries; this gate ` +
      `refuses instead. Drop the entries to run plain, or wait for a real Z-Image IP-Adapter + loader lane`,
  );
}

/**
 * The scalar-knob firing gate (the qvoice shape): returns the raw
 * knob value, asserting the boarding FIRST when the knob is
 * stated (non-blank). Blank = no mutation = the lane's absent
 * rendering rides unchanged.
 */
export function fireKnob(model: ModBoarding, pack: string, key: string, raw: unknown): string {
  const v = (raw ?? "") as string;
  if (typeof v === "string" && v.trim() === "") return "";
  // (a dead second `v === ""` arm dropped 2026-09-12 — only strings
  // can equal "", and the string case is the line above)
  assertModUse(model, pack);
  return v as string;
}

// ── THE PACK FATE TABLE (paper §3.2.2, boot gate (d)) ──
//
// Every REGISTERED pack has exactly one fate in this plane — the
// answer to "what happens when its knobs arrive at compose":
//   'fired'   — a kit lane builds the mutation (gated by the above)
//   'refused' — no lane builds it; the card's firing gate refuses
//               every stated knob LOUD (never a silent plain run)
//   'mounted' — verbs only: family-scoped mount, knobs never surface
// A pack with NO fate can be neither fired nor refused — boarding
// it is a dead declaration, and the boot refuses it until a lane
// lands the fate. controlnet LANDED its fate with the z-image
// restoration (the ModelPatchLoader → ZImageFunControlnet lane in
// render-kit.ts, fired through kit.ts imageT2I). ip_adapter boards
// REFUSED (the ray receipt, refuseIPAdapterFiring below): the lane
// never executed anywhere — silent-skip code on weights that never
// existed; the surface serves vocabulary, the gate serves truth.
export const PACK_FATE: Record<string, "fired" | "refused" | "mounted"> = {
  loras: "fired",
  controlnet: "fired",
  qvoice: "fired",
  qvoice_save: "fired",
  lanpaint: "refused",
  mask: "refused",
  ip_adapter: "refused",
};

/** Verb ids mount; they never take a pack fate (gate (d) skips them). */
export const VERB_FATE = "mounted" as const;

/**
 * Boot gate (d): a DECLARED pack boarding must have a fate — fired
 * or refused. Throws the boot-loud refusal otherwise.
 */
export function assertPackFate(pack: string): void {
  if (PACK_FATE[pack] !== undefined) return;
  throw new Error(
    `pack '${pack}' is boarded but has no fate in this plane (no lane fires it, no firing gate refuses it) — ` +
      `land the lane (fate 'fired') or the loud refusal (fate 'refused') before any atom boards it; ` +
      `a surfaced knob with no lane is a silent skip`,
  );
}
