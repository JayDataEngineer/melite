// formDoc.ts — THE MCP FORM DOC (the card-seam law applied to the
// MCP engine lane). The PER-SERVER docs (mcpFormDoc at
// `mcp:<server>`): one face per seated server for DIRECT tool calls
// — the lane the spawned subagent and flow-composed rows ride. The
// GENERIC picker card (`mcp`) does NOT live here: it spawns a
// standalone subagent, so its face is the AGENT card doc
// (engine 'agent', @melite/engine-agent agentCardFormDoc — the
// operator's law 2026-09-21: the configuration is the MCP tools to
// provide, the inputs, and the prompts; never a raw tool call).
// ANTI-DRIFT: the schema arm serializes the SAME params contract
// the executor's stage gate validates (mcp-engine.ts: tool named,
// args a JSON object, out contained in the run dir) — the form and
// the wire are one declaration, and the wall (tests/form-doc.spec.ts)
// pins the serialization so a change must land consciously in both.
import z from "@deepseek-ai/schemastery";
/** THE PARAMS CONTRACT. A factory (not a const): the tool options
 *  are the SERVER's live census, so each mcp:<server> model serves
 *  its own schema instance — same shape, server-specific options
 *  (the agent census precedent: options ride the declaration, the
 *  wire gate stays the executor's own). */
export function mcpParams(tools) {
    return z.object({
        tool: z.string().description("Tool").extra("extra", {
            order: 0, group: "call", width: 2,
            wtype: "select",
            options: tools.map((t) => ({ value: t.value, label: t.label })),
            tooltip: tools.length > 0
                ? "The server tool this stage calls (mcp__<server>__<tool> on the wire)."
                : "The server exposes no tools — the stage refuses until its server lists one.",
            required: true,
        }),
        args: z.string().description("Arguments").default("{}").extra("extra", {
            order: 1, group: "call", width: 2,
            wtype: "textarea",
            tooltip: "JSON object of the tool's arguments. 'out' (optional) lands inside the run dir — relative paths resolve there, escapes refuse loud.",
        }),
    });
}
/** The PER-SERVER doc (the FormSpecDoc shape the drill's CardForm
 *  walks — specBody's arms, mirrored for an engine with no card,
 *  no family, no variants). The MODEL is the SERVER: families lists
 *  every seated instance, so the Model rail switches servers and
 *  the client's model-key refetch re-specs to that server's own
 *  tool census. */
export function mcpFormDoc(input) {
    return perServerDoc(input.server, input.tools, input.servers);
}
/** The shared per-server body. */
function perServerDoc(server, tools, servers) {
    const id = `mcp:${server}`;
    return {
        form: id,
        genre: "3d",
        engine: id,
        // THE CONTRACT'S OWN SERIALIZATION — never a re-hand-rolled
        // field list (the card law: the schema IS the served form).
        schema: mcpParams(tools).toJSON(),
        mod_schemas: {},
        model_defaults: {},
        model: id,
        families: servers.map((s) => ({ id: `mcp:${s}`, present: true })),
        variants: [],
        inputs: [],
        outputs: { default: "text" },
        label: `MCP · ${server}`,
        description: `One tool call on the seated MCP server '${server}' (official protocol over the tools runtime): ` +
            "pick the tool, pass its arguments as a JSON object; new files land in the run dir as artifacts.",
        layout: null,
        loader_info: null,
        service: id,
        size: null,
        enhance_prompts: { prompt: null, lyrics: "" },
        features: { modifiers: [], variant_groups: [] },
    };
}
//# sourceMappingURL=formDoc.js.map
