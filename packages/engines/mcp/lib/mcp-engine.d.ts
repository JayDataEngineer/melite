import { Context, Service } from "@deepseek-ai/cordis";
import z from "@deepseek-ai/schemastery";
import type { ToolExecutionInput, ToolExecutionResult } from "@deepseek-ai/dsh-tools";
/** The structural slice of the host ToolRuntime the executor
 *  rides (the real service is dsh-tools' ToolRuntime; the
 *  structural type keeps tests free of a full harness boot). */
export interface McpToolCaller {
    execute(input: ToolExecutionInput): Promise<ToolExecutionResult>;
}
export declare const mcpServerOf: (engineId: string) => string;
/** The MCP executor factory: one server, many stages. */
export declare const mcpExecutor: (tools: McpToolCaller, engineId: string) => {
    executeStages: import("@melite/engine-contract").EngineExecutor["executeStages"];
};
/** The provider: registers one executor per configured engine id
 *  onto the engines seat. The lane mounts the mcp-client server
 *  rows; THIS adapter's config names which servers also serve the
 *  RUNS plane (explicit > implicit: default registers none). */
export declare const mcpEngines: (ctx: Context, config: {
    engines?: string[];
}) => void;
export declare class McpEnginesService extends Service {
    static Config: z<Schemastery.ObjectS<NoInfer<{
        engines: z<string[], string[], "defined">;
    }>>, Schemastery.ObjectT<NoInfer<{
        engines: z<string[], string[], "defined">;
    }>>, "plain">;
    constructor(ctx: Context, config: {
        engines?: string[];
    });
}
//# sourceMappingURL=mcp-engine.d.ts.map
