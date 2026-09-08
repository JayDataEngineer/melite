// cardSeam — the card KIND registry: the spine the two card modes
// (schema form vs studio) were missing (2026-08-19, the second seam cut —
// DSH-PLUGIN-GAP-ANALYSIS.md §8.1's pattern applied to the card kit).
//
// THE PROBLEM THIS KILLS: kind behavior used to live as a closed union
// (CardKind / StageKind) plus scattered `kind === "x"` literals across the
// kit — runnability in flowCardTypes, execution skips in the execute
// slice (×3), form-spec membership + compound in FlowTypes, the body
// tile icon, the studio-link badge tone, and the revive allowlist. Two
// half-seams (kindHasFormSpec / getCardStudio) with no spine, and a third
// party could not add a card kind without editing five files.
//
// THE SEAM: a card kind is a REGISTRATION — behavior flags as data at ONE
// definition site. The two "modes" stop being categories and become two
// claims on the body SLOT (see cardBodySeam.ts + cardStudios.ts: the
// YAML-declared tenant, the schema form, the shared detail host are
// INJECTED providers at distinct precedencies — a studio and a form card
// are the same thing, different injections). Form-vs-studio is
// data-driven occupancy, not type taxonomy — the studio composition axis
// stays untouched (AGENTS.md Evergreen Lesson: form-based vs studio-based
// BUILDER categories never conflate; this seam unifies card CHROME, not
// graph composition).
//
// PURE MODULE: imports nothing at runtime (types only) — the dependency
// root, like flowCardTypes. Kinds arrive via the kinds lane (the
// fourth lane): plugins/*/kinds/*.yaml → GET /v1/kinds → pluginKinds'
// ONE sync (melite-core is the zeroth provider — no code registrations
// anywhere; the vitest suite seeds the same wire via the meliteCoreKinds
// fixture, welded to the yaml by a bun-side lockstep gate). The gate
// test (src/__tests__/card-seam.gate.test.tsx) pins the served set so
// silent removal or flag drift fails CI.
import type { ComponentType } from "react"

/** Behavior flags of one card kind — what the kit used to derive from
 * scattered `kind ===` literals. Every flag defaults explicitly; there are
 * no implicit truths. */
export interface CardKindDef {
  /** The kind string — the WIRE vocabulary (persisted in flow docs,
   * revived verbatim). One registration per kind; duplicate = loud. */
  kind: string
  /** The card carries a Run affordance and compiles (body cards are
   * authoring surfaces — their params ARE the result). */
  runnable: boolean
  /** The kind participates in the run loop. Non-executable kinds render
   * and wire but never auto-run (studio-link waits for the user; body is
   * an identity source, not a GPU stage). */
  executable: boolean
  /** Stages of this kind own a catalog model route and therefore have a
   * /v1/form-spec (generation, chain). Others render fixed UIs — their
   * `service` is a display label, not a model route (calling
   * loadFormSpec on them 404s). */
  formSpec: boolean
  /** The ONE container kind: holds other cards, owns no model, never
   * executes alone, renders as a subgraph tile. */
  compound: boolean
  /** The kind's card opens a studio (an authoring surface) on demand —
   *  studio-link. The detail host renders the Open-in-Studio affordance,
   *  the run loop defers it to the user, and the agent's open-studio
   *  tool only accepts these kinds (2026-08-21: the last `kind ===`
   *  literals in the kit became this flag). */
  opensStudio: boolean
  /** Tile icon override (body → Box). Absent = genre-driven icon. */
  icon?: ComponentType
  /** Service-badge tone (studio-link → brand). */
  badgeTone: "brand" | "default"
  /** The runner family this kind belongs to. The dispatcher
   * (resolveStageRunner) reads this instead of branching on kind names
   * — data-driven, never a hardcoded kind → runner map. Closed
   * vocabulary mirroring the frozen cordis face (vocab.ts
   * KindRunnerValues: "" / "input"); a kind may only declare one of these (PYTHON SHAPE LAW rung 3
   * — closed vocabularies are enums, lockstep client/server). The
   * resolver defends against an unknown string (the wire may carry
   * a runner the client enum hasn't learned yet — refuse loud,
   * never a silent fallback). (2026-09-05.) */
  runner?: KindRunner
}

/** The closed runner-family vocabulary (mirror of the frozen
 * cordis face vocab.ts KindRunnerValues). Update both sides in
 * lockstep (pinned by test_imports.py). */
export type KindRunner = "" | "input"

const _kinds = new Map<string, CardKindDef>()

// ── Live propagation (shipped WITH the kinds lane, 2026-08-19) ──
// The registry is a STORE: every mutation bumps a version and pings
// listeners; useSyncExternalStore (pluginKinds.ts) turns a mid-session
// lane flip into a re-render. Hand-rolled listeners keep this module
// free of runtime imports (it stays the dependency root).
let _version = 0
const _listeners = new Set<() => void>()

function notifyCardKinds(): void {
  _version++
  for (const l of _listeners) l()
}

/** useSyncExternalStore plumbing (see useCardKindsVersion). */
export function subscribeCardKinds(fn: () => void): () => void {
  _listeners.add(fn)
  return () => {
    _listeners.delete(fn)
  }
}

/** The registry version — bumps on every register/dispose. */
export function getCardKindsVersion(): number {
  return _version
}

/** Register a card kind. Returns the disposer (test/plugin teardown).
 * Duplicate kind strings are LOUD — one definition site per kind. */
export function registerCardKind(def: CardKindDef): () => void {
  if (_kinds.has(def.kind)) {
    throw new Error(`card kind "${def.kind}" is already registered`)
  }
  _kinds.set(def.kind, def)
  notifyCardKinds()
  return () => {
    // Only remove if still THIS registration (a re-register after dispose
    // may have replaced the slot).
    if (_kinds.get(def.kind) === def) {
      _kinds.delete(def.kind)
      notifyCardKinds()
    }
  }
}

/** Fail-safe flags for kinds this build does not know (a doc authored with
 * a plugin kind whose plugin is gone). The card RENDERS (default chrome)
 * but never runs, never fetches a form-spec — a silent mislabel as
 * "generation" would try a model-route fetch for a non-model service. */
const UNKNOWN_KIND_DEF: CardKindDef = {
  kind: "(unknown)",
  runnable: false,
  executable: false,
  formSpec: false,
  compound: false,
  opensStudio: false,
  badgeTone: "default",
  runner: "",
}

const _warned = new Set<string>()

// The kinds lane state (pluginKinds marks this once its FIRST load
// settles — success OR failure). A kindDef() call BEFORE any sync has
// landed is the boot race — a persisted doc renders its tiles before
// the async /v1/kinds arrives — not registry drift. The fail-safe FLAGS
// always apply; only the loud log waits for the lane's first settled
// state, when "unknown" becomes the honest verdict.
let _kindsLaneSettled = false

/** pluginKinds' first lane load settled — unknown kinds now log loud. */
export function markCardKindsLaneSettled(): void {
  _kindsLaneSettled = true
}

/** The kind's flags. Unknown kinds → the fail-safe def + a loud one-time
 * dev log (prod stays quiet — a doc from a newer build must not spam).
 * The log fires only after the kinds lane's first load settled — see
 * _kindsLaneSettled (the boot race logged a false alarm otherwise). */
export function kindDef(kind: string): CardKindDef {
  const def = _kinds.get(kind)
  if (def) return def
  if (_kindsLaneSettled && typeof console !== "undefined" && !_warned.has(kind)) {
    _warned.add(kind)
    console.error(
      `cardSeam: unknown card kind ${JSON.stringify(kind)} — rendering with fail-safe flags (not runnable). Register the kind or remove the plugin that added it.`,
    )
  }
  return UNKNOWN_KIND_DEF
}

/** Every registered kind id (inspection / gate tests). */
export function registeredCardKinds(): string[] {
  return [..._kinds.keys()].sort()
}

export function kindHasFormSpec(kind: string): boolean {
 // The registry is the authority (cardSeam) — a plugin kind with a model
 // route registers formSpec: true; unknown kinds fail safe (no fetch).
 return kindDef(kind).formSpec
}

/** True for kinds whose card opens a studio on demand (studio-link). */
export function kindOpensStudio(kind: string): boolean {
  // The registry is the authority (cardSeam).
  return kindDef(kind).opensStudio
}

/** True for the ONE container kind — a card that holds other cards. The The
 * compound parent owns no model, never executes alone, and renders as a
 * subgraph tile (face = aggregate of children). */
export function kindHasCompound(kind: string): boolean {
  // The registry is the authority (cardSeam).
  return kindDef(kind).compound
}
