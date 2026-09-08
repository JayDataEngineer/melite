/**
 * Client-side poster cache for mesh assets in the Media sidebar.
 *
 * Mesh assets are GLB files — the tile can NOT show the run's `thumbnail`:
 * for a Trellis (image→mesh) run that thumbnail is the INPUT image, not the
 * output mesh. MeshPoster renders the actual GLB once at a 3/4 angle,
 * snapshots it to a JPEG, and stores it here so every subsequent open of
 * the Media sidebar reuses the snapshot instead of re-rendering.
 *
 * The mechanic is the shared poster-store factory (@melite/ui
 * posterStore — the same shape the motion lane uses); this module keeps
 * the lane's public hook name + storage key (the key is the user-facing
 * persistence contract: cached posters survive the dedup unchanged).
 */
import { createPosterStore } from "@melite/ui/posterStore"

export const useMeshPosterStore = createPosterStore("mesh-asset-posters")
