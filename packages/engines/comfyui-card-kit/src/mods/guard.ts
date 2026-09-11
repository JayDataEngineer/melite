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
// A pack with NO fate (controlnet today: registered, unboarded,
// waiting) can be neither fired nor refused — boarding it is a
// dead declaration, and the boot refuses it until a lane lands the
// fate. This is the py truth made a gate: "the entry waits in the
// menu until one truthfully does" — waiting means UNBOARDED.
export const PACK_FATE: Record<string, "fired" | "refused" | "mounted"> = {
  loras: "fired",
  qvoice: "fired",
  lanpaint: "refused",
  mask: "refused",
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
