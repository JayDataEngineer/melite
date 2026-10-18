import type {} from '@melite/comfyui-card-kit/service-faces'
// families/image/qwen-img-edit-2511/mods/mask.ts — QWEN 2511 EDIT'S MASK BOARDING: the SHARED bare-flavor
// primitive (card-kit bareFlavor) parameterized by pack + family —
// one call of the shared primitive. The pack contract owns the fields (the region vocabulary:
// the square mask input, 1:1 with the other input boxes); the gen
// plane builds no region arm, so auto+mask refuses LOUD at
// admission — the refused-fate honesty, never a silent plain run.
import { bareFlavor } from '@melite/comfyui-card-kit/bare-flavor'

const flavor = bareFlavor('mask', ['qwen-img-edit-2511'])

export const inject = flavor.inject

export const apply = flavor.apply
