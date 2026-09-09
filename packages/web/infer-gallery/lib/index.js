//#region src/index.ts
const name = "infer-gallery";
/** Routes arrive with the webServer service. */
const inject = ["webServer"];
const DEFAULT_GATEWAY_URL = "http://localhost:33081";
const DEFAULT_TIMEOUT_MS = 15e3;
const RUNS_UPSTREAM = "/v1/flows/runs?limit=50";
/** The only gateway tree the artifact proxy may touch
*  (Phase 2 consolidation, 2026-09-04: /v1/assets/runs → /v1/assets/runs). */
const ASSET_PREFIX = "/v1/assets/runs/";
/** Sidecar tree default: the estate runs stream (SERVER-STATE ROOT LAW —
*  build/ was the C era's cwd and is gone). */
const DEFAULT_FLOW_DIR = "/home/user/Documents/programs/active/inference.cpp/data/runs/output";
const JSON_HEADERS = {
	"content-type": "application/json; charset=utf-8",
	"cache-control": "no-store"
};
/** Rewrite one gateway-relative asset path to a same-origin proxy URL (empty in, empty out). */
function proxyAssetUrl(path) {
	if (typeof path !== "string" || path === "") return "";
	return `/infer-gallery/artifact?path=${encodeURIComponent(path)}`;
}
function apply(ctx, config = {}) {
	const gatewayUrl = (config.gatewayUrl ?? DEFAULT_GATEWAY_URL).replace(/\/+$/, "");
	const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	const flowDir = config.flowDir ?? DEFAULT_FLOW_DIR;
	const upstream = (path) => fetch(`${gatewayUrl}${path}`, { signal: AbortSignal.timeout(timeoutMs) });
	ctx.logger.info("infer-gallery proxying %s (gateway %s)", RUNS_UPSTREAM, gatewayUrl);
	const DRAFTS_UPSTREAM = "/v1/flows/drafts";
	const DRAFTS_LIMIT = 200;
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/infer-gallery/drafts",
		handler: async (_req, res) => {
			try {
				const response = await upstream(DRAFTS_UPSTREAM);
				const body = await response.text();
				if (!response.ok) {
					res.writeHead(response.status, JSON_HEADERS);
					res.end(JSON.stringify({
						error: "gateway_error",
						status: response.status,
						upstream: `${gatewayUrl}${DRAFTS_UPSTREAM}`,
						body: body.slice(0, 2e3)
					}));
					return;
				}
				let payload;
				try {
					payload = JSON.parse(body);
				} catch {
					res.writeHead(502, JSON_HEADERS);
					res.end(JSON.stringify({
						error: "gateway_bad_payload",
						message: "upstream /v1/flows/drafts returned non-JSON body",
						body: body.slice(0, 2e3)
					}));
					return;
				}
				const all = Array.isArray(payload?.drafts) ? payload.drafts : [];
				const drafts = all.slice(0, DRAFTS_LIMIT);
				const draftsBody = JSON.stringify({
					gateway: gatewayUrl,
					total: all.length,
					truncated: all.length > drafts.length,
					drafts
				});
				res.writeHead(200, {
					...JSON_HEADERS,
					"content-length": String(Buffer.byteLength(draftsBody))
				});
				res.end(Buffer.from(draftsBody));
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				ctx.logger.warn("infer-gallery: gateway unreachable: %s", message);
				res.writeHead(502, JSON_HEADERS);
				res.end(JSON.stringify({
					error: "gateway_unreachable",
					message,
					gatewayUrl,
					upstream: `${gatewayUrl}${DRAFTS_UPSTREAM}`
				}));
			}
		}
	}), "infer-gallery: /infer-gallery/drafts route");
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/infer-gallery/flow",
		handler: async (req, res) => {
			const runId = new URL(req.url ?? "/", "http://infer-gallery.invalid").searchParams.get("run_id") ?? "";
			const fail = (status, code, message) => {
				const b = JSON.stringify({
					error: code,
					message
				});
				res.writeHead(status, {
					...JSON_HEADERS,
					"content-length": String(Buffer.byteLength(b))
				});
				res.end(Buffer.from(b));
			};
			if (!/^[A-Za-z0-9_-]+$/.test(runId)) {
				fail(400, "bad_run_id", "run_id must be [A-Za-z0-9_-]+");
				return;
			}
			try {
				const raw = await (await import("node:fs/promises")).readFile(`${flowDir}/${runId}/_flow.json`, "utf8");
				let doc;
				try {
					doc = JSON.parse(raw);
				} catch {
					doc = JSON.parse(raw.replaceAll(",\"\"", ",\""));
				}
				const body = JSON.stringify({
					run_id: runId,
					flow: doc
				});
				res.writeHead(200, {
					...JSON_HEADERS,
					"content-length": String(Buffer.byteLength(body))
				});
				res.end(Buffer.from(body));
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				ctx.logger.warn("infer-gallery: flow doc read failed: %s", message);
				fail(404, "no_sidecar", `no readable _flow.json for ${runId}`);
			}
		}
	}), "infer-gallery: /infer-gallery/flow route");
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/infer-gallery/runs",
		handler: async (_req, res) => {
			try {
				const response = await upstream(RUNS_UPSTREAM);
				const body = await response.text();
				if (!response.ok) {
					res.writeHead(response.status, JSON_HEADERS);
					res.end(JSON.stringify({
						error: "gateway_error",
						status: response.status,
						upstream: `${gatewayUrl}${RUNS_UPSTREAM}`,
						body: body.slice(0, 2e3)
					}));
					return;
				}
				let payload;
				try {
					payload = JSON.parse(body);
				} catch {
					res.writeHead(502, JSON_HEADERS);
					res.end(JSON.stringify({
						error: "gateway_bad_payload",
						message: "upstream /v1/flows/runs returned non-JSON body",
						body: body.slice(0, 2e3)
					}));
					return;
				}
				const runs = Array.isArray(payload?.runs) ? payload.runs : [];
				for (const run of runs) {
					run.thumbnail = proxyAssetUrl(run.thumbnail);
					if (Array.isArray(run.artifacts)) {
						for (const artifact of run.artifacts) if (artifact !== null && typeof artifact === "object") artifact.url = proxyAssetUrl(artifact.url);
					}
				}
				const runsBody = JSON.stringify({
					gateway: gatewayUrl,
					runs
				});
				res.writeHead(200, {
					...JSON_HEADERS,
					"content-length": String(Buffer.byteLength(runsBody))
				});
				res.end(Buffer.from(runsBody));
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				ctx.logger.warn("infer-gallery: gateway unreachable: %s", message);
				res.writeHead(502, JSON_HEADERS);
				res.end(JSON.stringify({
					error: "gateway_unreachable",
					message,
					gatewayUrl,
					upstream: `${gatewayUrl}${RUNS_UPSTREAM}`
				}));
			}
		}
	}), "infer-gallery: /infer-gallery/runs route");
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/infer-gallery/artifact",
		handler: async (req, res) => {
			const target = new URL(req.url ?? "/", "http://infer-gallery.invalid").searchParams.get("path") ?? "";
			if (!target.startsWith(ASSET_PREFIX)) {
				res.writeHead(400, JSON_HEADERS);
				res.end(JSON.stringify({
					error: "forbidden_path",
					message: `artifact proxy only serves paths under ${ASSET_PREFIX}`,
					path: target
				}));
				return;
			}
			try {
				const response = await upstream(target);
				if (!response.ok || response.body === null) {
					res.writeHead(response.status, JSON_HEADERS);
					res.end(JSON.stringify({
						error: "gateway_error",
						status: response.status,
						upstream: `${gatewayUrl}${target}`
					}));
					return;
				}
				const buffer = Buffer.from(await response.arrayBuffer());
				res.writeHead(response.status, {
					"content-type": response.headers.get("content-type") ?? "application/octet-stream",
					"cache-control": "no-store",
					"content-length": String(buffer.byteLength)
				});
				res.end(buffer);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				res.writeHead(502, JSON_HEADERS);
				res.end(JSON.stringify({
					error: "gateway_unreachable",
					message,
					path: target
				}));
			}
		}
	}), "infer-gallery: /infer-gallery/artifact route");
}
//#endregion
export { apply, inject, name };
