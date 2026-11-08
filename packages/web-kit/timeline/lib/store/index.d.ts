/**
 * melite-timeline ui/store — the STORYBOARD DOCUMENT (a tenant library,
 * §16 E-TENANTS). Public surface: "@melite-plugin/timeline/ui/store".
 *
 * The NLE document state (segments, variants, audio cues/tracks,
 * playback, in/out points, chapters) + the segment params clipboard.
 * Moved VERBATIM from @melite/viewers (core) 2026-08-21: the timeline is a
 * SHARED domain element (motion card + video card), so its state is
 * plugin-owned — core surfaces consume it through THIS import, never
 * through a core package.
 *
 * SELF-HYDRATION: importing this library boots the IndexedDB → memory
 * hydration exactly once (ESM single-execution). The old world had
 * App.tsx call initializeTimeline() at boot — core kicking a domain
 * store. Now the plugin hydrates itself when the first consumer pulls
 * the seam; the promise is exported for anyone needing to await it.
 */
export * from "./timelineStore.js";
export * from "./segmentClipboard.js";
/** The one-shot hydration promise (already running; await to join). */
export declare const timelineReady: Promise<void>;
//# sourceMappingURL=index.d.ts.map