export const inject = ['comfyui'];
export function apply(ctx) {
    ctx.effect(() => ctx.comfyui.registerFlavor({
        pack: 'lanpaint',
        families: ['qwen-img-edit-2511'],
    }));
}
//# sourceMappingURL=lanpaint.js.map
