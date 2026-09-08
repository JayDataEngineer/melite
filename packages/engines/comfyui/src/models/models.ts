// models/models.ts — the registry SEMANTICS, ported from the python
// grammar (git 034e1f97, melite_models/grammar.py): merged_defaults
// (the cascade walk), resolve (matrix coordinates → route/engine/cell),
// and the served catalog row emission. Pure functions over frozen data
// (P36 data-stays-data); the Model class methods become module
// functions because the rows are data now, not types.

import {
  ModelError,
  ModelRow,
  type CellRow,
  type ModelDecl,
  type VariantRow,
} from "./contract.ts";
import { MODEL_REGISTRY } from "./registry.generated.ts";
import { buildCatalog } from "./catalogEmission.ts";

export { MODEL_REGISTRY } from "./registry.generated.ts";
export * from "./contract.ts";

export function getModel(id: string): ModelDecl {
  const decl: ModelDecl | undefined = MODEL_REGISTRY[id];
  if (decl === undefined) {
    throw new ModelError(`unknown model family: ${id}`);
  }
  return decl;
}

export const modelIds = (): string[] => Object.keys(MODEL_REGISTRY).sort();

// ── the cascade walk (family → variant → cell, later layers win) ────

function variantOf(decl: ModelDecl, variant: string | null): VariantRow {
  const rows: VariantRow[] = decl.variants;
  if (variant === null || variant === undefined || variant === "") {
    if (rows.length === 0) {
      throw new ModelError(`${decl.id} declares no variants`);
    }
    return rows[0];
  }
  const hit: VariantRow | undefined = rows.find((v) => v.id === variant);
  if (hit === undefined) {
    throw new ModelError(`${decl.id} has no variant '${variant}'`);
  }
  return hit;
}

function cellOf(variant: VariantRow, quant: string | null): CellRow | null {
  if (quant === null || quant === undefined || quant === "") {
    return variant.cells.length > 0 ? variant.cells[0] : null;
  }
  return variant.cells.find((c) => c.quant === quant) ?? null;
}

/**
 * The cascade merge: family defaults ← variant resolver_defaults ←
 * cell resolver_defaults. Later layers win (the MRO walk's shape).
 */
export function mergedDefaults(
  id: string,
  variant?: string | null,
  quant?: string | null,
): Record<string, unknown> {
  const decl: ModelDecl = getModel(id);
  const out: Record<string, unknown> = { ...(decl.defaults ?? {}) };
  if (variant !== undefined || quant !== undefined) {
    const v: VariantRow = variantOf(decl, variant ?? null);
    Object.assign(out, v.resolver_defaults);
    const c: CellRow | null = cellOf(v, quant ?? null);
    if (c !== null && c.resolver_defaults !== undefined) {
      Object.assign(out, c.resolver_defaults);
    }
  }
  return out;
}

/**
 * Matrix coordinates → { route, engine, cell }. Unspecified
 * coordinates fall to the FIRST declared variant/cell (the family
 * default — krea-2's head body IS turbo).
 */
export function resolve(
  id: string,
  variant?: string | null,
  quant?: string | null,
): { route: string; engine: string; cell: CellRow | null } {
  const decl: ModelDecl = getModel(id);
  const v: VariantRow = variantOf(decl, variant ?? null);
  const c: CellRow | null = cellOf(v, quant ?? null);
  const route: string =
    c?.route || v.route || "";
  const engine: string = c?.engine || v.engine || decl.engine;
  return { route, engine, cell: c };
}

// ── the served row (catalog parity, disk probes frozen at dump) ────

export function servedRow(decl: ModelDecl): ModelRow {
  if (decl.unoffered) {
    throw new ModelError(
      `${decl.id}: unoffered — an unoffered family serves no row`,
    );
  }
  if (typeof decl.form !== "string" || decl.form === "") {
    throw new ModelError(
      `${decl.id}: form is REQUIRED on the served row (the 2026-08-11 ` +
        `catalog contract: every served model routes and renders)`,
    );
  }
  const row: ModelRow = {
    id: decl.id,
    family: decl.id,
    genre: decl.genre,
    label: decl.label,
    description: decl.description,
    source: { type: decl.source?.type ?? "", ...(decl.source?.repo_id ? { repo_id: decl.source.repo_id } : {}), ...(decl.source?.filename ? { filename: decl.source.filename } : {}) },
    defaults: decl.defaults ?? {},
    engine: decl.engine,
    form: decl.form,
    ...(decl.has_agent ? { has_agent: true } : {}),
    ...(decl.has_inference ? { has_inference: true } : {}),
    ...(decl.has_rubric ? { has_rubric: true } : {}),
  };
  ModelRow(row); // schema-validates loud (extra/forbid + form non-empty)
  return row;
}

/**
 * The catalog: every offered COMFYUI family's served row, id-keyed.
 * The SERVE LAW lives in one place — catalogEmission.buildCatalog
 * (LAW 0: retired-engine rows are frozen data, never served; the
 * servedRow above is the shared row builder, not the gate).
 */
export function modelCatalog(): Record<string, ModelRow> {
  return buildCatalog().models;
}
