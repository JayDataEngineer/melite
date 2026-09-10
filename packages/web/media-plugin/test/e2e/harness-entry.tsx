/**
 * Browser e2e harness (media-sidebar audit gap 3): mounts the REAL
 * BUILT client bundle (lib/client.js — the artifact the Sep-6 3D outage
 * lived in) in a real Chromium page against a STUBBED feed, through the
 * NATIVE two-registration contract the DSH shell uses (hunk 3/4,
 * 2026-09-10): ctx.sidebarRightTabs.register declares the tab types,
 * ctx.slots carries the keyed `sidebar.right.pane.tab` seats. The
 * harness renders the captured Media body with a stubbed useTabInfo
 * whose openResource CAPTURES addresses — the two assertions that
 * matter end-to-end on the built artifact are the estate-artifact
 * address (3D tile) and the cards run address (the wand, hunk 4).
 *
 * React is bundled by vite from node_modules (same 18.3.1 the shell
 * hosts); the built bundle's `require` is shimmed onto those SAME
 * instances so hooks/state stay single-instance.
 */
import * as React from 'react'
import * as ReactDom from 'react-dom'
import * as ReactDomClient from 'react-dom/client'
import * as JsxRuntime from 'react/jsx-runtime'
// Platform modules, mirroring the prod transport: the shared client-bundle
// preset keeps @deepseek-ai/* externals OUT of lib/client.js and the host
// answers them from the frozen PLATFORM_MODULES table (web-platform.ts —
// ui-primitives is a seed row). This miniature transport must answer the
// same id, or the built bundle throws "unexpected require" at factory
// execution and no tab mounts (every e2e red since the Modal import,
// masked by nobody running it — caught 2026-09-09 rebuilding the test
// host for the primitives port). NAMED imports only — the barrel carries
// KaTeX/shiki (Markdown/Code blocks) that would bloat this harness.
import { Button, Input, Modal, Pill, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'

declare global {
  interface Window {
    __e2e?: { ready: Promise<void>; status: string }
    __ModuleLoader__?: { load(mod: { id: string; factory: (require: (id: string) => unknown) => unknown }): void }
    __e2eOpened?: string[]
  }
}

async function main(): Promise<void> {
  // Feed stub BEFORE anything renders.
  window.fetch = ((input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/v1/flows/runs')) {
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

  // The addresses the panel asks the sidebar to open (the assertions).
  const opened: string[] = []
  window.__e2eOpened = opened

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
  const DSHPrimitives = { Button, Input, Modal, Pill, Tooltip }
  const require = (id: string): unknown => {
    if (id === 'react') return unwrap(React as object)
    if (id === 'react-dom') return unwrap(ReactDom as object)
    if (id === 'react/jsx-runtime') return unwrap(JsxRuntime as object)
    if (id === '@deepseek-ai/dsh-client-ui-primitives') return DSHPrimitives
    throw new Error('e2e harness: unexpected require ' + id)
  }

  // The NATIVE two-registration contract, captured: the tab TYPES the
  // bundle declares and the keyed seat BODIES it registers. The harness
  // renders the Media body itself with a stubbed useTabInfo.
  const typeIds: string[] = []
  const bodies = new Map<string, React.ComponentType<Record<string, unknown>>>()
  const ctx = {
    effect(fn: () => unknown): () => void { fn(); return () => {} },
    sidebarRightTabs: {
      register(def: { id: string }) {
        typeIds.push(def.id)
        return () => {}
      },
    },
    slots: {
      inject(_name: string, fn: () => unknown): void { void fn() },
      register(def: { key: string }, component: React.ComponentType<Record<string, unknown>>) {
        bodies.set(def.key, component)
        return () => {}
      },
    },
  }
  const exports = mod.factory(require) as { apply(ctx: unknown): void }
  exports.apply(ctx)

  const MediaBody = bodies.get('infer-media:media')
  if (MediaBody === undefined) throw new Error('no media body registered; types=' + typeIds.join(','))
  const host = document.getElementById('tab-infer-media:media')
  if (host === null) throw new Error('no mount host')
  const RDomClient = unwrap(ReactDomClient as object) as typeof ReactDomClient
  RDomClient.createRoot(host).render(React.createElement(MediaBody, {
    useTabInfo: () => ({
      tab: {
        navigation: { address: 'dsh-resource://media' },
        actions: { openResource: (a: string): void => { opened.push(a) } },
      },
    }),
  }))
  window.__e2e = { ready: Promise.resolve(), status: 'mounted' }
}

void main().catch((e: unknown) => {
  document.title = 'HARNESS_FAILED: ' + String(e)
  const pre = document.createElement('pre')
  pre.id = 'harness-failure'
  pre.textContent = String(e instanceof Error ? e.stack : e)
  document.body.appendChild(pre)
})
