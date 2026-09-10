import { URL, fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
//#region src/index.ts
/**
* `@melite-plugin/dsh-card-deck` — HOST ONLY.
*
* THE ESTATE COLLAPSE (docs/plans/estate-collapse-2026-09-10.md,
* 2026-09-10): this host once proxied /v1|/comfyui|/poser|/health to
* the second-Loader estate process (:33081) and tunneled the events
* WS — the seam that enshrined the degenerate copy of DSH. ALL of it
* is deleted: the estate's doors are cordis plugins now, mounted in
* THIS DSH host by the `melite-estate` bundle row, answering the same
* same-origin /v1 paths directly. What remains here is what was never
* a gateway concern:
*
* - /editor     → the editor's built dist (the standalone card
*                 studio; a static file tree, no upstream)
* - /v1/llm/*   → stubs (the assistant lives in DSH; the editor's own
*                 LLM lane is dead surface — longest-prefix match
*                 beats the estate doors' exact rows on this lane)
*/
const name = "ray-card-deck";
const inject = ["webServer"];
const JSON_HEADERS = {
	"content-type": "application/json; charset=utf-8",
	"cache-control": "no-store"
};
function apply(ctx) {
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
	const EDITOR_DIST = process.env.RAY_EDITOR_DIST ?? path.resolve(here, "..", "..", "editor", "dist");
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
