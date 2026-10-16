/**
 * Browser client face for the card package's OWN studio registration
 * (2026-11): the client bundle (lib/client.js) is the artifact the
 * DSH module table materializes. ONE BUILDER PER PLANE: this config
 * builds ONLY lib/client.js; the node half (lib/card.js) is the tsc
 * plane (tsconfig.build.json), and a second builder claiming the
 * same files oscillates the lib-sync drift check.
 */
import { clientBundle } from '../../web/shared/tsdown.client.ts'

export default clientBundle('@melite/image-input-prep', ['src/card.ts'], {})
