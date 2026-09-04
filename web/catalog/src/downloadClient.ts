// downloadClient — typed client for the model download SSE stream.
//
// The ModelDownloadDialog's "Download" button calls streamModelDownload
// with the download_required payload's download_url. The gateway
// (POST /v1/download-model/stream) streams per-file progress; this module
// parses the stream into typed events the dialog renders.
//
// Same SSE shape as preflightClient (a JSON payload per `data:` frame,
// terminated by `data: [DONE]`) — see backend/server/app.py::
// download_model_stream for the producer. Schemes:
//
//   files://<json>   sequential multi-file (per-file progress events carry
//                    file_index/file_count/filename — the dialog renders
//                    each declared file's own progress row)
//   https://…        legacy single file (plain percent events)
//   hf://<repo>/<f>  single HF file (plain percent events)
import { describeErrorBody } from "./FlowProtocol"

export type DownloadEvent =
  | { event: "progress"; percent: number; downloaded?: number; total?: number; file_index?: number; file_count?: number; filename?: string; skipped?: boolean; resumed?: boolean }
  | { event: "done"; file_size_mb?: number; file_count?: number }
  | { event: "error"; error: string; filename?: string }

/**
 * Stream a model download from /v1/download-model/stream.
 *
 * Resolves when the stream ends cleanly ([DONE] without a fatal `error`
 * event, or a `done` event). Throws on a fatal `error` event or an HTTP
 * failure — the producer aborts the whole batch on the first per-file
 * failure (partial downloads are useless; .part files are left behind and
 * the dialog offers Retry).
 *
 * Watchdog: a live transfer emits a progress event at least every ~0.25s
 * (the producer's time/byte gate), so sustained silence means the
 * connection is dead — the 2026-08-11 failure: the dev-reload supervisor
 * restarted the gateway mid-download and the dialog hung forever on a
 * proxy socket that never errored. Silence for `maxSilenceMs` aborts the
 * fetch → the dialog renders the failed phase with Retry.
 */
export interface StreamOptions {
  /** Silence budget before aborting. Default 30s. hf_snapshot batches
   * (snapshot_download) emit nothing for minutes — the dialog raises this
   * to 300s when any row is a snapshot. */
  maxSilenceMs?: number
}

export async function streamModelDownload(
  downloadUrl: string,
  onEvent: (e: DownloadEvent) => void,
  signal?: AbortSignal,
  opts: StreamOptions = {},
  /** model_filename — required by the backend for HTTPS downloads (the
   * legacy single-file path). Derived from the URL when not supplied. */
  modelFilename?: string,
  /** model_dir — the target directory. The backend's _check_model_file
   * includes this in the download_required payload (the CORRECT dir for
   * the model — diffusion_models/, loras/, etc.); without it the backend
   * defaults to checkpoints/ and the file lands in the wrong folder
   * (ComfyUI's loader won't find it → a phantom "still missing" loop). */
  modelDir?: string,
  /** Integrity pins (2026-08-14) — optional sha256 + byte size from the
   * catalog via the download_required payload. The backend verifies the
   * size against the HEAD total before the transfer and hashes the
   * completed .part before the atomic rename; absent pins = unpinned. */
  pins?: { sha256?: string; size?: number },
): Promise<void> {
  const maxSilence = opts.maxSilenceMs ?? 30_000
  const controller = new AbortController()
  const onOuterAbort = () => controller.abort()
  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener("abort", onOuterAbort)
  }
  let watchdog: ReturnType<typeof setTimeout> | null = null
  const armWatchdog = () => {
    if (watchdog) clearTimeout(watchdog)
    watchdog = setTimeout(() => controller.abort(), maxSilence)
  }
  const disarmWatchdog = () => {
    if (watchdog) {
      clearTimeout(watchdog)
      watchdog = null
    }
  }
  try {
    const res = await fetch("/v1/download-model/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        download_url: downloadUrl,
        // model_dir — always pass when the payload includes it; the backend
        // defaults to checkpoints/ which is wrong for most modern models
        // (diffusion_models/, loras/, text_encoders/, …). files:// and
        // manager:// payloads carry dest_dir per-entry, but the endpoint
        // still reads model_dir as the top-level default — harmless to send.
        ...(modelDir ? { model_dir: modelDir } : {}),
        // The backend requires model_filename for HTTPS downloads (line 2059).
        // For hf:// / files:// / manager:// the backend derives it from the
        // scheme payload, so this is only strictly needed for https:// — but
        // sending it always is harmless and future-proofs new single-file
        // schemes. Derive from the URL basename when the caller doesn't give
        // one (the common case — the payload often has only download_url).
        ...(downloadUrl.startsWith("https://") || downloadUrl.startsWith("http://")
          ? { model_filename: modelFilename || downloadUrl.split("/").pop() || "model" }
          : {}),
        // Integrity pins — only when the catalog declared them (absent
        // fields stay out of the body entirely; the backend treats an
        // absent pin as unpinned, never a zero default).
        ...(pins?.sha256 ? { sha256: pins.sha256 } : {}),
        ...(pins?.size ? { size: pins.size } : {}),
      }),
      signal: controller.signal,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(
        `download failed: HTTP ${res.status}${text ? `: ${describeErrorBody(text)}` : ""}`,
      )
    }
    if (!res.body) throw new Error("download stream has no body")

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ""
    let sawFatal = false

    armWatchdog()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      armWatchdog() // any bytes = the connection is alive
      buf += decoder.decode(value, { stream: true })
      // SSE frames are separated by a blank line. Process complete frames only.
      let idx: number
      while ((idx = buf.indexOf("\n\n")) !== -1) {
        const frame = buf.slice(0, idx)
        buf = buf.slice(idx + 2)
        const line = frame.startsWith("data: ") ? frame.slice(6) : frame.startsWith("data:") ? frame.slice(5) : frame
        const trimmed = line.trim()
        if (trimmed === "[DONE]") {
          // After a fatal `error` event the producer ends with [DONE] — it
          // must THROW here: returning would resolve the download as a
          // success and the caller would retry into the same failure.
          if (sawFatal) {
            throw new Error("download failed mid-stream — see the dialog for the per-file error")
          }
          return
        }
        if (!trimmed) continue
        try {
          const evt = JSON.parse(trimmed) as DownloadEvent
          if (evt.event === "error") sawFatal = true
          onEvent(evt)
          if (evt.event === "done") return
        } catch {
          // Malformed frame — ignore (the producer's framing is the contract;
          // a bad frame shouldn't kill a 95%-complete download).
        }
      }
    }
    disarmWatchdog()
    if (sawFatal) {
      throw new Error("download failed mid-stream — see the dialog for the per-file error")
    }
  } finally {
    disarmWatchdog()
    if (signal) signal.removeEventListener("abort", onOuterAbort)
  }
}
