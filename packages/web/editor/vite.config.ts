/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { noFullReloadPlugin } from './vite-plugin-no-full-reload'
import path from 'node:path'

// DSH-style resolution: ONE mechanism — real absolute paths resolved from
// this config file. Works identically for in-root app files AND the
// out-of-root plugin trees (packages/ lives outside the vite root; string
// aliases like '/x' break there because vite treats them as fs-absolute).
const R = (p: string) => path.resolve(__dirname, p)

// Architecture: Browser → Vite (:5173) → the owning DSH (:3088)
//
// The python gateway (python/gateway.py — THE gateway since the C
// retirement, 2026-09-03) hosts the workstation API surface
// (catalog, forms, runs, assets). The conversational agent moved OUT
// of the gateway 2026-08-21 (it lives in the DSH plugins now) —
// there is no /agent lane and no proxy for it.
//
//   /v1/*       → gateway native handlers (catalog, forms, runs, assets)
//   /poser/*    → gateway studio bridge → the engine endpoint's poser
//                 pack (mesh, identity-space, joints — the bridge was
//                 rebuilt 2026-09-05: the Bun-era server had carried
//                 the forward and the studio mesh reads 404'd after
//                 its retirement)
//   /comfyui/*  → gateway-forwarded where surfaces need it
// R5: the estate doors live on the OWNING DSH's own webServer —
// same-origin /v1 (plus the engine bridges). API_URL stays as the
// dev override channel; no port pin in code.
const SERVER = process.env.API_URL || 'http://127.0.0.1:3088'

const proxyConfig: Record<string, { target: string; ws: boolean }> = {
  '/v1':                { target: SERVER, ws: false },
  '/health':            { target: SERVER, ws: false },
  '/poser':             { target: SERVER, ws: false },
  '/comfyui':           { target: SERVER, ws: false },
  // Run artifacts (PNGs, GLBs) live in data/runs/ at the repo root; the
  // gateway serves them at /v1/assets/runs straight from disk — they ride
  // the /v1 proxy above (Phase 2 consolidation, 2026-09-04). Vite never
  // touches them (the store is outside this Vite root).
}

export default defineConfig({
  resolve: { alias: {
      '@': R('src'),
      // @melite packages (§18, 2026-08-21): REAL workspace packages —
      // node_modules links + package.json main/exports resolve them,
      // exactly like any dependency (the DSH law). The deps list stays
      // the LAW (packages-closure gate reads it); deep subpaths resolve
      // through each package's enumerated exports map.
      // Plugin studios live OUTSIDE the vite root; pin their bare runtime
      // deps (the gate's VALUE_ALLOW) to the editor's node_modules. react
      // included: without the pin, plugin files resolve the repo-ROOT copy
      // and mount a SECOND React (hooks null) — the dual-react bug.
      'react': R('node_modules/react'),
      'react-dom': R('node_modules/react-dom'),
      'react/jsx-runtime': R('node_modules/react/jsx-runtime'),
      'lucide-react': R('node_modules/lucide-react'),
      // three's exports map resolves `three/addons/*` to examples/jsm/* —
      // but the bare `three` pin rewrites the SUBPATH literally (aliasing
      // beats exports resolution), and three has no physical addons/ dir →
      // dev-optimizer ENOENT. Order matters: the SPECIFIC key must precede
      // the bare one (aliases match first-hit, longest-prefix by order).
      'three/addons': R('node_modules/three/examples/jsm'),
      // three/examples/* from PLUGIN tenants (moved viewers, 2026-08-21):
      // same disease as addons above — the bare `three` pin rewrites the
      // subpath literally and node resolution from packages/<id>/ never
      // reaches the editor's copy. Pin the subpath tree explicitly.
      'three/examples': R('node_modules/three/examples'),
      'three': R('node_modules/three'),
      '@react-three/drei': R('node_modules/@react-three/drei'),
      '@react-three/fiber': R('node_modules/@react-three/fiber'),
    } },
  plugins: [
    tailwindcss(),
    react(),
    noFullReloadPlugin(),
    // §16 E-TENANTS + D1 (2026-08-21 — the resolver RETIRED): plugins
    // are REAL workspace packages now (pnpm-workspace.yaml; the DSH
    // guide's law — the manager materializes cross-platform links).
    // "@melite-plugin/<id>/ui/<tenant>" resolves through node_modules +
    // package exports like any other dependency; no membership list or
    // convention shim lives in build config.
  ],
  base: '/editor/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // MULTI-PAGE inputs (2026-10-02): without an explicit input table, ONLY
    // index.html lands in dist — the harness pages existed on the dev server
    // alone and the DSH embed (melite-card-deck serves editor/dist under
    // /editor/) could never reach them. Every *.html test page in the editor
    // root is a build input; tests/test_web_harness_pages.py refuses a page
    // missing from this table (harness rot is a GATE failure, not a silently
    // stale lane).
    rollupOptions: {
      input: {
        main: R('index.html'),
        'card-harness': R('card-harness.html'),
        'card-embed-shell': R('card-embed-shell.html'),
        'loading-bar-harness': R('loading-bar-harness.html'),
      },
    },
  },
  server: {
    host: '0.0.0.0',
    // The PLUGIN WORKSPACE (2026-08-21): plugins + their packages live at
    // the REPO root. The editor is itself a plugin (packages/web/editor,
    // 2026-09-02) — Vite's default allow list is the editor root alone, so
    // every sibling plugin module 403s. The repo root is a CONFIG-DECLARED
    // allow entry — the cross-platform companion of the pnpm workspace
    // (no hand-made links anywhere).
    fs: {
      allow: [R('../../..'), R('../../../packages')],
    },
    port: 5173,
    proxy: proxyConfig,
    // Allow access from Tailscale IPs and other non-localhost hosts.
    allowedHosts: true,
    cors: true,
    // Run artifacts are written to <repo>/data/runs/ — OUTSIDE this Vite
    // root, so the watcher never sees them and artifact writes never
    // trigger a full page reload.
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    proxy: proxyConfig,
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/__tests__/**/*.test.{ts,tsx}'],
    css: false,
    pool: 'threads',
    // S4f: DSH ui-primitives ships CSS-module imports inside its ESM.
    // Inlined so vite transforms it (css:false then drops the styles);
    // otherwise node externalizes the package and chokes on ".css".
    server: {
      deps: {
        inline: [/@deepseek-ai\/dsh-client-ui-primitives/],
      },
    },
    // The primitives' lib also imports `anser` + `shiki` WITHOUT
    // declaring them (upstream packaging gap, 0.1.5-rc.2 — the
    // lockfile snapshot carries only cordis) — strict pnpm isolation
    // hides them from the store copy's siblings. Local aliases close
    // the gap (the editor declares both as devDeps and owns the
    // copies); the rows above stay untouched.
    alias: {
      // Order matters (first-hit wins): subpaths BEFORE the bare
      // prefix, or `shiki` swallows `shiki/core` and the package
      // exports map is never consulted.
      'shiki/core': R('./node_modules/shiki/dist/core.mjs'),
      'shiki/engine/javascript': R('./node_modules/shiki/dist/engine-javascript.mjs'),
      '@shikijs/langs/typescript': R('./node_modules/@shikijs/langs/dist/typescript.mjs'),
      '@shikijs/langs/shellscript': R('./node_modules/@shikijs/langs/dist/shellscript.mjs'),
      '@shikijs/langs/json': R('./node_modules/@shikijs/langs/dist/json.mjs'),
      anser: R('./node_modules/anser'),
      shiki: R('./node_modules/shiki'),
    },
  },
})
