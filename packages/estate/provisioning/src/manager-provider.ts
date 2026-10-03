import type {
  ManagerInstallRequest,
  ManagerInstallResult,
  ManagerModelInstallRequest,
  ManagerModelInstallResult,
  ManagerPort,
} from "./ports.ts";
import {
  ComfyUiManagerHttpClient,
  ManagerClientError,
  type ManagerQueueWaitOptions,
} from "./manager-client.ts";

export type ManagerProviderErrorCode =
  | "invalid-request"
  | "pin-mismatch"
  | "model-unregistered"
  | "model-metadata";

export class ManagerProviderError extends Error {
  readonly code: ManagerProviderErrorCode;

  constructor(code: ManagerProviderErrorCode, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "ManagerProviderError";
    this.code = code;
  }
}

export interface PinnedGitExtensionPort {
  canInstall(request: ManagerInstallRequest, signal?: AbortSignal): Promise<boolean>;
  install(request: ManagerInstallRequest, signal?: AbortSignal): Promise<ManagerInstallResult>;
}

export interface ComfyUiManagerProviderOptions {
  readonly git?: PinnedGitExtensionPort;
  readonly queue?: ManagerQueueWaitOptions;
}

interface RegistryRow {
  readonly id: string;
  readonly version: string;
  readonly repository: string;
  readonly channel: string;
  readonly files: readonly string[];
  readonly pip: readonly string[];
}

interface ModelCatalogCandidate {
  readonly savePath: string;
  readonly filename: string;
  readonly raw: Record<string, unknown>;
}

interface ModelCatalogRow {
  readonly name: string;
  readonly type: string;
  readonly base: string;
  readonly savePath: string;
  readonly url: string;
  readonly filename: string;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function stringArray(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function normalizedRepository(value: string): string {
  const trimmed = value.trim().replace(/\/+$/u, "").replace(/\.git$/iu, "");
  const scp = /^([^@\s]+)@([^:\s]+):(.+)$/u.exec(trimmed);
  if (scp !== null) return `${scp[1]}@${scp[2].toLowerCase()}:${scp[3]}`;
  try {
    const url = new URL(trimmed);
    url.hostname = url.hostname.toLowerCase();
    url.pathname = url.pathname.replace(/\/+$/u, "").replace(/\.git$/iu, "");
    return url.toString().replace(/\/$/u, "");
  } catch {
    return trimmed;
  }
}

function normalizedModelSavePath(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.startsWith("/") || trimmed.startsWith("\\") || trimmed.includes("\0")) {
    return undefined;
  }
  const segments = trimmed.replace(/\\/gu, "/").split("/");
  const clean = segments.filter((segment) => segment !== "" && segment !== ".");
  if (clean.some((segment) => segment === "..")) return undefined;
  const withoutRoot = clean[0] === "models" ? clean.slice(1) : clean;
  const normalized = withoutRoot.join("/");
  return normalized === "" || normalized === "models" ? "default" : normalized;
}

function normalizedModelFilename(value: string): string | undefined {
  const normalized = value.trim();
  if (
    normalized === ""
    || normalized === "."
    || normalized === ".."
    || normalized.includes("/")
    || normalized.includes("\\")
    || normalized.includes("\0")
  ) {
    return undefined;
  }
  return normalized;
}

function modelCatalogCandidates(value: unknown): readonly ModelCatalogCandidate[] {
  if (!record(value) || !Array.isArray(value["models"])) {
    throw new ManagerProviderError(
      "model-metadata",
      "ComfyUI-Manager external-model catalog has an invalid shape",
    );
  }
  const candidates: ModelCatalogCandidate[] = [];
  for (const raw of value["models"]) {
    if (!record(raw)) continue;
    const savePath = stringValue(raw["save_path"]);
    const filename = stringValue(raw["filename"]);
    if (savePath === undefined || filename === undefined) continue;
    const normalizedSavePath = normalizedModelSavePath(savePath);
    const normalizedFilename = normalizedModelFilename(filename);
    if (normalizedSavePath === undefined || normalizedFilename === undefined) continue;
    candidates.push({ savePath: normalizedSavePath, filename: normalizedFilename, raw });
  }
  return candidates;
}

function findModelCatalogRow(
  value: unknown,
  savePath: string,
  filename: string,
): ModelCatalogRow {
  const matches = modelCatalogCandidates(value).filter(
    (candidate) => candidate.savePath === savePath && candidate.filename === filename,
  );
  if (matches.length !== 1) {
    throw new ManagerProviderError(
      "model-unregistered",
      `ComfyUI-Manager external-model catalog does not contain exactly one row for ${savePath}/${filename}`,
    );
  }
  const raw = matches[0].raw;
  const savePathValue = stringValue(raw["save_path"]);
  const name = stringValue(raw["name"]);
  const type = stringValue(raw["type"]);
  const base = stringValue(raw["base"]);
  const url = stringValue(raw["url"]);
  if (savePathValue === undefined || name === undefined || type === undefined || base === undefined || url === undefined) {
    throw new ManagerProviderError(
      "model-metadata",
      `ComfyUI-Manager external-model catalog row for ${savePath}/${filename} is missing required metadata`,
    );
  }
  return { name, type, base, savePath: savePathValue, url, filename };
}

export async function postManagerPip(
  client: ComfyUiManagerHttpClient,
  requirements: readonly string[],
  signal?: AbortSignal,
): Promise<void> {
  if (requirements.length === 0) return;
  await client.post("/customnode/install/pip", { packages: requirements.join(" ") }, {
    ...(signal === undefined ? {} : { signal }),
  });
}

function catalogRows(value: unknown): readonly RegistryRow[] {
  if (!record(value)) {
    throw new ManagerProviderError("invalid-request", "ComfyUI-Manager custom-node catalog has an invalid shape");
  }
  const source = record(value["node_packs"])
    ? Object.entries(value["node_packs"])
    : Array.isArray(value["custom_nodes"])
      ? value["custom_nodes"].map((raw, index): [string, unknown] => [String(index), raw])
      : [];
  if (source.length === 0 && !record(value["node_packs"]) && !Array.isArray(value["custom_nodes"])) {
    throw new ManagerProviderError("invalid-request", "ComfyUI-Manager custom-node catalog has an invalid shape");
  }
  const rows: RegistryRow[] = [];
  for (const [key, raw] of source) {
    if (!record(raw)) continue;
    const id = stringValue(raw["id"]) ?? stringValue(raw["cnr_id"]) ?? stringValue(raw["name"]) ?? (record(value["node_packs"]) ? key : undefined);
    const version = stringValue(raw["version"]) ?? stringValue(raw["selected_version"]) ?? "unknown";
    const repository = stringValue(raw["repository"]) ?? stringValue(raw["reference"]) ?? stringValue(raw["git_url"]) ?? stringValue(raw["url"]);
    if (id === undefined || repository === undefined) continue;
    rows.push({
      id,
      version,
      repository,
      channel: stringValue(raw["channel"]) ?? "default",
      files: stringArray(raw["files"]),
      pip: stringArray(raw["pip"]).length > 0 ? stringArray(raw["pip"]) : stringArray(raw["requirements"]),
    });
  }
  return rows;
}

function findRegistryRow(value: unknown, registry: string, url: string | undefined): RegistryRow {
  const rows = catalogRows(value);
  const matches = rows.filter((row) => row.id === registry);
  if (matches.length !== 1) {
    throw new ManagerProviderError(
      "pin-mismatch",
      `ComfyUI-Manager registry does not contain exactly one row for ${registry}`,
    );
  }
  const row = matches[0];
  const declaredRepository = url === undefined || url.trim() === "" ? "" : normalizedRepository(url);
  const catalogRepository = normalizedRepository(row.repository);
  const fileMatch = declaredRepository !== "" && row.files.some((file) => normalizedRepository(file) === declaredRepository);
  if (declaredRepository !== "" && catalogRepository !== declaredRepository && !fileMatch) {
    throw new ManagerProviderError(
      "pin-mismatch",
      `ComfyUI-Manager registry row ${registry} does not match the declared repository`,
    );
  }
  return row;
}

function requestedVersion(request: ManagerInstallRequest): string {
  if (request.version === undefined) return "latest";
  const version = request.version.trim();
  if (version === "") {
    throw new ManagerProviderError("pin-mismatch", "Declared extension version must not be empty");
  }
  return version;
}

async function assertVersionAvailable(
  client: ComfyUiManagerHttpClient,
  registry: string,
  version: string,
  signal?: AbortSignal,
): Promise<void> {
  if (version === "latest") return;
  const value = await client.getJson(`/customnode/versions/${encodeURIComponent(registry)}`, {
    ...(signal === undefined ? {} : { signal }),
  });
  const entries = Array.isArray(value)
    ? value
    : record(value) && Array.isArray(value["versions"])
      ? value["versions"]
      : undefined;
  if (entries === undefined) {
    throw new ManagerProviderError(
      "pin-mismatch",
      `ComfyUI-Manager returned no version list for ${registry}`,
    );
  }
  const available = entries.some((entry) => record(entry) && entry["version"] === version);
  if (!available) {
    throw new ManagerProviderError(
      "pin-mismatch",
      `ComfyUI-Manager cannot honor declared version ${version} for ${registry}`,
    );
  }
}

export class ComfyUiManagerProvider implements ManagerPort {
  readonly client: ComfyUiManagerHttpClient;
  private readonly git: PinnedGitExtensionPort | undefined;
  private readonly queue: ManagerQueueWaitOptions;

  constructor(client: ComfyUiManagerHttpClient, options: ComfyUiManagerProviderOptions = {}) {
    this.client = client;
    this.git = options.git;
    this.queue = options.queue ?? {};
  }

  async canInstall(request: ManagerInstallRequest, signal?: AbortSignal): Promise<boolean> {
    if (request.url !== undefined && request.registry === undefined && request.ref === undefined && request.version === undefined) {
      return request.url.trim() !== "";
    }
    if (request.ref !== undefined) {
      if (request.version !== undefined || this.git === undefined) return false;
      return await this.git.canInstall(request, signal);
    }
    try {
      await this.resolveRegistryRow(request, signal);
      return true;
    } catch (error: unknown) {
      if (error instanceof ManagerProviderError && error.code === "pin-mismatch") return false;
      throw error;
    }
  }

  async install(request: ManagerInstallRequest, signal?: AbortSignal): Promise<ManagerInstallResult> {
    if (request.url !== undefined && request.registry === undefined && request.ref === undefined && request.version === undefined) {
      if (request.url.trim() === "") {
        throw new ManagerProviderError("invalid-request", "Declared extension repository URL must not be empty");
      }
      await this.client.post("/customnode/install/git_url", { url: request.url }, {
        ...(signal === undefined ? {} : { signal }),
      });
      return { installed: true, detail: "git URL submitted to ComfyUI-Manager" };
    }
    if (request.ref !== undefined) {
      if (request.version !== undefined || this.git === undefined) {
        throw new ManagerProviderError(
          "pin-mismatch",
          "The declared git ref cannot be combined with an unverified registry version",
        );
      }
      return await this.git.install(request, signal);
    }
    const resolved = await this.resolveRegistryRow(request, signal);
    const version = requestedVersion(request);
    const payload: Record<string, unknown> = {
      id: resolved.id,
      version: resolved.version,
      selected_version: version,
      channel: resolved.channel,
      mode: "cache",
      ui_id: request.id,
      repository: resolved.repository,
      files: [...resolved.files],
      pip: [...resolved.pip],
      skip_post_install: false,
    };
    await this.client.post("/manager/queue/install", payload, {
      ...(signal === undefined ? {} : { signal }),
    });
    await this.client.post("/manager/queue/start", {}, {
      ...(signal === undefined ? {} : { signal }),
    });
    const status = await this.client.waitForQueue({
      ...this.queue,
      ...(signal === undefined ? {} : { signal }),
    });
    return {
      installed: true,
      detail: `installed ${resolved.id}@${version}; queue ${String(status.doneCount)}/${String(status.totalCount)}`,
    };
  }

  async installModel(
    request: ManagerModelInstallRequest,
    signal?: AbortSignal,
  ): Promise<ManagerModelInstallResult> {
    const savePath = typeof request.savePath === "string"
      ? normalizedModelSavePath(request.savePath)
      : undefined;
    const filename = typeof request.filename === "string"
      ? normalizedModelFilename(request.filename)
      : undefined;
    if (stringValue(request.name) === undefined || savePath === undefined || filename === undefined || stringValue(request.url) === undefined) {
      throw new ManagerProviderError("invalid-request", "Manager model destination or source is invalid");
    }
    const catalog = await this.client.getJson("/externalmodel/getlist?mode=cache", {
      ...(signal === undefined ? {} : { signal }),
    });
    // Public-catalog echo first (Manager's own metadata for the row);
    // a miss throws for callers that did not identify their row as
    // estate-declared (the estate door's operator URLs stay refused
    // here). A DECLARED row (the models step passes the local-list
    // tags) carries its own url and destination: it rides the
    // manager-local model-list (get_data_by_mode('local')) so
    // check_whitelist_for_model still matches save_path+base+
    // filename. The install stays Manager-authoritative — the queue
    // downloads and the caller digest-verifies the landed bytes.
    const declared = request.type !== undefined || request.base !== undefined;
    let row: ModelCatalogRow;
    try {
      row = findModelCatalogRow(catalog, savePath, filename);
    } catch (error: unknown) {
      if (declared && error instanceof ManagerProviderError && error.code === "model-unregistered") {
        row = {
          name: filename,
          type: request.type ?? "model",
          base: request.base ?? "melite",
          savePath,
          url: request.url,
          filename,
        };
      } else {
        throw error;
      }
    }
    const payload: Record<string, unknown> = {
      name: row.name,
      type: row.type,
      base: row.base,
      save_path: row.savePath,
      url: row.url,
      filename: row.filename,
      ui_id: request.id,
    };
    await this.client.post("/manager/queue/install_model", payload, {
      ...(signal === undefined ? {} : { signal }),
    });
    await this.client.post("/manager/queue/start", {}, {
      ...(signal === undefined ? {} : { signal }),
    });
    const status = await this.client.waitForQueue({
      ...this.queue,
      ...(signal === undefined ? {} : { signal }),
    });
    return {
      installed: true,
      detail: `${declared ? "declared row" : "catalog row"} ${row.name}; queue ${String(status.doneCount)}/${String(status.totalCount)}`,
    };
  }

  private async resolveRegistryRow(
    request: ManagerInstallRequest,
    signal?: AbortSignal,
  ): Promise<RegistryRow> {
    const registry = request.registry?.trim();
    if (registry === undefined || registry === "") {
      throw new ManagerProviderError("pin-mismatch", "Registry installation requires a declared registry id");
    }
    if (request.url !== undefined && request.url.trim() === "") {
      throw new ManagerProviderError("invalid-request", "Declared extension repository URL must not be empty");
    }
    const catalog = await this.client.getJson("/customnode/getlist?mode=cache&skip_update=true", {
      ...(signal === undefined ? {} : { signal }),
    });
    const row = findRegistryRow(catalog, registry, request.url);
    const version = requestedVersion(request);
    await assertVersionAvailable(this.client, registry, version, signal);
    return row;
  }
}

export class ManagerProvider extends ComfyUiManagerProvider {}

export function isManagerProviderError(error: unknown): error is ManagerProviderError {
  return error instanceof ManagerProviderError;
}

export function isManagerClientError(error: unknown): error is ManagerClientError {
  return error instanceof ManagerClientError;
}
