// @vitest-environment happy-dom
// flow-cards-chat-preview.spec.tsx — NO MEDIA IN THE MAIN CHAT
// (operator 2026-11-05: "I don't want to see images in the main chat.
// That feature is extremely broken, and only harms stuff. If the
// agent truly desires to share an output, then they must do a
// toolcall, not just have images, videos, audio to show up in the
// main chat."). This wall SUPERSEDES the Q3 2026-11-09 inline-hero
// law: the thread NEVER mounts image/video/audio faces from a melite
// chat card — however rich the block's persisted presentationMeta is
// (previews + artifact sets stay in the meta channel; the share verb,
// owed, is the only future media seat and it is an explicit
// toolcall of its own). The frozen-rows law underneath survives
// untouched: a settled card renders ITS OWN press's rows and intent,
// fires no drafts/get under replay, and a card that pressed nothing
// renders no rows.
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
// at render time — none of them may reach the thread as rows OR media
// unless the call's OWN persisted meta names them.
const STAGES: Array<Record<string, unknown>> = [
  { id: "s_vid", title: "film", kind: "generation", service: "krea-2", status: "success", params: {}, result: { artifacts: { output: "https://cdn/x/clip.mp4" } } },
  { id: "s_img", title: "still", kind: "generation", status: "success", params: {}, result: { artifacts: { output: "https://cdn/x/pic.png" } } },
  { id: "s_snd", title: "score", kind: "generation", status: "success", params: {}, result: { artifacts: { output: "https://cdn/x/song.mp3" } } },
  { id: "s_mesh", title: "body", kind: "generation", status: "success", params: {}, result: { artifacts: { out: "https://cdn/x/body.glb" } } },
];

function mediaMounts(container: HTMLElement): number {
  return container.querySelectorAll("img, video, audio").length;
}

/** Poll until the named stage row renders (the frozen/doc rows face). */
async function waitForRows(container: HTMLElement, stageId: string): Promise<void> {
  const deadline = Date.now() + 4000;
  while (Date.now() < deadline) {
    if (container.querySelector('[data-stage="' + stageId + '"]') !== null) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error("stage row not rendered: " + stageId);
}

describe("NO MEDIA IN THE MAIN CHAT — the thread's chat cards mount zero media faces", () => {
  test("THE HERO BAN: a call whose meta carries full previews (video/image/audio urls + artifact sets) renders its frozen rows and ZERO img/video/audio mounts", async () => {
    wire({ draftStages: STAGES.map((s) => ({ ...s })), draftBenchRev: 3, draftIntent: "the film" });
    const { container } = render(h(FlowCards, { block: settled({
      meta: {
        draft_id: "draft-1",
        previews: [
          { stage: "s_vid", url: "https://cdn/x/clip.mp4", status: "done", artifacts: ["https://cdn/x/clip.mp4"] },
          { stage: "s_img", url: "https://cdn/x/pic.png", status: "done", artifacts: ["https://cdn/x/pic.png"] },
          { stage: "s_snd", url: "https://cdn/x/song.mp3", status: "done", artifacts: ["https://cdn/x/song.mp3"] },
        ],
        rows: [
          { stage: "s_vid", card: "video-card", status: "done", run_id: "r_1", url: "https://cdn/x/clip.mp4", artifacts: ["https://cdn/x/clip.mp4"] },
          { stage: "s_img", card: "image-gen", status: "done", run_id: "r_2", url: "https://cdn/x/pic.png", artifacts: ["https://cdn/x/pic.png"] },
          { stage: "s_snd", card: "audio-card", status: "done", run_id: "r_3", url: "https://cdn/x/song.mp3", artifacts: ["https://cdn/x/song.mp3"] },
        ],
      },
    }) }));
    // the frozen rows still render (the press's own face is text rows)
    await waitForRows(container, 's_vid');
    expect(mediaMounts(container),
      "previews in meta mount NOTHING — no hero, no strip, no thumb").toBe(0);
    expect(container.querySelectorAll("[data-chat-preview]")).toHaveLength(0);
  });

  test("THE FLOOD ARM: a card with NO persisted rows (the pre-cure class) may derive its rows from the live doc — but NEVER mounts media, however settled the bench is", async () => {
    wire({ draftStages: STAGES.map((s) => ({ ...s })), draftBenchRev: 3, draftIntent: "the film" });
    const { container } = render(h(FlowCards, { block: settled() }));
    // the doc path renders the present bench's rows (the lawful
    // pre-cure class) — wait for them so the arm judges the settled
    // state, not a slow paint
    await waitForRows(container, 's_vid');
    expect(mediaMounts(container),
      "four settled stages with urls, and the thread mounts zero media — the doc path never mounts faces either").toBe(0);
    expect(container.querySelectorAll("[data-chat-preview]")).toHaveLength(0);
  });

  test("THE ROW THUMB BAN: a frozen row whose meta carries a lead url renders the kind chip, never an img thumb", async () => {
    wire({ draftStages: STAGES.map((s) => ({ ...s })), draftBenchRev: 3, draftIntent: "the film" });
    const { container } = render(h(FlowCards, { block: settled({
      meta: {
        draft_id: "draft-1",
        rows: [{ stage: "s_img", card: "image-gen", status: "done", run_id: "r_2", url: "https://cdn/x/pic.png", artifacts: ["https://cdn/x/pic.png"] }],
      },
    }) }));
    await waitForRows(container, 's_img');
    expect(mediaMounts(container),
      "a row's lead url is data (the drill's thumb), never a chat-face img").toBe(0);
    expect(container.querySelectorAll('[data-stage="s_img"]')).toHaveLength(1);
  });

  test("mesh previews (never a hero class anyway) stay text rows with zero mounts", async () => {
    wire({
      draftStages: [{ id: "s_mesh", title: "body", kind: "generation", status: "success", params: {}, result: { artifacts: { out: "https://cdn/x/body.glb" } } }],
      draftBenchRev: 3, draftIntent: "the film",
    });
    const { container } = render(h(FlowCards, { block: settled({
      meta: { draft_id: "draft-1", previews: [{ stage: "s_mesh", url: "https://cdn/x/body.glb", status: "done", artifacts: [] }] },
    }) }));
    await new Promise((r) => setTimeout(r, 200));
    expect(mediaMounts(container)).toBe(0);
  });
});
