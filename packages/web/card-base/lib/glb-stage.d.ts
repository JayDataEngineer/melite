import { createElement as h } from 'react';
import * as THREE from '@melite/three-client/client';
import { type FormSpecDoc, type SpecValues } from './spec.js';
/** One stage asset — the old Stage contract's live subset (the four
 *  fields consumers set: id/url/name + the placement override; the
 *  drop-raycast position stays caller-computed). */
export declare function meshAssetUrl(value: string): string;
/** Pure: the served schema's MESH-KIND fields × the resolved values
 *  → attached stage assets (the (j) law's derivation, mirroring
 *  compose: a non-empty mesh input renders as-is, the run composes
 *  it). Whitespace IS emptiness (anny's own compose law — whitespace
 *  bakes parametric, so the preview must too); a value already
 *  riding a URL passes VERBATIM through meshAssetUrl (a picked stage
 *  output). null when no mesh field holds a value (the parametric
 *  figure / empty hint keeps the seat). Declaration order (the
 *  envelope walk's own). */
export declare function attachedMeshOf(spec: FormSpecDoc | null, value: SpecValues): Array<{
    id: string;
    url: string;
    name: string;
}> | null;
/** Pure: the served schema's IMAGE-KIND fields × the resolved values
 *  → the (l) law's pre-run photo face (mirroring compose's ONE
 *  stated precedence — image > glb > parametric: a stated photo is
 *  the estimate the run will bake, so it IS the pre-run face). The
 *  FIRST non-empty image field wins (compose reads one person
 *  reference — person_index 0; a second photo field would be a
 *  different card's own law to state). Whitespace IS emptiness (the
 *  same compose law as attachedMeshOf — the fall returns to the
 *  mesh/figure arms). null when no image field holds a value. */
export declare function attachedImageOf(spec: FormSpecDoc | null, value: SpecValues): {
    id: string;
    url: string;
} | null;
export interface StageAsset {
    /** unique id (caller-supplied — run id + artifact name is fine) */
    id: string;
    /** the GLB url */
    url: string;
    /** display name (chips / selection list) */
    name?: string;
    /** the comparison seat's label (N named slots: source/result,
     *  body/garment, donor/target…). Omit for an unlabeled seat. */
    slot?: string;
    /** world position override; omit for the row layout */
    position?: readonly [number, number, number];
    /** rotation (Euler, radians) */
    rotation?: readonly [number, number, number];
    /** uniform scale multiplier */
    scale?: number;
}
/** Normalize a loaded scene to a known viewing size — the fit law:
 *  center X/Z, scale the largest dimension to targetHeight, feet on
 *  y=0, mutating the root in place. The ALGORITHM lives in
 *  @melite/formats (fitObjectToHeight); this adapts the return shape
 *  its callers read. Meshes arrive at wildly different scales, and
 *  the one rule is that every viewport frames them identically. */
export declare function autoFitToHeight(root: THREE.Object3D, targetHeight?: number): {
    box: THREE.Box3;
    height: number;
};
/** THE STAGE'S LAYER MODEL (primitive ②, first slice 2026-09-21,
 *  skeleton second, weights fourth): shaded vs wireframe + the
 *  skeleton and weights overlays. CALLER state — studios persist
 *  layer choices exactly like selection: `layers` reads, `onLayers`
 *  writes. Omit both for the plain shaded stage (no chips, no new
 *  chrome); omit only `onLayers` for a read-only layer (no write
 *  channel, no chips). Shaded/Wireframe are the surface MODE;
 *  skeleton and weights are OVERLAYS (they compose with either and
 *  with each other). `weights` is OPTIONAL: absent = off, and a
 *  stage that seats no weights lane (motion's pose stage) never
 *  votes it — the base's other stages always vote it explicitly. */
export interface StageLayers {
    wireframe: boolean;
    skeleton: boolean;
    weights?: boolean;
}
/** Flip the wireframe flag on every wireframe-capable material under
 *  the root (mesh materials; points/lines have no such flag and are
 *  left alone). Idempotent — loads mint fresh materials, so no
 *  original-flag bookkeeping is owed. */
export declare function applyWireframe(root: THREE.Object3D, on: boolean): void;
/** A bone-visualization overlay for one loaded group — null when
 *  the group carries no bones (unrigged meshes seat no overlay, the
 *  honest absence). The caller adds the helper to the scene and owns
 *  its visibility + disposal. */
export declare function skeletonHelperFor(group: THREE.Group): THREE.SkeletonHelper | null;
/** THE TURNTABLE SPEED (radians/sec) — one revolution every ~12.5s,
 *  the gentle review idle; fast enough to read as motion in a
 *  glance, slow enough to inspect. */
export declare const TURNTABLE_SPEED = 0.5;
/** One turntable frame: rotate every group about its OWN Y axis
 *  (each spins in place — the row layout's positions stand). Pure —
 *  the stage's tick seam calls it with the rAF delta; a 0 delta is
 *  a no-op. Declared per-asset rotation rides along (the spin adds
 *  to the current angle, never resets it). */
export declare function turntableTick(groups: readonly THREE.Object3D[], delta: number): void;
/** ── THE WEIGHTS HEAT OVERLAY (primitive ②, fourth slice) ───────────
 *
 * Per-vertex skin-weight heat: a skinned mesh's dominant-bone weight
 * (the max of its skinWeight components, ∈ [0.25,1] under 4
 * influences) paints a blue→red ramp through vertex colors. Unskinned
 * meshes are untouched (no skinWeight attribute — no lane, no paint).
 * OFF restores each geometry's ORIGINAL color attribute (cached the
 * first time we touch it — absent means we delete ours) and the
 * material's vertexColors flag. Idempotent both ways. */
/** The heat ramp — 5 stops (blue→cyan→green→yellow→red), t clamped.
 *  Pure: the same ramp every stage paints, the wall pins the stops. */
export declare function heatColor(t: number): [number, number, number];
export declare function applyWeightsHeat(root: THREE.Object3D, on: boolean): void;
/** ── NAMED MESH SLOTS (primitive ②, third slice) ────────────────────
 * A comparison seat: assets may declare a SLOT (`slot: 'source'` /
 * `'result'`, body/garment, donor/target, LOD names) — the stage
 * paints the slot's label above the asset (a billboard sprite, the
 * stage3d makeLabelSprite). Unslotted assets seat unlabeled, as
 * ever. Pure derivation, mount-side paint (the WebGL-exempt arm). */
export declare function slotLabelOf(asset: StageAsset): string | null;
/** THE MESH STAGE PREVIEW — the multi-asset GLB viewport (assets in a
 *  row, click to select, per-asset load failures reported upward).
 *  No assets → the honest empty state; the canvas mounts when the
 *  first asset lands. */
export declare function GlbStagePreview({ assets, selectedId, onSelect, onAssetError, emptyHint, label, layers, onLayers, turntable }: {
    assets: readonly StageAsset[];
    /** selection is CALLER state (studios persist selections) */
    selectedId?: string | null;
    onSelect?: (id: string | null) => void;
    /** per-asset load failure (the loud-errors law: the message rides
     *  the caller's DOM, never a red wireframe box; null = settled OK
     *  and any prior error for it clears). STABLE per asset id. */
    onAssetError?: (id: string, message: string | null) => void;
    /** the empty state's line (default: the run hint) */
    emptyHint?: string;
    label?: string;
    /** the layer model (primitive ②): reads the caller's layer state;
     *  the wireframe flag applies to every loaded asset. Omit for
     *  plain shaded (the default face). */
    layers?: StageLayers;
    /** the layer write channel: when provided with assets, the
     *  Shaded/Wireframe chips render and vote here. Omit for no
     *  layer chrome (read-only or plain). */
    onLayers?: (layers: StageLayers) => void;
    /** THE TURNTABLE (primitive ②, third slice): true spins every
     *  loaded asset about its own Y axis on the stage's tick seam
     *  (the review idle). The flag rides a ref — flipping it NEVER
     *  remounts the scene (same law as the layer flags). */
    turntable?: boolean;
}): ReturnType<typeof h>;
//# sourceMappingURL=glb-stage.d.ts.map