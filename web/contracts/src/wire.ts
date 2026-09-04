/** wire.ts — plugin-facing wire row types (fifth lane + register
 * surface). Served by GET /v1/ui-slots and /v1/plugins. */

export interface PluginRow {
 id: string
 version: string
 name: string
 enabled: boolean
 /** Lane names the plugin carries (cards/models/flows/graph). */
 lanes: string[]
 /** Repo-relative root, or the out-of-tree dir it mounts from. */
 root: string
 /** run_complete webhook count (§6.5 — the inventory shows who listens). */
 hooks?: number
}

export interface UiSlotEntry {
  plugin: string
  id: string
  slot: string
  precedence: number
  title?: string
}

/** One theme from GET /v1/themes (the themes lane, §16 — data-only).
 * A palette OVERRIDE: token → CSS value, applied client-side by
 * writing inline custom properties on :root. `vars` keys are the
 * editor's real palette tokens (validated server-side against the
 * :root/.dark blocks of tailwind.css); a partial map — unlisted
 * tokens fall through to the default palette. Selection is CLIENT
 * state (localStorage), keyed `${plugin}/${id}`. */
export interface ThemeEntry {
  plugin: string
  id: string
  label: string
  description?: string
  dark: boolean
  vars: Record<string, string>
}
