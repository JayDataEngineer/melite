import path from 'node:path'
import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { COVERAGE_BASELINE } from './scripts/coverage-baseline.ts'
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

/** THE BOOT BUDGET, PER PROJECT (see the root comment above).
 *  A vitest project does NOT inherit the root's testTimeout, so the
 *  budget is spread into every project's own config through this
 *  helper. A project added later spreads it too — the budget cannot
 *  be forgotten by omission, which is exactly how it was forgotten
 *  for a year (root-only) and how the pre-commit hook kept bouncing
 *  green trees on 5s timeouts that vanish in isolation. */
const BOOT_BUDGET = { testTimeout: 30_000, hookTimeout: 30_000 } as const;

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
  `${rootPath('packages/image/mask-studio')}/tests/**/*.spec.{ts,tsx}`,
  `${rootPath('packages/3d/img-to-mesh')}/tests/**/*.spec.{ts,tsx}`,
  // anny's spec tree (stroke 89: the studio specs died with the
  // studio — card.spec.ts + index.spec.ts remain, the node lane's
  // compose/index gates for the form card).
  `${rootPath('packages/3d/anny')}/tests/**/*.spec.{ts,tsx}`,
  // the motion studio + client specs (2026-09-16): the motion lane row —
  // same composition-root correction as the trees above (the studio
  // specs ride dom; the node lane keeps motion's *.spec.ts gates).
  `${rootPath('packages/motion/motion')}/tests/**/*.spec.{ts,tsx}`,
  // card-base's own spec tree (hour 14: the mesh stage's decision
  // layer moved here with the component — the preview seam's claim)
  `${rootPath('packages/web/card-base')}/tests/**/*.spec.{ts,tsx}`,
  // the shared timeline package's DOM specs (the generic-tools
  // stroke 2026-09-17: FilmPlayer moved from h3's kit — its spec
  // rides the dom lane beside it; the package's other specs are
  // plain .ts and stay in the node lane via test/**/*.spec.ts).
  `${rootPath('packages/web-kit/timeline')}/test/**/*.spec.tsx`,
]
// The gallery's own tree — React 18, the universe the DSH shell hosts.
const GALLERY_SPEC_TREES = [`${GALLERY}/tests/**/*.spec.{ts,tsx}`]
// The deck's own trees — React 18.3.1, the universe the DSH shell hosts
// for this client (its vitest.config pins jsdom + no aliases: pnpm
// isolation supplies the single React). Riding `dom` would force the
// card-view lane's React 19 aliases onto it (the dual-React trap — an element
// built by 19 rendered by 18), so the deck gets its own universe like
// the gallery. The deck's specs live under test/ (singular — the
// item-8 verifier caught the old plural glob collecting nothing).
const DECK_SPEC_TREES = [
  `${DECK}/test/**/*.spec.{ts,tsx}`,
  `${DECK}/src/client/__tests__/**/*.spec.{ts,tsx}`,
]
const DOM19_SPEC_TREES = DOM_SPEC_TREES.filter((t) => !GALLERY_SPEC_TREES.includes(t))

// THE /TMP OWNERSHIP NET (stroke 13, 2026-09-14): suites mkdtemp
// under tmpdir(); the global sweep reclaims pre-run trees at teardown
// so iterate-run-fix loops can never accumulate a million inodes
// again (tests/global-sweep.ts owns the prefix table).
// CONFIG-ROOT-ABSOLUTE (2026-09-29, the per-package run fix): a bare
// relative join resolves against the INVOKING cwd, so `vitest run`
// from inside a package (pnpm --filter X exec vitest) looked for
// <pkg>/tests/global-sweep.ts and died with ERR_LOAD_URL before a
// single spec loaded — per-package runs were impossible. Resolved
// against THIS config file, the sweep is found from any cwd.
const TMP_SWEEP = fileURLToPath(new URL('./tests/global-sweep.ts', import.meta.url))

export default defineConfig({
  // THE BOOT BUDGET (2026-10-10; CORRECTED 2026-09-28): many suites
  // here mount the real card/model registry — a boot, not a pure
  // function — and the 5s default was sized for the latter. Under a
  // full-suite run (372 files compiling at once, and the pre-commit
  // hook running the whole node project) those boots overrun it and
  // the suite reported timeouts that vanish when the same file runs
  // alone: a wall that fails only under load is worse than no wall,
  // because it trains the reader to re-run instead of read.
  //
  // THE CORRECTION, and it matters: this budget was set HERE, at the
  // root, for a year of commits — and a vitest PROJECT does not
  // inherit the root's testTimeout. Every project below started from
  // the 5s default anyway, which is why the hook kept bouncing green
  // trees on "Test timed out in 5000ms" and the lesson was misread as
  // flakiness. The budget is applied to each project below, through
  // the shared helper, so it is inherited by every one of them (and by
  // any project added later — a new project cannot forget it).
  //
  // 30s is the honest budget for a boot; nothing here takes 30s to
  // fail, and nothing here should be re-run instead of read.
  testTimeout: 30_000,
  hookTimeout: 30_000,
  test: {
    projects: [
      {
        plugins: [standardDecoratorPlugin()],
        ...BOOT_BUDGET,
        resolve: {
          alias: { ...resolutionFacade() },
        },
        test: {
          // the boot budget, INSIDE the project's own test block — a
          // project root that also carries a `test:` field is read from
          // THAT field, so a root-level copy is decoration
          testTimeout: BOOT_BUDGET.testTimeout,
          hookTimeout: BOOT_BUDGET.hookTimeout,
          name: 'node',
          globalSetup: [TMP_SWEEP],
          environment: 'node',
          pool: 'forks',
          execArgv: vitestExecArgv,
          // li-m (the lazy-boot law): models no longer boot at import
          // (the top-level await's deadlock class bricked the
          // estate boot) — the node project's setup awaits the
          // shared boot ONCE per worker, exactly like the estate's
          // cardsRegistry does at its compose seat.
          setupFiles: [PROXY_SETUP],
          // THE ONE-ROW LAW: web-kit's client-plane stores (catalog
          // contract stores) import the card-base ROOT, whose chrome
          // face reaches dsh-client-ui-primitives' .module.css — the
          // same inline the dom/deck projects carry, else node's raw
          // require dies on the css extension.
          server: {
            deps: {
              inline: [/@deepseek-ai\/dsh-client-ui-primitives/],
            },
          },
          include: [
            'packages/*/*/tests/**/*.spec.ts',
            // Singular test/ dirs (melite-tools, card-deck host-routes).
            'packages/*/*/test/**/*.spec.ts',
            'tests/unit/**/*.spec.ts',
            'scripts/**/*.spec.ts',
            'tests/walls/ts/suites/**/*.spec.ts',
            // The 3088 lane harness's analyst walls (tests/lane/): the
            // fixture proof behind the live lane spec's analysis.
            'tests/lane/**/*.spec.ts',
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
        ...BOOT_BUDGET,
        resolve: {
          alias: {
            ...resolutionFacade(),
            // 2026-09-12: the dom universe re-homed from the deleted
            // editor app. React pins at the STORE's matched 19 pair
            // (ONE react for the lane — the dual-React trap), icons
            // and three ride the card-view client's resolution.
            // DERIVED, NOT LITERAL (2026-09-29, the dangling-alias
            // kill): these rows were hardcoded to react@19.2.8 store
            // dirs, and the bump to 19.3.0 left every dom spec file
            // importing react dead at load ("Failed to resolve
            // import \"react\"") — a wall that fails wholesale the
            // moment the lockfile moves. The store copy is resolved
            // from the STUDIO HOST's own link, so the lane rides
            // whatever pnpm actually installed.
            react: realpathSync(path.join(CARD_VIEW, 'node_modules/react')),
            'react-dom': realpathSync(path.join(CARD_VIEW, 'node_modules/react-dom')),
            // the react-dom CLIENT subpath (2026-09-16): motion-motion
            // pins its own React 18 tree, so a bare react-dom/client
            // import escapes the exact-match alias and lands on the
            // nested 18 copy (dual-React trap). The studio host
            // (card-view) is React 19 — the lane pins it at the same
            // 19 copy as its parent (motion specs render through the
            // aliased copy directly; see the motion tests harness).
            'react-dom/client': path.join(realpathSync(path.join(CARD_VIEW, 'node_modules/react-dom')), 'client'),
            'react/jsx-runtime': path.join(realpathSync(path.join(CARD_VIEW, 'node_modules/react')), 'jsx-runtime'),
            // anser: the atoms' rc.2 dist imports this undeclared
            // transitive (editor's tree used to supply it). Pinned at
            // the store copy like the React pair.
            anser: rootPath('node_modules/anser'),
            // simple-icons (2026-09-29, the anser class): the
            // 0.2.0-rc.1 primitives' lib imports it straight from
            // `simple-icons` but the published manifest carries it in
            // devDependencies only, so the store package ships
            // without it and every node-side import of the primitives
            // died at load ("Failed to resolve import"). Root devDep
            // at upstream's own 16.31.0; alias pins the hoisted root
            // path like the React pair.
            'simple-icons': rootPath('node_modules/simple-icons'),
            // shiki: the atoms' rc.2 dist imports these undeclared
            // transitives. 2026-09-14: they are ROOT devDeps now (the
            // editor's orphaned store dirs were untracked truth — a
            // clean reinstall vaporized them); aliases point at the
            // stable hoisted root paths, no .pnpm instance guessing.
            'shiki/core': rootPath('node_modules/shiki/dist/core.mjs'),
            'shiki/engine/javascript': rootPath('node_modules/shiki/dist/engine-javascript.mjs'),
            shiki: rootPath('node_modules/shiki'),
            '@shikijs/langs/c': rootPath('node_modules/@shikijs/langs/dist/c.mjs'),
            '@shikijs/langs/cpp': rootPath('node_modules/@shikijs/langs/dist/cpp.mjs'),
            '@shikijs/langs/csharp': rootPath('node_modules/@shikijs/langs/dist/csharp.mjs'),
            '@shikijs/langs/css': rootPath('node_modules/@shikijs/langs/dist/css.mjs'),
            '@shikijs/langs/go': rootPath('node_modules/@shikijs/langs/dist/go.mjs'),
            '@shikijs/langs/html': rootPath('node_modules/@shikijs/langs/dist/html.mjs'),
            '@shikijs/langs/ini': rootPath('node_modules/@shikijs/langs/dist/ini.mjs'),
            '@shikijs/langs/java': rootPath('node_modules/@shikijs/langs/dist/java.mjs'),
            '@shikijs/langs/json': rootPath('node_modules/@shikijs/langs/dist/json.mjs'),
            '@shikijs/langs/kotlin': rootPath('node_modules/@shikijs/langs/dist/kotlin.mjs'),
            '@shikijs/langs/less': rootPath('node_modules/@shikijs/langs/dist/less.mjs'),
            '@shikijs/langs/lua': rootPath('node_modules/@shikijs/langs/dist/lua.mjs'),
            '@shikijs/langs/markdown': rootPath('node_modules/@shikijs/langs/dist/markdown.mjs'),
            '@shikijs/langs/mdx': rootPath('node_modules/@shikijs/langs/dist/mdx.mjs'),
            '@shikijs/langs/php': rootPath('node_modules/@shikijs/langs/dist/php.mjs'),
            '@shikijs/langs/python': rootPath('node_modules/@shikijs/langs/dist/python.mjs'),
            '@shikijs/langs/ruby': rootPath('node_modules/@shikijs/langs/dist/ruby.mjs'),
            '@shikijs/langs/rust': rootPath('node_modules/@shikijs/langs/dist/rust.mjs'),
            '@shikijs/langs/scss': rootPath('node_modules/@shikijs/langs/dist/scss.mjs'),
            '@shikijs/langs/shellscript': rootPath('node_modules/@shikijs/langs/dist/shellscript.mjs'),
            '@shikijs/langs/sql': rootPath('node_modules/@shikijs/langs/dist/sql.mjs'),
            '@shikijs/langs/swift': rootPath('node_modules/@shikijs/langs/dist/swift.mjs'),
            '@shikijs/langs/toml': rootPath('node_modules/@shikijs/langs/dist/toml.mjs'),
            '@shikijs/langs/typescript': rootPath('node_modules/@shikijs/langs/dist/typescript.mjs'),
            '@shikijs/langs/xml': rootPath('node_modules/@shikijs/langs/dist/xml.mjs'),
            '@shikijs/langs/yaml': rootPath('node_modules/@shikijs/langs/dist/yaml.mjs'),
            katex: rootPath('node_modules/katex'),
            'mdast-util-from-markdown': rootPath('node_modules/mdast-util-from-markdown'),
            'mdast-util-gfm': rootPath('node_modules/mdast-util-gfm'),
            'mdast-util-math': rootPath('node_modules/mdast-util-math'),
            'micromark-core-commonmark': rootPath('node_modules/micromark-core-commonmark'),
            'micromark-extension-gfm': rootPath('node_modules/micromark-extension-gfm'),
            'micromark-extension-math': rootPath('node_modules/micromark-extension-math'),
            'micromark-factory-space': rootPath('node_modules/micromark-factory-space'),
            'micromark-util-character': rootPath('node_modules/micromark-util-character'),
            'micromark-util-classify-character': rootPath('node_modules/micromark-util-classify-character'),
            'micromark-util-sanitize-uri': rootPath('node_modules/micromark-util-sanitize-uri'),
            'micromark-util-symbol': rootPath('node_modules/micromark-util-symbol'),
            // The gateway's client face is a module-loader artifact
            // (window.__ModuleLoader__.load — it only executes inside
            // the DSH web shell). The browser bundle externalizes it
            // through the manifest dsh.client.external seam; specs
            // resolve this stand-in carrying the one runtime value
            // cards-resource.ts imports (RemoteStreamCarrierError).
            // Types come from the real package at typecheck time.
            '@deepseek-ai/dsh-api-gateway/client': rootPath('packages/web/melite-card-view/tests/fixtures/gateway-client.ts'),
            'lucide-react': path.join(CARD_VIEW, 'node_modules/lucide-react'),
            'three/addons': path.join(CARD_VIEW, 'node_modules/three/examples/jsm'),
            'three/examples': path.join(CARD_VIEW, 'node_modules/three/examples'),
            three: path.join(CARD_VIEW, 'node_modules/three')
          },
        },
        test: {
          // the boot budget, INSIDE the project's own test block — a
          // project root that also carries a `test:` field is read from
          // THAT field, so a root-level copy is decoration
          testTimeout: BOOT_BUDGET.testTimeout,
          hookTimeout: BOOT_BUDGET.hookTimeout,
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
        ...BOOT_BUDGET,
        resolve: {
          alias: {
            ...resolutionFacade(),
            react: path.join(GALLERY, 'node_modules/react'),
            'react-dom': path.join(GALLERY, 'node_modules/react-dom'),
            'react/jsx-runtime': path.join(GALLERY, 'node_modules/react/jsx-runtime'),
            // anser: the atoms' rc.2 dist imports this undeclared
            // transitive (editor's tree used to supply it). Pinned at
            // the store copy like the React pair.
            anser: rootPath('node_modules/anser'),
            // shiki: the atoms' rc.2 dist imports these undeclared
            // transitives (the editor's tree used to supply them).
            'shiki/core': rootPath('node_modules/shiki/dist/core.mjs'),
            'shiki/engine/javascript': rootPath('node_modules/shiki/dist/engine-javascript.mjs'),
            shiki: rootPath('node_modules/shiki'),
            '@shikijs/langs/c': rootPath('node_modules/@shikijs/langs/dist/c.mjs'),
            '@shikijs/langs/cpp': rootPath('node_modules/@shikijs/langs/dist/cpp.mjs'),
            '@shikijs/langs/csharp': rootPath('node_modules/@shikijs/langs/dist/csharp.mjs'),
            '@shikijs/langs/css': rootPath('node_modules/@shikijs/langs/dist/css.mjs'),
            '@shikijs/langs/go': rootPath('node_modules/@shikijs/langs/dist/go.mjs'),
            '@shikijs/langs/html': rootPath('node_modules/@shikijs/langs/dist/html.mjs'),
            '@shikijs/langs/ini': rootPath('node_modules/@shikijs/langs/dist/ini.mjs'),
            '@shikijs/langs/java': rootPath('node_modules/@shikijs/langs/dist/java.mjs'),
            '@shikijs/langs/json': rootPath('node_modules/@shikijs/langs/dist/json.mjs'),
            '@shikijs/langs/kotlin': rootPath('node_modules/@shikijs/langs/dist/kotlin.mjs'),
            '@shikijs/langs/less': rootPath('node_modules/@shikijs/langs/dist/less.mjs'),
            '@shikijs/langs/lua': rootPath('node_modules/@shikijs/langs/dist/lua.mjs'),
            '@shikijs/langs/markdown': rootPath('node_modules/@shikijs/langs/dist/markdown.mjs'),
            '@shikijs/langs/mdx': rootPath('node_modules/@shikijs/langs/dist/mdx.mjs'),
            '@shikijs/langs/php': rootPath('node_modules/@shikijs/langs/dist/php.mjs'),
            '@shikijs/langs/python': rootPath('node_modules/@shikijs/langs/dist/python.mjs'),
            '@shikijs/langs/ruby': rootPath('node_modules/@shikijs/langs/dist/ruby.mjs'),
            '@shikijs/langs/rust': rootPath('node_modules/@shikijs/langs/dist/rust.mjs'),
            '@shikijs/langs/scss': rootPath('node_modules/@shikijs/langs/dist/scss.mjs'),
            '@shikijs/langs/shellscript': rootPath('node_modules/@shikijs/langs/dist/shellscript.mjs'),
            '@shikijs/langs/sql': rootPath('node_modules/@shikijs/langs/dist/sql.mjs'),
            '@shikijs/langs/swift': rootPath('node_modules/@shikijs/langs/dist/swift.mjs'),
            '@shikijs/langs/toml': rootPath('node_modules/@shikijs/langs/dist/toml.mjs'),
            '@shikijs/langs/typescript': rootPath('node_modules/@shikijs/langs/dist/typescript.mjs'),
            '@shikijs/langs/xml': rootPath('node_modules/@shikijs/langs/dist/xml.mjs'),
            '@shikijs/langs/yaml': rootPath('node_modules/@shikijs/langs/dist/yaml.mjs'),
            katex: rootPath('node_modules/katex'),
            'mdast-util-from-markdown': rootPath('node_modules/mdast-util-from-markdown'),
            'mdast-util-gfm': rootPath('node_modules/mdast-util-gfm'),
            'mdast-util-math': rootPath('node_modules/mdast-util-math'),
            'micromark-core-commonmark': rootPath('node_modules/micromark-core-commonmark'),
            'micromark-extension-gfm': rootPath('node_modules/micromark-extension-gfm'),
            'micromark-extension-math': rootPath('node_modules/micromark-extension-math'),
            'micromark-factory-space': rootPath('node_modules/micromark-factory-space'),
            'micromark-util-character': rootPath('node_modules/micromark-util-character'),
            'micromark-util-classify-character': rootPath('node_modules/micromark-util-classify-character'),
            'micromark-util-sanitize-uri': rootPath('node_modules/micromark-util-sanitize-uri'),
            'micromark-util-symbol': rootPath('node_modules/micromark-util-symbol'),
          },
        },
        test: {
          // the boot budget, INSIDE the project's own test block — a
          // project root that also carries a `test:` field is read from
          // THAT field, so a root-level copy is decoration
          testTimeout: BOOT_BUDGET.testTimeout,
          hookTimeout: BOOT_BUDGET.hookTimeout,
          name: 'dom18',
          globalSetup: [TMP_SWEEP],
          environment: 'jsdom',
          pool: 'forks',
          execArgv: vitestExecArgv,
          // the lane's DOM-observer seat (li-bp's dom-lane repair):
          // the DSH Tooltip primitive instantiates ResizeObserver on
          // open — jsdom ships none, so the wand's focus test was a
          // latent red behind the dead load. Same honest shapes
          // card-view's setup documents.
          setupFiles: [PROXY_SETUP, `${GALLERY}/tests/setup.ts`],
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
        ...BOOT_BUDGET,
        resolve: {
          alias: {
            ...resolutionFacade(),
            react: path.join(DECK, 'node_modules/react'),
            'react-dom': path.join(DECK, 'node_modules/react-dom'),
            'react/jsx-runtime': path.join(DECK, 'node_modules/react/jsx-runtime'),
          },
        },
        test: {
          // the boot budget, INSIDE the project's own test block — a
          // project root that also carries a `test:` field is read from
          // THAT field, so a root-level copy is decoration
          testTimeout: BOOT_BUDGET.testTimeout,
          hookTimeout: BOOT_BUDGET.hookTimeout,
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
        // web (stroke 77 — the GUI-debt gate expansion): the blanket
        // row is GONE; the burn-down restored every web file to
        // per-file 100 except these NAMED residuals (proofs at the
        // sites / in the burn-down reports): the two WebGL stage
        // mounts, the view tree's induction/timing arms, the
        // gallery/deck drift arms, the one type-required ?? branch,
        // and the vacuous invariant (zero statements).
        'packages/web/card-base/src/glb-stage.tsx',
        'packages/web/card-base/src/stage3d.ts',
        'packages/web/melite-card-view/src/client/CardsTab.tsx',
        'packages/web/melite-card-view/src/client/FlowCards.tsx',
        'packages/web/melite-card-view/src/client/zoom.tsx',
        'packages/web/melite-card-view/src/client/draft.ts',
        'packages/web/infer-gallery/src/client/MediaPanel.tsx',
        'packages/web/infer-gallery/src/index.ts',
        'packages/web/melite-card-deck/src/client/assets-tab.tsx',
        'packages/web/viewer-base/src/runCard.tsx',
        // §TEST-20 CLOSED (2026-09-15, strokes 70-73): the 26-file
        // estate-plane triage is BURNED DOWN — every file restored
        // to per-file 100x4 with honest behavioral arms (the ledger
        // rows carry the proofs). One permanent exemption remains,
        // documented below (loadPlane's prod-only degrade catch).
        // vendored (Layer C law: not ours to test):
        'packages/vendor/typert-protocol/src/index.ts',
        'packages/vendor/typert-protocol/src/remote-error.ts',
                // card compose/kit fallback branches:
                                        // cordis service-plane error arms (api failures, enhance
        // fallbacks, spec sweeps):
        // the estate HTTP plane's rare-error arms:
                                // registry/sweep branches:
                // PERMANENT EXEMPTION (2026-09-15, stroke 73 — the ledger
        // owns the exempt debt): loadPlane.ts:294-297 is a REAL prod
        // degrade (engine down AND card plane never booted →
        // theService() throws → pack_hints [] instead of a load
        // crash) that NO test process can reach: the package index's
        // top-level `await cascadeInit` boots the card plane before
        // any spec body runs and exports no reset. Deleting the
        // catch would remove the degrade; mocking is forbidden.
        // Everything else in the file is covered (98.72/100/95.65/99.24).
        'packages/harness/estate-queue/src/loadPlane.ts',
        // the door sweep's rare failure paths (form-spec/doors arms
        // added strokes 66-69 are pinned; the pre-existing arms ride
        // this triage):
                                                                        // web-kit closed (2026-09-12, §TEST-17): every gateable file
        // at per-file 100 — catalog/contracts/formats/slots/timeline
        // planes + the five node-safe ui helpers. The ui/slots/
        // timeline trees measured 100x4 in the stroke-77 lifted
        // census (the dom specs already cover them) — their rows are
        // TRIMMED, the gate owns them now. ONE file stays named:
        // the WebGL snapshot renderer (renderSnapshot.ts).
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
        // tool face). The STUDIOS stayed GUI-debt until stroke 89
        // (2026-09-17): anny's studio + client faces are DELETED —
        // the card is a schema form through the base constructor;
        // img-to-mesh's studio remains the tree's one carve-out.
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
        // image (stroke 77): mask-studio's paint-leaf face +
        // paintInk's panels/canvas/controls/helpers/
        // slot ride the gate at 100; ONE residual stays named.
        // motion studio CLOSED (2026-09-16, motion lane): the studio
        // (src/ui/** — kit + every helper ride the gate at 100; the
        // 2.1k-line component + the export dialog stay NAMED below
        // — WebGL live-ctx / rigged-GLB / unmount-timing arms, the
        // per-arm proofs live in the stroke-77 burn-down report).
        // + the card packages' CLIENT faces (src/client/** — the
        // ported studio registration + tenants, 2026-09-12): DOM
        // territory, the dom project's specs exercise them; per-file
        // 100 is the HOST plane's gate (card.ts/index.ts stay gated —
        // the seat-probe + lane-gate laws are pinned by unit tests).
        // glb-viewport's WebGL mount is jsdom-impossible by nature.
        // the card packages' CLIENT faces (stroke 77): h3/anny/
        // img-to-mesh/card-view clients ride the gate at 100 (the
        // view client unblocked by the drafts remote-subpath alias);
        // TWO residuals stay named.
        'packages/motion/motion/src/client/index.ts',
        // video CLOSED (stroke 77): the h3 studio tree rides the
        // gate at per-file 100 (342 tests, h3-timeline/tests/studio-*)
        // — the blanket row is GONE, nothing replaces it.
        'packages/motion/motion/src/ui/studio/component.tsx',
        'packages/motion/motion/src/ui/studio/MotionExportDialog.tsx',
        // Types-only files carry no executable code.
        'packages/*/*/src/types.ts',
        // The z-image family has no mods dir (absent ≡ empty) — its
        // index.ts carries the same DECL + family shape as every other
        // family and is covered by the same HMR spec; keep it gated
        // (do NOT exempt). This comment records the deliberate non-exempt.
      ],
      // THE PER-FILE BASELINE (2026-10-12, the gate's tree debt).
      // The four global metric keys are GONE on purpose: vitest's
      // global threshold set covers every collected file EVEN IF a
      // glob row also matches it, so a global 100 can never be
      // relaxed by a per-file floor — it would simply re-fail every
      // baselined file. scripts/coverage-baseline.ts therefore
      // carries one row per gated file at its MEASURED number (86
      // files below 100, 212 threshold errors, measured on
      // 00c4615d), which keeps every gated file checked, makes a
      // coverage drop fail, and lets a too-high floor announce
      // itself. The ratchet law lives with the table.
      thresholds: {
        perFile: true,
        ...COVERAGE_BASELINE,
      },
      reporter: process.env.CI
        ? ['text', uncoveredLocationsReporter]
        : ['text', 'html', uncoveredLocationsReporter],
    },
  },
})
