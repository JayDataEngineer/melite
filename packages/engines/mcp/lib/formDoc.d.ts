import z from "@deepseek-ai/schemastery";
/** One tool row (the LIVE enumeration — served options, never a
 *  static list): the seated server's own tools, folded from the
 *  tools seat's schemas (mcp__<server>__<tool>). */
export interface McpToolRow {
    value: string;
    label: string;
    tooltip?: string;
}
/** THE PARAMS CONTRACT. A factory (not a const): the tool options
 *  are the SERVER's live census, so each mcp:<server> model serves
 *  its own schema instance — same shape, server-specific options
 *  (the agent census precedent: options ride the declaration, the
 *  wire gate stays the executor's own). */
export declare function mcpParams(tools: readonly McpToolRow[]): z<Schemastery.ObjectS<NoInfer<{
    tool: z<string, string, "plain">;
    args: z<string, string, "defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    tool: z<string, string, "plain">;
    args: z<string, string, "defined">;
}>>, "plain">;
/** The PER-SERVER doc (the FormSpecDoc shape the drill's CardForm
 *  walks — specBody's arms, mirrored for an engine with no card,
 *  no family, no variants). The MODEL is the SERVER: families lists
 *  every seated instance, so the Model rail switches servers and
 *  the client's model-key refetch re-specs to that server's own
 *  tool census. */
export declare function mcpFormDoc(input: {
    server: string;
    tools: readonly McpToolRow[];
    /** every seated instance (this one included), for the rail */
    servers: readonly string[];
}): Record<string, unknown>;
//# sourceMappingURL=formDoc.d.ts.map
