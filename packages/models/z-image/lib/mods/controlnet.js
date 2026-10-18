export const inject = ['comfyui'];
const UNION_FILE = 'z-image-fun-union-2.1/Z-Image-Turbo-Fun-Controlnet-Union-2.1-2602-8steps.safetensors';
const UNION_URL = 'https://huggingface.co/alibaba-pai/Z-Image-Turbo-Fun-Controlnet-Union-2.1/resolve/main/Z-Image-Turbo-Fun-Controlnet-Union-2.1-2602-8steps.safetensors';
export const ZIMAGE_CONTROLNET_ROWS = [
    { id: 'depth', filename: UNION_FILE, source_url: UNION_URL, label: 'Depth', category: 'controlnet', default_strength: 1.0, tooltip: 'Body volume + pose lock. The SOMA pipeline auto-injects this for character generation.', preprocessor: 'depth_anything' },
    { id: 'pose', filename: UNION_FILE, source_url: UNION_URL, label: 'Body Pose (OpenPose)', category: 'controlnet', default_strength: 0.8, tooltip: 'Joint sticks — skeleton-driven pose control. Pairs with depth for full pose lock. The pose map is caller-supplied: bring an upstream-rendered pose map.', preprocessor: 'dwpose' },
    { id: 'canny', filename: UNION_FILE, source_url: UNION_URL, label: 'Edges (Canny)', category: 'controlnet', default_strength: 0.7, tooltip: 'Strict edge preservation. Good for outlines / silhouettes.', preprocessor: 'canny' },
    { id: 'mlsd', filename: UNION_FILE, source_url: UNION_URL, label: 'Straight Lines (MLSD)', category: 'controlnet', default_strength: 0.7, tooltip: 'Architectural / hard-surface lines. Good for props and environments.', preprocessor: 'mlsd' },
    { id: 'hed', filename: UNION_FILE, source_url: UNION_URL, label: 'Soft Edges (HED)', category: 'controlnet', default_strength: 0.7, tooltip: 'Sketch-quality soft edges. Good for painterly styles.', preprocessor: 'hed' },
    { id: 'scribble', filename: UNION_FILE, source_url: UNION_URL, label: 'Scribble', category: 'controlnet', default_strength: 0.7, tooltip: 'Rough sketch input — the CN treats any high-contrast marks as structure.', preprocessor: 'pidinet' },
    { id: 'gray', filename: UNION_FILE, source_url: UNION_URL, label: 'Grayscale Reference', category: 'controlnet', default_strength: 0.6, tooltip: 'Tonal reference — lighting and shading guide.', preprocessor: 'none' },
];
export function apply(ctx) {
    ctx.effect(() => ctx.comfyui.registerFlavor({
        pack: 'controlnet',
        families: ['z-image'],
        rows: ZIMAGE_CONTROLNET_ROWS,
    }));
}
//# sourceMappingURL=controlnet.js.map