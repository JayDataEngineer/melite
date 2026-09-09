//#region src/index.ts
const name = "melite-card-view";
/** Routes arrive with the webServer service. */
const inject = ["webServer"];
/** Read the full request body (proxy payloads are small JSON/forms; buffered). */
async function readBody(req) {
	const chunks = [];
	for await (const chunk of req) chunks.push(chunk);
	return Buffer.concat(chunks);
}
function apply(ctx, config = {}) {
	if (config.clientRowOnly === true) {
		ctx.logger.info("melite-card-view client row mounted (bundle-table contribution only)");
		return;
	}
	const gatewayUrl = (config.gatewayUrl ?? "http://127.0.0.1:33081").replace(/\/+$/, "");
	const prefix = config.prefix ?? "/melite-proxy";
	const timeoutMs = config.timeoutMs ?? 3e4;
	ctx.effect(() => ctx.webServer.register({
		kind: "prefix",
		path: prefix,
		handler: async (req, res) => {
			const url = new URL(req.url ?? "/", "http://dsh.local");
			const subPath = url.pathname.startsWith(prefix + "/") ? url.pathname.slice(prefix.length) : "/";
			const target = gatewayUrl + subPath + url.search;
			const method = req.method ?? "GET";
			const headers = {};
			const contentType = req.headers["content-type"];
			if (typeof contentType === "string") headers["content-type"] = contentType;
			let body;
			if (method !== "GET" && method !== "HEAD") body = await readBody(req);
			try {
				const upstream = await fetch(target, {
					method,
					headers,
					body,
					signal: AbortSignal.timeout(timeoutMs)
				});
				const payload = Buffer.from(await upstream.arrayBuffer());
				const outHeaders = { "cache-control": "no-cache" };
				outHeaders["content-type"] = upstream.headers.get("content-type") ?? "application/octet-stream";
				outHeaders["content-length"] = String(payload.byteLength);
				res.writeHead(upstream.status, outHeaders);
				res.end(payload);
			} catch (error) {
				res.writeHead(502, { "content-type": "application/json" });
				res.end(JSON.stringify({
					error: "melite gateway unreachable",
					target,
					detail: error instanceof Error ? error.message : String(error)
				}));
			}
		}
	}), "melite-card-view: gateway proxy route");
	ctx.logger.info("melite-card-view proxying %s/* -> %s", prefix, gatewayUrl);
}
//#endregion
export { apply, inject, name };
