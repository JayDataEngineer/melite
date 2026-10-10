import type { Context, Plugin } from "@deepseek-ai/cordis";
import type { EngineExecutor } from "@melite/engine-contract";
import type { ComfyUIHostService } from "../comfyui.ts";
/** The executor: merged submit through the host service. The ctx
 * rides in for ONE reason: the wiring walk below resolves the
 * wiring service AT WALK TIME (a doc that lands after this plugin
 * mounts still judges every later submit — resolve-at-apply would
 * freeze the unarmed state of a late-armed lane). */
export declare function comfyuiExecutor(ctx: Context, host: ComfyUIHostService): EngineExecutor;
/** The adapter row: engine-comfyui-adapter. inject declares the
 * 'engines' seat (load-order gate — the contract row rides
 * first); the host service resolves by needComfyUI (LOUD on a
 * miswire, the one-cast-site law). */
export declare const comfyuiEngine: Plugin;
export { comfyuiEngine as default };
//# sourceMappingURL=comfyui-engine.d.ts.map
