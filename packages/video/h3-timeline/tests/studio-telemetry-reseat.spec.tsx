// @contract cards-h3-studio-telemetry-reseat
// THE TENANT'S RUN-FACE RESEAT WALL (journey audit F-2, rev-silent
// consumer sweep 2026-10-31 — the cure's JOURNEY-axis completion): the
// bench-view cure's wall (bench-view-telemetry-reseat.spec.tsx ARM-3)
// stops AT the consult seam — it probes owner.row at renderStageView,
// so the h3 tenant's INTERIOR is unproven. A future useMemo keyed on
// stage.params/rev over stage.result-derived data would pass all three
// consult arms green while re-freezing the operator's studio one hop
// deeper (the exact burn: "the timeline card isn't updated visually").
//
// This wall mounts the REAL VideoTimelineStudio and feeds it the
// rev-silent frame at the tenant seam: a NEW row whose params bytes are
// IDENTICAL (the same object — canonical JSON equal a fortiori) while
// row.result moves (a second window lands + the run-history stamp).
// The frame is the purest rev-silent form: runStatus stays "running" on
// BOTH mounts, ONLY result moves — byte-for-byte what the drafts
// telemetry arm lands (drafts/remote.ts:1306-1339) through the bench
// tail (cards-resource.ts:1826-1827) and the cured re-seats
// (bench-view.tsx:85,114) down into this tenant.
//
// THE JUDGED MEMO (the interior the recipe names): useDerivedView's
// filmstrip memo (useDerivedView.ts:111-178) keys [stage.result] — new
// result identity per frame (projectStageView harvests a fresh result
// per render) → the memo recomputes. The run-history chips ride
// projection.ts stageHistoryRows (:141-147) per render inside
// StudioPreview.tsx:95-129 — no memo, must follow every frame. Arms:
//   ARM-1 the filmstrip grows its window tile — THE MEMO'S FIRING ARM;
//   ARM-2 the run-history gains its chip — the per-render face;
//   ARM-3 the doc readout (the params plane) stays byte-identical
//         across the frame — the rev-silence control: the wall really
//         fed a same-params frame, and the doc really stayed frozen
//         while the faces moved (useShownDoc keys canonical params,
//         correctly).
//
// THE TOGGLE SIGNATURE (the recipe's red-proof): key the filmstrip memo
// on the canonical params (or deps []) — ARM-1 REDS (tile count frozen
// at the mount value), ARM-2 stays green (per-render read), ARM-3 stays
// green. That split is the re-freeze's signature, one hop deeper than
// the consult seam; do not "fix" the wall by weakening ARM-2.
import assert from "node:assert/strict"
import { test } from "vitest"
import { createElement } from "react"
import { render, screen } from "@testing-library/react"
import { VideoTimelineStudio } from "../src/ui/studio/component.tsx"
import type { StageViewOwnerProps } from "@melite/contracts"

// The doc (params) — ONE object shared by both rows: the frame's params
// bytes are identical by construction (canonical JSON equal a fortiori).
const PARAMS = { calls: [{ text: "orrery", start_frame: 0, end_frame: 90 }], fps: 24 }

// The pre-frame artifacts: ONE window landed mid-run (the filmstrip's
// mid-run state — no film hero, no final cut, windows are the evidence).
const W1 = "https://run.example/run-telemetry-twin-0002/h3_t4_w1_00001_.mp4"
const PRE_ROW = {
  id: "s_4",
  card: "h3-timeline",
  title: "H3 Timeline",
  params: PARAMS,
  result: { artifacts: { "h3_t4_w1_00001_.mp4": W1 } },
}

// The telemetry twin: a NEW row object, SAME params reference (bytes
// identical), result carrying the SECOND window + the run-history
// stamp — the faces frame the estate lands rev-silently.
const W2 = "https://run.example/run-telemetry-twin-0002/h3_t4_w2_00002_.mp4"
const POST_ROW = {
  id: "s_4",
  card: "h3-timeline",
  title: "H3 Timeline",
  params: PARAMS,
  result: {
    run_id: "run-telemetry-twin-0002",
    artifacts: { "h3_t4_w1_00001_.mp4": W1, "h3_t4_w2_00002_.mp4": W2 },
    metadata: { history: [
      { run_id: "run-telemetry-twin-0002", status: "completed", durationSec: 7, video: W2 },
    ] },
  },
}

function ownerProps(row: Record<string, unknown>): StageViewOwnerProps {
  return {
    stageId: "s_4",
    cardName: "h3-timeline",
    row,
    // THE PURE FRAME: runStatus never moves — only row.result does.
    runStatus: "running",
    onPatch: () => {},
    onRun: () => {},
    onStop: () => {},
    onRemove: () => {},
    onSurface: () => {},
    upstream: [],
    runId: null,
  }
}

function mountStudio(row: Record<string, unknown>) {
  // THE SAME MOUNTED INSTANCE carries the frame: els.rerender keeps the
  // component's hook state (and its memos) alive — a remount would
  // recompute every memo from scratch and the freeze toggle could never
  // red. The rev-silent burn is a LIVE seat receiving a new row.
  return render(createElement(VideoTimelineStudio, ownerProps(row)))
}

function rerenderRow(els: ReturnType<typeof mountStudio>, row: Record<string, unknown>): void {
  els.rerender(createElement(VideoTimelineStudio, ownerProps(row)))
}

test("ARM-1 the filmstrip grows its window tile across the same-params frame (THE MEMO'S FIRING ARM)", () => {
  const els = mountStudio(PRE_ROW)
  // mid-run: ONE window tile, no final cut yet
  assert.equal(screen.getAllByTestId("tl-window-tile").length, 1, "PRE mounts one window")
  assert.equal(screen.queryByTestId("tl-final-cut"), null, "no film hero mid-run")
  // the telemetry frame lands: same params bytes, a NEW result
  rerenderRow(els, POST_ROW)
  assert.equal(screen.getAllByTestId("tl-window-tile").length, 2, "the second window reaches the strip")
  assert.equal(screen.queryByTestId("tl-final-cut"), null, "the frame adds no film hero")
})

test("ARM-2 the run-history gains its chip across the same-params frame", () => {
  const els = mountStudio(PRE_ROW)
  assert.equal(screen.queryByTestId("tl-run-history"), null, "no history before the run's stamp")
  rerenderRow(els, POST_ROW)
  const row = screen.getByTestId("tl-run-history")
  const chips = row.querySelectorAll("a")
  assert.equal(chips.length, 1, "the run's history chip follows the frame")
  assert.equal(chips[0]!.getAttribute("href"), W2, "the chip links the frame's own final")
})

test("ARM-3 the doc readout (the params plane) stays byte-identical across the frame (the rev-silence control)", () => {
  const els = mountStudio(PRE_ROW)
  const before = screen.getByTestId("tl-doc-readout").textContent
  assert.ok(before && before.length > 0, "the doc readout renders")
  rerenderRow(els, POST_ROW)
  const after = screen.getByTestId("tl-doc-readout").textContent
  assert.equal(after, before, "identical params bytes → the doc plane is frozen while the faces move")
})
