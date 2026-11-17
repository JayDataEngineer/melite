// prune-krea2-loader.mjs — the loader half: every krea-2 specifier
// (root package and mods/* subpaths) fails to resolve with the
// ERR_MODULE_NOT_FOUND code a real prune produces.
export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@melite/models-krea-2' || specifier.startsWith('@melite/models-krea-2/')) {
    throw Object.assign(
      new Error(`Cannot find package '${specifier}' imported from ${context.parentURL ?? '<root>'} (PRUNED by the L2 wall's flavor-bearing hook)`),
      { code: 'ERR_MODULE_NOT_FOUND' },
    )
  }
  return nextResolve(specifier, context)
}
