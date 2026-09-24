import type {
  ManagerInstallRequest,
  ManagerInstallResult,
  ManagerPort,
} from "./ports.ts";
import {
  ComfyUiManagerHttpClient,
  ManagerClientError,
  type ManagerQueueWaitOptions,
} from "./manager-client.ts";

export type ManagerProviderErrorCode = "invalid-request" | "pin-mismatch";

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

function catalogRows(value: unknown): readonly RegistryRow[] {
  if (!record(value) || !record(value["node_packs"])) {
    throw new ManagerProviderError("invalid-request", "ComfyUI-Manager custom-node catalog has an invalid shape");
  }
  const rows: RegistryRow[] = [];
  for (const [key, raw] of Object.entries(value["node_packs"])) {
    if (!record(raw)) continue;
    const id = stringValue(raw["id"]) ?? stringValue(raw["cnr_id"]) ?? key;
    const version = stringValue(raw["version"]);
    const repository = stringValue(raw["repository"]);
    if (version === undefined || version === "unknown" || repository === undefined) continue;
    rows.push({
      id,
      version,
      repository,
      channel: stringValue(raw["channel"]) ?? "default",
      files: stringArray(raw["files"]),
      pip: stringArray(raw["pip"]),
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
  if (!Array.isArray(value)) {
    throw new ManagerProviderError(
      "pin-mismatch",
      `ComfyUI-Manager returned no version list for ${registry}`,
    );
  }
  const available = value.some((entry) => record(entry) && entry["version"] === version);
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
