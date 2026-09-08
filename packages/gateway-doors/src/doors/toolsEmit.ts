// doors/toolsEmit.ts — the LIVE /v1/tools params_schema arm
// (2026-09-08, the Phase-2 door flip; PURGE S-snapshots: the
// registry read is the primed sync cache, and the carrier line
// below mirrors toolProjection.ts — one projection, two doors).
//
// The frozen TOOLS_JSON doc (chrome.ts) carried the retired py
// exporter's card schemas. Post-flip the card's Schemastery schema
// IS the single declaration — params_schema derives from it at
// serve time via the engine package's emitter
// (@comfyui/cordis params-emit.ts). This module keeps everything
// ELSE in the frozen doc verbatim (tool names, stage titles,
// descriptions, non-card tools) and replaces only each
// card-compose tool's params_schema.
//
// Bytes: computed once (lazy) and cached — deterministic per boot;
// the chrome wall's golden is regolded from these bytes (causes
// beside the golden). Serialization: JSON.stringify(doc, null, 2) —
// the TS-canonical form (raw UTF-8 em-dashes, JS numbers); the py
// ensure_ascii era is over.
import { emitParamsSchema } from "@comfyui/cordis";
import { cardDefsSync } from "./flowsCard.ts";
import { TOOLS_JSON } from "./chrome.ts";

let cached: string | null = null

const buildToolsJson = async (): Promise<string> => {
  const doc = JSON.parse(TOOLS_JSON) as {
    tools: Array<Record<string, unknown> & { card?: string }>
  }
  // PURGE S-snapshots: the registry is primed at boot (both main.ts
  // sites) — sync read, same projection the disclosure rim serves
  // (toolProjection.ts mirrors this carrier line).
  const defs = cardDefsSync()
  let overlaid = 0
  for (const tool of doc.tools) {
    if (tool.kind !== "card-compose" || typeof tool.card !== "string") continue
    const def = defs.get(tool.card)
    if (!def) continue // tool rows without a registered card ride frozen
    const carrier =
      (def as { schemaCarrier?: unknown }).schemaCarrier ?? def.schema
    tool.params_schema = emitParamsSchema(
      carrier as Parameters<typeof emitParamsSchema>[0],
      def.boarded,
    )
    overlaid++
  }
  if (overlaid === 0) {
    throw new Error("toolsEmit: no card-compose tools overlaid — registry empty?")
  }
  return JSON.stringify(doc, null, 2)
}

/** The served /v1/tools body: frozen base + live params_schema. */
export const toolsJsonLive = async (): Promise<string> => {
  if (cached === null) cached = await buildToolsJson()
  return cached
}
