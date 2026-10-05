import { defineCardTool } from '@melite/estate-call/cardTool';
import { emitParamsSpec } from '@melite/comfyui-cordis/params-emit';
import { schema, identity, BOARDED } from "./card.js";
import { TOOL_NAME } from "./wire.js";
export const buildImageGenTool = (call) => defineCardTool(call, {
    name: TOOL_NAME,
    flow: 'image-gen',
    label: identity.label,
    description: identity.description,
    // THE MODEL INPUT: the params walk synthesizes the model knob
    // from the boarded array (a CLOSED enum — the wrapper rejects
    // ''/unknown models at the seam); execute resolves the unstated
    // default itself (boarded[0] — the same law the tool row's
    // model field and the walk's synthesized default ride; one
    // spelling).
    parameters: emitParamsSpec(schema, BOARDED),
    defaultModel: BOARDED[0],
    previewField: 'prompt',
});
//# sourceMappingURL=tool.js.map
