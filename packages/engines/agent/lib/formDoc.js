// formDoc.ts — THE AGENT FORM DOC (stroke 66: the card-seam
// generalization — engine-served form specs). The drill renders
// card-less stages from a served FormSpecDoc; engine 'agent' serves
// THIS doc. ANTI-DRIFT: the schema arm serializes the SAME
// agentParams object the executor's gate validates (params.ts) —
// the form and the wire are one declaration, and the wall
// (tests/params.spec.ts) pins the serialization so
// a change must land consciously in both.
import { agentParams, agentCardParams, agentModKinds } from "./params.js";
/** The served doc (the FormSpecDoc shape the drill's CardForm
 * walks: schema envelope + features.modifiers — specBody's arms,
 * mirrored for an engine with no card, no family, no variants). */
export function agentFormDoc(census) {
    return {
        form: "agent",
        genre: "agent",
        engine: "agent",
        // THE CONTRACT'S OWN SERIALIZATION — never a re-hand-rolled
        // field list (the card law: the schema IS the served form).
        schema: agentParams.toJSON(),
        mod_schemas: {},
        model_defaults: {},
        model: "agent",
        families: [],
        variants: [],
        inputs: [],
        outputs: { default: "text" },
        label: "Agent",
        description: "Spawn a subagent with a task: a general tool-calling loop on the runs plane. " +
            "MCPs grant tools, skills inject discipline, inputs ride the brief, max turns bounds the loop.",
        layout: null,
        loader_info: null,
        service: "agent",
        size: null,
        enhance_prompts: { prompt: null, lyrics: "" },
        features: {
            modifiers: agentModKinds(census),
            variant_groups: [],
        },
    };
}
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
export function agentCardFormDoc(census) {
    return {
        form: "mcp",
        genre: "3d",
        engine: "agent",
        schema: agentCardParams.toJSON(),
        mod_schemas: {},
        model_defaults: {},
        model: "mcp",
        families: [],
        variants: [],
        inputs: [],
        outputs: { default: "text" },
        // EXPERIMENTAL (the operator's 2026-10-12 law: the MCP card is
        // optional — the label says so on every face it serves)
        label: "MCP (experimental)",
        description: "Spawn a standalone DSH subagent provisioned with the chosen MCP servers' tools: " +
            "stack MCP tiles to grant servers, Inputs to hand it artifacts, the Task is its brief — " +
            "the agent drives the tools turn by turn and answers when the work is done.",
        layout: null,
        loader_info: null,
        service: "mcp",
        size: null,
        enhance_prompts: { prompt: "task", lyrics: "" },
        features: {
            modifiers: agentModKinds(census),
            variant_groups: [],
        },
    };
}
//# sourceMappingURL=formDoc.js.map
