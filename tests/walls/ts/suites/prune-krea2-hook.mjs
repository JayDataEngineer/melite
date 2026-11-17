// prune-krea2-hook.mjs — the flavor-bearing arm's resolve hook:
// '@melite/models-krea-2' (and its mods/* subpaths) unresolvable —
// a pruned family WITH flavor rows in composeModPlane's table.
const { register } = await import('node:module')
register('./prune-krea2-loader.mjs', import.meta.url)
