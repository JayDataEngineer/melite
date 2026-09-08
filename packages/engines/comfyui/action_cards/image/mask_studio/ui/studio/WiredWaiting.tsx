// WiredWaiting — the blocked-canvas waiting card. Pure move from
// component.tsx (props shape unchanged).
import { Button } from "@melite/ui/button"
import { Hourglass, Link2 } from "lucide-react"

// ── Waiting state: wired to an upstream that hasn't run yet ───────────────
// The "goofy" case (2026-08-10): a wire is a LIVE reference, but it only
// resolves once the upstream produces. Painting needs a concrete image, so
// the canvas is BLOCKED until then — this card says why + how to unblock
// (run the upstream, or unwire and attach a file instead). Replaces both
// the canvas and the empty-state-import while the wire is pending.
export function WiredWaiting({
  upstreamTitle, onUnwire,
}: {
  upstreamTitle: string
  onUnwire: () => void
}) {
  return (
  <div
  className="flex flex-col items-center justify-center gap-3 p-8 text-center"
  data-wired-waiting
  >
  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/15">
  <Hourglass className="h-7 w-7 text-brand" />
  </div>
  <div>
  <div className="text-sm font-medium text-foreground/90">
  Waiting for <span className="text-brand">{upstreamTitle}</span> to run
  </div>
  <div className="mt-1 max-w-xs text-[11px] leading-relaxed text-muted-foreground/70">
  This input is wired to a previous card's output. It arrives once that card
  runs — masking unlocks then. Run the flow up to that stage, or unwire
  to attach a file now.
  </div>
  </div>
  <Button variant="ghost"
  type="button"
  onClick={onUnwire}
  data-wired-unwire
  className="flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-3 py-1.5 text-[12px] font-medium text-foreground/80 transition-colors hover:bg-sidebar/60 hover:text-destructive"
  >
  <Link2 className="h-3.5 w-3.5" /> Unwire
  </Button>
  </div>
  )
}
