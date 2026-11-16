import { defineCardTool } from '@melite/estate-call/cardTool';
import { emitParamsSpec } from '@melite/comfyui-card-kit/params-emit';
import { schema, identity, BOARDED } from "./card.js";
import { primeFamilySeats, semanticModels } from "./family-seats.js";
import { resolveSemanticModel } from '@melite/comfyui-card-kit/semanticModelKnob';
import { TOOL_NAME } from "./wire.js";
/** Async since the L3 cure: the knob derives from the PRESENT
 *  family seats (primeFamilySeats awaits the guarded dynamic
 *  imports; a missing family package costs its own entries, never
 *  the tool face). The harness seat that builds this tool is
 *  already async (melite-tools index.ts's lane seat). */
export const buildImageGenTool = async (call) => {
    await primeFamilySeats();
    const models = semanticModels();
    return defineCardTool(call, {
        name: TOOL_NAME,
        flow: 'image-gen',
        label: identity.label,
        description: identity.description,
        // THE MODEL INPUT: the params walk synthesizes the model knob
        // from the served style enum (entries derived from the PRESENT
        // families' variant rows — a CLOSED enum the wrapper rejects
        // ''/unknown values against at the seam); execute resolves the
        // unstated default itself (models[0].value — the same
        // spelling the walk's synthesized default rides; one source).
        parameters: emitParamsSpec(schema, BOARDED, models),
        // the unstated default is the SAME pick the served enum defaults
        // to — the style value itself, folded to its route by the same
        // resolver sent values ride; the envelope echoes the style. An
        // estate with NO family package installed falls to BOARDED[0]
        // (the knob serves the id; the run refuses at the model seat).
        defaultModel: models[0] === undefined
            ? BOARDED[0]
            : models[0].value,
        resolveModel: (v) => resolveSemanticModel([...models], v)?.route ?? v,
        previewField: 'prompt',
    });
};
//# sourceMappingURL=tool.js.map
