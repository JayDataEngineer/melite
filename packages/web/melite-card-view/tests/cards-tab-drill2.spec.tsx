// @vitest-environment happy-dom
// cards-tab-drill2.spec.tsx — the drill region's remainder (2026-09-16
// burn-down, installment 3d): the undefined-engine family arm, the
// model-pick re-key seed, the Error-voiced spec failure, the dead
// forms-table fallback, the spec-null enhance, the sweep-landing
// arms (empty positive, negative carry, empty via), the no-edit run,
// the Error-voiced run patch, the throwing remove/ungroup, the
// tri-state unset, and the preview-owner arms (video/audio kinds,
// string runStatus, absent history snapshots, historyStrip opt-out).
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { mountEstateFakes, type EstateFakes, type EstateRefusal } from "./estate-harness.ts";
import { unbindEstateRemote } from "@melite/card-base/estate-remote";
import { resetStageWrites } from "../src/client/draft.ts";
import { CardsTab } from "../src/client/CardsTab.tsx";
import { schemaEnvelope } from "../src/client/spec-form.tsx";
import type { BenchStageView, CardsBenchValue } from "../src/client/cards-resource.ts";

afterEach(() => {
  cleanup();
  unbindEstateRemote();
  vi.unstubAllGlobals();
  // THE LEDGER ISOLATION RESET (the cross-test pollution law, found
  // 2026-09-24: the "undelivered run patch" test records a refused
  // 'prompt' write on this file's shared 'bench-p/s_0' ledger row;
  // without the reset, the inherit test's OWN first press refuses
  // with "(unlanded keys: prompt)" — inherited from a dead test,
  // order-dependent, green in isolation and red in the file run).
  // resetStageWrites is the door's own spec-isolation verb; the
  // ledger's memory in production is the law and never resets.
  resetStageWrites();
});

type FormSpecMode = "ok" | "deferred" | "reject-error";
type FormsMode = "ok" | "fail";

interface Doors {
  formSpec: FormSpecMode;
  formsTable: FormsMode;
  specFields: "prompt" | "prompt-negative" | "prompt-tri" | "prompt-image";
  specFamilies: boolean;
  specPreview: boolean;
  specInputs: boolean;
  enhanceResults: unknown;
  specUrls: string[];
  resolveFormSpec: ((body: unknown) => void) | null;
}

const doors: Doors = {
  formSpec: "ok", formsTable: "ok", specFields: "prompt",
  specFamilies: false, specPreview: false, specInputs: false,
  enhanceResults: {}, specUrls: [],
  resolveFormSpec: null,
};

// THE ONE-FAKE LAW (stroke 81): estate verbs ride the bound
// namespaces (mountEstateFakes); fetch answers ONLY the /v1
// discovery doors + the enhance tool.
let fakes: EstateFakes | null = null;

function calls(): Array<{ method: string; args: Record<string, unknown> }> {
  if (fakes === null) throw new Error("estate fakes not mounted");
  return fakes.calls;
}

/** the params-flush writes (drafts/patch calls carrying params). */
function patches(): Array<Record<string, unknown>> {
  return calls()
    .filter((p) => p.method === "drafts/patch"
      && (p.args["patch"] as Record<string, unknown>)["params"] !== undefined)
    .map((p) => (p.args["patch"] as Record<string, unknown>)["params"] as Record<string, unknown>);
}

function stubFetch(): void {
  doors.formSpec = "ok";
  doors.formsTable = "ok";
  doors.specFields = "prompt";
  doors.specFamilies = false;
  doors.specPreview = false;
  doors.specInputs = false;
  doors.enhanceResults = {};
  doors.specUrls = [];
  doors.resolveFormSpec = null;
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    const path = String(url);
    if (path.includes("/v1/form-spec")) {
      doors.specUrls.push(path);
      if (doors.formSpec === "reject-error") throw new Error("door down");
      if (doors.formSpec === "deferred") {
        return new Promise<Response>((resolve) => {
          doors.resolveFormSpec = (body: unknown) => resolve(new Response(JSON.stringify(body), {
            status: 200, headers: { "content-type": "application/json" },
          }));
        });
      }
      const fields: Parameters<typeof schemaEnvelope>[0] = {
        prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
      };
      if (doors.specFields === "prompt-negative") {
        fields["negative_prompt"] = { type: "string", meta: { description: "Negative", extra: { wtype: "textarea" } } };
      }
      if (doors.specFields === "prompt-tri") {
        fields["turbo"] = { type: "tri", meta: { description: "Turbo" } };
      }
      if (doors.specFields === "prompt-image") {
        fields["input_image"] = { type: "image", meta: { description: "Input image" } };
      }
      return new Response(JSON.stringify({
        form: "image-gen", genre: "image", engine: "comfyui",
        ...(doors.specFamilies ? {
          families: [{ id: "image-gen", present: true }, { id: "tts", present: true }],
          variants: [
            { id: "v-img", label: "Img", group: "Variant", defaults: { model: "image-gen" }, route: "image-gen" },
            { id: "v-tts", label: "Tts", group: "Variant", defaults: { model: "tts" }, route: "tts" },
          ],
        } : {}),
        ...(doors.specPreview ? { preview: { historyStrip: false } } : {}),
        ...(doors.specInputs ? { inputs: [{ name: "input_image", kind: "image", required: true }] } : {}),
        schema: schemaEnvelope(fields),
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/forms")) {
      if (doors.formsTable === "fail") return new Response("gone", { status: 500 });
      return new Response(JSON.stringify({
        "image-gen": { outputs: { default: "image" } },
        tts: { outputs: { default: "audio" } },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/model-catalog")) {
      return new Response(JSON.stringify({ cards: {} }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    if (path === "/melite-tools/enhance") {
      return new Response(JSON.stringify({ results: doors.enhanceResults }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    throw new Error("estate door on the fetch lane: " + path);
  });
}

interface EstateOpts {
  startDocs?: Array<Record<string, unknown>>;
  patchFailures?: Array<Record<string, unknown>>;
  throws?: EstateRefusal[];
}

function mountBench(stages: BenchStageView[], renderSlot?: Parameters<typeof CardsTab>[0]["renderSlot"], estate?: EstateOpts): void {
  stubFetch();
  fakes = mountEstateFakes({
    benchDoc: {
      draft_id: "bench-p", rev: 1, log: [],
      stages: stages.map((s) => ({ ...s, run_status: s.runStatus })),
    },
    draftStages: stages as Array<Record<string, unknown>>,
    draftBenchRev: 1,
    startDocs: estate?.startDocs,
    patchFailures: estate?.patchFailures,
    throws: estate?.throws,
  });
  render(h(CardsTab, {
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab", contentId: undefined,
      navigation: { address: "dsh-resource://cards/bench" },
      actions: { openResource: () => {} },
    } }),
    useResource: () => ({ status: "live" as const, value: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages } as unknown as CardsBenchValue }),
    ...(renderSlot !== undefined ? { renderSlot } : {}),
  }));
}

function firstTile(): HTMLElement {
  const el = document.querySelector('button[class*="tileInner"]');
  if (el === null) throw new Error("tile button not found");
  return el as HTMLElement;
}

async function openFirstTile(): Promise<void> {
  const user = userEvent.setup();
  await user.click(firstTile());
  await screen.findByTestId("stage-preview-seat", {}, { timeout: 4000 });
}

function zoomCard(): HTMLElement {
  const el = document.querySelector('div[class*="zoomCard"]');
  if (el === null) throw new Error("zoom card not found");
  return el as HTMLElement;
}

function pressEnhance(): void {
  fireEvent.click(within(zoomCard()).getByRole("button", { name: "Agent Enhance" }));
}

// THE FIRST TEST WARMS NOTHING — the forms-table cache is per
// browser session, so the dead-table fallback must run before any
// passing fetch in this file (a later failure retries, never
// reuses, by the loader's own reset law).
describe("the dead forms-table — the picker falls to the full list", () => {
  test("declared edges without meta offer every row with a url", async () => {
    doors.formsTable = "fail";
    doors.specFields = "prompt-image";
    mountBench([
      { id: "s_0", card: "image-gen", engine: "comfyui", params: {} },
      { id: "s_1", card: "tts", engine: "comfyui", params: {}, result: { url: "/v.wav" } },
    ]);
    doors.formsTable = "fail";
    doors.specFields = "prompt-image";
    doors.specInputs = true;
    await openFirstTile();
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /input image source/i }));
    const flow = await screen.findByText("From flow", {}, { timeout: 4000 });
    fireEvent.click(flow.closest('[role="menuitem"], [role="option"], li') as HTMLElement);
    // the tts row survives DESPITE the declared image edge — no meta,
    // no narrowing (never a blocked pick)
    const rows = await screen.findAllByTestId("source-pick-row", {}, { timeout: 4000 });
    expect(rows.map((el) => el.textContent ?? "").join("\n").toLowerCase()).toContain("tts");
  });
});

describe("the family arms — undefined engine and the model re-key", () => {
  test("a cardless row with no engine key shows its raw params (never a fetch)", async () => {
    mountBench([{ id: "s_0", params: {} }]);
    const user = userEvent.setup();
    await user.click(firstTile());
    const pre = await screen.findByText("{}", {}, { timeout: 4000 });
    expect(pre.tagName).toBe("PRE");
    expect(doors.specUrls).toEqual([]);
  });

  test("a model pick re-specs the family and the typed prompt survives", async () => {
    doors.specFamilies = true;
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }]);
    doors.specFamilies = true;
    await openFirstTile();
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    const user = userEvent.setup();
    const area = document.querySelector("textarea");
    if (area === null) throw new Error("prompt field not found");
    await user.type(area, "keep me");
    const axes = document.querySelector('[data-model-axes="1"]');
    if (axes === null) throw new Error("model axes not found");
    await user.selectOptions(within(axes as HTMLElement).getByRole("combobox", { name: "Model" }), "tts");
    await waitFor(() => {
      expect(doors.specUrls.some((u) => u.includes("model=tts"))).toBe(true);
    });
    // the re-key reseeds from the CURRENT user state — the pick
    // rides, the typed prompt is never reseeded away
    expect((document.querySelector("textarea") as HTMLTextAreaElement).value).toBe("keep me");
  });

  test("an Error-voiced spec failure renders its own words", async () => {
    doors.formSpec = "reject-error";
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }]);
    doors.formSpec = "reject-error";
    const user = userEvent.setup();
    await user.click(firstTile());
    expect(await screen.findByText("door down", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a HEALED spec door retires the latched error — never a dead form forever (F-5)", async () => {
    doors.specFamilies = true;
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }]);
    doors.specFamilies = true;
    const user = userEvent.setup();
    await user.click(firstTile());
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    // the sequence inside ONE open drill: a model pick refetches the
    // spec and the door DIES — the claim latches over the live form;
    // the next pick refetches and the door HEALS — the success must
    // retire the claim, or the form wears a dead door's words forever
    doors.formSpec = "reject-error";
    const axes = await waitFor(() => {
      const el = document.querySelector('[data-model-axes="1"]');
      if (el === null) throw new Error("model axes not found");
      return el as HTMLElement;
    });
    await user.selectOptions(within(axes).getByRole("combobox", { name: "Model" }), "tts");
    expect(await screen.findByText("door down", {}, { timeout: 4000 })).toBeTruthy();
    doors.formSpec = "ok";
    await user.selectOptions(within(document.querySelector('[data-model-axes="1"]') as HTMLElement).getByRole("combobox", { name: "Model" }), "image-gen");
    await waitFor(() => {
      expect(screen.queryByText("door down")).toBeNull();
    });
    expect(await screen.findByText("Prompt", {}, { timeout: 4000 })).toBeTruthy();
    expect(doors.specUrls.some((u) => u.includes("model=tts"))).toBe(true);
  });
});

describe("the spec-null enhance — the served base composes before the spec", () => {
  test("the held model and served prompt carry an early enhance", async () => {
    doors.formSpec = "deferred";
    doors.enhanceResults = { prompt: { positive: "P2" } };
    mountBench([{
      id: "s_0", card: "image-gen", engine: "comfyui",
      params: { model: "image-gen" },
      resolved: { prompt: "served base" },
    } as never]);
    doors.formSpec = "deferred";
    doors.enhanceResults = { prompt: { positive: "P2" } };
    const user = userEvent.setup();
    await user.click(firstTile());
    // the capsule binds on drill mount — the spec is still in flight
    await screen.findByRole("button", { name: "Agent Enhance" }, { timeout: 4000 });
    pressEnhance();
    expect(await screen.findByText("enhanced (1 field)", {}, { timeout: 4000 })).toBeTruthy();
  });
});

describe("the sweep-landing arms — empty, negative, and empty-via", () => {
  async function openReady(): Promise<void> {
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: { model: "image-gen" } }]);
    await openFirstTile();
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    const user = userEvent.setup();
    const area = document.querySelector("textarea");
    if (area === null) throw new Error("prompt field not found");
    await user.type(area, "a red cube");
  }

  test("an empty positive lands nothing and says which fields", async () => {
    doors.enhanceResults = { prompt: { positive: "" } };
    await openReady();
    doors.enhanceResults = { prompt: { positive: "" } };
    pressEnhance();
    expect(await screen.findByText("the enhancer returned no declared fields (prompt)", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a declared negative_prompt carries the negative", async () => {
    doors.specFields = "prompt-negative";
    doors.enhanceResults = { prompt: { positive: "P2", negative: "N2" } };
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: { model: "image-gen" } }]);
    doors.specFields = "prompt-negative";
    doors.enhanceResults = { prompt: { positive: "P2", negative: "N2" } };
    const opener = userEvent.setup();
    await opener.click(firstTile());
    await screen.findByTestId("stage-preview-seat", {}, { timeout: 4000 });
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    const user = userEvent.setup();
    const area = document.querySelector("textarea");
    if (area === null) throw new Error("prompt field not found");
    await user.type(area, "a red cube");
    pressEnhance();
    // the W10 count law: the note counts what the WRITE carries —
    // the swept patch holds prompt AND negative_prompt (2 fields)
    expect(await screen.findByText("enhanced (2 fields)", {}, { timeout: 4000 })).toBeTruthy();
    const areas = [...document.querySelectorAll("textarea")].map((el) => (el as HTMLTextAreaElement).value);
    expect(areas).toContain("P2");
    expect(areas).toContain("N2");
  });

  test("a present-but-empty via still lands the singular", async () => {
    doors.enhanceResults = { prompt: { positive: "P2", via: "" } };
    await openReady();
    doors.enhanceResults = { prompt: { positive: "P2", via: "" } };
    pressEnhance();
    expect(await screen.findByText("enhanced (1 field)", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a via-carrying plural names the door and counts both", async () => {
    doors.specFields = "prompt-negative";
    doors.enhanceResults = {
      prompt: { positive: "P2", via: "the-door" },
      negative_prompt: { positive: "N2" },
    };
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: { model: "image-gen" } }]);
    doors.specFields = "prompt-negative";
    doors.enhanceResults = {
      prompt: { positive: "P2", via: "the-door" },
      negative_prompt: { positive: "N2" },
    };
    const opener = userEvent.setup();
    await opener.click(firstTile());
    await screen.findByTestId("stage-preview-seat", {}, { timeout: 4000 });
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    const user = userEvent.setup();
    const area = document.querySelector("textarea");
    if (area === null) throw new Error("prompt field not found");
    await user.type(area, "a red cube");
    pressEnhance();
    expect(await screen.findByText("enhanced via the-door (2 fields)", {}, { timeout: 4000 })).toBeTruthy();
  });
});

describe("the run's quiet arms — no edits, and the Error-voiced patch", () => {
  test("a run with no edits skips the write and still starts", async () => {
    mountBench(
      [{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }],
      undefined,
      { startDocs: [{ run_id: "r_0" }] },
    );
    await openFirstTile();
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    fireEvent.click(within(zoomCard()).getByRole("button", { name: "Run stage" }));
    await waitFor(() => {
      expect(calls().some((p) => p.method === "runs/start")).toBe(true);
    });
    // the flush wrote nothing — the only drafts/patch traffic is the
    // run's own status patch, never a params flush
    expect(patches()).toEqual([]);
  });

  test("a same-sized edit compares per key before writing", async () => {
    mountBench(
      [{ id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "p" } }],
      undefined,
      { startDocs: [{ run_id: "r_0" }] },
    );
    await openFirstTile();
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    const user = userEvent.setup();
    const area = document.querySelector("textarea");
    if (area === null) throw new Error("prompt field not found");
    expect((area as HTMLTextAreaElement).value).toBe("p");
    await user.type(area, "!");
    fireEvent.click(within(zoomCard()).getByRole("button", { name: "Run stage" }));
    await waitFor(() => {
      expect(calls().some((p) => p.method === "runs/start")).toBe(true);
    });
    const flush = patches()[patches().length - 1];
    expect(flush).toEqual({ prompt: "p!" });
  });

  test("an undelivered run patch voices the door's own words", async () => {
    // the old frame's {rev: 2} (no delivered key) is the door's
    // undelivered arm — the harness serves patchFailures verbatim.
    mountBench(
      [{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }],
      undefined,
      { patchFailures: [{ rev: 2 }] },
    );
    await openFirstTile();
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    const user = userEvent.setup();
    const area = document.querySelector("textarea");
    if (area === null) throw new Error("prompt field not found");
    await user.type(area, "x");
    fireEvent.click(within(zoomCard()).getByRole("button", { name: "Run stage" }));
    expect(await screen.findByText(/undelivered/, {}, { timeout: 4000 })).toBeTruthy();
    expect(calls().some((p) => p.method === "runs/start")).toBe(false);
  });
});

describe("the throwing owners — remove and ungroup fall back loud", () => {
  function mountClaimed(stages: BenchStageView[], claim: (owner: Record<string, unknown>) => unknown, estate?: EstateOpts): void {
    mountBench(stages, ((slot: string, owner: Record<string, unknown>, opts: { fallback: unknown }) => {
      if (slot !== "cards.stage.view") return opts.fallback;
      return h("div", null,
        opts.fallback as never,
        h("div", { "data-testid": "slot-claim" }, claim(owner) as never),
      );
    }) as never, estate);
  }

  test("a throwing remove voices the fallback (never a throw past the gesture)", async () => {
    // the old stub threw the bare string "kablam" (a non-Error, so
    // the client voiced its 'remove failed' fallback); the live seam
    // throws Errors, so the queued message IS the voiced text.
    mountClaimed(
      [{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }],
      (owner) => h("button", {
        type: "button", "data-testid": "slot-remove",
        onClick: () => { (owner["onRemove"] as () => void)(); },
      }, "SLOT-REMOVE"),
      { throws: [{ method: "bench/remove-stage", message: "remove failed" }] },
    );
    const user = userEvent.setup();
    await user.click(firstTile());
    fireEvent.click(await screen.findByTestId("slot-remove", {}, { timeout: 4000 }));
    expect(await screen.findByText("remove failed", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a throwing ungroup voices the fallback (never a throw past the gesture)", async () => {
    mountBench(
      [{ id: "g_0", card: "group", engine: "comfyui", params: {}, children: [{ id: "s_0", card: "image-gen" }] } as never],
      undefined,
      { throws: [{ method: "bench/ungroup", message: "ungroup failed" }] },
    );
    const user = userEvent.setup();
    await user.click(firstTile());
    fireEvent.click(await screen.findByText("Ungroup", {}, { timeout: 4000 }));
    expect(await screen.findByText("ungroup failed", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a non-array children value drills as an empty compound (never a throw)", async () => {
    mountBench([{ id: "g_0", card: "group", engine: "comfyui", params: {}, children: "nope" } as never]);
    const user = userEvent.setup();
    await user.click(firstTile());
    expect(await screen.findByText(/A compound of 0 stages\./, {}, { timeout: 4000 })).toBeTruthy();
  });
});

describe("the tri-state unset — inherit removes the override", () => {
  test("inherit drops the key and the next run flushes without it", async () => {
    doors.specFields = "prompt-tri";
    mountBench(
      [{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }],
      undefined,
      { startDocs: [{ run_id: "r_0" }, { run_id: "r_0" }] },
    );
    doors.specFields = "prompt-tri";
    await openFirstTile();
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    const user = userEvent.setup();
    const turbo = screen.getByRole("combobox", { name: "Turbo" });
    const flushes = (): Array<Record<string, unknown>> => patches();
    await user.selectOptions(turbo, "true");
    fireEvent.click(within(zoomCard()).getByRole("button", { name: "Run stage" }));
    await waitFor(() => { expect(flushes().length).toBeGreaterThan(0); });
    expect(flushes()[flushes().length - 1]).toMatchObject({ turbo: true });
    // a neighbor key rides along — the inherit rebuild keeps every
    // key but the unset one (the filter's keep arm)
    const area = document.querySelector("textarea");
    if (area === null) throw new Error("prompt field not found");
    await user.type(area, "kept");
    await user.selectOptions(turbo, "");
    // the inherit shows — and with nothing left to write the next
    // run skips the flush yet still starts (the quiet arm)
    expect((turbo as HTMLSelectElement).value).toBe("");
    const starts = (): number => calls().filter((p) => p.method === "runs/start").length;
    fireEvent.click(within(zoomCard()).getByRole("button", { name: "Run stage" }));
    await waitFor(() => { expect(starts()).toBe(2); });
    // THE LAST FLUSH carries the kept prompt but never a live turbo
    // value: the inherit unset rides the JSON Merge Patch null (the
    // door deletes the key). The old black-hole stub never applied
    // flush #1, so its pristine base dropped the no-op null and the
    // key was absent instead — same intent, seam-honest spelling
    // (the live seam applies each flush estate-side, so the served
    // base holds turbo:true and the unset must be explicit).
    // The AUTHORING CONTRACT (2026-10-10) writes each edit on its
    // own (a turbo pick is a real write now, not React state alone),
    // so the flush CENSUS grew; the law is the last flush's shape,
    // and the count is a floor, never an equality.
    // SOME flush is the run's whole-layer merge patch — the one that
    // carries the inherit unset (turbo: null). The authoring
    // contract's per-edit writes ride around it, so the census and
    // the ORDER are the door's business, not this pin's.
    expect(flushes().length).toBeGreaterThanOrEqual(2);
    expect(flushes().some((f) => f["prompt"] === "kept" && f["turbo"] === null)).toBe(true);
  });

  test("inheriting a served base value unsets nothing and keeps the base", async () => {
    // the base holds turbo, the user map never did — the unset finds
    // no key (the filter's identity arm) and the base still serves
    doors.specFields = "prompt-tri";
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {}, resolved: { turbo: true } } as never]);
    doors.specFields = "prompt-tri";
    await openFirstTile();
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    const user = userEvent.setup();
    const turbo = screen.getByRole("combobox", { name: "Turbo" });
    expect((turbo as HTMLSelectElement).value).toBe("true");
    await user.selectOptions(turbo, "");
    await user.click(document.querySelector("textarea") as HTMLElement);
    // no user key to drop — the row re-derives to its served base
    // (the base still says on; the override is simply gone)
    expect((turbo as HTMLSelectElement).value).toBe("true");
  });
});

describe("the preview owner — kinds, status, snapshots, and the strip opt-out", () => {
  test("a video result previews through the video face", async () => {
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {}, result: { url: "/x.mp4" } }]);
    await openFirstTile();
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    expect(document.querySelector("video")).not.toBeNull();
  });

  test("an audio result previews through the audio face", async () => {
    mountBench([{ id: "s_0", card: "tts", engine: "comfyui", params: {}, result: { url: "/x.wav" } }]);
    await openFirstTile();
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    expect(document.querySelector("audio")).not.toBeNull();
  });

  test("a string runStatus and a snapshotless archive ride the owner", async () => {
    const owners: Array<Record<string, unknown>> = [];
    mountBench(
      [{
        id: "s_0", card: "image-gen", engine: "comfyui",
        params: { prompt: "new" }, runStatus: "failed",
        result: { url: "/new.png", artifacts: { img: "/new.png" } },
        history: [{ url: "/old.png" }],
      } as never],
      ((slot: string, owner: Record<string, unknown>, opts: { fallback: unknown }) => {
        if (slot === "cards.stage.preview") owners.push(owner);
        return opts.fallback;
      }) as never,
    );
    await openFirstTile();
    await waitFor(() => { expect(owners.length).toBeGreaterThan(0); });
    const last = owners[owners.length - 1]!;
    expect(last["runStatus"]).toBe("failed");
    expect(last["history"]).toEqual([[{ name: "output", url: "/old.png" }]]);
    // no snapshot, no note — the strip stays unclaimed
    expect(last).not.toHaveProperty("historyNotes");
  });

  test("a historyStrip:false declaration opts the strip out", async () => {
    const owners: Array<Record<string, unknown>> = [];
    doors.specPreview = true;
    mountBench(
      [{
        id: "s_0", card: "image-gen", engine: "comfyui",
        params: { prompt: "new" },
        result: { url: "/new.png", artifacts: { img: "/new.png" } },
        history: [{ url: "/old.png", params: { prompt: "old" } }],
      } as never],
      ((slot: string, owner: Record<string, unknown>, opts: { fallback: unknown }) => {
        if (slot === "cards.stage.preview") owners.push(owner);
        return opts.fallback;
      }) as never,
    );
    doors.specPreview = true;
    await openFirstTile();
    // wait for the OWNER that carries the declaration (the first flush
    // rides the bare stage; historyStrip lands with the resolved decl —
    // asserting after a length-only wait raced that second flush)
    await waitFor(() => {
      expect(owners[owners.length - 1]).toMatchObject({ historyStrip: false });
    });
  });
});
