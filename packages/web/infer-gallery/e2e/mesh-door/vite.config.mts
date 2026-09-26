// The browser-plane harness for the 3D media door (the wall that could
// not exist before): it mounts the REAL MeshView — the same module the
// drilldown mounts — against a real artifact over real HTTP, so the only
// thing stubbed is the page around it. jsdom proved the component's
// wiring; this proves a WebGL context, a real glTF parse and real pixels.
export default {
  root: new URL('.', import.meta.url).pathname,
  base: './',
  build: {
    outDir: new URL('./dist', import.meta.url).pathname,
    emptyOutDir: true,
    target: 'es2022',
  },
}
