import type { Plugin } from "@deepseek-ai/cordis";
import type { ModelDecl } from '@melite/comfyui-card-kit/model-contract';
export declare const DECL: ModelDecl;
export declare const family: Plugin;
export { compose, parseMusicFacts, type MusicFacts, type MusicParams } from "./actions.js";
export { MUSIC3_DISTILLED_STEPS, MUSIC3_FULL_STEPS, assertMusic3StepsInTier, music3StepTier, music3StepsEnvelope, type Music3StepTier, type Music3TierSteps, } from "./tier.js";
export { TILED_DURATION_CEIL_S, TILED_VRAM_FLOOR_GB, deriveDecodeTier, type DecodeTier } from "./decode.js";
export { family as default };
//# sourceMappingURL=index.d.ts.map
