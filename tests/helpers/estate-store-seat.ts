// estate-store-seat.ts — THE STORE-SEATED GUARD (the 2026-11-05 CI
// cure): the lane-presence arms judge REAL declared weights against
// the machine's models tree — data/runtime/comfyui/models (the
// runtime symlinks) or the endpoint overlay's configured mount. A
// fresh CI clone carries neither, so every store-bound arm refuses
// ("no store copy exists") and reds the portability legs with a
// machine-state verdict, not a product verdict. The guard rides the
// seated-pack precedent (demo-state-seed.spec.ts, gpu-tier-keyless's
// dsh-on-PATH): the arms fire where the store is SEATED — dev
// machines via the pre-push full battery, every push — and skip
// LOUDLY (the reason rides the describe title) where the seat cannot
// exist. Never a silent hole: the skip names its prerequisite.
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** True when the estate's model store is seated on THIS machine. */
export const ESTATE_STORE_SEATED: boolean = existsSync(join(ROOT, 'data', 'runtime', 'comfyui', 'models'))
  || existsSync(join(ROOT, 'data', 'inference.local.json'))

/** The loud-skip title suffix every store-seated describe appends. */
export const STORE_SEATED_SKIP = 'skipped when the model store is not seated: lane presence judges real weights — the wall fires where the store lives (dev machines, via the pre-push full battery)'
