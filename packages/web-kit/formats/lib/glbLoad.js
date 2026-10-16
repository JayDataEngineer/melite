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
import * as THREE from '@melite/three-client/client';
import { GLTFLoader } from '@melite/three-client/client';
import { DRACOLoader } from '@melite/three-client/client';
let _draco = null;
let _loader = null;
// import.meta.env is Vite runtime truth; the cast states the read
// locally (a global ImportMeta augmentation collides with the
// vite/client programs some consumers carry — anny's, 2026-09-12).
/* v8 ignore next -- the shipped client bundles never carry BASE_URL
 * (the clientBundle preset defines import.meta.env as {MODE} only),
 * so the fallback IS the production path; under vitest the module
 * env always carries BASE_URL "/", making the right arm unreachable
 * here (modelCatalog.ts precedent, 2026-09-12). */
const base = import.meta.env?.BASE_URL ?? "/";
function dracoLoader() {
    if (!_draco) {
        _draco = new DRACOLoader();
        // LOCAL decoder (offline, deterministic — no CDN, no SPOF). The
        // trailing slash matters: DRACOLoader concatenates filenames onto
        // the path verbatim.
        _draco.setDecoderPath(`${base}draco/gltf/`);
    }
    return _draco;
}
/** A GLTFLoader configured with the estate's shared DRACO decoder —
 *  for parse-based consumers (glbSkin parses pre-fetched bytes). */
export function makeGLTFLoader() {
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader());
    return loader;
}
/** Load a GLB/GLTF from a URL with the estate's shared DRACO-configured
 *  loader. One loader instance + one decoder worker pool for every
 *  consumer (the decoder worker is reused, never respawned per view). */
export function loadGLB(url) {
    if (!_loader)
        _loader = makeGLTFLoader();
    return new Promise((resolve, reject) => {
        _loader.load(url, resolve, undefined, reject);
    });
}
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
export function fitObjectToHeight(root, targetHeight = 1.6) {
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim > 0 ? targetHeight / maxDim : 1;
    root.scale.setScalar(scale);
    root.position.x = -center.x * scale;
    root.position.z = -center.z * scale;
    root.position.y = -box.min.y * scale;
    return box;
}
/** The historical spelling (the card-base glb-stage's name for the
 *  same algorithm). The default is ONE value: the two copies said
 *  1.8 and 1.6, so the same mesh framed in a card stage and framed
 *  in the gallery came out at different heights. 1.6 is the de-facto
 *  law — every explicit call site already passed it. */
export { fitObjectToHeight as autoFitToHeight };
//# sourceMappingURL=glbLoad.js.map
