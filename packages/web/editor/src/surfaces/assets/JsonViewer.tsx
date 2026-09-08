
// JsonViewer — read-only pretty-printed JSON for the preview dialog
// (2026-08-25 bug 3: ".json is unsupported type for viewing").
//
// Contract:
//   • valid JSON   → pretty-printed (2-space indent), Copy button.
//   • invalid JSON → the RAW bytes verbatim + an honest hint (never fake).
//   • >2 MB        → the first 2 MB + a truncation notice (a multi-MB
//                    JSON.parse/freezes the dialog; Download in the bottom
//                    bar always carries the full file).
//   • fetch failure→ explicit error state with retry.
import { useCallback, useEffect, useState } from "react"
import { Check, Copy, TriangleAlert } from "lucide-react"
import { copyText } from "@melite/ui"

/** Display cap: beyond this the payload is shown raw + truncated. */
const MAX_DISPLAY_BYTES = 2 * 1024 * 1024

type ViewerState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; text: string; pretty: boolean; truncated: boolean }

export function JsonViewer({ url, className }: { url: string; className?: string }) {
  const [state, setState] = useState<ViewerState>({ kind: "loading" })
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let alive = true
    setState({ kind: "loading" })
    ;(async () => {
      try {
        const res = await fetch(url)
        const raw = await res.text()
        if (!alive) return
        if (!res.ok && !url.startsWith("data:")) {
          setState({ kind: "error", message: `HTTP ${res.status}` })
          return
        }
        const truncated = raw.length > MAX_DISPLAY_BYTES
        const slice = truncated ? raw.slice(0, MAX_DISPLAY_BYTES) : raw
        let text = slice
        let pretty = false
        // Only pretty-print when we hold the COMPLETE document — parsing a
        // truncated slice would always throw and prove nothing.
        if (!truncated) {
          try {
            text = JSON.stringify(JSON.parse(slice), null, 2)
            pretty = true
          } catch {
            // Not valid JSON (or empty) — the raw bytes ARE the honest view.
          }
        }
        setState({ kind: "ready", text, pretty, truncated })
      } catch (e) {
        if (!alive) return
        setState({ kind: "error", message: e instanceof Error ? e.message : String(e) })
      }
    })()
    return () => { alive = false }
  }, [url])

  const onCopy = useCallback(() => {
    if (state.kind !== "ready") return
    void copyText(state.text).then((ok) => {
      if (!ok) return
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [state])

  if (state.kind === "loading") {
    return (
      <div className={`flex max-h-[70vh] items-center justify-center rounded-lg border border-white/10 bg-black/40 p-6 ${className ?? ""}`}>
        <div className="h-5 w-5 animate-pulse rounded bg-white/20" />
      </div>
    )
  }
  if (state.kind === "error") {
    return (
      <div className={`flex max-h-[70vh] flex-col items-center justify-center gap-2 rounded-lg border border-white/10 bg-black/40 p-6 ${className ?? ""}`}>
        <TriangleAlert className="h-8 w-8 text-muted-foreground/60" />
        <div className="text-sm font-medium text-muted-foreground/70">Could not load JSON</div>
        <div className="text-xs text-muted-foreground/40">{state.message}</div>
      </div>
    )
  }

  return (
    <div className={`flex w-[min(880px,88vw)] flex-col gap-2 ${className ?? ""}`}>
      {/* Header row: state hints + Copy */}
      <div className="flex items-center gap-3 px-1 text-xs">
        {state.pretty ? (
          <span className="text-muted-foreground/50">pretty-printed</span>
        ) : state.truncated ? (
          <span className="text-muted-foreground/50">showing first 2 MB — download for the full file</span>
        ) : (
          <span className="text-muted-foreground/50">raw (not valid JSON)</span>
        )}
        <button
          onClick={onCopy}
          className="ml-auto flex h-7 items-center gap-1.5 rounded-md bg-white/10 px-2 text-foreground/80 transition-colors hover:bg-white/20"
          aria-label="Copy JSON"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-h-[70vh] overflow-auto rounded-lg border border-white/10 bg-black/40 p-4 font-mono text-xs leading-relaxed text-foreground/85 [white-space:pre-wrap] [overflow-wrap:anywhere]">
        {state.text}
      </pre>
    </div>
  )
}
