import { c as formsArm, i as routeName, l as kindsDoorArm, o as cardToolsArm, p as makeEstateRequest, r as resolveHarnessRoutes, s as formSpecArm, t as harnessEnhance, u as modelCatalogArm } from "./llm-complete-D6MRuhE0.mjs";
//#region src/enhance-agent.ts
/** Map a form-spec envelope onto its declared recipes (the ONE
*  spelling — the request lane and the in-process sweep share it). */
function declaredFieldsFromSpec(spec) {
	let fields = {};
	if (spec.enhance_prompts !== null && typeof spec.enhance_prompts === "object" && !Array.isArray(spec.enhance_prompts)) {
		for (const [k, v] of Object.entries(spec.enhance_prompts)) if (typeof v === "string" && v.length > 0) fields[k] = v;
	} else if (typeof spec.enhance_prompt === "string" && spec.enhance_prompt.length > 0) fields = { prompt: spec.enhance_prompt };
	return {
		fields,
		names: Object.keys(fields)
	};
}
/** One field's enhancement through the harness model. */
function enhanceOneField(llm, recipe, prompt, temperature, signal, llmWant, defaultLlm) {
	return harnessEnhance(llm, {
		system: recipe,
		prompt,
		temperature,
		signal,
		...llmWant !== void 0 && llmWant.length > 0 ? { llm: llmWant } : {}
	}, defaultLlm);
}
/**
* GENERIC FALLBACK RECIPE — BACK HOME (the gateway kill,
* 2026-09-10): the ONE spelling lives here, where it was born (the
* disclosure bundle that shared it died with the gateway).
*/
const GENERIC_ENHANCE_RECIPE = "You rewrite rough generation prompts into model-optimal ones. Expand terse descriptions into concrete visual/audio language: subject, action, setting, lighting, composition, style, medium, detail level. Reply with ONLY a JSON object {\"positive\": \"<the rewritten prompt>\", \"negative\": \"<what to avoid, or empty string>\"} — no prose outside the JSON.";
/**
* THE SWEEP — every declared field, one press. The route's model-form uses
* this: the CALLER orchestrates (a button, not a conversational agent), so
* unlike the chat tool there is no listing round-trip — all declared fields
* are enhanced sequentially and returned together. A model with NO declared
* fields sweeps ONE generic 'prompt' field (the shared fallback recipe).
*/
async function agenticSweep(ctx, llm, opts) {
	const spec = await formSpecArm(opts.model);
	if (spec === null) throw new Error(`enhance: '${opts.model}' does not resolve (unknown, unoffered, or retired)`);
	const { fields } = declaredFieldsFromSpec(spec);
	let names = Object.keys(fields);
	if (names.length === 0) names = ["prompt"];
	if (names.length === 1 && fields[names[0]] === void 0) fields[names[0]] = GENERIC_ENHANCE_RECIPE;
	const results = {};
	for (const name of names) results[name] = await enhanceOneField(llm, fields[name], opts.prompt, opts.temperature, opts.signal, opts.llmWant, opts.defaultLlm);
	return {
		model: opts.model,
		results
	};
}
//#endregion
//#region src/doors.ts
const inject = [
	"webServer",
	"llm",
	"tools"
];
function apply(c, config = {}) {
	const readDefaultLlm = () => {
		try {
			const sel = c.get("agentDefaultModel")?.currentSelection?.();
			if (typeof sel?.provider === "string" && typeof sel?.model === "string") return sel.provider + "/" + sel.model;
		} catch {}
	};
	/** A signal that fires when the HTTP caller goes away (aborts or
	*  closes) — the fuse leg for long LLM sweeps (row 13). */
	const reqClosedSignal = (req) => {
		const ctrl = new AbortController();
		req.on("close", () => ctrl.abort());
		req.on("aborted", () => ctrl.abort());
		return ctrl.signal;
	};
	const readBody = (req) => new Promise((resolve, reject) => {
		const chunks = [];
		req.on("data", (d) => {
			if (d) chunks.push(d);
		});
		req.on("end", () => resolve(Buffer.concat(chunks)));
		req.on("error", reject);
	});
	c.effect(() => c.webServer.register({
		kind: "exact",
		path: "/melite-tools/catalog",
		handler: (_req, res) => {
			const respondCatalog = (llmRoutes) => {
				const body = JSON.stringify({
					tools: c.tools.schemas().map((s) => ({
						name: s.name,
						description: s.description ?? ""
					})),
					llmRoutes
				});
				res.writeHead(200, {
					"content-type": "application/json",
					"content-length": String(Buffer.byteLength(body))
				});
				res.end(Buffer.from(body));
			};
			resolveHarnessRoutes(c.llm).then((routes) => respondCatalog(routes.map(routeName)), () => respondCatalog([]));
		}
	}), "melite-tools: catalog route");
	const enhanceHandler = (req, res) => {
		let ok = true;
		const respond = (status, payload) => {
			if (!ok) return;
			ok = false;
			res.writeHead(status, { "content-type": "application/json" });
			res.end(JSON.stringify(payload));
		};
		readBody(req).then((buf) => {
			let body;
			try {
				body = JSON.parse(buf.toString("utf8"));
			} catch {
				return respond(400, { error: "body must be JSON: {system_prompt, prompt, temperature?, llm?} or {model, prompt, temperature?, llm?}" });
			}
			if (typeof body.prompt !== "string" || body.prompt.length === 0) return respond(400, { error: "prompt is a required string" });
			const temperature = typeof body.temperature === "number" ? body.temperature : void 0;
			const llmWant = typeof body.llm === "string" && body.llm.length > 0 ? body.llm : void 0;
			const mapEnhanceError = (err) => {
				const msg = err instanceof Error ? err.message : String(err);
				if (msg.startsWith("enhance: unknown llm route")) {
					const namesDefault = llmWant !== void 0 && msg.includes("\"" + llmWant + "\"");
					return respond(namesDefault ? 400 : 502, { error: msg });
				}
				return respond(502, { error: msg });
			};
			if (typeof body.model === "string" && body.model.length > 0) {
				const sweepSignal = AbortSignal.any([AbortSignal.timeout(6e5), reqClosedSignal(req)]);
				return agenticSweep(c, c.llm, {
					model: body.model,
					prompt: body.prompt,
					temperature,
					signal: sweepSignal,
					...llmWant !== void 0 ? { llmWant } : {},
					defaultLlm: readDefaultLlm()
				}).then((result) => respond(200, result)).catch(mapEnhanceError);
			}
			if (typeof body.system_prompt !== "string" || body.system_prompt.length === 0) return respond(400, { error: "either model (agent sweep) or system_prompt (one-shot) is required" });
			harnessEnhance(c.llm, {
				system: body.system_prompt,
				prompt: body.prompt,
				temperature,
				...llmWant !== void 0 ? { llm: llmWant } : {}
			}, readDefaultLlm()).then((result) => respond(200, result)).catch(mapEnhanceError);
		}).catch((err) => respond(400, { error: `body read failed: ${err instanceof Error ? err.message : String(err)}` }));
	};
	c.effect(() => c.webServer.register({
		kind: "exact",
		path: "/melite-tools/enhance",
		handler: enhanceHandler
	}), "melite-tools: enhance route");
	c.effect(() => c.webServer.register({
		kind: "exact",
		path: "/v1/llm/enhance",
		handler: enhanceHandler
	}), "melite-tools: enhance alias");
	{
		const inputDir = async () => {
			const path = await import("node:path");
			const { resolveRepoRoot } = await import("@melite/comfyui-cordis");
			const dir = path.join(resolveRepoRoot(), "data", "input");
			await (await import("node:fs/promises")).mkdir(dir, { recursive: true });
			return dir;
		};
		const SEG = /^(?!\.{1,2}$)[A-Za-z0-9._-]+$/;
		c.effect(() => c.webServer.register({
			kind: "exact",
			path: "/v1/uploads",
			handler: (req, res) => {
				const fail = (code, err) => {
					const body = JSON.stringify({ error: err });
					res.writeHead(code, { "content-type": "application/json" });
					res.end(body);
				};
				readBody(req).then(async (buf) => {
					let body;
					try {
						body = JSON.parse(buf.toString("utf8"));
					} catch {
						return fail(400, "body must be JSON");
					}
					const filename = typeof body?.filename === "string" ? body.filename : "";
					const data = typeof body?.data === "string" ? body.data : "";
					if (filename === "" || data === "") return fail(400, "uploads: filename + data are required");
					if (!SEG.test(filename)) return fail(400, "uploads: bad filename");
					const b64 = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(data);
					if (b64 === null) return fail(400, "uploads: only png / jpeg / webp upload");
					const bytes = Buffer.from(b64[2], "base64");
					const dir = await inputDir();
					const fs = await import("node:fs/promises");
					const path = await import("node:path");
					const file = path.join(dir, filename);
					const [realFile, realDir] = await Promise.all([fs.realpath(file), fs.realpath(dir)].map(async (x) => x.catch(() => void 0)));
					if (realFile !== void 0 && realDir !== void 0 && !realFile.startsWith(realDir + path.sep)) return fail(400, "uploads: path escapes the input dir");
					await fs.writeFile(file, bytes);
					const out = JSON.stringify({ path: "data/input/" + filename });
					res.writeHead(200, { "content-type": "application/json" });
					res.end(out);
				}).catch((e) => fail(500, "uploads: " + (e instanceof Error ? e.message : /* v8 ignore next -- fs throws Errors only (2026-09-12) */ String(e))));
			}
		}), "melite-tools: uploads rail");
		c.effect(() => c.webServer.register({
			kind: "prefix",
			path: "/v1/assets/inputs",
			handler: (req, res) => {
				const fail = (code, err) => {
					const body = JSON.stringify({ error: err });
					res.writeHead(code, { "content-type": "application/json" });
					res.end(body);
				};
				(async () => {
					const name = new URL(req.url ?? "/", "http://melite.invalid").pathname.slice(18);
					if (!SEG.test(name)) return fail(400, "bad input name");
					const dir = await inputDir();
					const path = await import("node:path");
					const fs = await import("node:fs/promises");
					const file = path.join(dir, name);
					const real = await fs.realpath(file).catch(() => void 0);
					const realDir = await fs.realpath(dir);
					if (real === void 0 || !real.startsWith(realDir + path.sep)) return fail(404, "no such input");
					const bytes = await fs.readFile(file);
					const ext = name.split(".").pop().toLowerCase();
					const type = ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/webp";
					res.writeHead(200, {
						"content-type": type,
						"content-length": String(bytes.byteLength)
					});
					res.end(bytes);
				})().catch((e) => fail(500, "inputs: " + (e instanceof Error ? e.message : /* v8 ignore next -- fs throws Errors only (2026-09-12) */ String(e))));
			}
		}), "melite-tools: input preview");
	}
	c.effect(() => c.webServer.register({
		kind: "prefix",
		path: "/v1",
		handler: (req, res) => {
			const ok = (payload) => {
				const body = JSON.stringify(payload);
				res.writeHead(200, {
					"content-type": "application/json",
					"content-length": String(Buffer.byteLength(body))
				});
				res.end(Buffer.from(body));
			};
			const fail = (status, payload) => {
				const body = JSON.stringify(payload);
				res.writeHead(status, {
					"content-type": "application/json",
					"content-length": String(Buffer.byteLength(body))
				});
				res.end(Buffer.from(body));
			};
			const callerGone = new AbortController();
			res.on("close", () => {
				if (!res.writableEnded) callerGone.abort();
			});
			const signal = callerGone.signal;
			const serve = () => {
				let path;
				let method;
				let url;
				try {
					url = new URL(req.url ?? "/", "http://localhost");
					path = url.pathname;
					method = (req.method ?? "GET").toUpperCase();
					if (method === "GET" && path === "/v1/card-tools") {
						cardToolsArm().then(ok, (e) => fail(500, { error: `discovery door: ${e instanceof Error ? e.message : String(e)}` }));
						return;
					}
					if (method === "GET" && path === "/v1/model-catalog") {
						modelCatalogArm().then(ok, (e) => fail(500, { error: `discovery door: ${e instanceof Error ? e.message : String(e)}` }));
						return;
					}
					if (method === "GET" && path === "/v1/forms") {
						formsArm().then(ok, (e) => fail(500, { error: `discovery door: ${e instanceof Error ? e.message : String(e)}` }));
						return;
					}
					if (method === "GET" && path === "/v1/kinds") {
						kindsDoorArm().then(ok, (e) => fail(500, { error: `discovery door: ${e instanceof Error ? e.message : String(e)}` }));
						return;
					}
					if (method === "GET" && path === "/v1/form-spec") {
						const model = url.searchParams.get("model") ?? "";
						if (model.length === 0) return fail(400, { error: "form-spec: the model query parameter is required" });
						formSpecArm(model).then((spec) => {
							if (spec === null) return fail(404, { error: `form-spec: '${model}' does not resolve (unknown, unoffered, or retired)` });
							return ok(spec);
						}, (e) => fail(500, { error: `discovery door: ${e instanceof Error ? e.message : String(e)}` }));
						return;
					}
				} catch (error) {
					return fail(500, { error: `discovery door: ${error instanceof Error ? error.message : /* v8 ignore next -- the try body throws Errors only (URL/arms are sync-Error sites, 2026-09-12) */ String(error)}` });
				}
				const request = makeEstateRequest(c);
				if (method === "POST") {
					readBody(req).then((buf) => {
						let body;
						try {
							body = buf.length > 0 ? JSON.parse(buf.toString("utf8")) : {};
						} catch {
							return fail(400, { error: "body must be JSON" });
						}
						request(method, path, body, signal, 12e4).then((value) => ok(value)).catch((error) => fail(502, { error: error instanceof Error ? error.message : String(error) }));
					}).catch((error) => fail(400, { error: `body read failed: ${error instanceof Error ? error.message : String(error)}` }));
					return;
				}
				request(method, path, void 0, signal, 12e4).then((value) => ok(value)).catch((error) => fail(502, { error: error instanceof Error ? error.message : String(error) }));
			};
			return serve();
		}
	}), "melite-tools: /v1 prefix door");
}
//#endregion
export { apply, inject };
