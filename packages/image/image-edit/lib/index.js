import Schema from '@deepseek-ai/schemastery';
import { registerCard } from "./card.js";
import { buildImageEditTool } from "./tool.js";
export const name = '@melite/image/image-edit';
export const inject = [];
export const Config = Schema.object({
    call: Schema.any(),
});
export function apply(ctx, config) {
    const comfy = ctx.get('comfyui');
    if (comfy !== undefined)
        registerCard(ctx, comfy);
    const tools = ctx.get('tools');
    if (tools !== undefined) {
        // BARE registration, the tool-bash shape: the entry owns the
        // register call; tool.ts exports the definition builder. The
        // service attaches its own disposer (tutorial ch.2).
        tools.register(buildImageEditTool(config.call));
    }
}
//# sourceMappingURL=index.js.map
