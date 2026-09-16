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
import { CardsTab } from "../src/client/CardsTab.tsx";
import { schemaEnvelope } from "../src/client/spec-form.tsx";
import type { BenchStageRow, CardsBenchValue } from "../src/client/cards-resource.ts";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
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
  posted: Array<{ method: string; args: Record<string, unknown> }>;
  frames: Record<string, (args: Record<string, unknown>) => { value?: unknown; refuse?: string; thrown?: unknown }>;
  patches: Array<Record<string, unknown>>;
  resolveFormSpec: ((body: unknown) => void) | null;
}

const doors: Doors = {
  formSpec: "ok", formsTable: "ok", specFields: "prompt",
  specFamilies: false, specPreview: false, specInputs: false,
  enhanceResults: {}, specUrls: [], posted: [], frames: {},
  patches: [], resolveFormSpec: null,
};

function stubFetch(): void {
  doors.formSpec = "ok";
  doors.formsTable = "ok";
  doors.specFields = "prompt";
  doors.specFamilies = false;
  doors.specPreview = false;
  doors.specInputs = false;
  doors.enhanceResults = {};
  doors.specUrls = [];
  doors.posted = [];
  doors.frames = {};
  doors.patches = [];
  doors.resolveFormSpec = null;
  vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit): Promise<Response> => {
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
      const fields: Record<string, unknown> = {
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
    if (path.startsWith("/api/")) {
      const frame = JSON.parse(String(init?.body)) as { rpcId: string; method: string; payload: { args: Record<string, unknown> } };
      doors.posted.push({ method: frame.method, args: frame.payload.args });
      if (frame.method === "drafts/patch") {
        const params = ((frame.payload.args["patch"] as Record<string, unknown>)["params"] ?? {}) as Record<string, unknown>;
        doors.patches.push(params);
      }
      const route = doors.frames[frame.method];
      if (route !== undefined) {
        const answer = route(frame.payload.args);
        if (answer.thrown !== undefined) throw answer.thrown;
        if (answer.refuse !== undefined) {
          return new Response(JSON.stringify({
            type: "server-response", rpcId: frame.rpcId,
            result: { ok: false, error: { message: answer.refuse } },
          }), { status: 200, headers: { "content-type": "application/json" } });
        }
        return new Response(JSON.stringify({
          type: "server-response", rpcId: frame.rpcId,
          result: { ok: true, value: answer.value ?? {} },
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify({
        type: "server-response", rpcId: frame.rpcId, result: { ok: true, value: {} },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response("no", { status: 500 });
  });
}

function mountBench(stages: BenchStageRow[], renderSlot?: (...args: never[]) => unknown): void {
  stubFetch();
  const doc = {
    draft_id: "bench-p", rev: 1, log: [],
    stages: stages.map((s) => ({ ...s, run_status: s.runStatus })),
  };
  const impl = globalThis.fetch;
  vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit): Promise<Response> => {
    const path = String(url);
    if (path.startsWith("/api/")) {
      const frame = JSON.parse(String(init?.body)) as { rpcId: string; method: string };
      if (frame.method === "bench/get") {
        return new Response(JSON.stringify({
          type: "server-response", rpcId: frame.rpcId,
          result: { ok: true, value: doc },
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (frame.method === "drafts/get") {
        return new Response(JSON.stringify({
          type: "server-response", rpcId: frame.rpcId,
          result: { ok: true, value: { draft_id: "bench-p", bench: { rev: 1 }, stages } },
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
    }
    return (impl as typeof fetch)(url, init);
  });
  render(h(CardsTab, {
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab", contentId: undefined,
      navigation: { address: "dsh-resource://cards/bench" },
      actions: { openResource: () => {} },
    } }),
    useResource: () => ({ status: "live", value: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages } as CardsBenchValue }),
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
    expect(await screen.findByText("enhanced (1 field)", {}, { timeout: 4000 })).toBeTruthy();
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
    doors.frames["runs/start"] = () => ({ value: { run_id: "r_0" } });
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }]);
    doors.frames["runs/start"] = () => ({ value: { run_id: "r_0" } });
    await openFirstTile();
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    fireEvent.click(within(zoomCard()).getByRole("button", { name: "Run stage" }));
    await waitFor(() => {
      expect(doors.posted.some((p) => p.method === "runs/start")).toBe(true);
    });
    // the flush wrote nothing — the only drafts/patch traffic is the
    // run's own status patch, never a params flush
    const flushes = doors.posted.filter((p) => p.method === "drafts/patch"
      && (p.args["patch"] as Record<string, unknown>)["params"] !== undefined);
    expect(flushes).toEqual([]);
  });

  test("a same-sized edit compares per key before writing", async () => {
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "p" } }]);
    doors.frames["drafts/patch"] = () => ({ value: { delivered: true, rev: 2 } });
    doors.frames["runs/start"] = () => ({ value: { run_id: "r_0" } });
    await openFirstTile();
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    const user = userEvent.setup();
    const area = document.querySelector("textarea");
    if (area === null) throw new Error("prompt field not found");
    expect((area as HTMLTextAreaElement).value).toBe("p");
    await user.type(area, "!");
    fireEvent.click(within(zoomCard()).getByRole("button", { name: "Run stage" }));
    await waitFor(() => {
      expect(doors.posted.some((p) => p.method === "runs/start")).toBe(true);
    });
    const flush = doors.posted.find((p) => p.method === "drafts/patch"
      && (p.args["patch"] as Record<string, unknown>)["params"] !== undefined);
    expect((flush?.args["patch"] as Record<string, unknown>)["params"]).toEqual({ prompt: "p!" });
  });

  test("an undelivered run patch voices the door's own words", async () => {
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }]);
    doors.frames["drafts/patch"] = () => ({ value: { rev: 2 } });
    await openFirstTile();
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    const user = userEvent.setup();
    const area = document.querySelector("textarea");
    if (area === null) throw new Error("prompt field not found");
    await user.type(area, "x");
    fireEvent.click(within(zoomCard()).getByRole("button", { name: "Run stage" }));
    expect(await screen.findByText(/undelivered/, {}, { timeout: 4000 })).toBeTruthy();
    expect(doors.posted.some((p) => p.method === "runs/start")).toBe(false);
  });
});

describe("the throwing owners — remove and ungroup fall back loud", () => {
  function mountClaimed(stages: BenchStageRow[], claim: (owner: Record<string, unknown>) => unknown): void {
    mountBench(stages, ((slot: string, owner: Record<string, unknown>, opts: { fallback: unknown }) => {
      if (slot !== "cards.stage.view") return opts.fallback;
      return h("div", null,
        opts.fallback as never,
        h("div", { "data-testid": "slot-claim" }, claim(owner) as never),
      );
    }) as never);
  }

  test("a throwing remove voices the fallback (never a throw past the gesture)", async () => {
    mountClaimed(
      [{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }],
      (owner) => h("button", {
        type: "button", "data-testid": "slot-remove",
        onClick: () => { (owner["onRemove"] as () => void)(); },
      }, "SLOT-REMOVE"),
    );
    const user = userEvent.setup();
    await user.click(firstTile());
    doors.frames["bench/remove-stage"] = () => ({ thrown: "kablam" });
    fireEvent.click(await screen.findByTestId("slot-remove", {}, { timeout: 4000 }));
    expect(await screen.findByText("remove failed", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a throwing ungroup voices the fallback (never a throw past the gesture)", async () => {
    mountBench([{ id: "g_0", card: "group", engine: "comfyui", params: {}, children: [{ id: "s_0", card: "image-gen" }] } as never]);
    const user = userEvent.setup();
    await user.click(firstTile());
    doors.frames["bench/ungroup"] = () => ({ thrown: "kablam" });
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
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }]);
    doors.specFields = "prompt-tri";
    doors.frames["drafts/patch"] = () => ({ value: { delivered: true, rev: 2 } });
    doors.frames["runs/start"] = () => ({ value: { run_id: "r_0" } });
    await openFirstTile();
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    const user = userEvent.setup();
    const turbo = screen.getByRole("combobox", { name: "Turbo" });
    const flushes = (): Array<Record<string, unknown>> => doors.posted
      .filter((p) => p.method === "drafts/patch"
        && (p.args["patch"] as Record<string, unknown>)["params"] !== undefined)
      .map((p) => (p.args["patch"] as Record<string, unknown>)["params"] as Record<string, unknown>);
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
    const starts = (): number => doors.posted.filter((p) => p.method === "runs/start").length;
    fireEvent.click(within(zoomCard()).getByRole("button", { name: "Run stage" }));
    await waitFor(() => { expect(starts()).toBe(2); });
    // the second flush carries the kept prompt but never the
    // inherited-away key (the quiet arm, keyed)
    expect(flushes().length).toBe(2);
    expect(flushes()[1]).toMatchObject({ prompt: "kept" });
    expect(flushes()[1]).not.toHaveProperty("turbo");
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
    await waitFor(() => { expect(owners.length).toBeGreaterThan(0); });
    expect(owners[owners.length - 1]).toMatchObject({ historyStrip: false });
  });
});
