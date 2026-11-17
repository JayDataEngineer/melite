// prune-music3-hook.mjs — the L2 journey wall's resolve hook: it
// makes '@melite/models-music3' UNRESOLVABLE, exactly as a pruned
// package is (ENOENT at import). Every other specifier passes
// through untouched. Registered via `node --import` in the wall's
// child process — top-level register() (an --import module's
// initialize() export is NOT called: that convention belongs to
// registered loader modules only, and a hook that only DEFINES
// registration prunes nothing — the boot mounts all 32).
const { register } = await import('node:module')
register('./prune-music3-loader.mjs', import.meta.url)
