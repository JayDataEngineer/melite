/**
 * Browser client face for the card package's OWN studio registration
 * (2026-09-12, the composition-root correction): the client bundle
 * (lib/client.js) is the artifact the DSH module table materializes —
 * the node face stays source-loaded (exports '.' -> src). Only the
 * client face is kept after the build (the node-half lib output is
 * pruned: source remains the single node truth).
 */
import { clientBundle } from '../../web/shared/tsdown.client.ts'

export default clientBundle('@melite/video-h3-timeline', ['src/index.ts'], {})
