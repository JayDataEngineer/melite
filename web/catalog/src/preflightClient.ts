// preflightClient — typed client for the run-time extension install stream.
//
// The PreflightDialog's "Download & Restart" button calls streamExtensionInstall
// with the missing extension names (from the preflight payload). The gateway
// (POST /v1/comfyui/extensions/install) orchestrates the install through
// ComfyUI-Manager's HTTP API + the ComfyUI restart cycle, streaming SSE
// progress. This module parses that stream into a typed event callback — the
// dialog renders per-extension progress + the restart/wait phases from it.
//
// The contract mirrors /v1/download-model/stream (same SSE shape: a JSON
// payload per `data:` frame, terminated by `data: [DONE]`). See
// backend/server/app.py::install_extensions_stream for the producer.
import { describeErrorBody } from "./FlowProtocol"

export type InstallEvent =
  | { event: "install_start"; index: number; total: number; name: string; url: string; pip: string[] }
  | { event: "queue"; index: number; total: number; name: string; total_count: number; done_count: number; in_progress_count: number; is_processing: boolean }
  | { event: "install_done"; index: number; total: number; name: string; result: string }
  | { event: "install_error"; index: number; total: number; name: string; error: string }
  | { event: "restart_start" }
  | { event: "ready" }
  | { event: "error"; error: string }

/**
 * Stream-install ComfyUI custom nodes by SSOT name + restart ComfyUI.
 *
 * Resolves when ComfyUI is back up (`ready` event) or the stream ends.
 * Throws on a fatal `error` event (the producer aborts the whole batch on
 * the first per-extension failure — partial installs are not retried here;
 * the user re-runs the card and the preflight re-checks what's still
 * missing).
 */
export async function streamExtensionInstall(
  extensions: string[],
  onEvent: (e: InstallEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch("/v1/comfyui/extensions/install", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ extensions }),
    signal,
  })
  if (!res.ok) {
    // Full body (2026-08-10): the install route's failures are Manager's
    // messages (clone errors, import tracebacks) — the preflight modal
    // must show them whole, not cut at 200 chars.
    const text = await res.text().catch(() => "")
    throw new Error(
      `install failed: HTTP ${res.status}${text ? `: ${describeErrorBody(text)}` : ""}`,
    )
  }
  if (!res.body) throw new Error("install stream has no body")

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ""
  let sawFatal = false

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    // SSE frames are separated by a blank line. Process complete frames only.
    let idx: number
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const frame = buf.slice(0, idx)
      buf = buf.slice(idx + 2)
      const line = frame.startsWith("data: ") ? frame.slice(6) : frame.startsWith("data:") ? frame.slice(5) : frame
      const trimmed = line.trim()
      if (trimmed === "[DONE]") {
        // The producer ends every run with [DONE]; after a fatal `error`
        // event it must THROW here — returning would resolve the install
        // as a success and the dialog would retry into the same failure.
        if (sawFatal) {
          throw new Error("install failed mid-stream — see the dialog for the per-extension error")
        }
        return
      }
      if (!trimmed) continue
      try {
        const evt = JSON.parse(trimmed) as InstallEvent
        if (evt.event === "error") sawFatal = true
        onEvent(evt)
        if (evt.event === "ready") return
      } catch {
        // Malformed frame — ignore (the producer's framing is the contract;
        // a bad frame shouldn't kill a 95%-complete install).
      }
    }
  }
  if (sawFatal) {
    throw new Error("install failed mid-stream — see the dialog for the per-extension error")
  }
}
