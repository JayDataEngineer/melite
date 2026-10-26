"use client";
import { createClientStore } from "./clientStore.js";
import { contractToast } from "./contractToast.js";
const IDLE = { state: "idle", violations: [], error: null };
// ── 2026-08-18 — TOAST ONCE PER OUTAGE ───────────────────────────────────
// ensureCatalog retries a failed fetch every 3s until the gateway comes
// back, and EVERY attempt re-reports through reportError — without a latch
// that is a fresh error toast per cycle ("spammed every 5 seconds, when I
// only need it once"). The record stays per-attempt truthful (state and
// message update on every report); only the TOAST is suppressed while the
// SAME outage continues. A different message (502 → connection refused) is
// genuinely new information and toasts once more; reportOk re-arms the
// latch so the NEXT outage announces itself exactly once too.
let _lastToastedOutage = null;
/** Wall-clock stamp for error surfaces — a once-only toast may outlive the
 *  outage that produced it, so the operator should also see WHEN it fired.
 *  24h local time, seconds resolution. */
function _stamp() {
    return new Date().toLocaleTimeString([], { hour12: false });
}
/** Sink-safe toast for the STORE report paths (audit R-S4, 2026-10-22):
 *  `contractToast` stays loud for direct callers — an unwired sink must
 *  surface — but the outcome paths themselves must never throw through
 *  their result. At cold boot the module-warm ensureCatalog can race the
 *  entry face that wires the sink; an unwired reportOk used to throw
 *  BEFORE catalogStore.setState — a healthy load rejected and every
 *  retry re-failed. The toast is lost + logged here; the record stands.
 */
function _reportToast(type, message, action) {
    try {
        contractToast(type, message, action);
    }
    catch (err) {
        console.error("[catalogContract] toast not delivered (sink unwired):", message, err);
    }
}
/** Retry = force re-fetch the catalog (bypasses the TTL cache), which
 *  re-validates + re-reports. Lazy import: modelCatalog imports THIS store
 *  (for CatalogContractError reporting) — a static import would be circular. */
function retryCatalog() {
    import("./modelCatalog.js")
        .then(({ loadCatalog }) => loadCatalog({ force: true }))
        .catch((err) => {
        // The funnel re-reported when loadCatalog ran — a fresh toast
        // already fired. But the import() itself can fail (chunk/HMR
        // edge): that failure reaches ONLY this log (audit R-S2) — it
        // must not vanish entirely.
        console.error("[catalogContract] retryCatalog failed:", err);
    });
}
export const useCatalogContractStore = createClientStore((set, get) => ({
    record: IDLE,
    reportOk: () => {
        // Read BEFORE the write — the error→ok transition decides the recovery
        // toast.
        const wasOutage = get().record.state === "error";
        _lastToastedOutage = null; // re-arm: the next outage is a NEW event
        set({ record: { state: "loaded", violations: [], error: null } });
        // Close the loop the once-only error opened: the outage announced itself
        // with ONE toast, so its end also gets exactly one (info, 5s
        // auto-dismiss). Only for error→ok — a violation clearing means a
        // backend deploy landed; the sidebar repopulating is signal enough
        // there.
        if (wasOutage) {
            _reportToast("info", `Catalog back online (at ${_stamp()}).`);
        }
    },
    reportViolation: (violations) => {
        console.error(`[catalogContract] catalog contract violation (at ${_stamp()}):`, violations);
        set({ record: { state: "violation", violations, error: null } });
        const first = violations[0];
        const msg = first
            ? first.kind && first.kind !== "catalog"
                ? `${first.kind}: ${first.message}`
                : first.message
            : "the catalog response did not match the expected shape";
        _reportToast("error", `Catalog contract violation — ${msg} (at ${_stamp()}). Some models may be missing. Retry re-fetches the catalog.`, { label: "Retry", onClick: retryCatalog });
    },
    reportError: (message) => {
        // Trim: fetch-layer messages can carry trailing whitespace, which used
        // to render as "502 Bad Gateway . Retry".
        const clean = message.trim();
        console.error(`[catalogContract] catalog fetch failed (at ${_stamp()}):`, clean);
        // The record is per-attempt truth — always updated, never latched.
        set({ record: { state: "error", violations: [], error: clean } });
        if (clean === _lastToastedOutage)
            return; // same ongoing outage — no re-toast
        _lastToastedOutage = clean;
        _reportToast("error", `Catalog unavailable — ${clean} (at ${_stamp()}). Retry re-fetches the catalog.`, { label: "Retry", onClick: retryCatalog });
    },
    clear: () => {
        _lastToastedOutage = null;
        set({ record: IDLE });
    },
}));
//# sourceMappingURL=catalogContractStore.js.map
