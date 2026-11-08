/** Normalize a stage's `vram_budget_mb` to a finite positive budget
 * (MiB). Absent (undefined) means NO GATE — the back-compat arm:
 * stages that declare no budget never probe, never refuse. A
 * present-but-garbage value refuses loud (a typo'd budget that
 * silently gated nothing is the exact failure class this law
 * exists to retire).
 * @param raw the stage params doc's `vram_budget_mb` slot
 * @returns the budget in MiB, or undefined when absent */
export declare function normalizeVramBudgetMb(raw: unknown): number | undefined;
/** Read the engine's primary-device free VRAM (MiB) off
 * /system_stats. The primary device is devices[0] — the device the
 * engine executes on (comfy.model_management's first enabled
 * device; single-GPU estates, ours included, report exactly one).
 * @param server the engine base URL
 * @param client the SDK client bound to that server (probe reuse)
 * @returns the free VRAM of devices[0] in MiB */
export declare function probeVramFreeMb(server: string, client: {
    getSystemStats: () => Promise<unknown>;
}): Promise<number>;
/** The gate: prove `budgetMb` of free VRAM on the engine's primary
 * device before the run submits — ONE probe, then the verdict. The
 * estate NEVER evicts (operator 2026-10-23: "ComfyUI manages VRAM
 * auto" — the engine's own memory management owns what stays
 * resident; an earlier arm fired POST /free + a nudge prompt from
 * here and evicted the operator's managed cache. Retired). Short
 * headroom refuses LOUD with the numbers; proved headroom submits.
 * Never a mid-run OOM the operator only meets as a dead run.
 * @param server the engine base URL
 * @param budgetMb the stage's declared budget (MiB, already normalized)
 * @param client the SDK client bound to the server */
export declare function ensureVramHeadroom(server: string, budgetMb: number, client: {
    getSystemStats: () => Promise<unknown>;
}): Promise<void>;
/** The stage-door read of the gate: normalize the knob off a params
 * doc, fire the gate when present. Absent knob = no client traffic
 * (the back-compat law: stages that never declared a budget must
 * not suddenly probe).
 * @param server the engine base URL
 * @param params the stage's params doc (raw knobs ride here — the
 *  same doc timeout_s reads)
 * @param client the SDK client bound to the server */
export declare function gateVramForStage(server: string, params: Record<string, unknown>, client: {
    getSystemStats: () => Promise<unknown>;
}): Promise<void>;
//# sourceMappingURL=comfyui-vram.d.ts.map
