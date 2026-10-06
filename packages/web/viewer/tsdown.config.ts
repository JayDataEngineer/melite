/**
 * Browser client face for the viewer (the estate's run-card viewer).
 * The preset emits lib/client.js — the factory-format artifact the DSH
 * module table materializes; the node face stays source-loaded
 * (exports '.' -> src), and the node-half lib output is never tsdown's
 * to write (one builder per plane: tools/build-plane.mjs owns lib/**).
 */
import { clientBundle } from '../shared/tsdown.client.ts'

export default clientBundle('@melite/viewer', ['src/index.ts'], {})
