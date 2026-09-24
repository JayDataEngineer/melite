import { join } from "node:path";
import type { Context, Plugin } from "@deepseek-ai/cordis";
import {
  ComfyUiManagerHttpClient,
  ComfyUiManagerProvider,
  FileOperationStore,
  PinnedGitExtensionProvider,
  VerifiedArtifactWriter,
  ProvisioningService,
  type DeclarationPort,
  type ManagerInstallRequest,
  type ManagerModelInstallRequest,
  type ManagerPort,
  type ProvisionPlan,
  type ProvisionPlanItem,
  type ProvisioningConfig,
  type ResourceRef,
} from "@melite/estate-provisioning";
import {
  loadEndpointConfig,
  loadFacts,
  modelsService,
  resolveRepoRoot,
  runtimeModelsRoot,
  sdkClient,
  type CardDefinition,
  type ModelDecl,
  type ProvisionRow,
} from "@melite/comfyui-cordis";
import { mergeManifest } from "@melite/comfyui-cordis/provisioning-manifest";
import { resolveStoreRoot } from "@melite/estate-models";
import { factsPath } from "@melite/estate-queue";

interface CardService {
  defsSync(): Map<string, CardDefinition>;
}

interface QueueService {
  core: {
    snapshot(): { queued_ids: string[]; active: string };
  };
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function endpointUrl(): string {
  return stringValue(loadEndpointConfig()["url"]);
}

function configuredStoreRoot(): string | undefined {
  const cfg = loadEndpointConfig();
  const value = stringValue(cfg["model_download_path"] ?? cfg["model_base_path"]);
  if (value !== "") return value;
  try {
    return resolveStoreRoot(resolveRepoRoot());
  } catch {
    return undefined;
  }
}

function modelRefKey(ref: Extract<ResourceRef, { kind: "model" }>, name: string): string {
  return [
    "model",
    ref.owner,
    ref.id,
    ref.variant ?? "",
    ref.quant ?? "",
    name,
  ].join(":");
}

function extensionKey(id: string): string {
  return `extension:${id}`;
}

function familyPlan(
  ref: Extract<ResourceRef, { kind: "model" }>,
  decl: ModelDecl,
): ProvisionPlan {
  const rows = decl.provisions ?? [];
  if (rows.length > 0) {
    return {
      ref,
      items: rows.map((row) => modelPlanItem(ref, row, "direct")),
    };
  }
  const resolved = modelsService().resolve(
    ref.id,
    ref.variant ?? null,
    ref.quant ?? null,
  );
  const artifact = resolved.cell?.artifact;
  if (artifact === undefined || artifact === null) {
    throw new Error(`model "${ref.id}" declares no downloadable provisions`);
  }
  const row: ProvisionRow = {
    name: artifact.source_url.split("/").pop() ?? "",
    url: artifact.source_url,
    folder: artifact.dest_sub,
    sha256: artifact.sha256,
    size_bytes: artifact.size_bytes,
  };
  return { ref, items: [modelPlanItem(ref, row, "direct", ref.variant, ref.quant)] };
}

function modelPlanItem(
  ref: Extract<ResourceRef, { kind: "model" }>,
  row: ProvisionRow,
  provider: string,
  variant?: string,
  quant?: string,
): ProvisionPlanItem {
  return {
    kind: "model",
    key: modelRefKey(ref, row.name),
    owner: ref.owner,
    id: ref.id,
    name: row.name,
    folder: row.folder,
    url: row.url,
    sha256: row.sha256,
    sizeBytes: row.size_bytes,
    required: true,
    provider,
    ...(variant === undefined ? {} : { variant }),
    ...(quant === undefined ? {} : { quant }),
  };
}

function extensionPlan(
  ref: Extract<ResourceRef, { kind: "extension" }>,
  row: {
    readonly name: string;
    readonly registry: string;
    readonly version: string;
    readonly url: string;
    readonly ref: string;
    readonly pip: readonly string[];
  },
  nodeTypes: readonly string[],
): ProvisionPlan {
  const source = row.url.trim() !== ""
    ? "git"
    : row.registry.trim() !== ""
      ? "manager"
      : "local";
  return {
    ref,
    items: [{
      kind: "extension",
      key: extensionKey(ref.id),
      id: ref.id,
      ...(row.url.trim() === "" ? {} : { url: row.url.trim() }),
      required: true,
      provider: source,
      ...(row.ref.trim() === "" ? {} : { ref: row.ref.trim() }),
      ...(row.version.trim() === "" ? {} : { version: row.version.trim() }),
      ...(row.registry.trim() === "" ? {} : { registry: row.registry.trim() }),
      requirements: [...row.pip],
      nodeTypes: [...nodeTypes],
    }],
  };
}

function extensionManifest(repoRoot: string): Map<string, {
  readonly name: string;
  readonly registry: string;
  readonly version: string;
  readonly url: string;
  readonly ref: string;
  readonly pip: readonly string[];
}> {
  const rows = mergeManifest(repoRoot);
  return new Map(rows.map((row) => [row.name, row]));
}

function cardProvisions(cards: CardService, id: string): ProvisionRow[] {
  const def = cards.defsSync().get(id);
  if (def === undefined) throw new Error(`unknown card "${id}"`);
  return [...(def.provisions ?? [])];
}

function lazyManager(): ManagerPort {
  let provider: ComfyUiManagerProvider | undefined;
  const get = (): ComfyUiManagerProvider => {
    if (provider !== undefined) return provider;
    const url = endpointUrl();
    if (url === "") throw new Error("ComfyUI endpoint URL is not configured");
    const client = new ComfyUiManagerHttpClient({
      baseUrl: url,
      requestTimeoutMs: 30_000,
      queueTimeoutMs: 300_000,
    });
    const git = new PinnedGitExtensionProvider({
      customNodesRoot: join(runtimeModelsRoot(resolveRepoRoot()).replace(/\/models$/u, ""), "custom_nodes"),
       postInstall: async ({ requirements, signal }: { requirements: readonly string[]; signal?: AbortSignal }): Promise<void> => {
         if (requirements.length > 0) {
           await client.postText("/customnode/install/pip", requirements.join("\n"), {
             ...(signal === undefined ? {} : { signal }),
           });
         }
       },
    });
    provider = new ComfyUiManagerProvider(client, { git });
    return provider;
  };
  return {
    canInstall: async (request: ManagerInstallRequest, signal?: AbortSignal): Promise<boolean> => await get().canInstall(request, signal),
    install: async (request: ManagerInstallRequest, signal?: AbortSignal) => await get().install(request, signal),
    installModel: async (request: ManagerModelInstallRequest, signal?: AbortSignal) => await get().installModel(request, signal),
  };
}

// THE CANCELLABLE NODE-DEFS DIAL (the no-hang law): the SDK's
// getNodeDefs carries no signal — one blackholed engine hangs every
// extension inspect past the status plane's wall (19 manifest rows,
// sequential). The inspector dials the same /object_info door
// through the SDK's own public fetchApi with a linked signal (the
// caller's abort + a 2s dial bound — the waitUntilReady dial
// precedent; LAN engines answer in ms, the bound only bites the
// absent), and the doc rides process-life memo: success caches per
// url (the transport oiCache precedent — ~3.5MB, immutable per
// boot), failure memos 30s (Date math, no timers) so N rows cost
// one dial, never N hangs. A refusal is never cached silent —
// every memoised miss still throws loud with the dial's detail.
const INSPECT_DIAL_MS = 2_000;
const INSPECT_DOWN_MEMO_MS = 30_000;
const nodeDefsDocs = new Map<string, Record<string, unknown>>();
let nodeDefsDownUntil = 0;
let nodeDefsDownDetail = "";

async function nodeDefsDoc(url: string, signal?: AbortSignal): Promise<Record<string, unknown>> {
  const hit = nodeDefsDocs.get(url);
  if (hit !== undefined) return hit;
  if (Date.now() < nodeDefsDownUntil) {
    throw new Error(`engine node-defs unreachable (dial memo): ${nodeDefsDownDetail}`);
  }
  const bounded = signal === undefined
    ? AbortSignal.timeout(INSPECT_DIAL_MS)
    : AbortSignal.any([signal, AbortSignal.timeout(INSPECT_DIAL_MS)]);
  let doc: Record<string, unknown>;
  try {
    const res = await sdkClient(url).fetchApi("/object_info", { signal: bounded });
    doc = await res.json() as Record<string, unknown>;
  } catch (error: unknown) {
    nodeDefsDownUntil = Date.now() + INSPECT_DOWN_MEMO_MS;
    nodeDefsDownDetail = error instanceof Error ? error.message.slice(0, 160) : String(error);
    throw error;
  }
  nodeDefsDocs.set(url, doc);
  return doc;
}

function lazyInspector(): {
  inspect(ref: ResourceRef, signal?: AbortSignal): Promise<{ active: boolean; nodeTypes: readonly string[]; detail?: string }>;
} {
  return {
    inspect: async (ref, signal): Promise<{ active: boolean; nodeTypes: readonly string[]; detail?: string }> => {
      if (signal?.aborted === true) throw new Error("inspection cancelled");
      const url = endpointUrl();
      if (url === "") throw new Error("ComfyUI endpoint URL is not configured");
      const doc = await nodeDefsDoc(url, signal);
      const nodeTypes = Object.keys(doc);
      if (ref.kind === "model") return { active: false, nodeTypes };
      const facts = loadFacts(factsPath(), {
        getModel: (id: string) => modelsService().getModel(id),
        registryIds: () => modelsService().registryIds(),
        registryModel: (id: string) => modelsService().registryModel(id),
      });
      const expected = facts.extension_node_types[ref.id] ?? [];
      return {
        active: expected.length === 0 ? false : expected.every((node) => nodeTypes.includes(node)),
        nodeTypes,
        detail: expected.length === 0 ? "extension has no declared node types" : undefined,
      };
    },
  };
}

function declarationPort(ctx: Context): DeclarationPort {
  const repoRoot = resolveRepoRoot();
  const cards = ctx.get("cardRegistry") as CardService | undefined;
  if (cards === undefined) throw new Error("provisioning requires the card registry service");
  return {
    resolve: async (ref): Promise<ProvisionPlan> => {
      if (ref.kind === "model") {
        if (ref.owner === "card") {
          const rows = cardProvisions(cards, ref.id);
          if (rows.length === 0) throw new Error(`card "${ref.id}" declares no downloadable provisions`);
          return {
            ref,
            items: rows.map((row) => modelPlanItem(ref, row, "direct")),
          };
        }
        return familyPlan(ref, modelsService().registryModel(ref.id));
      }
      const row = extensionManifest(repoRoot).get(ref.id);
      if (row === undefined) throw new Error(`extension "${ref.id}" is not declared`);
      const facts = loadFacts(factsPath(), {
        getModel: (id: string) => modelsService().getModel(id),
        registryIds: () => modelsService().registryIds(),
        registryModel: (id: string) => modelsService().registryModel(id),
      });
      return extensionPlan(ref, row, facts.extension_node_types[ref.id] ?? []);
    },
    list: async (): Promise<readonly ResourceRef[]> => {
      const refs: ResourceRef[] = modelsService().registryIds().map((id) => ({ kind: "model", owner: "family", id }));
      for (const [id, def] of cards.defsSync()) {
        if ((def.provisions ?? []).length > 0) refs.push({ kind: "model", owner: "card", id });
      }
      for (const id of extensionManifest(repoRoot).keys()) refs.push({ kind: "extension", id });
      return refs;
    },
  };
}

function lifecyclePort(ctx: Context): {
  activeRuns(signal?: AbortSignal): Promise<readonly string[]>;
  restart(signal?: AbortSignal): Promise<void>;
  waitUntilReady(signal?: AbortSignal): Promise<void>;
} {
  const queue = ctx.get("queue") as QueueService | undefined;
  return {
    activeRuns: async (): Promise<readonly string[]> => {
      if (queue === undefined) return [];
      const snapshot = queue.core.snapshot();
      return [...(snapshot.active === "" ? [] : [snapshot.active]), ...snapshot.queued_ids];
    },
    restart: async (signal): Promise<void> => {
      const url = endpointUrl();
      if (url === "") throw new Error("ComfyUI endpoint URL is not configured");
      const client = new ComfyUiManagerHttpClient({ baseUrl: url, requestTimeoutMs: 10_000 });
      try {
        await client.post("/manager/reboot", {}, { signal });
      } catch (error: unknown) {
        if (!(error instanceof Error) || !/fetch failed|aborted|ECONNRESET|socket/i.test(error.message)) throw error;
      }
    },
    waitUntilReady: async (signal): Promise<void> => {
      const url = endpointUrl();
      if (url === "") throw new Error("ComfyUI endpoint URL is not configured");
      const client = new ComfyUiManagerHttpClient({ baseUrl: url, requestTimeoutMs: 2_000 });
      for (let attempt = 0; attempt < 120; attempt += 1) {
        if (signal?.aborted === true) throw new Error("readiness wait cancelled");
        try {
          await client.getJson("/system_stats", { signal });
          return;
        } catch {
          await ctx.timeout(() => undefined, 500);
        }
      }
      throw new Error("ComfyUI did not become ready after restart");
    },
  };
}

function provisioningConfig(ctx: Context): ProvisioningConfig {
  const storeRoot = configuredStoreRoot();
  const operationRoot = join(resolveRepoRoot(), "data", "runtime", "provisioning");
  return {
    declaration: declarationPort(ctx),
    ...(storeRoot === undefined ? {} : { storeRoot, artifactWriter: new VerifiedArtifactWriter(storeRoot) }),
    manager: lazyManager(),
    inspector: lazyInspector(),
    lifecycle: lifecyclePort(ctx),
    operationStore: new FileOperationStore(operationRoot),
    writeGuard: () => stringValue(loadEndpointConfig()["provision"]) === "managed",
  };
}

export const provisioningComposition: Plugin = {
  name: "estate-provisioning-composition",
  inject: ["cardRegistry", "queue"],
  apply(ctx: Context): void {
    new ProvisioningService(ctx, provisioningConfig(ctx));
  },
};

export default provisioningComposition;
