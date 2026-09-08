// models/catalogEmission.ts — THE SERVED CATALOG, all five
// sections, golden-anchored (correction stroke A1).
//
// The wire shape is the tree golden's (tests/golden_http/
// model-catalog.json, regolded 2026-09-07): models + families +
// capabilities + cards + input_vocabulary. models/families emit
// from the frozen registry; cards/capabilities/input_vocabulary
// from the frozen identity ring (cardIdentity.generated.ts) —
// the py builder's own output, byte-equal on shared ids.
//
// SERVE LAW (LAW 0): only comfyui-engine families serve. The 12
// retired-engine rows are frozen data with engine markers — the
// registry carries them (the families the operator mourned), the
// wire never runs them.

import {
  ModelError,
  ModelRow,
  type ModelDecl,
} from "./contract.ts";
import {
  CARD_IDENTITY,
  CAPABILITIES,
  SLOT_VOCABULARY,
} from "./cardIdentity.generated.ts";

export interface CatalogSections {
  models: Record<string, ModelRow>;
  families: Record<string, { label: string; genre: string; studio?: unknown; accepts?: readonly string[] }>;
  capabilities: typeof CAPABILITIES;
  cards: ReadonlyArray<(typeof CARD_IDENTITY)[number]>;
  input_vocabulary: typeof SLOT_VOCABULARY;
}

/** A family serves iff its engine is comfyui (LAW 0) and it is
 *  offered (unoffered families serve no row at all — the 2026-08-11
 *  catalog contract: every served model routes and renders). */
export function isServedFamily(decl: ModelDecl): boolean {
  return (decl.engine === undefined || decl.engine === "" || decl.engine === "comfyui") && !decl.unoffered;
}

function servedRow(decl: ModelDecl): ModelRow {
  if (typeof decl.form !== "string" || decl.form === "") {
    throw new ModelError(
      `${decl.id}: form is REQUIRED on the served row (every served model routes and renders)`,
    );
  }
  const row: ModelRow = {
    id: decl.id,
    family: decl.id,
    genre: decl.genre,
    label: decl.label,
    description: decl.description,
    source: {
      type: decl.source?.type ?? "",
      ...(decl.source?.repo_id ? { repo_id: decl.source.repo_id } : {}),
      ...(decl.source?.filename ? { filename: decl.source.filename } : {}),
    },
    defaults: decl.defaults ?? {},
    engine: decl.engine ?? "",
    form: decl.form,
    has_inference: decl.has_inference === true,
    has_rubric: decl.has_rubric === true,
    ...(decl.has_agent === true ? { has_agent: true } : {}),
  };
  ModelRow(row); // schema-validates loud
  return row;
}

/** The full catalog — all five sections, deterministic key order.
 *  Reads the REGISTERED table (the service's allDecls — the
 *  registry.generated module is retired; the table is the truth). */
export function buildCatalog(decls: readonly ModelDecl[]): CatalogSections {
  const models: Record<string, ModelRow> = {};
  const families: Record<string, { label: string; genre: string; studio?: unknown; accepts?: readonly string[] }> = {};
  for (const decl of decls) {
    const id = decl.id;
    if (!isServedFamily(decl)) continue;
    models[id] = servedRow(decl);
    families[id] = { label: decl.label, genre: decl.genre };
    if (decl.accepts !== undefined && decl.accepts.length > 0) {
      families[id].accepts = decl.accepts;
    }
    const studio = decl.studio;
    if (studio !== undefined && studio !== null && typeof studio.tenant === "string") {
      families[id].studio = {
        tenant: studio.tenant,
        owns_params: studio.owns_params === true,
        ...(studio.writes !== undefined ? { writes: studio.writes } : {}),
        ...(studio.size !== undefined ? { size: studio.size } : {}),
        ...(studio.layout !== undefined ? { layout: studio.layout } : {}),
      };
    }
  }
  return {
    models,
    families,
    capabilities: CAPABILITIES,
    cards: CARD_IDENTITY,
    input_vocabulary: SLOT_VOCABULARY,
  };
}
