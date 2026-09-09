import { createRequire } from "node:module";
import { buildMusicTool } from "@melite/audio-music/tool";
import { buildTtsTool } from "@melite/audio-tts/tool";
import { buildVoiceLockTool } from "@melite/audio-voice-lock/tool";
import { buildImageEditTool } from "@melite/image-image-edit/tool";
import { buildMotionTool } from "@melite/motion-motion/tool";
import { buildH3TimelineTool } from "@melite/video-h3-timeline/tool";
import { GENERIC_ENHANCE_RECIPE } from "@melite/gateway-core/prompt-guide";
//#region \0rolldown/runtime.js
var __require = /* #__PURE__ */ (() => createRequire(import.meta.url))();
//#endregion
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
//#region src/json-clean.ts
/**
* Deep JSON-normalization for tool results.
*
* The DSH tool registry rejects non-lossless values (undefined, functions,
* symbols, -0, sparse arrays) in both arguments and results — the exact
* "binding arguments must be lossless JSON" failure W2's live gate caught in
* model_catalog (raw `label: m.label` passthrough leaked `undefined` for
* catalog entries without labels). Every Melite tool result passes through
* jsonClean at the boundary so gateway-shaped data ( SparseMap-like objects
* with undefined fields) can never poison the registry call.
*/
function jsonClean(value) {
	return clean(value, /* @__PURE__ */ new WeakMap());
}
function clean(value, seen) {
	if (value === null || typeof value === "string" || typeof value === "boolean") return value;
	if (typeof value === "number") return Object.is(value, -0) ? 0 : value;
	if (typeof value === "bigint") return String(value);
	if (typeof value === "undefined" || typeof value === "function" || typeof value === "symbol") return null;
	if (Array.isArray(value)) {
		const out = new Array(value.length);
		for (let i = 0; i < value.length; i++) out[i] = value[i] === void 0 ? null : clean(value[i], seen);
		return out;
	}
	if (typeof value === "object") {
		const obj = value;
		const hit = seen.get(obj);
		if (hit !== void 0) return hit;
		const out = {};
		seen.set(obj, out);
		for (const k of Object.keys(obj)) {
			const v = obj[k];
			if (v === void 0) continue;
			out[k] = clean(v, seen);
		}
		return out;
	}
	return null;
}
//#endregion
//#region src/tools/card-run.ts
const TIMEOUT_MS$5 = 2e4;
/** Pull the gateway's named {error} out of a non-2xx body (fallback:
* the raw body — still loud, still named). */
function _namedError(body, fallback) {
	try {
		const parsed = JSON.parse(body);
		if (parsed && typeof parsed.error === "string" && parsed.error) return parsed.error;
	} catch {}
	return body || fallback;
}
function cardRun(gatewayUrl) {
	return {
		name: "card_run",
		description: "Run a composed ACTION CARD through the serial GPU queue (headless run door). Args: draftId (from build_flow / the lane's card tool). The draft's single stage is submitted as {model, ...params} to the queue start door — the same composition path as the editor's Run button. Returns {run_id}; poll it with run_status. Multi-stage drafts are refused (use flow_run with a named template). One active run machine-wide — submissions queue in order.",
		parameters: {
			type: "object",
			properties: {
				draftId: {
					type: "string",
					description: "The draft id returned by build_flow / the card tool, e.g. \"draft-6a998b0f-...-0\"."
				},
				test: {
					type: "boolean",
					description: "L4 barrier: when true, the run is routed to the test-output root and hidden from the production /v1/assets view. Use for scratch submissions. Default false (production).",
					default: false
				}
			},
			required: ["draftId"]
		},
		presentCall(args) {
			const a = typeof args === "object" && args !== null ? args : {};
			return {
				card: "generic",
				title: `Run card ${String(a.draftId ?? "?")}`,
				kind: "execute",
				rawInput: String(a.draftId ?? "?")
			};
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: true,
				properties: {
					run_id: {
						type: "string",
						description: "The queue run id — poll with run_status(run_id)."
					},
					status: {
						type: "string",
						description: "Registration status (queued/running)."
					},
					model: {
						type: "string",
						description: "The explicitly-named model that was submitted."
					},
					draft: {
						type: "string",
						description: "The source draft id."
					}
				},
				required: [
					"run_id",
					"model",
					"draft"
				]
			},
			render: (args, value) => {
				const v = value;
				if (v && v.error) return [{
					type: "text",
					text: "card_run REFUSED: " + v.error
				}];
				return [{
					type: "text",
					text: "card_run " + String(v.model ?? "?") + " → " + String(v.run_id ?? "?") + " [" + String(v.status ?? "queued") + "] — poll with run_status"
				}];
			}
		},
		async execute(args, exec) {
			const a = typeof args === "object" && args !== null ? args : {};
			const draftId = typeof a.draftId === "string" ? a.draftId : "";
			if (!draftId) return jsonClean({ error: "draftId is required" });
			let docRes;
			try {
				docRes = await gatewayRequest(gatewayUrl, "GET", "/v1/flows/drafts/" + encodeURIComponent(draftId), void 0, exec.signal, TIMEOUT_MS$5);
			} catch (e) {
				if (e instanceof RayGatewayError) return jsonClean({
					draft: draftId,
					error: _namedError(e.body, "draft fetch failed")
				});
				throw e;
			}
			let doc = {};
			if (typeof docRes === "string") try {
				doc = JSON.parse(docRes);
			} catch {
				doc = { error: "draft is not JSON" };
			}
			else if (docRes && typeof docRes === "object") doc = docRes;
			if (doc && typeof doc.error === "string") return jsonClean({
				draft: draftId,
				error: doc.error
			});
			const stages = Array.isArray(doc.stages) ? doc.stages : [];
			if (stages.length === 0) return jsonClean({
				draft: draftId,
				error: "draft has no stages — compose it with build_flow first"
			});
			if (stages.length > 1) return jsonClean({
				draft: draftId,
				error: "draft has " + stages.length + " stages — multi-step flows run via flow_run with a NAMED template, never a hand-assembled card"
			});
			const stage = stages[0];
			const model = typeof stage.service === "string" && stage.service ? stage.service : "";
			if (!model) return jsonClean({
				draft: draftId,
				error: "draft stage carries no service (model) — recompose the card"
			});
			const params = stage.params && typeof stage.params === "object" ? { ...stage.params } : {};
			const paramsModel = typeof params.model === "string" ? params.model : "";
			if (paramsModel && paramsModel !== model) return jsonClean({
				draft: draftId,
				error: "stage.service says " + JSON.stringify(model) + " but params.model says " + JSON.stringify(paramsModel) + " — the draft is inconsistent; recompose it"
			});
			const testFlag = a.test === true;
			const startBody = {
				...params,
				model,
				test: testFlag,
				draft_id: draftId
			};
			let res;
			try {
				res = await gatewayRequest(gatewayUrl, "POST", "/v1/flows/start", startBody, exec.signal, TIMEOUT_MS$5);
			} catch (e) {
				if (e instanceof RayGatewayError) return jsonClean({
					draft: draftId,
					model,
					error: _namedError(e.body, "queue refused the card")
				});
				throw e;
			}
			if (res && typeof res.error === "string") return jsonClean({
				draft: draftId,
				model,
				error: res.error
			});
			return jsonClean({
				run_id: res && typeof res.run_id === "string" ? res.run_id : "",
				status: res && typeof res.status === "string" ? res.status : "queued",
				model,
				draft: draftId
			});
		}
	};
}
//#endregion
//#region src/tools/flow-run.ts
const TIMEOUT_MS$4 = 2e4;
function flowRun(gatewayUrl) {
	return {
		name: "flow_run",
		description: "Run a NAMED TEMPLATE (multi-step flow) through the serial GPU queue (headless run door). Args: template (a lane from lane_bundle_peek kind=template — creature-flow, humanoid-flow, audio-native-tts...) + optional params (merged over the template's declared inputs). Unknown names are refused loudly BEFORE any run registers. Returns {run_id}; poll with run_status. One active run machine-wide.",
		parameters: {
			type: "object",
			properties: {
				template: {
					type: "string",
					description: "The template name exactly as peeked — the flows/<name>/flow.py module name (the module IS the name)."
				},
				params: {
					type: "object",
					description: "Optional overrides merged over the template defaults (seed, prompts, knobs).",
					additionalProperties: true
				},
				test: {
					type: "boolean",
					description: "L4 barrier: when true, the run is routed to the test-output root and hidden from the production /v1/assets view. Use for scratch submissions (the agent probing a flow, the user pre-flighting a card, etc.). Default false (production).",
					default: false
				}
			},
			required: ["template"]
		},
		presentCall(args) {
			const a = typeof args === "object" && args !== null ? args : {};
			return {
				card: "generic",
				title: `Run flow ${String(a.template ?? "?")}`,
				kind: "execute",
				rawInput: String(a.template ?? "?")
			};
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: true,
				properties: {
					run_id: {
						type: "string",
						description: "The queue run id — poll with run_status(run_id)."
					},
					status: {
						type: "string",
						description: "Registration status (queued/running)."
					},
					template: {
						type: "string",
						description: "The named template that was submitted."
					}
				},
				required: ["run_id", "template"]
			},
			render: (args, value) => {
				const v = value;
				if (v && v.error) return [{
					type: "text",
					text: "flow_run REFUSED: " + v.error
				}];
				return [{
					type: "text",
					text: "flow_run " + String(v.template ?? "?") + " → " + String(v.run_id ?? "?") + " [" + String(v.status ?? "queued") + "] — poll with run_status"
				}];
			}
		},
		async execute(args, exec) {
			const a = typeof args === "object" && args !== null ? args : {};
			const template = typeof a.template === "string" ? a.template : "";
			if (!template) return jsonClean({ error: "template is required" });
			const overrides = a.params && typeof a.params === "object" && !Array.isArray(a.params) ? a.params : {};
			const testFlag = a.test === true;
			const composeBody = {
				...overrides,
				flow: template
			};
			let draftId = "";
			try {
				const composed = await gatewayRequest(gatewayUrl, "POST", "/v1/flows/drafts", composeBody, exec.signal, TIMEOUT_MS$4);
				if (composed && typeof composed.error === "string" && composed.error) return jsonClean({
					template,
					error: composed.error
				});
				const minted = composed && (composed.draftId ?? composed.draft_id);
				if (typeof minted !== "string" || !minted) return jsonClean({
					template,
					error: "card compose returned no draftId"
				});
				draftId = minted;
			} catch (e) {
				if (e instanceof RayGatewayError) {
					let named = "";
					try {
						named = String(JSON.parse(e.body).error ?? "");
					} catch {
						named = "";
					}
					return jsonClean({
						template,
						error: named || e.body || "card compose refused the template"
					});
				}
				throw e;
			}
			const startBody = {
				...overrides,
				flow: template,
				test: testFlag,
				draft_id: draftId
			};
			let res;
			try {
				res = await gatewayRequest(gatewayUrl, "POST", "/v1/flows/start", startBody, exec.signal, TIMEOUT_MS$4);
			} catch (e) {
				if (e instanceof RayGatewayError) {
					let named = "";
					try {
						named = String(JSON.parse(e.body).error ?? "");
					} catch {
						named = "";
					}
					return jsonClean({
						template,
						error: named || e.body || "queue refused the template"
					});
				}
				throw e;
			}
			if (res && typeof res.error === "string") return jsonClean({
				template,
				error: res.error
			});
			return jsonClean({
				run_id: res && typeof res.run_id === "string" ? res.run_id : "",
				status: res && typeof res.status === "string" ? res.status : "queued",
				template
			});
		}
	};
}
//#endregion
//#region src/tools/run-status.ts
const TIMEOUT_MS$3 = 15e3;
function runStatus(gatewayUrl) {
	return {
		name: "run_status",
		description: "Poll a queue run: status (queued|running|completed|error|stopped|failed), per-stage progress, artifacts (landed bytes with paths) and the EXACT error string on failure. Args: runId (from card_run / flow_run). Includes queue_position while waiting on the serial GPU lane. Read-only — the stop door is operator-ordered.",
		parameters: {
			type: "object",
			properties: { runId: {
				type: "string",
				description: "The run id returned by card_run / flow_run."
			} },
			required: ["runId"]
		},
		presentCall(args) {
			const a = typeof args === "object" && args !== null ? args : {};
			return {
				card: "generic",
				title: `Run status: ${String(a.runId ?? "?")}`,
				kind: "read",
				rawInput: String(a.runId ?? "?")
			};
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: true,
				properties: {
					run_id: { type: "string" },
					status: { type: "string" },
					stages: {
						type: "array",
						description: "Per-stage rows: id/name, status, error when present."
					},
					artifacts: {
						type: "array",
						description: "Landed artifact rows (path, bytes). Empty until completed."
					},
					error: {
						type: "string",
						description: "The EXACT failure string when status is error/failed."
					},
					queue_position: {
						type: "number",
						description: "0 = active; >0 = waiting in the FIFO."
					}
				},
				required: ["run_id", "status"]
			},
			render: (args, value) => {
				const v = value;
				if (v && v.error) return [{
					type: "text",
					text: "run " + String(v.run_id ?? "?") + " " + String(v.status ?? "?") + " — " + v.error
				}];
				const done = (v.stages ?? []).filter((s) => s && s.status === "completed").length;
				const total = (v.stages ?? []).length;
				const pos = typeof v.queue_position === "number" && v.queue_position > 0 ? " (queue #" + v.queue_position + ")" : "";
				return [{
					type: "text",
					text: "run " + String(v.run_id ?? "?") + " " + String(v.status ?? "?") + pos + " — " + done + "/" + total + " stage(s)" + ((v.artifacts ?? []).length ? " · " + (v.artifacts ?? []).length + " artifact(s)" : "")
				}];
			}
		},
		async execute(args, exec) {
			const a = typeof args === "object" && args !== null ? args : {};
			const runId = typeof a.runId === "string" ? a.runId : "";
			if (!runId) return jsonClean({ error: "runId is required" });
			let res;
			try {
				res = await gatewayRequest(gatewayUrl, "GET", "/v1/flows/status/" + encodeURIComponent(runId), void 0, exec.signal, TIMEOUT_MS$3);
			} catch (e) {
				if (e instanceof RayGatewayError) {
					let named = "";
					try {
						named = String(JSON.parse(e.body).error ?? "");
					} catch {
						named = "";
					}
					return jsonClean({
						run_id: runId,
						error: named || e.body || "status fetch failed"
					});
				}
				throw e;
			}
			if (res && typeof res.error === "string") return jsonClean({
				run_id: runId,
				error: res.error
			});
			return jsonClean({
				run_id: typeof res.run_id === "string" ? res.run_id : runId,
				status: typeof res.status === "string" ? res.status : "unknown",
				stages: Array.isArray(res.stages) ? res.stages : [],
				artifacts: Array.isArray(res.artifacts) ? res.artifacts : [],
				error: typeof res.error === "string" ? res.error : void 0,
				queue_position: typeof res.queue_position === "number" ? res.queue_position : 0
			});
		}
	};
}
//#endregion
//#region src/tools/build-flow.ts
const CATALOG_TIMEOUT_MS$2 = 15e3;
const DRAFT_TIMEOUT_MS = 15e3;
const VALIDATE_TIMEOUT_MS = 15e3;
/** Fold flat connects into per-stage typed edges. LOUD on shapes the
* gateway would only bounce later — the agent reads the refusal HERE,
* before any HTTP round trip. Kind resolution: the connect's `kind`
* wins; a stage-to-stage connect may omit it when the upstream stage
* DECLARES its outputs (inferred); an `initial.*` connect must state
* it (nothing to infer from — the agent knows what its key carries). */
function foldConnects(flowId, stages, connects) {
	const folded = stages.map((st) => {
		const outputs = {};
		const o = st.outputs;
		if (o !== null && typeof o === "object" && !Array.isArray(o)) for (const [k, v] of Object.entries(o)) outputs[k] = String(v);
		return {
			id: String(st.id ?? ""),
			engine: String(st.engine ?? ""),
			description: String(st.description ?? ""),
			params: st.params !== null && typeof st.params === "object" && !Array.isArray(st.params) ? st.params : {},
			inputs: {},
			expected: {},
			outputs
		};
	});
	const byId = new Map(folded.map((s) => [s.id, s]));
	for (const c of connects) {
		const from = typeof c.from === "string" ? c.from : "";
		const to = typeof c.to === "string" ? c.to : "";
		if (from === "" || to === "") throw new Error("build_flow: connect needs {from, to} — got from=" + JSON.stringify(c.from) + " to=" + JSON.stringify(c.to) + " (from: \"stage[.output]\" or \"initial.key\"; to: \"stage.input\")");
		const toDot = to.indexOf(".");
		if (toDot < 1) throw new Error("build_flow: connect to=" + JSON.stringify(to) + " is not \"stage.input\" — the receiving stage and its input name");
		const target = byId.get(to.slice(0, toDot));
		if (target === void 0) throw new Error("build_flow: connect to=" + JSON.stringify(to) + " names unknown stage " + JSON.stringify(to.slice(0, toDot)) + " (flow " + flowId + " stages: " + folded.map((s) => s.id).join(", ") + ")");
		const inputName = to.slice(toDot + 1);
		let edge;
		let inferred;
		if (from.startsWith("initial.")) edge = { initial: from.slice(8) };
		else {
			const dot = from.indexOf(".");
			const stageId = dot < 0 ? from : from.slice(0, dot);
			const output = dot < 0 ? "default" : from.slice(dot + 1);
			const upstream = byId.get(stageId);
			if (upstream === void 0) throw new Error("build_flow: connect from=" + JSON.stringify(from) + " names unknown stage " + JSON.stringify(stageId) + " (initial wires are \"initial.<key>\")");
			edge = {
				stage: stageId,
				output
			};
			inferred = upstream.outputs[output];
		}
		let kind;
		if (typeof c.kind === "string" && c.kind.length > 0) kind = c.kind;
		else if (inferred !== void 0) kind = inferred;
		if (kind === void 0) throw new Error("build_flow: connect " + JSON.stringify(from) + " -> " + JSON.stringify(to) + " has no kind and none can be inferred — state it (text, image, video, audio, mesh, num, lora, seg)" + (from.startsWith("initial.") ? " (initial wires ALWAYS need an explicit kind)" : " (the upstream stage does not declare this output)"));
		if (target.inputs[inputName] !== void 0) throw new Error("build_flow: stage " + target.id + " input " + JSON.stringify(inputName) + " is wired twice");
		target.inputs[inputName] = edge;
		target.expected[inputName] = kind;
	}
	return folded;
}
function buildFlow(gatewayUrl) {
	return {
		name: "build_flow",
		description: "Compose a flow the user reviews and runs. TWO modes. SINGLE: model (any model with a live card tool — discover with card_tools; e.g. h3-timeline, music3, krea-2) + prompt (+ optional params). MULTI-STEP: flow = {id, description?, stages: [{id, engine, description?, params?, outputs?: {name: kind}}], connects: [{from: \"stage[.output]\"| \"initial.key\", to: \"stage.input\", kind?}]} — a typed pipeline. The flow is COMPILED FIRST at /v1/flows/validate: a bad wire (wrong kind, forward wire, typo) returns the verbatim compile error naming stage/input and both kinds — iterate until it compiles, no GPU spent. kinds: text image video audio mesh num lora seg; initial wires state kind explicitly. Creates a flow draft; the conversation renders editable card tiles (one per stage). The user's Run posts the whole flow as ONE typed run — edits on the tiles ride it. This tool never executes anything — there is no run tool; ONLY the user starts runs, from the cards.",
		parameters: {
			type: "object",
			properties: {
				model: {
					type: "string",
					description: "SINGLE mode: catalog model id (discover with card_tools / model_catalog)."
				},
				prompt: {
					type: "string",
					description: "SINGLE mode: generation prompt. The card carries it; the user can refine it before running."
				},
				params: {
					type: "object",
					additionalProperties: true,
					description: "SINGLE mode: extra card params over the model defaults (e.g. {\"seed\":7}). An explicit prompt argument wins over params.prompt."
				},
				flow: {
					type: "object",
					additionalProperties: true,
					description: "MULTI-STEP mode: the typed pipeline body. {id, description?, stages[], connects[]}. Exclusive with model/prompt. Compiled at /v1/flows/validate before any draft exists."
				}
			}
		},
		presentCall(args) {
			const a = typeof args === "object" && args !== null ? args : {};
			const stages = Array.isArray(a.flow?.stages) ? a.flow.stages.length : 0;
			return {
				card: "generic",
				title: stages > 0 ? `Build flow (${stages} stages)` : `Build flow: ${String(a.model ?? "?")}`,
				kind: "execute",
				rawInput: stages > 0 ? { stages } : { model: String(a.model ?? "?") }
			};
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: true,
				properties: {
					card: {
						type: "string",
						description: "Always \"draft\" — editable cards, never a run."
					},
					draftId: {
						type: "string",
						description: "The backend draft id the card surface hydrates."
					},
					stages: {
						type: "array",
						items: {
							type: "object",
							additionalProperties: true
						},
						description: "Slim stage rows (id/title/kind/service) — one per action card."
					}
				},
				required: [
					"card",
					"draftId",
					"stages"
				]
			},
			render: (_args, value) => {
				const v = value;
				const n = Array.isArray(v.stages) ? v.stages.length : 0;
				return [{
					type: "text",
					text: "card " + String(v.draftId ?? "?") + " (" + String(v.model ?? "?") + ") — " + n + " stage" + (n === 1 ? "" : "s") + " · the user presses Run on the card"
				}];
			}
		},
		async execute(args, exec) {
			const a = typeof args === "object" && args !== null ? args : {};
			if (a.flow !== void 0) return composeMulti(gatewayUrl, a.flow, exec.signal);
			return composeSingle(gatewayUrl, a, exec.signal);
		}
	};
}
async function composeMulti(gatewayUrl, flowArg, signal) {
	const flowId = typeof flowArg.id === "string" ? flowArg.id : "";
	if (flowId === "") throw new Error("build_flow: flow.id is required (the pipeline name, [a-z_][a-z0-9_-]*)");
	const rawStages = flowArg.stages;
	if (!Array.isArray(rawStages) || rawStages.length === 0) throw new Error("build_flow: flow.stages must be a non-empty array of {id, engine, ...} rows");
	const folded = foldConnects(flowId, rawStages, Array.isArray(flowArg.connects) ? flowArg.connects : []);
	const flowBody = {
		id: flowId,
		description: typeof flowArg.description === "string" ? flowArg.description : "",
		stages: folded.map((s) => ({
			id: s.id,
			engine: s.engine,
			description: s.description,
			params: s.params,
			...Object.keys(s.inputs).length > 0 ? { inputs: s.inputs } : {},
			...Object.keys(s.expected).length > 0 ? { expected: s.expected } : {},
			...Object.keys(s.outputs).length > 0 ? { outputs: s.outputs } : {}
		}))
	};
	await gatewayRequest(gatewayUrl, "POST", "/v1/flows/validate", flowBody, signal, VALIDATE_TIMEOUT_MS);
	const draft = await gatewayRequest(gatewayUrl, "POST", "/v1/flows/drafts", {
		intent: flowId,
		flow: flowBody,
		stages: folded.map((s) => ({
			id: s.id,
			title: s.description !== "" ? s.description : s.id,
			kind: "generation",
			service: s.engine,
			params: s.params
		}))
	}, signal, DRAFT_TIMEOUT_MS);
	if (typeof draft.draftId !== "string" || draft.draftId === "") throw new Error("build_flow: gateway draft POST returned no draftId");
	return jsonClean({
		card: "draft",
		draftId: draft.draftId,
		model: flowId,
		title: flowId,
		stages: Array.isArray(draft.stages) ? draft.stages : []
	});
}
async function composeSingle(gatewayUrl, a, signal) {
	if (typeof a.model !== "string" || a.model.length === 0) throw new Error("build_flow: \"model\" is required (a catalog model id string)");
	if (typeof a.prompt !== "string" || a.prompt.length === 0) throw new Error("build_flow: \"prompt\" is required (what to put on the card)");
	const tools = await gatewayRequest(gatewayUrl, "GET", "/v1/card-tools", void 0, signal, CATALOG_TIMEOUT_MS$2);
	const manifest = Array.isArray(tools) ? tools.find((t) => t.model === a.model) : void 0;
	if (manifest === void 0) {
		const allowed = (Array.isArray(tools) ? tools : []).map((t) => String(t.model)).filter((s) => s !== "").join(", ");
		throw new Error("build_flow: model \"" + a.model + "\" has no card tool. Live card tools: " + allowed);
	}
	const cat = await gatewayRequest(gatewayUrl, "GET", "/v1/model-catalog", void 0, signal, CATALOG_TIMEOUT_MS$2);
	const entry = (cat.models ?? {})[a.model];
	const familyId = entry !== void 0 && typeof entry.family === "string" ? entry.family : a.model;
	const famLabel = cat.families?.[familyId]?.label;
	let title = typeof famLabel === "string" && famLabel.length > 0 ? famLabel : a.model;
	const cardDefaults = {};
	{
		const props = (manifest.params_schema !== null && typeof manifest.params_schema === "object" && manifest.params_schema.properties) ?? {};
		for (const [k, spec] of Object.entries(props)) if (spec.default !== void 0) cardDefaults[k] = spec.default;
		if (typeof manifest.stage_title === "string" && manifest.stage_title.length > 0) title = manifest.stage_title;
	}
	try {
		const v = await gatewayRequest(gatewayUrl, "GET", "/v1/card-tools/validate?model=" + encodeURIComponent(a.model), void 0, signal, 1e4);
		if (v.runnable !== true) throw new Error("build_flow: " + (v.error || "model \"" + a.model + "\" cannot run"));
	} catch (e) {
		if (e instanceof Error && /cannot run/.test(e.message)) throw e;
	}
	const defaults = entry !== void 0 && entry.defaults !== null && typeof entry.defaults === "object" && !Array.isArray(entry.defaults) ? entry.defaults : {};
	const bag = a.params !== null && typeof a.params === "object" && !Array.isArray(a.params) ? a.params : {};
	const params = {
		...cardDefaults,
		...defaults,
		...bag,
		prompt: a.prompt
	};
	const draft = await gatewayRequest(gatewayUrl, "POST", "/v1/flows/drafts", {
		intent: a.prompt.length > 80 ? a.prompt.slice(0, 77) + "…" : a.prompt,
		stages: [{
			title,
			kind: "generation",
			service: a.model,
			params
		}]
	}, signal, DRAFT_TIMEOUT_MS);
	if (typeof draft.draftId !== "string" || draft.draftId === "") throw new Error("build_flow: gateway draft POST returned no draftId");
	return jsonClean({
		card: "draft",
		draftId: draft.draftId,
		model: a.model,
		title,
		stages: Array.isArray(draft.stages) ? draft.stages : []
	});
}
//#endregion
//#region src/tools/comfy-manage.ts
const MANAGE_TIMEOUT_MS = 3e5;
const ACTIONS = [
	"status",
	"logs",
	"search_models",
	"list_extensions",
	"snapshot_list",
	"install_extension",
	"install_extension_url",
	"download_model",
	"provision_model",
	"restart",
	"stop",
	"launch",
	"update",
	"switch_version",
	"free",
	"snapshot_save",
	"snapshot_restore"
];
function comfyManage(gatewayUrl) {
	return {
		name: "comfy_manage",
		description: "The ONE ComfyUI manager: wraps comfy-mcp + comfyui-manager (security=medium) + comfy-cli. Actions: status (server/security/routing/active runs — start here), logs, search_models; list_extensions (installed packs — managed workspace only), snapshot_list / snapshot_save / snapshot_restore (environment snapshots; restore is refused while runs are active); install_extension (registry ids), install_extension_url (git url), download_model (url), provision_model (catalog id — the model_catalog id); restart, stop, launch, update (target comfy|cli|all), switch_version, free. INFRA UPKEEP only — it never runs inference, and lifecycle actions are refused while runs are active (stop them or pass force).",
		parameters: {
			type: "object",
			properties: {
				action: {
					type: "string",
					enum: ACTIONS,
					description: "The management action to dispatch."
				},
				nodes: {
					type: "array",
					items: { type: "string" },
					description: "install_extension: registry node-pack ids, e.g. [\"ComfyUI-KJNodes\"]."
				},
				url: {
					type: "string",
					description: "install_extension_url / download_model: the git URL or file URL."
				},
				relative_path: {
					type: "string",
					description: "download_model: destination under the models root, e.g. \"models/checkpoints\"."
				},
				filename: {
					type: "string",
					description: "download_model: on-disk filename."
				},
				model: {
					type: "string",
					description: "provision_model: catalog id from model_catalog, e.g. \"z-image\"."
				},
				variant: {
					type: "string",
					description: "provision_model: optional variant id."
				},
				quant: {
					type: "string",
					description: "provision_model: optional quant cell id."
				},
				query: {
					type: "string",
					description: "search_models: search text."
				},
				tail: {
					type: "integer",
					description: "logs: line count (default 200)."
				},
				version: {
					type: "string",
					description: "switch_version: target ComfyUI version."
				},
				target: {
					type: "string",
					enum: [
						"comfy",
						"cli",
						"all"
					],
					description: "update: what to update (default \"comfy\")."
				},
				force: {
					type: "boolean",
					description: "Override the active-run guard on lifecycle actions."
				},
				snapshot: {
					type: "string",
					description: "snapshot_restore: a snapshot filename from snapshot_list."
				}
			},
			required: ["action"]
		},
		presentCall(args) {
			const a = typeof args === "object" && args !== null ? args : {};
			return {
				card: "generic",
				title: `ComfyUI ${String(a.action ?? "?")}`,
				kind: "execute",
				rawInput: String(a.action ?? "?")
			};
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: true,
				properties: {
					ok: { type: "boolean" },
					action: { type: "string" },
					detail: {
						type: "string",
						description: "One-line human summary."
					}
				},
				required: ["ok", "action"]
			},
			render: (_args, value) => {
				const v = value;
				return [{
					type: "text",
					text: "comfy_manage " + String(v.action ?? "?") + ": " + String(v.detail ?? "")
				}];
			}
		},
		async execute(args, exec) {
			const a = args ?? {};
			const body = { action: a.action };
			for (const k of [
				"nodes",
				"url",
				"relative_path",
				"filename",
				"model",
				"variant",
				"quant",
				"query",
				"tail",
				"version",
				"target",
				"force",
				"snapshot"
			]) if (a[k] !== void 0 && a[k] !== null && a[k] !== "") body[k] = a[k];
			let res;
			try {
				res = await gatewayRequest(gatewayUrl, "POST", "/v1/manage", body, exec?.signal ?? new AbortController().signal, MANAGE_TIMEOUT_MS);
			} catch (e) {
				if (e instanceof RayGatewayError) try {
					const parsed = JSON.parse(e.body);
					if (typeof parsed.action === "string" && typeof parsed.detail === "string") return jsonClean({
						ok: false,
						action: parsed.action,
						detail: parsed.detail,
						data: parsed.data ?? null
					});
				} catch {}
				throw e;
			}
			return jsonClean({
				ok: res.ok === true,
				action: res.action,
				detail: res.detail,
				data: res.data ?? null
			});
		}
	};
}
//#endregion
//#region src/tools/flow-catalog.ts
const CATALOG_TIMEOUT_MS$1 = 15e3;
function flowCatalog(gatewayUrl) {
	return {
		name: "flow_catalog",
		description: "Search the named multi-stage flows (the PREFERRED composition): name + title + one-line description per flow. ALWAYS search flows FIRST for a multi-step task (image and upscale, speak this with that voice); when a flow fits, drive it with flow_run. Only when NO flow fits, fall back to card_catalog and compose cards directly. Takes an optional search phrase (empty = list all).",
		parameters: {
			type: "object",
			properties: { q: {
				type: "string",
				description: "Search phrase over flow name/title/description (e.g. \"image upscale\"). Empty = list all."
			} },
			required: []
		},
		presentCall(args) {
			const q = args?.q;
			return {
				card: "generic",
				title: "Flow catalog" + (typeof q === "string" && q !== "" ? ": " + q : ""),
				kind: "search"
			};
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: true,
				properties: {
					count: {
						type: "number",
						description: "Flows found."
					},
					flows: {
						type: "array",
						description: "Flow summaries: name/title/description/stages/skillRefs."
					}
				},
				required: ["count", "flows"]
			},
			render: (_args, value) => {
				return [{
					type: "text",
					text: "flow_catalog: " + String(value.count ?? 0) + " flows (drive one with flow_run, or fall back to card_catalog)"
				}];
			}
		},
		async execute(args, exec) {
			const q = typeof args.q === "string" ? args.q : "";
			const res = await gatewayRequest(gatewayUrl, "GET", "/v1/flows/catalog?action=search&q=" + encodeURIComponent(q), void 0, exec.signal, CATALOG_TIMEOUT_MS$1);
			const rows = Array.isArray(res.flows) ? res.flows : [];
			return {
				count: rows.length,
				flows: rows
			};
		}
	};
}
//#endregion
//#region src/tools/lane-bundle-peek.ts
const TIMEOUT_MS$2 = 15e3;
function laneBundlePeek(gatewayUrl) {
	return {
		name: "lane_bundle_peek",
		description: "PEEK the callable lanes (discovery scan): one cheap preview row per lane — kind (action_card | template), lane key, title, one-line description, shape counts (params for cards, steps for templates). Filter by kind and/or genre (video, image, audio, edit, 3d…). The table is the CALLABLE surface ONLY — cards and flow templates; MODELS ARE NOT LANES (they cannot run: only action cards do inference). Model parameter detail: model_catalog(query); model craft docs: skill_read. NO bodies — pick ONE lane, then lane_bundle_load(kind, name) to attach: the lane's agent doc arrives INLINE plus its tools and skill index. Examples: peek() = the whole table; peek(kind=\"template\") = every multi-step flow (creature-flow, humanoid-flow, sprite-sheet…); peek(genre=\"video\") = every video lane.",
		parameters: {
			type: "object",
			properties: {
				kind: {
					type: "string",
					enum: ["action_card", "template"],
					description: "Optional class filter: action_card (card lanes — the ONLY inference surface), template (multi-step flow flows)."
				},
				genre: {
					type: "string",
					description: "Optional genre filter (video, image, audio, edit…) — applies to cards and models; templates are not genre-classified."
				}
			},
			required: []
		},
		presentCall(args) {
			const a = typeof args === "object" && args !== null ? args : {};
			return {
				card: "generic",
				title: `Peek ${String(a.kind ?? "?")} bundles`,
				kind: "read",
				rawInput: String(a.genre ?? a.kind ?? "?")
			};
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: true,
				properties: {
					count: {
						type: "number",
						description: "Lanes matching the filters."
					},
					lanes: {
						type: "array",
						description: "Preview rows: {kind, lane, genre, title, description, params?, steps?, skills?}."
					}
				},
				required: ["count", "lanes"]
			},
			render: (_args, value) => {
				const rows = value.lanes ?? [];
				const by = (k) => rows.filter((r) => r.kind === k).length;
				return [{
					type: "text",
					text: "lane_bundle_peek: " + rows.length + " callable lanes — cards: " + by("action_card") + ", templates: " + by("template") + " (load one with lane_bundle_load; models are not lanes)"
				}];
			}
		},
		async execute(args, exec) {
			const a = typeof args === "object" && args !== null ? args : {};
			let path = "/v1/lanes";
			const q = [];
			if (typeof a.kind === "string" && a.kind.length > 0) q.push("kind=" + encodeURIComponent(a.kind));
			if (typeof a.genre === "string" && a.genre.length > 0) q.push("genre=" + encodeURIComponent(a.genre));
			if (q.length > 0) path += "?" + q.join("&");
			const res = await gatewayRequest(gatewayUrl, "GET", path, void 0, exec.signal, TIMEOUT_MS$2);
			if (res && typeof res.error === "string") return jsonClean({
				count: 0,
				lanes: [],
				error: res.error
			});
			const lanes = Array.isArray(res.lanes) ? res.lanes : [];
			return jsonClean({
				count: lanes.length,
				lanes
			});
		}
	};
}
//#endregion
//#region src/tools/lane-bundle-load.ts
const TIMEOUT_MS$1 = 15e3;
function laneBundleLoad(gatewayUrl) {
	return {
		name: "lane_bundle_load",
		description: "LOAD one lane (attach): the lane's primary AGENT DOC arrives INLINE (agent.content — orientation with zero extra calls) plus its tools (card manifests with params_schema — tools[0].name is the lane's DEDICATED CARD TOOL), flows (the multi-step template for flow lanes) and the skill index across every level (card, model, base-model chain, guide). Read agent.content + the read_first skills (skill_read loads each body), then call the card tool with params from its params_schema. kind must match what you peeked: action_card (image-gen, h3-timeline…) or template (kimodo-native, trellis2-gate… — flows/<name>/flow.py declarations, the live scan). MODELS ARE NOT LANES — only action cards do inference; a model id passed bare resolves to the card that boards it, and its craft docs ride that card's skills.",
		parameters: {
			type: "object",
			properties: {
				kind: {
					type: "string",
					enum: ["action_card", "template"],
					description: "The lane class (from lane_bundle_peek rows): action_card | template."
				},
				name: {
					type: "string",
					description: "The lane key from peek (card dir name or template name; a bare model id resolves to the card that boards it)."
				}
			},
			required: ["kind", "name"]
		},
		presentCall(args) {
			const a = typeof args === "object" && args !== null ? args : {};
			return {
				card: "generic",
				title: `Load ${String(a.kind ?? "?")} bundle: ${String(a.name ?? "?")}`,
				kind: "fetch",
				rawInput: {
					kind: String(a.kind ?? "?"),
					name: String(a.name ?? "?")
				}
			};
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: true,
				properties: {
					lane: {
						type: "string",
						description: "The resolved lane name."
					},
					kind: {
						type: "string",
						description: "The resolved lane class."
					},
					agent: {
						type: "object",
						description: "The injected agent doc: {source, name, content} — content is the full markdown."
					},
					tools: {
						type: "array",
						description: "Card manifests with params_schema + constraints."
					},
					flows: {
						type: "array",
						description: "Flow templates (steps ladder) for template lanes."
					},
					skills: {
						type: "array",
						description: "Skill index rows across all levels."
					},
					read_first: {
						type: "array",
						description: "Skill ids in read order (guide first)."
					}
				},
				required: [
					"lane",
					"kind",
					"agent"
				]
			},
			render: (args, value) => {
				const a = typeof args === "object" && args !== null ? args : {};
				const v = value;
				return [{
					type: "text",
					text: "lane_bundle_load " + String(a.name ?? v.kind ?? "?") + " (" + String(v.kind ?? "?") + "): agent \"" + String(v.agent?.name ?? "?") + "\" injected · " + (v.tools?.length ?? 0) + " tool(s) · " + (v.skills?.length ?? 0) + " skill(s) — read the skills, then call the card tool"
				}];
			}
		},
		async execute(args, exec) {
			const a = typeof args === "object" && args !== null ? args : {};
			const kind = typeof a.kind === "string" ? a.kind : "";
			const name = typeof a.name === "string" ? a.name : "";
			const res = await gatewayRequest(gatewayUrl, "GET", "/v1/cards/" + encodeURIComponent(name) + "/bundle?kind=" + encodeURIComponent(kind), void 0, exec.signal, TIMEOUT_MS$1);
			if (res && typeof res.error === "string") return jsonClean({
				lane: name,
				kind,
				error: res.error
			});
			const obj = res ?? {};
			const missing = [];
			for (const key of ["lane", "kind"]) if (typeof obj[key] !== "string" || obj[key] === "") missing.push(key);
			const agent = obj.agent;
			if (typeof agent?.content !== "string" || agent.content === "") missing.push("agent.content");
			if (missing.length > 0) return jsonClean({
				lane: name,
				kind,
				error: "bundle for " + JSON.stringify(name) + " violates the wire contract (missing " + missing.join(", ") + ") — the gateway bundle door is the contract; a hollow bundle is a loud refusal, never a silently-empty attach"
			});
			const rawTools = Array.isArray(obj.tools) ? obj.tools : [];
			for (const t of rawTools) {
				const nm = t?.name;
				if (typeof nm !== "string" || nm === "") return jsonClean({
					lane: name,
					kind,
					error: "bundle for " + JSON.stringify(name) + " carries a tool row with no name — the manifest is malformed (a nameless tool cannot be called)"
				});
			}
			const tools = rawTools.map((t) => {
				const row = t;
				return {
					name: row.name,
					model: row.model,
					description: row.description,
					params_schema: row.params_schema,
					constraints: row.constraints
				};
			});
			const skills = Array.isArray(res.skills) ? res.skills.map((s) => ({
				id: s.id,
				name: s.name,
				description: s.description
			})) : [];
			const flows = Array.isArray(res.flows) ? res.flows.map((p) => ({
				id: p.id,
				name: p.name,
				description: p.description,
				steps: p.steps,
				step_count: p.step_count
			})) : [];
			return jsonClean({
				lane: obj.lane,
				kind: obj.kind,
				agent,
				tools,
				flows,
				skills,
				read_first: Array.isArray(obj.read_first) ? obj.read_first : [],
				tool_count: tools.length,
				skill_count: skills.length
			});
		}
	};
}
//#endregion
//#region src/tools/card-catalog.ts
const CATALOG_TIMEOUT_MS = 15e3;
function cardCatalog(gatewayUrl) {
	return {
		name: "card_catalog",
		description: "Search cards by their declared tags + load the skill bundle (the FALLBACK composition - flow_catalog first, always; cards only when NO flow fits). search: phrase over id/label/description/tags plus an optional comma-separated tags filter - returns clamped summaries, never bodies. load_skills: exact card ids (comma-separated) - returns per card (a) the tool signature (params_schema), (b) the action card skills, (c) the model-level hints (prompt guidance rides here, ambient) plus a stable bundle digest. Quote the digests you hold and skip reload on a match (the bundle is content-stable). Models are data for the card - there is no model picker, only bundles.",
		parameters: {
			type: "object",
			properties: {
				action: {
					type: "string",
					description: "search (summaries) or load_skills (the bundle for exact ids).",
					enum: ["search", "load_skills"]
				},
				q: {
					type: "string",
					description: "search: phrase over id/label/description/tags (e.g. \"image upscale\")."
				},
				tags: {
					type: "string",
					description: "search: comma-separated tag filter - every tag must be declared by the card (e.g. \"image,upscale\")."
				},
				ids: {
					type: "string",
					description: "load_skills: comma-separated exact card ids (e.g. \"image-gen,upscale-tools\")."
				}
			},
			required: ["action"]
		},
		presentCall(args) {
			const a = args ?? {};
			return {
				card: "generic",
				title: "Card catalog" + (a.action === "load_skills" && typeof a.ids === "string" && a.ids !== "" ? ": " + a.ids : typeof a.q === "string" && a.q !== "" ? ": " + a.q : typeof a.tags === "string" && a.tags !== "" ? ": " + a.tags : ""),
				kind: "search"
			};
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: true,
				properties: {
					count: {
						type: "number",
						description: "Cards (search) or bundles (load_skills) found."
					},
					cards: {
						type: "array",
						description: "search: card summaries (id/label/description/genre/tags)."
					},
					bundles: {
						type: "array",
						description: "load_skills: per-card bundles (id/tool/skills/model_hints)."
					}
				},
				required: ["count"]
			},
			render: (_args, value) => {
				return [{
					type: "text",
					text: "card_catalog: " + String(value.count ?? 0) + " results (load_skills the exact ids you will drive)"
				}];
			}
		},
		async execute(args, exec) {
			const a = args;
			if (a.action === "load_skills") {
				const ids = typeof a.ids === "string" ? a.ids : "";
				const res = await gatewayRequest(gatewayUrl, "GET", "/v1/cards/catalog?action=load_skills&ids=" + encodeURIComponent(ids), void 0, exec.signal, CATALOG_TIMEOUT_MS);
				const rows = Array.isArray(res.bundles) ? res.bundles : [];
				return {
					count: rows.length,
					bundles: rows
				};
			}
			const q = typeof a.q === "string" ? a.q : "";
			const tags = typeof a.tags === "string" ? a.tags : "";
			const res = await gatewayRequest(gatewayUrl, "GET", "/v1/cards/catalog?action=search&q=" + encodeURIComponent(q) + "&tags=" + encodeURIComponent(tags), void 0, exec.signal, CATALOG_TIMEOUT_MS);
			const rows = Array.isArray(res.cards) ? res.cards : [];
			return {
				count: rows.length,
				cards: rows
			};
		}
	};
}
//#endregion
//#region src/tools/refine-draft.ts
const TIMEOUT_MS = 15e3;
function refineDraft(gatewayUrl) {
	return {
		name: "refine_draft",
		description: "EDIT an existing action card in place: key-wise MERGE params onto the draft's stage (the same PATCH channel the card editor's Save uses — the SAME card tile updates, nothing re-stacks). Use after build_flow when the user tweaks an existing card (\"seed 42\", \"make it snow\", \"drop the music layer\"). For a NEW generation or a different model, build_flow again instead. Args: draftId (from build_flow), params (the keys to merge — e.g. {\"seed\":42,\"prompt\":\"...\"}), optional stage id (default: the draft's first stage).",
		parameters: {
			type: "object",
			properties: {
				draftId: {
					type: "string",
					description: "The draft id from build_flow (e.g. \"draft-6a96...-1\")."
				},
				params: {
					type: "object",
					additionalProperties: true,
					description: "The param keys to merge onto the card (e.g. {\"seed\":42} or {\"prompt\":\"a red fox in snow\"}). Unmentioned keys are left untouched."
				},
				stage: {
					type: "string",
					description: "Optional stage id within the draft. Omit to target the first stage (the normal one-card case)."
				}
			},
			required: ["draftId", "params"]
		},
		presentCall(args) {
			const a = typeof args === "object" && args !== null ? args : {};
			return {
				card: "generic",
				title: `Refine draft ${String(a.draftId ?? "?")}`,
				kind: "edit",
				rawInput: {
					draftId: String(a.draftId ?? "?"),
					stage: String(a.stage ?? "first")
				}
			};
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: true,
				properties: {
					card: {
						type: "string",
						description: "Always \"draft\" — still a card, never a run."
					},
					draftId: { type: "string" },
					stage: {
						type: "string",
						description: "The stage id that was patched."
					},
					params: {
						type: "object",
						description: "The stage's full merged params after the patch."
					}
				},
				required: [
					"card",
					"draftId",
					"stage",
					"params"
				]
			},
			render: (_args, value) => {
				const v = value;
				return [{
					type: "text",
					text: "refine_draft " + String(v.draftId ?? "?") + " (stage " + String(v.stage ?? "?") + ") — card updated in place, the user presses Run when ready"
				}];
			}
		},
		async execute(args, exec) {
			const a = typeof args === "object" && args !== null ? args : {};
			if (typeof a.draftId !== "string" || a.draftId.length === 0) throw new Error("refine_draft: \"draftId\" is required (the draft id from build_flow)");
			if (a.params === null || typeof a.params !== "object" || Array.isArray(a.params)) throw new Error("refine_draft: \"params\" is required (an object of keys to merge, e.g. {\"seed\":42})");
			const raw = await gatewayRequest(gatewayUrl, "GET", "/v1/flows/drafts/" + encodeURIComponent(a.draftId), void 0, exec.signal, TIMEOUT_MS);
			const doc = typeof raw === "string" ? JSON.parse(raw) : raw;
			const docStages = Array.isArray(doc.stages) ? doc.stages : [];
			if (docStages.length === 0) throw new Error("refine_draft: draft \"" + a.draftId + "\" has no stages to patch");
			let sid = typeof a.stage === "string" && a.stage.length > 0 ? a.stage : "";
			if (!sid) {
				const first = docStages[0];
				sid = typeof first.id === "string" && first.id.length > 0 ? first.id : "s_0";
			}
			const mergeParams = {};
			for (const [k, v] of Object.entries(a.params)) mergeParams[k] = k === "calls" && Array.isArray(v) ? JSON.stringify(v) : v;
			const target = docStages.find((s) => {
				return (typeof s.id === "string" ? s.id : "") === sid;
			}) ?? docStages[0];
			target.params = {
				...target.params ?? {},
				...mergeParams
			};
			const postRaw = await gatewayRequest(gatewayUrl, "POST", "/v1/flows/drafts", {
				...doc,
				stages: docStages
			}, exec.signal, TIMEOUT_MS);
			const updated = typeof postRaw === "string" ? JSON.parse(postRaw) : postRaw;
			const updatedStages = Array.isArray(updated.stages) ? updated.stages : [];
			const patched = updatedStages.find((s) => s.id === sid) ?? updatedStages[0] ?? {};
			const params = patched.params !== null && typeof patched.params === "object" ? patched.params : {};
			return jsonClean({
				card: "draft",
				draftId: updated.draft_id ?? a.draftId,
				stage: sid,
				intent: updated.intent ?? null,
				params
			});
		}
	};
}
//#endregion
//#region src/tools/skill-index.ts
const INDEX_TIMEOUT_MS = 15e3;
function skillIndex(gatewayUrl) {
	return {
		name: "skill_index",
		description: "List gateway skills (progressive disclosure tier 1): id + name + one-line description per skill, with genre/model when the skill is model-scoped. Cheap scan. Then load ONLY the skill you need with skill_read. Use before generating with an unfamiliar model, when the user asks what this stack can do, or to find the lane recipe for a genre (image/audio/video/3D/text). No arguments.",
		parameters: {
			type: "object",
			properties: {},
			required: []
		},
		presentCall() {
			return {
				card: "generic",
				title: "Skill index",
				kind: "search"
			};
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: true,
				properties: {
					count: {
						type: "number",
						description: "Skills found."
					},
					skills: {
						type: "array",
						description: "Index rows: id/name/description (+genre/model when scoped)."
					}
				},
				required: ["count", "skills"]
			},
			render: (_args, value) => {
				return [{
					type: "text",
					text: "skill_index: " + String(value.count ?? 0) + " skills (load one with skill_read)"
				}];
			}
		},
		async execute(_args, exec) {
			const res = await gatewayRequest(gatewayUrl, "GET", "/v1/skills", void 0, exec.signal, INDEX_TIMEOUT_MS);
			const rows = Array.isArray(res.skills) ? res.skills : [];
			return {
				count: rows.length,
				skills: rows
			};
		}
	};
}
//#endregion
//#region src/tools/skill-read.ts
const READ_TIMEOUT_MS = 15e3;
function skillRead(gatewayUrl) {
	return {
		name: "skill_read",
		description: "Load ONE skill document in full (progressive disclosure tier 2): markdown body plus its name/description and genre/model when scoped. Discover ids first with skill_index. Reads are recorded in the gateway ledger (skill.read) - the audit trail of which recipes informed a generation. Args: id (from skill_index).",
		parameters: {
			type: "object",
			properties: { id: {
				type: "string",
				description: "Skill id from skill_index: \"<stem>\", \"model:<id>\" or \"model:<id>:<stem>\"."
			} },
			required: ["id"]
		},
		presentCall(args) {
			const a = typeof args === "object" && args !== null ? args : {};
			return {
				card: "generic",
				title: `Read skill ${String(a.id ?? "?")}`,
				kind: "read",
				rawInput: String(a.id ?? "?")
			};
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: true,
				properties: {
					id: { type: "string" },
					name: {
						type: "string",
						description: "Skill title from frontmatter."
					},
					description: {
						type: "string",
						description: "One-line summary."
					},
					content: {
						type: "string",
						description: "The full markdown body."
					}
				},
				required: ["id", "content"]
			},
			render: (args, value) => {
				const a = typeof args === "object" && args !== null ? args : {};
				const v = value;
				return [{
					type: "text",
					text: "skill_read " + String(a.id ?? v.id ?? "?") + ": " + String(v.name ?? "loaded")
				}];
			}
		},
		async execute(args, exec) {
			const a = typeof args === "object" && args !== null ? args : {};
			if (typeof a.id !== "string" || a.id.length === 0) throw new Error("skill_read: \"id\" is required (a skill id string from skill_index)");
			const res = await gatewayRequest(gatewayUrl, "GET", "/v1/skills/" + encodeURIComponent(a.id), void 0, exec.signal, READ_TIMEOUT_MS);
			return {
				id: res.id ?? a.id,
				name: res.name ?? null,
				description: res.description ?? null,
				genre: res.genre ?? null,
				model: res.model ?? null,
				content: res.content ?? ""
			};
		}
	};
}
//#endregion
//#region src/tools/ledger-tail.ts
const LEDGER_TIMEOUT_MS = 15e3;
function ledgerTail(gatewayUrl) {
	return {
		name: "ledger_tail",
		description: "Tail the gateway file ledger (append-only journal of runs, provisions, skill reads, server boots). Use to answer \"what happened / what ran / what downloaded\", to resume interrupted work after a restart, or to audit activity. Entries come back oldest -> newest within the tail; pair with skill_read \"run-recovery\" for the full recovery workflow. Args: limit (optional, default 50, max 500), event (optional prefix filter, e.g. \"run.\" or \"prov\").",
		parameters: {
			type: "object",
			properties: {
				limit: {
					type: "number",
					description: "How many entries to return (default 50, max 500)."
				},
				event: {
					type: "string",
					description: "Optional event-name prefix filter, e.g. \"run.\", \"prov\", \"skill\"."
				}
			},
			required: []
		},
		presentCall(args) {
			const a = typeof args === "object" && args !== null ? args : {};
			return {
				card: "generic",
				title: "Ledger tail",
				kind: "read",
				rawInput: {
					limit: a.limit,
					event: a.event
				}
			};
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: true,
				properties: {
					shown: {
						type: "number",
						description: "Entries returned."
					},
					matched: {
						type: "number",
						description: "Total entries matching the filter."
					},
					entries: {
						type: "array",
						description: "Ledger rows: {ts, event, data}, oldest -> newest."
					}
				},
				required: [
					"shown",
					"matched",
					"entries"
				]
			},
			render: (_args, value) => {
				const v = value;
				return [{
					type: "text",
					text: "ledger_tail: " + String(v.shown ?? 0) + " of " + String(v.matched ?? 0) + " entries"
				}];
			}
		},
		async execute(args, exec) {
			const a = typeof args === "object" && args !== null ? args : {};
			const q = [];
			if (typeof a.limit === "number" && Number.isFinite(a.limit) && a.limit > 0) q.push("limit=" + encodeURIComponent(String(Math.floor(a.limit))));
			else if (typeof a.limit === "string" && a.limit.length > 0) q.push("limit=" + encodeURIComponent(a.limit));
			if (typeof a.event === "string" && a.event.length > 0) q.push("event=" + encodeURIComponent(a.event));
			const res = await gatewayRequest(gatewayUrl, "GET", "/v1/ledger" + (q.length > 0 ? "?" + q.join("&") : ""), void 0, exec.signal, LEDGER_TIMEOUT_MS);
			const entries = Array.isArray(res.entries) ? res.entries : [];
			return {
				shown: typeof res.shown === "number" ? res.shown : entries.length,
				matched: typeof res.matched === "number" ? res.matched : entries.length,
				entries
			};
		}
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
		messages: [{
			role: "user",
			content: [{
				type: "text",
				text: req.prompt
			}],
			source: {
				kind: "plugin",
				plugin: "@melite-plugin/dsh-tools"
			}
		}],
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
//#region src/index.ts
/** Cordis plugin name used by loader diagnostics. */
const name = "melite-tools";
/**
* Services this fiber NEEDS: tools + the harness LLM seam (enhance
* rides ctx.llm). No webServer dependency — headless/SDK mounts boot
* without one.
*/
const inject = [
	"tools",
	"webServer",
	"llm"
];
/** BASE tool names — both interfaces (discovery, compose, management, audit). */
const BASE_TOOL_NAMES = [
	"flow_catalog",
	"card_catalog",
	"lane_bundle_peek",
	"lane_bundle_load",
	"build_flow",
	"refine_draft",
	"comfy_manage",
	"skill_index",
	"skill_read",
	"ledger_tail"
];
/** HEADLESS-only run doors (MELITE_HEADLESS=1) — the delegated operator. */
const HEADLESS_TOOL_NAMES = [
	"card_run",
	"flow_run",
	"run_status"
];
/** AD HOC names (MELITE_ADHOC) — never in a base toolset.
*  (empty since the disclosure stroke: enhance_prompt died as a tool —
*  the editor ✦ door below keeps the user surface via harnessEnhance.) */
const ADHOC_TOOL_NAMES = [];
/** Every tool name this plugin can own (registration log + smoke filter). */
const MELITE_TOOL_NAMES = [
	...BASE_TOOL_NAMES,
	...HEADLESS_TOOL_NAMES,
	...ADHOC_TOOL_NAMES
];
/** Register the Melite tools against the live estate gateway. */
async function apply(ctx, config = {}) {
	const c = ctx;
	const gatewayUrl = (process.env.MELITE_GATEWAY_URL || config.gatewayUrl || "http://localhost:33081").replace(/\/+$/, "");
	const headless = process.env.MELITE_HEADLESS === "1" || config.headless === true;
	const adhocEnv = (process.env.MELITE_ADHOC || "").split(",").map((s) => s.trim()).filter(Boolean);
	const adhocCfg = Array.isArray(config.adhocTools) ? config.adhocTools.map((s) => s.trim()).filter(Boolean) : typeof config.adhocTools === "string" ? config.adhocTools.split(",").map((s) => s.trim()).filter(Boolean) : [];
	const adhoc = adhocEnv.length ? adhocEnv : adhocCfg;
	c.logger.info("melite-tools: %s interface — %d base + %d headless run door(s) + %d ad hoc, gateway %s", headless ? "HEADLESS" : "BROWSER", BASE_TOOL_NAMES.length, headless ? HEADLESS_TOOL_NAMES.length : 0, adhoc.length, gatewayUrl);
	c.tools.register(flowCatalog(gatewayUrl));
	c.tools.register(cardCatalog(gatewayUrl));
	c.tools.register(laneBundlePeek(gatewayUrl));
	c.tools.register(laneBundleLoad(gatewayUrl));
	c.tools.register(buildFlow(gatewayUrl));
	c.tools.register(refineDraft(gatewayUrl));
	c.tools.register(comfyManage(gatewayUrl));
	c.tools.register(skillIndex(gatewayUrl));
	c.tools.register(skillRead(gatewayUrl));
	c.tools.register(ledgerTail(gatewayUrl));
	if (headless) {
		c.tools.register(cardRun(gatewayUrl));
		c.tools.register(flowRun(gatewayUrl));
		c.tools.register(runStatus(gatewayUrl));
	}
	const readDefaultLlm = () => {
		try {
			const sel = c.get("agentDefaultModel")?.currentSelection?.();
			if (typeof sel?.provider === "string" && typeof sel?.model === "string") return sel.provider + "/" + sel.model;
		} catch {}
	};
	c.tools.register(buildMusicTool(gatewayUrl));
	c.tools.register(buildTtsTool(gatewayUrl));
	c.tools.register(buildVoiceLockTool(gatewayUrl));
	c.tools.register(buildImageEditTool(gatewayUrl));
	c.tools.register(buildMotionTool(gatewayUrl));
	c.tools.register(buildH3TimelineTool(gatewayUrl));
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
export { ADHOC_TOOL_NAMES, BASE_TOOL_NAMES, DEFAULT_GATEWAY_URL, HEADLESS_TOOL_NAMES, MELITE_TOOL_NAMES, RayGatewayError, apply, buildFlow, cardCatalog, cardRun, comfyManage, flowCatalog, flowRun, harnessEnhance, inject, laneBundleLoad, laneBundlePeek, ledgerTail, matchHarnessRoute, name, normalizeGatewayUrl, refineDraft, resolveHarnessRoutes, routeName, runStatus, skillIndex, skillRead };
