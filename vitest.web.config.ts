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

const EDITOR = rootPath('packages/web/editor')
const CARD_VIEW = rootPath('packages/web/melite-card-view')

export default defineConfig({
  plugins: [standardDecoratorPlugin()],
  resolve: {
    alias: {
      ...resolutionFacade(),
      '@': path.join(EDITOR, 'src'),
      react: path.join(EDITOR, 'node_modules/react'),
      'react-dom': path.join(EDITOR, 'node_modules/react-dom'),
      'react/jsx-runtime': path.join(EDITOR, 'node_modules/react/jsx-runtime'),
      sonner: path.join(CARD_VIEW, 'node_modules/sonner/dist/index.mjs'),
    },
  },
  test: {
    environment: 'happy-dom',
    pool: 'forks',
    execArgv: vitestExecArgv,
    setupFiles: [PROXY_SETUP, path.join(EDITOR, 'tests/setup.ts')],
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
        inline: [/@deepseek-ai\/dsh-client-ui-primitives/, /sonner/],
      },
    },
  },
})
