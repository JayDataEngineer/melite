import { defineCardTool } from '@melite/estate-call/cardTool';
import { emitParamsSpec } from '@melite/comfyui-card-kit/params-emit';
import { schema, identity, BOARDED } from "./card.js";
import { primeFamilySeats } from "./family-seats.js";
export const TOOL_NAME = 'image_edit';
/** The builder awaits the family-seat prime (the plugin law's tool
 *  face — the L3 cure, 2026-11-16): the model knob's closed enum
 *  rides BOARDED (the literal), but the compose door behind the
 *  execute hop reads the seats — an absent family package costs its
 *  own seat and refuses loud at the door, never here. Async is the
 *  executor battery's accepted makeTool shape (the harness awaits
 *  it). */
export const buildImageEditTool = async (call) => {
    await primeFamilySeats();
    return defineCardTool(call, {
        name: TOOL_NAME,
        flow: 'image-edit',
        label: identity.label,
        description: identity.description,
        // THE MODEL INPUT: the params walk synthesizes the model knob
        // from the boarded array (a CLOSED enum — the wrapper rejects
        // ''/unknown models at the seam); execute resolves the unstated
        // default itself (the DSL plane carries no defaults).
        parameters: emitParamsSpec(schema, BOARDED),
        defaultModel: BOARDED[0],
        previewField: 'prompt',
    });
};
//# sourceMappingURL=tool.js.map
