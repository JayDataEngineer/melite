import { ComfyUiManagerHttpClient, ManagerClientError, } from "./manager-client.js";
export class ManagerProviderError extends Error {
    code;
    constructor(code, message, cause) {
        super(message, cause === undefined ? undefined : { cause });
        this.name = "ManagerProviderError";
        this.code = code;
    }
}
/** THE GIT-URL INSTALL BUDGET. Manager's /customnode/install/git_url
 *  route is SYNCHRONOUS — it clones, checks out the commit, and runs the
 *  pack's pip leg inside the request (manager_server.py:1557-1584 →
 *  manager_core.py:2360-2368). The client's default request timeout
 *  cannot cover that: a cold pack blew the fuse before this was
 *  measured. The CLI uses 900 s; the estate matches it. */
export const EXTENSION_INSTALL_TIMEOUT_MS = 900_000;
/** A declared ref must be a commit, never a branch: Manager splits the
 *  url on its LAST '@' and checks the result out, so a branch name
 *  would either fail the clone or silently float to whatever HEAD is. */
const DECLARED_REF = /^[0-9a-f]{7,64}$/iu;
function repoIdentity(url) {
    return url
        .replace(/\.git$/u, "")
        .replace(/@.*$/u, "")
        .replace(/^git\+/u, "")
        .replace(/^https?:\/\/github\.com\//iu, "github.com/")
        .replace(/^git@github\.com:/iu, "github.com/")
        .replace(/\/+$/u, "")
        .toLowerCase();
}
/** Manager serves `aux_id` WITHOUT the host prefix — `ltdrdata/ComfyUI-Impact-Pack`,
 * not `github.com/ltdrdata/ComfyUI-Impact-Pack` (the cold-start tier caught this
 * live: the host-bearing canonical form never matched the bare row, so every
 * git-door pin refused as unverifiable on a real engine). Both forms are
 * accepted: a row whose aux_id is a full URL still matches via repoIdentity. */
function bareIdentity(url) {
    return url
        .replace(/\.git$/u, "")
        .replace(/@.*$/u, "")
        .replace(/^git\+/u, "")
        .replace(/^(?:https?:\/\/|git@)[^/]*\//iu, "")
        .replace(/\/+$/u, "")
        .toLowerCase();
}
/** Conservative floor rate for declared model downloads: the queue
 *  budget grants at least this many bytes per second of wall time
 *  (residential HF pulls measure ~3 MiB/s; 1 MiB/s leaves slack). */
export const MODEL_QUEUE_BYTES_PER_SEC = 1_048_576;
/** Hard ceiling on a single model install's queue-drain wait — a
 *  dead queue must still surface within an operator's shift. */
export const MODEL_QUEUE_MAX_TIMEOUT_MS = 14_400_000;
/**
 * Queue-drain budget for a model install: the default (extension-
 * sized) floor, raised by the declared artifact size at the floor
 * rate, clamped to the ceiling.
 *
 * @param sizeBytes declared artifact size in bytes, when known
 * @param defaultMs the wait budget used when no size is declared
 * @returns the per-install queue-drain timeout in milliseconds
 */
export function modelQueueTimeoutMs(sizeBytes, defaultMs) {
    if (sizeBytes === undefined) {
        return defaultMs;
    }
    const sized = Math.ceil((sizeBytes / MODEL_QUEUE_BYTES_PER_SEC) * 1000);
    return Math.min(Math.max(defaultMs, sized), MODEL_QUEUE_MAX_TIMEOUT_MS);
}
function record(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function stringValue(value) {
    return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}
function stringArray(value) {
    return Array.isArray(value) ? value.filter((entry) => typeof entry === "string") : [];
}
function normalizedRepository(value) {
    const trimmed = value.trim().replace(/\/+$/u, "").replace(/\.git$/iu, "");
    const scp = /^([^@\s]+)@([^:\s]+):(.+)$/u.exec(trimmed);
    if (scp !== null)
        return `${scp[1]}@${scp[2].toLowerCase()}:${scp[3]}`;
    try {
        const url = new URL(trimmed);
        url.hostname = url.hostname.toLowerCase();
        url.pathname = url.pathname.replace(/\/+$/u, "").replace(/\.git$/iu, "");
        return url.toString().replace(/\/$/u, "");
    }
    catch {
        return trimmed;
    }
}
function normalizedModelSavePath(value) {
    const trimmed = value.trim();
    if (trimmed.startsWith("/") || trimmed.startsWith("\\") || trimmed.includes("\0")) {
        return undefined;
    }
    const segments = trimmed.replace(/\\/gu, "/").split("/");
    const clean = segments.filter((segment) => segment !== "" && segment !== ".");
    if (clean.some((segment) => segment === ".."))
        return undefined;
    const withoutRoot = clean[0] === "models" ? clean.slice(1) : clean;
    const normalized = withoutRoot.join("/");
    return normalized === "" || normalized === "models" ? "default" : normalized;
}
function normalizedModelFilename(value) {
    const normalized = value.trim();
    if (normalized === ""
        || normalized === "."
        || normalized === ".."
        || normalized.includes("/")
        || normalized.includes("\\")
        || normalized.includes("\0")) {
        return undefined;
    }
    return normalized;
}
function modelCatalogCandidates(value) {
    if (!record(value) || !Array.isArray(value["models"])) {
        throw new ManagerProviderError("model-metadata", "ComfyUI-Manager external-model catalog has an invalid shape");
    }
    const candidates = [];
    for (const raw of value["models"]) {
        if (!record(raw))
            continue;
        const savePath = stringValue(raw["save_path"]);
        const filename = stringValue(raw["filename"]);
        if (savePath === undefined || filename === undefined)
            continue;
        const normalizedSavePath = normalizedModelSavePath(savePath);
        const normalizedFilename = normalizedModelFilename(filename);
        if (normalizedSavePath === undefined || normalizedFilename === undefined)
            continue;
        candidates.push({ savePath: normalizedSavePath, filename: normalizedFilename, raw });
    }
    return candidates;
}
function findModelCatalogRow(value, savePath, filename) {
    const matches = modelCatalogCandidates(value).filter((candidate) => candidate.savePath === savePath && candidate.filename === filename);
    if (matches.length !== 1) {
        throw new ManagerProviderError("model-unregistered", `ComfyUI-Manager external-model catalog does not contain exactly one row for ${savePath}/${filename}`);
    }
    const raw = matches[0].raw;
    const savePathValue = stringValue(raw["save_path"]);
    const name = stringValue(raw["name"]);
    const type = stringValue(raw["type"]);
    const base = stringValue(raw["base"]);
    const url = stringValue(raw["url"]);
    if (savePathValue === undefined || name === undefined || type === undefined || base === undefined || url === undefined) {
        throw new ManagerProviderError("model-metadata", `ComfyUI-Manager external-model catalog row for ${savePath}/${filename} is missing required metadata`);
    }
    return { name, type, base, savePath: savePathValue, url, filename };
}
export async function postManagerPip(client, requirements, signal) {
    if (requirements.length === 0)
        return;
    await client.post("/customnode/install/pip", { packages: requirements.join(" ") }, {
        ...(signal === undefined ? {} : { signal }),
    });
}
function catalogRows(value) {
    if (!record(value)) {
        throw new ManagerProviderError("invalid-request", "ComfyUI-Manager custom-node catalog has an invalid shape");
    }
    const source = record(value["node_packs"])
        ? Object.entries(value["node_packs"])
        : Array.isArray(value["custom_nodes"])
            ? value["custom_nodes"].map((raw, index) => [String(index), raw])
            : [];
    if (source.length === 0 && !record(value["node_packs"]) && !Array.isArray(value["custom_nodes"])) {
        throw new ManagerProviderError("invalid-request", "ComfyUI-Manager custom-node catalog has an invalid shape");
    }
    const rows = [];
    for (const [key, raw] of source) {
        if (!record(raw))
            continue;
        const id = stringValue(raw["id"]) ?? stringValue(raw["cnr_id"]) ?? stringValue(raw["name"]) ?? (record(value["node_packs"]) ? key : undefined);
        const version = stringValue(raw["version"]) ?? stringValue(raw["selected_version"]) ?? "unknown";
        const repository = stringValue(raw["repository"]) ?? stringValue(raw["reference"]) ?? stringValue(raw["git_url"]) ?? stringValue(raw["url"]);
        if (id === undefined || repository === undefined)
            continue;
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
function findRegistryRow(value, registry, url) {
    const rows = catalogRows(value);
    const matches = rows.filter((row) => row.id === registry);
    if (matches.length !== 1) {
        throw new ManagerProviderError("pin-mismatch", `ComfyUI-Manager registry does not contain exactly one row for ${registry}`);
    }
    const row = matches[0];
    const declaredRepository = url === undefined || url.trim() === "" ? "" : normalizedRepository(url);
    const catalogRepository = normalizedRepository(row.repository);
    const fileMatch = declaredRepository !== "" && row.files.some((file) => normalizedRepository(file) === declaredRepository);
    if (declaredRepository !== "" && catalogRepository !== declaredRepository && !fileMatch) {
        throw new ManagerProviderError("pin-mismatch", `ComfyUI-Manager registry row ${registry} does not match the declared repository`);
    }
    return row;
}
function requestedVersion(request) {
    if (request.version === undefined)
        return "latest";
    const version = request.version.trim();
    if (version === "") {
        throw new ManagerProviderError("pin-mismatch", "Declared extension version must not be empty");
    }
    return version;
}
async function assertVersionAvailable(client, registry, version, signal) {
    if (version === "latest")
        return;
    const value = await client.getJson(`/customnode/versions/${encodeURIComponent(registry)}`, {
        ...(signal === undefined ? {} : { signal }),
    });
    const entries = Array.isArray(value)
        ? value
        : record(value) && Array.isArray(value["versions"])
            ? value["versions"]
            : undefined;
    if (entries === undefined) {
        throw new ManagerProviderError("pin-mismatch", `ComfyUI-Manager returned no version list for ${registry}`);
    }
    const available = entries.some((entry) => record(entry) && entry["version"] === version);
    if (!available) {
        throw new ManagerProviderError("pin-mismatch", `ComfyUI-Manager cannot honor declared version ${version} for ${registry}`);
    }
}
export class ComfyUiManagerProvider {
    client;
    queue;
    constructor(client, options = {}) {
        this.client = client;
        this.queue = options.queue ?? {};
    }
    async canInstall(request, signal) {
        // A PURE DECLARATION CHECK (no network): the landed-HEAD
        // verification belongs to install() alone, so planning a lane never
        // reaches the engine.
        if (request.url !== undefined && request.registry === undefined) {
            if (request.url.trim() === "")
                return false;
            if (request.ref !== undefined && request.version !== undefined)
                return false;
            if (request.ref !== undefined && !DECLARED_REF.test(request.ref))
                return false;
            return true;
        }
        if (request.ref !== undefined)
            return false;
        try {
            await this.resolveRegistryRow(request, signal);
            return true;
        }
        catch (error) {
            if (error instanceof ManagerProviderError && error.code === "pin-mismatch")
                return false;
            throw error;
        }
    }
    /** The landed commit for a declared pack, or null when Manager
     *  reports no such pack. Matched by repo identity, never by the
     *  installed directory name (Manager derives that from the url). */
    async landedVer(url, signal) {
        const answer = await this.client.getJson("/customnode/installed", {
            ...(signal === undefined ? {} : { signal }),
        });
        // A WIRE boundary (Manager's own answer), so the shape IS checked
        // here rather than trusted — and both refusals below are tested.
        // Manager serves TWO shapes for this route: an array of rows, and
        // a map keyed by installed directory name whose values are the
        // same rows (the cold-start tier caught the map live: the pinned
        // Manager answers the map, so an array-only read verified nothing
        // and every git-door pin refused as unverifiable). `ver` rides a
        // trailing newline on the wire — trimmed before any comparison.
        const rows = Array.isArray(answer)
            ? answer.filter((row) => typeof row === "object" && row !== null)
            : typeof answer === "object" && answer !== null
                ? Object.entries(answer)
                    .filter((entry) => typeof entry[1] === "object" && entry[1] !== null)
                    .map(([name, row]) => ({ name, ...row }))
                : [];
        const want = repoIdentity(url);
        const wantBare = bareIdentity(url);
        for (const row of rows) {
            const rowId = repoIdentity(row.aux_id ?? "");
            if (rowId === want || rowId === wantBare)
                return row.ver === undefined ? null : row.ver.trim();
        }
        return null;
    }
    async install(request, signal) {
        // THE SINGLE VENDOR (the extensions law, 2026-10-13): a declared
        // REPOSITORY row installs through Manager's git-url door whether or
        // not it pins a commit. The pin rides the url as `@<commit>`,
        // which is load-bearing twice: Manager splits on the LAST '@'
        // (manager_core.py:2300) and — because normalize_to_github_id
        // strips a trailing .git but NOT an @sha — an @-suffixed url can
        // never match the registry map, so the git arm always runs and the
        // pin is never discarded for `latest`.
        if (request.url !== undefined && request.registry === undefined) {
            if (request.url.trim() === "") {
                throw new ManagerProviderError("invalid-request", "Declared extension repository URL must not be empty");
            }
            let target = request.url;
            if (request.ref !== undefined) {
                if (request.version !== undefined) {
                    throw new ManagerProviderError("pin-mismatch", "The declared git ref cannot be combined with an unverified registry version");
                }
                if (!DECLARED_REF.test(request.ref)) {
                    throw new ManagerProviderError("invalid-request", `Declared extension ref '${request.ref}' is not a commit — Manager checks the ` +
                        `url's @suffix out, so a branch name would float (pin a commit sha)`);
                }
                target = request.url + "@" + request.ref;
            }
            await this.client.post("/customnode/install/git_url", { url: target }, {
                timeoutMs: EXTENSION_INSTALL_TIMEOUT_MS,
                ...(signal === undefined ? {} : { signal }),
            });
            // FAIL CLOSED ON THE LANDED HEAD. Manager's answer is a 200 even
            // when it skipped ("Already exists"), and its Windows
            // non-instant branch drops the commit entirely
            // (manager_core.py:2355-2358) — so the landed commit is the ONLY
            // evidence the pin was honored. Without a declared ref there is
            // nothing to verify: a zip install carries a version, not a sha.
            if (request.ref === undefined) {
                return { installed: true, detail: "git URL submitted to ComfyUI-Manager" };
            }
            const landed = await this.landedVer(request.url, signal);
            // A zip install reports a VERSION, not a sha — the declared ref
            // is then unverifiable by any means (the impact packs are the live
            // case: ver "8.28.3", no .git). That is its own refusal, not a
            // mismatch: nothing landed that could be compared.
            if (landed === null || !DECLARED_REF.test(landed)) {
                throw new ManagerProviderError("ref-unverifiable", `ComfyUI-Manager installed '${request.id}' but reports no landed commit — the ` +
                    `declared ref ${request.ref} cannot be verified (the pack did not land as a git clone)`);
            }
            if (landed.length === 0 || !request.ref.startsWith(landed) && !landed.startsWith(request.ref)) {
                throw new ManagerProviderError("head-mismatch", `ComfyUI-Manager landed ${request.id} at ${landed}, not the declared ref ${request.ref}`);
            }
            return { installed: true, detail: `git URL installed and verified at ${landed}` };
        }
        if (request.ref !== undefined) {
            throw new ManagerProviderError("invalid-request", "A declared git ref needs a repository URL — Manager installs from the url, never from a ref alone");
        }
        const resolved = await this.resolveRegistryRow(request, signal);
        const version = requestedVersion(request);
        const payload = {
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
    async installModel(request, signal) {
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
        let row;
        try {
            row = findModelCatalogRow(catalog, savePath, filename);
        }
        catch (error) {
            if (declared && error instanceof ManagerProviderError && error.code === "model-unregistered") {
                row = {
                    name: filename,
                    type: request.type ?? "model",
                    base: request.base ?? "melite",
                    savePath,
                    url: request.url,
                    filename,
                };
            }
            else {
                throw error;
            }
        }
        const payload = {
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
            // A declared multi-GB artifact outlasts an extension-sized
            // wait: scale the drain budget by the declared size at a
            // conservative floor rate, clamped to a hard ceiling so a
            // dead queue still surfaces.
            timeoutMs: modelQueueTimeoutMs(request.sizeBytes, this.queue?.timeoutMs ?? this.client.queueTimeoutMs),
            ...(signal === undefined ? {} : { signal }),
        });
        return {
            installed: true,
            detail: `${declared ? "declared row" : "catalog row"} ${row.name}; queue ${String(status.doneCount)}/${String(status.totalCount)}`,
        };
    }
    async resolveRegistryRow(request, signal) {
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
export class ManagerProvider extends ComfyUiManagerProvider {
}
export function isManagerProviderError(error) {
    return error instanceof ManagerProviderError;
}
export function isManagerClientError(error) {
    return error instanceof ManagerClientError;
}
//# sourceMappingURL=manager-provider.js.map