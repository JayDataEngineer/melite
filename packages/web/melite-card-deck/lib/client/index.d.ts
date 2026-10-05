/**
 * `@melite-plugin/dsh-card-deck` — browser half.
 *
 * HUNK 4 (2026-09-10, the bench rework): the center-column takeover is
 * DELETED — deck-sidebar-entry, deck-fullbleed, DeckCanvas, embed-bridge
 * and the left-sidebar Cards row (~920 lines of DOM-race glue: the
 * composer-seed column claim, the attribute-scoped bleed, the reload
 * nonce, the theme-copying bridge). Cards live in the native right-
 * sidebar tab (@melite-plugin/dsh-card-view, kind `cards`) opened by
 * resource address — `dsh-resource://cards/bench|run/<id>`; the media
 * planes open it through the standard tab action (bench-load.ts on the
 * media-plugin side). The window seam (__meliteDeckOpenWithDraft) is
 * retired with it: the wand is openResource, one call.
 *
 * What remains here is the ComfyUI Manager tab (assets-tab.tsx) —
 * the native manager over the `manage` Typert remote (Ray Flows
 * retired with the yaml spec library, Ray Media deleted with the
 * media plugin). Migrated 2026-09-10 off
 * the retired dsh-better-sidebar registry onto ui-sidebar-right's
 * two-stage contract (type + keyed body).
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
/** 'slots' (seat declarations) + the native right-sidebar tab registry
 *  (ui-sidebar-right, the web profile's own subsystem) — hosts the
 *  tabs — + the mounted estate remotes: the manage namespace carries
 *  the panel's transport (the loader guarantees it exists when apply
 *  runs; the mounter is @melite-plugin/dsh-card-view's client, which
 *  mounts every estate contribution). */
export declare const inject: string[];
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map
