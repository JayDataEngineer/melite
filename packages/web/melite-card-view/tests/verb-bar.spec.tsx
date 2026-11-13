// @vitest-environment happy-dom
// verb-bar.spec.tsx — THE VERB BAR WALL (MHR slice 2, 2026-11-13):
// a registered verb a human cannot press is still a dead verb. The
// bar's law has four firing arms — (1) the SERVED arm: every verb
// row on the spec's verbs array renders its own button, and a
// local-only verb (flow null) renders DISABLED with its voice,
// never a dead button; (2) the PRESS arm: the invocation rides the
// {flow:} door with the EXACT body (the registry flow id, the
// intake mapped initials sourced from the stage's current params,
// the dialog's fields as the params overlay, draft_id, test:false);
// (3) the HYDRATION arm: a settled run's stage url lands on the
// stage through the same drafts/patch ledger every edit rides; (4)
// the REFUSAL arm: a missing intake source voices the named param
// and never opens the wire. The press does NOT mint a compose —
// the flow door composes server-side (the variant-route law).
import { LOADED_WAIT } from "../../../../tests/helpers/loaded-wait.ts";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { mountEstateFakes, type EstateFakes } from "./estate-harness.ts";
import { unbindEstateRemote, schemaEnvelope } from "@melite/card-base/client";
import { draftIdOf } from "@melite/contracts/benchStage";
import { resetStageWrites } from "../src/client/draft.ts";
import { VerbBar } from "../src/client/verb-bar.tsx";
import { CardsTab } from "../src/client/CardsTab.tsx";
import type { BenchStageView, CardsBenchValue } from "../src/client/cards-resource.ts";

/** The estimator's SERVED row (discovery.ts's emission shape for the
 *  anny hmr-estimate registration — id/label/fields envelope/writes/
 *  flow/initials, authored to mirror the wire bytes). */
const ESTIMATOR_ROW = {
  id: "hmr-estimate",
  label: "Estimate body from photo",
  fields: schemaEnvelope({
    person_index: {
      type: "number",
      meta: {
        description: "Person", default: 0,
        extra: { wtype: "number", tooltip: "Which detected person to fit (0 = the most confident detection)." },
      },
    },
  }),
  writes: ["body_glb"],
  flow: "anny-hmr-estimator",
  initials: { photo: "body_image" },
} as const;

/** preset-save's served row: a LOCAL-ONLY verb (no flow route) — the
 *  bar's disabled arm (never a dead button). */
const LOCAL_ROW = {
  id: "preset-save",
  label: "Save character as preset",
  fields: schemaEnvelope({
    name: { type: "string", meta: { description: "Preset name", extra: { wtype: "text", required: true } } },
  }),
  writes: [] as readonly string[],
  flow: null,
  initials: {} as Record<string, string>,
} as const;

let fakes: EstateFakes | null = null;

/** The recorded runs/start doc (the press body's SSOT). */
function startDoc(): Record<string, unknown> | undefined {
  const call = fakes?.calls.find((c) => c.method === "runs/start");
  return call === undefined ? undefined : call.args["doc"] as Record<string, unknown>;
}

function mountBar(opts: {
  verbs?: Array<Record<string, unknown>>;
  params?: Record<string, unknown>;
  runDocs?: Array<Record<string, unknown>>;
} = { }): Array<Record<string, unknown>> {
  const writes: Array<Record<string, unknown>> = [];
  fakes = mountEstateFakes({ runDocs: opts.runDocs ?? [] });
  render(h(VerbBar, {
    verbs: (opts.verbs ?? [ESTIMATOR_ROW]) as never,
    draftId: draftIdOf("d-verb"),
    stageId: "s_0",
    params: opts.params ?? { body_image: "/photo.png" },
    onWrite: (w) => { writes.push(w); },
    pollIntervalMs: 15,
  }));
  return writes;
}

afterEach(() => {
  cleanup();
  unbindEstateRemote();
  vi.unstubAllGlobals();
  resetStageWrites();
  fakes = null;
});

describe("the verb bar — served verbs, local-only voice", () => {
  test("one button per verb; a local-only verb is disabled with its voice", async () => {
    mountBar({ verbs: [ESTIMATOR_ROW, LOCAL_ROW] });
    const bar = await screen.findByTestId("verb-bar");
    const est = within(bar).getByText("Estimate body from photo").closest("button") as HTMLElement;
    expect(est.disabled).toBe(false);
    const local = within(bar).getByText("Save character as preset").closest("button") as HTMLElement;
    expect(local.disabled).toBe(true);
    expect(local.title).toContain("runs locally");
  });

  test("the dialog renders the envelope's fields and the intake note", async () => {
    mountBar();
    const user = userEvent.setup();
    await user.click(screen.getByText("Estimate body from photo"));
    const dialog = await screen.findByTestId("verb-dialog");
    // the number field rides its declared wtype, seeded with the
    // schema's own default (never a blank lie)
    const num = dialog.querySelector('[data-field="person_index"]') as HTMLInputElement;
    expect(num.type).toBe("number");
    expect(num.value).toBe("0");
    expect(screen.getByTestId("verb-intake").textContent).toContain("photo ← body_image");
  });
});

describe("the press — the {flow:} door's exact body", () => {
  test("the press carries flow, mapped intake, dialog overlay, draft_id, test:false", async () => {
    mountBar({
      runDocs: [{ run_id: "run-1", status: "completed", stages: [{ id: "est", url: "/body-r0.glb" }] }],
    });
    const user = userEvent.setup();
    await user.click(screen.getByText("Estimate body from photo"));
    await user.click(await screen.findByTestId("verb-run"));
    await waitFor(() => { expect(startDoc()).toBeDefined(); }, { timeout: 4000 });
    // press_key: startRun auto-mints one per press (the N-E1 law —
    // one mint per press, never a client-supplied key); its VALUE is
    // the mint's own, so the wall pins its shape, not its bytes.
    expect(startDoc()).toEqual({
      flow: "anny-hmr-estimator",
      photo: "/photo.png",
      params: { person_index: 0 },
      draft_id: "d-verb",
      test: false,
      press_key: expect.any(String),
    });
  });

  test("a typed field edit rides the overlay coerced (raw strings never wire)", async () => {
    mountBar({
      runDocs: [{ run_id: "run-1", status: "completed", stages: [{ id: "est", url: "/body-r0.glb" }] }],
    });
    const user = userEvent.setup();
    await user.click(screen.getByText("Estimate body from photo"));
    const num = (await screen.findByTestId("verb-dialog")).querySelector('[data-field="person_index"]') as HTMLInputElement;
    await user.clear(num);
    await user.type(num, "2");
    await user.click(screen.getByTestId("verb-run"));
    await waitFor(() => { expect(startDoc()).toBeDefined(); }, { timeout: 4000 });
    expect(startDoc()?.["params"]).toEqual({ person_index: 2 });
  });
});

describe("the hydration — a settled run writes the stage", () => {
  test("the terminal stage url lands through onWrite (the verb's declared write)", async () => {
    const writes = mountBar({
      runDocs: [
        { run_id: "run-1", status: "running", stages: [{ id: "est" }] },
        { run_id: "run-1", status: "completed", stages: [{ id: "est", url: "/body-r0.glb" }] },
      ],
    });
    const user = userEvent.setup();
    await user.click(screen.getByText("Estimate body from photo"));
    await user.click(screen.getByTestId("verb-run"));
    await waitFor(() => { expect(writes).toEqual([{ body_glb: "/body-r0.glb" }]); }, { timeout: 4000 });
    expect(await screen.findByTestId("verb-note")).toHaveTextContent("body_glb seated from run run-1");
  });

  test("a terminal run with no artifact voices the failure, never a silent write", async () => {
    mountBar({
      runDocs: [{ run_id: "run-1", status: "failed", error: "estimator lane refused", stages: [{ id: "est" }] }],
    });
    const user = userEvent.setup();
    await user.click(screen.getByText("Estimate body from photo"));
    await user.click(screen.getByTestId("verb-run"));
    const note = await screen.findByTestId("verb-note", {}, { timeout: 4000 });
    expect(note).toHaveTextContent("estimator lane refused");
  });

  test("a writeless verb with a settled url voices noArtifact (nothing to hydrate)", async () => {
    mountBar({
      verbs: [{ ...ESTIMATOR_ROW, writes: [] as readonly string[] }],
      runDocs: [{ run_id: "run-1", status: "completed", stages: [{ id: "est", url: "/body-r0.glb" }] }],
    });
    const user = userEvent.setup();
    await user.click(screen.getByText("Estimate body from photo"));
    await user.click(screen.getByTestId("verb-run"));
    const note = await screen.findByTestId("verb-note", {}, { timeout: 4000 });
    expect(note).toHaveTextContent("settled completed with no artifact");
  });
});

describe("the refusal — a missing intake source never opens the wire", () => {
  test("a stage without the mapped param voices the named gap", async () => {
    mountBar({ params: { steps: 8 } });
    const user = userEvent.setup();
    await user.click(screen.getByText("Estimate body from photo"));
    await user.click(screen.getByTestId("verb-run"));
    const note = await screen.findByTestId("verb-note");
    expect(note).toHaveTextContent("the stage carries no body_image");
    // NEVER a wire call: the refusal precedes the door
    expect(startDoc()).toBeUndefined();
    expect(fakes?.calls.some((c) => c.method === "runs/start")).toBe(false);
  });
});

// ── THE DRILL SEAT — the bar rides the real drill, and the
// hydration rides the real drafts/patch ledger ──────────────────

/** the stubbed /v1 doors (the one-lane law: estate verbs ride the
 * bound fake; only the discovery doors stub fetch). */
let serveVerbs = true;

function stubDiscoveryFetch(): void {
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    const path = String(url);
    const reply = (body: unknown): Response =>
      new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
    if (path.includes("/v1/form-spec")) {
      return reply({
        form: "anny", genre: "3d", engine: "comfyui",
        schema: schemaEnvelope({
          body_image: { type: "string", meta: { description: "Photo face", extra: { wtype: "image" } } },
        }),
        ...(serveVerbs ? { verbs: [ESTIMATOR_ROW] } : {}),
      });
    }
    if (path.includes("/v1/forms")) return reply({ anny: { outputs: { default: "image" } } });
    if (path.includes("/v1/model-catalog")) return reply({ cards: { anny: { families: ["anny"] } } });
    throw new Error("estate door on the fetch lane: " + path);
  });
}

function mountDrillBench(stages: BenchStageView[], runDocs?: Array<Record<string, unknown>>): void {
  stubDiscoveryFetch();
  fakes = mountEstateFakes({
    benchDoc: {
      draft_id: "bench-p", rev: 1, log: [],
      stages: stages.map((s) => ({ ...s, run_status: s.runStatus })),
    },
    draftStages: stages as Array<Record<string, unknown>>,
    draftBenchRev: 1,
    runDocs,
  });
  render(h(CardsTab, {
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab", contentId: undefined,
      navigation: { address: "dsh-resource://cards/bench" },
      actions: { openResource: () => {} },
    } }),
    useResource: () => ({ status: "live" as const, value: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages } as unknown as CardsBenchValue }),
  }));
}

describe("the drill seat", () => {
  test("a spec serving verbs renders the bar inside the drill; the press hydrates through drafts/patch", { timeout: LOADED_WAIT() }, async () => {
    serveVerbs = true;
    mountDrillBench(
      [{ id: "s_0", card: "anny", engine: "comfyui", params: { body_image: "/photo.png" } } as BenchStageView],
      // the settled row lingers (the harness's last-doc law): the
      // default poll interval's first read is already terminal
      [{ run_id: "run-1", status: "completed", stages: [{ id: "est", url: "/body-r0.glb" }] }],
    );
    const user = userEvent.setup();
    await user.click(document.querySelector('[role="button"][class*="tileInner"]') as HTMLElement);
    const bar = await screen.findByTestId("verb-bar", {}, { timeout: 4000 });
    await user.click(within(bar).getByText("Estimate body from photo"));
    await user.click(await screen.findByTestId("verb-run"));
    // the settled url lands on the stage through the ONE ledger —
    // a drafts/patch call carrying params.body_glb
    await waitFor(() => {
      const patch = fakes?.calls.find((c) =>
        c.method === "drafts/patch"
        && ((c.args["patch"] as Record<string, unknown>)["params"] as Record<string, unknown> | undefined)?.["body_glb"] !== undefined);
      expect(patch).toBeDefined();
    }, { timeout: 6000 });
  });

  test("a verb-less spec renders no bar (legacy cards serve no new key)", { timeout: LOADED_WAIT() }, async () => {
    serveVerbs = false;
    mountDrillBench([
      { id: "s_0", card: "anny", engine: "comfyui", params: {} } as BenchStageView,
    ]);
    const user = userEvent.setup();
    await user.click(document.querySelector('[role="button"][class*="tileInner"]') as HTMLElement);
    await screen.findByText("Photo face", {}, { timeout: 4000 });
    expect(screen.queryByTestId("verb-bar")).toBeNull();
  });
});
