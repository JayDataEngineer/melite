// prune-music3-loader.mjs — the resolve hook's loader half: it
// makes '@melite/models-music3' fail to resolve EXACTLY as a pruned
// package does (an ERR_MODULE_NOT_FOUND-coded error — the same code
// the engine's retire-alone catches key on; a plain Error would
// simulate a BROKEN package, not an absent one), every other
// specifier untouched.
export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@melite/models-music3') {
    throw Object.assign(
      new Error(`Cannot find package '@melite/models-music3' imported from ${context.parentURL ?? '<root>'} (PRUNED by the L2 journey wall's resolve hook)`),
      { code: 'ERR_MODULE_NOT_FOUND' },
    )
  }
  return nextResolve(specifier, context)
}
