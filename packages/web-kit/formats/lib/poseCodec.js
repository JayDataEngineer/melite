/** poseCodec — the PURE codec half of the old lib/text-to-pose:
 * byte/b64 codecs + the SOMA-77 bone topology. Fetch-free by law —
 * the fetch-based off-main-thread decode stays app-side (lib/text-to-pose.ts). */
/** Canonical SOMA-77 mesh vertex count.
 *
 *  The LBS skinning weights are keyed to this exact vertex topology, so every
 *  shaped mesh — anny, mhr, soma, custom GLB — must have exactly this many
 *  vertices. The backend echoes the actual count via PoseMotion.vertex_count;
 *  this constant is the fallback for old responses that don't include it and
 *  the source of truth for UI prompts (CustomMeshLoader, etc.).
 */
export const SOMA_VERTEX_COUNT = 18056;
// Generated from SOMASkeleton77.bone_order_names_with_parents
// (vendor/kimodo/kimodo/skeleton/definitions.py). 77 joints → 76 bones.
// Joint order: Hips(0) Spine1(1) Spine2(2) Chest(3) Neck1(4) Neck2(5) Head(6)
//   HeadEnd(7) Jaw(8) LeftEye(9) RightEye(10) LeftShoulder(11) LeftArm(12)
//   LeftForeArm(13) LeftHand(14) [LeftHand fingers 15..38]
//   RightShoulder(39) RightArm(40) RightForeArm(41) RightHand(42)
//   [RightHand fingers 43..66] LeftLeg(67) LeftShin(68) LeftFoot(69)
//   LeftToeBase(70) LeftToeEnd(71) RightLeg(72) RightShin(73) RightFoot(74)
//   RightToeBase(75) RightToeEnd(76).
export const SOMA77_BONE_CONNECTIONS = [
    // Spine + head
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6],
    [6, 7], [6, 8], [6, 9], [6, 10],
    // Left shoulder + arm + thumb chain
    [3, 11], [11, 12], [12, 13], [13, 14],
    [14, 15], [15, 16], [16, 17], [17, 18],
    // Left index / middle / ring / pinky
    [14, 19], [19, 20], [20, 21], [21, 22], [22, 23],
    [14, 24], [24, 25], [25, 26], [26, 27], [27, 28],
    [14, 29], [29, 30], [30, 31], [31, 32], [32, 33],
    [14, 34], [34, 35], [35, 36], [36, 37], [37, 38],
    // Right shoulder + arm + thumb chain
    [3, 39], [39, 40], [40, 41], [41, 42],
    [42, 43], [43, 44], [44, 45], [45, 46],
    // Right index / middle / ring / pinky
    [42, 47], [47, 48], [48, 49], [49, 50], [50, 51],
    [42, 52], [52, 53], [53, 54], [54, 55], [55, 56],
    [42, 57], [57, 58], [58, 59], [59, 60], [60, 61],
    [42, 62], [62, 63], [63, 64], [64, 65], [65, 66],
    // Left leg + foot + toes
    [0, 67], [67, 68], [68, 69], [69, 70], [70, 71],
    // Right leg + foot + toes
    [0, 72], [72, 73], [73, 74], [74, 75], [75, 76],
];
// ── Base64 encode (32KB chunks — engine stack-arg limits) ────────────────
/** Encode a Uint8Array to a base64 string.
 *
 *  Processes the input in 32KB chunks because String.fromCharCode.apply has
 *  a ~65K argument limit on some engines (the historical V8 stack-arg limit).
 *  Uses Array.from() rather than the brittle `as unknown as number[]` cast. */
export function encodeBufferToB64(bytes) {
    let bin = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
        bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, Math.min(i + CHUNK, bytes.length))));
    }
    return btoa(bin);
}
//# sourceMappingURL=poseCodec.js.map