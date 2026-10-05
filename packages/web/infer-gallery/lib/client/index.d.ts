/**
 * `@melite-plugin/dsh-gallery` — browser half.
 *
 * THE FULL PORT (2026-09-11, operator order: the media sidebar lost
 * its features to the migrations — "there isn't even a modal anymore").
 * The deleted @infer-media/dsh-media package's feature set returns onto
 * the gallery's package + routes: the registration follows the deleted
 * client and the shipped tabs (dsh-card-view's cards tab,
 * dsh-card-deck's comfy-manager) — the `ui-sidebar-right` tab registry
 * carries the type + guide row, the `sidebar.right.pane.tab` slot
 * carries the body.
 *
 * SINGLE-TAB SHAPE (operator order, later the same day — the
 * standalone Flows tab read as a second sidebar entry beside Media):
 * ONE tab only — Media (kind 'media', guide order 51). The composed
 * action cards (drafts) live exclusively behind the Media panel's
 * segmented Flows/Artifacts toggle (the flows face over
 * /infer-gallery/drafts, click loads onto the bench and opens the
 * cards tab). The deleted package's second registration
 * (infer-media:flows, kind 'flows', order 52) is deliberately NOT
 * restored; its component file died with it — no unregistered dead
 * tab code ships.
 *
 * The body is self-driving (useFeed → the gallery's own host routes —
 * no transport threading, the panel carries its own fetch caller).
 *
 * The seat spellings below are the LOCAL TabCtx pattern (same as
 * dsh-card-deck's assets-tab — a local structural interface, like
 * dsh-task-board's local 'web-ui.plugin.item' spelling) so this
 * package registers without the sibling UI packages' type graphs.
 *
 * This entry is deliberately JSX-free (the shared preset only
 * discovers src/client/index.ts); the glyph lives in MediaPanel.tsx.
 *
 * The store + view exports below remain for headless harnesses.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
/** Required services (fiber inject waiting — the tab registry must be
 *  up first). */
export declare const inject: string[];
/**
 * Client apply: claims the single application slot, then registers
 * the Media tab (type + body) exactly as the deleted client and the
 * shipped tabs do.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
export { MediaPanel, MediaTabIcon, kindOf, callsTextOf, flatten } from './MediaPanel.js';
export { artifactPathOfUrl, deleteArtifact, renameArtifact } from './artifact-ops.js';
export { loadDraftOntoBench, loadRunOntoBench, cardsBenchAddress, cardsRunAddress } from './bench-load.js';
export { useFeed } from './useFeed.js';
export { decodeRuns, decodeDrafts } from './decode.js';
export type { RunRow, RunArtifact, DraftRow } from './decode.js';
export { MEDIA_KINDS } from './media-kinds.js';
//# sourceMappingURL=index.d.ts.map
