export const inject = ['comfyui'];
export function apply(ctx) {
    ctx.effect(() => ctx.comfyui.registerFlavor({
        pack: 'loras',
        families: ['anima'],
        rows: [],
    }));
}
//# sourceMappingURL=loras.js.map
