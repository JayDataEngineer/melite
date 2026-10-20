import { createHash, randomBytes } from "node:crypto";
import { lstat, mkdir, open, readdir, realpath, rename, rm, stat, } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
export class ProvisioningError extends Error {
    code;
    constructor(code, message, cause) {
        super(message, cause === undefined ? undefined : { cause });
        this.name = "ProvisioningError";
        this.code = code;
    }
}
const SHA256 = /^[0-9a-f]{64}$/i;
const SAFE_OPERATION_ID = /^[A-Za-z0-9._-]+$/;
const HASH_CHUNK_BYTES = 1024 * 1024;
function abortError(signal) {
    const reason = signal.reason;
    if (reason instanceof Error) {
        return reason;
    }
    const error = new Error("artifact operation cancelled");
    error.name = "AbortError";
    return error;
}
function throwIfAborted(signal) {
    if (signal?.aborted === true) {
        throw abortError(signal);
    }
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
export function isValidSha256(value) {
    return SHA256.test(value.trim());
}
function normalizeDigest(value) {
    const digest = value.trim().toLowerCase();
    if (!SHA256.test(digest)) {
        throw new ProvisioningError("invalid-digest", "artifact SHA-256 must be 64 hexadecimal characters");
    }
    return digest;
}
function safeOperationId(value) {
    if (!SAFE_OPERATION_ID.test(value) || value === "." || value === "..") {
        throw new ProvisioningError("invalid-path", "artifact operation id is not a safe path segment");
    }
    return value;
}
export function resolveConfinedPath(root, relativePath) {
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
    return destination;
}
function within(root, candidate) {
    const rel = relative(root, candidate);
    return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}
async function existingKind(path) {
    try {
        const stat = await lstat(path);
        if (stat.isSymbolicLink())
            return "symlink";
        if (stat.isFile())
            return "file";
        if (stat.isDirectory())
            return "directory";
        return "other";
    }
    catch (error) {
        if (error.code === "ENOENT")
            return "missing";
        throw error;
    }
}
async function assertNoSymlink(root, destination) {
    const rel = relative(root, destination);
    const segments = rel.split(sep);
    let current = root;
    for (const segment of segments) {
        current = join(current, segment);
        const kind = await existingKind(current);
        if (kind === "symlink") {
            throw new ProvisioningError("invalid-path", "artifact path traverses a symbolic link");
        }
        if (kind !== "missing" && current !== destination && kind !== "directory") {
            throw new ProvisioningError("invalid-path", "artifact path traverses a non-directory");
        }
    }
}
async function createConfinedDirectory(root, directory) {
    const rel = relative(root, directory);
    if (rel === "")
        return;
    const segments = rel.split(sep);
    let current = root;
    for (const segment of segments) {
        current = join(current, segment);
        let kind = await existingKind(current);
        if (kind === "symlink") {
            throw new ProvisioningError("invalid-path", "artifact path traverses a symbolic link");
        }
        if (kind === "missing") {
            await mkdir(current, { recursive: true });
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
/** THE RANGE RESUME SCAN (audit download-stack-audit-2026-10-20 F7):
 *  the newest viable previous-attempt part for one destination — a
 *  non-empty `.part-*` sibling strictly smaller than the declared
 *  total (a full-size or oversized part is not a resume candidate;
 *  it faces the reaper). Same-destination flights are serialized by
 *  the service's per-resource operation locks, so the newest part is
 *  the last attempt's bytes, race-free by construction.
 */
async function newestAdoptablePart(destination, totalBytes) {
    const directory = dirname(destination);
    const prefix = `${basename(destination)}.part-`;
    let entries;
    try {
        entries = await readdir(directory);
    }
    catch {
        return null; // a missing directory has no previous attempt
    }
    let newest = null;
    for (const name of entries) {
        if (!name.startsWith(prefix))
            continue;
        const path = join(directory, name);
        const info = await stat(path).catch(() => undefined);
        if (info === undefined || !info.isFile())
            continue;
        if (info.size <= 0)
            continue;
        if (totalBytes !== undefined && info.size >= totalBytes)
            continue;
        if (newest === null || info.mtimeMs > newest.mtimeMs) {
            newest = { path, sizeBytes: info.size, mtimeMs: info.mtimeMs };
        }
    }
    return newest === null ? null : { path: newest.path, sizeBytes: newest.sizeBytes };
}
async function preparePath(root, destination) {
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
    if (destinationKind === "directory" || destinationKind === "other") {
        throw new ProvisioningError("invalid-path", "artifact destination is not a file");
    }
    return realRoot;
}
function iteratorFor(input) {
    if (typeof input === "object" && input !== null) {
        const asyncIterable = input;
        if (typeof asyncIterable[Symbol.asyncIterator] === "function") {
            const iterator = asyncIterable[Symbol.asyncIterator]();
            return {
                next: () => Promise.resolve(iterator.next()),
                return: async () => {
                    if (iterator.return !== undefined)
                        await iterator.return();
                    return { done: true, value: undefined };
                },
            };
        }
        const iterable = input;
        if (typeof iterable[Symbol.iterator] === "function") {
            const iterator = iterable[Symbol.iterator]();
            return {
                next: async () => iterator.next(),
                return: async () => {
                    if (iterator.return !== undefined)
                        iterator.return();
                    return { done: true, value: undefined };
                },
            };
        }
        const stream = input;
        if (typeof stream.getReader === "function") {
            const reader = stream.getReader();
            return {
                next: () => reader.read(),
                return: async () => {
                    await reader.cancel();
                    return { done: true, value: undefined };
                },
            };
        }
    }
    throw new ProvisioningError("source-invalid", "artifact source is not a byte stream");
}
async function nextChunk(iterator, signal) {
    if (signal === undefined) {
        return await iterator.next();
    }
    throwIfAborted(signal);
    return await new Promise((resolvePromise, rejectPromise) => {
        let settled = false;
        const finish = (fn) => {
            if (settled)
                return;
            settled = true;
            signal.removeEventListener("abort", onAbort);
            fn();
        };
        const onAbort = () => {
            finish(() => {
                void Promise.resolve(iterator.return()).catch(() => undefined);
                rejectPromise(abortError(signal));
            });
        };
        signal.addEventListener("abort", onAbort, { once: true });
        Promise.resolve()
            .then(() => iterator.next())
            .then((value) => finish(() => resolvePromise(value)), (error) => finish(() => rejectPromise(error)));
    });
}
async function closeIterator(iterator) {
    try {
        await iterator.return();
    }
    catch {
        return;
    }
}
async function writeAll(handle, bytes) {
    let offset = 0;
    while (offset < bytes.byteLength) {
        const result = await handle.write(bytes, offset, bytes.byteLength - offset);
        if (result.bytesWritten <= 0) {
            throw new Error("artifact write made no progress");
        }
        offset += result.bytesWritten;
    }
}
export async function sha256File(path, signal, onProgress) {
    const handle = await open(path, "r");
    const hash = createHash("sha256");
    const buffer = Buffer.allocUnsafe(HASH_CHUNK_BYTES);
    try {
        for (;;) {
            throwIfAborted(signal);
            const result = await handle.read(buffer, 0, buffer.length, null);
            if (result.bytesRead === 0)
                break;
            hash.update(buffer.subarray(0, result.bytesRead));
            onProgress?.(result.bytesRead);
        }
    }
    finally {
        await handle.close();
    }
    return hash.digest("hex");
}
export const hashFile = sha256File;
export class VerifiedArtifactWriter {
    root;
    constructor(root) {
        this.root = root;
    }
    async write(request, signal) {
        const expectedSha256 = request.expectedSha256 === undefined
            ? undefined
            : normalizeDigest(request.expectedSha256);
        const operationId = safeOperationId(request.operationId);
        const destination = resolveConfinedPath(request.root, request.relativePath);
        await preparePath(request.root, destination);
        throwIfAborted(signal);
        const temporary = `${destination}.part-${operationId}`;
        await rm(temporary, { force: true });
        // THE RANGE RESUME ADOPTION (audit download-stack-audit-2026-10-20
        // F7): a resume ask renames the previous attempt's newest viable
        // part to THIS operation's part name and opens for append — every
        // attempt mints its own operation id, so adoption-by-rename is
        // what moves the old bytes under the live part (and out of the
        // scan: the reaper can never eat an adopted part, it no longer
        // exists under the old name). A clean start (resumeFrom 0/absent)
        // keeps the delete-and-recreate the 200-fallback needs.
        let adopted = 0;
        if ((request.resumeFrom ?? 0) > 0) {
            const candidate = await newestAdoptablePart(destination, request.sizeBytes);
            if (candidate !== null) {
                if (candidate.path !== temporary)
                    await rename(candidate.path, temporary);
                adopted = candidate.sizeBytes;
            }
        }
        const iterator = iteratorFor(request.source);
        let handle;
        let landed = false;
        let sizeBytes = adopted;
        try {
            // append after an adopted prefix; exclusive-create on a clean
            // start (the "wx" of the original law, kept for that arm)
            handle = await open(temporary, adopted > 0 ? "a" : "wx", 0o600);
            for (;;) {
                const chunk = await nextChunk(iterator, signal);
                if (chunk.done)
                    break;
                if (!(chunk.value instanceof Uint8Array)) {
                    throw new ProvisioningError("source-invalid", "artifact source yielded a non-byte chunk");
                }
                if (chunk.value.byteLength === 0)
                    continue;
                throwIfAborted(signal);
                await writeAll(handle, chunk.value);
                sizeBytes += chunk.value.byteLength;
            }
            // THE FSYNC WINDOW (audit download-stack-audit-2026-10-20 F3):
            // a multi-GB fsync on a loaded disk can stall seconds with zero
            // stream movement — the FIRST boundary heartbeat fires BEFORE
            // the sync, so the plane's clock knows the verify is alive
            // through the flush (the hash's own chunks flow after it).
            request.onVerifyBytes?.(0);
            await handle.sync();
            await handle.close();
            handle = undefined;
            throwIfAborted(signal);
            request.onVerifyBytes?.(0);
            const temporarySha256 = await sha256File(temporary, signal, request.onVerifyBytes);
            if (expectedSha256 !== undefined && temporarySha256 !== expectedSha256) {
                throw new ProvisioningError("hash-mismatch", `artifact SHA-256 mismatch: expected ${expectedSha256}, got ${temporarySha256}`);
            }
            if (request.sizeBytes !== undefined && request.sizeBytes !== sizeBytes) {
                throw new ProvisioningError("size-mismatch", `artifact size mismatch: expected ${String(request.sizeBytes)}, got ${String(sizeBytes)}`);
            }
            throwIfAborted(signal);
            await rename(temporary, destination);
            landed = true;
            throwIfAborted(signal);
            const finalKind = await existingKind(destination);
            if (finalKind !== "file") {
                throw new ProvisioningError("landing-failed", "artifact destination is not a file after landing");
            }
            const finalSha256 = await sha256File(destination, signal, request.onVerifyBytes);
            if (expectedSha256 !== undefined && finalSha256 !== expectedSha256) {
                throw new ProvisioningError("landing-failed", "artifact destination changed after landing");
            }
            const finalStat = await stat(destination);
            if (request.sizeBytes !== undefined && finalStat.size !== request.sizeBytes) {
                throw new ProvisioningError("landing-failed", "artifact destination size changed after landing");
            }
            return {
                path: destination,
                sha256: finalSha256,
                sizeBytes: finalStat.size,
                integrity: expectedSha256 === undefined ? "operator-unverified" : "declared-sha256",
                ...(adopted > 0 ? { resumedFrom: adopted } : {}),
            };
        }
        catch (error) {
            if (handle !== undefined) {
                await handle.close().catch(() => undefined);
            }
            // THE PART DELETION LAW (audit download-stack-audit-2026-10-20
            // F7): only a mismatch verdict — a corrupt or mis-assembled
            // part, judged by the full-file sha256 / size checks above —
            // deletes the part. Every other non-landed exit (the stall
            // watchdog's abort, a cancel, a write fault) KEEPS it for the
            // next attempt to adopt; the kept bytes carry no trust, the
            // next flight's full-file hash is the anchor, and a bad prefix
            // lands right back here as a hash-mismatch deletion.
            const mismatch = error instanceof ProvisioningError
                && (error.code === "hash-mismatch" || error.code === "size-mismatch");
            if (!landed && mismatch) {
                await rm(temporary, { force: true }).catch(() => undefined);
            }
            if (error instanceof ProvisioningError)
                throw error;
            if (signal?.aborted === true || (error instanceof Error && error.name === "AbortError")) {
                throw new ProvisioningError("cancelled", "artifact operation cancelled", error);
            }
            throw new ProvisioningError("write-failed", `artifact write failed: ${errorMessage(error)}`, error);
        }
        finally {
            await closeIterator(iterator);
        }
    }
    async inspect(request, signal) {
        // READ law (2026-10-12, the krea-2 clip symlink): inspection
        // never writes, so it takes no mkdir side effect and no
        // write-side symlink refusal — an operator may satisfy a
        // declared row through a symlink laid out inside the store
        // (clip/qwen3vl_4b_fp8_scaled.safetensors -> text_encoders/).
        // Confinement stays real: the RESOLVED destination may never
        // read outside the root, enforced on the realpath.
        const destination = resolveConfinedPath(request.root, request.relativePath);
        const kind = await existingKind(destination);
        if (kind === "missing")
            return { present: false, path: destination };
        let realDestination;
        try {
            realDestination = await realpath(destination);
        }
        catch (error) {
            // a symlink whose target is gone reads as absent, never fatal
            if (error.code === "ENOENT") {
                return { present: false, path: destination };
            }
            throw error;
        }
        const rootPath = resolve(request.root);
        let realRoot = rootPath;
        try {
            realRoot = await realpath(rootPath);
        }
        catch {
            // a missing root cannot contain the destination that exists
        }
        if (!within(realRoot, realDestination)) {
            throw new ProvisioningError("invalid-path", "artifact inspection escapes its root");
        }
        const stats = await stat(realDestination);
        if (!stats.isFile()) {
            throw new ProvisioningError("invalid-path", "artifact inspection target is not a file");
        }
        const sha256 = await sha256File(realDestination, signal);
        if (request.expectedSha256 !== undefined && normalizeDigest(request.expectedSha256) !== sha256) {
            return { present: false, path: destination, sha256 };
        }
        return { present: true, path: destination, sha256, sizeBytes: stats.size };
    }
    /** THE RANGE RESUME MEASURE (audit download-stack-audit-2026-10-20
     *  F7): the previous attempt's kept part for one destination, or
     *  null — read BEFORE the fetch so the direct arm can ask
     *  `Range: bytes=N-`. A pure read: nothing is renamed here; the
     *  adoption happens inside write(), which re-runs the same scan
     *  under the caller's lock. */
    async adoptablePart(request) {
        const destination = resolveConfinedPath(request.root, request.relativePath);
        return await newestAdoptablePart(destination, request.sizeBytes);
    }
    /** The .part reaper (audit K-4, 2026-10-22): a crash mid-write
     *  orphans the `.part-<operationId>` sidecar past every in-process
     *  catch. The boot and periodic sweeps unlink the stale ones —
     *  a fresh part is a live download and survives; the writer's own
     *  mtime is the judge. Returns the unlinked count.
     *  @param options.olderThanMs — staleness bound, default
     *  {@link PART_STALE_MS}.
     *  @param options.signal — cancels the walk between directories. */
    async reapStaleParts(options = {}) {
        const olderThanMs = options.olderThanMs ?? PART_STALE_MS;
        const staleBefore = Date.now() - olderThanMs;
        let reaped = 0;
        const walk = async (dir) => {
            throwIfAborted(options.signal);
            let entries;
            try {
                entries = await readdir(dir, { withFileTypes: true });
            }
            catch {
                return; // a vanished or unreadable subtree has nothing to reap
            }
            for (const entry of entries) {
                const path = join(dir, entry.name);
                if (entry.isDirectory()) {
                    await walk(path);
                    continue;
                }
                if (!entry.isFile() || !PART_NAME.test(entry.name))
                    continue;
                const info = await stat(path).catch(() => undefined);
                if (info === undefined || info.mtimeMs > staleBefore)
                    continue;
                await rm(path, { force: true }).catch(() => undefined);
                reaped += 1;
            }
        };
        await walk(this.root);
        return reaped;
    }
}
/** A part is stale when its mtime froze for this long: the writer
 *  appends chunks continuously, so only a dead process leaves one
 *  this old (downloads legitimately take hours). */
export const PART_STALE_MS = 24 * 60 * 60 * 1000;
const PART_NAME = /\.part-/;
export async function writeVerifiedArtifact(request, signal) {
    return await new VerifiedArtifactWriter(request.root).write(request, signal);
}
export function newOperationId() {
    return randomBytes(16).toString("hex");
}
//# sourceMappingURL=artifact-writer.js.map