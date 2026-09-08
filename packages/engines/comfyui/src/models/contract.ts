// models/contract.ts — THE MODEL REGISTRY CONTRACT, ported from the
// python `melite_models` grammar (git 034e1f97, `python/melite_models/
// grammar.py` @ 1375 lines — the pydantic twin of the cards DSL).
//
// RESURRECTION (2026-09-08, operator order): the NO-ESTATE-PYTHON cuts
// deleted the model.py authoring plane with no TS successor; this file
// + registry.generated.ts + models.ts are that successor. Source of
// truth: the 47 unit files + grammar at 034e1f97, imported and dumped
// by the metaclasses themselves (every pydantic row validated at
// construction — the dump carries the contract's own verdicts, not a
// hand transcription).
//
// Shape laws carried over verbatim:
// - rows are FROZEN DATA (PYTHON SHAPE LAW rung 1 → data-stays-data,
//   P36): a cell is a record, not a type.
// - `extra: forbid` → Schemastery strict schemas (unknown key refuses).
// - artifact all-or-nothing (rung 4): a Cell either downloads or not.
// - sha256: 64 lowercase hex (regex validator).
// - served ModelRow.form REQUIRED non-empty (2026-08-11 catalog
//   contract: every served model routes and renders).
// - cascade merge: family → variant → cell, LATER LAYERS WIN.

import z from "@deepseek-ai/schemastery";

/** Loud refusal before the wire (the QUEUE LANE LAW shape). */
export class ModelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelError";
  }
}

const SHA256_RE = /^[0-9a-f]{64}$/;
export const SAFE_ID_RE = /^[a-z0-9_-]+$/;

// ── served/emitted rows ─────────────────────────────────────────────

export interface SourceRow {
  type: string;
  repo_id?: string;
  filename?: string;
}

export const SourceRow: z<SourceRow> = z.object({
  type: z.string().default(""),
  repo_id: z.string(),
  filename: z.string(),
  note: z.string(),
});

export interface LoraRow {
  id: string;
  filename: string;
  label: string;
  category: string;
  default_strength: number;
  user_provided: boolean;
}

export const LoraRow: z<LoraRow> = z.object({
  id: z.string(),
  filename: z.string(),
  label: z.string().default(""),
  category: z.string().default(""),
  default_strength: z.number().min(0).max(2).default(1.0),
  user_provided: z.boolean().default(false),
});

/** A matrix cell's downloadable body — the DOWNLOAD LINK. */
export interface CellArtifact {
  source_url: string;
  size_bytes: number;
  sha256: string;
  dest_root: string;
  dest_sub: string;
  size_hint_gb?: number;
  vram_peak_gb?: number;
}

export const CellArtifact: z<CellArtifact> = z.object({
  source_url: z.string().pattern(/^https?:\/\//),
  size_bytes: z.number().min(1),
  sha256: z.string().pattern(SHA256_RE),
  dest_root: z.string().default("COMFYUI_ROOT"),
  dest_sub: z.string().default(""),
  size_hint_gb: z.number(),
  vram_peak_gb: z.number(),
});

// ── the cascade rows (frozen instances, not subclasses) ─────────────

/** One (variant × quant) matrix place. Either IS a download place
 *  (artifact present) or is NOT (null) — all-or-nothing. */
export interface CellRow {
  quant: string;
  label: string;
  /** ONLY THE QUANT CARRIES THE DOWNLOAD (operator order
   *  2026-09-08): the cell names its own artifact file — the
   *  model carries the repo, variants carry nothing
   *  downloadable, and the route's source composes the two. */
  source?: SourceRow | null;
  /** The quant's own flat label/description overrides (the bf16
   *  copy's full truth) — the derived route view prefers
   *  cell → variant → model. */
  description?: string;
  route: string;
  engine: string;
  vram_peak_gb?: number;
  resolver_defaults: Record<string, unknown>;
  hide_from_dropdown: boolean;
  artifact?: CellArtifact | null;
}

export const CellRow: z<CellRow> = z.object({
  quant: z.string().pattern(SAFE_ID_RE),
  label: z.string().default(""),
  source: z.union([SourceRow, z.const(null)]),
  description: z.string().default(""),
  route: z.string().default(""),
  engine: z.string().default(""),
  vram_peak_gb: z.number().min(0),
  resolver_defaults: z.dict(z.any()).default({}),
  hide_from_dropdown: z.boolean().default(false),
  artifact: z.union([CellArtifact, z.const(null)]),
});

export interface VariantRow {
  id: string;
  label: string;
  /** The variant's own flat description override (the derived
   *  route view prefers cell → variant → model). */
  description?: string;
  hint: string;
  group: string;
  route: string;
  engine: string;
  order?: number;
  resolver_defaults: Record<string, unknown>;
  /** The variant's LANE INPUT stamps (the intercept over the
   *  model's base lane_inputs — e.g. the base checkpoint's
   *  model_path; merged base ← variant at the derived read). */
  lane_inputs?: Record<string, unknown>;
  wire_defaults?: Record<string, unknown> | null;
  cells: CellRow[];
}

export const VariantRow: z<VariantRow> = z.object({
  id: z.string().pattern(SAFE_ID_RE),
  label: z.string().default(""),
  description: z.string().default(""),
  hint: z.string().default(""),
  group: z.string().default("Variant"),
  route: z.string().default(""),
  engine: z.string().default(""),
  order: z.number(),
  resolver_defaults: z.dict(z.any()).default({}),
  lane_inputs: z.dict(z.any()).default({}),
  wire_defaults: z.union([z.dict(z.any()), z.const(null)]),
  cells: z.array(CellRow).default([]),
});

export interface VariantGroupRow {
  id: string;
  label: string;
  tooltip: string;
  default: string;
}

export const VariantGroupRow: z<VariantGroupRow> = z.object({
  id: z.string(),
  label: z.string().default(""),
  tooltip: z.string().default(""),
  default: z.string().default(""),
});

export interface ProvisionRow {
  name: string;
  url: string;
  folder: string;
  sha256?: string;
  size_bytes?: number;
}

/** The family declaration — the model.py unit's data shape. */
export interface ModelDecl {
  id: string;
  genre: string;
  label: string;
  description: string;
  engine: string;
  /** Present-only-when-true: an unoffered model registers but
   *  serves no surface. The DEFAULT is offered — no key. */
  unoffered?: boolean;
  defaults?: Record<string, unknown>;
  source?: { type?: string; repo_id?: string; filename?: string | null; note?: string } | null;
  studio?: {
    tenant: string;
    owns_params?: boolean;
    writes?: readonly string[];
    size?: string;
    layout?: string;
    kind?: string;
  } | null;
  mods: string[];
  variants: VariantRow[];
  variant_groups: VariantGroupRow[];
  provisions: ProvisionRow[];
  prompt_guide?: Record<string, unknown> | null;
  base_body: string;
  accepts: string[];
  timeout_floor?: number;
  canvas_default: boolean;
  character_presets?: ReadonlyArray<Record<string, unknown>>;
  /** Per-family graph-variance rows (z-image's AuraFlow sampling
   *  shift, qwen-3 encoder — the lane's own input truth). */
  lane_inputs?: Record<string, unknown>;
  has_agent: boolean;
  has_inference: boolean;
  has_rubric: boolean;
}

/** The catalog's served model row (the engine gate serves — an
 *  unoffered family serves no row at all). */
export interface ModelRow {
  id: string;
  family: string;
  genre: string;
  label: string;
  description: string;
  source: SourceRow;
  defaults: Record<string, unknown>;
  engine: string;
  has_agent?: boolean;
  has_inference?: boolean;
  has_rubric?: boolean;
}

export const ModelRow: z<ModelRow> = z.object({
  id: z.string(),
  family: z.string(),
  genre: z.string(),
  label: z.string().default(""),
  description: z.string().default(""),
  source: SourceRow.default({ type: "" }),
  defaults: z.dict(z.any()).default({}),
  engine: z.string().default(""),
  has_agent: z.boolean(),
  has_inference: z.boolean(),
  has_rubric: z.boolean(),
});
