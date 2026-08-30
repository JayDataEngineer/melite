import { fileURLToPath } from "node:url";
import path from "node:path";
//#region src/index.ts
/**
* `@melite-plugin/dsh-card-deck` — host half.
*
* Same-origin proxy routes on the webServer service (melite-gallery pattern):
*
* - GET  /melite-deck/forms            → /v1/forms (card declarations)
* - GET  /melite-deck/models           → /v1/model-catalog (model rows)
* - GET  /melite-deck/form-spec?model= → /v1/form-spec?model= (validated id)
* - POST /melite-deck/start            → /v1/pipelines/start (THE run door)
* - GET  /melite-deck/status?run=      → /v1/pipelines/status/{run} (validated id)
* - GET  /melite-deck/artifact?path=   → one asset, /editor/assets/runs/ only
*
* Failure policy: reachable webServer + unreachable gateway = 502 JSON with
* the verbatim upstream body; handlers never throw.
*/
const name = "melite-card-deck";
const inject = ["webServer"];
const DEFAULT_GATEWAY_URL = "http://localhost:33081";
const DEFAULT_TIMEOUT_MS = 2e4;
const ASSET_PREFIX = "/editor/assets/runs/";
const JSON_HEADERS = {
	"content-type": "application/json; charset=utf-8",
	"cache-control": "no-store"
};
/** Ids the gateway accepts (model ids, run ids): conservative allowlist. */
function safeId(v) {
	if (typeof v !== "string" || v === "") return null;
	return /^[A-Za-z0-9_.@-]{1,120}$/.test(v) ? v : null;
}
function apply(ctx, config) {
	const gatewayUrl = (config.gatewayUrl ?? DEFAULT_GATEWAY_URL).replace(/\/+$/, "");
	const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	const upstream = (path, init) => fetch(`${gatewayUrl}${path}`, {
		...init,
		signal: AbortSignal.timeout(timeoutMs)
	});
	const proxyJson = (path, route, init) => ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: route,
		handler: async (_req, res) => {
			try {
				const response = await upstream(path, init);
				const body = await response.text();
				res.writeHead(response.status, {
					...JSON_HEADERS,
					"content-type": response.headers.get("content-type") ?? "application/json; charset=utf-8"
				});
				res.end(body);
			} catch (e) {
				res.writeHead(502, JSON_HEADERS);
				res.end(JSON.stringify({
					error: "gateway_unreachable",
					message: String(e)
				}));
			}
		}
	}), `melite-card-deck: ${route} route`);
	ctx.logger.info("melite-card-deck proxying gateway %s", gatewayUrl);
	const LLM_STUBS = {
		"/v1/llm/keys": [200, { keys: [] }],
		"/v1/llm/keys/active": [404, {
			error: "no_active_key",
			message: "The assistant lives in DSH; the editor LLM lane is disabled in the embed."
		}],
		"/v1/llm/health": [200, {
			connected: false,
			reason: "dsh_owns_the_assistant",
			model: null,
			name: null
		}],
		"/v1/llm/providers": [200, { providers: [] }]
	};
	ctx.effect(() => ctx.webServer.register({
		kind: "prefix",
		path: "/v1/llm",
		handler: async (req, res) => {
			const path = (req.url ?? "/").split("?")[0];
			const [status, body] = LLM_STUBS[path] ?? [404, {
				error: "llm_lane_disabled",
				message: "The assistant lives in DSH."
			}];
			res.writeHead(status, JSON_HEADERS);
			res.end(JSON.stringify(body));
		}
	}), "melite-card-deck: /v1/llm stub (DSH owns the LLM)");
	const here = path.dirname(fileURLToPath(import.meta.url));
	const EDITOR_DIST = process.env.MELITE_EDITOR_DIST ?? path.resolve(here, "..", "..", "..", "web", "editor", "dist");
	const MIME = {
		".html": "text/html; charset=utf-8",
		".js": "text/javascript; charset=utf-8",
		".css": "text/css; charset=utf-8",
		".json": "application/json; charset=utf-8",
		".svg": "image/svg+xml",
		".png": "image/png",
		".jpg": "image/jpeg",
		".webp": "image/webp",
		".ico": "image/x-icon",
		".glb": "model/gltf-binary",
		".wasm": "application/wasm",
		".woff2": "font/woff2"
	};
	for (const prefix of [
		"/v1",
		"/comfyui",
		"/poser",
		"/health",
		"/editor/assets/runs"
	]) ctx.effect(() => ctx.webServer.register({
		kind: "prefix",
		path: prefix,
		handler: async (req, res) => {
			const url = new URL(req.url ?? "/", "http://local");
			const chunks = [];
			for await (const c of req) chunks.push(c);
			const body = chunks.length ? Buffer.concat(chunks) : void 0;
			try {
				const response = await upstream(url.pathname + url.search, {
					method: req.method,
					headers: { "content-type": req.headers["content-type"] ?? "application/json" },
					body: body && body.length > 0 ? body : void 0
				});
				const buf = Buffer.from(await response.arrayBuffer());
				const h = {};
				for (const [k, v] of response.headers) if (typeof v === "string") h[k] = v;
				delete h["content-encoding"];
				delete h["transfer-encoding"];
				h["content-length"] = String(buf.byteLength);
				res.writeHead(response.status, h);
				res.end(buf);
			} catch (e) {
				res.writeHead(502, JSON_HEADERS);
				res.end(JSON.stringify({
					error: "gateway_unreachable",
					message: String(e)
				}));
			}
		}
	}), `melite-card-deck: ${prefix} gateway proxy`);
	const serveStatic = async (rel, res) => {
		const fs = await import("node:fs/promises");
		const path = await import("node:path");
		const root = path.resolve(EDITOR_DIST);
		const target = path.resolve(root, "." + rel.replace(/^\/editor/, ""));
		if (!target.startsWith(root)) {
			res.writeHead(403);
			res.end("forbidden");
			return;
		}
		const st = await fs.stat(target).catch(() => null);
		let file = target;
		if (!st || st.isDirectory()) {
			if (path.extname(rel) !== "") {
				res.writeHead(404);
				res.end("not found");
				return;
			}
			file = path.join(root, "index.html");
		}
		try {
			const data = await fs.readFile(file);
			const ext = path.extname(file).toLowerCase();
			res.writeHead(200, {
				"content-type": MIME[ext] ?? "application/octet-stream",
				"cache-control": "no-cache"
			});
			res.end(data);
		} catch {
			res.writeHead(404);
			res.end("not found");
		}
	};
	ctx.effect(() => ctx.webServer.register({
		kind: "prefix",
		path: "/editor",
		handler: async (req, res) => {
			await serveStatic(new URL(req.url ?? "/editor/", "http://local").pathname, res);
		}
	}), "melite-card-deck: /editor static");
	proxyJson("/v1/forms", "/melite-deck/forms");
	proxyJson("/v1/model-catalog", "/melite-deck/models");
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/melite-deck/form-spec",
		handler: async (req, res) => {
			const model = safeId(new URL(req.url ?? "/", "http://local").searchParams.get("model"));
			if (model === null) {
				res.writeHead(400, JSON_HEADERS);
				res.end(JSON.stringify({
					error: "bad_model",
					message: "model query param required"
				}));
				return;
			}
			try {
				const response = await upstream(`/v1/form-spec?model=${encodeURIComponent(model)}`);
				const body = await response.text();
				res.writeHead(response.status, JSON_HEADERS);
				res.end(body);
			} catch (e) {
				res.writeHead(502, JSON_HEADERS);
				res.end(JSON.stringify({
					error: "gateway_unreachable",
					message: String(e)
				}));
			}
		}
	}), "melite-card-deck: /melite-deck/form-spec route");
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/melite-deck/status",
		handler: async (req, res) => {
			const run = safeId(new URL(req.url ?? "/", "http://local").searchParams.get("run"));
			if (run === null) {
				res.writeHead(400, JSON_HEADERS);
				res.end(JSON.stringify({
					error: "bad_run",
					message: "run query param required"
				}));
				return;
			}
			try {
				const response = await upstream(`/v1/pipelines/status/${encodeURIComponent(run)}`);
				const body = await response.text();
				let out = body;
				try {
					const parsed = JSON.parse(body);
					for (const a of parsed.artifacts ?? []) {
						const p = a.url ?? a.path;
						if (typeof p === "string" && p.startsWith(ASSET_PREFIX)) {
							const proxied = "/melite-deck/artifact?path=" + encodeURIComponent(p);
							if (a.url !== void 0) a.url = proxied;
							else a.path = proxied;
						}
					}
					for (const s of parsed.stages ?? []) if (typeof s.url === "string" && s.url.startsWith(ASSET_PREFIX)) s.url = "/melite-deck/artifact?path=" + encodeURIComponent(s.url);
					out = JSON.stringify(parsed);
				} catch {}
				res.writeHead(response.status, JSON_HEADERS);
				res.end(out);
			} catch (e) {
				res.writeHead(502, JSON_HEADERS);
				res.end(JSON.stringify({
					error: "gateway_unreachable",
					message: String(e)
				}));
			}
		}
	}), "melite-card-deck: /melite-deck/status route");
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/melite-deck/start",
		handler: async (req, res) => {
			if (req.method !== "POST") {
				res.writeHead(405, JSON_HEADERS);
				res.end(JSON.stringify({ error: "method_not_allowed" }));
				return;
			}
			const chunks = [];
			for await (const c of req) chunks.push(c);
			const body = Buffer.concat(chunks).toString("utf8");
			try {
				const response = await upstream("/v1/pipelines/start", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body
				});
				const text = await response.text();
				res.writeHead(response.status, JSON_HEADERS);
				res.end(text);
			} catch (e) {
				res.writeHead(502, JSON_HEADERS);
				res.end(JSON.stringify({
					error: "gateway_unreachable",
					message: String(e)
				}));
			}
		}
	}), "melite-card-deck: /melite-deck/start route");
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/melite-deck/artifact",
		handler: async (req, res) => {
			const path = new URL(req.url ?? "/", "http://local").searchParams.get("path") ?? "";
			if (!path.startsWith(ASSET_PREFIX)) {
				res.writeHead(403, JSON_HEADERS);
				res.end(JSON.stringify({
					error: "forbidden_path",
					allowed: ASSET_PREFIX
				}));
				return;
			}
			try {
				const response = await upstream(path);
				res.writeHead(response.status, {
					"content-type": response.headers.get("content-type") ?? "application/octet-stream",
					"cache-control": "public, max-age=60"
				});
				const bytes = Buffer.from(await response.arrayBuffer());
				res.end(bytes);
			} catch (e) {
				res.writeHead(502, JSON_HEADERS);
				res.end(JSON.stringify({
					error: "gateway_unreachable",
					message: String(e)
				}));
			}
		}
	}), "melite-card-deck: /melite-deck/artifact route");
}
//#endregion
export { apply, inject, name };
