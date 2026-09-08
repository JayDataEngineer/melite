// Projection-coverage probe (PURGE S-snapshots, 2026-09-08): the
// disclosure rim projects card-tool rows from the primed registry
// over the frozen TOOLS_JSON base — no tool.json reads. This probe
// reports the coverage facts the GATE 3 legs pin: every registered
// card's base-row + dir presence, the closed alias set, and every
// walked dir's resolution. Plain JS (.mjs): the imports below are
// stripped TS.
//
// Output: one JSON line —
//   {cards: [{id, pure}], base: [ids], aliases: {...}, dirs: [[genre, dir]]}
//
// argv[2]: repo root.
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const REPO = process.argv[2]
const doors = join(REPO, 'packages/gateway/src/doors')
const { loadCardDefs } = await import(
  pathToFileURL(join(REPO, 'packages', 'engines', 'comfyui', 'cordis', 'src', 'index.ts')).href
)
const { toolBaseRows, DIR_ID_ALIASES } = await import(
  pathToFileURL(join(doors, 'toolProjection.ts')).href
)

const defs = await loadCardDefs()
const base = toolBaseRows()
const cardsRoot = join(REPO, 'packages/engines/comfyui/action_cards')
const dirs = []
for (const genre of readdirSync(cardsRoot)) {
  // the manifests() walk's scope (doors/planes.ts mirror):
  // dependency + hidden dirs are never cards.
  if (genre === 'node_modules' || genre.startsWith('.')) continue
  const gdir = join(cardsRoot, genre)
  if (!statSync(gdir).isDirectory()) continue
  for (const c of readdirSync(gdir)) {
    if (!statSync(join(gdir, c)).isDirectory()) continue
    dirs.push([genre, c])
  }
}
console.log(
  JSON.stringify({
    cards: [...defs].map(([id, def]) => ({
      id,
      pure: def.requiresModel === false,
    })),
    base: [...base.keys()],
    aliases: DIR_ID_ALIASES,
    dirs,
  }),
)
