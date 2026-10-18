export const inject = ['comfyui'];
export function apply(ctx) {
    ctx.effect(() => ctx.comfyui.registerFlavor({
        pack: 'loras',
        families: ['qwen-img-edit-21'],
        rows: [],
    }));
}
//# sourceMappingURL=loras.js.map