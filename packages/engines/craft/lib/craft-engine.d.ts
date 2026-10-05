import { Context, Service } from "@deepseek-ai/cordis";
import type { EngineParamValue } from "@melite/engine-contract";
/** One act command: a nested engine stage (the loop's hands). */
export interface CraftCommand {
    readonly engine: string;
    readonly params: Readonly<Record<string, EngineParamValue>>;
}
/** The critic's decision — the loop's discipline (JSON protocol):
 *  done ends the loop; refine carries the next command. */
export interface CraftCritique {
    readonly verdict: "done" | "refine";
    readonly note?: string;
    readonly command?: CraftCommand;
}
/** What the critic sees each iteration. */
export interface CraftCriticInput {
    readonly iteration: number;
    readonly prompt: string;
    readonly command: CraftCommand;
    readonly artifacts: readonly string[];
    readonly runDir: string;
    readonly signal: AbortSignal;
}
/** The critic seam (injected; the provider builds the real one). */
export interface CraftCritic {
    critique(input: CraftCriticInput): Promise<CraftCritique>;
}
/** The engines seam (the seat's resolver slice). */
export interface CraftEngines {
    resolve(id: string): {
        executor: {
            executeStages: import("@melite/engine-contract").EngineExecutor["executeStages"];
        };
    };
}
/** The hard circuit breaker (never a tunable — a law). */
import { CRAFT_MAX_ITERATIONS_HARD_CAP } from "./params.js";
export { CRAFT_MAX_ITERATIONS_HARD_CAP };
export declare const craftLoopExecutor: (engines: CraftEngines, critic: CraftCritic) => {
    executeStages: import("@melite/engine-contract").EngineExecutor["executeStages"];
};
/** The structural seam slices the provider reads (the estate's
 *  ctx.get law — declared, never assumed). */
export interface CraftLlmSeam {
    listProviders(): {
        id: string;
    }[];
    listModels(provider: string): Promise<{
        id: string;
    }[]>;
    resolveModelInfo(provider: string, model: string, signal?: AbortSignal): Promise<{
        inputModalities?: readonly string[];
    }>;
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
            messages: {
                role: "user";
                content: unknown[];
            }[];
            [key: string]: unknown;
        }): AsyncIterable<{
            type: string;
            text?: string;
        }>;
    }>;
}
/** The route law (the preference arm's precedent, stroke 52):
 *  enumerate every registered provider route round-robin and pick
 *  the FIRST image-capable one — zero config to misconfigure; a
 *  lane with no vision route seats no critic (loud, never fatal). */
export declare function resolveImageCapableRoute(llm: CraftLlmSeam): Promise<{
    provider: string;
    model: string;
} | null>;
export interface CraftAttachmentsSeam {
    saveImage(input: {
        data: Uint8Array;
        mediaType: string;
        name?: string;
    }): Promise<{
        attachmentId: string;
        mediaType: string;
        bytes: number;
        width: number;
        height: number;
    }>;
}
/** Build the REAL critic from the llm + attachments seats: the
 *  artifact image rides the message (ImageBlock, the
 *  melite_view law); the verdict comes back as JSON. */
export declare const llmCritic: (llm: CraftLlmSeam, attachments: CraftAttachmentsSeam, route: {
    provider: string;
    model: string;
}) => CraftCritic;
/** The provider: engine id 'craft' on the seat. The critic route
 *  is named in config (explicit > implicit). */
export declare const craftEngine: (ctx: Context, config: {
    provider?: string;
    model?: string;
}) => void;
export declare class CraftEngineService extends Service {
    constructor(ctx: Context, config: {
        provider?: string;
        model?: string;
    });
}
export declare const craftCallId: () => string;
/** The composition-site mount: resolve the critic route at BOOT
 *  (the route law above) and seat engine 'craft'; a lane with no
 *  image-capable route seats NO critic (the loud log line, never
 *  a dead lane — craft stages then refuse at the door's membership
 *  arm with the registered list). A NAMED preference (the estate's
 *  MELITE_CRITIC_ROUTE "provider/model") beats the enumeration —
 *  explicit > implicit — but it is still verified image-capable
 *  before seating (a blind preference seats nothing, LOUD, never a
 *  silent substitution). Returns whether the seat landed, so the
 *  composition site can retry late (adapters register on settings
 *  arrival, AFTER early rows apply). */
export declare function craftEngineAutoRoute(ctx: Context, log: (line: string) => void, prefer?: {
    provider: string;
    model: string;
}): Promise<boolean>;
//# sourceMappingURL=craft-engine.d.ts.map
