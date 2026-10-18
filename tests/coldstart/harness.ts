// tests/coldstart/harness — the cold-start tier's machinery: a scratch
// ComfyUI core at core.pin seeded with ONLY ComfyUI-Manager at
// manager.pin, booted on an ephemeral port with an empty model tree,
// and a ProvisioningService wired exactly like the estate composition
// (packages/web/melite-estate/src/provisioning.ts) with its Manager
// port pointed at the scratch engine. Every constant rides the
// repo's declared truth: the pins from infra/comfyui/, the rows from
// the card-kit impact facts and the qwen-img-edit-21 DECL, the
// seeds from the provisioner's own writers. Never a hand-rolled
// download — the arms ride ComfyUiManagerProvider (the estate's
// Manager proxy) and nothing else.
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { createServer } from "node:net";
import {
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Context } from "@deepseek-ai/cordis";
import {
  ComfyUiManagerHttpClient,
  ComfyUiManagerProvider,
  FileOperationStore,
  ProvisioningService,
  VerifiedArtifactWriter,
} from "@melite/estate-provisioning";
import type {
  DeclarationPort,
  ManagerPort,
  ManagerModelInstallRequest,
  ProvisionPlan,
  ResourceRef,
} from "@melite/estate-provisioning";
import { mergeManifest } from "@melite/comfyui-cordis/provisioning-manifest";
import { IMPACT_DETECTOR_PROVISIONS } from "@melite/comfyui-card-kit/impact";
import { DECL } from "@melite/models-qwen-img-edit-21";
import {
  ensureManagerSecurityWeak,
  MELITE_MODEL_BASE,
  writeManagerLocalModelList,
} from "../../packages/engines/comfyui-cordis/scripts/provision-models.ts";
import { pinManagerConfig } from "../../packages/engines/comfyui-cordis/scripts/provision-instance-managed.ts";
import { venvPython } from "../../packages/engines/comfyui-cordis/scripts/provision-shared.ts";

/** The repository root (tests/coldstart sits two levels down). */
export const REPO_ROOT: string = join(fileURLToPath(import.meta.url), "..", "..", "..");

/** The scratch tree parent — data/runtime is the untracked runtime area. */
export const SCRATCH_PARENT: string = join(REPO_ROOT, "data", "runtime");

const CORE_URL = "https://github.com/comfyanonymous/ComfyUI.git";
const MANAGER_URL = "https://github.com/Comfy-Org/ComfyUI-Manager.git";
const MANAGER_DIR = join("custom_nodes", "comfyui-manager");

/** Pin text from an infra/comfyui/*.pin file — the provisioner's own
 *  reader shape (comments stripped, first bare line wins). */
export function readPin(name: string): string {
  return readFileSync(join(REPO_ROOT, "infra", "comfyui", name), "utf8")
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l !== "" && !l.startsWith("#")) ?? "";
}

/** The estate venv's python — the live engine's own interpreter
 *  (engines.comfyui.live_root from the endpoint facts). */
export function estateVenvPython(): string {
  const facts = JSON.parse(
    readFileSync(join(REPO_ROOT, "data", "inference.local.json"), "utf8"),
  ) as { engines?: { comfyui?: { live_root?: string } } };
  const liveRoot = facts.engines?.comfyui?.live_root ?? "";
  if (liveRoot === "") return "";
  // live_root is the ENGINE root; the estate venv rides inside it
  // (the managed instance layout: <live_root>/.venv/bin/python).
  return venvPython(join(liveRoot, ".venv"));
}

/** Everything that makes the tier unrunnable on this machine, named
 *  for the skip-loud contract: the tier never fails soft — it prints
 *  exactly what is missing and skips. */
export async function preflightMisses(): Promise<readonly string[]> {
  const misses: string[] = [];
  const corePin = readPin("core.pin");
  const managerPin = readPin("manager.pin");
  if (!/^[0-9a-f]{40}$/.test(corePin)) misses.push("infra/comfyui/core.pin unreadable");
  if (!/^[0-9a-f]{40}$/.test(managerPin)) misses.push("infra/comfyui/manager.pin unreadable");
  if (estateVenvPython() === "" || !existsSync(estateVenvPython())) {
    misses.push("estate venv python not found (engines.comfyui.live_root)");
  }
  if (spawnSync("git", ["--version"]).status !== 0) misses.push("git is not on PATH");
  for (const url of ["https://github.com", "https://huggingface.co"]) {
    try {
      const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5_000) });
      if (response.status >= 500) misses.push(url + " answered " + String(response.status));
    } catch (error: unknown) {
      misses.push(url + " unreachable: " + (error instanceof Error ? error.message : String(error)));
    }
  }
  return misses;
}

/** THE DECLARED ROWS the tier provisions — read from the SSOTs, never
 *  restated: the smallest Impact detector (the card-kit facts row),
 *  and the 21 family's consistency-lora provision (the DECL row).
 *  Both rows must declare their size — the tier's verification is the
 *  declared size AND digest, so a row without one refuses here. */
export function declaredRows(): {
  readonly hand: { readonly name: string; readonly url: string; readonly folder: string; readonly sha256: string; readonly size_bytes: number };
  readonly lora: { readonly name: string; readonly url: string; readonly folder: string; readonly sha256: string; readonly size_bytes: number };
} {
  const sized = (row: { readonly name: string; readonly url: string; readonly folder: string; readonly sha256: string; readonly size_bytes?: number }) => {
    if (row.size_bytes === undefined) {
      throw new Error("the declared row " + row.name + " carries no size_bytes — the tier verifies size AND digest");
    }
    return row as typeof row & { readonly size_bytes: number };
  };
  const hand = IMPACT_DETECTOR_PROVISIONS.find((row) => row.name === "hand_yolov8s.pt");
  const lora = (DECL.provisions ?? []).find((row) => row.folder === "loras/qwen-img-edit-21");
  if (hand === undefined) throw new Error("hand_yolov8s.pt missing from the card-kit impact facts");
  if (lora === undefined) throw new Error("the qwen-img-edit-21 DECL lost its consistency-lora provision row");
  return { hand: sized(hand), lora: sized(lora) };
}

/** Clone `url` into `dest` at `pin` — the provisioner's own sequence
 *  (cmdSync/vendorManager): init, remote, fetch --depth 1 by sha,
 *  checkout --force FETCH_HEAD. */
export function pinnedClone(url: string, pin: string, dest: string): void {
  const git = (args: readonly string[]): void => {
    const result = spawnSync("git", args, { encoding: "utf8" });
    if (result.status !== 0) {
      throw new Error("git " + args.join(" ") + " failed: " + result.stderr.trim());
    }
  };
  mkdirSync(dest, { recursive: true });
  git(["init", "--quiet", dest]);
  git(["-C", dest, "remote", "add", "origin", url]);
  git(["-C", dest, "fetch", "--quiet", "--depth", "1", "origin", pin]);
  git(["-C", dest, "checkout", "--force", "--quiet", "FETCH_HEAD"]);
}

/** HEAD of a git tree, trimmed. */
export function gitHead(dir: string): string {
  const result = spawnSync("git", ["-C", dir, "rev-parse", "HEAD"], { encoding: "utf8" });
  if (result.status !== 0) throw new Error("rev-parse failed in " + dir + ": " + result.stderr.trim());
  return result.stdout.trim();
}

/** The Manager-landed pack directory under `customNodesRoot`, matched by
 *  the pinned HEAD rather than by name — Manager derives the landing
 *  directory from the repo url (lowercased `comfyui-impact-pack`), not
 *  from the declared pack name (`ComfyUI-Impact-Pack`), so the tier
 *  must discover the landing, never assume the manifest casing. A
 *  missing landing is the caller's failure, not a silent skip: the
 *  helper returns undefined and the arm asserts on it. */
export function landedPackDir(customNodesRoot: string, ref: string): string | undefined {
  for (const entry of readdirSync(customNodesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === "__pycache__") continue;
    const dir = join(customNodesRoot, entry.name);
    try {
      if (gitHead(dir) === ref) return dir;
    } catch {
      continue;
    }
  }
  return undefined;
}

const WEIGHT_EXTENSIONS = new Set([".safetensors", ".pt", ".pth", ".ckpt", ".bin", ".gguf", ".sft"]);

function walkFiles(root: string, into: string[]): void {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) walkFiles(path, into);
    else if (entry.isFile()) into.push(path);
  }
}

/** Weight-bearing files anywhere under `root` — the cold census
 *  counts ZERO of these before any provisioning call. The core's own
 *  shipped placeholders (put_*_here, models/configs/*.yaml) are not
 *  weights and never match. */
export function censusWeightFiles(root: string): readonly string[] {
  const files: string[] = [];
  walkFiles(root, files);
  return files.filter((file) => {
    const dot = file.lastIndexOf(".");
    return dot >= 0 && WEIGHT_EXTENSIONS.has(file.slice(dot));
  });
}

/** Pack directories under custom_nodes (files and __pycache__ are
 *  not packs). */
export function censusPackDirs(coreRoot: string): readonly string[] {
  return readdirSync(join(coreRoot, "custom_nodes"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "__pycache__")
    .map((entry) => entry.name)
    .sort();
}

export function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export interface ScratchEngine {
  readonly scratchRoot: string;
  readonly coreRoot: string;
  readonly modelsRoot: string;
  readonly baseUrl: string;
  readonly port: number;
  readonly corePin: string;
  readonly managerPin: string;
  readonly venvPython: string;
}

export interface ColdStartWorld {
  readonly engine: ScratchEngine;
  readonly service: ProvisioningService;
  readonly client: ComfyUiManagerHttpClient;
  readonly hand: ReturnType<typeof declaredRows>["hand"];
  readonly lora: ReturnType<typeof declaredRows>["lora"];
  readonly extension: { readonly name: string; readonly url: string; readonly ref: string; readonly pip: readonly string[] };
  readonly process: ChildProcess;
}

async function freePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = address !== null && typeof address === "object" ? address.port : 0;
      server.close(() => {
        if (port === 8188) reject(new Error("ephemeral port draw hit the live engine's port — refusing"));
        else resolve(port);
      });
    });
    server.on("error", reject);
  });
}

async function waitUntilReady(baseUrl: string, timeoutMs: number, logPath: string): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError = "";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl + "/system_stats", { signal: AbortSignal.timeout(5_000) });
      if (response.ok) return;
      lastError = "status " + String(response.status);
    } catch (error: unknown) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => { setTimeout(resolve, 1_000); });
  }
  const log = existsSync(logPath)
    ? readFileSync(logPath, "utf8").split("\n").slice(-40).join("\n")
    : "(no engine log written)";
  throw new Error("the scratch engine never became ready (" + lastError + ") — log tail:\n" + log);
}

/** Boot the whole cold world: scratch tree, pinned core, Manager seed,
 *  provisioner seeds (config pins + the declared model-list channel),
 *  engine on an ephemeral port, and the ProvisioningService whose
 *  Manager port answers at that engine. */
export async function bootColdStartWorld(scratchRoot: string): Promise<ColdStartWorld> {
  const corePin = readPin("core.pin");
  const managerPin = readPin("manager.pin");
  const python = estateVenvPython();
  const coreRoot = join(scratchRoot, "core");
  const modelsRoot = join(coreRoot, "models");

  mkdirSync(join(scratchRoot, "input"), { recursive: true });
  mkdirSync(join(scratchRoot, "output"), { recursive: true });
  mkdirSync(join(scratchRoot, "temp"), { recursive: true });

  pinnedClone(CORE_URL, corePin, coreRoot);
  pinnedClone(MANAGER_URL, managerPin, join(coreRoot, MANAGER_DIR));
  const landedCore = gitHead(coreRoot);
  if (landedCore !== corePin) {
    throw new Error("the scratch core landed at " + landedCore + ", not the core.pin " + corePin);
  }

  // THE PROVISIONER'S OWN SEEDS (provision-models.ts /
  // provision-instance-managed.ts): the manager config pins (channel
  // url, allow flags) then the weak security line the declared-row
  // model channel needs — both written before first boot, exactly as
  // the managed instance is built.
  pinManagerConfig(coreRoot);
  ensureManagerSecurityWeak(join(coreRoot, "user", "__manager", "config.ini"));

  const rows = declaredRows();
  writeManagerLocalModelList(join(coreRoot, MANAGER_DIR, "model-list.json"), [
    { family: "image-edit", row: rows.hand },
    { family: "qwen-img-edit-21", row: rows.lora },
  ]);

  const extension = mergeManifest(REPO_ROOT).find((row) => row.name === "comfyui-impact-pack");
  if (extension === undefined) {
    throw new Error("comfyui-impact-pack missing from the merged extensions manifest");
  }

  const port = await freePort();
  const baseUrl = "http://127.0.0.1:" + String(port);
  const logPath = join(scratchRoot, "engine.log");
  const logFd = openSync(logPath, "a");
  const child = spawn(python, [
    "main.py",
    "--listen", "127.0.0.1",
    "--port", String(port),
    "--cpu",
    "--input-directory", join(scratchRoot, "input"),
    "--output-directory", join(scratchRoot, "output"),
    "--temp-directory", join(scratchRoot, "temp"),
    "--user-directory", "user",
  ], { cwd: coreRoot, stdio: ["ignore", logFd, logFd], env: { ...process.env, PYTHONUNBUFFERED: "1" } });

  await waitUntilReady(baseUrl, 300_000, logPath);

  // THE ESTATE'S OWN WIRING (packages/web/melite-estate/
  // src/provisioning.ts): the same client/provider/service classes,
  // the same VerifiedArtifactWriter over the engine's model tree,
  // the same FileOperationStore — only the baseUrl and store root
  // move to the scratch tree. The declaration port plans the REAL
  // SSOT rows; the manager wrapper adds the declared-row tags the
  // service's catalog-only arm omits (provision-models.ts:552 — the
  // sanctioned declared channel), so every download rides Manager's
  // own queue, never a hand-rolled fetch.
  const client = new ComfyUiManagerHttpClient({ baseUrl, requestTimeoutMs: 30_000, queueTimeoutMs: 900_000 });
  const provider = new ComfyUiManagerProvider(client);
  const manager: ManagerPort = {
    canInstall: async (request, signal) => await provider.canInstall(request, signal),
    install: async (request, signal) => await provider.install(request, signal),
    installModel: async (request: ManagerModelInstallRequest, signal) => await provider.installModel(
      { ...request, type: MELITE_MODEL_BASE, base: MELITE_MODEL_BASE }, signal),
  };
  const plans = new Map<string, ProvisionPlan>();
  const keyOf = (ref: ResourceRef): string =>
    ref.kind + ":" + (("owner" in ref ? ref.owner + ":" : "") + ref.id);
  for (const plan of [
    {
      ref: { kind: "extension", id: extension.name },
      items: [{
        kind: "extension",
        key: "extension:" + extension.name,
        id: extension.name,
        url: extension.url,
        required: true,
        provider: "git",
        ...(extension.ref.trim() === "" ? {} : { ref: extension.ref }),
        ...(extension.version.trim() === "" ? {} : { version: extension.version }),
        requirements: [...extension.pip],
        nodeTypes: [],
      }],
    },
    {
      ref: { kind: "model", owner: "card", id: "image-edit" },
      items: [{
        kind: "model",
        key: "image-edit:" + rows.hand.name,
        owner: "card",
        id: "image-edit",
        name: rows.hand.name,
        folder: rows.hand.folder,
        url: rows.hand.url,
        sha256: rows.hand.sha256,
        sizeBytes: rows.hand.size_bytes,
        required: true,
        provider: "manager",
      }],
    },
    {
      ref: { kind: "model", owner: "family", id: "qwen-img-edit-21" },
      items: [{
        kind: "model",
        key: "qwen-img-edit-21:" + rows.lora.name,
        owner: "family",
        id: "qwen-img-edit-21",
        name: rows.lora.name,
        folder: rows.lora.folder,
        url: rows.lora.url,
        sha256: rows.lora.sha256,
        sizeBytes: rows.lora.size_bytes,
        required: true,
        provider: "manager",
      }],
    },
  ] as const satisfies readonly ProvisionPlan[]) {
    plans.set(keyOf(plan.ref), plan);
  }
  const declaration: DeclarationPort = {
    resolve: async (ref: ResourceRef): Promise<ProvisionPlan> => {
      const plan = plans.get(keyOf(ref));
      if (plan === undefined) throw new Error("the cold-start tier declares no plan for " + keyOf(ref));
      return plan;
    },
    list: async (): Promise<readonly ResourceRef[]> => [...plans.values()].map((plan) => plan.ref),
  };

  const service = new ProvisioningService(new Context(), {
    declaration,
    artifactWriter: new VerifiedArtifactWriter(modelsRoot),
    storeRoot: modelsRoot,
    manager,
    lifecycle: {
      activeRuns: async (): Promise<readonly string[]> => [],
      restart: async (signal) => {
        try {
          await client.post("/manager/reboot", {}, { signal });
        } catch (error: unknown) {
          if (!(error instanceof Error) || !/fetch failed|aborted|ECONNRESET|socket/i.test(error.message)) throw error;
        }
      },
      waitUntilReady: async (signal) => {
        for (let attempt = 0; attempt < 300; attempt += 1) {
          if (signal?.aborted === true) throw new Error("readiness wait cancelled");
          try {
            const response = await fetch(baseUrl + "/system_stats", { signal: AbortSignal.timeout(5_000) });
            if (response.ok) return;
          } catch { /* not up yet — the retry owns the wait */ }
          await new Promise((resolve) => { setTimeout(resolve, 1_000); });
        }
        throw new Error("the scratch engine did not come back after restart");
      },
    },
    operationStore: new FileOperationStore(join(scratchRoot, "operations")),
    // The tier IS the opt-in managed lane — its own run is the consent.
    writeGuard: (): boolean => true,
  });

  return {
    engine: { scratchRoot, coreRoot, modelsRoot, baseUrl, port, corePin, managerPin, venvPython: python },
    service,
    client,
    hand: rows.hand,
    lora: rows.lora,
    extension: { name: extension.name, url: extension.url, ref: extension.ref, pip: extension.pip },
    process: child,
  };
}

/** Kill the scratch engine by recorded pid, wait for its exit, then
 *  sweep /proc for any survivor bound to the scratch port (a Manager
 *  reboot re-execs the server under a new pid). */
export async function killScratchEngine(world: ColdStartWorld): Promise<void> {
  const portArg = "--port\u0000" + String(world.engine.port);
  try { world.process.kill("SIGTERM"); } catch { /* already gone */ }
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (world.process.exitCode !== null || world.process.signalCode !== null) break;
    await new Promise((resolve) => { setTimeout(resolve, 250); });
  }
  for (const pid of scratchSurvivors(portArg)) {
    try { process.kill(pid, "SIGKILL"); } catch { /* raced to exit */ }
  }
  if (world.process.pid !== undefined) {
    try { process.kill(world.process.pid, "SIGKILL"); } catch { /* already gone */ }
  }
}

function scratchSurvivors(portArg: string): readonly number[] {
  const survivors: number[] = [];
  if (!existsSync("/proc")) return survivors;
  for (const entry of readdirSync("/proc")) {
    if (!/^[0-9]+$/.test(entry)) continue;
    try {
      const cmdline = readFileSync(join("/proc", entry, "cmdline"), "utf8");
      if (cmdline.includes("main.py") && cmdline.includes(portArg)) {
        survivors.push(Number(entry));
      }
    } catch { /* the process exited between listing and reading */ }
  }
  return survivors.filter((pid) => pid !== process.pid);
}

/** Remove the scratch tree — refused unless it is one of this tier's
 *  own coldstart-* directories under data/runtime. */
export function teardownScratch(scratchRoot: string): void {
  const resolved = scratchRoot.replaceAll("\\", "/");
  const parent = SCRATCH_PARENT.replaceAll("\\", "/");
  if (!resolved.startsWith(parent + "/coldstart-")) {
    throw new Error("refused to tear down " + scratchRoot + " — not a coldstart scratch tree");
  }
  rmSync(scratchRoot, { recursive: true, force: true });
}

/** Fresh unique scratch root under data/runtime. */
export function newScratchRoot(): string {
  const root = join(SCRATCH_PARENT, "coldstart-" + String(Date.now()) + "-" + String(process.pid));
  mkdirSync(root, { recursive: true });
  return root;
}

/** Size of a file, in bytes. */
export function sizeOf(path: string): number {
  return statSync(path).size;
}
