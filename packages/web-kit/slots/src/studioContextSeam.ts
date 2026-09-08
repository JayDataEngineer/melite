/**
 * studioContextSeam — who consumes an "open studio" context (2026-08-21,
 * the body-card exodus). The SHELL owns the chrome: it switches the tab
 * and emits the open trigger. What the CONTEXT MEANS is card domain —
 * melite-3d decides what `identity_model: "soma"` does to ITS editing
 * state; the shell never knew, and the literals that leaked into
 * WorkspaceLayout (`["soma","mhr","anny"]`) were the disease.
 *
 * Two directions, both pushed by the app/plugin edges (no app imports
 * from @melite/slots modules back into src/ — the seam is the only road):
 *   - Plugins register a CONTEXT LOADER per studio target (string-keyed:
 *     the open vocabulary; the persisted StudioTarget union stays the
 *     wire contract). Returns true if it consumed the context.
 *   - The app registers the OPEN implementation (tab switching) once at
 *     shell boot; plugin capabilities call requestStudioOpen(target).
 */
export type StudioContextLoader = (
  context: Record<string, unknown> | undefined,
) => boolean

const loaders = new Map<string, StudioContextLoader>()

let _openStudio: ((target: string) => void) | null = null

/** Register the context loader for a studio target (plugin side). */
export function registerStudioContextLoader(
  target: string,
  loader: StudioContextLoader,
): () => void {
  loaders.set(target, loader)
  return () => {
    if (loaders.get(target) === loader) loaders.delete(target)
  }
}

/** Let a plugin ask the shell to open a studio tab (app registers the
 * impl at boot; unset = a logged no-op so a headless test never crashes). */
export function setStudioOpenImpl(fn: ((target: string) => void) | null): void {
  _openStudio = fn
}

/** Open a studio tab from plugin land (agent tools, card actions). */
export function requestStudioOpen(target: string): void {
  if (_openStudio) {
    _openStudio(target)
  } else if (typeof console !== "undefined") {
    console.warn(`studioContextSeam: no open impl registered (${target})`)
  }
}

/** The shell's walk: give the target's plugin the context BEFORE the tab
 * switch mounts it. True when a loader consumed it; false = unknown
 * target (the shell still switches tabs — the fail-safe, unchanged). */
export function applyStudioContext(
  target: string,
  context: Record<string, unknown> | undefined,
): boolean {
  const loader = loaders.get(target)
  if (!loader) return false
  try {
    return loader(context)
  } catch (err) {
    // A context-load failure must not block the tab switch (the studio
    // opens without prefilled values; the user sets them manually).
    if (typeof console !== "undefined") {
      console.warn(`studioContextSeam: context loader for "${target}" threw`, err)
    }
    return false
  }
}
