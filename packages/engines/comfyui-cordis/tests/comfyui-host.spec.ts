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
  withBound: (work: () => Promise<unknown>) => work(),
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
import {
  ComfyUIHostService,
  comfyuiHostProvider,
  Config,
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

describe("the settings seat (the 0.1.7 law: Config IS the registration)", () => {
  it("the provider declares its Config schema — SettingsForms derives the form from it", () => {
    // dsh-settings 0.1.7 SettingsForms describes ACTIVE plugin
    // configs; the plugin's own Config field is the whole seat. The
    // old installSection seam (and MemorySettings fake over the
    // deleted SettingsProvider) died with the bump.
    const provider = comfyuiHostProvider as unknown as { Config?: unknown };
    expect(provider.Config).toBe(Config);
  });
  it("a config write re-applies the plugin — the fresh service at the new pin IS the repoint", async () => {
    // the loader's live config reload (a profile-patch write)
    // disposes the old fiber and applies the entry again: the
    // service rebuilds at the new pin, never mutates in place
    const ctx = new Context();
    await ctx.plugin(comfyuiHostProvider, { url: "http://pin:8188" });
    const first = ctx.get("comfyui") as unknown as ComfyUIHostService;
    expect(first.baseUrl()).toBe("http://pin:8188");
    await ctx.fiber.dispose();
    const ctx2 = new Context();
    await ctx2.plugin(comfyuiHostProvider, { url: "http://doc-written:8188" });
    const second = ctx2.get("comfyui") as unknown as ComfyUIHostService;
    expect(second.baseUrl()).toBe("http://doc-written:8188");
    await ctx2.fiber.dispose();
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
