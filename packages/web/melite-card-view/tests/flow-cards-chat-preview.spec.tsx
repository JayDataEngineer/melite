// @vitest-environment happy-dom
// flow-cards-chat-preview.spec.tsx — Q3 (operator 2026-11-09): the AI
// shows the finished image/audio/video INLINE in the chat window —
// not only the bench link in the right sidebar.
//
// THE FROZEN LAW: the in-chat heroes render the SETTLED stage's own
// artifacts off the already-fetched draft doc (one hero per stage,
// through the shared card-base faces). The chat card NEVER opens the
// live tail: no runs/status hydrate, no runs/subscribe — the bench
// keeps live progress, the thread keeps a replay-safe snapshot.
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

const STAGES: Array<Record<string, unknown>> = [
  { id: "s_vid", title: "film", kind: "generation", service: "krea-2", status: "success", params: {}, result: { artifacts: { output: "https://cdn/x/clip.mp4" } } },
  { id: "s_img", title: "still", kind: "generation", status: "success", params: {}, result: { artifacts: { output: "https://cdn/x/pic.png" } } },
  { id: "s_snd", title: "score", kind: "generation", status: "success", params: {}, result: { artifacts: { output: "https://cdn/x/song.mp3" } } },
  { id: "s_mesh", title: "body", kind: "generation", status: "success", params: {}, result: { artifacts: { out: "https://cdn/x/body.glb" } } },
];

describe("Q3 CHAT PREVIEWS — settled artifacts render inline, frozen", () => {
  test("video/image/audio stages render their heroes with the settled urls", async () => {
    wire({ draftStages: STAGES.map((s) => ({ ...s })), draftBenchRev: 3, draftIntent: "the film" });
    render(h(FlowCards, { block: settled() }));
    const video = await screen.findByTestId("stage-preview-video-hero", {}, { timeout: 4000 });
    expect(video.getAttribute("src")).toBe("https://cdn/x/clip.mp4");
    const image = await screen.findByTestId("stage-preview-image-hero", {}, { timeout: 4000 });
    expect(image.getAttribute("src")).toBe("https://cdn/x/pic.png");
    const audio = await screen.findByTestId("stage-preview-audio-hero", {}, { timeout: 4000 });
    expect(audio.getAttribute("src")).toBe("https://cdn/x/song.mp3");
  });

  test("mesh stages render no hero (the operator named image/audio/video)", async () => {
    wire({
      draftStages: [{ id: "s_mesh", title: "body", kind: "generation", status: "success", params: {}, result: { artifacts: { out: "https://cdn/x/body.glb" } } }],
      draftBenchRev: 3, draftIntent: "the film",
    });
    const { container } = render(h(FlowCards, { block: settled() }));
    await screen.findByText("body", {}, { timeout: 4000 });
    expect(container.querySelector("[data-chat-preview]")).toBeNull();
  });

  test("the chat card opens no live tail (frozen: no hydrate, no subscribe)", async () => {
    const seen = wire({
      draftStages: STAGES.map((s) => ({ ...s })),
      draftBenchRev: 3, draftIntent: "the film",
    }).calls;
    render(h(FlowCards, { block: settled() }));
    await screen.findByTestId("stage-preview-video-hero", {}, { timeout: 4000 });
    await new Promise((r) => setTimeout(r, 200));
    expect(seen.map((c) => c.method)).not.toContain("runs/status");
    expect(seen.map((c) => c.method)).not.toContain("runs/subscribe");
  });
});
