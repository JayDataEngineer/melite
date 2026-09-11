// spec-contract-store.spec.ts — the verdict store's transient-failure
// self-heal (2026-08-11).
//
// WHAT IS PROVEN: a form-spec fetch that fails mid-host-restart must not
// strand the app at "no modifiers, no error". loadFormSpec re-probes ONCE
// after a short pause before recording "error" — the close-the-card-and-
// reopen-it the user had to do manually ("I open the create image, no mod
// slot. I reopne it, mod slot") happens automatically. Bounded: exactly one
// re-probe — a second consecutive failure is a genuine "error" (visible
// face + Retry), never an infinite loop.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

vi.mock("@melite/catalog/api", () => ({
 apiFetch: vi.fn(),
 apiJson: vi.fn(),
}))

import { apiFetch } from "@melite/catalog"
import { useSpecContractStore } from "../surfaces/shared/specContractStore"

beforeEach(() => {
 useSpecContractStore.setState({ records: {} })
 vi.mocked(apiFetch).mockReset()
})

afterEach(() => {
 vi.useRealTimers()
})

describe("specContractStore.loadFormSpec — transient-failure re-probe", () => {
 it("a failed fetch re-probes once and lands LOADED when the host recovers", async () => {
  vi.useFakeTimers()
  // First attempt lands in the restart window; the re-probe hits the
  // recovered host (contract-valid spec — modifiers: null = honest
  // no-capability, same as the live wire).
  vi.mocked(apiFetch)
   .mockRejectedValueOnce(new TypeError("fetch failed"))
   .mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ fields: [] as never[], schema_groups: [] as never[], features: { modifiers: null as null } }),
   } as never)

  const p = useSpecContractStore.getState().loadFormSpec("z-image")
  // In-flight — loading, NOT error (a 502 window is not a verdict yet).
  expect(useSpecContractStore.getState().records["z-image"].state).toBe("loading")
  // Flush the rejection → the store schedules its one re-probe.
  await vi.advanceTimersByTimeAsync(0)
  expect(useSpecContractStore.getState().records["z-image"].state).toBe("loading")
  // The re-probe delay elapses → second attempt succeeds.
  await vi.advanceTimersByTimeAsync(2_600)
  const rec = await p

  expect(rec.state).toBe("loaded")
  expect(useSpecContractStore.getState().records["z-image"].state).toBe("loaded")
  expect(apiFetch).toHaveBeenCalledTimes(2)
 })

 it("a second consecutive failure records error — exactly ONE re-probe, no loop", async () => {
  vi.useFakeTimers()
  vi.mocked(apiFetch).mockRejectedValue(new TypeError("fetch failed"))

  const p = useSpecContractStore.getState().loadFormSpec("z-image")
  await vi.advanceTimersByTimeAsync(2_600)
  const rec = await p

  expect(rec.state).toBe("error")
  expect(rec.error).toMatch(/fetch failed/)
  expect(apiFetch).toHaveBeenCalledTimes(2)
 })
})

describe("specContractStore.loadFormSpec — contract verdicts", () => {
 // The contract-valid minimal emission (modifiers: null = honest
 // no-capability, same as the live wire — see the reprobe test above).
 const GOOD_SPEC = { model: "z-image", fields: [] as never[], schema_groups: [] as never[],
  features: { modifiers: null as null } }
 // The 2026-08-11 empty-lora-dropdown incident class: raw YAML kind with
 // zero options, NO options_scanned proof — validateSpecContract refuses.
 const BAD_SPEC: Record<string, any> = {
  model: "krea-2", fields: [] as never[], schema_groups: [] as never[],
  features: {
   modifiers: [{
    kind: "lora",
    param_key: "loras",
    cardinality: "list",
    fields: [] as never[],
    options: [],
    upload_dir: "krea-2",
   }],
  },
 }

 it("a contract-valid spec lands 'loaded' with the spec held", async () => {
  vi.mocked(apiFetch).mockResolvedValueOnce({
   ok: true,
   status: 200,
   json: async () => GOOD_SPEC,
  } as never)

  const rec = await useSpecContractStore.getState().loadFormSpec("z-image")
  expect(rec.state).toBe("loaded")
  expect(rec.spec).toEqual(GOOD_SPEC)
  expect(rec.violations).toEqual([])
  expect(useSpecContractStore.getState().records["z-image"].state).toBe("loaded")
 })

 it("a contract-violating spec records 'violation' and the spec is NEVER held", async () => {
  vi.mocked(apiFetch).mockResolvedValueOnce({
   ok: true,
   status: 200,
   json: async () => BAD_SPEC,
  } as never)

  const rec = await useSpecContractStore.getState().loadFormSpec("krea-2")
  expect(rec.state).toBe("violation")
  expect(rec.spec).toBeNull()
  expect(rec.violations.length).toBeGreaterThan(0)
  expect(rec.violations[0].kind).toBe("lora")
  // The store never caches a violated spec — nothing can render it.
  expect(useSpecContractStore.getState().records["krea-2"].spec).toBeNull()
 })

 it("an error body that 200s is a 'violation', never a silently-empty spec", async () => {
  // The 500-period class: the endpoint failed, the client parsed the error
  // body as the spec. The shape gate must catch it even if the status line
  // is 200 (backend served a malformed body).
  vi.mocked(apiFetch).mockResolvedValueOnce({
   ok: true,
   status: 200,
   json: async () => ({ error: "Internal Server Error" }),
  } as never)

  const rec = await useSpecContractStore.getState().loadFormSpec("flux")
  expect(rec.state).toBe("violation")
  expect(rec.spec).toBeNull()
  expect(rec.violations.some((v) => v.kind === "spec")).toBe(true)
 })

 it("retryFormSpec after a violation refetches → new verdict", async () => {
  // First emission is the raw-YAML leak; Retry refetches and the backend
  // now ships the enriched spec.
  vi.mocked(apiFetch)
   .mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => BAD_SPEC,
   } as never)
   .mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => GOOD_SPEC,
   } as never)

  const first = await useSpecContractStore.getState().loadFormSpec("krea-2")
  expect(first.state).toBe("violation")

  const retried = await useSpecContractStore.getState().retryFormSpec("krea-2")
  expect(retried.state).toBe("loaded")
  expect(retried.spec).toEqual(GOOD_SPEC)
  expect(useSpecContractStore.getState().records["krea-2"].state).toBe("loaded")
 })

 it("locks the no-direct-write invariant: there is NO setFormSpec", () => {
  expect((useSpecContractStore.getState() as any).setFormSpec).toBeUndefined()
 })
})

// ── CARD-OPEN REVALIDATION (2026-08-12) — fresh: true ─────────────────────
// "WHEN I OPEN A CARD, IT IS SOMETIMES NOT ACCURATE. IT'S OLD OR CRUFT OR
// MISSING MODS." A "loaded" record is a SESSION-OLD GHOST: the catalog
// re-assembles on every supervisor restart (backend saves re-import YAML —
// new mods/fields appear mid-session), and an earlier passive mount may
// have cached the pre-restart emission. Card-open callers pass fresh: true
// → ALWAYS revalidate against the backend. The catalog is the truth, never
// a session-old ghost; a revalidation that fails records "error" and DROPS
// the stale spec (the UI shows the face — never a silently-stale form).
describe("specContractStore.loadFormSpec — fresh revalidation replaces session-stale records", () => {
 const OLD_EMISSION = { model: "z-image", fields: [] as never[], schema_groups: [] as never[],
  features: { modifiers: null as null } }
 // The catalog re-assembled after a restart: a new mod kind appeared.
 const NEW_EMISSION = {
  model: "z-image", fields: [] as never[], schema_groups: [] as never[],
  features: {
   modifiers: [{ kind: "enhance", param_key: "enhance", fields: [] as never[] as never[] }],
  },
 }

 it("fresh: true replaces a stale loaded record with the backend's current emission", async () => {
  vi.mocked(apiFetch)
   .mockResolvedValueOnce({ ok: true, status: 200, json: async () => OLD_EMISSION } as never)
   .mockResolvedValueOnce({ ok: true, status: 200, json: async () => NEW_EMISSION } as never)

  const stale = await useSpecContractStore.getState().loadFormSpec("z-image")
  expect(stale.state).toBe("loaded")
  expect(stale.spec!.features!.modifiers).toBeNull()

  // Card open: revalidate. The cached record is NOT served — a new fetch
  // runs and the record is REPLACED with the current emission.
  const fresh = await useSpecContractStore.getState().loadFormSpec("z-image", { fresh: true })
  expect(fresh.state).toBe("loaded")
  expect(fresh.spec!.features!.modifiers).toHaveLength(1)
  expect(useSpecContractStore.getState().records["z-image"].spec!.features!.modifiers).toHaveLength(1)
  expect(apiFetch).toHaveBeenCalledTimes(2)
 })

 it("non-fresh keeps the passive-subscriber dedup — no refetch for a loaded record", async () => {
  vi.mocked(apiFetch).mockResolvedValueOnce({ ok: true, status: 200, json: async () => OLD_EMISSION } as never)

  await useSpecContractStore.getState().loadFormSpec("z-image")
  const again = await useSpecContractStore.getState().loadFormSpec("z-image")
  expect(again).toBe(useSpecContractStore.getState().records["z-image"])
  expect(apiFetch).toHaveBeenCalledTimes(1)
 })

 it("N simultaneous fresh opens share ONE in-flight fetch", async () => {
  vi.mocked(apiFetch).mockResolvedValueOnce({ ok: true, status: 200, json: async () => OLD_EMISSION } as never)

  const first = useSpecContractStore.getState().loadFormSpec("z-image", { fresh: true })
  const joiner = useSpecContractStore.getState().loadFormSpec("z-image", { fresh: true })
  // One fetch — the joiner joined the in-flight one (its .then sees the
  // in-flight loading record; the subscription path in the component layer
  // applies the vocabulary when the fetch lands).
  expect(apiFetch).toHaveBeenCalledTimes(1)
  expect((await joiner).state).toBe("loading")
  const rec = await first
  expect(rec.state).toBe("loaded")
  expect(useSpecContractStore.getState().records["z-image"].state).toBe("loaded")
  expect(apiFetch).toHaveBeenCalledTimes(1)
 })

 it("a failed fresh revalidation replaces loaded with error — the stale spec is DROPPED, never served", async () => {
  vi.useFakeTimers()
  vi.mocked(apiFetch)
   .mockResolvedValueOnce({ ok: true, status: 200, json: async () => OLD_EMISSION } as never)
   .mockRejectedValue(new TypeError("fetch failed")) // both fresh attempts fail

  const stale = await useSpecContractStore.getState().loadFormSpec("z-image")
  expect(stale.state).toBe("loaded")

  const p = useSpecContractStore.getState().loadFormSpec("z-image", { fresh: true })
  await vi.advanceTimersByTimeAsync(2_600) // first failure + re-probe delay
  const rec = await p

  // THE CORE CONTRACT: a revalidation that fails must not silently keep
  // serving the stale emission — the UI shows the error face + Retry.
  expect(rec.state).toBe("error")
  const stored = useSpecContractStore.getState().records["z-image"]
  expect(stored.state).toBe("error")
  expect(stored.spec).toBeNull()
 })
})

describe("specContractStore.loadFormSpec — terminal unknown-service (2026-09-05)", () => {
 // The img-edit fossil: a stored stage kept requesting the retired family
 // head. The door 404s {"error": "model not found"} (correct — the
 // id is unknown); the store must NOT reprobe a corpse or loop Retry on
 // it, and must substitute when the caller supplies a fallback.
 const DEAD_404 = { ok: false, status: 404, json: async () => ({ error: "model not found" }) }
 const QWEN_SPEC = { model: "qwen-img-edit-2511", fields: [] as never[], schema_groups: [] as never[],
  features: { modifiers: null as null } }

 it("a 404 model-not-found records terminal error with NO reprobe", async () => {
  vi.useFakeTimers()
  vi.mocked(apiFetch).mockResolvedValue(DEAD_404 as never)

  const p = useSpecContractStore.getState().loadFormSpec("img-edit")
  await vi.advanceTimersByTimeAsync(0)
  const rec = await p

  expect(rec.state).toBe("error")
  expect(rec.errorKind).toBe("unknown-service")
  expect(rec.error).toMatch(/unknown model/)
  expect(rec.error).toMatch(/Model select/)
  // THE POINT: exactly one fetch — no 2.5s reprobe against a dead id,
  // even after the reprobe window elapses.
  expect(apiFetch).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(30_000)
  expect(apiFetch).toHaveBeenCalledTimes(1)
 })

 it("a terminal-unknown service loads the fallback and stamps substitutedFrom", async () => {
  vi.useFakeTimers()
  vi.mocked(apiFetch)
   .mockResolvedValueOnce(DEAD_404 as never)
   .mockResolvedValueOnce({ ok: true, status: 200, json: async () => QWEN_SPEC } as never)

  const p = useSpecContractStore.getState().loadFormSpec("img-edit", { fallbackService: "qwen-img-edit-2511" })
  // No timer advance: a substitution must NOT wait out the reprobe delay.
  await vi.advanceTimersByTimeAsync(0)
  const rec = await p

  expect(rec.state).toBe("loaded")
  expect(rec.substitutedFrom).toBe("img-edit")
  expect(rec.spec).toMatchObject({ model: "qwen-img-edit-2511" })
  expect(apiFetch).toHaveBeenCalledTimes(2)
  // Stored under the REQUESTED key so subscribers resolve.
  expect(useSpecContractStore.getState().records["img-edit"].state).toBe("loaded")
 })

 it("a failed fallback names both ids and stays terminal", async () => {
  vi.useFakeTimers()
  vi.mocked(apiFetch).mockResolvedValue(DEAD_404 as never)

  const p = useSpecContractStore.getState().loadFormSpec("img-edit", { fallbackService: "also-dead" })
  await vi.advanceTimersByTimeAsync(0)
  const rec = await p

  expect(rec.state).toBe("error")
  expect(rec.errorKind).toBe("unknown-service")
  expect(rec.error).toMatch(/img-edit/)
  expect(rec.error).toMatch(/also-dead/)
  expect(apiFetch).toHaveBeenCalledTimes(2)
 })
})
