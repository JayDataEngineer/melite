import { defineCardTool } from '@melite/estate-call/cardTool';
import { emitParamsSpec } from '@melite/comfyui-card-kit/params-emit';
import { schema, identity, BOARDED } from "./card.js";
import { largeRoute, offeredRoutes, primeFamilySeats } from "./family-seats.js";
export const TOOL_NAME = 'tts';
/** Async since the L3 cure: the knob derives from the PRESENT
 *  family seat (primeFamilySeats awaits the guarded dynamic import;
 *  a missing family package costs its route rows, never the tool
 *  face). The harness seat that builds this tool is already async
 *  (melite-tools' lane seat awaits the builder). */
export const buildTtsTool = async (call) => {
    await primeFamilySeats();
    // THE MODEL INPUT: the atom id plus the LIVE seat's own
    // variant/cell route values (offeredRoutes reads the DECL at
    // serve time — the plugin law's knob derivation); an absent
    // family package contributes no routes and the knob serves the
    // boarded atom alone (a CLOSED enum — the wrapper rejects
    // ''/unknown models at the seam). The unstated default composes
    // the 1.7B CustomVoice — the live large cell's route, falling to
    // the boarded atom id when the seat never filled (never
    // BOARDED[0] itself while the family serves: the head id is the
    // SMALL cell's retained route, and the large-default law says
    // ALWAYS the big model).
    const knob = [...BOARDED, ...offeredRoutes()];
    return defineCardTool(call, {
        name: TOOL_NAME,
        flow: 'tts',
        label: identity.label,
        description: identity.description,
        // Variant routes ride the same enum (agents pick no matrix
        // variant — the Base variant's compose address is how the clone
        // lane is named; the drafts door resolves route mids,
        // krea-2-raw precedent).
        parameters: emitParamsSpec(schema, knob),
        defaultModel: largeRoute() ?? BOARDED[0],
        previewField: 'text',
    });
};
//# sourceMappingURL=tool.js.map
