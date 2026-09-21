import path from 'node:path'
import { defineConfig } from 'vitest/config'
import {
  PROXY_SETUP,
  resolutionFacade,
  rootPath,
  standardDecoratorPlugin,
  tryLoadEnvFile,
  vitestExecArgv,
} from './vitest.shared.ts'

// Web snapshot lane (DSH tier 7): compares session-driven output under
// snapshots/web/ and UI-only output under packages/web/tests/expected/.
// CI forces read-only DSH_SNAPSHOT=replay, never writing expected
// outputs; record/refresh stay local and every diff is reviewed.
// KNOWN LANE DEBT (ledger §TEST-7): this lane runs happy-dom, not a
// real Chromium — the real-browser evidence lives in
// test:web:browser (playwright) until the lane ports.
tryLoadEnvFile()

const CARD_VIEW = rootPath('packages/web/melite-card-view')

export default defineConfig({
  plugins: [standardDecoratorPlugin()],
  resolve: {
    alias: {
      ...resolutionFacade(),
      // 2026-09-12: the web lane's React universe re-pinned at the
      // store's matched 19 pair (the editor app — the old host — is
      // deleted; one React per lane).
      react: rootPath('node_modules/.pnpm/react@19.2.8/node_modules/react'),
      'react-dom': rootPath('node_modules/.pnpm/react-dom@19.2.8_react@19.2.8/node_modules/react-dom'),
      // the gateway's browser client face resolves to the card-view
      // tests' stand-in (the root config's dom project carries the
      // same row — the real artifact is module-loader format, it only
      // executes inside the DSH web shell; the web lane needs it the
      // moment a scenario imports the cards tab's client tree, e.g.
      // snapshots/web/cards-tab).
      '@deepseek-ai/dsh-api-gateway/client': rootPath('packages/web/melite-card-view/tests/fixtures/gateway-client.ts'),
      'react/jsx-runtime': rootPath('node_modules/.pnpm/react@19.2.8/node_modules/react/jsx-runtime'),
      anser: rootPath('node_modules/anser'),
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
      'micromark-util-symbol': rootPath('node_modules/micromark-util-symbol')
    },
  },
  test: {
    environment: 'happy-dom',
    pool: 'forks',
    execArgv: vitestExecArgv,
    setupFiles: [PROXY_SETUP, path.join(CARD_VIEW, 'tests/setup.ts')],
    globals: true,
    css: false,
    include: ['snapshots/web/**/*.snapshot.ts', 'packages/web/tests/expected/**/*.spec.ts'],
    testTimeout: 180_000,
    hookTimeout: 120_000,
    // Serial like DSH's web lane: workspace-mutating scenarios must not
    // share a process tree with parallel writers.
    fileParallelism: false,
    server: {
      deps: {
        inline: [/@deepseek-ai\/dsh-client-ui-primitives/],
      },
    },
  },
})
