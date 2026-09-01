// preflightStore — the imperative bridge between the (UI-less) pipeline
// store and the (rendered-once) <PreflightDialog/>.
//
// WHY A SEPARATE STORE: executeGeneration is a free function that returns a
// StageResult; it has no React context. When /v1/pipelines/start returns
// status: "preflight_required", the run must PAUSE — open the popup, await
// the user's decision (download+restart / skip / cancel), then either retry
// or abort. A tiny zustand store is the cleanest imperative gate: the dialog
// mounts once (PipelineCanvas) and watches `request`; the runner calls
// runPreflight() which sets `request` and returns a promise the dialog
// resolves via _resolve().
//
// Mirrors the existing download_required short-circuit's DATA shape but
// adds the UX the provision dialog never had (today download_required just
// throws a card error). The popup is the user-facing half of the runtime
// preflight system; this store is its state machine.
import { create } from "zustand"
import type { PreflightPayload } from "./preflightTypes"

export type PreflightResolution =
  | { ok: true; installed: boolean } // installed=true → installed+restarted; installed=false → user chose Skip (proceed without)
  | { ok: false } // user cancelled → abort the run

interface PreflightState {
  /** The pending request, or null when the dialog should be hidden. */
  request: { payload: PreflightPayload } | null
  /** The resolve fn for the pending promise (called by the dialog). */
  _resolve: ((r: PreflightResolution) => void) | null
  /** Open the popup. Returns a promise that resolves when the user acts. */
  runPreflight: (payload: PreflightPayload) => Promise<PreflightResolution>
  /** Called by the dialog on Download&Restart success / Skip / Cancel. */
  _resolve_current: (r: PreflightResolution) => void
}

export const usePreflightStore = create<PreflightState>((set, get) => ({
  request: null,
  _resolve: null,
  runPreflight: (payload) =>
    new Promise<PreflightResolution>((resolve) => {
      // If a previous request is somehow still pending (shouldn't happen —
      // the dialog is modal), resolve it as cancelled before replacing.
      const prev = get()._resolve
      if (prev) prev({ ok: false })
      set({ request: { payload }, _resolve: resolve })
    }),
  _resolve_current: (r) => {
    const resolve = get()._resolve
    set({ request: null, _resolve: null })
    resolve?.(r)
  },
}))
