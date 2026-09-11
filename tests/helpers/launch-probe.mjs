// launch-probe.mjs — the dual-mode launcher's built-artifact probe.
// Runs under plain node (no tsx): proves lib-mode subprocesses boot
// without the source loader. A genuinely-missing config exits non-zero.
import { existsSync } from 'node:fs'

if (process.env.MELITE_PROBE === undefined) {
  console.error('probe: missing MELITE_PROBE (genuinely-missing config exits non-zero)')
  process.exit(2)
}
if (process.env.MELITE_PROBE === 'missing') {
  console.error('probe: forced missing')
  process.exit(1)
}
console.log(`probe:${process.env.MELITE_PROBE}`)
if (!existsSync(import.meta.filename)) process.exit(3)
