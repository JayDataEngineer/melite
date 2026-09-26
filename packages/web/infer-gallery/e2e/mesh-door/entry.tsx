// The REAL component under test — imported from the repo, not a copy.
import { createRoot } from 'react-dom/client'
import { MeshView } from '../../src/client/mesh-view.tsx'

const params = new URLSearchParams(location.search)
const url = params.get('url') ?? '/mesh.glb'
const root = createRoot(document.getElementById('root')!)
root.render(<MeshView url={url} file={params.get('file') ?? 'mesh.glb'} />)
