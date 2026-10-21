// families/image/fibo2-edit/mods/mask.ts — FIBO 2.0 EDIT'S MASK
// BOARDING: the SHARED bare-flavor primitive (card-kit bareFlavor)
// parameterized by pack + family — the operator order 2026-11-07:
// the MASK mod serves on EVERY img-gen model. The pack contract owns
// the fields (the region vocabulary: the square mask input, 1:1 with
// the other input boxes); this lane builds the crop_stitch detailer
// arm (mask → MaskToSEGS → DetailerForEach over the encoder
// conditioning), so auto+mask refuses LOUD at admission — the
// refused-fate honesty, never a silent plain run.
import { bareFlavor } from '@melite/comfyui-card-kit/bare-flavor';
const flavor = bareFlavor('mask', ['fibo2-edit']);
export const inject = flavor.inject;
export const apply = flavor.apply;
//# sourceMappingURL=mask.js.map
