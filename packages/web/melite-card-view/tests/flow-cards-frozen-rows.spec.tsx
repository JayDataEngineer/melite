// @vitest-environment happy-dom
// flow-cards-frozen-rows.spec.tsx — THE JOURNEY-CROSSING WALL (the
// stale-two-run audit §walls d, canon axis DEPTH, 2026-11-15): the
// meta projection is judged tool-side (melite-flow.spec) and the
// strip render client-side (flow-cards-chat-preview.spec), but no
// wall crossed the real journey. This one does, end to end:
//
//   melite_flow execute (a real bench press against a fake estate)
//     → the tool's REAL presentationMeta projection
//       → the persisted meta on a settled block
//         → parseCardsBlock
//           → the frozen rows face rendering over mountEstateFakes
//
// The discriminator law it pins: a settled block whose meta carries
// rows renders ITS OWN press — the frozen rows, the frozen head, the
// frozen heroes — and fires NO drafts/get, however different the live
// bench behind it is. Hand-writing the meta shape would judge a copy
// of the truth; this arm feeds the projector's own bytes through.
import { afterEach, describe, expect, test } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { createElement as h } from "react";
import { meliteFlow } from "../../../harness/melite-tools/src/tools/melite-flow.ts";
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

// THE PRESS'S OWN SETS (the captured burn's shapes): stage one is the
// four-take h3 stage (the film leads its set, the window shards ride
// beside it), stage two mints one image. The runs door's ordering law
// (the lead first) is mirrored, so the projector's set is the truth
// the run actually served.
const FILM_RUN = "run-ceeb721bcd51-a9cbfe9f";
const IMAGE_RUN = "run-c80a8afa5a28-a9ccdde4";
const FILM_SET = [
  `/melite-media/runs/${FILM_RUN}/h3-film/SaveVideo.2_film_00001_.mp4`,
  `/melite-media/runs/${FILM_RUN}/h3-film/SaveVideo.0_h3_t4_w1_00001_.mp4`,
  `/melite-media/runs/${FILM_RUN}/h3-film/SaveVideo.1_h3_t4_w2_00001_.mp4`,
  `/melite-media/runs/${FILM_RUN}/h3-film/SaveVideo.3_h3_t4_w3_00001_.mp4`,
];
const IMAGE_URL = `/melite-media/runs/${IMAGE_RUN}/still/SaveImage_00001_.png`;
const PRESS_INTENT = "four 5s takes: pink chibi sakura, cyberpunk twin-tail, terminal boot, vaporwave chrome";

/** The estate far side the press crosses: one benchGet, one runsStart
 *  per stage (counter-minted ids), a terminal runsStatus per run, and
 *  the drafts stage door answering the attribution stamps. Params
 *  carry model explicitly — modelForCard short-circuits off the real
 *  card registry (the dom project loads no engine plane). */
function crossEstate(): never {
  let starts = 0;
  return {
    benchGet: async () => ({
      draft_id: "d_cross", rev: 2, intent: PRESS_INTENT,
      stages: [
        { id: "s_0", card: "h3-timeline", params: { model: "h3", prompt: "takes" } },
        { id: "s_1", card: "image-gen", params: { model: "krea-2", prompt: "still" } },
      ],
    }),
    runsStart: async () => {
      starts += 1;
      return { run_id: starts === 1 ? FILM_RUN : IMAGE_RUN, status: "queued", queue_position: 0 };
    },
    runsStatus: async (runId: string) => runId === FILM_RUN
      ? {
          status: "completed",
          stages: [{
            id: "s_0",
            url: "h3-film/SaveVideo.2_film_00001_.mp4",
            gallery: FILM_SET.map((u) => ({ name: u.slice(`/melite-media/runs/${FILM_RUN}/`.length) })),
          }],
          artifacts: [],
        }
      : {
          status: "completed",
          stages: [{ id: "s_1", url: IMAGE_URL }],
          artifacts: [],
        },
    draftsStagePatch: async () => ({ delivered: true }),
  } as never;
}

describe("THE FROZEN-ROWS JOURNEY — the projector's real meta through parseCardsBlock to the render", () => {
  test("a real bench press's meta renders the frozen face over a foreign bench, firing no drafts/get", async () => {
    // LEG 1 — the press: a real melite_flow bench execute.
    const tool = meliteFlow(crossEstate());
    const out = await tool.execute({ bench: true }, {
      signal: AbortSignal.timeout(5000),
      agent: { id: "session-cross" },
    } as never) as Record<string, unknown>;
    expect(out.status).toBe("done");
    expect(out.intent).toBe(PRESS_INTENT);
    const pass = out.pass as Array<Record<string, unknown>>;
    expect(pass).toHaveLength(2);
    expect(pass[0]!["asset_urls"]).toEqual(FILM_SET);
    expect(pass[1]!["asset_urls"]).toEqual([IMAGE_URL]);

    // LEG 2 — the projector: the tool's OWN presentationMeta, verbatim.
    const meta = tool.output.presentationMeta!({ bench: true } as never, out as never) as Record<string, unknown>;
    expect(meta["intent"]).toBe(PRESS_INTENT);
    expect(meta["draft_id"]).toBe("d_cross");
    const metaRows = meta["rows"] as Array<Record<string, unknown>>;
    expect(metaRows).toEqual([
      { stage: "s_0", card: "h3-timeline", status: "done", run_id: FILM_RUN, url: FILM_SET[0], artifacts: FILM_SET },
      { stage: "s_1", card: "image-gen", status: "done", run_id: IMAGE_RUN, url: IMAGE_URL, artifacts: [IMAGE_URL] },
    ]);
    const metaPreviews = meta["previews"] as Array<Record<string, unknown>>;
    expect(metaPreviews).toEqual([
      { stage: "s_0", url: FILM_SET[0], status: "done", artifacts: FILM_SET },
      { stage: "s_1", url: IMAGE_URL, status: "done", artifacts: [IMAGE_URL] },
    ]);

    // LEG 3 — the replay: the persisted meta on a settled block, over
    // a bench fake serving a DIFFERENT stage list and intent (the
    // present-tense bench every later press rewrites whole).
    const seen = wire({
      draftStages: [
        { id: "f_0", title: "foreign one", kind: "generation", status: "pending", params: {} },
        { id: "f_1", title: "foreign two", kind: "generation", status: "success", params: {} },
      ],
      draftBenchRev: 99, draftIntent: "THE PRESENT-BENCH INTENT",
    }).calls;
    const { container } = render(h(FlowCards, {
      block: {
        kind: "tool-result", callId: "c1", toolName: "melite_flow",
        argsRaw: JSON.stringify({ bench: true }),
        isError: false, meta, content: [],
      } as unknown as ToolCallBlockView,
    }));

    // the head: the settle-time intent, never the present bench's
    await screen.findByText(PRESS_INTENT, {}, { timeout: 4000 });
    expect(container.textContent).not.toContain("THE PRESENT-BENCH INTENT");

    // the rows: exactly meta.rows — stage ids and fold statuses in order
    const rendered = Array.from(container.querySelectorAll("[data-stage]"))
      .map((el) => [el.getAttribute("data-stage"), el.getAttribute("data-status")]);
    expect(rendered).toEqual([
      ["s_0", "done"],
      ["s_1", "done"],
    ]);
    expect(container.textContent).not.toContain("foreign one");

    // the heroes: the meta previews' own urls — the film leads its set,
    // the image previews image (the kinds ride the url spellings)
    const film = await screen.findByTestId("stage-preview-video-hero", {}, { timeout: 4000 });
    expect(film.getAttribute("src")).toBe(FILM_SET[0]);
    const strip = container.querySelector('[data-testid="stage-preview-video-strip"]');
    expect(strip).not.toBeNull();
    expect(strip!.querySelectorAll("button")).toHaveLength(4);
    const image = await screen.findByTestId("stage-preview-image-hero", {}, { timeout: 4000 });
    expect(image.getAttribute("src")).toBe(IMAGE_URL);
    expect(container.querySelectorAll("[data-chat-preview]")).toHaveLength(2);

    // THE AUTO-RENDER HALF: no drafts/get crossed the render — the
    // 193-GETs-per-paint storm is dead for this card.
    await new Promise((r) => setTimeout(r, 200));
    expect(seen.map((c) => c.method)).not.toContain("drafts/get");
  });
});
