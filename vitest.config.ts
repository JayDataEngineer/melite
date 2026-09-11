import path from 'node:path'
import { defineConfig } from 'vitest/config'

/**
 * THE ROOT TEST RUNNER (2026-09-11, 1:1 with DSH's vitest.config.ts).
 *
 * DSH law (references/deepseek-harness/docs/testing.md + their root
 * config): ONE root `vitest run` owns every unit spec; specs live in
 * each package's tests/ dir as *.spec.{ts,tsx}; the root config
 * declares projects that partition the inventory; every suite forks
 * (file-level process isolation — the walls' per-file process.env and
 * port allocations depend on exactly this, which run.mjs used to give
 * them by spawning each suite); DOM specs run in a DOM project; no
 * per-package test scripts exist.
 *
 * OUR PARTITION (two projects, disjoint include — same mechanism as
 * DSH's thread-safe/process-bound split, partitioned by lane):
 *
 *   node — package unit specs (models DECL, genre tools, estate-call,
 *          card-view, viewer, deck host routes, tools) + the walls
 *          integration plane (tests/walls/ts/suites — root-level
 *          specs, the same position DSH gives repo-script specs).
 *          Plain node environment, one fork per file.
 *
 *   dom  — the two browser-surface clients: the editor (happy-dom,
 *          React 19, the editor's own alias table + setup file) and
 *          the card-deck client (jsdom, React 18 — matches the DSH
 *          shell that hosts it). Per-project aliases keep each
 *          client's React single-instance (the dual-react law).
 *
 * SOURCE PLANE: bare @melite/* imports resolve through workspace
 * symlinks whose package mains point at src (kit packages) — the same
 * source-plane law DSH enforces with a tsconfig paths facade; built
 * lib/ artifacts are consumed only by the specs that pin them
 * explicitly (the walls' estate imports — the BUILT-LIB LAW).
 */
const R = (p: string): string => path.resolve(__dirname, p)

const EDITOR = R('packages/web/editor')
const DECK = R('packages/web/melite-card-deck')
const CARD_VIEW = R('packages/web/melite-card-view')

// The dom-lane clients' spec trees (partitioned out of the node lane).
const DOM_SPEC_TREES = [
  `${EDITOR}/tests/**/*.spec.{ts,tsx}`,
  `${DECK}/tests/**/*.spec.{ts,tsx}`,
  `${CARD_VIEW}/tests/**/*.spec.{ts,tsx}`,
]

export default defineConfig({
  test: {
    // DSH's two-project split, ours partitioned by environment lane.
    projects: [
      {
        test: {
          name: 'node',
          environment: 'node',
          pool: 'forks',
          include: [
            'packages/*/*/tests/**/*.spec.ts',
            'tests/walls/ts/suites/**/*.spec.ts',
          ],
          exclude: DOM_SPEC_TREES,
        },
      },
      {
        // The editor's own resolution table, verbatim from its former
        // per-package config (the dual-react + three/addons + shiki
        // subpath laws all live here — moving them to the root changed
        // the file's home, not the mechanism).
        resolve: {
          alias: {
            '@': path.join(EDITOR, 'src'),
            react: path.join(EDITOR, 'node_modules/react'),
            'react-dom': path.join(EDITOR, 'node_modules/react-dom'),
            'react/jsx-runtime': path.join(EDITOR, 'node_modules/react/jsx-runtime'),
            'lucide-react': path.join(EDITOR, 'node_modules/lucide-react'),
            'three/addons': path.join(EDITOR, 'node_modules/three/examples/jsm'),
            'three/examples': path.join(EDITOR, 'node_modules/three/examples'),
            three: path.join(EDITOR, 'node_modules/three'),
            '@react-three/drei': path.join(EDITOR, 'node_modules/@react-three/drei'),
            '@react-three/fiber': path.join(EDITOR, 'node_modules/@react-three/fiber'),
            // Subpaths BEFORE the bare prefix (first-hit wins).
            'shiki/core': path.join(EDITOR, 'node_modules/shiki/dist/core.mjs'),
            'shiki/engine/javascript': path.join(EDITOR, 'node_modules/shiki/dist/engine-javascript.mjs'),
            '@shikijs/langs/typescript': path.join(EDITOR, 'node_modules/@shikijs/langs/dist/typescript.mjs'),
            '@shikijs/langs/shellscript': path.join(EDITOR, 'node_modules/@shikijs/langs/dist/shellscript.mjs'),
            '@shikijs/langs/json': path.join(EDITOR, 'node_modules/@shikijs/langs/dist/json.mjs'),
            anser: path.join(EDITOR, 'node_modules/anser'),
            shiki: path.join(EDITOR, 'node_modules/shiki'),
          },
        },
        test: {
          name: 'dom',
          environment: 'happy-dom',
          globals: true,
          css: false,
          include: DOM_SPEC_TREES,
          // Per-file DOM environment override (the deck client is jsdom):
          environmentMatchGlobs: [
            [`${DECK}/tests/**`, 'jsdom'],
          ],
          setupFiles: [path.join(EDITOR, 'tests/setup.ts')],
          // DSH ui-primitives ships CSS-module imports inside its ESM;
          // inlined so vite transforms them (css:false drops the styles).
          server: {
            deps: {
              inline: [/@deepseek-ai\/dsh-client-ui-primitives/],
            },
          },
        },
      },
    ],
    // Coverage measures OUR runtime source (DSH law: the gate owns
    // packages/*/*/src). Per-file thresholds are NOT yet enforced —
    // the honest bar is reporter-only until the uncovered inventory
    // is worked down; the ledger carries the gap.
    coverage: {
      provider: 'v8',
      include: ['packages/*/*/src/**/*.{ts,tsx}'],
      reporter: ['text', 'json-summary'],
    },
  },
})
