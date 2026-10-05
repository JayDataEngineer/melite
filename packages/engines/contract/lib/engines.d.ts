import { Context, Service } from "@deepseek-ai/cordis";
import type { Plugin } from "@deepseek-ai/cordis";
import type { EngineRecord } from "./types.js";
/** Whether an engine id is grammatical (the pinned grammar — see
 * the module header). Exported for the door's pre-flight: the runs
 * door refuses ungrammatical ids with its own voice BEFORE the
 * registry is consulted. */
/** THE BARE ENGINE IDS (the owner's names): every site that names
 *  an engine takes it from here — a card's inject row, a stage's
 *  engine field, a gate's default. One owner per token (the closure
 *  gate's rule 2b). */
export declare const COMFYUI_ENGINE_ID = "comfyui";
export declare const CRAFT_ENGINE_ID = "craft";
export declare const AGENT_ENGINE_ID = "agent";
export declare function engineIdOk(id: string): boolean;
export declare class EnginesService extends Service {
    private readonly engines;
    constructor(ctx: Context);
    /** Register one engine. LOUD on a non-grammatical id (drift, not
     * a fallback case) and on a duplicate id (one id, one provider —
     * the scope-aware tools registry's same-law simplification: THIS
     * seat is per-fiber, so a second registration under the same id
     * on one fiber is a wiring bug). Returns the disposer (the
     * provider wraps it in ctx.effect — the fiber owns the row's
     * lifetime). */
    register(id: string, record: EngineRecord): () => void;
    /** Resolve one engine. LOUD on an unknown id (an engine call
     * without an engine is never a silent module fallback —
     * needComfyUI's law, generalized): the error names every
     * registered id so the miswire is diagnosable at the door. */
    resolve(id: string): EngineRecord;
    /** Whether an engine id is registered (the door's membership
     * check — grammar first, then this). */
    has(id: string): boolean;
    /** The registered ids, sorted (diagnostic + door voice). */
    ids(): string[];
}
/** The contract's provider plugin: mounts the 'engines' seat. Ride
 * BEFORE every engine adapter row (the estate bundle's mount order
 * is load order). */
export declare const enginesContract: Plugin;
export default enginesContract;
//# sourceMappingURL=engines.d.ts.map
