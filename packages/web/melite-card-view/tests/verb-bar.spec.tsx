// @vitest-environment happy-dom
// verb-bar.spec.tsx — THE VERB BAR WALL (MHR slice 2, 2026-11-13):
// a registered verb a human cannot press is still a dead verb. The
// bar's law has four firing arms — (1) the SERVED arm: every verb
// row on the spec's verbs array renders its own button and opens
// its own dialog (a local-only verb — flow null — is pressable to
// its seat and VOICES its refusal at the run gesture, never a dead
// button); (2) the PRESS arm: the invocation rides the {flow:}
// door with the EXACT body (the registry flow id, the intake
// mapped initials sourced from the stage's current params, the
// dialog's fields as the params overlay, draft_id, test:false);
// (3) the HYDRATION arm: a settled run's stage url lands on the
// stage through the same drafts/patch ledger every edit rides;
// (4) the REFUSAL arm: a missing intake source voices the named
// param and never opens the wire. The failure arms ride too: a
// start refusal, a transport throw (Error and foreign), a
// mid-poll blip that POLLS AGAIN (the poll law), and a failed
// hydration patch that voices the ledger row's unlanded truth.
// The press does NOT mint a compose — the flow door composes
// server-side (the variant-route law).
import { LOADED_WAIT } from "../../../../tests/helpers/loaded-wait.ts";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { mountEstateFakes, type EstateFakes, type EstateRefusal, type EstateThrow } from "./estate-harness.ts";
import { unbindEstateRemote, schemaEnvelope } from "@melite/card-base/client";
import { draftIdOf } from "@melite/contracts/benchStage";
import { resetStageWrites } from "../src/client/draft.ts";
import { VerbBar } from "../src/client/verb-bar.tsx";
import { CardsTab } from "../src/client/CardsTab.tsx";
import { StageDrill } from "../src/client/stage-drill.tsx";
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

/** preset-save's served row: a LOCAL-ONLY verb (no flow route) —
 *  its dialog is the seat; the press voices the refusal. */
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

/** A flow verb mixing a NUMBER knob (cleared at press — the empty
 *  skip arm) and a default-less TEXT knob (the string overlay arm):
 *  the overlay wires ONLY typed values, coerced by declared type. */
const MIXED_ROW = {
  id: "dress",
  label: "Dress body",
  fields: schemaEnvelope({
    person_index: { type: "number", meta: { description: "Person", default: 0, extra: { wtype: "number" } } },
    garment: { type: "string", meta: { description: "Garment", extra: { wtype: "text" } } },
  }),
  writes: ["body_glb"],
  flow: "anny-dress",
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
  refusals?: EstateRefusal[];
  throws?: EstateThrow[];
  onWrite?: (params: Record<string, unknown>) => void;
  pollIntervalMs?: number;
  verbGates?: Record<string, Array<Promise<void>>>;
} = { }): { writes: Array<Record<string, unknown>>; unmount: () => void } {
  const writes: Array<Record<string, unknown>> = [];
  fakes = mountEstateFakes({
    runDocs: opts.runDocs ?? [],
    refusals: opts.refusals,
    throws: opts.throws,
    verbGates: opts.verbGates,
  });
  const seat = render(h(VerbBar, {
    verbs: (opts.verbs ?? [ESTIMATOR_ROW]) as never,
    draftId: draftIdOf("d-verb"),
    stageId: "s_0",
    params: opts.params ?? { body_image: "/photo.png" },
    onWrite: opts.onWrite ?? ((w) => { writes.push(w); }),
    pollIntervalMs: opts.pollIntervalMs ?? 15,
  }));
  return { writes, unmount: seat.unmount };
}

afterEach(() => {
  cleanup();
  unbindEstateRemote();
  vi.unstubAllGlobals();
  resetStageWrites();
  fakes = null;
});

describe("the verb bar — served verbs, local-only voice", () => {
  test("one button per verb; every verb opens its own dialog (a local verb names its state there)", async () => {
    mountBar({ verbs: [ESTIMATOR_ROW, LOCAL_ROW] });
    const bar = await screen.findByTestId("verb-bar");
    // every verb pressable to its own seat — the knobs are the
    // verb's, viewable with or without a flow route
    expect(within(bar).getByText("Estimate body from photo").closest("button")).not.toBeNull();
    const local = within(bar).getByText("Save character as preset").closest("button") as HTMLButtonElement;
    expect(local.disabled).toBe(false);
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
    const { writes } = mountBar({
      runDocs: [
        { run_id: "run-1", status: "running", stages: [{ id: "est" }] },
        { run_id: "run-1", status: "completed", stages: [{ id: "est", url: "/body-r0.glb" }] },
      ],
    });
    const user = userEvent.setup();
    await user.click(screen.getByText("Estimate body from photo"));
    await user.click(screen.getByTestId("verb-run"));
    await waitFor(() => { expect(writes).toEqual([{ body_glb: "/body-r0.glb" }]); }, { timeout: 4000 });
    expect((await screen.findByTestId("verb-note")).textContent).toContain("body_glb seated from run run-1");
  });

  test("a terminal run with no artifact voices the failure, never a silent write", async () => {
    mountBar({
      runDocs: [{ run_id: "run-1", status: "failed", error: "estimator lane refused", stages: [{ id: "est" }] }],
    });
    const user = userEvent.setup();
    await user.click(screen.getByText("Estimate body from photo"));
    await user.click(screen.getByTestId("verb-run"));
    const note = await screen.findByTestId("verb-note", {}, { timeout: 4000 });
    expect(note.textContent).toContain("estimator lane refused");
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
    expect(note.textContent).toContain("settled completed with no artifact");
  });
});

describe("the refusal — a missing intake source never opens the wire", () => {
  test("a stage without the mapped param voices the named gap", async () => {
    mountBar({ params: { steps: 8 } });
    const user = userEvent.setup();
    await user.click(screen.getByText("Estimate body from photo"));
    await user.click(screen.getByTestId("verb-run"));
    const note = await screen.findByTestId("verb-note");
    expect(note.textContent).toContain("the stage carries no body_image");
    // NEVER a wire call: the refusal precedes the door
    expect(startDoc()).toBeUndefined();
    expect(fakes?.calls.some((c) => c.method === "runs/start")).toBe(false);
  });
});

describe("the local verb — pressable to its dialog, voiced at the gesture", () => {
  test("a local-only verb opens its dialog, names its state, and the run press voices the refusal with no wire call", async () => {
    mountBar({ verbs: [LOCAL_ROW] });
    const user = userEvent.setup();
    await user.click(screen.getByText("Save character as preset"));
    const dialog = await screen.findByTestId("verb-dialog");
    // the knobs are viewable (the default-less text field renders
    // UNSEEDED — no invented value)
    const name = dialog.querySelector('[data-field="name"]') as HTMLInputElement;
    expect(name.type).toBe("text");
    expect(name.value).toBe("");
    expect(screen.getByTestId("verb-local").textContent).toContain("runs locally");
    await user.click(screen.getByTestId("verb-run"));
    expect((await screen.findByTestId("verb-note")).textContent).toContain("runs locally");
    expect(fakes?.calls.some((c) => c.method === "runs/start")).toBe(false);
    // the ×-close retires the dialog (the Modal's own onClose seat)
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByTestId("verb-dialog")).toBeNull();
  });
});

describe("the overlay — typed values wire, empty values skip", () => {
  test("a cleared number SKIPS the overlay and a typed string wires as a string", async () => {
    mountBar({
      verbs: [MIXED_ROW],
      runDocs: [{ run_id: "run-1", status: "completed", stages: [{ id: "d", url: "/d.glb" }] }],
    });
    const user = userEvent.setup();
    await user.click(screen.getByText("Dress body"));
    const dialog = await screen.findByTestId("verb-dialog");
    const num = dialog.querySelector('[data-field="person_index"]') as HTMLInputElement;
    await user.clear(num);
    const text = dialog.querySelector('[data-field="garment"]') as HTMLInputElement;
    await user.type(text, "gown");
    await user.click(screen.getByTestId("verb-run"));
    await waitFor(() => { expect(startDoc()).toBeDefined(); }, { timeout: 4000 });
    // the cleared number NEVER wires (the skip arm); the typed text
    // rides VERBATIM as a string (the declared-type coercion)
    expect(startDoc()?.["params"]).toEqual({ garment: "gown" });
  });
});

describe("the failure arms — every refusal faces the human", () => {
  test("a start refusal lands verbatim on the note", async () => {
    mountBar({
      refusals: [{ method: "runs/start", message: "the flow gate refused: initial photo unresolved" }],
    });
    const user = userEvent.setup();
    await user.click(screen.getByText("Estimate body from photo"));
    await user.click(screen.getByTestId("verb-run"));
    const note = await screen.findByTestId("verb-note", {}, { timeout: 4000 });
    expect(note.textContent).toContain("initial photo unresolved");
  });

  test("an Error transport throw on the start voices its message", async () => {
    mountBar({ throws: [{ method: "runs/start", message: "wire severed" }] });
    const user = userEvent.setup();
    await user.click(screen.getByText("Estimate body from photo"));
    await user.click(screen.getByTestId("verb-run"));
    const note = await screen.findByTestId("verb-note", {}, { timeout: 4000 });
    expect(note.textContent).toContain("wire severed");
  });

  test("a FOREIGN throw (a string) voices String(value) — never a silent crash", async () => {
    mountBar({ throws: [{ method: "runs/start", value: "boom-string" }] });
    const user = userEvent.setup();
    await user.click(screen.getByText("Estimate body from photo"));
    await user.click(screen.getByTestId("verb-run"));
    const note = await screen.findByTestId("verb-note", {}, { timeout: 4000 });
    expect(note.textContent).toContain("boom-string");
  });

  test("a mid-poll transport blip POLLS AGAIN and the write still lands (the poll law)", async () => {
    const { writes } = mountBar({
      throws: [{ method: "runs/status", message: "blip" }],
      runDocs: [
        { run_id: "run-1", status: "running", stages: [{ id: "est" }] },
        { run_id: "run-1", status: "completed", stages: [{ id: "est", url: "/body-r0.glb" }] },
      ],
    });
    const user = userEvent.setup();
    await user.click(screen.getByText("Estimate body from photo"));
    await user.click(screen.getByTestId("verb-run"));
    await waitFor(() => { expect(writes).toEqual([{ body_glb: "/body-r0.glb" }]); }, { timeout: 4000 });
  });

  test("an unmount mid-poll ABORTS the loop — no further status reads after the seat is gone", async () => {
    // the wide interval pins the abort INSIDE the loop's sleep: the
    // post-sleep guard itself ends the poll (not a fetch throw)
    const { unmount } = mountBar({
      runDocs: [{ run_id: "run-1", status: "running", stages: [{ id: "est" }] }],
      pollIntervalMs: 250,
    });
    const user = userEvent.setup();
    await user.click(screen.getByText("Estimate body from photo"));
    await user.click(screen.getByTestId("verb-run"));
    await waitFor(() => { expect(fakes?.calls.filter((c) => c.method === "runs/status").length).toBeGreaterThanOrEqual(1); }, { timeout: 4000 });
    unmount();
    const readAtUnmount = fakes?.calls.filter((c) => c.method === "runs/status").length ?? 0;
    await new Promise((r) => { setTimeout(r, 600); });
    // the loop's own abort guard ended it — the wire never hears
    // from a departed seat
    expect(fakes?.calls.filter((c) => c.method === "runs/status").length).toBe(readAtUnmount);
  });

  test("an unmount BEFORE the start answers aborts at the loop's first guard (no poll read at all)", async () => {
    // the verb gate parks runs/start mid-flight: the seat retires
    // FIRST, the start answers into a departed component, and the
    // poll's opening guard returns before any sleep or read
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    const { unmount } = mountBar({
      runDocs: [{ run_id: "run-1", status: "running", stages: [{ id: "est" }] }],
      verbGates: { "runs/start": [gate] },
    });
    const user = userEvent.setup();
    await user.click(screen.getByText("Estimate body from photo"));
    await user.click(screen.getByTestId("verb-run"));
    await waitFor(() => { expect(fakes?.calls.some((c) => c.method === "runs/start")).toBe(true); }, { timeout: 4000 });
    unmount();
    release();
    await new Promise((r) => { setTimeout(r, 80); });
    expect(fakes?.calls.some((c) => c.method === "runs/status")).toBe(false);
  });

  test("a THROWING hydration write faces the note (the settle chain's own catch)", async () => {
    mountBar({
      onWrite: () => { throw new Error("hydrate failed"); },
      runDocs: [{ run_id: "run-1", status: "completed", stages: [{ id: "est", url: "/body-r0.glb" }] }],
    });
    const user = userEvent.setup();
    await user.click(screen.getByText("Estimate body from photo"));
    await user.click(screen.getByTestId("verb-run"));
    const note = await screen.findByTestId("verb-note", {}, { timeout: 4000 });
    expect(note.textContent).toContain("hydrate failed");
  });

  test("a FOREIGN throw from the write voices String(value) — never a silent crash", async () => {
    mountBar({
      onWrite: () => { throw "boom-string"; },
      runDocs: [{ run_id: "run-1", status: "completed", stages: [{ id: "est", url: "/body-r0.glb" }] }],
    });
    const user = userEvent.setup();
    await user.click(screen.getByText("Estimate body from photo"));
    await user.click(screen.getByTestId("verb-run"));
    const note = await screen.findByTestId("verb-note", {}, { timeout: 4000 });
    expect(note.textContent).toContain("boom-string");
  });
});

describe("the envelope edge — a fields-less verb still presses", () => {
  test("a verb serving a null fields envelope renders no inputs and presses with an empty overlay", async () => {
    mountBar({
      verbs: [{ ...ESTIMATOR_ROW, fields: null }],
      runDocs: [{ run_id: "run-1", status: "completed", stages: [{ id: "est", url: "/body-r0.glb" }] }],
    });
    const user = userEvent.setup();
    await user.click(screen.getByText("Estimate body from photo"));
    const dialog = await screen.findByTestId("verb-dialog");
    expect(dialog.querySelector("input")).toBeNull();
    await user.click(screen.getByTestId("verb-run"));
    await waitFor(() => { expect(startDoc()).toBeDefined(); }, { timeout: 4000 });
    expect(startDoc()?.["params"]).toEqual({});
  });

  test("an untouched default-less field never wires (the ?? fallback reads absent, not invented)", async () => {
    mountBar({
      verbs: [MIXED_ROW],
      runDocs: [{ run_id: "run-1", status: "completed", stages: [{ id: "d", url: "/d.glb" }] }],
    });
    const user = userEvent.setup();
    await user.click(screen.getByText("Dress body"));
    const dialog = await screen.findByTestId("verb-dialog");
    // clear the seeded number (a value the schema invented) and
    // leave the default-less text UNTOUCHED — neither wires
    await user.clear(dialog.querySelector('[data-field="person_index"]') as HTMLInputElement);
    await user.click(screen.getByTestId("verb-run"));
    await waitFor(() => { expect(startDoc()).toBeDefined(); }, { timeout: 4000 });
    expect(startDoc()?.["params"]).toEqual({});
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
      // s_1 rides a DISTINCT spec (its own field label) so the arm
      // can PROVE the drill re-targeted before the failure landed
      if (path.includes("model=tts")) {
        return reply({
          form: "tts", genre: "audio", engine: "comfyui",
          schema: schemaEnvelope({ voice: { type: "string", meta: { description: "TTS voice", extra: { wtype: "text" } } } }),
        });
      }
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

function mountDrillBench(
  stages: BenchStageView[],
  runDocs?: Array<Record<string, unknown>>,
  patchFailures?: Array<Record<string, unknown>>,
  patchGate?: () => Promise<void>,
): void {
  stubDiscoveryFetch();
  fakes = mountEstateFakes({
    benchDoc: {
      draft_id: "bench-p", rev: 1, log: [],
      stages: stages.map((s) => ({ ...s, run_status: s.runStatus })),
    },
    draftStages: stages as Array<Record<string, unknown>>,
    draftBenchRev: 1,
    runDocs,
    patchFailures,
    patchGate,
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

  test("a FAILED hydration patch voices the ledger row's unlanded truth (the one-voice law)", { timeout: LOADED_WAIT() }, async () => {
    serveVerbs = true;
    mountDrillBench(
      [{ id: "s_0", card: "anny", engine: "comfyui", params: { body_image: "/photo.png" } } as BenchStageView],
      [{ run_id: "run-1", status: "completed", stages: [{ id: "est", url: "/body-r0.glb" }] }],
      // the door ANSWERS delivered:false — draft.ts records the row
      // and rethrows; the drill's catch faces the ledger's words
      [{ draftId: "bench-p", stageId: "s_0", delivered: false, reason: "stage not found" }],
    );
    const user = userEvent.setup();
    await user.click(document.querySelector('[role="button"][class*="tileInner"]') as HTMLElement);
    const bar = await screen.findByTestId("verb-bar", {}, { timeout: 4000 });
    await user.click(within(bar).getByText("Estimate body from photo"));
    await user.click(await screen.findByTestId("verb-run"));
    // the write's failure face is the LEDGER ROW's voice (the same
    // face every failed write wears), never a silent no-op
    const face = await screen.findByTestId("stage-write-face", {}, { timeout: 6000 });
    expect(face.textContent).toContain("body_glb");
  });

  test("a failed patch landing after a RE-TARGET is swallowed by the guard (no stale face on the new stage)", { timeout: LOADED_WAIT() }, async () => {
    serveVerbs = true;
    // THE UNKEYED SEAM (stage-drill-gates' own law): the drill is
    // mounted DIRECTLY and re-targeted by RERENDER — one instance,
    // so lastStageRef holds s_1 while s_0's hydration write is still
    // parked at the gate. The failure lands only after the
    // re-target; the alive guard drops it — a departed stage's
    // refusal never faces the stage shown now.
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    stubDiscoveryFetch();
    fakes?.unmount();
    fakes = mountEstateFakes({
      runDocs: [{ run_id: "run-1", status: "completed", stages: [{ id: "est", url: "/body-r0.glb" }] }],
      patchFailures: [{ draftId: "bench-p", stageId: "s_0", delivered: false, reason: "stage not found" }],
      patchGate: () => gate,
    });
    const stageA: BenchStageView = { id: "s_0", card: "anny", engine: "comfyui", params: { body_image: "/photo.png" } };
    const stageB: BenchStageView = { id: "s_1", card: "tts", engine: "comfyui", params: {} };
    const drillProps = (s: BenchStageView): Record<string, unknown> => ({
      stage: s,
      bench: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages: [stageA, stageB], sessionKey: "main" },
      running: false,
      onRun: () => {}, onStop: () => {}, onClose: () => {}, onRemoved: () => {},
      onPatchParams: () => {},
      renderStageView: (_o: unknown, fallback: unknown) => fallback,
    });
    const view = render(h(StageDrill, drillProps(stageA) as never));
    const user = userEvent.setup();
    const bar = await screen.findByTestId("verb-bar", {}, { timeout: 4000 });
    await user.click(within(bar).getByText("Estimate body from photo"));
    await user.click(await screen.findByTestId("verb-run"));
    // the write is IN FLIGHT (held by the gate) — re-target the SAME
    // instance to s_1; the tts drill's own field label PROVES the
    // switch landed before the failure is released
    await waitFor(() => {
      expect(fakes?.calls.some((c) => c.method === "drafts/patch")).toBe(true);
    }, { timeout: 8000 });
    view.rerender(h(StageDrill, drillProps(stageB) as never));
    await screen.findByText("TTS voice", {}, { timeout: 4000 });
    release();
    // the departed stage's failure never faces s_1's drill
    await new Promise((r) => { setTimeout(r, 400); });
    expect(screen.queryByTestId("stage-write-face")).toBeNull();
  });
});
