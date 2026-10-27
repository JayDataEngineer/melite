import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Context, Plugin } from "@deepseek-ai/cordis";
import {
  ComfyUiManagerHttpClient,
  ComfyUiManagerProvider,
  FileOperationStore,
  VerifiedArtifactWriter,
  ProvisioningService,
  postManagerPip,
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
  packageRoot,
  resolveRepoRoot,
  runtimeModelsRoot,
  sdkClient,
} from "@melite/comfyui-cordis";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";
import type { ModelDecl, ProvisionRow } from "@melite/comfyui-card-kit/model-contract";
import { artifactFileName } from "@melite/contracts/benchResult";
import { loadShippedExtensionManifest } from "@melite/comfyui-cordis/provisioning-manifest";
import { loadStoreRoot, ModelsDoorError } from "@melite/estate-models";
import Schema from "@deepseek-ai/schemastery";
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

/** The readiness retry backoff (500ms, raced against the caller's
 *  abort signal). The sleep rides the fiber-scoped timer — ctx.timeout
 *  from the vendored cordis-plugin-timer, seated by this composition's
 *  apply (J7's owed seat, cured: the composition injects "timer" and
 *  assigns SEAMS.sleep through the structural read the two-cordis
 *  topology law names — the same cast manageRegistry.ts:89 uses — so
 *  the sleep is effect-owned and dies with its context, never a bare
 *  setTimeout). The exported SEAMS holder keeps the coverage rig
 *  sovereign: it overrides the backoff by name for instant arms, or
 *  seats its own sleep to exercise the production body (ESM export
 *  bindings are frozen — an internal call can never be stubbed
 *  through the namespace; a property on a live object can). */
export const SEAMS: {
  sleep(ms: number): Promise<void>;
  readinessBackoff(signal?: AbortSignal): Promise<void>;
} = {
  sleep(): Promise<void> {
    return Promise.reject(new Error("timer seat not mounted — provisioningComposition.apply seats SEAMS.sleep"));
  },
  readinessBackoff(signal?: AbortSignal): Promise<void> {
    const sleep: Promise<void> = this.sleep(500);
    if (signal === undefined) return sleep;
    return new Promise<void>((resolve, reject) => {
      const onAbort = (): void => { reject(new Error("readiness wait cancelled")); };
      signal.addEventListener("abort", onAbort, { once: true });
      void sleep.then(
        () => { signal.removeEventListener("abort", onAbort); resolve(); },
        (error: unknown) => { signal.removeEventListener("abort", onAbort); reject(error); },
      );
    });
  },
};

function endpointUrl(): string {
  return stringValue(loadEndpointConfig()["url"]);
}

/** Provider config — the store-root pin (V8 cure, 2026-10-18: the
 *  weights store root resolved through an env-wins seam with a
 *  silent-swallow fallback; it is now a validated config field and
 *  the checkout-config read happens at apply, loud on a refuse). */
export interface ProvisioningCompositionConfig {
  /** The weights store root. Unset: derived from the checkout's
   *  tracked configs at apply (loadStoreRoot). */
  storeRoot?: string;
  /** THE ACQUIRE STALL BUDGET (ERRORS.md k2, P5 F1): how long a direct
   *  fetch may land no bytes before the stall watchdog fails it — the
   *  deployment-varying face of ACQUIRE_STALL_TIMEOUT_MS (a lossy link
   *  wants a wider window). Unset: the service default owns the bound.
   *  Validated downstream (positive integer, fails loud at boot). */
  acquireStallTimeoutMs?: number;
  /** THE DURABLE DOWNLOAD SEAT (the lifetime finding, 2026-10-21):
   *  true on the operator's lane — that seat claims 'requested' op
   *  rows and owns every download's lifetime. Unset/false:
   *  transient (an agent session's seat mints requests, never
   *  wires). */
  durableDownloads?: boolean;
  /** THE CLAIM CADENCE (durable seats only): how often the shared
   *  op store is polled for requested rows, in milliseconds.
   *  Validated downstream (positive integer, fails loud at boot). */
  downloadClaimIntervalMs?: number;
}

/** The validator twin of {@link ProvisioningCompositionConfig}. */
export const ProvisioningCompositionConfig = Schema.object({
  storeRoot: Schema.string(),
  acquireStallTimeoutMs: Schema.number(),
  durableDownloads: Schema.boolean(),
  downloadClaimIntervalMs: Schema.number(),
});

function configuredStoreRoot(config: ProvisioningCompositionConfig): string | undefined {
  const cfg = loadEndpointConfig();
  const value = stringValue(cfg["model_download_path"] ?? cfg["model_base_path"]);
  if (value !== "") return value;
  if (config.storeRoot !== undefined) return config.storeRoot;
  try {
    return loadStoreRoot(resolveRepoRoot());
  } catch (err) {
    // A present-but-invalid config REFUSES the mount loud (the
    // validation law); a checkout with no config files at all keeps
    // the artifact arm off — the declaration/lifecycle faces still
    // serve, the pinned degradation.
    if (err instanceof ModelsDoorError) throw err;
    return undefined;
  }
}

/** THE KEY-COORDINATE LAW (audit T-S4, 2026-10-22): base provisions
 *  rows are family-wide bytes — the key NEVER folds the caller's
 *  variant/quant (a variant=B call fetched byte-identical base files
 *  under a second key: duplicate downloads, divergent rows). The
 *  artifact row's bytes ARE coordinate-scoped — it keys by the
 *  RESOLVED coordinates (resolve's own variant/cell, never the
 *  caller's ask). */
function modelRefKey(
  ref: Extract<ResourceRef, { kind: "model" }>,
  name: string,
  variant?: string,
  quant?: string,
): string {
  return [
    "model",
    ref.owner,
    ref.id,
    variant ?? "",
    quant ?? "",
    name,
  ].join(":");
}

function extensionKey(id: string): string {
  return `extension:${id}`;
}

function routeCoordinates(
  ref: Extract<ResourceRef, { kind: "model" }>,
  decl: ModelDecl,
): { variant: string | null, quant: string | null } {
  let variant = ref.variant ?? null;
  let quant = ref.quant ?? null;
  for (const candidate of decl.variants) {
    if (variant === null && candidate.route === ref.id) variant = candidate.id;
    for (const cell of candidate.cells) {
      if (cell.route !== ref.id) continue;
      if (variant === null) variant = candidate.id;
      if (quant === null) quant = cell.quant;
    }
  }
  return { variant, quant };
}

function familyPlan(
  ref: Extract<ResourceRef, { kind: "model" }>,
  decl: ModelDecl,
): ProvisionPlan {
  // UNION LAW (2026-10-12 model audit, fix 1): provisions AND the
  // variant-cell artifact both download — the qwen families declare
  // TE/VAE provisions plus the UNET cell artifact, and the old
  // either-or arm never downloaded the artifact half.
  const items: ProvisionPlanItem[] = [];
  for (const row of decl.provisions ?? []) {
    items.push(modelPlanItem(ref, row, "direct"));
  }
  // THE SNAPSHOT CHANNEL (the lying-Download cure, 2026-11-10):
  // directory-shaped weights ride snapshot_provisions — repo +
  // revision + allow patterns — through the same plan door every
  // single-file row rides. Families whose only fetchable bytes are
  // whole-dirs (joycaption, kimodo, qwen3-tts HF trees) used to
  // throw "declares no downloadable provisions" here while the
  // button promised a download; the fold makes the promise true.
  for (const row of decl.snapshot_provisions ?? []) {
    items.push({
      kind: "snapshot",
      key: `model:${ref.id}:snapshot:${row.name}`,
      owner: ref.owner,
      id: ref.id,
      name: row.name,
      folder: row.folder,
      repoId: row.repo_id,
      revision: row.revision,
      allowPatterns: [...row.allow_patterns],
      required: true,
      provider: "hf-snapshot",
    });
  }
  const coordinates = routeCoordinates(ref, decl);
  const resolved = modelsService().resolve(ref.id, coordinates.variant, coordinates.quant);
  const artifact = resolved.cell?.artifact;
  if (artifact !== undefined && artifact !== null) {
    // resolved.variant/resolved.cell are the RESOLUTION's own picks
    // (first declared = the family default when the caller gave no
    // coordinate) — recording the caller's null would misattribute
    // the bytes; the `as string` casts are deleted (T-S4).
    const row: ProvisionRow = {
      // THE FILENAME IS THE PATHNAME'S BASENAME (the boundary audit's
      // C5): `split("/").pop()` kept a query string and a fragment
      // ("f.safetensors?download=1"), so the manager downloaded under a
      // clean name while this row inspected a name with the query
      // glued on, and the post-download check reported model-not-landed
      // for a model that was on disk. A trailing-slash URL yielded ""
      // and refused later as an invalid destination.
      name: artifactFileName(artifact.source_url),
      url: artifact.source_url,
      folder: artifact.dest_sub,
      sha256: artifact.sha256,
      size_bytes: artifact.size_bytes,
    };
    items.push(modelPlanItem(
      ref,
      row,
      "direct",
      resolved.variant.id,
      resolved.cell?.quant,
    ));
  }
  if (items.length === 0) {
    // hand-placed-only families (merged TTS trees, the sfx source
    // tree) reach here: no fetchable byte exists to plan, and the
    // roster never lists them (list() filters by fetchable truth)
    throw new Error(`model "${ref.id}" declares no downloadable provisions — its weights are hand-placed, not fetchable`);
  }
  return { ref, items };
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
    key: modelRefKey(ref, row.name, variant, quant),
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
    readonly url: string;
    readonly ref: string;
    readonly pip: readonly string[];
  },
  nodeTypes: readonly string[],
): ProvisionPlan {
  // Every manifest row declares its url (R7: the registry key no row
  // set is gone) — extensions plan from git, or local when url-less.
  // No version rides the plan: a git row's pin is the commit (the
  // provider refuses a ref+version request by law), and the manifest
  // carries no registry-arm rows.
  const source = row.url.trim() !== ""
    ? "git"
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
      requirements: [...row.pip],
      nodeTypes: [...nodeTypes],
    }],
  };
}

function extensionManifest(): Map<string, {
  readonly name: string;
  readonly url: string;
  readonly ref: string;
  readonly pip: readonly string[];
}> {
  // THE SHIPPED MANIFEST (audit 019 C1): the declaration plane reads
  // the COMMITTED data file the npm artifact carries — not the
  // `<repoRoot>/packages` walk, which resolves to nothing on an
  // installed profile and refused every extension id (F1). A missing
  // or malformed data file refuses loud at the read; there is no
  // walk fallback to mask it.
  const rows = loadShippedExtensionManifest();
  return new Map(rows.map((row) => [row.name, row]));
}

/** The facts read behind the extension plan: the repo/fixture-anchored
 *  {@link factsPath} first (the MELITE_REPO_ROOT seam the rigs pin),
 *  then the package-shipped model-facts.json — the same npm artifact
 *  that carries the extension manifest, because an installed profile
 *  has no `packages` tree for the repo-anchored path to reach (the
 *  audit-019 F1 class, one file over). Both absent refuses loud: a
 *  silent empty node-type map would mark every pack "unverifiable"
 *  instead of naming the miss.
 *  @returns absolute path to a readable model-facts file.
 *  @throws when neither the repo-anchored nor the shipped file exists. */
function extensionFactsPath(): string {
  const repoFacts = factsPath();
  if (existsSync(repoFacts)) return repoFacts;
  const shipped = join(packageRoot(), "data", "model-facts.json");
  if (existsSync(shipped)) return shipped;
  throw new Error("REFUSED: no model facts readable — " + repoFacts +
    " and the shipped " + shipped + " are both absent; the extension " +
    "plane cannot resolve node types (restore the package data or pin " +
    "MELITE_REPO_ROOT at a checkout)");
}

function cardProvisions(cards: CardService, id: string): ProvisionRow[] {
  const def = cards.defsSync().get(id);
  if (def === undefined) throw new Error(`unknown card "${id}"`);
  return [...(def.provisions ?? [])];
}

function lazyManager(ctx: Context): ManagerPort {
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
    // THE SINGLE VENDOR (2026-10-13): no clone seat exists any more. A
    // declared ref rides Manager's git-url door as url@commit and the
    // estate verifies the landed HEAD through /customnode/installed.
    provider = new ComfyUiManagerProvider(client);
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
/** The direct-model arm's idle budget when the caller passes no
 *  signal (audit V-E9 → the 9.35GB cure, 2026-10-10): the dial
 *  bounds IDLE, never duration — a whole-body cap aborts a healthy
 *  saturated stream mid-file (10 minutes ≈ 5.4GB at lane
 *  bandwidth), so a large weight can never land: every attempt
 *  dies, and the retry (audit download-stack-audit-2026-10-20 F7)
 *  asks `Range: bytes=N-` from the kept part's offset instead of
 *  restarting at zero. A stalled DECL host still cannot park its
 *  operation forever — only a source that stops flowing trips the
 *  bound. */
export const PROVISION_FETCH_DIAL_MS = 600_000;

/** THE RESUME FACTS OF ONE REPLY (audit download-stack-audit-2026-10-20
 *  F7): a 206 to a ranged ask names the offset it honored and may
 *  declare the total in Content-Range (`bytes <first>-<last>/<total|
 *  *>`) — a star or missing total carries no fact and the plan's
 *  declared size owns the denominator upstream. Anything but a 206
 *  carries no resume fact: a 200 to a ranged ask is the service's
 *  honest restart-from-zero voice, not a resume. */
function resumeFacts(init: { rangeFrom?: number } | undefined, response: Response): {
  resumedFrom?: number,
  totalBytes?: number,
} {
  if (response.status !== 206 || init?.rangeFrom === undefined) return {};
  const contentRange = response.headers.get("content-range")?.trim() ?? "";
  const first = /^bytes\s+(\d+)-/.exec(contentRange)?.[1];
  const total = /\/(\d+|\*)$/.exec(contentRange)?.[1];
  const totalBytes = total !== undefined && total !== "*" && /^\d+$/.test(total) && Number.isSafeInteger(Number(total))
    ? Number(total)
    : undefined;
  return {
    resumedFrom: first !== undefined ? Number(first) : init.rangeFrom,
    ...(totalBytes === undefined ? {} : { totalBytes }),
  };
}

/** THE IDLE DIAL (the direct arm's byte source): a fetch whose
 *  abort clock REARMS on every flowing chunk and clears when the
 *  stream ends or is cancelled. `fetch`'s own signal abort is the
 *  only enforcement — the transform just pokes the clock.
 *  @param dialMs — the idle bound; a caller's own signal (when
 *  passed) wins at once and no idle timer rides. */
export function idleDialFetch(dialMs: number): (url: string, signal?: AbortSignal, init?: { rangeFrom?: number }) => Promise<{
  status: number,
  body: ReadableStream<Uint8Array> | null,
  resumedFrom?: number,
  totalBytes?: number,
}> {
  return async (url, signal, init) => {
    // THE RANGE RESUME WIRE (audit download-stack-audit-2026-10-20
    // F7): a resume ask rides as `Range: bytes=N-` — a 206 passes
    // through with its Content-Range parsed into resume facts, and a
    // host that ignores the header answers 200 for the service to
    // voice honestly.
    const headers = init?.rangeFrom !== undefined && init.rangeFrom > 0
      ? { Range: `bytes=${String(init.rangeFrom)}-` }
      : undefined;
    if (signal !== undefined) {
      const response = await fetch(url, { signal, redirect: "follow", ...(headers === undefined ? {} : { headers }) });
      return { status: response.status, body: response.body, ...resumeFacts(init, response) };
    }
    const controller = new AbortController();
    let dial: ReturnType<typeof setTimeout> | undefined;
    const rearm = (): void => {
      if (dial !== undefined) clearTimeout(dial);
      dial = setTimeout(() => controller.abort(), dialMs);
    };
    const clear = (): void => {
      clearTimeout(dial);
      dial = undefined;
    };
    rearm();
    try {
      const response = await fetch(url, { signal: controller.signal, redirect: "follow", ...(headers === undefined ? {} : { headers }) });
      if (response.body === null) return { status: response.status, body: null, ...resumeFacts(init, response) };
      const poke = new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) { rearm(); controller.enqueue(chunk); },
        flush() { clear(); },
        cancel() { clear(); },
      });
      return { status: response.status, body: response.body.pipeThrough(poke), ...resumeFacts(init, response) };
    } catch (error) {
      clear();
      throw error;
    }
  };
}
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
      const facts = loadFacts(extensionFactsPath(), {
        getModel: (id: string) => modelsService().getModel(id),
        registryIds: () => modelsService().registryIds(),
        registryModel: (id: string) => modelsService().registryModel(id),
      });
      const expected = facts.extension_node_types[ref.id] ?? [];
      // THE UNVERIFIABLE ANSWER (the rgthree burn, 2026-10-22): a
      // DECL that names no node types gives this read nothing to
      // verify against — active:false here is CANNOT-VERIFY, never
      // evidence of absence. The flag folds the census 'unknown'
      // (never 'absent'), so an installed-but-unlisted pack no
      // longer wears a negative verdict no door can converge.
      return {
        active: expected.length === 0 ? false : expected.every((node) => nodeTypes.includes(node)),
        nodeTypes,
        ...(expected.length === 0
          ? { unverifiable: true, detail: "extension has no declared node types" }
          : {}),
      };
    },
  };
}

/** The declaration half of the provisioning seat — the one contract
 *  door that turns a ResourceRef into its ProvisionPlan. Exported so
 *  the declared-resources wall drives the SAME port the seat consumes
 *  (zero drift: the wall never re-derives a plan). */
export function declarationPort(ctx: Context): DeclarationPort {
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
        return familyPlan(ref, modelsService().getModel(ref.id));
      }
      const row = extensionManifest().get(ref.id);
      if (row === undefined) throw new Error(`extension "${ref.id}" is not declared`);
      const facts = loadFacts(extensionFactsPath(), {
        getModel: (id: string) => modelsService().getModel(id),
        registryIds: () => modelsService().registryIds(),
        registryModel: (id: string) => modelsService().registryModel(id),
      });
      return extensionPlan(ref, row, facts.extension_node_types[ref.id] ?? []);
    },
    list: async (): Promise<readonly ResourceRef[]> => {
      // THE DEBT BAND ROSTER (burn d, 2026-10-26 — the operator:
      // "how does models without links go all green?"):
      // EVERY family row is served. Fetchable families carry their
      // plan (provisions/snapshots/artifacts); hand-placed-only
      // families (moss-sfx, the merged TTS trees) ride the census
      // row's fetchable:false and the assets tab renders the
      // hand-placed band — hidden was never green, it was invisible
      // (the 2026-11-10 hide is superseded: a zero-item plan
      // aggregates to 'absent', never a failed face, and the
      // weight-offer parity copy owns the Download door).
      const refs: ResourceRef[] = [];
      for (const id of modelsService().registryIds()) {
        refs.push({ kind: "model", owner: "family", id });
      }
      for (const [id, def] of cards.defsSync()) {
        if ((def.provisions ?? []).length > 0) refs.push({ kind: "model", owner: "card", id });
      }
      for (const id of extensionManifest().keys()) refs.push({ kind: "extension", id });
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
          await SEAMS.readinessBackoff(signal);
        }
      }
      throw new Error("ComfyUI did not become ready after restart");
    },
  };
}

function provisioningConfig(ctx: Context, config: ProvisioningCompositionConfig = {}): ProvisioningConfig {
  const storeRoot = configuredStoreRoot(config);
  const operationRoot = join(resolveRepoRoot(), "data", "runtime", "provisioning");
  // THE TWO ABORT CLOCKS AGREE BY CONSTRUCTION (audit F7, 2026-10-20):
  // the fetcher's idle dial bounds a SILENT SOURCE (600s); the stall
  // watchdog bounds a FROZEN LEDGER inside the same stream. A budget
  // past the dial would make the dial dead code — the watchdog would
  // outlive the fetcher's own idle bound — so the degenerate tuning
  // refuses loud at boot, never rides silently.
  if (config.acquireStallTimeoutMs !== undefined && config.acquireStallTimeoutMs > PROVISION_FETCH_DIAL_MS) {
    throw new Error(
      "acquireStallTimeoutMs " + String(config.acquireStallTimeoutMs)
      + " exceeds the direct arm's fetch idle dial " + String(PROVISION_FETCH_DIAL_MS)
      + " — the stall watchdog must never outlive the fetcher's own idle bound (the two abort clocks agree by construction)",
    );
  }
  return {
    declaration: declarationPort(ctx),
    ...(storeRoot === undefined ? {} : { storeRoot, artifactWriter: new VerifiedArtifactWriter(storeRoot) }),
    // THE DIRECT MODEL ARM'S BYTE SOURCE: the DECL url is the whole
    // request — no token, no credential header (a token inside a url
    // row leaks into logs and caches; the credential-store field it
    // would ride is owed work, not a url query). The one header the
    // arm ever sends is the resume range (F7: `Range: bytes=N-` from
    // a kept part's offset). Anything a gated host answers non-200/206
    // lands as a named fetch refusal. The idle dial (not a duration
    // cap) keeps a stalled host bounded without killing a healthy
    // long stream.
    fetcher: idleDialFetch(PROVISION_FETCH_DIAL_MS),
    manager: lazyManager(ctx),
    inspector: lazyInspector(),
    lifecycle: lifecyclePort(ctx),
    operationStore: new FileOperationStore(operationRoot),
    writeGuard: () => stringValue(loadEndpointConfig()["provision"]) === "managed",
    // P5 F1 (the deployment face): the operator's stall window rides
    // the composition Config into the service — unset stays unset so
    // the service default (the stuck-acquire contract's bound) owns it.
    ...(config.acquireStallTimeoutMs === undefined ? {} : { acquireStallTimeoutMs: config.acquireStallTimeoutMs }),
    // THE DURABLE DOWNLOAD SEAT (2026-10-21): the lane's durability
    // word + claim cadence ride the same deployment face.
    ...(config.durableDownloads === undefined ? {} : { durableDownloads: config.durableDownloads }),
    ...(config.downloadClaimIntervalMs === undefined ? {} : { downloadClaimIntervalMs: config.downloadClaimIntervalMs }),
  };
}

export const provisioningComposition: Plugin = {
  name: "estate-provisioning-composition",
  inject: ["cardRegistry", "queue", "timer"],
  Config: ProvisioningCompositionConfig,
  apply(ctx: Context, config: ProvisioningCompositionConfig = {}): void {
    // J7's owed seat: the backoff's sleep rides the fiber-scoped
    // timer. Structural read, never instanceof — the timer plugin's
    // Context augmentation lands on its own cordis copy (the
    // two-cordis topology law, manageRegistry.ts:89 the precedent).
    SEAMS.sleep = (ms: number): Promise<void> =>
      (ctx as unknown as { timeout(delay: number): Promise<void> }).timeout(ms);
    new ProvisioningService(ctx, provisioningConfig(ctx, config));
  },
};

export default provisioningComposition;
