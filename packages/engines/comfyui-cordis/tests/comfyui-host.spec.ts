// comfyui-host.spec.ts — the host service's lifecycle arms (TEST-2
// breadth): the Config-triple pin resolution, repoint's three laws
// (unresolved swap, resolved no-op, resolved change drops the
// supervisor), the supervisor contract (fail-fast when down,
// liveness on success, noteFailure only on transport-dead), the
// no-supervisor wiring refusal, resetForTests, the plugin faces'
// delegation, and needComfyUI's miswire voice. Seams mocked:
// transport (sdkClient + resolveEngineBaseUrl via config) and the
// execute inners.
import { describe, it, expect, vi } from "vitest";

vi.mock("../src/comfyui-transport.ts", () => ({
  sdkClient: () => ({
    getSystemStats: async () => ({}),
    interrupt: async () => {},
    deleteItem: async () => {},
    free: async () => {},
  }),
}));
vi.mock("../src/comfyui-config.ts", () => ({
  resolveEngineBaseUrl: () => "http://env-file:8188",
}));
vi.mock("../src/comfyui-execute.ts", () => ({
  executeSingleInner: async () => ({ outputs: {}, artifacts: [], promptId: "p-host" }),
  executeSingle: async () => ({ outputs: {}, artifacts: [], promptId: "p-host" }),
}));
vi.mock("../src/comfyui-merge.ts", () => ({
  executeFlowInner: async () => ({ stages: {}, promptId: "p-flow" }),
  planMerge: () => ({ workflow: {} }),
}));
vi.mock("../src/comfyui-control.ts", () => ({
  stopForRunDirInner: async () => {},
  unloadModelsInner: async () => {},
}));

import { Context } from "@deepseek-ai/cordis";
import { SettingsProvider } from "@deepseek-ai/dsh-settings";
import type { SettingsUpdateSource } from "@deepseek-ai/dsh-settings";

/** In-memory settings provider (the cookbook's load/persist half):
 *  lets the host's settings section bind in a node fiber without a
 *  document on disk. */
class MemorySettings extends SettingsProvider {
  readonly writable = true;
  doc: Record<string, unknown> = {};
  protected async load(): Promise<Record<string, unknown>> {
    return this.doc;
  }
  protected async persist(): Promise<void> {}
  /** Test driver for the protected push-external-changes seam
   *  (subclasses may call publish; outsiders may not). */
  push(doc: Record<string, unknown>, source: SettingsUpdateSource = "provider"): void {
    this.publish(doc, source);
  }
}
import {
  ComfyUIHostService,
  comfyuiHostProvider,
  needComfyUI,
  parseComfyUIHostConfig,
} from "../src/comfyui-host.ts";

const boot = async (config: Record<string, unknown> = { url: "http://pin:8188" }) => {
  const ctx = new Context();
  await ctx.plugin(comfyuiHostProvider, config);
  // Same fiber owns the host provider, so 'comfyui' IS a
  // ComfyUIHostService at runtime — the static type is the card
  // plane's ComfyUIService augmentation, hence unknown-first.
  const host = ctx.get("comfyui") as unknown as ComfyUIHostService;
  return { ctx, host };
};

describe("resolvePin (the Config triple)", () => {
  it("url wins; host/port compose with tolls; neither is null", () => {
    expect(ComfyUIHostService.resolvePin({ url: "http://u:1" })).toBe("http://u:1");
    expect(ComfyUIHostService.resolvePin({ host: "h" })).toBe("http://h:8188");
    expect(ComfyUIHostService.resolvePin({ port: 99 })).toBe("http://127.0.0.1:99");
    expect(ComfyUIHostService.resolvePin({})).toBeNull();
  });
});

describe("repoint (the settings onChange law)", () => {
  it("unresolved: the pin swaps silently (no supervisor touched)", async () => {
    const { host } = await boot();
    host.setSource(() => ({ url: "http://next:8188" }));
    host.repoint();
    expect(host.baseUrl()).toBe("http://next:8188");
  });
  it("resolved + unchanged: no-op (the registration arm)", async () => {
    const { host } = await boot();
    expect(host.baseUrl()).toBe("http://pin:8188");
    host.repoint();
    expect(host.baseUrl()).toBe("http://pin:8188");
  });
  it("resolved + changed: the supervisor drops, next face re-resolves", async () => {
    const { host } = await boot();
    expect(host.baseUrl()).toBe("http://pin:8188");
    host.setSource(() => ({ host: "elsewhere" }));
    host.repoint();
    expect(host.baseUrl()).toBe("http://elsewhere:8188");
  });
  it("a pin removed falls to env/file", async () => {
    const { host } = await boot();
    expect(host.baseUrl()).toBe("http://pin:8188");
    host.setSource(() => ({}));
    host.repoint();
    expect(host.baseUrl()).toBe("http://env-file:8188");
  });
});

describe("the supervised contract", () => {
  it("executeSingle delegates to the inner face (fiber-owned prompts)", async () => {
    const { host } = await boot();
    const r = await host.executeSingle("/tmp/r", {}, {});
    expect(r.promptId).toBe("p-host");
  });
  it("executeFlow delegates to the inner face", async () => {
    const { host } = await boot();
    const r = await host.executeFlow([], "/tmp/r", {}, {});
    expect(r.promptId).toBe("p-flow");
  });
  it("stopForRunDir + unloadModels delegate to the control plane", async () => {
    const { host } = await boot();
    await expect(host.stopForRunDir("nope")).resolves.toBeUndefined();
    await expect(host.unloadModels()).resolves.toBeUndefined();
  });
  it("resetForTests drops the resolved server + prompts", async () => {
    const { host } = await boot();
    expect(host.baseUrl()).toBe("http://pin:8188");
    host.setSource(() => ({ url: "http://stale:8188" }));
    host.resetForTests();
    expect(host.baseUrl()).toBe("http://pin:8188");
  });
});

describe("parseComfyUIHostConfig (the Config gates)", () => {
  it("undefined/null toll to {}", () => {
    const a = parseComfyUIHostConfig(undefined);
    const b = parseComfyUIHostConfig(null);
    expect(a).toEqual({});
    expect(b).toEqual({});
  });
  it("url trims and strips trailing slashes", () => {
    expect(parseComfyUIHostConfig({ url: "  http://u:1/  " })).toEqual({ url: "http://u:1" });
    expect(parseComfyUIHostConfig({ url: "http://u:1///" })).toEqual({ url: "http://u:1" });
  });
  it("empty url and empty host refuse; non-integer port refuses", () => {
    expect(() => parseComfyUIHostConfig({ url: "  " })).toThrow(/url must be a non-empty string/);
    expect(() => parseComfyUIHostConfig({ host: " " })).toThrow(/host must be a non-empty string/);
    expect(() => parseComfyUIHostConfig({ port: 1.5 })).toThrow(/port must be an integer/);
  });
  it("host trims; integer port rides", () => {
    expect(parseComfyUIHostConfig({ host: " h ", port: 99 })).toEqual({ host: "h", port: 99 });
  });
});

describe("the wiring-bug guards", () => {
  it("sup() before any baseUrl() refuses (private guard, direct)", async () => {
    const { host } = await boot();
    const priv = host as unknown as { sup: () => unknown };
    expect(() => priv.sup()).toThrow(/no supervisor/);
  });
  it("a second baseUrl() never starts a second supervisor", async () => {
    const { host } = await boot();
    host.baseUrl();
    const priv = host as unknown as { supervisor: unknown };
    const first = priv.supervisor;
    host.baseUrl();
    expect(priv.supervisor === first).toBe(true);
  });
});

describe("the supervisor lifecycle (down, recovery, transport-dead traffic)", () => {
  it("startSupervisor twice keeps the first (idempotency guard, direct)", async () => {
    const { host } = await boot();
    host.baseUrl();
    const priv = host as unknown as { startSupervisor: (s: string) => void; supervisor: unknown };
    const first = priv.supervisor;
    priv.startSupervisor("http://again:8188");
    expect(priv.supervisor === first).toBe(true);
  });
  it("a transport-dead execute failure reports liveness and rethrows", async () => {
    const { executeSingleInner } = await import("../src/comfyui-execute.ts");
    const mod = await import("../src/comfyui-execute.ts");
    void executeSingleInner;
    const orig = mod.executeSingleInner;
    (mod as unknown as { executeSingleInner: unknown }).executeSingleInner =
      async (): Promise<never> => {
        throw Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:8188"), { code: "ECONNREFUSED" });
      };
    try {
      const { host } = await boot();
      await expect(host.executeSingle("/tmp/r", {}, {})).rejects.toThrow(/ECONNREFUSED/);
      // THE FAIL-FAST LAW: the recorded transport-dead verdict owns
      // every later face until recovery (no timeout burn)
      await expect(host.executeSingle("/tmp/r", {}, {})).rejects.toThrow(/comfyui is unreachable/);
      // TRAFFIC LIVENESS: an HTTP answer (even a 500) proves the
      // engine alive — noteSuccess recovers the state, the info
      // voice fires ("engine reachable"), and faces run again
      const sup = (host as unknown as { sup: () => { noteSuccess(): void } }).sup();
      sup.noteSuccess();
      (mod as unknown as { executeSingleInner: unknown }).executeSingleInner =
        async (): Promise<unknown> => ({ promptId: "p-back" });
      const back = await host.executeSingle("/tmp/r", {}, {}) as { promptId: string };
      expect(back.promptId).toBe("p-back");
    } finally {
      (mod as unknown as { executeSingleInner: unknown }).executeSingleInner = orig;
    }
  });
});

describe("the settings section (the cookbook bind)", () => {
  it("a mounted settings provider takes over as the live source and onChange repoints", async () => {
    const ctx = new Context();
    await ctx.plugin(MemorySettings);
    await ctx.plugin(comfyuiHostProvider, { url: "http://pin:8188" });
    const host = ctx.get("comfyui") as unknown as ComfyUIHostService;
    // registration called setSource + onChange once with the entry
    // (same pin — the no-op arm); the section's scope now governs.
    expect(host.baseUrl()).toBe("http://pin:8188");
    // a section write through the provider's document repoints live
    const prov = ctx.get("settings") as unknown as MemorySettings;
    prov.doc = { comfyui: { url: "http://doc-written:8188" } };
    prov.push(prov.doc, "provider");
    host.repoint();
    expect(host.baseUrl()).toBe("http://doc-written:8188");
  });
});

describe("repoint's registration-after-reset shape", () => {
  it("resolved-but-supervisor-less repoints without the dispose arm", async () => {
    const { host } = await boot();
    host.baseUrl();
    const priv = host as unknown as {
      supervisor: unknown;
      resolved: string | null;
      repoint: () => void;
    };
    // the resetForTests-leaves-resolved shape: supervisor dropped,
    // resolved stale (private state surgery — the only live route)
    priv.supervisor = null;
    priv.resolved = "http://stale:8188";
    host.setSource(() => ({ url: "http://next:8188" }));
    priv.repoint();
    expect(host.baseUrl()).toBe("http://next:8188");
  });
  it("resetForTests without a prior baseUrl (supervisor-null arm)", async () => {
    const { host } = await boot();
    host.setSource(() => ({ url: "http://stale:8188" }));
    host.resetForTests();
    // the ctor-config thunk governs a post-reset repoint too
    host.repoint();
    expect(host.baseUrl()).toBe("http://pin:8188");
  });
});

describe("the neutral-error law (non-transport failures)", () => {
  it("a plain logic error in the inner face rethrows without liveness", async () => {
    const mod = await import("../src/comfyui-execute.ts");
    const orig = mod.executeSingleInner;
    (mod as unknown as { executeSingleInner: unknown }).executeSingleInner =
      async (): Promise<never> => { throw new Error("plain logic error"); };
    try {
      const { host } = await boot();
      await expect(host.executeSingle("/tmp/r", {}, {})).rejects.toThrow(/plain logic error/);
      // neutral verdict: a LATER face still runs (no fail-fast)
      (mod as unknown as { executeSingleInner: unknown }).executeSingleInner =
        async (): Promise<unknown> => ({ promptId: "p-ok" });
      const r = await host.executeSingle("/tmp/r", {}, {}) as { promptId: string };
      expect(r.promptId).toBe("p-ok");
    } finally {
      (mod as unknown as { executeSingleInner: unknown }).executeSingleInner = orig;
    }
  });
});

describe("needComfyUI (the miswire voice)", () => {
  it("a booted host rides; an absent one refuses loud", async () => {
    const { ctx, host } = await boot();
    const got = needComfyUI(ctx, "test");
    expect(typeof got.baseUrl === "function").toBe(true);
    expect(got.baseUrl()).toBe("http://pin:8188");
    const bare = new Context();
    (bare as unknown as { provide: (n: string) => void }).provide("comfyui");
    (bare as unknown as Record<string, unknown>)["comfyui"] = { not: "the service" };
    expect(() => needComfyUI(bare, "somewhere")).toThrow(/no ComfyUIHostService for somewhere/);
  });
});
