/**
 * Builds the e2e harness page with vite (resolved through vitest's
 * dependency tree — vite is not a direct dep of this package).
 *  node test/e2e/build-harness.mjs [--force]
 * Rebuilds when harness sources are newer than dist/ (the driver calls
 * this automatically; --force rebuilds unconditionally).
 */
import { mkdir, readdir, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'

const e2eDir = import.meta.dirname
const dist = join(e2eDir, 'dist')
const force = process.argv.includes('--force')

async function fresh() {
  try {
    const distStat = await stat(join(dist, 'index.html'))
    const distTime = Math.max(distStat.mtimeMs, ...
      (await Promise.all((await readdir(dist)).map((f) => stat(join(dist, f)).then((s) => s.mtimeMs)))))
    const srcs = ['harness-entry.tsx', 'index.html']
    for (const f of srcs) {
      if ((await stat(join(e2eDir, f))).mtimeMs > distTime) return false
    }
    return true
  } catch {
    return false
  }
}

if (!force && await fresh()) {
  console.log('harness dist fresh')
  process.exit(0)
}

const require = createRequire(join(e2eDir, '..', '..', 'package.json'))
const vitestPkg = require.resolve('vitest/package.json')
const viteEntry = require.resolve('vite', { paths: [vitestPkg.replace('/package.json', '')] })
const { build } = await import(viteEntry)
await build({
  root: e2eDir,
  logLevel: 'warn',
  build: {
    outDir: 'dist',
    rollupOptions: { input: resolve(e2eDir, 'harness-entry.tsx') },
  },
})
await mkdir(dist, { recursive: true })
console.log('harness built')
