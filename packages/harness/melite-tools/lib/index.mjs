import { a as RayGatewayError, i as routeName, n as matchHarnessRoute, o as makeEstateRequest, r as resolveHarnessRoutes, t as harnessEnhance } from "./llm-complete-CeSWM5YP.mjs";
import { buildMusicTool } from "@melite/audio-music/tool";
import { buildTtsTool } from "@melite/audio-tts/tool";
import { buildVoiceLockTool } from "@melite/audio-voice-lock/tool";
import { buildImageEditTool } from "@melite/image-image-edit/tool";
import { buildMotionTool } from "@melite/motion-motion/tool";
import { buildCardTool } from "@melite/3d-clothing-placement/tool";
import { buildH3TimelineTool } from "@melite/video-h3-timeline/tool";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { remoteErrorOf } from "@deepseek-ai/dsh-typert-protocol";
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
//#region src/tools/run-status.ts
/**
* run_status — the run monitor (headless).
*
* Poll ONE run through its lifecycle: GET {gateway}/v1/flows/
* status/<run_id> → status, per-stage stages[].status, artifacts (the
* bytes that landed), error (the EXACT failure string — RESILIENCE
* LAW: never a bare "failed") and queue_position while waiting.
*
* Terminal states: completed | error | stopped | failed. The stop door
* (/v1/flows/stop/<id>) stays operator-ordered — this tool only
* READS.
*
* Registered ONLY in headless mounts (MELITE_HEADLESS=1).
*/
const TIMEOUT_MS$3 = 15e3;
function runStatus(request) {
	const presentCall = (args) => {
		const a = typeof args === "object" && args !== null ? args : {};
		return {
			card: "generic",
			title: `Run status: ${String(a.runId ?? "?")}`,
			kind: "read",
			rawInput: String(a.runId ?? "?")
		};
	};
	const def = defineTool({
		name: "run_status",
		description: "Poll a queue run: status (queued|running|completed|error|stopped|failed), per-stage progress, artifacts (landed bytes with paths) and the EXACT error string on failure. Args: runId (from melite_flow). Includes queue_position while waiting on the serial GPU lane. Read-only — the stop door is operator-ordered.",
		parameters: { runId: {
			type: "string",
			description: "The run id returned by melite_flow.",
			required: true
		} },
		presentCall,
		output: {
			schema: {
				type: "object",
				additionalProperties: true,
				properties: {
					run_id: {
						type: "string",
						required: true
					},
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
						description: "The EXACT failure string when status is error/failed, or the refusal text when the fetch refused."
					},
					queue_position: {
						type: "number",
						description: "0 = active; >0 = waiting in the FIFO."
					}
				}
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
				res = await request("GET", "/v1/flows/status/" + encodeURIComponent(runId), void 0, exec.signal, TIMEOUT_MS$3);
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
	});
	def.presentCall = presentCall;
	return def;
}
//#endregion
//#region src/tools/melite-construct.ts
/** The default bench — one shared state per gateway. */
const DEFAULT_BENCH = "main";
function benchKeyOf(a) {
	const k = a["bench"];
	return typeof k === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(k) ? k : DEFAULT_BENCH;
}
/** Refusal formatting shared by every verb (the remote's RemoteError
*  first — code + message, the CAS detail rides details.current_rev —
*  then any Error's message; lanes still awaiting their remote refuse
*  loudly as plain errors). */
function refusalOf(e, verb, bench) {
	const refusal = remoteErrorOf(e);
	if (refusal !== void 0) {
		const details = refusal.details;
		const currentRev = details !== void 0 && typeof details["current_rev"] === "number" ? details["current_rev"] : void 0;
		return jsonClean({
			verb,
			bench,
			error: refusal.message,
			error_kind: refusal.code,
			ok: false,
			...currentRev !== void 0 ? { current_rev: currentRev } : {}
		});
	}
	return jsonClean({
		verb,
		bench,
		error: e instanceof Error ? e.message : String(e),
		error_kind: "remote",
		ok: false
	});
}
/** GET the bench; not-found → ensure (birth) → GET again. Reads are
*  the freshness mechanism — always a remote round trip. */
async function readBench(request, bench, signal) {
	const get = () => request("GET", `/v1/bench/${bench}`, void 0, signal, 15e3);
	try {
		return await get();
	} catch (e) {
		if (remoteErrorOf(e)?.code === "bench/not-found") {
			await request("POST", "/v1/bench/ensure", { session: bench }, signal, 15e3);
			return await get();
		}
		throw e;
	}
}
/** Project bench stage rows onto the flow_inline wire contract
*  (extra=forbid at the start/validate doors: card, provenance,
*  runStatus, result, title strip; engine defaults comfyui). */
function projectStages(stages) {
	if (!Array.isArray(stages)) return [];
	return stages.filter((s) => typeof s === "object" && s !== null && !Array.isArray(s)).map((s) => {
		const row = {
			id: String(s["id"] ?? ""),
			engine: typeof s["engine"] === "string" && s["engine"] !== "" ? s["engine"] : "comfyui",
			params: typeof s["params"] === "object" && s["params"] !== null && !Array.isArray(s["params"]) ? s["params"] : {},
			inputs: typeof s["inputs"] === "object" && s["inputs"] !== null && !Array.isArray(s["inputs"]) ? s["inputs"] : {},
			outputs: typeof s["outputs"] === "object" && s["outputs"] !== null && !Array.isArray(s["outputs"]) ? s["outputs"] : { default: "image" }
		};
		if (typeof s["expected"] === "object" && s["expected"] !== null && !Array.isArray(s["expected"])) row["expected"] = s["expected"];
		return row;
	});
}
function meliteConstruct(request) {
	const presentCall = (args) => {
		const a = args ?? {};
		const verb = typeof a.verb === "string" ? a.verb : "?";
		const on = typeof a.stage === "string" && a.stage !== "" ? a.stage : typeof a.card === "string" && a.card !== "" ? a.card : "";
		return {
			card: "generic",
			title: `Bench ${verb}${on !== "" ? " · " + on : ""}`,
			kind: "execute"
		};
	};
	const def = defineTool({
		name: "melite_construct",
		description: "Author THE shared bench — one working flow the user sees live in the cards tab and edits alongside you. This never executes (melite_flow runs what is here; the user presses Run). Verbs: read (the state — always start here) | load (replace stages wholesale) | patch {stage, params} | add_stage {card, params?, inputs?} | remove_stage {stage} | rewire {stage, input, from?} | undo {n?, author?} | validate (compile check, no GPU). Mutations take expect_rev from your last read — a moved bench refuses 409 with current_rev; re-read, re-apply. No ids anywhere: the bench is the one shared state.",
		parameters: {
			verb: {
				type: "string",
				description: "read | load | patch | add_stage | remove_stage | rewire | undo | validate."
			},
			stage: {
				type: "string",
				description: "patch/remove_stage/rewire: the stage id."
			},
			card: {
				type: "string",
				description: "add_stage: the card id (display + provenance hint)."
			},
			engine: {
				type: "string",
				description: "add_stage: engine id (default comfyui)."
			},
			params: {
				type: "object",
				additionalProperties: true,
				description: "patch (merge onto the stage) | add_stage | load single-stage shorthand."
			},
			inputs: {
				type: "object",
				additionalProperties: true,
				description: "add_stage: {input: {stage, output} | {initial}} wiring."
			},
			input: {
				type: "string",
				description: "rewire: the input name to bind."
			},
			from: {
				type: "object",
				additionalProperties: true,
				description: "rewire: {stage, output} | {initial}; absent clears the binding."
			},
			stages: {
				type: "array",
				items: {
					type: "object",
					additionalProperties: true
				},
				description: "load: the full replacement [{id?, engine?, card?, params?, inputs?, outputs?}]."
			},
			intent: {
				type: "string",
				description: "load: what this bench produces."
			},
			n: {
				type: "number",
				description: "undo: how many entries (default 1)."
			},
			author: {
				type: "string",
				description: "undo: \"agent\" (default) | \"user\" — whose entries to revert."
			},
			expect_rev: {
				type: "number",
				description: "CAS: the rev from your last read (required on mutations)."
			}
		},
		presentCall,
		output: {
			schema: {
				type: "object",
				additionalProperties: true,
				properties: {
					verb: {
						type: "string",
						required: true,
						description: "Echoed verb."
					},
					bench: {
						type: "string",
						required: true,
						description: "The bench key (default \"main\")."
					},
					rev: {
						type: "number",
						description: "The bench revision AFTER the verb."
					},
					ok: {
						type: "boolean",
						description: "False exactly when the verb refused."
					},
					error: {
						type: "string",
						description: "Refusal text (ok: false)."
					}
				}
			},
			render: (_args, value) => {
				const v = value;
				if (v && typeof v.error === "string" && v.error !== "") return [{
					type: "text",
					text: "melite_construct REFUSED: " + v.error
				}];
				return [{
					type: "text",
					text: "bench " + String(v.verb ?? "?") + " → rev " + String(v.rev ?? "?")
				}];
			}
		},
		async execute(args, exec) {
			const a = args ?? {};
			const verb = typeof a.verb === "string" ? a.verb : "";
			const bench = benchKeyOf(a);
			const signal = exec.signal;
			const out = (payload) => jsonClean({
				verb,
				bench,
				ok: true,
				...payload
			});
			try {
				if (verb === "read" || verb === "") {
					const b = await readBench(request, bench, signal);
					return out({
						rev: b.rev,
						intent: b.intent,
						stages: b.stages,
						log: b.log,
						hint: "mutate with expect_rev=" + String(b.rev)
					});
				}
				if (verb === "validate") {
					const b = await readBench(request, bench, signal);
					const stages = projectStages(b.stages);
					if (stages.length === 0) return out({
						rev: b.rev,
						compiles: false,
						note: "bench is empty"
					});
					const r = await request("POST", "/v1/flows/validate", { flow_inline: { stages } }, signal, 2e4);
					return out({
						rev: b.rev,
						compiles: r["ok"] === true || r["valid"] === true,
						report: r
					});
				}
				if (verb === "load") {
					const r = await request("POST", "/v1/bench/ensure", {
						session: bench,
						stages: Array.isArray(a.stages) ? a.stages : [],
						...typeof a.intent === "string" && a.intent !== "" ? { intent: a.intent } : {},
						expect_rev: a.expect_rev
					}, signal, 15e3);
					return out({
						rev: r.rev,
						stages: r.stages
					});
				}
				if (verb === "patch") {
					const r = await request("POST", `/v1/bench/${bench}/patch`, {
						stage: a.stage,
						params: a.params,
						expect_rev: a.expect_rev
					}, signal, 15e3);
					return out({
						rev: r.rev,
						stage: r.stage,
						patched: r.patched
					});
				}
				if (verb === "add_stage") {
					const r = await request("POST", `/v1/bench/${bench}/add_stage`, {
						card: a.card,
						...a.engine !== void 0 ? { engine: a.engine } : {},
						...a.params !== void 0 ? { params: a.params } : {},
						...a.inputs !== void 0 ? { inputs: a.inputs } : {},
						expect_rev: a.expect_rev
					}, signal, 15e3);
					return out({
						rev: r.rev,
						stage: r.stage
					});
				}
				if (verb === "remove_stage") {
					const r = await request("POST", `/v1/bench/${bench}/remove_stage`, {
						stage: a.stage,
						expect_rev: a.expect_rev
					}, signal, 15e3);
					return out({
						rev: r.rev,
						stage: r.stage
					});
				}
				if (verb === "rewire") {
					const r = await request("POST", `/v1/bench/${bench}/rewire`, {
						stage: a.stage,
						input: a.input,
						...a.from !== void 0 ? { from: a.from } : {},
						expect_rev: a.expect_rev
					}, signal, 15e3);
					return out({
						rev: r.rev,
						stage: r.stage,
						input: r.input
					});
				}
				if (verb === "undo") {
					const r = await request("POST", `/v1/bench/${bench}/undo`, {
						...a.n !== void 0 ? { n: a.n } : {},
						...a.author !== void 0 ? { author: a.author } : {},
						expect_rev: a.expect_rev
					}, signal, 15e3);
					return out({
						rev: r.rev,
						undone: r.undone,
						stages: r.stages
					});
				}
				return jsonClean({
					verb,
					bench,
					ok: false,
					error: "unknown verb — want read|load|patch|add_stage|remove_stage|rewire|undo|validate",
					error_kind: "args"
				});
			} catch (e) {
				return refusalOf(e, verb, bench);
			}
		}
	});
	def.presentCall = presentCall;
	return def;
}
//#endregion
//#region src/tools/melite-flow.ts
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
const TIMEOUT_MS$2 = 3e4;
const DRAFT_TIMEOUT_MS = 15e3;
const VALIDATE_TIMEOUT_MS = 15e3;
/** POST /v1/flows/start — the verbatim-error pattern (the agent
*  reads the gateway's refusal text, not a transport code). */
async function startRun(request, body, signal) {
	let res;
	try {
		res = await request("POST", "/v1/flows/start", body, signal, TIMEOUT_MS$2);
	} catch (e) {
		const re = remoteErrorOf(e);
		if (re !== null && re !== void 0) return { error: re.message || "queue refused the start" };
		throw e;
	}
	if (res && typeof res.error === "string") return { error: res.error };
	return {
		run_id: typeof res.run_id === "string" ? res.run_id : "",
		status: typeof res.status === "string" ? res.status : "queued"
	};
}
/** LOAD THE BENCH (the one-shared-state law — the bench rework,
*  2026-09-10): every mode's composition lands on THE shared bench
*  (draft doc bench-<key>) instead of minting a fresh draft per
*  run. The user's cards tab streams the same bench; runs snapshot
*  their composition in the run registry (CARD BIRTH LAW holds —
*  the start still rides a doc-backed draft_id, now the bench's). */
async function loadBench(request, body, signal) {
	const session = typeof body["session"] === "string" ? body["session"] : "default";
	let expectRev;
	try {
		const cur = await request("GET", `/v1/bench/${encodeURIComponent(session)}`, void 0, signal, DRAFT_TIMEOUT_MS);
		if (cur !== null && typeof cur === "object" && typeof cur["rev"] === "number") expectRev = cur["rev"];
	} catch (e) {
		const re = remoteErrorOf(e);
		if (re === null || re === void 0 || re.code !== "bench/not-found") throw e;
	}
	const b = await request("POST", "/v1/bench/ensure", {
		...body,
		...expectRev !== void 0 ? { expect_rev: expectRev } : {}
	}, signal, DRAFT_TIMEOUT_MS);
	if (b && typeof b.error === "string" && b.error) throw new Error(b.error);
	const id = b && b.draft_id;
	if (typeof id !== "string" || id === "") throw new Error("bench ensure returned no draft_id");
	return id;
}
/** BENCH (the bench rework's run verb): run THE shared bench as it
*  stands — no composition, no sugar. The stages are projected onto
*  the flow_inline wire contract (presentation extras strip), then
*  started under the bench's own draft_id. This is what the user's
*  Run press does and what {bench: true} does — one truth. */
async function runBench(request, a, signal) {
	let b;
	try {
		b = await request("GET", `/v1/bench/${DEFAULT_BENCH}`, void 0, signal, 15e3);
	} catch (e) {
		if (remoteErrorOf(e)?.code === "bench/not-found") return {
			mode: "bench",
			target: DEFAULT_BENCH,
			error: "the bench is empty — construct stages first (melite_construct)"
		};
		throw e;
	}
	const stages = projectStages(b["stages"]);
	if (stages.length === 0) return {
		mode: "bench",
		target: DEFAULT_BENCH,
		error: "the bench is empty — construct stages first (melite_construct)"
	};
	const draftId = typeof b["draft_id"] === "string" ? b["draft_id"] : `bench-${DEFAULT_BENCH}`;
	const started = await startRun(request, {
		flow_inline: { stages },
		test: a.test === true,
		draft_id: draftId
	}, signal);
	return {
		mode: "bench",
		target: `bench-${DEFAULT_BENCH} @ rev ${String(b["rev"] ?? "?")}`,
		draft_id: draftId,
		...started
	};
}
/** SINGLE (the old card_run path, composed inside): manifest gate
*  + runnability gate + defaults merge, then draft + {model}. */
async function runSingle(request, a, signal) {
	const card = a.card ?? "";
	const model = a.model ?? "";
	if (!model) return {
		mode: "card",
		target: card,
		error: "model is required (name the family explicitly — QUEUE LANE LAW)"
	};
	const bag = { ...a.params ?? {} };
	if (typeof a.prompt === "string" && a.prompt !== "") bag["prompt"] = a.prompt;
	const intentSrc = typeof bag["prompt"] === "string" ? bag["prompt"] : card;
	const intent = intentSrc.length > 80 ? intentSrc.slice(0, 77) + "…" : intentSrc;
	let draftId;
	try {
		draftId = await loadBench(request, {
			session: DEFAULT_BENCH,
			intent,
			stages: [{
				id: "s_0",
				...card !== "" ? { card } : {},
				engine: "comfyui",
				params: bag
			}]
		}, signal);
	} catch (e) {
		return {
			mode: "card",
			target: card !== "" ? card : model,
			error: e instanceof Error ? e.message : String(e)
		};
	}
	const started = await startRun(request, {
		...bag,
		model,
		test: a.test === true,
		draft_id: draftId
	}, signal);
	if (typeof started["error"] === "string") return {
		mode: "card",
		target: card !== "" ? card : model,
		...started
	};
	return {
		mode: "card",
		target: card !== "" ? card : model,
		model,
		draft_id: draftId,
		...started
	};
}
/** TEMPLATE (the old flow_run path): drafts {flow,...} + start. */
async function runTemplate(request, a, signal) {
	const flow = a.flow ?? "";
	if (!flow) return {
		mode: "flow",
		target: "",
		error: "flow is required (a discovered flow name)"
	};
	const overrides = a.params ?? {};
	let draftId;
	try {
		draftId = await loadBench(request, {
			session: DEFAULT_BENCH,
			intent: flow,
			stages: [{
				id: "s_0",
				engine: "comfyui",
				ref_flow: flow,
				params: {}
			}]
		}, signal);
	} catch (e) {
		return {
			mode: "flow",
			target: flow,
			error: e instanceof Error ? e.message : String(e)
		};
	}
	const started = await startRun(request, {
		...overrides,
		flow,
		test: a.test === true,
		draft_id: draftId
	}, signal);
	if (typeof started["error"] === "string") return {
		mode: "flow",
		target: flow,
		...started
	};
	return {
		mode: "flow",
		target: flow,
		draft_id: draftId,
		...started
	};
}
/** AD-HOC (the old build_flow MULTI path): COMPILE FIRST at
*  validate (no GPU on a bad wire), then draft + {flow_inline}. */
async function runAdHoc(request, a, signal) {
	const rawStages = a.stages;
	if (!Array.isArray(rawStages) || rawStages.length === 0) return {
		mode: "adhoc",
		target: "adhoc",
		error: "stages must be a non-empty array of {id, engine, params?, outputs?} rows"
	};
	const flowId = typeof a.id === "string" && a.id !== "" ? a.id : "adhoc";
	const connects = Array.isArray(a.connects) ? a.connects : [];
	let folded;
	try {
		folded = foldConnects(flowId, rawStages, connects);
	} catch (e) {
		return {
			mode: "adhoc",
			target: flowId,
			error: e instanceof Error ? e.message : String(e)
		};
	}
	const flowBody = {
		id: flowId,
		description: typeof a.description === "string" ? a.description : "",
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
	try {
		await request("POST", "/v1/flows/validate", flowBody, signal, VALIDATE_TIMEOUT_MS);
	} catch (e) {
		const re = remoteErrorOf(e);
		if (re !== null && re !== void 0) return {
			mode: "adhoc",
			target: flowId,
			error: re.message || "flow does not compile"
		};
		throw e;
	}
	let draftId;
	try {
		draftId = await loadBench(request, {
			session: DEFAULT_BENCH,
			intent: flowId,
			stages: folded
		}, signal);
	} catch (e) {
		return {
			mode: "adhoc",
			target: flowId,
			error: e instanceof Error ? e.message : String(e)
		};
	}
	const started = await startRun(request, {
		flow_inline: flowBody,
		test: a.test === true,
		draft_id: draftId
	}, signal);
	if (typeof started["error"] === "string") return {
		mode: "adhoc",
		target: flowId,
		...started
	};
	return {
		mode: "adhoc",
		target: flowId,
		draft_id: draftId,
		...started
	};
}
function meliteFlow(request) {
	const presentCall = (args) => {
		const a = args ?? {};
		return {
			card: "generic",
			title: `Run ${typeof a.card === "string" && a.card !== "" ? a.card : typeof a.flow === "string" && a.flow !== "" ? a.flow : Array.isArray(a.stages) ? `adhoc (${a.stages.length} stages)` : "?"}`,
			kind: "execute"
		};
	};
	const def = defineTool({
		name: "melite_flow",
		description: "Execute through the serial GPU queue — the ONE execution verb. Exactly one per call: bench (run THE shared bench exactly as it stands — what the user's Run press runs) | card (a card id + model — single generation) | flow (a NAMED template from melite_load) | stages (cards drafted on the fly: [{id, engine, params?, outputs?}] + optional connects — compiled at validate BEFORE any GPU is spent). Compositions LOAD the shared bench first (nothing mints fresh — one state, one log, one undo); every start rides the bench's doc-backed draft_id (CARD BIRTH LAW) — it rides the value as the chat tile handle, never an agent arg. Returns {run_id, draft_id}; poll with run_status. One active run machine-wide.",
		parameters: {
			bench: {
				type: "boolean",
				description: "BENCH mode: run THE shared bench exactly as it stands (what the user's Run press runs). Exclusive with card/flow/stages."
			},
			card: {
				type: "string",
				description: "SINGLE mode: the card id (discovered). Requires model alongside."
			},
			model: {
				type: "string",
				description: "SINGLE mode: the family id, named explicitly (must own a card tool)."
			},
			flow: {
				type: "string",
				description: "TEMPLATE mode: the flow name exactly as loaded."
			},
			stages: {
				type: "array",
				items: {
					type: "object",
					additionalProperties: true
				},
				description: "AD-HOC mode: [{id, engine, description?, params?, outputs?: {name: kind}}]. Exclusive with card/flow."
			},
			connects: {
				type: "array",
				items: {
					type: "object",
					additionalProperties: true
				},
				description: "AD-HOC mode: [{from: \"stage[.output]\" | \"initial.key\", to: \"stage.input\", kind?}]."
			},
			prompt: {
				type: "string",
				description: "SINGLE mode: the generation prompt (wins over params.prompt)."
			},
			params: {
				type: "object",
				additionalProperties: true,
				description: "Overrides merged over the mode defaults (seed, knobs)."
			},
			id: {
				type: "string",
				description: "AD-HOC mode: the pipeline name for the compiled flow."
			},
			description: {
				type: "string",
				description: "AD-HOC mode: what the pipeline produces."
			},
			test: {
				type: "boolean",
				description: "L4 barrier: true routes the run to test-output, hidden from production assets. Default false."
			}
		},
		presentCall,
		output: {
			schema: {
				type: "object",
				additionalProperties: true,
				properties: {
					run_id: {
						type: "string",
						description: "The queue run id — poll with run_status(run_id). Absent on refusal."
					},
					draft_id: {
						type: "string",
						description: "The minted card draft id — the chat tile handle (?meliteCards=). Absent on refusal."
					},
					status: {
						type: "string",
						description: "Registration status (queued/running). Absent on refusal."
					},
					mode: {
						type: "string",
						description: "Which composition ran (or was attempted): card | flow | adhoc.",
						required: true
					},
					target: {
						type: "string",
						description: "The card id, flow name, or ad-hoc pipeline name (echoed on refusal).",
						required: true
					},
					error: {
						type: "string",
						description: "The refusal text — present exactly when the tool refused (render prints REFUSED)."
					}
				}
			},
			render: (_args, value) => {
				const v = value;
				if (v && typeof v.error === "string") return [{
					type: "text",
					text: "melite_flow REFUSED: " + v.error
				}];
				return [{
					type: "text",
					text: "card " + String(v.draft_id ?? "?") + " · flow " + String(v.target ?? "?") + " → " + String(v.run_id ?? "?") + " [" + String(v.status ?? "queued") + "] — poll with run_status"
				}];
			},
			presentationMeta: (_args, value) => {
				const v = value ?? {};
				return {
					mode: String(v.mode ?? "?"),
					target: String(v.target ?? "?"),
					...typeof v.model === "string" && v.model !== "" ? { model: v.model } : {},
					...typeof v.draft_id === "string" && v.draft_id !== "" ? { draft_id: v.draft_id } : {},
					...typeof v.run_id === "string" && v.run_id !== "" ? { run_id: v.run_id } : {},
					...typeof v.status === "string" && v.status !== "" ? { status: v.status } : {},
					...typeof v.error === "string" && v.error !== "" ? { error: v.error } : {}
				};
			}
		},
		async execute(args, exec) {
			const a = args ?? {};
			const bag = a.params && typeof a.params === "object" && !Array.isArray(a.params) ? a.params : {};
			const test = a.test === true;
			const hasBench = a.bench === true;
			const hasCard = typeof a.card === "string" && a.card !== "";
			const hasFlow = typeof a.flow === "string" && a.flow !== "";
			const modes = [
				hasBench,
				hasCard,
				hasFlow,
				a.stages !== void 0
			].filter(Boolean).length;
			if (modes === 0) return jsonClean({ error: "one composition is required: bench (run what is there) | card (+model) | flow | stages (cards drafted on the fly)" });
			if (modes > 1) return jsonClean({ error: "exactly one composition per call: bench | card | flow | stages — never combined" });
			try {
				if (hasBench) return jsonClean(await runBench(request, { test }, exec.signal));
				if (hasFlow) return jsonClean(await runTemplate(request, {
					flow: a.flow,
					params: bag,
					test
				}, exec.signal));
				if (hasCard) return jsonClean(await runSingle(request, {
					card: a.card,
					model: typeof a.model === "string" ? a.model : "",
					prompt: typeof a.prompt === "string" ? a.prompt : void 0,
					params: bag,
					test
				}, exec.signal));
				return jsonClean(await runAdHoc(request, {
					stages: a.stages,
					connects: a.connects,
					id: a.id,
					description: typeof a.description === "string" ? a.description : void 0,
					test
				}, exec.signal));
			} catch (e) {
				const re = remoteErrorOf(e);
				if (re !== null && re !== void 0) {
					const mode = hasFlow ? "flow" : hasCard ? "card" : "adhoc";
					const target = hasFlow ? String(a.flow) : hasCard ? String(a.card) : "pipeline";
					return jsonClean({
						error: re.message || "remote refused",
						mode,
						target
					});
				}
				throw e;
			}
		}
	});
	def.presentCall = presentCall;
	return def;
}
//#endregion
//#region src/tools/comfy-manage.ts
/**
* comfy_manage — the ONE ComfyUI manager tool (2026-09-03).
*
* Wraps the estate's management plane — the built-in ComfyUI-Manager
* (vendored into the managed engine's custom_nodes, riding ComfyUI's
* own HTTP port — no external Python anywhere, 2026-09-10) plus the
* estate TS legs (model downloads, systemd, journal logs) — behind
* ONE action-dispatch tool. The SSOT is
* packages/gateway/doors/src/doors/manage.ts (ACTIONS + HANDLERS +
* LIFECYCLE_GUARDED — python/manage.py is deleted); this tool is its
* AI door (POST /v1/manage). The manual door is
* `provision manage <action>` (packages/engines/comfyui-cordis/scripts/provision.ts,
* via ./setup.sh manage …).
*
* INFRA UPKEEP, NOT EXECUTION (INFERENCE LAW): no action runs
* inference. Lifecycle actions (restart/stop/switch_version/update)
* are refused server-side while any run reads running/queued — the
* guard lives in the SSOT, not the prompt.
*
* Progressive disclosure: status is the cheap index (server, security,
* routing, active runs); install/download actions accept what the
* status/cately discoveries return.
*/
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
function comfyManage(request) {
	const presentCall = (args) => {
		const a = typeof args === "object" && args !== null ? args : {};
		return {
			card: "generic",
			title: `ComfyUI ${String(a.action ?? "?")}`,
			kind: "execute",
			rawInput: String(a.action ?? "?")
		};
	};
	const def = defineTool({
		name: "comfy_manage",
		description: "NaNsnapshot_restore (environment snapshots; restore is refused while runs are active); install_extension (registry ids), install_extension_url (git url), download_model (url), provision_model (catalog id — the model_catalog id); restart, stop, launch, update (target comfy|cli|all), switch_version, free. INFRA UPKEEP only — it never runs inference, and lifecycle actions are refused while runs are active (stop them or pass force).",
		parameters: {
			action: {
				type: "string",
				enum: ACTIONS,
				description: "The management action to dispatch.",
				required: true
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
				enum: ["comfy"],
				description: "update: what to update (comfy only — comfy-cli is retired; the built-in manager updates ComfyUI itself)."
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
		presentCall,
		output: {
			schema: {
				type: "object",
				additionalProperties: true,
				properties: {
					ok: {
						type: "boolean",
						required: true
					},
					action: {
						type: "string",
						required: true
					},
					detail: {
						type: "string",
						description: "One-line human summary."
					},
					error: {
						type: "string",
						description: "The refusal text — present exactly when the tool refused (render prints REFUSED)."
					}
				}
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
			if (exec?.signal === void 0) return jsonClean({
				ok: false,
				action: String(a.action ?? "?"),
				detail: "comfy_manage miswire: no execution context signal — the host runtime must pass exec"
			});
			try {
				res = await request("POST", "/v1/manage", body, exec.signal, MANAGE_TIMEOUT_MS);
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
	});
	def.presentCall = presentCall;
	return def;
}
//#endregion
//#region src/tools/melite-discover.ts
const TIMEOUT_MS$1 = 15e3;
/** Counts-first clamp: over this many lines the default answer
* clamps (counts + vocabulary + the first rows ride instead). */
const CLAMP = 12;
function meliteDiscover(request) {
	const presentCall = (args) => {
		const a = args ?? {};
		const bits = [];
		if (typeof a.lookup === "string" && a.lookup !== "") bits.push(a.lookup);
		if (typeof a.tags === "string" && a.tags !== "") bits.push(a.tags);
		if (typeof a.q === "string" && a.q !== "") bits.push(a.q);
		return {
			card: "generic",
			title: "Discover" + (bits.length > 0 ? ": " + bits.join(" · ") : ""),
			kind: "search"
		};
	};
	const def = defineTool({
		name: "melite_discover",
		description: "Progressive disclosure tier 1 over the estate (cards + flows): returns clamped summary LINES, never bodies. Args: lookup (all | cards | flows, default all) + tags (comma-separated card-declared tags, e.g. \"image,upscale\") + optional q (free-text filter). Prefer a FLOW when one fits the task — composition over single calls; fall back to cards. COUNTS-FIRST: a large estate clamps to counts + the tag vocabulary + the first rows; detail=true for every line. Open a line with melite_load (agents md + signature + skill lines).",
		parameters: {
			lookup: {
				type: "string",
				description: "Which plane to list: all (default) | cards | flows."
			},
			tags: {
				type: "string",
				description: "Comma-separated card-declared tags (image,upscale,generate,enhance,...). Empty means unfiltered."
			},
			q: {
				type: "string",
				description: "Optional free-text filter over names/titles/descriptions/ids."
			},
			detail: {
				type: "boolean",
				description: "Counts-first: when the estate is large the answer clamps to the first rows + counts + the tag vocabulary. detail=true returns every line."
			}
		},
		presentCall,
		output: {
			schema: {
				type: "object",
				additionalProperties: true,
				properties: {
					flows: {
						type: "array",
						items: {
							type: "object",
							additionalProperties: true
						},
						description: "Flow lines (name/title/description/stages/skillRefs) — present unless lookup=cards."
					},
					cards: {
						type: "array",
						items: {
							type: "object",
							additionalProperties: true
						},
						description: "Card lines (id/label/description/tags) — present unless lookup=flows."
					},
					error: {
						type: "string",
						description: "The refusal text — present exactly when the tool refused (render prints REFUSED)."
					}
				}
			},
			render: (_args, value) => {
				const v = value;
				if (v && typeof v.error === "string") return [{
					type: "text",
					text: "melite_discover REFUSED: " + v.error
				}];
				return [{
					type: "text",
					text: `discover: ${Array.isArray(v?.flows) ? v.flows.length : 0} flows, ${Array.isArray(v?.cards) ? v.cards.length : 0} cards — open one with melite_load`
				}];
			}
		},
		async execute(args, exec) {
			const a = args ?? {};
			const params = new URLSearchParams();
			const lookup = typeof a.lookup === "string" && a.lookup !== "" ? a.lookup : "all";
			params.set("lookup", lookup);
			if (typeof a.q === "string" && a.q !== "") params.set("q", a.q);
			if (typeof a.tags === "string" && a.tags !== "") params.set("tags", a.tags);
			try {
				const res = await request("GET", "/v1/discover?" + params.toString(), void 0, exec.signal, TIMEOUT_MS$1);
				const r = res;
				const flows = Array.isArray(r.flows) ? r.flows : [];
				const cards = Array.isArray(r.cards) ? r.cards : [];
				if (a.detail !== true && (flows.length > CLAMP || cards.length > CLAMP)) {
					const vocab = /* @__PURE__ */ new Set();
					for (const c of cards) {
						const t = c["tags"];
						if (Array.isArray(t)) {
							for (const x of t) if (typeof x === "string" && x !== "") vocab.add(x);
						}
					}
					return jsonClean({
						counts: {
							flows: flows.length,
							cards: cards.length
						},
						tag_vocabulary: [...vocab].sort().slice(0, 40),
						flows: flows.slice(0, CLAMP),
						cards: cards.slice(0, CLAMP),
						hint: "clamped — narrow with tags/q, or detail=true for every line"
					});
				}
				return jsonClean(res);
			} catch (e) {
				const err = e;
				return jsonClean({ error: typeof err.body === "string" && err.body !== "" ? err.body : err.message ?? "discover failed" });
			}
		}
	});
	def.presentCall = presentCall;
	return def;
}
//#endregion
//#region src/tools/melite-load.ts
const TIMEOUT_MS = 2e4;
function meliteLoad(request) {
	const presentCall = (args) => {
		const a = args ?? {};
		return {
			card: "generic",
			title: `Load ${typeof a.name === "string" && a.name !== "" ? a.name : "?"}`,
			kind: "search"
		};
	};
	const def = defineTool({
		name: "melite_load",
		description: "Open ONE card or flow (discover it first with melite_discover). Args: name (the card id or flow name) + inference_type (card | flow — a card or a flow tool call; nothing else executes). Returns the bundle: agents md, the tool-call signature (params_schema for cards; the prebuilt simplified signature for flows), tier-1 skill lines for the underlying skills (bodies load via skill_read — write the prompts yourself from the craft you read), model hints on cards (the boarded families' DECL identity — id/label/description), and a stable bundle digest — quote it and skip reload on a match.",
		parameters: {
			name: {
				type: "string",
				description: "The card id or flow name exactly as discovered.",
				required: true
			},
			inference_type: {
				type: "string",
				description: "card | flow.",
				required: true
			}
		},
		presentCall,
		output: {
			schema: {
				type: "object",
				additionalProperties: true,
				properties: {
					bundle: {
						type: "object",
						additionalProperties: true,
						description: "The opened bundle (name/kind/signature/agents/skills + stages/refs on flows, model_hints on cards, digest). Absent on refusal."
					},
					name: {
						type: "string",
						description: "Echo of the requested card id or flow name.",
						required: true
					},
					inference_type: {
						type: "string",
						description: "Echo of the requested inference_type.",
						required: true
					},
					error: {
						type: "string",
						description: "The refusal text — present exactly when the tool refused (render prints REFUSED)."
					}
				}
			},
			render: (_args, value) => {
				const v = value;
				if (v && typeof v.error === "string") return [{
					type: "text",
					text: "melite_load REFUSED: " + v.error
				}];
				const b = v?.bundle ?? {};
				const n = Array.isArray(b.skills) ? b.skills.length : 0;
				return [{
					type: "text",
					text: `loaded ${String(b.kind ?? "?")} ${String(b.name ?? "?")} — ${n} skill lines`
				}];
			}
		},
		async execute(args, exec) {
			const a = args ?? {};
			const name = typeof a.name === "string" ? a.name : "";
			const inferenceType = typeof a.inference_type === "string" ? a.inference_type : "";
			if (!name) return jsonClean({
				error: "name is required (discover it first)",
				name,
				inference_type: inferenceType
			});
			if (inferenceType !== "card" && inferenceType !== "flow") return jsonClean({
				error: "inference_type must be card|flow — a card or a flow tool call; nothing else executes",
				name,
				inference_type: inferenceType
			});
			const params = new URLSearchParams({
				name,
				inference_type: inferenceType
			});
			try {
				return jsonClean(await request("GET", "/v1/load?" + params.toString(), void 0, exec.signal, TIMEOUT_MS));
			} catch (e) {
				const err = e;
				return jsonClean({
					error: typeof err.body === "string" && err.body !== "" ? err.body : err.message ?? "load failed",
					name,
					inference_type: inferenceType
				});
			}
		}
	});
	def.presentCall = presentCall;
	return def;
}
//#endregion
//#region src/tools/skill-index.ts
/**
* skill_index - progressive disclosure TIER 1: the cheap skill index.
*
* The gateway (GET /v1/skills) walks the catalog models' agents/ trees
* (AGENT.md + agents/skills/*.md) plus the global skills/ lane docs and
* returns one row per skill: id, name, one-line description, genre and
* owning model when scoped. This is the SCAN; the BODY comes only via
* skill_read on demand - that pairing is the whole point of progressive
* disclosure: the agent never pays for docs it does not open.
*/
const INDEX_TIMEOUT_MS = 15e3;
function skillIndex(request) {
	const presentCall = () => {
		return {
			card: "generic",
			title: "Skill index",
			kind: "search"
		};
	};
	const def = defineTool({
		name: "skill_index",
		description: "List gateway skills (progressive disclosure tier 1): id + name + one-line description per skill, with genre/model when the skill is model-scoped. Cheap scan. Then load ONLY the skill you need with skill_read. Use before generating with an unfamiliar model, when the user asks what this stack can do, or to find the lane recipe for a genre (image/audio/video/3D/text). No arguments.",
		parameters: {},
		presentCall,
		output: {
			schema: {
				type: "object",
				additionalProperties: true,
				properties: {
					count: {
						type: "number",
						description: "Skills found.",
						required: true
					},
					skills: {
						type: "array",
						description: "Index rows: id/name/description (+genre/model when scoped).",
						required: true
					},
					error: {
						type: "string",
						description: "The refusal text — present exactly when the tool refused (render prints REFUSED)."
					}
				}
			},
			render: (_args, value) => {
				return [{
					type: "text",
					text: "skill_index: " + String(value.count ?? 0) + " skills (load one with skill_read)"
				}];
			}
		},
		async execute(_args, exec) {
			const res = await request("GET", "/v1/skills", void 0, exec.signal, INDEX_TIMEOUT_MS);
			const rows = Array.isArray(res.skills) ? res.skills : [];
			return jsonClean({
				count: rows.length,
				skills: rows
			});
		}
	});
	def.presentCall = presentCall;
	return def;
}
//#endregion
//#region src/tools/skill-read.ts
/**
* skill_read - progressive disclosure TIER 2: one skill's full body,
* loaded ONLY when needed (GET /v1/skills/<id>). Every read is ledgered
* gateway-side (skill.read in _ledger.jsonl), so which recipes the
* agent actually used is auditable after the fact.
*
* Ids come from skill_index: global lane docs are bare stems
* ("run-recovery"), model card docs are "model:<id>", and per-model
* skills are "model:<id>:<stem>".
*/
const READ_TIMEOUT_MS = 15e3;
function skillRead(request) {
	const presentCall = (args) => {
		const a = typeof args === "object" && args !== null ? args : {};
		return {
			card: "generic",
			title: `Read skill ${String(a.id ?? "?")}`,
			kind: "read",
			rawInput: String(a.id ?? "?")
		};
	};
	const def = defineTool({
		name: "skill_read",
		description: "Load ONE skill document in full (progressive disclosure tier 2): markdown body plus its name/description and genre/model when scoped. Discover ids first with skill_index. Reads are recorded in the gateway ledger (skill.read) - the audit trail of which recipes informed a generation. Args: id (from skill_index).",
		parameters: { id: {
			type: "string",
			description: "Skill id from skill_index: \"<stem>\", \"model:<id>\" or \"model:<id>:<stem>\".",
			required: true
		} },
		presentCall,
		output: {
			schema: {
				type: "object",
				additionalProperties: true,
				properties: {
					id: {
						type: "string",
						required: true
					},
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
						description: "The full markdown body.",
						required: true
					},
					error: {
						type: "string",
						description: "The refusal text — present exactly when the tool refused (render prints REFUSED)."
					}
				}
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
			const res = await request("GET", "/v1/skills/" + encodeURIComponent(a.id), void 0, exec.signal, READ_TIMEOUT_MS);
			return jsonClean({
				id: res.id ?? a.id,
				name: res.name ?? null,
				description: res.description ?? null,
				genre: res.genre ?? null,
				model: res.model ?? null,
				content: res.content ?? ""
			});
		}
	});
	def.presentCall = presentCall;
	return def;
}
//#endregion
//#region src/tools/ledger-tail.ts
/**
* ledger_tail - work off the file ledger: the append-only activity
* journal (output/_ledger.jsonl) the gateway maintains for EVERY
* material event - server.boot, run.registered, run.state, prov.state,
* skill.read. This tool tails it (GET /v1/ledger), oldest -> newest
* within the tail, so the agent can answer "what happened here",
* resume interrupted work, and audit its own skill usage without
* asking the user or trusting memory.
*/
const LEDGER_TIMEOUT_MS = 15e3;
function ledgerTail(request) {
	const presentCall = (args) => {
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
	};
	const def = defineTool({
		name: "ledger_tail",
		description: "Tail the gateway file ledger (append-only journal of runs, provisions, skill reads, server boots). Use to answer \"what happened / what ran / what downloaded\", to resume interrupted work after a restart, or to audit activity. Entries come back oldest -> newest within the tail; pair with skill_read \"run-recovery\" for the full recovery workflow. Args: limit (optional, default 50, max 500), event (optional prefix filter, e.g. \"run.\" or \"prov\").",
		parameters: {
			limit: {
				type: "number",
				description: "How many entries to return (default 50, max 500)."
			},
			event: {
				type: "string",
				description: "Optional event-name prefix filter, e.g. \"run.\", \"prov\", \"skill\"."
			}
		},
		presentCall,
		output: {
			schema: {
				type: "object",
				additionalProperties: true,
				properties: {
					shown: {
						type: "number",
						description: "Entries returned.",
						required: true
					},
					matched: {
						type: "number",
						description: "Total entries matching the filter.",
						required: true
					},
					entries: {
						type: "array",
						description: "Ledger rows: {ts, event, data}, oldest -> newest.",
						required: true
					},
					error: {
						type: "string",
						description: "The refusal text — present exactly when the tool refused (render prints REFUSED)."
					}
				}
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
			const res = await request("GET", "/v1/ledger" + (q.length > 0 ? "?" + q.join("&") : ""), void 0, exec.signal, LEDGER_TIMEOUT_MS);
			const entries = Array.isArray(res.entries) ? res.entries : [];
			return jsonClean({
				shown: typeof res.shown === "number" ? res.shown : entries.length,
				matched: typeof res.matched === "number" ? res.matched : entries.length,
				entries
			});
		}
	});
	def.presentCall = presentCall;
	return def;
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
const inject = ["tools"];
/** BASE tool names — both interfaces (discovery, compose, management, audit). */
const BASE_TOOL_NAMES = [
	"melite_discover",
	"melite_construct",
	"melite_load",
	"comfy_manage",
	"skill_index",
	"skill_read",
	"ledger_tail"
];
/** HEADLESS-only run doors (MELITE_HEADLESS=1) — the delegated operator. */
const HEADLESS_TOOL_NAMES = ["melite_flow", "run_status"];
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
	const request = makeEstateRequest(ctx);
	const headless = process.env.MELITE_HEADLESS === "1" || config.headless === true;
	const adhocEnv = (process.env.MELITE_ADHOC || "").split(",").map((s) => s.trim()).filter(Boolean);
	const adhocCfg = Array.isArray(config.adhocTools) ? config.adhocTools.map((s) => s.trim()).filter(Boolean) : typeof config.adhocTools === "string" ? config.adhocTools.split(",").map((s) => s.trim()).filter(Boolean) : [];
	const adhoc = adhocEnv.length ? adhocEnv : adhocCfg;
	c.logger.info("melite-tools: %s interface — %d base + %d headless run door(s) + %d ad hoc, gateway %s", headless ? "HEADLESS" : "BROWSER", BASE_TOOL_NAMES.length, headless ? HEADLESS_TOOL_NAMES.length : 0, adhoc.length, request);
	c.tools.register(meliteDiscover(request));
	c.tools.register(meliteConstruct(request));
	c.tools.register(meliteLoad(request));
	c.tools.register(comfyManage(request));
	c.tools.register(skillIndex(request));
	c.tools.register(skillRead(request));
	c.tools.register(ledgerTail(request));
	if (headless) {
		c.tools.register(meliteFlow(request));
		c.tools.register(runStatus(request));
	}
	c.tools.register(buildMusicTool(request));
	c.tools.register(buildTtsTool(request));
	c.tools.register(buildVoiceLockTool(request));
	c.tools.register(buildImageEditTool(request));
	c.tools.register(buildMotionTool(request));
	c.tools.register(buildH3TimelineTool(request));
	c.tools.register(buildCardTool(request));
}
//#endregion
export { ADHOC_TOOL_NAMES, BASE_TOOL_NAMES, DEFAULT_BENCH, HEADLESS_TOOL_NAMES, MELITE_TOOL_NAMES, RayGatewayError, apply, comfyManage, harnessEnhance, inject, ledgerTail, makeEstateRequest, matchHarnessRoute, meliteConstruct, meliteDiscover, meliteFlow, meliteLoad, name, resolveHarnessRoutes, routeName, runStatus, skillIndex, skillRead };
