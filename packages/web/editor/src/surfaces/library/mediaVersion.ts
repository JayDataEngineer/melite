// mediaVersion.ts — the global "media changed" signal.
//
// The server is the single source of truth for artifacts (every run's
// outputs live on disk + _flow.json sidecars; listMedia() flattens
// GET /v1/flows/runs). But the browser's media views (AppSidebar,
// AssetPreviewDialog, CopilotActions) each fetch
// on MOUNT and never again — so a freshly-generated image is on the
// server seconds after a run completes yet INVISIBLE in every open view
// until the user toggles/reopens something. The user reads this as "the
// final image doesn't autosave" (2026-08-08: "NOR DOES TEH FINAL IMAGE
// AUTOSAVE. ARE YOU FCKING FOR REAL").
//
// Fix: a tiny version counter. The flow store bumps it the instant a
// run lands in "done"; subscribers (the library views) re-fetch. The
// image appears in the sidebar without a single manual action — the
// autosave the user expects, because the server already did the saving.
import { create } from "zustand"

interface MediaVersionState {
 /** Monotonic counter — bumped whenever a run produces new artifacts.
 * Subscribers add this to their effect deps to re-fetch listMedia(). */
 version: number
 /** Signal that new artifacts landed. Called from the flow store's
 * run-completion path (executeStage success). Idempotent + cheap. */
 bump: () => void
}

export const useMediaVersion = create<MediaVersionState>((set) => ({
 version: 0,
 bump: () => set((s) => ({ version: s.version + 1 })),
}))
