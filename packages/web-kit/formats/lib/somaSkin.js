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
import { parseNpz } from "./npz.js";
import { apiFetch } from "@melite/catalog";
// The skin is a DECLARED provision on the kimodo family (models/
// motion/kimodo/model.py _SOMA_SKIN) — the provision door streams it
// from the weights mount and ACQUIRES it on demand (fetched direct
// from the DECL's pinned distribution, DECL-sha-gated before it
// lands) when missing. NEVER a vite-public
// blob: the old /editor/soma-skin-standard.npz path 404'd whenever
// the committed asset drifted from the declared one (2026-09-06).
// Exported: the editor test wall pins the door shape.
export const SKIN_URL = "/v1/models/kimodo/provisions/skin_standard.npz";
const J = 77; // SOMA-77 joints
const W = 8; // max influencing joints per vertex in skin_standard.npz
let _skinPromise = null;
/** Invert a 4×4 matrix (column-major-agnostic: stored row-major as 16 floats). */
export function invert4(m) {
    // Gauss-Jordan with partial pivoting. m is row-major (J*16 + col).
    const a = Array.from(m);
    const inv = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    for (let col = 0; col < 4; col++) {
        // pivot
        let piv = col, max = Math.abs(a[col * 4 + col]);
        for (let r = col + 1; r < 4; r++) {
            const v = Math.abs(a[r * 4 + col]);
            if (v > max) {
                max = v;
                piv = r;
            }
        }
        if (max < 1e-12)
            continue; // singular column — leave as-is
        if (piv !== col) {
            for (let c = 0; c < 4; c++) {
                ;
                [a[col * 4 + c], a[piv * 4 + c]] = [a[piv * 4 + c], a[col * 4 + c]];
                [inv[col * 4 + c], inv[piv * 4 + c]] = [inv[piv * 4 + c], inv[col * 4 + c]];
            }
        }
        const diag = a[col * 4 + col];
        for (let c = 0; c < 4; c++) {
            a[col * 4 + c] /= diag;
            inv[col * 4 + c] /= diag;
        }
        for (let r = 0; r < 4; r++) {
            if (r === col)
                continue;
            const factor = a[r * 4 + col];
            if (factor === 0)
                continue;
            for (let c = 0; c < 4; c++) {
                a[r * 4 + c] -= factor * a[col * 4 + c];
                inv[r * 4 + c] -= factor * inv[col * 4 + c];
            }
        }
    }
    return Float32Array.from(inv);
}
function asFloat32(arr) {
    return arr instanceof Float32Array ? arr : new Float32Array(arr);
}
/** Extract the rest pose from row-major FORWARD bind transforms (J×16):
 * translation column (tx, ty, tz) = indices 3, 7, 11 of each 4×4, and the
 * 3×3 rotation block = 0,1,2 / 4,5,6 / 8,9,10. This is the TS equivalent
 * of Kimodo's neutral_joints — the motion card's pre-inference pose (see
 * SomaSkin.restJoints doc). Shared by both loaders: the npz carries the
 * forward binds directly; the GLB adapter inverts glTF boneInverses into
 * the same row-major forward shape first. */
export function restPoseFromBind(bindRig, jointCount) {
    const restJoints = new Float32Array(jointCount * 3);
    const restRots = new Float32Array(jointCount * 9);
    for (let j = 0; j < jointCount; j++) {
        const b = j * 16;
        restJoints[j * 3] = bindRig[b + 3];
        restJoints[j * 3 + 1] = bindRig[b + 7];
        restJoints[j * 3 + 2] = bindRig[b + 11];
        restRots[j * 9] = bindRig[b + 0];
        restRots[j * 9 + 1] = bindRig[b + 1];
        restRots[j * 9 + 2] = bindRig[b + 2];
        restRots[j * 9 + 3] = bindRig[b + 4];
        restRots[j * 9 + 4] = bindRig[b + 5];
        restRots[j * 9 + 5] = bindRig[b + 6];
        restRots[j * 9 + 6] = bindRig[b + 8];
        restRots[j * 9 + 7] = bindRig[b + 9];
        restRots[j * 9 + 8] = bindRig[b + 10];
    }
    return { restJoints, restRots };
}
/** Load + cache the neutral SOMA skin (one fetch per session). */
export async function loadSomaSkin() {
    if (_skinPromise)
        return _skinPromise;
    _skinPromise = (async () => {
        const res = await apiFetch(SKIN_URL);
        if (!res.ok)
            throw new Error(`Failed to fetch SOMA skin: ${res.status}`);
        const bytes = new Uint8Array(await res.arrayBuffer());
        const arrays = await parseNpz(bytes);
        const bv = arrays.get("bind_vertices");
        const fc = arrays.get("faces");
        const brt = arrays.get("bind_rig_transform");
        const li = arrays.get("lbs_indices");
        const lw = arrays.get("lbs_weights");
        if (!bv || !fc || !brt || !li || !lw) {
            throw new Error(`SOMA skin missing keys (have: ${[...arrays.keys()].join(",")})`);
        }
        const bindVertices = asFloat32(bv.data);
        const bindRig = asFloat32(brt.data); // (77, 4, 4) row-major
        // Precompute per-joint inverse bind transforms.
        const bindRigInv = new Float32Array(J * 16);
        for (let j = 0; j < J; j++) {
            const m = bindRig.subarray(j * 16, j * 16 + 16);
            bindRigInv.set(invert4(m), j * 16);
        }
        // Neutral / rest pose — extracted from the row-major forward binds
        // (shared helper; see restPoseFromBind).
        const { restJoints, restRots } = restPoseFromBind(bindRig, J);
        // faces (int64) and lbs_indices (int32) arrive as BigInt64Array / Uint32Array
        const faceSrc = fc.data instanceof BigInt64Array
            ? Array.from(fc.data, (x) => Number(x))
            : Array.from(fc.data);
        const faces = Uint32Array.from(faceSrc);
        const lbsIndices = li.data instanceof Uint32Array
            ? li.data
            : li.data instanceof BigInt64Array
                ? Uint32Array.from(li.data, (x) => Number(x))
                : Uint32Array.from(li.data);
        const lbsWeights = asFloat32(lw.data);
        return {
            bindVertices,
            faces,
            lbsIndices,
            lbsWeights,
            bindRigInv,
            restJoints,
            restRots,
            vertexCount: bindVertices.length / 3,
            faceCount: faces.length / 3,
            jointCount: J,
            influences: W,
        };
    })();
    try {
        return await _skinPromise;
    }
    catch (e) {
        // A failed load must not poison the session cache: the next call
        // re-fetches (a transient gateway blip during the first preview must
        // not brick every later motion preview). Successes stay cached.
        _skinPromise = null;
        throw e;
    }
}
/**
 * Build per-joint (3,4) affine matrices for one frame:
 *   affine[j] = (fk[j] · bindRigInv[j])[:3, :]
 * fk[j] is the global posed transform (global_rot → rotation, global_pos →
 * translation). Output is `affines` length J*12 (row-major 3×4 per joint).
 */
function buildAffines(globalRot, // (J, 9) row-major 3×3 per joint
globalPos, // (J, 3)
bindRigInv, // (J, 16)
out, // (J, 12)
jointCount) {
    for (let j = 0; j < jointCount; j++) {
        const r = j * 9;
        const p = j * 3;
        const bi = j * 16;
        // fk[j] row-major 4×4 (rotation block + translation; last row 0,0,0,1)
        // fk @ bindRigInv: compute the 3×4 top rows only (we discard row 3).
        const a0 = bindRigInv[bi + 0], a1 = bindRigInv[bi + 1], a2 = bindRigInv[bi + 2], a3 = bindRigInv[bi + 3];
        const a4 = bindRigInv[bi + 4], a5 = bindRigInv[bi + 5], a6 = bindRigInv[bi + 6], a7 = bindRigInv[bi + 7];
        const a8 = bindRigInv[bi + 8], a9 = bindRigInv[bi + 9], a10 = bindRigInv[bi + 10], a11 = bindRigInv[bi + 11];
        // (Not needed for top 3 rows:) a12,a13,a14,a15 — last row of inv, multiplied
        // by fk's last row [0,0,0,1], contributes fk doesn't add from row 4.
        // fk rotation block:
        const fr0 = globalRot[r], fr1 = globalRot[r + 1], fr2 = globalRot[r + 2];
        const fr3 = globalRot[r + 3], fr4 = globalRot[r + 4], fr5 = globalRot[r + 5];
        const fr6 = globalRot[r + 6], fr7 = globalRot[r + 7], fr8 = globalRot[r + 8];
        // fk @ inv : out_row_i = fk_row_i · inv_col
        // Row 0 of result (3 cols × 4):
        const o0 = fr0 * a0 + fr1 * a4 + fr2 * a8;
        const o1 = fr0 * a1 + fr1 * a5 + fr2 * a9;
        const o2 = fr0 * a2 + fr1 * a6 + fr2 * a10;
        const o3 = fr0 * a3 + fr1 * a7 + fr2 * a11 + globalPos[p];
        const o4 = fr3 * a0 + fr4 * a4 + fr5 * a8;
        const o5 = fr3 * a1 + fr4 * a5 + fr5 * a9;
        const o6 = fr3 * a2 + fr4 * a6 + fr5 * a10;
        const o7 = fr3 * a3 + fr4 * a7 + fr5 * a11 + globalPos[p + 1];
        const o8 = fr6 * a0 + fr7 * a4 + fr8 * a8;
        const o9 = fr6 * a1 + fr7 * a5 + fr8 * a9;
        const o10 = fr6 * a2 + fr7 * a6 + fr8 * a10;
        const o11 = fr6 * a3 + fr7 * a7 + fr8 * a11 + globalPos[p + 2];
        const o = j * 12;
        out[o] = o0;
        out[o + 1] = o1;
        out[o + 2] = o2;
        out[o + 3] = o3;
        out[o + 4] = o4;
        out[o + 5] = o5;
        out[o + 6] = o6;
        out[o + 7] = o7;
        out[o + 8] = o8;
        out[o + 9] = o9;
        out[o + 10] = o10;
        out[o + 11] = o11;
    }
}
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
export function deformFrame(globalRot, globalPos, skin, out) {
    const J_ = skin.jointCount;
    const W_ = skin.influences;
    const affines = new Float32Array(J_ * 12);
    buildAffines(globalRot, globalPos, skin.bindRigInv, affines, J_);
    const { bindVertices, lbsIndices, lbsWeights } = skin;
    const V = skin.vertexCount;
    for (let v = 0; v < V; v++) {
        const vi = v * 3;
        const bx = bindVertices[vi], by = bindVertices[vi + 1], bz = bindVertices[vi + 2];
        let ox = 0, oy = 0, oz = 0;
        const wi = v * W_;
        for (let widx = 0; widx < W_; widx++) {
            const weight = lbsWeights[wi + widx];
            if (weight === 0)
                continue;
            const ai = lbsIndices[wi + widx] * 12;
            ox += weight * (affines[ai] * bx + affines[ai + 1] * by + affines[ai + 2] * bz + affines[ai + 3]);
            oy += weight * (affines[ai + 4] * bx + affines[ai + 5] * by + affines[ai + 6] * bz + affines[ai + 7]);
            oz += weight * (affines[ai + 8] * bx + affines[ai + 9] * by + affines[ai + 10] * bz + affines[ai + 11]);
        }
        out[vi] = ox;
        out[vi + 1] = oy;
        out[vi + 2] = oz;
    }
}
//# sourceMappingURL=somaSkin.js.map
