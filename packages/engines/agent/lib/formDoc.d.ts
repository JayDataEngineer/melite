import { type CensusRow } from "./params.js";
/** The census inputs (served LIVE by the door — never a static
 * list): the seated MCP servers and the skill index leaves. */
export interface AgentFormCensus {
    mcps: readonly CensusRow[];
    skills: readonly CensusRow[];
}
/** The served doc (the FormSpecDoc shape the drill's CardForm
 * walks: schema envelope + features.modifiers — specBody's arms,
 * mirrored for an engine with no card, no family, no variants). */
export declare function agentFormDoc(census: AgentFormCensus): Record<string, unknown>;
/** THE GENERIC MCP CARD'S DOC (operator 2026-09-21: "it was
 * supposed to be a generic MCP card… ALWAYS spawn a completely
 * standalone DSH subagent; the configuration is the MCP tools to
 * provide, the inputs, and the prompts"). The picker's ONE 'mcp'
 * row serves THIS face: the same subagent the agent engine spawns
 * (engine 'agent' — the run rides the flow door), configured
 * through the card grammar — the MCPs/Skills/Inputs plus-boxes and
 * the Task brief. NO model field (agentCardParams' law: agent
 * selection rides the host's boot route, and a card field named
 * 'model' is the estate's model key, never a brain route). The
 * census is the caller's LIVE fold — no seated MCP server, no
 * card. */
export declare function agentCardFormDoc(census: AgentFormCensus): Record<string, unknown>;
//# sourceMappingURL=formDoc.d.ts.map
