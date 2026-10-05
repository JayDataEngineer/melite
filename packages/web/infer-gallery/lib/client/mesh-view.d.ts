/**
 * mesh-view — THE 3D VIEWPORT for the media plane (the operator's
 * 2026-09-26 order, paraphrased: 3d output is hooked into the media
 * doors, visually. A `.glb` artifact opens HERE, in the drilldown,
 * orbitable — not as a download link with a sidebar hand-off.
 *
 * WHY IT LIVES IN THE GALLERY (and not as another viewer): a 3D run's
 * artifact is a MEDIA artifact, and the media drilldown is the one face
 * every surface already shares (the gallery tiles AND the cards' stage
 * zoom both route through `MediaDrilldown`). The 3D case was the only
 * kind that did not render — it degraded to a link, so a mesh artifact
 * was reachable but never VIEWABLE in the product.
 *
 * SUBSTRATE LAW (verbatim from card-base/glb-stage.tsx): RAW three.js,
 * an imperative scene in an effect, NO @react-three — r3f's bundled
 * react-reconciler version-skews against the seeded React internals and
 * crashes at boot. And ONE substrate: this mounts the estate's shared
 * stage core (`@melite/card-base/client`, the same module every card
 * viewport mounts) and loads through the estate's ONE GLB parse policy
 * (`@melite/formats/glbLoad` — the single DRACO-configured GLTFLoader
 * and the single autoFit normalization). It is a VIEWER, not a second
 * loader: no GLTFLoader, no DRACOLoader, no autoFit copy here.
 *
 * THE HONEST-FAILURE LAW: a viewer that cannot show the mesh says so
 * in words. WebGL refusal (no context), a decode failure, and an
 * unsupported extension each render their own copy — the artifact stays
 * downloadable either way, because "we could not render it" must never
 * become "we lost it".
 */
import * as React from 'react';
import { artifactNameOf } from './artifact-ops.js';
/** THE ARTIFACT-NAME LAW (the operator's 2026-09-26 report:
 *  "3D view unavailable — \"artifact\" is not a .glb/.gltf artifact" on a
 *  real .glb): the media plane serves an artifact at
 *  `/infer-gallery/artifact?path=<run>/<file>` — the URL's last path
 *  segment is the ROUTE's word, and the artifact's real name lives in
 *  the `?path=` query. Judging the artifact by the URL path therefore
 *  saw "artifact" for EVERY mesh the studio can open, and refused the
 *  whole 3D plane with a name that was never a file. The name comes
 *  from the SAME resolver the rename/delete doors use
 *  (`artifactPathOfUrl`), with the plain URL path as the fallback for
 *  directly-served files. */
export declare const artifactNameFor: typeof artifactNameOf;
/** Extensions the shared loader can parse. `.gltf` is accepted by the
 *  loader but a bare `.gltf` usually references sidecar buffers the
 *  artifact route does not serve next to it — so the copy below names
 *  the case rather than letting the fetch fail as a decode error. */
export declare function unsupportedCopy(url: string): string | null;
export interface MeshViewProps {
    /** The artifact url (same-origin media route). */
    url: string;
    /** Display name — the caption under failures. */
    file: string;
    /** Height of the canvas seat (the lightbox letterboxes the rest);
     *  a CSS length string or a pixel count. */
    height?: number | string;
}
/** The 3D face. Renders a canvas, a loading line, or an honest
 *  failure line — never a blank box. */
export declare function MeshView({ url, file, height }: MeshViewProps): React.JSX.Element;
/** The standard tab hook every tab body receives (local spelling —
 *  the same shape MediaPanel and the cards tab spell). */
interface TabInfo {
    readonly tab: {
        readonly navigation: {
            readonly address: string;
        };
        readonly actions: {
            openResource(address: string): void;
        };
    };
}
/** The estate-artifact tab body: the address IS the data (the b64url
 *  segment decodes to the artifact URL — see artifact-address.ts). A
 *  malformed segment is this package's own bug and voices itself as
 *  the mesh seat's honest-failure copy, never a blank pane. Absent
 *  hook (headless harnesses) renders the same honest refusal. */
export declare function ArtifactTabBody({ useTabInfo }: {
    useTabInfo?: () => TabInfo;
}): React.JSX.Element;
export {};
//# sourceMappingURL=mesh-view.d.ts.map
