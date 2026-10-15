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
 *  source; kind-filtered). */
export async function fetchMediaLibrary(kind, signal) {
    const v = await unwrapRemote(estateRemote().media.list(kind, signal), 'media/list');
    return Array.isArray(v.items) ? v.items.filter((it) => typeof it?.url === 'string' && typeof it?.name === 'string') : [];
}
//# sourceMappingURL=media-library.js.map