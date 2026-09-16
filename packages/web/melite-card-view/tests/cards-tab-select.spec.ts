// cards-tab-select.spec.ts — the select-normalization object-option
// arm (2026-09-16 burn-down, installment 3h-ii): the declared surface
// may spell options as {value} objects (not bare strings) — a legacy
// numeric matching one normalizes to its string, a stranger still
// rides verbatim. The doors harness, trimmed to the select path.
import { describe, expect, test, afterEach } from "vitest";
import { resetCardFamiliesCache } from "@melite-plugin/melite-run-wire";
import { runCardStage } from "../src/client/CardsTab.tsx";
import { schemaEnvelope } from "../src/client/spec-form.tsx";
import type { BenchStageRow } from "../src/client/cards-resource.ts";

function stage(over: Partial<BenchStageRow> & { id: string }): BenchStageRow {
  return { engine: "comfyui", ...over };
}

interface Call { method: string; args: Record<string, unknown> }
let calls: Call[] = [];
let routes: Record<string, (args: Record<string, unknown>, n: number) => { ok: boolean; value?: unknown; error?: string }> = {};
let seen: Record<string, number> = {};

function stubWire(): void {
  calls = [];
  seen = {};
  routes = {};
  (globalThis as Record<string, unknown>)["fetch"] = async (url: unknown, init?: { body?: unknown }): Promise<unknown> => {
    if (String(url) === "/v1/model-catalog") {
      return { ok: true, json: async () => ({ cards: { "img-to-mesh": { families: ["trellis2-native"] } } }) };
    }
    if (String(url).startsWith("/v1/form-spec")) {
      return { ok: true, json: async () => ({ form: "img-to-mesh", schema: schemaEnvelope({
        input_image: { type: "string", meta: { description: "Source image", extra: { wtype: "image" } } },
        resolution: {
          type: "string",
          meta: {
            description: "Resolution",
            extra: {
              wtype: "select",
              options: [{ value: "512", label: "512p" }, { value: "1024", label: "1024p" }],
            },
          },
        },
      }) }) };
    }
    const frame = JSON.parse(String(init?.body)) as { rpcId: string; method: string; payload: { args: Record<string, unknown> } };
    calls.push({ method: frame.method, args: frame.payload.args });
    const n = (seen[frame.method] ?? 0) + 1;
    seen[frame.method] = n;
    const route = routes[frame.method];
    const out = route !== undefined
      ? route(frame.payload.args, n)
      : { ok: false as const, error: "unstubbed " + frame.method };
    return {
      ok: true,
      json: async () => ({
        type: "server-response",
        rpcId: frame.rpcId,
        result: out.ok ? { ok: true, value: out.value } : { ok: false, error: { message: out.error } },
      }),
    };
  };
}

const realFetch = globalThis.fetch;
afterEach(() => {
  (globalThis as Record<string, unknown>)["fetch"] = realFetch;
  resetCardFamiliesCache();
});

function startDoc(): Record<string, unknown> {
  return (calls.find((c) => c.method === "runs/start")?.args["doc"] ?? {}) as Record<string, unknown>;
}

describe("runCardStage — object spelled select options", () => {
  test("a numeric matching an object option normalizes to its string", async () => {
    stubWire();
    resetCardFamiliesCache();
    routes["runs/start"] = () => ({ ok: true, value: { run_id: "run-9", status: "queued", queue_position: 0 } });
    await runCardStage("bench-main", stage({
      id: "s_1", card: "img-to-mesh", params: { input_image: "x.png", resolution: 1024 },
    }));
    expect(startDoc()["resolution"]).toBe("1024");
  });

  test("a numeric outside object options rides verbatim", async () => {
    stubWire();
    resetCardFamiliesCache();
    routes["runs/start"] = () => ({ ok: true, value: { run_id: "run-9", status: "queued", queue_position: 0 } });
    await runCardStage("bench-main", stage({
      id: "s_1", card: "img-to-mesh", params: { input_image: "x.png", resolution: 999 },
    }));
    expect(startDoc()["resolution"]).toBe(999);
  });
});
