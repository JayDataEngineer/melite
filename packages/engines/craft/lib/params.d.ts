import z from "@deepseek-ai/schemastery";
/** The craft stage wire (the four fields, verbatim from the
 * engine's own arms — every LOUD message preserved). */
export interface CraftStageParams {
    prompt: string;
    command: {
        engine: string;
        params: Record<string, unknown>;
    };
    model: string | undefined;
    maxIterations: number | undefined;
}
/** THE HARD CAP (the circuit-breaker law — ONE declaration: the
 * gate enforces it, the form's tooltip tells it, the engine
 * re-exports it). */
export declare const CRAFT_MAX_ITERATIONS_HARD_CAP = 1000;
/** THE CONTRACT: types + form layout + the gate's shape. */
export declare const craftParams: z<Schemastery.ObjectS<NoInfer<{
    agent_prompt: z<string, string, "plain">;
    model: z<string, string, "plain">;
    command: z<Schemastery.ObjectS<NoInfer<{
        engine: z<string, string, "plain">;
        params: z<Schemastery.ObjectS<{}>, Schemastery.ObjectT<{}>, "plain">;
    }>>, Schemastery.ObjectT<NoInfer<{
        engine: z<string, string, "plain">;
        params: z<Schemastery.ObjectS<{}>, Schemastery.ObjectT<{}>, "plain">;
    }>>, "plain">;
    max_iterations: z<number, number, "plain">;
}>>, Schemastery.ObjectT<NoInfer<{
    agent_prompt: z<string, string, "plain">;
    model: z<string, string, "plain">;
    command: z<Schemastery.ObjectS<NoInfer<{
        engine: z<string, string, "plain">;
        params: z<Schemastery.ObjectS<{}>, Schemastery.ObjectT<{}>, "plain">;
    }>>, Schemastery.ObjectT<NoInfer<{
        engine: z<string, string, "plain">;
        params: z<Schemastery.ObjectS<{}>, Schemastery.ObjectT<{}>, "plain">;
    }>>, "plain">;
    max_iterations: z<number, number, "plain">;
}>>, "plain">;
/** THE COMMAND ROW GATE (shared spelling): the stage's own
 * command AND the critic's refine verdict walk the same law. */
export declare function normalizeCraftCommand(v: unknown, where: string): {
    engine: string;
    params: Record<string, unknown>;
};
/** THE GATE (the executor consumes this — one spelling of the
 * wire). Accepts the canonical object OR the form's JSON string
 * for `command` (a textarea carries text; the gate folds it). */
export declare function normalizeCraftStageParams(raw: unknown, where: string, hardCap: number): CraftStageParams;
/** THE SERVED DOC (FormSpecDoc-shaped — the drill renders the loop
 * stage from THIS; the schema arm is the contract's own
 * serialization, never a re-hand-rolled field list). */
export declare function craftFormDoc(): Record<string, unknown>;
//# sourceMappingURL=params.d.ts.map
