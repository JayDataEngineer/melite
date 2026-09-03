/** Preflight wire shapes (gateway preflight_required response). */
export interface PreflightNeededEntry {
  name: string
  applies?: boolean
  reason?: string | null
  url?: string | null
  pip?: string[] | null
  ref?: string | null
  title?: string | null
  author?: string | null
  description?: string | null
  nodes?: string[]
  /** true = loaded in ComfyUI; false = missing; null = unverified (ComfyUI unreachable or no node metadata). */
  installed?: boolean | null
  action?: "clone" | "clone+pip" | null
  restart_required?: boolean
}

export interface PreflightPayload {
  status: "preflight_required"
  family: string
  /** Could the gateway reach ComfyUI's /object_info? When false, `installed` is null for everything. */
  reachable: boolean
  restart_required: boolean
  needed: PreflightNeededEntry[]
}
