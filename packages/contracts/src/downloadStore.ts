// downloadStore — the imperative bridge between the (UI-less) run callers
// and the (rendered-once) <ModelDownloadDialog/>.
//
// WHY A SEPARATE STORE: runCompiledGeneration is a free function with no
// React context. When /v1/pipelines/start returns status:
// "download_required", the run must PAUSE — open the popup, stream the
// model download, await the user, then either retry or abort. A tiny
// zustand store is the cleanest imperative gate: the dialog mounts once
// (WorkspaceLayout) and watches `request`; the runner calls runDownload()
// which sets `request` and returns a promise the dialog resolves via
// _resolve_current().
//
// Mirrors preflightStore (the extension-install gate) exactly — the two
// short-circuits share the same retry semantics: BOTH are 200s that start
// NO run (no run_id, no GPU work), so retrying the start body after the
// popup resolves is always safe.
//
// MOUNTED FALLBACK: unlike preflight, runDownload can be called from
// surfaces where the dialog was never mounted (a future surface that
// forgets to render <ModelDownloadDialog/>). Calling resolve() would hang
// the caller forever — so the store tracks mounted state and resolves
// {ok:false, reason:"unmounted"} immediately, degrading to the old card
// error instead of freezing the UI.
import { create } from "zustand"

// ─── DEATH-LOOP CIRCUIT BREAKER (2026-08-11) ─────────────────────────────
// The generate→download_required→download→retry→download_required cycle is
// structurally possible when the model check can't see a file that the
// download stream claims succeeded (wrong dest_dir, zero-byte file, volume
// mismatch). Each cycle re-opens the dialog — a manual death loop the user
// cannot escape. The breaker counts consecutive runDownload calls for the
// SAME model signature; after MAX_ATTEMPTS it REFUSES to re-open and
// resolves as a terminal failure so the caller surfaces a real error.
// Module-level: survives React re-renders; a page reload clears it (a fresh
// session is a fresh attempt — the right scope).
const MAX_DOWNLOAD_ATTEMPTS = 2
let _lastModelSig: string | null = null
let _consecutiveAttempts = 0

export function _resetDownloadCircuitBreaker(): void {
  // Test-only escape hatch — resets the breaker between unit tests.
  _lastModelSig = null
  _consecutiveAttempts = 0
}

export function _downloadAttemptCount(): number {
  return _consecutiveAttempts
}

export type DownloadResolution =
  | { ok: true } // download stream completed → retry the same start body
  | { ok: false; reason?: "cancelled" | "unmounted" | "max_attempts" } // abort the run

export interface DownloadRequest {
  /** The server's download_required dict (message/files/download_url…). */
  payload: Record<string, unknown>
}

interface DownloadState {
  /** The pending request, or null when the dialog should be hidden. */
  request: DownloadRequest | null
  /** The resolve fn for the pending promise (called by the dialog). */
  _resolve: ((r: DownloadResolution) => void) | null
  /** True while <ModelDownloadDialog/> is mounted (see fallback above). */
  _mounted: boolean
  /** Open the popup. Returns a promise that resolves when the user acts. */
  runDownload: (payload: Record<string, unknown>) => Promise<DownloadResolution>
  /** Called by the dialog on download success / failure / cancel. */
  _resolve_current: (r: DownloadResolution) => void
  /** Called by the dialog's useEffect on mount/unmount. */
  _setMounted: (mounted: boolean) => void
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  request: null,
  _resolve: null,
  _mounted: false,
  runDownload: (payload) =>
    new Promise<DownloadResolution>((resolve) => {
      // No dialog mounted → can't ask the user; resolve immediately so the
      // caller degrades to a card error instead of hanging forever.
      if (!get()._mounted) {
        resolve({ ok: false, reason: "unmounted" })
        return
      }
      // ── CIRCUIT BREAKER ── the same model re-requested too many times in
      // a row means the download "succeeds" but the run door still can't
      // find the file. Re-opening the dialog would loop forever. Refuse and
      // resolve as a terminal failure so the caller surfaces the truth.
      const sig = String(
        payload.model_filename ?? payload.download_url ?? "unknown",
      )
      if (sig === _lastModelSig) {
        _consecutiveAttempts++
      } else {
        _lastModelSig = sig
        _consecutiveAttempts = 1
      }
      if (_consecutiveAttempts > MAX_DOWNLOAD_ATTEMPTS) {
        _lastModelSig = null
        _consecutiveAttempts = 0
        resolve({ ok: false, reason: "max_attempts" })
        return
      }
      // If a previous request is somehow still pending (shouldn't happen —
      // the dialog is modal), resolve it as cancelled before replacing.
      const prev = get()._resolve
      if (prev) prev({ ok: false, reason: "cancelled" })
      set({ request: { payload }, _resolve: resolve })
    }),
  _resolve_current: (r) => {
    const resolve = get()._resolve
    set({ request: null, _resolve: null })
    resolve?.(r)
  },
  _setMounted: (mounted) => set({ _mounted: mounted }),
}))
