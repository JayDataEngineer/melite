import Schema from '@deepseek-ai/schemastery';
import { registerCard } from "./card.js";
export const name = '@melite/image-gen';
export const inject = [];
export const Config = Schema.object({
    call: Schema.any(),
});
export function apply(ctx, config) {
    void config;
    const comfy = ctx.get('comfyui');
    if (comfy !== undefined)
        registerCard(ctx, comfy);
}
//# sourceMappingURL=index.js.map
