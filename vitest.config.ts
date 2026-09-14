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
 *   dom   — the browser-surface clients on React 19: the card-view
 *           client (happy-dom, tests/**). Per-project aliases keep
 *           each client's React single-instance. (2026-09-12: the
 *           editor app was deleted — its 226 src/__tests__ specs died
 *           with it; the lane's React universe now pins at the store.)
 *   dom18 — the media sidebar client (React 18, the universe the DSH
 *           shell hosts).
 *   deck  — the card-deck client (jsdom, React 18.3.1: tests/ +
 *           src/client/__tests__). Its own universe: riding `dom`
 *           would force the card-view lane's React 19 aliases onto it
 *           (the dual-React trap).
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

const DECK = rootPath('packages/web/melite-card-deck')
const CARD_VIEW = rootPath('packages/web/melite-card-view')
const GALLERY = rootPath('packages/web/infer-gallery')

// The dom-lane clients' spec trees (partitioned out of the node lane).
const DOM_SPEC_TREES = [
  `${CARD_VIEW}/tests/**/*.spec.{ts,tsx}`,
  `${GALLERY}/tests/**/*.spec.{ts,tsx}`,
  // THE CARD PACKAGES' OWN CLIENT SPECS (2026-09-12, the
  // composition-root correction): each card's studio registration +
  // adapter live in its package now — its spec rides the dom lane
  // (React 19, the store-pinned pair).
  `${rootPath('packages/video/h3-timeline')}/tests/**/*.spec.{ts,tsx}`,
  `${rootPath('packages/image/ideogram4')}/tests/**/*.spec.{ts,tsx}`,
  `${rootPath('packages/image/mask-studio')}/tests/**/*.spec.{ts,tsx}`,
  `${rootPath('packages/3d/img-to-mesh')}/tests/**/*.spec.{ts,tsx}`,
  // card-base's own spec tree (hour 14: the mesh stage's decision
  // layer moved here with the component — the preview seam's claim)
  `${rootPath('packages/web/card-base')}/tests/**/*.spec.{ts,tsx}`,
]
// The gallery's own tree — React 18, the universe the DSH shell hosts.
const GALLERY_SPEC_TREES = [`${GALLERY}/tests/**/*.spec.{ts,tsx}`]
// The deck's own trees — React 18.3.1, the universe the DSH shell hosts
// for this client (its vitest.config pins jsdom + no aliases: pnpm
// isolation supplies the single React). Riding `dom` would force the
// card-view lane's React 19 aliases onto it (the dual-React trap — an element
// built by 19 rendered by 18), so the deck gets its own universe like
// the gallery. `${DECK}/tests/**` matches nothing today (no such dir);
// it rides here so future deck specs land in the right universe.
const DECK_SPEC_TREES = [
  `${DECK}/tests/**/*.spec.{ts,tsx}`,
  `${DECK}/src/client/__tests__/**/*.spec.{ts,tsx}`,
]
const DOM19_SPEC_TREES = DOM_SPEC_TREES.filter((t) => !GALLERY_SPEC_TREES.includes(t))

// THE /TMP OWNERSHIP NET (stroke 13, 2026-09-14): suites mkdtemp
// under tmpdir(); the global sweep reclaims pre-run trees at teardown
// so iterate-run-fix loops can never accumulate a million inodes
// again (tests/global-sweep.ts owns the prefix table).
const TMP_SWEEP = path.join('tests', 'global-sweep.ts')

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
          globalSetup: [TMP_SWEEP],
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
            // 2026-09-12: the dom universe re-homed from the deleted
            // editor app. React pins at the STORE's matched 19 pair
            // (ONE react for the lane — the dual-React trap), icons
            // and three ride the card-view client's resolution.
            react: rootPath('node_modules/.pnpm/react@19.2.8/node_modules/react'),
            'react-dom': rootPath('node_modules/.pnpm/react-dom@19.2.8_react@19.2.8/node_modules/react-dom'),
            'react/jsx-runtime': rootPath('node_modules/.pnpm/react@19.2.8/node_modules/react/jsx-runtime'),
            // anser: the atoms' rc.2 dist imports this undeclared
            // transitive (editor's tree used to supply it). Pinned at
            // the store copy like the React pair.
            anser: rootPath('node_modules/.pnpm/anser@2.3.5/node_modules/anser'),
            // shiki: the atoms' rc.2 dist imports these undeclared
            // transitives (the editor's tree used to supply them).
            'shiki/core': rootPath('node_modules/.pnpm/shiki@4.4.3/node_modules/shiki/dist/core.mjs'),
            'shiki/engine/javascript': rootPath('node_modules/.pnpm/shiki@4.4.3/node_modules/shiki/dist/engine-javascript.mjs'),
            shiki: rootPath('node_modules/.pnpm/shiki@4.4.3/node_modules/shiki'),
            '@shikijs/langs/c': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/c.mjs'),
            '@shikijs/langs/cpp': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/cpp.mjs'),
            '@shikijs/langs/csharp': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/csharp.mjs'),
            '@shikijs/langs/css': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/css.mjs'),
            '@shikijs/langs/go': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/go.mjs'),
            '@shikijs/langs/html': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/html.mjs'),
            '@shikijs/langs/ini': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/ini.mjs'),
            '@shikijs/langs/java': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/java.mjs'),
            '@shikijs/langs/json': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/json.mjs'),
            '@shikijs/langs/kotlin': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/kotlin.mjs'),
            '@shikijs/langs/less': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/less.mjs'),
            '@shikijs/langs/lua': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/lua.mjs'),
            '@shikijs/langs/markdown': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/markdown.mjs'),
            '@shikijs/langs/mdx': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/mdx.mjs'),
            '@shikijs/langs/php': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/php.mjs'),
            '@shikijs/langs/python': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/python.mjs'),
            '@shikijs/langs/ruby': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/ruby.mjs'),
            '@shikijs/langs/rust': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/rust.mjs'),
            '@shikijs/langs/scss': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/scss.mjs'),
            '@shikijs/langs/shellscript': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/shellscript.mjs'),
            '@shikijs/langs/sql': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/sql.mjs'),
            '@shikijs/langs/swift': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/swift.mjs'),
            '@shikijs/langs/toml': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/toml.mjs'),
            '@shikijs/langs/typescript': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/typescript.mjs'),
            '@shikijs/langs/xml': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/xml.mjs'),
            '@shikijs/langs/yaml': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/yaml.mjs'),
            katex: rootPath('node_modules/.pnpm/katex@0.16.47/node_modules/katex'),
            'mdast-util-from-markdown': rootPath('node_modules/.pnpm/mdast-util-from-markdown@2.0.3_supports-color@9.4.0/node_modules/mdast-util-from-markdown'),
            'mdast-util-gfm': rootPath('node_modules/.pnpm/mdast-util-gfm@3.1.0_supports-color@9.4.0/node_modules/mdast-util-gfm'),
            'mdast-util-math': rootPath('node_modules/.pnpm/mdast-util-math@3.0.0_supports-color@9.4.0/node_modules/mdast-util-math'),
            'micromark-core-commonmark': rootPath('node_modules/.pnpm/micromark-core-commonmark@2.0.3/node_modules/micromark-core-commonmark'),
            'micromark-extension-gfm': rootPath('node_modules/.pnpm/micromark-extension-gfm@3.0.0/node_modules/micromark-extension-gfm'),
            'micromark-extension-math': rootPath('node_modules/.pnpm/micromark-extension-math@3.1.0/node_modules/micromark-extension-math'),
            'micromark-factory-space': rootPath('node_modules/.pnpm/micromark-factory-space@2.0.1/node_modules/micromark-factory-space'),
            'micromark-util-character': rootPath('node_modules/.pnpm/micromark-util-character@2.1.1/node_modules/micromark-util-character'),
            'micromark-util-classify-character': rootPath('node_modules/.pnpm/micromark-util-classify-character@2.0.1/node_modules/micromark-util-classify-character'),
            'micromark-util-sanitize-uri': rootPath('node_modules/.pnpm/micromark-util-sanitize-uri@2.0.1/node_modules/micromark-util-sanitize-uri'),
            'micromark-util-symbol': rootPath('node_modules/.pnpm/micromark-util-symbol@2.0.1/node_modules/micromark-util-symbol'),
            'lucide-react': path.join(CARD_VIEW, 'node_modules/lucide-react'),
            'three/addons': path.join(CARD_VIEW, 'node_modules/three/examples/jsm'),
            'three/examples': path.join(CARD_VIEW, 'node_modules/three/examples'),
            three: path.join(CARD_VIEW, 'node_modules/three')
          },
        },
        test: {
          name: 'dom',
          globalSetup: [TMP_SWEEP],
          environment: 'happy-dom',
          pool: 'forks',
          execArgv: vitestExecArgv,
          setupFiles: [PROXY_SETUP, path.join(CARD_VIEW, 'tests/setup.ts')],
          globals: true,
          css: false,
          include: DOM19_SPEC_TREES,
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
            react: path.join(GALLERY, 'node_modules/react'),
            'react-dom': path.join(GALLERY, 'node_modules/react-dom'),
            'react/jsx-runtime': path.join(GALLERY, 'node_modules/react/jsx-runtime'),
            // anser: the atoms' rc.2 dist imports this undeclared
            // transitive (editor's tree used to supply it). Pinned at
            // the store copy like the React pair.
            anser: rootPath('node_modules/.pnpm/anser@2.3.5/node_modules/anser'),
            // shiki: the atoms' rc.2 dist imports these undeclared
            // transitives (the editor's tree used to supply them).
            'shiki/core': rootPath('node_modules/.pnpm/shiki@4.4.3/node_modules/shiki/dist/core.mjs'),
            'shiki/engine/javascript': rootPath('node_modules/.pnpm/shiki@4.4.3/node_modules/shiki/dist/engine-javascript.mjs'),
            shiki: rootPath('node_modules/.pnpm/shiki@4.4.3/node_modules/shiki'),
            '@shikijs/langs/c': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/c.mjs'),
            '@shikijs/langs/cpp': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/cpp.mjs'),
            '@shikijs/langs/csharp': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/csharp.mjs'),
            '@shikijs/langs/css': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/css.mjs'),
            '@shikijs/langs/go': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/go.mjs'),
            '@shikijs/langs/html': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/html.mjs'),
            '@shikijs/langs/ini': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/ini.mjs'),
            '@shikijs/langs/java': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/java.mjs'),
            '@shikijs/langs/json': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/json.mjs'),
            '@shikijs/langs/kotlin': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/kotlin.mjs'),
            '@shikijs/langs/less': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/less.mjs'),
            '@shikijs/langs/lua': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/lua.mjs'),
            '@shikijs/langs/markdown': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/markdown.mjs'),
            '@shikijs/langs/mdx': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/mdx.mjs'),
            '@shikijs/langs/php': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/php.mjs'),
            '@shikijs/langs/python': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/python.mjs'),
            '@shikijs/langs/ruby': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/ruby.mjs'),
            '@shikijs/langs/rust': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/rust.mjs'),
            '@shikijs/langs/scss': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/scss.mjs'),
            '@shikijs/langs/shellscript': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/shellscript.mjs'),
            '@shikijs/langs/sql': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/sql.mjs'),
            '@shikijs/langs/swift': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/swift.mjs'),
            '@shikijs/langs/toml': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/toml.mjs'),
            '@shikijs/langs/typescript': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/typescript.mjs'),
            '@shikijs/langs/xml': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/xml.mjs'),
            '@shikijs/langs/yaml': rootPath('node_modules/.pnpm/@shikijs+langs@4.4.3/node_modules/@shikijs/langs/dist/yaml.mjs'),
            katex: rootPath('node_modules/.pnpm/katex@0.16.47/node_modules/katex'),
            'mdast-util-from-markdown': rootPath('node_modules/.pnpm/mdast-util-from-markdown@2.0.3_supports-color@9.4.0/node_modules/mdast-util-from-markdown'),
            'mdast-util-gfm': rootPath('node_modules/.pnpm/mdast-util-gfm@3.1.0_supports-color@9.4.0/node_modules/mdast-util-gfm'),
            'mdast-util-math': rootPath('node_modules/.pnpm/mdast-util-math@3.0.0_supports-color@9.4.0/node_modules/mdast-util-math'),
            'micromark-core-commonmark': rootPath('node_modules/.pnpm/micromark-core-commonmark@2.0.3/node_modules/micromark-core-commonmark'),
            'micromark-extension-gfm': rootPath('node_modules/.pnpm/micromark-extension-gfm@3.0.0/node_modules/micromark-extension-gfm'),
            'micromark-extension-math': rootPath('node_modules/.pnpm/micromark-extension-math@3.1.0/node_modules/micromark-extension-math'),
            'micromark-factory-space': rootPath('node_modules/.pnpm/micromark-factory-space@2.0.1/node_modules/micromark-factory-space'),
            'micromark-util-character': rootPath('node_modules/.pnpm/micromark-util-character@2.1.1/node_modules/micromark-util-character'),
            'micromark-util-classify-character': rootPath('node_modules/.pnpm/micromark-util-classify-character@2.0.1/node_modules/micromark-util-classify-character'),
            'micromark-util-sanitize-uri': rootPath('node_modules/.pnpm/micromark-util-sanitize-uri@2.0.1/node_modules/micromark-util-sanitize-uri'),
            'micromark-util-symbol': rootPath('node_modules/.pnpm/micromark-util-symbol@2.0.1/node_modules/micromark-util-symbol'),
          },
        },
        test: {
          name: 'dom18',
          globalSetup: [TMP_SWEEP],
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
          globalSetup: [TMP_SWEEP],
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
        // web-kit closed (2026-09-12, §TEST-17): every gateable file
        // at per-file 100 — catalog/contracts/formats/slots/timeline
        // planes + the five node-safe ui helpers. GUI-debt stays
        // named (the dom project's territory, same carve-out as the
        // 3d/image/motion/video studios): the 44 ui .tsx components,
        // 8 DOM/store/hook ui modules + the ui barrel, the slots
        // rail + react shim, 4 timeline React/canvas modules, the
        // WebGL snapshot renderer — plus the 2 generated carriers
        // (exempt-by-kind).
        'packages/web-kit/ui/src/*.tsx',
        'packages/web-kit/ui/src/clipboard.ts',
        'packages/web-kit/ui/src/listFilter.ts',
        'packages/web-kit/ui/src/motionThumbStore.ts',
        'packages/web-kit/ui/src/posterStore.ts',
        'packages/web-kit/ui/src/toast.ts',
        'packages/web-kit/ui/src/use-hover-scrub.ts',
        'packages/web-kit/ui/src/use-mobile.ts',
        'packages/web-kit/ui/src/index.ts',
        'packages/web-kit/**/src/generated/*',
        'packages/web-kit/slots/src/studioRail.tsx',
        'packages/web-kit/slots/src/vendored/react.tsx',
        'packages/web-kit/timeline/playback/useAudioPlayback.ts',
        'packages/web-kit/timeline/timeline/MotionTimelineBar.tsx',
        'packages/web-kit/timeline/timeline/viser-timeline/Timeline.tsx',
        'packages/web-kit/timeline/timeline/viser-timeline/viewerContext.ts',
        'packages/web-kit/formats/src/renderSnapshot.ts',
        // engines closed (2026-09-12, §TEST-15): every file at
        // per-file 100 — the card/pack/flavor/verb plane, the models
        // DECL service (interlock/facts/addresses/cascade), the
        // engine-IO transport (stub-server battery), catalog/params/
        // supervisor/carddefs. TWO files stay exempt, named: cli.ts +
        // dump-registry.ts — process-boundary modules (self-execute
        // on load AND call process.exit) covered by green subprocess
        // batteries, invisible to the v8 provider by construction
        // (same named-file precedent as mask-studio's agents/tools).
        'packages/engines/comfyui-cordis/src/cli.ts',
        'packages/engines/comfyui-cordis/src/dump-registry.ts',
        // harness closed (2026-09-12, §TEST-16): every file at
        // per-file 100 — the queue core + runs registry/validate/
        // start/list planes + cards/flows/skill/load/manage planes +
        // registries + rails + service/index/resurrect seams. No
        // process-boundary files in the tree: the exemption row is
        // GONE, nothing replaces it.
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
        // audio closed (2026-09-12, §TEST-11): every file at per-file
        // 100x4 — the four card compose gates + the three tool faces
        // (executor batteries) + the index apply arms. No studios in
        // the tree: the exemption row is GONE, nothing replaces it.
        // image closed (2026-09-12, §TEST-14): seven card compose
        // gates (incl. image-edit's 19 firing refusals + the
        // upscale estate-file contract), the image-gen and image-edit
        // tool batteries, the dead-lane agents bundle. ONE file stays
        // exempt, named: mask-studio's agents/tools.ts — the
        // gateway-kill transitional carrier (every lane refuses loud
        // until the Typert remote migration; the draft-mint body is
        // dead-until-live by design, documented at the site).
        'packages/image/mask-studio/src/agents/tools.ts',
        // + the studios (src/ui/** — 28 files) stay GUI-debt: DOM,
        // the dom project's territory, same carve-out as the web tree.
        'packages/image/**/src/ui/**/*.{ts,tsx}',
        // motion closed (2026-09-12, §TEST-12): card compose gate +
        // the tool face's full battery at per-file 100x4. The studio
        // (src/ui/** — MotionExportDialog + the 2.1k-line component)
        // stays GUI-debt: DOM components, the dom project's
        // territory, same carve-out as the web tree.
        'packages/motion/**/src/ui/**/*.{ts,tsx}',
        // + the card packages' CLIENT faces (src/client/** — the
        // ported studio registration + tenants, 2026-09-12): DOM
        // territory, the dom project's specs exercise them; per-file
        // 100 is the HOST plane's gate (card.ts/index.ts stay gated —
        // the seat-probe + lane-gate laws are pinned by unit tests).
        // glb-viewport's WebGL mount is jsdom-impossible by nature.
        'packages/*/*/src/client/**/*.{ts,tsx}',
        // video closed (2026-09-12, §TEST-13): h3-timeline (the four
        // frozen goldens replay byte-level + schema gates + overlay
        // arms) + video-gen (two-family admission) + the tool face's
        // full battery at per-file 100x4. The studio (src/ui/** —
        // 21 files, the timeline editor) stays GUI-debt: DOM, the
        // dom project's territory, same carve-out as the web tree.
        'packages/video/**/src/ui/**/*.{ts,tsx}',
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
