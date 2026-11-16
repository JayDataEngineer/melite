import { defineCardTool } from '@melite/estate-call/cardTool';
import { emitParamsSpec } from '@melite/comfyui-card-kit/params-emit';
import { schema, identity, BOARDED } from "./card.js";
import { boardedModels, primeFamilySeats } from "./family-seats.js";
export const TOOL_NAME = 'music';
/** Async since the L3 cure: the knob derives from the PRESENT
 *  family seats (primeFamilySeats awaits the guarded dynamic
 *  imports; a missing family package costs its own enum row, never
 *  the tool face). The harness seat that builds this tool is
 *  already async (melite-tools' lane seat awaits the builder). */
export const buildMusicTool = async (call) => {
    await primeFamilySeats();
    // The knob: the PRESENT families' ids, falling back to the
    // BOARDED literal when no family package is installed (the enum
    // serves the ids; the run refuses loud at the model seat — the
    // image-gen fallback law).
    const knob = boardedModels().length > 0 ? boardedModels() : [...BOARDED];
    return defineCardTool(call, {
        name: TOOL_NAME,
        flow: 'music',
        label: identity.label,
        description: identity.description,
        // THE MODEL INPUT: the params walk synthesizes the model knob
        // from the boarded list (a CLOSED enum — the wrapper rejects
        // ''/unknown models at the seam); execute resolves the unstated
        // default itself (the DSL plane carries no defaults).
        parameters: emitParamsSpec(schema, knob),
        defaultModel: knob[0],
        previewField: 'prompt',
    });
};
//# sourceMappingURL=tool.js.map
