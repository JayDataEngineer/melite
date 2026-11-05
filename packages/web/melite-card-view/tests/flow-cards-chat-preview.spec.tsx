// @vitest-environment happy-dom
// flow-cards-chat-preview.spec.tsx — Q3 (operator 2026-11-09), refrozen
// 2026-11-19: the AI shows the finished image/audio/video INLINE in
// the chat window — not only the bench link in the right sidebar.
//
// THE FROZEN LAW (the refresh-flood burn, 2026-11-19: a page refresh
// re-rendered the same settled artifacts in every historical chat
// card, repeating): the in-chat heroes render the PRESS'S OWN settled
// outputs — the preview rows the tool's presentationMeta persisted at
// settle time, through the shared card-base faces. The chat card
// NEVER opens the live tail (no runs/status hydrate, no
// runs/subscribe) and NEVER derives the strip from the present-time
// draft doc: the first cut did, and on replay every historical card
// stamped the whole bench's CURRENT heroes under itself — the same
// stale artifacts N times over. A card that pressed nothing (a patch
// call, a legacy log) renders no strip at all.
import { afterEach, describe, expect, test } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { createElement as h } from "react";
import { FlowCards } from "../src/client/FlowCards.tsx";
import type { ToolCallBlockView } from "../src/client/types.ts";
import { mountEstateFakes, type EstateFakesOptions } from "./estate-harness.ts";

type Fakes = ReturnType<typeof mountEstateFakes>;
let active: Fakes | null = null;

function wire(opts: EstateFakesOptions = {}): Fakes {
  active?.unmount();
  active = mountEstateFakes(opts);
  return active;
}

afterEach(() => {
  active?.unmount();
  active = null;
  cleanup();
});

function settled(over: Partial<ToolCallBlockView> = {}): ToolCallBlockView {
  return {
    kind: "tool-result", callId: "c1", toolName: "melite_flow",
    argsRaw: JSON.stringify({ model: "krea-2" }),
    isError: false, meta: { draft_id: "draft-1" }, content: [],
    ...over,
  } as unknown as ToolCallBlockView;
}

// THE BENCH THE FLOOD RODE: four settled stages the draft doc serves
// at render time — the whole point is that NONE of them may reach the
// thread unless the call's OWN persisted rows name them.
const STAGES: Array<Record<string, unknown>> = [
  { id: "s_vid", title: "film", kind: "generation", service: "krea-2", status: "success", params: {}, result: { artifacts: { output: "https://cdn/x/clip.mp4" } } },
  { id: "s_img", title: "still", kind: "generation", status: "success", params: {}, result: { artifacts: { output: "https://cdn/x/pic.png" } } },
  { id: "s_snd", title: "score", kind: "generation", status: "success", params: {}, result: { artifacts: { output: "https://cdn/x/song.mp3" } } },
  { id: "s_mesh", title: "body", kind: "generation", status: "success", params: {}, result: { artifacts: { out: "https://cdn/x/body.glb" } } },
];

describe("Q3 CHAT PREVIEWS — the press's own persisted rows, frozen", () => {
  test("the call's OWN rows render their heroes (video/image/audio)", async () => {
    wire({ draftStages: STAGES.map((s) => ({ ...s })), draftBenchRev: 3, draftIntent: "the film" });
    render(h(FlowCards, { block: settled({
      meta: {
        draft_id: "draft-1",
        previews: [
          { stage: "s_vid", url: "https://cdn/x/clip.mp4", status: "done" },
          { stage: "s_img", url: "https://cdn/x/pic.png", status: "done" },
          { stage: "s_snd", url: "https://cdn/x/song.mp3", status: "done" },
        ],
      },
    }) }));
    const video = await screen.findByTestId("stage-preview-video-hero", {}, { timeout: 4000 });
    expect(video.getAttribute("src")).toBe("https://cdn/x/clip.mp4");
    const image = await screen.findByTestId("stage-preview-image-hero", {}, { timeout: 4000 });
    expect(image.getAttribute("src")).toBe("https://cdn/x/pic.png");
    const audio = await screen.findByTestId("stage-preview-audio-hero", {}, { timeout: 4000 });
    expect(audio.getAttribute("src")).toBe("https://cdn/x/song.mp3");
  });

  test("THE FLOOD ARM: a card with NO persisted rows renders no strip — the bench's present-time stages never reach the thread", async () => {
    wire({ draftStages: STAGES.map((s) => ({ ...s })), draftBenchRev: 3, draftIntent: "the film" });
    const { container } = render(h(FlowCards, { block: settled() }));
    // wait for the doc hydrate (the rows render from it) so the arm
    // judges the settled state, not a slow paint
    await screen.findByText("film", {}, { timeout: 4000 });
    expect(container.querySelectorAll("[data-chat-preview]")).toHaveLength(0),
      "no press rows, no strip — the whole bench's artifacts must not stamp themselves under a card that pressed nothing";
  });

  test("THE ONCE LAW: only the named stage's hero renders, even when the bench carries other settled stages", async () => {
    wire({ draftStages: STAGES.map((s) => ({ ...s })), draftBenchRev: 3, draftIntent: "the film" });
    const { container } = render(h(FlowCards, { block: settled({
      meta: {
        draft_id: "draft-1",
        previews: [{ stage: "s_vid", url: "https://cdn/x/clip.mp4", status: "done" }],
      },
    }) }));
    const video = await screen.findByTestId("stage-preview-video-hero", {}, { timeout: 4000 });
    expect(video.getAttribute("src")).toBe("https://cdn/x/clip.mp4");
    expect(container.querySelectorAll("[data-chat-preview]")).toHaveLength(1),
      "exactly one hero — the press's own row, never the bench's other settled stages";
  });

  test("mesh rows render no hero (the operator named image/audio/video)", async () => {
    wire({
      draftStages: [{ id: "s_mesh", title: "body", kind: "generation", status: "success", params: {}, result: { artifacts: { out: "https://cdn/x/body.glb" } } }],
      draftBenchRev: 3, draftIntent: "the film",
    });
    const { container } = render(h(FlowCards, { block: settled({
      meta: { draft_id: "draft-1", previews: [{ stage: "s_mesh", url: "https://cdn/x/body.glb", status: "done" }] },
    }) }));
    await screen.findByText("body", {}, { timeout: 4000 });
    expect(container.querySelector("[data-chat-preview]")).toBeNull();
  });

  test("the chat card opens no live tail (frozen: no hydrate, no subscribe)", async () => {
    const seen = wire({
      draftStages: STAGES.map((s) => ({ ...s })),
      draftBenchRev: 3, draftIntent: "the film",
    }).calls;
    render(h(FlowCards, { block: settled({
      meta: { draft_id: "draft-1", previews: [{ stage: "s_vid", url: "https://cdn/x/clip.mp4", status: "done" }] },
    }) }));
    await screen.findByTestId("stage-preview-video-hero", {}, { timeout: 4000 });
    await new Promise((r) => setTimeout(r, 200));
    expect(seen.map((c) => c.method)).not.toContain("runs/status");
    expect(seen.map((c) => c.method)).not.toContain("runs/subscribe");
  });
});
