import type { SubprocessRuntime } from "@deepseek-ai/dsh-subprocess";
import { randomUUID } from "node:crypto";
import { lstat, mkdir, realpath, rename, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import type {
  ManagerInstallRequest,
  ManagerInstallResult,
  ManagerPort,
} from "./ports.ts";
import type { PinnedGitExtensionPort } from "./manager-provider.ts";

export type PinnedGitErrorCode =
  | "invalid-request"
  | "cancelled"
  | "git-failed"
  | "ref-mismatch"
  | "post-install-failed";

export class PinnedGitError extends Error {
  readonly code: PinnedGitErrorCode;

  constructor(code: PinnedGitErrorCode, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "PinnedGitError";
    this.code = code;
  }
}

export interface GitCommandResult {
  readonly stdout: string;
  readonly stderr: string;
}

export interface GitCommandOptions {
  readonly cwd?: string;
  readonly signal?: AbortSignal;
}

export interface GitCommandRunner {
  run(args: readonly string[], options?: GitCommandOptions): Promise<GitCommandResult>;
}

export interface GitExtensionPostInstallContext {
  readonly directory: string;
  readonly requirements: readonly string[];
  readonly signal?: AbortSignal;
}

export interface PinnedGitExtensionProviderOptions {
  readonly customNodesRoot: string;
  /** The git runner — required (no silent default): the estate
   *  composition seats SubprocessGitCommandRunner on the subprocess
   *  seat; tests seat a fake or the real provider. */
  readonly runner: GitCommandRunner;
  readonly commandTimeoutMs?: number;
  readonly postInstall?: (
    context: GitExtensionPostInstallContext,
  ) => Promise<void>;
}

const DEFAULT_COMMAND_TIMEOUT_MS = 120_000;
const DEFAULT_GIT_OUTPUT_BYTES = 1024 * 1024;
/** TERM-to-KILL room for a git child the caller aborted: git removes its
 *  lockfiles on TERM, so the grace is part of the abort contract. */
const GIT_TERMINATE_GRACE_MS = 5_000;
const SAFE_ID = /^[A-Za-z0-9._-]+$/u;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function signalAborted(signal: AbortSignal | undefined): boolean {
  return signal?.aborted === true;
}

/** Git runner on the DSH subprocess seat: provider-managed process ranges,
 *  credential-scrubbed child environment, and collected output bounded by
 *  the same byte cap the execFile wrapper used to enforce (the seat's
 *  collect-mode tail keeps the DIAGNOSTIC tail; a 1 MiB git stdout is
 *  already pathological). Rejects on any non-zero exit or signal death —
 *  the provider's runGit owns the PinnedGitError fold. */
export class SubprocessGitCommandRunner implements GitCommandRunner {
  readonly maxOutputBytes: number;

  constructor(
    private readonly runtime: SubprocessRuntime,
    maxOutputBytes = DEFAULT_GIT_OUTPUT_BYTES,
  ) {
    if (!Number.isSafeInteger(maxOutputBytes) || maxOutputBytes <= 0) {
      throw new PinnedGitError("invalid-request", "Git output bound must be a positive integer");
    }
    this.maxOutputBytes = maxOutputBytes;
  }

  async run(args: readonly string[], options: GitCommandOptions = {}): Promise<GitCommandResult> {
    const handle = this.runtime.spawn({
      argv: ["git", ...args],
      cwd: options.cwd ?? process.cwd(),
      stdio: {
        stdin: "ignore",
        stdout: { maxBytes: this.maxOutputBytes },
        stderr: { maxBytes: this.maxOutputBytes },
      },
      graceMs: GIT_TERMINATE_GRACE_MS,
      ...(options.signal === undefined ? {} : { signal: options.signal }),
    });
    const outcome = await handle.done;
    const stdout = handle.collected.stdout?.readFrom(0).text ?? "";
    const stderr = handle.collected.stderr?.readFrom(0).text ?? "";
    if (outcome.exitCode !== 0) {
      const how = outcome.exitCode === null
        ? `died on ${outcome.signal ?? "an unknown signal"}`
        : `exited with code ${String(outcome.exitCode)}`;
      throw new Error(`git ${how}${stderr === "" ? "" : `: ${stderr.trim()}`}`);
    }
    return { stdout, stderr };
  }
}

function safeId(value: string): string {
  if (!SAFE_ID.test(value) || value === "." || value === "..") {
    throw new PinnedGitError("invalid-request", "Extension id must be one safe path segment");
  }
  return value;
}

function validRef(value: string): string {
  const ref = value.trim();
  const invalid = ref === ""
    || ref.length > 255
    || ref.startsWith("-")
    || ref.startsWith("/")
    || ref.endsWith("/")
    || ref.startsWith(".")
    || ref.endsWith(".")
    || ref.endsWith(".lock")
    || ref.includes("..")
    || ref.includes("@{")
    || /[\u0000-\u0020~^:?*[\\]/u.test(ref);
  if (invalid) {
    throw new PinnedGitError("invalid-request", "Declared git ref is invalid");
  }
  return ref;
}

function validRepository(value: string): string {
  const repository = value.trim();
  if (repository === "" || repository.includes("\0")) {
    throw new PinnedGitError("invalid-request", "Declared git repository is invalid");
  }
  if (/^[^@\s]+@[^:\s]+:.+$/u.test(repository)) return repository;
  let url: URL;
  try {
    url = new URL(repository);
  } catch (error: unknown) {
    throw new PinnedGitError("invalid-request", "Declared git repository is invalid", error);
  }
  if (!new Set(["https:", "ssh:", "git:"]).has(url.protocol)) {
    throw new PinnedGitError("invalid-request", "Declared git repository protocol is not allowed");
  }
  if (url.username !== "" || url.password !== "") {
    throw new PinnedGitError("invalid-request", "Declared git repository must not contain credentials");
  }
  return repository;
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

async function pathKind(path: string): Promise<"missing" | "directory" | "file" | "symlink" | "other"> {
  try {
    const value = await lstat(path);
    if (value.isSymbolicLink()) return "symlink";
    if (value.isDirectory()) return "directory";
    if (value.isFile()) return "file";
    return "other";
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "missing";
    throw error;
  }
}

async function confinedRoot(value: string): Promise<string> {
  await mkdir(value, { recursive: true });
  if (await pathKind(value) !== "directory") {
    throw new PinnedGitError("invalid-request", "Custom-node root must be a real directory");
  }
  return await realpath(value);
}

function cancelledError(): PinnedGitError {
  return new PinnedGitError("cancelled", "Pinned git installation was cancelled");
}

export class PinnedGitExtensionProvider implements ManagerPort, PinnedGitExtensionPort {
  readonly customNodesRoot: string;
  readonly commandTimeoutMs: number;
  private readonly runner: GitCommandRunner;
  private readonly postInstall: PinnedGitExtensionProviderOptions["postInstall"];

  constructor(options: PinnedGitExtensionProviderOptions) {
    if (options.customNodesRoot.trim() === "") {
      throw new PinnedGitError("invalid-request", "Custom-node root is required");
    }
    this.customNodesRoot = resolve(options.customNodesRoot);
    this.commandTimeoutMs = options.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    if (!Number.isSafeInteger(this.commandTimeoutMs) || this.commandTimeoutMs <= 0) {
      throw new PinnedGitError("invalid-request", "Git command timeout must be a positive integer");
    }
    this.runner = options.runner;
    this.postInstall = options.postInstall;
  }

  async canInstall(request: ManagerInstallRequest): Promise<boolean> {
    try {
      this.validate(request);
      return true;
    } catch {
      return false;
    }
  }

  async install(request: ManagerInstallRequest, signal?: AbortSignal): Promise<ManagerInstallResult> {
    const validated = this.validate(request);
    const postInstall = this.postInstall;
    const root = await confinedRoot(this.customNodesRoot);
    const destination = join(root, validated.id);
    const temporary = join(root, `.${validated.id}.part-${randomUUID()}`);
    let commit: string;
    try {
      commit = await this.fetchExact(root, temporary, validated.repository, validated.ref, signal);
      const existing = await pathKind(destination);
      if (existing === "missing") {
        if (await pathKind(destination) !== "missing") {
          throw new PinnedGitError("ref-mismatch", "Extension destination changed during installation");
        }
        await rename(temporary, destination);
      } else {
        if (existing !== "directory") {
          throw new PinnedGitError("ref-mismatch", "Extension destination is not a real directory");
        }
        const current = await this.runGit(["-C", destination, "rev-parse", "HEAD"], root, signal);
        const remote = await this.runGit(["-C", destination, "remote", "get-url", "origin"], root, signal);
        if (
          current.stdout.trim() !== commit
          || normalizedRepository(remote.stdout.trim()) !== normalizedRepository(validated.repository)
        ) {
          throw new PinnedGitError(
            "ref-mismatch",
            `Installed extension does not match declared ref ${validated.ref}`,
          );
        }
      }
      if (validated.requirements.length > 0) {
        try {
          await postInstall!({
            directory: destination,
            requirements: validated.requirements,
            ...(signal === undefined ? {} : { signal }),
          });
        } catch (error: unknown) {
          if (signalAborted(signal)) throw cancelledError();
          throw new PinnedGitError(
            "post-install-failed",
            `Pinned git post-install failed: ${errorMessage(error)}`,
            error,
          );
        }
      }
      return {
        installed: true,
        detail: `installed ${validated.id} at ${validated.ref} (${commit})`,
      };
    } finally {
      await rm(temporary, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private validate(request: ManagerInstallRequest): {
    readonly id: string;
    readonly repository: string;
    readonly ref: string;
    readonly requirements: readonly string[];
  } {
    if (request.ref === undefined) {
      throw new PinnedGitError("invalid-request", "Pinned git installation requires a declared ref");
    }
    if (request.version !== undefined) {
      throw new PinnedGitError("invalid-request", "A git ref cannot be combined with an unverified version");
    }
    const requirements = request.requirements ?? [];
    if (requirements.some((requirement) => requirement.trim() === "")) {
      throw new PinnedGitError("invalid-request", "Declared git requirements must not be empty");
    }
    if (requirements.length > 0 && this.postInstall === undefined) {
      throw new PinnedGitError(
        "invalid-request",
        "Declared git requirements require a post-install adapter",
      );
    }
    if (request.url === undefined) {
      throw new PinnedGitError("invalid-request", "Pinned git installation requires a repository URL");
    }
    return {
      id: safeId(request.id),
      repository: validRepository(request.url),
      ref: validRef(request.ref),
      requirements: [...requirements],
    };
  }

  private async fetchExact(
    root: string,
    temporary: string,
    repository: string,
    ref: string,
    signal?: AbortSignal,
  ): Promise<string> {
    await this.runGit(["init", "--quiet", temporary], root, signal);
    await this.runGit(["-C", temporary, "remote", "add", "origin", repository], root, signal);
    await this.runGit(
      ["-C", temporary, "fetch", "--depth=1", "--no-tags", "origin", ref],
      root,
      signal,
    );
    await this.runGit(["-C", temporary, "checkout", "--detach", "--force", "FETCH_HEAD"], root, signal);
    const result = await this.runGit(["-C", temporary, "rev-parse", "HEAD"], root, signal);
    const commit = result.stdout.trim();
    if (!/^[0-9a-f]{40,64}$/iu.test(commit)) {
      throw new PinnedGitError("git-failed", "Git did not report a fetched commit");
    }
    return commit;
  }

  private async runGit(args: readonly string[], cwd: string, signal?: AbortSignal): Promise<GitCommandResult> {
    if (signalAborted(signal)) throw cancelledError();
    const controller = new AbortController();
    let timedOut = false;
    const onAbort = (): void => controller.abort(signal?.reason);
    signal?.addEventListener("abort", onAbort, { once: true });
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.commandTimeoutMs);
    try {
      return await this.runner.run(args, { cwd, signal: controller.signal });
    } catch (error: unknown) {
      if (signalAborted(signal)) throw cancelledError();
      if (timedOut) {
        throw new PinnedGitError(
          "git-failed",
          `Git command exceeded ${String(this.commandTimeoutMs)} ms`,
          error,
        );
      }
      throw new PinnedGitError("git-failed", `Git command failed: ${errorMessage(error)}`, error);
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
  }
}
