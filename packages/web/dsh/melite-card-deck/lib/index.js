import { URL, fileURLToPath } from "node:url";
import path from "node:path";
import net from "node:net";
import fs from "node:fs/promises";
//#region src/index.ts
/**
* `@melite-plugin/dsh-card-deck` — HOST ONLY.
*
* The DSH-side host for the editor's card surfaces. The /ray-deck/* API
* stayed RETIRED (d157b6c; its client consumer was already an orphaned
* fossil — the studio iframe rides the /v1 prefix proxies below). The
* sidebar deck itself is RESTORED (2026-09-05, operator order) as the
* center-column takeover — see src/client/. This host half serves:
*
* - /editor            → the editor's built dist (THE card surface)
* - /v1, /comfyui, /poser, /health
*                     → buffered gateway proxies (run artifacts ride
*                       /v1/assets/runs — Phase 2 consolidation 2026-09-04)
* - /v1/llm/*          → stubs (the assistant lives in DSH)
* - /v1/flows/events   → the events WS tunnel (raw TCP to gateway)
*
* The src/client/ tree carries the browser half (sidebar entry +
* full-bleed + DeckCanvas + embed-bridge, the last also source-imported
* by melite-card-view); the shared tsdown preset builds lib/client.js.
*
* Failure policy: reachable webServer + unreachable gateway = 502 JSON with
* the verbatim upstream body; handlers never throw.
*/
const name = "ray-card-deck";
const inject = ["webServer"];
const DEFAULT_GATEWAY_URL = "http://localhost:33081";
const DEFAULT_TIMEOUT_MS = 2e4;
const JSON_HEADERS = {
	"content-type": "application/json; charset=utf-8",
	"cache-control": "no-store"
};
/** Ids the gateway accepts (model ids, run ids): conservative allowlist. */
function safeId(v) {
	if (typeof v !== "string" || v === "") return null;
	return /^[A-Za-z0-9_.@-]{1,120}$/.test(v) ? v : null;
}
function apply(ctx, config = {}) {
	const gatewayUrl = (config.gatewayUrl ?? DEFAULT_GATEWAY_URL).replace(/\/+$/, "");
	const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	const upstream = (path, init) => fetch(`${gatewayUrl}${path}`, {
		...init,
		signal: AbortSignal.timeout(timeoutMs)
	});
	ctx.logger.info("ray-card-deck proxying gateway %s", gatewayUrl);
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
	}), "ray-card-deck: /v1/llm stub (DSH owns the LLM)");
	const here = path.dirname(fileURLToPath(import.meta.url));
	const EDITOR_DIST = process.env.RAY_EDITOR_DIST ?? path.resolve(here, "..", "..", "..", "editor", "dist");
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
		"/health"
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
				h["content-length"] = String(buf.length);
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
	}), `ray-card-deck: ${prefix} gateway proxy`);
	ctx.effect(() => ctx.webServer.registerUpgrade({
		path: "/v1/flows/events",
		handler: (req, socket, head) => {
			try {
				const gw = new URL(gatewayUrl);
				const port = Number(gw.port || (gw.protocol === "https:" ? 443 : 80));
				const url = new URL(req.url ?? "/?run_id=", "http://dsh.local");
				const runId = url.searchParams.get("run_id") ?? url.searchParams.get("id") ?? "";
				if (!safeId(runId)) {
					socket.write("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
					socket.destroy();
					return;
				}
				const key = req.headers["sec-websocket-key"] ?? "";
				const sub = req.headers["sec-websocket-protocol"];
				const ver = req.headers["sec-websocket-version"] ?? "13";
				const reqLines = [
					`GET /v1/flows/events/${runId} HTTP/1.1`,
					`Host: ${gw.host}`,
					"Upgrade: websocket",
					"Connection: Upgrade",
					`Sec-WebSocket-Key: ${key}`,
					`Sec-WebSocket-Version: ${ver}`,
					...typeof sub === "string" && sub ? [`Sec-WebSocket-Protocol: ${sub}`] : [],
					"",
					""
				];
				const upstreamSock = net.connect({
					host: gw.hostname,
					port
				}, () => {
					upstreamSock.write(reqLines.join("\r\n"));
					if (head.length) upstreamSock.write(head);
				});
				upstreamSock.on("error", () => {
					socket.write("HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n");
					socket.destroy();
				});
				upstreamSock.on("data", (c) => socket.write(c));
				socket.on("data", (c) => upstreamSock.write(c));
				upstreamSock.on("close", () => socket.destroy());
				socket.on("close", () => upstreamSock.destroy());
				socket.on("error", () => upstreamSock.destroy());
			} catch {
				socket.write("HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n");
				socket.destroy();
			}
		}
	}), "ray-card-deck: events WS tunnel");
	const serveStatic = async (rel, res) => {
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
	}), "ray-card-deck: /editor static");
}
//#endregion
export { apply, inject, name };
