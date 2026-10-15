import "@melite/comfyui-card-kit";
import { PromptGraph, StripTable } from "@melite/comfyui-card-kit/graph";
import { Plugin } from "@deepseek-ai/cordis";
import { ModelDecl } from "@melite/comfyui-card-kit/model-contract";
//#region src/finalize.d.ts
/** H3-only video lanes (2026-09-21, operator order — "there is no
 *  wan-vace, there is only H3 in timeline studio"): the wan-vace
 *  and scail2-animate lanes are gone with their card and families. */
declare const H3_T4_STRIP: StripTable;
/** The t4-family strip pass (`if not is_t4r`). The i2v dead-branch
 *  node exists ONLY on t4r — the serialized graph's family marker —
 *  so the strip stays stateless per compose. */
declare function finalizeH3(graph: PromptGraph): PromptGraph;
//#endregion
//#region src/actions.d.ts
/** The overlay re-check the film loop voices per stanza (the same
 *  carrier the card's compose gate walks — ONE schema, imported).
 *  Exported so the card's single-call lift judges through the same
 *  re-check (the h3-b duplicate is gone: one owner). */
declare const assertOverlayGated: (doc: Record<string, unknown>, where: string) => void;
//#endregion
//#region src/index.d.ts
declare const DECL: ModelDecl;
declare const family: Plugin;
//#endregion
export { DECL, H3_T4_STRIP, assertOverlayGated, family as default, family, finalizeH3 };