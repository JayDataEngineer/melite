export const inject = ['comfyui'];
export function apply(ctx) {
    ctx.effect(() => ctx.comfyui.registerFlavor({
        pack: 'loras',
        families: ['fibo2-edit'],
        rows: [],
    }));
}
//# sourceMappingURL=loras.js.map
