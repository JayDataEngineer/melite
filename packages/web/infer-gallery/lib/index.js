import { join } from "node:path";
import { LEGACY_RUN_MEDIA_PREFIX, RUN_ID_RE } from "@melite/contracts/benchStage";
import { crossRootOrder } from "@melite/contracts/rootsManifest";
import { contentTypeForArtifact, segmentConfined, servableLeaf } from "@melite/contracts/mediaKinds";
import { parseRangeHeader } from "@melite/contracts/mediaRange";
//#region src/index.ts
/** The upstream's artifact prefix: the gateway route that has served
*  run artifacts since the app's own mount — a LEGACY spelling the
*  contract still owns (the media route serves both). */
const GATEWAY_MEDIA_PREFIX = LEGACY_RUN_MEDIA_PREFIX;
const name = "infer-gallery";
/** Routes arrive with the webServer service. */
const inject = ["webServer"];
const DEFAULT_TIMEOUT_MS = 15e3;
/** THE RUNS-WINDOW LAW (restored with the media full port, 2026-09-11):
*  always pull the door's hard max — a smaller window lets sidecar
*  floods push artifact rows out of the listing. 500 is the runs
*  seat's hard max (the deleted dsh-media panel rode the same law on
*  /v1/flows/runs?limit=500). */
const RUNS_LIMIT = "500";
const DRAFTS_LIMIT = 200;
/** Sidecar tree default: the estate runs stream (SERVER-STATE ROOT
*  LAW — build/ was the C era's cwd and is gone), anchored to the
*  checkout so the default moves with the clone. */
const DEFAULT_FLOW_DIR = join(import.meta.dirname, "..", "..", "..", "..", "data", "runs", "output");
/** A run dir name: run-<hex>-<word> (the runs grammar). */
const RUN_DIR = RUN_ID_RE;
/** A run-relative artifact name: run-<hex>-<word>/<file...> — the
*  confinement the artifact route enforces. The file part is one or
*  more segments (real artifacts live in subdirs — generate/...,
*  input_prep/...). THE SEGMENT GRAMMAR IS THE CONTRACT'S
*  (segmentConfined — the audit's ×3): this route's old private
*  `[A-Za-z0-9._-]+` charset REFUSED names the engine mints (`out
*  1.png`, unicode, parens served on the estate media route and
*  answered 400 here — the doors disagreed on the same artifact).
*  `.`/`..` refuse at the grammar; realpath containment re-checks
*  at the read. */
function isRunRelative(target) {
	const slash = target.indexOf("/");
	if (slash <= 0) return false;
	if (!RUN_DIR.test(target.slice(0, slash))) return false;
	const rest = target.slice(slash + 1);
	if (rest.length === 0) return false;
	return rest.split("/").every(segmentConfined);
}
/** Sidecar/shadow guard for the MUTATING doors (delete + rename):
*  any `_`-prefixed segment names provenance, never media — the
*  runs tree's own convention (`_flow.json`, `_request.json`,
*  `_thumb/…`). A mutating door that unlinks/renames one would eat
*  the run's own record; refuse LOUD before touching disk. */
function isProtectedSidecar(target) {
	return target.split("/").slice(1).some((seg) => seg.startsWith("_"));
}
/** A bare rename target: one segment, never a path — the door joins
*  it onto the source's own directory, so slashes/`..` refuse here
*  (directory moves are not renames). `_`-prefixed names refuse as
*  sidecars (see above); the length cap keeps ext4 happy. */
function isBareFileName(name) {
	if (name.length === 0 || name.length > 128) return false;
	if (name.includes("/")) return false;
	if (!segmentConfined(name)) return false;
	if (name.startsWith("_")) return false;
	return true;
}
/** Read one JSON body off the node:http idiom (the estate doors'
*  own spelling — data/end/error over IncomingMessage). */
function readJsonBody(req) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		req.on("data", (d) => {
			if (d) chunks.push(d);
		});
		req.on("end", () => {
			const raw = Buffer.concat(chunks).toString("utf8");
			try {
				resolve(raw === "" ? null : JSON.parse(raw));
			} catch {
				resolve(void 0);
			}
		});
		req.on("error", reject);
	});
}
const JSON_HEADERS = {
	"content-type": "application/json; charset=utf-8",
	"cache-control": "no-store"
};
/** Rewrite one run-relative artifact name to a same-origin route
* URL (empty in, empty out). */
function proxyAssetUrl(path) {
	if (typeof path !== "string" || path === "") return "";
	return `/infer-gallery/artifact?path=${encodeURIComponent(path)}`;
}
const fail = (res, status, code, payload) => {
	const body = JSON.stringify({
		error: code,
		...payload
	});
	res.writeHead(status, {
		...JSON_HEADERS,
		"content-length": String(Buffer.byteLength(body))
	});
	res.end(body);
};
function apply(ctx, config = {}) {
	const gatewayUrl = (config.gatewayUrl ?? "").replace(/\/+$/, "");
	const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	const flowDir = config.flowDir ?? DEFAULT_FLOW_DIR;
	const flowTrees = () => {
		const seat = ctx.get("queue", false);
		if (seat === void 0) return [flowDir];
		const roots = seat.stateRoots !== void 0 && seat.stateRoots.length > 0 ? [...seat.stateRoots] : [seat.stateRoot];
		return crossRootOrder(flowDir, roots.map((r) => `${r}/output`));
	};
	/** The first tree holding the target wins (the grammar was already
	*  proven by isRunRelative; containment re-proves per tree — the
	*  read door's second lock, kept per root). Null = miss. */
	const resolveRunTarget = async (fs, path, target) => {
		for (const tree of flowTrees()) {
			const root = path.resolve(tree);
			const full = path.resolve(root, target);
			if (full !== root && !full.startsWith(root + path.sep)) continue;
			try {
				await fs.stat(full);
				return full;
			} catch {}
		}
		return null;
	};
	/** One upstream JSON document. Cross-host fetches the owning DSH
	*  verbatim; in-tree answers over the seat. An absent seat is a
	*  LOUD 502 naming the fix — no fallback absorbs it. */
	const upstream = async (lane, seat, call) => {
		if (gatewayUrl !== "") {
			const response = await fetch(`${gatewayUrl}${lane}`, { signal: AbortSignal.timeout(timeoutMs) });
			const body = await response.text();
			if (!response.ok) throw new GalleryUpstreamError(`upstream ${lane} answered ${response.status}`, body.slice(0, 2e3), response.status);
			return JSON.parse(body);
		}
		if (seat === void 0) throw new GallerySeatError(`infer-gallery: no estate seat for ${lane} in this tree — mount @melite-plugin/melite-estate or pin gatewayUrl (the owning DSH)`);
		return call();
	};
	ctx.logger.info("infer-gallery serving (%s)", gatewayUrl === "" ? "in-tree estate seats" : `owning DSH ${gatewayUrl}`);
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/infer-gallery/drafts",
		handler: async (_req, res) => {
			try {
				const signal = new AbortController().signal;
				const payload = await upstream("/v1/flows/drafts", ctx.get("draftsRemote", false), () => ctx.get("draftsRemote", false).list(signal));
				const all = Array.isArray(payload?.drafts) ? payload.drafts : [];
				const drafts = all.slice(0, DRAFTS_LIMIT);
				const body = JSON.stringify({
					gateway: gatewayUrl,
					total: all.length,
					truncated: all.length > drafts.length,
					drafts
				});
				res.writeHead(200, {
					...JSON_HEADERS,
					"content-length": String(Buffer.byteLength(body))
				});
				res.end(Buffer.from(body));
			} catch (error) {
				ctx.logger.warn("infer-gallery: drafts failed: %s", error instanceof Error ? error.message : String(error));
				if (error instanceof GalleryUpstreamError) fail(res, error.status, "gateway_error", {
					upstream: `${gatewayUrl}/v1/flows/drafts`,
					body: error.body
				});
				else if (error instanceof GallerySeatError) fail(res, 502, "no_estate_seat", {
					message: error.message,
					lane: "/v1/flows/drafts"
				});
				else fail(res, 502, "gateway_unreachable", {
					message: error instanceof Error ? error.message : String(error),
					gatewayUrl,
					upstream: `${gatewayUrl}/v1/flows/drafts`
				});
			}
		}
	}), "infer-gallery: /infer-gallery/drafts route");
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/infer-gallery/flow",
		handler: async (req, res) => {
			const runId = new URL(req.url ?? "/", "http://infer-gallery.invalid").searchParams.get("run_id") ?? "";
			if (!/^[A-Za-z0-9_-]+$/.test(runId)) {
				fail(res, 400, "bad_run_id", { message: "run_id must be [A-Za-z0-9_-]+" });
				return;
			}
			try {
				const fs = await import("node:fs/promises");
				const path = await import("node:path");
				const flowFile = await resolveRunTarget(fs, path, `${runId}/_flow.json`);
				if (flowFile === null) throw new Error(`no readable _flow.json for ${runId}`);
				const raw = await fs.readFile(flowFile, "utf8");
				let doc;
				try {
					doc = JSON.parse(raw);
				} catch {
					doc = JSON.parse(raw.replaceAll(",\"\"", ",\""));
				}
				let request = null;
				try {
					const reqFile = await resolveRunTarget(fs, path, `${runId}/_request.json`);
					if (reqFile !== null) request = JSON.parse(await fs.readFile(reqFile, "utf8"));
				} catch {
					request = null;
				}
				const body = JSON.stringify({
					run_id: runId,
					flow: doc,
					request
				});
				res.writeHead(200, {
					...JSON_HEADERS,
					"content-length": String(Buffer.byteLength(body))
				});
				res.end(Buffer.from(body));
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				ctx.logger.warn("infer-gallery: flow doc read failed: %s", message);
				fail(res, 404, "no_sidecar", { message: `no readable _flow.json for ${runId}` });
			}
		}
	}), "infer-gallery: /infer-gallery/flow route");
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/infer-gallery/runs",
		handler: async (_req, res) => {
			try {
				const signal = new AbortController().signal;
				const payload = await upstream(`/v1/flows/runs?limit=${RUNS_LIMIT}`, ctx.get("runs", false), () => ctx.get("runs", false).list(RUNS_LIMIT, signal));
				const runs = Array.isArray(payload?.runs) ? payload.runs : [];
				for (const run of runs) {
					run.thumbnail = proxyAssetUrl(run.thumbnail);
					if (Array.isArray(run.artifacts)) {
						for (const artifact of run.artifacts) if (artifact !== null && typeof artifact === "object") artifact.url = proxyAssetUrl(artifact.url);
					}
				}
				const body = JSON.stringify({
					gateway: gatewayUrl,
					runs
				});
				res.writeHead(200, {
					...JSON_HEADERS,
					"content-length": String(Buffer.byteLength(body))
				});
				res.end(Buffer.from(body));
			} catch (error) {
				ctx.logger.warn("infer-gallery: runs failed: %s", error instanceof Error ? error.message : String(error));
				if (error instanceof GalleryUpstreamError) fail(res, error.status, "gateway_error", {
					upstream: `${gatewayUrl}/v1/flows/runs`,
					body: error.body
				});
				else if (error instanceof GallerySeatError) fail(res, 502, "no_estate_seat", {
					message: error.message,
					lane: "/v1/flows/runs"
				});
				else fail(res, 502, "gateway_unreachable", {
					message: error instanceof Error ? error.message : String(error),
					gatewayUrl,
					upstream: `${gatewayUrl}/v1/flows/runs`
				});
			}
		}
	}), "infer-gallery: /infer-gallery/runs route");
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/infer-gallery/artifact",
		handler: async (req, res) => {
			const target = new URL(req.url ?? "/", "http://infer-gallery.invalid").searchParams.get("path") ?? "";
			if (!isRunRelative(target)) {
				fail(res, 400, "forbidden_path", {
					message: "artifact route only serves run-relative names (run-<id>/<file>)",
					path: target
				});
				return;
			}
			if (!servableLeaf(target.split("/").pop() ?? "")) {
				fail(res, 400, "protected_sidecar", {
					message: "run sidecars are not artifacts",
					path: target
				});
				return;
			}
			const rangeAsk = req.headers?.range;
			try {
				if (gatewayUrl !== "") {
					const response = await fetch(`${gatewayUrl}${GATEWAY_MEDIA_PREFIX}/${target}`, {
						signal: AbortSignal.timeout(timeoutMs),
						headers: rangeAsk !== void 0 ? { range: rangeAsk } : {}
					});
					if (response.status === 416) {
						const unsatisfiable = {
							"content-type": "application/json",
							"cache-control": "no-store",
							"accept-ranges": "bytes"
						};
						const upstreamWindow = response.headers.get("content-range");
						if (upstreamWindow !== null) unsatisfiable["content-range"] = upstreamWindow;
						res.writeHead(416, unsatisfiable);
						res.end("{\"error\":\"infer-gallery/range-not-satisfiable\"}");
						return;
					}
					if (response.ok && req.method === "HEAD" && response.body === null) {
						const heads = {
							"content-type": response.headers.get("content-type") ?? contentTypeForArtifact(target),
							"content-length": response.headers.get("content-length") ?? "0",
							"cache-control": "no-store"
						};
						const upstreamRange = response.headers.get("content-range");
						if (upstreamRange !== null) heads["content-range"] = upstreamRange;
						if (response.headers.get("accept-ranges") !== null) heads["accept-ranges"] = "bytes";
						res.writeHead(response.status, heads);
						res.end();
						return;
					}
					if (!response.ok || response.body === null) {
						fail(res, response.status, "gateway_error", { upstream: `${gatewayUrl}${GATEWAY_MEDIA_PREFIX}/${target}` });
						return;
					}
					const buffer = Buffer.from(await response.arrayBuffer());
					const heads = {
						"content-type": response.headers.get("content-type") ?? contentTypeForArtifact(target),
						"cache-control": "no-store",
						"content-length": String(buffer.byteLength)
					};
					const upstreamRange = response.headers.get("content-range");
					if (upstreamRange !== null) heads["content-range"] = upstreamRange;
					if (response.headers.get("accept-ranges") !== null) heads["accept-ranges"] = "bytes";
					res.writeHead(response.status, heads);
					res.end(buffer);
					return;
				}
				const fs = await import("node:fs/promises");
				const path = await import("node:path");
				const full = await resolveRunTarget(fs, path, target);
				if (full === null) throw new Error(`ENOENT: no such file or directory, open '${path.resolve(flowDir, target)}'`);
				const type = contentTypeForArtifact(target);
				if (req.method === "HEAD") {
					const stat = await fs.stat(full);
					res.writeHead(200, {
						"content-type": type,
						"cache-control": "no-store",
						"content-length": String(stat.size),
						"accept-ranges": "bytes"
					});
					res.end();
					return;
				}
				const file = await fs.readFile(full);
				const range = parseRangeHeader(rangeAsk, file.byteLength);
				if (range === "unsatisfiable") {
					res.writeHead(416, {
						"content-type": "application/json",
						"content-range": `bytes */${String(file.byteLength)}`,
						"accept-ranges": "bytes",
						"cache-control": "no-store"
					});
					res.end("{\"error\":\"infer-gallery/range-not-satisfiable\"}");
					return;
				}
				if (range !== null) {
					const slice = file.subarray(range.start, range.end + 1);
					res.writeHead(206, {
						"content-type": type,
						"cache-control": "no-store",
						"content-length": String(slice.byteLength),
						"content-range": `bytes ${String(range.start)}-${String(range.end)}/${String(file.byteLength)}`,
						"accept-ranges": "bytes"
					});
					res.end(slice);
					return;
				}
				res.writeHead(200, {
					"content-type": type,
					"cache-control": "no-store",
					"content-length": String(file.byteLength),
					"accept-ranges": "bytes"
				});
				res.end(file);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				ctx.logger.warn("infer-gallery: artifact failed: %s", message);
				fail(res, 502, "artifact_unreadable", {
					message,
					path: target
				});
			}
		}
	}), "infer-gallery: /infer-gallery/artifact route");
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/infer-gallery/artifact-delete",
		handler: async (req, res) => {
			if (req.method !== "POST") {
				fail(res, 405, "method_not_allowed", { message: "POST {path} only" });
				return;
			}
			try {
				const body = await readJsonBody(req);
				const target = typeof body?.path === "string" ? body.path : "";
				if (!isRunRelative(target)) {
					fail(res, 400, "forbidden_path", {
						message: "artifact route only serves run-relative names (run-<id>/<file>)",
						path: target
					});
					return;
				}
				if (isProtectedSidecar(target)) {
					fail(res, 400, "protected_sidecar", {
						message: "sidecar files are provenance, never media — refusing",
						path: target
					});
					return;
				}
				if (gatewayUrl !== "") {
					const response = await fetch(`${gatewayUrl}/infer-gallery/artifact-delete`, {
						method: "POST",
						signal: AbortSignal.timeout(timeoutMs),
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ path: target })
					});
					const text = await response.text();
					res.writeHead(response.status, {
						...JSON_HEADERS,
						"content-length": String(Buffer.byteLength(text))
					});
					res.end(text);
					return;
				}
				const fs = await import("node:fs/promises");
				const path = await import("node:path");
				const full = await resolveRunTarget(fs, path, target);
				if (full === null) {
					fail(res, 404, "no_artifact", {
						message: "no such artifact",
						path: target
					});
					return;
				}
				try {
					await fs.unlink(full);
				} catch (error) {
					if (error.code === "ENOENT") {
						fail(res, 404, "no_artifact", {
							message: "no such artifact",
							path: target
						});
						return;
					}
					throw error;
				}
				const ok = JSON.stringify({
					ok: true,
					path: target
				});
				res.writeHead(200, {
					...JSON_HEADERS,
					"content-length": String(Buffer.byteLength(ok))
				});
				res.end(Buffer.from(ok));
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				ctx.logger.warn("infer-gallery: artifact-delete failed: %s", message);
				fail(res, 502, "artifact_unreadable", { message });
			}
		}
	}), "infer-gallery: /infer-gallery/artifact-delete route");
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/infer-gallery/artifact-rename",
		handler: async (req, res) => {
			if (req.method !== "POST") {
				fail(res, 405, "method_not_allowed", { message: "POST {path, name} only" });
				return;
			}
			try {
				const body = await readJsonBody(req);
				const target = typeof body?.path === "string" ? body.path : "";
				const name = typeof body?.name === "string" ? body.name : "";
				if (!isRunRelative(target)) {
					fail(res, 400, "forbidden_path", {
						message: "artifact route only serves run-relative names (run-<id>/<file>)",
						path: target
					});
					return;
				}
				if (isProtectedSidecar(target)) {
					fail(res, 400, "protected_sidecar", {
						message: "sidecar files are provenance, never media — refusing",
						path: target
					});
					return;
				}
				if (!isBareFileName(name)) {
					fail(res, 400, "bad_name", {
						message: "name must be one bare file segment (no slashes, no leading _)",
						name
					});
					return;
				}
				if (gatewayUrl !== "") {
					const response = await fetch(`${gatewayUrl}/infer-gallery/artifact-rename`, {
						method: "POST",
						signal: AbortSignal.timeout(timeoutMs),
						headers: { "content-type": "application/json" },
						body: JSON.stringify({
							path: target,
							name
						})
					});
					const text = await response.text();
					res.writeHead(response.status, {
						...JSON_HEADERS,
						"content-length": String(Buffer.byteLength(text))
					});
					res.end(text);
					return;
				}
				const next = target.slice(0, target.lastIndexOf("/")) + "/" + name;
				/* v8 ignore next 3 -- `name` already passed isBareFileName, so
				* the joined target always satisfies the grammar; the check
				* stays as defense against future callers joining paths. */
				if (!isRunRelative(next) || isProtectedSidecar(next)) {
					fail(res, 400, "bad_name", {
						message: "rename target refuses the artifact grammar",
						name
					});
					return;
				}
				if (next === target) {
					fail(res, 400, "bad_name", {
						message: "rename to the same name changes nothing",
						name
					});
					return;
				}
				const fs = await import("node:fs/promises");
				const path = await import("node:path");
				const full = await resolveRunTarget(fs, path, target);
				if (full === null) {
					fail(res, 404, "no_artifact", {
						message: "no such artifact",
						path: target
					});
					return;
				}
				const fullNext = path.resolve(path.dirname(full), name);
				try {
					await fs.stat(full);
				} catch {
					fail(res, 404, "no_artifact", {
						message: "no such artifact",
						path: target
					});
					return;
				}
				try {
					await fs.stat(fullNext);
					fail(res, 409, "already_exists", {
						message: "a file already carries that name",
						path: next
					});
					return;
				} catch {}
				await fs.rename(full, fullNext);
				const ok = JSON.stringify({
					ok: true,
					path: next,
					url: proxyAssetUrl(next)
				});
				res.writeHead(200, {
					...JSON_HEADERS,
					"content-length": String(Buffer.byteLength(ok))
				});
				res.end(Buffer.from(ok));
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				ctx.logger.warn("infer-gallery: artifact-rename failed: %s", message);
				fail(res, 502, "artifact_unreadable", { message });
			}
		}
	}), "infer-gallery: /infer-gallery/artifact-rename route");
}
/** Cross-host upstream answered an error status (its body rides). */
var GalleryUpstreamError = class extends Error {
	body;
	status;
	constructor(message, body, status) {
		super(message);
		this.body = body;
		this.status = status;
	}
};
/** In-tree posture with the estate absent — the loud 502 (nothing
*  absorbs a missing seat). */
var GallerySeatError = class extends Error {};
//#endregion
export { apply, inject, name };
