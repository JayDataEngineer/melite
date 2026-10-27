export const inject = ['comfyui'];
export const VIGGLE_LORA_ROWS = [
    {
        id: 'viggle_dmd_r64',
        filename: 'h3/viggle_animate_dmd_lora_r64.safetensors',
        source_url: 'https://huggingface.co/drbaph/Viggle-Animate-ComfyUI/resolve/main/loras/viggle_animate_dmd_lora_r64.safetensors',
        label: 'Viggle DMD Accelerator (r64)',
        category: 'distill',
        default_strength: 1,
        steps: 3,
        steps_min: 2,
        steps_max: 4,
    },
    {
        id: 'viggle_char_swap_v15',
        filename: 'h3/h3_character_swap_v1.5.safetensors',
        source_url: 'https://huggingface.co/akatz-ai/MiniMax-H3-Character-Swap-LoRA/resolve/main/h3_character_swap_v1.5.safetensors',
        label: 'Character Swap v1.5 (akatz)',
        category: 'identity',
        default_strength: 1,
    },
];
export function apply(ctx) {
    ctx.effect(() => ctx.comfyui.registerFlavor({
        pack: 'loras',
        families: ['viggle-animate'],
        rows: VIGGLE_LORA_ROWS,
    }));
}
//# sourceMappingURL=loras.js.map
