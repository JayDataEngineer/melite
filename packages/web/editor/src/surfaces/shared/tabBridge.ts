// CopilotBridge — the bridge between the legacy bridge frontend actions and the editor.
//
// Also used for cross-tab navigation WITHIN the editor (e.g. Body Studio →
// Generate). Any component can write to this store; WorkspaceLayout reads
// from it to react. (The old AssetsTab was deleted 2026-08-06.)
//
// The tab ids are the REAL center tabs. "library" (added 2026-08-13) is
// the card-authoring canvas — the ONE combined surface; legacy
// "assets"/"viewer" strings map to it in WorkspaceLayout. Legacy
// "video"/"pose" predate the surface merge; the "flow" agent tab died
// 2026-08-21 with the native-agent chat (the assistant lives in DSH).
import { create } from "zustand"

// §8.2 (2026-08-19): the closed TabId union is DEAD — a wire vocabulary
// that must grow per tab was a second source of truth. Plain string: the
// accepted ids are whatever the shell registry (shell/centerEntries)
// mounts, plus the legacy aliases WorkspaceLayout maps ("assets"/"viewer"
// → "library"). Unknown ids degrade at the render pick, not here.
type TabId = string

interface CopilotBridgeState {
  /** The tab to switch to. WorkspaceLayout watches this. */
  pendingTab: TabId | null
  /** The sidebar service to select. WorkspaceLayout watches this. */
  pendingModel: string | null
  /** Workflow to pre-select in the FlowSelector. The media drawer watches this. */
  pendingWorkflowId: string | null
  /** Identity coeffs carried from Body Studio → Pose Edit. */
  pendingIdentityCoeffs: number[] | null
  /** Monotonic counter — bump to re-trigger. */
  triggerId: number

  navigateToTab: (tab: TabId) => void
  selectModel: (model: string) => void
  /** Body Studio → Generate: switch to Assets/Edit, select pose_edit, carry coeffs. */
  sendToPoseEdit: (coeffs: number[]) => void
  consume: () => void
  /** Clear only the workflow fields (called by the media drawer after reading). */
  consumeWorkflow: () => void
}

export const useTabBridge = create<CopilotBridgeState>((set) => ({
  pendingTab: null,
  pendingModel: null,
  pendingWorkflowId: null,
  pendingIdentityCoeffs: null,
  triggerId: 0,

  navigateToTab: (tab) =>
    set((s) => ({ pendingTab: tab, triggerId: s.triggerId + 1 })),

  selectModel: (model) =>
    set((s) => ({ pendingModel: model, triggerId: s.triggerId + 1 })),

  sendToPoseEdit: (coeffs) =>
    set((s) => ({
      pendingTab: "assets",
      pendingModel: "edit",
      pendingWorkflowId: "pose_edit",
      pendingIdentityCoeffs: coeffs,
      triggerId: s.triggerId + 1,
    })),

  consume: () =>
    set({ pendingTab: null, pendingModel: null }),

  consumeWorkflow: () =>
    set({ pendingWorkflowId: null, pendingIdentityCoeffs: null }),
}))
