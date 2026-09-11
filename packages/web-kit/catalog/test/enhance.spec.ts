// enhance.spec.ts — the DSH-harness prompt-enhance door: route list,
// picker probes, harness enhance + agent enhance.
import { describe, it, afterEach, vi } from "vitest";
import assert from "node:assert/strict";

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));
vi.mock("../src/api.ts", () => ({
  apiFetch: apiFetchMock,
  externalUrl: (u: string) => u,
}));

import {
  agentEnhance,
  enhancePrompt,
  fetchEnhanceRoutes,
  isEmbedded,
  parsePickerAria,
  readPickerModel,
  resolvePickerRoute,
} from "../src/enhance.ts";

afterEach(() => {
  apiFetchMock.mockReset();
  delete (globalThis as Record<string, unknown>).window;
});

const res = (body: string, status = 200): Response => new Response(body, { status });
const json = (v: unknown, status = 200): Response =>
  new Response(JSON.stringify(v), { status });

describe("fetchEnhanceRoutes", () => {
  it("returns the live string routes", async () => {
    apiFetchMock.mockResolvedValue(json({ llmRoutes: ["p/a", "p/b"] }));
    assert.deepEqual(await fetchEnhanceRoutes(), ["p/a", "p/b"]);
  });

  it("filters non-string/empty entries and nulls an empty list", async () => {
    apiFetchMock.mockResolvedValue(json({ llmRoutes: ["p/a", 7, "", null] }));
    assert.deepEqual(await fetchEnhanceRoutes(), ["p/a"]);
    apiFetchMock.mockResolvedValue(json({ llmRoutes: [7, ""] }));
    assert.equal(await fetchEnhanceRoutes(), null);
  });

  it("returns null on unreachable host, HTTP error, bad JSON, or bad shape", async () => {
    apiFetchMock.mockRejectedValue(new Error("down"));
    assert.equal(await fetchEnhanceRoutes(), null);
    apiFetchMock.mockResolvedValue(res("nope", 500));
    assert.equal(await fetchEnhanceRoutes(), null);
    apiFetchMock.mockResolvedValue(res("<html>", 200));
    assert.equal(await fetchEnhanceRoutes(), null);
    apiFetchMock.mockResolvedValue(json({ llmRoutes: "p/a" }));
    assert.equal(await fetchEnhanceRoutes(), null);
    apiFetchMock.mockResolvedValue(json({}));
    assert.equal(await fetchEnhanceRoutes(), null);
  });
});

describe("isEmbedded", () => {
  it("is false standalone, true under a same-origin parent", () => {
    const g = globalThis as Record<string, unknown>;
    delete g.window;
    assert.equal(isEmbedded(), false); // no window at all -> catch
    const win: Record<string, unknown> = {};
    win.parent = win;
    g.window = win;
    assert.equal(isEmbedded(), false);
    g.window = { parent: {} };
    assert.equal(isEmbedded(), true);
  });

  it("is false when the parent probe throws (cross-origin)", () => {
    (globalThis as Record<string, unknown>).window = {};
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      get() {
        throw new Error("denied");
      },
    });
    try {
      assert.equal(isEmbedded(), false);
    } finally {
      delete (globalThis as Record<string, unknown>).window;
    }
  });
});

describe("parsePickerAria", () => {
  it("reads the current selection with or without a reasoning suffix", () => {
    assert.equal(
      parsePickerAria("Select model, current Muse Spark, reasoning effort high"),
      "Muse Spark",
    );
    assert.equal(parsePickerAria("Select model, current deepseek-chat"), "deepseek-chat");
  });

  it("returns null when the label carries no selection", () => {
    assert.equal(parsePickerAria("Select model"), null);
    assert.equal(parsePickerAria(""), null);
    assert.equal(parsePickerAria("Select model, current  "), null);
  });
});

type El = {
  textContent: string | null;
  rects: number;
  getClientRects(): { length: number };
};
const el = (textContent: string | null, visible = true): El => ({
  textContent,
  rects: visible ? 1 : 0,
  getClientRects() {
    return { length: this.rects };
  },
});

function fakeWindow(opts: {
  parent?: unknown;
  doc?: unknown;
  buttons?: Array<{ label: string | null }>;
  labels?: El[];
}): void {
  const buttons = (opts.buttons ?? []).map((b) => ({
    getAttribute: (_n: string) => b.label,
  }));
  const doc = opts.doc === undefined ? {
    querySelectorAll: (sel: string) =>
      sel === "button[aria-label]" ? buttons : ((opts.labels ?? []) as unknown[]),
  } : opts.doc;
  (globalThis as Record<string, unknown>).window = {
    ...(opts.parent === undefined ? {} : { parent: opts.parent }),
  };
  if (opts.parent !== undefined) {
    ((globalThis as Record<string, unknown>).window as Record<string, unknown>).parent = opts.parent;
  }
}

describe("readPickerModel", () => {
  it("returns null with no window, no parent, or a self parent", () => {
    assert.equal(readPickerModel(), null);
    fakeWindow({ parent: undefined });
    // window without a parent key: `!parent` -> null
    assert.equal(readPickerModel(), null);
    const win = (globalThis as Record<string, unknown>).window as Record<string, unknown>;
    win.parent = win;
    assert.equal(readPickerModel(), null);
  });

  it("returns null when the parent document is missing", () => {
    const win: Record<string, unknown> = {};
    win.parent = { document: null };
    (globalThis as Record<string, unknown>).window = win;
    assert.equal(readPickerModel(), null);
  });

  it("reads the aria-label selection first", () => {
    const self: Record<string, unknown> = {};
    const parent = {
      document: {
        querySelectorAll: (sel: string) =>
          sel === "button[aria-label]"
            ? [{ getAttribute: () => "open models" }, { getAttribute: () => "Select model, current GLM 4.7, reasoning effort low" }]
            : [],
      },
    };
    self.parent = parent;
    (globalThis as Record<string, unknown>).window = self;
    assert.equal(readPickerModel(), "GLM 4.7");
  });

  it("falls back to the last visible trigger label, or null", () => {
    const mk = (labels: El[]) => {
      const self: Record<string, unknown> = {};
      self.parent = {
        document: {
          querySelectorAll: (sel: string) =>
            sel === "button[aria-label]"
              ? [{ getAttribute: () => "nothing here" }, { getAttribute: () => null }]
              : (labels as unknown[]),
        },
      };
      (globalThis as Record<string, unknown>).window = self;
    };
    mk([el("  "), el("first", false), el("picked")]);
    assert.equal(readPickerModel(), "picked");
    mk([el(null), el("")]);
    assert.equal(readPickerModel(), null);
    mk([]);
    assert.equal(readPickerModel(), null);
  });

  it("returns null cross-origin", () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      get() {
        throw new Error("denied");
      },
    });
    try {
      assert.equal(readPickerModel(), null);
    } finally {
      delete (globalThis as Record<string, unknown>).window;
    }
  });
});

describe("resolvePickerRoute", () => {
  const routes = ["prov/muse-spark-1.3-contributor", "prov/deepseek-chat", "prov/deepseek-reasoner", "bare-model"];
  it("matches exact normalized model equality", () => {
    assert.equal(resolvePickerRoute(routes, "Muse Spark 1.3 Contributor"), "prov/muse-spark-1.3-contributor");
    assert.equal(resolvePickerRoute(routes, "bare-model"), "bare-model");
  });

  it("matches a unique prefix, never an ambiguous one", () => {
    assert.equal(resolvePickerRoute(routes, "Muse Spark"), "prov/muse-spark-1.3-contributor");
    assert.equal(resolvePickerRoute(routes, "deepseek"), null);
    assert.equal(resolvePickerRoute(routes, "nope"), null);
  });

  it("returns null for exact duplicates and empty wants", () => {
    assert.equal(resolvePickerRoute(["a/dup", "b/dup"], "dup"), null);
    assert.equal(resolvePickerRoute(routes, ""), null);
    assert.equal(resolvePickerRoute(routes, "!!!"), null);
  });
});

describe("enhancePrompt", () => {
  it("returns the harness answer with its via", async () => {
    apiFetchMock.mockResolvedValue(res(JSON.stringify({ positive: " p ", negative: " n ", via: "prov/m" })));
    const out = await enhancePrompt("sys", "a cat", "prov/m");
    assert.deepEqual(out, { positive: "p", negative: "n", via: "prov/m" });
    const body = JSON.parse(String(apiFetchMock.mock.calls[0]![1].body)) as Record<string, unknown>;
    assert.equal(body.llm, "prov/m");
    assert.ok(!("temperature" in body));
  });

  it("omits empty llm, defaults a missing via, tolerates missing negative", async () => {
    apiFetchMock.mockResolvedValue(res(JSON.stringify({ positive: "p" })));
    assert.deepEqual(await enhancePrompt("sys", "x", ""), { positive: "p", negative: "", via: "?" });
    apiFetchMock.mockResolvedValue(res(JSON.stringify({ positive: "p", via: "" })));
    assert.deepEqual((await enhancePrompt("sys", "x")), { positive: "p", negative: "", via: "?" });
  });

  it("surfaces the harness JSON error honestly", async () => {
    apiFetchMock.mockResolvedValue(res(JSON.stringify({ error: "bad prompt" }), 400));
    await assert.rejects(enhancePrompt("sys", "x"), /Enhancement failed \(400\): bad prompt/);
  });

  it("throws the honest standalone error when no harness answers", async () => {
    apiFetchMock.mockRejectedValue(new Error("down"));
    await assert.rejects(enhancePrompt("sys", "x"), /not answered here/);
    apiFetchMock.mockResolvedValue(res("<html>soft 404</html>", 200));
    await assert.rejects(enhancePrompt("sys", "x"), /not answered here/);
    apiFetchMock.mockResolvedValue(res(JSON.stringify({ nope: 1 }), 500));
    await assert.rejects(enhancePrompt("sys", "x"), /not answered here/);
    apiFetchMock.mockResolvedValue(res(JSON.stringify({ positive: "  " }), 200));
    await assert.rejects(enhancePrompt("sys", "x"), /not answered here/);
  });

  it("ignores non-string/empty error shapes and sends no temperature", async () => {
    // NOTE: mockImplementation receives (url, init) — read the second arg:
    apiFetchMock.mockImplementation(async (_u: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      assert.ok(!("temperature" in body));
      return res(JSON.stringify({ positive: "p", via: "v" }));
    });
    assert.equal((await enhancePrompt("sys", "x")).positive, "p");
    apiFetchMock.mockResolvedValue(res(JSON.stringify({ error: 7, positive: "p" })));
    assert.equal((await enhancePrompt("sys", "x")).positive, "p");
    apiFetchMock.mockResolvedValue(res(JSON.stringify({ error: "", positive: "p" })));
    assert.equal((await enhancePrompt("sys", "x")).positive, "p");
    apiFetchMock.mockResolvedValue(res(JSON.stringify({ negative: "n" })));
    await assert.rejects(enhancePrompt("sys", "x"), /not answered here/);
  });
});

describe("agentEnhance", () => {
  it("returns per-field results with coercions", async () => {
    apiFetchMock.mockResolvedValue(json({
      model: "m",
      results: {
        a: { positive: " p ", negative: " n ", via: "v" },
        b: { positive: "q" },
        c: { positive: "r", via: "" },
        d: null,
      },
    }));
    assert.deepEqual(await agentEnhance("m", "prompt", 0.5, "prov/m"), {
      a: { positive: "p", negative: "n", via: "v" },
      b: { positive: "q", negative: "", via: "?" },
      c: { positive: "r", negative: "", via: "?" },
      d: { positive: "", negative: "", via: "?" },
    });
    const body = JSON.parse(String(apiFetchMock.mock.calls[0]![1].body)) as Record<string, unknown>;
    assert.equal(body.temperature, 0.5);
    assert.equal(body.llm, "prov/m");
  });

  it("defaults missing results and omits unset temperature/llm", async () => {
    apiFetchMock.mockResolvedValue(json({}));
    assert.deepEqual(await agentEnhance("m", "p"), {});
    const body = JSON.parse(String(apiFetchMock.mock.calls[0]![1].body)) as Record<string, unknown>;
    assert.ok(!("temperature" in body));
    assert.ok(!("llm" in body));
    apiFetchMock.mockResolvedValue(json({ results: null }));
    assert.deepEqual(await agentEnhance("m", "p", undefined, ""), {});
  });

  it("throws with the JSON error, or the standalone line for HTML", async () => {
    apiFetchMock.mockResolvedValue(res(JSON.stringify({ error: "overloaded" }), 503));
    await assert.rejects(agentEnhance("m", "p"), /Agent Enhance failed \(503\): overloaded/);
    apiFetchMock.mockResolvedValue(res(JSON.stringify({ error: 7 }), 500));
    await assert.rejects(agentEnhance("m", "p"), /Agent Enhance failed \(500\): \{"error":7\}/);
    apiFetchMock.mockResolvedValue(res("<html>no door</html>", 404));
    await assert.rejects(agentEnhance("m", "p"), /runs inside the DeepSeek app/);
  });
});
