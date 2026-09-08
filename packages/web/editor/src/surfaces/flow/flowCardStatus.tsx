// flowCardStatus — the two status readouts on the flow tile,
// moved VERBATIM from FlowCard.tsx (Cut 2, C12): StatusPill ("done
// · 3/5" chip) and FlowProgressBar (percent bar + % readout).
import { kindDef } from "@melite/slots"
import { cn } from "@melite/ui"
import type { CardFlowLike } from "@melite/contracts"
export function StatusPill({ flow }: { flow: CardFlowLike }) {
  const stages = flow.stages
  const done = stages.filter((s) => s.status === "done" || s.status === "cached" || s.status === "reused").length
  const cls =
    flow.status === "running" ? "bg-brand/15 text-brand border-brand/40" :
    flow.status === "queued" ? "bg-sky-500/15 text-sky-400 border-sky-500/40" :
    flow.status === "done" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40" :
    flow.status === "failed" ? "bg-destructive/15 text-destructive border-destructive/40" :
    flow.status === "stale" ? "bg-amber-500/15 text-amber-400 border-amber-500/40" :
    "bg-sidebar-accent/60 text-muted-foreground border-sidebar-border/60"
  return (
    <span className={cn("flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium", cls)}>
      {flow.status} · {done}/{stages.length}
    </span>
  )
}

export function FlowProgressBar({ flow }: { flow: CardFlowLike }) {
  const stages = flow.stages
  const nonStudio = stages.filter((s) => kindDef(s.kind).executable)
  const done = nonStudio.filter((s) => s.status === "done" || s.status === "cached" || s.status === "reused").length
  const pct = nonStudio.length === 0 ? 0 : Math.round((done / nonStudio.length) * 100)
  return (
    <div className="flex flex-1 items-center gap-2">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-sidebar-accent/60">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand/70 to-brand transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
    </div>
      <span className="text-[10px] tabular-nums text-muted-foreground/70">{pct}%</span>
    </div>
  )
}
