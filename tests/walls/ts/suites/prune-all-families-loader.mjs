// prune-all-families-loader.mjs — the loader half of the
// total-outage arm: every models package fails to resolve with the
// ERR_MODULE_NOT_FOUND code a real empty install produces.
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@melite/models-')) {
    throw Object.assign(
      new Error(`Cannot find package '${specifier}' imported from ${context.parentURL ?? '<root>'} (PRUNED by the L2 wall's total-outage hook)`),
      { code: 'ERR_MODULE_NOT_FOUND' },
    )
  }
  return nextResolve(specifier, context)
}
