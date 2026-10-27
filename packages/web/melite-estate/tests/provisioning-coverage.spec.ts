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
import { loadExtensionsYaml } from "@melite/comfyui-cordis/provisioning-manifest";

const sdkClientMock = vi.hoisted(() => vi.fn());

vi.mock("@melite/comfyui-cordis", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@melite/comfyui-cordis")>();
  return {
    ...actual,
    sdkClient: (...args: Parameters<typeof actual.sdkClient>) => sdkClientMock(...args) ?? actual.sdkClient(...args),
  };
});

import composition from "../src/provisioning.ts";
import { idleDialFetch, type ProvisioningCompositionConfig } from "../src/provisioning.ts";

const ENV_KEYS = ["MELITE_REPO_ROOT", "MELITE_EXTENSION_MANIFEST", "COMFYUI_ENDPOINT_CONFIG", "INFERENCE_TEST_SANDBOX", "COMFYUI_URL"];
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
  // Fires from the install routes the flow actually hits (R7: the
  // registry door's queue poll is gone — the git door's install POST
  // is the loss seam now). Only the mounts that set it feel it.
  onInstall?: () => void;
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

/** The fixture's shipped-manifest path — written whenever the mount
 *  declares extension rows, and pinned into MELITE_EXTENSION_MANIFEST
 *  (the loader's override seam, the COMFYUI_ENDPOINT_CONFIG idiom).
 *  The runtime read is the SHIPPED FILE since audit 019 C1; a fixture
 *  nodes.yaml walk would test a dev-only shape. */
function fixtureManifestPath(root: string): string {
  return join(root, "packages", "engines", "comfyui-cordis", "data", "extension-manifest.json");
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
    // The fixture's declaration yaml is authored at the nodes/ shape,
    // then DERIVED into the shipped manifest by the real reader — the
    // same regen relationship the checkout's data file rides (the
    // walk is the generator's source of truth, never a runtime read).
    const nodes = join(root, "packages", "demo", "nodes");
    mkdirSync(nodes, { recursive: true });
    const yamlPath = join(nodes, "extensions.yaml");
    writeFileSync(yamlPath, options.extensions);
    writeFileSync(fixtureManifestPath(root), JSON.stringify(loadExtensionsYaml(yamlPath)));
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
    // THE LANDED-HEAD DOOR (2026-10-13, the extensions law): a declared
    // ref installs through Manager's git_url door and the estate then
    // VERIFIES the landed commit here. The fixture answers with the
    // pinned row's own commit, so a ref row reaches restart_required
    // only by actually being verified.
    if (path === "/customnode/installed") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify([
        { aux_id: "https://example.invalid/pinned", ver: "0a1b2c3d4e5f60718293a4b5c6d7e8f901234567" },
        { aux_id: "https://example.invalid/demo", ver: "9f8e7d6c5b4a39281706f5e4d3c2b1a098765432" },
        { aux_id: "https://example.invalid/operator", ver: "1122334455667788990011223344556677889900" },
      ]));
      return;
    }
    if (path === "/manager/queue/install" || path === "/manager/queue/start" || path === "/customnode/install/git_url" || path === "/customnode/install/pip") {
      state.onInstall?.();
      res.writeHead(200, { "content-type": "application/json" });
      res.end("{}");
      return;
    }
    if (path === "/manager/queue/status") {
      state.onInstall?.();
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
  readonly compositionConfig?: ProvisioningCompositionConfig;
  readonly plugin?: Plugin.Object;
  readonly beforeApply?: (ctx: Context) => void;
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
  if (options.extensions !== undefined) process.env["MELITE_EXTENSION_MANIFEST"] = fixtureManifestPath(root);
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
  // THE BACKOFF SEAM (li-bg → J7): production sleeps through
  // SEAMS.sleep, which apply seats from the fiber-scoped ctx.timeout
  // (the timer plugin the composition injects); the rig overrides
  // the backoff by name so the retry arms stay instant, never 60s
  // real. The seat itself has its own arm below.
  const { SEAMS } = await import("../src/provisioning.ts");
  SEAMS.readinessBackoff = async (): Promise<void> => {};
  new FakeGitSubprocess(ctx);
  options.beforeApply?.(ctx);
  const plugin: Plugin.Object = options.plugin ?? composition;
  plugin.apply(ctx, options.compositionConfig);
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
      extensions: "extensions:\n  - name: demo\n    url: https://example.invalid/demo.git\n    ref: 0a1b2c3d4e5f60718293a4b5c6d7e8f901234567\n    pip:\n      - numpy\n",
    });
    const family = await ctx.provisioning.plan({ kind: "model", owner: "family", id: "h3" });
    assert.equal(family.items.length > 0, true);
    // 2026-10-12 union: the plan carries BOTH channels — the
    // family's provisions rows ride coordinateless, the variant-cell
    // artifact keeps its (variant, quant) coordinates
    const coordinates = await ctx.provisioning.plan({ kind: "model", owner: "family", id: "krea-2-raw", variant: "raw", quant: "int8_convrot" });
    const coordinateless = coordinates.items.filter((i) => (i as Extract<ProvisionPlanItem, { kind: "model" }>).variant === undefined);
    assert.equal(coordinateless.length > 0, true, "the provisions rows ride without coordinates");
    const coordinatesItem = coordinates.items.find((i) => (i as Extract<ProvisionPlanItem, { kind: "model" }>).variant === "raw") as Extract<ProvisionPlanItem, { kind: "model" }>;
    assert.equal(coordinatesItem.quant, "int8_convrot");
    const route = await ctx.provisioning.plan({ kind: "model", owner: "family", id: "krea-2" });
    const routeItem = route.items.find((i) => (i as Extract<ProvisionPlanItem, { kind: "model" }>).variant === "turbo") as Extract<ProvisionPlanItem, { kind: "model" }>;
    assert.equal(routeItem.quant, "int8_convrot");
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

  test("the extension facts read falls back to the shipped package data when the repo facts are absent (the install shape)", async () => {
    // An installed profile has no <repoRoot>/packages tree: the
    // repo-anchored facts path is nothing. The read falls back to the
    // npm artifact's own data/model-facts.json (the shipped seed, the
    // endpoint-config idiom) — the plan still resolves, never ENOENT.
    const mounted = await mount({
      extensions: "extensions:\n  - name: demo\n    url: https://example.invalid/demo.git\n    ref: 0a1b2c3d4e5f60718293a4b5c6d7e8f901234567\n    pip:\n      - numpy\n",
    });
    rmSync(join(mounted.root, "packages", "engines", "comfyui-cordis", "data", "model-facts.json"));
    const extension = await mounted.ctx.provisioning.plan({ kind: "extension", id: "demo" });
    assert.equal(extension.items[0]?.provider, "git",
      "the plan must resolve off the shipped facts when the repo facts are absent — an ENOENT here is the audit-019 install burn one file over");
    assert.deepEqual(extension.items[0]?.nodeTypes ?? [], [],
      "the shipped facts carry no row for the fixture's pack — the node-type surface is honestly empty, never a fabricated class");
  });

  test("THE KEY-COORDINATE LAW (audit T-S4): base rows key variant-free; the artifact row keys by the resolution's own coordinates", async () => {
    const { ctx } = await mount({ server: false });
    type ModelItem = Extract<ProvisionPlanItem, { kind: "model" }>;
    const baseKeys = (plan: { readonly items: readonly ProvisionPlanItem[] }): string[] =>
      plan.items
        .filter((i): i is ModelItem => i.kind === "model" && i.variant === undefined)
        .map((i) => i.key)
        .sort();
    const asked = await ctx.provisioning.plan({ kind: "model", owner: "family", id: "krea-2-raw", variant: "raw" });
    const head = await ctx.provisioning.plan({ kind: "model", owner: "family", id: "krea-2-raw" });
    // byte-identical base bytes → ONE key whatever the caller asked
    // (the old key folded the caller's variant in: a variant=B call
    // fetched the same TE/VAE files under a second key)
    assert.deepEqual(baseKeys(head), baseKeys(asked), "same bytes, same key");
    // the artifact row records the RESOLUTION's coordinates — a
    // head-address call resolves the default variant and records a
    // REAL variant string, never a smuggled null
    const headArtifact = head.items.find((i): i is ModelItem => i.kind === "model" && i.variant !== undefined);
    assert.ok(headArtifact, "the artifact row carries a recorded variant");
    assert.equal(typeof headArtifact.variant, "string", "the coordinate is a real string, never null");
    const askedArtifact = asked.items.find((i): i is ModelItem => i.kind === "model" && i.variant === "raw");
    assert.ok(askedArtifact, "a variant-scoped ask keys its artifact row by that variant");
    assert.equal(askedArtifact.quant, headArtifact.quant, "same cell bytes, same quant coordinate");
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
    const mounted = await mount({ extensions: "extensions:\n  - name: demo\n    url: https://example.invalid/demo.git\n", facts: { extension_node_types: { demo: ["DemoNode"] }, rows: { h3: { card: "h3", card_knobs: [] } } } });
    const first = await mounted.ctx.provisioning.inspect({ kind: "extension", id: "demo" });
    const second = await mounted.ctx.provisioning.inspect({ kind: "extension", id: "demo" });
    assert.equal(first.state, "active", JSON.stringify(first));
    assert.equal(second.state, "active", JSON.stringify(second));
    assert.equal(mounted.state.calls.filter((path) => path.startsWith("/object_info")).length, 1);
    const aborted = new AbortController();
    aborted.abort();
    // CENSUS HONESTY LAW (audit F1): a pre-aborted inspect answers
    // 'unknown', never 'absent' — no verdict from silence
    assert.equal((await mounted.ctx.provisioning.inspect({ kind: "model", owner: "family", id: "h3" }, aborted.signal)).state, "unknown");
    const activationAbort = new AbortController();
    activationAbort.abort();
    assert.equal((await mounted.ctx.provisioning.activate({ kind: "model", owner: "family", id: "h3" }, {}, activationAbort.signal)).state, "cancelled");
  });

  test("covers inspector model, missing node, empty expectation, and endpoint refusal", async () => {
    const mounted = await mount({ facts: { extension_node_types: {}, rows: { h3: { card: "h3", card_knobs: [] } } }, extensions: "extensions:\n  - name: demo\n    url: https://example.invalid/demo.git\n" });
    assert.equal(mounted.state.objectInfo, "ok");
    assert.equal(process.env["MELITE_REPO_ROOT"], mounted.root);
    assert.equal(process.env["COMFYUI_ENDPOINT_CONFIG"], join(mounted.root, "packages", "engines", "comfyui-cordis", "data", "comfyui_endpoint.json"));
    const modelStatus = await mounted.ctx.provisioning.inspect({ kind: "model", owner: "family", id: "h3" });
    assert.equal(modelStatus.state, "absent", JSON.stringify(modelStatus));
    const extension = await mounted.ctx.provisioning.inspect({ kind: "extension", id: "demo" });
    assert.equal(extension.items[0]?.detail, "extension has no declared node types");
    // THE UNVERIFIABLE-EXTENSION LAW (the 2026-10-22 downloads-stream
    // audit, the rgthree burn: the pack sat installed + serving 24
    // classes while the roster wore 'absent' forever — the empty
    // expected list is CANNOT-VERIFY, never a negative verdict; the
    // install door could never converge the face). A DECL that names
    // no node types answers 'unknown' with the same detail — census
    // honesty, never a health verdict over unchecked bytes.
    assert.equal(extension.items[0]?.state, "unknown", JSON.stringify(extension.items[0]));
    assert.equal(extension.state, "unknown", JSON.stringify(extension));
    const missingFacts = await mount({ facts: { extension_node_types: { demo: ["MissingNode"] }, rows: { h3: { card: "h3", card_knobs: [] } } }, extensions: "extensions:\n  - name: demo\n    url: https://example.invalid/demo.git\n" });
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

  // THE LAZY MANAGER'S installModel DELEGATE (provisioning.ts:260).
  // The declared model arms in this composition are all provider
  // "direct" (the DECL url IS the fetch url), so the Manager's MODEL
  // installer is reachable only through the operator-confirmed
  // external acquisition — the one door where a url comes from the
  // operator rather than a declaration.
  test("the external model arm downloads through ComfyUI-Manager and verifies the landed bytes", async () => {
    const store = tempRoot("web-external-store-");
    const mounted = await mount({ store });
    const result = await mounted.ctx.provisioning.acquireExternal(
      {
        kind: "model",
        url: "https://example.invalid/model.bin",
        relativePath: "checkpoints",
        filename: "model.bin",
        sha256: MODEL_SHA,
      },
      { operatorConfirmed: true },
    );
    assert.equal(result.state, "active", JSON.stringify(result));
    // the door the delegate owns — and the composition's own fetcher
    // never stood in for it (the direct arm is the DECL's own lane)
    assert.equal(mounted.state.calls.some((path) => path === "/manager/queue/install_model"), true);
    assert.equal(mounted.state.calls.some((path) => path === "/model.bin"), false);
    assert.deepEqual(readFileSync(join(store, "checkpoints", "model.bin")), MODEL_BYTES);
  });

  test("lazy Manager covers URL and pinned git post-install paths", async () => {
    // R7: the registry key no row sets is gone — every manifest row
    // declares its url (git) or nothing (local). The registry-only
    // row and its manager-source assertion died with the field.
    const mounted = await mount({
      extensions: "extensions:\n  - name: demo\n    url: https://example.invalid/demo.git\n  - name: pinned\n    url: https://example.invalid/pinned.git\n    ref: 0a1b2c3d4e5f60718293a4b5c6d7e8f901234567\n    pip:\n      - numpy\n  - name: operator\n    url: https://example.invalid/operator.git\n  - name: local\n    url: ''\n",
    });
    const git = await mounted.ctx.provisioning.ensure({ kind: "extension", id: "demo" });
    assert.equal(git.state, "restart_required");
    const pinned = await mounted.ctx.provisioning.ensure({ kind: "extension", id: "pinned" });
    assert.equal(pinned.state, "restart_required");
    const operator = await mounted.ctx.provisioning.ensure({ kind: "extension", id: "operator" });
    assert.equal(operator.state, "restart_required");
    const local = await mounted.ctx.provisioning.ensure({ kind: "extension", id: "local" });
    assert.equal(local.state, "blocked");
  });

  test("lifecycle covers queue snapshot, restart refusal, readiness retry, abort, and timeout", async () => {
    const extensionYaml = "extensions:\n  - name: demo\n    url: https://example.invalid/demo.git\n";
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
    // The two readiness voices, PINNED (audit 2026-10-13): the arms
    // were reached but only their OUTCOME was asserted, so rewriting
    // either sentence left every suite green. The wait is bounded to
    // 120 attempts, so the exhausted wait is the real refusal here.
    assert.match(
      JSON.stringify(timedOut),
      /did not become ready after restart/,
      "the exhausted readiness wait names itself",
    );
    const aborted = await mount({ extensions: extensionYaml });
    const controller = new AbortController();
    controller.abort();
    const cancelled = await aborted.ctx.provisioning.activate({ kind: "extension", id: "demo" }, { force: true }, controller.signal);
    assert.equal(cancelled.state, "cancelled");

    // The readiness loop's OWN cancel arm (provisioning.ts:400) is not
    // what a pre-aborted signal reaches — the seat refuses earlier.
    // It fires when the abort lands INSIDE the wait, which the rig
    // makes reachable: abort from the backoff seam, then let the loop
    // come back round.
    const midWait = await mount({ extensions: extensionYaml, state: { statsFailures: 200 } });
    const { SEAMS } = await import("../src/provisioning.ts");
    const mid = new AbortController();
    SEAMS.readinessBackoff = async (): Promise<void> => { mid.abort(); };
    try {
      const stopped = await midWait.ctx.provisioning.activate({ kind: "extension", id: "demo" }, { force: true }, mid.signal);
      // What is OBSERVABLE here is the service's own fold: the seat's
      // readiness voice ("readiness wait cancelled") is caught and
      // replaced with the operation-level cancellation, so the arm's
      // string is not reachable from here. The arm fires — this
      // asserts the outcome that proves it, and the swallowed voice is
      // owed at the service's error fold, not pinned by a test that
      // cannot see it.
      assert.equal(stopped.state, "cancelled");
      assert.equal(stopped.items[0]?.errorCode, "provisioning/cancelled");
    } finally {
      SEAMS.readinessBackoff = async (): Promise<void> => {};
    }
  });

  test("lifecycle covers empty queue snapshots and endpoint loss during restart", async () => {
    const extensionYaml = "extensions:\n  - name: demo\n    url: https://example.invalid/demo.git\n";
    const emptyQueue = await mount({ extensions: extensionYaml, queue: { active: "", queued_ids: ["queued"] } });
    assert.equal((await emptyQueue.ctx.provisioning.activate({ kind: "extension", id: "demo" }, { force: true })).state, "active");

    let statusPath = "";
    const statusMount = await mount({
      extensions: extensionYaml,
      state: { onInstall: () => writeFileSync(statusPath, JSON.stringify({ url: "", provision: "managed" })) },
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
      extensions: "extensions:\n  - name: demo\n    url: https://example.invalid/demo.git\n",
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
      extensions: "extensions:\n  - name: offline\n    url: https://example.invalid/offline.git\n",
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
    // arm imports a FRESH graph (the :516 pattern) so the backoff is
    // the production one, seats a plain timer (J7: production sleeps
    // through SEAMS.sleep, seated at apply from the fiber-scoped
    // ctx.timeout — an unseated holder refuses loud, so the arm
    // seats the same shape apply does), then exercises both exits:
    // the full sleep and the abort cancellation.
    vi.resetModules();
    const { SEAMS } = await import("../src/provisioning.ts");
    SEAMS.sleep = (ms: number): Promise<void> => new Promise((resolve) => { setTimeout(resolve, ms); });
    // the unseated holder refuses loud (the composition's inject
    // guarantees a mounted graph seats it first)
    vi.resetModules();
    const bare = (await import("../src/provisioning.ts")).SEAMS;
    await assert.rejects(bare.readinessBackoff(), /timer seat not mounted/);
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

  test("the production backoff's settle arms detach the listener (a settled sleep, a live signal)", async () => {
    // The abort arm above rejects before the sleep settles, so the
    // then-callbacks never ran. These arms settle the sleep while the
    // signal lives: the fulfillment detaches the listener and resolves;
    // the sleep's own rejection detaches and propagates.
    vi.resetModules();
    const { SEAMS } = await import("../src/provisioning.ts");
    const controller = new AbortController();
    SEAMS.sleep = (): Promise<void> => Promise.resolve();
    await SEAMS.readinessBackoff(controller.signal);
    const boom = new Error("timer seat died");
    SEAMS.sleep = (): Promise<void> => Promise.reject(boom);
    await assert.rejects(
      SEAMS.readinessBackoff(new AbortController().signal),
      (error: unknown) => error === boom,
    );
  });

  test("apply seats the fiber-scoped timer (J7: ctx.timeout, never a bare setTimeout)", async () => {
    vi.resetModules();
    const { SEAMS, default: composition } = await import("../src/provisioning.ts");
    const calls: number[] = [];
    const mounted = await mount({
      plugin: composition,
      beforeApply: (ctx) => {
        // the structural seat apply reads: the two-cordis topology
        // law forbids instanceof across copies, so the rig installs
        // the same shape the vendored timer plugin mixes in
        (ctx as unknown as { timeout(delay: number): Promise<void> }).timeout =
          (delay: number): Promise<void> => { calls.push(delay); return Promise.resolve(); };
      },
    });
    await mounted.ctx.provisioning.inspect({ kind: "model", owner: "family", id: "h3" }).catch(() => {});
    assert.deepEqual(calls, [], "no arm raced the backoff uninvited");
    await SEAMS.sleep(500);
    assert.deepEqual(calls, [500], "SEAMS.sleep rides the ctx.timeout seat apply installed");
  });

  test("object-info preserves non-Error rejection detail", async () => {
    vi.resetModules();
    const freshComposition = (await import("../src/provisioning.ts")).default;
    sdkClientMock.mockImplementationOnce(() => ({ fetchApi: async () => { throw "raw-object-info-error"; } }));
    const mounted = await mount({
      plugin: freshComposition,
      extensions: "extensions:\n  - name: raw-error\n    url: https://example.invalid/raw-error.git\n",
    });
    const result = await mounted.ctx.provisioning.inspect({ kind: "extension", id: "raw-error" });
    assert.equal(result.state, "failed");
    assert.match(result.items[0]?.detail ?? "", /raw-object-info-error/);
  });
});

describe("the store root's resolve (V8: the composition pin and the loud empty-key refusal)", () => {
  test("a composition storeRoot pins the service's writer root when the endpoint names no path", async () => {
    const store = tempRoot("web-store-pin-");
    const mounted = await mount({ compositionConfig: { storeRoot: store } });
    // Structural read, never instanceof — the test's Context import is
    // a different cordis copy than the service's (the two-cordis
    // topology law, provisioning.ts:538 the same precedent).
    const service = (mounted.ctx as unknown as { provisioning?: { readonly writerRoot?: string } }).provisioning;
    assert.equal(service?.writerRoot, store);
  });

  test("a present-but-empty endpoint store key refuses the mount loud", async () => {
    // loadStoreRoot's own law lands here as a mount refusal: the key
    // exists with "" — never guessed, never silently inherited.
    await assert.rejects(mount({ endpoint: { model_download_path: "" } }), /EMPTY in the endpoint config/);
  });
});

describe("the direct arm's idle dial (the 9.35GB cure, 2026-10-10)", () => {
  const CHUNK = Uint8Array.of(1, 2, 3);

  function chunkedServer(route: string, gaps: () => number | null): { server: Server, url: () => string } {
    const server = createServer((req, res) => {
      if (req.url !== route) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { "content-type": "application/octet-stream" });
      let remaining = 10;
      const emit = (): void => {
        const gap = gaps();
        if (gap === null) return; // stalled: never another chunk
        setTimeout(() => {
          res.write(CHUNK);
          remaining -= 1;
          if (remaining > 0) emit();
          else res.end();
        }, gap);
      };
      emit();
    });
    servers.push(server);
    return { server, url: () => `http://127.0.0.1:${String((server.address() as { port: number }).port)}${route}` };
  }

  afterEach(async () => {
    for (const server of servers.splice(0)) await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test("a flowing stream outlives the dial — the bound is idle, never duration", async () => {
    // chunks every 20ms for 200ms total: four times the 50ms dial,
    // the exact shape a 9.35GB weight takes on lane bandwidth.
    const { server, url } = chunkedServer("/slow.bin", () => 20);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const fetcher = idleDialFetch(50);
    const response = await fetcher(url());
    assert.equal(response.status, 200);
    const reader = (response.body ?? new ReadableStream<Uint8Array>()).getReader();
    let chunks = 0;
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      chunks += 1;
    }
    assert.equal(chunks, 10);
  });

  test("a stalled source trips the dial and aborts the read", async () => {
    // first chunk at once, then silence forever past the dial.
    let emitted = false;
    const { server, url } = chunkedServer("/stall.bin", () => (emitted ? null : (emitted = true, 0)));
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const fetcher = idleDialFetch(50);
    const response = await fetcher(url());
    const reader = (response.body ?? new ReadableStream<Uint8Array>()).getReader();
    const first = await reader.read();
    assert.equal(first.done, false);
    await assert.rejects(() => reader.read(), /abort/i);
  });

  test("a caller's signal rides the direct arm — the raw body, no idle dial", async () => {
    const { server, url } = chunkedServer("/signaled.bin", () => 0);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const response = await idleDialFetch(5)(url(), new AbortController().signal);
    assert.equal(response.status, 200);
    const reader = (response.body ?? new ReadableStream<Uint8Array>()).getReader();
    let chunks = 0;
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      assert.deepEqual(Array.from(chunk.value), [1, 2, 3]);
      chunks += 1;
    }
    assert.equal(chunks, 10);
  });

  test("a body-less 204 returns a null body without arming a poke", async () => {
    const server = createServer((_req, res) => { res.writeHead(204); res.end(); });
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const url = `http://127.0.0.1:${String((server.address() as { port: number }).port)}/empty`;
    const response = await idleDialFetch(50)(url);
    assert.equal(response.status, 204);
    assert.equal(response.body, null);
  });

  test("a refused connection throws through the catch's clear", async () => {
    const server = createServer(() => undefined);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const url = `http://127.0.0.1:${String((server.address() as { port: number }).port)}/gone`;
    await new Promise<void>((resolve) => server.close(() => resolve()));
    // the long dial keeps the bound off while the refusal lands — the
    // fetch error itself propagates (the exact prod shape: a host
    // that refuses, not one that stalls).
    await assert.rejects(idleDialFetch(5000)(url), (error: unknown) => error instanceof Error);
  });
});

describe("the direct arm's range resume on the wire (audit download-stack-audit-2026-10-20 F7)", () => {
  afterEach(async () => {
    for (const server of servers.splice(0)) await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test("a resume request rides the wire as Range: bytes=N- and the 206's Content-Range total is parsed", async () => {
    const SUFFIX = Uint8Array.of(4, 5, 6);
    const server = createServer((req, res) => {
      res.writeHead(206, {
        "content-type": "application/octet-stream",
        "content-range": "bytes 39-41/100",
      });
      res.end(SUFFIX);
      void req;
    });
    servers.push(server);
    const reqRange = new Promise<string | undefined>((resolve) => {
      server.on("request", (req) => { resolve(req.headers.range); });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const url = `http://127.0.0.1:${String((server.address() as { port: number }).port)}/resume.bin`;
    const response = await idleDialFetch(5_000)(url, undefined, { rangeFrom: 39 });
    assert.equal(await reqRange, "bytes=39-");
    assert.equal(response.status, 206);
    assert.equal(response.resumedFrom, 39);
    assert.equal(response.totalBytes, 100);
    const chunks: Buffer[] = [];
    const reader = (response.body ?? new ReadableStream<Uint8Array>()).getReader();
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      chunks.push(Buffer.from(chunk.value));
    }
    assert.deepEqual(Buffer.concat(chunks), Buffer.from(SUFFIX));
  });

  test("a plain fetch carries no Range header and no resume facts", async () => {
    const server = createServer((_req, res) => {
      res.writeHead(200, { "content-type": "application/octet-stream" });
      res.end(Uint8Array.of(1, 2, 3));
    });
    servers.push(server);
    const reqRange = new Promise<string | undefined>((resolve) => {
      server.on("request", (req) => { resolve(req.headers.range); });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const url = `http://127.0.0.1:${String((server.address() as { port: number }).port)}/whole.bin`;
    const response = await idleDialFetch(5_000)(url);
    assert.equal(await reqRange, undefined);
    assert.equal(response.status, 200);
    assert.equal(response.resumedFrom, undefined);
    assert.equal(response.totalBytes, undefined);
  });

  test("a 206 with an unparseable total parses the offset and leaves the total to the plan", async () => {
    const server = createServer((_req, res) => {
      res.writeHead(206, {
        "content-type": "application/octet-stream",
        "content-range": "bytes 39-41/*",
      });
      res.end(Uint8Array.of(4, 5, 6));
    });
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const url = `http://127.0.0.1:${String((server.address() as { port: number }).port)}/unknown-total.bin`;
    const response = await idleDialFetch(5_000)(url, undefined, { rangeFrom: 39 });
    assert.equal(response.status, 206);
    assert.equal(response.resumedFrom, 39);
    assert.equal(response.totalBytes, undefined, "a star total falls back to the plan's declared size");
  });
});
