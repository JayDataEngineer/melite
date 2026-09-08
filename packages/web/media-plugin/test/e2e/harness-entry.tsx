/**
 * Browser e2e harness (media-sidebar audit gap 3): mounts the REAL
 * BUILT client bundle (lib/client.js — the artifact the Sep-6 3D outage
 * lived in) in a real Chromium page, drives it through the same tab
 * contract the DSH shell uses (betterSidebar.registerTab), and renders
 * the Media tab against a STUBBED feed. The glb viewer is injected via
 * the REAL registry seam (matchFileViewer) so the 3D click chain runs
 * end-to-end: tile → overlay → registry → viewer component + URL.
 *
 * React is bundled by vite from node_modules (same 18.3.1 the shell
 * hosts); the built bundle's `require` is shimmed onto those SAME
 * instances so hooks/state stay single-instance.
 */
import * as React from 'react'
import * as ReactDom from 'react-dom'
import * as ReactDomClient from 'react-dom/client'
import * as JsxRuntime from 'react/jsx-runtime'

declare global {
  interface Window {
    __e2e?: { ready: Promise<void>; status: string }
    __ModuleLoader__?: { load(mod: { id: string; factory: (require: (id: string) => unknown) => unknown }): void }
  }
}

async function main(): Promise<void> {
  // Feed stub BEFORE anything renders.
  window.fetch = ((input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/infer-media/runs')) {
      return Promise.resolve(new Response(JSON.stringify({
        runs: [{
          run_id: 'e2e-run', created_at: Date.now() / 1000,
          prompt: 'a chrome helmet bust',
          artifacts: [{ url: '/artifact/scene.glb', type: 'model' }],
        }],
        errors: [],
      }), { status: 200 }))
    }
    return Promise.resolve(new Response(JSON.stringify({ drafts: [], errors: [] }), { status: 200 }))
  }) as typeof fetch

  // 3D viewer through the REAL registry seam.
  const GlbViewer = ({ mediaUrl }: { mediaUrl?: string }): JSX.Element =>
    <div data-e2e-glb-viewer={mediaUrl ?? ''}>fake 3d viewer</div>

  const betterSidebar = {
    registerTab(tab) {
      const RDom = unwrap(ReactDomClient as object)
      const host = document.getElementById('tab-' + tab.id)
      if (host != null && tab.component != null) {
        RDom.createRoot(host).render(React.createElement(tab.component))
      }
      return () => {}
    },
    matchFileViewer(path: string): { component: React.ComponentType<{ mediaUrl?: string }> } | undefined {
      return path.endsWith('.glb') ? { component: GlbViewer } : undefined
    },
  }

  // Load the BUILT bundle through its loader contract.
  const mod: { id: string; factory: (require: (id: string) => unknown) => unknown } = await new Promise((resolve, reject) => {
    window.__ModuleLoader__ = {
      load(m) {
        // keep the last-loaded module — the page only loads this one
        ;(window as unknown as { __e2eMod?: unknown }).__e2eMod = m
        resolve(m)
      },
    }
    const s = document.createElement('script')
    s.src = '/client.js'
    s.onerror = () => { reject(new Error('client.js failed to load')) }
    document.head.appendChild(s)
  })
  // vite's ESM interop may wrap CJS module.exports as `.default` — the
  // bundle's require() must see the raw shape (createRoot etc.).
  const unwrap = (m: object): object => {
    const d = (m as { default?: object }).default
    return d != null && typeof d === 'object' ? d : m
  }
  const require = (id: string): unknown => {
    if (id === 'react') return unwrap(React as object)
    if (id === 'react-dom') return unwrap(ReactDom as object)
    if (id === 'react/jsx-runtime') return unwrap(JsxRuntime as object)
    throw new Error('e2e harness: unexpected require ' + id)
  }
  const exports = mod.factory(require) as { apply(ctx: unknown): void }
  const ctx = {
    effect(fn: () => unknown): () => void { fn(); return () => {} },
    betterSidebar,
  }
  exports.apply(ctx)
  window.__e2e = { ready: Promise.resolve(), status: 'mounted' }
}

void main().catch((e: unknown) => {
  document.title = 'HARNESS_FAILED: ' + String(e)
  const pre = document.createElement('pre')
  pre.id = 'harness-failure'
  pre.textContent = String(e instanceof Error ? e.stack : e)
  document.body.appendChild(pre)
})
