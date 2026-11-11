import type {} from '@melite/comfyui-card-kit/service-faces'
// families/image/h3-image-edit/mods/mask.ts — H3-IMAGE-EDIT'S MASK BOARDING: the
// SHARED bare-flavor primitive (card-kit bareFlavor) parameterized by
// pack + family — the edit lanes board the region contract beside the
// img-gen families (qwen-img-edit-21 / fibo2-edit precedent). The
// pack contract owns the fields (the region vocabulary); the edit
// action serves the crop_stitch tail through its own bag merge, so
// the mod and the arm branch on one vocabulary.
import { bareFlavor } from '@melite/comfyui-card-kit/bare-flavor'

const flavor = bareFlavor('mask', ['h3-image-edit'])

export const inject = flavor.inject

export const apply = flavor.apply
