/**
 * Browser client face for the ONE graph row (THE ONE-ROW LAW,
 * operator order 2026-10-01: "THERE IS ONE WITH SEAMS, LOOK AT HOW
 * DSH DOES UI"). The preset emits lib/client.js — the single
 * compiled instance of the studio atoms that every card client
 * requires through the loader's module table. The node face stays
 * source-loaded (exports '.' -> src); the lib-half output the
 * preset also emits is inert for node resolution.
 */
import { clientBundle } from '../shared/tsdown.client.ts'

export default clientBundle('@melite/card-base', ['src/index.ts'], {})
