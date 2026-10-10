// @vitest-environment happy-dom
// cards-tab-enhance.spec.tsx — the drill's ✦ agent-enhance verb
// (2026-09-16 burn-down, installment 3b-enhance): the no-silent-
// reject guards, the already-running latch, the sweep landing
// (singular/plural, via present/absent, junk skipped, the negative
// carry), and the failure faces (HTTP words, payload errors,
// transport throws). Pressed through the frame's ✦ capsule; the
// /melite-tools/enhance door stubbed per mode.
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { CardsTab } from "../src/client/CardsTab.tsx";
import { mountEstateFakes } from "./estate-harness.ts";
import { unbindEstateRemote } from '@melite/card-base/client';
import { flushStageWrites } from "../src/client/draft.ts";
import { schemaEnvelope } from '@melite/card-base/client';
import type { BenchStageView, CardsBenchValue } from "../src/client/cards-resource.ts";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

type EnhanceMode =
  | "ok" | "deferred" | "stale-route"
  | "http500-body" | "http500-empty"
  | "error-string" | "error-number" | "throw-string";

interface Doors {
  specFields: "one" | "two" | "seed";
  specModel: boolean;
  enhanceMode: EnhanceMode;
  enhanceResults: unknown;
  enhanceBodies: string[];
  resolveEnhance: ((body: unknown, status: number) => void) | null;
}

const doors: Doors = {
  specFields: "one", specModel: false, enhanceMode: "ok",
  enhanceResults: {}, enhanceBodies: [], resolveEnhance: null,
};

function stubFetch(): void {
  doors.enhanceBodies = [];
  doors.resolveEnhance = null;
  // every mount re-arms the defaults — tests set their modes AFTER
  // the mount (the fetch reads per request)
  doors.specFields = "one";
  doors.specModel = false;
  doors.enhanceMode = "ok";
  doors.enhanceResults = {};
  vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit): Promise<Response> => {
    const path = String(url);
    if (path.includes("/v1/form-spec")) {
      const fields: Parameters<typeof schemaEnvelope>[0] = {
        prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
      };
      if (doors.specFields === "two") {
        fields["notes"] = { type: "string", meta: { description: "Notes", extra: { wtype: "textarea" } } };
      }
      if (doors.specFields === "seed") {
        fields["seed"] = { type: "seed", meta: { description: "Seed" } };
      }
      return new Response(JSON.stringify({
        form: "image-gen", genre: "image", engine: "comfyui",
        ...(doors.specModel ? { model: "held-family" } : {}),
        schema: schemaEnvelope(fields),
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/forms")) {
      return new Response(JSON.stringify({}), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    if (path.includes("/v1/model-catalog")) {
      return new Response(JSON.stringify({ cards: {} }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    if (path === "/melite-tools/enhance") {
      doors.enhanceBodies.push(String(init?.body ?? ""));
      switch (doors.enhanceMode) {
        case "deferred":
          return new Promise<Response>((resolve) => {
            doors.resolveEnhance = (body: unknown, status: number) => resolve(new Response(
              typeof body === "string" ? body : JSON.stringify(body),
              { status, headers: { "content-type": "application/json" } },
            ));
          });
        case "stale-route":
          // THE STALE PICK's door voice: the 400 names the picked
          // route against the live list — one shot, then the mode
          // falls through so the Auto retry lands clean
          doors.enhanceMode = "ok";
          doors.enhanceResults = { prompt: { positive: "P2" } };
          return new Response(JSON.stringify({
            error: 'enhance: unknown llm route "x/y" (live: a/b, c/d)',
          }), { status: 400, headers: { "content-type": "application/json" } });
        case "http500-body":
          return new Response("bad times", { status: 500 });
        case "http500-empty":
          return new Response("", { status: 500 });
        case "error-string":
          return new Response(JSON.stringify({ error: "tired" }), {
            status: 200, headers: { "content-type": "application/json" },
          });
        case "error-number":
          return new Response(JSON.stringify({ error: 42 }), {
            status: 200, headers: { "content-type": "application/json" },
          });
        case "throw-string":
          throw "boom";
        case "ok":
        default:
          return new Response(JSON.stringify({ results: doors.enhanceResults }), {
            status: 200, headers: { "content-type": "application/json" },
          });
      }
    }
    // ONE-LANE TRIPWIRE (stroke 81): no estate verb may ride fetch —
    // the bench arrives via useResource below, writes ride the
    // mounted namespace (unmounted here: enhance never writes). Any
    // /api/ frame is a regression against the law — fail LOUD.
    if (path.startsWith("/api/")) {
      throw new Error("estate door on the fetch lane: " + path);
    }
    return new Response("no", { status: 500 });
  });
}

function mountBench(stages: BenchStageView[]): void {
  stubFetch();
  render(h(CardsTab, {
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab", contentId: undefined,
      navigation: { address: "dsh-resource://cards/bench" },
      actions: { openResource: () => {} },
    } }),
    useResource: () => ({ status: "live" as const, value: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages } as unknown as CardsBenchValue }),
  }));
}

async function openDrill(): Promise<void> {
  mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }]);
  const user = userEvent.setup();
  const tile = document.querySelector('button[class*="tileInner"]') as HTMLElement;
  await user.click(tile);
  await screen.findByTestId("stage-preview-seat", {}, { timeout: 4000 });
  await screen.findByText("Prompt", {}, { timeout: 4000 });
}

async function typePrompt(text: string): Promise<void> {
  const user = userEvent.setup();
  const area = document.querySelector("textarea");
  if (area === null) throw new Error("prompt field not found");
  await user.type(area, text);
}

function pressEnhance(): void {
  const zoom = document.querySelector('div[class*="zoomCard"]') as HTMLElement;
  fireEvent.click(within(zoom).getByRole("button", { name: "Agent Enhance" }));
}

function enhanceNote(): string | null {
  return document.querySelector('[data-testid="enhance-note"]')?.textContent ?? null;
}

describe("the enhance guards — every rejection renders its face", () => {
  test("an empty prompt refuses before any wire fires", async () => {
    await openDrill();
    pressEnhance();
    expect(await screen.findByTestId("enhance-note", {}, { timeout: 4000 })).toBeTruthy();
    expect(enhanceNote()).toBe("nothing to enhance — the prompt is empty");
    expect(doors.enhanceBodies).toEqual([]);
  });

  test("a modeless card refuses with its own words (never the door's)", async () => {
    await openDrill();
    await typePrompt("a red cube");
    pressEnhance();
    expect(await screen.findByText("no model to enhance with — pick a Model first", {}, { timeout: 4000 })).toBeTruthy();
    expect(doors.enhanceBodies).toEqual([]);
  });

  test("a second press mid-flight is swallowed by the frame (never two sweeps)", async () => {
    // the frame's own latch (the bar disables + guards while busy)
    // strictly dominates the drill's inner already-running guard:
    // the drill's enhancing window sits inside the bar's, so the
    // inner guard cannot hold at any call boundary (exempt with
    // caller proof — fireEnhance is the sole caller). The reachable
    // law pinned here: one press, one sweep, no matter the presses.
    doors.enhanceMode = "ok";
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: { model: "image-gen" } }]);
    doors.enhanceMode = "deferred";
    const impl = globalThis.fetch;
    vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit): Promise<Response> => {
      if (String(url) === "/melite-tools/enhance") {
        doors.enhanceBodies.push(String(init?.body ?? ""));
        return new Promise<Response>((resolve) => {
          doors.resolveEnhance = (body: unknown, status: number) => resolve(new Response(
            typeof body === "string" ? body : JSON.stringify(body),
            { status, headers: { "content-type": "application/json" } },
          ));
        });
      }
      return (impl as typeof fetch)(url as string, init);
    });
    const user = userEvent.setup();
    const tile = document.querySelector('button[class*="tileInner"]') as HTMLElement;
    await user.click(tile);
    await screen.findByTestId("stage-preview-seat", {}, { timeout: 4000 });
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    await typePrompt("a red cube");
    pressEnhance();
    await screen.findByText("✦ enhancing…", {}, { timeout: 4000 });
    pressEnhance();
    pressEnhance();
    await new Promise((r) => setTimeout(r, 50));
    expect(doors.enhanceBodies.length).toBe(1);
    doors.resolveEnhance!({ results: { prompt: { positive: "P2" } } }, 200);
    await waitFor(() => { expect(enhanceNote()).toContain("enhanced"); });
    expect(doors.enhanceBodies.length).toBe(1);
  });
});

describe("the sweep landing — results ride the hand-edit seam", () => {
  test("one field with a via names its road (singular)", async () => {
    doors.enhanceResults = { prompt: { positive: "P2", negative: "N2", via: "skill" } };
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: { model: "image-gen" } }]);
    doors.enhanceResults = { prompt: { positive: "P2", negative: "N2", via: "skill" } };
    const user = userEvent.setup();
    const tile = document.querySelector('button[class*="tileInner"]') as HTMLElement;
    await user.click(tile);
    await screen.findByTestId("stage-preview-seat", {}, { timeout: 4000 });
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    await typePrompt("a red cube");
    pressEnhance();
    expect(await screen.findByText("enhanced via skill (1 field)", {}, { timeout: 4000 })).toBeTruthy();
    const area = document.querySelector("textarea") as HTMLTextAreaElement;
    expect(area.value).toBe("P2");
  });

  test("a declared NUMBER field lands COERCED on the wire (W10 — the row receives the hand's shape, never the enhancer's string)", async () => {
    // the estate must MOUNT for this pin: the swept patch rides the
    // write ledger onto drafts/patch — the wire body is the verdict
    const fakes = mountEstateFakes({
      benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: [{ id: "s_0" }] },
      draftStages: [{ id: "s_0", card: "image-gen", engine: "comfyui", params: { model: "image-gen" } }],
      draftBenchRev: 1,
    });
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: { model: "image-gen" } }]);
    doors.specFields = "seed";
    doors.enhanceResults = { seed: { positive: "42", via: "blueprint" } };
    try {
      const opener = userEvent.setup();
      await opener.click(document.querySelector('button[class*="tileInner"]') as HTMLElement);
      await screen.findByTestId("stage-preview-seat", {}, { timeout: 4000 });
      await screen.findByText("Seed", {}, { timeout: 4000 });
      await typePrompt("a red cube");
      pressEnhance();
      expect(await screen.findByText(/enhanced via blueprint \(1 field\)/, {}, { timeout: 4000 })).toBeTruthy();
      await flushStageWrites("bench-p", "s_0");
      const patches = fakes.calls.filter((c) => c.method === "drafts/patch");
      expect(patches.length).toBeGreaterThan(0);
      // the WIRE truth (2026-09-29 repin): the sweep's atomic frame
      // carries the coerced NUMBER — the trailing per-key scheduler
      // may land a prompt frame AFTER it, so "last frame" is not the
      // sweep's seat. SOME frame carries seed 42 the NUMBER; NO
      // frame anywhere carries "42" the string a hand edit can
      // never even make.
      const servedFrames = patches.map((c) => ((((c.args as { patch?: { params?: Record<string, unknown> } }).patch ?? {}).params ?? {})));
      expect(servedFrames.some((f) => f["seed"] === 42), "the coerced number rides an atomic sweep frame").toBe(true);
      expect(servedFrames.some((f) => f["seed"] === "42"), "the enhancer's raw string never rides the wire").toBe(false);
    } finally {
      fakes.unmount();
      unbindEstateRemote();
    }
  });

  test("two fields without a via count plural (no road named)", async () => {
    doors.specFields = "two";
    doors.enhanceResults = { prompt: { positive: "A" }, notes: { positive: "B" } };
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: { model: "image-gen" } }]);
    doors.specFields = "two";
    doors.enhanceResults = { prompt: { positive: "A" }, notes: { positive: "B" } };
    const user = userEvent.setup();
    const tile = document.querySelector('button[class*="tileInner"]') as HTMLElement;
    await user.click(tile);
    await screen.findByTestId("stage-preview-seat", {}, { timeout: 4000 });
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    await typePrompt("a red cube");
    pressEnhance();
    expect(await screen.findByText("enhanced (2 fields)", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("an empty sweep is a rejection with the server's shape (never 'enhanced')", async () => {
    doors.enhanceResults = {};
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: { model: "image-gen" } }]);
    doors.enhanceResults = {};
    const user = userEvent.setup();
    const tile = document.querySelector('button[class*="tileInner"]') as HTMLElement;
    await user.click(tile);
    await screen.findByTestId("stage-preview-seat", {}, { timeout: 4000 });
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    await typePrompt("a red cube");
    pressEnhance();
    expect(await screen.findByText("the enhancer returned no declared fields ()", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("an undeclared field never lands (the sweep cannot invent params)", async () => {
    doors.enhanceResults = { zzz: { positive: "X" } };
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: { model: "image-gen" } }]);
    doors.enhanceResults = { zzz: { positive: "X" } };
    const user = userEvent.setup();
    const tile = document.querySelector('button[class*="tileInner"]') as HTMLElement;
    await user.click(tile);
    await screen.findByTestId("stage-preview-seat", {}, { timeout: 4000 });
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    await typePrompt("a red cube");
    pressEnhance();
    expect(await screen.findByText("the enhancer returned no declared fields (zzz)", {}, { timeout: 4000 })).toBeTruthy();
    const area = document.querySelector("textarea") as HTMLTextAreaElement;
    expect(area.value).toBe("a red cube");
  });

  test("the served model stands in (no held model needed)", async () => {
    doors.specModel = true;
    doors.enhanceResults = { prompt: { positive: "P2" } };
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }]);
    doors.specModel = true;
    doors.enhanceResults = { prompt: { positive: "P2" } };
    const user = userEvent.setup();
    const tile = document.querySelector('button[class*="tileInner"]') as HTMLElement;
    await user.click(tile);
    await screen.findByTestId("stage-preview-seat", {}, { timeout: 4000 });
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    await typePrompt("a red cube");
    pressEnhance();
    expect(await screen.findByText("enhanced (1 field)", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a picked LLM route threads the door's llm argument", async () => {
    window.localStorage.setItem("melite:card-llm:v1", "x/y");
    doors.enhanceResults = { prompt: { positive: "P2" } };
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: { model: "image-gen" } }]);
    doors.enhanceResults = { prompt: { positive: "P2" } };
    const user = userEvent.setup();
    const tile = document.querySelector('button[class*="tileInner"]') as HTMLElement;
    await user.click(tile);
    await screen.findByTestId("stage-preview-seat", {}, { timeout: 4000 });
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    await typePrompt("a red cube");
    pressEnhance();
    await screen.findByText("enhanced (1 field)", {}, { timeout: 4000 });
    expect(doors.enhanceBodies.length).toBe(1);
    expect(JSON.parse(doors.enhanceBodies[0]!)).toEqual({ model: "image-gen", prompt: "a red cube", llm: "x/y" });
  });

  test("THE STALE PICK (audit V-S6): a 400 naming OUR route clears the preference and retries once on Auto", async () => {
    window.localStorage.setItem("melite:card-llm:v1", "x/y");
    doors.enhanceMode = "stale-route";
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: { model: "image-gen" } }]);
    doors.enhanceMode = "stale-route";
    const user = userEvent.setup();
    const tile = document.querySelector('button[class*="tileInner"]') as HTMLElement;
    await user.click(tile);
    await screen.findByTestId("stage-preview-seat", {}, { timeout: 4000 });
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    await typePrompt("a red cube");
    pressEnhance();
    await screen.findByText("enhanced (1 field)", {}, { timeout: 4000 });
    // ONE press, TWO door calls: the pick first, then the Auto retry
    expect(doors.enhanceBodies.length).toBe(2);
    expect(JSON.parse(doors.enhanceBodies[0]!)).toEqual({ model: "image-gen", prompt: "a red cube", llm: "x/y" });
    expect(JSON.parse(doors.enhanceBodies[1]!)).toEqual({ model: "image-gen", prompt: "a red cube" });
    // the dead preference is cleared — the next card's press starts on Auto
    expect(window.localStorage.getItem("melite:card-llm:v1")).toBeNull();
  });
});

describe("the enhance failures — the door's words, never a stack", () => {
  test("an HTTP refusal carries its short body", async () => {
    doors.enhanceMode = "http500-body";
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: { model: "image-gen" } }]);
    doors.enhanceMode = "http500-body";
    const user = userEvent.setup();
    const tile = document.querySelector('button[class*="tileInner"]') as HTMLElement;
    await user.click(tile);
    await screen.findByTestId("stage-preview-seat", {}, { timeout: 4000 });
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    await typePrompt("a red cube");
    pressEnhance();
    expect(await screen.findByText("enhance failed (500: bad times)", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("an HTTP refusal with an empty body names only its status", async () => {
    doors.enhanceMode = "http500-empty";
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: { model: "image-gen" } }]);
    doors.enhanceMode = "http500-empty";
    const user = userEvent.setup();
    const tile = document.querySelector('button[class*="tileInner"]') as HTMLElement;
    await user.click(tile);
    await screen.findByTestId("stage-preview-seat", {}, { timeout: 4000 });
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    await typePrompt("a red cube");
    pressEnhance();
    expect(await screen.findByText("enhance failed (500)", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a payload error voices its own string", async () => {
    doors.enhanceMode = "error-string";
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: { model: "image-gen" } }]);
    doors.enhanceMode = "error-string";
    const user = userEvent.setup();
    const tile = document.querySelector('button[class*="tileInner"]') as HTMLElement;
    await user.click(tile);
    await screen.findByTestId("stage-preview-seat", {}, { timeout: 4000 });
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    await typePrompt("a red cube");
    pressEnhance();
    expect(await screen.findByText("tired", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a wordless payload error lands as an empty sweep (never a throw)", async () => {
    // the throw's own truth table: res.ok with a non-string error
    // never throws (the 'unexpected payload' inner arm is dead — if
    // res.ok the outer guard needs a string error; if !res.ok the
    // inner guard takes the status arm) — the empty results reject
    // with the server's shape instead
    doors.enhanceMode = "error-number";
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: { model: "image-gen" } }]);
    doors.enhanceMode = "error-number";
    const user = userEvent.setup();
    const tile = document.querySelector('button[class*="tileInner"]') as HTMLElement;
    await user.click(tile);
    await screen.findByTestId("stage-preview-seat", {}, { timeout: 4000 });
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    await typePrompt("a red cube");
    pressEnhance();
    expect(await screen.findByText("the enhancer returned no declared fields ()", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a transport throw that is no Error voices its own words (never a throw past the press)", async () => {
    doors.enhanceMode = "throw-string";
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: { model: "image-gen" } }]);
    doors.enhanceMode = "throw-string";
    const user = userEvent.setup();
    const tile = document.querySelector('button[class*="tileInner"]') as HTMLElement;
    await user.click(tile);
    await screen.findByTestId("stage-preview-seat", {}, { timeout: 4000 });
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    await typePrompt("a red cube");
    pressEnhance();
    // the fake throws the plain string "boom" — the note speaks the
    // thrown words verbatim (the failureText law), never a fixed
    // fallback that masks them
    expect(await screen.findByText("boom", {}, { timeout: 4000 })).toBeTruthy();
  });
});
