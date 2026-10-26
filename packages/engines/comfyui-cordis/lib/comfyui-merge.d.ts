import type { ActivePrompt, EngineJson } from "./comfyui-types.ts";
import type { ExecuteOpts } from "./comfyui-execute.ts";
export interface MergeRow {
    readonly stageId: string;
    /** the composer label for the third-walk voice (card id when the
     *  run was card-commissioned, else undefined — the adapter falls
     *  back to the stage id); never a graph input */
    readonly card: string | undefined;
    readonly workflow: Record<string, EngineJson>;
    readonly outputs: Record<string, EngineJson>;
    readonly outputNodes: Record<string, EngineJson>;
    readonly params: Record<string, EngineJson>;
}
export interface MergeStageResult {
    readonly outputs: Record<string, EngineJson>;
    readonly artifacts: string[];
}
/** In-stage wire namespacing (mergegraph._namespace_wires): every
 *  [node_id, slot] link pointing inside the stage rewrites to the
 *  namespaced id. */
export declare function namespaceWires(node: EngineJson, sid: string, stageIds: Set<string>): EngineJson;
/** $spell substitution (mergegraph._rewrite_spells): FromStage-wired
 *  names become link tuples, request initials substitute, anything
 *  left over refuses LOUD with the-identical text. */
export declare function rewriteSpells(value: EngineJson, links: Record<string, [string, number]>, initials: Record<string, EngineJson>, where: string): EngineJson;
/** A [node, slot] link shape (mergegraph._is_wire). */
export declare function isWire(v: EngineJson): boolean;
/** The dangling-wire integrity gate (mergegraph._assert_wires_resolve):
 *  construction refuses here, never at the server. */
export declare function assertWiresResolve(merged: Record<string, EngineJson>, links: Record<string, [string, number]>): void;
/** The merge plan for the link-free shapes
 *  the TS preview serves: namespaced copy + FromStage link
 *  resolution + the Load file-slot gate + the dangling gate.
 *  Producer inference (_producers: declared output_nodes, else the
 *  single-Save binding) — an ambiguous graph refuses
 *  LOUD with the producer text.
 *
 *  THE ORDER LAW IS NOT A LAW (2026-10-11). This walks in three
 *  passes so a stage may wire from ANY other stage, not only one
 *  earlier in the array: pass 1 infers every producer table (each
 *  depends only on its own row), pass 2 judges acyclicity and
 *  resolves every wire against the finished tables, pass 3
 *  namespaces and substitutes. The single loop it replaced read
 *  `producers` as it filled it, so a backward wire — which the bench
 *  door admits and the draft store persists verbatim — died HERE,
 *  with a message blaming the upstream stage for "declaring no
 *  mergeable producer" when it declared one perfectly well. A
 *  position in an array is not a semantic law; the wires are. */
export declare function planMerge(rows: MergeRow[], initials: Record<string, EngineJson>, inputNames: Record<string, Record<string, string>>): {
    workflow: Record<string, EngineJson>;
};
export interface FlowResult {
    readonly stages: Record<string, MergeStageResult>;
    readonly promptId: string;
    /** THE REPLAY VERDICT (D11): true when the seated tap folded zero
     *  engine events before settlement — the engine served memo'd
     *  outputs without executing. Optional so older producers stay
     *  assignable: absent means unknown, never clean. */
    readonly replaySuspect?: boolean;
}
/** mergegraph.execute_flow port: plan, submit ONCE, tap-less poll,
 *  per-stage harvest.
 *
 *  NON-PLUGIN callers only (walls/probes/unit — no Context).
 *  Plugin paths (the flows-start worker) use
 *  ComfyUIHostService.executeFlow (same inner, fiber-owned prompts
 *  map + service-resolved server). Documented split, never two truths. */
export declare function executeFlow(rows: MergeRow[], runDir: string, inputNames: Record<string, Record<string, string>>, initials: Record<string, EngineJson>, opts?: ExecuteOpts, serverOverride?: string): Promise<FlowResult>;
/** Shared merged core (no resolution, no registry choice). */
export declare function executeFlowInner(rows: MergeRow[], runDir: string, inputNames: Record<string, Record<string, string>>, initials: Record<string, EngineJson>, opts: ExecuteOpts, server: string, active: Map<string, ActivePrompt>): Promise<FlowResult>;
//# sourceMappingURL=comfyui-merge.d.ts.map