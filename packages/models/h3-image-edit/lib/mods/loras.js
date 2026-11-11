export const inject = ['comfyui'];
export function apply(ctx) {
    ctx.effect(() => ctx.comfyui.registerFlavor({
        pack: 'loras',
        families: ['h3-image-edit'],
        rows: [],
    }));
}
//# sourceMappingURL=loras.js.map
