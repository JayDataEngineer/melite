/**
 * media-library.ts — the runs-tree library over the mounted media
 * namespace (stroke 81b: moved beside the bind it rides).
 *
 * The picker's injected source (SquareWire.loadMedia): kind-filtered
 * media/list rows, shaped to {url, name}. Every surface — the bench
 * drill, the mod leaf, the studio SourceRows — injects THIS function
 * (or a test fake); the base form carries no transport of its own.
 */
import { estateRemote, unwrapRemote } from "./estate-remote.js";
/** media/list — the runs-tree library (the picker's injected
 *  source; kind-filtered). The mounted media namespace must serve
 *  `list` — a namespace object without the method is a wiring fault
 *  (the 2026-11-01 operator burn: a stale bind surfaced the raw
 *  `estateRemote(...).media.list is not a function` as picker copy),
 *  so the guard refuses in the door's own voice, never a programmer
 *  TypeError, and the bind seam's live re-pull has already had its
 *  chance to heal a stale generation before this read. */
export async function fetchMediaLibrary(kind, signal) {
    const media = estateRemote().media;
    if (typeof media.list !== 'function') {
        throw new Error('the mounted media namespace does not serve media/list — the estate media contribution is not mounted (reload the page to re-mount the bundles)');
    }
    const v = await unwrapRemote(media.list(kind, signal), 'media/list');
    return Array.isArray(v.items) ? v.items.filter((it) => typeof it?.url === 'string' && typeof it?.name === 'string') : [];
}
//# sourceMappingURL=media-library.js.map