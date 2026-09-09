import './tailwind.css'
import './index.css'
// S4f: DSW token theme (vendored dsw-tokens.css) — the --dsw-* vars DSH
// ui-primitives atoms read. Body-scoped var defs only; the tailwind
// surfaces consume no --dsw-* names, so this changes nothing visual
// until a surface ports its atoms (IdeoPanels tooltips first).
import './dsw-tokens.css'
import { bootEditor } from './boot'
import { reloadOnStaleChunk } from './lib/staleChunk'

// Row 4 (S4b): the boot SHAPE lives in ./boot — AppWebEntry when a DSH
// host serves this page, the standalone StrictMode+createRoot path
// otherwise. This entry only owns the CSS imports + the boot catch.
void bootEditor().catch((err: unknown) => {
  // Net #3 (lib/staleChunk.ts): a boot-time chunk fetch that 404'd on
  // a stale tab self-heals with ONE guarded reload; anything else is a
  // real boot failure — log it, never dead-air.
  if (!reloadOnStaleChunk(err)) {
    console.error('[bootstrap] failed:', err)
  }
})
