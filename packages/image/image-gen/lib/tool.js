import { defineCardTool } from '@melite/estate-call/cardTool';
import { emitParamsSpec } from '@melite/comfyui-card-kit/params-emit';
import { schema, identity, BOARDED, SEMANTIC_MODELS } from "./card.js";
import { resolveSemanticModel } from '@melite/comfyui-card-kit/semanticModelKnob';
import { TOOL_NAME } from "./wire.js";
export const buildImageGenTool = (call) => defineCardTool(call, {
    name: TOOL_NAME,
    flow: 'image-gen',
    label: identity.label,
    description: identity.description,
    // THE MODEL INPUT: the params walk synthesizes the model knob
    // from the served style enum (entries derived from the boarded
    // DECLs' variant rows — a CLOSED enum the wrapper rejects
    // ''/unknown values against at the seam); execute resolves the
    // unstated default itself (SEMANTIC_MODELS[0].value — the same
    // spelling the walk's synthesized default rides; one source).
    parameters: emitParamsSpec(schema, BOARDED, SEMANTIC_MODELS),
    // the unstated default is the SAME pick the served enum defaults
    // to — the style value itself, folded to its route by the same
    // resolver sent values ride; the envelope echoes the style.
    defaultModel: SEMANTIC_MODELS[0] === undefined
        ? BOARDED[0]
        : SEMANTIC_MODELS[0].value,
    resolveModel: (v) => resolveSemanticModel(SEMANTIC_MODELS, v)?.route ?? v,
    previewField: 'prompt',
});
//# sourceMappingURL=tool.js.map