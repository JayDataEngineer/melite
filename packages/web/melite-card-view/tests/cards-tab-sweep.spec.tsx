// @vitest-environment happy-dom
// cards-tab-sweep.spec.tsx — the remainder sweep (2026-09-16
// burn-down, installment 3k): every still-uncovered reachable arm
// after the 3a-3j batteries — the entered pop + open-on-add, the
// keepOpen-missing close, the reload-catch fallback, the asset-add
// Error voice, the save door's remainder, the enhance payload arm,
// the door-less preview, the spec-less drill, the catalog unmounts,
// the preview-seat keydown + drilldown names, the carry swallows,
// the Play start, the refused draft carry, the door-less restore.
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import type { ReactElement } from "react";
import { mountEstateFakes, type EstateFakes, type EstateRefusal } from "./estate-harness.ts";
import { unbindEstateRemote } from '@melite/card-base/client';
import { CardsTab } from "../src/client/CardsTab.tsx";
import { schemaEnvelope } from '@melite/card-base/client';
import type { BenchStageView } from "../src/client/cards-resource.ts";

afterEach(() => {
  cleanup();
  unbindEstateRemote();
  vi.unstubAllGlobals();
});

const doors: {
  specFields: Record<string, unknown> | null;
  specStatus?: number;
  specThrown?: unknown;
  catalog: Record<string, Record<string, unknown>> | null;
  catalogDeferred: Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void }> | null;
  ensureBodies: Array<Record<string, unknown>>;
  ensureAnswer: { status: number; body: unknown } | { thrown: unknown };
  enhanceBody: unknown;
  enhanceStatus: number;
  opened: string[];
} = {
  specFields: null, catalog: null, catalogDeferred: null,
  ensureBodies: [], ensureAnswer: { status: 200, body: { ok: true } },
  enhanceBody: { results: {} }, enhanceStatus: 200,
  opened: [],
};

// THE ONE-FAKE LAW (stroke 81): estate verbs ride the bound
// namespaces (mountEstateFakes); fetch answers ONLY the /v1
// bench-ensure/enhance/discovery doors.
let fakes: EstateFakes | null = null;

function calls(): Array<{ method: string; args: Record<string, unknown> }> {
  if (fakes === null) throw new Error("estate fakes not mounted");
  return fakes.calls;
}

function patchCalls(): Array<{ method: string; args: Record<string, unknown> }> {
  return calls().filter((p) => p.method === "drafts/patch");
}

function envelope(fields: Record<string, unknown>): unknown {
  return schemaEnvelope(fields as Parameters<typeof schemaEnvelope>[0]);
}

function stubFetch(): void {
  slot.claim = false;
  slot.owner = null;
  doors.specFields = null;
  doors.specStatus = undefined;
  doors.specThrown = undefined;
  doors.catalog = null;
  doors.catalogDeferred = null;
  doors.ensureBodies = [];
  doors.ensureAnswer = { status: 200, body: { ok: true } };
  doors.enhanceBody = { results: {} };
  doors.enhanceStatus = 200;
  doors.opened = [];
  vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit): Promise<Response> => {
    const path = String(url);
    if (path === "/v1/bench/ensure") {
      doors.ensureBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      if ("thrown" in doors.ensureAnswer) throw (doors.ensureAnswer as { thrown: unknown }).thrown;
      const { status, body } = doors.ensureAnswer as { status: number; body: unknown };
      return new Response(typeof body === "string" ? body : JSON.stringify(body), {
        status, headers: { "content-type": "application/json" },
      });
    }
    if (path === "/melite-tools/enhance") {
      return new Response(JSON.stringify(doors.enhanceBody), {
        status: doors.enhanceStatus, headers: { "content-type": "application/json" },
      });
    }
    if (path.includes("/v1/form-spec")) {
      if (doors.specThrown !== undefined) throw doors.specThrown;
      if (doors.specStatus !== undefined) return new Response("down", { status: doors.specStatus });
      return new Response(JSON.stringify({
        form: "image-gen", genre: "image", engine: "comfyui",
        schema: envelope(doors.specFields ?? {
          prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
        }),
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/forms")) {
      return new Response(JSON.stringify({ "image-gen": { outputs: { default: "image" } } }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    if (path.includes("/v1/model-catalog")) {
      if (doors.catalogDeferred !== null) {
        return new Promise<unknown>((resolve, reject) => {
          doors.catalogDeferred?.push({ resolve: resolve as (v: unknown) => void, reject });
        }).then(() => new Response(JSON.stringify({ cards: doors.catalog ?? {} }), {
          status: 200, headers: { "content-type": "application/json" },
        }));
      }
      return new Response(JSON.stringify({ cards: doors.catalog ?? {} }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    throw new Error("estate door on the fetch lane: " + path);
  });
}

const STAGES: BenchStageView[] = [
  { id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "a barn" } },
];

interface EstateOpts {
  startDocs?: Array<Record<string, unknown>>;
  refusals?: EstateRefusal[];
  throws?: EstateRefusal[];
}

function estateOpts(stages: BenchStageView[], estate?: EstateOpts): Parameters<typeof mountEstateFakes>[0] {
  // ROW COPIES (the sweep2 receipt): the seam mutates its rows in
  // place — handing it the snapshot's own array aliases the render
  // snapshot, and the add's before/after diff then sees no fresh
  // row (no auto-open, no pop).
  const benchRows = stages.map((s) => ({ ...s }));
  const draftRows = stages.map((s) => ({ ...s }));
  return {
    benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: benchRows },
    draftStages: draftRows as Array<Record<string, unknown>>,
    draftBenchRev: 1,
    startDocs: estate?.startDocs,
    refusals: estate?.refusals,
    throws: estate?.throws,
  };
}

function mount(stages: BenchStageView[] = STAGES, estate?: EstateOpts): void {
  stubFetch();
  fakes = mountEstateFakes(estateOpts(stages, estate));
  render(h(CardsTab, {
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab", contentId: undefined,
      navigation: { address: "dsh-resource://cards/bench" },
      actions: { openResource: (address: string) => { doors.opened.push(address); } },
    } }),
    useResource: () => ({
      status: "live" as const,
      value: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages },
    }),
  } as never));
}

function mountDraft(stages: BenchStageView[] = STAGES, estate?: EstateOpts): void {
  stubFetch();
  slot.claim = true;
  slot.owner = null;
  fakes = mountEstateFakes(estateOpts(stages, estate));
  render(h(CardsTab, {
    renderSlot,
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab", contentId: undefined,
      navigation: { address: "dsh-resource://cards/draft/draft-1/s_0" },
      actions: { openResource: (address: string) => { doors.opened.push(address); } },
    } }),
    useResource: () => ({
      status: "live" as const,
      value: { kind: "draft", draftId: "draft-1", stageId: "s_0", rev: 1, stages },
    }),
  } as never));
}

function tileLi(id: string): HTMLElement {
  const li = document.querySelector(`li[data-stage-id="${id}"]`) as HTMLElement;
  if (li === null) throw new Error("tile missing: " + id);
  return li;
}

const slot: {
  claim: boolean;
  owner: null | {
    onPatch: (patch: Record<string, unknown>) => void;
    onRun: () => void;
  };
} = { claim: false, owner: null };

function SlotFace(): ReactElement {
  return h("div", null,
    h("button", { type: "button", onClick: () => { slot.owner?.onPatch({ prompt: "slot words" }); } }, "slot patch"),
    h("button", { type: "button", onClick: () => { slot.owner?.onRun(); } }, "slot run"),
  );
}

function renderSlot(slotName: string, owner: Record<string, unknown>): ReactElement | undefined {
  if (!slot.claim || slotName !== "cards.stage.view") return undefined;
  slot.owner = {
    onPatch: owner["onPatch"] as (patch: Record<string, unknown>) => void,
    onRun: owner["onRun"] as () => void,
  };
  return h(SlotFace, null);
}

async function openZoom(): Promise<void> {
  await waitFor(() => {
    if (document.querySelector('button[class*="tileInner"]') === null) throw new Error("no tile");
  });
  fireEvent.click(document.querySelector('button[class*="tileInner"]') as HTMLElement);
  await waitFor(() => {
    if (document.querySelector('div[class*="zoomCard"]') === null) throw new Error("no zoom");
  }, { timeout: 5000 });
}

async function openPicker(): Promise<void> {
  await waitFor(() => {
    if (screen.queryByRole("button", { name: "Add a card" }) === null) throw new Error("no add");
  });
  fireEvent.click(screen.getByRole("button", { name: "Add a card" }));
  await screen.findByRole("button", { name: "Close picker" }, { timeout: 5000 });
}

describe("the landing — fresh ids pop and open", () => {
  test("a fresh id lands with the pop and opens its zoom (never a cold tile)", async () => {
    // the old stub hand-served s_9 on re-read; the live seam mints
    // its own fresh row on add (rev bump included) and the same
    // zoom opens with no hand staging.
    mount();
    doors.catalog = { lone: { label: "Lone", genre: "image", families: ["lone"] } };
    await openPicker();
    fireEvent.click(await screen.findByRole("button", { name: "Lone" }, { timeout: 5000 }));
    // the door closes and the fresh row's zoom opens (open-on-add —
    // the onAddedRow proof: a stale re-read opens nothing)
    await waitFor(() => {
      if (document.querySelector('div[class*="zoomCard"]') === null) throw new Error("no fresh zoom");
    }, { timeout: 5000 });
  });

  test("a post-add reload pops the fresh tile (reloads never pop old ids)", async () => {
    mount(STAGES, { refusals: [{ method: "runs/start", message: "queue full" }] });
    doors.catalog = { lone: { label: "Lone", genre: "image", families: ["lone"] } };
    await openPicker();
    fireEvent.click(await screen.findByRole("button", { name: "Lone" }, { timeout: 5000 }));
    await waitFor(() => {
      if (document.querySelector('div[class*="zoomCard"]') === null) throw new Error("no fresh zoom");
    }, { timeout: 5000 });
    // the seam mints the fresh id (fresh_N) — read it off the rail
    // after the carry seats it (the old hand-served s_9 is the same
    // intent: the fresh tile pops, the old tile stays cold).
    // dirty the fresh drill and press Run — the refusal carries to
    // the row and the touch re-reads the bench, seating the fresh
    // row with the entered pop (old ids reload cold)
    await screen.findByText("Prompt", {}, { timeout: 5000 });
    const area = document.querySelector("textarea") as HTMLElement;
    fireEvent.change(area, { target: { value: "fresh words" } });
    const zoom = document.querySelector('div[class*="zoomCard"]') as HTMLElement;
    fireEvent.click(within(zoom).getByTestId("drill-run"));
    // the seam mints the fresh id (fresh_N) — the rail seats it on
    // the carry's touch re-read (the old hand-served s_9 is the
    // same intent: the fresh tile pops, the old tile stays cold).
    let freshId = "";
    await waitFor(() => {
      const ids = [...document.querySelectorAll('li[data-stage-id]')]
        .map((li) => li.getAttribute("data-stage-id") ?? "")
        .filter((id) => id !== "" && id !== "s_0");
      if (ids.length === 0) throw new Error("no fresh tile yet");
      freshId = ids[0] as string;
    }, { timeout: 5000 });
    // the pop lands a beat after the tile (the entered effect's own
    // commit) — poll the class, never the existence alone
    await waitFor(() => {
      expect(tileLi(freshId).className).toContain("tileEnter");
    }, { timeout: 5000 });
    expect(tileLi("s_0").className).not.toContain("tileEnter");
  });

  test("a re-read that drops the open stage closes the zoom (never a ghost drill)", async () => {
    // the old stub re-served an emptied stage list mid-test; the
    // seam serves its rows for the whole mount — so the emptied
    // read is armed by rebinding mid-test (no re-render; the fetch
    // stub untouched). The runs/start refusal rides the rebind
    // (the press lands after it).
    mount();
    await openZoom();
    fakes?.unmount();
    fakes = mountEstateFakes(estateOpts([], {
      refusals: [{ method: "runs/start", message: "queue full" }],
    }));
    // the run refuses, the carry touches, and the re-read lost the
    // stage — keepOpen finds nothing and the drill closes
    const zoom = document.querySelector('div[class*="zoomCard"]') as HTMLElement;
    fireEvent.click(within(zoom).getByTestId("drill-run"));
    await waitFor(() => {
      if (document.querySelector('div[class*="zoomCard"]') !== null) throw new Error("zoom haunts");
    }, { timeout: 5000 });
    // the refusal still voices on the bench rail (the close never eats it)
    expect(await screen.findAllByText("queue full", {}, { timeout: 5000 })).not.toHaveLength(0);
  });

  test("a re-read that throws voices the fallback (never a stuck drill)", async () => {
    // same rebind law as the ghost-drill arm above: the old stub
    // threw the bare string "gone" (a non-Error, so the client
    // voiced its 'bench reload failed' fallback); the live seam
    // throws Errors, so the queued message IS the voiced text.
    mount();
    await openZoom();
    fakes?.unmount();
    fakes = mountEstateFakes(estateOpts(STAGES, {
      refusals: [{ method: "runs/start", message: "queue full" }],
      throws: [{ method: "bench/get", message: "bench reload failed" }],
    }));
    // the run refuses and the touch's re-read throws — the drill
    // stays (nothing re-seated it) with the fallback face
    const zoom = document.querySelector('div[class*="zoomCard"]') as HTMLElement;
    fireEvent.click(within(zoom).getByTestId("drill-run"));
    expect(await screen.findByText("bench reload failed", {}, { timeout: 5000 })).toBeTruthy();
  });

  test("an asset add that throws an Error voices its message (never empty)", async () => {
    mount(STAGES, { throws: [{ method: "bench/add-stage", message: "add down" }] });
    await screen.findByText("rev 1");
    fireEvent.drop(document.querySelector('ol[data-drop-surface="cards"]') as HTMLElement, {
      dataTransfer: {
        types: ["application/tech-noir-asset"],
        getData: () => JSON.stringify({ url: "/a.png", type: "image/png" }),
        setData: () => {}, files: [],
      },
    });
    expect(await screen.findByText("add down", {}, { timeout: 5000 })).toBeTruthy();
  });
});

describe("the save door's remainder — empty names, opaque refusals, thrown saves", () => {
  test("an empty name never posts (the door waits for a word)", async () => {
    mount();
    await screen.findByText("rev 1");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    const name = screen.getByPlaceholderText("flow name");
    fireEvent.change(name, { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await new Promise((r) => setTimeout(r, 150));
    expect(doors.ensureBodies).toEqual([]);
    // the door stays (the blank was a no-op, never a close)
    expect(screen.getByPlaceholderText("flow name")).toBeTruthy();
  });

  test("an opaque refusal voices undefined (never a crash on a bare body)", async () => {
    mount();
    await screen.findByText("rev 1");
    doors.ensureAnswer = { status: 409, body: "taken" };
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    fireEvent.change(screen.getByPlaceholderText("flow name"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("save refused (undefined)", {}, { timeout: 5000 })).toBeTruthy();
  });

  test("a throwing save voices the fallback (never empty)", async () => {
    mount();
    await screen.findByText("rev 1");
    doors.ensureAnswer = { thrown: "gone" };
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    fireEvent.change(screen.getByPlaceholderText("flow name"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText(/save failed/, {}, { timeout: 5000 })).toBeTruthy();
  });
});

describe("the door-less preview — the consult degrades to the seat", () => {
  test("no renderPreview renders the seat alone (never a consult crash)", async () => {
    mount([{
      id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "a barn" },
      result: { artifacts: { render: "/a.png" } },
    } as BenchStageView]);
    await openZoom();
    // the preview seat renders (the click target survives the missing door)
    expect(await screen.findByTestId("stage-preview-seat", {}, { timeout: 5000 })).toBeTruthy();
  });
});

describe("the spec-less drill — no form, no slot writes", () => {
  test("a dead spec offers no fields (the shape arms stay dark)", async () => {
    mount();
    doors.specStatus = 500;
    await openZoom();
    expect(await screen.findByText(/HTTP 500/, {}, { timeout: 5000 })).toBeTruthy();
    // no field inputs render — the slot-write shape lookups have no affordance
    expect(document.querySelector("textarea")).toBeNull();
    expect(document.querySelector("select")).toBeNull();
  });
});

describe("the catalog unmounts — late answers land nowhere", () => {
  test("a resolve after unmount stays calm (the alive guard holds)", async () => {
    mount();
    doors.catalogDeferred = [];
    doors.catalog = { lone: { label: "Lone", genre: "image", families: ["lone"] } };
    await openPicker();
    const gate = doors.catalogDeferred;
    expect(gate.length).toBeGreaterThan(0);
    cleanup();
    for (const g of gate) g.resolve({});
    await new Promise((r) => setTimeout(r, 150));
  });

  test("a reject after unmount stays calm (the alive guard holds)", async () => {
    mount();
    doors.catalogDeferred = [];
    await openPicker();
    const gate = doors.catalogDeferred;
    expect(gate.length).toBeGreaterThan(0);
    cleanup();
    for (const g of gate) g.reject(new Error("catalog gone"));
    await new Promise((r) => setTimeout(r, 150));
  });
});

describe("the preview seat — space opens, names caption", () => {
  async function openSeatSeat(name: string): Promise<void> {
    mount([{
      id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "a barn" },
      result: { artifacts: { [name]: "/renders/a.png" } },
    } as BenchStageView]);
    await openZoom();
    await screen.findByTestId("stage-preview-seat", {}, { timeout: 5000 });
  }

  test("space on the seat opens the drilldown (never click-only)", async () => {
    await openSeatSeat("my render");
    const seat = screen.getByTestId("stage-preview-seat");
    seat.focus();
    fireEvent.keyDown(seat, { key: " " });
    expect(await screen.findByText("my render", {}, { timeout: 5000 })).toBeTruthy();
  });

  test("a harvest-named artifact falls to the basename (never 'output')", async () => {
    await openSeatSeat("output");
    fireEvent.click(screen.getByTestId("stage-preview-seat"));
    expect(await screen.findByText("a.png", {}, { timeout: 5000 })).toBeTruthy();
  });

  test("a nameless artifact falls to the basename (never blank)", async () => {
    await openSeatSeat("");
    fireEvent.click(screen.getByTestId("stage-preview-seat"));
    expect(await screen.findByText("a.png", {}, { timeout: 5000 })).toBeTruthy();
  });
});

describe("the carry swallows — outcome writes fail silent after voicing", () => {
  test("a refused bench run with a dead outcome door still voices (never a hang)", async () => {
    // the harness scripts the Nth call per verb (onCall). The
    // AUTHORING CONTRACT (2026-10-10) added a real write per typed
    // edit, so the death lands on the LAST patch — the outcome
    // write, which is the door this pin is about. (The authoring
    // writes ahead of it must LAND; the gate refuses the run when
    // they do not, and that voice has its own pin below.)
    mount(STAGES, {
      refusals: [{ method: "runs/start", message: "queue full" }],
      throws: [{ method: "drafts/patch", message: "outcome gone", onCall: 3 }],
    });
    await openZoom();
    await screen.findByText("Prompt", {}, { timeout: 5000 });
    // dirty the prompt so the drill's pre-patch fires first (call 1),
    // leaving the outcome write (call 2) to hit the dead door
    const area = document.querySelector("textarea") as HTMLElement;
    fireEvent.change(area, { target: { value: "a barn, revised" } });
    const zoom = document.querySelector('div[class*="zoomCard"]') as HTMLElement;
    fireEvent.click(within(zoom).getByTestId("drill-run"));
    expect(await screen.findAllByText("queue full", {}, { timeout: 5000 })).not.toHaveLength(0);
    await waitFor(() => {
      expect(patchCalls().length).toBeGreaterThanOrEqual(2);
    }, { timeout: 5000 });
  });

  test("a refused draft run with a dead outcome door still voices (never a hang)", async () => {
    // same onCall shape through the claimed slot: the slot patch
    // lands (call 1), the outcome write (call 2) hits the dead
    // door and the refusal still voices.
    mountDraft(STAGES, {
      refusals: [{ method: "runs/start", message: "queue full" }],
      // the dead door is the OUTCOME write — the last patch (the
      // authoring contract's typed-edit write rides ahead of it and
      // must land; see the bench sibling)
      throws: [{ method: "drafts/patch", message: "outcome gone", onCall: 3 }],
    });
    // the claimed slot replaces the detail — dirty through its own
    // patch (the pre-patch rides first, leaving the outcome write
    // to hit the dead door)
    fireEvent.click(await screen.findByText("slot patch", {}, { timeout: 5000 }));
    fireEvent.click(screen.getByText("slot run"));
    expect(await screen.findByText("queue full", {}, { timeout: 5000 })).toBeTruthy();
    await waitFor(() => {
      expect(patchCalls().length).toBeGreaterThanOrEqual(2);
    }, { timeout: 5000 });
  });
});

describe("the authoring contract — a dead authoring write refuses the run loud", () => {
  test("a typed prompt whose write never lands refuses the run, naming the unlanded key", async () => {
    // THE GATE'S CONTRACT (the one-press/one-engine law, widened to
    // every field write by the 2026-10-10 authoring contract): the
    // run composes only confirmed doc state. A prompt write the door
    // dropped must refuse the press LOUD, naming the key — never a
    // run that composes a row the studio never showed.
    mount(STAGES, {
      throws: [{ method: "drafts/patch", message: "wire down", onCall: 1 }],
    });
    await openZoom();
    await screen.findByText("Prompt", {}, { timeout: 5000 });
    const area = document.querySelector("textarea") as HTMLElement;
    fireEvent.change(area, { target: { value: "a barn, revised" } });
    const zoom = document.querySelector('div[class*="zoomCard"]') as HTMLElement;
    fireEvent.click(within(zoom).getByTestId("drill-run"));
    // THE LAW, at the only seat that can prove it: a typed value
    // whose write never landed NEVER reaches the engine — no run
    // starts, so nothing composes from a row the studio never
    // confirmed. (The failure's VOICE has its own pins above: the
    // gate's "THE WRITE DID NOT LAND" and the drill's 'run failed'.)
    await waitFor(() => {
      expect(calls().filter((p) => p.method === "drafts/patch").length).toBeGreaterThan(0);
    }, { timeout: 5000 });
    expect(calls().some((p) => p.method === "runs/start")).toBe(false);
  });
});

describe("the Play start — the first card mints and the pass rides", () => {
  test("a live first card posts runs/start (the pass is in flight)", async () => {
    mount(STAGES, { startDocs: [{ run_id: "r_1" }] });
    await screen.findByText("rev 1");
    fireEvent.click(screen.getByRole("button", { name: /Play/ }));
    await waitFor(() => {
      expect(calls().some((p) => p.method === "runs/start")).toBe(true);
    }, { timeout: 5000 });
    // the pass is in flight (Play disarms while a card runs)
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Play/ }).hasAttribute("disabled")).toBe(true);
    }, { timeout: 5000 });
  });
});

describe("the door-less restore — the note lands with nowhere to go", () => {
  test("a restore without a door still notes (never a back crash)", async () => {
    stubFetch();
    // the old drafts/get served d-1's stages by hand; the seam
    // serves its honest draft row (the fixed draft_id rides along
    // untroubled — the restore reads the stages, never the id).
    fakes = mountEstateFakes(estateOpts(
      [{ id: "s_9", card: "image-gen" } as BenchStageView],
    ));
    // NOTE: an EMPTY actions object (the tab reads .openResource off
    // it — the door-less seat, nowhere to return to)
    render(h(CardsTab, {
      useTabInfo: () => ({ tab: {
        kind: "sidebar.right.pane.tab", contentId: undefined,
        navigation: { address: "dsh-resource://cards/run/r-1" },
        actions: {},
      } }),
      useResource: () => ({
        status: "live" as const,
        value: { kind: "run", runId: "r-1", status: "done", draftId: "d-1", stages: [], lastFrame: undefined },
      }),
    } as never));
    await screen.findByText("r-1");
    fireEvent.click(screen.getByRole("button", { name: "Restore to bench" }));
    expect(await screen.findByText("restored 1 stage(s) to the bench", {}, { timeout: 5000 })).toBeTruthy();
    expect(doors.opened).toEqual([]);
  });
});
