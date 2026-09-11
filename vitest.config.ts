import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import {
  PROXY_SETUP,
  resolutionFacade,
  rootPath,
  standardDecoratorPlugin,
  vitestExecArgv,
} from './vitest.shared.ts'

/**
 * THE ROOT TEST RUNNER (2026-09-11, 1:1 with DSH's vitest.config.ts).
 *
 * DSH law (references/deepseek-harness/docs/testing.md + their root
 * config): ONE root `vitest run` owns every unit spec; specs live in
 * each package's tests dir as spec files plus repository script specs
 * under scripts; the root config declares projects that partition the
 * inventory; every suite forks (file-level process isolation); DOM
 * specs run in a DOM project; no per-package test scripts exist —
 * root vitest is the gate. (2026-09-11: the legacy node:test/bun:test
 * plane was migrated in, ledger §TEST-4.)
 *
 * OUR PARTITION (four projects, disjoint include — same mechanism as
 * DSH's thread-safe/process-bound split, partitioned by lane; one
 * native React universe per DOM project, never two in one):
 *
 *   node  — package unit specs (models DECL + registry HMR, walls
 *           suites, engine/harness/estate tool + composition specs,
 *           card-deck host-routes) + tests/unit cross-cutting specs +
 *           repo script specs. Plain node environment, one fork per
 *           file.
 *   dom   — the browser-surface clients on React 19: the editor
 *           (happy-dom: tests/ + src/__tests__/226) plus the
 *           card-view client (happy-dom, React 19). Per-project
 *           aliases keep each client's React single-instance.
 *   dom18 — the media sidebar client (React 18, the universe the DSH
 *           shell hosts).
 *   deck  — the card-deck client (jsdom, React 18.3.1: tests/ +
 *           src/client/__tests__). Its own universe: riding `dom`
 *           would force the editor's React 19 aliases onto it (the
 *           dual-React trap).
 *
 * SOURCE PLANE: the resolution facade (SOURCE_PLANE_ALIAS in
 * vitest.shared.ts — melite-tools plus the four estate Typert
 * remotes) points every lib-exporting workspace package at src, and
 * is spread into every project here and every tier config; the
 * standard-decorator plugin (also from vitest.shared.ts, ported from
 * DSH) lowers the estate remotes' `@Remote` standard decorators the
 * raw pipeline cannot parse — the decorator wall fell with it
 * (ledger §TEST-7), so no estate package rides built lib in any
 * vitest lane. The walls suites' direct built-lib imports remain the
 * one BUILT-LIB debt. pnpm store lock (2026-09-11) still blocks
 * vite-tsconfig-paths; the alias table is the same mechanism.
 *
 * No spec is invisible: every .spec.* runs in exactly one project
 * (includes below are disjoint — DOM trees are excluded from node).
 */

// Prints exact `path:line:col` records for every uncovered statement, branch
// path, and function when a file misses the per-file 100% gate — the built-in
// threshold ERRORs name only the file. Absolute path because istanbul-reports
// require()s custom reporters (which is also why the reporter is CJS).
const uncoveredLocationsReporter = fileURLToPath(new URL('./scripts/coverage-uncovered-locations.cjs', import.meta.url))

const EDITOR = rootPath('packages/web/editor')
const DECK = rootPath('packages/web/melite-card-deck')
const CARD_VIEW = rootPath('packages/web/melite-card-view')
const GALLERY = rootPath('packages/web/infer-gallery')

// The dom-lane clients' spec trees (partitioned out of the node lane).
// The editor's 226 src/__tests__ specs ride the same project (they are
// vitest-native; the package's own `vitest run` script is deleted).
const DOM_SPEC_TREES = [
  `${EDITOR}/tests/**/*.spec.{ts,tsx}`,
  `${EDITOR}/src/__tests__/**/*.spec.{ts,tsx}`,
  `${CARD_VIEW}/tests/**/*.spec.{ts,tsx}`,
  `${GALLERY}/tests/**/*.spec.{ts,tsx}`,
]
// The gallery's own tree — React 18, the universe the DSH shell hosts.
const GALLERY_SPEC_TREES = [`${GALLERY}/tests/**/*.spec.{ts,tsx}`]
// The deck's own trees — React 18.3.1, the universe the DSH shell hosts
// for this client (its vitest.config pins jsdom + no aliases: pnpm
// isolation supplies the single React). Riding `dom` would force the
// editor's React 19 aliases onto it (the dual-React trap — an element
// built by 19 rendered by 18), so the deck gets its own universe like
// the gallery. `${DECK}/tests/**` matches nothing today (no such dir);
// it rides here so future deck specs land in the right universe.
const DECK_SPEC_TREES = [
  `${DECK}/tests/**/*.spec.{ts,tsx}`,
  `${DECK}/src/client/__tests__/**/*.spec.{ts,tsx}`,
]
const DOM19_SPEC_TREES = DOM_SPEC_TREES.filter((t) => !GALLERY_SPEC_TREES.includes(t))

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [standardDecoratorPlugin()],
        resolve: {
          alias: { ...resolutionFacade() },
        },
        test: {
          name: 'node',
          environment: 'node',
          pool: 'forks',
          execArgv: vitestExecArgv,
          setupFiles: [PROXY_SETUP],
          include: [
            'packages/*/*/tests/**/*.spec.ts',
            // Singular test/ dirs (melite-tools, card-deck host-routes).
            'packages/*/*/test/**/*.spec.ts',
            'tests/unit/**/*.spec.ts',
            'scripts/**/*.spec.ts',
            'tests/walls/ts/suites/**/*.spec.ts',
          ],
          exclude: [
            ...DOM_SPEC_TREES,
            ...DECK_SPEC_TREES,
            '**/*.e2e.ts',
            '**/*.expected.e2e.ts',
            '**/*.snapshot.ts',
            '**/*.bench.ts',
          ],
        },
      },
      {
        plugins: [standardDecoratorPlugin()],
        resolve: {
          alias: {
            ...resolutionFacade(),
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
            'shiki/core': path.join(EDITOR, 'node_modules/shiki/dist/core.mjs'),
            'shiki/engine/javascript': path.join(EDITOR, 'node_modules/shiki/dist/engine-javascript.mjs'),
            '@shikijs/langs/typescript': path.join(EDITOR, 'node_modules/@shikijs/langs/dist/typescript.mjs'),
            '@shikijs/langs/shellscript': path.join(EDITOR, 'node_modules/@shikijs/langs/dist/shellscript.mjs'),
            '@shikijs/langs/json': path.join(EDITOR, 'node_modules/@shikijs/langs/dist/json.mjs'),
            anser: path.join(EDITOR, 'node_modules/anser'),
            shiki: path.join(EDITOR, 'node_modules/shiki'),
            // card-view legacy Toaster (src/old) imports sonner, installed
            // only under the card-view package — alias so the root vite
            // server resolves it without hoisting.
            sonner: path.join(CARD_VIEW, 'node_modules/sonner/dist/index.mjs'),
          },
        },
        test: {
          name: 'dom',
          environment: 'happy-dom',
          pool: 'forks',
          execArgv: vitestExecArgv,
          setupFiles: [PROXY_SETUP, path.join(EDITOR, 'tests/setup.ts')],
          globals: true,
          css: false,
          include: DOM19_SPEC_TREES,
          exclude: ['**/*.e2e.ts', '**/*.expected.e2e.ts', '**/*.snapshot.ts'],
          server: {
            deps: {
              inline: [/@deepseek-ai\/dsh-client-ui-primitives/, /sonner/],
            },
          },
        },
      },
      {
        plugins: [standardDecoratorPlugin()],
        resolve: {
          alias: {
            ...resolutionFacade(),
            react: path.join(GALLERY, 'node_modules/react'),
            'react-dom': path.join(GALLERY, 'node_modules/react-dom'),
            'react/jsx-runtime': path.join(GALLERY, 'node_modules/react/jsx-runtime'),
          },
        },
        test: {
          name: 'dom18',
          environment: 'jsdom',
          pool: 'forks',
          execArgv: vitestExecArgv,
          setupFiles: [PROXY_SETUP],
          css: false,
          include: GALLERY_SPEC_TREES,
          exclude: ['**/*.e2e.ts', '**/*.expected.e2e.ts', '**/*.snapshot.ts'],
          server: {
            deps: {
              inline: [/@deepseek-ai\/dsh-client-ui-primitives/],
            },
          },
        },
      },
      {
        plugins: [standardDecoratorPlugin()],
        resolve: {
          alias: {
            ...resolutionFacade(),
            react: path.join(DECK, 'node_modules/react'),
            'react-dom': path.join(DECK, 'node_modules/react-dom'),
            'react/jsx-runtime': path.join(DECK, 'node_modules/react/jsx-runtime'),
          },
        },
        test: {
          name: 'deck',
          environment: 'jsdom',
          pool: 'forks',
          execArgv: vitestExecArgv,
          setupFiles: [PROXY_SETUP],
          css: false,
          include: DECK_SPEC_TREES,
          exclude: ['**/*.e2e.ts', '**/*.expected.e2e.ts', '**/*.snapshot.ts'],
          server: {
            deps: {
              inline: [/@deepseek-ai\/dsh-client-ui-primitives/],
            },
          },
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['packages/*/*/src/**/*.{ts,tsx}'],
      exclude: [
        // GUI-debt exemptions (ledger §TEST-2). The .test.ts→.spec.ts
        // migration is DONE (2026-09-11, §TEST-4) — these trees run
        // under root vitest now but are not yet at per-file 100%, so
        // they stay exempt while the gate expands incrementally. The
        // gated set (models DECL index.ts) stays under the gate below.
        'packages/web/**/src/**/*.{ts,tsx}',
        'packages/web-kit/**/src/**/*.{ts,tsx}',
        'packages/engines/**/src/**/*.{ts,tsx}',
        'packages/harness/**/src/**/*.{ts,tsx}',
        // The estate tree is FULLY gated (2026-09-11, §TEST-8 grew it
        // to manage/media/runs + drafts index/spec/store/remote; §TEST-9
        // closed the last file-exempt — the drafts bench engine — at
        // per-file 100 via its package-local spec). No estate rows
        // remain here.
        // 3d closed (2026-09-12, §TEST-10): every TS logic file at
        // per-file 100 (card compose gates + the clothing-placement
        // tool face). The STUDIOS (src/ui/**/*.tsx — anny's two,
        // img-to-mesh's one) stay GUI-debt: DOM components, the dom
        // project's territory, same carve-out as the web tree.
        'packages/3d/**/src/ui/**/*.{ts,tsx}',
        'packages/audio/**/src/**/*.{ts,tsx}',
        'packages/image/**/src/**/*.{ts,tsx}',
        'packages/motion/**/src/**/*.{ts,tsx}',
        'packages/video/**/src/**/*.{ts,tsx}',
        // Types-only files carry no executable code.
        'packages/*/*/src/types.ts',
        // The z-image family has no mods dir (absent ≡ empty) — its
        // index.ts carries the same DECL + family shape as every other
        // family and is covered by the same HMR spec; keep it gated
        // (do NOT exempt). This comment records the deliberate non-exempt.
      ],
      thresholds: {
        perFile: true,
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
      reporter: process.env.CI
        ? ['text', uncoveredLocationsReporter]
        : ['text', 'html', uncoveredLocationsReporter],
    },
  },
})
