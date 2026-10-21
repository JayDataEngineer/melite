import type { ManifestRow } from "./skillPlane.js";
import type { CardDefinition } from '@melite/comfyui-card-kit/card-definition';
/** Py-era card dir names (underscores) -> registry ids (hyphens).
 *  The three dirs predate the registry; the mapping is closed (a
 *  fourth mismatch refuses LOUD at the walk, never a silent skip).
 *  A future dir rename deletes the row here. */
export declare const DIR_ID_ALIASES: Readonly<Record<string, string>>;
export interface ToolBaseRow {
    readonly name: string;
    readonly version: number;
    readonly kind: string;
    readonly card: string;
    readonly model: string | null;
    readonly stageTitle: string;
    readonly description: string;
}
/** The emitted base table, derived from the card registry (parsed
 *  per call, never transcribed, never cached at module scope —
 *  stroke 2a law; the derivation is cheap beside the schema
 *  emission each row already pays). */
export declare function toolBaseRows(defs: ReadonlyMap<string, CardDefinition>): Map<string, ToolBaseRow>;
/** Emitted base row for a registered card — LOUD when the card
 *  carries no authored prose or no registry entry (the identity
 *  fence fires inside the derivation; this throw is the map
 *  fence). */
export declare function baseRowFor(defs: ReadonlyMap<string, CardDefinition>, card: string): ToolBaseRow;
/** Project one registered card to its served manifest row: the
 *  emitted base fields + live params_schema from the registry. */
export declare function projectCardRow(def: CardDefinition, base: ToolBaseRow): ManifestRow;
//# sourceMappingURL=toolProjection.d.ts.map