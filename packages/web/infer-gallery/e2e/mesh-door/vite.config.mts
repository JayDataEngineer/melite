// The browser-plane harness for the 3D media door (the wall that could
// not exist before): it mounts the REAL MeshView — the same module the
// drilldown mounts — against a real artifact over real HTTP, so the only
// thing stubbed is the page around it. jsdom proved the component's
// wiring; this proves a WebGL context, a real glTF parse and real pixels.
//
// SOURCE-PLANE RESOLUTION (the layout law: static gates resolve workspace
// imports through tsconfig paths to src): MeshView and its transitive
// graph import the `*/client` subpaths, whose package exports map serves
// the tsdown loader bundles (lib/client.js — a __ModuleLoader__ factory,
// never an ES module for a bundler to parse; the 2026-10-24 build red
// MISSING_EXPORT GLTFLoader/RoomEnvironment/mountStage3D with every name
// present inside nested factories). The client face's own paths
// (tsconfig.client.json:275-276) map them to src — this build rides the
// same two rows, so the door compiles the REAL source faces, not bundles.
import { dirname, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = resolvePath(dirname(fileURLToPath(import.meta.url)))
const web = resolvePath(here, '..', '..', '..')

export default {
  root: here,
  base: './',
  resolve: {
    alias: {
      '@melite/three-client/client': resolvePath(web, 'three-client/src/client/index.ts'),
      '@melite/card-base/client': resolvePath(web, 'card-base/src/client/index.ts'),
    },
  },
  build: {
    outDir: resolvePath(here, 'dist'),
    emptyOutDir: true,
    target: 'es2022',
  },
}

