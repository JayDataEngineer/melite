/**
 * Unit tests for surfaces/shared/tabBridge.ts — the zustand store that
 * carries cross-tab navigation requests (Copilot → assets, Body Studio → pose
 * edit) from any sender to WorkspaceLayout/AssetsTab consumers.
 *
 * Module-level zustand store — state bleeds across tests, so beforeEach
 * restores the INITIAL snapshot captured at first import.
 *
 * Zero prior coverage. A regression in sendToPoseEdit (e.g. dropping
 * pendingIdentityCoeffs) would silently lose the body→pose hand-off.
 */
import { describe, it, expect, beforeEach } from "vitest"
import { useTabBridge } from "../surfaces/shared/tabBridge"

const INITIAL = useTabBridge.getState()

beforeEach(() => {
  useTabBridge.setState(INITIAL, true)
})

describe("tabBridge — initial state", () => {
  it("starts with every pending field null and triggerId 0", () => {
    const s = useTabBridge.getState()
    expect(s.pendingTab).toBeNull()
    expect(s.pendingModel).toBeNull()
    expect(s.pendingWorkflowId).toBeNull()
    expect(s.pendingIdentityCoeffs).toBeNull()
    expect(s.triggerId).toBe(0)
  })
})

describe("tabBridge — navigateToTab", () => {
  it("sets pendingTab and bumps triggerId by exactly 1", () => {
    useTabBridge.getState().navigateToTab("pose")
    const s = useTabBridge.getState()
    expect(s.pendingTab).toBe("pose")
    expect(s.triggerId).toBe(1)
  })
  it("preserves other pending fields (only tab+trigger change)", () => {
    useTabBridge.getState().selectModel("edit")
    useTabBridge.getState().navigateToTab("assets")
    const s = useTabBridge.getState()
    expect(s.pendingTab).toBe("assets")
    expect(s.pendingModel).toBe("edit") // preserved
  })
})

describe("tabBridge — selectModel", () => {
  it("sets pendingModel and bumps triggerId", () => {
    useTabBridge.getState().selectModel("tts_speak")
    expect(useTabBridge.getState().pendingModel).toBe("tts_speak")
    expect(useTabBridge.getState().triggerId).toBe(1)
  })
})

describe("tabBridge — sendToPoseEdit (Body Studio → pose edit hand-off)", () => {
  it("sets tab=assets, model=edit, workflowId=pose_edit, coeffs, AND bumps triggerId", () => {
    useTabBridge.getState().sendToPoseEdit([0.1, 0.2, 0.3])
    const s = useTabBridge.getState()
    expect(s.pendingTab).toBe("assets")
    expect(s.pendingModel).toBe("edit")
    expect(s.pendingWorkflowId).toBe("pose_edit")
    expect(s.pendingIdentityCoeffs).toEqual([0.1, 0.2, 0.3])
    expect(s.triggerId).toBe(1)
  })
  it("carries an empty coeffs array faithfully (not coerced to null)", () => {
    useTabBridge.getState().sendToPoseEdit([])
    expect(useTabBridge.getState().pendingIdentityCoeffs).toEqual([])
  })
})

describe("tabBridge — consume / consumeWorkflow", () => {
  it("consume clears pendingTab + pendingModel only (workflow/coeffs preserved)", () => {
    useTabBridge.getState().sendToPoseEdit([0.5]) // sets everything
    useTabBridge.getState().consume()
    const s = useTabBridge.getState()
    expect(s.pendingTab).toBeNull()
    expect(s.pendingModel).toBeNull()
    expect(s.pendingWorkflowId).toBe("pose_edit") // preserved
    expect(s.pendingIdentityCoeffs).toEqual([0.5]) // preserved
  })
  it("consumeWorkflow clears pendingWorkflowId + pendingIdentityCoeffs only", () => {
    useTabBridge.getState().sendToPoseEdit([0.5])
    useTabBridge.getState().consumeWorkflow()
    const s = useTabBridge.getState()
    expect(s.pendingWorkflowId).toBeNull()
    expect(s.pendingIdentityCoeffs).toBeNull()
    expect(s.pendingTab).toBe("assets") // preserved
    expect(s.pendingModel).toBe("edit") // preserved
  })
})

describe("tabBridge — triggerId monotonicity", () => {
  it("each action increments triggerId by exactly 1 (monotonic, never resets)", () => {
    useTabBridge.getState().navigateToTab("pose")
    useTabBridge.getState().selectModel("x")
    useTabBridge.getState().navigateToTab("body")
    useTabBridge.getState().sendToPoseEdit([1])
    expect(useTabBridge.getState().triggerId).toBe(4)
  })
  it("consume/consumeWorkflow do NOT bump triggerId (they're consumer-side reads)", () => {
    useTabBridge.getState().navigateToTab("pose")
    const before = useTabBridge.getState().triggerId
    useTabBridge.getState().consume()
    useTabBridge.getState().consumeWorkflow()
    expect(useTabBridge.getState().triggerId).toBe(before)
  })
})
