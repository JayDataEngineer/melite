//#region src/index.ts
const name = "melite-hello";
/** Routes arrive with the webServer service; none needed for the probe. */
const inject = ["webServer"];
function apply(ctx, config) {
	const c = ctx;
	const greeting = config.greeting ?? "Melite lane online";
	c.logger.info("%s (melite-hello fiber mounted)", greeting);
	c.effect(() => c.webServer.register({
		kind: "exact",
		path: "/melite-health",
		handler: (_req, res) => {
			res.writeHead(200, { "content-type": "application/json" });
			res.end(JSON.stringify({
				plugin: "melite-hello",
				greeting,
				pid: process.pid
			}));
		}
	}), "melite-hello: /melite-health route");
}
//#endregion
export { apply, inject, name };
