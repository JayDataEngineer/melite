import { defineCardTool } from '@melite/estate-call/cardTool';
import { emitParamsSpec } from '@melite/comfyui-cordis/params-emit';
import { schema, identity, BOARDED, VARIANT_ADDRESSES } from "./card.js";
export const TOOL_NAME = 'tts';
export const buildTtsTool = (call) => defineCardTool(call, {
    name: TOOL_NAME,
    flow: 'tts',
    label: identity.label,
    description: identity.description,
    // THE MODEL INPUT: the params walk synthesizes the model knob
    // from the boarded array (a CLOSED enum — the wrapper rejects
    // ''/unknown models at the seam); execute resolves the unstated
    // default itself (the DSL plane carries no defaults). Variant
    // routes ride the same enum (agents pick no matrix variant —
    // the Base variant's compose address is how the clone lane is
    // named; the drafts door resolves route mids, krea-2-raw
    // precedent).
    parameters: emitParamsSpec(schema, [...BOARDED, ...VARIANT_ADDRESSES]),
    defaultModel: BOARDED[0],
    previewField: 'text',
});
//# sourceMappingURL=tool.js.map
