import { Context, Service } from "@deepseek-ai/cordis";
import type { ToolExecutionInput, ToolExecutionResult } from "@deepseek-ai/dsh-tools";
/** The hard circuit breaker (never a tunable — a law). DEFAULT
 *  max_turns is UNLIMITED (the operator's word: "if I give a task
 *  to 'rig a character'… that is not 10 turns"); this cap is the
 *  runaway bound, with the stop door and live reports as the real
 *  bounds. */
export declare const AGENT_MAX_TURNS_HARD_CAP = 1000;
/** The structural slice of the host ToolRuntime the loop rides
 *  (the real service is dsh-tools' ToolRuntime — schemas() projects
 *  visible definitions onto model-facing fields; execute() is the
 *  caller-owned programmatic channel). */
export interface AgentToolsSeam {
    schemas(): {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
    }[];
    execute(input: ToolExecutionInput): Promise<ToolExecutionResult>;
}
/** The skills seam: read one leaf's body at stage start (the
 *  spawn-injection process — the estate composition builds the real
 *  reader from findSkill; the engine never walks the repo itself). */
export interface AgentSkillReader {
    read(id: string): Promise<string | null>;
}
/** The llm seam (the craft engine's structural slice, grown for
 *  tools: the stream options carry ToolSchemas and the loop-built
 *  message history). */
export interface AgentLlmSeam {
    prepareCall(config: {
        provider: string;
        model: string;
    }, signal?: AbortSignal): Promise<{
        /** The resolved config prepareCall materialized (defaults filled —
         *  the dispatch contract compares stream options against it). */
        config: {
            provider: string;
            model: string;
            [key: string]: unknown;
        };
        stream(options: {
            provider: string;
            model: string;
            system?: string;
            messages: {
                id: string;
                role: "user" | "assistant";
                content: unknown[];
                source: Record<string, unknown>;
            }[];
            tools?: {
                name: string;
                description: string;
                parameters: Record<string, unknown>;
            }[];
            [key: string]: unknown;
        }): AsyncIterable<{
            type: string;
            text?: string;
            block?: {
                type?: unknown;
                text?: unknown;
            };
        }>;
    }>;
}
/** Parse "provider/model" (the card's model dropdown id). */
export declare const parseRoute: (model: unknown, where: string) => {
    provider: string;
    model: string;
};
/** The agent loop executor: llm + tools + (optional) skill reader,
 *  all injected — pinned with fakes per the estate test law. */
export declare const agentLoopExecutor: (llm: AgentLlmSeam, tools: AgentToolsSeam, skills?: AgentSkillReader, fallbackRoute?: {
    provider: string;
    model: string;
}) => {
    executeStages: import("@melite/engine-contract").EngineExecutor["executeStages"];
};
/** The provider: engine id 'agent' on the seat. The brain route is
 *  named in config (explicit > implicit — the estate row wires it;
 *  a stage param 'model' overrides per run). */
export declare const agentEngine: (ctx: Context, config: {
    provider: string;
    model: string;
    skills?: AgentSkillReader;
}) => void;
export declare class AgentEngineService extends Service {
    constructor(ctx: Context, config: {
        provider: string;
        model: string;
        skills?: AgentSkillReader;
    });
}
//# sourceMappingURL=agent-engine.d.ts.map
