/**
 * three-client entry — the ONE graph row for 3D (the ONE-ROW LAW
 * extended to three, roadmap "multiple three.js copies", lane wire
 * probe 2026-10-13). Every 3D-touching client bundle REQUIRES this
 * row through `dsh.client.external` (the loader's module table);
 * nothing may inline a second compiled copy of three — the page
 * warned `THREE.WARNING: Multiple instances of Three.js being
 * imported` while it did.
 *
 * THE ROW IDENTITY (the dual-face law, card-base's precedent): the
 * composition declares this package as a cordis plugin row
 * (cordis.patch.yml), and the shell registers every boot row on
 * both planes — `loader.import` → `registry.plugin`, which refuses
 * a namespace without `apply`. So this face carries the same
 * marker the host face carries at `exports['.']` (src/host.ts):
 * name, inject, apply.
 *
 * THE ADDON SURFACE: the estate's six addon imports are
 * re-exported here so their INTERNAL `three` imports resolve to
 * this bundle's single inlined instance (the loader cannot share
 * a module a consumer inlines beside the row). A new addon need
 * joins this list, never a consumer's `three/addons/...` import.
 */
export const name = '@melite/three-client';
export const inject = [];
/** No client-side effects: the row exists for the browser graph
 * (the loader hands a ctx; the marker takes it, card-base's
 * shape). */
export function apply(_ctx) { }
export * from 'three';
export { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
export { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
export { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
export { OrbitControls } from 'three/addons/controls/OrbitControls.js';
export { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
export { TransformControls } from 'three/addons/controls/TransformControls.js';
//# sourceMappingURL=index.js.map
