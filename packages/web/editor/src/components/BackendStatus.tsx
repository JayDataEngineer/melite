// Global backend liveness badge. Subscribes to the api client's liveness
// signal and renders a compact status pill in the header. Renders null
// when the backend is online — zero visual cost when things are healthy.
//
// The badge is intentionally separate from <GpuStatus/>:
//   * GpuStatus is now a model-unload button (the gateway is CPU-only, so
//     VRAM stats no longer apply; it just evicts models from inference pools).
//   * BackendStatus shows *gateway* reachability — the same proxy that
//     every /v1/* call goes through. When this fires, the api client is
//     already retrying with backoff; this badge just tells the user.
import { useEffect, useState } from "react"
import { Loader2, AlertTriangle } from "lucide-react"
import { Badge } from "@melite/ui/badge"
import { getBackendState, onBackendState, type BackendState } from "@melite/catalog"
import { Tip } from "@melite/ui/tip"

const COPY: Record<Exclude<BackendState, 'online'>, { label: string; cls: string; Icon: typeof Loader2; spin?: boolean }> = {
  degraded: {
    label: "Reconnecting",
    cls: "text-amber-600 border-amber-500/40 dark:text-amber-400",
    Icon: Loader2,
    spin: true,
  },
  offline: {
    label: "Backend offline",
    cls: "text-destructive border-destructive/40",
    Icon: AlertTriangle,
  },
}

export function BackendStatus() {
  const [s, setS] = useState<BackendState>(getBackendState())
  useEffect(() => onBackendState(setS), [])

  if (s === 'online') return null
  const { label, cls, Icon, spin } = COPY[s]
  return (
    <Tip tip={s === 'offline'
      ? "Gateway unreachable — requests are retrying in the background."
      : "Gateway slow/unstable — retrying requests."}>
      <Badge
        variant="outline"
        className={`text-xs gap-1.5 animate-in fade-in slide-in-from-right-2 duration-300 ${cls}`}
        aria-label={s === 'offline'
          ? "Gateway unreachable — requests are retrying in the background."
          : "Gateway slow/unstable — retrying requests."}
      >
        <Icon className={`h-3 w-3 ${spin ? 'animate-spin' : ''}`} />
        {label}
      </Badge>
    </Tip>
  )
}
