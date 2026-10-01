// contractToast — the toast seam of the catalog contract stores.
//
// THE /client DOOR LAW (2026-10-12): a workspace lib that browser
// bundles INLINE (this package rides inside every client bundle
// that reaches @melite/formats) must not import the card-base
// atoms at build time — the door specifier '@melite/card-base/client'
// resolves to the BUILT row (a loader registration with no
// top-level exports), and the bare root is the host marker. The
// toast UI singleton belongs to the ONE graph row, so the stores
// fire through this SEAM instead: each browser client face wires
// the row's addToast once at entry (setContractToastSink); node
// tests wire a recording sink. An unwired fire fails loud — a
// contract verdict must never vanish silently (the 2026-08-14
// rule made run-status errors toast-ONLY).

/** One toast action button (mirrors the row's ToastAction shape). */
export interface ContractToastAction {
  label: string
  onClick: () => void
}

/** The toast pusher the row owns (mirrors addToast's signature). */
export type ContractToast = (
  type: 'error' | 'success' | 'info',
  message: string,
  action?: ContractToastAction,
) => void

let sink: ContractToast | null = null

/**
 * Wire the toast pusher the contract stores report through.
 * @param toast - the row's addToast (browser) or a test recorder.
 */
export function setContractToastSink(toast: ContractToast): void {
  sink = toast
}

/**
 * Fire one contract toast through the wired sink.
 * @param type - toast severity.
 * @param message - the operator-facing text.
 * @param action - optional Retry-style button.
 * @throws when no sink is wired — an unwired verdict must surface,
 *          not vanish.
 */
export function contractToast(type: 'error' | 'success' | 'info', message: string, action?: ContractToastAction): void {
  if (sink === null) {
    throw new Error('contract toast sink unset — call setContractToastSink() from the owning client face before reporting')
  }
  sink(type, message, action)
}
