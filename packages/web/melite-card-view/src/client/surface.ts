/**
 * surface.ts — the conversation card's way into the Cards tab.
 *
 * THE OLD LAW (the operator's 1:1): clicking a card in the
 * conversation opened the AUTHORING SURFACE — the NLE with the
 * timeline, the video preview, the per-generation splits, the global
 * audio track. The gateway-era iframe embed died with the gateway
 * app; the replacement drill rendered a params FORM for every card,
 * which is the regression this seam closes.
 *
 * WHY A SEAM AND NOT A PROP: FlowCards renders under the
 * `tool.call.toolview` seat, whose owner currency (ToolCallOwnerProps)
 * carries no sidebar navigation — and the slot law forbids the
 * toolview from declaring `cards.stage.view` as a child (a child slot
 * is declared by exactly ONE entry; the Cards tab body owns it, and
 * each of the seven card tools would be a second declaration — a load
 * throw). The shell's own face is `ctx.sidebarRight.openResource`
 * (ISidebarRight — "claim it, place it, reveal the column"), provided
 * by ui-sidebar-right and consumable by this plugin's client entry
 * through cordis inject. The entry captures it HERE at apply time; the
 * React tree reads it through this module — the same pattern as the
 * deck's assets tab carrying its own wire caller.
 *
 * LAW: the capture is a plain closure store with set/clear symmetry
 * under the entry's apply-guard — no globals beyond this one seam, no
 * DOM reach-arounds, and a consumer without the shell (unit tests,
 * headless harnesses) degrades to the in-card drill, never throws.
 */

/** The shell's navigation face, as the entry captured it. */
type OpenResource = (address: string) => void

let open: OpenResource | null = null

/** Install the shell face (the client entry's apply; idempotent overwrite). */
export function setOpenCardsSurface(fn: OpenResource | null): void {
  open = fn
}

/**
 * Open a cards address in the shell's Cards tab. Returns false when no
 * shell face is installed — the caller falls back to its in-card view.
 */
export function openCardsSurface(address: string): boolean {
  if (open === null) return false
  open(address)
  return true
}

/** Test seam: read the installed face (never used by production paths). */
export function cardsSurfaceFace(): OpenResource | null {
  return open
}
