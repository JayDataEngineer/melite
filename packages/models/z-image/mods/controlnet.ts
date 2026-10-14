// @melite/models-z-image/mods/controlnet.ts — Z-IMAGE'S CONTROLNET
// FLAVOR (the py models/image/z-image/mods/controlnets/mod.yaml,
// 1:1): the seven Fun-Controlnet-Union conditioning types. All
// seven ride the ONE union weight file (the declaration's own
// model field — every row names the same safetensors); the `type`
// selects the conditioning semantic, `preprocessor` records the
// upstream map the type expects (caller-supplied — no preprocessor
// executes in this plane, the lane consumes the map as given).
// FAMILY-OWNED DATA — the rows live with the family (never in the
// pack contract, never in the family DECL); the pack contract
// (engines/comfyui-cordis/src/mods/packs.ts) supplies the inherited
// fields. Registered as an effect on the cards boot's fiber:
// dispose retracts the flavor, the family's surface loses the
// mutation (revertible; the model declares the boarding via
// DECL.mods = ['loras', 'controlnet'], boot-gated ≡ this file's
// families — the paper's satisfaction law).
//
// Every row carries its upstream source_url — no link, no row. The
// union file lands in COMFYUI controlnet/<filename>; the lane's
// ModelPatchLoader reads the model_patches folder, so the endpoint
// maps model_patches → controlnet (comfyui_endpoint.json
// extra_model_folders, the /opt engine's own precedent) — the
// filename stays the controlnet-relative subpath on BOTH sides,
// never re-spelled per side.
//
// THE MODS FATE (2026-10-17, model-families audit fix 7, option b).
// These rows are operator-supplied picker vocabulary.
// They are never auto-provisioned.
// Their source_url is provenance documentation.
// It is not a download declaration.
// The estate never fetches them.
// The ghost wall proves the split.
// No mods source_url appears in provisionsByFamily.
import type { Context } from '@melite/comfyui-card-kit/card-definition'
import { ComfyUIServiceFace } from '@melite/comfyui-card-kit/service-faces'

export const inject = ['comfyui']

const UNION_FILE = 'z-image-fun-union-2.1/Z-Image-Turbo-Fun-Controlnet-Union-2.1-2602-8steps.safetensors'
const UNION_URL = 'https://huggingface.co/alibaba-pai/Z-Image-Turbo-Fun-Controlnet-Union-2.1/resolve/main/Z-Image-Turbo-Fun-Controlnet-Union-2.1-2602-8steps.safetensors'

export const ZIMAGE_CONTROLNET_ROWS = [
  { id: 'depth', filename: UNION_FILE, source_url: UNION_URL, label: 'Depth', category: 'controlnet', default_strength: 1.0, tooltip: 'Body volume + pose lock. The SOMA pipeline auto-injects this for character generation.', preprocessor: 'depth_anything' },
  { id: 'pose', filename: UNION_FILE, source_url: UNION_URL, label: 'Body Pose (OpenPose)', category: 'controlnet', default_strength: 0.8, tooltip: 'Joint sticks — skeleton-driven pose control. Pairs with depth for full pose lock. The pose map is caller-supplied: bring an upstream-rendered pose map.', preprocessor: 'dwpose' },
  { id: 'canny', filename: UNION_FILE, source_url: UNION_URL, label: 'Edges (Canny)', category: 'controlnet', default_strength: 0.7, tooltip: 'Strict edge preservation. Good for outlines / silhouettes.', preprocessor: 'canny' },
  { id: 'mlsd', filename: UNION_FILE, source_url: UNION_URL, label: 'Straight Lines (MLSD)', category: 'controlnet', default_strength: 0.7, tooltip: 'Architectural / hard-surface lines. Good for props and environments.', preprocessor: 'mlsd' },
  { id: 'hed', filename: UNION_FILE, source_url: UNION_URL, label: 'Soft Edges (HED)', category: 'controlnet', default_strength: 0.7, tooltip: 'Sketch-quality soft edges. Good for painterly styles.', preprocessor: 'hed' },
  { id: 'scribble', filename: UNION_FILE, source_url: UNION_URL, label: 'Scribble', category: 'controlnet', default_strength: 0.7, tooltip: 'Rough sketch input — the CN treats any high-contrast marks as structure.', preprocessor: 'pidinet' },
  { id: 'gray', filename: UNION_FILE, source_url: UNION_URL, label: 'Grayscale Reference', category: 'controlnet', default_strength: 0.6, tooltip: 'Tonal reference — lighting and shading guide.', preprocessor: 'none' },
]

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerFlavor({
    pack: 'controlnet',
    families: ['z-image'],
    rows: ZIMAGE_CONTROLNET_ROWS,
  }))
}
