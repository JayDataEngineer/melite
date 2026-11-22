import type { PromptGraph, StripTable } from "@melite/comfyui-card-kit/graph";
/** H3-only video lanes (2026-09-21, operator order — "there is no
 *  wan-vace, there is only H3 in timeline studio"): the wan-vace
 *  and scail2-animate lanes are gone with their card and families. */
export declare const H3_T4_STRIP: StripTable;
/** The t4-family strip pass (`if not is_t4r`). The i2v dead-branch
 *  node exists ONLY on t4r — the serialized graph's family marker —
 *  so the strip stays stateless per compose. */
export declare function finalizeH3(graph: PromptGraph): PromptGraph;
//# sourceMappingURL=finalize.d.ts.map