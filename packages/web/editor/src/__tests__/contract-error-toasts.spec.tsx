// contract-error-toasts.spec.tsx — the 2026-08-14 rule, proven.
//
// RULE: ALL contract errors surface through TOASTS ONLY — never a persistent
// line rendered in the webapp (the three banners were deleted). WHAT IS
// PROVEN: each contract store (run-status / catalog / spec) FIRES an error
// toast carrying a Retry action when it records a violation or error, and
// fires NOTHING for the clean paths (reportOk / loaded).
//
// HOW: the toast store is a zustand module — we subscribe to addToast via a
// spy on the store's state (no DOM needed for the assertion; sonner renders
// the real toast in the app, the test asserts the STORE fired it).

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

vi.mock("@melite/catalog/api", () => ({
 apiFetch: vi.fn(),
 apiJson: vi.fn(),
}))

import { useToastStore } from "@melite/ui"
import { useRunStatusContractStore } from "@melite/catalog"
import { useCatalogContractStore } from "@melite/catalog"
import { useSpecContractStore } from "../surfaces/shared/specContractStore"

// Spy on the toast funnel: ONE wrapper, installed fresh per test and
// restored after (stacking wrappers would double-record).
const origAddToast = useToastStore.getState().addToast
let toastCalls: Array<{ type: string; message: string; hasAction: boolean }>

beforeEach(() => {
 toastCalls = []
 useToastStore.setState({
  addToast: (type: "error" | "success" | "info", message: string, action?: { label: string; onClick: () => void }) => {
   toastCalls.push({ type, message, hasAction: !!action })
  },
 })
 useRunStatusContractStore.setState({ verdict: null })
 // clear() — not bare setState — so the once-per-outage toast latch resets
 // between tests (2026-08-18; it's module state, invisible to setState).
 useCatalogContractStore.getState().clear()
 useSpecContractStore.setState({ records: {} })
})

afterEach(() => {
 useToastStore.setState({ addToast: origAddToast })
})

describe("2026-08-14 rule: contract errors fire TOASTS, never a persistent line", () => {
 it("run-status violation → error toast with Retry", () => {
  useRunStatusContractStore.getState().reportViolation("y9c6a3d44", [
   { field: "stages[0]", kind: "invalid", message: "expected object, got null" },
  ])
  expect(toastCalls.length).toBe(1)
  expect(toastCalls[0].type).toBe("error")
  expect(toastCalls[0].message).toContain("y9c6a3d44")
  expect(toastCalls[0].message).toContain("contract issue")
  expect(toastCalls[0].hasAction).toBe(true)
 })

 it("run-status clean → NO toast (clear is not an event)", () => {
  useRunStatusContractStore.getState().clear()
  expect(toastCalls.length).toBe(0)
 })

 it("catalog violation → error toast with Retry, catalog clean → none", () => {
  useCatalogContractStore.getState().reportViolation([
   { kind: "families", message: "missing required key" },
  ])
  expect(toastCalls.length).toBe(1)
  expect(toastCalls[0].type).toBe("error")
  expect(toastCalls[0].message).toContain("Catalog contract violation")
  expect(toastCalls[0].hasAction).toBe(true)

  useCatalogContractStore.getState().reportOk()
  expect(toastCalls.length).toBe(1) // reportOk added nothing
 })

 it("catalog fetch error → error toast with Retry", () => {
  useCatalogContractStore.getState().reportError("host 502")
  expect(toastCalls.length).toBe(1)
  expect(toastCalls[0].type).toBe("error")
  expect(toastCalls[0].message).toContain("Catalog unavailable")
  expect(toastCalls[0].hasAction).toBe(true)
 })
})

// ════════════════════════════════════════════════════════════════════════
// 2026-08-18 — ONCE PER OUTAGE + timestamps ("spammed every 5 seconds,
// when I only need it once"). ensureCatalog retries the failed fetch every
// 3s; each attempt re-reports. The toast must fire ONCE for the same
// ongoing outage — the record keeps updating (state stays truthful).
// ════════════════════════════════════════════════════════════════════════
describe("2026-08-18 rule: catalog error toasts fire ONCE per outage, stamped", () => {
 const TIME_STAMP = /\(at \d{2}:\d{2}:\d{2}\)/

 it("the 3s retry loop re-reporting the SAME failure → exactly ONE toast", () => {
  const store = useCatalogContractStore.getState()
  // Simulate the loop: initial attempt + 3 re-reports (what used to be 4
  // toasts — the reported every-few-seconds spam).
  store.reportError("/v1/model-catalog: 502 Bad Gateway ")
  store.reportError("/v1/model-catalog: 502 Bad Gateway")
  store.reportError("/v1/model-catalog: 502 Bad Gateway")
  store.reportError("/v1/model-catalog: 502 Bad Gateway")
  expect(toastCalls.length).toBe(1)
  expect(toastCalls[0].type).toBe("error")
  // …but the RECORD stays per-attempt truthful (and trimmed).
  const record = useCatalogContractStore.getState().record
  expect(record.state).toBe("error")
  expect(record.error).toBe("/v1/model-catalog: 502 Bad Gateway")
 })

 it("carries a wall-clock stamp and no stray space before the period", () => {
  useCatalogContractStore.getState().reportError("/v1/model-catalog: 502 Bad Gateway ")
  expect(toastCalls[0].message).toMatch(
   /Catalog unavailable — \/v1\/model-catalog: 502 Bad Gateway \(at \d{2}:\d{2}:\d{2}\)\. Retry re-fetches the catalog\./,
  )
  expect(toastCalls[0].message).not.toContain(" .")
  expect(TIME_STAMP.test(toastCalls[0].message)).toBe(true)
 })

 it("a DIFFERENT failure message is new information → toasts once more", () => {
  const store = useCatalogContractStore.getState()
  store.reportError("/v1/model-catalog: 502 Bad Gateway")
  store.reportError("/v1/model-catalog: net::ERR_CONNECTION_REFUSED")
  expect(toastCalls.length).toBe(2)
  // …and stays latched on the new message.
  store.reportError("/v1/model-catalog: net::ERR_CONNECTION_REFUSED")
  expect(toastCalls.length).toBe(2)
 })

 it("recovery: error→ok fires ONE info toast, then re-arms the latch", () => {
  const store = useCatalogContractStore.getState()
  store.reportError("/v1/model-catalog: 502 Bad Gateway")
  expect(toastCalls.length).toBe(1)

  // The retry loop lands a good fetch → reportOk: recovery toast.
  store.reportOk()
  expect(toastCalls.length).toBe(2)
  expect(toastCalls[1].type).toBe("info")
  expect(toastCalls[1].message).toMatch(/Catalog back online \(at \d{2}:\d{2}:\d{2}\)/)
  expect(useCatalogContractStore.getState().record.state).toBe("loaded")

  // Re-armed: a NEW outage announces itself exactly once again.
  store.reportError("/v1/model-catalog: 502 Bad Gateway")
  expect(toastCalls.length).toBe(3)
  store.reportError("/v1/model-catalog: 502 Bad Gateway")
  expect(toastCalls.length).toBe(3)
 })

 it("ok→ok steady state → NO toasts (recovery fires once per outage only)", () => {
  const store = useCatalogContractStore.getState()
  store.reportOk()
  store.reportOk()
  expect(toastCalls.length).toBe(0)
 })
})
