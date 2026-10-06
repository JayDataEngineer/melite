/**
 * Browser client face for the ONE 3D graph row (the ONE-ROW LAW
 * extended to three — see cordis.patch.yml). The preset emits
 * lib/client.js: the single compiled instance of three and the four
 * addon modules every 3D consumer requires through the loader's
 * module table. The node face is the composition marker only
 * (src/host.ts).
 */
import { clientBundle } from '../shared/tsdown.client.ts'

export default clientBundle('@melite/three-client', ['src/host.ts'], {})
