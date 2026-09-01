//#region src/index.ts
const name = "infer-media";
const inject = ["webServer"];
const DEFAULT_GATEWAYS = ["http://localhost:33081"];
const DEFAULT_TIMEOUT_MS = 15e3;
const DEFAULT_LIMIT = 200;
const JSON_HEADERS = {
	"content-type": "application/json; charset=utf-8",
	"cache-control": "no-store"
};
/** Absolute-src proxy URL for one asset; relative paths are rooted at the
* gateway that served the run. Empty in, empty out; non-gateway absolutes
* are dropped (empty string) rather than leaked. */
function toProxy(gw, path) {
	if (typeof path !== "string" || path === "") return "";
	if (path.startsWith("http://") || path.startsWith("https://")) try {
		if (new URL(path).origin !== gw) return "";
	} catch {
		return "";
	}
	else if (path.startsWith("/")) path = gw + path;
	else return "";
	return "/infer-media/artifact?src=" + encodeURIComponent(path);
}
function apply(ctx, config) {
	const gateways = (config.gateways ?? DEFAULT_GATEWAYS).map((g) => g.replace(/\/+$/, ""));
	const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	const limit = config.limit ?? DEFAULT_LIMIT;
	ctx.logger.info("infer-media merging gateways: %s", gateways.join(", "));
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/infer-media/drafts",
		handler: async (_req, res) => {
			const errors = [];
			const drafts = [];
			const seenIds = /* @__PURE__ */ new Set();
			(await Promise.allSettled(gateways.map(async (gw) => {
				const response = await fetch(gw + "/v1/pipelines/drafts", { signal: AbortSignal.timeout(timeoutMs) });
				if (!response.ok) throw new Error("HTTP " + String(response.status));
				const data = await response.json();
				const list = Array.isArray(data.drafts) ? data.drafts : [];
				for (const raw of list.slice(0, limit)) {
					const draft = raw;
					const id = typeof draft.draft_id === "string" ? draft.draft_id : "";
					if (id !== "" && seenIds.has(id)) continue;
					if (id !== "") seenIds.add(id);
					draft.source = gw;
					drafts.push(draft);
				}
			}))).forEach((r, i) => {
				if (r.status === "rejected") errors.push({
					gateway: gateways[i],
					message: String(r.reason).slice(0, 300)
				});
			});
			if (drafts.length === 0 && errors.length > 0) {
				res.writeHead(502, JSON_HEADERS);
				res.end(JSON.stringify({
					error: "all_gateways_unreachable",
					errors
				}));
				return;
			}
			res.writeHead(200, JSON_HEADERS);
			res.end(JSON.stringify({
				gateways,
				errors,
				drafts
			}));
		}
	}), "infer-media: /infer-media/drafts route");
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/infer-media/runs",
		handler: async (_req, res) => {
			const errors = [];
			const runs = [];
			const seenIds = /* @__PURE__ */ new Set();
			(await Promise.allSettled(gateways.map(async (gw) => {
				const response = await fetch(gw + "/v1/pipelines/runs?limit=" + String(limit), { signal: AbortSignal.timeout(timeoutMs) });
				if (!response.ok) throw new Error("HTTP " + String(response.status));
				const data = await response.json();
				const list = Array.isArray(data.runs) ? data.runs : [];
				for (const raw of list) {
					const run = raw;
					const id = typeof run.run_id === "string" ? run.run_id : "";
					if (id !== "" && seenIds.has(id)) continue;
					if (id !== "") seenIds.add(id);
					run.source = gw;
					if (typeof run.thumbnail === "string") run.thumbnail = toProxy(gw, run.thumbnail);
					if (Array.isArray(run.artifacts)) {
						for (const a of run.artifacts) if (typeof a.url === "string") a.url = toProxy(gw, a.url);
					}
					runs.push(run);
				}
			}))).forEach((r, i) => {
				if (r.status === "rejected") errors.push({
					gateway: gateways[i],
					message: String(r.reason).slice(0, 300)
				});
			});
			if (runs.length === 0 && errors.length > 0) {
				res.writeHead(502, JSON_HEADERS);
				res.end(JSON.stringify({
					error: "all_gateways_unreachable",
					errors
				}));
				return;
			}
			runs.sort((a, b) => {
				const ca = typeof a.created_at === "number" ? a.created_at : 0;
				return (typeof b.created_at === "number" ? b.created_at : 0) - ca;
			});
			res.writeHead(200, JSON_HEADERS);
			res.end(JSON.stringify({
				gateways,
				errors,
				runs
			}));
		}
	}), "infer-media: /infer-media/runs route");
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/infer-media/artifact",
		handler: async (req, res) => {
			const src = new URL(req.url ?? "/", "http://infer-media.invalid").searchParams.get("src") ?? "";
			let ok = false;
			for (const gw of gateways) if (src.startsWith(gw + "/")) {
				ok = true;
				break;
			}
			if (!ok) {
				res.writeHead(400, JSON_HEADERS);
				res.end(JSON.stringify({
					error: "bad_src",
					message: "src must be an absolute URL under a configured gateway"
				}));
				return;
			}
			try {
				const range = req.headers.range;
				const fetchHeaders = {};
				if (range) fetchHeaders["range"] = range;
				const response = await fetch(src, {
					signal: AbortSignal.timeout(timeoutMs),
					headers: fetchHeaders
				});
				if (!response.ok) {
					res.writeHead(response.status, {
						"content-type": "text/plain",
						"cache-control": "no-store"
					});
					res.end("upstream " + String(response.status));
					return;
				}
				const upstreamStatus = response.status;
				const resHeaders = {
					"content-type": response.headers.get("content-type") ?? "application/octet-stream",
					"cache-control": "public, max-age=60",
					"accept-ranges": "bytes"
				};
				const contentLength = response.headers.get("content-length");
				if (contentLength) resHeaders["content-length"] = contentLength;
				const contentRange = response.headers.get("content-range");
				if (contentRange) resHeaders["content-range"] = contentRange;
				res.writeHead(upstreamStatus, resHeaders);
				const body = response.body;
				if (body && typeof body.pipe === "function") body.pipe(res);
				else if (body && typeof body.getReader === "function") {
					const reader = body.getReader();
					const pump = async () => {
						const { done, value } = await reader.read();
						if (done) {
							res.end();
							return;
						}
						res.write(Buffer.from(value));
						return pump();
					};
					await pump();
				} else {
					const buffer = Buffer.from(await response.arrayBuffer());
					resHeaders["content-length"] = String(buffer.byteLength);
					res.writeHead(upstreamStatus, resHeaders);
					res.end(buffer);
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				res.writeHead(502, JSON_HEADERS);
				res.end(JSON.stringify({
					error: "gateway_unreachable",
					message,
					src
				}));
			}
		}
	}), "infer-media: /infer-media/artifact route");
}
//#endregion
export { apply, inject, name };
