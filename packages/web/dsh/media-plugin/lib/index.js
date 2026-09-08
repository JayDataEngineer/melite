//#region src/index.ts
const name = "infer-media";
const inject = ["webServer"];
const DEFAULT_TIMEOUT_MS = 15e3;
const DEFAULT_LIMIT = 500;
const JSON_HEADERS = {
	"content-type": "application/json; charset=utf-8",
	"cache-control": "no-store"
};
/**
* Door validators (the sidebar's Phase-1 gate): gateway rows arrive as
* `unknown` and the old code pushed them through with two typeof checks.
* Malformed rows are DROPPED and counted LOUDLY into the response's
* `errors` array (the panel's existing error channel) — never pushed as
* partials, never vanished silently. A run without a string run_id is
* undedupeable and unkeyable; an artifact without a string url is
* unrenderable; both are refused here.
*/
/** Absolute-src proxy URL for one asset; relative paths are rooted at the
* gateway that served the run. Empty in, empty out; non-gateway absolutes
* are dropped (empty string) rather than leaked. */
function toProxy(gw, path) {
	if (typeof path !== "string" || path === "") return "";
	let abs = path;
	if (abs.startsWith("http://") || abs.startsWith("https://")) try {
		if (new URL(abs).origin !== gw) return "";
	} catch {
		return "";
	}
	else if (abs.startsWith("/")) abs = gw + abs;
	else return "";
	return "/infer-media/artifact?src=" + encodeURIComponent(abs);
}
function apply(ctx, config) {
	if (!Array.isArray(config.gateways) || config.gateways.length === 0) throw new Error("infer-media: `gateways` is required in the profile row — no default endpoint (QUEUE LANE LAW)");
	const gateways = config.gateways.map((g) => g.replace(/\/+$/, ""));
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
				const response = await fetch(gw + "/v1/flows/drafts", { signal: AbortSignal.timeout(timeoutMs) });
				if (!response.ok) throw new Error("HTTP " + String(response.status));
				const data = await response.json();
				const list = Array.isArray(data.drafts) ? data.drafts : [];
				let dropped = 0;
				let dupes = 0;
				for (const raw of list.slice(0, limit)) {
					const draft = raw;
					const id = typeof draft.draft_id === "string" ? draft.draft_id : "";
					if (id === "") {
						dropped += 1;
						continue;
					}
					if (seenIds.has(id)) {
						dupes += 1;
						continue;
					}
					seenIds.add(id);
					draft.source = gw;
					drafts.push(draft);
				}
				if (dropped > 0) errors.push({
					gateway: gw,
					message: "dropped " + String(dropped) + " drafts without draft_id (unopenable)"
				});
				if (dupes > 0) errors.push({
					gateway: gw,
					message: "deduped " + String(dupes) + " drafts already listed by another gateway (cross-gateway overlap)"
				});
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
				const response = await fetch(gw + "/v1/flows/runs?limit=" + String(limit), { signal: AbortSignal.timeout(timeoutMs) });
				if (!response.ok) throw new Error("HTTP " + String(response.status));
				const data = await response.json();
				const list = Array.isArray(data.runs) ? data.runs : [];
				let droppedRuns = 0;
				let droppedArts = 0;
				let dupes = 0;
				for (const raw of list) {
					const run = raw;
					const id = typeof run.run_id === "string" ? run.run_id : "";
					if (id === "") {
						droppedRuns += 1;
						continue;
					}
					if (seenIds.has(id)) {
						dupes += 1;
						continue;
					}
					seenIds.add(id);
					run.source = gw;
					if (typeof run.thumbnail === "string") run.thumbnail = toProxy(gw, run.thumbnail);
					if (Array.isArray(run.artifacts)) {
						const kept = [];
						for (const a of run.artifacts) {
							if (a !== null && typeof a === "object" && a.truncated === true) {
								const rec = a;
								if (typeof rec.listed === "number" && typeof rec.total === "number") run.truncated = {
									listed: rec.listed,
									total: rec.total
								};
								continue;
							}
							if (a !== null && typeof a === "object" && typeof a.url === "string" && a.url !== "") {
								a.url = toProxy(gw, a.url);
								if (a.url !== "") kept.push(a);
								else droppedArts += 1;
							} else droppedArts += 1;
						}
						run.artifacts = kept;
					}
					runs.push(run);
				}
				if (droppedRuns > 0) errors.push({
					gateway: gw,
					message: "dropped " + String(droppedRuns) + " runs without run_id (undedupeable)"
				});
				if (droppedArts > 0) errors.push({
					gateway: gw,
					message: "dropped " + String(droppedArts) + " artifacts without a usable url"
				});
				if (dupes > 0) errors.push({
					gateway: gw,
					message: "deduped " + String(dupes) + " runs already listed by another gateway (cross-gateway overlap)"
				});
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
