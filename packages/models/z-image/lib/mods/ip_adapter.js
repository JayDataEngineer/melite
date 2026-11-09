export const inject = ['comfyui'];
// The retired declaration's model names — SD1.5-era files, kept as
// catalog notes only (the row's historical filename; NOT on disk,
// NOT fetchable through this estate, NOT executable on S3-DiT).
export const ZIMAGE_IPADAPTER_ROWS = [
    { id: 'style', filename: 'ip-adapter-light_v11.safetensors', label: 'Style', category: 'reference', default_weight: 1.0, tooltip: 'Encoder-only LIGHT preset — transfers look/feel.' },
    { id: 'composition', filename: 'ip-adapter-plus_sd15.safetensors', label: 'Composition', category: 'reference', default_weight: 1.0, tooltip: 'COMPOSITION preset — borrows layout/structure.' },
    { id: 'face', filename: 'ip-adapter-faceid-plusv2_sd15.safetensors', label: 'Face', category: 'reference', default_weight: 0.85, tooltip: 'FACEID preset — identity lock.' },
    { id: 'generic', filename: 'ip-adapter_sd15.safetensors', label: 'Generic', category: 'reference', default_weight: 1.0, tooltip: 'STANDARD preset — unspecified projection.' },
];
export function apply(ctx) {
    ctx.effect(() => ctx.comfyui.registerFlavor({
        pack: 'ip_adapter',
        families: ['z-image'],
        rows: ZIMAGE_IPADAPTER_ROWS,
    }));
}
//# sourceMappingURL=ip_adapter.js.map