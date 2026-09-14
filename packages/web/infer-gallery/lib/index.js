//#region src/index.ts
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
*  LAW — build/ was the C era's cwd and is gone). */
const DEFAULT_FLOW_DIR = "/home/user/Documents/programs/active/inference.cpp/data/runs/output";
/** A run dir name: run-<hex>-<word> (the runs grammar). */
const RUN_DIR = /^run-[0-9a-f]+-[A-Za-z0-9_-]+$/;
/** One path segment inside a run dir (traversal refuses at the
*  grammar; realpath containment re-checks at the read). */
const RUN_SEGMENT = /^[A-Za-z0-9._-]+$/;
/** A run-relative artifact name: run-<hex>-<word>/<file...> — the
*  confinement the artifact route enforces. The file part is one or
*  more segments: real artifacts live in subdirs (generate/...,
*  input_prep/...) and the runs-list rewrite emits exactly this
*  shape — the single-segment grammar refusing its own output was
*  the 400 the live probe caught (2026-09-11). Each segment must be
*  a real name; `.`/`..` refuse here and realpath containment
*  re-checks below. */
function isRunRelative(target) {
	const slash = target.indexOf("/");
	if (slash <= 0) return false;
	if (!RUN_DIR.test(target.slice(0, slash))) return false;
	const rest = target.slice(slash + 1);
	if (rest.length === 0) return false;
	return rest.split("/").every((seg) => RUN_SEGMENT.test(seg) && seg !== "." && seg !== "..");
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
				const raw = await fs.readFile(`${flowDir}/${runId}/_flow.json`, "utf8");
				let doc;
				try {
					doc = JSON.parse(raw);
				} catch {
					doc = JSON.parse(raw.replaceAll(",\"\"", ",\""));
				}
				let request = null;
				try {
					request = JSON.parse(await fs.readFile(`${flowDir}/${runId}/_request.json`, "utf8"));
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
			try {
				if (gatewayUrl !== "") {
					const response = await fetch(`${gatewayUrl}/v1/assets/runs/${target}`, { signal: AbortSignal.timeout(timeoutMs) });
					if (!response.ok || response.body === null) {
						fail(res, response.status, "gateway_error", { upstream: `${gatewayUrl}/v1/assets/runs/${target}` });
						return;
					}
					const buffer = Buffer.from(await response.arrayBuffer());
					res.writeHead(response.status, {
						"content-type": response.headers.get("content-type") ?? "application/octet-stream",
						"cache-control": "no-store",
						"content-length": String(buffer.byteLength)
					});
					res.end(buffer);
					return;
				}
				const fs = await import("node:fs/promises");
				const path = await import("node:path");
				const root = path.resolve(flowDir);
				const full = path.resolve(root, target);
				if (full !== root && !full.startsWith(root + path.sep)) {
					fail(res, 400, "forbidden_path", {
						message: "artifact escapes the runs tree",
						path: target
					});
					return;
				}
				const file = await fs.readFile(full);
				const ext = target.slice(target.lastIndexOf(".") + 1).toLowerCase();
				const type = ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "webp" ? "image/webp" : ext === "mp4" || ext === "webm" ? "video/webm" : "application/octet-stream";
				res.writeHead(200, {
					"content-type": type,
					"cache-control": "no-store",
					"content-length": String(file.byteLength)
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
