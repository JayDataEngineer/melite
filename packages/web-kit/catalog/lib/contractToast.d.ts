/** One toast action button (mirrors the row's ToastAction shape). */
export interface ContractToastAction {
    label: string;
    onClick: () => void;
}
/** The toast pusher the row owns (mirrors addToast's signature). */
export type ContractToast = (type: 'error' | 'success' | 'info', message: string, action?: ContractToastAction) => void;
/**
 * Wire the toast pusher the contract stores report through.
 * @param toast - the row's addToast (browser), a test recorder, or
 *                null to unwire (face teardown / HMR reload).
 */
export declare function setContractToastSink(toast: ContractToast | null): void;
/**
 * Fire one contract toast through the wired sink.
 * @param type - toast severity.
 * @param message - the operator-facing text.
 * @param action - optional Retry-style button.
 * @throws when no sink is wired — an unwired verdict must surface,
 *          not vanish.
 */
export declare function contractToast(type: 'error' | 'success' | 'info', message: string, action?: ContractToastAction): void;
//# sourceMappingURL=contractToast.d.ts.map