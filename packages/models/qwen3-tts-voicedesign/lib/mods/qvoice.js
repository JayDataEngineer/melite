export const inject = ['comfyui'];
export function apply(ctx) {
    ctx.effect(() => ctx.comfyui.registerFlavor({
        pack: 'qvoice',
        families: ['qwen3-tts-voicedesign'],
    }));
}
//# sourceMappingURL=qvoice.js.map
