// fixup-dts.mjs — the vendor's d.ts specifier fixup.
//
// The build-plane law (tests/walls/ts/suites/gate-regressions.spec.ts,
// "no emitted d.ts names a relative .ts specifier"; the class cure
// landed in the d9c9390be build-plane fixups): an emitted declaration
// must name specifiers Node resolves. tsc 5.9 under moduleResolution
// Bundler keeps the vendored source's `./x.ts` spellings in the
// emitted d.ts (upstream's own published lib ships them too), so the
// artifact face gets the same rewrite the estate packages' d.ts get:
// relative `./x.ts` import/export specifiers become `./x.js`, which
// exists beside it in lib/.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const lib = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'lib')
let fixed = 0
for (const entry of readdirSync(lib)) {
  if (!entry.endsWith('.d.ts')) continue
  const path = join(lib, entry)
  const before = readFileSync(path, 'utf8')
  const after = before.replaceAll(
    /(\.\.?\/[A-Za-z0-9_$.\-]+)\.ts(['"])/g,
    (_, specifier, quote) => `${specifier}.js${quote}`,
  )
  if (after !== before) {
    writeFileSync(path, after)
    fixed++
  }
  // the trailing-newline law (SD-7): raw tsc emission strips it.
  const written = readFileSync(path, 'utf8')
  if (written !== '' && !written.endsWith('\n')) writeFileSync(path, written + '\n')
}
console.log(`fixup-dts: rewrote ${fixed} declaration file(s)`)
