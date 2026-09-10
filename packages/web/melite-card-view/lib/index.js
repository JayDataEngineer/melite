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
	const prefix = config.prefix ?? "/melite-proxy";
	ctx.effect(() => ctx.webServer.register({
		kind: "prefix",
		path: prefix,
		handler: async (req, res) => {
			const url = new URL(req.url ?? "/", "http://dsh.local");
			const subPath = url.pathname.startsWith(prefix + "/") ? url.pathname.slice(prefix.length) : "/";
			const method = req.method ?? "GET";
			const headers = {};
			const contentType = req.headers["content-type"];
			if (typeof contentType === "string") headers["content-type"] = contentType;
			if (method !== "GET" && method !== "HEAD") {
				const raw = await readBody(req);
				new Uint8Array(raw.byteLength).set(raw);
			}
			res.writeHead(502, { "content-type": "application/json" });
			res.end(JSON.stringify({
				error: "estate killed",
				path: subPath
			}));
		}
	}), "melite-card-view: gateway proxy route");
	ctx.logger.info("melite-card-view serving %s/* over the estate lanes (in-process)", prefix);
}
//#endregion
export { apply, inject, name };
