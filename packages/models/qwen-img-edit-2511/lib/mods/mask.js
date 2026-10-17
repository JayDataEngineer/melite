export const inject = ['comfyui'];
export function apply(ctx) {
    ctx.effect(() => ctx.comfyui.registerFlavor({
        pack: 'mask',
        families: ['qwen-img-edit-2511'],
    }));
}
//# sourceMappingURL=mask.js.map
