/**
 * somaSkin — neutral SOMA-77 mesh skinning, a direct port of the kimodo demo's
 * vendor/kimodo/kimodo/viz/soma_skin.py SOMASkin.skin()+lbs().
 *
 * The demo (and only the demo) renders Kimodo motions on a NEUTRAL body via
 * LBS weights stored in skin_standard.npz (bind_vertices + faces +
 * bind_rig_transform + lbs_indices + lbs_weights). That is the "base SOMAX
 * mesh" that actually deforms — distinct from the poser backend's `soma`
 * engine (a static mesh with no LBS weights) and from `anny`/`mhr` (parametric
 * bodies with their own proportions). This module reproduces the demo's math
 * client-side so the asset preview shows a Kimodo motion on the same neutral
 * mesh the demo uses, with no parametric body shape imposed.
 *
 * Flow per frame:
 *   fk[j]      = [[global_rot[j], global_pos[j]], [0,0,0,1]]   (4×4, per joint)
 *   affine[j]  = (fk[j] · inv(bind_rig[j]))[:3, :]             (3×4, per joint)
 *   v'         = Σ_w lbs_weights[v,w] · (affine[lbs_indices[v,w]] · [bind_v, 1])
 *
 * Units: meters throughout (Kimodo's native unit). No cm↔m conversion — that
 * was a poser-route artifact that doesn't apply here.
 */
export declare const SKIN_URL = "/v1/models/kimodo/provisions/skin_standard.npz";
export interface SomaSkin {
    bindVertices: Float32Array;
    faces: Uint32Array;
    lbsIndices: Uint32Array;
    lbsWeights: Float32Array;
    bindRigInv: Float32Array;
    /** (J, 3) METERS — the neutral / rest-pose joint positions, the TS
     *  equivalent of upstream Kimodo's `skeleton.neutral_joints`
     *  (vendor/kimodo/.../skeleton/base.py:72). Extracted from the
     *  translation column of each joint's forward bind transform so the
     *  motion card can render + pose + export BEFORE any GPU inference
     *  matching the Kimodo demo (app.py:460 "initialize to character
     *  default (rest) pose"). Without this the card treated the rest pose
     *  as "nothing" and gated every feature on a generated motion NPZ. */
    restJoints: Float32Array;
    /** (J, 9) row-major — the neutral / rest-pose joint global rotations
     *  (3×3 block of each forward bind transform). Pairs with restJoints to
     *  form a 1-frame "rest motion" that deformFrame / patchFrame consume
     *  unchanged, so refine + export + repose all work on the rest pose. */
    restRots: Float32Array;
    vertexCount: number;
    faceCount: number;
    /** J — joints in the rig. Always 77 for SOMAX skins (the SOMA-77
     *  contract both loaders enforce); carried per-skin so deformFrame is
     *  skin-driven, not module-const (2026-08-15 GLB character skins). */
    jointCount: number;
    /** W — LBS influences per vertex (npz skin_standard: 8; glTF skins: 4).
     *  deformFrame loops skin.influences — a GLB character skin works with
     *  the SAME deform code (2026-08-15). */
    influences: number;
}
/** Invert a 4×4 matrix (column-major-agnostic: stored row-major as 16 floats). */
export declare function invert4(m: Float32Array): Float32Array;
/** Extract the rest pose from row-major FORWARD bind transforms (J×16):
 * translation column (tx, ty, tz) = indices 3, 7, 11 of each 4×4, and the
 * 3×3 rotation block = 0,1,2 / 4,5,6 / 8,9,10. This is the TS equivalent
 * of Kimodo's neutral_joints — the motion card's pre-inference pose (see
 * SomaSkin.restJoints doc). Shared by both loaders: the npz carries the
 * forward binds directly; the GLB adapter inverts glTF boneInverses into
 * the same row-major forward shape first. */
export declare function restPoseFromBind(bindRig: Float32Array, jointCount: number): {
    restJoints: Float32Array;
    restRots: Float32Array;
};
/** Load + cache the neutral SOMA skin (one fetch per session). */
export declare function loadSomaSkin(): Promise<SomaSkin>;
/**
 * Skinning: compute deformed vertex positions for one frame.
 *   out (V, 3) = Σ_w lbsWeights[v,w] · (affines[lbsIndices[v,w]] · [bindV, 1])
 *
 * Mirrors soma_skin.py lbs() exactly. `out` is Float32Array length V*3.
 *
 * SKIN-DRIVEN DIMENSIONS (2026-08-15): the joint count and the per-vertex
 * influence count come from the SKIN (jointCount / influences), not module
 * constants — the neutral npz skin is J=77/W=8, a glTF character skin is
 * J=77/W=4 (glTF skins are VEC4). Same LBS math, both substrates; see
 * lib/glbSkin.ts.
 */
export declare function deformFrame(globalRot: Float32Array, globalPos: Float32Array, skin: SomaSkin, out: Float32Array): void;
//# sourceMappingURL=somaSkin.d.ts.map
