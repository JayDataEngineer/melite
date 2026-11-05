/**
 * studio-commission-rev.spec.tsx — THE COMMISSION RAIL'S REV LAW
 * (F53, 2026-11-12: "patching the h3 stage's loras bag landed
 * correctly in the BENCH STATE — the next run's _request.json
 * carries NO loras key — but the UI's video timeline bar did NOT
 * re-render the swap; the operator watched the old lora persist").
 *
 * THE LAW: the commission rail is a PURE PROJECTION of the durable
 * row. A bench patch that rewrites the mod bags rewrites the rail on
 * the SAME stage id — no re-open, no re-mint, no stage switch. The
 * rail is never a mint-time snapshot: an agent patch is as live as
 * a studio gesture.
 */
import { afterEach, expect, test } from "vitest"
// @vitest-environment happy-dom
import { render } from "@testing-library/react"
import { createElement as h } from "react"
import { VideoTimelineStudio } from "../src/ui/studio/component.tsx"
import type { StageViewOwnerProps } from "@melite/contracts"

// @contract cards-commission-rev-projection

const DOC = {
  calls: [
    { text: "one", start_frame: 0, end_frame: 80 },
  ],
  fps: 24,
}

/** The QA burn's exact shape: an explicit turbo8 row. */
const TURBO8 = { loras: [{ id: "turbo8_v2.safetensors", strength: 0.8 }] }

function ownerOf(params: Record<string, unknown>): StageViewOwnerProps {
  return {
    stageId: "s_53",
    cardName: "h3-timeline",
    row: { id: "s_53", card: "h3-timeline", title: "H3 Timeline", params },
    runStatus: "",
    onPatch: () => {},
    onRun: () => {},
    onStop: () => {},
    onRemove: () => {},
    onSurface: () => {},
    upstream: [],
    runId: null,
  } as unknown as StageViewOwnerProps
}

afterEach(() => { document.body.innerHTML = "" })

test("THE REV LAW: a patch that clears the loras bag clears the commission lane (no re-mint)", () => {
  // mint: the explicit turbo8 row rides the doc
  const view = render(h(VideoTimelineStudio, ownerOf({ ...DOC, ...TURBO8 })))
  expect(document.querySelector('[data-commission-lane="loras"]')).not.toBeNull()
  expect(document.querySelector('[data-commission-lane="loras"]')!.textContent)
    .toContain("turbo8_v2.safetensors")

  // the patch (the QA's ground truth: the bag cleared to the family
  // default — the next run's _request.json carries NO loras key)
  view.rerender(h(VideoTimelineStudio, ownerOf({ ...DOC })))
  expect(document.querySelector('[data-commission-lane="loras"]')).toBeNull()
})

test("THE REV LAW (the add direction): a patch that arms a bag draws its lane on the same stage id", () => {
  const view = render(h(VideoTimelineStudio, ownerOf({ ...DOC })))
  expect(document.querySelector('[data-commission-lane="loras"]')).toBeNull()

  view.rerender(h(VideoTimelineStudio, ownerOf({ ...DOC, ...TURBO8 })))
  const lane = document.querySelector('[data-commission-lane="loras"]')
  expect(lane).not.toBeNull()
  expect(lane!.textContent).toContain("turbo8_v2.safetensors")
})

test("THE REV LAW (the swap): a patch that swaps the row's seats rewrites the lane's words", () => {
  const view = render(h(VideoTimelineStudio, ownerOf({ ...DOC, ...TURBO8 })))
  expect(document.querySelector('[data-commission-lane="loras"]')!.textContent)
    .toContain("turbo8_v2.safetensors")

  view.rerender(h(VideoTimelineStudio, ownerOf({
    ...DOC, loras: [{ id: "silver_v10.safetensors", strength: 1 }],
  })))
  const lane = document.querySelector('[data-commission-lane="loras"]')!
  expect(lane.textContent).toContain("silver_v10.safetensors")
  expect(lane.textContent).not.toContain("turbo8_v2.safetensors")
})
