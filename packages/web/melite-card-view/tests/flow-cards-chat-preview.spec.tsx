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

  // THE RUN-SPELLED WALL (the stale-two-run audit §walls a,
  // 2026-11-15): the captured burn painted two heroes from two
  // different runs under a present-bench pending row. These fixtures
  // carry the burn's own urls — the meta rows under run-ceeb…/
  // run-c80a…, the draft doc's stage results under OTHER run ids —
  // and demand the heroes' srcs are the META urls exactly.
  test("THE RUN-SPELLED WALL: hero srcs are the meta urls exactly — the doc's other-run results never paint", async () => {
    const metaUrls = [
      "/melite-media/runs/run-ceeb721bcd51-a9cbfe9f/h3-film/SaveVideo.0_h3_t4_w1_00001_.mp4",
      "/melite-media/runs/run-c80a8afa5a28-a9ccdde4/h3-film/SaveVideo.2_extend_film_00001_.mp4",
    ];
    wire({
      draftStages: [
        // the foreign bench: both stages settled under OTHER runs — if
        // the strip derives from the doc, THESE srcs paint (the bleed).
        { id: "s_a", title: "windows", kind: "generation", status: "success", params: {}, result: { url: "/melite-media/runs/run-OTHER-a/h3-film/SaveVideo.9_film_00001_.mp4", artifacts: { output: "/melite-media/runs/run-OTHER-a/h3-film/SaveVideo.9_film_00001_.mp4" } } },
        { id: "s_b", title: "film", kind: "generation", status: "success", params: {}, result: { url: "/melite-media/runs/run-OTHER-b/h3-film/SaveVideo.8_film_00001_.mp4" } },
      ],
      draftBenchRev: 3, draftIntent: "the foreign bench",
    });
    const { container } = render(h(FlowCards, { block: settled({
      meta: {
        draft_id: "draft-1",
        previews: [
          { stage: "s_a", url: metaUrls[0], status: "done" },
          { stage: "s_b", url: metaUrls[1], status: "done" },
        ],
      },
    }) }));
    const heroes = await screen.findAllByTestId("stage-preview-video-hero", {}, { timeout: 4000 });
    expect(heroes).toHaveLength(2);
    expect(heroes.map((v) => v.getAttribute("src"))).toEqual(metaUrls);
    expect(container.querySelectorAll("[data-chat-preview]")).toHaveLength(2);
  });

  // THE FOUR-TAKE FACE (the stale-two-run audit §walls c, cure 2,
  // 2026-11-15): one hero + four strip thumbs — the whole set renders
  // (the all-visible law, card-base preview.tsx), never the lead alone.
  test("THE FOUR-TAKE FACE: a meta row with a 4-artifact set renders one hero + four strip thumbs", async () => {
    const set = [
      "/melite-media/runs/run-4takes/h3-film/SaveVideo.2_film_00001_.mp4",
      "/melite-media/runs/run-4takes/h3-film/SaveVideo.0_h3_t4_w1_00001_.mp4",
      "/melite-media/runs/run-4takes/h3-film/SaveVideo.1_h3_t4_w2_00001_.mp4",
      "/melite-media/runs/run-4takes/h3-film/SaveVideo.3_h3_t4_w3_00001_.mp4",
    ];
    wire({ draftStages: STAGES.map((s) => ({ ...s })), draftBenchRev: 3, draftIntent: "the film" });
    const { container } = render(h(FlowCards, { block: settled({
      meta: {
        draft_id: "draft-1",
        previews: [{ stage: "s_vid", url: set[0], status: "done", artifacts: set }],
      },
    }) }));
    const hero = await screen.findByTestId("stage-preview-video-hero", {}, { timeout: 4000 });
    expect(hero.getAttribute("src")).toBe(set[0]);
    const strip = container.querySelector('[data-testid="stage-preview-video-strip"]');
    expect(strip).not.toBeNull();
    expect(strip!.querySelectorAll("button")).toHaveLength(4);
    // every thumb renders one of the set's urls (the order rides too)
    const thumbSrcs = Array.from(strip!.querySelectorAll("button")).map((t) =>
      (t.querySelector("video") ?? t.querySelector("img"))?.getAttribute("src"));
    expect(thumbSrcs).toEqual(set);
  });

  // THE DISCRIMINATOR (the stale-two-run audit §walls b, cure 1,
  // 2026-11-15): a settled block WITH meta.rows renders its OWN press —
  // the frozen rows face + the frozen head — and fires NO drafts/get.
  test("THE DISCRIMINATOR: a settled block with meta.rows fires no drafts/get and renders exactly meta.rows", async () => {
    const seen = wire({
      // THE FOREIGN BENCH: the fake serves a DIFFERENT stage list with
      // a DIFFERENT intent — if the card re-derives from the doc, the
      // foreign rows paint and this arm reds on both counts.
      draftStages: [
        { id: "f_0", title: "foreign stage", kind: "generation", status: "pending", params: {} },
        { id: "f_1", title: "another foreign", kind: "generation", status: "success", params: {} },
        { id: "f_2", title: "third foreign", kind: "generation", status: "success", params: {} },
      ],
      draftBenchRev: 99, draftIntent: "THE PRESENT-BENCH INTENT",
    }).calls;
    const { container } = render(h(FlowCards, { block: settled({
      meta: {
        draft_id: "draft-1",
        intent: "the frozen press's own intent",
        rows: [
          { stage: "s_w", card: "h3-timeline", status: "done", run_id: "run-ceeb721bcd51-a9cbfe9f", url: "/melite-media/runs/run-ceeb721bcd51-a9cbfe9f/h3-film/SaveVideo.0_h3_t4_w1_00001_.mp4" },
          { stage: "s_q", card: "image-gen", status: "queued", run_id: "run-c80a8afa5a28-a9ccdde4" },
          { stage: "s_sk", card: "tts", status: "skipped" },
          { stage: "s_th", card: "sweep", status: "error" },
        ],
        previews: [
          { stage: "s_w", url: "/melite-media/runs/run-ceeb721bcd51-a9cbfe9f/h3-film/SaveVideo.0_h3_t4_w1_00001_.mp4", status: "done" },
        ],
      },
    }) }));
    // the frozen rows render synchronously (no fetch behind them)
    await screen.findByText("the frozen press's own intent", {}, { timeout: 4000 });
    const rendered = Array.from(container.querySelectorAll("[data-stage]"))
      .map((el) => [el.getAttribute("data-stage"), el.getAttribute("data-status")]);
    expect(rendered).toEqual([
      ["s_w", "done"],
      ["s_q", "queued"],
      ["s_sk", "skipped"],
      ["s_th", "error"],
    ]);
    expect(container.textContent).not.toContain("THE PRESENT-BENCH INTENT");
    expect(container.textContent).not.toContain("foreign stage");
    // the auto-render half: no drafts/get — the storm is dead
    await new Promise((r) => setTimeout(r, 200));
    expect(seen.map((c) => c.method)).not.toContain("drafts/get");
  });

  // THE PENDING RECEIPT (the stale-two-run audit §walls b, cure 1):
  // a settled block whose meta.status is the pending receipt — the
  // pass SO FAR, its last stage queued without a url — renders heroes
  // only for the rows that minted urls, and its rows are the meta rows.
  test("THE PENDING RECEIPT: heroes only for pass rows that minted urls; rows are meta.rows", async () => {
    wire({
      draftStages: [{ id: "f_0", title: "foreign", kind: "generation", status: "pending", params: {} }],
      draftBenchRev: 99, draftIntent: "THE PRESENT-BENCH INTENT",
    });
    const { container } = render(h(FlowCards, { block: settled({
      meta: {
        draft_id: "draft-1",
        intent: "the pending press",
        status: "pending",
        rows: [
          { stage: "s_w", card: "h3-timeline", status: "done", run_id: "run-ceeb721bcd51-a9cbfe9f", url: "/melite-media/runs/run-ceeb721bcd51-a9cbfe9f/h3-film/SaveVideo.0_h3_t4_w1_00001_.mp4" },
          { stage: "s_q", card: "h3-timeline", status: "queued", run_id: "run-c80a8afa5a28-a9ccdde4" },
        ],
        previews: [
          { stage: "s_w", url: "/melite-media/runs/run-ceeb721bcd51-a9cbfe9f/h3-film/SaveVideo.0_h3_t4_w1_00001_.mp4", status: "done" },
        ],
      },
    }) }));
    const hero = await screen.findByTestId("stage-preview-video-hero", {}, { timeout: 4000 });
    expect(hero.getAttribute("src")).toBe("/melite-media/runs/run-ceeb721bcd51-a9cbfe9f/h3-film/SaveVideo.0_h3_t4_w1_00001_.mp4");
    expect(container.querySelectorAll("[data-chat-preview]")).toHaveLength(1);
    const rendered = Array.from(container.querySelectorAll("[data-stage]"))
      .map((el) => [el.getAttribute("data-stage"), el.getAttribute("data-status")]);
    expect(rendered).toEqual([["s_w", "done"], ["s_q", "queued"]]);
  });
});
