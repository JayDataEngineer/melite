export const inject = ['comfyui'];
export const QWEN_EDIT_ROWS = [
    // lightx2v's 4-step distill — the family's speed adapter (their
    // model card pairs it with cfg 1 at 4 steps; bf16 file)
    { id: 'qwen_edit_lightning_4step', filename: 'qwen/Qwen-Image-Edit-2511-Lightning-4steps-V1.0-bf16.safetensors', source_url: 'https://huggingface.co/lightx2v/Qwen-Image-Edit-2511-Lightning/resolve/main/Qwen-Image-Edit-2511-Lightning-4steps-V1.0-bf16.safetensors', label: 'Lightning 4-Step', category: 'distill', default_strength: 1, steps: 4 },
    // fal's camera-control adapter — 96 positions around the subject;
    // their card recommends strength 0.8–1.0 with the <sks> trigger
    // vocabulary ("<sks> front view eye-level shot close-up", …)
    { id: 'qwen_edit_multiple_angles', filename: 'qwen/qwen-image-edit-2511-multiple-angles-lora.safetensors', source_url: 'https://huggingface.co/fal/Qwen-Image-Edit-2511-Multiple-Angles-LoRA/resolve/main/qwen-image-edit-2511-multiple-angles-lora.safetensors', label: 'Multiple Angles', category: 'control', default_strength: 0.8, tooltip: 'camera control — prompt with the <sks> position vocabulary (front/back/quarter view × eye/low/high angle × shot size)' },
    // MCNL multi-concept (a re-upload of the aiunivers original) —
    // the only upstream that serves this exact file
    { id: 'qwen_edit_plus_mcnsfw', filename: 'qwen/qwen-image-edit-plus-nsfw-lora.safetensors', source_url: 'https://huggingface.co/ScottzillaSystems/qwen-image-edit-plus-nsfw-lora/resolve/main/qwen-image-edit-plus-nsfw-lora.safetensors', label: 'MCNL Multi-Concept', category: 'nsfw', default_strength: 0.8 },
];
export function apply(ctx) {
    ctx.effect(() => ctx.comfyui.registerFlavor({
        pack: 'loras',
        families: ['qwen-img-edit-2511'],
        rows: QWEN_EDIT_ROWS,
    }));
}
//# sourceMappingURL=loras.js.map