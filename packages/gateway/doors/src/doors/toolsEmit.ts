// doors/toolsEmit.ts — the LIVE /v1/tools body, emitted from the
// card registry (M1, 2026-09-09: the card emits the tool; the
// frozen TOOLS_JSON base doc died with the second spelling).
//
// One source end to end: the primed card registry. Every emitted
// row derives from the card unit — name from the id, primary
// model from boarded[0], prose from identity, params_schema from
// the card's Schemastery schema via the engine package's emitter
// (engines/comfyui-cordis params-emit.ts) — the same projection
// the disclosure rim serves (toolProjection.ts; the carrier line
// below mirrors it — one projection, two doors).
//
// Bytes: computed per request from the injected registry (stroke
// 2a — no module `cached` singleton; the projection is
// deterministic per primed registry, so recompute serves
// identical bytes). Serialization: JSON.stringify(doc, null, 2) —
// the TS-canonical form (raw UTF-8 em-dashes, JS numbers); the py
// ensure_ascii era is over.
import { emitParamsSchema } from "@comfyui/cordis";
import { needCardRegistry } from "./flowsCard.ts";
import type { CardRegistryService } from "./flowsCard.ts";
import { toolBaseRows } from "./toolProjection.ts";

// Wire row order (the frozen doc's key order serves byte-for-byte;
// the overlay appends params_schema last — this table pins it).
const ROW_KEYS = ["name", "version", "kind", "card", "model", "stage_title", "description"] as const;

const buildToolsJson = async (cards?: CardRegistryService | null): Promise<string> => {
  // The registry is primed at boot (the manifest's card-registry
  // row) — sync read. The registry arg is optional only for
  // pre-service callers — serving without it throws LOUD.
  const defs = needCardRegistry(cards, "toolsJsonLive").defsSync()
  const rows = toolBaseRows(defs)
  if (rows.size === 0) {
    throw new Error("toolsEmit: no cards registered — registry empty?")
  }
  const tools: Array<Record<string, unknown>> = []
  for (const [id, def] of defs) {
    const base = rows.get(id)
    if (base === undefined) continue // unreachable beside the fence; the loop keys match by construction
    const carrier =
      (def as { schemaCarrier?: unknown }).schemaCarrier ?? def.schema
    const paramsSchema = emitParamsSchema(
      carrier as Parameters<typeof emitParamsSchema>[0],
      def.boarded,
    )
    const row: Record<string, unknown> = {}
    for (const key of ROW_KEYS) {
      row[key] =
        key === "name" ? base.name :
        key === "version" ? base.version :
        key === "kind" ? base.kind :
        key === "card" ? base.card :
        key === "model" ? base.model :
        key === "stage_title" ? base.stageTitle :
        base.description
    }
    // Verbatim emitter output (an empty required is OMITTED, not
    // [] — the disclosure rim serves the same object).
    row["params_schema"] = {
      type: paramsSchema.type,
      properties: paramsSchema.properties as Record<string, unknown>,
      ...(paramsSchema.required !== undefined
        ? { required: paramsSchema.required }
        : {}),
    }
    tools.push(row)
  }
  return JSON.stringify({ tools }, null, 2)
}

/** The served /v1/tools body: one row per registered card,
 *  emitted end to end from the card unit. */
export const toolsJsonLive = async (cards?: CardRegistryService | null): Promise<string> => {
  return buildToolsJson(cards)
}
