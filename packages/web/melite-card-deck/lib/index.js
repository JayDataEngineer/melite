import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import { serveStatic } from "@deepseek-ai/dsh-host-frontend-static";
//#region src/index.ts
/**
* `@melite-plugin/dsh-card-deck` — HOST ONLY.
*
* THE ESTATE COLLAPSE (docs/plans/estate-collapse-2026-09-10.md,
* 2026-09-10): this host once proxied /v1|/comfyui|/poser|/health to
* the second-Loader estate process (retired) and tunneled the events
* WS — the seam that enshrined the degenerate copy of DSH. ALL of it
* is deleted: the estate's plane is Typert remotes now (drafts/bench/
* runs/manage over /api/<ns>/<method>), mounted in THIS DSH host by
* the `melite-estate` bundle row. What remains here is what was never
* a gateway concern:
*
* - /editor     → the editor's built dist, served through DSH's own
*                 SPA static mechanics (`serveStatic` from
*                 `@deepseek-ai/dsh-host-frontend-static` — the same
*                 traversal fence, MIME table, index-auth, and
*                 403/404/405 contract as the shell). A named prefix
*                 route (not the fallback seat: the shell owns that
*                 seat, single-owner by the webserver contract) with
*                 the editor's SPA fallback (extensionless misses
*                 render index; asset misses 404) and NO boot
*                 injection (the editor is a standalone vite SPA, not
*                 a DSH boot page — raw index bytes, authed like the
*                 shell's own index).
* - /v1/llm/*   → stubs (the assistant lives in DSH; the editor's own
*                 LLM lane is dead surface — longest-prefix match
*                 beats the estate doors' exact rows on this lane).
*                 The stub stays a stub (not a DSH primitive) for one
*                 reason: without it the shell fallback would answer
*                 these lanes with 200 + HTML and the studio would
*                 misparse it as keystore JSON. A loud typed refusal
*                 beats a lying 200.
*/
const name = "melite-card-deck";
const inject = ["webServer", "connection"];
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
	}), "melite-card-deck: /v1/llm stub (DSH owns the LLM)");
	const here = path.dirname(fileURLToPath(import.meta.url));
	const distRoot = path.resolve(process.env.MELITE_EDITOR_DIST ?? path.resolve(here, "..", "..", "editor", "dist"));
	const distIndex = path.join(distRoot, "index.html");
	ctx.effect(() => ctx.webServer.register({
		kind: "prefix",
		path: "/editor",
		handler: async (req, res) => {
			if (req.method !== "GET" && req.method !== "HEAD") {
				res.writeHead(405);
				res.end();
				return;
			}
			let under;
			try {
				under = decodeURIComponent(new URL(req.url ?? "/editor/", "http://local").pathname);
			} catch {
				res.writeHead(400);
				res.end();
				return;
			}
			if (!(under === "/editor" || under.startsWith("/editor/"))) {
				res.writeHead(404);
				res.end();
				return;
			}
			let rel = under.slice(7);
			if (rel === "") rel = "/";
			if (path.extname(rel) === "") {
				const target = path.resolve(path.join(distRoot, rel));
				if (target !== distRoot && !target.startsWith(distRoot + path.sep)) {
					res.writeHead(404);
					res.end();
					return;
				}
				const st = await fs.stat(target).catch(() => null);
				if (!st || st.isDirectory()) rel = "/index.html";
			}
			await serveStatic(rel, res, distRoot, distIndex, () => ctx.connection.authorizeIndex(req, res), () => fs.readFile(distIndex, "utf8"));
		}
	}), "melite-card-deck: /editor static (DSH serveStatic)");
}
//#endregion
export { apply, inject, name };
