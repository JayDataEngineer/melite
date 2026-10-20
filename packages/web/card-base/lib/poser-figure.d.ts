/**
 * poser-figure.tsx — THE NATIVE FIGURE STAGE (stroke 90 + the live
 * follow-up, 2026-09-17: "these knobs do LITERALLY NOTHING — they
 * are supposed to CHANGE THE BODY"). The figure is not a
 * static portrait: it is SHAPED BY THE CARD'S LIVE PARAMS — the 11
 * identity coeffs and the non-zero local_changes ride the SAME
 * shared bind-mesh module the body studios use
 * (@melite/formats/poserSkin — ONE fetch surface, ONE per-signature
 * cache across the estate; the module's own header records the
 * dedup law: "the positional form is how the two pre-dedup copies
 * drifted"). The 2026-09-06 law stands: NEVER the low-poly GLB
 * export, always the /poser shaped bind mesh (18,056 verts, smooth
 * normals).
 *
 * SUBSTRATE LAW (verbatim, glb-stage.tsx): RAW three.js — imperative
 * scene in a useEffect, NO @react-three. three is a pure leaf
 * library; mounts like any imperative canvas lib.
 *
 * DRAG LAW: slider drags emit streams; the fetch debounces 120ms
 * and the module's cache (coeffs rounded 0.1, local changes 0.02)
 * collapses identical shapes. The SCENE mounts once per card; shape
 * commits SWAP THE GEOMETRY in place — no canvas flicker per drag.
 */
import { createElement as h } from 'react';
import * as THREE from '@melite/three-client/client';
import { type FormSpecDoc, type SpecValues } from './spec.ts';
/** The bind-mesh doc the geometry builder reads (SkinMeshData's
 * pinned subset: xyz verts, index-triplet faces). */
export interface PoserMeshDoc {
    vertices: number[][];
    faces: number[][];
}
/** Pure: the resolved params → the identity coeff vector (the
 * identity group's fields, order-sorted, values from the resolved
 * map). null when the spec has no identity group OR any dim is not
 * a finite number — a PARTIAL vector would mis-shape the body
 * (every dim must ride or none do; the neutral GET is the
 * fallback). */
export declare function figureCoeffsOf(spec: FormSpecDoc | null, value: SpecValues): number[] | null;
/** Pure: the resolved params → the local-changes map (the morph
 * group's fields, NON-ZERO finite values only — the sparse law:
 * absent = the engine's own 0). null when empty or no morph group
 * (the caller omits the arm; the fetch rides the neutral GET). */
export declare function figureLocalChangesOf(spec: FormSpecDoc | null, value: SpecValues): Record<string, number> | null;
/** Pure: the door's JSON → a three geometry (unit-testable without
 * WebGL). Float32 positions, uint32 indices, computed smooth
 * normals (the door ships unindexed soup; the weld-free normals are
 * the poser's own smooth-shading intent — the design doc's word). */
export declare function figureGeometry(doc: PoserMeshDoc): THREE.BufferGeometry;
/** The geometry swap's fit step — swap the shape, then anchor the
 * body to the 1.6-height law. PURE (no renderer): the caller hands
 * the mounted mesh; this owns the geometry + transform contract.
 * THE IDENTITY RESET (the extreme-figure cure, operator
 * 2026-11-05: "sometimes when I change a parameter, the figure in
 * the preview becomes extremely large"): fitObjectToHeight
 * measures the WORLD box — a mesh still wearing the previous fit's
 * scale + offsets compounds on every re-fit (a shape stream
 * alternating raw sizes oscillates the scale exponentially: 0.8 →
 * 4 → 0.2 → 16 — an eight-meter figure). Reset to identity, then
 * the one fit lands absolute-correct every swap.
 * @param mesh - the stage's live mesh (its geometry is disposed and replaced).
 * @param doc - the next shape's bind-mesh doc. */
export declare function fitFigureMesh(mesh: THREE.Mesh, doc: PoserMeshDoc): void;
/** The shape signature — identity coeffs + local changes as one
 * stable string (the effect's dep; a new shape re-fetches, an
 * identical one does not). */
export declare function figureShapeSig(identityCoeffs?: number[] | null, localChanges?: Record<string, number> | null): string;
/** Pure: the resolved params → the figure camera arms. The poser's
 * camera verbs are NAME-KEYED ('framing' = distance factor,
 * 'focal_length' = lens mm): a card that declares them drives the
 * figure viewport's camera LIVE (the studio's camera rail); a card
 * that doesn't (or non-finite values) omits both — the stage's own
 * resting camera stands. */
export declare function figureCameraOf(spec: FormSpecDoc | null, value: SpecValues): {
    framing?: number;
    focalLength?: number;
};
/** THE NATIVE FIGURE — the /poser shaped bind mesh on the shared
 * stage core (same light rig + floor grid as the GLB stage, the
 * preview-port interaction law: ONE look across ports). Fetch
 * failures voice themselves in the DOM (the loud-errors law);
 * WebGL absence refuses loud, never a blank silent canvas. */
export declare function PoserFigureStage({ identityModel, identityCoeffs, localChanges, framing, focalLength, label }: {
    /** the identity model the door shapes ('anny') */
    identityModel: string;
    /** the card's LIVE identity dims (the 11 coeffs, label order) */
    identityCoeffs?: number[] | null;
    /** the card's LIVE non-zero morph weights (label → weight) */
    localChanges?: Record<string, number> | null;
    /** the card's LIVE camera distance factor (the turnaround rail) */
    framing?: number | null;
    /** the card's LIVE lens mm (the turnaround rail) */
    focalLength?: number | null;
    label?: string;
}): ReturnType<typeof h>;
//# sourceMappingURL=poser-figure.d.ts.map