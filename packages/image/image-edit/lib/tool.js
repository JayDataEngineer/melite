import { defineCardTool } from '@melite/estate-call/cardTool';
import { emitParamsSpec } from '@melite/comfyui-cordis/params-emit';
import { schema, identity, BOARDED } from "./card.js";
export const TOOL_NAME = 'image_edit';
export const buildImageEditTool = (call) => defineCardTool(call, {
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
//# sourceMappingURL=tool.js.map
