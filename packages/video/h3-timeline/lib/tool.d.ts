import type { ToolDefinition } from '@deepseek-ai/dsh-tools';
import type { EstateCall } from '@melite/estate-call';
export declare const TOOL_NAME = "h3_timeline";
/** Build the h3_timeline agent tool over an estate call: the card
 *  carrier's declared params plus this plane's calls/audio_clips JSON
 *  nodes, wrapped by the shared card-tool builder (the drafts door,
 *  the {model:} lift, and the presentation projections it owns).
 * @param call the estate call seat the tool's doors ride
 * @returns the tool definition a tools service registers */
export declare const buildH3TimelineTool: (call: EstateCall) => ToolDefinition;
//# sourceMappingURL=tool.d.ts.map