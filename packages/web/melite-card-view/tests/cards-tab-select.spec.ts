// cards-tab-select.spec.ts — the select-normalization object-option
// arm (2026-09-16 burn-down, installment 3h-ii): the declared surface
// may spell options as {value} objects (not bare strings) — a legacy
// numeric matching one normalizes to its string, a stranger still
// rides verbatim. The doors harness, trimmed to the select path.
import { describe, expect, test, afterEach, vi } from "vitest";
import { resetCardFamiliesCache } from "@melite-plugin/melite-run-wire";
import { runCardStage } from "../src/client/CardsTab.tsx";
import { schemaEnvelope } from "../src/client/spec-form.tsx";
import type { BenchStageRow } from "../src/client/cards-resource.ts";
import { mountEstateFakes } from "./estate-harness.ts";
import { unbindEstateRemote } from "@melite/card-base/estate-remote";

function stage(over: Partial<BenchStageRow> & { id: string }): BenchStageRow {
  return { engine: "comfyui", ...over };
}

interface Call { method: string; args: Record<string, unknown> }
let calls: Call[] = [];
let fakes: { calls: Call[]; unmount: () => void } | null = null;

function stubWire(): void {
  calls = [];
  fakes?.unmount();
  const estate = mountEstateFakes();
  fakes = estate;
  calls = estate.calls;
  resetCardFamiliesCache();
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    const path = String(url);
    if (path === "/v1/model-catalog") {
      return new Response(JSON.stringify({ cards: { "img-to-mesh": { families: ["trellis2-native"] } } }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    if (path.startsWith("/v1/form-spec")) {
      return new Response(JSON.stringify({ form: "img-to-mesh", schema: schemaEnvelope({
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
      }) }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    throw new Error("estate door on the fetch lane: " + path);
  });
}

afterEach(() => {
  fakes?.unmount();
  fakes = null;
  unbindEstateRemote();
  vi.unstubAllGlobals();
  resetCardFamiliesCache();
});

function startDoc(): Record<string, unknown> {
  return (calls.find((c) => c.method === "runs/start")?.args["doc"] ?? {}) as Record<string, unknown>;
}

describe("runCardStage — object spelled select options", () => {
  test("a numeric matching an object option normalizes to its string", async () => {
    stubWire();
    await runCardStage("bench-main", stage({
      id: "s_1", card: "img-to-mesh", params: { input_image: "x.png", resolution: 1024 },
    }));
    expect(startDoc()["resolution"]).toBe("1024");
  });

  test("a numeric outside object options rides verbatim", async () => {
    stubWire();
    await runCardStage("bench-main", stage({
      id: "s_1", card: "img-to-mesh", params: { input_image: "x.png", resolution: 999 },
    }));
    expect(startDoc()["resolution"]).toBe(999);
  });
});
