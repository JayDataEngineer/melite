/**
 * Client-side poster cache for motion assets in the Media sidebar.
 *
 * Motion assets are NPZ files — not directly viewable as an image.
 * MotionPoster renders the midpoint frame ONCE, snapshots it, and
 * stores it here so every subsequent open of the Media sidebar
 * reuses the snapshot instead of re-rendering. This mirrors
 * surfaces/flow/motionThumbStore.ts (the same mechanic the flow
 * card uses to persist its motion-tile screenshots).
 *
 * The mechanic is the shared poster-store factory (@melite/ui
 * posterStore — the same shape the mesh lane uses); this module
 * keeps the lane's public hook name + storage key (the key is the
 * user-facing persistence contract: cached posters survive the dedup
 * unchanged).
 */
import { createPosterStore } from "@melite/ui/posterStore"

export const useMotionPosterStore = createPosterStore("motion-asset-posters")
