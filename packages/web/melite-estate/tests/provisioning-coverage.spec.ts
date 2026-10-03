import "../../../../tests/helpers/boot-models.ts";
import { afterAll, afterEach, beforeEach, describe, test, vi } from "vitest";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer, type Server } from "node:http";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context, Service, type Plugin } from "@deepseek-ai/cordis";
import type {
  SubprocessHandle,
  SubprocessSpawnSpec,
  SubprocessTerminalEnvironment,
  SubprocessTerminalHandle,
  SubprocessTerminalSpawnSpec,
} from "@deepseek-ai/dsh-subprocess";
import { ComfyUiManagerHttpClient, type ProvisionPlanItem } from "@melite/estate-provisioning";

const sdkClientMock = vi.hoisted(() => vi.fn());

vi.mock("@melite/comfyui-cordis", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@melite/comfyui-cordis")>();
  return {
    ...actual,
    sdkClient: (...args: Parameters<typeof actual.sdkClient>) => sdkClientMock(...args) ?? actual.sdkClient(...args),
  };
});

import composition from "../src/provisioning.ts";

const ENV_KEYS = ["MELITE_REPO_ROOT", "COMFYUI_ENDPOINT_CONFIG", "INFERENCE_TEST_SANDBOX", "COMFYUI_URL"];
const MODEL_BYTES = Buffer.from("web-provisioning-model");
const MODEL_SHA = createHash("sha256").update(MODEL_BYTES).digest("hex");
const contexts: Context[] = [];
const roots: string[] = [];
const servers: Server[] = [];
let mountCounter = 0;
let saved: Record<string, string | undefined> = {};

interface ServerState {
  objectInfo: "ok" | "error";
  reboot: "ok" | "reset" | "refuse";
  statsFailures: number;
  calls: string[];
  store?: string;
  onStatus?: () => void;
  onReboot?: () => void;
}

interface Mounted {
  ctx: Context;
  root: string;
  state: ServerState;
  endpoint: string;
}

function tempRoot(prefix: string): string {
  const value = mkdtempSync(join(tmpdir(), prefix));
  roots.push(value);
  return value;
}

function writeRepo(endpoint: Record<string, unknown>, facts: Record<string, unknown>, options: { readonly inference?: Record<string, unknown>; readonly extensions?: string } = {}): string {
  const root = tempRoot("web-provisioning-");
  const data = join(root, "packages", "engines", "comfyui-cordis", "data");
  mkdirSync(data, { recursive: true });
  const endpointPath = join(data, "comfyui_endpoint.json");
  writeFileSync(endpointPath, JSON.stringify(endpoint));
  writeFileSync(join(data, "model-facts.json"), JSON.stringify(facts));
  if (options.inference !== undefined) writeFileSync(join(root, "inference.config.json"), JSON.stringify(options.inference));
  if (options.extensions !== undefined) {
    const nodes = join(root, "packages", "demo", "nodes");
    mkdirSync(nodes, { recursive: true });
    writeFileSync(join(nodes, "extensions.yaml"), options.extensions);
  }
  return root;
}

function startServer(state: ServerState, prefix: string): Promise<string> {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://web-provisioning.invalid");
    const route = url.pathname.slice(prefix.length) || "/";
    const path = `${route}${url.search}`;
    state.calls.push(path);
    if (route === "/object_info") {
      if (state.objectInfo === "error") {
        res.writeHead(503, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "offline" }));
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ DemoNode: {}, OtherNode: {} }));
      return;
    }
    if (path === "/externalmodel/getlist?mode=cache") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ models: [{
        name: "web-model",
        type: "checkpoint",
        base: "web",
        save_path: "checkpoints",
        url: "https://example.invalid/model.bin",
        filename: "model.bin",
      }] }));
      return;
    }
    if (route === "/model.bin") {
      // the direct arm's byte source: the composition's fetcher hits
      // this route with the DECL's own url, no Manager in between
      res.writeHead(200, { "content-type": "application/octet-stream" });
      res.end(MODEL_BYTES);
      return;
    }
    if (path === "/manager/queue/install_model") {
      if (state.store !== undefined) {
        const destination = join(state.store, "checkpoints", "model.bin");
        mkdirSync(join(state.store, "checkpoints"), { recursive: true });
        writeFileSync(destination, MODEL_BYTES);
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end("{}");
      return;
    }
    if (path === "/customnode/getlist?mode=cache&skip_update=true") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ node_packs: { demo: {
        id: "demo",
        version: "1.0.0",
        repository: "https://example.invalid/demo.git",
        files: ["https://example.invalid/demo.git"],
        pip: ["numpy"],
      } } }));
      return;
    }
    if (path === "/customnode/versions/demo") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify([{ version: "1.0.0" }]));
      return;
    }
    if (path === "/manager/queue/install" || path === "/manager/queue/start" || path === "/customnode/install/git_url" || path === "/customnode/install/pip") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end("{}");
      return;
    }
    if (path === "/manager/queue/status") {
      state.onStatus?.();
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ total_count: 1, done_count: 1, in_progress_count: 0, is_processing: false }));
      return;
    }
    if (path === "/manager/reboot") {
      state.onReboot?.();
      if (state.reboot === "refuse") {
        res.writeHead(500, { "content-type": "application/json" });
        res.end("{}");
        return;
      }
      if (state.reboot === "reset") {
        res.socket?.destroy();
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end("{}");
      return;
    }
    if (path === "/system_stats") {
      if (state.statsFailures > 0) {
        state.statsFailures -= 1;
        res.writeHead(503, { "content-type": "application/json" });
        res.end("{}");
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end("{}");
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end("{}");
  });
  servers.push(server);
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    resolve(`http://127.0.0.1:${typeof address === "object" && address !== null ? String(address.port) : "0"}${prefix}`);
  }));
}

/** The git runner's seat, faked: every git call exits 0, `init`
 *  creates the directory the real git would make, and `rev-parse`
 *  answers a 40-char commit — the same answers the old execFile
 *  mock gave (the pinned-install flow rides them). */
class FakeGitSubprocess extends Service {
  static inject = [] as const;

  constructor(ctx: Context) {
    super(ctx, "subprocess");
  }

  spawn(spec: SubprocessSpawnSpec): SubprocessHandle {
    const argv = spec.argv;
    if (argv[0] === "git" && argv[1] === "init" && argv[3] !== undefined) {
      mkdirSync(argv[3], { recursive: true });
    }
    const stdout = argv.includes("rev-parse") ? "a".repeat(40) : "";
    const reader = (text: string) => ({ readFrom: () => ({ text, nextOffset: text.length, lossy: false }) });
    return {
      stdin: undefined,
      stdout: undefined,
      stderr: undefined,
      control: undefined,
      collected: { stdout: reader(stdout), stderr: reader("") },
      done: Promise.resolve({ exitCode: 0, signal: null }),
      terminate: () => undefined,
      waitForExit: async () => true,
    } satisfies SubprocessHandle;
  }

  resolveExecutable(): Promise<string> {
    throw new Error("not needed by the git runner");
  }

  terminalEnvironment(): Promise<SubprocessTerminalEnvironment> {
    throw new Error("not needed by the git runner");
  }

  spawnTerminal(_spec: SubprocessTerminalSpawnSpec): Promise<SubprocessTerminalHandle> {
    throw new Error("not needed by the git runner");
  }
}

async function mount(options: {
  readonly endpoint?: Record<string, unknown>;
  readonly facts?: Record<string, unknown>;
  readonly cards?: Map<string, { provisions?: Array<{ name: string; url: string; folder: string; sha256: string }> }> | null;
  readonly queue?: { active: string; queued_ids: string[] };
  readonly server?: boolean;
  readonly state?: Partial<ServerState>;
  readonly inference?: Record<string, unknown>;
  readonly extensions?: string;
  readonly store?: string;
  readonly plugin?: Plugin.Object;
} = {}): Promise<Mounted> {
  const state: ServerState = { objectInfo: "ok", reboot: "ok", statsFailures: 0, calls: [], ...options.state };
  const prefix = options.server === false ? "" : `/run-${String(++mountCounter)}`;
  const endpoint = options.server === false ? "" : await startServer(state, prefix);
  const endpointConfig = {
    url: endpoint,
    provision: "managed",
    ...(options.store === undefined ? {} : { model_download_path: options.store }),
    ...options.endpoint,
  };
  const root = writeRepo(endpointConfig, options.facts ?? { extension_node_types: { demo: ["DemoNode"] }, rows: { h3: { card: "h3", card_knobs: [] } } }, {
    ...(options.inference === undefined ? {} : { inference: options.inference }),
    ...(options.extensions === undefined ? {} : { extensions: options.extensions }),
  });
  if (options.store !== undefined) state.store = options.store;
  process.env["MELITE_REPO_ROOT"] = root;
  process.env["COMFYUI_ENDPOINT_CONFIG"] = join(root, "packages", "engines", "comfyui-cordis", "data", "comfyui_endpoint.json");
  delete process.env["INFERENCE_TEST_SANDBOX"];
  delete process.env["COMFYUI_URL"];
  const ctx = new Context();
  contexts.push(ctx);
  const original = ctx.get.bind(ctx);
  const cards = options.cards === null ? undefined : options.cards ?? new Map();
  ctx.get = ((name: string, optional?: boolean) => {
    if (name === "cardRegistry") return options.cards === null ? undefined : { defsSync: () => cards };
    if (name === "queue" && options.queue !== undefined) return { core: { snapshot: () => ({ active: options.queue?.active ?? "", queued_ids: options.queue?.queued_ids ?? [] }) } };
    return original(name, optional);
  }) as typeof ctx.get;
  // THE BACKOFF SEAM (li-bg): the vendored timer plugin supplies
  // ctx.timeout (manage row seats it) — this composition has not
  // seated it yet, so production rides SEAMS.readinessBackoff; the
  // rig overrides the live holder so the retry arms stay instant,
  // never 60s real.
  const { SEAMS } = await import("../src/provisioning.ts");
  SEAMS.readinessBackoff = async (): Promise<void> => {};
  new FakeGitSubprocess(ctx);
  const plugin: Plugin.Object = options.plugin ?? composition;
  plugin.apply(ctx, undefined);
  return { ctx, root, state, endpoint };
}

function cardsWithModels(): Map<string, { provisions?: Array<{ name: string; url: string; folder: string; sha256: string }> }> {
  return new Map([
    ["card-model", { provisions: [{ name: "model.bin", url: "https://example.invalid/model.bin", folder: "checkpoints", sha256: MODEL_SHA }] }],
    ["card-empty", {}],
  ]);
}

beforeEach(() => {
  saved = {};
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(async () => {
  for (const ctx of contexts.splice(0)) await ctx.fiber.dispose();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

afterAll(async () => {
  for (const server of servers.splice(0)) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

describe.sequential("estate provisioning composition paths", () => {
  test("resolves family, card, and extension declarations and lists every source", async () => {
    const { ctx } = await mount({
      cards: cardsWithModels(),
      extensions: "extensions:\n  - name: demo\n    registry: demo\n    version: 1.0.0\n    url: https://example.invalid/demo.git\n    ref: main\n    pip:\n      - numpy\n",
    });
    const family = await ctx.provisioning.plan({ kind: "model", owner: "family", id: "h3" });
    assert.equal(family.items.length > 0, true);
    // 2026-10-12 union: the plan carries BOTH channels — the
    // family's provisions rows ride coordinateless, the variant-cell
    // artifact keeps its (variant, quant) coordinates
    const coordinates = await ctx.provisioning.plan({ kind: "model", owner: "family", id: "krea-2-raw", variant: "raw", quant: "int8" });
    const coordinateless = coordinates.items.filter((i) => (i as Extract<ProvisionPlanItem, { kind: "model" }>).variant === undefined);
    assert.equal(coordinateless.length > 0, true, "the provisions rows ride without coordinates");
    const coordinatesItem = coordinates.items.find((i) => (i as Extract<ProvisionPlanItem, { kind: "model" }>).variant === "raw") as Extract<ProvisionPlanItem, { kind: "model" }>;
    assert.equal(coordinatesItem.quant, "int8");
    const route = await ctx.provisioning.plan({ kind: "model", owner: "family", id: "krea-2" });
    const routeItem = route.items.find((i) => (i as Extract<ProvisionPlanItem, { kind: "model" }>).variant === "turbo") as Extract<ProvisionPlanItem, { kind: "model" }>;
    assert.equal(routeItem.quant, "int8");
    const card = await ctx.provisioning.plan({ kind: "model", owner: "card", id: "card-model" });
    const cardItem = card.items[0] as Extract<ProvisionPlanItem, { kind: "model" }>;
    assert.equal(cardItem.name, "model.bin");
    const extension = await ctx.provisioning.plan({ kind: "extension", id: "demo" });
    assert.equal(extension.items[0]?.provider, "git");
    await assert.rejects(ctx.provisioning.plan({ kind: "model", owner: "card", id: "missing" }), /unknown card/);
    await assert.rejects(ctx.provisioning.plan({ kind: "model", owner: "card", id: "card-empty" }), /no downloadable/);
    await assert.rejects(ctx.provisioning.plan({ kind: "extension", id: "missing" }), /not declared/);
    const refs = await (ctx.provisioning as unknown as { reconcile(): Promise<Array<{ ref: { id: string } }>> }).reconcile();
    assert.equal(refs.some((entry) => entry.ref.id === "demo"), true);
    await assert.rejects(mount({ cards: null }), /card registry service/);
  });

  test("resolves configured and fallback store roots and missing endpoint values", async () => {
    const store = tempRoot("web-store-");
    const configured = await mount({ endpoint: { model_download_path: store }, server: false });
    assert.equal((await configured.ctx.provisioning.plan({ kind: "model", owner: "family", id: "h3" })).items.length > 0, true);
    const base = tempRoot("web-base-");
    const inherited = await mount({ endpoint: { model_download_path: null, model_base_path: base }, server: false });
    assert.equal((await inherited.ctx.provisioning.plan({ kind: "model", owner: "family", id: "h3" })).items.length > 0, true);
    const fallback = await mount({
      endpoint: {},
      server: false,
      inference: { models: { read_root: "/read", download_root: "/download" }, engines: { comfyui: { base: "comfyui" } } },
    });
    assert.equal((await fallback.ctx.provisioning.plan({ kind: "model", owner: "family", id: "h3" })).items.length > 0, true);
    const missing = await mount({ endpoint: { url: 42 }, server: false });
    assert.equal((await missing.ctx.provisioning.inspect({ kind: "model", owner: "family", id: "h3" })).state, "failed");
    const noConfig = await mount({ server: false, inference: undefined });
    assert.equal((await noConfig.ctx.provisioning.inspect({ kind: "model", owner: "family", id: "h3" })).state, "failed");
  });

  test("caches object definitions and memoizes an unreachable dial", async () => {
    const mounted = await mount({ extensions: "extensions:\n  - name: demo\n    registry: demo\n    version: 1.0.0\n    url: https://example.invalid/demo.git\n", facts: { extension_node_types: { demo: ["DemoNode"] }, rows: { h3: { card: "h3", card_knobs: [] } } } });
    const first = await mounted.ctx.provisioning.inspect({ kind: "extension", id: "demo" });
    const second = await mounted.ctx.provisioning.inspect({ kind: "extension", id: "demo" });
    assert.equal(first.state, "active", JSON.stringify(first));
    assert.equal(second.state, "active", JSON.stringify(second));
    assert.equal(mounted.state.calls.filter((path) => path.startsWith("/object_info")).length, 1);
    const aborted = new AbortController();
    aborted.abort();
    assert.equal((await mounted.ctx.provisioning.inspect({ kind: "model", owner: "family", id: "h3" }, aborted.signal)).state, "absent");
    const activationAbort = new AbortController();
    activationAbort.abort();
    assert.equal((await mounted.ctx.provisioning.activate({ kind: "model", owner: "family", id: "h3" }, {}, activationAbort.signal)).state, "cancelled");
  });

  test("covers inspector model, missing node, empty expectation, and endpoint refusal", async () => {
    const mounted = await mount({ facts: { extension_node_types: {}, rows: { h3: { card: "h3", card_knobs: [] } } }, extensions: "extensions:\n  - name: demo\n    registry: demo\n    version: 1.0.0\n    url: https://example.invalid/demo.git\n" });
    assert.equal(mounted.state.objectInfo, "ok");
    assert.equal(process.env["MELITE_REPO_ROOT"], mounted.root);
    assert.equal(process.env["COMFYUI_ENDPOINT_CONFIG"], join(mounted.root, "packages", "engines", "comfyui-cordis", "data", "comfyui_endpoint.json"));
    const modelStatus = await mounted.ctx.provisioning.inspect({ kind: "model", owner: "family", id: "h3" });
    assert.equal(modelStatus.state, "absent", JSON.stringify(modelStatus));
    const extension = await mounted.ctx.provisioning.inspect({ kind: "extension", id: "demo" });
    assert.equal(extension.items[0]?.detail, "extension has no declared node types");
    const missingFacts = await mount({ facts: { extension_node_types: { demo: ["MissingNode"] }, rows: { h3: { card: "h3", card_knobs: [] } } }, extensions: "extensions:\n  - name: demo\n    registry: demo\n    version: 1.0.0\n    url: https://example.invalid/demo.git\n" });
    assert.equal((await missingFacts.ctx.provisioning.inspect({ kind: "extension", id: "demo" })).items[0]?.state, "absent");
    const noEndpoint = await mount({ endpoint: { url: "" }, server: false });
    assert.equal((await noEndpoint.ctx.provisioning.inspect({ kind: "model", owner: "family", id: "h3" })).state, "failed");
  });

  test("the direct arm fetches a declared model through the composition's fetcher and reuses the landed bytes", async () => {
    const store = tempRoot("web-model-store-");
    const cards = cardsWithModels();
    const mounted = await mount({ cards, store });
    // the DECL url IS the fetch url now — point the card's row at the
    // rig's own server once the endpoint exists (the registry reads
    // the map live, so this lands before ensure resolves it)
    cards.get("card-model")!.provisions![0]!.url = `${mounted.endpoint}/model.bin`;
    const result = await mounted.ctx.provisioning.ensure({ kind: "model", owner: "card", id: "card-model" });
    assert.equal(result.state, "active", JSON.stringify(result));
    const second = await mounted.ctx.provisioning.ensure({ kind: "model", owner: "card", id: "card-model" });
    assert.equal(second.state, "active", JSON.stringify(second));
    assert.equal(mounted.state.calls.filter((path) => path === "/model.bin").length, 1);
    assert.equal(mounted.state.calls.some((path) => path === "/manager/queue/install_model"), false);
    assert.deepEqual(readFileSync(join(store, "checkpoints", "model.bin")), MODEL_BYTES);
  });

  test("lazy Manager covers registry, URL, and pinned git post-install paths", async () => {
    const mounted = await mount({
      extensions: "extensions:\n  - name: demo\n    registry: demo\n    version: 1.0.0\n    url: https://example.invalid/demo.git\n  - name: registry-only\n    registry: demo\n    version: 1.0.0\n    url: ''\n  - name: pinned\n    registry: ''\n    version: ''\n    url: https://example.invalid/pinned.git\n    ref: main\n    pip:\n      - numpy\n  - name: operator\n    registry: ''\n    version: ''\n    url: https://example.invalid/operator.git\n  - name: local\n    registry: ''\n    version: ''\n    url: ''\n",
    });
    const registry = await mounted.ctx.provisioning.ensure({ kind: "extension", id: "demo" });
    assert.equal(registry.state, "restart_required");
    const registryOnly = await mounted.ctx.provisioning.ensure({ kind: "extension", id: "registry-only" });
    assert.equal(registryOnly.state, "restart_required");
    const pinned = await mounted.ctx.provisioning.ensure({ kind: "extension", id: "pinned" });
    assert.equal(pinned.state, "restart_required");
    const operator = await mounted.ctx.provisioning.ensure({ kind: "extension", id: "operator" });
    assert.equal(operator.state, "restart_required");
    const local = await mounted.ctx.provisioning.ensure({ kind: "extension", id: "local" });
    assert.equal(local.state, "blocked");
  });

  test("lifecycle covers queue snapshot, restart refusal, readiness retry, abort, and timeout", async () => {
    const extensionYaml = "extensions:\n  - name: demo\n    registry: demo\n    version: 1.0.0\n    url: https://example.invalid/demo.git\n";
    const mounted = await mount({ extensions: extensionYaml, queue: { active: "run-active", queued_ids: ["run-queued"] }, state: { statsFailures: 1 } });
    const blocked = await mounted.ctx.provisioning.activate({ kind: "extension", id: "demo" });
    assert.equal(blocked.items[0]?.errorCode, "activation/active-run");
    const force = await mounted.ctx.provisioning.activate({ kind: "extension", id: "demo" }, { force: true });
    assert.equal(force.state, "active");
    mounted.state.reboot = "reset";
    const reset = await mounted.ctx.provisioning.activate({ kind: "extension", id: "demo" }, { force: true });
    assert.equal(reset.state, "active", JSON.stringify(reset));
    mounted.state.reboot = "refuse";
    const refused = await mounted.ctx.provisioning.activate({ kind: "extension", id: "demo" }, { force: true });
    assert.equal(refused.state, "failed");
    const noEndpoint = await mount({ endpoint: { url: "" }, server: false, extensions: extensionYaml });
    const missing = await noEndpoint.ctx.provisioning.activate({ kind: "extension", id: "demo" });
    assert.equal(missing.state, "failed");
    const timeout = await mount({ extensions: extensionYaml, state: { statsFailures: 200 } });
    const timedOut = await timeout.ctx.provisioning.activate({ kind: "extension", id: "demo" }, { force: true });
    assert.equal(timedOut.state, "failed");
    const aborted = await mount({ extensions: extensionYaml });
    const controller = new AbortController();
    controller.abort();
    const cancelled = await aborted.ctx.provisioning.activate({ kind: "extension", id: "demo" }, { force: true }, controller.signal);
    assert.equal(cancelled.state, "cancelled");
  });

  test("lifecycle covers empty queue snapshots and endpoint loss during restart", async () => {
    const extensionYaml = "extensions:\n  - name: demo\n    registry: demo\n    version: 1.0.0\n    url: https://example.invalid/demo.git\n";
    const emptyQueue = await mount({ extensions: extensionYaml, queue: { active: "", queued_ids: ["queued"] } });
    assert.equal((await emptyQueue.ctx.provisioning.activate({ kind: "extension", id: "demo" }, { force: true })).state, "active");

    let statusPath = "";
    const statusMount = await mount({
      extensions: extensionYaml,
      state: { onStatus: () => writeFileSync(statusPath, JSON.stringify({ url: "", provision: "managed" })) },
    });
    statusPath = join(statusMount.root, "packages", "engines", "comfyui-cordis", "data", "comfyui_endpoint.json");
    assert.equal((await statusMount.ctx.provisioning.activate({ kind: "extension", id: "demo" })).state, "failed");

    let rebootPath = "";
    const rebootMount = await mount({
      extensions: extensionYaml,
      state: { onReboot: () => writeFileSync(rebootPath, JSON.stringify({ url: "", provision: "managed" })) },
    });
    rebootPath = join(rebootMount.root, "packages", "engines", "comfyui-cordis", "data", "comfyui_endpoint.json");
    assert.equal((await rebootMount.ctx.provisioning.activate({ kind: "extension", id: "demo" })).state, "failed");
  });

  test("lifecycle propagates an abort during restart", async () => {
    const controller = new AbortController();
    const mounted = await mount({
      extensions: "extensions:\n  - name: demo\n    registry: demo\n    version: 1.0.0\n    url: https://example.invalid/demo.git\n",
    });
    const originalPost = ComfyUiManagerHttpClient.prototype.post;
    const postSpy = vi.spyOn(ComfyUiManagerHttpClient.prototype, "post").mockImplementation(async function (this: ComfyUiManagerHttpClient, ...args: Parameters<typeof originalPost>) {
      const result = await originalPost.apply(this, args);
      if (args[0] === "/manager/reboot") controller.abort();
      return result;
    });
    try {
      const result = await mounted.ctx.provisioning.activate({ kind: "extension", id: "demo" }, { force: true }, controller.signal);
      assert.equal(result.state, "cancelled");
    } finally {
      postSpy.mockRestore();
    }
  });

  test("write guard and composition refusal are driven by the endpoint config", async () => {
    const mounted = await mount({ endpoint: { provision: "byo" }, cards: cardsWithModels(), store: tempRoot("web-byok-") });
    const result = await mounted.ctx.provisioning.ensure({ kind: "model", owner: "card", id: "card-model" });
    assert.equal(result.state, "blocked");
  });

  test("object-info preserves Error rejection detail and memoizes the refusal", async () => {
    vi.resetModules();
    const freshComposition = (await import("../src/provisioning.ts")).default;
    const mounted = await mount({
      plugin: freshComposition,
      state: { objectInfo: "error" },
      extensions: "extensions:\n  - name: offline\n    registry: offline\n    version: 1.0.0\n    url: https://example.invalid/offline.git\n",
    });
    const result = await mounted.ctx.provisioning.inspect({ kind: "extension", id: "offline" });
    const memo = await mounted.ctx.provisioning.inspect({ kind: "extension", id: "offline" });
    assert.equal(result.state, "failed");
    assert.match(result.items[0]?.detail ?? "", /503/);
    assert.equal(memo.state, "failed");
    assert.match(memo.items[0]?.detail ?? "", /dial memo/);
    assert.equal(mounted.state.calls.filter((path) => path.startsWith("/object_info")).length, 1);
  });

  test("the REAL readiness backoff resolves and cancels (the rig stubs it everywhere else)", async () => {
    // li-bg's rig stub made every mount instant — and the real body
    // lost its coverage (the floor fell after the baseline). This
    // arm imports a FRESH graph (the :516 pattern) so the holder is
    // the production one, then exercises both exits: the full sleep
    // and the abort cancellation.
    vi.resetModules();
    const { SEAMS } = await import("../src/provisioning.ts");
    const started = Date.now();
    await SEAMS.readinessBackoff();
    assert.ok(Date.now() - started >= 450, "the real 500ms sleep ran");
    // abort INSIDE the window (a pre-aborted signal never fires the
    // listener — the waitUntilReady loop checks aborted at its top,
    // so production never reaches the backoff pre-aborted)
    const controller = new AbortController();
    const pending = SEAMS.readinessBackoff(controller.signal);
    setTimeout(() => controller.abort(), 50);
    await assert.rejects(pending, /readiness wait cancelled/);
  });

  test("object-info preserves non-Error rejection detail", async () => {
    vi.resetModules();
    const freshComposition = (await import("../src/provisioning.ts")).default;
    sdkClientMock.mockImplementationOnce(() => ({ fetchApi: async () => { throw "raw-object-info-error"; } }));
    const mounted = await mount({
      plugin: freshComposition,
      extensions: "extensions:\n  - name: raw-error\n    registry: raw-error\n    version: 1.0.0\n    url: https://example.invalid/raw-error.git\n",
    });
    const result = await mounted.ctx.provisioning.inspect({ kind: "extension", id: "raw-error" });
    assert.equal(result.state, "failed");
    assert.match(result.items[0]?.detail ?? "", /raw-object-info-error/);
  });
});
