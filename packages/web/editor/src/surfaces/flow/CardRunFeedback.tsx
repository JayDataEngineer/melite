/**
 * CardRunFeedback — the drilldown run-feedback BLOCK every wide card
 * surface renders (2026-09-06, operator order: "for these large cards
 * there's no drilldown feedback for inference like the smaller cards").
 *
 * The gap this closes: the small-card drilldown always shows a run
 * state (the header StatusChip) plus the live /ws strip; the studio
 * rail rendered ONLY the frame-gated CardActivityLine/CardProgressBar
 * pair — and for lanes that emit no ComfyUI /ws frames (kimodo motion,
 * TRELLIS meshes, TTS…) the no-lie contract (never a fake spinner)
 * meant NOTHING rendered at all while a run was live except the Stop
 * button.
 *
 * The block, in order (all shared pieces — the surfaces cannot drift):
 *   1. RUN STATE LINE — always while running (spinner + the stage's
 *      real status word: Queued / Running). This is the StatusChip
 *      parity for the wide surfaces.
 *   2. CardActivityLine + CardProgressBar — unchanged no-lie pieces;
 *      they still null themselves without a real frame.
 *   3. THE CONSOLE DRILLDOWN — the run's log tail, polled live from
 *      the status door's include_log enrichment (the RPC always
 *      documented it; the pane had lost its caller AND its server
 *      end — both restored this stroke). Honest by the same law: the
 *      server synthesizes every line from real runner/sidecar state
 *      (stage statuses, live progress, errors verbatim, artifacts);
 *      an empty tail renders nothing.
 *
 * OWNERSHIP: editor-core only (the studio SHELL renders this — tenants
 * never do; the shell owns the run control plane, and this block is
 * the run's read plane). The poll is self-contained: 1s while
 * running, keyed on runId, overlap-guarded, stopped on unmount or
 * completion (the last tail stays rendered).
 */
import { useEffect, useRef, useState } from "react"
import { Loader2, Copy, Terminal } from "lucide-react"
import type { CardStage } from "@melite/contracts"
import { CardActivityLine, CardProgressBar } from "./CardActivity"
import { editorClient } from "@/rpc/editorClient"
import { Tip } from "@melite/ui/tip"

/** The status word for the state line — the stage's REAL status, the
 *  same vocabulary the tile's StatusChip consumes. Never invented:
 *  an unknown status renders its own string. */
export function runStateWord(stage: CardStage): string {
  switch (stage.status) {
    case "queued": return "Queued"
    case "running": return "Running"
    default: return String(stage.status ?? "")
  }
}

/** The console region — kept as its own export so the unit tests can
 *  pin the poll contract independently of the block. */
export function CardRunConsole({
  runId,
  running,
  stageId,
}: {
  runId: string | null
  running: boolean
  stageId: string
}) {
  const [tail, setTail] = useState<string | null>(null)
  const busy = useRef(false)
  const stopped = useRef(false)

  useEffect(() => {
    stopped.current = false
    if (!runId) return
    const tick = async () => {
      if (busy.current || stopped.current) return
      busy.current = true
      try {
        const st = await editorClient.fetchRunStatus(runId, {
          includeLog: true,
        })
        if (!stopped.current && typeof st.log_tail === "string") {
          setTail(st.log_tail)
        }
      } catch {
        // the run may be young (404 before first registration tick)
        // or the status fetch lost a race with completion — the NEXT
        // tick retries; a dead runId leaves the last tail in place
      } finally {
        busy.current = false
      }
    }
    void tick()
    if (!running) return
    const iv = window.setInterval(tick, 1000)
    return () => {
      stopped.current = true
      window.clearInterval(iv)
    }
  }, [runId, running])

  if (!tail) return null
  return (
    <div
      data-card-run-console={stageId}
      className="mx-3.5 mb-2 shrink-0 rounded-md border border-sidebar-border/50 bg-sidebar/30 p-2"
    >
      <div className="flex items-center gap-1.5">
        <Terminal className="h-3 w-3 text-brand/70" />
        <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          Console
        </span>
        <Tip tip="Copy log">
          <button
            aria-label="Copy run log"
            onClick={() => navigator.clipboard?.writeText(tail)}
            className="ml-auto flex items-center gap-1 rounded border border-sidebar-border/50 px-1.5 py-0.5 text-[9px] text-muted-foreground hover:border-brand/40 hover:text-brand"
          >
            <Copy className="h-2.5 w-2.5" /> Copy
          </button>
        </Tip>
      </div>
      {/* Live tail: newest content visible without scrolling — the
          pre is reversed-anchored via flex-col-reverse so a growing
          log auto-sticks to the bottom (the drilldown reads the LAST
          line first). */}
      <div className="flex max-h-40 min-h-0 flex-col-reverse overflow-y-auto">
        <pre className="mt-1 whitespace-pre-wrap break-words rounded bg-background/60 p-1.5 font-mono text-[9px] leading-tight text-muted-foreground">
          {tail}
        </pre>
      </div>
    </div>
  )
}

/** The block — render it wherever a wide card surface shows a run. */
export function CardRunFeedback({
  stage,
  running,
}: {
  stage: CardStage
  running: boolean
}) {
  const runId =
    stage.runId ??
    (typeof stage.result?.metadata?.runId === "string"
      ? (stage.result.metadata.runId as string)
      : null)
  return (
    <div data-card-run-feedback={stage.id} className="shrink-0">
      {/* 1. RUN STATE LINE — always while running; the wide surface's
          StatusChip parity. Queued stages with no runId yet still
          render ("Starting…" honesty: running=true, runId=null is the
          pre-first-tick window). */}
      {running && (
        <div
          data-card-run-state={stage.id}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-[10px] font-medium text-brand"
        >
          <Loader2 className="h-3 w-3 animate-spin" aria-label="Running" />
          {runId ? runStateWord(stage) : "Starting…"}
        </div>
      )}
      {/* 2. the unchanged no-lie live strip */}
      <CardActivityLine stage={stage} running={running} />
      <CardProgressBar stage={stage} running={running} />
      {/* 3. the console drilldown (include_log tail) */}
      <CardRunConsole runId={runId} running={running} stageId={stage.id} />
    </div>
  )
}
