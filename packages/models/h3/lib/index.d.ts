import type { Plugin } from "@deepseek-ai/cordis";
import type { ModelDecl } from '@melite/comfyui-card-kit/model-contract';
export declare const DECL: ModelDecl;
export declare const family: Plugin;
export { finalizeH3, H3_T4_STRIP } from "./finalize.js";
export { renderH3Swap } from "./swap.js";
export { renderH3Repair } from "./repair.js";
export { renderH3Extend } from "./extend.js";
export { refineArmed, renderH3Refine, REFINE_UPSCALE_MODEL, REFINE_2X_OOM_FRAMES, REFINE_DEFAULT_CLIP_SECONDS } from "./refine.js";
export { upscaleArmed, renderH3ChainUpscale } from "./chainUpscale.js";
export { reshootArmed } from "./reshoot.js";
export { RESOLUTION_SHORT_EDGE, planTierShape, admitCrossRegimeJoin, } from "./chainEdit.js";
export { assertOverlayGated } from "./actions.js";
export { serveWindowSpec, type WindowSpecProjection } from "./windowSpec.js";
export { family as default };
//# sourceMappingURL=index.d.ts.map