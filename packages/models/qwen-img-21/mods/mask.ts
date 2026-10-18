import type {} from '@melite/comfyui-card-kit/service-faces'
// families/image/qwen-img-21/mods/mask.ts — QWEN 2.1 T2I'S MASK BOARDING: the SHARED bare-flavor
// primitive (card-kit bareFlavor) parameterized by pack + family —
// the first cure (MASK-C, 2026-09-22): now one call of the
// shared primitive. The pack contract owns the fields (the region vocabulary:
// the square mask input, 1:1 with the other input boxes); the gen
// plane builds no region arm, so auto+mask refuses LOUD at
// admission — the refused-fate honesty, never a silent plain run.
import { bareFlavor } from '@melite/comfyui-card-kit/bare-flavor'

const flavor = bareFlavor('mask', ['qwen-img-21'])

export const inject = flavor.inject

export const apply = flavor.apply
