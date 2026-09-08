// card-detail-spec-faces.test.tsx — the CardDetailBody verdict faces
// (2026-08-11).
//
// WHAT IS PROVEN: the inline card detail (CardDetailInline — THE one detail
// surface, the "create image" drill-down) can never be in "modifiers missing
// with no explanation". Every specContractStore verdict has a face:
// loading → a visible "Loading modifiers…" strip (NEW — the 502-window
// silent stretch was the user's live bug: "I open the create image, no mod
// slot. I reopne it, mod slot"), error → a red banner whose message is the
// failure, surviving the store's automatic re-probe (a genuinely-down
// gateway still ends visible, never silent).
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"

vi.mock("@melite/catalog/api", () => ({
 apiFetch: vi.fn(),
 apiJson: vi.fn(),
}))

import { apiFetch } from "@melite/catalog"
import { CardDetailInline } from "../surfaces/flow/CardDetailModal"
import { useSpecContractStore } from "../surfaces/shared/specContractStore"

// Record<string, any>: the stage literal is a fixture of the wire shape —
// the `as never` cast at the render site breaks contextual typing, so the
// empty literals need an explicit type (TS7018).
const STAGE: Record<string, any> = {
 id: "s0",
 title: "Generate image",
 subtitle: "z-image",
 kind: "generation",
 service: "z-image",
 params: { prompt: "a waifu" },
 inputs: [],
 inputIndices: [],
 result: null,
 status: "pending",
 meta: {},
}

beforeEach(() => {
 useSpecContractStore.setState({ records: {} })
 vi.mocked(apiFetch).mockReset()
 vi.useFakeTimers()
})

afterEach(() => {
 vi.useRealTimers()
 cleanup()
})

describe("CardDetailInline — modifiers verdict faces", () => {
 it("renders the loading face while the form-spec fetch is in flight — never a bare empty form", () => {
  useSpecContractStore.setState({
   records: { "z-image": { spec: null, state: "loading", violations: [], error: null } },
  })
  render(
   <CardDetailInline
    stage={STAGE as never}
    upstreams={[]}
    running={false}
    actions={{ onEditSave: vi.fn() }}
   />,
  )
  expect(screen.getByTestId("modifiers-spec-loading")).toBeTruthy()
  // 2026-08-14: the face is a shadcn SKELETON (heading bar + md tiles —
  // the shape of the grid it stands in for), not a text strip; the
  // role=status keeps it announced.
  expect(screen.getByTestId("modifiers-spec-loading").getAttribute("role")).toBe("status")
  expect(screen.queryByTestId("modifiers-spec-error")).toBeNull()
  // The record is loading → the mount effect must NOT re-fetch.
  expect(apiFetch).not.toHaveBeenCalled()
 })

 it("a failed fetch ends at a VISIBLE red error that survives the re-probe — the 502 window is a banner, not a missing grid", async () => {
  vi.mocked(apiFetch).mockRejectedValue(new Error("form-spec z-image failed (502): boom"))
  useSpecContractStore.setState({
   records: { "z-image": { spec: null, state: "error", violations: [], error: "form-spec z-image failed (502): boom" } },
  })
  render(
   <CardDetailInline
    stage={STAGE as never}
    upstreams={[]}
    running={false}
    actions={{ onEditSave: vi.fn() }}
   />,
  )
  // The mount effect re-fetches (state "error" is refetchable); the re-probe
  // also fails → the verdict lands on error again and the face stays.
  await vi.advanceTimersByTimeAsync(5_000)
  expect(screen.getByTestId("modifiers-spec-error")).toBeTruthy()
  // 2026-08-18 (the editor-is-the-card fix): ParamEditor now mounts even
  // for prompt-only cards, so its OWN verdict face ("Card form
  // unavailable" — card-spec-verdict) renders beside this modifiers
  // banner. The failure is shown twice (form zone + modifiers zone),
  // never zero — query all matches.
  expect(screen.getAllByText(/boom/).length).toBeGreaterThanOrEqual(1)
  expect(screen.getAllByRole("button", { name: /Retry/ }).length).toBeGreaterThanOrEqual(1)
  expect(vi.mocked(apiFetch).mock.calls.length).toBeGreaterThanOrEqual(2)
 })
})
