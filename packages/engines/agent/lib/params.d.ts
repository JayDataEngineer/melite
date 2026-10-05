import z from "@deepseek-ai/schemastery";
/** The MCP bag entry's catalog field (the form's select binds this
 *  name; the normalizer reads the same constant). */
export declare const MCP_ENTRY_FIELD = "server";
/** The skills bag entry's catalog field. */
export declare const SKILL_ENTRY_FIELD = "skill";
/** The canonical wire (what the executor consumes and what agents
 * compose structurally): mcps string[], skills string[], inputs
 * {name, value}[]. The FORM writes bag entries ({server: "blender"});
 * the normalizer folds both into this shape. */
export interface AgentStageParams {
    task: string;
    model?: string;
    mcps: string[];
    skills: string[];
    inputs: {
        name: string;
        value: unknown;
    }[];
    max_turns?: number;
}
/** THE KNOWN BRAINS (operator 2026-09-21: a dropdown of known
 *  routes): the ledger-proven opencode routes, blank-first (blank
 *  serves the lane's seated brain whatever it booted). Static BY
 *  CHOICE — the estate runs no boot-time route enumeration, so a
 *  live census is not on offer; and the executor's parseRoute
 *  refuses a rotted row LOUD at Run (never a silent
 *  substitution). */
export declare const KNOWN_BRAINS: readonly [{
    readonly value: "";
    readonly label: "Lane brain (seated)";
}, {
    readonly value: "opencode-go/muse-spark";
    readonly label: "Muse Spark";
}, {
    readonly value: "opencode-go/muse-spark-1.3-contributor";
    readonly label: "Muse Spark 1.3";
}];
export declare const agentParams: z<Schemastery.ObjectS<NoInfer<{
    task: z<string, string, "plain">;
    model: z<string, string, "plain">;
    mcps: z<any[], any[], "plain">;
    skills: z<any[], any[], "plain">;
    inputs: z<any[], any[], "plain">;
    max_turns: z<number, number, "plain">;
}>>, Schemastery.ObjectT<NoInfer<{
    task: z<string, string, "plain">;
    model: z<string, string, "plain">;
    mcps: z<any[], any[], "plain">;
    skills: z<any[], any[], "plain">;
    inputs: z<any[], any[], "plain">;
    max_turns: z<number, number, "plain">;
}>>, "plain">;
/** THE CARD FACE (the generic MCP card, operator 2026-09-21: "the
 * configuration is the MCP tools to provide, the inputs, and the
 * prompts" — agent selection rides the host, never a card field;
 * 2026-09-21: …plus the operator's Brain dropdown, a field named
 * 'brain' — never 'model').
 * Same field declarations, TWO differences BY LAW: no `model` field
 * — a card-stage field named 'model' is the estate's MODEL KEY (a
 * pick re-specs the doc), and a brain route is not a spec key; the
 * Brain dropdown (blank = the boot route MELITE_AGENT_ROUTE serves
 * the spawn) stamps the engine's own `model` key at the run seam
 * (stage-run translates — the face never speaks it). The
 * executor's gate is normalizeAgentStageParams either way. */
export declare const agentCardParams: z<Schemastery.ObjectS<NoInfer<{
    brain: z<"" | "opencode-go/muse-spark" | "opencode-go/muse-spark-1.3-contributor", "" | "opencode-go/muse-spark" | "opencode-go/muse-spark-1.3-contributor", "defined">;
    task: z<string, string, "plain">;
    mcps: z<any[], any[], "plain">;
    skills: z<any[], any[], "plain">;
    inputs: z<any[], any[], "plain">;
    max_turns: z<number, number, "plain">;
}>>, Schemastery.ObjectT<NoInfer<{
    brain: z<"" | "opencode-go/muse-spark" | "opencode-go/muse-spark-1.3-contributor", "" | "opencode-go/muse-spark" | "opencode-go/muse-spark-1.3-contributor", "defined">;
    task: z<string, string, "plain">;
    mcps: z<any[], any[], "plain">;
    skills: z<any[], any[], "plain">;
    inputs: z<any[], any[], "plain">;
    max_turns: z<number, number, "plain">;
}>>, "plain">;
/** One census row (the LIVE enumeration — served options, never a
 * static list): the seated MCP servers / the skill index leaves. */
export interface CensusRow {
    value: string;
    label: string;
    tooltip?: string;
}
/** The mod kinds (the plus-box grammar — the operator's sketch:
 * "input can function like mods row, where there is always one more
 * 'plus box' to add another"). FIELD kinds: each entry is its own
 * object with a select binding the census — stacking tiles IS the
 * multi-select. The entry field names ride the shared constants. */
export declare function agentModKinds(census: {
    mcps: readonly CensusRow[];
    skills: readonly CensusRow[];
}): Array<Record<string, unknown>>;
/** THE EXECUTOR'S GATE — canonical strings OR form-bag entries fold
 *  into the canonical shape; every malformed value refuses LOUD
 *  with the estate's message law (the messages the spec pins). */
export declare function normalizeAgentStageParams(raw: Record<string, unknown>, where: string, hardCap: number): AgentStageParams;
//# sourceMappingURL=params.d.ts.map
