export const inject = ['comfyui'];
export const LORA_ROWS = [
    {
        id: 'qwen21_consistency',
        filename: 'qwen-img-edit-21/qwen-image-2.1-consistency.safetensors',
        source_url: 'https://huggingface.co/ausboss/Qwen-Image-2.1-Consistency-LoRA/resolve/main/qwen-image-2.1-consistency.safetensors',
        label: 'Consistency (drift lock)',
        category: 'alignment',
        default_strength: 1,
        tooltip: "Keeps the edit on the original's frame — restyles and recolours stop drifting off the picture. Holds the EXISTING pose: switch it off for movement edits and big removals.",
    },
];
export function apply(ctx) {
    ctx.effect(() => ctx.comfyui.registerFlavor({
        pack: 'loras',
        families: ['qwen-img-edit-21'],
        rows: LORA_ROWS,
    }));
}
//# sourceMappingURL=loras.js.map