import type { ToolDefinition } from '@deepseek-ai/dsh-tools';
import type { EstateCall } from '@melite/estate-call';
/** Async since the L3 cure: the knob derives from the PRESENT
 *  family seats (primeFamilySeats awaits the guarded dynamic
 *  imports; a missing family package costs its own entries, never
 *  the tool face). The harness seat that builds this tool is
 *  already async (melite-tools index.ts's lane seat). */
export declare const buildImageGenTool: (call: EstateCall) => Promise<ToolDefinition>;
//# sourceMappingURL=tool.d.ts.map
