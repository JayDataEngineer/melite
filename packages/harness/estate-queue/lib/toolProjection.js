// toolProjection.ts — the registry-native card-tool projection,
// RE-HOMED (REBUILD-17, 2026-09-10): ported verbatim from the dead
// gateway's doors/toolProjection.ts (killed with the gateway app).
// THE CARD EMITS THE TOOL: one source end to end (the primed card
// registry); refusal law — a registered card without authored
// prose throws LOUD.
// (M1, 2026-09-09: THE CARD EMITS THE TOOL — the second spelling
// dies).
//
// ONE source end to end: the primed card registry. The card-dir
// tool.json snapshots died 2026-09-08; TOOLS_JSON (the hand-owned
// frozen prose table) dies now. The emitted tool row derives from
// the card unit itself: name from the id (hyphens→underscores +
// "_card" — the wire spelling the walls pin), the primary model
// from boarded[0] (the same one source the served UI preselect
// rides — image-gen card header), the authored prose from the
// card's identity (label/description — the identity rung). Live
// params_schema from emitParamsSchema over the card's carrier
// (the toolsEmit/flowsCard carrier mirror).
//
// Refusal law: a registered card without authored prose throws
// LOUD — never a silent drop, never a generated title.
import { emitParamsSchema } from "@melite/comfyui-cordis";
import { cardWireName } from "@melite/comfyui-cordis";
/** Py-era card dir names (underscores) -> registry ids (hyphens).
 *  The three dirs predate the registry; the mapping is closed (a
 *  fourth mismatch refuses LOUD at the walk, never a silent skip).
 *  A future dir rename deletes the row here. */
export const DIR_ID_ALIASES = {
    img_to_mesh: "img-to-mesh",
    input_prep: "input-prep",
    mask_studio: "mask-studio",
};
/** The emitted base table, derived from the card registry (parsed
 *  per call, never transcribed, never cached at module scope —
 *  stroke 2a law; the derivation is cheap beside the schema
 *  emission each row already pays). */
export function toolBaseRows(defs) {
    const out = new Map();
    for (const [id, def] of defs) {
        const identity = def.identity;
        if (identity === undefined ||
            identity.label === "" ||
            identity.description === "") {
            throw new Error(`[tool_projection] registered card ${id} carries no identity ` +
                "(label/description are the authored prose the emitted tool " +
                "serves — declare identity on the card; a generated title " +
                "is the silent drop this fence exists to refuse)");
        }
        out.set(id, {
            name: cardWireName(id),
            version: 1,
            kind: "card-compose",
            card: id,
            model: def.boarded[0] ?? null,
            stageTitle: identity.label,
            description: identity.description,
        });
    }
    return out;
}
/** Emitted base row for a registered card — LOUD when the card
 *  carries no authored prose or no registry entry (the identity
 *  fence fires inside the derivation; this throw is the map
 *  fence). */
export function baseRowFor(defs, card) {
    const base = toolBaseRows(defs).get(card);
    if (base === undefined) {
        throw new Error(`[tool_projection] card ${card} has no registry entry ` +
            "(the emission walks defs only — a card id the map lacks " +
            "cannot serve a tool)");
    }
    return base;
}
/** Project one registered card to its served manifest row: the
 *  emitted base fields + live params_schema from the registry. */
export function projectCardRow(def, base) {
    const carrier = def.schemaCarrier ?? def.schema;
    const paramsSchema = emitParamsSchema(carrier, def.boarded);
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
            properties: paramsSchema.properties,
            ...(paramsSchema.required !== undefined
                ? { required: paramsSchema.required }
                : {}),
        },
        hidden: null,
    };
}
//# sourceMappingURL=toolProjection.js.map
