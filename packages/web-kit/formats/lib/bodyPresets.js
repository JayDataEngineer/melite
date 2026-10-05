// Anny's 11 phenotype dims in order:
//   [gender, age, muscle, weight, height, proportions, cupsize, firmness,
//    african, asian, caucasian]
// gender: 0.0 = masculine, 1.0 = feminine (verified against the live mesh:
// gender=0 widens jaw and shoulders; gender=1 narrows them and widens hips).
// age/muscle/weight: 0.5 = average adult. height/proportions: 0.5 = standard.
// race dims are left at neutral 0.5 so race-specific features stay default.
const NEUTRAL_RACE = [0.5, 0.5, 0.5]; // african, asian, caucasian
/**
 * Neutral - reset to the Anny default with no stylization.
 *
 * Provides a quick "back to neutral" affordance in the preset bar without
 * the user having to hit the Reset button. Coeffs all 0.5 = Anny's neutral
 * adult, no local changes, no custom target blends.
 */
const NEUTRAL = {
    id: "neutral",
    name: "Neutral",
    description: "Default Anny - no stylization, no morphs",
    identityModel: "anny",
    coeffs: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, ...NEUTRAL_RACE],
    localChanges: null,
    customTargets: null,
};
/**
 * Male - basic masculine baseline with no stylization.
 *
 * Gender 0.0 (fully masculine → wider jaw, broader shoulders, narrower
 * hips). Age/muscle/weight tuned to a healthy adult male build. No
 * local_changes — this is a clean starting point the user can sculpt
 * further. Height slightly above average.
 */
const MALE = {
    id: "male",
    name: "Male",
    description: "Basic masculine baseline - no stylization",
    identityModel: "anny",
    coeffs: [0.0, 0.45, 0.55, 0.50, 0.55, 0.50, 0.40, 0.55, ...NEUTRAL_RACE],
    //          gen  age   mus   wt    ht    prop  cup  firm
    localChanges: null,
    customTargets: null,
};
/**
 * Female - basic feminine baseline with no stylization.
 *
 * Gender 1.0 (fully feminine → narrower jaw, defined waist, wider hips).
 * Age/muscle/weight tuned to a healthy adult female build. No
 * local_changes — clean starting point for further sculpting.
 */
const FEMALE = {
    id: "female",
    name: "Female",
    description: "Basic feminine baseline - no stylization",
    identityModel: "anny",
    coeffs: [1.0, 0.40, 0.35, 0.38, 0.52, 0.52, 0.45, 0.55, ...NEUTRAL_RACE],
    //          gen  age   mus   wt    ht    prop  cup  firm
    localChanges: null,
    customTargets: null,
};
export const BODY_PRESETS = [
    NEUTRAL, MALE, FEMALE,
];
/**
 * Find a preset by id (returns undefined if not found).
 *
 * Used by tests and any future "load preset by URL hash" affordances.
 */
export function getPresetById(id) {
    return BODY_PRESETS.find((p) => p.id === id);
}
/**
 * Default preset (the one applied to the very first Body Studio mount).
 * Returns null so we DON'T clobber the user's saved edits on subsequent
 * loads - the default is the un-morphed Anny.
 */
export const DEFAULT_PRESET_ID = null;
//# sourceMappingURL=bodyPresets.js.map
