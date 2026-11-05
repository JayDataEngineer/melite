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
/** THE $SPELL RESOLUTION (F58, 2026-11-02 — the craft-loop flow
 * binding): a flow-driven craft stage carries its declared initials
 * as TOP-LEVEL `"$name"` params (the registry row's binding:
 * `agent_prompt: "$agent_prompt"`, `command: "$command"`,
 * `max_iterations: "$max_iterations"`); the run's request initials
 * ride the executor's fifth argument (EngineExecutor's own law —
 * "the values a stage's `$spell` params resolve against at merge").
 * This fold runs BEFORE the contract gate, so the gate sees the
 * resolved values: a brief arrives as prose, a command as its
 * {engine, params} object, a max_iterations as the NUMBER the
 * caller sent (a digit-string folds NEVER — the initial door
 * refused that shape before the run registered).
 * AN UNRESOLVED $spell OMITS THE KEY — never a throw, never a
 * literal: an optional initial the caller omitted (max_iterations)
 * is ABSENT from the run's initials record, and the honest ride is
 * the engine's own default law. The loud refusals live at the two
 * doors that own them: the START door refuses absent required
 * initials before the run registers (requiredInitials), and the
 * contract gate below refuses an absent agent_prompt/command with
 * its own voice — so a row that typo'd a REQUIRED spell reds the
 * gate, and the registry-row wall pins the exact binding (a typo'd
 * row reds the wall before any run). Nested values never rewrite: a
 * craft act's params are the critic's literal tool arguments. */
export declare function resolveCraftSpells(params: Record<string, unknown>, initials: Readonly<Record<string, unknown>> | undefined): Record<string, unknown>;
/** THE GATE (the executor consumes this — one spelling of the
 * wire). Accepts the canonical object OR the form's JSON string
 * for `command` (a textarea carries text; the gate folds it). */
export declare function normalizeCraftStageParams(raw: unknown, where: string, hardCap: number): CraftStageParams;
/** THE SERVED DOC (FormSpecDoc-shaped — the drill renders the loop
 * stage from THIS; the schema arm is the contract's own
 * serialization, never a re-hand-rolled field list). */
export declare function craftFormDoc(): Record<string, unknown>;
//# sourceMappingURL=params.d.ts.map
