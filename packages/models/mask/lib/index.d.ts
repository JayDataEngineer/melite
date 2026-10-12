import type { Plugin } from "@deepseek-ai/cordis";
import type { ModelDecl } from "@melite/comfyui-cordis/model-contract";
import type { ProvisionRow } from "@melite/comfyui-cordis/model-contract";
/** THE FAMILY OWNS THE DOWNLOADS (operator order, 2026-10-12:
 * "THEY ARE MODELS — THEY SHOULD DOWNLOAD LIKE ALL OTHER MODELS"):
 * the six weights this family's lanes load are FAMILY provisions —
 * fetched through the ONE download door by the family id
 * (provision_model model=mask-select), hashed and size-pinned like
 * every other family's weights. The card SERVES these rows to its
 * arm-weight gate (it never authors its own — image/mask's
 * card.spec pins the identity); hashes minted by direct download
 * (the supply-chain law: a declared hash is a VERIFIED hash). */
export declare const PROVISIONS: ProvisionRow[];
export declare const DECL: ModelDecl;
export declare const family: Plugin;
export { select, parseMaskLaneFacts, MASK_WEIGHTS, type MaskLaneFacts, type MaskLaneParams } from "./actions.js";
//# sourceMappingURL=index.d.ts.map
