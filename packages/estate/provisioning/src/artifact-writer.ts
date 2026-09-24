import { createHash, randomBytes } from "node:crypto";
import {
  lstat,
  mkdir,
  open,
  realpath,
  rename,
  rm,
  stat,
  type FileHandle,
} from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

export type ArtifactInput =
  | AsyncIterable<Uint8Array>
  | Iterable<Uint8Array>
  | ReadableStream<Uint8Array>;

export type ArtifactErrorCode =
  | "invalid-path"
  | "invalid-digest"
  | "cancelled"
  | "hash-mismatch"
  | "size-mismatch"
  | "source-invalid"
  | "write-failed"
  | "landing-failed";

export class ProvisioningError extends Error {
  readonly code: ArtifactErrorCode;

  constructor(code: ArtifactErrorCode, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "ProvisioningError";
    this.code = code;
  }
}

export interface VerifiedArtifactRequest {
  readonly root: string;
  readonly relativePath: string;
  readonly expectedSha256: string;
  readonly operationId: string;
  readonly source: ArtifactInput;
  readonly sizeBytes?: number;
}

export interface VerifiedArtifactResult {
  readonly path: string;
  readonly sha256: string;
  readonly sizeBytes: number;
}

export interface ArtifactInspectionRequest {
  readonly root: string;
  readonly relativePath: string;
  readonly expectedSha256?: string;
}

export interface ArtifactInspection {
  readonly present: boolean;
  readonly path?: string;
  readonly sha256?: string;
  readonly sizeBytes?: number;
}

export interface ArtifactWriterPort {
  write(
    request: VerifiedArtifactRequest,
    signal?: AbortSignal,
  ): Promise<VerifiedArtifactResult>;
  inspect?(
    request: ArtifactInspectionRequest,
    signal?: AbortSignal,
  ): Promise<ArtifactInspection>;
}

const SHA256 = /^[0-9a-f]{64}$/i;
const SAFE_OPERATION_ID = /^[A-Za-z0-9._-]+$/;
const HASH_CHUNK_BYTES = 1024 * 1024;

function abortError(signal: AbortSignal): Error {
  const reason: unknown = signal.reason;
  if (reason instanceof Error) {
    return reason;
  }
  const error = new Error("artifact operation cancelled");
  error.name = "AbortError";
  return error;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted === true) {
    throw abortError(signal);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function isValidSha256(value: string): boolean {
  return SHA256.test(value.trim());
}

function normalizeDigest(value: string): string {
  const digest = value.trim().toLowerCase();
  if (!SHA256.test(digest)) {
    throw new ProvisioningError(
      "invalid-digest",
      "artifact SHA-256 must be 64 hexadecimal characters",
    );
  }
  return digest;
}

function safeOperationId(value: string): string {
  if (!SAFE_OPERATION_ID.test(value) || value === "." || value === "..") {
    throw new ProvisioningError(
      "invalid-path",
      "artifact operation id is not a safe path segment",
    );
  }
  return value;
}

export function resolveConfinedPath(root: string, relativePath: string): string {
  if (root.trim() === "" || relativePath.trim() === "") {
    throw new ProvisioningError("invalid-path", "artifact root and path are required");
  }
  if (relativePath.includes("\0") || relativePath.includes("\\")) {
    throw new ProvisioningError("invalid-path", "artifact path contains an invalid segment");
  }
  if (isAbsolute(relativePath)) {
    throw new ProvisioningError("invalid-path", "artifact path must be relative to its root");
  }
  const segments = relativePath.split("/");
  for (const segment of segments) {
    if (segment === "" || segment === "." || segment === "..") {
      throw new ProvisioningError("invalid-path", "artifact path contains an unsafe segment");
    }
  }
  const rootPath = resolve(root);
  const destination = resolve(rootPath, ...segments);
  const rel = relative(rootPath, destination);
  if (rel === "" || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new ProvisioningError("invalid-path", "artifact path escapes its configured root");
  }
  return destination;
}

function within(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

async function existingKind(path: string): Promise<"missing" | "file" | "directory" | "symlink" | "other"> {
  try {
    const stat = await lstat(path);
    if (stat.isSymbolicLink()) return "symlink";
    if (stat.isFile()) return "file";
    if (stat.isDirectory()) return "directory";
    return "other";
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "missing";
    throw error;
  }
}

async function assertNoSymlink(root: string, destination: string): Promise<void> {
  const rel = relative(root, destination);
  const segments = rel === "" ? [] : rel.split(sep);
  let current = root;
  for (const segment of segments) {
    current = join(current, segment);
    const kind = await existingKind(current);
    if (kind === "symlink") {
      throw new ProvisioningError(
        "invalid-path",
        "artifact path traverses a symbolic link",
      );
    }
    if (kind !== "missing" && current !== destination && kind !== "directory") {
      throw new ProvisioningError(
        "invalid-path",
        "artifact path traverses a non-directory",
      );
    }
  }
}

async function createConfinedDirectory(root: string, directory: string): Promise<void> {
  const rel = relative(root, directory);
  if (rel === "") return;
  const segments = rel.split(sep);
  let current = root;
  for (const segment of segments) {
    current = join(current, segment);
    let kind = await existingKind(current);
    if (kind === "symlink") {
      throw new ProvisioningError("invalid-path", "artifact path traverses a symbolic link");
    }
    if (kind === "missing") {
      try {
        await mkdir(current);
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      }
      kind = await existingKind(current);
    }
    if (kind === "symlink") {
      throw new ProvisioningError("invalid-path", "artifact path traverses a symbolic link");
    }
    if (kind !== "directory") {
      throw new ProvisioningError("invalid-path", "artifact path traverses a non-directory");
    }
  }
}

async function preparePath(root: string, destination: string): Promise<string> {
  const rootPath = resolve(root);
  await mkdir(rootPath, { recursive: true });
  const realRoot = await realpath(rootPath);
  const parent = dirname(destination);
  await createConfinedDirectory(rootPath, parent);
  await assertNoSymlink(rootPath, destination);
  const realParent = await realpath(parent);
  if (!within(realRoot, realParent)) {
    throw new ProvisioningError("invalid-path", "artifact destination escapes its root");
  }
  const destinationKind = await existingKind(destination);
  if (destinationKind === "symlink") {
    throw new ProvisioningError("invalid-path", "artifact destination is a symbolic link");
  }
  if (destinationKind === "directory" || destinationKind === "other") {
    throw new ProvisioningError("invalid-path", "artifact destination is not a file");
  }
  return realRoot;
}

function iteratorFor(input: ArtifactInput): AsyncIterableIterator<Uint8Array> {
  if (typeof input === "object" && input !== null) {
    const asyncIterable = input as AsyncIterable<Uint8Array>;
    if (typeof asyncIterable[Symbol.asyncIterator] === "function") {
      const iterator = asyncIterable[Symbol.asyncIterator]();
      return {
        next: (): Promise<IteratorResult<Uint8Array>> => Promise.resolve(iterator.next()),
        return: async (): Promise<IteratorResult<Uint8Array>> => {
          if (iterator.return !== undefined) await iterator.return();
          return { done: true, value: undefined };
        },
        [Symbol.asyncIterator](): AsyncIterableIterator<Uint8Array> {
          return this;
        },
      };
    }
    const iterable = input as Iterable<Uint8Array>;
    if (typeof iterable[Symbol.iterator] === "function") {
      const iterator = iterable[Symbol.iterator]();
      return {
        next: async (): Promise<IteratorResult<Uint8Array>> => iterator.next(),
        return: async (): Promise<IteratorResult<Uint8Array>> => {
          if (iterator.return !== undefined) iterator.return();
          return { done: true, value: undefined };
        },
        [Symbol.asyncIterator](): AsyncIterableIterator<Uint8Array> {
          return this;
        },
      };
    }
    const stream = input as ReadableStream<Uint8Array>;
    if (typeof stream.getReader === "function") {
      const reader = stream.getReader();
      return {
        next: (): Promise<IteratorResult<Uint8Array>> => reader.read(),
        return: async (): Promise<IteratorResult<Uint8Array>> => {
          await reader.cancel();
          return { done: true, value: undefined };
        },
        [Symbol.asyncIterator](): AsyncIterableIterator<Uint8Array> {
          return this;
        },
      };
    }
  }
  throw new ProvisioningError("source-invalid", "artifact source is not a byte stream");
}

async function nextChunk(
  iterator: AsyncIterator<Uint8Array>,
  signal?: AbortSignal,
): Promise<IteratorResult<Uint8Array>> {
  if (signal === undefined) {
    return await iterator.next();
  }
  throwIfAborted(signal);
  return await new Promise<IteratorResult<Uint8Array>>((resolvePromise, rejectPromise) => {
    let settled = false;
    const finish = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", onAbort);
      fn();
    };
    const onAbort = (): void => {
      finish(() => {
        if (iterator.return !== undefined) {
          void Promise.resolve(iterator.return()).catch(() => undefined);
        }
        rejectPromise(abortError(signal));
      });
    };
    signal.addEventListener("abort", onAbort, { once: true });
    Promise.resolve()
      .then(() => iterator.next())
      .then(
        (value) => finish(() => resolvePromise(value)),
        (error: unknown) => finish(() => rejectPromise(error)),
      );
  });
}

async function closeIterator(iterator: AsyncIterator<Uint8Array>): Promise<void> {
  if (iterator.return === undefined) return;
  try {
    await iterator.return();
  } catch {
    return;
  }
}

async function writeAll(handle: FileHandle, bytes: Uint8Array): Promise<void> {
  let offset = 0;
  while (offset < bytes.byteLength) {
    const result = await handle.write(bytes, offset, bytes.byteLength - offset);
    if (result.bytesWritten <= 0) {
      throw new Error("artifact write made no progress");
    }
    offset += result.bytesWritten;
  }
}

export async function sha256File(path: string, signal?: AbortSignal): Promise<string> {
  const handle = await open(path, "r");
  const hash = createHash("sha256");
  const buffer = Buffer.allocUnsafe(HASH_CHUNK_BYTES);
  try {
    for (;;) {
      throwIfAborted(signal);
      const result = await handle.read(buffer, 0, buffer.length, null);
      if (result.bytesRead === 0) break;
      hash.update(buffer.subarray(0, result.bytesRead));
    }
  } finally {
    await handle.close();
  }
  return hash.digest("hex");
}

export const hashFile = sha256File;

export class VerifiedArtifactWriter implements ArtifactWriterPort {
  readonly root: string;

  constructor(root: string) {
    this.root = root;
  }

  async write(
    request: VerifiedArtifactRequest,
    signal?: AbortSignal,
  ): Promise<VerifiedArtifactResult> {
    const expectedSha256 = normalizeDigest(request.expectedSha256);
    const operationId = safeOperationId(request.operationId);
    const destination = resolveConfinedPath(request.root, request.relativePath);
    await preparePath(request.root, destination);
    throwIfAborted(signal);
    const temporary = `${destination}.part-${operationId}`;
    await rm(temporary, { force: true });
    const iterator = iteratorFor(request.source);
    let handle: FileHandle | undefined;
    let landed = false;
    let sizeBytes = 0;
    try {
      handle = await open(temporary, "wx", 0o600);
      for (;;) {
        const chunk = await nextChunk(iterator, signal);
        if (chunk.done) break;
        if (!(chunk.value instanceof Uint8Array)) {
          throw new ProvisioningError("source-invalid", "artifact source yielded a non-byte chunk");
        }
        if (chunk.value.byteLength === 0) continue;
        throwIfAborted(signal);
        await writeAll(handle, chunk.value);
        sizeBytes += chunk.value.byteLength;
      }
      await handle.sync();
      await handle.close();
      handle = undefined;
      throwIfAborted(signal);
      const temporarySha256 = await sha256File(temporary, signal);
      if (temporarySha256 !== expectedSha256) {
        throw new ProvisioningError(
          "hash-mismatch",
          `artifact SHA-256 mismatch: expected ${expectedSha256}, got ${temporarySha256}`,
        );
      }
      if (request.sizeBytes !== undefined && request.sizeBytes !== sizeBytes) {
        throw new ProvisioningError(
          "size-mismatch",
          `artifact size mismatch: expected ${String(request.sizeBytes)}, got ${String(sizeBytes)}`,
        );
      }
      throwIfAborted(signal);
      await rename(temporary, destination);
      landed = true;
      throwIfAborted(signal);
      const finalKind = await existingKind(destination);
      if (finalKind !== "file") {
        throw new ProvisioningError("landing-failed", "artifact destination is not a file after landing");
      }
      const finalSha256 = await sha256File(destination, signal);
      if (finalSha256 !== expectedSha256) {
        throw new ProvisioningError("landing-failed", "artifact destination changed after landing");
      }
      const finalStat = await stat(destination);
      if (request.sizeBytes !== undefined && finalStat.size !== request.sizeBytes) {
        throw new ProvisioningError("landing-failed", "artifact destination size changed after landing");
      }
      return { path: destination, sha256: finalSha256, sizeBytes: finalStat.size };
    } catch (error: unknown) {
      if (handle !== undefined) {
        await handle.close().catch(() => undefined);
      }
      if (!landed) {
        await rm(temporary, { force: true }).catch(() => undefined);
      }
      if (error instanceof ProvisioningError) throw error;
      if (signal?.aborted === true || (error instanceof Error && error.name === "AbortError")) {
        throw new ProvisioningError("cancelled", "artifact operation cancelled", error);
      }
      throw new ProvisioningError("write-failed", `artifact write failed: ${errorMessage(error)}`, error);
    } finally {
      await closeIterator(iterator).catch(() => undefined);
    }
  }

  async inspect(
    request: ArtifactInspectionRequest,
    signal?: AbortSignal,
  ): Promise<ArtifactInspection> {
    const destination = resolveConfinedPath(request.root, request.relativePath);
    await preparePath(request.root, destination);
    const kind = await existingKind(destination);
    if (kind !== "file") return { present: false, path: destination };
    const sha256 = await sha256File(destination, signal);
    if (request.expectedSha256 !== undefined && normalizeDigest(request.expectedSha256) !== sha256) {
      return { present: false, path: destination, sha256 };
    }
    const stats = await stat(destination);
    return { present: true, path: destination, sha256, sizeBytes: stats.size };
  }
}

export async function writeVerifiedArtifact(
  request: VerifiedArtifactRequest,
  signal?: AbortSignal,
): Promise<VerifiedArtifactResult> {
  return await new VerifiedArtifactWriter(request.root).write(request, signal);
}

export function newOperationId(): string {
  return randomBytes(16).toString("hex");
}
