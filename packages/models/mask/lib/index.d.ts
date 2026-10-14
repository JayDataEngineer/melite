import type { Plugin } from "@deepseek-ai/cordis";
import type { ModelDecl } from '@melite/comfyui-card-kit/model-contract';
import type { ProvisionRow } from '@melite/comfyui-card-kit/model-contract';
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
/** The detector subset the FAMILY owns for sharing (the class law,
 *  2026-10-12): the image-edit card's crop_stitch arm fetches the
 *  same three Impact detectors — it SERVES this export by identity
 *  (whole array) with `provisionOwner` stamped to the family, so its
 *  rows are the family's rows and the rescue names the family id.
 *  The row objects are the frozen kit constants `PROVISIONS` above
 *  spreads — one truth, two consumers, no card-authored bytes. */
export declare const DETECTOR_PROVISIONS: ProvisionRow[];
export declare const DECL: ModelDecl;
export declare const family: Plugin;
export { select, parseMaskLaneFacts, MASK_WEIGHTS, type MaskLaneFacts, type MaskLaneParams } from "./actions.js";
export { family as default };
//# sourceMappingURL=index.d.ts.map
