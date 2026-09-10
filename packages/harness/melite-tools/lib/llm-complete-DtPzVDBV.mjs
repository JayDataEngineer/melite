import { createUserMessage } from "@deepseek-ai/dsh-llm";
//#region src/gateway.ts
/**
* Thin HTTP seam to the Melite gateway (server-js, default :33081).
*
* The gateway STAYS AS-IS — this module is a pure client over the wire
* contract in melite/docs/PROTOCOL.md. Error law: a non-2xx response surfaces
* the gateway's body VERBATIM (`RayGatewayError` message = status + url +
* raw body), because a thrown tool error is materialized by the DSH registry
* as the model-facing error text. Network failures name the URL and the
* underlying cause instead of being swallowed.
*/
/** Gateway answered with a non-2xx status; body carried verbatim. */
var RayGatewayError = class extends Error {
	status;
	url;
	body;
	constructor(status, url, body) {
		super(`melite gateway ${status} ${url}: ${body}`);
		this.name = "RayGatewayError";
		this.status = status;
		this.url = url;
		this.body = body;
	}
};
/** Default Melite gateway base URL (the Bun gateway's loopback listen). */
const DEFAULT_GATEWAY_URL = "http://localhost:33081";
/** Strip one trailing slash so path joins stay single-slash. */
function normalizeGatewayUrl(gatewayUrl) {
	return gatewayUrl.replace(/\/+$/, "");
}
/**
* Fetch JSON from the gateway. The caller's `exec.signal` and a per-call
* timeout are fused (either abort cancels the request); a non-2xx response
* throws `RayGatewayError` carrying the response body verbatim.
*/
async function gatewayRequest(gatewayUrl, method, path, body, execSignal, timeoutMs) {
	const url = `${normalizeGatewayUrl(gatewayUrl)}${path}`;
	const signal = fuseSignals(execSignal, AbortSignal.timeout(timeoutMs));
	let resp;
	try {
		resp = await fetch(url, {
			method,
			headers: body === void 0 ? void 0 : { "content-type": "application/json" },
			body: body === void 0 ? void 0 : JSON.stringify(body),
			signal
		});
	} catch (e) {
		if (execSignal.aborted) throw e;
		const msg = e instanceof Error ? e.message : String(e);
		throw new Error(`melite gateway unreachable at ${url}: ${msg}`);
	}
	const raw = await resp.text();
	if (!resp.ok) throw new RayGatewayError(resp.status, url, raw);
	try {
		return JSON.parse(raw);
	} catch {
		throw new Error(`melite gateway returned non-JSON at ${url}: ${raw.slice(0, 300)}`);
	}
}
/** Fuse N signals without requiring AbortSignal.any (Node <20 fallback). */
function fuseSignals(...signals) {
	const controller = new AbortController();
	for (const signal of signals) if (signal.aborted) {
		controller.abort(signal.reason);
		return controller.signal;
	}
	const onAbort = (event) => {
		const target = event.target;
		controller.abort(target.reason);
		cleanup();
	};
	const cleanup = () => {
		for (const signal of signals) signal.removeEventListener("abort", onAbort);
	};
	for (const signal of signals) signal.addEventListener("abort", onAbort, { once: true });
	return controller.signal;
}
//#endregion
//#region src/llm-complete.ts
/** "provider/model" — the only spelling a route is ever named by. */
function routeName(r) {
	return r.provider + "/" + r.model;
}
/** End-to-end deadline for one auxiliary completion (observed live: ~60s). */
const ENHANCE_DEADLINE_MS = 18e4;
/**
* Resolve the harness model routes with ZERO configuration: every
* registered provider route × its advertised models — INTERLEAVED
* round-robin across providers (2026-09-05 fix: registration order
* let ONE keyless provider with many advertised models eat the entire
* attempt budget — observed live: six deepseek-official routes burned
* before the credentialed xiaomi/zai/openrouter providers were ever
* tried). The FIRST healthy route serves; a dead one (quota, auth) is
* stepped past — "no model" cannot happen while any route breathes.
* There is no explicit config knob to misconfigure.
*/
const MAX_ROUTE_ATTEMPTS = 12;
async function resolveHarnessRoutes(llm) {
	const providers = llm.listProviders();
	if (providers.length === 0) throw new Error("enhance: no LLM adapter is registered in the harness host");
	const perProvider = [];
	for (const p of providers) try {
		const models = await llm.listModels(p.id);
		if (models.length > 0) perProvider.push(models.map((m) => ({
			provider: p.id,
			model: m.id
		})));
	} catch {}
	const routes = [];
	for (let i = 0; i < MAX_ROUTE_ATTEMPTS; i++) for (const list of perProvider) if (list[i]) routes.push(list[i]);
	if (routes.length === 0) throw new Error("enhance: no registered harness provider advertises any model");
	return routes.slice(0, MAX_ROUTE_ATTEMPTS);
}
/**
* One streaming completion on ONE exact route, assembled to text. Terminal
* finish reasons other than 'stop' become thrown errors carrying the
* provider failure message + code — never swallowed.
*/
async function harnessCompleteOnRoute(llm, route, req) {
	const timeout = AbortSignal.timeout(ENHANCE_DEADLINE_MS);
	const signal = req.signal ? AbortSignal.any([req.signal, timeout]) : timeout;
	const options = {
		provider: route.provider,
		model: route.model,
		messages: [createUserMessage({
			content: [{
				type: "text",
				text: req.prompt
			}],
			source: { kind: "user" }
		})],
		system: req.system + OUTPUT_CONTRACT,
		...req.temperature !== void 0 && Number.isFinite(req.temperature) ? { temperature: req.temperature } : {},
		signal
	};
	let text = "";
	let finish = null;
	for await (const chunk of llm.stream(options)) if (chunk.type === "text-delta" && typeof chunk.text === "string") text += chunk.text;
	else if (chunk.type === "finish") {
		const r = chunk.reason;
		finish = {
			kind: typeof r?.kind === "string" ? r.kind : JSON.stringify(r ?? null),
			failure: r?.failure
		};
	}
	if (finish === null) throw new Error("enhance: the harness model stream ended without a terminal finish");
	if (finish.kind !== "stop") {
		const detail = finish.failure ? finish.failure.message + " [" + (finish.failure.code ?? "?") + "]" : finish.kind;
		throw new Error("enhance: " + routeName(route) + " failed — " + detail);
	}
	return text;
}
/**
* The door's WIRE CONTRACT, appended to EVERY recipe (2026-09-06,
* live-caught 1:1: the image model's form-spec recipe is pure
* structure rules — no output-format word in it — so the model
* answered "**Prompt:** …" prose and the JSON parse 502'd). The
* {positive, negative} JSON shape is THIS door's requirement, so
* THIS door guarantees it, whatever the per-model recipe says.
*/
const OUTPUT_CONTRACT = "\n\nOutput contract: reply with ONLY a JSON object {\"positive\": \"<the rewritten prompt>\", \"negative\": \"<what to avoid, or empty string>\"} — no prose, no markdown, nothing outside the JSON.";
/**
* Match a caller-named route against the live list. Exact
* "provider/model" wins; a bare "model" must be unambiguous (two
* providers advertising it is a 400 naming both — guessing between
* providers is how silent-DeepSeek happens). Unknown → throw with
* the live list (the route turns it into a 400, never a walk).
*
* Version-tail tolerance (2026-09-06, live-caught): the settings
* default names glm-5.3 while the provider advertises glm-4.7 —
* a newer default than the live provider list carries. The named
* model is RESOLVED, never walked: same provider, its NEWEST
* advertised model below the named one in the family line. If the
* provider itself is absent, or nothing matches, the failure stays
* loud with the live list. This is resolution of the user's own
* default, not a fallback to a DIFFERENT provider's model.
*/
function matchHarnessRoute(routes, want) {
	const exact = routes.find((r) => routeName(r) === want);
	if (exact) return exact;
	const bare = routes.filter((r) => r.model === want);
	if (bare.length === 1) return bare[0];
	if (bare.length > 1) throw new Error("enhance: ambiguous llm \"" + want + "\" — advertised by " + bare.map(routeName).join(", ") + "; name provider/model");
	const provider = want.split("/")[0];
	const stem = (want.split("/")[1] ?? "").replace(/[-.][0-9]+.*$/, "").toLowerCase();
	if (stem !== "") {
		const familyRoutes = routes.filter((r) => r.provider === provider).filter((r) => r.model.toLowerCase() === stem || r.model.toLowerCase().startsWith(stem + "-") || r.model.toLowerCase().startsWith(stem + "."));
		if (familyRoutes.length > 0) {
			const ver = (m) => {
				const t = /[-.]v?([0-9]+(?:[._][0-9]+)*)/.exec(m);
				return t ? Number.parseFloat(t[1].replace("_", ".")) : 0;
			};
			return familyRoutes.reduce((best, r) => ver(r.model) > ver(best.model) ? r : best);
		}
	}
	const live = routes.map(routeName).join(", ");
	throw new Error("enhance: unknown llm route \"" + want + "\" — live routes: " + live);
}
/**
* Recipe + prompt in, {positive, negative, via} out. THE one enhance
* call. NO WALK, NO FALLBACKS (queue lane law, operator 2026-09-06:
* "No fallbacks. Ever." — the first-breathing walk is what served
* DeepSeek/minimax by luck of registration order and provider
* health):
*
*   - explicit req.llm names the route, else defaultLlm (the
*     agentDefaultModel service's live selection — the user's own
*     default) names it. Explicit wins; NEITHER walks.
*   - unresolvable name → throw naming the live routes (the route
*     maps explicit→400, stale default→502).
*   - the ONE route completes; its failure is the honest error
*     (502 naming route + cause) — never a silent other model.
*
* `via` echoes the serving route. This is the keystore era's shape
* (one configured model, loud otherwise) with the model resolved
* from the host default instead of the retired keystore.
*/
async function harnessEnhance(llm, req, defaultLlm) {
	const routes = await resolveHarnessRoutes(llm);
	const want = typeof req.llm === "string" && req.llm.length > 0 ? req.llm : typeof defaultLlm === "string" && defaultLlm.length > 0 ? defaultLlm : void 0;
	if (want === void 0) throw new Error("enhance: no llm named and no host default configured — name llm (\"provider/model\") or set the host default model");
	const route = matchHarnessRoute(routes, want);
	return {
		...parseEnhanceJson(await harnessCompleteOnRoute(llm, route, req)),
		via: routeName(route)
	};
}
/**
* Parse the recipe's STRICT JSON reply ({positive, negative}) out of model
* text: direct parse, then fenced, then first-brace slice. All fail → throw
* with the raw head (honest failure, never a silent whole-text positive).
*/
function parseEnhanceJson(text) {
	const attempts = [
		text,
		text.replace(/^```(?:json)?\s*|\s*```$/g, ""),
		text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)
	];
	for (const attempt of attempts) try {
		const obj = JSON.parse(attempt);
		if (obj !== null && typeof obj === "object" && typeof obj.positive === "string") return {
			positive: obj.positive,
			negative: typeof obj.negative === "string" ? obj.negative : ""
		};
	} catch {}
	throw new Error("enhance: the model reply was not the recipe JSON — head: " + text.slice(0, 160));
}
//#endregion
export { DEFAULT_GATEWAY_URL as a, normalizeGatewayUrl as c, routeName as i, matchHarnessRoute as n, RayGatewayError as o, resolveHarnessRoutes as r, gatewayRequest as s, harnessEnhance as t };
