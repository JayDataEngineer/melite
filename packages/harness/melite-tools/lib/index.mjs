import { _ as makeEstateRequest, a as MODIFIER_PACKS, g as makeEstate, h as asEstateCall, i as routeName, m as resolveSpecKeyForTool, n as matchHarnessRoute, o as boardedMap, r as resolveHarnessRoutes, s as bootFactsArm, t as harnessEnhance } from "./llm-complete-m1RYhZv5.mjs";
import Schema from "@deepseek-ai/schemastery";
import { buildMusicTool } from "@melite/audio-music/tool";
import { buildTtsTool } from "@melite/audio-tts/tool";
import { buildImageEditTool } from "@melite/image-image-edit/tool";
import { buildImageGenTool } from "@melite/image-image-gen/tool";
import { buildMotionTool } from "@melite/motion-motion/tool";
import { buildH3TimelineTool } from "@melite/video-h3-timeline/tool";
import { CARD_PLANE_ENGINE, RUN_ID_RE, RUN_MEDIA_PREFIX, benchDraftIdOf, benchSessionOf, canonicalRunMediaUrl, draftIdOf, liveBenchRows, projectStages } from "@melite/contracts/benchStage";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve, sep } from "node:path";
import { homedir, tmpdir } from "node:os";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { remoteErrorOf } from "@deepseek-ai/dsh-typert-protocol";
import { isTerminalStatus, statusOf, statusOrPendingOf } from "@melite/contracts/stageView";
import { normalizeJsonArrayParams } from "@melite/estate-call/cardTool";
import { coerceWireArrays, foldLegacyAliases, unwrapItemArrays } from "@melite/comfyui-card-kit";
import { FLOW_ID_RE, rootsManifest, searchedVoice } from "@melite/estate-queue";
import { createHash } from "node:crypto";
import { executeSingle, loadCardDefs, registryModel, theService } from "@melite/comfyui-cordis";
import { emitKnob } from "@melite/comfyui-card-kit/params-emit";
import { extraOf } from "@melite/contracts/extraKeys";
import { admitCrossRegimeJoin } from "@melite/models-h3";
import { CROSS_REGIME_BAG_KEYS } from "@melite/video-h3-timeline/card";
import { mediaVocab } from "@melite/contracts/mediaKinds";
import { mkdtemp, readFile, readdir, realpath, rm, stat } from "node:fs/promises";
import { AttachmentError, AttachmentId } from "@deepseek-ai/dsh-attachment";
import { probeMedia } from "@melite/contracts/media-probe";
import { listMedia } from "@melite/estate-media";
import { createUserMessage } from "@deepseek-ai/dsh-llm";
//#region src/runsDelegation.ts
/** The state file's home: the lane's DSH home (DSH_HOME when the
* lane pins one, ~/.dsh otherwise), never the plugin's own tree. */
function delegationStatePath() {
	const dshHome = process.env.DSH_HOME && process.env.DSH_HOME.trim() !== "" ? process.env.DSH_HOME : join(homedir(), ".dsh");
	return join(dshHome, "melite-runs-state.json");
}
/** Read the persisted delegation. Absent file reads as the browser
* law's default (false — the user presses Run); a corrupt or
* unreadable file refuses LOUD in the caller's log and reads as
* absent (never a silent true). Null means no DSH home could be
* resolved — memory-only mounts.
*
* @param log the boot's loud voice for a corrupt-file refusal.
* @returns the persisted state, or null when nothing persists. */
function readRunsDelegation(log) {
	const path = delegationStatePath();
	if (!existsSync(path)) return null;
	try {
		const parsed = JSON.parse(readFileSync(path, "utf8"));
		if (typeof parsed === "object" && parsed !== null && typeof parsed.delegated === "boolean") return { delegated: parsed.delegated };
		log?.warn("melite-tools: %s is not a delegation record (want {delegated: boolean}) — booting unseated", path);
		return null;
	} catch (error) {
		log?.warn("melite-tools: reading %s failed (%s) — booting unseated", path, error instanceof Error ? error.message : String(error));
		return null;
	}
}
/** Write the delegation. The toggle calls this on EVERY flip; a
* write failure is returned (never thrown) so the command's success
* voice can honestly say the flip did not persist.
*
* @param state the delegation to record.
* @returns undefined on success, else the failure's message. */
function writeRunsDelegation(state) {
	const path = delegationStatePath();
	try {
		mkdirSync(join(path, ".."), { recursive: true });
		writeFileSync(path, JSON.stringify(state) + "\n", "utf8");
		return;
	} catch (error) {
		return error instanceof Error ? error.message : String(error);
	}
}
/** THE BOOT LAW (pure — the wiring's one decision): this mount boots
* on the PERSISTED record — the operator's last toggle outlives the
* reload — defaulting to the compose law (false) when nothing
* persists.
*
* @param persisted the record read at boot (null when none).
* @returns the delegation this boot seats. */
function resolveDelegationAtBoot(persisted) {
	return persisted?.delegated === true;
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
* run_status — the run monitor.
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
* Registered by the /melite-runs delegation: the user's toggle seats
* it, and a boot whose persisted record reads ON seats it (see
* runsDelegation.ts).
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
* seat here either. DECIDED per-plane (the dry-sweep's J5,
* recorded): melite-flow.ts's sleepAbort resolves-on-abort for the
* mirror reason — its observer loop re-checks after every tick;
* the two contracts are genuinely different, not drift. */
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
function runStatus(estate) {
	const presentCall = (args) => {
		const a = typeof args === "object" && args !== null ? args : {};
		return {
			card: "generic",
			title: `Run status: ${String(a.runId ?? "?")}`,
			kind: "read",
			rawInput: String(a.runId ?? "?")
		};
	};
	return defineTool({
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
				const artVoice = artPaths.length ? "\nartifacts (rooted at the estate output tree, not your cwd): " + artPaths.join("\n  ") + (artifacts.length > 4 ? `\n  (+${artifacts.length - 4} more)` : "") : "";
				const exportVoice = terminal && typeof v.export_name === "string" && v.export_name !== "" ? `\nexport: '${v.export_name}' — preview audio is the design sample; the deliverable .qvoice is ${typeof v.export_path === "string" && v.export_path !== "" ? v.export_path : `the newest ${v.export_name}_*.qvoice under the voices root`}` : "";
				const variantVoice = typeof v.variant === "string" && v.variant !== "" ? " · variant " + v.variant : "";
				const loud = v.loudness;
				const loudVoice = terminal && loud !== null && typeof loud === "object" && typeof loud.loudness_lufs === "number" && Number.isFinite(loud.loudness_lufs) && typeof loud.peak_db === "number" && Number.isFinite(loud.peak_db) ? ` · ${loud.loudness_lufs.toFixed(2)} LUFS / ${loud.peak_db.toFixed(2)} dBTP` : "";
				const fresh = v.voice_freshness;
				const freshVoice = terminal && fresh !== null && typeof fresh === "object" && typeof fresh.reused_existing === "boolean" && typeof fresh.voice_file === "string" ? ` · voice ${fresh.voice_file}${fresh.reused_existing ? " (REUSED — a stale name won; mint a fresh one)" : " (fresh mint)"}` : "";
				const missVoice = terminal && v.attribution === "missed" ? " — NOT shown on the user’s cards tab (stamp missed; artifacts are fine — re-stamp to show it)" : "";
				return [{
					type: "text",
					text: "run " + String(v.run_id ?? "?") + " " + String(v.status ?? "?") + pos + " — " + done + "/" + total + " stage(s)" + plan + age + (artifacts.length ? " · " + artifacts.length + " artifact(s)" : "") + (v.wait_expired ? " · wait expired (budget spent, not terminal — wait again)" : "") + (typeof v.waited_s === "number" ? " · waited " + v.waited_s + "s" : "") + variantVoice + loudVoice + freshVoice + missVoice + stageVoice + artVoice + exportVoice
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
					res = await estate.runsStatus(runId, false, exec.signal, TIMEOUT_MS$3);
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
}
//#endregion
//#region src/tools/melite-construct.ts
/** The construct verb set — ONE home (the skills-vs-dsh-autodocs
* audit's cure 1: the set was spelled four ways in this file, the
* header comment already stale-missing clear + floor). The schema
* enum, the mutation set, and the header list above all derive from
* this order; the estate wire's BenchVerb is a DIFFERENT law (the
* fiber's own mutation arms) and stays its own home. */
const CONSTRUCT_VERBS = [
	"read",
	"load",
	"patch",
	"add_stage",
	"remove_stage",
	"archive",
	"unarchive",
	"clear",
	"floor",
	"rewire",
	"undo",
	"validate"
];
/** The doc ride's fetch bound (same 20s as the load door's card read):
*  the landing has already succeeded, so a slow doc plane must not
*  hold the call open. */
const DOC_TIMEOUT_MS = 2e4;
/** The default bench — the unattributed seat (script runs,
*  legacy callers). */
const DEFAULT_BENCH = "main";
function benchKeyOfExec(exec) {
	const id = exec.agent?.id;
	if (typeof id !== "string" || id === "") return DEFAULT_BENCH;
	if (id.startsWith("session-")) return benchSessionOf(id);
	return "delegate:" + id;
}
function benchKeyOf(a) {
	const k = a["bench"];
	return benchSessionOf(typeof k === "string" ? k : void 0);
}
/** The mutation verbs whose failure leaves the write unproven — the
*  door cannot say whether the seat applied before it failed
*  (slice 5's ambiguous_no_write landing state). Read-only verbs and
*  validate never claim a landing. */
const MUTATION_VERBS = new Set(CONSTRUCT_VERBS.filter((v) => v !== "read" && v !== "validate"));
/** The ambiguous-no-write landing fragment for a failed mutation —
*  a Record so the payload's index signature stays JsonValue (an
*  optional `landing?: undefined` property is not a JsonValue). */
function unprovenLandingOf(verb) {
	return MUTATION_VERBS.has(verb) ? { landing: "ambiguous_no_write" } : {};
}
/** Refusal formatting shared by every verb (the remote's RemoteError
*  first — code + message, the CAS detail rides details.current_rev —
*  then any Error's message; lanes still awaiting their remote refuse
*  loudly as plain errors). A mutation's failure carries the third
*  landing state: the write is UNPROVEN (a transport failure cannot
*  prove the seat did not apply), so the answer says re-read before
*  retrying instead of implying a clean no-write. */
function refusalOf(e, verb, bench) {
	const landing = unprovenLandingOf(verb);
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
			...currentRev !== void 0 ? { current_rev: currentRev } : {},
			...landing
		});
	}
	return jsonClean({
		verb,
		bench,
		error: e instanceof Error ? e.message : String(e),
		error_kind: "remote",
		ok: false,
		...landing
	});
}
/** The card-schema remedy for a compile refusal (slice 5): the
*  structured {public_param, current_value, allowed_values} the agent
*  can act on. Best-effort — a card-defs read that fails leaves the
*  compile_error as the only voice, never a fabricated cure.
*  @param stages the post-write bench stages.
*  @returns the first named violation, or undefined. */
async function remedyFor(stages) {
	try {
		return remedyOf(stages, await loadCardDefs());
	} catch {
		return;
	}
}
/** The landing state a write's compile verdict names (slice 5, the
*  transcript's most confusing state given its own seat): a stage
*  that LANDED but does not compile is not the same event as a write
*  that never landed. Returns {} when no verdict ran (the door has
*  nothing to claim). */
function landingOf(compile) {
	if (compile === void 0) return {};
	return { landing: compile["compile_ok"] === true ? "landed_and_compiling" : "landed_not_compiling" };
}
/** The address of one projected stage row (the view's id — the
*  source row's own id, ''-valued when the row carries none). */
function stageAddrOf(row) {
	return String(row["stage"] ?? row["id"] ?? "");
}
/** The sibling stage one projected row wires to, if any — the
*  {stage} reference inside its inputs that names ANOTHER row of the
*  same projection. A solo run of a sibling-wired stage would refuse
*  on the missing wire even when the bench is healthy (the sibling
*  rides the whole projection, never the solo), so the fan-out skips
*  these rows and names the sibling instead. Returns undefined for
*  unwired rows, self-wires, and wires to stages outside the view
*  (a dangling wire IS that stage's own news — the solo runs and the
*  door refuses, correctly attributed). */
function siblingWiredTo(stages, row) {
	const addrs = new Set(stages.map((entry) => stageAddrOf(entry)));
	const self = stageAddrOf(row);
	const inputs = row["inputs"];
	if (typeof inputs !== "object" || inputs === null || Array.isArray(inputs)) return void 0;
	for (const slot of Object.values(inputs)) if (typeof slot === "object" && slot !== null && !Array.isArray(slot)) {
		const to = slot["stage"];
		if (typeof to === "string" && to !== "" && to !== self && addrs.has(to)) return to;
	}
}
/** F28 — THE PER-STAGE SOLO FAN-OUT (2026-11-01, qa8 residual item
*  12). The whole-projection verdict says WHETHER the bench
*  compiles; when it refuses, the operator still cannot see WHICH
*  stage burned. Each unsiblinged stage runs SOLO against the same
*  door (same flow id, same timeout) so a refusal names its stage:
*  a solo that compiles clears its stage, a solo that refuses
*  carries that stage's own door error. Sibling-wired stages skip
*  (see siblingWiredTo) — their solo would burn on the absent
*  sibling, which is the projection's shape, never their fault.
*  Read-only: runsValidate judges, never writes — the no-mint law
*  (F14/F26) holds, benchVerb never fires from this fan-out. */
async function soloStageVerdicts(estate, flowId, stages, signal) {
	const verdicts = [];
	for (const row of stages) {
		const addr = stageAddrOf(row);
		const via = siblingWiredTo(stages, row);
		if (via !== void 0) {
			verdicts.push({
				stage: addr,
				solo: "skipped-sibling-wired",
				via
			});
			continue;
		}
		try {
			const r = await estate.runsValidate({ flow_inline: {
				id: flowId,
				stages: [row]
			} }, signal, 2e4);
			if (r["ok"] === true || r["valid"] === true) verdicts.push({
				stage: addr,
				compile_ok: true
			});
			else verdicts.push({
				stage: addr,
				compile_ok: false,
				compile_error: typeof r["error"] === "string" ? r["error"] : JSON.stringify(r)
			});
		} catch (e) {
			const refusal = remoteErrorOf(e);
			verdicts.push({
				stage: addr,
				compile_ok: false,
				compile_error: refusal !== void 0 ? refusal.message : e instanceof Error ? e.message : String(e)
			});
		}
	}
	return verdicts;
}
/** The compile verdict over an EXPLICIT stage projection — the one
*  door the validate verb, the post-write verdict, and the pre-mint
*  gate (F14/F26) all walk. Never throws — a compile refusal is a
*  VALUE the answer teaches with, not a failed mutation.
*  @returns undefined when the projection is empty (nothing judges). */
async function verdictOfStages(estate, intent, stages, signal) {
	if (stages.length === 0) return void 0;
	const flowId = typeof intent === "string" && intent !== "" && FLOW_ID_RE.test(intent) ? intent : "bench";
	try {
		const r = await estate.runsValidate({ flow_inline: {
			id: flowId,
			stages
		} }, signal, 2e4);
		if (r["ok"] === true || r["valid"] === true) return { compile_ok: true };
		return {
			compile_ok: false,
			compile_error: typeof r["error"] === "string" ? r["error"] : JSON.stringify(r),
			...await remedyFragment(stages),
			stage_verdicts: await soloStageVerdicts(estate, flowId, stages, signal)
		};
	} catch (e) {
		const refusal = remoteErrorOf(e);
		return {
			compile_ok: false,
			compile_error: refusal !== void 0 ? refusal.message : e instanceof Error ? e.message : String(e),
			...await remedyFragment(stages),
			stage_verdicts: await soloStageVerdicts(estate, flowId, stages, signal)
		};
	}
}
/** Run the compile check the validate verb runs, over the bench's
*  CURRENT stages (post-write truth), and fold the verdict into a
*  result-payload fragment.
*  @returns undefined when the bench holds no stages to compile. */
async function compileVerdictOf(estate, bench, signal) {
	const b = await readBench(estate, bench, signal);
	return verdictOfStages(estate, b["intent"], projectStages(liveBenchRows(b["stages"])), signal);
}
/** The projection's twin of the door's own mint (drafts bench.ts
*  highestStageSuffix/nextStageId: MAX s_<n> + 1, skipping taken
*  ids). Names the candidate row INSIDE the judged view only — the
*  stored row's id stays the door's mint, and the answer names the
*  door's own r.stage. Never a second writer: this value is never
*  stored anywhere. */
function projectedStageId(rows) {
	const taken = /* @__PURE__ */ new Set();
	let max = -1;
	if (Array.isArray(rows)) for (const row of rows) {
		if (typeof row !== "object" || row === null) continue;
		const id = String(row["id"] ?? "");
		taken.add(id);
		const m = /^s_(\d+)$/.exec(id);
		if (m !== null && Number(m[1]) > max) max = Number(m[1]);
	}
	let n = max;
	let fresh;
	do {
		n += 1;
		fresh = "s_" + String(n);
	} while (taken.has(fresh));
	return fresh;
}
/** The card's first-declared family (boarded[0]) — the same default
*  the client add door seeds and the run press resolves (the
*  catalog's card-id alias law: first = the DEFAULT family).
*  Undefined for a card with no board to name (pure-tool). The board
*  is the predicate — the card-face requiresModel flag is a
*  provisions concern and is false on family-carrying cards too
*  (image-edit, music: live defs, F27's own burn). */
function firstDeclaredFamilyOf(def) {
	if (def === null || typeof def !== "object") return void 0;
	const d = def;
	if (!Array.isArray(d.boarded)) return void 0;
	return d.boarded.find((f) => typeof f === "string" && f !== "");
}
/** THE MINT CARRIES THE SEAT (F27, qa8 session 7a82): the bench
*  stage's family address is params.model — the one seat the estate
*  reads (the bench StagePick walk, the card gate's demand, the
*  family-conditional cards' compose). A card-mode add that stated
*  the seat anywhere else minted a FAMILYLESS row, and only the
*  operator's press met `no declared action for family ''`. The seat
*  now rides the mint: a stated top-level `model` folds into
*  params.model; a family-carrying card with NO stated seat takes
*  its first-declared family (firstDeclaredFamilyOf — the same
*  boarded[0] the GUI derives). A stated params.model is THE seat
*  and rides untouched (identity = the no-derivation signal, the
*  same contract coerceArrayLanes speaks). Every carry echoes an
*  applied_derivations line — the agent sees the seat the row holds.
*  @param model the add_stage top-level `model` arg (undefined when
*  the caller stated none).
*  @param params the derived params bag (undefined = none stated).
*  @param def the card definition (undefined = no board law). */
function familySeatCarry(model, params, def) {
	if (params !== void 0 && typeof params["model"] === "string" && params["model"] !== "") return {
		params,
		derived: []
	};
	const statedTop = typeof model === "string" && model !== "";
	const seat = statedTop ? model : firstDeclaredFamilyOf(def);
	if (seat === void 0) return {
		params,
		derived: []
	};
	return {
		params: {
			...params ?? {},
			model: seat
		},
		derived: [{
			param: "model",
			from: (params !== void 0 ? params["model"] : void 0) ?? null,
			to: seat,
			rule: statedTop ? "model-seat-to-params" : "first-declared-family"
		}]
	};
}
/** The remedy payload fragment (empty when none is derivable). */
async function remedyFragment(stages) {
	const remedy = await remedyFor(stages);
	return remedy !== void 0 ? { remedy } : {};
}
/** Every $-token in a params bag, at the top level and one nesting
*  level deep (the spell grammar's whole domain), keyed by the param
*  it rides. Returns [] when the bag carries no spells. */
function spellTokensIn(params, prefix = "") {
	if (typeof params !== "object" || params === null) return [];
	const found = [];
	for (const [key, value] of Object.entries(params)) {
		const on = prefix === "" ? key : prefix + "." + key;
		if (typeof value === "string" && value.startsWith("$")) found.push({
			token: value,
			on
		});
		else if (typeof value === "object" && value !== null && prefix === "") found.push(...spellTokensIn(value, on));
	}
	return found;
}
/** The inputs record of one stage row (the bench's own spelling:
*  {slot: {stage, output?}}); {} when the row wires nothing. */
function inputsOfStageRow(stages, stage) {
	if (typeof stage !== "string") return {};
	const row = stages.find((entry) => entry["stage"] === stage || entry["id"] === stage);
	const inputs = row === void 0 ? void 0 : row["inputs"];
	return typeof inputs === "object" && inputs !== null && !Array.isArray(inputs) ? inputs : {};
}
/** The stage row's card id (the bench read's truth for a patch's
*  schema-derived walk) — '' when the stage is absent or cardless. */
function cardOfStageRow(stages, stage) {
	if (typeof stage !== "string") return "";
	const row = stages.find((entry) => entry["stage"] === stage || entry["id"] === stage);
	const card = row === void 0 ? void 0 : row["card"];
	return typeof card === "string" ? card : "";
}
/** True when a params bag carries a value the CARD's craft law could
*  rewrite — a non-empty string (the only values a preprocessor
*  touches: prompt seats). The patch door must know the stage's card
*  before it can apply that card's law, so this joins the pre-read
*  trigger beside the spell and wire-shape candidates. */
function craftCandidate(params) {
	if (typeof params !== "object" || params === null || Array.isArray(params)) return false;
	return Object.values(params).some((v) => typeof v === "string" && v !== "");
}
/** True when a params bag carries a value the card-seat wire grammar
*  would restore on a declared array lane ("" | $name | {item:…}).
*  The patch door reads the bench only when this fires — the same
*  bounded-read law the spell voice already rides. */
function wireShapeCandidate(params) {
	if (typeof params !== "object" || params === null || Array.isArray(params)) return false;
	for (const v of Object.values(params)) {
		if (v === "") return true;
		if (typeof v === "string" && v.startsWith("$")) return true;
		if (typeof v === "object" && v !== null && !Array.isArray(v)) {
			const keys = Object.keys(v);
			if (keys.length === 1 && keys[0] === "item") return true;
		}
	}
	return false;
}
/** The voice itself: each $-token named with its resolution source.
*  A token whose name matches a WIRED input resolves to that channel
*  (stage.output); every other token is a REQUEST INITIAL — the run
*  must declare it or the spell gate refuses at start. */
function spellVoiceOf(params, inputs) {
	const wired = typeof inputs === "object" && inputs !== null && !Array.isArray(inputs) ? inputs : {};
	return spellTokensIn(params).map(({ token, on }) => {
		const name = token.slice(1);
		const channel = wired[name];
		if (typeof channel === "object" && channel !== null && !Array.isArray(channel) && typeof channel["stage"] === "string") {
			const output = channel["output"];
			return {
				token,
				on,
				resolves: "channel",
				via: channel["stage"] + "." + (typeof output === "string" && output !== "" ? output : "default")
			};
		}
		return {
			token,
			on,
			resolves: "request_initial",
			via: name + " — the run must carry this initial (user attaches it at the Run press), or wire inputs." + name + " {stage, output}; a real file is an asset path from melite_view, never a $spell"
		};
	});
}
/** GET the bench; not-found → ensure (birth) → GET again. Reads are
*  the freshness mechanism — always a remote round trip. */
async function readBench(estate, bench, signal) {
	const get = () => estate.benchGet(bench, signal, 15e3);
	try {
		return await get();
	} catch (e) {
		if (remoteErrorOf(e)?.code === "bench/not-found") {
			await estate.benchEnsure({ session: bench }, signal, 15e3);
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
*  could clobber a concurrent write silently).
*
*  THE STATED-HOLD LAW (GAPS-10, the silent-land burn: `patch
*  {expect_rev: 58}` on a rev-69 bench LANDED at rev 70): the
*  rebase is the AUTO-REV front door's own cure, never a
*  stale-hold eraser. A STATED expect_rev is an assertion — "the
*  state you saw" (the schema's own words) — and a bench that moved
*  under an assertion REFUSES loud: the verdict surfaces with
*  current_rev and the client re-reads and re-applies. Only a rev
*  the TOOL filled (the caller omitted expect_rev, or a verb like
*  floor that reads the rev itself) may rebase: the caller asserted
*  nothing, so one bounded retry behind the fill's race is honest.
*  The drafts-side CAS (estate/drafts bench.ts casCheck) was always
*  strict — the leniency lived here alone. */
async function postBenchVerb(estate, bench, verbPath, body, signal, opts) {
	const autoRev = opts?.autoRev ?? !(body["expect_rev"] !== void 0 && body["expect_rev"] !== null);
	const attempt = (rev) => estate.benchVerb(bench, verbPath, {
		...body,
		expect_rev: rev
	}, signal, 15e3);
	let rev0 = body["expect_rev"];
	if (rev0 === void 0 || rev0 === null) {
		const fresh = await readBench(estate, bench, signal);
		if (typeof fresh["rev"] === "number") rev0 = fresh["rev"];
	}
	try {
		return await attempt(rev0);
	} catch (e) {
		if (!isCasConflict(e)) throw e;
		if (!autoRev) throw e;
		const rev = (await readBench(estate, bench, signal))["rev"];
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
*  last_run is PER-STAGE (commission 015, §6 finding 6): a run
*  names the stages it composed in its stage_ids digest (stamped
*  at sidecar birth), and a stage advertises the NEWEST run that
*  names it — never another stage's run. Runs from before the
*  digest cannot name their stages, so they stamp nothing (the
*  runs facts still show the draft ran; the stage row keeps its
*  own memory). The join is also INCARNATION-BOUNDED (W-3 /
*  F3-11, 2026-11-05): when the bench doc carries an `epoch`
*  (drafts clearBench stamps it, the run start carries it into the
*  sidecar identity prefix), only runs stamped with the SAME epoch
*  join — positional stage ids restart at add_stage, so a pre-clear
*  sidecar naming `s_1` would otherwise adopt the fresh row.
*  No match carries last_run: null PLUS the window facts
*  (runs {checked, total, matched}) — never-ran reads off small
*  totals, window-miss off total >> checked. Enrichment DEGRADES,
*  never refuses: a failed runs call (seat absent, lane hiccup)
*  returns the stages verbatim with no runs key — lookup-failed
*  (key absent) vs no-match (null + facts) stay distinct.
*  One window: the newest 100 global runs. */
async function withLastRun(estate, bench, signal) {
	const stages = bench["stages"];
	const none = {
		stages,
		runs: null
	};
	if (!Array.isArray(stages) || stages.length === 0) return none;
	const draftId = bench["draft_id"];
	if (typeof draftId !== "string" || draftId === "") return none;
	const benchEpoch = bench["epoch"];
	let env;
	try {
		env = await estate.runsList("100", signal, 15e3);
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
		if (typeof benchEpoch === "string" && benchEpoch !== "" && rec["bench_epoch"] !== benchEpoch) continue;
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
	const summaryOf = (win) => ({
		run_id: win["run_id"],
		status: win["status"],
		created_at: win["created_at"],
		thumbnail: win["thumbnail"],
		artifacts: win["artifacts"],
		...typeof win["export_name"] === "string" && win["export_name"] !== "" ? { export_name: win["export_name"] } : {},
		...typeof win["export_path"] === "string" && win["export_path"] !== "" ? { export_path: win["export_path"] } : {}
	});
	const namesOf = (row) => {
		const v = row["stage_ids"];
		return new Set(Array.isArray(v) ? v.filter((x) => typeof x === "string" && x !== "") : []);
	};
	return {
		stages: stages.map((s) => {
			if (typeof s !== "object" || s === null || Array.isArray(s)) return s;
			const sid = s["id"];
			const hit = typeof sid === "string" && sid !== "" ? mine.find((m) => namesOf(m.row).has(sid)) : void 0;
			return {
				...s,
				...paramsSummary(s),
				last_run: hit ? summaryOf(hit.row) : null
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
/** The card's walkable schema carrier (plain schemas carry the dict;
*  hand-written normalizers carry the inner schemastery object at
*  schemaCarrier) — the floor verb's carrier law, shared. */
function carrierOfDef(def) {
	if (def === null || typeof def !== "object") return void 0;
	const d = def;
	const carrier = d.schemaCarrier ?? d.schema;
	if (carrier === null || carrier === void 0) return void 0;
	return carrier;
}
/** The derivation rule a changed value walked (the echo's WHY — a
*  bare from/to pair would leave the agent guessing which law fired). */
function derivationRuleOf(from) {
	if (from === "") return "empty-string-to-array";
	if (typeof from === "string" && from.startsWith("$")) return "spell-to-array";
	if (typeof from === "object" && from !== null && !Array.isArray(from)) {
		const item = from["item"];
		return Array.isArray(item) ? "item-wrapper-to-array" : "single-item-to-array";
	}
	return "scalar-to-array";
}
/** Coerce a params bag against the card's declared array lanes, at
*  the WRITE. Returns the ORIGINAL bag when nothing changed (identity
*  is the "no derivation" signal the echo reads).
*  @param def the stage's card definition (undefined = no law).
*  @param params the caller's params bag.
*  @returns the bag to store plus the derivations to echo. */
function coerceArrayLanes(def, params) {
	const carrier = carrierOfDef(def);
	if (carrier?.dict === void 0) return {
		params,
		derived: []
	};
	let out = coerceWireArrays(carrier, params);
	for (const [key, node] of Object.entries(carrier.dict)) {
		const inner = node;
		if (inner?.type !== "array") continue;
		const v = out[key];
		if (typeof v !== "string" && typeof v !== "number" && typeof v !== "boolean") continue;
		if (v === "") continue;
		const el = inner.inner?.type;
		if (el !== "string" && el !== "number" && el !== "boolean") continue;
		if (out === params) out = { ...params };
		out[key] = [v];
	}
	const derived = [];
	for (const key of Object.keys(out)) {
		if (out[key] === params[key]) continue;
		derived.push({
			param: key,
			from: params[key],
			to: out[key],
			rule: derivationRuleOf(params[key])
		});
	}
	return {
		params: out,
		derived
	};
}
/** THE CARD-OWNED CRAFT PREPROCESSOR (slice 6, H5's split): the card
*  declares the FORMATTING law of its prompt seats and the write door
*  applies it — the bench stores the spelling the card's own grammar
*  wants, so compose is already correct and the agent stops reading a
*  craft manual per request. A preprocessor fixes spacing; it never
*  invents content. The fix rides the SAME applied_derivations echo the
*  array-lane restore uses (rule names are `craft:<rule>`), so the
*  agent sees what changed instead of discovering it in a refusal.
*  Returns the ORIGINAL bag when nothing changed (the no-derivation
*  signal) and an empty list for a card with no craft law.
*  @param def the stage's card definition (undefined = no law).
*  @param params the params bag the array-lane restore already walked.
*  @returns the bag to store plus one derivation per fired rule. */
function craftParams(def, params) {
	if (def === null || typeof def !== "object") return {
		params,
		derived: []
	};
	const craft = def.craft;
	if (craft === void 0 || craft === null || typeof craft.normalize !== "function") return {
		params,
		derived: []
	};
	const rewrite = craft.normalize(params);
	const next = rewrite.params;
	const fixed = Array.isArray(rewrite.fixed) ? rewrite.fixed : [];
	if (next === void 0 || next === null || typeof next !== "object" || Array.isArray(next)) return {
		params,
		derived: []
	};
	const out = next;
	const derived = [];
	for (const f of fixed) {
		if (f === null || typeof f !== "object") continue;
		const param = f.param;
		const rule = f.rule;
		if (typeof param !== "string" || typeof rule !== "string") continue;
		if (out[param] === params[param]) continue;
		derived.push({
			param,
			from: params[param],
			to: out[param],
			rule: "craft:" + rule
		});
	}
	return {
		params: out,
		derived
	};
}
/** THE FIRST-DOOR DERIVATIONS, in one pass: the card's declared array
*  lanes are restored, then the card's craft law rewrites its prompt
*  seats — one echo list, two laws (the answer never grows a second
*  derivations key). */
function deriveParams(def, params, held) {
	const coerced = coerceArrayLanes(def, params);
	const crafted = craftParams(def, coerced.params);
	const folded = legacyAliasFold(def, crafted.params, held);
	return {
		params: folded.params,
		derived: [
			...coerced.derived,
			...crafted.derived,
			...folded.derived
		]
	};
}
/** THE ONE-SPELLING WRITE (operator 2026-11-14: "I told you ONE
*  BENCH, but the agent and user have different input parameters"):
*  a legacy input alias the agent states (image1 on image-edit,
*  image_name on the h3 video card) composes — the lanes merge it
*  engine-side — but the user's drill renders the CANONICAL seat
*  and read the row BLANK: the agent had attached the image, the
*  user's input square was empty. The write stores the STATE, not
*  the wire's spelling (deriveParams' own law): the fold merges
*  alias values into the canonical seat exactly as the compose lane
*  would (declared order, blanks dropped, a stated canonical WINS —
*  judged against the MERGED row, `held` under the patch, so an
*  alias stated over a row that already holds the canonical seat
*  folds away instead of overwriting the user's attach), NULLS the
*  folded alias keys (the merge-patch unset — the stored row
*  carries one channel, never two spellings side by side), and
*  echoes an applied_derivations line so the agent sees the seat
*  its next patch should state. Spells ride untouched: the run's
*  spell gate and rewrite both recurse list seats.
*  @param def the card definition (its flowKinds declare the law).
*  @param params the crafted params bag (a patch delta, or a whole
*  row's params at load/add_stage — held undefined then: the bag IS
*  the row).
*  @param held the stage row's current params (patch arm only —
*  the merge the door will land). */
function legacyAliasFold(def, params, held) {
	const fk = def !== null && typeof def === "object" ? def.flowKinds : void 0;
	if (fk === void 0 || fk === null) return {
		params,
		derived: []
	};
	const aliasKeys = Object.keys(fk.aliasSeats ?? {});
	if (aliasKeys.every((k) => !(k in params))) return {
		params,
		derived: []
	};
	const view = {
		...held ?? {},
		...params
	};
	for (const [k, v] of Object.entries(params)) if (v === null) delete view[k];
	const folded = foldLegacyAliases(fk, view);
	const bag = { ...params };
	const derived = [];
	const seats = [...new Set(Object.values(fk.aliasSeats ?? {}))];
	for (const seat of seats) {
		const before = seat in view ? view[seat] : void 0;
		if (JSON.stringify(folded[seat]) !== JSON.stringify(before)) {
			bag[seat] = folded[seat] ?? null;
			derived.push({
				param: seat,
				from: before ?? null,
				to: folded[seat] ?? null,
				rule: "legacy-alias-fold — the card's canonical input seat (the drill renders this spelling; the legacy alias still composes but renders nowhere)"
			});
		}
	}
	for (const alias of aliasKeys) if (alias in view) {
		if (held === void 0) delete bag[alias];
		else bag[alias] = null;
	}
	return {
		params: bag,
		derived
	};
}
/** The card's declared wiring lanes — the canonical ports plus the
*  legacy spellings old drafts still wire (never offered as a face,
*  accepted for archives). Undefined when the card declares no
*  flowKinds (no lane law to judge). */
function lanesOf(def) {
	if (def === null || typeof def !== "object") return void 0;
	const fk = def.flowKinds;
	if (fk === void 0 || fk === null || fk.inputs === void 0) return void 0;
	return {
		canonical: Object.keys(fk.inputs),
		legacy: Object.keys(fk.legacyAliases ?? {})
	};
}
/** Refuse a wiring lane the card does not declare, naming the lanes it
*  does — never the silent-accept class (an undeclared channel is fed
*  by nothing the run's kind pass knows, so the stage renders
*  text-only). THE EXPECTED-KIND CURE (friction F32, 2026-11-03): a
*  lane the card does not port is LAWFUL when the same call declares
*  its expected kind (expected {lane: kind} — the card doc's own
*  documented shape, e.g. the h3-timeline soundtrack wires
*  {"line1": "audio"}): the kind pass then judges the channel by its
*  declared kind, exactly the pass the run layer's $spell resolution
*  rides (runsStart's inputNames). A custom lane with NO declared
*  kind keeps the refusal — that is the text-only class.
*  Returns undefined when every key is lawful, the inputs bag is
*  absent, or the card carries no lane law.
*  @param card the stage's card id (the refusal names it)
*  @param inputs the wiring bag under judge
*  @param def the card definition (its declared lanes)
*  @param expected the same call's expected-kind map (add_stage's
*  arg, the stage row's own key at load, the bench row's key at
*  rewire) */
function unknownLaneRefusal(card, inputs, def, expected) {
	if (inputs === null || typeof inputs !== "object" || Array.isArray(inputs)) return void 0;
	const lanes = lanesOf(def);
	if (lanes === void 0) return void 0;
	const known = /* @__PURE__ */ new Set([...lanes.canonical, ...lanes.legacy]);
	const kinds = expected !== null && typeof expected === "object" && !Array.isArray(expected) ? expected : {};
	const bad = Object.keys(inputs).filter((k) => !known.has(k) && typeof kinds[k] !== "string");
	if (bad.length === 0) return void 0;
	const list = lanes.canonical.length > 0 ? lanes.canonical.join(", ") : "(none declared)";
	return {
		error: "input lane " + bad.map((k) => JSON.stringify(k)).join(", ") + (bad.length === 1 ? " is" : " are") + " not a port of card " + JSON.stringify(card) + " — the declared lanes: " + list + (lanes.legacy.length > 0 ? " (legacy: " + lanes.legacy.join(", ") + ")" : "") + ". Wire one of those, or declare the lane's expected kind (expected {" + bad.map((k) => JSON.stringify(k) + ": \"kind\"}").join(", ") + ") — a declared custom channel is judged by its own kind (the $spell soundtrack shape); an undeclared lane with no kind would be fed by nothing the run's kind pass knows, and the stage would render text-only.",
		error_kind: "unknown-lane",
		allowed_lanes: lanes.canonical
	};
}
/** The first card-schema violation a compile refusal can name — the
*  structured remedy {public_param, current_value, allowed_values}
*  the agent can act on without decoding prose (H6: a refusal may
*  only speak vocabulary its own door accepts). Walks the SAME dict
*  the form and agent faces serve (emitKnob), so a card that moves
*  its enum or bounds moves the remedy with it. Undefined when no
*  enumerated/bounded violation is found — the compile_error is the
*  voice then, never an invented cure. */
function remedyOf(stages, defs) {
	for (const row of stages) {
		const card = typeof row["card"] === "string" ? row["card"] : "";
		const carrier = carrierOfDef(defs.get(card));
		if (carrier?.dict === void 0) continue;
		const params = typeof row["params"] === "object" && row["params"] !== null && !Array.isArray(row["params"]) ? row["params"] : {};
		for (const [key, node] of Object.entries(carrier.dict)) {
			const v = params[key];
			if (v === void 0 || node === null || node === void 0) continue;
			const knob = emitKnob(node);
			const allowed = knob["enum"];
			if (Array.isArray(allowed) && !allowed.includes(v)) return {
				public_param: key,
				current_value: v,
				allowed_values: allowed
			};
			if (typeof v !== "number") continue;
			const min = knob["minimum"];
			const max = knob["maximum"];
			if (typeof min === "number" && v < min) return {
				public_param: key,
				current_value: v,
				allowed_values: typeof max === "number" ? [min, max] : [min]
			};
			if (typeof max === "number" && v > max) return {
				public_param: key,
				current_value: v,
				allowed_values: typeof min === "number" ? [min, max] : [max]
			};
		}
	}
}
/** Fetch the card's agent doc for the just-in-time ride (slice 4b).
*  Enrichment only: a load failure or a doc-less card answers
*  undefined and never blocks the landing. Dedupe is by the DOC's own
*  digest — the same text never rides twice in one session.
*
* @param estate the tool's estate seat.
* @param card the landed card id.
* @param sent the session's sent-doc digests (card → digest).
* @param signal the call's abort signal.
* @returns the doc payload, or undefined when the card has no doc. */
async function cardDocOf(estate, card, sent, signal) {
	let bundle;
	try {
		bundle = await estate.loadCard("card", card, signal, DOC_TIMEOUT_MS);
	} catch {
		return;
	}
	const agents = bundle?.agents;
	if (!Array.isArray(agents)) return void 0;
	const files = [];
	for (const row of agents) {
		const path = row?.path;
		const text = row?.text;
		if (typeof path === "string" && path !== "" && typeof text === "string" && text !== "") files.push({
			path,
			text
		});
	}
	if (files.length === 0) return void 0;
	const digest = createHash("sha256").update(files.map((f) => f.path + "\0" + f.text).join("\0")).digest("hex").slice(0, 16);
	const prev = sent.get(card);
	if (prev === digest) return {
		card,
		digest,
		unchanged: true
	};
	sent.set(card, digest);
	return {
		card,
		digest,
		...prev !== void 0 ? { changed: true } : {},
		files
	};
}
function meliteConstruct(estate, opts = {}) {
	const sentDocs = /* @__PURE__ */ new Map();
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
	return defineTool({
		name: "melite_construct",
		description: "Author THE shared bench — one working flow the user sees live in the cards tab and edits alongside you. " + (opts.delegated === true ? "This never executes (melite_flow runs what is here; the user presses Run). " : "You compose the flow and edit its state here, live with the user — runs start at the user's Run press, never yours. ") + "Verbs: read (the state — start here before patch/rewire/remove_stage (verbs that address an existing stage need its state); add_stage needs NO prior read — it mints its own id and grows the bench; a stage that has run carries last_run {run_id, status, artifacts} — null + runs {checked, total, matched} when the draft has no run in the window; view a run_id with melite_view, chain it with {stage, output}) | load (replace stages wholesale — the prior bench is one undo away, and every run already taken keeps its outputs and its stage list, restorable from the media tab; refused on a non-empty bench unless overwrite:true confirms the replacement; prefer add_stage to grow the bench) | patch {stage, params} | archive/unarchive {stage} (archive keeps the row with its result, every run face skips it; unarchive restores it) | add_stage {card, params?, inputs?, expected?, outputs?} (inputs wire PRIOR STAGES through the card's declared ports, never files: inputs {image1: {stage: \"s_0\", output: \"default\"}} AND params {image1: \"$image1\"} — the $spell is the CHANNEL REFERENCE ONLY: it resolves at run time to that wired stage output or a request initial the USER attaches at the Run press, nothing else; for a REAL FILE on disk use its asset path from melite_view, never a $spell; to chain the last generation, bind its stage, never hunt its artifact on disk; kinds derive from the card's ports — state expected only to override, outputs only for custom channels) | remove_stage {stage} | clear (EVERY stage out in one rev; undo restores all) | floor {stage?} (clamps every resolution-group param to the card's DECLARED minimum — one stage when {stage} names one, every stage when absent; floors derive live off the card's own schema, never hand-baked numbers; every write is voiced {param, from, to}; absent params are SET to the floor (defaults are not assumed minimal); values at/below it stay untouched; a card declaring no resolution group says so; and the whole walk lands as ONE write — a refusal anywhere leaves the bench unchanged) | rewire {stage, input, from?} (from is {stage, output} | {initial} — same law: stage bindings, never paths) | undo {n?, author?} | validate (compile check, no GPU). Mutations take expect_rev from your last read — or omit it: the tool fills the fresh rev itself (one bounded read). A STATED rev asserts the state you saw: a bench that moved under it refuses 409 with current_rev — re-read and re-apply, it never lands silently. An omitted rev rebases once behind a fill race. No ids anywhere: the bench is the one shared state.",
		parameters: {
			verb: {
				type: "string",
				required: true,
				enum: [...CONSTRUCT_VERBS],
				description: "REQUIRED — the schema refuses a call without it, and no payload ever derives one (a WRITE is never guessed). " + CONSTRUCT_VERBS.join(" | ") + "."
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
			model: {
				type: "string",
				description: "add_stage: the family seat for cards whose family rides params.model (image-edit, music). The mint folds it into params.model when the bag omits it; omitted, a family-carrying card takes its first-declared family (boarded[0] — the same default the cards tab seeds). A params.model already stated is THE seat."
			},
			params: {
				type: "object",
				additionalProperties: true,
				description: "patch (merge onto the stage) | add_stage | load single-stage shorthand. A null value UNSETS its key (the drafts door's JSON Merge Patch law — patch {voice_name: null} clears it; no remove_stage dance). MODEL SWITCH LAW: a stage's variant/quant belong to its model — switching the model seat (the stage's top-level `model`; tts-family cards read it from params.model — the loaded card doc names its seat) without co-stating the new family's variant (melite_load names each family's variants) composes a refusal (unknown variant for the new model). State model + variant (+ quant) together, or leave the model alone."
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
						expected: {
							type: "object",
							additionalProperties: true,
							description: "Expected kinds {input: Kind} — the hand-written declaration that makes a CUSTOM lane (a name the card does not port) lawful: the kind pass judges the channel by its declared kind (the $spell soundtrack shape, e.g. {line1: \"audio\"})."
						},
						outputs: {
							type: "object",
							additionalProperties: true,
							description: "Custom output channels {name: Kind}."
						}
					}
				},
				description: "load: the full replacement [{id?, engine?, card?, params?, inputs?, expected?, outputs?}]."
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
				description: "CAS: the rev from your last read. Optional on non-destructive mutations — omitted, the tool reads the fresh rev itself (one bounded read). Supply it to ASSERT the state you saw: a bench that moved under a stated rev refuses 409 with current_rev (re-read, re-apply) — it never lands silently."
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
					},
					landing: {
						type: "string",
						description: "The write's landing state: landed_and_compiling | landed_not_compiling (the stage is ON the bench; the compile refusal rides below) | ambiguous_no_write (the write is UNPROVEN — re-read before retrying). Absent when the verb wrote no stage."
					},
					applied_derivations: {
						type: "array",
						description: "Every value the door DERIVED before writing ({param, from, to, rule}) — the agent sees the state the bench actually stores."
					},
					remedy: {
						type: "object",
						additionalProperties: true,
						description: "A structured cure for a compile refusal ({public_param, current_value, allowed_values}) when the card schema can name one — never an invented fix."
					},
					doc: {
						type: "object",
						additionalProperties: true,
						description: "add_stage: the landed card's agent doc inline (refinement material after the landing; deduped per session by doc digest)."
					}
				}
			},
			render: (_args, value) => {
				const v = value;
				if (v && typeof v.error === "string" && v.error !== "") {
					const landing = v.landing === "ambiguous_no_write" ? "\nlanding: ambiguous_no_write — the write is UNPROVEN (the seat failed after the call left); re-read before retrying, never assume it did not land" : "";
					return [{
						type: "text",
						text: "melite_construct REFUSED: " + v.error + landing
					}];
				}
				const lines = ["bench " + String(v.verb ?? "?") + " → rev " + String(v.rev ?? "?")];
				const stageId = v.stage;
				if (typeof stageId === "string" && stageId !== "") {
					const verb = String(v.verb ?? "?");
					lines.push(verb === "add_stage" ? "minted stage " + stageId + " (patch/remove_stage/rewire address it as {stage: \"" + stageId + "\"})" : "stage " + stageId);
				}
				if (v.stale === true) lines.push("stale: params changed — the stage's done mark is cleared; the next flow re-runs it (its old artifact stays readable as last_run)");
				else if (v.verb === "patch") lines.push("no value change — done mark stands; patch a VALUE or clear the mark to re-run");
				const compileOk = v.compile_ok;
				if (compileOk === false) {
					const compileError = v.compile_error;
					lines.push("COMPILE REFUSED — " + (typeof compileError === "string" ? compileError : "?") + " — the write LANDED; fix the wire it names (expected {slot: kind} on the stage) and re-run.");
					const remedy = v.remedy;
					if (remedy !== null && typeof remedy === "object") {
						const r = remedy;
						lines.push("remedy: " + String(r.public_param ?? "?") + " = " + JSON.stringify(r.current_value) + " — allowed: " + JSON.stringify(r.allowed_values));
					}
				} else if (compileOk === true) lines.push("compiles ✓ (no validate call needed)");
				if (v.landing === "landed_and_compiling") lines.push("landing: landed_and_compiling");
				else if (v.landing === "landed_not_compiling") lines.push("landing: landed_not_compiling — the stage is ON the bench; the refusal above is closable by the next mutation");
				const derivations = v.applied_derivations;
				if (Array.isArray(derivations)) for (const line of derivations) {
					const d = line;
					const head = typeof d.stage === "string" && d.stage !== "" ? d.stage + ": " : "";
					const rule = String(d.rule ?? "?");
					const why = rule.startsWith("craft:") ? " — the card's craft law restored the declared spelling; the bench stores the restored text" : " — the card declares this lane an array; the bench stores the array";
					lines.push(head + "derived " + String(d.param ?? "?") + ": " + JSON.stringify(d.from) + " → " + JSON.stringify(d.to) + " (" + rule + ")" + why);
				}
				const doc = v.doc;
				if (doc !== null && doc !== void 0 && typeof doc === "object") {
					const d = doc;
					if (d.unchanged === true) lines.push("card doc already sent this session (" + String(d.card ?? "?") + ", digest " + String(d.digest ?? "?") + ") — not re-sent");
					else if (Array.isArray(d.files)) {
						lines.push((d.changed === true ? "card doc CHANGED since it last rode — re-read before refining: " : "card doc (rides once per session; refinement only — compose is already correct): ") + String(d.card ?? "?"));
						for (const f of d.files) {
							const path = f.path;
							const text = f.text;
							if (typeof text === "string" && text !== "") lines.push("--- " + String(path ?? "?") + " ---\n" + text);
						}
					}
				}
				const spellLines = v.spells;
				if (Array.isArray(spellLines)) for (const line of spellLines) {
					const row = line;
					const head = typeof row.stage === "string" && row.stage !== "" ? row.stage + ": " : "";
					if (row.resolves === "channel") lines.push(`spell ${String(row.token)} on ${String(row.on)} → channel ${String(row.via)}`);
					else if (row.resolves === "request_initial") lines.push(`spell ${String(row.token)} on ${String(row.on)} → REQUEST INITIAL — nothing wired; ${String(row.via)}`);
					else lines.push(`${head}spell ${String(row.token)} on ${String(row.on)} → ${String(row.via)}`);
				}
				const runsFacts = v.runs;
				const matched = Number(runsFacts?.matched ?? 0);
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
							} else if (lr === null) suffix = matched > 0 ? " — last_run null (no run in the window names this stage)" : " — last_run null (draft has no run in the window)";
							lines.push(`  ${id} — ${card} [${engine}]${suffix}`);
						}
					}
				}
				if (runsFacts !== void 0) lines.push(`runs window: checked ${String(runsFacts.checked ?? "?")}, total ${String(runsFacts.total ?? "?")}, matched ${String(runsFacts.matched ?? "?")}`);
				if (typeof v.intent === "string" && v.intent !== "") lines.push("intent: " + v.intent);
				if (typeof v.hint === "string" && v.hint !== "") lines.push("hint: " + v.hint);
				return [{
					type: "text",
					text: lines.join("\n")
				}];
			},
			presentationMeta: (_args, value) => {
				const v = value ?? {};
				return {
					...typeof v.bench === "string" && v.bench !== "" ? { bench: v.bench } : {},
					...typeof v.error === "string" && v.error !== "" ? { error: v.error } : {}
				};
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
			const refuse = (payload) => jsonClean({
				verb,
				bench,
				ok: false,
				...payload
			});
			if (a.verb === void 0) return jsonClean({
				verb,
				bench,
				ok: false,
				error: "verb is required — the call was refused before anything was read or written (a payload never derives a verb; a WRITE is never guessed). State one: 'read' | 'load' {stages} | 'patch' {stage, params} | 'add_stage' {card, params?, inputs?} | 'remove_stage' {stage} | 'archive'/'unarchive' {stage} | 'clear' | 'floor' {stage?} | 'rewire' {stage, input, from?} | 'undo' {n?, author?} | 'validate'.",
				error_kind: "verb-required"
			});
			try {
				if (verb === "read") {
					const b = await readBench(estate, bench, signal);
					const enriched = await withLastRun(estate, b, signal);
					const stagesRaw = enriched.stages;
					const legacyMarker = (Array.isArray(stagesRaw) ? stagesRaw.filter((s) => typeof s === "object" && s !== null) : []).find((s) => typeof s["ref_flow"] === "string" && s["ref_flow"] !== "");
					const logRaw = b["log"];
					const undoable = (Array.isArray(logRaw) ? logRaw.filter((e) => typeof e === "object" && e !== null) : []).some((e) => e["kind"] === "load" && e["reverted"] !== true);
					return out({
						rev: b.rev,
						intent: b.intent,
						stages: enriched.stages,
						log: b.log,
						...enriched.runs !== null ? { runs: enriched.runs } : {},
						...legacyMarker !== void 0 ? { legacy_flow_marker: {
							stage: legacyMarker["id"],
							flow: legacyMarker["ref_flow"],
							note: "a retired melite_flow press landed this marker (the bench holds cards only — the flow runs through its own start door, never a bench pass)",
							cure: (undoable ? "melite_construct undo restores the bench the press replaced; " : "") + "melite_construct remove_stage " + String(legacyMarker["id"]) + " drops the row alone"
						} } : {},
						hint: "mutate with expect_rev=" + String(b.rev)
					});
				}
				if (verb === "validate") {
					const b = await readBench(estate, bench, signal);
					const stages = projectStages(liveBenchRows(b.stages));
					if (stages.length === 0) return out({
						rev: b.rev,
						compiles: false,
						note: "bench is empty"
					});
					const intent = typeof b.intent === "string" ? b.intent : "";
					const flowId = intent !== "" && FLOW_ID_RE.test(intent) ? intent : "bench";
					const r = await estate.runsValidate({ flow_inline: {
						id: flowId,
						stages
					} }, signal, 2e4);
					const compiles = r["ok"] === true || r["valid"] === true;
					return out({
						rev: b.rev,
						compiles,
						report: r,
						...compiles ? {} : { stage_verdicts: await soloStageVerdicts(estate, flowId, stages, signal) }
					});
				}
				if (verb === "load") {
					const rawStages = Array.isArray(a.stages) ? a.stages : [];
					const defs = rawStages.some((stage) => typeof stage === "object" && stage !== null && !Array.isArray(stage) && typeof stage["card"] === "string") ? await loadCardDefs() : void 0;
					const appliedDerivations = [];
					const stages = [];
					for (const stage of rawStages) {
						if (typeof stage !== "object" || stage === null || Array.isArray(stage)) {
							stages.push(stage);
							continue;
						}
						const row = { ...stage };
						const card = typeof row["card"] === "string" ? row["card"] : "";
						const def = card !== "" ? defs?.get(card) : void 0;
						if (def !== void 0) {
							const laneRefusal = unknownLaneRefusal(card, row["inputs"], def, row["expected"]);
							if (laneRefusal !== void 0) return refuse({
								...laneRefusal,
								stage: card
							});
							if (isRecordArg(row["params"])) {
								const derived = deriveParams(def, row["params"]);
								row["params"] = derived.params;
								for (const line of derived.derived) appliedDerivations.push({
									stage: card,
									...line
								});
							}
						}
						stages.push(row);
					}
					const compile = stages.length > 0 ? await verdictOfStages(estate, a.intent, projectStages(stages), signal) : void 0;
					if (compile !== void 0 && compile["compile_ok"] === false) return refuse({
						error: compile["compile_error"],
						error_kind: "compile-refused",
						...compile["remedy"] !== void 0 ? { remedy: compile["remedy"] } : {},
						...compile["stage_verdicts"] !== void 0 ? { stage_verdicts: compile["stage_verdicts"] } : {}
					});
					const r = await estate.benchEnsure({
						session: bench,
						stages,
						...typeof a.intent === "string" && a.intent !== "" ? { intent: a.intent } : {},
						...a.overwrite === true ? { overwrite: true } : {},
						expect_rev: a.expect_rev
					}, signal, 15e3);
					const spells = rawStages.flatMap((stage, i) => {
						if (typeof stage !== "object" || stage === null) return [];
						const row = stage;
						const card = typeof row["card"] === "string" ? row["card"] : "stage " + i;
						return spellVoiceOf(row["params"], row["inputs"]).map((line) => ({
							stage: card,
							...line
						}));
					});
					return out({
						rev: r.rev,
						stages: r.stages,
						...spells.length > 0 ? { spells } : {},
						...appliedDerivations.length > 0 ? { applied_derivations: appliedDerivations } : {},
						...compile !== void 0 ? { ...compile } : {},
						...landingOf(compile)
					});
				}
				if (verb === "patch") {
					let wiredInputs;
					let stageCard = "";
					let heldParams;
					let rev0 = a.expect_rev;
					if (spellTokensIn(a.params).length > 0 || wireShapeCandidate(a.params) || craftCandidate(a.params)) {
						const b = await readBench(estate, bench, signal);
						const rows = projectStages(b.stages);
						wiredInputs = inputsOfStageRow(rows, a.stage);
						stageCard = cardOfStageRow(rows, a.stage);
						const row = rows.find((entry) => entry["stage"] === a.stage || entry["id"] === a.stage);
						const rp = row === void 0 ? void 0 : row["params"];
						if (typeof rp === "object" && rp !== null && !Array.isArray(rp)) heldParams = rp;
						if (rev0 === void 0 && typeof b.rev === "number") rev0 = b.rev;
					}
					let params = a.params;
					let appliedDerivations = [];
					if (stageCard !== "" && isRecordArg(params)) {
						const def = (await loadCardDefs()).get(stageCard);
						if (def !== void 0) {
							const derived = deriveParams(def, params, heldParams);
							params = derived.params;
							appliedDerivations = derived.derived;
						}
					}
					const r = await postBenchVerb(estate, bench, "patch", {
						stage: a.stage,
						params,
						expect_rev: rev0
					}, signal, { autoRev: !(a.expect_rev !== void 0 && a.expect_rev !== null) });
					const spellLines = spellVoiceOf(a.params, wiredInputs);
					const stale = r["stale"] === true;
					const compile = stale === true ? await compileVerdictOf(estate, bench, signal) : void 0;
					return out({
						rev: r.rev,
						stage: r.stage,
						patched: r.patched,
						...stale ? { stale: true } : { keep_done: true },
						...spellLines.length > 0 ? { spells: spellLines } : {},
						...appliedDerivations.length > 0 ? { applied_derivations: appliedDerivations } : {},
						...compile !== void 0 ? { ...compile } : {},
						...landingOf(compile)
					});
				}
				if (verb === "add_stage") {
					if (typeof a.stage === "string" && a.stage.trim() === "") a.stage = void 0;
					if (a.stage !== void 0) return out({ error: "add_stage assigns its own stage id (s_0, s_1, ...) — the answer carries it; patch/remove_stage/rewire take {stage}. Drop the stage arg." });
					const card = typeof a.card === "string" ? a.card : "";
					let params = isRecordArg(a.params) ? a.params : void 0;
					let appliedDerivations = [];
					if (card !== "") {
						const def = (await loadCardDefs()).get(card);
						if (def !== void 0) {
							const laneRefusal = unknownLaneRefusal(card, a.inputs, def, a.expected);
							if (laneRefusal !== void 0) return refuse(laneRefusal);
							if (isRecordArg(params)) {
								const derived = deriveParams(def, params);
								params = derived.params;
								appliedDerivations = derived.derived;
							}
							const seat = familySeatCarry(a.model, params, def);
							params = seat.params;
							appliedDerivations = [...appliedDerivations, ...seat.derived];
						}
					}
					const b0 = await readBench(estate, bench, signal);
					const live = liveBenchRows(b0["stages"]);
					const candidate = {
						id: projectedStageId(b0["stages"]),
						card,
						...typeof a.engine === "string" && a.engine !== "" ? { engine: a.engine } : {},
						...params !== void 0 ? { params } : {},
						...a.inputs !== void 0 ? { inputs: a.inputs } : {},
						...isRecordArg(a.expected) ? { expected: a.expected } : {},
						...isRecordArg(a.outputs) ? { outputs: a.outputs } : {}
					};
					const premint = await verdictOfStages(estate, b0["intent"], projectStages(Array.isArray(live) ? [...live, candidate] : [candidate]), signal);
					if (premint !== void 0 && premint["compile_ok"] === false) return refuse({
						error: premint["compile_error"],
						error_kind: "compile-refused",
						...premint["remedy"] !== void 0 ? { remedy: premint["remedy"] } : {},
						...premint["stage_verdicts"] !== void 0 ? { stage_verdicts: premint["stage_verdicts"] } : {}
					});
					const revStated = a.expect_rev !== void 0 && a.expect_rev !== null;
					const r = await postBenchVerb(estate, bench, "add_stage", {
						card: a.card,
						...a.engine !== void 0 ? { engine: a.engine } : {},
						...params !== void 0 ? { params } : {},
						...a.inputs !== void 0 ? { inputs: a.inputs } : {},
						...isRecordArg(a.expected) ? { expected: a.expected } : {},
						...isRecordArg(a.outputs) ? { outputs: a.outputs } : {},
						expect_rev: revStated ? a.expect_rev : typeof b0["rev"] === "number" ? b0["rev"] : a.expect_rev
					}, signal, { autoRev: !revStated });
					const spellLines = spellVoiceOf(a.params, a.inputs);
					const compile = premint !== void 0 && typeof b0["rev"] === "number" && r["rev"] === b0["rev"] + 1 ? premint : await compileVerdictOf(estate, bench, signal);
					const doc = typeof a.card === "string" && a.card !== "" ? await cardDocOf(estate, a.card, sentDocs, signal) : void 0;
					return out({
						rev: r.rev,
						stage: r.stage,
						...spellLines.length > 0 ? { spells: spellLines } : {},
						...appliedDerivations.length > 0 ? { applied_derivations: appliedDerivations } : {},
						...compile !== void 0 ? { ...compile } : {},
						...landingOf(compile),
						...doc !== void 0 ? { doc } : {}
					});
				}
				if (verb === "remove_stage") {
					const r = await postBenchVerb(estate, bench, "remove_stage", {
						stage: a.stage,
						expect_rev: a.expect_rev
					}, signal);
					return out({
						rev: r.rev,
						stage: r.stage
					});
				}
				if (verb === "archive" || verb === "unarchive") {
					const r = await postBenchVerb(estate, bench, "archive", {
						stage: a.stage,
						off: verb === "unarchive",
						expect_rev: a.expect_rev
					}, signal);
					return out({
						rev: r.rev,
						stage: r.stage,
						archived: verb === "archive"
					});
				}
				if (verb === "clear") {
					const r = await postBenchVerb(estate, bench, "clear", { expect_rev: a.expect_rev }, signal);
					return out({
						rev: r.rev,
						cleared: r.cleared
					});
				}
				if (verb === "floor") {
					const readRows = async () => {
						const bb = await readBench(estate, bench, signal);
						const rawRows = Array.isArray(bb["stages"]) ? bb["stages"].flatMap((s) => typeof s === "object" && s !== null && !Array.isArray(s) ? [s] : []) : [];
						return {
							rev: bb["rev"],
							rawRows
						};
					};
					const first = await readRows();
					if (first.rawRows.length === 0) return out({ error: "the bench holds no stages — nothing to floor" });
					if (typeof a.stage === "string" && a.stage !== "" && !first.rawRows.some((row) => String(row["id"] ?? "") === a.stage)) return out({ error: `stage ${a.stage} is not on the bench — read names the live ids` });
					const defs = await loadCardDefs();
					const planOf = (rawRows) => {
						const targets = typeof a.stage === "string" && a.stage !== "" ? rawRows.filter((row) => String(row["id"] ?? "") === a.stage) : rawRows;
						const targeted = new Set(targets);
						const replacement = [];
						const voicing = [];
						for (const row of rawRows) {
							const view = { ...row };
							delete view["resolved"];
							if (!targeted.has(row)) {
								replacement.push(view);
								continue;
							}
							const stageId = typeof row["id"] === "string" ? row["id"] : "";
							const card = typeof row["card"] === "string" ? row["card"] : "";
							if (stageId === "") {
								voicing.push({
									stage: "",
									card,
									floored: [],
									note: "carries no id — not addressable, left untouched"
								});
								replacement.push(view);
								continue;
							}
							const def = defs.get(card);
							const dict = (def?.schemaCarrier ?? def?.schema)?.dict ?? {};
							const floors = {};
							for (const [name, node] of Object.entries(dict)) {
								if (node === null || node === void 0) continue;
								if (extraOf(node)["group"] !== "resolution") continue;
								const knob = emitKnob(node);
								if (knob["type"] !== "number" && knob["type"] !== "integer") continue;
								if (typeof knob["minimum"] !== "number") continue;
								floors[name] = knob["minimum"];
							}
							const floorEntries = Object.entries(floors);
							if (floorEntries.length === 0) {
								voicing.push({
									stage: stageId,
									card,
									floored: [],
									note: "declares no resolution group — nothing to floor"
								});
								replacement.push(view);
								continue;
							}
							const params = typeof row["params"] === "object" && row["params"] !== null && !Array.isArray(row["params"]) ? row["params"] : {};
							const patch = {};
							const floored = [];
							for (const [name, min] of floorEntries) {
								const cur = params[name];
								if (cur === void 0) {
									patch[name] = min;
									floored.push({
										param: name,
										from: "(default)",
										to: min
									});
								} else if (typeof cur === "number" && cur > min) {
									patch[name] = min;
									floored.push({
										param: name,
										from: cur,
										to: min
									});
								} else if (typeof cur !== "number") floored.push({
									param: name,
									from: cur,
									note: "not a number — left untouched, the card coerces its own wire"
								});
							}
							if (Object.keys(patch).length === 0) {
								voicing.push({
									stage: stageId,
									card,
									floored: [],
									note: "already at or below every declared floor"
								});
								replacement.push(view);
								continue;
							}
							view["params"] = {
								...params,
								...patch
							};
							replacement.push(view);
							voicing.push({
								stage: stageId,
								card,
								floored
							});
						}
						return {
							replacement,
							voicing
						};
					};
					const stated = a.expect_rev !== void 0 && a.expect_rev !== null;
					const attempt = async (rev, rawRows) => {
						const { replacement, voicing } = planOf(rawRows);
						if (!voicing.some((v) => v.floored.length > 0)) return {
							r: void 0,
							voicing
						};
						return {
							r: await estate.benchEnsure({
								session: bench,
								stages: replacement,
								overwrite: true,
								expect_rev: rev
							}, signal, 15e3),
							voicing
						};
					};
					let r;
					let voicing;
					try {
						({r, voicing} = await attempt(stated ? a.expect_rev : first.rev, first.rawRows));
					} catch (e) {
						if (stated || !isCasConflict(e)) throw e;
						const fresh = await readRows();
						if (fresh.rawRows.length === 0) throw e;
						({r, voicing} = await attempt(typeof fresh.rev === "number" ? fresh.rev : void 0, fresh.rawRows));
					}
					if (r === void 0) return out({
						rev: first.rev,
						stages: voicing,
						note: "already at or below every declared floor — nothing to write"
					});
					return out({
						rev: r.rev,
						stages: voicing,
						note: "floors ride the cards' own declared resolution minimums — the whole walk lands as one write, so a refusal anywhere leaves the bench untouched"
					});
				}
				if (verb === "rewire") {
					if (typeof a.input === "string" && a.input !== "") {
						const b = await readBench(estate, bench, signal);
						const card = cardOfStageRow(projectStages(b.stages), a.stage);
						if (card !== "") {
							const def = (await loadCardDefs()).get(card);
							if (def !== void 0) {
								const rowExpected = Array.isArray(b.stages) ? b.stages.find((r) => r["id"] === a.stage) : void 0;
								const laneRefusal = unknownLaneRefusal(card, { [a.input]: true }, def, rowExpected?.["expected"]);
								if (laneRefusal !== void 0) return refuse({
									...laneRefusal,
									stage: a.stage
								});
							}
						}
					}
					const r = await postBenchVerb(estate, bench, "rewire", {
						stage: a.stage,
						input: a.input,
						...a.from !== void 0 ? { from: a.from } : {},
						expect_rev: a.expect_rev
					}, signal);
					const compile = await compileVerdictOf(estate, bench, signal);
					return out({
						rev: r.rev,
						stage: r.stage,
						input: r.input,
						...compile !== void 0 ? { ...compile } : {},
						...landingOf(compile)
					});
				} else {
					const r = await postBenchVerb(estate, bench, "undo", {
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
			} catch (e) {
				return refusalOf(e, verb, bench);
			}
		}
	});
}
//#endregion
//#region src/tools/melite-flow.ts
/** The row's model (the QUEUE LANE LAW, agent-side): the row's
*  params may name `model` explicitly; otherwise the card id
*  resolves through form-spec's OWN alias law (boarded[0] — the
*  same truth /v1/form-spec serves and the UI's
*  defaultFamilyForCard reads; ONE resolution, never re-derived).
*  A card that boards NO family (rig, mask) returns '' — THE
*  FAMILYLESS MARKER (stroke 3): the stage rides the draft arm and
*  the registry composes it by its OWN card id, never an injected
*  body.model (that injection's voice — "model 'rig' is not offered
*  by card 'rig'" — the af-move commission's stop, 2026-10-09). An
*  unknown card id rides the same arm; the registry door names the
*  ghost in its own voice. */
async function modelForCard(card, params) {
	if (typeof params["model"] === "string" && params["model"] !== "") return params["model"];
	const defs = await loadCardDefs();
	if ((defs.get(card)?.boarded ?? []).length === 0) return "";
	const res = resolveSpecKeyForTool(card, defs, boardedMap(defs));
	return res !== null && res.model !== void 0 ? res.model : "";
}
/** F18 — the cross-regime join admission, pass-side seat: for an
* h3-timeline stage carrying an armed mod bag whose kind declares a
* plan tier (the served edit bag and the legacy aliases that
* translate into it) with a stated resolution, answer the family's
* own admission text (models/h3 chainEdit.ts — the engine's tier
* math, cited) when the tier would render a different shape than
* the doc's film regime (width/height knobs, the film path's own
* defaults 1344×768); null otherwise (no armed bag, a shape-true
* tier, or another card — the admission never speaks outside its
* family). The roster is DERIVED from the card's own declaration
* (CROSS_REGIME_BAG_KEYS — the back-end evasion audit B-1): the
* pre-collapse hand list retired with the names it scanned. */
function crossRegimeAdmissionOf(card, params) {
	if (card !== "h3-timeline") return null;
	const bag = CROSS_REGIME_BAG_KEYS.map((k) => params[k]).find((v) => Array.isArray(v) && v.length > 0 && typeof v[0] === "object" && v[0] !== null);
	if (bag === void 0) return null;
	const tier = typeof bag[0]["resolution"] === "string" ? bag[0]["resolution"] : "";
	if (tier === "") return null;
	const width = typeof params["width"] === "number" ? params["width"] : 1344;
	const height = typeof params["height"] === "number" ? params["height"] : 768;
	return admitCrossRegimeJoin(width, height, tier);
}
const TIMEOUT_MS$2 = 3e4;
const DRAFT_TIMEOUT_MS = 15e3;
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
/** THE STAMP-BACK TAKES (F3 D3-07, the 15 s bound's third burn —
*  F2 D-07 → D3-05 → s_94): the terminal attribution PATCH takes
*  this many swipes at the drafts door, each with its own fresh
*  DRAFT_TIMEOUT_MS bound and a 1.2 s beat between takes. The burn
*  was a TRANSIENT wedge (one PATCH outliving its bound while the
*  estate itself stayed alive) — a single-take stamp turns a
*  transient into a permanently invisible green run. Three takes
*  span a wedged beat; only a door dead three times in a row is
*  dead, and that final miss rides the run row
*  (attribution: missed) instead. */
const STAMP_TAKES = 3;
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
/**
* The pass row's artifact set — the media-spelled urls the observer
* rewrote (lead first). A field that is not an array of non-empty
* strings reads empty: the key was never served, never a cast.
*
* @param row - the pass row as persisted.
* @returns the validated url set, lead first.
*/
function assetUrlsOf(row) {
	const urls = row["asset_urls"];
	return Array.isArray(urls) ? urls.filter((u) => typeof u === "string" && u !== "") : [];
}
async function startRun(estate, body, signal) {
	let res;
	try {
		res = await estate.runsStart(body, signal, TIMEOUT_MS$2);
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
async function loadBench(estate, body, signal) {
	const session = body["session"];
	let expectRev;
	try {
		const cur = await estate.benchGet(session, signal, DRAFT_TIMEOUT_MS);
		if (cur !== null && typeof cur === "object" && typeof cur["rev"] === "number") expectRev = cur["rev"];
	} catch (e) {
		const re = remoteErrorOf(e);
		if (re === null || re === void 0 || re.code !== "bench/not-found") throw e;
	}
	const b = await estate.benchEnsure({
		...body,
		overwrite: true,
		...expectRev !== void 0 ? { expect_rev: expectRev } : {}
	}, signal, DRAFT_TIMEOUT_MS);
	if (b && typeof b.error === "string" && b.error) throw new Error(b.error);
	const id = b && b.draft_id;
	if (typeof id !== "string" || id === "") throw new Error("bench ensure returned no draft_id");
	return draftIdOf(id);
}
/** R-4's rev-confirm read (D3-04, 2026-11-05): ONE advisory re-read of
*  the bench rev immediately before the press begins — a rev that
*  moved between the snapshot read and the press means something is
*  still landing (the burn: a press issued while the previous mint
*  was still `landed_and_compiling` snapshotted before the new stage
*  joined, and s_90 sat unrun with no warning anywhere in the press
*  receipt). The warning is an ADMISSION, never a gate (the F18
*  precedent): the press still runs on the snapshot it holds. A doc
*  that serves no rev admits nothing (no false warning invented from
*  absence).
*
* @param estate - the estate handle.
* @param bench - the session bench key.
* @param snapshotRev - the rev the pass's snapshot read served.
* @param signal - the caller's abort signal.
* @returns the landing-race warning text, or undefined when the rev stood still.
*/
async function revConfirmLanding(estate, bench, snapshotRev, signal) {
	try {
		const confirm = await estate.benchGet(bench, signal, 15e3);
		const fresh = typeof confirm["rev"] === "number" ? confirm["rev"] : void 0;
		const snap = typeof snapshotRev === "number" ? snapshotRev : void 0;
		if (snap === void 0 || fresh === snap) return void 0;
		return `bench rev moved between the snapshot read and this press (rev ${snap} → rev ${fresh}) — something may still be landing; if a stage you just minted is missing from the pressed census, re-press it`;
	} catch {
		return;
	}
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
*  The pass law is Run All's law verbatim: bench order, skip spent
*  rows with a reason, and — since F20's residual cure (2026-10-30) —
*  a settled FAILURE or a THROWN start is recorded and the pass
*  CONTINUES to the remaining stages; only a pre-run REFUSAL (a doc
*  the door will not accept) stops the pass. W-2 (2026-11-05): a
*  done row skips only while its recorded input_runs snapshot still
*  names the run identities its wires resolve to now — an upstream
*  that re-ran breaks the match and the row runs. */
async function runBench(estate, a, signal, only) {
	const empty = {
		mode: "bench",
		target: benchDraftIdOf(a.bench),
		error: "the bench is empty — construct stages first (melite_construct)"
	};
	let b;
	try {
		b = await estate.benchGet(a.bench, signal, 15e3);
	} catch (e) {
		if (remoteErrorOf(e)?.code === "bench/not-found") return empty;
		throw e;
	}
	const rows = Array.isArray(b["stages"]) ? b["stages"].filter((s) => typeof s === "object" && s !== null && typeof s["id"] === "string") : [];
	if (rows.length === 0) return empty;
	if (only !== void 0 && !rows.some((r) => r["id"] === only)) return {
		mode: "bench",
		target: benchDraftIdOf(a.bench),
		error: `the bench holds no stage "${only}" — its stages are ${rows.map((r) => String(r["id"])).join(", ")}; add it with melite_construct add_stage or press one of those`
	};
	const draftId = typeof b["draft_id"] === "string" ? draftIdOf(b["draft_id"]) : benchDraftIdOf(a.bench);
	const target = `${benchDraftIdOf(a.bench)} @ rev ${String(b["rev"] ?? "?")}`;
	const intent = typeof b["intent"] === "string" ? b["intent"] : "";
	const pressed = [];
	const pressCensus = () => ({
		pressed: [...pressed],
		rev: typeof b["rev"] === "number" ? b["rev"] : null
	});
	const landingWarning = await revConfirmLanding(estate, a.bench, b["rev"], signal);
	const pass = [];
	const failures = [];
	const mintedRuns = /* @__PURE__ */ new Map();
	const inputRunsOf = (row) => {
		const wires = row["inputs"] !== null && typeof row["inputs"] === "object" && !Array.isArray(row["inputs"]) ? row["inputs"] : {};
		const names = Object.keys(wires);
		if (names.length === 0) return void 0;
		const snapshot = {};
		for (const name of names) {
			const ref = wires[name];
			const upstreamId = ref !== null && typeof ref === "object" && typeof ref["stage"] === "string" ? String(ref["stage"]) : "";
			if (upstreamId === "") continue;
			const minted = mintedRuns.get(upstreamId);
			if (minted !== void 0) {
				snapshot[name] = minted;
				continue;
			}
			const upstream = rows.find((r) => r["id"] === upstreamId);
			const res = upstream !== void 0 && upstream["result"] !== null && typeof upstream["result"] === "object" && !Array.isArray(upstream["result"]) ? upstream["result"] : {};
			snapshot[name] = typeof res["run_id"] === "string" ? res["run_id"] : "";
		}
		return snapshot;
	};
	for (const row of rows) {
		const stageId = row["id"];
		if (only !== void 0 && stageId !== only) continue;
		const card = typeof row["card"] === "string" && row["card"] !== "" ? row["card"] : "";
		if (row["archived"] === true) {
			pass.push({
				stage: stageId,
				card,
				skipped: "archived"
			});
			continue;
		}
		const currentInputs = inputRunsOf(row);
		let staleVoice;
		{
			const folded = statusOrPendingOf(typeof row["runStatus"] === "string" ? row["runStatus"] : "");
			if (folded === "done" || folded === "cached" || folded === "reused") {
				const result = row["result"] !== null && typeof row["result"] === "object" && !Array.isArray(row["result"]) ? row["result"] : null;
				const lastRun = result !== null && typeof result["run_id"] === "string" && result["run_id"] !== "" ? result["run_id"] : null;
				const stamped = result !== null && result["input_runs"] !== null && typeof result["input_runs"] === "object" && !Array.isArray(result["input_runs"]) ? result["input_runs"] : null;
				if (currentInputs !== void 0) {
					const currentKeys = Object.keys(currentInputs);
					if (!(stamped !== null && Object.keys(stamped).length === currentKeys.length && currentKeys.every((k) => stamped[k] === currentInputs[k]))) staleVoice = stamped === null ? "input snapshot missing on the done mark — re-running to record what it consumed" : "input snapshot mismatch — a wired upstream re-ran since this row’s last run; its artifact derived from the old output";
					else {
						pass.push({
							stage: stageId,
							card,
							skipped: "done",
							last_run: lastRun
						});
						continue;
					}
				} else {
					pass.push({
						stage: stageId,
						card,
						skipped: "done",
						last_run: lastRun
					});
					continue;
				}
			}
		}
		if (card === "") {
			const refFlow = typeof row["ref_flow"] === "string" && row["ref_flow"] !== "" ? row["ref_flow"] : "";
			if (refFlow !== "") {
				const logRaw = b["log"];
				const undoCure = (Array.isArray(logRaw) ? logRaw.filter((e) => typeof e === "object" && e !== null) : []).some((e) => e["kind"] === "load" && e["reverted"] !== true) ? " — or melite_construct undo to restore the bench the retired press replaced" : "";
				return {
					mode: "bench",
					target,
					draft_id: draftId,
					status: "stopped",
					stoppedAt: stageId,
					...intent !== "" ? { intent } : {},
					...only !== void 0 ? { stage: only } : {},
					error: `stage ${stageId} is the "${refFlow}" flow template reference (a retired melite_flow press landed it — the bench doors refuse the shape now; the flow runs through its own start door, not this bench pass); remove it with melite_construct remove_stage ${stageId} if the bench should run without the flow${undoCure}`,
					...pressCensus(),
					pass
				};
			}
			return {
				mode: "bench",
				target,
				draft_id: draftId,
				status: "stopped",
				stoppedAt: stageId,
				...intent !== "" ? { intent } : {},
				...only !== void 0 ? { stage: only } : {},
				error: `stage ${stageId} names no card — nothing to compose (melite_construct patch)`,
				...pressCensus(),
				pass
			};
		}
		const params = row["params"] !== null && typeof row["params"] === "object" && !Array.isArray(row["params"]) ? row["params"] : {};
		const wires = row["inputs"] !== null && typeof row["inputs"] === "object" && !Array.isArray(row["inputs"]) ? row["inputs"] : {};
		const wireNames = Object.keys(wires);
		let resolved = params;
		if (wireNames.length > 0) {
			resolved = { ...params };
			for (const name of wireNames) {
				const ref = wires[name];
				if (!(typeof ref === "object" && ref !== null && typeof ref["stage"] === "string")) return {
					mode: "bench",
					target,
					draft_id: draftId,
					status: "stopped",
					stoppedAt: stageId,
					...intent !== "" ? { intent } : {},
					...only !== void 0 ? { stage: only } : {},
					error: "input " + JSON.stringify(name) + " is neither {stage, output} nor a resolvable binding — the bench pass maps only stage wires (got " + JSON.stringify(ref ?? null) + ")",
					...pressCensus(),
					pass
				};
				const upstreamId = String(ref["stage"]);
				const upstream = rows.find((r) => r["id"] === upstreamId);
				const res = upstream !== void 0 && upstream["result"] !== null && typeof upstream["result"] === "object" && !Array.isArray(upstream["result"]) ? upstream["result"] : {};
				const url = typeof res["url"] === "string" && res["url"] !== "" ? res["url"] : "";
				if (url === "") return {
					mode: "bench",
					target,
					draft_id: draftId,
					status: "stopped",
					stoppedAt: stageId,
					...intent !== "" ? { intent } : {},
					...only !== void 0 ? { stage: only } : {},
					error: "input " + JSON.stringify(name) + " is wired to stage " + JSON.stringify(upstreamId) + " which has no output yet — run it first (or clear the wire). The bench pass resolves wires to the upstream's last result; it never drops them.",
					...pressCensus(),
					pass
				};
				const spell = "$" + name;
				const substitute = (v) => {
					if (v === spell) return url;
					if (Array.isArray(v)) return v.map(substitute);
					if (typeof v === "object" && v !== null) {
						const out = {};
						for (const [k, x] of Object.entries(v)) out[k] = substitute(x);
						return out;
					}
					return v;
				};
				for (const k of Object.keys(resolved)) resolved[k] = substitute(resolved[k]);
			}
		}
		const model = await modelForCard(card, resolved);
		const regimeWarning = crossRegimeAdmissionOf(card, resolved);
		const rowWarning = regimeWarning !== null ? landingWarning !== void 0 ? regimeWarning + " " + landingWarning : regimeWarning : landingWarning;
		pressed.push(stageId);
		let started;
		try {
			started = await startRun(estate, model === "" ? {
				...resolved,
				test: wireBool(a.test),
				draft_id: draftId,
				bench_stage_id: stageId
			} : {
				...resolved,
				model,
				test: wireBool(a.test),
				draft_id: draftId,
				bench_stage_id: stageId
			}, signal);
		} catch (thrown) {
			const why = thrown instanceof Error ? thrown.message : String(thrown);
			pass.push({
				stage: stageId,
				card,
				thrown: why
			});
			failures.push({
				stage: stageId,
				card,
				status: "threw",
				run_id: ""
			});
			continue;
		}
		if (typeof started["error"] === "string") return {
			mode: "bench",
			target,
			draft_id: draftId,
			status: "stopped",
			stoppedAt: stageId,
			...intent !== "" ? { intent } : {},
			...only !== void 0 ? { stage: only } : {},
			...pressCensus(),
			error: started["error"],
			pass
		};
		const runId = started["run_id"];
		if (runId !== "") mintedRuns.set(stageId, runId);
		let outcome;
		try {
			outcome = await observeAndAttribute(estate, draftId, stageId, runId, signal, wireBool(a.test), OBSERVE_MAX_MS, 2, currentInputs);
		} catch (thrown) {
			const why = thrown instanceof Error ? thrown.message : String(thrown);
			pass.push({
				stage: stageId,
				card,
				run_id: runId,
				thrown: why
			});
			failures.push({
				stage: stageId,
				card,
				status: "threw",
				run_id: runId
			});
			continue;
		}
		pass.push({
			stage: stageId,
			card,
			run_id: runId,
			status: outcome.status,
			...staleVoice !== void 0 ? { stale: staleVoice } : {},
			...rowWarning !== void 0 ? { warning: rowWarning } : {},
			...outcome.url !== "" ? { url: outcome.url } : {},
			...outcome.artifacts.length > 0 ? { artifacts: outcome.artifacts } : {},
			...outcome.asset_urls.length > 0 ? { asset_urls: outcome.asset_urls } : {},
			...outcome.host_paths.length > 0 ? { host_paths: outcome.host_paths } : {},
			...outcome.stamp_note !== void 0 ? { stamp_note: outcome.stamp_note } : {},
			...outcome.attribution !== void 0 ? { attribution: outcome.attribution } : {}
		});
		if (outcome.status === "queued") return {
			mode: "bench",
			target,
			draft_id: draftId,
			status: "pending",
			stoppedAt: stageId,
			run_id: runId,
			...intent !== "" ? { intent } : {},
			...only !== void 0 ? { stage: only } : {},
			...pressCensus(),
			pass
		};
		if (outcome.status !== "done") {
			failures.push({
				stage: stageId,
				card,
				status: outcome.status,
				run_id: runId
			});
			continue;
		}
	}
	const lastRun = (() => {
		for (let i = pass.length - 1; i >= 0; i--) {
			const rid = pass[i]["run_id"];
			if (typeof rid === "string" && rid !== "") return rid;
		}
		return "";
	})();
	const lastHosts = (() => {
		const acc = [];
		for (const row of pass) {
			const hp = row["host_paths"];
			if (!Array.isArray(hp)) continue;
			for (const h of hp) if (typeof h === "string" && h !== "" && !acc.includes(h)) acc.push(h);
		}
		return acc;
	})();
	if (failures.length > 0) {
		const first = failures[0];
		return {
			mode: "bench",
			target,
			draft_id: draftId,
			run_id: lastRun,
			status: "stopped",
			stoppedAt: first.stage,
			...intent !== "" ? { intent } : {},
			...only !== void 0 ? { stage: only } : {},
			error: `stage ${first.stage} (${first.card}) ` + (first.status === "threw" ? "threw (a transport or resolution error — read pass[] for the rest)" : `ended ${first.status}`) + (failures.length > 1 ? ` — ${failures.length} stages failed (the pass still pressed every stage; read pass[])` : " (the pass still pressed the remaining stages)"),
			...lastHosts.length > 0 ? { host_paths: lastHosts } : {},
			...pressCensus(),
			pass
		};
	}
	return {
		mode: "bench",
		target,
		draft_id: draftId,
		run_id: lastRun,
		status: "done",
		...intent !== "" ? { intent } : {},
		...only !== void 0 ? { stage: only } : {},
		...lastHosts.length > 0 ? { host_paths: lastHosts } : {},
		...pressCensus(),
		pass
	};
}
/** THE PER-STAGE PRESS (W-8, 2026-11-05): `melite_flow {stage}` runs ONE
*  named bench stage's composition and nothing else — the same
*  compose/wire-resolution/attribution path the bench pass rides
*  (runBench's `only` filter), never its siblings. Sibling stages and
*  the bench intent stay byte-identical; the receipt names the pressed
*  row (`stage`). Mode stays 'bench': the per-stage press is the bench
*  pass with a one-row filter, never a fifth composition. */
async function runStage(estate, a, signal) {
	return runBench(estate, {
		test: a.test,
		bench: a.bench
	}, signal, a.stage);
}
/** Signal-honoring sleep — the observer's poll cadence (the run-wire
*  cadence, 1500ms). DECIDED per-plane (the dry-sweep's J5, recorded
*  like the J13 variance): this spelling RESOLVES on abort because
*  the observer's loop re-checks its deadline after every tick — a
*  rejection here would surface as a failed observe, not a quiet
*  exit; run-status.ts's sleepAbortable REJECTS for the mirror
*  reason (its poll has no post-await check). No Context reaches a
*  tool body, so ctx.timeout is not a seat for either; the kit's
*  browser sleep (catalog/src/sleep.ts) is another plane's law. */
function sleepAbort(ms, signal) {
	return new Promise((resolve) => {
		const t = setTimeout(resolve, ms);
		signal.addEventListener("abort", () => {
			clearTimeout(t);
			resolve();
		}, { once: true });
	});
}
/** THE HOST-PATH CANONICALIZER (session 90a0b920's F7, the
* artifact-path archaeology burn: the agent read `/melite-media/...`
* urls in flow results, tried them on the host, `ls: cannot access
* '/melite-media/'`, and burned ~6 bash calls on find + a python
* census over 1,834 runs to learn the estate's path dialects before
* daring to touch a file). The media route is the BROWSER's channel;
* the maker's shell never sees it. This mirrors run-status.ts's
* canonical receipt law (023's self-critique #3) and adds the one
* spelling that tool never meets: a full media url folds back to
* its out-root form — `/melite-media/runs/<rid>/<rel>` is the
* estate output tree served over HTTP, so it canonicalizes to
* `output/<rid>/<rel>` (test runs root under test-output/ — the
* flag rides the caller's run request, never the url). Absolute
* non-media paths stay verbatim (run-status's law); bare relatives
* stay bare (one home per fact: the UI face keeps the media url,
* the agent face carries this). */
function canonicalHostPath(p, rid, test) {
	const media = RUN_MEDIA_PREFIX + "/";
	let value = p;
	if (value.startsWith(media)) value = value.slice(media.length);
	if (value.startsWith("/")) return p;
	const bare = value.startsWith("./") ? value.slice(2) : value;
	const single = rid !== "" && bare.startsWith(rid + "/" + rid + "/") ? rid + bare.slice((rid + "/" + rid).length) : bare;
	const root = test ? "test-output/" : "output/";
	if (rid !== "" && (single === rid || single.startsWith(rid + "/"))) return root + single;
	return single !== "" && rid !== "" ? root + rid + "/" + single : single;
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
async function observeAndAttribute(estate, draftId, stageId, runId, signal, test, budgetMs = OBSERVE_MAX_MS, rearms = 2, inputRuns) {
	const deadline = Date.now() + budgetMs;
	let lastLive = "";
	let stampNote;
	const noteMiss = (phase, why) => {
		stampNote = `attribution ${phase}: ${why}`;
	};
	for (;;) {
		signal.throwIfAborted();
		let doc;
		try {
			doc = await estate.runsStatus(runId, false, signal, TIMEOUT_MS$2);
		} catch (e) {
			const re = remoteErrorOf(e);
			if (re !== null && re !== void 0 && re.code === "runs/unknown-run") return {
				status: statusOf("unknown"),
				url: "",
				artifacts: [],
				asset_urls: [],
				host_paths: []
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
			const rawUrl = st !== void 0 && typeof st["url"] === "string" && st["url"] !== "" ? st["url"] : "";
			const url = toMediaUrl(rawUrl);
			const hostPaths = rawUrl !== "" ? [canonicalHostPath(rawUrl, runId, test)] : [];
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
			for (const name of names) {
				const host = canonicalHostPath(name, runId, test);
				if (host !== "" && !hostPaths.includes(host)) hostPaths.push(host);
			}
			const result = { run_id: runId };
			if (url !== "") result["url"] = url;
			if (inputRuns !== void 0) result["input_runs"] = inputRuns;
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
			let landed = false;
			for (let take = 1; take <= STAMP_TAKES && !landed; take++) {
				try {
					const ans = await estate.draftsStagePatch(draftId, stageId, {
						runStatus: terminal,
						result
					}, signal, DRAFT_TIMEOUT_MS);
					if (ans !== null && typeof ans === "object" && ans["delivered"] === false) noteMiss("refused", typeof ans["reason"] === "string" && ans["reason"] !== "" ? ans["reason"] : "not delivered");
					else {
						stampNote = void 0;
						landed = true;
						break;
					}
				} catch (e) {
					noteMiss("failed", e instanceof Error ? e.message : String(e));
				}
				if (take < STAMP_TAKES) await sleepAbort(1200, signal);
			}
			if (!landed) try {
				await estate.runsAttribute(runId, "missed", signal, TIMEOUT_MS$2);
			} catch {}
			return {
				status: terminal,
				url,
				artifacts: arts,
				asset_urls: assetUrls,
				host_paths: hostPaths,
				...stampNote !== void 0 ? { stamp_note: stampNote } : {},
				...!landed ? { attribution: "missed" } : {}
			};
		}
		const foldedLive = statusOrPendingOf(status);
		const live = foldedLive === "queued" || foldedLive === "pending" ? "queued" : "running";
		if (live !== lastLive) {
			lastLive = live;
			try {
				await estate.draftsStagePatch(draftId, stageId, {
					runStatus: live,
					result: { run_id: runId }
				}, signal, DRAFT_TIMEOUT_MS);
			} catch (e) {
				noteMiss("live stamp failed", e instanceof Error ? e.message : String(e));
			}
		}
		if (Date.now() >= deadline) {
			if (rearms > 0) observeAndAttribute(estate, draftId, stageId, runId, new AbortController().signal, test, budgetMs, rearms - 1, inputRuns).catch(String);
			return {
				status: "queued",
				url: "",
				artifacts: [],
				asset_urls: [],
				host_paths: [],
				...stampNote !== void 0 ? { stamp_note: stampNote } : {}
			};
		}
		await sleepAbort(1500, signal);
	}
}
/** W-5's strict-form comparator (F3-12, 2026-11-05): a key-sorted
*  recursive JSON spelling, so params equality is independent of key
*  order — a held row written by another call site still matches its
*  identical twin. Both sides are normalized (the press normalizes at
*  normalizeJsonArrayParams, the held row was normalized at ITS
*  write), so the canonical spellings compare equal only for
*  identical work.
*
* @param v - a JSON params value.
* @returns the canonical spelling compared for twin equality.
*/
function canonJson(v) {
	if (Array.isArray(v)) return "[" + v.map(canonJson).join(",") + "]";
	if (v !== null && typeof v === "object") {
		const obj = v;
		return "{" + Object.keys(obj).sort().map((k) => JSON.stringify(k) + ":" + canonJson(obj[k])).join(",") + "}";
	}
	return JSON.stringify(v);
}
/** SINGLE (the old card_run path, composed inside): manifest gate
*  + runnability gate + defaults merge, then draft + {model}. */
async function runSingle(estate, a, signal) {
	const card = a.card;
	let model = a.model;
	if (!model) model = await modelForCard(card, a.params);
	if (!model) return {
		mode: "card",
		target: card,
		error: "model is required: this card boards no default family — name the family explicitly (melite_load lists the boarded families on the card); a card with no family runs as a bench stage instead (melite_construct add_stage composes it without a family)"
	};
	const bag = { ...a.params };
	if (typeof a.prompt === "string" && a.prompt !== "") bag["prompt"] = a.prompt;
	const defs = await loadCardDefs();
	const resolved = resolveSpecKeyForTool(card, defs, boardedMap(defs));
	if (resolved === null) return {
		mode: "card",
		target: card,
		error: `unknown card '${card}' — name a registered card or family (melite_discover lists them); nothing was written to the bench`
	};
	const cardDef = defs.get(resolved.card);
	const normalizedBag = normalizeJsonArrayParams(bag, cardDef?.jsonArrayParams);
	/* v8 ignore next -- resolveSpecKey answered above; every real card
	* id and family alias is far under 80 chars, so the truncation arm
	* is defensive only (2026-10-13, the coverage-cure pass). */
	const intent = card.length > 80 ? card.slice(0, 77) + "…" : card;
	const stageParams = cardDef?.requiresModel !== false ? {
		...normalizedBag,
		model
	} : normalizedBag;
	let existing = null;
	try {
		existing = await estate.benchGet(a.bench, signal, DRAFT_TIMEOUT_MS);
	} catch {
		existing = null;
	}
	const heldStages = existing !== null && Array.isArray(existing["stages"]) ? existing["stages"].filter((st) => typeof st === "object" && st !== null) : [];
	let draftId;
	let stageId = "s_0";
	let rode;
	if (heldStages.length > 0 && existing !== null) {
		const twin = heldStages.find((st) => st["card"] === card && canonJson(st["params"]) === canonJson(stageParams));
		if (twin !== void 0) {
			const twinId = String(twin["id"]);
			const twinResult = twin["result"] !== null && typeof twin["result"] === "object" && !Array.isArray(twin["result"]) ? twin["result"] : null;
			const twinLastRun = twinResult !== null && typeof twinResult["run_id"] === "string" && twinResult["run_id"] !== "" ? twinResult["run_id"] : null;
			return {
				mode: "card",
				target: card,
				error: `the bench already holds this card as stage ${twinId} with the same params${twinLastRun !== null ? ` (last run ${twinLastRun})` : " (never run)"} — pressing it again would spend a second identical GPU run (F3-12 double spend); nothing was appended and no run was started: press that row directly with melite_flow {stage:"${twinId}"}, or patch its params with melite_construct patch to change the work and run again`
			};
		}
		try {
			const appendOnce = (rev) => estate.benchVerb(a.bench, "add_stage", {
				card,
				engine: CARD_PLANE_ENGINE,
				params: stageParams,
				...rev !== void 0 && rev !== null ? { expect_rev: rev } : {}
			}, signal, DRAFT_TIMEOUT_MS);
			let appended;
			try {
				appended = await appendOnce(existing["rev"]);
			} catch (e) {
				if (remoteErrorOf(e)?.code !== "bench/cas-conflict") throw e;
				appended = await appendOnce((await estate.benchGet(a.bench, signal, DRAFT_TIMEOUT_MS))["rev"]);
			}
			if (typeof appended["error"] === "string" && appended["error"] !== "") return {
				mode: "card",
				target: card,
				error: appended["error"]
			};
			if (typeof appended["stage"] === "string" && appended["stage"] !== "") stageId = appended["stage"];
			draftId = typeof existing["draft_id"] === "string" && existing["draft_id"] !== "" ? draftIdOf(existing["draft_id"]) : benchDraftIdOf(a.bench);
			rode = `merge-arm (bench held ${String(heldStages.length)} stage(s) — appended ${stageId}, nothing replaced)`;
		} catch (e) {
			return {
				mode: "card",
				target: card,
				error: e instanceof Error ? e.message : String(e)
			};
		}
	} else try {
		draftId = await loadBench(estate, {
			session: a.bench,
			intent,
			stages: [{
				id: "s_0",
				card,
				engine: CARD_PLANE_ENGINE,
				params: stageParams
			}]
		}, signal);
	} catch (e) {
		return {
			mode: "card",
			target: card,
			error: e instanceof Error ? e.message : String(e)
		};
	}
	const started = await startRun(estate, {
		...normalizedBag,
		model,
		test: wireBool(a.test),
		draft_id: draftId
	}, signal);
	if (typeof started["error"] === "string") return {
		mode: "card",
		target: card,
		...rode !== void 0 ? { rode } : {},
		...started
	};
	const runId = started["run_id"];
	if (typeof runId === "string" && runId !== "") observeAndAttribute(estate, draftId, stageId, runId, new AbortController().signal, wireBool(a.test)).catch(String);
	return {
		mode: "card",
		target: card,
		model,
		draft_id: draftId,
		...rode !== void 0 ? { rode } : {},
		...started
	};
}
/** TEMPLATE (the old flow_run path): a {flow} press that MATERIALIZES
*  the flow's cards onto the bench, then starts the run through the
*  flow's own door. (The FLOWS-ARE-COMPOSITIONS law, operator
*  2026-11-14: "WHEN YOU LOAD A FLOW, IT COMES OUT AS CARDS… THE
*  BENCH OF CARDS REPRESENTS A FLOW" — slice A killed the ref_flow
*  marker row, and slice C replaces the press it poisoned: a
*  card-stage flow lands as its CARD rows (ONE bench write, the
*  same expansion the {flow} door composes, undoable via the
*  melite_construct undo the landing's history carries), and the
*  run presses the flow door carrying the bench's draft_id — the
*  envelope's CARD BIRTH law satisfied by a draft that EXISTS and
*  shows the very cards being run. A flow whose stages hold no card
*  seats (family actions, engine verbs, skip_when — the
*  contradictions the audit named) keeps the draft-less face: the
*  run row alone is the landing, and the start door's flow-doc
*  exemption admits the press.) */
async function runTemplate(estate, a, signal) {
	const flow = a.flow;
	/* v8 ignore next -- hasFlow gate proves non-empty flow (2026-09-12) */
	if (!flow) return {
		mode: "flow",
		target: "",
		error: "flow is required (a discovered flow name)"
	};
	const overrides = a.params;
	let benchRows;
	let initialKeys;
	try {
		const bundle = await estate.loadCard("flow", flow, signal, DRAFT_TIMEOUT_MS);
		const rawRows = bundle["bench_stages"];
		if (Array.isArray(rawRows) && rawRows.length > 0) benchRows = rawRows.filter((r) => typeof r === "object" && r !== null && !Array.isArray(r));
		const initials = bundle["initials"];
		if (initials !== void 0 && initials !== null && typeof initials === "object" && !Array.isArray(initials) && initials.validators !== void 0 && initials.validators !== null && typeof initials.validators === "object" && !Array.isArray(initials.validators)) initialKeys = new Set(Object.keys(initials.validators));
	} catch (e) {
		const re = remoteErrorOf(e);
		return {
			mode: "flow",
			target: flow,
			error: re !== null && re !== void 0 && re.message !== "" ? re.message : e instanceof Error ? e.message : String(e)
		};
	}
	let draftId;
	if (benchRows !== void 0) try {
		draftId = await loadBench(estate, {
			session: a.bench,
			intent: flow,
			stages: benchRows
		}, signal);
	} catch (e) {
		return {
			mode: "flow",
			target: flow,
			error: e instanceof Error ? e.message : String(e)
		};
	}
	const top = {};
	const knobs = {};
	if (initialKeys === void 0) Object.assign(top, overrides);
	else for (const [k, v] of Object.entries(overrides)) if (initialKeys.has(k)) top[k] = v;
	else knobs[k] = v;
	const started = await startRun(estate, {
		...top,
		...Object.keys(knobs).length > 0 ? { params: knobs } : {},
		flow,
		test: wireBool(a.test),
		...draftId !== void 0 ? { draft_id: draftId } : {}
	}, signal);
	if (typeof started["error"] === "string") return {
		mode: "flow",
		target: flow,
		...draftId !== void 0 ? { draft_id: draftId } : {},
		...started
	};
	return {
		mode: "flow",
		target: flow,
		...draftId !== void 0 ? { draft_id: draftId } : {},
		...benchRows !== void 0 ? { materialized: benchRows.length } : {},
		...started
	};
}
function meliteFlow(estate) {
	const presentCall = (args) => {
		const a = args;
		return {
			card: "generic",
			title: `Run ${typeof a.card === "string" && a.card !== "" ? a.card : typeof a.flow === "string" && a.flow !== "" ? a.flow : typeof a.stage === "string" && a.stage !== "" ? `stage ${a.stage}` : "?"}`,
			kind: "execute"
		};
	};
	return defineTool({
		name: "melite_flow",
		description: "Execute through the serial GPU queue — the ONE execution verb. Exactly one per call: bench (run THE shared bench exactly as it stands — what the user's Run press runs) | card (a card id + model — single generation) | flow (a NAMED template from melite_load) | stage (ONE bench stage id — runs that stage alone through the bench pass, siblings + intent untouched; hand-built work presses ONE seated row, never a hand-authored graph). Compositions LOAD the shared bench first (nothing mints fresh — one state, one log, one undo); every start rides the bench's doc-backed draft_id (CARD BIRTH LAW) — it rides the value as the chat tile handle, never an agent arg. Returns {run_id, draft_id}; poll with run_status. One active run machine-wide.",
		parameters: {
			bench: {
				type: "boolean",
				description: "BENCH mode: run THE shared bench exactly as it stands (what the user's Run press runs). A JSON boolean — true, never the string \"true\". Exclusive with card/flow/stage."
			},
			stage: {
				type: "string",
				description: "PER-STAGE mode — the id of ONE stage on the shared bench (e.g. s_0); runs that stage alone through the same compose/wire-resolution/attribution path the bench pass uses, never its siblings. Exclusive with bench | card | flow."
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
			prompt: {
				type: "string",
				description: "SINGLE mode ONLY: the generation prompt (wins over params.prompt). Card mode takes its text key (e.g. text) INSIDE params — top-level prompt on a card refuses as an unknown param."
			},
			params: {
				type: "object",
				additionalProperties: true,
				description: "Overrides merged over the mode defaults (seed, knobs)."
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
						description: "Which composition ran (or was attempted): bench | card | flow. bench is the commonest success value — the shared-bench run returns mode:'bench' at every bench return site.",
						required: true
					},
					target: {
						type: "string",
						description: "The card id, flow name, or bench draft id (echoed on refusal).",
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
				const passRows = Array.isArray(pass) ? pass.map((p) => "  · " + String(p["stage"] ?? "?") + " " + String(p["card"] ?? "?") + (typeof p["run_id"] === "string" && p["run_id"] !== "" ? " → " + p["run_id"] : "") + " [" + (p["status"] === void 0 && p["skipped"] !== void 0 ? "skipped " + String(p["skipped"]) + (p["skipped"] === "archived" ? " — spent stage resting; unarchive to run it again" : typeof p["last_run"] === "string" && p["last_run"] !== "" ? " — unchanged since its last run; patch a param VALUE to re-run" : " — done on record but no last run behind it; patch params to force a run") : String(p["status"] ?? p["skipped"] ?? "?")) + "]" + (typeof p["stamp_note"] === "string" && p["stamp_note"] !== "" ? " — STAMP MISSED (" + p["stamp_note"] + "): the user’s cards tab will NOT show this run; re-stamp to show it" : p["attribution"] === "missed" ? " — STAMP MISSED (attribution marked missed on the run row): the user’s cards tab will NOT show this run; re-stamp to show it" : "") + (typeof p["warning"] === "string" && p["warning"] !== "" ? "\n    ⚠ " + p["warning"] : "") + (typeof p["stale"] === "string" && p["stale"] !== "" ? "\n    ↻ " + p["stale"] : "") + (typeof p["url"] === "string" && p["url"] !== "" ? " " + p["url"] : "") + (Array.isArray(p["host_paths"]) && p["host_paths"].length > 0 ? " (host: " + p["host_paths"].join(", ") + ")" : "")).join("\n") : "";
				const hostPaths = v.host_paths;
				return [{
					type: "text",
					text: (typeof v.draft_id === "string" && v.draft_id !== "" ? "card " + v.draft_id + " · " : "") + "flow " + String(v.target ?? "?") + (typeof v.materialized === "number" ? ` (materialized ${v.materialized} cards on the bench)` : "") + (typeof v.run_id === "string" && v.run_id !== "" ? " → " + v.run_id : "") + " [" + String(v.status ?? "queued") + "] — poll with run_status" + (passRows !== "" ? "\n" + passRows : "") + (Array.isArray(hostPaths) && hostPaths.length > 0 ? "\nartifacts on host (rooted at the estate output tree, not your cwd): " + hostPaths.join("\n  ") : "")
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
					...typeof v.error === "string" && v.error !== "" ? { error: v.error } : {},
					...Array.isArray(v.pass) ? {
						previews: v.pass.filter((p) => typeof p["url"] === "string" && p["url"] !== "").map((p) => {
							const urls = assetUrlsOf(p);
							return {
								stage: typeof p["stage"] === "string" ? p["stage"] : "?",
								url: String(p["url"]),
								status: typeof p["status"] === "string" ? p["status"] : "done",
								...urls.length > 0 ? { artifacts: urls } : {}
							};
						}),
						rows: v.pass.map((p) => {
							const row = {
								stage: typeof p["stage"] === "string" ? p["stage"] : "?",
								card: typeof p["card"] === "string" ? p["card"] : "",
								status: typeof p["status"] === "string" && p["status"] !== "" ? p["status"] : p["skipped"] !== void 0 ? "skipped" : typeof p["thrown"] === "string" && p["thrown"] !== "" ? "error" : ""
							};
							if (typeof p["run_id"] === "string" && p["run_id"] !== "") row["run_id"] = p["run_id"];
							if (typeof p["url"] === "string" && p["url"] !== "") row["url"] = p["url"];
							const arts = assetUrlsOf(p);
							if (arts.length > 0) row["artifacts"] = arts;
							return row;
						})
					} : {},
					...typeof v.intent === "string" && v.intent !== "" ? { intent: v.intent } : {}
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
			const hasStage = typeof a.stage === "string" && a.stage !== "";
			const modes = [
				hasBench,
				hasCard,
				hasFlow,
				hasStage
			].filter(Boolean).length;
			const known = /* @__PURE__ */ new Set([
				"bench",
				"card",
				"model",
				"flow",
				"prompt",
				"params",
				"test",
				"stage"
			]);
			const stray = Object.keys(args).filter((k) => !known.has(k));
			if (stray.length > 0) return jsonClean({
				mode: "flow",
				target: "",
				error: "unknown melite_flow arg(s) " + JSON.stringify(stray) + " — ad-hoc stages are gone (W-1, 2026-11-05: a hand-built graph landed on the shared bench and replaced its stages); press ONE seated bench row with stage: \"<bench stage id>\"; card params (text, voice_name, qvoice, variant, …) ride INSIDE params, never top-level; top-level carries only bench | card (+model) | flow | stage (+params/prompt/test)"
			});
			if (modes === 0) return jsonClean({
				mode: "flow",
				target: "",
				error: "one composition is required: bench (run what is there) | card (+model) | flow | stage (one bench stage alone)"
			});
			if (modes > 1) return jsonClean({
				mode: "flow",
				target: "",
				error: "exactly one composition per call: bench | card | flow | stage — never combined"
			});
			const bench = benchKeyOfExec(exec);
			try {
				if (hasStage) return jsonClean(await runStage(estate, {
					stage: a.stage,
					test,
					bench
				}, exec.signal));
				if (hasBench) return jsonClean(await runBench(estate, {
					test,
					bench
				}, exec.signal));
				if (hasFlow) return jsonClean(await runTemplate(estate, {
					flow: a.flow,
					params: bag,
					test,
					bench
				}, exec.signal));
				return jsonClean(await runSingle(estate, {
					card: a.card,
					model: typeof a.model === "string" ? a.model : "",
					prompt: typeof a.prompt === "string" ? a.prompt : void 0,
					params: bag,
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
* via `pnpm run provision -- manage <action> …`).
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
	"acquire_weight",
	"acquire_retry",
	"acquire_discard",
	"restart",
	"stop",
	"launch",
	"update",
	"switch_version",
	"free",
	"settle_stale",
	"provision_runtime",
	"snapshot_save",
	"snapshot_restore",
	"lora_list",
	"lora_install",
	"lora_fetch",
	"refmods_list",
	"preflight"
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
		if (typeof source.bytes === "number") fields.bytes = source.bytes;
		if (typeof source.total === "number") fields.total = source.total;
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
/** The engine_unit census row's carried truth (restarts / last exit /
*  oom — the map's `degraded (restarts 3, last exit 9/KILL, oom 4)`
*  words), composed only from present fields; an oom count of zero
*  reads as silence, never as a claim. */
function unitTruthText(row) {
	const parts = [];
	if (typeof row.restarts === "number") parts.push("restarts " + String(row.restarts));
	if (typeof row.last_exit_status === "number") {
		const code = typeof row.last_exit_code === "string" ? row.last_exit_code : "status";
		parts.push("last exit " + String(row.last_exit_status) + "/" + code);
	}
	if (typeof row.last_exit_at === "string") parts.push("at " + row.last_exit_at);
	if (typeof row.oom_kills === "number" && row.oom_kills > 0) parts.push("oom-kill lines " + String(row.oom_kills));
	if (typeof row.note === "string") parts.push(row.note);
	return parts.length === 0 ? "" : " — " + parts.join(" · ");
}
function statusText(data, verbose) {
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
	if (Array.isArray(value.active_runs)) out.push("active_runs: " + (value.active_runs.length === 0 ? "none" : value.active_runs.map(asText).join(", ")));
	const engineQueue = recordValue(value.engine_queue);
	if (engineQueue !== null) out.push("engine queue: running " + asText(engineQueue.running) + " · pending " + asText(engineQueue.pending));
	const boot = recordValue(value.engine_boot);
	if (boot !== null) out.push(boot.known === true ? "engine boot: " + asText(boot.boot_at) + " · age " + asText(boot.age_seconds) + "s · source " + asText(boot.source) : "engine boot: unknown — " + asText(boot.note));
	const engineUnit = recordValue(value.engine_unit);
	if (engineUnit !== null) out.push(engineUnit.known === true ? "engine unit " + asText(engineUnit.unit) + ": " + asText(engineUnit.verdict) + unitTruthText(engineUnit) : "engine unit: unknown — " + asText(engineUnit.note));
	if (Array.isArray(value.stale_claims) && value.stale_claims.length > 0) {
		out.push("stale_claims (historical, never settled): " + String(value.stale_claims.length) + " claim(s)" + (verbose === true ? "" : " (pass verbose=true to list each claim)") + " — retire them with the settle_stale action");
		if (verbose === true) for (const claim of value.stale_claims) out.push("  stale claim: " + asText(claim));
	}
	if (typeof value.active_runs_note === "string") out.push("note: " + value.active_runs_note);
	if (Array.isArray(value.resources)) {
		const shown = value.resources.slice(0, 20);
		for (const resource of shown) {
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
		if (value.resources.length > shown.length) out.push("resource: +" + String(value.resources.length - shown.length) + " more (display cap — the roster is longer than shown)");
	}
	if (value.census_partial === true) out.push("census: partial — the scan could not check every resource or item; unknown rows are not health verdicts");
	const operations = Array.isArray(value.operations) ? value.operations : manager !== null && Array.isArray(manager.operations) ? manager.operations : [];
	const shownOperations = operations.slice(0, 20);
	for (const operation of shownOperations) out.push(operationText(operation));
	if (operations.length > shownOperations.length) out.push("operation: +" + String(operations.length - shownOperations.length) + " more (display cap — the ledger is longer than shown)");
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
function renderManage(args, value) {
	const result = recordValue(value);
	const action = typeof result?.action === "string" ? result.action : "?";
	const detail = typeof result?.detail === "string" ? result.detail : "";
	const data = result?.data;
	const verbose = recordValue(args)?.verbose === true;
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
	if (action === "status") lines.push(...statusText(data, verbose));
	else if (action === "preflight") {
		const misses = Array.isArray(result.misses) ? result.misses : [];
		for (const miss of misses) lines.push("MISS " + String(miss));
		if (misses.length === 0) lines.push("no misses — every axis green");
		for (const r of (Array.isArray(result.rows) ? result.rows : []).slice(0, 8)) lines.push("  " + String(r));
	} else if (action === "logs" || action === "search_models" || action === "list_extensions" || action === "snapshot_list") lines.push(...actionRows(action, data, result.rows));
	else if (result.state !== void 0 || result.items !== void 0 || result.operations !== void 0 || result.operation_id !== void 0 || result.bytes !== void 0 || result.total !== void 0) {
		if (typeof result.state === "string") lines.push("state: " + result.state);
		if (typeof result.operation_id === "string") lines.push("operation: " + result.operation_id);
		if (typeof result.bytes === "number" || typeof result.total === "number") lines.push("progress: " + String(result.bytes ?? "?") + "/" + String(result.total ?? "?") + " bytes");
		const nestedDetail = data !== void 0 && data !== null && typeof data === "object" ? data.detail : void 0;
		if (typeof nestedDetail === "string" && nestedDetail !== "" && nestedDetail !== detail) lines.push("reason: " + nestedDetail);
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
function comfyManage(estate) {
	const presentCall = (args) => {
		const a = args;
		return {
			card: "generic",
			title: `ComfyUI ${a.action}`,
			kind: "execute",
			rawInput: a.action
		};
	};
	return defineTool({
		name: "comfy_manage",
		description: "Manage the ComfyUI engine lane for the bench (the estate's managed workspace only), snapshot_list / snapshot_save / snapshot_restore (environment snapshots; restore is refused while runs are active); endpoint_set (point at a different ComfyUI server url — validate-first: an unreachable url is refused, never written); install_extension (registry ids), install_extension_url (git url + optional ref pin; a URL the shipped extension manifest declares auto-provisions from its byte-verified pin — no operator_confirmed) and download_model (url) refuse without operator_confirmed=true — the human's explicit URL approval, never the agent's own; provision_model (declared model id from melite_load; Manager search results are external-catalog rows, not provision ids); acquire_weight (THE run-failure weight door — ONE door with the bench popup Download button: start with model + optional file/variant/quant, take the operation_id from the answer, then poll the SAME action with operation_id for live bytes/total until a terminal state); lora_list (the engine-accepted LoRA names plus the user rows file — and the self-healing read: it re-arms the lora flavors, so a file landed by ANY means serves the family's mods after the next lora verb) and lora_install (copy or upload a LoRA file the operator already has — never fetched; THE LORA RECIPE for an attached/local file: pass filename + path (or data) + families:[\"<family>\"] and the door does BOTH halves — the file lands under the family's loras shelf AND the picker row is seated; the mod composes on the next compose, NO restart, NO file edits, NO paste); lora_fetch — THE LORA RECIPE for a URL (the operator's 2026-11-09 order): add a lora to <family>: lora_fetch url → the file lands under the family's loras subfolder, the picker row is seated, and the mod composes (the human's operator_confirmed gates it like every external fetch; the answer carries the combo name and the seated row); refmods_list (the engine's own MiniMaxH3RefModsLoader mod combos off /object_info — the refmod picker's candidate feed, read-only); preflight — THE SETUP READ (call it FIRST on a fresh lane): one named list of every setup miss (engine reachable, Manager present, required declared packs landed, store root on disk, extra-model wiring visible), each miss naming the door that closes it — never discover them as mid-run burns; settle_stale (retire the never-settled sidecar claims the status face names — operator gesture, the guard stays fail-closed) and provision_runtime (link the engine tree's data/runtime/<name> to the repo seed — the run-rescue banner's own door, runtime NAME only); restart, stop, launch, update (target comfy), switch_version, free. THE DEGRADED READING (status): a degraded engine_unit verdict names its causes (the restart loop, a SIGKILL last exit, kernel oom evidence) in its note, and under memory pressure the maker's lever is smaller windows (the refine design window is 2.33 s = 56 f). INFRA UPKEEP only — it never runs inference, and lifecycle actions are refused while runs are active (stop them or pass force).",
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
				description: "install_extension_url / download_model / endpoint_set / lora_fetch: the git URL, file URL, ComfyUI server URL, or the LoRA file URL (query/fragment never name the file)."
			},
			ref: {
				type: "string",
				description: "install_extension_url: the git commit SHA or tag to pin — unpinned URLs float with the branch head and a later install lands different bytes. Every declared nodes.yaml row is pinned; operator free-text installs carry the same law through this param."
			},
			operator_confirmed: {
				type: "boolean",
				description: "install_extension_url / download_model / lora_fetch: pass true ONLY after the human running you explicitly approved this URL — the flag is recorded with the operation and the door refuses without it. Never set it on your own judgment."
			},
			relative_path: {
				type: "string",
				description: "download_model: destination under the models root, e.g. \"models/checkpoints\"."
			},
			filename: {
				type: "string",
				description: "download_model: on-disk filename. lora_fetch: optional bare name (derived from the URL by the C5 law when omitted). lora_install: required with data (the name the engine combo will list)."
			},
			path: {
				type: "string",
				description: "lora_install: source path of a LoRA file the operator already has (copied, never fetched)."
			},
			data: {
				type: "string",
				description: "lora_install: base64 LoRA bytes (the browser-upload arm; requires filename)."
			},
			families: {
				type: "array",
				items: { type: "string" },
				description: "lora_install: family ids for the seated picker row — with EXACTLY ONE family the file lands under the family's loras subfolder and the combo name becomes \"<family>/<file>\" (e.g. [\"anima\"]); always state it for an install the user will compose with. lora_fetch: EXACTLY ONE family, same shelf law."
			},
			sha256: {
				type: "string",
				description: "lora_fetch: the source-stated sha256 — the landing verifies against it when carried; omit when the source states none."
			},
			model: {
				type: "string",
				description: "provision_model / acquire_weight: declared model id from melite_load (e.g. \"z-image\"); Manager search rows are not provision ids."
			},
			variant: {
				type: "string",
				description: "provision_model / acquire_weight: optional variant id."
			},
			quant: {
				type: "string",
				description: "provision_model / acquire_weight: optional quant cell id."
			},
			runtime: {
				type: "string",
				description: "provision_runtime: the runtime NAME to link (e.g. \"anny-estimator\" — the family scan serves the name server-side; the run-rescue banner already posts this verb, the client never paths it)."
			},
			file: {
				type: "string",
				description: "acquire_weight: the missing weight filename for display (e.g. \"sam2.1_hiera_large.pt\"); the DECL owns the fetch source."
			},
			operation_id: {
				type: "string",
				description: "acquire_weight: poll key — the operation_id from the start answer; the tracker polls the same action with this until a terminal state."
			},
			query: {
				type: "string",
				description: "search_models: search text (omit or empty lists the whole Manager external catalog, capped at 50)."
			},
			verbose: {
				type: "boolean",
				description: "status: pass true to list every stale claim — the default names only the count."
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
					bytes: {
						type: "number",
						description: "acquire_weight: live landed bytes for the weight fetch (the tracker numerator — real, never animation)."
					},
					total: {
						type: "number",
						description: "acquire_weight: declared size_bytes total for the weight fetch (the tracker denominator)."
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
				"ref",
				"relative_path",
				"filename",
				"file",
				"model",
				"variant",
				"quant",
				"runtime",
				"query",
				"tail",
				"version",
				"target",
				"force",
				"snapshot",
				"path",
				"data",
				"families",
				"operation_id",
				"operator_confirmed",
				"sha256"
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
				res = await estate.manageAct(body, exec.signal, MANAGE_TIMEOUT_MS);
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
}
//#endregion
//#region src/tools/melite-discover.ts
const TIMEOUT_MS$1 = 15e3;
/** Counts-first clamp: over this many lines the default answer
* clamps (counts + vocabulary + the first rows ride instead). */
const CLAMP = 12;
function meliteDiscover(estate, expandEstateDoors) {
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
	return defineTool({
		name: "melite_discover",
		description: "Progressive disclosure tier 1 over the estate (cards + flows): returns clamped summary LINES, never bodies. THE EXPANSION LAW: the estate’s deeper doors (melite_view, comfy_manage, melite_skill_read, ledger_tail) seat themselves the first time you touch the catalog — they are never missing, only deferred. q is RANKED, never literal: every real word scores its best facet (exact tag, exact word, modality, trigram fuzzy) and each line says WHY it matched — a full user sentence works. tags= stays a hard facet. Args: lookup (all | cards | flows, default all) + tags (comma-separated card-declared tags, e.g. \"image,upscale\") + optional q (free-text filter). Prefer a FLOW when one fits the task — composition over single calls; fall back to cards. COUNTS-FIRST: a large estate clamps to counts + the tag vocabulary + the first rows; detail=true for every line. Open a line with melite_load (agents md + signature + skill lines).",
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
				const a = args ?? {};
				const filtering = typeof a.q === "string" && a.q !== "" || typeof a.tags === "string" && a.tags !== "";
				const tf = typeof v?.totals?.flows === "number" ? v.totals.flows : nf;
				const tc = typeof v?.totals?.cards === "number" ? v.totals.cards : nc;
				const out = filtering ? [`discover: ${tc} cards, ${tf} flows in the estate CATALOG — ${nc} cards, ${nf} flows matched your filter (not your bench — read the bench's staged cards with melite_construct verb=read) — open one with melite_load`] : [`discover: ${nf} flows, ${nc} cards in the estate CATALOG (not your bench — read the bench's staged cards with melite_construct verb=read) — open one with melite_load`];
				if (flows.length === 0 && cards.length === 0) out.push("no match. q is ranked (tag/word/modality/trigram) — try the MODALITY as tags= (video, image, audio, 3d, generate, edit), fewer words, or lookup=all for the estate-wide first pass.");
				if (flows.length > 0) {
					out.push("flows:");
					for (const f of flows.slice(0, RENDER_CLAMP)) {
						const initials = Array.isArray(f?.initials) ? f.initials.filter((k) => typeof k === "string") : [];
						out.push(`  ${line(f?.name)} — ${line(f?.title)} (${num(f?.stages)} stages${initials.length > 0 ? `; initials: ${initials.join(", ")}` : ""})`);
					}
					if (!wantsAll && nf > RENDER_CLAMP) out.push(`  +${nf - RENDER_CLAMP} more — detail=true lists every line`);
				}
				if (cards.length > 0) {
					out.push("cards:");
					for (const c of cards.slice(0, RENDER_CLAMP)) {
						const tags = Array.isArray(c?.tags) ? c.tags.filter((t) => typeof t === "string") : [];
						const why = typeof c?.matched_by === "string" && c.matched_by !== "" ? c.matched_by : "";
						out.push(`  ${line(c?.id)} — ${line(c?.label)}${tags.length > 0 ? ` [${tags.join(",")}]` : ""}${why !== "" ? ` · why: ${line(why)}` : ""}`);
					}
					if (!wantsAll && nc > RENDER_CLAMP) out.push(`  +${nc - RENDER_CLAMP} more — narrow with tags/q, or detail=true`);
				}
				if (Array.isArray(v?.tag_vocabulary)) {
					const vocab = v.tag_vocabulary.filter((t) => typeof t === "string");
					if (vocab.length > 0) out.push("tag vocabulary: " + vocab.join(", "));
				}
				if (Array.isArray(v?.missed_tags)) {
					const missed = v.missed_tags.filter((t) => typeof t === "string");
					if (missed.length > 0) out.push("missed tags (your filter removed these rows — one hop away): " + missed.join(", "));
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
			const lookup = typeof a.lookup === "string" && a.lookup !== "" ? a.lookup : "all";
			const q = typeof a.q === "string" && a.q !== "" ? a.q : "";
			const tags = typeof a.tags === "string" && a.tags !== "" ? a.tags : "";
			try {
				const res = await estate.discover(lookup, q, tags, exec.signal, TIMEOUT_MS$1);
				const r = res;
				const flows = Array.isArray(r.flows) ? r.flows : [];
				const cards = Array.isArray(r.cards) ? r.cards : [];
				const totals = {
					flows: typeof r.totals?.flows === "number" ? r.totals.flows : flows.length,
					cards: typeof r.totals?.cards === "number" ? r.totals.cards : cards.length
				};
				const missed_tags = Array.isArray(r.missed_tags) ? r.missed_tags.filter((t) => typeof t === "string") : [];
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
						totals,
						tag_vocabulary: [...vocab].sort().slice(0, 40),
						missed_tags,
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
						totals,
						missed_tags,
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
}
//#endregion
//#region src/tools/melite-load.ts
const TIMEOUT_MS = 2e4;
function meliteLoad(estate, opts = {}) {
	const presentCall = (args) => {
		return {
			card: "generic",
			title: `Load ${args.name}`,
			kind: "search"
		};
	};
	return defineTool({
		name: "melite_load",
		description: "Open ONE card or flow (discover it first with melite_discover). Args: name (the card id or flow name) + inference_type (card | flow — a card or a flow tool call; nothing else executes). THE EXPANSION LAW: the estate’s deeper doors (melite_view, comfy_manage, melite_skill_read, ledger_tail) seat themselves on this call — never missing, only deferred. Returns the bundle: agents md, the tool-call signature (params_schema for cards; the prebuilt simplified signature for flows), tier-1 skill lines for the underlying skills (bodies load via melite_skill_read — write the prompts yourself from the craft you read), model hints on cards (the boarded checkpoints — description, each marked present:true|false: present means downloaded on this machine; absent-but-boarded models are OFFERED — prompt the user to download, or provision via comfy_manage provision_model) + pack hints (the card's declared ComfyUI extension packs, marked present:true|false|null — missing packs refuse the run: install via comfy_manage install_extension), and a stable bundle digest — quote it and skip reload on a match. The default answer is the DIGEST (counts, required params, kinds, skills, digest); pass detail=true only when composing needs every param name, the bench grammar, or the lane field law.",
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
			},
			detail: {
				type: "boolean",
				description: "Serve the FULL surface (every param name, the bench grammar, the lane field law). Default is the DIGEST: counts, required params, kinds, skills, digest — ask for detail only when composing needs the exact names."
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
			render: (args, value) => {
				const v = value;
				if (v && typeof v.error === "string") return [{
					type: "text",
					text: "melite_load REFUSED: " + v.error
				}];
				const detail = args?.detail === true;
				const b = v?.bundle ?? {};
				const str = (x) => typeof x === "string" ? x : "";
				const benchRows = Array.isArray(b.bench_stages) ? b.bench_stages : [];
				const next = opts.delegated === true ? "open with melite_flow" : str(b.kind) === "flow" ? benchRows.length > 0 ? "it is a flow of cards — the bundle carries its bench_stages rows (the same graph the {flow} door composes); land them on the shared bench in ONE write: melite_construct load {stages: <the bench_stages rows verbatim>, intent: '" + str(b.name) + "'}; keep editing the cards there; runs start at the user's Run press" : "it is a flow, not a card — drive it through the run doors; its stages compose on the family/engine planes at run time (no card seats to bench), and its card stages may still be benched one by one with melite_construct (add_stage)" : "compose it with melite_construct (add_stage) — the bench state is live in the user's cards tab; keep editing it there; runs start at the user's Run press";
				const out = [`loaded ${str(b.kind) || "?"} ${str(b.name) || "?"} — ${next}`];
				if (str(b.kind) === "flow" && b.initials != null && typeof b.initials === "object") {
					const vals = b.initials.validators;
					const glosses = b.initials.glosses;
					const reqList = Array.isArray(b.initials.required) ? b.initials.required.filter((r) => typeof r === "string") : [];
					const keys = Array.isArray(b.initials.keys) ? b.initials.keys.filter((k) => typeof k === "string") : [];
					const seat = (k) => {
						const kind = vals !== void 0 && typeof vals[k] === "string" ? ` (${vals[k]}` : "";
						const gloss = glosses !== void 0 && typeof glosses === "object" && typeof glosses[k] === "string" ? kind !== "" ? ` — ${glosses[k]}` : "" : "";
						return (reqList.includes(k) ? k + "*" : k) + kind + gloss + (kind !== "" ? ")" : "");
					};
					if (keys.length > 0) out.push("flow initials: " + keys.map(seat).join(", ") + (reqList.length > 0 ? " (* required)" : ""));
				}
				const hints = Array.isArray(b.model_hints) ? b.model_hints : [];
				if (hints.length > 0) {
					const present = hints.filter((h) => h?.present === true).length;
					out.push(`weights: ${present}/${hints.length} boarded checkpoints present on this machine (provisioning is the estate's business — compose the card)`);
				}
				const sig = b.signature;
				let craftHint = "";
				if (sig !== null && sig !== void 0) {
					const props = sig.params_schema?.properties;
					const keys = props !== void 0 && props !== null ? Object.keys(props) : [];
					const req = Array.isArray(sig.params_schema?.required) ? sig.params_schema.required.filter((r) => typeof r === "string") : [];
					if (keys.length > 0) {
						const marked = keys.map((k) => req.includes(k) ? k + "*" : k);
						if (detail) out.push("params: " + marked.join(", ") + (req.length > 0 ? " (* required)" : ""));
						else if (keys.length <= 40) out.push("params: " + marked.join(", ") + (req.length > 0 ? " (* required)" : ""));
						else out.push("params: " + keys.length + " (required: " + (req.length > 0 ? req.join(", ") : "none") + ") — detail=true for every name");
					}
					craftHint = typeof b.craft?.prompt_hint === "string" ? b.craft.prompt_hint : "";
					if (craftHint !== "") out.push("prompt style: " + craftHint);
					const mods = Array.isArray(sig?.modifiers) ? sig.modifiers : [];
					const styleVals = [sig?.model];
					const modelProp = (sig?.params_schema?.properties)?.model;
					if (Array.isArray(modelProp?.enum)) styleVals.push(...modelProp.enum);
					const seatFams = [];
					for (const v of styleVals) {
						if (typeof v !== "string" || v === "") continue;
						const fam = v.split(":")[0];
						if (fam !== "" && !seatFams.includes(fam)) seatFams.push(fam);
					}
					const served = /* @__PURE__ */ new Set();
					for (const m of mods) {
						const kind = str(m?.kind);
						if (kind !== "") served.add(kind);
						const key = str(m?.param_key);
						if (key !== "") served.add(key);
					}
					const packSeats = familyPackSeats(seatFams, served);
					const modLines = mods.map((m) => {
						const kind = str(m?.kind) || "?";
						const cat = str(m?.category) || "ordered";
						const fs = Array.isArray(m?.fields) ? m.fields.filter((f) => typeof f === "string") : [];
						const bag = typeof m?.param_key === "string" && m.param_key !== "" ? " bag: params." + m.param_key : "";
						return kind + "[] (" + cat + (fs.length ? "; fields: " + fs.join(", ") : "") + bag + ")";
					});
					for (const p of packSeats) modLines.push(p.kind + "[] (" + p.cardinality + "; fields: " + p.fields.join(", ") + ")");
					if (modLines.length > 0 && !detail) out.push("mods: " + modLines.join(", ") + " — detail=true for the bench grammar (flat vs bag-key law)");
					if (modLines.length > 0 && detail) {
						out.push("mods: " + modLines.join(", ") + " — THE BENCH GRAMMAR (melite_construct add_stage/patch, where you compose): ABSORBED pack-mod FIELDS ride FLAT inside params (e.g. params {voice_name, qvoice}) — never keyed under the pack name, never at flow top-level. A pack key (e.g. qvoice_save) as a params key REFUSES at the compose door: the pack takes no key of its own, its fields ride flat top-level; card-mode lane select: `variant`/`quant` ride INSIDE params (e.g. params {variant: 'customvoice'}) while the stage's `model` selector rides top-level — the compose reads them off the body, the engine never sees them. ONE named exception: a card whose own doc reads the model FAMILY from params (tts: params {model: 'qwen3-tts'} — the loaded card doc owns the seat spelling; follow it there); bag-mode arrays under the kind keys exist ONLY for flow_inline/ad-hoc stages (melite_flow {flow}, never the bench) — ordered kinds stack in array order, standalone kinds each provide their own output (the bag lives at param_key when it differs); CARD-DECLARED ORDERED EXCEPTION (friction-report #2, 2026-10-28): the flat law above covers PACK-mod fields only — a card's OWN ordered kinds (each mods line names its `bag: params.<param_key>`, e.g. replace[] bag: params.replace) ride as an ARRAY under that key on EVERY door, bench included: params {replace: [{source_clip, still, mannequin, mask, swap_prompt, ...}]} (max_stack 1 = one entry) — never flat (the flat field names refuse at the compose door: unknown param(s): admission is knobs + admits, and only the bag key rides admits)");
						const keyed = packSeats.filter((p) => p.param_key !== p.kind);
						if (keyed.length > 0) out.push("mod param_keys: " + keyed.map((p) => p.kind + " → " + p.param_key + " (entries: " + (p.entry_shape ?? "{" + p.fields.join(", ") + "}") + ")").join("; "));
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
					if (sigLanes !== null && sigLanes !== void 0 && typeof sigLanes === "object" && !detail) {
						const laneNames = Object.keys(sigLanes);
						out.push("lanes: " + laneNames.length + " declared (" + laneNames.join(", ") + ") — detail=true for the field law each accepts");
					}
					if (detail && sigLanes !== null && sigLanes !== void 0 && typeof sigLanes === "object") for (const [fam, lane] of Object.entries(sigLanes)) {
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
					if (skills.some((s) => /prompt-enhance/.test(str(s?.id)))) out.push(craftHint !== "" ? "prompting: the prompt style line above is the law — write from it; melite_skill_read deepens it when the ask is unusual (never a required pre-read)" : "prompting: read the per-model prompt rules with melite_skill_read BEFORE writing a prompt");
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
			opts.expandEstateDoors?.();
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
			try {
				return jsonClean({
					...await estate.loadCard(inferenceType, name, exec.signal, TIMEOUT_MS) ?? {},
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
}
/** THE FAMILY-PACK SEATS (022's self-critique #3): the grammar of
*  every modifier pack the card's boarded families DECL-board, read
*  off the ONE grammar table (MODIFIER_PACKS — the form-spec's own)
*  with field names off the engine's registered pack contract (the
*  service read, never a re-derivation). Families arrive pre-parsed
*  (first segment of each semantic model style + enum — the render
*  owns the parse, never the hints). Kinds the card itself
*  declares are skipped (dedupe — the signature already serves
*  them). A registry/service miss drops the family quietly here:
*  the compose door still refuses loud on a bad bag, and the
*  signature's own kinds were never at risk. */
function familyPackSeats(families, servedKinds) {
	const out = [];
	const seen = new Set(servedKinds);
	let svc = null;
	try {
		svc = theService();
	} catch {
		svc = null;
	}
	for (const fam of families) {
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
			if (meta === void 0) continue;
			const key = meta.param_key ?? pack;
			if (seen.has(meta.kind) || seen.has(key)) continue;
			seen.add(meta.kind);
			seen.add(key);
			const fields = svc !== null ? svc.packFieldNames(pack) : [];
			if (fields.length === 0) continue;
			out.push({
				kind: meta.kind,
				param_key: meta.param_key ?? pack,
				fields,
				cardinality: meta.cardinality,
				entry_shape: meta.entry_shape
			});
		}
	}
	return out;
}
//#endregion
//#region src/tools/glbSummary.ts
const GLB_MAGIC = 1179937895;
const CHUNK_JSON = 1313821514;
const GLB_HEADER = 12;
/** One little-endian u32 at `at`. Every call site is LENGTH-GUARDED
*  by its caller — the header read past the 12-byte check (:73) and the
*  chunk reads past `off + 8 <= total` with `total <= data.length`
*  (:77-81) — so the four bytes are in range and the read never
*  coerces a missing byte to zero (the re-audit, 2026-10-16). */
function readU32(data, at) {
	return data[at] | data[at + 1] << 8 | data[at + 2] << 16 | data[at + 3] << 24;
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
//#region src/tools/vision-route.ts
/** "provider/model" — the only spelling a route is ever named by. */
function visionRouteName(r) {
	return r.provider + "/" + r.model;
}
/** End-to-end deadline for one delegated verification (the enhance
*  door's observed-live auxiliary-call shape: ~60s seen, 180s bound). */
const VISION_DEADLINE_MS = 18e4;
/**
* Parse the lane's declared eye.
* @param env - the process environment (defaults to the live one).
* @returns the named route, the enumerate fallback, or explicit off.
*/
function viewRoutePreference(env = process.env) {
	const raw = (env["MELITE_VIEW_ROUTE"] ?? "").trim();
	if (raw === "") return { kind: "enumerate" };
	if (raw.toLowerCase() === "off" || raw.toLowerCase() === "none") return { kind: "off" };
	const named = /^([^/\s]+)\/(.+)$/.exec(raw);
	if (named === null) return { kind: "enumerate" };
	return {
		kind: "named",
		route: {
			provider: named[1],
			model: named[2]
		}
	};
}
/**
* Resolve the vision route for one viewing: the named route verified
* image-capable (explicit means explicit — a named-but-blind route is
* the caller's LOUD error, never a silent substitution), else the
* first image-capable route in round-robin enumeration (the craft
* law), else null (the lane has no eye — the caller serves labeled
* measurements).
* @param llm - the harness llm seat.
* @param preference - the parsed lane preference.
* @param signal - optional cancellation for adapter-owned lookups.
* @returns the seeing route, or null when no route on this lane can see.
*/
async function resolveVisionRoute(llm, preference, signal) {
	if (preference.kind === "off") return null;
	if (preference.kind === "named") {
		const wanted = preference.route;
		let info;
		try {
			info = await llm.resolveModelInfo(wanted.provider, wanted.model, signal);
		} catch (error) {
			throw new Error("cannot verify visuals: MELITE_VIEW_ROUTE=\"" + visionRouteName(wanted) + "\" does not resolve (" + (error instanceof Error ? error.message : String(error)) + ") — name a \"provider/model\" route this lane resolves");
		}
		if (info.inputModalities === void 0 || !info.inputModalities.includes("image")) throw new Error("cannot verify visuals: MELITE_VIEW_ROUTE=\"" + visionRouteName(wanted) + "\" resolves with modalities [" + (info.inputModalities ?? []).join(", ") + "] (no image) — explicit means explicit: no silent substitution. Fix: declare input: [text, image] on its model row in the lane profile, or name a vision-capable route");
		return wanted;
	}
	const providers = llm.listProviders();
	if (providers.length === 0) return null;
	const perProvider = [];
	for (const p of providers) try {
		const models = await llm.listModels(p.id);
		if (models.length > 0) perProvider.push(models.map((m) => ({
			provider: p.id,
			model: m.id
		})));
	} catch {}
	const routes = [];
	const depth = perProvider.reduce((n, list) => Math.max(n, list.length), 0);
	for (let i = 0; i < depth; i++) for (const list of perProvider) {
		const row = list[i];
		if (row !== void 0) routes.push(row);
	}
	for (const route of routes) try {
		if (((await llm.resolveModelInfo(route.provider, route.model, signal)).inputModalities ?? []).includes("image")) return route;
	} catch {}
	return null;
}
/** The fixed verification protocol: the tool asks, never the caller
*  (a caller-shaped prompt would be a prompt-injection surface in a
*  viewing door). One question per arm — the still, the film sheet
*  (frames in span order), the mesh poster. */
const VISION_QUESTIONS = {
	still: "You are verifying a commissioned media artifact. Describe exactly what you see in this image: subjects, composition, legible text, and anything anomalous. Do not infer beyond the pixels.",
	film: "You are verifying a commissioned film. These are frames across its span in order. Describe what happens: subjects, setting, visible action, and whether the frames read as one continuous shot or several. Do not infer beyond the pixels.",
	poster: "You are verifying a commissioned 3D model from its render. Describe exactly what you see: the subject, its pose or shape, and anything anomalous. Do not infer beyond the pixels."
};
/**
* One delegated verification: the fixed question + the durable image
* block stream through the seeing route; the verdict text comes back.
* @param llm - the harness llm seat.
* @param route - the resolved seeing route (already verified image-capable).
* @param image - the durable attachment ref (the store's own normalization).
* @param kind - which fixed question the arm asks.
* @param signal - the view call's cancellation (deadline-bounded).
* @returns the seeing route's verdict plus the serving route (the `via` echo).
*/
async function verifyVisual(llm, route, image, kind, signal) {
	const timeout = AbortSignal.timeout(VISION_DEADLINE_MS);
	const combined = signal !== void 0 ? AbortSignal.any([signal, timeout]) : timeout;
	const options = {
		provider: route.provider,
		model: route.model,
		messages: [createUserMessage({
			content: [{
				type: "text",
				text: VISION_QUESTIONS[kind]
			}, {
				type: "image",
				attachment: image
			}],
			source: { kind: "user" }
		})],
		signal: combined
	};
	let text = "";
	let finish = null;
	for await (const chunk of llm.stream(options)) if (chunk.type === "text-delta" && "text" in chunk && typeof chunk.text === "string") text += chunk.text;
	else if (chunk.type === "finish" && "reason" in chunk) {
		const reason = chunk.reason;
		finish = {
			kind: typeof reason?.kind === "string" ? reason.kind : JSON.stringify(reason ?? null),
			failure: reason?.failure
		};
	}
	if (finish === null) throw new Error("cannot verify visuals: " + visionRouteName(route) + " ended without a terminal finish");
	if (finish.kind !== "stop") {
		const detail = finish.failure !== void 0 ? finish.failure.message + " [" + (finish.failure.code ?? "?") + "]" : finish.kind;
		throw new Error("cannot verify visuals: " + visionRouteName(route) + " failed — " + detail);
	}
	return {
		verdict: text,
		via: visionRouteName(route)
	};
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
* route gate (the session's routed provider/model must DECLARE
* image input — a blind calling route gets labeled text or the
* delegated eye's verdict, the mesh arm its strict refusal — BEFORE
* pixels ride any block), the signature sniffer (extension first,
* bytes authoritative), `attachments.saveImage` → durable
* `ImageAttachmentRef`, and the render pairing — one text summary
* block + one `{type:'image', attachment}` block re-branded from
* the structured value (`imageRefFromValue`). No inline base64, no
* bespoke vision lane: the attachment service owns normalization,
* limits, and the durable log.
*
* VIEWING IS NOT A RUN PRESS (the compose law): this tool lands
* in the BASE toolset — any session may look at what a run
* produced; only the run DOORS wait for the delegation.
*
* CONTAINMENT (estate/media's law, same spelling): the run id must
* match the queue's RUN_ID grammar, and the file path is BUILT from
* the walk's own answer (`stateRoot/output/<runId>/<name>` from
* `listMedia`) — never from caller text. The caller's `artifact` is
* a substring FILTER over names the walk already produced.
*/
/** §23 CROSS-ROOTS (2026-09-23): the view walk searches the
*  manifest in order — own root first, then the extras (the queue
*  seat's stateRoots config). First root holding the run serves (own
*  writes win); a miss names every searched root. */
const firstRootWithRun = async (seat, kind, runId) => {
	for (const root of rootsManifest(seat.stateRoot, seat.stateRoots ?? [])) {
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
/** F14 (2026-11-12) — SPELLING-NORMALIZED ARTIFACT MATCH. The caller
*  names an artifact by whatever spelling a surface printed, and the
*  estate prints THREE for one film: the run row's own
*  `<run>/<rel>`, the content-addressed staged leaf
*  (`<stem>__<sha1-12>.mp4` — the staging walk's copy in the engine
*  input dir), and the engine's own collision-suffixed output name.
*  Raw substring matching missed every non-row spelling (the §6
*  reshoot burn: the staged spelling found the row not at all), so
*  the door answers a token by its STEM: strip the collision/content
*  hash (`__<hex8-16>` / `_<hex8-16>` before the extension) and the
*  engine's trailing stem underscore from both sides, then match
*  basename-stem contains. The raw substring arm stays FIRST (every
*  spelling that already hits keeps hitting); an empty token still
*  picks the newest row. */
const COLLISION_HASH = /_{1,2}[0-9a-f]{8,16}$/;
const artifactStem = (spelling) => {
	const leaf = basename(spelling.trim());
	const dot = leaf.lastIndexOf(".");
	const ext = dot > 0 ? leaf.slice(dot) : "";
	let stem = dot > 0 ? leaf.slice(0, dot) : leaf;
	stem = stem.replace(COLLISION_HASH, "").replace(/_+$/, "");
	return stem === "" ? leaf : stem + ext;
};
const artifactRowMatches = (rowName, token) => {
	if (token === "") return true;
	if (rowName.includes(token)) return true;
	const want = artifactStem(token);
	return want !== "" && artifactStem(rowName).includes(want);
};
/**
* Extension → declared media type for the image walk. THE EXT SET IS
* DERIVED from mediaVocab's galleryImage mint set (the SSOT — the
* li-ay stroke's law: one vocabulary, or the seats disagree by
* construction); the MIME VALUES are bounded by dsh-attachment's
* ImageMediaType union, the host seat saveImage accepts. An
* extension the vocab classifies but the estate never mints
* (svg/bmp/avif) or the SDK cannot attach never enters this table.
*/
const IMAGE_MEDIA_TYPES = {
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	webp: "image/webp",
	gif: "image/gif"
};
const IMAGE_EXTENSIONS = Object.fromEntries(mediaVocab().galleryImage.flatMap((ext) => {
	const mediaType = IMAGE_MEDIA_TYPES[ext];
	return mediaType === void 0 ? [] : [["." + ext, mediaType]];
}));
/**
* The audio and model intent vocabularies, DERIVED from the SSOT
* (mediaVocab's full classifier sets — the 2026-11-12 fold: the
* hand-copied audio set had already drifted, missing qvoice the
* TTS-chain audit added to the vocab; a named `voice.qvoice` fell
* through the audio arm to the image walk). One spelling, both
* arms.
*/
const AUDIO_EXTENSIONS = new Set(mediaVocab().audio.map((ext) => "." + ext));
const MODEL_EXTENSIONS = new Set(mediaVocab().model.map((ext) => "." + ext));
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
/** Default render: one utility graph through executeSingle (the
*  estate's non-plugin execute face), PreviewImage so the sheet
*  rides the engine's temp plane (the output tree stays untouched),
*  fetched back through /view into the scratch dir. */
const defaultMediaSheetRender = async (node, inputs, signal) => {
	const work = await mkdtemp(join(tmpdir(), "melite-view-"));
	try {
		await executeSingle(work, { workflow: {
			"1": {
				class_type: node,
				inputs
			},
			"2": {
				class_type: "PreviewImage",
				inputs: { images: ["1", 0] }
			}
		} }, {}, {
			timeoutS: 300,
			shouldStop: () => signal.aborted
		});
		const names = (await readdir(work)).filter((n) => n.endsWith(".png"));
		if (names.length === 0) throw new Error("the engine returned no sheet image for " + node);
		return new Uint8Array(await readFile(join(work, names[0])));
	} finally {
		await rm(work, {
			recursive: true,
			force: true
		});
	}
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
/** THE SHEET COMMIT: the engine-produced contact sheet (the
*  host-binary cure — the vendored MeliteFrameSheet node decodes the
*  film inside the engine and composes the tiled sheet as a graph
*  output) plus the durable store commit. Shared by the capable arm
*  and the delegated eye (the blind route that found a seeing route
*  builds the SAME sheet — no second truth). */
async function commitFilmSheet(attachments, render, rowName, absPath, stamps, signal) {
	let data;
	try {
		data = await render("MeliteFrameSheet", {
			video: absPath,
			stamps,
			width: 320
		}, signal);
	} catch (error) {
		throw new Error("cannot view the film \"" + rowName + "\": the contact sheet could not be built (" + (error instanceof Error ? error.message : String(error)) + ")", { cause: error });
	}
	const byteCap = Math.min(attachments.imageLimits.maxImageBytes, attachments.imageLimits.maxMessageImageBytes);
	if (data.byteLength > byteCap) throw new Error("cannot view the film \"" + rowName + "\": its contact sheet exceeds the " + String(byteCap) + "-byte image cap");
	try {
		return await attachments.saveImage({
			data,
			mediaType: "image/png",
			name: basename(rowName, extname(rowName)) + "-sheet.png"
		});
	} catch (error) {
		throw new Error("cannot commit the film contact sheet for \"" + rowName + "\": " + (error instanceof Error ? error.message : String(error)), { cause: error });
	}
}
/** THE FILM'S DELEGATED EYE (Commission 17's cure): the calling
*  route is blind but the lane seats an eye, so the contact sheet
*  IS built — for the route that can see it — and the seeing
*  route's verdict rides the measurements as labeled text. Null when
*  the lane seats no eye: the sheet is never built for nobody (the
*  old economy) and the caller serves the probe facts alone. */
async function delegatedFilmVisual(seat, runId, row, absPath, probe, exec, ctx, attachments, render) {
	const llm = ctx.get("llm");
	if (llm === void 0 || typeof llm.stream !== "function") return null;
	const route = await seeingRoute(ctx, exec);
	if (route === null) return null;
	const stamps = sheetPlan(probe.duration_s);
	const seen = await verifyVisual(llm, route, await commitFilmSheet(attachments, render, row.name, absPath, stamps.length, exec.signal), "film", exec.signal);
	const streams = probe.streams.map((s) => s.codec + (s.width !== void 0 && s.height !== void 0 ? " " + String(s.width) + "x" + String(s.height) : "") + (s.fps !== void 0 ? " @" + s.fps : "") + (s.frames !== void 0 ? " " + String(s.frames) + "f" : "")).join(" + ");
	return {
		runId,
		url: row.url,
		host: absPath,
		textObservation: "melite_view film: " + row.name + (probe.duration_s !== void 0 ? ", " + String(probe.duration_s) + "s" : "") + ", " + String(probe.size_bytes) + " bytes, streams: " + streams + ", contact sheet of " + String(stamps.length) + "; VISUAL VERIFICATION via " + seen.via + " (a seeing route looked at the sheet): " + seen.verdict
	};
}
/** View a film artifact: the container summary + a contact sheet committed
*  as the viewed image (the §24 gate — one view artifact, stream
*  summary + frames the model can SEE). Containment rides the walk's
*  own row (absPath built from runId + name, never caller text); the
*  sheet lands in os.tmpdir (never the run tree — a view must not
*  mint provenance). */
async function viewFilmArtifact(seat, runId, artifact, exec, ctx, attachments, render = defaultMediaSheetRender, read = defaultBytesReader) {
	const found = await firstRootWithRun(seat, "video", runId);
	if (found === null) throw new Error("run \"" + runId + "\" produced no image artifacts (and no viewable film — the run holds no video artifacts either) " + searchedVoice(rootsManifest(seat.stateRoot, seat.stateRoots ?? [])));
	const own = found.own;
	const picked = artifact.length > 0 ? own.filter((i) => artifactRowMatches(i.name, artifact)) : own;
	if (picked.length === 0) throw new Error("run \"" + runId + "\" has no film artifact containing \"" + artifact + "\" — the run holds: " + own.slice(0, 8).map((i) => i.name).join(", ") + " " + searchedVoice(rootsManifest(seat.stateRoot, seat.stateRoots ?? [])));
	const candidates = artifact.length > 0 ? picked.slice(0, 1) : picked;
	let row = picked[0];
	let absPath = join(found.root, "output", row.runId, row.name);
	let probe;
	let newestRefusal;
	for (const candidate of candidates) {
		const candidatePath = join(found.root, "output", candidate.runId, candidate.name);
		try {
			probe = await probeFile(candidatePath, candidate.name, "film", read);
		} catch (error) {
			if (newestRefusal === void 0) newestRefusal = error instanceof Error ? error : new Error(String(error));
			probe = void 0;
			continue;
		}
		row = candidate;
		absPath = candidatePath;
		break;
	}
	if (probe === void 0) throw newestRefusal;
	const capability = await routeImageCapability(ctx, exec, runId);
	if (!capability.capable) {
		const seen = await delegatedFilmVisual(seat, runId, row, absPath, probe, exec, ctx, attachments, render);
		if (seen !== null) return seen;
		return {
			runId,
			url: row.url,
			host: absPath,
			textObservation: filmTextObservation(row.name, probe, capability.model)
		};
	}
	const stamps = sheetPlan(probe.duration_s);
	const ref = await commitFilmSheet(attachments, render, row.name, absPath, stamps.length, exec.signal);
	return {
		runId: row.runId,
		url: row.url,
		host: absPath,
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
async function viewAudioArtifact(seat, runId, artifact, exec, ctx, attachments, render = defaultMediaSheetRender, read = defaultBytesReader) {
	const found = await firstRootWithRun(seat, "audio", runId);
	if (found === null) throw new Error("run \"" + runId + "\" produced no image artifacts (and no viewable film or audio — the run holds no image/video/audio artifacts either) " + searchedVoice(rootsManifest(seat.stateRoot, seat.stateRoots ?? [])));
	const own = found.own;
	const picked = artifact.length > 0 ? own.filter((i) => artifactRowMatches(i.name, artifact)) : own;
	if (picked.length === 0) throw new Error("run \"" + runId + "\" has no audio artifact containing \"" + artifact + "\" — the run holds: " + own.slice(0, 8).map((i) => i.name).join(", ") + " " + searchedVoice(rootsManifest(seat.stateRoot, seat.stateRoots ?? [])));
	const row = picked[0];
	const absPath = join(found.root, "output", row.runId, row.name);
	const probe = await probeFile(absPath, row.name, "audio", read);
	const audioCapability = await routeImageCapability(ctx, exec, runId);
	if (!audioCapability.capable) {
		const rows = probe.streams.map((s) => s.codec + (s.sample_rate !== void 0 ? " " + String(s.sample_rate) + "Hz" : "") + (s.channels !== void 0 ? " " + String(s.channels) + "ch" : "")).join(" + ");
		return {
			runId: row.runId,
			url: row.url,
			host: absPath,
			textObservation: "melite_view audio: " + row.name + (probe.duration_s !== void 0 ? ", " + String(probe.duration_s) + "s" : "") + ", " + String(probe.size_bytes) + " bytes, streams: " + rows + "; TEXT-ONLY observation — model \"" + audioCapability.model + "\" declares no image input, so no waveform sheet was rendered. The measurements above are complete."
		};
	}
	let data;
	try {
		data = await render("MeliteWaveform", {
			audio: absPath,
			width: 640,
			height: 240
		}, exec.signal);
	} catch (error) {
		throw new Error("cannot view the audio \"" + row.name + "\": the waveform sheet could not be built (" + (error instanceof Error ? error.message : String(error)) + ")", { cause: error });
	}
	const byteCap = Math.min(attachments.imageLimits.maxImageBytes, attachments.imageLimits.maxMessageImageBytes);
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
		host: absPath,
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
}
/** THE TEXT-ONLY OBSERVE ARM (a live commission's finding,
*  2026-09-26): the observation this door produces is mostly TEXT —
*  a container probe (duration, streams, geometry, fps, frames,
*  bytes) and, for a mesh, its structural summary. On a route that
*  declares no image input, refusing the WHOLE view threw those facts
*  away and left the maker with local ffprobe as its only observe
*  arm — the exact gap this door exists to close. So the capability is
*  REPORTED, and the caller serves the facts in text and names the one
*  thing it cannot do (the image block). The mesh arm keeps the
*  strict refusal for the caller that genuinely needs pixels (the
*  blind block throws byte-identical to read_image's own law). */
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
/** THE DELEGATED EYE (the charter's vision-capable route for the
*  maker lane, dev_docs/ROADMAP.md): the calling route is blind, so
*  the viewing runs through a route that CAN see — the lane's
*  declared `MELITE_VIEW_ROUTE` verified image-capable, else the
*  first image-capable route in enumeration (the craft critic's
*  route law, vision-route.ts). A named-but-blind route throws LOUD
*  (explicit means explicit — never a silent substitution, never a
*  silent measurement pass); no eye on the lane resolves null and
*  the caller serves its labeled measurements instead. A narrow seat
*  (a fake exposing resolveModelInfo only) is also null — the old
*  walls never grew an enumeration seam. */
async function seeingRoute(ctx, exec) {
	const llm = ctx.get("llm");
	if (llm === void 0 || typeof llm.listProviders !== "function" || typeof llm.listModels !== "function" || typeof llm.resolveModelInfo !== "function" || typeof llm.stream !== "function") return null;
	return resolveVisionRoute(llm, viewRoutePreference(), exec.signal);
}
/** The file-bytes twin of the eye: resolve, commit, verify. Null
*  when the lane seats no eye (the caller serves measurements). */
async function delegatedVisual(ctx, exec, image, kind, attachments) {
	const llm = ctx.get("llm");
	if (llm === void 0 || typeof llm.stream !== "function") return null;
	const route = await seeingRoute(ctx, exec);
	if (route === null) return null;
	return verifyVisual(llm, route, await attachments.saveImage({
		data: image.data,
		mediaType: image.mediaType,
		...image.name === void 0 ? {} : { name: image.name }
	}), kind, exec.signal);
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
	const hostVoice = value.host !== void 0 ? " (host: " + value.host + ")" : "";
	if (value.textObservation !== void 0) return [{
		type: "text",
		text: value.textObservation + hostVoice
	}];
	if (value.film !== void 0) {
		const f = value.film;
		const streams = f.streams.map((s) => s.codec + (s.width !== void 0 && s.height !== void 0 ? " " + String(s.width) + "x" + String(s.height) : "") + (s.fps !== void 0 ? " @" + s.fps : "") + (s.frames !== void 0 ? " " + String(s.frames) + "f" : "")).join(" + ");
		const image = value.image;
		return [{
			type: "text",
			text: "melite_view film: " + value.url + " (" + f.file + (f.duration_s !== void 0 ? ", " + String(f.duration_s) + "s" : "") + (f.size_bytes !== void 0 ? ", " + String(f.size_bytes) + " bytes" : "") + ", streams: " + streams + "; contact sheet of " + String(f.sheet_of) + ": " + image.mediaType + " " + String(image.width) + "x" + String(image.height) + hostVoice + ")"
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
			text: "melite_view audio: " + value.url + " (" + a.file + (a.duration_s !== void 0 ? ", " + String(a.duration_s) + "s" : "") + ", " + String(a.size_bytes) + " bytes, streams: " + streams + "; waveform sheet: " + audio.mediaType + " " + String(audio.width) + "x" + String(audio.height) + hostVoice + ")"
		}, {
			type: "image",
			attachment: imageRefFromValue(audio)
		}];
	}
	if (value.mesh !== void 0) {
		const m = value.mesh;
		return [{
			type: "text",
			text: "melite_view mesh: " + value.url + " (" + meshVoice(m) + "; poster: " + m.poster + hostVoice + ")"
		}, {
			type: "image",
			attachment: imageRefFromValue(value.image)
		}];
	}
	const still = value.image;
	return [{
		type: "text",
		text: "melite_view: " + value.url + " (" + still.mediaType + ", " + String(still.width) + "x" + String(still.height) + ", " + String(still.bytes) + " bytes)" + hostVoice
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
/** THE MESH POSTER'S DELEGATED EYE: the blind calling route cannot
*  take the poster block, but the lane's seeing route can still look
*  at it — the verdict rides the structural row as labeled text.
*  Null when the lane seats no eye (the caller keeps the strict
*  gate's refusal — there is no raster any route could see). */
async function delegatedMeshPoster(root, runId, poster, exec, ctx, attachments, read, summary, posterName, row) {
	const llm = ctx.get("llm");
	if (llm === void 0 || typeof llm.stream !== "function") return null;
	const route = await seeingRoute(ctx, exec);
	if (route === null) return null;
	const posterPath = join(root, "output", poster.runId, poster.name);
	const byteCap = Math.min(attachments.imageLimits.maxImageBytes, attachments.imageLimits.maxMessageImageBytes);
	const bytes = await read(posterPath);
	if (bytes.byteLength > byteCap) throw new Error("cannot view \"" + poster.name + "\": the file exceeds the " + String(byteCap) + "-byte image cap; downscale and retry");
	const mediaType = sniffImageMediaType(bytes);
	if (mediaType === void 0) throw new Error("cannot view the mesh poster \"" + poster.name + "\": the bytes are not an image (the mesh lane wrote non-image content under the poster name this door mints)");
	const seen = await verifyVisual(llm, route, await attachments.saveImage({
		data: bytes,
		mediaType,
		name: basename(poster.name)
	}), "poster", exec.signal);
	return {
		runId,
		url: row.url,
		host: join(root, "output", row.runId, row.name),
		textObservation: "melite_view mesh: " + row.url + " (" + meshVoice(summary) + "; poster: " + posterName + "; VISUAL VERIFICATION via " + seen.via + " (a seeing route looked at the poster): " + seen.verdict + ")",
		mesh: {
			...summary,
			poster: posterName
		}
	};
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
	if (found === null) throw new Error("run \"" + runId + "\" produced no image artifacts (and no viewable film or audio — the run holds no image/video/audio artifacts either) (and no mesh: the run holds no .glb/.gltf artifact either) " + searchedVoice(rootsManifest(seat.stateRoot, seat.stateRoots ?? [])));
	const own = found.own;
	const picked = artifact.length > 0 ? own.filter((i) => artifactRowMatches(i.name, artifact)) : own;
	if (picked.length === 0) throw new Error("run \"" + runId + "\" has no mesh artifact containing \"" + artifact + "\" — the run holds: " + own.slice(0, 8).map((i) => i.name).join(", ") + " " + searchedVoice(rootsManifest(seat.stateRoot, seat.stateRoots ?? [])));
	const row = picked[0];
	const summary = summarizeMesh(await read(join(found.root, "output", row.runId, row.name)), row.name);
	const slash = row.name.lastIndexOf("/");
	const posterName = (slash < 0 ? "" : row.name.slice(0, slash + 1)) + row.name.slice(slash + 1).replace(/\.(glb|gltf)$/i, "") + "_poster.png";
	const poster = (await listMedia(found.root, "image")).items.find((i) => i.runId === runId && i.name === posterName);
	if (poster === void 0) throw new Error("run \"" + runId + "\" holds the mesh \"" + row.name + "\" (" + meshVoice(summary) + ") but no raster poster beside it (" + posterName + " is absent), so there is no image to show you. The 3D lane emits no poster today: read the numbers above, or open the mesh in the app's media drilldown, which renders it in 3D. " + searchedVoice(rootsManifest(seat.stateRoot, seat.stateRoots ?? [])));
	const meshCapability = await routeImageCapability(ctx, exec, runId);
	if (!meshCapability.capable) {
		const seen = await delegatedMeshPoster(found.root, runId, poster, exec, ctx, attachments, read, summary, posterName, row);
		if (seen !== null) return seen;
		throw new Error("cannot view run \"" + runId + "\": model \"" + meshCapability.model + "\" does not declare image input; switch to an image-capable model to view artifacts");
	}
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
		host: join(found.root, "output", row.runId, row.name),
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
/** THE STILL ARM (exported like its film/audio/mesh siblings — the
*  suites call it directly): one image artifact observed through the
*  walk's own row. A capable calling route gets the committed image;
*  a blind route gets the file's facts as labeled text, or the
*  lane's seeing route's verdict when the delegated eye resolves
*  (the vision-capable route for the maker lane). */
async function viewStillArtifact(root, row, runId, exec, ctx, attachments) {
	const absPath = join(root, "output", row.runId, row.name);
	const declared = imageMediaTypeForPath(row.name);
	if (declared !== void 0 && !attachments.imageLimits.mediaTypes.includes(declared)) throw new Error("cannot view \"" + row.name + "\": " + declared + " images are not accepted by this deployment");
	const stillCapability = await routeImageCapability(ctx, exec, runId);
	if (!stillCapability.capable) {
		const data = await readFile(absPath, { signal: exec.signal });
		const sniffed = sniffImageMediaType(data);
		const facts = "melite_view: " + row.name + " (" + String(data.byteLength) + " bytes, " + (sniffed ?? declared ?? "format not sniffed") + (declared !== void 0 && sniffed !== void 0 && declared !== sniffed ? "; the extension declares " + declared + " and the BYTES say " + sniffed + " — the bytes win" : "");
		const mediaType = sniffed ?? declared;
		const seen = mediaType === void 0 ? null : await delegatedVisual(ctx, exec, {
			data,
			mediaType,
			name: basename(row.name)
		}, "still", attachments);
		if (seen === null) return {
			runId,
			url: row.url,
			host: absPath,
			textObservation: facts + "; TEXT-ONLY observation — model \"" + stillCapability.model + "\" declares no image input, so the file was not attached. The facts above are complete; the picture is what this route cannot have."
		};
		return {
			runId,
			url: row.url,
			host: absPath,
			textObservation: facts + "; VISUAL VERIFICATION via " + seen.via + " (a seeing route looked at the pixels): " + seen.verdict
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
		host: absPath,
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
/** Build the melite_view tool against the live cordis context (the
* seats: `attachments` — the durable store, `queue` — the runs tree
* root owner, `llm` — the route gate; all optional probes, the
* tool-fs inject law). */
function meliteView(ctx, render = defaultMediaSheetRender) {
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
	return defineTool({
		name: "melite_view",
		description: "View one image artifact from a finished (or running) estate run — the model receives the image itself, never a description of it. When the run holds no images but holds a film, the observe arm serves the film instead: an ffprobe stream summary (duration, codecs, frame count) plus a contact-sheet image of frames across its span. This is the observe arm of the act/observe/decide loop: after a run lands, VIEW it before deciding the next step (never claim a match without viewing). Args: run_id (required, the run directory under the runs tree), artifact (optional substring — when a run produced several images, name the one to view; default is the newest). On a model that accepts image input the image rides the result; on a text-only model the observation is measurements as text, or a seeing route’s verdict when the lane seats one — the observation says which.",
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
			if (seat === void 0) throw new Error("cannot view run \"" + runId + "\": the queue seat owns the runs tree root — mount @melite-plugin/dsh-estate");
			if (artifact !== "" && AUDIO_EXTENSIONS.has(extname(artifact).toLowerCase())) return await viewAudioArtifact(seat, runId, artifact, exec, ctx, attachments, render);
			if (artifact !== "" && MODEL_EXTENSIONS.has(extname(artifact).toLowerCase())) return await viewModelArtifact(seat, runId, artifact, exec, ctx, attachments);
			const found = await firstRootWithRun(seat, "image", runId);
			if (found === null) try {
				return await viewFilmArtifact(seat, runId, artifact, exec, ctx, attachments, render);
			} catch (filmMiss) {
				if (!(filmMiss instanceof Error && /produced no image artifacts/.test(filmMiss.message))) throw filmMiss;
				try {
					return await viewAudioArtifact(seat, runId, artifact, exec, ctx, attachments, render);
				} catch (audioMiss) {
					if (!(audioMiss instanceof Error && /produced no image artifacts/.test(audioMiss.message))) throw audioMiss;
					/* v8 ignore next -- the mesh-only run's return is unreachable (the required poster); the arm's refusal is the behavior */
					return viewModelArtifact(seat, runId, artifact, exec, ctx, attachments);
				}
			}
			const own = found.own;
			const picked = artifact.length > 0 ? own.filter((i) => artifactRowMatches(i.name, artifact)) : own;
			if (picked.length === 0) throw new Error("run \"" + runId + "\" has no image artifact containing \"" + artifact + "\" — the run holds: " + own.slice(0, 8).map((i) => i.name).join(", "));
			const row = picked[0];
			const meshOfPoster = await meshBesidePoster(seat, runId, row.name);
			if (meshOfPoster !== null) return await viewModelArtifact(seat, runId, meshOfPoster, exec, ctx, attachments);
			return await viewStillArtifact(found.root, row, runId, exec, ctx, attachments);
		}
	});
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
*  media list arm's shape: depth-bounded, byte-order sorted, capped —
*  the sort pins the row order platform-independently, so every voice
*  built from the rows (miss, ambiguous-refusal) names them in ONE
*  order on every lane). */
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
	return rows.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : /* v8 ignore next */ 0);
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
	return defineTool({
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
}
//#endregion
//#region src/tools/skill-read.ts
/**
* melite_skill_read - progressive disclosure TIER 2: one skill's full body,
* loaded ONLY when needed (GET /v1/skills/<id>). Every read is ledgered
* gateway-side (skill.read in _ledger.jsonl), so which recipes the
* agent actually used is auditable after the fact.
*
* Ids come from melite_load (its skill section prints every boarded skill id): global lane docs are bare stems
* ("swap", "directing"), model card docs are "model:<id>", and
* per-model skills are "model:<id>:<stem>". An id no door serves
* answers "no such skill" — never invent one.
*/
const READ_TIMEOUT_MS = 15e3;
function skillRead(estate) {
	const presentCall = (args) => {
		const a = typeof args === "object" && args !== null ? args : {};
		return {
			card: "generic",
			title: `Read skill ${String(a.id ?? "?")}`,
			kind: "read",
			rawInput: String(a.id ?? "?")
		};
	};
	return defineTool({
		name: "melite_skill_read",
		description: "Load ONE skill document in full (progressive disclosure tier 2): markdown body plus its name/description and genre/model when scoped. Discover ids first with melite_load. Reads are recorded in the gateway ledger (skill.read) - the audit trail of which recipes informed a generation. Args: id (from melite_load).",
		parameters: { id: {
			type: "string",
			description: "Skill id from melite_load's skill section: \"<stem>\", \"model:<id>\" or \"model:<id>:<stem>\".",
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
			if (id.length === 0) throw new Error("melite_skill_read: \"id\" is required (a skill id string from melite_load's skill section)");
			const res = await estate.skillRead(id, exec.signal, READ_TIMEOUT_MS);
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
}
//#endregion
//#region src/tools/skill-write.ts
/**
* melite_skill_write - the agent AUTHORS a skill (POST /v1/skills).
* The lora hand-off's second half (operator 2026-11-09): once a model
* family can pick up a lora, the same conversation can tell the agent
* the trigger words and examples, and the agent lands a skill doc that
* every later load serves — so the knowledge travels with the estate
* instead of dying in the chat.
*
* The doc lands in the estate's authored plane and is served by the
* SAME walk as the tracked skill docs, so its id is exactly
* "model:<model>:<name>" (what melite_load prints and melite_skill_read
* takes). Writes are ledgered gateway-side (skill.write).
*/
const WRITE_TIMEOUT_MS = 15e3;
function skillWrite(estate) {
	const presentCall = (args) => {
		const a = typeof args === "object" && args !== null ? args : {};
		return {
			card: "generic",
			title: `Write skill ${String(a.model ?? "?")}/${String(a.name ?? "?")}`,
			kind: "edit",
			rawInput: `${String(a.model ?? "?")}/${String(a.name ?? "?")}`
		};
	};
	return defineTool({
		name: "melite_skill_write",
		description: "Author ONE skill document for a model family (the lora hand-off's second half): name it so it is known by that name, and record the operator's trigger words and examples so every later load serves them. The doc lands in the estate's authored plane and is served by the same walk as tracked skills — its id is \"model:<model>:<name>\", readable with melite_skill_read and listed by melite_load. Never invent trigger words: when the operator has not stated them, omit trigger_words and the doc records the blank. Args: model, name, description, plus trigger_words / examples / body / lora / replace.",
		parameters: {
			model: {
				type: "string",
				description: "The model family the skill serves (e.g. \"krea-2\") — the family must exist.",
				required: true
			},
			name: {
				type: "string",
				description: "The skill's name: path-safe (letters, digits, . _ -) and it IS the id leaf.",
				required: true
			},
			description: {
				type: "string",
				description: "One-line summary printed by every load (what the skill is for).",
				required: true
			},
			trigger_words: {
				type: "array",
				items: { type: "string" },
				description: "The operator's trigger words, verbatim and in order. Omit when not stated."
			},
			examples: {
				type: "array",
				items: { type: "string" },
				description: "The operator's example prompts, verbatim. Omit when not stated."
			},
			body: {
				type: "string",
				description: "Extra markdown after the rendered sections (use notes, strengths, gotchas)."
			},
			lora: {
				type: "string",
				description: "The loras mod row this skill documents (the tray file name), when it is for a lora."
			},
			replace: {
				type: "boolean",
				description: "Rewrite an existing doc. The door refuses otherwise, so the previous trigger words are never lost silently."
			}
		},
		presentCall,
		output: {
			schema: {
				type: "object",
				additionalProperties: true,
				properties: {
					id: {
						type: "string",
						description: "The served id (\"model:<model>:<name>\").",
						required: true
					},
					path: {
						type: "string",
						description: "The doc's path on disk.",
						required: true
					},
					replaced: {
						type: "boolean",
						description: "Whether an existing doc was rewritten.",
						required: true
					},
					name: { type: "string" },
					description: { type: "string" },
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
					text: "melite_skill_write REFUSED: " + v.error
				}];
				return [{
					type: "text",
					text: "melite_skill_write " + String(v.id ?? `model:${String(a.model ?? "?")}:${String(a.name ?? "?")}`) + (v.replaced === true ? " (rewritten)" : " (written)") + "\nserved at once by melite_load and melite_skill_read\n" + String(v.path ?? "")
				}];
			}
		},
		async execute(args, exec) {
			const a = args;
			const doc = {
				model: a.model,
				name: a.name,
				description: a.description,
				trigger_words: Array.isArray(a.trigger_words) ? a.trigger_words : [],
				examples: Array.isArray(a.examples) ? a.examples : [],
				body: typeof a.body === "string" ? a.body : "",
				lora: typeof a.lora === "string" ? a.lora : "",
				replace: a.replace === true
			};
			const res = await estate.skillWrite(doc, exec.signal, WRITE_TIMEOUT_MS);
			return jsonClean({
				id: res.id,
				path: res.path,
				replaced: res.replaced === true,
				name: res.name ?? null,
				description: res.description ?? null
			});
		}
	});
}
//#endregion
//#region src/tools/ledger-tail.ts
/**
* ledger_tail - work off the file ledger: the append-only activity
* journal (output/_ledger.jsonl) the gateway maintains for EVERY
* material event - run.queued, run.<status>, run.resurrected,
* run.swept, server.lock_stolen, skill.read. This tool tails it
* (GET /v1/ledger), oldest -> newest within the tail, so the agent
* can answer "what happened here", resume interrupted work, and
* audit its own skill usage without asking the user or trusting
* memory.
*
* THE VOCABULARY LAW (U4, 2026-10-31): every event class named here
* is emitted by its owner seat (the estate-queue appendLedger sites
* the ledger-tail wall censuses) — a filter naming an event nothing
* emits is dead surface, retired, never documented. The boot,
* registered, state, and provision classes named no emitter and are
* gone; the bare provision prefix never matched a row and is gone
* with them.
*/
const LEDGER_TIMEOUT_MS = 15e3;
function ledgerTail(estate) {
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
	return defineTool({
		name: "ledger_tail",
		description: "Tail the gateway file ledger (append-only journal of runs, lock-steals, and skill reads). Use to answer \"what happened / what ran\", to resume interrupted work after a restart, or to audit activity. Entries come back oldest -> newest within the tail; to resume interrupted work, take the run id from a run.* row and poll it with run_status (the exact error string and artifacts come back), or re-open the card with melite_load and stage it again. Args: limit (optional, default 50, max 500), event (optional prefix filter, e.g. \"run.\" or \"skill.\").",
		parameters: {
			limit: {
				type: "number",
				description: "How many entries to return (default 50, max 500)."
			},
			event: {
				type: "string",
				description: "Optional event-name prefix filter, e.g. \"run.\", \"server.\", \"skill.\"."
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
			const limit = typeof a.limit === "number" && Number.isFinite(a.limit) && a.limit > 0 ? String(Math.floor(a.limit)) : "50";
			const event = typeof a.event === "string" && a.event.length > 0 ? a.event : "";
			const res = await estate.ledgerTail(limit, event, exec.signal, LEDGER_TIMEOUT_MS);
			const entries = Array.isArray(res.entries) ? res.entries : [];
			return jsonClean({
				shown: typeof res.shown === "number" ? res.shown : entries.length,
				matched: typeof res.matched === "number" ? res.matched : entries.length,
				entries,
				...Array.isArray(res.searched) ? { searched: res.searched } : {}
			});
		}
	});
}
//#endregion
//#region src/index.ts
/** Cordis plugin name used by loader diagnostics. */
const name = "melite-tools";
/**
* Services this fiber NEEDS: tools + the harness LLM seam (enhance
* rides ctx.llm). No webServer dependency — SDK mounts boot
* without one.
*/
const inject = ["tools"];
/** The validator twin of {@link Config} (the loader applies defaults;
*  direct apply calls resolve undefined as the documented default). */
const Config = Schema.object({
	adhocTools: Schema.union([Schema.string(), Schema.array(Schema.string())]),
	cardTools: Schema.boolean().default(false)
});
/** EAGER — the compose loop, the only melite schemas in a session's
* first request (progressive disclosure, operator 2026-10-08: three
* doors in context, the estate's deeper doors expand on first
* catalog touch — the deferred-seat closure in THIS file
* owns the law). */
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
	"melite_skill_read",
	"melite_skill_write",
	"ledger_tail"
];
/** BASE tool names (discovery, compose, view, management, audit).
*  melite_view is the observe arm (viewing an artifact is not a run
*  press — the compose law holds). */
const BASE_TOOL_NAMES = [...EAGER_TOOL_NAMES, ...DEFERRED_TOOL_NAMES];
/** THE RUN DOORS — the /melite-runs delegation's execution verbs,
*  seated by the user's toggle and by the persisted record at boot
*  (runsDelegation.ts). Not an interface: the same lane gains and
*  loses them with the delegation. */
const RUN_DOOR_NAMES = ["melite_flow", "run_status"];
/** AD HOC names (config adhocTools) — never in a base toolset.
*  (empty since the disclosure stroke: enhance_prompt died as a tool —
*  the editor ✦ door below keeps the user surface via harnessEnhance.) */
const ADHOC_TOOL_NAMES = [];
/** Every tool name this plugin can own (registration log + smoke filter). */
const MELITE_TOOL_NAMES = [
	...BASE_TOOL_NAMES,
	...RUN_DOOR_NAMES,
	...ADHOC_TOOL_NAMES
];
/** Register the Melite tools against the live estate gateway.
*  THE TYPED CONTEXT (F-2/F-4 cure, 2026-11-05): the hand-declared
*  CtxView parallel is retired — logger/effect are cordis Context
*  members, `tools` is the dsh-tools Context augmentation, and the
*  commands seam rides the dynamic child inject below with its
*  structural callback parameter. */
async function apply(ctx, config = {}) {
	const c = ctx;
	const estate = makeEstate(ctx);
	const call = asEstateCall(makeEstateRequest(ctx));
	const bootDelegated = resolveDelegationAtBoot(readRunsDelegation(c.logger));
	const adhoc = Array.isArray(config.adhocTools) ? config.adhocTools.map((s) => s.trim()).filter(Boolean) : typeof config.adhocTools === "string" ? config.adhocTools.split(",").map((s) => s.trim()).filter(Boolean) : [];
	const cardTools = config.cardTools === true;
	c.logger.info("melite-tools: %d base tool(s) + %d run door(s) + %d ad hoc — runs %s, gateway %s", BASE_TOOL_NAMES.length, bootDelegated ? RUN_DOOR_NAMES.length : 0, adhoc.length, bootDelegated ? "DELEGATED (the AI's toggle is ON)" : "browser (the user’s Run press)", "typed estate lanes (F-1)");
	const deferredDisposers = [];
	const seated = /* @__PURE__ */ new Set();
	const expandEstateDoors = () => {
		const doors = [
			["melite_view", () => c.tools.register(meliteView(ctx))],
			["melite_read", () => c.tools.register(meliteRead(ctx))],
			["comfy_manage", () => c.tools.register(comfyManage(estate))],
			["melite_skill_read", () => c.tools.register(skillRead(estate))],
			["melite_skill_write", () => c.tools.register(skillWrite(estate))],
			["ledger_tail", () => c.tools.register(ledgerTail(estate))]
		];
		for (const [name, register] of doors) {
			if (seated.has(name)) continue;
			const dispose = register();
			seated.add(name);
			deferredDisposers.push(dispose);
		}
		c.logger.info("melite-tools: estate doors SEATED on catalog touch (%d total) — the expansion law", EAGER_TOOL_NAMES.length + seated.size);
	};
	c.effect(() => () => {
		for (const dispose of [...runDoorSeats, ...composeSeats]) dispose();
		runDoorSeats = [];
		composeSeats = [];
		for (const d of deferredDisposers.splice(0)) d();
		seated.clear();
	});
	c.tools.register(meliteDiscover(estate, expandEstateDoors));
	let composeSeats = [];
	const seatComposeLoop = (delegated) => {
		for (const dispose of composeSeats.splice(0)) dispose();
		composeSeats.push(c.tools.register(meliteConstruct(estate, { delegated })), c.tools.register(meliteLoad(estate, {
			delegated,
			expandEstateDoors
		})));
	};
	seatComposeLoop(bootDelegated);
	if (bootDelegated) expandEstateDoors();
	let runDoorSeats = [];
	const seatRunDoors = () => {
		if (runDoorSeats.length > 0) return;
		runDoorSeats.push(c.tools.register(meliteFlow(estate)), c.tools.register(runStatus(estate)));
	};
	const unseatRunDoors = () => {
		for (const dispose of runDoorSeats.splice(0)) dispose();
	};
	if (bootDelegated) seatRunDoors();
	c.inject(["commands"], (child) => {
		const commands = child.commands;
		if (commands === void 0) throw new Error("melite-runs: the commands inject resolved but exposes no registry — refusing to register silently");
		commands.register({
			name: "melite-runs",
			description: "Toggle whether the AI can start runs (melite_flow) or runs wait for the user’s Run press",
			input: { hint: "[on|off]" },
			handler: ({ rawInput }) => {
				const verb = rawInput.trim().toLowerCase();
				if (verb !== "" && verb !== "on" && verb !== "off" && verb !== "toggle") return {
					kind: "error",
					text: `unknown argument "${rawInput.trim()}" (use on, off, or no argument to read the state)`
				};
				const delegated = verb === "" ? runDoorSeats.length > 0 : verb === "toggle" ? runDoorSeats.length === 0 : verb === "on";
				if (delegated) {
					seatRunDoors();
					seatComposeLoop(true);
					expandEstateDoors();
				} else {
					unseatRunDoors();
					seatComposeLoop(false);
				}
				const writeFailure = writeRunsDelegation({ delegated });
				c.logger.info("melite-tools: /melite-runs %s — AI run doors %s%s", verb || "(read)", delegated ? "SEATED" : "UNSEATED", writeFailure === void 0 ? " (recorded)" : " (WRITE FAILED: " + writeFailure + ")");
				return {
					kind: "success",
					text: delegated ? "AI runs ON — melite_flow + run_status + the estate doors (melite_view, melite_read, comfy_manage, skills, ledger) seated; the next model request sees them (a boot-fixed catalog sees them next session)." + (writeFailure === void 0 ? " Recorded — the delegation survives lane reloads." : " WARNING: recording failed (" + writeFailure + ") — a reload reverts to OFF.") : "AI runs OFF — runs start at the user’s Run press again." + (writeFailure === void 0 ? " Recorded." : " WARNING: recording failed (" + writeFailure + ") — a reload reverts to ON.")
				};
			}
		});
	});
	if (cardTools) c.effect(() => {
		const stop = [
			c.tools.register(buildMusicTool(call)),
			c.tools.register(buildTtsTool(call)),
			c.tools.register(buildImageEditTool(call)),
			c.tools.register(buildImageGenTool(call)),
			c.tools.register(buildMotionTool(call)),
			c.tools.register(buildH3TimelineTool(call))
		];
		return () => {
			for (const dispose of stop) dispose();
		};
	}, "melite-tools: card tool gate");
	else c.logger.info("melite-tools: card tool faces GATED OFF (cardTools=false) — the agent law: discover/load/compose only");
}
//#endregion
export { ADHOC_TOOL_NAMES, BASE_TOOL_NAMES, Config, DEFAULT_BENCH, DEFERRED_TOOL_NAMES, EAGER_TOOL_NAMES, MELITE_TOOL_NAMES, RUN_DOOR_NAMES, apply, bootFactsArm, comfyManage, harnessEnhance, inject, ledgerTail, makeEstate, makeEstateRequest, matchHarnessRoute, meliteConstruct, meliteDiscover, meliteFlow, meliteLoad, meliteRead, meliteView, name, readRunText, resolveHarnessRoutes, routeName, runStatus, skillRead, skillWrite };
