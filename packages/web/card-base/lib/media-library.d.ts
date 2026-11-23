/** media/list — the runs-tree library (the picker's injected
 *  source; kind-filtered). The mounted media namespace must serve
 *  `list` — a namespace object without the method is a wiring fault
 *  (the 2026-11-01 operator burn: a stale bind surfaced the raw
 *  `estateRemote(...).media.list is not a function` as picker copy),
 *  so the guard refuses in the door's own voice, never a programmer
 *  TypeError, and the bind seam's live re-pull has already had its
 *  chance to heal a stale generation before this read. */
export declare function fetchMediaLibrary(kind: string, signal?: AbortSignal): Promise<Array<{
    url: string;
    name: string;
}>>;
//# sourceMappingURL=media-library.d.ts.map