/**
 * glbLoad — THE shared GLB loading kernel (2026-09-05 dedup order).
 *
 * One DRACO-configured GLTFLoader for the whole estate. Before this,
 * three independent copies of the same loader + shared-decoder dance
 * lived in the 3d plugin's viewers (Stage, AnimatedGLBViewer,
 * MeshPoster) — and glbSkin parsed with NO decoder at all (a
 * DRACO-compressed character GLB failed there while the same file
 * loaded fine one dialog over). The user's audit order was explicit:
 * the three 3d cards "should all render the same, and share most
 * render code."
 *
 * THE DECODER SHIPS LOCAL: the gstatic CDN path every copy hardcoded
 * (1.5.7) was both a hardcode and an offline SPOF. The decoder files
 * from three's own package (the exact pairing three@0.184 was tested
 * with) are copied into the editor's public tree
 * (public/draco/gltf/) and resolved through the vite BASE_URL —
 * correct in dev, in the built dist, and in the DSH embed that
 * serves dist under the same base. No network dependency.
 *
 * Consumers:
 *   • @melite-plugin/3d viewers (Stage, AnimatedGLBViewer, MeshPoster)
 *   • glbSkin (this package — character GLB → SomaSkin substrate)
 *   • anything else that needs the estate's ONE GLB parse policy
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
/** A GLTFLoader configured with the estate's shared DRACO decoder —
 *  for parse-based consumers (glbSkin parses pre-fetched bytes). */
export declare function makeGLTFLoader(): GLTFLoader;
/** Load a GLB/GLTF from a URL with the estate's shared DRACO-configured
 *  loader. One loader instance + one decoder worker pool for every
 *  consumer (the decoder worker is reused, never respawned per view). */
export declare function loadGLB(url: string): Promise<GLTF>;
/**
 * Normalize a loaded scene to a known viewing size: center X/Z, scale
 * the largest dimension to `targetHeight`, feet on y=0. Mutates the
 * root IN PLACE (scale + position) and returns the computed box.
 *
 * The shared normalization every viewer applies — TRELLIS props,
 * SOMAX/Anny characters, and composite uploads arrive at wildly
 * different scales (cm, m, 100× unit boxes); this is the one place
 * that reconciles them, so the poster tile, the dialog viewer, and
 * the stage floor all frame the mesh identically.
 */
export declare function fitObjectToHeight(root: THREE.Object3D, targetHeight?: number): THREE.Box3;
/** The historical spelling (the card-base glb-stage's name for the
 *  same algorithm). The default is ONE value: the two copies said
 *  1.8 and 1.6, so the same mesh framed in a card stage and framed
 *  in the gallery came out at different heights. 1.6 is the de-facto
 *  law — every explicit call site already passed it. */
export { fitObjectToHeight as autoFitToHeight };
//# sourceMappingURL=glbLoad.d.ts.map
