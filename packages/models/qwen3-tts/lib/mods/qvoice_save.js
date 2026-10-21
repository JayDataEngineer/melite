export const inject = ['comfyui'];
export function apply(ctx) {
    ctx.effect(() => ctx.comfyui.registerFlavor({
        pack: 'qvoice_save',
        families: ['qwen3-tts'],
    }));
}
//# sourceMappingURL=qvoice_save.js.map
