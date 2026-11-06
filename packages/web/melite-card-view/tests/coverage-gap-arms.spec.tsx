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
import { chromeCopy as baseChrome } from "../../card-base/src/locales/chromeCopy.ts";
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

// ── THE DRILL'S LORA WIRE (the hand-upload seam the drill itself
// wires, 2026-11-15): the host transport rides the SERVED spec's own
// family, the refresh is stale-while-revalidate through the drill's
// own setSpec, and a refresh that loses the seq fence never lands
// the departed family's doc. Each arm rides the REAL leaf (add
// square → LoRAs leaf → Add LoRA… → pane → Apply), never a synthetic
// poke at the wire object. ──

const LORA_KIND = {
  kind: "lora", label: "LoRAs", param_key: "loras", cardinality: "list",
  entry: "option", option_key: "id",
  options: [{ value: "seeded-row", label: "Seeded" }],
};

function drillMount(stageParams: Record<string, unknown>, capture?: { bound: () => void }): void {
  const s = stage(stageParams);
  render(h(StageDrill, {
    stage: s,
    bench: { kind: "bench", draftId: draftIdOf("bench-p"), rev: 1, log: [], stages: [s], sessionKey: "main" },
    running: false,
    onRun: () => {}, onStop: () => {}, onClose: () => {}, onRemoved: () => {},
    onPatchParams: () => {},
    bindRun: capture === undefined ? undefined : (r: () => void) => { capture.bound = r; },
    renderStageView: (_o: StageViewOwnerProps, fallback: ReturnType<typeof h>) => fallback,
  } as never));
}

async function driveUploadPane(): Promise<void> {
  await screen.findByLabelText("Prompt", {}, { timeout: 8000 });
  fireEvent.click(document.querySelector('[data-subcard-add="mod"]') as HTMLElement);
  fireEvent.click(screen.getByRole("menuitem", { name: "LoRAs" }));
  fireEvent.click(screen.getByRole("button", { name: baseChrome.loraAddButton }));
  const row = document.querySelector('[data-testid="mod-lora-upload"]');
  assert.ok(row, "the upload pane renders the square");
  const inp = row!.querySelector('input[type="file"]');
  assert.ok(inp instanceof HTMLInputElement, "the hidden file input rides the square");
  Object.defineProperty(inp, "files", { value: [new File(["%MEL"], "op-pick.safetensors")], configurable: true });
  fireEvent.change(inp);
  fireEvent.click(screen.getByRole("button", { name: baseChrome.loraApplyButton }));
}

test("THE DRILL'S LORA WIRE: Apply POSTs the served spec's own family shelf and the refresh re-serves through the drill's setSpec", async () => {
  const loraUrls: string[] = [];
  const specUrls: string[] = [];
  const DOC_A = {
    form: "image-gen", genre: "image", engine: "comfyui", model: "fam-lora",
    schema: schemaEnvelope({
      prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
    }),
    features: { modifiers: [LORA_KIND] },
  };
  // the REFRESHED serve declares one more knob — its label appears
  // only if the refresh landed through the drill's own setSpec
  const DOC_R = {
    ...DOC_A,
    schema: schemaEnvelope({
      prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
      prompt_two: { type: "string", meta: { description: "Prompt Two" } },
    }),
    features: { modifiers: [LORA_KIND] },
  };
  vi.stubGlobal("fetch", (input: unknown): Promise<Response> => {
    const path = String(input);
    if (path.includes("/v1/uploads/lora")) {
      loraUrls.push(path);
      return Promise.resolve(new Response(
        JSON.stringify({ row: { id: "lora/op-pick.safetensors", default_strength: 0.8 }, row_seated: true }),
        { headers: { "content-type": "application/json" } },
      ));
    }
    if (path.includes("/v1/form-spec")) {
      specUrls.push(path);
      return Promise.resolve(new Response(JSON.stringify(specUrls.length === 1 ? DOC_A : DOC_R), {
        status: 200, headers: { "content-type": "application/json" },
      }));
    }
    if (path.includes("/v1/forms")) {
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200, headers: { "content-type": "application/json" } }));
    }
    if (path.includes("/v1/model-catalog")) {
      return Promise.resolve(new Response(JSON.stringify({ cards: {} }), { status: 200, headers: { "content-type": "application/json" } }));
    }
    return Promise.reject(new Error("unexpected door on the fetch lane: " + path));
  });
  mountEstateFakes({});
  drillMount({ model: "fam-lora", prompt: "seed" });
  await driveUploadPane();
  await waitFor(() => assert.equal(loraUrls.length, 1, "the upload POST rode the drill's own transport"));
  assert.match(loraUrls[0]!, /families=fam-lora/, "the family shelf rides the SERVED spec's own model");
  assert.match(loraUrls[0]!, /filename=op-pick\.safetensors/);
  // THE STALE-WHILE-REVALIDATE: the refresh re-fetched the SAME
  // family after the seat, and the swapped doc serves in-session
  await waitFor(() => assert.equal(specUrls.length, 2, "the refresh re-fetched the served spec"));
  assert.match(specUrls[1]!, /model=fam-lora/, "the refresh re-keys off the standing doc's own family");
  await waitFor(() => {
    assert.ok(screen.getByLabelText("Prompt Two"), "the refreshed serve paints through the drill's setSpec");
  });
  assert.equal(document.querySelector('[data-leaf-pane="upload"]'), null, "the pick face re-opened after the seat");
});

test("THE DRILL'S SEQ FENCE: a refresh settling inside a re-key's commit window never lands the departed family's doc", async () => {
  const loraUrls: string[] = [];
  const FROM = "fam-a";
  const TO = "fam-b";
  const kindDoc = (): Record<string, unknown> => ({
    form: "image-gen", genre: "image", engine: "comfyui",
    schema: schemaEnvelope({
      prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
      model: { consts: [FROM, TO], meta: { description: "Serving family", default: FROM, extra: { wtype: "select" } } },
    }),
    variants: [{ id: "v", label: "V", group: "Variant", defaults: {}, route: FROM }],
    params: ["prompt", "model"],
    families: [{ id: FROM, present: true }, { id: TO, present: true }],
    features: { modifiers: [LORA_KIND] },
  });
  const docA = { ...kindDoc(), model: FROM };
  // the parked refresh answers the DEPARTED family with a marker
  // knob — its label is the landed-stale proof the fence must kill
  const docStale = {
    ...docA,
    schema: schemaEnvelope({
      prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
      model: { consts: [FROM, TO], meta: { description: "Serving family", default: FROM, extra: { wtype: "select" } } },
      stale_marker: { type: "string", meta: { description: "Stale Marker" } },
    }),
    features: { modifiers: [LORA_KIND] },
  };
  const docB = {
    ...kindDoc(),
    model: TO,
    schema: schemaEnvelope({
      prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
      model: { consts: [FROM, TO], meta: { description: "Serving family", default: TO, extra: { wtype: "select" } } },
      fresh_marker: { type: "string", meta: { description: "Marker B" } },
    }),
  };
  let releaseStale: (() => void) | null = null;
  let specCalls = 0;
  vi.stubGlobal("fetch", (input: unknown): Promise<Response> => {
    const path = String(input);
    if (path.includes("/v1/uploads/lora")) {
      loraUrls.push(path);
      return Promise.resolve(new Response(
        JSON.stringify({ row: { id: "lora/x.safetensors" }, row_seated: true }),
        { headers: { "content-type": "application/json" } },
      ));
    }
    if (path.includes("/v1/form-spec")) {
      specCalls += 1;
      // call 1: fam-a arrival; call 2: the refresh — PARKED; call 3+: fam-b arrival
      if (specCalls === 2) {
        return new Promise<Response>((resolve) => {
          releaseStale = () => resolve(new Response(JSON.stringify(docStale), { status: 200, headers: { "content-type": "application/json" } }));
        });
      }
      const doc = path.includes("model=fam-b") ? docB : docA;
      return Promise.resolve(new Response(JSON.stringify(doc), { status: 200, headers: { "content-type": "application/json" } }));
    }
    if (path.includes("/v1/forms")) {
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200, headers: { "content-type": "application/json" } }));
    }
    if (path.includes("/v1/model-catalog")) {
      return Promise.resolve(new Response(JSON.stringify({ cards: {} }), { status: 200, headers: { "content-type": "application/json" } }));
    }
    return Promise.reject(new Error("unexpected door on the fetch lane: " + path));
  });
  mountEstateFakes({});
  drillMount({ model: FROM, prompt: "seed" });
  await driveUploadPane();
  await waitFor(() => assert.equal(loraUrls.length, 1, "the upload rode the door"));
  await waitFor(() => assert.ok(releaseStale !== null, "the refresh flight is parked"));
  // the leaf closes; the operator re-keys the family while the
  // refresh is still owed
  fireEvent.click(screen.getByRole("button", { name: baseChrome.leafCloseLabel }));
  const knob = await screen.findByLabelText("Serving family", {}, { timeout: 8000 });
  fireEvent.click(knob);
  fireEvent.click(screen.getByRole("menuitem", { name: "Fam B" }));
  // fam-b's arrival lands; the refresh is still parked
  await waitFor(() => {
    assert.ok(screen.queryByLabelText("Marker B"), "the re-keyed family's doc serves");
  });
  releaseStale!();
  await waitFor(() => {
    assert.equal(screen.queryByLabelText("Stale Marker"), null, "the departed family's refresh never lands");
  });
  assert.ok(screen.queryByLabelText("Marker B"), "the re-keyed doc still holds the face");
});

test("THE DRILL'S ARRIVAL NEVER PAINTS AFTER THE GESTURE DIES: an unmount inside the arrival window orphans the answer (the alive guard)", async () => {
  let releaseArrival: (() => void) | null = null;
  vi.stubGlobal("fetch", (input: unknown): Promise<Response> => {
    const path = String(input);
    if (path.includes("/v1/form-spec")) {
      return new Promise<Response>((resolve) => {
        releaseArrival = () => resolve(new Response(JSON.stringify({
          form: "image-gen", genre: "image", engine: "comfyui", model: "fam-late",
          schema: schemaEnvelope({ prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } } }),
        }), { status: 200, headers: { "content-type": "application/json" } }));
      });
    }
    if (path.includes("/v1/forms")) {
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200, headers: { "content-type": "application/json" } }));
    }
    if (path.includes("/v1/model-catalog")) {
      return Promise.resolve(new Response(JSON.stringify({ cards: {} }), { status: 200, headers: { "content-type": "application/json" } }));
    }
    return Promise.reject(new Error("unexpected door on the fetch lane: " + path));
  });
  mountEstateFakes({});
  drillMount({ model: "fam-late", prompt: "seed" });
  // the gesture dies while the arrival is still owed
  cleanup();
  releaseArrival!();
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(screen.queryByLabelText("Prompt"), null, "the orphaned arrival paints nothing");
});

test("THE DRILL'S ARRIVAL FENCE: a refresh claimed inside an open arrival window keeps the fence — the landing arrival never clears the newer claim (the seq fence, arrival half)", async () => {
  const FROM = "fam-a";
  const TO = "fam-b";
  const docFor = (model: string, marker: string): Record<string, unknown> => ({
    form: "image-gen", genre: "image", engine: "comfyui", model,
    schema: schemaEnvelope({
      prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
      model: { consts: [FROM, TO], meta: { description: "Serving family", default: model, extra: { wtype: "select" } } },
      marker: { type: "string", meta: { description: marker } },
    }),
    variants: [{ id: "v", label: "V", group: "Variant", defaults: {}, route: model }],
    params: ["prompt", "model"],
    families: [{ id: FROM, present: true }, { id: TO, present: true }],
    features: { modifiers: [LORA_KIND] },
  });
  const releaseArrival = { fire: (): void => { throw new Error("fam-b's arrival never parked"); } };
  const releaseLora = { fire: (): void => { throw new Error("the LoRA POST never parked"); } };
  const releaseRefresh = { fire: (): void => { throw new Error("the refresh never parked"); } };
  let calls = 0;
  const loraUrls: string[] = [];
  vi.stubGlobal("fetch", (input: unknown): Promise<Response> => {
    const path = String(input);
    if (path.includes("/v1/uploads/lora")) {
      loraUrls.push(path);
      return new Promise<Response>((resolve) => {
        releaseLora.fire = () => resolve(new Response(
          JSON.stringify({ row: { id: "lora/x.safetensors" }, row_seated: true }),
          { headers: { "content-type": "application/json" } },
        ));
      });
    }
    if (path.includes("/v1/form-spec")) {
      calls += 1;
      // call 1: fam-a's arrival (lands); call 2: fam-b's arrival after
      // the re-key (PARKED); call 3: the departed family's refresh
      // from the still-open leaf's seat (PARKED)
      if (calls >= 2) {
        const doc = calls === 2 ? docFor(TO, "Marker B") : docFor(FROM, "Marker A");
        const slot = calls === 2 ? releaseArrival : releaseRefresh;
        return new Promise<Response>((resolve) => {
          slot.fire = () => resolve(new Response(JSON.stringify(doc), { status: 200, headers: { "content-type": "application/json" } }));
        });
      }
      return Promise.resolve(new Response(JSON.stringify(docFor(FROM, "Marker A")), { status: 200, headers: { "content-type": "application/json" } }));
    }
    if (path.includes("/v1/forms")) {
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200, headers: { "content-type": "application/json" } }));
    }
    if (path.includes("/v1/model-catalog")) {
      return Promise.resolve(new Response(JSON.stringify({ cards: {} }), { status: 200, headers: { "content-type": "application/json" } }));
    }
    return Promise.reject(new Error("unexpected door on the fetch lane: " + path));
  });
  mountEstateFakes({});
  const run = { bound: (): void => { throw new Error("the drill never bound the host's run verb"); } };
  drillMount({ model: FROM, prompt: "seed" }, run);
  await screen.findByLabelText("Marker A", {}, { timeout: 8000 });
  // the mod leaf opens against the standing doc; the upload parks
  // mid-flight BEFORE any re-key exists yet
  fireEvent.click(document.querySelector('[data-subcard-add="mod"]') as HTMLElement);
  fireEvent.click(screen.getByRole("menuitem", { name: "LoRAs" }));
  fireEvent.click(screen.getByRole("button", { name: baseChrome.loraAddButton }));
  const row = document.querySelector('[data-testid="mod-lora-upload"]');
  assert.ok(row, "the upload pane renders the square");
  const inp = row!.querySelector('input[type="file"]');
  assert.ok(inp instanceof HTMLInputElement, "the hidden file input rides the square");
  Object.defineProperty(inp, "files", { value: [new File(["%MEL"], "x.safetensors")], configurable: true });
  fireEvent.change(inp);
  fireEvent.click(screen.getByRole("button", { name: baseChrome.loraApplyButton }));
  await waitFor(() => assert.equal(loraUrls.length, 1, "the upload POST rode the door"));
  // THE RE-KEY VIA THE KNOB (the only arm that moves the model key):
  // fam-b's arrival parks while the leaf still holds the parked
  // upload — the commit window is OPEN, fam-a's doc still renders
  const knob = await screen.findByLabelText("Serving family", {}, { timeout: 8000 });
  fireEvent.click(knob);
  fireEvent.click(screen.getByRole("menuitem", { name: "Fam B" }));
  await waitFor(() => assert.equal(calls, 2, "the re-keyed family's arrival parked inside the window"));
  // Seating the upload invokes the leaf's refresh — it parks and
  // OVERWRITES the pending row with its own newer seq (the departure
  // race, 2026-11-15)
  releaseLora.fire();
  await waitFor(() => assert.equal(calls, 3, "the refresh keyed the standing doc's own family inside the window"));
  // A RUN INSIDE THE WINDOW fences on the refresh's claim — the press
  // stands down naming the family the answer is owed for
  run.bound();
  await waitFor(() => {
    assert.match(stripText() ?? "", /the fam-a spec is still settling/, "the run fences on the refresh's newer claim");
  });
  // the PARKED ARRIVAL lands last: the fence branch must NOT clear
  // the refresh's newer claim (the missed half), and fam-b still paints
  releaseArrival.fire();
  await waitFor(() => {
    assert.ok(screen.queryByLabelText("Marker B"), "the re-keyed family's doc lands");
  });
  // the arrival retires the ERROR FACE (error-is-not-a-latch) but the
  // pending CLAIM must survive its landing — a fresh press re-voices
  // the fence naming the family the refresh's answer is still owed for
  assert.doesNotMatch(stripText() ?? "", /still settling/, "the arrival retires the face, never the claim");
  run.bound();
  await waitFor(() => {
    assert.match(stripText() ?? "", /the fam-a spec is still settling/, "the landing arrival never cleared the newer claim — the fence re-voices it");
  });
  // the refresh settles; its own finally clears the claim and the
  // press runs clean — no latch, the fence stands down at the settle
  releaseRefresh.fire();
  await new Promise((r) => setTimeout(r, 30));
  run.bound();
  await waitFor(() => {
    assert.equal((stripText() ?? "").includes("still settling"), false, "the fence stands down once the refresh answers");
  }, { timeout: 8000 });
});


function stripText(): string | null {
  return document.querySelector('[data-testid="stage-error-strip"]')?.textContent ?? null;
}
