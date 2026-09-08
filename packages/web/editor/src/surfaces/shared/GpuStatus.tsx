// ComfyUI health badge — polls GET /health and shows green / amber / red.
//
// TRI-STATE (2026-08-14): the backend's /health no longer collapses ComfyUI
// into up/down. A timeout under heavy load means STRESSED, not dead — the
// gateway's background health monitor classifies:
//   up   → answered promptly (green)
//   busy → failed to answer in time, but evidence of life: a recent
//          success, below the failure threshold, or active runs executing
//          (amber — "under load, last ok Ns ago")
//   down → connection refused past the threshold with no recent success (red)
// This is the operator's actual question answered at a glance: "did
// ComfyUI drop my flow, or is it just under stress?" — the old two-state
// badge flapped red/green under load because it could not tell them apart.
//
// ComfyUI manages its own VRAM now (always-on Docker container), so there
// is no unload button or VRAM readout. Just: is the GPU backend reachable?
import { useState, useEffect } from "react"
import { Gpu } from "lucide-react"
import { apiFetch } from "@melite/catalog"
import { HeaderIconButton } from "./HeaderIconButton"

type HealthState = "up" | "busy" | "down" | "loading"

/** The evidence block /health carries behind the verdict (comfyui_detail).
 * All optional — the badge degrades to the plain verdict without it. */
interface ComfyHealthDetail {
  seconds_since_success?: number | null
  consecutive_failures?: number
  last_error_kind?: string | null
  runs_active?: number
  probed?: boolean
  /** The executor's own VRAM readout from the last successful probe
   * (the GPU-variations fix, 2026-08-16): {"total_mb", "free_mb"} or
   * null. The other side of the ledger from the variant buttons' declared
   * peaks — "will this variant fit?" answered at a glance. */
  vram?: { total_mb: number; free_mb: number } | null
}

export function ComfyStatus() {
  const [state, setState] = useState<HealthState>("loading")
  const [detail, setDetail] = useState<ComfyHealthDetail | null>(null)

  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        const res = await apiFetch("/v1/health")
        if (!res.ok) throw new Error(`${res.status}`)
        const data = await res.json()
        if (cancelled) return
        const d =
          data?.comfyui_detail && typeof data.comfyui_detail === "object"
            ? (data.comfyui_detail as ComfyHealthDetail)
            : null
        setDetail(d)
        // Anything unrecognized (or absent) is "down" — never a fabricated
        // "up"/"busy" from a payload we don't understand.
        setState(
          data.comfyui === "up"
            ? "up"
            : data.comfyui === "busy"
              ? "busy"
              : "down",
        )
      } catch {
        if (!cancelled) {
          setDetail(null)
          setState("down")
        }
      }
    }
    check()
    const id = setInterval(check, 10_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const color =
    state === "up" ? "text-emerald-400"
    : state === "busy" ? "text-amber-400"
    : state === "down" ? "text-red-400"
    : "text-muted-foreground"

  const lastOk = detail?.seconds_since_success
  const runs = detail?.runs_active
  const vram = detail?.vram
  const vramNote =
    vram && typeof vram.free_mb === "number" && typeof vram.total_mb === "number"
      ? ` · ${Math.round(vram.free_mb / 1024)}G free / ${Math.round(vram.total_mb / 1024)}G`
      : ""
  const title =
    state === "up" ? `ComfyUI backend: connected${vramNote}`
    : state === "busy"
      ? `ComfyUI backend: busy — reachable but under load${
          typeof lastOk === "number" ? ` (last ok ${lastOk}s ago)` : ""
        }${typeof runs === "number" && runs > 0 ? `, ${runs} run${runs === 1 ? "" : "s"} executing` : ""}${vramNote}`
    : state === "down" ? "ComfyUI backend: unreachable"
    : "Connecting to ComfyUI…"

  return (
    <HeaderIconButton
      icon={Gpu}
      label="ComfyUI status"
      statusDot={
        state === "up" ? "up" : state === "busy" ? "busy" : state === "down" ? "down" : null
      }
      className={color}
      title={title}
    />
  )
}
