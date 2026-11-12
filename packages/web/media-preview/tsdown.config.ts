/**
 * Browser client face for the media preview (the share door's
 * renderer registrations). The preset emits lib/client.js — the
 * factory-format artifact the DSH module table materializes; the
 * node face (exports '.' → src/host.ts) is the null marker (the
 * card-base law) and the node-half lib output is owned by
 * tools/build-plane.mjs (one builder per plane).
 */
import { clientBundle } from '../shared/tsdown.client.ts'

export default clientBundle('@melite/media-preview', ['src/host.ts'], {})
