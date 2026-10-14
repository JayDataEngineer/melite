/**
 * Browser client face for the card package's OWN studio registration
 * (2026-09-12, the composition-root correction): the client bundle
 * (lib/client.js) is the artifact the DSH module table materializes.
 * ONE BUILDER PER PLANE (prose corrected 2026-11-05, card-UI audit
 * NIT — the old header claimed "the node face stays source-loaded
 * (exports '.' -> src)", but the manifest points every node export
 * at lib/): this config builds ONLY lib/client.js; the node half
 * (lib/index.js et al) is the tsc plane — tools/build-plane.mjs
 * emits and owns lib/**, the battery's lib-sync arm rebuilds it, and
 * a second builder claiming the same files oscillates the drift
 * check. libEntry below names the node entries for hostPhase matrix
 * callers (workspace builds return after the client face).
 */
import { clientBundle } from '../../web/shared/tsdown.client.ts'

export default clientBundle('@melite/video-h3-timeline', ['src/index.ts'], {})
