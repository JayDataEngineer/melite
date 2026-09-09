import { i as routeName, r as resolveHarnessRoutes, s as gatewayRequest, t as harnessEnhance } from "./llm-complete-EAKcxcoV.mjs";
import { createRequire } from "node:module";
import { GENERIC_ENHANCE_RECIPE } from "@melite/gateway-core/prompt-guide";
//#region \0rolldown/runtime.js
var __require = /* #__PURE__ */ (() => createRequire(import.meta.url))();
//#endregion
//#region src/enhance-agent.ts
/**
* The AGENT-side enhance orchestration — shared by the chat tool and the
* /melite-tools/enhance route's sweep mode. ONE implementation, two doors.
*
* The recipes are SSOT in the gateway form-spec (per-model
* prompt-enhance* SKILL.md files surfaced as enhance_prompt | enhance_prompts).
* Every field completion rides the harness model via llm-complete.ts —
* no keystore, no "no model".
*/
/**
* GENERIC FALLBACK RECIPE — MOVED to @melite/gateway-core
* (schema/promptGuide.ts, the disclosure stroke): most models declare
* no per-model enhance recipe; the kernel owns the one spelling, the
* ✦ sweep door and the disclosure bundle both consume it. Re-exported
* here so existing importers never chase the move.
*/
const FORMSPEC_TIMEOUT_MS = 15e3;
/** Read the model's declared recipes straight off the form-spec SSOT. */
async function fetchDeclaredFields(gatewayUrl, model, signal) {
	const spec = await gatewayRequest(gatewayUrl, "GET", "/v1/form-spec?model=" + encodeURIComponent(model), void 0, signal, FORMSPEC_TIMEOUT_MS);
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
* THE SWEEP — every declared field, one press. The route's model-form uses
* this: the CALLER orchestrates (a button, not a conversational agent), so
* unlike the chat tool there is no listing round-trip — all declared fields
* are enhanced sequentially and returned together. A model with NO declared
* fields sweeps ONE generic 'prompt' field (the shared fallback recipe).
*/
async function agenticSweep(gatewayUrl, llm, opts) {
	const { fields } = await fetchDeclaredFields(gatewayUrl, opts.model, opts.signal);
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
	const gatewayUrl = config.gatewayUrl ?? "http://localhost:33081";
	const readDefaultLlm = () => {
		try {
			const sel = c.get("agentDefaultModel")?.currentSelection?.();
			if (typeof sel?.provider === "string" && typeof sel?.model === "string") return sel.provider + "/" + sel.model;
		} catch {}
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
	c.effect(() => c.webServer.register({
		kind: "exact",
		path: "/melite-tools/enhance",
		handler: (req, res) => {
			let ok = true;
			const respond = (status, payload) => {
				if (!ok) return;
				ok = false;
				res.writeHead(status, { "content-type": "application/json" });
				res.end(JSON.stringify(payload));
			};
			readBody(req).then((buf) => {
				try {
					__require("node:fs").appendFileSync("/tmp/melite-enhance-capture.jsonl", JSON.stringify({
						time: (/* @__PURE__ */ new Date()).toISOString(),
						chars: buf.length,
						body: buf.toString("utf8")
					}) + "\n");
				} catch {}
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
				if (typeof body.model === "string" && body.model.length > 0) return agenticSweep(gatewayUrl, c.llm, {
					model: body.model,
					prompt: body.prompt,
					temperature,
					signal: AbortSignal.timeout(6e5),
					...llmWant !== void 0 ? { llmWant } : {},
					defaultLlm: readDefaultLlm()
				}).then((result) => respond(200, result)).catch(mapEnhanceError);
				if (typeof body.system_prompt !== "string" || body.system_prompt.length === 0) return respond(400, { error: "either model (agent sweep) or system_prompt (one-shot) is required" });
				harnessEnhance(c.llm, {
					system: body.system_prompt,
					prompt: body.prompt,
					temperature,
					...llmWant !== void 0 ? { llm: llmWant } : {}
				}, readDefaultLlm()).then((result) => respond(200, result)).catch(mapEnhanceError);
			}).catch((err) => respond(400, { error: `body read failed: ${err instanceof Error ? err.message : String(err)}` }));
		}
	}), "melite-tools: enhance route");
}
//#endregion
export { apply, inject };
