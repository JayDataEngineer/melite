// @vitest-environment happy-dom
// coverage-gap-arms.spec.tsx — ADD-ONLY arms raising the measured
// per-file coverage of src/client/stage-drill.tsx back above its
// seated floors (statements 99.68). Never touches src/ or existing
// arms. Every arm asserts behavior — a real value, a real face —
// never a bare call.
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import assert from "node:assert/strict";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { mountEstateFakes, type EstateFakesOptions } from "./estate-harness.ts";
import { unbindEstateRemote, schemaEnvelope } from "@melite/card-base/client";
import { resetStageWrites, stageWriteState } from "../src/client/draft.ts";
import { StageDrill } from "../src/client/stage-drill.tsx";
import type { StageViewOwnerProps } from "../src/client/types.ts";
import { chromeCopy } from "../src/chromeCopy.ts";
import type { BenchStageView, CardsBenchValue } from "../src/client/cards-resource.ts";
import { draftIdOf } from "@melite/contracts/benchStage";

afterEach(() => {
  cleanup();
  unbindEstateRemote();
  resetStageWrites();
  vi.unstubAllGlobals();
});

const stage = (params: Record<string, unknown>): BenchStageView =>
  ({ id: "s_0", card: "image-gen", engine: "comfyui", params }) as never as BenchStageView;

function callsOf(calls: Array<{ method: string; args: unknown }>): Array<Record<string, unknown>> {
  return (calls as unknown as Array<{ method: string; args: Record<string, unknown> }>)
    .filter((c) => c.method === "drafts/patch")
    .map((c) => c.args);
}

function patchParamsOf(patchCalls: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return patchCalls.map((c) => ((c["patch"] as Record<string, unknown>)?.["params"] ?? {}) as Record<string, unknown>);
}

describe("stage-drill coverage-gap arms (the gate's honest seats)", () => {
  test("580:36 THE RESCOPE'S VERDICT (the continue seat): a departed schema knob the arrival never declares dies via the rescope — the drill loop skips its own delete, the flush still nulls the bench key", async () => {
    // Departing declares double_reference in BOTH surfaces (schema face
    // + params surface); the arrival declares it in NEITHER. The
    // rescope (modelSwitchPatch's departed-surface null) therefore
    // carries the verdict, and the drill's drop loop SKIPS its own
    // delete (580 continue) — the seed consumes the null mark and the
    // run flush nulls the bench key all the same.
    const FROM = "fam-a";
    const TO = "fam-b";
    const fromDoc: Record<string, unknown> = {
      form: "image-gen", genre: "image", engine: "comfyui", model: FROM,
      schema: schemaEnvelope({
        prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
        model: { consts: [FROM, TO], meta: { description: "Serving family", default: FROM, extra: { wtype: "select" } } },
        double_reference: { type: "boolean", meta: { description: "Double reference", default: false } },
      }),
      variants: [{ id: "v", label: "V", group: "Variant", defaults: { model: FROM }, route: FROM }],
      params: ["prompt", "model", "double_reference"],
      families: [{ id: FROM, present: true }, { id: TO, present: true }],
    };
    const toDoc: Record<string, unknown> = {
      form: "image-gen", genre: "image", engine: "comfyui", model: TO,
      schema: schemaEnvelope({
        prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
        model: { consts: [FROM, TO], meta: { description: "Serving family", default: TO, extra: { wtype: "select" } } },
      }),
      variants: [{ id: "v", label: "V", group: "Variant", defaults: { model: TO }, route: TO }],
      params: ["prompt", "model"],
      families: [{ id: FROM, present: true }, { id: TO, present: true }],
    };
    const servedByModel: Record<string, Record<string, unknown>> = { [FROM]: fromDoc, [TO]: toDoc };
    vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
      const path = String(url);
      if (path.includes("/v1/form-spec")) {
        const key = path.split("model=")[1] ?? "";
        const doc = servedByModel[key] ?? servedByModel[FROM]!;
        return new Response(JSON.stringify(doc), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (path.includes("/v1/forms")) {
        return new Response(JSON.stringify({ "image-gen": { outputs: { default: "image" } } }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (path.includes("/v1/model-catalog")) {
        return new Response(JSON.stringify({ cards: {} }), { status: 200, headers: { "content-type": "application/json" } });
      }
      throw new Error("unexpected door on the fetch lane: " + path);
    });
    const fakes = mountEstateFakes({});
    const stageA = stage({ model: FROM, double_reference: true, prompt: "keep me" });
    let runs = 0;
    let bound: () => void = () => { throw new Error("bindRun never fired"); };
    render(h(StageDrill, {
      stage: stageA,
      bench: { kind: "bench", draftId: draftIdOf("bench-p"), rev: 1, log: [], stages: [stageA], sessionKey: "main" },
      running: false,
      onRun: () => { runs += 1; }, onStop: () => {}, onClose: () => {}, onRemoved: () => {},
      onPatchParams: () => {},
      renderStageView: (_o: StageViewOwnerProps, fallback: ReturnType<typeof h>) => fallback,
      bindRun: (r: () => void) => { bound = r; },
    } as never));
    await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    const knob = await screen.findByLabelText("Serving family", {}, { timeout: 4000 });
    fireEvent.click(knob);
    fireEvent.click(screen.getByRole("menuitem", { name: "Fam B" }));
    await waitFor(() => {
      const frame = patchParamsOf(callsOf(fakes.calls as never)).find((p) => p["model"] === TO);
      if (frame === undefined) throw new Error("re-point write not landed");
    }, { timeout: 8000 });
    await waitFor(() => {
      if (stageWriteState(draftIdOf("bench-p"), "s_0").pending !== 0) throw new Error("write still in flight");
    }, { timeout: 8000 });
    // THE FLUSH: the seed consumed the rescope's null verdict — the
    // departed knob nulls on the bench, the shared word never does,
    // and the start fires clean.
    bound();
    await waitFor(() => {
      const sync = patchParamsOf(callsOf(fakes.calls as never)).find((p) => "double_reference" in p);
      if (sync === undefined) throw new Error("run-flush null not landed");
      assert.equal(sync["double_reference"], null, "the departed knob nulls at the flush (the rescope's verdict, not the loop's delete)");
      assert.ok(!("prompt" in sync), "the shared word never rides the null set");
    }, { timeout: 8000 });
    expect(runs).toBe(1);
  });

  test("2038:64 THE CARD-LESS REFUSAL (the ?? '' seat): an engine-only stage under a declared-but-missing studio names the empty card and the plugin", async () => {
    vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
      const path = String(url);
      if (path.includes("/v1/form-spec")) {
        return new Response(JSON.stringify({
          form: "input-prep", genre: "image", engine: "comfyui",
          stage_view: "@melite/image-input-prep",
          schema: schemaEnvelope({
            prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
          }),
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (path.includes("/v1/forms")) {
        return new Response(JSON.stringify({}), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (path.includes("/v1/model-catalog")) {
        return new Response(JSON.stringify({ cards: {} }), { status: 200, headers: { "content-type": "application/json" } });
      }
      throw new Error("estate door on the fetch lane: " + path);
    });
    // THE CARD-LESS ROW: no card key at all — the family resolves from
    // the engine id, the spec still declares its studio, the slot still
    // misses, and the refusal voices the EMPTY card seat.
    const cardless = { id: "s_0", engine: "comfyui", params: { prompt: "x" }, runStatus: "" } as never as BenchStageView;
    const bench: CardsBenchValue = { kind: "bench", draftId: draftIdOf("bench-p"), sessionKey: "p", rev: 1, log: [], stages: [cardless] };
    mountEstateFakes({
      benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: [cardless as unknown as Record<string, unknown>] },
      draftStages: [cardless as unknown as Record<string, unknown>],
      draftBenchRev: 1,
    });
    const { container } = render(h(StageDrill, {
      stage: cardless, bench, running: false,
      onRun: () => {}, onStop: () => {}, onClose: () => {}, onRemoved: () => {},
      onPatchParams: () => {},
      renderStageView: (_owner, fallback) => h("div", null, fallback),
    }));
    await waitFor(() => {
      assert.ok(container.querySelector('[data-testid="stage-view-load-refusal"]') !== null, "the card-less miss must voice the load refusal");
    });
    const words = container.querySelector('[data-testid="stage-view-load-refusal"]')?.textContent ?? "";
    assert.ok(words.includes("@melite/image-input-prep"), "the refusal names the unmounted plugin");
    assert.ok(
      words.includes(chromeCopy.stageViewRefusal({ card: "", plugin: "@melite/image-input-prep" })),
      "the empty-card refusal rides the dictionary's own voice (the ?? '' seat)",
    );
  });

  test("1764b THE PERCENT FACE (the below-ceiling seat): a live row below its ceiling says percent, never finishing", async () => {
    vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
      const path = String(url);
      if (path.includes("/v1/form-spec")) {
        return new Response(JSON.stringify({
          form: "image-gen", genre: "image", engine: "comfyui",
          schema: schemaEnvelope({
            prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
          }),
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (path.includes("/v1/forms")) {
        return new Response(JSON.stringify({}), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (path.includes("/v1/model-catalog")) {
        return new Response(JSON.stringify({ cards: {} }), { status: 200, headers: { "content-type": "application/json" } });
      }
      throw new Error("estate door on the fetch lane: " + path);
    });
    const running = {
      id: "s_0", card: "image-gen", engine: "comfyui",
      params: { prompt: "x" }, runStatus: "running",
      progress: { value: 7, max: 20 }, activity: "sampling 7/20",
    } as never as BenchStageView;
    const bench: CardsBenchValue = { kind: "bench", draftId: draftIdOf("bench-p"), sessionKey: "p", rev: 1, log: [], stages: [running] };
    mountEstateFakes({
      benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: [running as unknown as Record<string, unknown>] },
      draftStages: [running as unknown as Record<string, unknown>],
      draftBenchRev: 1,
    });
    render(h(StageDrill, {
      stage: running, bench, running: true,
      onRun: () => {}, onStop: () => {}, onClose: () => {}, onRemoved: () => {},
      onPatchParams: () => {},
      renderStageView: (_o, fallback) => fallback,
    }));
    const prog = await screen.findByTestId("drill-progress", {}, { timeout: 8000 });
    assert.ok(prog.textContent?.includes("35%"), "the below-ceiling live row says its percent");
    assert.ok(!prog.textContent?.includes("finishing"), "never the ceiling voice below the ceiling");
  });

  test("1764:11 THE FINISHING FACE (the ceiling seat): a live row at its ceiling says finishing, never a percent", async () => {
    vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
      const path = String(url);
      if (path.includes("/v1/form-spec")) {
        return new Response(JSON.stringify({
          form: "image-gen", genre: "image", engine: "comfyui",
          schema: schemaEnvelope({
            prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
          }),
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (path.includes("/v1/forms")) {
        return new Response(JSON.stringify({}), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (path.includes("/v1/model-catalog")) {
        return new Response(JSON.stringify({ cards: {} }), { status: 200, headers: { "content-type": "application/json" } });
      }
      throw new Error("estate door on the fetch lane: " + path);
    });
    const running = {
      id: "s_0", card: "image-gen", engine: "comfyui",
      params: { prompt: "x" }, runStatus: "running",
      progress: { value: 20, max: 20 }, activity: "waiting on engine",
    } as never as BenchStageView;
    const bench: CardsBenchValue = { kind: "bench", draftId: draftIdOf("bench-p"), sessionKey: "p", rev: 1, log: [], stages: [running] };
    mountEstateFakes({
      benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: [running as unknown as Record<string, unknown>] },
      draftStages: [running as unknown as Record<string, unknown>],
      draftBenchRev: 1,
    });
    render(h(StageDrill, {
      stage: running, bench, running: true,
      onRun: () => {}, onStop: () => {}, onClose: () => {}, onRemoved: () => {},
      onPatchParams: () => {},
      renderStageView: (_o, fallback) => fallback,
    }));
    const prog = await screen.findByTestId("drill-progress", {}, { timeout: 8000 });
    assert.ok(prog.textContent?.includes("finishing"), "the ceilinged live row says finishing");
    assert.ok(!prog.textContent?.includes("100%"), "never a run-wide 100% on a live row");
  });
});
