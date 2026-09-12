import { createUserMessage } from "@deepseek-ai/dsh-llm";
//#region src/estate.ts
/** Route one KV/runs lane to its seat; undefined = no seat / no match. */
async function trySeats(ctx, method, path, body, signal) {
	const probe = ctx;
	const seats = {
		get draftsRemote() {
			return probe.get("draftsRemote");
		},
		get benchRemote() {
			return probe.get("benchRemote");
		},
		get runs() {
			return probe.get("runs");
		},
		get disclose() {
			return probe.get("disclose");
		},
		get manage() {
			return probe.get("manage");
		},
		get skills() {
			return probe.get("skills");
		},
		get load() {
			return probe.get("load");
		},
		get queue() {
			return probe.get("queue");
		}
	};
	signal.throwIfAborted();
	if (method === "GET" && path === "/v1/flows/drafts") {
		if (seats.draftsRemote === void 0) return void 0;
		return seats.draftsRemote.list(signal);
	}
	let m = /^\/v1\/flows\/drafts\/([^/?]+)$/.exec(path);
	if (method === "GET" && m !== null) {
		if (seats.draftsRemote === void 0) return void 0;
		return seats.draftsRemote.get(decodeURIComponent(m[1]), signal);
	}
	if (method === "POST" && path === "/v1/flows/drafts") {
		if (seats.benchRemote === void 0) return void 0;
		if (body === void 0 || typeof body !== "object" || body === null) throw new Error("card compose needs a JSON body");
		const bag = body;
		const intentSrc = typeof bag["prompt"] === "string" && bag["prompt"] !== "" ? bag["prompt"] : typeof bag["intent"] === "string" ? bag["intent"] : "card";
		const intent = intentSrc.length > 80 ? intentSrc.slice(0, 77) + "…" : intentSrc;
		const params = { ...bag["params"] ?? {} };
		if (typeof bag["prompt"] === "string" && bag["prompt"] !== "") params["prompt"] = bag["prompt"];
		const ensure = {
			session: "default",
			intent,
			stages: [{
				id: "s_0",
				engine: "comfyui",
				params
			}]
		};
		const cur = await seats.benchRemote.get("default", signal);
		if (cur !== void 0 && typeof cur["rev"] === "number") ensure["expect_rev"] = cur["rev"];
		const row = await seats.benchRemote.ensure(ensure, signal);
		if (row === void 0 || typeof row["draft_id"] !== "string") throw new Error("card compose returned no draft_id — refusing to start cardless");
		return { draftId: row["draft_id"] };
	}
	m = /^\/v1\/flows\/drafts\/([^/?]+)\/stages\/([^/?]+)(?:\/result)?$/.exec(path);
	if (method === "PATCH" && m !== null) {
		if (seats.draftsRemote === void 0) return void 0;
		if (body === void 0 || typeof body !== "object" || body === null) throw new Error("draft stage patch needs a JSON body");
		return seats.draftsRemote.patch(decodeURIComponent(m[1]), decodeURIComponent(m[2]), body, signal);
	}
	if (method === "POST" && path === "/v1/bench/ensure") {
		if (seats.benchRemote === void 0) return void 0;
		if (body === void 0 || typeof body !== "object" || body === null) throw new Error("bench ensure needs a JSON body");
		return seats.benchRemote.ensure(body, signal);
	}
	m = /^\/v1\/bench\/([^/?]+)$/.exec(path);
	if (method === "GET" && m !== null) {
		if (seats.benchRemote === void 0) return void 0;
		return seats.benchRemote.get(decodeURIComponent(m[1]), signal);
	}
	if (method === "POST") {
		const arm = /^\/v1\/bench\/([^/?]+)\/(patch|add_stage|remove_stage|rewire|undo)$/.exec(path);
		if (arm !== null) {
			if (seats.benchRemote === void 0) return void 0;
			if (body === void 0 || typeof body !== "object" || body === null) throw new Error(`bench ${arm[2]} needs a JSON body`);
			const session = decodeURIComponent(arm[1]);
			const doc = body;
			switch (arm[2]) {
				case "patch": return seats.benchRemote.patch(session, doc, signal);
				case "add_stage": return seats.benchRemote.addStage(session, doc, signal);
				case "remove_stage": return seats.benchRemote.removeStage(session, doc, signal);
				case "rewire": return seats.benchRemote.rewire(session, doc, signal);
				case "undo": return seats.benchRemote.undo(session, doc, signal);
			}
		}
	}
	if (method === "POST" && path === "/v1/flows/validate") {
		if (seats.runs === void 0) return void 0;
		return seats.runs.validate(body, signal);
	}
	if (method === "POST" && path === "/v1/flows/start") {
		if (seats.runs === void 0) return void 0;
		return seats.runs.start(body, signal);
	}
	m = /^\/v1\/flows\/status\/([^/?]+)(?:\?([^/]*))?$/.exec(path);
	if (method === "GET" && m !== null) {
		if (seats.runs === void 0) return void 0;
		const first = m[2] === void 0 ? null : m[2].split("&")[0];
		const flagValue = first === null ? "" : first.split("=")[1] ?? "";
		const includeLog = [
			"1",
			"true",
			"yes"
		].includes(decodeURIComponent(flagValue).toLowerCase());
		return seats.runs.status(decodeURIComponent(m[1]), signal, includeLog);
	}
	m = /^\/v1\/flows\/stop\/([^/?]+)$/.exec(path);
	if (method === "POST" && m !== null) {
		if (seats.runs === void 0) return void 0;
		return seats.runs.stop(decodeURIComponent(m[1]), signal);
	}
	m = /^\/v1\/flows\/runs(?:\/|$|\?)/.exec(path);
	if (method === "GET" && m !== null && path !== "/v1/flows/runs/") {
		if (seats.runs === void 0) return void 0;
		const lim = /(?:^|[?&])limit=([^&]*)/.exec(path);
		return seats.runs.list(lim !== null ? decodeURIComponent(lim[1]) : "200", signal);
	}
	m = /^\/v1\/discover(?:\?([^/]*))?$/.exec(path);
	if (method === "GET" && m !== null) {
		if (seats.disclose === void 0) return void 0;
		const qs = new URLSearchParams(m[1] ?? "");
		return seats.disclose.discover(qs.get("lookup") ?? "all", qs.get("q") ?? "", qs.get("tags") ?? "");
	}
	if (method === "POST" && path === "/v1/manage") {
		if (seats.manage === void 0) return void 0;
		return seats.manage.act(body, signal);
	}
	if (method === "GET" && path === "/v1/skills") {
		if (seats.skills === void 0) return void 0;
		return seats.skills.index();
	}
	m = /^\/v1\/skills\/([^/?]+)$/.exec(path);
	if (method === "GET" && m !== null) {
		if (seats.skills === void 0) return void 0;
		return seats.skills.read(decodeURIComponent(m[1]), signal);
	}
	m = /^\/v1\/load(?:\?([^/]*))?$/.exec(path);
	if (method === "GET" && m !== null) {
		if (seats.load === void 0) return void 0;
		const qs = new URLSearchParams(m[1] ?? "");
		return seats.load.load(qs.get("inference_type") ?? "", qs.get("name") ?? "");
	}
	m = /^\/v1\/ledger(?:\?([^/]*))?$/.exec(path);
	if (method === "GET" && m !== null) {
		if (seats.queue === void 0) return void 0;
		const qs = new URLSearchParams(m[1] ?? "");
		return seats.queue.ledger(qs.get("limit") ?? "50", qs.get("event") ?? "");
	}
}
/** Build the tools' request: seats only, in-process. A lane with no
*  seat is a hard error (the gateway that used to absorb it is
*  dead) — the caller migrates to a named remote. */
function makeEstateRequest(ctx) {
	return async (method, path, body, execSignal) => {
		const viaSeats = await trySeats(ctx, method, path, body, execSignal);
		if (viaSeats !== void 0) return viaSeats;
		throw new Error(`no remote serves ${method} ${path} (the gateway lane fallback died 2026-09-10 — migrate to a named Typert remote)`);
	};
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
export { makeEstateRequest as a, routeName as i, matchHarnessRoute as n, resolveHarnessRoutes as r, harnessEnhance as t };
