import { type SomaSkin } from "./somaSkin.js";
export declare class NotSomaxGlbError extends Error {
    constructor(reason: string);
}
/**
 * Load a SOMAX-rigged character GLB as a SomaSkin.
 *
 * @param url a data: URL (studio upload) or a same-origin asset URL
 *            (/editor/assets/... — asset tray or a wired upstream card).
 * @throws NotSomaxGlbError when the GLB has no 77-joint skinned mesh.
 * @throws Error on fetch/parse failures.
 */
export declare function loadGlbSkin(url: string): Promise<SomaSkin>;
//# sourceMappingURL=glbSkin.d.ts.map