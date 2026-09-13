/**
 * Browser client face for the card package's OWN studio registration
 * (hour 14, the mount lands with the r3f-free substrate): the client
 * bundle (lib/client.js) is the artifact the DSH module table
 * materializes — the node face stays source-loaded (exports '.' ->
 * src). The tenant's viewport rides card-base's raw-three preview
 * (the substrate law: NO @react-three in any client bundle — the
 * r3f react-reconciler version-skew boot crash, paid once already).
 */
import { clientBundle } from '../../web/shared/tsdown.client.ts'

export default clientBundle('@melite/3d-anny', ['src/card.ts'], {})
