/**
 * Shared tsdown preset for UI plugin client bundles — the single source of
 * truth for every dsh-web-ui plugin's build (previously copied per-package
 * from the DSH checkout's `packages/client/tsdown.client.ts`). Emits a
 * closure-factory artifact: the bundle calls window.__ModuleLoader__.load
 * ({id, factory}) and resolves externals through the injected require
 * (loader module table — cordis DI entities, no globals, no import map).
 * CSS Modules are compiled by lightningcss inside the bundle: importing
 * `x.module.css` yields the hashed class map, and the css text auto-injects
 * a <style data-plugin="<id>"> tag at factory execution (the loader removes
 * plugin-owned tags on unload). The virtual loader registers each real
 * stylesheet as a watch dependency. The platform module list mirrors the
 * shell's seed table in `./web-platform.ts`.
 */
import { readFile } from 'node:fs/promises'
import { existsSync, realpathSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, dirname, isAbsolute, relative, resolve as resolvePath, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { UserConfig } from 'tsdown'
// Relative, not bare: this shared config lives OUTSIDE any package
// (packages/web/shared has no node_modules), so workspace links are
// unresolvable from here — the repo-internal source path is the one
// spelling both node and bun resolve.
import { transform } from 'lightningcss'
import { PLATFORM_MODULES } from './web-platform.ts'

/**
 * Virtual-id wrapper keeping module CSS away from tsdown's own css flow
 * (which requires @tsdown/css). The suffix matters: tsdown's guard matches ids
 * ending in `.css`, so the virtual id must not.
 */
const CSS_VIRTUAL_PREFIX = '\0dsh-css:'
const CSS_VIRTUAL_SUFFIX = '.mjs'

/**
 * Wire/type layers a client bundle may inline: browser-safe contract surfaces
 * with no runtime identity to share (no Symbol/instanceof/singleton state).
 * Everything else under @deepseek-ai/* is either a module-table entry
 * (external) or a leak the purity gate rejects.
 *
 * dsh-typert-protocol (2026-09-10, the cards tab): the RemoteError class
 * is a per-bundle copy BY DESIGN — discrimination is by `code` plus the
 * structural isDSHRemoteError marker, never instanceof (the class's own
 * docstring). Five shipped DSH client bundles (documentpreview, the api-*
 * faces, file-upload) inline it; our preset's list predated that.
 *
 * dsh-util-values (2026-10-12, card-base's activeRecipeId): a
 * zero-dependency pure-function library (deepEqualJson and kin) with no
 * runtime identity to share — upstream ships it under packages/util/
 * precisely as the browser-safe utility tier the client rules name.
 */
const INLINE_SAFE = /^@deepseek-ai\/dsh-(host-apiproxy|session|llm|tools|brand|typert-protocol|util-values)(\/|$)/

/** Generated descriptor/codec contribution with no shared runtime identity. */
const GENERATED_REMOTE = /^@deepseek-ai\/dsh-[a-z0-9]+(?:-[a-z0-9]+)*\/remote$/

/**
 * Workspace mode replaces an empty config array with the root defaults. A
 * falsey entry instead removes this package before entry resolution.
 */
const SKIP_WORKSPACE_BUILD: UserConfig = { entry: '' }

/** Externals resolved from the loader module table: the platform seed entries. */
const CLIENT_EXTERNALS: readonly string[] = PLATFORM_MODULES

// packages/web/shared/ -> repository root (three levels up), so
// rebasing covers every package tree, not just packages/web/
const REPOSITORY_ROOT = fileURLToPath(new URL('../../../', import.meta.url))

/** Rebase a physical path onto a repository-relative id when it lives under the repo. */
function repositoryRelativePath(physical: string): string {
  if (!isAbsolute(physical)) return physical
  const repositoryPath = relative(REPOSITORY_ROOT, physical).split(sep).join('/')
  return repositoryPath.startsWith('../') ? physical : repositoryPath
}

/** Rebase a physical lib-relative source onto a browser URL that mirrors the repository directories. */
function browserSourcePath(source: string, sourcemapPath: string): string {
  if (!source.startsWith('.')) return source
  const physicalSource = resolvePath(dirname(sourcemapPath), source)
  const repositoryPath = relative(REPOSITORY_ROOT, physicalSource).split(sep).join('/')
  return repositoryPath.startsWith('packages/') ? `../../../${repositoryPath}` : source
}

/**
 * Build the tsdown config for one UI plugin package: the node-half lib build
 * plus the browser client bundle. Client packages emit both halves during the
 * Client pass by default; packages needed for Host reflection may opt into the
 * earlier Host pass. A package-level tsdown.config.ts REPLACES the root
 * workspace layout, so the lib half must be restated here — dropping it leaves
 * the package without lib/index.js and the host Loader cannot import its node
 * half.
 * @param id - plugin id (package name), stamped into the __ModuleLoader__.load
 * handoff and onto the injected style tags.
 * @param libEntry - node-half entries, spelled at the call site so the
 * package-invariants gate can see `src/invariant.ts` (or the tsc emit path) in
 * each package's own tsdown.config.ts.
 * @param options - phase placement, lib overrides, companion Node configs.
 * @returns ENV-selected tsdown config for the current build face.
 */
export function clientBundle(
  id: string,
  libEntry: readonly string[],
  options: ClientBundleOptions = {},
): BuildFaceConfig {
  const lib = clientLibraryConfig(id, libEntry, options.lib, options.libExternal)
  return ({ env }) => {
    const face = buildFace(env?.DSH_BUILD_FACE)
    // Host-only plugins (no src/client entry) skip the browser face entirely.
    const hasClient = existsSync(resolvePath(process.cwd(), 'src/client/index.ts'))
    const client = hasClient ? clientConfig(id, face === undefined
      ? 'src/client/index.ts'
      : 'lib/types/client/index.js') : undefined
    const node = [lib, ...(options.companions ?? [])]
    // ONE BUILDER PER PLANE (this repo's layout adjustment over the DSH
    // copy): every workspace package's node half is the tsc plane —
    // tools/build-plane.mjs emits and owns lib/**, the battery's lib-sync
    // arm rebuilds it, and a second builder claiming the same files
    // oscillates the drift check (a bare `tsdown` rewrote six tracked
    // lib/index.js files on 2026-10-13). A package WITH a client face
    // builds ONLY lib/client.js here, from source (rolldown compiles the
    // TS directly) — img-to-mesh's hand comment "the node-half lib output
    // is pruned" is this law, automatic now. hostPhase callers (the DSH
    // monorepo phase pipeline) keep the full matrix below.
    if (options.hostPhase !== true && client !== undefined) return [client]
    if (face === 'host') return options.hostPhase === true ? node : [SKIP_WORKSPACE_BUILD]
    if (face === 'client') return options.hostPhase === true ? (client ? [client] : []) : (client ? [...node, client] : node)
    return client ? [...node, client] : node
  }
}

/**
 * The standalone mobile page bundle (served by the plugin's own route). It
 * boots WITHOUT the main UI's module loader, so everything — React, zod, the
 * harness wire contracts — is inlined into one self-contained module script.
 * The page talks to the host through plain fetch/WebSocket over /api.
 * @param id - plugin id (package name), used in tsdown diagnostics.
 * @param entry - the mobile page entry (e.g. `src/mobile/index.tsx`).
 * @returns a fully self-contained browser bundle config.
 */
export function mobileBundle(id: string, entry: string): UserConfig {
  const mobileRequire = createRequire(import.meta.url)
  return {
    name: `${id}/mobile`,
    entry: { mobile: entry },
    outDir: 'lib',
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    dts: false,
    sourcemap: true,
    clean: false,
    // Fully self-contained: no externals, no module table.
    external: [],
    noExternal: [/.*/],
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
      'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV ?? 'production'),
      'import.meta.env': JSON.stringify({ MODE: process.env.NODE_ENV ?? 'production' }),
    },
    plugins: [{
      // Wire contracts resolve through node_modules (the exports map lands on
      // the real runtime values) instead of the tsconfig paths' declaration
      // files, which would miss every value export.
      name: 'dsh-mobile-value-resolution',
      resolveId(source: string) {
        const match = /^@deepseek-ai\/dsh-host-apiproxy\/api(?:\/.*)?$/.exec(source)
        if (match === null) return null
        try {
          return mobileRequire.resolve(source)
        } catch {
          return null
        }
      },
    }],
    outputOptions: {
      entryFileNames: 'mobile.js',
    },
  }
}

interface ClientBundleOptions {
  /** Emit the Node-side artifacts during the Host pass instead of the Client pass. */
  readonly hostPhase?: boolean
  /** Additional Node-side configs emitted alongside the package library. */
  readonly companions?: readonly UserConfig[]
  /** Overrides for the package's primary Node-side library config. */
  readonly lib?: UserConfig
  /** Extra Node-side externals (in addition to the default cordis entry). */
  readonly libExternal?: readonly (string | RegExp)[]
}

type BuildFace = 'host' | 'client' | undefined

type BuildFaceConfig = (inlineConfig: Pick<UserConfig, 'env'>) => UserConfig[]

function buildFace(value: unknown): BuildFace {
  if (value === undefined || value === 'host' || value === 'client') return value
  throw new Error(`tsdown: --env.DSH_BUILD_FACE must be host or client, received ${String(value)}`)
}

function clientLibraryConfig(
  id: string,
  libEntry: readonly string[],
  overrides: UserConfig = {},
  extraExternal: readonly (string | RegExp)[] = [],
): UserConfig {
  return {
    name: id,
    entry: [...libEntry],
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: false,
    // The cordis framework resolves at runtime from the dsh profile tree, never
    // from this repo's install; its built declarations carry .ts-suffixed
    // relative imports rolldown cannot follow, so the import must stay
    // external (the same stance as the peer APIs above).
    external: ['@deepseek-ai/cordis', ...extraExternal],
    ...overrides,
  }
}

/** Read one plugin's `dsh.client.external` manifest rows (DSH's
 *  plugin-build law, references workspace-controller's dsh block):
 *  modules the shell's runtime registry provides at plugin load —
 *  shell-side assemblies (dsh-api-gateway's client service is a
 *  loader-format artifact) a plugin bundle must NOT inline, only
 *  require. The workspace-controller declares exactly this seam for
 *  '@deepseek-ai/dsh-api-gateway/client' (RemoteStreamCarrierError +
 *  ClientRemote); the estate's cards tab consumes the same seam for
 *  the bench stream. A missing manifest or field externalizes
 *  nothing.
 * @param id - plugin package name whose manifest is read (cwd).
 * @returns the declared external specifiers, in declaration order. */
function manifestClientExternal(id: string): readonly string[] {
  const manifestPath = resolvePath(process.cwd(), 'package.json')
  if (!existsSync(manifestPath)) return []
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    name?: string
    dsh?: { client?: { external?: unknown } }
  }
  if (manifest.name !== id || !Array.isArray(manifest.dsh?.client?.external)) return []
  const rows = manifest.dsh.client.external.filter((row): row is string => typeof row === 'string')
  return rows
}

function clientConfig(id: string, entry: string): UserConfig {
  // MANIFEST EXTERNALS ride the browser bundle (see
  // manifestClientExternal for the law).
  const manifestExternal = manifestClientExternal(id)
  return {
    name: `${id}/client`,
    entry: { client: entry },
    // Browser bundle lands next to the node half (single lib/ artifact dir;
    // the entryFileNames pin keeps it exactly lib/client.js). clean must stay
    // off — a default clean would wipe the node-half output emitted above.
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    // SINGLE-FILE LAW (2026-09-11, the 1:1 flow port): the loader
    // materializes ONE client artifact (lib/client.js) against the
    // frozen module table — secondary chunks (rolldown splits on
    // dynamic imports, e.g. @melite/catalog's lazy FlowProtocol
    // probes) are unfetchable by the platform loader and the plugin
    // dies at boot ("missed the module table"). Inline every dynamic
    // import into the one bundle.

    // Types ship from lib/types (tsc); dts here would wrap the banner/footer into .d.cts and break parsing.
    dts: false,
    // Plugin code is fetched outside Vite's module graph, so its own bundle
    // must carry the TS/TSX mapping consumed by browser profiling tools.
    sourcemap: true,
    clean: false,
    external: [...CLIENT_EXTERNALS, ...manifestExternal],
    // Browser bundles inline node-idiom deps (zustand/immer read
    // process.env.NODE_ENV; zustand's esm build also probes
    // import.meta.env.MODE, which a CJS output cannot carry — rolldown flags
    // EMPTY_IMPORT_META). vite defined both on the seed path; tsdown inlining
    // needs the substitutions here or the factory throws ReferenceError at
    // boot / the build gate reds. Both keys honor the build's NODE_ENV so a
    // dev build keeps the dev-branch semantics; artifacts default to production.
    // The bare `import.meta.env` key is required alongside the precise MODE
    // key: zustand probes `import.meta.env ? import.meta.env.MODE : ...`, and
    // the truthiness probe would otherwise survive as an empty import.meta.
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
      'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV ?? 'production'),
      'import.meta.env': JSON.stringify({ MODE: process.env.NODE_ENV ?? 'production' }),
    },
    // tsdown auto-externalizes package dependencies; anything NOT in the
    // loader module table must inline instead (wire/type layers, zod, clsx —
    // every non-shared dep). A require() the table cannot answer is a
    // guaranteed runtime throw, so the rule is the table list itself: no
    // opinion for table entries (external above wins), bundle everything else.
    noExternal: (id: string) => (CLIENT_EXTERNALS.includes(id) ? undefined : true),
    plugins: [
      {
        // THE TYPE-TWIN REROUTE (source plane vs artifact plane, the
        // bundle-build law): the consumer's tsconfig paths resolve
        // workspace specifiers to SRC declaration twins (the testing
        // law — static gates resolve to src), but a value import the
        // bundle inlines needs the RUNTIME artifact. When default
        // resolution lands on a .d.ts (e.g. the typert remotes:
        // @melite/estate-<x>/remote -> src/typert.remote-client.d.ts),
        // reroute to the sibling runtime artifact — same directory, or
        // the lib/ twin the package's exports map serves. A .d.ts with
        // NO runtime twin is a type-only export: the import must carry
        // `import type`, and the loud throw below names it.
        name: 'dsh-client-type-twin-reroute',
        async resolveId(source, importer, options) {
          if (!source.startsWith('@melite/')) return null
          const resolved = await this.resolve(source, importer, { ...options, skipSelf: true })
          if (resolved === null || !resolved.id.endsWith('.d.ts')) return null
          const sameDir = resolved.id.replace(/\.d\.ts$/u, '.js')
          const libTwin = resolved.id.replace(/\/src\//u, '/lib/').replace(/\.d\.ts$/u, '.js')
          const twin = [sameDir, libTwin].find((candidate) => existsSync(candidate))
          if (twin === undefined) {
            throw new Error(
              `tsdown: ${source} resolves to the declaration twin ${resolved.id} with no runtime artifact — a type-only export must be imported with \`import type\``,
            )
          }
          return twin
        },
      },
      {
      // THE TRAILING-NEWLINE LAW (the repo convention: a file ends
      // with exactly one trailing newline). Rolldown appends the
      // sourcemap comment AFTER renderChunk, so the guarantee
      // belongs on the WRITTEN file: until 2026-10-12 the stamp
      // plugin's own trailing newline supplied it, and with the
      // stamp deleted seven tracked bundles ended mid-token. It
      // lives HERE, in the build, so no bundle regresses by
      // omission.
      name: 'dsh-client-trailing-newline',
      writeBundle(options, bundle) {
        const dir = (options as { dir?: string }).dir ?? 'lib'
        for (const chunk of Object.values(bundle)) {
          if (chunk.type !== 'chunk') continue
          // fileName is relative to the OUTPUT dir (lib/).
          const file = resolvePath(process.cwd(), dir, chunk.fileName)
          if (!existsSync(file)) continue
          let code = readFileSync(file, 'utf8')
          // STORE-PATH NORMALIZATION (GT6-08 follow-up, 2026-10-13):
          // rolldown stamps module ids and sourcemap sources with the
          // writer's pnpm store layout (`node_modules/.pnpm/<pkg>@<ver>/
          // node_modules/<pkg>/…`) — an exact-version machine path in a
          // TRACKED artifact the dangling-store-path wall refuses (and
          // two stores would emit different bytes for one truth). The
          // normal form is package-relative: the store segment collapses
          // to the package name. Applied to the written file AND its map
          // sibling, whose sources carry the same layout.
          code = code.replaceAll(
            /node_modules\/\.pnpm\/[^/"']+\/node_modules\//gu,
            '',
          )
          const mapFile = file + '.map'
          if (existsSync(mapFile)) {
            const map = readFileSync(mapFile, 'utf8').replaceAll(
              /node_modules\/\.pnpm\/[^/"']+\/node_modules\//gu,
              '',
            )
            if (map !== readFileSync(mapFile, 'utf8')) writeFileSync(mapFile, map)
          }
          if (!code.endsWith('\n')) code += '\n'
          writeFileSync(file, code)
        }
      },
    }, {
      // SINGLE-FILE LAW (the rolldown-native hook — the tsdown
      // config key proved unreliable to pass through): no secondary
      // chunks, ever; every dynamic import inlines into client.js.
      name: 'dsh-client-single-file',
      outputOptions(options) {
        return { ...options, codeSplitting: false }
      },
    }, {
      // Bundle purity gate (build-time mirror of the module-edge rules):
      // platform seed entries stay external, inline-safe wire layers inline,
      // and every other @deepseek-ai value import is a build error — a
      // cross-plugin value import either inlines a duplicate runtime instance
      // or requires a specifier the frozen module table cannot answer.
      // Cross-plugin collaboration goes through cordis services instead.
      name: 'dsh-client-bundle-purity',
      resolveId(source: string) {
        if (!source.startsWith('@deepseek-ai/')) return null
        if (CLIENT_EXTERNALS.includes(source)) return null // platform module: external wins
        if (INLINE_SAFE.test(source) || GENERATED_REMOTE.test(source)) return null // wire contribution: inline is the point
        throw new Error(
          `client bundle purity: "${source}" is not a platform module (CLIENT_EXTERNALS), an inline-safe wire layer, or a generated /remote contribution — `
          + 'cross-plugin value imports are forbidden; collaborate through cordis services (type-only imports are erased and never reach this gate)',
        )
      },
    }, {
      name: 'dsh-css-modules-inline',
      resolveId(source: string, importer: string | undefined) {
        if (!source.endsWith('.module.css')) return null
        const abs = importer !== undefined ? sourceAssetPath(source, importer) : source
        // Repo-relative virtual id: the emitted `//#region` comments would
        // otherwise embed each builder's machine path, churning every
        // committed lib/client.js when another machine rebuilds.
        return CSS_VIRTUAL_PREFIX + repositoryRelativePath(abs) + CSS_VIRTUAL_SUFFIX
      },
      async load(virtualId: string) {
        if (!virtualId.startsWith(CSS_VIRTUAL_PREFIX)) return null
        let fileId = virtualId.slice(CSS_VIRTUAL_PREFIX.length, -CSS_VIRTUAL_SUFFIX.length)
        // Rebase the repo-relative id back onto the physical stylesheet; the
        // virtual id otherwise hides it from Rolldown's watch graph.
        let physical = isAbsolute(fileId) ? fileId : resolvePath(REPOSITORY_ROOT, fileId)
        this.addWatchFile(physical)
        // CANONICALIZE (2026-09-12 — the silent-drop fix): one stylesheet
        // reached the loader through TWO path spellings (symlinked workspace
        // import vs direct relative), producing TWO class-hash families
        // (e.g. FRpSCG_* and vYZV7a_*) from one source file — and the two
        // injector sites shared ONE tagId (same basename), so the
        // querySelector guard silently DROPPED the second stylesheet
        // wholesale: entire component families rendered with zero rules.
        // realpath collapses every spelling to the one physical file; the
        // repo-relative id derived from IT is the single hash input.
        const real = realpathSync(physical)
        if (real !== physical) this.addWatchFile(real)
        physical = real
        const canonical = repositoryRelativePath(real)
        if (canonical !== fileId) fileId = canonical
        const source = await readFile(physical)
        const { code, exports: cssExports } = transform({
          // Repo-relative filename: lightningcss's [hash] placeholder mixes
          // the filename in, so an absolute path would yield machine-dependent
          // class names on top of the region-comment noise.
          filename: fileId,
          code: source,
          cssModules: { pattern: '[hash]_[local]' },
          minify: true,
        })
        const classMap: Record<string, string> = {}
        // Sort deterministically: lightningcss's cssExports iteration order is
        // process-dependent (hash-map seeds), which would otherwise churn the
        // emitted lib/client.js on every rebuild.
        for (const [local, exp] of Object.entries(cssExports ?? {}).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) {
          classMap[local] = exp.name
        }
        // Content-addressed tag id (the second half of the silent-drop fix):
        // even if two evaluations of one stylesheet ever diverge again, BOTH
        // stylesheets land — the dedupe guard only collapses identical
        // content, so no classmap can ever point at rules that never mount.
        let contentHash = 0x811c9dc7
        for (const byte of code.toString()) {
          contentHash ^= byte.codePointAt(0)!
          contentHash = Math.imul(contentHash, 0x01000193) >>> 0
        }
        // One <style data-plugin> per module file; idempotent under re-evaluation.
        return [
          `const css = ${JSON.stringify(code.toString())};`,
          `const tagId = ${JSON.stringify(`${id}/${basename(fileId)}@${contentHash.toString(16)}`)};`,
          'if (typeof document !== \'undefined\' && document.querySelector(\'style[data-plugin-css=\' + JSON.stringify(tagId) + \']\') === null) {',
          '  const tag = document.createElement(\'style\');',
          `  tag.dataset.plugin = ${JSON.stringify(id)};`,
          '  tag.dataset.pluginCss = tagId;',
          '  tag.textContent = css;',
          '  document.head.appendChild(tag);',
          '}',
          `export default ${JSON.stringify(classMap)};`,
        ].join('\n')
      },
    }],
    outputOptions: {
      entryFileNames: 'client.js',
      // The map is served from /packages/<scoped-package>/client.js.map. The
      // browser resolves its local sources back into URLs that mirror the
      // /packages/<group>/<package>/src directories; sourcesContent keeps them usable
      // without exposing that tree as an HTTP route.
      sourcemapPathTransform: browserSourcePath,
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(id)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  }
}

/** Resolve an emitted JS asset import against its source-tree counterpart. */
function sourceAssetPath(source: string, importer: string): string {
  const emitted = resolvePath(dirname(importer), source)
  if (existsSync(emitted)) return emitted
  const marker = `${sep}lib${sep}types${sep}`
  const boundary = emitted.indexOf(marker)
  if (boundary < 0) return emitted
  return resolvePath(emitted.slice(0, boundary), 'src', emitted.slice(boundary + marker.length))
}
