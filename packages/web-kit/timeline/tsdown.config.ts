/**
 * Browser client face for the timeline UI kit (the phantom-require
 * cure's row, 2026-10-13 — the kit re-exports the row door's Tip and
 * icon set on its own client face). The preset emits lib/client.js —
 * the factory-format artifact the DSH module table materializes; the
 * node face stays source-loaded (exports '.' -> src), and the
 * node-half lib output is never tsdown's to write (one builder per
 * plane: tools/build-plane.mjs owns lib/**).
 */
import { clientBundle } from '../../web/shared/tsdown.client.ts'

export default clientBundle('@melite-plugin/timeline', ['src/index.ts'], {})
