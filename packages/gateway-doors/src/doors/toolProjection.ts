// doors/toolProjection.ts — the registry-native card-tool projection
// (PURGE S-snapshots, 2026-09-08).
//
// The card-dir tool.json snapshots are deleted; the disclosure rim
// (manifests() in planes.ts: /v1/card-tools, peek, lane bundles) and
// the /v1/tools overlay (toolsEmit.ts) project from ONE source: the
// primed card registry (names/params live) over the frozen TOOLS_JSON
// base (tool names, stage titles, descriptions — authored prose with
// no registry home).
//
// Rule: for each card the walk/overlay names, base row (by card id)
// + live params_schema (emitParamsSchema over the card's carrier,
// the toolsEmit/flowsCard carrier mirror) = the ManifestRow. A
// registered card with NO base row refuses LOUD (a new card lands
// its base row beside its card file — never a silent drop); a base
// row with no registered card rides frozen (toolsEmit today).
import { emitParamsSchema } from "@comfyui/cordis";
import type { CardDefinition } from "@comfyui/cordis";
import { TOOLS_JSON } from "./chrome.ts";
import type { ManifestRow } from "./planes.ts";

/** Py-era card dir names (underscores) -> registry ids (hyphens).
 *  The three dirs predate the registry; the mapping is closed (a
 *  fourth mismatch refuses LOUD at the walk, never a silent skip).
 *  A future dir rename deletes the row here. */
export const DIR_ID_ALIASES: Readonly<Record<string, string>> = {
  img_to_mesh: "img-to-mesh",
  input_prep: "input-prep",
  mask_studio: "mask-studio",
};

export interface ToolBaseRow {
  readonly name: string;
  readonly version: number;
  readonly kind: string;
  readonly card: string;
  // null rides (clothing: model-less pure-tool — the base doc's
  // null serves verbatim on /v1/tools, so the projection preserves
  // it and the doors agree byte-for-byte).
  readonly model: string | null;
  readonly stageTitle: string;
  readonly description: string;
}

/** The frozen base table: card id -> authored row (TOOLS_JSON is the
 *  single source — parsed per call, never transcribed, never
 *  cached at module scope (stroke 2a: no module-level mutable
 *  singleton; the doc is small and the parse is cheap beside the
 *  schema emission each row already pays). */
export function toolBaseRows(): Map<string, ToolBaseRow> {
  const doc = JSON.parse(TOOLS_JSON) as { tools: Array<Record<string, unknown>> };
  const out = new Map<string, ToolBaseRow>();
  for (const t of doc.tools) {
    if (typeof t["card"] !== "string" || t["card"] === "") continue;
    out.set(t["card"] as string, {
      name: t["name"] as string,
      version: t["version"] as number,
      kind: t["kind"] as string,
      card: t["card"] as string,
      model: (t["model"] as string | null) ?? null,
      stageTitle: (t["stage_title"] as string) ?? "",
      description: (t["description"] as string) ?? "",
    });
  }
  return out;
}

/** Base row for a registered card — LOUD when the card landed
 *  without one (never a silent drop, never a generated title). */
export function baseRowFor(card: string): ToolBaseRow {
  const base = toolBaseRows().get(card);
  if (base === undefined) {
    throw new Error(
      "[tool_projection] registered card %r has no TOOLS_JSON base row " +
        "(tool name/stage title/description are authored prose — " +
        "land the row beside the card, then re-pin the chrome golden)",
    );
  }
  return base as ToolBaseRow;
}

/** Project one registered card to its served manifest row: authored
 *  base fields + live params_schema from the registry. */
export function projectCardRow(
  def: CardDefinition,
  base: ToolBaseRow,
): ManifestRow {
  const carrier: unknown =
    (def as { schemaCarrier?: unknown }).schemaCarrier ?? def.schema;
  const paramsSchema = emitParamsSchema(
    carrier as Parameters<typeof emitParamsSchema>[0],
    def.boarded,
  );
  return {
    name: base.name,
    version: base.version,
    kind: base.kind,
    card: base.card,
    flow: "",
    model: base.model,
    stageTitle: base.stageTitle,
    description: base.description,
    // Verbatim emitter output (an empty required is OMITTED, not
    // [] — the /v1/tools overlay serves the same object).
    paramsSchema: {
      type: paramsSchema.type,
      properties: paramsSchema.properties as Record<string, unknown>,
      ...(paramsSchema.required !== undefined
        ? { required: paramsSchema.required }
        : {}),
    },
    hidden: null,
  };
}
