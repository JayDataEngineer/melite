import { claimGalleryApply, releaseGalleryApply } from "./apply-guard.js";
import { MediaPanel, MediaTabIcon } from "./MediaPanel.js";
import { ArtifactTabBody } from "./mesh-view.js";
import { artifactUrlOfAddress } from "./artifact-address.js";
import { artifactNameOf } from "./artifact-ops.js";
import { setContractToastSink } from '@melite/catalog';
import { useToastStore } from '@melite/card-base/client';
// CONTRACT TOASTS — wire the inlined catalog contract stores to the
// row's toast store (the one host that outlives every reporting
// surface); verdicts surface from the same instance that renders them.
setContractToastSink((type, message, action) => {
    useToastStore.getState().addToast(type, message, action);
});
/** The tab type's identity (the id its body registers under — the
 *  deleted package's contract spelling, restored). */
const MEDIA_TAB_ID = 'infer-media:media';
/** The estate-artifact resource type's identity (its body registers under it). */
const ESTATE_ARTIFACT_TAB_ID = 'infer-media:estate-artifact';
/** Required services (fiber inject waiting — the tab registry must be
 *  up first). */
export const inject = ['slots', 'sidebarRightTabs'];
/**
 * Client apply: claims the single application slot, then registers
 * the Media tab (type + body) exactly as the deleted client and the
 * shipped tabs do.
 * @param ctx - client root context.
 */
export function apply(ctx) {
    // A duplicated client injection (factory executed twice per page
    // lifetime) would register a second entry. First application wins.
    if (!claimGalleryApply())
        return;
    ctx.effect(() => releaseGalleryApply, 'melite-gallery: apply claim');
    const tab = ctx;
    // Stage one — the tab type (page kind: no patterns, opened by kind
    // from the guide row). Logged, never thrown (shell law).
    try {
        tab.effect(() => tab.sidebarRightTabs.register({
            id: MEDIA_TAB_ID,
            kind: 'media',
            title: () => 'Media',
            guide: [{
                    id: 'media-tab-guide',
                    order: 51,
                    title: () => 'Media',
                    description: () => 'Every run\'s artifacts — the archive, with the lightbox, chips, search and the cards wand.',
                    icon: MediaTabIcon,
                }],
        }), 'melite-gallery: media tab type');
    }
    catch (error) {
        console.error('[melite-gallery] media tab type registration failed:', error);
    }
    // Stage two — the body, dispatched under the type's id.
    try {
        tab.slots.inject('sidebar.right.pane.tab', () => tab.slots.register({ name: 'sidebar.right.pane.tab', key: MEDIA_TAB_ID }, MediaPanel));
    }
    catch (error) {
        console.error('[melite-gallery] media tab body registration failed:', error);
    }
    // The estate-artifact tab (2026-09-10's cross-plugin contract, in-tree
    // since the external glb viewer left the profile): a RESOURCE type
    // claiming `dsh-resource://estate-artifact/**` — the address's b64url
    // segment decodes to the artifact URL, and THIS package's mesh seat
    // renders it. The media panel's model tiles open it through the
    // standard openResource hook; without this claim that open throws
    // (an address nothing claims is a refusal, not a no-op).
    try {
        tab.effect(() => tab.sidebarRightTabs.register({
            id: ESTATE_ARTIFACT_TAB_ID,
            kind: 'estate-artifact',
            patterns: ['dsh-resource://estate-artifact/**'],
            priority: 'builtin',
            title: (address) => {
                const url = artifactUrlOfAddress(address);
                return url !== null ? artifactNameOf(url) : 'artifact';
            },
        }), 'melite-gallery: estate-artifact tab type');
    }
    catch (error) {
        console.error('[melite-gallery] estate-artifact tab type registration failed:', error);
    }
    try {
        tab.slots.inject('sidebar.right.pane.tab', () => tab.slots.register({ name: 'sidebar.right.pane.tab', key: ESTATE_ARTIFACT_TAB_ID }, ArtifactTabBody));
    }
    catch (error) {
        console.error('[melite-gallery] estate-artifact tab body registration failed:', error);
    }
}
// Re-exported for headless harnesses; the loader consumes only name/inject/apply.
export { MediaPanel, MediaTabIcon, kindOf, callsTextOf, flatten } from "./MediaPanel.js";
export { artifactPathOfUrl, deleteArtifact, renameArtifact } from "./artifact-ops.js";
export { loadDraftOntoBench, loadRunOntoBench, cardsBenchAddress, cardsRunAddress } from "./bench-load.js";
export { useFeed } from "./useFeed.js";
export { decodeRuns, decodeDrafts } from "./decode.js";
export { MEDIA_KINDS } from "./media-kinds.js";
//# sourceMappingURL=index.js.map
