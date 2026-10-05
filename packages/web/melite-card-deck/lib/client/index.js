import { claimDeckApply, releaseDeckApply } from "./apply-guard.js";
import { registerAssetsTab, seatManageNamespace } from "./assets-tab.js";
/** 'slots' (seat declarations) + the native right-sidebar tab registry
 *  (ui-sidebar-right, the web profile's own subsystem) — hosts the
 *  tabs — + the mounted estate remotes: the manage namespace carries
 *  the panel's transport (the loader guarantees it exists when apply
 *  runs; the mounter is @melite-plugin/dsh-card-view's client, which
 *  mounts every estate contribution). */
export const inject = ['slots', 'sidebarRightTabs', 'remote', 'remote.manage'];
export function apply(ctx) {
    if (!claimDeckApply())
        return;
    ctx.effect(() => releaseDeckApply, 'melite-card-deck: apply claim');
    // The manage lane (typed by the declaration merge above; structural
    // seat — the panel bundle carries no transport of its own).
    seatManageNamespace(ctx.remote.manage);
    // The native tab (comfy management — NOT cards). Logged, never
    // thrown (shell law).
    try {
        registerAssetsTab(ctx);
    }
    catch (error) {
        console.error('[melite-card-deck] assets tab registration failed:', error);
    }
}
//# sourceMappingURL=index.js.map
