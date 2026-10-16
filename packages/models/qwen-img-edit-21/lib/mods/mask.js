export const inject = ['comfyui'];
export function apply(ctx) {
    ctx.effect(() => ctx.comfyui.registerFlavor({
        pack: 'mask',
        families: ['qwen-img-edit-21'],
    }));
}
//# sourceMappingURL=mask.js.map
