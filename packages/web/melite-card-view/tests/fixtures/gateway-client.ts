/**
 * Test-plane stand-in for '@deepseek-ai/dsh-api-gateway/client' — the
 * REAL artifact (node_modules …/dsh-api-gateway/lib/client.js) is a
 * module-loader-format file (window.__ModuleLoader__.load wrapper)
 * that only executes inside the DSH web shell, so vitest cannot load
 * it. The browser bundle resolves the real module through the shell's
 * registry at plugin load (the manifest `dsh.client.external` seam,
 * the workspace-controller law); tests resolve THIS double through the
 * vitest alias.
 *
 * It carries the ONE runtime value cards-resource.ts imports —
 * RemoteStreamCarrierError — in the same shape (an Error subclass
 * named for diagnostics). Identity with the production class is
 * irrelevant in tests: the instanceof classification lives in the
 * GATEWAY's RemoteStream (faked by the specs' remote fixtures), never
 * in our code. Types (ClientRemote, RemoteStreamItem) come from the
 * real package's .d.ts at typecheck time — no type surface here.
 */
export class RemoteStreamCarrierError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'RemoteStreamCarrierError'
  }
}
