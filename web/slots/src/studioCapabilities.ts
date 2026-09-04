// studioCapabilities — the declarative registry of STUDIO-KIND capabilities.
//
// Generation capabilities (Generate / Edit / Upscale / Speech / …) live in
// the catalog YAML — they declare families + routes (default_family is
// OPTIONAL per §11: the plugin tile derives its default from the first
// member family; core config names no plugin ids), and the backend
// resolves them via the family/model machinery. STUDIO-KIND
// capabilities are structurally different: no family, no model, no route.
// They produce a flow stage of `kind: "body"` (a source-of-identity
// that opens in the Body Studio tab on double-click), backed by the
// character flow (backend/core/flows/character.py).
//
// They don't fit CapabilityEntry's generation-only schema (which requires
// a routable family — declared or derived). Forcing them
// into catalog YAML would pollute the generation-capability schema with
// non-generation fields. Instead we declare them HERE as a typed constant:
// still declarative, still one source of truth, still type-checked. Adding
// a new studio-kind capability (Pose, Director, …) is one entry — the
// LibrarySidebar picks it up automatically.
//
// The discriminator (kind: "studio") lets the sidebar's render flow
// distinguish studio-kind from generation-kind WITHOUT a catalog lookup,
// the same way PickedCard.kind carries the stage kind through to addStage.
import type { CardGenre } from "@melite/contracts"
/** The studio-target tabs. Each studio-kind capability routes its card to
 *  one of these on double-click (openInStudio in flowStore). Mirrors
 *  the union returned by flowStore.openInStudio. */
export type StudioTarget = "body" | "pose" | "director"

/** A studio-kind capability — produces a stage of `kind: "body"` (or a
 *  future studio kind) when clicked. Discriminated from generation
 *  capabilities by `kind: "studio"` — the LibrarySidebar's unified
 *  flow checks this and calls addStage with the studio shape
 *  (kind: "body" + the studio's defaultParams) instead of the generation
 *  shape (kind: "generation" + route params). */
export interface StudioCapability {
  /** Discriminator — distinguishes from catalog generation capabilities
   *  (which don't carry this field; the sidebar treats its absence as
   *  "generation"). */
  kind: "studio"
  /** Stable id — used as the React key + data-capability-tile attribute. */
  id: string
  /** Human label for the tile (e.g. "Mesh"). */
  label: string
  /** Subtitle for the tile / tooltip (e.g. "anny · phenotype + morphs"). */
  description: string
  /** Genre grouping — drives SectionHeader + ordering, same vocabulary as
   *  generation capabilities. The tile lands under this genre. */
  genre: CardGenre
  /** The studio tab the card opens on double-click. The flowStore's
   *  openInStudio returns this; double-clicking the card routes here. */
  studio: StudioTarget
  /** Default params for the stage — the backend defaults mirrored here.
   *  These flow through addStage → the card → the studio when opened. */
  defaultParams: Record<string, unknown>
}

/** The declarative registry — ONE source of truth for studio-kind caps.
 *
 *  Mesh is the first entry (the character / body studio — renamed from
 *  "Body" to "Mesh" 2026-08-10: the user thinks in terms of the output
 *  mesh, not the anatomical category). The defaults mirror backend/core/
 *  flows/character.py:140 (identity_model="anny" — the only model that
 *  supports deform). coeffs / localChanges / customTargets start null and
 *  are populated by the Body Studio's mesh + sliders on drill-down. */
export const STUDIO_CAPABILITIES: readonly StudioCapability[] = [
  {
    kind: "studio",
    id: "mesh-studio",
    label: "Mesh",
    description: "anny · phenotype + morphs",
    genre: "3d",
    studio: "body",
    defaultParams: {
      identityModel: "anny",
      coeffs: null,
      localChanges: null,
      customTargets: null,
    },
  },
] as const
