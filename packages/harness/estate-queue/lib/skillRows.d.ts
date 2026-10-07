import type { DocRow, SkillRow } from "./skillPlane.js";
import type { FamilyModelsSeat } from "./flowsFamilyCompose.js";
/** One registry headless-tool property, projected to the frozen
 *  FlowToolDecl shape (always ptype + description; enum / default /
 *  minimum / maximum ride only when the registry declares them —
 *  nulls never serve). */
export declare function projectToolProperties(properties: Record<string, {
    ptype: string;
    description: string;
    default: unknown;
    hasDefault: boolean;
    minimum: number | null;
    maximum: number | null;
    enum: readonly string[] | null;
}>): Record<string, Record<string, unknown>>;
interface FlowToolDecl {
    readonly name: string;
    readonly version: number;
    readonly description: string;
    readonly properties: Record<string, Record<string, unknown>>;
    readonly required: string[];
}
interface FlowDecl {
    readonly id: string;
    readonly loadError: string | null;
    readonly description: string;
    readonly stages: {
        readonly id: string;
        readonly engine: string;
    }[];
    readonly tool: FlowToolDecl | null;
    readonly skillRefs: string[];
    readonly hasSkillMd: boolean;
}
/** Flow declarations in registry order (registryFlowNames sorted),
 *  with load failures marked (_flow_rows 389-393 skips FlowError
 *  silently — the registry is code, so a declaration bug throws LOUD
 *  out of expandRegistryFlow instead of marking a row). Skips the
 *  registry when flows/ is absent (_flow_rows 387-388: not-a-dir
 *  -> []). The headless tool rides the registry declaration
 *  verbatim (projected to the frozen row shape); hasSkillMd reads
 *  the flows/<id>/SKILL.md leaf live. skillRefs ride the registry
 *  declaration (empty today — the frozen refs pointed at the RETIRED flow.py rows and the retired enhance recipes).
 *  Those refs resolve nowhere and would only skip-loud. */
/** @param modelsSeat the context's models service when mounted — the
 *  disclosure composes from the SAME seat the runs doors thread (the
 *  lane-seat law: the served body and the composed graph must agree;
 *  the booted singleton otherwise) */
export declare function flowDecls(repo: string, modelsSeat?: FamilyModelsSeat | null): FlowDecl[];
/** One doc -> gated row (lane_disclosure._read_doc 130-152):
 *  OSError -> silent None; gate refusal -> LOUD None. */
export declare function readDoc(path: string, sid: string, scope: string, genre: string | null, card: string | null, model: string | null): DocRow | null;
/** THE SPAWN PLANE (operator pin, stroke 87): leaves under
 *  `agents/spawn/` (dir/SKILL.md, same shape as agents/skills/)
 *  are SUBAGENT-ONLY — findSkill resolves their refs for the
 *  agent-stage spawn injection (skills[] inlined into the spawned
 *  brief at stage start), but buildSkillIndex NEVER lists them:
 *  the constructor agent (the main chat session) does not see
 *  skills that belong to the spawned doer. The scope suffix
 *  `-spawn` is the structural mark; the index filter is the law. */
export declare function spawnRows(cdir: string, prefix: string, scope: "card-spawn" | "model-spawn", genre: string | null, card: string | null, model: string | null): DocRow[];
/** Every plugin dir owning action cards (lane_disclosure._engine_dirs
 *  158-176 over plugins.iter_plugin_dirs_under: depth-2 + depth-3
 *  with package.json/plugin.yaml/engines/ marker, sorted —
 *  plugin.py retired 2026-09-08, package.json is the marker). */
export declare function engineDirs(enginesRoot: string): string[];
/** LEVEL 1+3 model docs (lane_disclosure._model_rows 259-312):
 *  GUIDE.md / agents/AGENT.md / agents/skills/* per model dir. */
export declare function modelRows(engine: string): DocRow[];
export interface CardWalk {
    readonly rows: DocRow[];
    readonly buckets: Map<string, {
        dir: string;
        rows: DocRow[];
    }>;
}
/** THE CARD PACKAGE DOMAINS (the card sweep, 2026-09-09): cards
 *  live in their own packages — packages/<domain>/<card>/
 *  (src/card.ts + src/ui/ + src/agents/ in one unit). The engine
 *  src/cards tree keeps only cards not yet swept. This walk yields
 *  both, engine tree FIRST (deterministic order: remainder cards,
 *  then domains sorted, cards sorted — one spelling with the
 *  registry walk below). */
export declare function cardUnitDirs(engine: string, repo: string): {
    genre: string;
    cname: string;
    cdir: string;
}[];
/** LEVEL 2 card docs (lane_disclosure._card_rows 178-257): AGENT.md
 *  + agents/skills/* per card dir, bucketed by DIR NAME ("_" genres
 *  skipped). ONE root — the card-folder migration is complete
 *  (card-folder-shape design record, 2026-09-08): every card lives
 *  as src/cards/<genre>/<card>/ (one card one folder — card.ts +
 *  ui/ + agents/ in one unit); action_cards keeps only the
 *  no-host-card tenants (3d/body) and the genre ui packages. */
export declare function cardRows(engine: string, repo: string): CardWalk;
export interface FlowRow {
    readonly row: SkillRow;
    readonly bodyPath: string | null;
    readonly bodyText: string | null;
}
/** The registry skill body for one flow id (null when the flow
 *  has its own SKILL.md or is unknown to the TS registry — the
 *  caller falls back to the file path). A registry flow whose
 *  declaration fails to expand is an authoring bug: LOUD, never a
 *  silent empty body. The family stages compose first (the doors'
 *  own order) so the body names the action's derived outputs. */
/** @param modelsSeat the context's models service when mounted (the
 *  same seat-threading law as flowDecls) */
export declare function registryBody(flowId: string, modelsSeat?: FamilyModelsSeat | null): string | null;
/** LEVEL 4 flow rows (lane_disclosure._flow_rows 364-411): one gated
 *  SkillRow per loadable declaration (load_error -> silent skip);
 *  body = SKILL.md when present (mega-skill mode) else the TS
 *  registry render (flowsData.ts — the flow.py authoring plane died
 *  2026-09-08; the deleted source is neither servable nor wanted,
 *  so the declaration renders instead). */
/** @param modelsSeat the context's models service when mounted (the
 *  same seat-threading law as flowDecls) */
export declare function flowRows(repo: string, modelsSeat?: FamilyModelsSeat | null): FlowRow[];
export {};
/** GET /v1/skills body (lane_disclosure.melite_skill_index 633-649). The
 *  SPAWN PLANE filter: `-spawn` scoped rows NEVER ride the index —
 *  they are the spawned subagent's private leaves (findSkill
 *  resolves them for stage-start injection; the constructor's
 *  index/listing never sees them — the operator's pin). */
//# sourceMappingURL=skillRows.d.ts.map
