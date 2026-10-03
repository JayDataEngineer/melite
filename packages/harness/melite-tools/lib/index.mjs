import { a as MODIFIER_PACKS, f as resolveSpecKey, i as routeName, m as makeEstateRequest, n as matchHarnessRoute, o as boardedMap, p as asEstateCall, r as resolveHarnessRoutes, t as harnessEnhance } from "./llm-complete-1WCmOnEC.mjs";
import { buildMusicTool } from "@melite/audio-music/tool";
import { buildTtsTool } from "@melite/audio-tts/tool";
import { buildImageEditTool } from "@melite/image-image-edit/tool";
import { buildMotionTool } from "@melite/motion-motion/tool";
import { buildH3TimelineTool } from "@melite/video-h3-timeline/tool";
import { CARD_PLANE_ENGINE, RUN_ID_RE, RUN_MEDIA_PREFIX, WIRE_STAGE_KEYS, benchDraftIdOf, benchSessionOf, canonicalRunMediaUrl, normalizeBenchStages } from "@melite/contracts/benchStage";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { remoteErrorOf } from "@deepseek-ai/dsh-typert-protocol";
import { isTerminalStatus, statusOf, statusOrPendingOf } from "@melite/contracts/stageView";
import { normalizeJsonArrayParams } from "@melite/estate-call/cardTool";
import { unwrapItemArrays } from "@melite/comfyui-card-kit";
import { FLOW_ID_RE, rootsManifest, searchedVoice } from "@melite/estate-queue";
import { loadCardDefs, registryModel, theService } from "@melite/comfyui-cordis";
import { execFile } from "node:child_process";
import { basename, extname, join, resolve, sep } from "node:path";
import { mkdtemp, readFile, readdir, realpath, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { AttachmentError, AttachmentId } from "@deepseek-ai/dsh-attachment";
import { listMedia } from "@melite/estate-media";
//#region src/expansion.ts
/**
* THE EXPANSION SEAT (progressive disclosure, operator 2026-10-08 —
* the Tool Search Tool law over our own toolset).
*
* The eager trio (discover / load / construct) is the whole melite
* schema surface in a session's FIRST request. The deferred estate
* doors — view, model upkeep, the skill twins, the ledger — seat
* themselves the moment the catalog is touched (any discover or
* load execute), so a chat that never touches media never pays
* their tokens.
*
* WHY THIS IS LEGAL AT ALL: DSH's EpochHeader carries the assembled
* tool schemas PER REQUEST and appends a `change` snapshot when the
* set changes (session.md, the request-envelope contract) —
* mid-session registration is native, the next model call simply
* sees the seated doors. No DSH core surface is touched: this is
* our own registry membership, our own tools.
*
* The registrar is set once per plugin mount by apply(); the eager
* builders call {@link expandEstateDoors} at execute entry. A small
* module of its own so the builders never import index.ts (no
* cycle: index -> builders -> expansion <- index).
*/
/** Set by apply() — seats the deferred doors (idempotent). Null on
* an unmounted plugin; the call is then a no-op. */
let seatDeferred = null;
/** apply() installs the registrar here. */
function installExpansion(registrar) {
	seatDeferred = registrar;
}
/** Plugin-unload arm: the deferred registrations' disposers are
* plugin-lifetime — apply collects them and hands the flush here. */
function clearExpansion() {
	seatDeferred = null;
}
/** Seat the deferred estate doors (idempotent, safe to call from
* any execute arm, any number of times). */
function expandEstateDoors() {
	seatDeferred?.();
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
*
* REPAIR IS THE LAW HERE, and the divergence from DSH's refusal is
* deliberate (the §2.3 record, 2026-10-12): the live estate's tool results
* carry gateway-shaped data every day, so refusing at the registry would
* break live behavior the W2 gate proved exists. Two consequences are
* accepted with that choice and named here: every `undefined` → `null`
* collapse is MODEL-VISIBLE (the model cannot distinguish an absent field
* from an explicit null), and DSH's snapshot non-losslessness helpers can
* never fire on this repository's tool results because the values are
* pre-cleaned before the registry sees them.
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
	/* v8 ignore next -- typeof exhaustion: every non-object returns above (2026-09-12) */
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
const WAIT_MAX_S = 300;
const WAIT_POLL_S = 5;
/** Abortable sleep — resolves after ms, rejects immediately when
* the caller's signal aborts (a cancelled wait never lingers).
* Rejecting is this loop's contract: DSH's exported sleep
* (references/deepseek-harness/packages/api/job-controller/src/
* wake.ts:49) settles on abort by RESOLVING, and this poll has no
* abort check around the await, so resolving would spin it to the
* deadline. No Context reaches a tool body, so ctx.timeout is not a
* seat here either. */
function sleepAbortable(ms, signal) {
	return new Promise((resolve, reject) => {
		const t = setTimeout(() => {
			signal.removeEventListener("abort", onAbort);
			resolve();
		}, ms);
		function onAbort() {
			clearTimeout(t);
			reject(signal.reason ?? /* @__PURE__ */ new Error("aborted"));
		}
		if (signal.aborted) {
			onAbort();
			return;
		}
		signal.addEventListener("abort", onAbort, { once: true });
	});
}
const TERMINAL = { has: (s) => isTerminalStatus(s) };
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
		parameters: {
			runId: {
				type: "string",
				description: "The run id returned by melite_flow.",
				required: true
			},
			wait_s: {
				type: "number",
				description: "Long-poll budget in seconds as a JSON number (300, not \"300\"; 0-300, default 0 = single read; clamped at execute). The tool re-fetches internally every 5s until the run is terminal — ONE result row instead of a sleep-and-repoll turn loop (efficiency review fix 5). On budget expiry the row carries wait_expired: true."
			}
		},
		timeoutMs: 32e4,
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
						description: "Per-stage rows: id/name, status, error, declared output channels in [brackets] when present."
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
					},
					planned_stages: {
						type: "array",
						description: "The registered plan (id/engine per stage) — present when a live row has no stage rows yet."
					},
					card: {
						type: "string",
						description: "The card (or pipeline) the run was born from."
					},
					run_age_s: {
						type: "number",
						description: "Seconds since registration — the heartbeat for long renders."
					},
					wait_expired: {
						type: "boolean",
						description: "True when wait_s expired before the run reached a terminal state — wait again."
					},
					waited_s: {
						type: "number",
						description: "Seconds actually waited when the run reached terminal inside the budget."
					},
					variant: {
						type: "string",
						description: "The lane the run rode (e.g. voicedesign vs customvoice) — present when the submitted body named one. A design run and a performing run on the same pipeline read apart here."
					}
				}
			},
			render: (args, value) => {
				const v = value;
				if (v && v.error) return [{
					type: "text",
					text: "run " + String(v.run_id ?? "?") + " " + String(v.status ?? "?") + " — " + v.error
				}];
				const stages = v.stages ?? [];
				const artifacts = v.artifacts ?? [];
				const done = stages.filter((s) => s && statusOrPendingOf(typeof s.status === "string" ? s.status : "") === "done").length;
				const total = stages.length;
				const pos = typeof v.queue_position === "number" && v.queue_position > 0 ? " (queue #" + v.queue_position + ")" : "";
				const plan = total === 0 && Array.isArray(v.planned_stages) && v.planned_stages.length > 0 ? " · plan: " + v.planned_stages.length + " stage(s)" + (typeof v.card === "string" && v.card ? " (" + v.card + ")" : "") : "";
				const terminal = typeof v.status === "string" && isTerminalStatus(v.status);
				const age = !terminal && typeof v.run_age_s === "number" ? " · age " + v.run_age_s + "s" : "";
				const stageVoice = terminal && stages.length ? "\nstages: " + stages.map((s) => {
					const row = s;
					const id = typeof row.id === "string" ? row.id : typeof row.name === "string" ? row.name : "?";
					const st = typeof s?.status === "string" ? s.status : "?";
					const err = typeof row.error === "string" && row.error !== "" ? " ! " + row.error : "";
					const outs = row.outputs !== null && typeof row.outputs === "object" && !Array.isArray(row.outputs) ? Object.keys(row.outputs) : [];
					return id + ":" + st + err + (outs.length > 0 ? " [" + outs.join(",") + "]" : "");
				}).join(", ") : "";
				const artPaths = terminal ? artifacts.slice(0, 4).map((a) => {
					const p = typeof a === "string" ? a : typeof a?.path === "string" ? a.path : "";
					if (p.startsWith("/")) return p;
					const bare = p.startsWith("./") ? p.slice(2) : p;
					const rid = typeof v.run_id === "string" ? v.run_id : "";
					const single = rid !== "" && bare.startsWith(rid + "/" + rid + "/") ? rid + bare.slice((rid + "/" + rid).length) : bare;
					if (rid !== "" && (single === rid || single.startsWith(rid + "/"))) return (v.test === true ? "test-output/" : "output/") + single;
					return single;
				}).filter(Boolean) : [];
				const artVoice = artPaths.length ? "\nartifacts: " + artPaths.join("\n  ") + (artifacts.length > 4 ? `\n  (+${artifacts.length - 4} more)` : "") : "";
				const exportVoice = terminal && typeof v.export_name === "string" && v.export_name !== "" ? `\nexport: '${v.export_name}' — preview audio is the design sample; the deliverable .qvoice is ${typeof v.export_path === "string" && v.export_path !== "" ? v.export_path : `the newest ${v.export_name}_*.qvoice under the voices root`}` : "";
				const variantVoice = typeof v.variant === "string" && v.variant !== "" ? " · variant " + v.variant : "";
				const loud = v.loudness;
				const loudVoice = terminal && loud !== null && typeof loud === "object" && typeof loud.loudness_lufs === "number" && Number.isFinite(loud.loudness_lufs) && typeof loud.peak_db === "number" && Number.isFinite(loud.peak_db) ? ` · ${loud.loudness_lufs.toFixed(2)} LUFS / ${loud.peak_db.toFixed(2)} dBTP` : "";
				const fresh = v.voice_freshness;
				const freshVoice = terminal && fresh !== null && typeof fresh === "object" && typeof fresh.reused_existing === "boolean" && typeof fresh.voice_file === "string" ? ` · voice ${fresh.voice_file}${fresh.reused_existing ? " (REUSED — a stale name won; mint a fresh one)" : " (fresh mint)"}` : "";
				return [{
					type: "text",
					text: "run " + String(v.run_id ?? "?") + " " + String(v.status ?? "?") + pos + " — " + done + "/" + total + " stage(s)" + plan + age + (artifacts.length ? " · " + artifacts.length + " artifact(s)" : "") + (v.wait_expired ? " · wait expired (budget spent, not terminal — wait again)" : "") + (typeof v.waited_s === "number" ? " · waited " + v.waited_s + "s" : "") + variantVoice + loudVoice + freshVoice + stageVoice + artVoice + exportVoice
				}];
			}
		},
		async execute(args, exec) {
			const a = args;
			const runId = a.runId;
			if (!runId) return jsonClean({ error: "runId is required" });
			const waitRaw = typeof a.wait_s === "number" ? a.wait_s : Number(a.wait_s);
			const waitS = Number.isFinite(waitRaw) ? Math.min(Math.max(waitRaw, 0), WAIT_MAX_S) : 0;
			const deadline = Date.now() + waitS * 1e3;
			let res;
			let waitExpired = false;
			for (;;) {
				try {
					res = await request("GET", "/v1/flows/status/" + encodeURIComponent(runId), void 0, exec.signal, TIMEOUT_MS$3);
				} catch (e) {
					const re = remoteErrorOf(e);
					if (re !== null && re !== void 0) return jsonClean({
						run_id: runId,
						error: `${re.code}: ${re.message}`
					});
					throw e;
				}
				const status = typeof res?.["status"] === "string" ? res["status"] : "";
				if (TERMINAL.has(status)) break;
				if (Date.now() >= deadline) {
					waitExpired = waitS > 0;
					break;
				}
				await sleepAbortable(WAIT_POLL_S * 1e3, exec.signal);
			}
			if (res && typeof res.error === "string" && res.error !== "") return jsonClean({
				run_id: runId,
				error: res.error
			});
			return jsonClean({
				...waitExpired ? {
					wait_expired: true,
					wait_budget_s: waitS
				} : waitS > 0 ? { waited_s: Math.round(waitS - Math.max(0, deadline - Date.now()) / 1e3) } : {},
				run_id: typeof res.run_id === "string" ? res.run_id : runId,
				status: typeof res.status === "string" ? res.status : "unknown",
				stages: Array.isArray(res.stages) ? res.stages : [],
				artifacts: Array.isArray(res.artifacts) ? res.artifacts : [],
				error: void 0,
				queue_position: typeof res.queue_position === "number" ? res.queue_position : 0,
				planned_stages: Array.isArray(res.planned_stages) ? res.planned_stages : void 0,
				card: typeof res.card === "string" ? res.card : void 0,
				run_age_s: typeof res.run_age_s === "number" ? res.run_age_s : void 0,
				export_name: typeof res.export_name === "string" ? res.export_name : void 0,
				export_path: typeof res.export_path === "string" ? res.export_path : void 0,
				test: typeof res.test === "boolean" ? res.test : void 0
			});
		}
	});
	def.presentCall = presentCall;
	return def;
}
//#endregion
//#region src/tools/melite-construct.ts
/** The default bench — the unattributed seat (headless runs,
*  legacy callers). */
const DEFAULT_BENCH = "main";
function benchKeyOfExec(exec) {
	const id = exec.agent?.id;
	return benchSessionOf(typeof id === "string" ? id : void 0);
}
function benchKeyOf(a) {
	const k = a["bench"];
	return benchSessionOf(typeof k === "string" ? k : void 0);
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
/** THE CAS VERDICT MATCHER (2026-10-12, the code law — the same
*  cure the browser plane landed): the seats throw RemoteError and
*  the protocol's own law is "discrimination is always by code,
*  never by message text" — every CAS voice (bench verbs, ensure,
*  drafts/patch) carries bench/cas-conflict. The substring arms
*  died with their two dead-matcher incidents; estate.ts's own
*  conflict() closure reads the code exactly this way. */
function isCasConflict(e) {
	return e?.code === "bench/cas-conflict";
}
/** ONE-RETRY REBASE (the operator's stuck-agent cure, 2026-10-09:
*  "I can't even change models in the cards — it breaks"): an
*  agent's held expect_rev goes stale the moment ANYTHING else
*  writes the bench — the user's own GUI edit, a concurrent agent,
*  or the agent's own prior patch whose new rev it never folded.
*  The CAS verdict itself is CORRECT (never merge under a moved
*  bench); what broke the operator was the tool face lacking the
*  browser's cure: on the door's cas-conflict, re-read the fresh
*  rev and re-apply ONCE. Non-destructive verbs only — load's
*  wholesale replacement still refuses when moved (a rebase there
*  could clobber a concurrent write silently). */
async function postBenchVerb(request, bench, verbPath, body, signal) {
	const attempt = (rev) => request("POST", `/v1/bench/${bench}/${verbPath}`, {
		...body,
		expect_rev: rev
	}, signal, 15e3);
	try {
		return await attempt(body["expect_rev"]);
	} catch (e) {
		if (!isCasConflict(e)) throw e;
		const rev = (await readBench(request, bench, signal))["rev"];
		if (typeof rev !== "number") throw e;
		return await attempt(rev);
	}
}
/** Enrich bench stages with the draft's latest run (the lookup
*  the agent cannot do itself: runs are born from drafts — the
*  start door refuses cardless runs — so the bench's draft_id
*  joins to /v1/flows/runs rows server-side; the agent never
*  touches a filesystem path). A stage that has run carries
*  last_run {run_id, status, created_at, thumbnail, artifacts} —
*  view it with melite_view, chain it with {stage, output}.
*  last_run is the DRAFT's latest run, shared by every stage
*  (stages carry no timestamps — a stage added after the run
*  still advertises it; known limit, stated not silent).
*  No match carries last_run: null PLUS the window facts
*  (runs {checked, total, matched}) — never-ran reads off small
*  totals, window-miss off total >> checked. Enrichment DEGRADES,
*  never refuses: a failed runs call (seat absent, lane hiccup)
*  returns the stages verbatim with no runs key — lookup-failed
*  (key absent) vs no-match (null + facts) stay distinct.
*  One window: the newest 100 global runs. */
async function withLastRun(request, bench, signal) {
	const stages = bench["stages"];
	const none = {
		stages,
		runs: null
	};
	if (!Array.isArray(stages) || stages.length === 0) return none;
	const draftId = bench["draft_id"];
	if (typeof draftId !== "string" || draftId === "") return none;
	let env;
	try {
		env = await request("GET", "/v1/flows/runs?limit=100", void 0, signal, 15e3);
	} catch {
		return none;
	}
	const rows = env["runs"];
	if (!Array.isArray(rows)) return none;
	const total = env["count"];
	const facts = (matched) => ({
		checked: rows.length,
		total: typeof total === "number" ? total : rows.length,
		matched
	});
	const mine = [];
	for (const r of rows) {
		if (typeof r !== "object" || r === null || Array.isArray(r)) continue;
		const rec = r;
		if (rec["draft_id"] !== draftId) continue;
		const created = rec["created_at"];
		mine.push({
			created: typeof created === "number" ? created : 0,
			row: rec
		});
	}
	if (mine.length === 0) return {
		stages: stages.map((s) => {
			if (typeof s !== "object" || s === null || Array.isArray(s)) return s;
			return {
				...s,
				...paramsSummary(s),
				last_run: null
			};
		}),
		runs: facts(0)
	};
	mine.sort((a, b) => b.created - a.created);
	const win = mine[0].row;
	const lastRun = {
		run_id: win["run_id"],
		status: win["status"],
		created_at: win["created_at"],
		thumbnail: win["thumbnail"],
		artifacts: win["artifacts"],
		...typeof win["export_name"] === "string" && win["export_name"] !== "" ? { export_name: win["export_name"] } : {},
		...typeof win["export_path"] === "string" && win["export_path"] !== "" ? { export_path: win["export_path"] } : {}
	};
	return {
		stages: stages.map((s) => {
			if (typeof s !== "object" || s === null || Array.isArray(s)) return s;
			return {
				...s,
				...paramsSummary(s),
				last_run: lastRun
			};
		}),
		runs: facts(mine.length)
	};
}
/** THE PARAMS SUMMARY (035 attempt-15's gap #3, 2026-09-24): the
*  read's stage rows carried card/engine/last_run but NOT the
*  resolved model or the array-shape facts a probe needs to verify
*  its own landing — the maker had to read the raw draft doc
*  separately. Every stage row now carries `model` (when a param
*  states it) and `arrays` (key=shape for every array-valued
*  param: true-array vs wrapped — the Probe-B receipt shape). */
function paramsSummary(s) {
	const params = s["params"];
	if (typeof params !== "object" || params === null || Array.isArray(params)) return {};
	const p = params;
	const out = {};
	const model = p["model"];
	if (typeof model === "string" && model !== "") out["model"] = model;
	const arrays = {};
	for (const [k, v] of Object.entries(p)) if (Array.isArray(v)) arrays[k] = "array[" + String(v.length) + "]";
	else if (typeof v === "object" && v !== null && Object.prototype.hasOwnProperty.call(v, "item")) arrays[k] = "wrapped{item}";
	if (Object.keys(arrays).length > 0) out["arrays"] = arrays;
	return out;
}
/** Record guard for verb args the doors admit as maps (expected,
*  outputs): plain objects only — null, arrays, and scalars would
*  die silently at the bench's isRecord, so the tool sheds them. */ function isRecordArg(v) {
	return typeof v === "object" && v !== null && !Array.isArray(v);
}
/** First artifact's usable path (024's self-critique #5): string
*  rows print verbatim; object rows print their path; list-row
*  `./output/…` strips to repo-relative. Route-relative rows stay
*  as-served here (the bench read names no out root) — run_status
*  is the canonical receipt door. */
function firstArtifactPath(artifacts) {
	const a = artifacts[0];
	const p = typeof a === "string" ? a : typeof a === "object" && a !== null && typeof a.path === "string" ? a.path : "";
	return p.startsWith("./") ? p.slice(2) : p;
}
/** Project bench stage rows onto the flow_inline wire contract
*  (the doors forbid provenance/runStatus/result/title as extras —
*  they strip; `card` RIDES (STAGE_KEYS admit it) because the
*  kinds pass derives input kinds from the card's own flowKinds —
*  stripping it manufactured phantom "wired but untyped" refusals
*  on correctly-wired card stages; engine defaults comfyui). */
function projectStages(stages) {
	if (!Array.isArray(stages)) return [];
	const source = stages.filter((s) => typeof s === "object" && s !== null && !Array.isArray(s));
	return normalizeBenchStages(source).map((row, i) => {
		const from = source[i];
		if (from !== void 0) {
			row["id"] = String(from["id"] ?? "");
			if (typeof from["id"] === "string" && from["id"] !== "") row["id"] = from["id"];
			for (const key of Object.keys(row)) {
				if (key === "expected" || WIRE_STAGE_KEYS.includes(key)) continue;
				delete row[key];
			}
			if (typeof from["expected"] === "object" && from["expected"] !== null && !Array.isArray(from["expected"])) row["expected"] = from["expected"];
			else delete row["expected"];
		}
		return row;
	});
}
function meliteConstruct(request, opts = {}) {
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
		description: "Author THE shared bench — one working flow the user sees live in the cards tab and edits alongside you. " + (opts.headless === true ? "This never executes (melite_flow runs what is here; the user presses Run). " : "You compose the flow and edit its state here, live with the user — runs start at the user's Run press, never yours. ") + "Verbs: read (the state — always start here; a stage that has run carries last_run {run_id, status, artifacts} — null + runs {checked, total, matched} when the draft has no run in the window; view a run_id with melite_view, chain it with {stage, output}) | load (replace stages wholesale — DESTRUCTIVE on THE CONVERSATION'S SHARED BENCH: this is the bench the user watches in their cards tab, and overwrite:true replaces whatever was there — load a throwaway TEST/scratch flow only when replacing is the intent, never to \"try\" a shape; refused on a non-empty bench unless overwrite:true confirms it; prefer add_stage to grow the bench) | patch {stage, params} | add_stage {card, params?, inputs?, expected?, outputs?} (inputs wire PRIOR STAGES through the card's declared ports, never files: inputs {image1: {stage: \"s_0\", output: \"default\"}} AND params {image1: \"$image1\"} — the $spell consumes the channel, the queue resolves it at run time; to chain the last generation, bind its stage, never hunt its artifact on disk; kinds derive from the card's ports — state expected only to override, outputs only for custom channels) | remove_stage {stage} | clear (EVERY stage out in one rev; undo restores all — the cure when the bench itself is the wound) | rewire {stage, input, from?} (from is {stage, output} | {initial} — same law: stage bindings, never paths) | undo {n?, author?} | validate (compile check, no GPU). Mutations take expect_rev from your last read — a moved bench refuses 409 with current_rev; re-read, re-apply. No ids anywhere: the bench is the one shared state.",
		parameters: {
			verb: {
				type: "string",
				enum: [
					"read",
					"load",
					"patch",
					"add_stage",
					"remove_stage",
					"clear",
					"rewire",
					"undo",
					"validate"
				],
				description: "read (default when absent) | load | patch | add_stage | remove_stage | clear | rewire | undo | validate."
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
				description: "patch (merge onto the stage) | add_stage | load single-stage shorthand. A null value UNSETS its key (the drafts door's JSON Merge Patch law, both doors one law since 2026-09-24 — patch {voice_name: null} clears it; no remove_stage dance). MODEL SWITCH LAW: a stage's variant/quant belong to its model — switching params.model without co-stating the new family's variant (melite_load names each family's variants) composes a refusal (unknown variant for the new model). State model + variant (+ quant) together, or leave the model alone."
			},
			inputs: {
				type: "object",
				additionalProperties: true,
				description: "add_stage: {input: {stage, output} | {initial}} wiring."
			},
			expected: {
				type: "object",
				additionalProperties: true,
				description: "add_stage: hand-typed input kinds ({input: Kind}) — the override ONLY (kinds derive from the card's own ports; state what the card cannot know, e.g. initials, never a mirror to hand-copy)."
			},
			outputs: {
				type: "object",
				additionalProperties: true,
				description: "add_stage: custom output channels ({name: Kind}) — absent defaults to {default: \"image\"}."
			},
			input: {
				type: "string",
				description: "rewire: the input name to bind."
			},
			from: {
				type: "object",
				additionalProperties: false,
				properties: {
					stage: {
						type: "string",
						description: "The source stage id."
					},
					output: {
						type: "string",
						description: "The source stage's output name."
					},
					initial: {
						type: "string",
						description: "An operator-supplied initial key."
					}
				},
				description: "rewire: {stage, output} | {initial}; absent clears the binding."
			},
			stages: {
				type: "array",
				items: {
					type: "object",
					additionalProperties: false,
					properties: {
						id: {
							type: "string",
							description: "The stage id."
						},
						engine: {
							type: "string",
							description: "Engine id (default comfyui)."
						},
						card: {
							type: "string",
							description: "The card id (display + provenance hint)."
						},
						description: {
							type: "string",
							description: "What the stage produces."
						},
						params: {
							type: "object",
							additionalProperties: true,
							description: "Stage params (open — the card/engine owns the keys)."
						},
						inputs: {
							type: "object",
							additionalProperties: true,
							description: "{input: {stage, output} | {initial}} wiring."
						},
						outputs: {
							type: "object",
							additionalProperties: true,
							description: "Custom output channels {name: Kind}."
						}
					}
				},
				description: "load: the full replacement [{id?, engine?, card?, params?, inputs?, outputs?}]."
			},
			intent: {
				type: "string",
				description: "load: what this bench produces."
			},
			overwrite: {
				type: "boolean",
				description: "load: confirm wholesale replacement of a non-empty bench (required — the overwrite law refuses without it)."
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
				const lines = ["bench " + String(v.verb ?? "?") + " → rev " + String(v.rev ?? "?")];
				if (Array.isArray(v.stages)) {
					const stages = v.stages;
					if (stages.length === 0) lines.push("stages: (bench is empty)");
					else {
						lines.push(`stages: ${stages.length}`);
						for (const s of stages) {
							const id = typeof s.id === "string" ? s.id : "?";
							const card = typeof s.card === "string" ? s.card : typeof s.card_id === "string" ? s.card_id : "?";
							const engine = typeof s.engine === "string" ? s.engine : "?";
							const lr = s.last_run;
							let suffix = "";
							if (lr !== null && lr !== void 0 && typeof lr.run_id === "string" && lr.run_id !== "") {
								const arts = Array.isArray(lr.artifacts) ? lr.artifacts.length : 0;
								const first = Array.isArray(lr.artifacts) ? firstArtifactPath(lr.artifacts) : "";
								const expName = typeof lr.export_name === "string" && lr.export_name !== "" ? lr.export_name : "";
								const expPath = typeof lr.export_path === "string" && lr.export_path !== "" ? lr.export_path : "";
								const exp = expName !== "" ? `, export '${expName}'${expPath !== "" ? ` @ ${expPath}` : ""}` : expPath !== "" ? `, export ${expPath}` : "";
								suffix = ` — last_run ${lr.run_id} (${String(lr.status ?? "?")}${arts ? ", " + arts + " artifact(s)" : ""}${exp}${first !== "" ? ", " + first : ""})`;
							} else if (lr === null) suffix = " — last_run null (draft has no run in the window)";
							lines.push(`  ${id} — ${card} [${engine}]${suffix}`);
						}
					}
				}
				const runsFacts = v.runs;
				if (runsFacts !== void 0) lines.push(`runs window: checked ${String(runsFacts.checked ?? "?")}, total ${String(runsFacts.total ?? "?")}, matched ${String(runsFacts.matched ?? "?")}`);
				if (typeof v.intent === "string" && v.intent !== "") lines.push("intent: " + v.intent);
				if (typeof v.hint === "string" && v.hint !== "") lines.push("hint: " + v.hint);
				return [{
					type: "text",
					text: lines.join("\n")
				}];
			}
		},
		async execute(args, exec) {
			const a = { ...unwrapItemArrays(args) };
			const verb = typeof a.verb === "string" ? a.verb : "read";
			const agentBench = benchKeyOfExec(exec);
			const bench = agentBench !== "main" ? agentBench : benchKeyOf(a);
			const signal = exec.signal;
			const out = (payload) => jsonClean({
				verb,
				bench,
				ok: true,
				...payload
			});
			try {
				if (verb === "read") {
					const b = await readBench(request, bench, signal);
					const enriched = await withLastRun(request, b, signal);
					return out({
						rev: b.rev,
						intent: b.intent,
						stages: enriched.stages,
						log: b.log,
						...enriched.runs !== null ? { runs: enriched.runs } : {},
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
					const intent = typeof b.intent === "string" ? b.intent : "";
					const r = await request("POST", "/v1/flows/validate", { flow_inline: {
						id: intent !== "" && FLOW_ID_RE.test(intent) ? intent : "bench",
						stages
					} }, signal, 2e4);
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
						...a.overwrite === true ? { overwrite: true } : {},
						expect_rev: a.expect_rev
					}, signal, 15e3);
					return out({
						rev: r.rev,
						stages: r.stages
					});
				}
				if (verb === "patch") {
					const r = await postBenchVerb(request, bench, "patch", {
						stage: a.stage,
						params: a.params,
						expect_rev: a.expect_rev
					}, signal);
					return out({
						rev: r.rev,
						stage: r.stage,
						patched: r.patched
					});
				}
				if (verb === "add_stage") {
					if (typeof a.stage === "string" && a.stage.trim() === "") a.stage = void 0;
					if (a.stage !== void 0) return out({ error: "add_stage assigns its own stage id (s_0, s_1, ...) — the answer carries it; patch/remove_stage/rewire take {stage}. Drop the stage arg." });
					const r = await postBenchVerb(request, bench, "add_stage", {
						card: a.card,
						...a.engine !== void 0 ? { engine: a.engine } : {},
						...a.params !== void 0 ? { params: a.params } : {},
						...a.inputs !== void 0 ? { inputs: a.inputs } : {},
						...isRecordArg(a.expected) ? { expected: a.expected } : {},
						...isRecordArg(a.outputs) ? { outputs: a.outputs } : {},
						expect_rev: a.expect_rev
					}, signal);
					return out({
						rev: r.rev,
						stage: r.stage
					});
				}
				if (verb === "remove_stage") {
					const r = await postBenchVerb(request, bench, "remove_stage", {
						stage: a.stage,
						expect_rev: a.expect_rev
					}, signal);
					return out({
						rev: r.rev,
						stage: r.stage
					});
				}
				if (verb === "clear") {
					const r = await postBenchVerb(request, bench, "clear", { expect_rev: a.expect_rev }, signal);
					return out({
						rev: r.rev,
						cleared: r.cleared
					});
				}
				if (verb === "rewire") {
					const r = await postBenchVerb(request, bench, "rewire", {
						stage: a.stage,
						input: a.input,
						...a.from !== void 0 ? { from: a.from } : {},
						expect_rev: a.expect_rev
					}, signal);
					return out({
						rev: r.rev,
						stage: r.stage,
						input: r.input
					});
				}
				if (verb === "undo") {
					const r = await postBenchVerb(request, bench, "undo", {
						...a.n !== void 0 ? { n: a.n } : {},
						...a.author !== void 0 ? { author: a.author } : {},
						expect_rev: a.expect_rev
					}, signal);
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
					error: "unknown verb — want read|load|patch|add_stage|remove_stage|clear|rewire|undo|validate",
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
/** The row's model (the QUEUE LANE LAW, agent-side): the row's
*  params may name `model` explicitly; otherwise the card id
*  resolves through form-spec's OWN alias law (boarded[0] — the
*  same truth /v1/form-spec serves and the UI's
*  defaultFamilyForCard reads; ONE resolution, never re-derived).
*  An unresolvable card rides verbatim and the start door refuses
*  with its own named voice. */
async function modelForCard(card, params) {
	if (typeof params["model"] === "string" && params["model"] !== "") return params["model"];
	const defs = await loadCardDefs();
	const res = resolveSpecKey(card, defs, boardedMap(defs));
	return res !== null ? res.model : card;
}
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
			card: typeof st.card === "string" ? st.card : "",
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
/** THE OBSERVATION BUDGET (the commission wedge landing, 2026-10-03):
*  the outcome observer polled WITHOUT a wall clock — a run whose
*  claim never released (the queue's single-active lane) hung the
*  tool for the life of the session (the film press wedged 95 min
*  on a dead engine; the queue-side armor landed with this budget —
*  runsRegistry.ts's pump catch). The budget bounds the
*  OBSERVATION, never the run: expiry returns the waiting face
*  ('queued' — a word the terminal arm can never produce), re-arms
*  a background attribution link, and the caller reports a pending
*  receipt (run_status owns re-waiting). Three times the wait
*  family's WAIT_MAX_S=300 — above every legitimate render
*  observed, short enough to free a wedged transcript. */
const OBSERVE_MAX_MS = 9e5;
/** POST /v1/flows/start — the verbatim-error pattern (the agent
*  reads the gateway's refusal text, not a transport code). */
/** THE WIRE-BOOLEAN READ (attempt-035's provenance receipt,
* 2026-09-24): the same corruptor that stringifies declared
*  numerics can stringify the declared boolean — `test: "true"`
*  failed `=== true` and diagnostic runs landed under output/ as
*  test:false. Loose spellings read truthy; everything else stays
*  false (never truthy-coerce junk like 1/"yes"). */
function wireBool(v) {
	return v === true || v === "true";
}
async function startRun(request, body, signal) {
	let res;
	try {
		res = await request("POST", "/v1/flows/start", body, signal, TIMEOUT_MS$2);
	} catch (e) {
		const re = remoteErrorOf(e);
		if (re !== null && re !== void 0) return { error: re.message || "queue refused the start" };
		throw e;
	}
	if (res && typeof res.error === "string" && res.error !== "") return { error: res.error };
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
	const session = body["session"];
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
		overwrite: true,
		...expectRev !== void 0 ? { expect_rev: expectRev } : {}
	}, signal, DRAFT_TIMEOUT_MS);
	if (b && typeof b.error === "string" && b.error) throw new Error(b.error);
	const id = b && b.draft_id;
	if (typeof id !== "string" || id === "") throw new Error("bench ensure returned no draft_id");
	return id;
}
/** BENCH (the AI-control pillar, 2026-09-12): the agent drives THE
*  shared bench exactly like the user's Run press — ONE SEQUENTIAL
*  PASS, agent-side, one card at a time through the serial queue.
*  The flow_inline batch arm is DEAD here (the executor takes
*  single-stage pre-composed graphs only — a multi-stage bench was
*  an honest refusal, never a pass): each row runs through the
*  {model: card-id} compose arm under the bench's own draft_id
*  (resolveCardFamily resolves the card → family estate-side — the
*  same truth /v1/form-spec serves), the run is observed to
*  terminal on the run-wire cadence, and EVERY flip is written onto
*  the bench row (runStatus + result {run_id, url}) through the
*  bench patch door — the same attribution the tab's observer
*  performs, so the user's tiles go live WHILE the agent drives.
*  The pass law is Run All's law verbatim: bench order, skip done
*  rows, one refusal or failed terminal STOPS the pass. */
async function runBench(request, a, signal) {
	const empty = {
		mode: "bench",
		target: benchDraftIdOf(a.bench),
		error: "the bench is empty — construct stages first (melite_construct)"
	};
	let b;
	try {
		b = await request("GET", `/v1/bench/${a.bench}`, void 0, signal, 15e3);
	} catch (e) {
		if (remoteErrorOf(e)?.code === "bench/not-found") return empty;
		throw e;
	}
	const rows = Array.isArray(b["stages"]) ? b["stages"].filter((s) => typeof s === "object" && s !== null && typeof s["id"] === "string") : [];
	if (rows.length === 0) return empty;
	const draftId = typeof b["draft_id"] === "string" ? b["draft_id"] : benchDraftIdOf(a.bench);
	const target = `${benchDraftIdOf(a.bench)} @ rev ${String(b["rev"] ?? "?")}`;
	const pass = [];
	for (const row of rows) {
		const stageId = row["id"];
		const card = typeof row["card"] === "string" && row["card"] !== "" ? row["card"] : "";
		{
			const folded = statusOrPendingOf(typeof row["runStatus"] === "string" ? row["runStatus"] : "");
			if (folded === "done" || folded === "cached" || folded === "reused") {
				pass.push({
					stage: stageId,
					card,
					skipped: "done"
				});
				continue;
			}
		}
		if (card === "") return {
			mode: "bench",
			target,
			draft_id: draftId,
			status: "stopped",
			stoppedAt: stageId,
			error: `stage ${stageId} names no card — nothing to compose (melite_construct patch)`,
			pass
		};
		const params = row["params"] !== null && typeof row["params"] === "object" && !Array.isArray(row["params"]) ? row["params"] : {};
		const model = await modelForCard(card, params);
		const started = await startRun(request, {
			...params,
			model,
			test: wireBool(a.test),
			draft_id: draftId
		}, signal);
		if (typeof started["error"] === "string") return {
			mode: "bench",
			target,
			draft_id: draftId,
			status: "stopped",
			stoppedAt: stageId,
			error: started["error"],
			pass
		};
		const runId = started["run_id"];
		const outcome = await observeAndAttribute(request, draftId, stageId, runId, signal);
		pass.push({
			stage: stageId,
			card,
			run_id: runId,
			status: outcome.status,
			...outcome.url !== "" ? { url: outcome.url } : {},
			...outcome.artifacts.length > 0 ? { artifacts: outcome.artifacts } : {}
		});
		if (outcome.status === "queued") return {
			mode: "bench",
			target,
			draft_id: draftId,
			status: "pending",
			stoppedAt: stageId,
			run_id: runId,
			pass
		};
		if (outcome.status !== "done") return {
			mode: "bench",
			target,
			draft_id: draftId,
			status: "stopped",
			stoppedAt: stageId,
			run_id: runId,
			error: `stage ${stageId} (${card}) ended ${outcome.status}`,
			pass
		};
	}
	return {
		mode: "bench",
		target,
		draft_id: draftId,
		run_id: (() => {
			for (let i = pass.length - 1; i >= 0; i--) {
				const rid = pass[i]["run_id"];
				if (typeof rid === "string" && rid !== "") return rid;
			}
			return "";
		})(),
		status: "done",
		pass
	};
}
/** Signal-honoring sleep — the observer's poll cadence (the run-wire
*  cadence, 1500ms). */
function sleepAbort(ms, signal) {
	return new Promise((resolve) => {
		const t = setTimeout(resolve, ms);
		signal.addEventListener("abort", () => {
			clearTimeout(t);
			resolve();
		}, { once: true });
	});
}
/** THE OUTCOME OBSERVER, agent-side (observeRunOutcome's law, the
*  attribution half): poll the run to terminal, writing every flip
*  onto the stage row (runStatus + result) through the DRAFTS
*  stage-patch door — `/v1/flows/drafts/<draftId>/stages/<stageId>`
*  (THE SKIP-DONE HOLE, transcript-011's duplicate GPU runs, fixed
*  2026-09-24: the old arm posted runStatus/result to the BENCH
*  patch verb, whose law REFUSES run outcomes — "run outcomes ride
*  the drafts/patch door" — so every agent-side attribution was
*  refused and swallowed as bookkeeping; done marks never landed
*  and the next bench pass re-ran completed stages. The UI's
*  observer always used this door — that is why the user's Run All
*  skipped and the agent's never did). Patches remain bookkeeping —
*  a refusal is swallowed (the run's own outcome is the answer) —
*  but the door is now the one the law names, so the swallow only
*  ever sees transport, never a wired-in refusal. The url rides the
*  estate's media route: run-RELATIVE names prefix
*  /melite-media/runs/<runId>/, urls that carry a scheme or lead
*  with / pass verbatim (the ONE rewrite — the run-wire law,
*  mirrored). */
async function observeAndAttribute(request, draftId, stageId, runId, signal, budgetMs = OBSERVE_MAX_MS, rearms = 2) {
	const deadline = Date.now() + budgetMs;
	let lastLive = "";
	for (;;) {
		signal.throwIfAborted();
		let doc;
		try {
			doc = await request("GET", `/v1/flows/status/${encodeURIComponent(runId)}`, void 0, signal, TIMEOUT_MS$2);
		} catch (e) {
			const re = remoteErrorOf(e);
			if (re !== null && re !== void 0 && re.code === "runs/unknown-run") return {
				status: statusOf("unknown"),
				url: "",
				artifacts: []
			};
			await sleepAbort(1500, signal);
			continue;
		}
		const status = typeof doc["status"] === "string" ? doc["status"] : "unknown";
		if (isTerminalStatus(status)) {
			const stages = Array.isArray(doc["stages"]) ? doc["stages"].filter((s) => typeof s === "object" && s !== null) : [];
			const st = stages.find((s) => s["id"] === stageId) ?? (stages.length === 1 ? stages[0] : void 0);
			const toMediaUrl = (value) => {
				if (value === "") return "";
				const healed = canonicalRunMediaUrl(value);
				if (/^([a-z][a-z0-9+.-]*:|\/)/i.test(healed)) return healed;
				const relative = healed.startsWith(`${runId}/`) ? healed.slice(runId.length + 1) : healed;
				return `${RUN_MEDIA_PREFIX}/${encodeURIComponent(runId)}/${relative.split("/").map(encodeURIComponent).join("/")}`;
			};
			const url = toMediaUrl(st !== void 0 && typeof st["url"] === "string" && st["url"] !== "" ? st["url"] : "");
			const arts = [];
			const rawArts = doc["artifacts"];
			if (Array.isArray(rawArts)) for (const a of rawArts) {
				const p = typeof a === "string" ? a : typeof a?.["path"] === "string" ? a["path"] : "";
				if (p !== "") arts.push(p);
			}
			const names = [];
			const gallery = st !== void 0 && Array.isArray(st["gallery"]) ? st["gallery"].flatMap((entry) => {
				if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return [];
				const name = entry.name;
				return typeof name === "string" && name !== "" ? [name] : [];
			}) : [];
			for (const name of [...gallery, ...arts]) if (!names.includes(name)) names.push(name);
			const result = { run_id: runId };
			if (url !== "") result["url"] = url;
			const artifacts = {};
			const assetUrls = [];
			for (const name of names) {
				const mediaUrl = toMediaUrl(name);
				if (assetUrls.includes(mediaUrl)) continue;
				artifacts[name] = mediaUrl;
				assetUrls.push(mediaUrl);
			}
			if (url !== "" && !assetUrls.includes(url)) assetUrls.unshift(url);
			if (Object.keys(artifacts).length > 0) result["artifacts"] = artifacts;
			if (assetUrls.length > 0) result["assetUrls"] = assetUrls;
			const terminal = statusOf(status);
			try {
				await request("PATCH", `/v1/flows/drafts/${encodeURIComponent(draftId)}/stages/${encodeURIComponent(stageId)}`, {
					runStatus: terminal,
					result
				}, signal, DRAFT_TIMEOUT_MS);
			} catch {}
			return {
				status: terminal,
				url,
				artifacts: arts
			};
		}
		const foldedLive = statusOrPendingOf(status);
		const live = foldedLive === "queued" || foldedLive === "pending" ? "queued" : "running";
		if (live !== lastLive) {
			lastLive = live;
			try {
				await request("PATCH", `/v1/flows/drafts/${encodeURIComponent(draftId)}/stages/${encodeURIComponent(stageId)}`, {
					runStatus: live,
					result: { run_id: runId }
				}, signal, DRAFT_TIMEOUT_MS);
			} catch {}
		}
		if (Date.now() >= deadline) {
			if (rearms > 0) observeAndAttribute(request, draftId, stageId, runId, new AbortController().signal, budgetMs, rearms - 1).catch(String);
			return {
				status: "queued",
				url: "",
				artifacts: []
			};
		}
		await sleepAbort(1500, signal);
	}
}
/** SINGLE (the old card_run path, composed inside): manifest gate
*  + runnability gate + defaults merge, then draft + {model}. */
async function runSingle(request, a, signal) {
	const card = a.card;
	const model = a.model;
	if (!model) return {
		mode: "card",
		target: card,
		error: "model is required (name the family explicitly — QUEUE LANE LAW)"
	};
	const bag = { ...a.params };
	if (typeof a.prompt === "string" && a.prompt !== "") bag["prompt"] = a.prompt;
	const defs = await loadCardDefs();
	const resolved = resolveSpecKey(card, defs, boardedMap(defs));
	if (resolved === null) return {
		mode: "card",
		target: card,
		error: `unknown card '${card}' — name a registered card or family (melite_discover lists them); nothing was written to the bench`
	};
	const cardDef = defs.get(resolved.card);
	const normalizedBag = normalizeJsonArrayParams(bag, cardDef?.jsonArrayParams);
	const intent = card.length > 80 ? card.slice(0, 77) + "…" : card;
	let draftId;
	try {
		draftId = await loadBench(request, {
			session: a.bench,
			intent,
			stages: [{
				id: "s_0",
				card,
				engine: CARD_PLANE_ENGINE,
				params: normalizedBag
			}]
		}, signal);
	} catch (e) {
		return {
			mode: "card",
			target: card,
			error: e instanceof Error ? e.message : String(e)
		};
	}
	let benchStages = [];
	try {
		const row = await request("GET", `/v1/bench/${encodeURIComponent(a.bench)}`, void 0, signal, DRAFT_TIMEOUT_MS);
		if (row !== null && typeof row === "object" && Array.isArray(row["stages"])) benchStages = row["stages"].filter((st) => typeof st === "object" && st !== null);
	} catch {}
	if (benchStages.filter((st) => {
		const ins = st["inputs"];
		return typeof ins === "object" && ins !== null && !Array.isArray(ins) && Object.keys(ins).length > 0;
	}).length > 0) {
		const started = await startRun(request, {
			test: wireBool(a.test),
			draft_id: draftId
		}, signal);
		if (typeof started["error"] === "string") return {
			mode: "card",
			target: card,
			rode: "flow-arm (bench carries wiring — the wires ride as stage inputs)",
			...started
		};
		const runId = started["run_id"];
		if (typeof runId === "string" && runId !== "") observeAndAttribute(request, draftId, "s_0", runId, new AbortController().signal).catch(String);
		return {
			mode: "card",
			target: card,
			model,
			draft_id: draftId,
			rode: "flow-arm (bench carries wiring — the wires ride as stage inputs)",
			...started
		};
	}
	const started = await startRun(request, {
		...normalizedBag,
		model,
		test: wireBool(a.test),
		draft_id: draftId
	}, signal);
	if (typeof started["error"] === "string") return {
		mode: "card",
		target: card,
		...started
	};
	const runId = started["run_id"];
	if (typeof runId === "string" && runId !== "") observeAndAttribute(request, draftId, "s_0", runId, new AbortController().signal).catch(String);
	return {
		mode: "card",
		target: card,
		model,
		draft_id: draftId,
		...started
	};
}
/** TEMPLATE (the old flow_run path): drafts {flow,...} + start. */
async function runTemplate(request, a, signal) {
	const flow = a.flow;
	/* v8 ignore next -- hasFlow gate proves non-empty flow (2026-09-12) */
	if (!flow) return {
		mode: "flow",
		target: "",
		error: "flow is required (a discovered flow name)"
	};
	const overrides = a.params;
	let draftId;
	try {
		draftId = await loadBench(request, {
			session: a.bench,
			intent: flow,
			stages: [{
				id: "s_0",
				engine: CARD_PLANE_ENGINE,
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
		test: wireBool(a.test),
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
			error: e instanceof Error ? e.message : /* v8 ignore next -- foldConnects throws Error only: all six sites `new Error`, and property-access TypeErrors are Errors too (2026-09-12) */ String(e)
		};
	}
	const flowBody = {
		id: flowId,
		description: typeof a.description === "string" ? a.description : "",
		stages: folded.map((s) => ({
			id: s.id,
			engine: s.engine,
			description: s.description,
			...s.card !== "" ? { card: s.card } : {},
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
			session: a.bench,
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
		test: wireBool(a.test),
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
		description: "Execute through the serial GPU queue — the ONE execution verb. Exactly one per call: bench (run THE shared bench exactly as it stands — what the user's Run press runs) | card (a card id + model — single generation) | flow (a NAMED template from melite_load) | stages (engine-node stages on the fly: [{id, engine, params?, outputs?}] + optional connects — compiled at validate BEFORE any GPU is spent). Compositions LOAD the shared bench first (nothing mints fresh — one state, one log, one undo); every start rides the bench's doc-backed draft_id (CARD BIRTH LAW) — it rides the value as the chat tile handle, never an agent arg. Returns {run_id, draft_id}; poll with run_status. One active run machine-wide.",
		parameters: {
			bench: {
				type: "boolean",
				description: "BENCH mode: run THE shared bench exactly as it stands (what the user's Run press runs). A JSON boolean — true, never the string \"true\". Exclusive with card/flow/stages."
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
					additionalProperties: false,
					properties: {
						id: {
							type: "string",
							required: true,
							description: "The stage id (connects and run rows name it)."
						},
						engine: {
							type: "string",
							required: true,
							description: "The engine id (e.g. comfyui)."
						},
						card: {
							type: "string",
							description: "The card id the stage composes through — the card fold keeps it on the row so start's card gate fires (035 dead-route receipt)."
						},
						description: {
							type: "string",
							description: "What the stage produces."
						},
						params: {
							type: "object",
							additionalProperties: true,
							description: "Engine node params (open — the engine owns the keys)."
						},
						outputs: {
							type: "object",
							additionalProperties: true,
							description: "Output channels {name: kind}."
						}
					}
				},
				description: "AD-HOC mode: [{id, engine, description?, params?, outputs?: {name: kind}}]. Exclusive with card/flow."
			},
			connects: {
				type: "array",
				items: {
					type: "object",
					additionalProperties: false,
					properties: {
						from: {
							type: "string",
							required: true,
							description: "\"stage[.output]\" | \"initial.key\"."
						},
						to: {
							type: "string",
							required: true,
							description: "\"stage.input\"."
						},
						kind: {
							type: "string",
							description: "The wire kind when it cannot be derived."
						}
					}
				},
				description: "AD-HOC mode: [{from: \"stage[.output]\" | \"initial.key\", to: \"stage.input\", kind?}]."
			},
			prompt: {
				type: "string",
				description: "SINGLE mode ONLY: the generation prompt (wins over params.prompt). Card mode takes its text key (e.g. text) INSIDE params — top-level prompt on a card refuses as an unknown param."
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
						description: "The queue run id — poll with run_status(run_id). Absent on a pre-run refusal; PRESENT on a stopped-mid-flow refusal (a stage that ran and failed — render prints it after the error)."
					},
					draft_id: {
						type: "string",
						description: "The minted card draft id — the chat tile handle (?meliteCards=). Absent on refusal."
					},
					status: {
						type: "string",
						description: "The bench outcome: done | pending | stopped | queued | running. pending = the observation budget spent on a still-live run (the run continues on the queue — re-wait with run_status(run_id)); absent on refusal."
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
				if (v && typeof v.error === "string") {
					const ran = typeof v.run_id === "string" && v.run_id !== "" ? ` — run ${v.run_id} (poll with run_status)` : "";
					return [{
						type: "text",
						text: "melite_flow REFUSED: " + v.error + ran
					}];
				}
				const pass = v.pass;
				const passRows = Array.isArray(pass) ? pass.map((p) => "  · " + String(p["stage"] ?? "?") + " " + String(p["card"] ?? "?") + (typeof p["run_id"] === "string" && p["run_id"] !== "" ? " → " + p["run_id"] : "") + " [" + String(p["status"] ?? p["skipped"] ?? "?") + "]" + (typeof p["url"] === "string" && p["url"] !== "" ? " " + p["url"] : "")).join("\n") : "";
				return [{
					type: "text",
					text: "card " + String(v.draft_id ?? "?") + " · flow " + String(v.target ?? "?") + (typeof v.run_id === "string" && v.run_id !== "" ? " → " + v.run_id : "") + " [" + String(v.status ?? "queued") + "] — poll with run_status" + (passRows !== "" ? "\n" + passRows : "")
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
			const a = { ...unwrapItemArrays(args) };
			const bag = a.params && typeof a.params === "object" && !Array.isArray(a.params) ? a.params : {};
			const test = wireBool(a.test);
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
			const known = /* @__PURE__ */ new Set([
				"bench",
				"card",
				"model",
				"flow",
				"stages",
				"connects",
				"prompt",
				"params",
				"id",
				"description",
				"test"
			]);
			const stray = Object.keys(args).filter((k) => !known.has(k));
			if (stray.length > 0) return jsonClean({ error: "unknown melite_flow arg(s) " + JSON.stringify(stray) + " — card params (text, voice_name, qvoice, variant, …) ride INSIDE params, never top-level; top-level carries only bench | card (+model) | flow | stages (+connects/id/description/test)" });
			const bench = benchKeyOfExec(exec);
			try {
				if (hasBench) return jsonClean(await runBench(request, {
					test,
					bench
				}, exec.signal));
				if (hasFlow) return jsonClean(await runTemplate(request, {
					flow: a.flow,
					params: bag,
					test,
					bench
				}, exec.signal));
				if (hasCard) return jsonClean(await runSingle(request, {
					card: a.card,
					model: typeof a.model === "string" ? a.model : "",
					prompt: typeof a.prompt === "string" ? a.prompt : void 0,
					params: bag,
					test,
					bench
				}, exec.signal));
				return jsonClean(await runAdHoc(request, {
					stages: a.stages,
					connects: a.connects,
					id: a.id,
					description: typeof a.description === "string" ? a.description : void 0,
					test,
					bench
				}, exec.signal));
			} catch (e) {
				const re = remoteErrorOf(e);
				if (re !== null && re !== void 0) return jsonClean({
					error: re.message || "remote refused",
					mode: "bench",
					target: benchDraftIdOf(bench)
				});
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
* own HTTP port — no side processes, 2026-09-10) plus the
* Cordis provisioning and deployment legs — behind ONE action-dispatch tool. The SSOT is
* packages/harness/estate-queue/src/managePlane.ts (ACTIONS +
* HANDLERS + LIFECYCLE_GUARDED — the gateway doors row died with
* the app; the manage seat serves the same vocabulary in-process);
* this tool is its AI door (the manage seat, POST /v1/manage on
* browser mounts). The manual door is
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
	"endpoint_set",
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
function recordValue(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value) ? value : null;
}
function contractFields(data, envelope) {
	const fields = {};
	const sources = [recordValue(data), recordValue(envelope)];
	for (const source of sources) {
		if (source === null) continue;
		if (typeof source.operation_id === "string") fields.operation_id = source.operation_id;
		if (typeof source.status === "number") fields.status = source.status;
		if (typeof source.code === "string") fields.code = source.code;
		if (typeof source.state === "string") fields.state = source.state;
		if (typeof source.next_action === "string") fields.next_action = source.next_action;
		if (typeof source.restart_required === "boolean") fields.restart_required = source.restart_required;
		if (typeof source.partial === "boolean") fields.partial = source.partial;
		if (Array.isArray(source.items)) fields.items = source.items;
		if (Array.isArray(source.operations)) fields.operations = source.operations;
		if (Array.isArray(source.rows)) fields.rows = source.rows;
		if (Array.isArray(source.requested)) fields.requested = source.requested.filter((item) => typeof item === "string");
		if (Array.isArray(source.succeeded)) fields.succeeded = source.succeeded.filter((item) => typeof item === "string");
		if (Array.isArray(source.missed)) fields.missed = source.missed.filter((item) => typeof item === "string");
		if (Array.isArray(source.misses)) fields.misses = source.misses.filter((item) => typeof item === "string");
	}
	if (fields.state === "partial") fields.partial = true;
	if (Array.isArray(data) && fields.rows === void 0) fields.rows = data;
	return fields;
}
function asText(value) {
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	if (value === null || value === void 0) return "?";
	try {
		const encoded = JSON.stringify(value);
		return encoded === void 0 ? "?" : encoded;
	} catch {
		return "?";
	}
}
function rowText(value) {
	if (typeof value === "string") return value;
	const row = recordValue(value);
	if (row === null) return asText(value);
	const name = typeof row.name === "string" ? row.name : typeof row.id === "string" ? row.id : void 0;
	const key = typeof row.key === "string" ? row.key : void 0;
	const state = typeof row.state === "string" ? row.state : void 0;
	const outcome = typeof row.outcome === "string" ? row.outcome : void 0;
	const version = typeof row.version === "string" ? row.version : void 0;
	const filename = typeof row.filename === "string" ? row.filename : void 0;
	const path = typeof row.path === "string" ? row.path : void 0;
	const head = name ?? key ?? "row";
	const traits = [row.type, row.base].filter((item) => typeof item === "string" && item !== "");
	const tail = [
		version,
		filename,
		path,
		[state, outcome].filter((item, index, values) => typeof item === "string" && item !== "" && values.indexOf(item) === index).join("/")
	].filter((item) => typeof item === "string" && item !== "");
	return head + (traits.length > 0 ? " (" + traits.join(", ") + ")" : "") + (tail.length > 0 ? " — " + tail.join(" · ") : "");
}
function operationText(value) {
	const row = recordValue(value);
	if (row === null) return asText(value);
	const id = typeof row.operation_id === "string" ? row.operation_id : typeof row.id === "string" ? row.id : "?";
	const name = typeof row.name === "string" ? row.name : void 0;
	const state = typeof row.state === "string" ? row.state : typeof row.outcome === "string" ? row.outcome : "unknown";
	const outcome = typeof row.outcome === "string" && row.outcome !== state ? " · " + row.outcome : "";
	const path = typeof row.path === "string" ? row.path : void 0;
	return "operation " + id + (name === void 0 ? "" : " · " + name) + " · " + state + outcome + (path === void 0 ? "" : " · " + path);
}
function statusText(data) {
	const value = recordValue(data);
	if (value === null) return [];
	const endpoint = recordValue(value.endpoint);
	const manager = recordValue(value.manager);
	const out = [];
	if (typeof value.state === "string") out.push("state: " + value.state);
	if (endpoint !== null) {
		out.push("endpoint: " + String(endpoint.reachable === true ? "reachable" : "not reachable") + (typeof endpoint.url === "string" ? " · " + endpoint.url : ""));
		if (typeof endpoint.comfyui_version === "string") out.push("comfyui: " + endpoint.comfyui_version);
	}
	if (manager !== null) {
		const version = manager.version === void 0 ? "" : " · " + asText(manager.version);
		const queue = manager.queue === void 0 ? "" : " · queue " + asText(manager.queue);
		const security = typeof manager.security === "string" ? " · security " + manager.security : "";
		const reason = typeof manager.reason === "string" ? " · " + manager.reason : "";
		out.push("manager: " + (manager.reachable === true ? "reachable" : "unavailable") + version + queue + security + reason);
	}
	if (value.routing !== void 0) out.push("routing: " + asText(value.routing));
	if (Array.isArray(value.active_runs)) out.push("active_runs: " + value.active_runs.map(asText).join(", "));
	if (Array.isArray(value.resources)) for (const resource of value.resources.slice(0, 20)) {
		const row = recordValue(resource);
		if (row === null) continue;
		const ref = recordValue(row.ref);
		const label = ref === null ? "resource" : [
			ref.kind,
			ref.owner,
			ref.id
		].filter((item) => typeof item === "string").join("/");
		out.push("resource: " + label + " · " + asText(row.state));
	}
	const operations = Array.isArray(value.operations) ? value.operations : manager !== null && Array.isArray(manager.operations) ? manager.operations : [];
	for (const operation of operations.slice(0, 20)) out.push(operationText(operation));
	if (typeof value.resources_detail === "string") out.push("resource_status: " + value.resources_detail);
	return out;
}
function actionRows(action, data, rows) {
	const nested = recordValue(data);
	const nestedRows = nested === null ? void 0 : [
		nested.rows,
		nested.items,
		nested.lines
	].find((candidate) => Array.isArray(candidate));
	const values = Array.isArray(rows) ? rows : Array.isArray(data) ? data : Array.isArray(nestedRows) ? nestedRows : [];
	if (action === "logs") return values.slice(0, 200).map((row) => typeof row === "string" ? row : rowText(row));
	if (values.length === 0) return ["rows: none"];
	return ["rows:", ...values.slice(0, 50).map((row) => "  " + rowText(row))];
}
function inferredNext(action, data) {
	const value = recordValue(data);
	if (value !== null && typeof value.next_action === "string") return value.next_action;
	if (action === "status") return "status";
	if (action === "list_extensions") return "install_extension";
	if (action === "snapshot_list") return "snapshot_save";
	if (value !== null && value.state === "restart_required") return "restart";
}
function renderManage(_args, value) {
	const result = recordValue(value);
	const action = typeof result?.action === "string" ? result.action : "?";
	const detail = typeof result?.detail === "string" ? result.detail : "";
	const data = result?.data;
	const first = "comfy_manage " + action + ": " + detail;
	const lines = [first];
	if (result === null) return [{
		type: "text",
		text: first
	}];
	if (result.ok !== true) {
		lines.push("REFUSED: " + (typeof result.code === "string" ? result.code : "manage/refused") + (typeof result.status === "number" ? " · status " + String(result.status) : ""));
		if (typeof result.error === "string" && result.error !== detail) lines.push("error: " + result.error);
	}
	if (action === "status") lines.push(...statusText(data));
	else if (action === "logs" || action === "search_models" || action === "list_extensions" || action === "snapshot_list") lines.push(...actionRows(action, data, result.rows));
	else if (result.state !== void 0 || result.items !== void 0 || result.operations !== void 0 || result.operation_id !== void 0) {
		if (typeof result.state === "string") lines.push("state: " + result.state);
		if (typeof result.operation_id === "string") lines.push("operation: " + result.operation_id);
		if (Array.isArray(result.requested)) lines.push("requested: " + result.requested.join(", "));
		if (Array.isArray(result.succeeded)) lines.push("succeeded: " + result.succeeded.join(", "));
		if (Array.isArray(result.missed)) lines.push("missed: " + result.missed.join(", "));
		if (Array.isArray(result.misses)) lines.push("misses: " + result.misses.join(", "));
		if (Array.isArray(result.items)) for (const item of result.items.slice(0, 50)) lines.push("item: " + rowText(item));
		if (Array.isArray(result.operations)) for (const operation of result.operations.slice(0, 20)) lines.push(operationText(operation));
	} else if (data !== void 0 && data !== null) lines.push("data: " + asText(data));
	const next = typeof result.next_action === "string" ? result.next_action : inferredNext(action, data);
	if (next !== void 0 && next !== "") lines.push("next_action: " + next);
	return [{
		type: "text",
		text: lines.join("\n")
	}];
}
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
		description: "managed workspace only), snapshot_list / snapshot_save / snapshot_restore (environment snapshots; restore is refused while runs are active); endpoint_set (point at a different ComfyUI server url — validate-first: an unreachable url is refused, never written); install_extension (registry ids), install_extension_url (git url), download_model (url), provision_model (declared model id from melite_load; Manager search results are external-catalog rows, not provision ids); restart, stop, launch, update (target comfy), switch_version, free. INFRA UPKEEP only — it never runs inference, and lifecycle actions are refused while runs are active (stop them or pass force).",
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
				description: "install_extension_url / download_model / endpoint_set: the git URL, file URL, or ComfyUI server URL."
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
				description: "provision_model: declared model id from melite_load (e.g. \"z-image\"); Manager search rows are not provision ids."
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
						description: "The refusal text — present exactly when the tool refused."
					},
					status: {
						type: "number",
						description: "Structured refusal status returned by the manage seat."
					},
					code: {
						type: "string",
						description: "Structured refusal code returned by the manage seat."
					},
					operation_id: {
						type: "string",
						description: "Provisioning operation correlation id when the manage seat returned one."
					},
					state: {
						type: "string",
						description: "Provisioning or status state."
					},
					next_action: {
						type: "string",
						description: "The next existing manage action to take."
					},
					restart_required: {
						type: "boolean",
						description: "Whether ComfyUI must restart before the result is active."
					},
					partial: {
						type: "boolean",
						description: "True when some requested resources succeeded and others did not."
					},
					items: {
						type: "array",
						description: "Per-resource provisioning item results."
					},
					operations: {
						type: "array",
						description: "Operation rows correlated to the returned resource results."
					},
					rows: {
						type: "array",
						description: "Rows returned by a read action."
					},
					requested: {
						type: "array",
						items: { type: "string" },
						description: "Requested resource ids."
					},
					succeeded: {
						type: "array",
						items: { type: "string" },
						description: "Resource ids whose requested work succeeded."
					},
					missed: {
						type: "array",
						items: { type: "string" },
						description: "Resource ids that did not succeed."
					},
					misses: {
						type: "array",
						items: { type: "string" },
						description: "Per-resource failure details for missed ids."
					}
				}
			},
			render: renderManage
		},
		async execute(args, exec) {
			const a = args;
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
				action: String(a.action),
				detail: "comfy_manage miswire: no execution context signal — the host runtime must pass exec",
				error: "comfy_manage miswire: no execution context signal",
				code: "manage/miswire",
				status: 500
			});
			try {
				res = await request("POST", "/v1/manage", body, exec.signal, MANAGE_TIMEOUT_MS);
			} catch (e) {
				const re = remoteErrorOf(e);
				if (re !== null && re !== void 0 && re.code === "manage/refused") {
					const d = re.details ?? {};
					if (typeof d.action === "string") {
						const fields = contractFields(d.data);
						if (typeof d.status === "number") fields.status = d.status;
						fields.code = typeof d.code === "string" ? d.code : re.code;
						return jsonClean({
							ok: false,
							action: d.action,
							detail: re.message,
							error: re.message,
							data: d.data ?? null,
							...fields
						});
					}
				}
				throw e;
			}
			const response = recordValue(res) ?? {};
			const action = typeof response.action === "string" ? response.action : String(a.action);
			const detail = typeof response.detail === "string" ? response.detail : "";
			const fields = contractFields(response.data, response);
			if (typeof response.status === "number") fields.status = response.status;
			if (typeof response.code === "string") fields.code = response.code;
			const partialMiss = fields.partial === true || fields.state === "partial" || Array.isArray(fields.missed) && fields.missed.length > 0;
			const ok = response.ok === true && !partialMiss;
			return jsonClean({
				ok,
				action,
				detail,
				...ok ? {} : { error: detail },
				data: res.data ?? null,
				...fields
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
		description: "Progressive disclosure tier 1 over the estate (cards + flows): returns clamped summary LINES, never bodies. THE EXPANSION LAW: the estate’s deeper doors (melite_view, comfy_manage, melite_skill_index, melite_skill_read, ledger_tail) seat themselves the first time you touch the catalog — they are never missing, only deferred. q matches names/titles/descriptions LITERALLY (a full user sentence matches nothing) — for a MODALITY ask (video, image, audio, 3d) search tags= first, q second. Args: lookup (all | cards | flows, default all) + tags (comma-separated card-declared tags, e.g. \"image,upscale\") + optional q (free-text filter). Prefer a FLOW when one fits the task — composition over single calls; fall back to cards. COUNTS-FIRST: a large estate clamps to counts + the tag vocabulary + the first rows; detail=true for every line. Open a line with melite_load (agents md + signature + skill lines).",
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
			render: (args, value) => {
				const v = value;
				if (v && typeof v.error === "string") return [{
					type: "text",
					text: "melite_discover REFUSED: " + v.error
				}];
				const wantsAll = args?.detail === true;
				const RENDER_CLAMP = wantsAll ? Number.POSITIVE_INFINITY : 8;
				const flows = Array.isArray(v?.flows) ? v.flows : [];
				const cards = Array.isArray(v?.cards) ? v.cards : [];
				const nf = typeof v?.counts?.flows === "number" ? v.counts.flows : flows.length;
				const nc = typeof v?.counts?.cards === "number" ? v.counts.cards : cards.length;
				const line = (x) => typeof x === "string" ? x : "";
				const num = (x) => typeof x === "number" ? String(x) : "?";
				const out = [`discover: ${nf} flows, ${nc} cards in the estate CATALOG (not your bench — read the bench's staged cards with melite_construct verb=read) — open one with melite_load`];
				if (flows.length === 0 && cards.length === 0) out.push("no match. q matches names/titles/descriptions LITERALLY — a full sentence rarely hits. Retry with tags= (video, image, audio, 3d, generate, edit) for the MODALITY, or lookup=all for the estate-wide first pass.");
				if (flows.length > 0) {
					out.push("flows:");
					for (const f of flows.slice(0, RENDER_CLAMP)) out.push(`  ${line(f?.name)} — ${line(f?.title)} (${num(f?.stages)} stages)`);
					if (!wantsAll && nf > RENDER_CLAMP) out.push(`  +${nf - RENDER_CLAMP} more — detail=true lists every line`);
				}
				if (cards.length > 0) {
					out.push("cards:");
					for (const c of cards.slice(0, RENDER_CLAMP)) {
						const tags = Array.isArray(c?.tags) ? c.tags.filter((t) => typeof t === "string") : [];
						out.push(`  ${line(c?.id)} — ${line(c?.label)}${tags.length > 0 ? ` [${tags.join(",")}]` : ""}`);
					}
					if (!wantsAll && nc > RENDER_CLAMP) out.push(`  +${nc - RENDER_CLAMP} more — narrow with tags/q, or detail=true`);
				}
				if (Array.isArray(v?.tag_vocabulary)) {
					const vocab = v.tag_vocabulary.filter((t) => typeof t === "string");
					if (vocab.length > 0) out.push("tag vocabulary: " + vocab.join(", "));
				}
				if (typeof v?.hint === "string" && v.hint !== "") out.push("hint: " + v.hint);
				return [{
					type: "text",
					text: out.join("\n")
				}];
			}
		},
		async execute(args, exec) {
			expandEstateDoors();
			const a = args;
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
				if (flows.length === 0 && cards.length === 0) {
					if ((typeof a.tags === "string" ? a.tags.split(",").filter((t) => t.trim() !== "").length : 0) > 1) return jsonClean({
						counts: {
							flows: 0,
							cards: 0
						},
						hint: "0 rows — tags is an AND: a card must carry EVERY listed tag. One tag per search (e.g. tags=video), or detail the vocabulary with lookup=cards."
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
function meliteLoad(request, opts = {}) {
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
		description: "Open ONE card or flow (discover it first with melite_discover). Args: name (the card id or flow name) +  THE EXPANSION LAW: the estate’s deeper doors (melite_view, comfy_manage, melite_skill_index, melite_skill_read, ledger_tail) seat themselves on this call — never missing, only deferred.inference_type (card | flow — a card or a flow tool call; nothing else executes). Returns the bundle: agents md, the tool-call signature (params_schema for cards; the prebuilt simplified signature for flows), tier-1 skill lines for the underlying skills (bodies load via melite_skill_read — write the prompts yourself from the craft you read), model hints on cards (the boarded families' DECL identity — id/label/description, each marked present:true|false: present means downloaded on this machine; absent-but-boarded models are OFFERED — prompt the user to download, or provision via comfy_manage provision_model) + pack hints (the card's declared ComfyUI extension packs, marked present:true|false|null — missing packs refuse the run: install via comfy_manage install_extension), and a stable bundle digest — quote it and skip reload on a match.",
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
				const str = (x) => typeof x === "string" ? x : "";
				const next = opts.headless === true ? "open with melite_flow" : str(b.kind) === "flow" ? "it is a flow, not a card — drive it through the run doors; its card stages may also be benched with melite_construct (add_stage), and its family.action stages compose when the flow runs" : "compose it with melite_construct (add_stage) — the bench state is live in the user's cards tab; keep editing it there; runs start at the user's Run press";
				const out = [`loaded ${str(b.kind) || "?"} ${str(b.name) || "?"} — ${next}`];
				const hints = Array.isArray(b.model_hints) ? b.model_hints : [];
				if (hints.length > 0) {
					const present = hints.filter((h) => h?.present === true).length;
					out.push(`weights: ${present}/${hints.length} boarded checkpoints present on this machine (provisioning is the estate's business — compose the card)`);
				}
				const sig = b.signature;
				if (sig !== null && sig !== void 0) {
					const props = sig.params_schema?.properties;
					const keys = props !== void 0 && props !== null ? Object.keys(props) : [];
					const req = Array.isArray(sig.params_schema?.required) ? sig.params_schema.required.filter((r) => typeof r === "string") : [];
					if (keys.length > 0) {
						const marked = keys.map((k) => req.includes(k) ? k + "*" : k);
						out.push("params: " + marked.join(", ") + " (* required)");
					}
					const mods = Array.isArray(sig?.modifiers) ? sig.modifiers : [];
					const packSeats = familyPackSeats(Array.isArray(b.model_hints) ? b.model_hints : [], new Set(mods.map((m) => str(m?.kind))));
					const modLines = mods.map((m) => {
						const kind = str(m?.kind) || "?";
						const cat = str(m?.category) || "ordered";
						const fs = Array.isArray(m?.fields) ? m.fields.filter((f) => typeof f === "string") : [];
						return kind + "[] (" + cat + (fs.length ? "; fields: " + fs.join(", ") : "") + ")";
					});
					for (const p of packSeats) modLines.push(p.kind + "[] (" + p.cardinality + "; fields: " + p.fields.join(", ") + ")");
					if (modLines.length > 0) {
						out.push("mods: " + modLines.join(", ") + " — THE BENCH GRAMMAR (melite_construct add_stage/patch, where you compose): mod FIELDS ride FLAT inside params (e.g. params {voice_name, qvoice}) — never keyed under the pack name, never at flow top-level. A pack key (e.g. qvoice_save) as a params key REFUSES at the compose door: the pack takes no key of its own, its fields ride flat top-level; card-mode lane select: `variant`/`quant` ride INSIDE params (e.g. params {variant: 'customvoice'}) while `model` rides top-level — the compose reads them off the body, the engine never sees them; bag-mode arrays under the kind keys exist ONLY for flow_inline/ad-hoc stages (melite_flow {flow}, never the bench) — ordered kinds stack in array order, standalone kinds each provide their own output (the bag lives at param_key when it differs)");
						const keyed = packSeats.filter((p) => p.param_key !== p.kind);
						if (keyed.length > 0) out.push("mod param_keys: " + keyed.map((p) => p.kind + " → " + p.param_key + " (entries: {" + p.fields.join(", ") + "})").join("; "));
					}
					const lawWords = (rel, bounds) => {
						const words = [];
						for (const r of rel?.requires ?? []) {
							const needs = Array.isArray(r?.needs) ? r.needs : [];
							words.push("requires(" + String(r?.field) + " → " + needs.join(", ") + ")");
						}
						for (const t of rel?.together ?? []) if (Array.isArray(t?.fields)) words.push("together(" + t.fields.join(" × ") + ")");
						for (const c of rel?.conflicts ?? []) words.push("conflicts(" + String(c?.a) + " × " + String(c?.b) + ")");
						for (const e of rel?.either_or ?? []) if (Array.isArray(e?.groups)) words.push("either_or(" + e.groups.map((g) => "(" + g.join(" × ") + ")").join(" | ") + ")");
						for (const r of rel?.required ?? []) {
							if (!Array.isArray(r?.fields) || r.fields.length === 0) continue;
							words.push(r.any_of === true ? "required-one-of(" + r.fields.join(" | ") + ")" : "required(" + r.fields.join(", ") + ")");
						}
						for (const m of rel?.at_most_one ?? []) if (Array.isArray(m?.fields) && m.fields.length > 0) words.push("at_most_one(" + m.fields.join(" | ") + ")");
						if (bounds !== null && bounds !== void 0 && typeof bounds === "object") {
							const spans = Object.entries(bounds).map(([k, bb]) => k + " " + String(bb?.min ?? "..") + "…" + String(bb?.max ?? ".."));
							if (spans.length > 0) words.push("bounds(" + spans.join(", ") + ")");
						}
						return words;
					};
					const sigLanes = sig.lanes;
					if (sigLanes !== null && sigLanes !== void 0 && typeof sigLanes === "object") for (const [fam, lane] of Object.entries(sigLanes)) {
						const base = Array.isArray(lane?.base) ? lane.base.filter((f) => typeof f === "string") : [];
						const adds = Object.entries(lane?.variants ?? {}).map(([v, row]) => {
							const params = Array.isArray(row?.params) ? row.params.join(", ") : "";
							const vlaws = lawWords(row?.relations, row?.bounds);
							let line = v + (params !== "" ? " +" + params : "");
							if (vlaws.length > 0) line += " [" + vlaws.join(", ") + "]";
							return line;
						}).filter((line) => line !== "");
						const words = lawWords(lane?.relations, lane?.bounds);
						out.push("lane " + fam + ": " + (base.length > 0 ? "base " + base.join(", ") : "no declared base") + (adds.length > 0 ? "; variants: " + adds.join("; ") : "") + (words.length > 0 ? "; laws: " + words.join(", ") : "") + " — a field outside this lane REFUSES at the bench door (add_stage/patch), named, with the cure");
					}
					const model = str(sig.model);
					if (model !== "") out.push("signature model: " + model);
				}
				const stages = Array.isArray(b.stages) ? b.stages : [];
				if (stages.length > 0) out.push("stages: " + stages.map((s) => `${str(s?.id)}:${str(s?.card)}`).join(" → "));
				const skills = Array.isArray(b.skills) ? b.skills : [];
				if (skills.length > 0) {
					const names = skills.slice(0, 8).map((s) => {
						const id = str(s?.id) !== "" ? str(s?.id) : str(s?.ref);
						const desc = str(s?.description);
						return desc !== "" ? `${id} — ${desc}` : id;
					});
					out.push(`skills: ${skills.length} — read one with melite_skill_read: ${names.join(", ")}${skills.length > 8 ? " …" : ""}`);
					if (skills.some((s) => /prompt-enhance/.test(str(s?.id)))) out.push("prompting: read the per-model prompt rules with melite_skill_read BEFORE writing a prompt — every model wants a different style (comma tags for the anime models, prose for others)");
				}
				const digest = str(b.digest);
				if (digest !== "") out.push("digest: " + digest + " (quote it to skip a reload)");
				const docs = Array.isArray(b.agents) ? b.agents : [];
				if (docs.length > 0) {
					out.push("agents md:");
					for (const d of docs) out.push(str(d?.text));
				}
				return [{
					type: "text",
					text: out.join("\n")
				}];
			}
		},
		async execute(args, exec) {
			expandEstateDoors();
			const a = args;
			const name = a.name;
			const inferenceType = a.inference_type;
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
				return jsonClean({
					...await request("GET", "/v1/load?" + params.toString(), void 0, exec.signal, TIMEOUT_MS) ?? {},
					name,
					inference_type: inferenceType
				});
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
/** THE FAMILY-PACK SEATS (022's self-critique #3): the grammar of
*  every modifier pack the card's boarded families DECL-board, read
*  off the ONE grammar table (MODIFIER_PACKS — the form-spec's own)
*  with field names off the engine's registered pack contract (the
*  service read, never a re-derivation). Kinds the card itself
*  declares are skipped (dedupe — the signature already serves
*  them). A registry/service miss drops the family quietly here:
*  the compose door still refuses loud on a bad bag, and the
*  signature's own kinds were never at risk. */
function familyPackSeats(hints, servedKinds) {
	const out = [];
	const seen = new Set(servedKinds);
	let svc = null;
	try {
		svc = theService();
	} catch {
		svc = null;
	}
	for (const h of hints) {
		const fam = typeof h?.id === "string" ? h.id : "";
		if (fam === "") continue;
		let packs = [];
		try {
			const raw = registryModel(fam)?.mods;
			if (Array.isArray(raw)) packs = raw.map((m) => typeof m === "string" ? m : typeof m?.pack === "string" ? m.pack : "").filter((p) => p !== "");
		} catch {
			continue;
		}
		for (const pack of packs) {
			const meta = MODIFIER_PACKS[pack];
			if (meta === void 0 || seen.has(meta.kind)) continue;
			seen.add(meta.kind);
			const fields = svc !== null ? svc.packFieldNames(pack) : [];
			if (fields.length === 0) continue;
			out.push({
				kind: meta.kind,
				param_key: meta.param_key ?? pack,
				fields,
				cardinality: meta.cardinality
			});
		}
	}
	return out;
}
//#endregion
//#region src/tools/mp4Probe.ts
const text = (bytes) => String.fromCharCode(...bytes);
/** A cursor over the whole file. Every read is bounds-checked and
*  returns a "not there" rather than throwing: a truncated or hostile
*  file must produce a partial row, never a crash. */
var Reader = class {
	at = 0;
	b;
	constructor(bytes) {
		this.b = bytes;
	}
	get pos() {
		return this.at;
	}
	seek(to) {
		this.at = to;
	}
	skip(n) {
		this.at += n;
	}
	get left() {
		return this.b.length - this.at;
	}
	u16() {
		return this.num(2);
	}
	u8() {
		return this.num(1);
	}
	u32() {
		return this.num(4);
	}
	/** RIFF/WAV header fields are LITTLE-endian (ISO-BMFF boxes are
	*  big-endian, which is why both spellings live here). */
	le16() {
		if (this.at + 2 > this.b.length) return void 0;
		const v = this.b[this.at] + this.b[this.at + 1] * 256;
		this.at += 2;
		return v;
	}
	le32() {
		if (this.at + 4 > this.b.length) return void 0;
		const v = this.b[this.at] + this.b[this.at + 1] * 256 + this.b[this.at + 2] * 65536 + this.b[this.at + 3] * 16777216;
		this.at += 4;
		return v;
	}
	u64() {
		const hi = this.num(4);
		const lo = this.num(4);
		if (hi === void 0 || lo === void 0) return void 0;
		const v = hi * 4294967296 + lo;
		return Number.isSafeInteger(v) ? v : void 0;
	}
	num(size) {
		if (this.at + size > this.b.length) return void 0;
		let v = 0;
		for (let i = 0; i < size; i++) v = v * 256 + this.b[this.at + i];
		this.at += size;
		return v;
	}
	bytes(n) {
		if (this.at + n > this.b.length) return void 0;
		const out = this.b.subarray(this.at, this.at + n);
		this.at += n;
		return out;
	}
	fourcc() {
		const b = this.bytes(4);
		return b === void 0 ? void 0 : text(b);
	}
	/** 16.16 / 2.30 fixed point (tkhd width/height). */
	fixed() {
		const v = this.num(4);
		return v === void 0 ? void 0 : Math.round(v / 65536);
	}
};
/** The box walker: yield every (type, payload) box under a parent. */
function* boxes(b, start, end) {
	const r = new Reader(b);
	r.seek(start);
	while (r.left > 0) {
		const boxStart = r.pos;
		let size = r.u32();
		const type = r.fourcc();
		if (type === void 0) return;
		if (size === 1) {
			const big = r.u64();
			if (big === void 0) return;
			size = big;
		} else if (size === 0) size = end - boxStart;
		if (size === void 0 || size < 8 || boxStart + size > end) return;
		yield {
			type,
			body: b.subarray(boxStart + 8, boxStart + size)
		};
		r.seek(boxStart + size);
	}
}
const find = (it, type) => {
	for (const x of it) if (x.type === type) return x;
};
/** The sample-entry fourcc → the codec NAME a caller routes on. This
*  is the row `ffprobe` published, so removing the binary changes no
*  published value: avc1 is the entry, h264 is the profile. */
const CODEC_NAMES = {
	avc1: "h264",
	avc3: "h264",
	hvc1: "hevc",
	hev1: "hevc",
	vp09: "vp9",
	av01: "av1",
	mp4a: "aac",
	"ac-3": "ac3",
	"ec-3": "eac3",
	Opus: "opus",
	alac: "alac",
	mjpeg: "mjpeg",
	png: "png",
	mjpa: "mjpeg"
};
function codecNameOf(fourcc) {
	return CODEC_NAMES[fourcc] ?? fourcc;
}
/** avc1 → avc, mp4a → aac, pcm_s16le stays. The family is what a
*  caller routes on; the exact tag rides along in `codec`. */
function family(codec) {
	if ([
		"avc1",
		"avc3",
		"hvc1",
		"hev1",
		"vp09",
		"av01",
		"mjpeg",
		"png "
	].includes(codec)) return "video";
	if ([
		"mp4a",
		"ac-3",
		"ec-3",
		"Opus",
		"alac",
		"sowt",
		"lpcm",
		"ulaw",
		"alaw"
	].includes(codec)) return "audio";
}
function probeStsd(stsd) {
	const r = new Reader(stsd);
	r.skip(4);
	const count = r.u32();
	const out = {};
	if (count === void 0 || count < 1) return out;
	const first = [...boxes(stsd, r.pos, stsd.length)][0];
	if (first === void 0) return out;
	out.codec = first.type;
	const e = new Reader(first.body);
	e.skip(6);
	e.u16();
	if (family(first.type) === "video") {
		e.skip(16);
		out.width = e.u16();
		out.height = e.u16();
	} else {
		e.skip(8);
		out.channels = e.u16();
		e.skip(2);
		e.skip(4);
		out.sample_rate = e.u32();
		if (out.sample_rate !== void 0) out.sample_rate = Math.round(out.sample_rate / 65536);
	}
	return out;
}
/** stts: the sample table — count/delta pairs. The count is the
*  track's sample (frame) count. The rate is samples-per-SECOND, so
*  the track's mdhd TIMESCALE is required: `count / delta` alone is
*  samples per timescale unit, which is not a frame rate. */
function probeStts(stts, timescale) {
	const r = new Reader(stts);
	r.skip(4);
	const n = r.u32();
	if (n === void 0 || n < 1) return {};
	let total = 0;
	let ticks = 0;
	const deltas = /* @__PURE__ */ new Set();
	for (let i = 0; i < n; i++) {
		const count = r.u32();
		const delta = r.u32();
		if (count === void 0 || delta === void 0) break;
		total += count;
		ticks += count * delta;
		deltas.add(delta);
	}
	const out = {};
	if (total > 0) out.frames = total;
	if (deltas.size === 1 && timescale !== void 0 && timescale > 0 && ticks > 0) {
		const num = total * timescale;
		const den = ticks;
		const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
		const g = gcd(num, den);
		out.fps = String(Math.round(num / g)) + "/" + String(Math.round(den / g));
	}
	return out;
}
/** mdhd: the track's media timescale (the unit every delta counts in). */
function probeMdhd(mdhd) {
	const r = new Reader(mdhd);
	const version = r.u8();
	r.skip(3);
	if (version === 1) r.skip(16);
	else r.skip(8);
	return r.u32();
}
function probeTrak(trak) {
	const parts = [...boxes(trak, 0, trak.length)];
	const tkhd = find(parts, "tkhd");
	const mdia = find(parts, "mdia");
	if (mdia === void 0) return void 0;
	const mparts = [...boxes(mdia.body, 0, mdia.body.length)];
	const hdlr = find(mparts, "hdlr");
	const mdhd = find(mparts, "mdhd");
	const minf = find(mparts, "minf");
	let kind;
	if (hdlr !== void 0) {
		const hr = new Reader(hdlr.body);
		hr.skip(8);
		const handler = hr.fourcc();
		if (handler === "vide") kind = "video";
		else if (handler === "soun") kind = "audio";
	}
	let stsd = {};
	let stts = {};
	if (minf !== void 0) {
		const stbl = find([...boxes(minf.body, 0, minf.body.length)], "stbl");
		if (stbl !== void 0) {
			const sstsd = find([...boxes(stbl.body, 0, stbl.body.length)], "stsd");
			if (sstsd !== void 0) stsd = probeStsd(sstsd.body);
			const sstts = find([...boxes(stbl.body, 0, stbl.body.length)], "stts");
			if (sstts !== void 0) stts = probeStts(sstts.body, mdhd === void 0 ? void 0 : probeMdhd(mdhd.body));
		}
	}
	if (kind === void 0 && stsd.codec !== void 0) kind = family(stsd.codec);
	if (kind === void 0 && stsd.codec === void 0) return void 0;
	const stream = { codec: stsd.codec === void 0 ? "unknown" : codecNameOf(stsd.codec) };
	if (kind !== void 0) stream.codec_type = kind;
	if (kind === "video") {
		if (stsd.width !== void 0) stream.width = stsd.width;
		if (stsd.height !== void 0) stream.height = stsd.height;
		if (stts.fps !== void 0) stream.fps = stts.fps;
		if (stts.frames !== void 0) stream.frames = stts.frames;
		if (stream.width === void 0 || stream.height === void 0) {
			if (tkhd !== void 0) {
				const tr = new Reader(tkhd.body);
				const version = tr.u32();
				tr.skip(version === 1 ? 16 : 8);
				tr.skip(12);
				tr.skip(8);
				tr.skip(8);
				tr.skip(36);
				const w = tr.fixed();
				const h = tr.fixed();
				if (stream.width === void 0 && w !== void 0 && w > 0) stream.width = w;
				if (stream.height === void 0 && h !== void 0 && h > 0) stream.height = h;
			}
		}
	} else {
		if (stsd.sample_rate !== void 0) stream.sample_rate = stsd.sample_rate;
		if (stsd.channels !== void 0) stream.channels = stsd.channels;
	}
	return stream;
}
/** THE MP4/MOV PROBE. */
function probeMp4(bytes) {
	const out = {
		size_bytes: bytes.byteLength,
		streams: []
	};
	const moov = find([...boxes(bytes, 0, bytes.length)], "moov");
	if (moov === void 0) throw new Error("the media probe found no streams — the file may be truncated or corrupt");
	const parts = [...boxes(moov.body, 0, moov.body.length)];
	const mvhd = find(parts, "mvhd");
	if (mvhd !== void 0) {
		const r = new Reader(mvhd.body);
		const version = r.u8();
		r.skip(3);
		const wide = version === 1;
		if (version === 0 || wide) {
			r.skip(wide ? 16 : 8);
			const timescale = r.u32();
			const duration = wide ? r.u64() : r.u32();
			if (timescale !== void 0 && timescale > 0 && duration !== void 0) out.duration_s = Math.round(duration / timescale * 1e6) / 1e6;
		}
	}
	for (const trak of parts) {
		if (trak.type !== "trak") continue;
		const stream = probeTrak(trak.body);
		if (stream !== void 0) out.streams.push(stream);
	}
	if (out.streams.length === 0) throw new Error("the media probe found no streams — the file may be truncated or corrupt");
	return out;
}
/** WAV's codec NAME, as ffprobe published it.
*
*  The PCM names are derived from the BIT DEPTH, not the format tag:
*  a 16-bit integer and a 32-bit float both ride `wFormatTag` 1 vs 3,
*  and ffprobe reported `pcm_s16le` / `pcm_f32le` — never a name with
*  the depth glued on the end (`pcm_s16le16`, which is not a codec
*  anything else on earth can decode). 2026-09-25. */
function wavCodecName(format, bits) {
	const b = bits ?? 0;
	if (b === 0 && (format === 1 || format === 3)) return format === 1 ? "pcm" : "pcm_float";
	if (format === 1) {
		if (b === 8) return "pcm_u8";
		if (b === 16) return "pcm_s16le";
		if (b === 24) return "pcm_s24le";
		if (b === 32) return "pcm_s32le";
		if (b === 64) return "pcm_s64le";
		return "pcm_s" + String(b) + "le";
	}
	if (format === 3) {
		if (b === 32) return "pcm_f32le";
		if (b === 64) return "pcm_f64le";
		return "pcm_f" + String(b) + "le";
	}
	if (format === 6) return "pcm_alaw";
	if (format === 7) return "pcm_mulaw";
	if (format === 65534) return "wav_ext";
	return "format-" + String(format);
}
/** THE RIFF/WAV PROBE. */
function probeWav(bytes) {
	const out = {
		size_bytes: bytes.byteLength,
		streams: []
	};
	if (bytes.byteLength < 12 || text(bytes.subarray(0, 4)) !== "RIFF" || text(bytes.subarray(8, 12)) !== "WAVE") throw new Error("the media probe found no streams — the file may be truncated or corrupt");
	const r = new Reader(bytes);
	r.seek(12);
	let codec;
	let channels;
	let sample_rate;
	let bits;
	let dataBytes = 0;
	while (r.left > 0) {
		const id = r.fourcc();
		const size = r.le32();
		if (id === void 0 || size === void 0) break;
		if (id === "fmt ") {
			const f = new Reader(bytes.subarray(r.pos, Math.min(r.pos + size, bytes.length)));
			const tag = f.le16();
			channels = f.le16();
			sample_rate = f.le32();
			f.le32();
			f.le16();
			const depth = f.le16();
			if (depth !== void 0) bits = depth;
			if (tag !== void 0) codec = wavCodecName(tag, bits);
		} else if (id === "data") dataBytes = Math.min(size, r.left);
		r.skip(size + size % 2);
	}
	if (codec === void 0) throw new Error("the media probe found no streams — the file may be truncated or corrupt");
	const stream = {
		codec,
		codec_type: "audio"
	};
	if (channels !== void 0) stream.channels = channels;
	if (sample_rate !== void 0) stream.sample_rate = sample_rate;
	out.streams.push(stream);
	if (dataBytes > 0 && sample_rate !== void 0 && sample_rate > 0 && channels !== void 0 && channels > 0 && bits !== void 0) out.duration_s = Math.round(dataBytes / (sample_rate * channels * (bits / 8)) * 1e6) / 1e6;
	return out;
}
/** THE DISPATCH: the container decides the parser. A file that is
*  neither is refused by name — never probed with the wrong reader. */
function probeMedia(bytes) {
	if (bytes.byteLength >= 4 && text(bytes.subarray(4, 8)) === "ftyp") return probeMp4(bytes);
	if (bytes.byteLength >= 12 && text(bytes.subarray(0, 4)) === "RIFF") return probeWav(bytes);
	if (bytes.byteLength >= 12 && text(bytes.subarray(4, 8)) === "moov") return probeMp4(bytes);
	throw new Error("the media probe recognized neither an MP4/MOV container nor a RIFF/WAVE stream");
}
//#endregion
//#region src/tools/glbSummary.ts
const GLB_MAGIC = 1179937895;
const CHUNK_JSON = 1313821514;
const GLB_HEADER = 12;
function readU32(data, at) {
	return (data[at] ?? 0) | (data[at + 1] ?? 0) << 8 | (data[at + 2] ?? 0) << 16 | (data[at + 3] ?? 0) << 24;
}
/** The glTF JSON out of GLB bytes (or the bytes themselves when they
*  are already JSON). Throws with a legible voice on a bad container —
*  a silent zero summary would be a lie about the artifact. */
function gltfJsonOf(data) {
	if (data.find((b) => b !== 32 && b !== 9 && b !== 10 && b !== 13) === 123) return { json: JSON.parse(new TextDecoder().decode(data)) };
	if (data.length < GLB_HEADER) throw new Error("not a GLB: shorter than its 12-byte header");
	if (readU32(data, 0) !== GLB_MAGIC) throw new Error("not a GLB: the \"glTF\" magic is absent");
	const version = readU32(data, 4);
	const total = readU32(data, 8);
	if (total > data.length) throw new Error("not a GLB: the header declares " + String(total) + " bytes but only " + String(data.length) + " are present");
	let off = GLB_HEADER;
	while (off + 8 <= total) {
		const len = readU32(data, off);
		if (readU32(data, off + 4) === CHUNK_JSON) {
			const end = Math.min(off + 8 + len, data.length);
			const text = new TextDecoder().decode(data.subarray(off + 8, end));
			return {
				json: JSON.parse(text),
				version
			};
		}
		off += 8 + len + (4 - len % 4) % 4;
	}
	throw new Error("not a GLB: no JSON chunk in the container");
}
function num(v) {
	return typeof v === "number" && Number.isFinite(v) ? v : void 0;
}
/** Summarize a mesh artifact's bytes. Throws on a non-mesh container. */
function summarizeMesh(data, file) {
	const { json, version } = gltfJsonOf(data);
	const accessors = Array.isArray(json["accessors"]) ? json["accessors"] : [];
	const meshes = Array.isArray(json["meshes"]) ? json["meshes"] : [];
	const materials = Array.isArray(json["materials"]) ? json["materials"] : [];
	const textures = Array.isArray(json["textures"]) ? json["textures"] : [];
	const images = Array.isArray(json["images"]) ? json["images"] : [];
	let vertices = 0;
	let triangles = 0;
	let primitives = 0;
	let textured = false;
	let hasBounds = false;
	const min = [
		Infinity,
		Infinity,
		Infinity
	];
	const max = [
		-Infinity,
		-Infinity,
		-Infinity
	];
	for (const mesh of meshes) {
		const prims = Array.isArray(mesh["primitives"]) ? mesh["primitives"] : [];
		for (const prim of prims) {
			primitives += 1;
			const attrs = prim["attributes"] !== null && typeof prim["attributes"] === "object" ? prim["attributes"] : {};
			if (attrs["TEXCOORD_0"] !== void 0) textured = true;
			const posIndex = num(attrs["POSITION"]);
			if (posIndex === void 0) continue;
			const pos = accessors[posIndex];
			if (pos === void 0) continue;
			const count = num(pos["count"]) ?? 0;
			vertices += count;
			const idxIndex = num(prim["indices"]);
			const idx = idxIndex === void 0 ? void 0 : accessors[idxIndex];
			const triSrc = idx === void 0 ? count : num(idx["count"]) ?? 0;
			triangles += Math.floor(triSrc / 3);
			const pmin = pos["min"];
			const pmax = pos["max"];
			if (Array.isArray(pmin) && Array.isArray(pmax)) for (let i = 0; i < 3; i += 1) {
				const lo = num(pmin[i]);
				const hi = num(pmax[i]);
				if (lo === void 0 || hi === void 0) continue;
				if (lo < min[i]) min[i] = lo;
				if (hi > max[i]) max[i] = hi;
				hasBounds = true;
			}
		}
	}
	const asset = json["asset"] !== null && typeof json["asset"] === "object" ? json["asset"] : {};
	const out = {
		file,
		size_bytes: data.length,
		meshes: meshes.length,
		primitives,
		materials: materials.length,
		textures: textures.length,
		images: images.length,
		vertices,
		triangles,
		textured
	};
	if (version !== void 0) out.version = version;
	const generator = asset["generator"];
	if (typeof generator === "string") out.generator = generator;
	if (hasBounds) out.bounds = {
		min,
		max
	};
	return out;
}
/** The one-line voice the agent reads when the mesh has no raster. */
function meshVoice(s) {
	const bits = [
		String(s.meshes) + " mesh(es)",
		String(s.vertices) + " vertices",
		String(s.triangles) + " triangles",
		String(s.materials) + " material(s)",
		String(s.textures) + " texture(s)",
		s.textured ? "UV-mapped" : "untextured",
		String(s.size_bytes) + " bytes"
	];
	if (s.bounds !== void 0) {
		const size = [
			0,
			1,
			2
		].map((i) => s.bounds.max[i] - s.bounds.min[i]);
		bits.push("bounds " + size.map((v) => v.toFixed(3)).join("x"));
	}
	return bits.join(", ");
}
//#endregion
//#region src/tools/melite-view.ts
/**
* melite_view — the estate's OBSERVE arm for images (the decide
* loop's eye, 2026-09-14). One run's artifact, VIEWED: the tool
* resolves the run's output tree through the queue seat, reads the
* newest image (or the artifact the caller names), and commits it
* through the harness attachment store — the model receives the
* image itself, not a description of it.
*
* THE COPY LAW (DSH tool-fs `read_image`, studied then copied): the
* route gate (`assertImageCapableRoute` — the session's routed
* provider/model must DECLARE image input, or the tool refuses
* BEFORE filesystem work), the signature sniffer (extension first,
* bytes authoritative), `attachments.saveImage` → durable
* `ImageAttachmentRef`, and the render pairing — one text summary
* block + one `{type:'image', attachment}` block re-branded from
* the structured value (`imageRefFromValue`). No inline base64, no
* bespoke vision lane: the attachment service owns normalization,
* limits, and the durable log.
*
* VIEWING IS NOT A RUN PRESS (the interface law): this tool lands
* in the BASE toolset — browser sessions may look at what a run
* produced; only the run DOORS stay headless-gated.
*
* CONTAINMENT (estate/media's law, same spelling): the run id must
* match the queue's RUN_ID grammar, and the file path is BUILT from
* the walk's own answer (`stateRoot/output/<runId>/<name>` from
* `listMedia`) — never from caller text. The caller's `artifact` is
* a substring FILTER over names the walk already produced.
*/
/** §23 CROSS-ROOTS (2026-09-23): the view walk searches the
*  manifest in order — own root first, then the maker's tree
*  (MELITE_STATE_ROOTS). First root holding the run serves (own
*  writes win); a miss names every searched root. */
const firstRootWithRun = async (seat, kind, runId) => {
	for (const root of rootsManifest(seat.stateRoot)) {
		const { items } = await listMedia(root, kind);
		const own = items.filter((i) => i.runId === runId);
		if (own.length > 0) return {
			own,
			root
		};
	}
	return null;
};
/** The run-id grammar (estate/media's containment law, verbatim). */
const RUN_ID$1 = RUN_ID_RE;
/** Extension → declared media type (read_image's map, copied). */
const IMAGE_EXTENSIONS = {
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".webp": "image/webp",
	".gif": "image/gif"
};
/** PNG/JPEG file signatures; GIF/WebP match by ASCII (read_image). */
const PNG_SIGNATURE = [
	137,
	80,
	78,
	71,
	13,
	10,
	26,
	10
];
const JPEG_SIGNATURE = [
	255,
	216,
	255
];
const matchesBytes = (data, offset, expected) => {
	if (data.byteLength < offset + expected.length) return false;
	return expected.every((byte, index) => data[offset + index] === byte);
};
const matchesAscii = (data, offset, value) => {
	if (data.byteLength < offset + value.length) return false;
	for (let index = 0; index < value.length; index += 1) if (data[offset + index] !== value.charCodeAt(index)) return false;
	return true;
};
/** Identify the media type declared by a supported image signature. */
function sniffImageMediaType(data) {
	if (matchesBytes(data, 0, PNG_SIGNATURE)) return "image/png";
	if (matchesBytes(data, 0, JPEG_SIGNATURE)) return "image/jpeg";
	if (matchesAscii(data, 0, "GIF87a") || matchesAscii(data, 0, "GIF89a")) return "image/gif";
	if (matchesAscii(data, 0, "RIFF") && matchesAscii(data, 8, "WEBP")) return "image/webp";
}
/** Map a path to its declared image media type by extension. */
function imageMediaTypeForPath(filePath) {
	return IMAGE_EXTENSIONS[extname(filePath).toLowerCase()];
}
/** Contact-sheet plan: four timestamps across the film's span (a
*  beginning, two middles, near the end — the observe arm wants the
*  arc, not four copies of frame one). Duration unknown (a probe
*  without a format row) → one early frame, never a blind seek past
*  the end. Pure. */
function sheetPlan(duration_s) {
	if (duration_s === void 0 || !Number.isFinite(duration_s) || duration_s <= 0) return [.5];
	const at = (f) => Math.round(duration_s * f * 100) / 100;
	return [
		at(.1),
		at(.4),
		at(.7),
		at(.95)
	];
}
/** Re-brand the structured outcome into the durable reference an
* ImageBlock carries (read_image's imageRefFromValue, copied). The
* parameter is the PRESENT image — callers assert presence (the
* text-only observe arm never reaches here). */
function imageRefFromValue(image) {
	return {
		attachmentId: AttachmentId(image.attachmentId),
		mediaType: image.mediaType,
		bytes: image.bytes,
		width: image.width,
		height: image.height,
		...image.name === void 0 ? {} : { name: image.name },
		...image.originalDimensions === void 0 ? {} : { originalDimensions: { ...image.originalDimensions } }
	};
}
const execFileAsync = promisify(execFile);
/** Default proc: the estate's ffmpeg/ffprobe, 30s each (a probe is
*  milliseconds; four frame seeks + a tile are seconds) — a hung
*  binary never wedges the observe arm past the run's own budget. */
const defaultFilmProc = async (bin, args, signal) => {
	return { stdout: (await execFileAsync(bin, args, {
		timeout: 3e4,
		maxBuffer: 8 << 20,
		signal
	})).stdout };
};
const defaultBytesReader = async (absPath) => new Uint8Array(await readFile(absPath));
async function probeFile(absPath, name, kind, read = defaultBytesReader) {
	let bytes;
	try {
		bytes = await read(absPath);
	} catch (error) {
		throw new Error("cannot view the " + kind + " \"" + name + "\": the artifact could not be read (" + (error instanceof Error ? error.message : String(error)) + ")", { cause: error });
	}
	try {
		return probeMedia(bytes);
	} catch (error) {
		throw new Error("cannot view the " + kind + " \"" + name + "\": " + String(error.message), { cause: error });
	}
}
/** View a film artifact: the container summary + a contact sheet committed
*  as the viewed image (the §24 gate — one view artifact, stream
*  summary + frames the model can SEE). Containment rides the walk's
*  own row (absPath built from runId + name, never caller text); the
*  sheet lands in os.tmpdir (never the run tree — a view must not
*  mint provenance). */
async function viewFilmArtifact(seat, runId, artifact, exec, ctx, attachments, proc = defaultFilmProc, read = defaultBytesReader) {
	const found = await firstRootWithRun(seat, "video", runId);
	if (found === null) throw new Error("run \"" + runId + "\" produced no image artifacts (and no viewable film — the run holds no video artifacts either) " + searchedVoice(rootsManifest(seat.stateRoot)));
	const own = found.own;
	const picked = artifact.length > 0 ? own.filter((i) => i.name.includes(artifact)) : own;
	if (picked.length === 0) throw new Error("run \"" + runId + "\" has no film artifact containing \"" + artifact + "\" — the run holds: " + own.slice(0, 8).map((i) => i.name).join(", ") + " " + searchedVoice(rootsManifest(seat.stateRoot)));
	const row = picked[0];
	const absPath = join(found.root, "output", row.runId, row.name);
	const probe = await probeFile(absPath, row.name, "film", read);
	const capability = await routeImageCapability(ctx, exec, runId);
	if (!capability.capable) return {
		runId,
		url: row.url,
		textObservation: filmTextObservation(row.name, probe, capability.model)
	};
	const stamps = sheetPlan(probe.duration_s);
	const work = await mkdtemp(join(tmpdir(), "melite-view-"));
	try {
		const frames = [];
		try {
			let n = 0;
			for (const t of stamps) {
				const out = join(work, "frame-" + String(n) + ".png");
				await proc("ffmpeg", [
					"-v",
					"error",
					"-ss",
					String(t),
					"-i",
					absPath,
					"-frames:v",
					"1",
					"-vf",
					"scale=320:-1",
					"-y",
					out
				], exec.signal);
				frames.push(out);
				n++;
			}
			const sheet = join(work, "sheet.png");
			if (frames.length === 1) await proc("ffmpeg", [
				"-v",
				"error",
				"-i",
				frames[0],
				"-y",
				sheet
			], exec.signal);
			else {
				const inputs = [];
				for (const f of frames) inputs.push("-i", f);
				const pairs = [];
				for (let i = 0; i + 1 < frames.length; i += 2) pairs.push("[" + String(i) + ":v][" + String(i + 1) + ":v]hstack=inputs=2[r" + String(i) + "]");
				const stacked = pairs.map((_, i) => "[r" + String(i * 2) + "]").join("") + "vstack=inputs=" + String(pairs.length);
				await proc("ffmpeg", [
					"-v",
					"error",
					...inputs,
					"-filter_complex",
					pairs.join(";") + ";" + stacked,
					"-y",
					sheet
				], exec.signal);
			}
		} catch (error) {
			throw new Error("cannot view the film \"" + row.name + "\": the contact sheet could not be built (" + (error instanceof Error ? error.message : String(error)) + ")", { cause: error });
		}
		const byteCap = Math.min(attachments.imageLimits.maxImageBytes, attachments.imageLimits.maxMessageImageBytes);
		const data = await readFile(join(work, "sheet.png"), { signal: exec.signal });
		if (data.byteLength > byteCap) throw new Error("cannot view the film \"" + row.name + "\": its contact sheet exceeds the " + String(byteCap) + "-byte image cap");
		let ref;
		try {
			ref = await attachments.saveImage({
				data,
				mediaType: "image/png",
				name: basename(row.name, extname(row.name)) + "-sheet.png"
			});
		} catch (error) {
			throw new Error("cannot commit the film contact sheet for \"" + row.name + "\": " + (error instanceof Error ? error.message : String(error)), { cause: error });
		}
		return {
			runId: row.runId,
			url: row.url,
			image: {
				attachmentId: ref.attachmentId,
				mediaType: ref.mediaType,
				bytes: ref.bytes,
				width: ref.width,
				height: ref.height,
				...ref.name === void 0 ? {} : { name: ref.name },
				...ref.originalDimensions === void 0 ? {} : { originalDimensions: { ...ref.originalDimensions } }
			},
			film: {
				file: row.name,
				...probe.duration_s === void 0 ? {} : { duration_s: probe.duration_s },
				size_bytes: probe.size_bytes,
				streams: probe.streams.map((s) => ({
					codec: s.codec,
					...s.codec_type === void 0 ? {} : { codec_type: s.codec_type },
					...s.width === void 0 ? {} : { width: s.width },
					...s.height === void 0 ? {} : { height: s.height },
					...s.fps === void 0 ? {} : { fps: s.fps },
					...s.frames === void 0 ? {} : { frames: s.frames }
				})),
				sheet_of: stamps.length
			}
		};
	} finally {
		await rm(work, {
			recursive: true,
			force: true
		});
	}
}
/** View an audio artifact: ffprobe summary + a WAVEFORM sheet
* committed as the viewed image (the audio twin of §24's film arm;
* ROADMAP §33 gap-6, receipt: 032/034's makers shelled to ffprobe
* because no estate door surfaced duration at mint time — the
* observe arm answers it natively now, and the sheet SHOWS the
* envelope: a 42µs stub renders an empty trace, real speech
* renders bars). Containment rides the walk's own row (absPath
* built from runId + name, never caller text); the sheet lands in
* os.tmpdir (never the run tree — a view must not mint
* provenance). */
async function viewAudioArtifact(seat, runId, artifact, exec, ctx, attachments, proc = defaultFilmProc, read = defaultBytesReader) {
	const found = await firstRootWithRun(seat, "audio", runId);
	if (found === null) throw new Error("run \"" + runId + "\" produced no image artifacts (and no viewable film or audio — the run holds no image/video/audio artifacts either) " + searchedVoice(rootsManifest(seat.stateRoot)));
	const own = found.own;
	const picked = artifact.length > 0 ? own.filter((i) => i.name.includes(artifact)) : own;
	if (picked.length === 0) throw new Error("run \"" + runId + "\" has no audio artifact containing \"" + artifact + "\" — the run holds: " + own.slice(0, 8).map((i) => i.name).join(", ") + " " + searchedVoice(rootsManifest(seat.stateRoot)));
	const row = picked[0];
	const absPath = join(found.root, "output", row.runId, row.name);
	const probe = await probeFile(absPath, row.name, "audio", read);
	const audioCapability = await routeImageCapability(ctx, exec, runId);
	if (!audioCapability.capable) {
		const rows = probe.streams.map((s) => s.codec + (s.sample_rate !== void 0 ? " " + String(s.sample_rate) + "Hz" : "") + (s.channels !== void 0 ? " " + String(s.channels) + "ch" : "")).join(" + ");
		return {
			runId: row.runId,
			url: row.url,
			textObservation: "melite_view audio: " + row.name + (probe.duration_s !== void 0 ? ", " + String(probe.duration_s) + "s" : "") + ", " + String(probe.size_bytes) + " bytes, streams: " + rows + "; TEXT-ONLY observation — model \"" + audioCapability.model + "\" declares no image input, so no waveform sheet was rendered. The measurements above are complete."
		};
	}
	const work = await mkdtemp(join(tmpdir(), "melite-view-"));
	try {
		const sheet = join(work, "waveform.png");
		try {
			await proc("ffmpeg", [
				"-v",
				"error",
				"-i",
				absPath,
				"-filter_complex",
				"showwavespic=s=640x240:colors=#9db4ff",
				"-frames:v",
				"1",
				"-y",
				sheet
			], exec.signal);
		} catch (error) {
			throw new Error("cannot view the audio \"" + row.name + "\": the waveform sheet could not be built (" + (error instanceof Error ? error.message : String(error)) + ")", { cause: error });
		}
		const byteCap = Math.min(attachments.imageLimits.maxImageBytes, attachments.imageLimits.maxMessageImageBytes);
		const data = await readFile(sheet, { signal: exec.signal });
		if (data.byteLength > byteCap) throw new Error("cannot view the audio \"" + row.name + "\": its waveform sheet exceeds the " + String(byteCap) + "-byte image cap");
		let ref;
		try {
			ref = await attachments.saveImage({
				data,
				mediaType: "image/png",
				name: basename(row.name, extname(row.name)) + "-waveform.png"
			});
		} catch (error) {
			throw new Error("cannot commit the audio waveform sheet for \"" + row.name + "\": " + (error instanceof Error ? error.message : String(error)), { cause: error });
		}
		return {
			runId: row.runId,
			url: row.url,
			image: {
				attachmentId: ref.attachmentId,
				mediaType: ref.mediaType,
				bytes: ref.bytes,
				width: ref.width,
				height: ref.height,
				...ref.name === void 0 ? {} : { name: ref.name },
				...ref.originalDimensions === void 0 ? {} : { originalDimensions: { ...ref.originalDimensions } }
			},
			audio: {
				file: row.name,
				...probe.duration_s === void 0 ? {} : { duration_s: probe.duration_s },
				size_bytes: probe.size_bytes,
				streams: probe.streams.map((s) => ({
					codec: s.codec,
					...s.codec_type === void 0 ? {} : { codec_type: s.codec_type },
					...s.sample_rate === void 0 ? {} : { sample_rate: s.sample_rate },
					...s.channels === void 0 ? {} : { channels: s.channels }
				})),
				waveform_of: true
			}
		};
	} finally {
		await rm(work, {
			recursive: true,
			force: true
		});
	}
}
/** THE TEXT-ONLY OBSERVE ARM (a live commission's finding,
*  2026-09-26): the observation this door produces is mostly TEXT —
*  a container probe (duration, streams, geometry, fps, frames,
*  bytes) and, for a mesh, its structural summary. On a route that
*  declares no image input, refusing the WHOLE view threw those facts
*  away and left the maker with local ffprobe as its only observe
*  arm — the exact gap this door exists to close. So the capability is
*  REPORTED, and the caller serves the facts in text and names the one
*  thing it cannot do (the image block). `assertImageCapableRoute`
*  keeps the strict refusal for the callers that genuinely need pixels
*  (read_image's own law). */
async function routeImageCapability(ctx, exec, requestedRun) {
	const routed = exec.agent?.session?.requestHeader?.()?.config;
	const provider = routed?.provider ?? exec.agent?.options?.provider;
	const model = routed?.model ?? exec.agent?.options?.model;
	const llm = ctx.get("llm");
	if (provider === void 0 || model === void 0 || llm === void 0) throw new Error(`cannot view run "${requestedRun}": the current model route could not be resolved`);
	const active = await llm.resolveModelInfo(provider, model, exec.signal);
	return {
		capable: active.inputModalities !== void 0 && active.inputModalities.includes("image"),
		model
	};
}
/** Enforce the strict image-capability gate for the calling route
* (read_image's assertImageCapableRoute, copied): the session's
* latest routed provider/model must declare `image` input — unknown
* capability refuses, it never relies on an adapter failure after
* the filesystem work. */
async function assertImageCapableRoute(ctx, exec, requestedRun) {
	const routed = exec.agent?.session?.requestHeader?.()?.config;
	const provider = routed?.provider ?? exec.agent?.options?.provider;
	const model = routed?.model ?? exec.agent?.options?.model;
	const llm = ctx.get("llm");
	if (provider === void 0 || model === void 0 || llm === void 0) throw new Error(`cannot view run "${requestedRun}": the current model route could not be resolved`);
	const active = await llm.resolveModelInfo(provider, model, exec.signal);
	if (active.inputModalities === void 0 || !active.inputModalities.includes("image")) throw new Error(`cannot view run "${requestedRun}": model "${model}" does not declare image input; switch to an image-capable model to view artifacts`);
}
/** THE TEXT OBSERVATION: the film's facts as text — the same numbers
*  the image route leads with, plus the one honest statement of what
*  this route cannot be given. Named, never implied. */
function filmTextObservation(name, probe, model) {
	const streams = probe.streams.map((s) => s.codec + (s.width !== void 0 && s.height !== void 0 ? " " + String(s.width) + "x" + String(s.height) : "") + (s.fps !== void 0 ? " @" + s.fps : "") + (s.frames !== void 0 ? " " + String(s.frames) + "f" : "")).join(" + ");
	return "melite_view film: " + name + (probe.duration_s !== void 0 ? ", " + String(probe.duration_s) + "s" : "") + ", " + String(probe.size_bytes) + " bytes, streams: " + streams + "; TEXT-ONLY observation — model \"" + model + "\" declares no image input, so the contact sheet was neither built nor attached. The measurements above are complete; the pictures are what this route cannot have.";
}
/** The render: one text summary + the image block (read_image's
* imageReadContent pairing, run-scoped). A film value's text leads
* with the probe verdict (duration, streams, frame count) — the
* image block IS the contact sheet. */
function viewedContent(value) {
	if (value.textObservation !== void 0) return [{
		type: "text",
		text: value.textObservation
	}];
	if (value.film !== void 0) {
		const f = value.film;
		const streams = f.streams.map((s) => s.codec + (s.width !== void 0 && s.height !== void 0 ? " " + String(s.width) + "x" + String(s.height) : "") + (s.fps !== void 0 ? " @" + s.fps : "") + (s.frames !== void 0 ? " " + String(s.frames) + "f" : "")).join(" + ");
		const image = value.image;
		return [{
			type: "text",
			text: "melite_view film: " + value.url + " (" + f.file + (f.duration_s !== void 0 ? ", " + String(f.duration_s) + "s" : "") + (f.size_bytes !== void 0 ? ", " + String(f.size_bytes) + " bytes" : "") + ", streams: " + streams + "; contact sheet of " + String(f.sheet_of) + ": " + image.mediaType + " " + String(image.width) + "x" + String(image.height) + ")"
		}, {
			type: "image",
			attachment: imageRefFromValue(image)
		}];
	}
	if (value.audio !== void 0) {
		const a = value.audio;
		const audio = value.image;
		const streams = a.streams.map((s) => s.codec + (s.sample_rate !== void 0 ? " " + String(s.sample_rate) + "Hz" : "") + (s.channels !== void 0 ? " " + String(s.channels) + "ch" : "")).join(" + ");
		return [{
			type: "text",
			text: "melite_view audio: " + value.url + " (" + a.file + (a.duration_s !== void 0 ? ", " + String(a.duration_s) + "s" : "") + ", " + String(a.size_bytes) + " bytes, streams: " + streams + "; waveform sheet: " + audio.mediaType + " " + String(audio.width) + "x" + String(audio.height) + ")"
		}, {
			type: "image",
			attachment: imageRefFromValue(audio)
		}];
	}
	if (value.mesh !== void 0) {
		const m = value.mesh;
		return [{
			type: "text",
			text: "melite_view mesh: " + value.url + " (" + meshVoice(m) + (m.poster === void 0 ? "; NO raster poster beside the mesh — this is the structural read, not a picture" : "; poster: " + m.poster) + ")"
		}, {
			type: "image",
			attachment: imageRefFromValue(value.image)
		}];
	}
	const still = value.image;
	return [{
		type: "text",
		text: "melite_view: " + value.url + " (" + still.mediaType + ", " + String(still.width) + "x" + String(still.height) + ", " + String(still.bytes) + " bytes)"
	}, {
		type: "image",
		attachment: imageRefFromValue(still)
	}];
}
/** The mesh a poster sibling belongs to, or null when the image is the
*  run's own. `<dir>/<stem>_poster.png` → `<dir>/<stem>.glb|gltf`. The
*  check is the same directory + stem the media sidebar's POSTER_STEMS
*  contract reads, so the door and the sidebar agree on what a poster
*  is. A directory walk (no bytes read) — the caller has already
*  decided to observe this run. */
async function meshBesidePoster(seat, runId, imageName) {
	const m = /^(.*)_poster\.(?:png|jpe?g|webp)$/i.exec(imageName);
	if (m === null) return null;
	const stem = m[1];
	const hit = (await listMedia(seat.stateRoot, "model")).items.filter((i) => i.runId === runId).find((i) => i.name === stem + ".glb" || i.name === stem + ".gltf");
	return hit === void 0 ? null : hit.name;
}
/** THE MESH ARM (2026-09-26). A `.glb`/`.gltf` has no raster, so the
*  door serves the mesh two ways, in this order:
*
*  1. THE POSTER: when the run emitted `<stem>_poster.png` beside the
*     mesh (the sibling contract the media sidebar already reads), the
*     model SEES the render and the `mesh` row carries the structural
*     verdict alongside it.
*  2. THE STRUCTURAL READ: with no poster there is nothing to attach,
*     and this arm refuses — but it refuses WITH THE FACTS (meshes,
*     vertices, triangles, materials, textures, UV-map, bounds,
*     bytes) instead of the old "no image artifacts" dead end, and it
*     names the upstream fix (the 3D lane emits no poster). It never
*     fabricates an image to satisfy the schema: a fake picture of a
*     mesh is worse than an honest structural answer. */
async function viewModelArtifact(seat, runId, artifact, exec, ctx, attachments, read = defaultBytesReader) {
	const found = await firstRootWithRun(seat, "model", runId);
	if (found === null) throw new Error("run \"" + runId + "\" produced no image artifacts (and no viewable film or audio — the run holds no image/video/audio artifacts either) (and no mesh: the run holds no .glb/.gltf artifact either) " + searchedVoice(rootsManifest(seat.stateRoot)));
	const own = found.own;
	const picked = artifact.length > 0 ? own.filter((i) => i.name.includes(artifact)) : own;
	if (picked.length === 0) throw new Error("run \"" + runId + "\" has no mesh artifact containing \"" + artifact + "\" — the run holds: " + own.slice(0, 8).map((i) => i.name).join(", ") + " " + searchedVoice(rootsManifest(seat.stateRoot)));
	const row = picked[0];
	const summary = summarizeMesh(await read(join(found.root, "output", row.runId, row.name)), row.name);
	const slash = row.name.lastIndexOf("/");
	const posterName = (slash < 0 ? "" : row.name.slice(0, slash + 1)) + row.name.slice(slash + 1).replace(/\.(glb|gltf)$/i, "") + "_poster.png";
	const poster = (await listMedia(found.root, "image")).items.find((i) => i.runId === runId && i.name === posterName);
	if (poster === void 0) throw new Error("run \"" + runId + "\" holds the mesh \"" + row.name + "\" (" + meshVoice(summary) + ") but no raster poster beside it (" + posterName + " is absent), so there is no image to show you. The 3D lane emits no poster today: read the numbers above, or open the mesh in the app's media drilldown, which renders it in 3D. " + searchedVoice(rootsManifest(seat.stateRoot)));
	await assertImageCapableRoute(ctx, exec, runId);
	const posterPath = join(found.root, "output", poster.runId, poster.name);
	const byteCap = Math.min(attachments.imageLimits.maxImageBytes, attachments.imageLimits.maxMessageImageBytes);
	const bytes = await read(posterPath);
	if (bytes.byteLength > byteCap) throw new Error("cannot view \"" + poster.name + "\": the file exceeds the " + String(byteCap) + "-byte image cap; downscale and retry");
	const mediaType = sniffImageMediaType(bytes);
	if (mediaType === void 0) throw new Error("cannot view the mesh poster \"" + poster.name + "\": the bytes are not an image (the mesh lane wrote non-image content under the poster name this door mints)");
	const ref = await attachments.saveImage({
		data: bytes,
		mediaType,
		name: basename(poster.name)
	});
	return {
		runId,
		url: row.url,
		image: {
			attachmentId: ref.attachmentId,
			mediaType,
			bytes: ref.bytes,
			width: ref.width,
			height: ref.height,
			name: basename(poster.name)
		},
		mesh: {
			...summary,
			poster: posterName
		}
	};
}
/** Build the melite_view tool against the live cordis context (the
* seats: `attachments` — the durable store, `queue` — the runs tree
* root owner, `llm` — the route gate; all optional probes, the
* tool-fs inject law). */
function meliteView(ctx) {
	const presentCall = (args) => {
		const a = typeof args === "object" && args !== null ? args : {};
		return {
			card: "generic",
			title: "View run artifact",
			kind: "read",
			rawInput: {
				run_id: a.run_id,
				artifact: a.artifact
			}
		};
	};
	const def = defineTool({
		name: "melite_view",
		description: "View one image artifact from a finished (or running) estate run — the model receives the image itself, never a description of it. When the run holds no images but holds a film, the observe arm serves the film instead: an ffprobe stream summary (duration, codecs, frame count) plus a contact-sheet image of frames across its span. This is the observe arm of the act/observe/decide loop: after a run lands, VIEW it before deciding the next step (never claim a match without viewing). Args: run_id (required, the run directory under the runs tree), artifact (optional substring — when a run produced several images, name the one to view; default is the newest). Requires the current model to accept image input.",
		parameters: {
			run_id: {
				type: "string",
				required: true,
				description: "The run id (a \"run-…\" directory name under the runs tree)."
			},
			artifact: {
				type: "string",
				description: "Optional filename substring — when a run produced several images, pick the one whose name contains this."
			}
		},
		presentCall,
		output: {
			schema: {
				type: "object",
				additionalProperties: true,
				properties: {
					runId: {
						type: "string",
						description: "The run the artifact belongs to.",
						required: true
					},
					url: {
						type: "string",
						description: "The estate media URL of the viewed artifact.",
						required: true
					},
					image: {
						type: "object",
						additionalProperties: true,
						description: "The durable attachment metadata (attachmentId, mediaType, bytes, width, height). On the film path this IS the contact sheet. ABSENT on the text-only observe arm (a route with no image input gets textObservation instead — one of the two rides every result)."
					},
					film: {
						type: "object",
						additionalProperties: true,
						description: "Present only on the film path: the ffprobe summary (file, duration_s, size_bytes, streams with codec/geometry/fps/frames) plus sheet_of (frames tiled)."
					}
				}
			},
			render: (_args, value) => viewedContent(value)
		},
		isConcurrencySafe: () => true,
		async execute(args, exec0) {
			const exec = exec0;
			const a = args;
			const runId = a.run_id.trim();
			if (runId.length === 0) throw new Error("run_id must be a non-empty string");
			if (!RUN_ID$1.test(runId)) throw new Error("cannot view \"" + runId + "\": a run id is a \"run-…\" directory name under the runs tree (the containment grammar)");
			const artifact = typeof a.artifact === "string" ? a.artifact.trim() : "";
			const attachments = ctx.get("attachments");
			if (attachments === void 0) throw new Error("cannot view run \"" + runId + "\": no attachment service is mounted");
			const seat = ctx.get("queue", false);
			if (seat === void 0) throw new Error("cannot view run \"" + runId + "\": the queue seat owns the runs tree root — mount @melite-plugin/melite-estate");
			if (artifact !== "" && (/* @__PURE__ */ new Set([
				".wav",
				".flac",
				".mp3",
				".ogg",
				".m4a",
				".aac"
			])).has(extname(artifact).toLowerCase())) return await viewAudioArtifact(seat, runId, artifact, exec, ctx, attachments);
			if (artifact !== "" && (/* @__PURE__ */ new Set([".glb", ".gltf"])).has(extname(artifact).toLowerCase())) return await viewModelArtifact(seat, runId, artifact, exec, ctx, attachments);
			const found = await firstRootWithRun(seat, "image", runId);
			if (found === null) try {
				return await viewFilmArtifact(seat, runId, artifact, exec, ctx, attachments);
			} catch (filmMiss) {
				if (!(filmMiss instanceof Error && /produced no image artifacts/.test(filmMiss.message))) throw filmMiss;
				try {
					return await viewAudioArtifact(seat, runId, artifact, exec, ctx, attachments);
				} catch (audioMiss) {
					if (!(audioMiss instanceof Error && /produced no image artifacts/.test(audioMiss.message))) throw audioMiss;
					return await viewModelArtifact(seat, runId, artifact, exec, ctx, attachments);
				}
			}
			const own = found.own;
			const picked = artifact.length > 0 ? own.filter((i) => i.name.includes(artifact)) : own;
			if (picked.length === 0) throw new Error("run \"" + runId + "\" has no image artifact containing \"" + artifact + "\" — the run holds: " + own.slice(0, 8).map((i) => i.name).join(", "));
			const row = picked[0];
			const meshOfPoster = await meshBesidePoster(seat, runId, row.name);
			if (meshOfPoster !== null) return await viewModelArtifact(seat, runId, meshOfPoster, exec, ctx, attachments);
			const absPath = join(found.root, "output", row.runId, row.name);
			const declared = imageMediaTypeForPath(row.name);
			if (declared !== void 0 && !attachments.imageLimits.mediaTypes.includes(declared)) throw new Error("cannot view \"" + row.name + "\": " + declared + " images are not accepted by this deployment");
			const stillCapability = await routeImageCapability(ctx, exec, runId);
			if (!stillCapability.capable) {
				const data = await readFile(absPath, { signal: exec.signal });
				const sniffed = sniffImageMediaType(data);
				return {
					runId,
					url: row.url,
					textObservation: "melite_view: " + row.name + " (" + String(data.byteLength) + " bytes, " + (sniffed ?? declared ?? "format not sniffed") + (declared !== void 0 && sniffed !== void 0 && declared !== sniffed ? "; the extension declares " + declared + " and the BYTES say " + sniffed + " — the bytes win" : "") + "; TEXT-ONLY observation — model \"" + stillCapability.model + "\" declares no image input, so the file was not attached. The facts above are complete; the picture is what this route cannot have."
				};
			}
			const byteCap = Math.min(attachments.imageLimits.maxImageBytes, attachments.imageLimits.maxMessageImageBytes);
			const data = await readFile(absPath, { signal: exec.signal });
			if (data.byteLength > byteCap) throw new Error("cannot view \"" + row.name + "\": the file exceeds the " + String(byteCap) + "-byte image cap; downscale and retry");
			const mediaType = sniffImageMediaType(data) ?? declared;
			if (mediaType === void 0) throw new Error("cannot view \"" + row.name + "\": the file content is not a supported image format (PNG/JPEG/WebP/GIF)");
			if (declared === void 0 && !attachments.imageLimits.mediaTypes.includes(mediaType)) throw new Error("cannot view \"" + row.name + "\": " + mediaType + " images are not accepted by this deployment");
			let ref;
			try {
				ref = await attachments.saveImage({
					data,
					mediaType,
					name: basename(row.name)
				});
			} catch (error) {
				if (!(error instanceof AttachmentError)) throw error;
				if (error.code === "IMAGE_DIMENSION_TOO_LARGE") throw new Error("cannot view \"" + row.name + "\": at least one image side exceeds the " + String(attachments.imageLimits.maxImageDimension) + "px limit; downscale the image and view the smaller copy", { cause: error });
				if (error.code === "IMAGE_TOO_MANY_PIXELS") throw new Error("cannot view \"" + row.name + "\": the image exceeds the " + String(attachments.imageLimits.maxImagePixels) + "-pixel decoded-size limit; downscale the image and view the smaller copy", { cause: error });
				if (error.code === "IMAGE_TOO_LARGE") throw new Error("cannot view \"" + row.name + "\": the image cannot be stored within the deployment's byte limits; downscale the image and view the smaller copy", { cause: error });
				if (error.code === "INVALID_IMAGE" && declared === void 0) throw new Error("cannot view \"" + row.name + "\": the bytes do not decode as a supported PNG/JPEG/WebP/GIF image; the file may be truncated or corrupt", { cause: error });
				throw error;
			}
			return {
				runId: row.runId,
				url: row.url,
				image: {
					attachmentId: ref.attachmentId,
					mediaType: ref.mediaType,
					bytes: ref.bytes,
					width: ref.width,
					height: ref.height,
					...ref.name === void 0 ? {} : { name: ref.name },
					...ref.originalDimensions === void 0 ? {} : { originalDimensions: { ...ref.originalDimensions } }
				}
			};
		}
	});
	def.presentCall = presentCall;
	return def;
}
//#endregion
//#region src/tools/melite-read.ts
/**
* melite_read — the estate's TEXT observe arm for a run (2026-09-25).
*
* WHY IT EXISTS: the commission loop's own report named the hole. A
* maker could view images/film/audio (melite_view) and could read run
* state through melite_flow/run_status, but NOTHING could read a run's
* TEXT artifacts — the `_request.json` a run actually executed, the
* `_flow.json` sidecar, a handoff STATE file. On wire surfaces whose
* deferred file tools cannot see the `/melite-media` mount, and on the
* native maker face where those tools are intentionally absent, that
* left the agent unable to answer "what did this run actually send?"
* without shelling out — which agent mode forbids.
*
* THE CONTAINMENT LAW (melite_view's, verbatim): the run id must
* match the queue's RUN_ID grammar, the file is chosen from the walk's
* OWN rows (never caller text building a path), the caller's `path` is
* a substring FILTER, and the resolved real path must stay inside the
* run directory (the symlink-escape check is the point — a run tree
* holding a link out of the estate must not become a filesystem
* browser). Roots ride the §23 manifest: own root first, a miss names
* every searched tree.
*
* TEXT ONLY, BY DESIGN: a byte cap, an extension vocabulary, and a
* binary sniff. Media is melite_view's door (it commits the pixels);
* this door answers text, so a `.mp4` named `.json` refuses instead of
* dumping megabytes of bytes into the model's context.
*/
/** The run-id grammar (estate/media's containment law, verbatim). */
const RUN_ID = RUN_ID_RE;
/** The text vocabulary this door answers. A run's own sidecars are
*  json/jsonl/md/txt/yaml/log; anything else is media (melite_view),
*  a checkpoint (never read into a context window), or a refusal. */
const TEXT_EXTENSIONS = /* @__PURE__ */ new Set([
	"json",
	"jsonl",
	"md",
	"txt",
	"yaml",
	"yml",
	"log",
	"csv",
	"tsv"
]);
/** The byte cap: a sidecar is a receipt, not a dataset. 256 KB is far
*  past any run sidecar and far below a context window. */
const TEXT_BYTE_CAP = 262144;
/** Walk depth (run/stage/file), matching the media list arm. */
const MAX_DEPTH = 3;
/** Row cap for the miss voice and the listing. */
const ROW_CAP = 200;
/** Binary sniff: a NUL byte in the first 8 KB is not text. */
const BINARY_SNIFF_BYTES = 8192;
/** The run-id gate, exported for the door pins. */
function assertRunId(runId) {
	if (!RUN_ID.test(runId)) throw new Error(`"${runId}" is not a run id — melite_read reads a run's own files, and a run id is run-<hex>-<token> (the directory name under the runs tree)`);
}
/** Is this name a text row by extension? */
function isTextName(name) {
	const dot = name.lastIndexOf(".");
	if (dot < 0) return false;
	return TEXT_EXTENSIONS.has(name.slice(dot + 1).toLowerCase());
}
/** Walk one run directory for its text rows (pure over the tree, the
*  media list arm's shape: depth-bounded, mtime-newest first, capped). */
async function listRunText(runDir) {
	const rows = [];
	const walk = async (dir, rel, depth) => {
		if (depth > MAX_DEPTH) return;
		let entries;
		try {
			entries = await readdir(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const e of entries) {
			if (rows.length >= ROW_CAP) return;
			if (e.isDirectory()) {
				await walk(join(dir, e.name), rel === "" ? e.name : `${rel}/${e.name}`, depth + 1);
				continue;
			}
			if (!e.isFile() && !e.isSymbolicLink() || !isTextName(e.name)) continue;
			const name = rel === "" ? e.name : `${rel}/${e.name}`;
			let bytes = 0;
			try {
				bytes = (await stat(join(dir, e.name))).size;
			} catch {
				bytes = 0;
			}
			rows.push({
				path: name,
				bytes
			});
		}
	};
	await walk(runDir, "", 1);
	return rows;
}
/** The first manifest root holding the run's directory wins (own
*  writes win); a miss names every searched tree. */
async function firstRootWithRunDir(seat, runId) {
	for (const root of rootsManifest(seat.stateRoot)) {
		const dir = join(root, "output", runId);
		try {
			if ((await stat(dir)).isDirectory()) return {
				dir,
				root
			};
		} catch {
			continue;
		}
	}
	return null;
}
/** The refusal voice for a miss: the run's text rows when it has any,
*  else the searched roots. Never a bare "not found". */
function missVoice(runId, rows, roots) {
	return `run "${runId}" has no text file matching that path — ${rows.length === 0 ? "the run holds no text files" : "the run holds: " + rows.slice(0, 8).map((r) => r.path).join(", ")} ` + searchedVoice(roots);
}
/** Read one text artifact of one run. With no `path`, LIST the run's
*  text rows (the door's discovery arm — a maker needs to know what it
*  can read before naming one). */
async function readRunText(seat, runId, path) {
	assertRunId(runId);
	const rootsSpoken = [...rootsManifest(seat.stateRoot)];
	const found = await firstRootWithRunDir(seat, runId);
	if (found === null) throw new Error(`run "${runId}" is not in the runs tree ` + searchedVoice(rootsSpoken));
	const rows = await listRunText(found.dir);
	const want = path.trim();
	if (want === "") {
		if (rows.length === 0) throw new Error(`run "${runId}" holds no text files ` + searchedVoice(rootsSpoken));
		return {
			runId,
			files: rows.slice(0, ROW_CAP).map((r) => r.path + " (" + String(r.bytes) + "b)").join(", ")
		};
	}
	const matches = rows.filter((r) => r.path === want || r.path.includes(want));
	if (matches.length === 0) throw new Error(missVoice(runId, rows, rootsSpoken));
	if (matches.length > 1) throw new Error(`"${want}" matches ${String(matches.length)} text files in run "${runId}" — name one exactly: ` + matches.slice(0, 8).map((r) => r.path).join(", "));
	const row = matches[0];
	const abs = resolve(found.dir, row.path);
	const root = await realpath(found.dir);
	const real = await realpath(abs);
	if (real !== root && !real.startsWith(root + sep)) throw new Error(`"${row.path}" resolves outside run "${runId}" — melite_read reads a run's own files, never a link out of it`);
	const data = await readFile(abs);
	if (data.byteLength > 262144) throw new Error(`"${row.path}" is ${String(data.byteLength)} bytes, over melite_read's ${String(TEXT_BYTE_CAP)}-byte text cap — a run sidecar is a receipt, not a dataset (read the slice you need at the estate, not into the context)`);
	if (data.subarray(0, BINARY_SNIFF_BYTES).includes(0)) throw new Error(`"${row.path}" is not text (a NUL byte in its first ${String(BINARY_SNIFF_BYTES)} bytes) — media is melite_view's door, and a checkpoint is never read into a context window`);
	return {
		runId,
		path: row.path,
		bytes: data.byteLength,
		text: data.toString("utf8")
	};
}
function meliteRead(ctx) {
	const presentCall = (args) => {
		const a = typeof args === "object" && args !== null ? args : {};
		return {
			card: "generic",
			title: `Read run file ${String(a.run_id ?? "?")}`,
			kind: "read",
			rawInput: {
				run_id: String(a.run_id ?? "?"),
				...a.path === void 0 ? {} : { path: String(a.path) }
			}
		};
	};
	const def = defineTool({
		name: "melite_read",
		description: "Read a TEXT file from one finished run — the sidecars a run actually wrote (`_request.json`, `_flow.json`, a handoff STATE.md). Omit `path` to list the run's text files. Run-scoped and text-only: media is `melite_view`'s door, and nothing outside the run directory is reachable. Use it to answer \"what did this run send?\" without shelling out. Args: run_id (required), path (optional substring of the file name).",
		parameters: {
			run_id: {
				type: "string",
				description: "The run id (a \"run-…\" directory name under the runs tree).",
				required: true
			},
			path: {
				type: "string",
				description: "Optional: a substring of the text file's path inside the run. Omit to list what the run holds."
			}
		},
		presentCall,
		output: {
			schema: {
				type: "object",
				additionalProperties: true,
				properties: {
					runId: {
						type: "string",
						required: true
					},
					path: {
						type: "string",
						description: "The read file, relative to the run directory."
					},
					bytes: {
						type: "number",
						description: "The file size in bytes."
					},
					text: {
						type: "string",
						description: "The file content (UTF-8) on the read arm."
					},
					files: {
						type: "string",
						description: "Present on the listing arm: the run's text files with sizes."
					},
					error: {
						type: "string",
						description: "The refusal text — present exactly when the tool refused."
					}
				}
			},
			render: (_args, value) => {
				const v = value;
				if (typeof v.error === "string" && v.error !== "") return [{
					type: "text",
					text: "melite_read REFUSED: " + v.error
				}];
				if (typeof v.files === "string") return [{
					type: "text",
					text: "melite_read " + v.runId + " text files: " + v.files
				}];
				return [{
					type: "text",
					text: "melite_read " + v.runId + "/" + String(v.path ?? "?") + ": " + String(v.text ?? "")
				}];
			}
		},
		isConcurrencySafe: () => true,
		async execute(args) {
			const a = args;
			const seat = ctx.get("queue");
			if (seat === void 0 || typeof seat.stateRoot !== "string") throw new Error("melite_read: the queue seat is not available — a run's files are read through the estate runs tree");
			return await readRunText(seat, a.run_id, typeof a.path === "string" ? a.path : "");
		}
	});
	def.presentCall = presentCall;
	return def;
}
//#endregion
//#region src/tools/skill-index.ts
/**
* melite_skill_index - THE BINDING VOCABULARY (the no-dump rework,
* 2026-09-21).
*
* This tool NEVER lists skill rows. The old flat dump was the core
* breach of the progressive-disclosure architecture: an agent
* scanning 63 rows picked a card-scoped generic prose skill over
* the family's lane doc and ran a distilled turbo checkpoint at 25
* steps — the index itself taught the wrong path. Skills bind to
* their owner; disclosure of actual skills flows through the owning
* surface (melite_load serves a card's/family's tier-1 skill
* lines). This scan serves only the vocabulary: one row per FAMILY
* and per CARD, each with its ENTRANCE doc id and skill count, plus
* the flow count. To learn a skill id: open the owner.
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
		name: "melite_skill_index",
		description: "THE SELECTION LAW (operator 2026-09-21): this index serves the LIVE BENCH only — the cards composed this session and the families they name, one binding line each (entrance doc id + skill count). An EMPTY BENCH LISTS NOTHING: to find a card or flow call melite_discover (the paid door), never this index. To see actual skill lines, open the owner with melite_load; to read a body you already hold an id for, use melite_skill_read. This index never lists skill rows.",
		parameters: {},
		presentCall,
		output: {
			schema: {
				type: "object",
				additionalProperties: true,
				properties: {
					count: {
						type: "number",
						description: "Total skill docs across cards and flows.",
						required: true
					},
					cards: {
						type: "array",
						description: "One row per card: id/genre/skills/entrance (the AGENT.md row id, or null).",
						required: true
					},
					flows: {
						type: "object",
						additionalProperties: true,
						description: "Registry flow count + ids.",
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
					text: "melite_skill_index REFUSED: " + v.error
				}];
				const cards = Array.isArray(v?.cards) ? v.cards : [];
				const flowCount = typeof v?.flows?.count === "number" ? v.flows.count : 0;
				const count = typeof v?.count === "number" ? v.count : 0;
				const line = (r) => {
					const id = typeof r?.id === "string" ? r.id : "";
					if (id === "") return "";
					const genre = typeof r?.genre === "string" && r.genre !== "" ? ` (${r.genre})` : "";
					const n = typeof r?.skills === "number" ? r.skills : 0;
					const skills = n === 0 ? "no skills" : n === 1 ? "1 skill" : `${n} skills`;
					return `  ${id}${genre} — ${typeof r?.entrance === "string" && r.entrance !== "" ? `entrance ${r.entrance}, ${skills}` : "no entrance doc"}`;
				};
				if (cards.length === 0 && flowCount === 0) return [{
					type: "text",
					text: "melite_skill_index: THE CATALOG IS THE SELECTION — nothing is listed while the bench is empty. Call melite_discover (the paid door) to find a card or flow; craft rows appear here only for what the bench holds."
				}];
				const cardsWord = cards.length === 1 ? "card" : "cards";
				const out = [`melite_skill_index: ${count} skills across ${cards.length} ${cardsWord} · ${flowCount} flows — the bench's selection only; open a card with melite_load; this index never lists skill rows or model families`];
				for (const c of cards) {
					const l = line(c);
					if (l !== "") out.push(l);
				}
				return [{
					type: "text",
					text: out.join("\n")
				}];
			}
		},
		async execute(_args, exec) {
			const res = await request("GET", "/v1/skills", void 0, exec.signal, INDEX_TIMEOUT_MS);
			const cards = Array.isArray(res.cards) ? res.cards : [];
			const flows = res.flows !== null && typeof res.flows === "object" ? res.flows : {};
			const flowCount = typeof flows.count === "number" ? flows.count : 0;
			cards.length + flowCount;
			return jsonClean({
				count: cards.length + flowCount,
				cards,
				flows: {
					count: flowCount,
					ids: flows.ids ?? []
				}
			});
		}
	});
	def.presentCall = presentCall;
	return def;
}
//#endregion
//#region src/tools/skill-read.ts
/**
* melite_skill_read - progressive disclosure TIER 2: one skill's full body,
* loaded ONLY when needed (GET /v1/skills/<id>). Every read is ledgered
* gateway-side (skill.read in _ledger.jsonl), so which recipes the
* agent actually used is auditable after the fact.
*
* Ids come from melite_skill_index: global lane docs are bare stems
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
		name: "melite_skill_read",
		description: "Load ONE skill document in full (progressive disclosure tier 2): markdown body plus its name/description and genre/model when scoped. Discover ids first with melite_skill_index. Reads are recorded in the gateway ledger (skill.read) - the audit trail of which recipes informed a generation. Args: id (from melite_skill_index).",
		parameters: { id: {
			type: "string",
			description: "Skill id from melite_skill_index: \"<stem>\", \"model:<id>\" or \"model:<id>:<stem>\".",
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
				if (v && typeof v.error === "string" && v.error !== "") return [{
					type: "text",
					text: "melite_skill_read REFUSED: " + v.error
				}];
				const head = "melite_skill_read " + String(a.id ?? v.id ?? "?") + ": " + String(v.name ?? "loaded");
				const body = typeof v.content === "string" ? v.content : "";
				return [{
					type: "text",
					text: body !== "" ? head + "\n" + body : head + "\n(no body)"
				}];
			}
		},
		async execute(args, exec) {
			const id = args.id;
			if (id.length === 0) throw new Error("melite_skill_read: \"id\" is required (a skill id string from melite_skill_index)");
			const res = await request("GET", "/v1/skills/" + encodeURIComponent(id), void 0, exec.signal, READ_TIMEOUT_MS);
			return jsonClean({
				id: res.id ?? id,
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
		description: "Tail the gateway file ledger (append-only journal of runs, provisions, skill reads, server boots). Use to answer \"what happened / what ran / what downloaded\", to resume interrupted work after a restart, or to audit activity. Entries come back oldest -> newest within the tail; pair with melite_skill_read \"run-recovery\" for the full recovery workflow. Args: limit (optional, default 50, max 500), event (optional prefix filter, e.g. \"run.\" or \"prov\").",
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
				const lines = ["ledger_tail: " + String(v.shown ?? 0) + " of " + String(v.matched ?? 0) + " entries"];
				const rows = Array.isArray(v.entries) ? v.entries : [];
				const ROWS_SHOWN = 20;
				const CHAR_CAP = 6e3;
				let used = lines[0].length;
				for (const row of rows.slice(0, ROWS_SHOWN)) {
					const ts = typeof row["ts"] === "string" || typeof row["ts"] === "number" ? String(row["ts"]) : "?";
					const event = typeof row["event"] === "string" ? row["event"] : "(no event)";
					const data = row["data"];
					let detail = "";
					if (data !== null && typeof data === "object" && !Array.isArray(data)) {
						const parts = [];
						for (const [k, val] of Object.entries(data).slice(0, 6)) {
							if (val === null || val === void 0) continue;
							const text = typeof val === "object" ? JSON.stringify(val) : String(val);
							parts.push(k + "=" + (text.length > 60 ? text.slice(0, 57) + "…" : text));
						}
						detail = parts.length > 0 ? " — " + parts.join(", ") : "";
					} else if (data !== void 0) {
						const text = typeof data === "string" ? data : JSON.stringify(data);
						detail = " — " + (text.length > 80 ? text.slice(0, 77) + "…" : text);
					}
					const line = ts + " " + event + detail;
					if (used + line.length + 1 > CHAR_CAP) {
						lines.push("… row cap reached (the full rows ride the structured result)");
						break;
					}
					used += line.length + 1;
					lines.push(line);
				}
				if (rows.length > ROWS_SHOWN) lines.push("… " + String(rows.length - ROWS_SHOWN) + " more row(s) in the structured result");
				return [{
					type: "text",
					text: lines.join("\n")
				}];
			}
		},
		async execute(args, exec) {
			const a = args;
			const q = [];
			if (typeof a.limit === "number" && Number.isFinite(a.limit) && a.limit > 0) q.push("limit=" + encodeURIComponent(String(Math.floor(a.limit))));
			if (typeof a.event === "string" && a.event.length > 0) q.push("event=" + encodeURIComponent(a.event));
			const res = await request("GET", "/v1/ledger" + (q.length > 0 ? "?" + q.join("&") : ""), void 0, exec.signal, LEDGER_TIMEOUT_MS);
			const entries = Array.isArray(res.entries) ? res.entries : [];
			return jsonClean({
				shown: typeof res.shown === "number" ? res.shown : entries.length,
				matched: typeof res.matched === "number" ? res.matched : entries.length,
				entries,
				...Array.isArray(res.searched) ? { searched: res.searched } : {}
			});
		}
	});
	def.presentCall = presentCall;
	return def;
}
//#endregion
//#region src/index.ts
/**
* `@melite/harness-tools` — the estate's DSH tool surface.
*
* TWO INTERFACES, ONE PLUGIN (the interface law):
*
*   BROWSER (default — no env): compose-only. The agent discovers,
*   loads lanes, reads skills, authors cards on the bench
*   (melite_construct) and NEVER executes — the run door is the
*   USER's Run press on the card. This keeps the old contract
*   (agent/prompts/BASE_PROMPT.md): "It composes; it never
*   executes."
*
*   HEADLESS (MELITE_HEADLESS=1 — the one-shot/agent mounts): the
*   DELEGATED OPERATOR. Same queue, same doors, plus the ONE
*   execution verb melite_flow (a card or a flow tool call — single,
*   template, or stages drafted on the fly), with run_status as the
*   monitor. Both ride the queue's registration door — never a
*   bypass, never a hand-assembled graph (QUEUE LANE LAW).
*
* AD HOC TOOLS (MELITE_ADHOC="..."): registered ONLY when a session
* names them. (Empty since the disclosure stroke: enhance_prompt
* died as a tool — the editor ✦ door below keeps the user surface
* via harnessEnhance.)
*
* BASE toolset (both interfaces): melite_discover, melite_construct,
* melite_load, melite_view, comfy_manage, melite_skill_index, melite_skill_read,
* ledger_tail (+ melite_flow + run_status headless).
* Card tools compose from their card packages (named imports above
* — the fetch registrar retired with its last row).
*
* @module @melite/harness-tools
*/
/** Cordis plugin name used by loader diagnostics. */
const name = "melite-tools";
/**
* Services this fiber NEEDS: tools + the harness LLM seam (enhance
* rides ctx.llm). No webServer dependency — headless/SDK mounts boot
* without one.
*/
const inject = ["tools"];
/** EAGER — the compose loop, the only melite schemas in a session's
* first request (progressive disclosure, operator 2026-10-08: three
* doors in context, the estate's deeper doors expand on first
* catalog touch — src/expansion.ts owns the law). */
const EAGER_TOOL_NAMES = [
	"melite_discover",
	"melite_load",
	"melite_construct"
];
/** DEFERRED — seated by the first discover/load execute. The skill
* twins carry the melite_ prefix (operator 2026-10-08: they are OUR
* catalog's doors, not DSH core's skill machinery — the old
* unprefixed names invited exactly that conflation). */
const DEFERRED_TOOL_NAMES = [
	"melite_view",
	"melite_read",
	"comfy_manage",
	"melite_skill_index",
	"melite_skill_read",
	"ledger_tail"
];
/** BASE tool names — both interfaces (discovery, compose, view,
* management, audit). melite_view is the observe arm (viewing an
* artifact is not a run press — the interface law holds). */
const BASE_TOOL_NAMES = [...EAGER_TOOL_NAMES, ...DEFERRED_TOOL_NAMES];
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
	const call = asEstateCall(request);
	const headless = process.env.MELITE_HEADLESS === "1" || config.headless === true;
	const adhocEnv = (process.env.MELITE_ADHOC || "").split(",").map((s) => s.trim()).filter(Boolean);
	const adhocCfg = Array.isArray(config.adhocTools) ? config.adhocTools.map((s) => s.trim()).filter(Boolean) : typeof config.adhocTools === "string" ? config.adhocTools.split(",").map((s) => s.trim()).filter(Boolean) : [];
	const adhoc = adhocEnv.length ? adhocEnv : adhocCfg;
	const cardTools = process.env.MELITE_CARD_TOOLS === "1" || config.cardTools === true;
	c.logger.info("melite-tools: %s interface — %d base + %d headless run door(s) + %d ad hoc, gateway %s", headless ? "HEADLESS" : "BROWSER", BASE_TOOL_NAMES.length, headless ? HEADLESS_TOOL_NAMES.length : 0, adhoc.length, request);
	c.tools.register(meliteDiscover(request));
	c.tools.register(meliteConstruct(request, { headless }));
	c.tools.register(meliteLoad(request, { headless }));
	const deferredDisposers = [];
	c.effect(() => () => {
		for (const d of deferredDisposers.splice(0)) d();
	});
	const seated = /* @__PURE__ */ new Set();
	installExpansion(() => {
		const doors = [
			["melite_view", () => c.tools.register(meliteView(ctx))],
			["melite_read", () => c.tools.register(meliteRead(ctx))],
			["comfy_manage", () => c.tools.register(comfyManage(request))],
			["melite_skill_index", () => c.tools.register(skillIndex(request))],
			["melite_skill_read", () => c.tools.register(skillRead(request))],
			["ledger_tail", () => c.tools.register(ledgerTail(request))]
		];
		for (const [name, register] of doors) {
			if (seated.has(name)) continue;
			const dispose = register();
			seated.add(name);
			deferredDisposers.push(dispose);
		}
		c.logger.info("melite-tools: estate doors SEATED on catalog touch (%d total) — the expansion law", EAGER_TOOL_NAMES.length + seated.size);
	});
	c.effect(() => () => {
		clearExpansion();
	});
	if (headless) expandEstateDoors();
	if (headless) {
		c.tools.register(meliteFlow(request));
		c.tools.register(runStatus(request));
	}
	if (cardTools) {
		c.tools.register(buildMusicTool(call));
		c.tools.register(buildTtsTool(call));
		c.tools.register(buildImageEditTool(call));
		c.tools.register(buildMotionTool(call));
		c.tools.register(buildH3TimelineTool(call));
	} else c.logger.info("melite-tools: card tool faces GATED OFF (cardTools=false) — the agent law: discover/load/compose only");
}
//#endregion
export { ADHOC_TOOL_NAMES, BASE_TOOL_NAMES, DEFAULT_BENCH, DEFERRED_TOOL_NAMES, EAGER_TOOL_NAMES, HEADLESS_TOOL_NAMES, MELITE_TOOL_NAMES, apply, comfyManage, harnessEnhance, inject, ledgerTail, makeEstateRequest, matchHarnessRoute, meliteConstruct, meliteDiscover, meliteFlow, meliteLoad, meliteRead, meliteView, name, readRunText, resolveHarnessRoutes, routeName, runStatus, skillIndex, skillRead };
