import { CARD_PLANE_ENGINE } from "@melite/contracts/benchStage";
import { TimeoutReason, deadline } from "@deepseek-ai/dsh-timeout";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { CARD_KINDS, buildCatalog, declaredDefaults, emitModifierKinds, emitParamsSchema, enhanceRecipeFor, getModel, isServedFamily, liveObjectInfo, liveScanOrder, loadCardDefs, modelIds, modelsBooted, owningAtom, registryModel, resolveEngineBaseUrl, resolveRepoRoot, theService } from "@melite/comfyui-cordis";
import { laneContractOf } from "@melite/contracts/laneRelations";
import { loraNamesFromObjectInfo } from "@melite/comfyui-cordis/user-loras";
import { deriveVariants } from "@melite/comfyui-card-kit/facts";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createUserMessage } from "@deepseek-ai/dsh-llm";
//#region src/estate.ts
/** Narrow the seat-bound request to the canonical EstateCall the card
* tool builders receive: the seats demand a caller signal (trySeats'
* throwIfAborted), so a signalless call fails HERE with a named error
* instead of deep inside the lane as a TypeError (2026-09-12). */
function asEstateCall(request) {
	return (method, path, body, signal, timeoutMs) => {
		if (signal === void 0) throw new Error(`estate call ${method} ${path} arrived without a caller signal (the seats require cancellation)`);
		return request(method, path, body, signal, timeoutMs);
	};
}
/** The estate row's Context-merged seats, probed lazily off a host.
*  OPTIONAL-dependency probes: ctx.get returns undefined when no
*  provider is loaded (the tutorial's pattern) — a seatless lane
*  then falls to the LOUD no-remote refusal. The getters re-probe per
*  access: a seat that mounts/unmounts mid-call reads as such, never
*  as a stale handle. */
function seatsOf(host) {
	return {
		get draftsRemote() {
			return host.get("draftsRemote");
		},
		get benchRemote() {
			return host.get("benchRemote");
		},
		get runs() {
			return host.get("runs");
		},
		get disclose() {
			return host.get("disclose");
		},
		get manage() {
			return host.get("manage");
		},
		get skills() {
			return host.get("meliteSkills");
		},
		get load() {
			return host.get("load");
		},
		get queue() {
			return host.get("queue");
		}
	};
}
/** Route one KV/runs lane to its seat; undefined = no seat / no match. */
async function trySeats(ctx, method, path, body, signal) {
	const seats = seatsOf(ctx);
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
	if (method === "POST" && path === "/v1/flows/drafts") return cardComposeLane(ctx, seats, body, signal);
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
		const arm = /^\/v1\/bench\/([^/?]+)\/(patch|add_stage|remove_stage|clear|rewire|undo)$/.exec(path);
		if (arm !== null) {
			if (seats.benchRemote === void 0) return void 0;
			if (body === void 0 || typeof body !== "object" || body === null) throw new Error(`bench ${arm[2]} needs a JSON body`);
			const session = decodeURIComponent(arm[1]);
			const doc = body;
			switch (arm[2]) {
				case "patch": return seats.benchRemote.patch(session, doc, signal);
				case "add_stage": return seats.benchRemote.addStage(session, doc, signal);
				case "remove_stage": return seats.benchRemote.removeStage(session, doc, signal);
				case "clear": return seats.benchRemote.clear(session, doc, signal);
				case "rewire": return seats.benchRemote.rewire(session, doc, signal);
				case "undo": return seats.benchRemote.undo(session, doc, signal);
				default: {
					/* v8 ignore next 2 -- the regex group admits exactly the six cased arms; no honest input reaches the throw (2026-10-20) */
					const exhaustive = arm[2];
					throw new Error(`bench arm ${String(exhaustive)} matched its pattern but has no seat`);
				}
			}
		}
	}
	if (method === "GET" && path === "/v1/flows") {
		if (seats.disclose === void 0) return void 0;
		return seats.disclose.contracts();
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
		if (seats.queue === void 0) return [];
		const qs = new URLSearchParams(m[1] ?? "");
		return seats.queue.ledger(qs.get("limit") ?? "50", qs.get("event") ?? "");
	}
}
/** THE CARD COMPOSE LANE — the start body verbatim → a bench-backed
*  draft (the CARD BIRTH LAW: the start rides a doc-backed draft_id).
*  CAS law = the queue lane's own: read the bench first, expect_rev
*  rides, a fresh bench births. ONE implementation served by BOTH
*  faces (F-1, 2026-11-05): the URL router's POST /v1/flows/drafts
*  arm and the typed Estate.cardCompose — the browser face keeps its
*  grammar, the tool plane keeps the behavior, neither re-answers
*  the CAS question. */
async function cardComposeLane(host, seats, body, signal) {
	if (seats.benchRemote === void 0) seatlessRefusal(host, "POST /v1/flows/drafts", BENCH_LANE.family, BENCH_LANE.probeNames);
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
			engine: CARD_PLANE_ENGINE,
			params
		}],
		overwrite: true
	};
	const bench = seats.benchRemote;
	const cur = await bench.get("default", signal);
	if (cur !== void 0 && typeof cur["rev"] === "number") ensure["expect_rev"] = cur["rev"];
	const conflict = (e) => typeof e?.code === "string" && e.code === "bench/cas-conflict";
	let row;
	try {
		row = await bench.ensure(ensure, signal);
	} catch (first) {
		if (!conflict(first)) throw first;
		const fresh = await bench.get("default", signal);
		if (fresh !== void 0 && typeof fresh["rev"] === "number") ensure["expect_rev"] = fresh["rev"];
		row = await bench.ensure(ensure, signal);
	}
	if (row === void 0 || typeof row["draft_id"] !== "string") throw new Error("card compose returned no draft_id — refusing to start cardless");
	return { draftId: row["draft_id"] };
}
/** Which seat FAMILY a path needs (agent-debt F-8, 2026-09-22 —
* coarse by design: the matcher above is the truth; this only names
* the family for the seatless refusal so the error says what to look
* at instead of developer archaeology). probeNames are the ONLY
* names the refusal may ctx.get — exactly the ones the matcher
* itself would have probed for this path: an EAGER sweep of all
* seat names INSTANTIATES defined-but-unloaded services on a cordis
* context (constructors with side effects — the hang, live proof
* 2026-09-22: the manage-seat wall took 51.8s dialing). */
function seatFamilyForPath(path) {
	if (path.startsWith("/v1/flows/drafts") || path.startsWith("/v1/bench/")) return {
		family: "bench plane (draftsRemote/benchRemote seats)",
		probeNames: ["draftsRemote", "benchRemote"]
	};
	if (path.startsWith("/v1/flows/")) return {
		family: "live-run registry (the runs seat)",
		probeNames: ["runs"]
	};
	if (path.startsWith("/v1/discover")) return {
		family: "disclose",
		probeNames: ["disclose"]
	};
	if (path.startsWith("/v1/manage")) return {
		family: "manage",
		probeNames: ["manage"]
	};
	if (path.startsWith("/v1/skills")) return {
		family: "meliteSkills",
		probeNames: ["meliteSkills"]
	};
	if (path.startsWith("/v1/load")) return {
		family: "load",
		probeNames: ["load"]
	};
	if (path.startsWith("/v1/ledger")) return {
		family: "queue",
		probeNames: ["queue"]
	};
	return {
		family: "unknown",
		probeNames: []
	};
}
/** Build the tools' request: seats only, in-process. A lane with no
*  seat for the path is a hard error — but the error must be an
*  AGENT-USABLE refusal (F-8): name the family the path needs, the
*  seats that ARE live, the pin that mounts the queue plane, and the
*  chat-lane exit. The old voice ("the gateway lane fallback died
*  2026-09-10 — migrate to a named Typert remote") read as a broken
*  registry and sent an agent hunting doors for an hour. */
function makeEstateRequest(ctx) {
	return (method, path, body, execSignal, timeoutMs) => {
		return withEstateBound(performEstateRequest(ctx, method, path, body, execSignal), `${method} ${path}`, timeoutMs);
	};
}
/** The wall-clock bound, RACED not dropped (the seam-drift cure,
*  2026-10-10). deadline()'s signal aborts with a TimeoutReason at
*  the bound; the translation keeps the pinned voice verbatim (J8:
*  the race rides the owned primitive, the semantics stay RACED).
*  The caller's signal is deliberately NOT fused — the seat work
*  owns its own cancellation (doors.spec pins the caller-gone arm:
*  the response settles from the WORK, never a fabricated refusal),
*  so the race's only business is the bound. `sp` is the
*  request's own spelling of the lane ('METHOD /v1/path') — the
*  bound refusal names it so the agent sees WHICH call hung. */
function withEstateBound(work, sp, timeoutMs) {
	if (timeoutMs === void 0 || !Number.isFinite(timeoutMs) || timeoutMs <= 0) return work;
	const bound = deadline(void 0, timeoutMs, "ESTATE_TIMEOUT");
	const refused = new Promise((_, reject) => {
		bound.signal.addEventListener("abort", () => {
			const reason = bound.signal.reason;
			if (reason instanceof TimeoutReason) {
				reject(/* @__PURE__ */ new Error(`estate request ${sp} outlived its ${String(timeoutMs)}ms bound`));
				return;
			}
			reject(reason instanceof Error ? reason : /* @__PURE__ */ new Error("estate request cancelled"));
		}, { once: true });
	});
	return Promise.race([work, refused]).finally(() => {
		bound[Symbol.dispose]();
	});
}
/** The AGENT-USABLE no-seat refusal (F-8's voice) — ONE builder for
*  both faces (F-1, 2026-11-05): name the family the lane needs, the
*  seats that ARE live, the pin that mounts the queue plane, and the
*  chat-lane exit. `sp` is the request's own spelling of the lane —
*  the URL router passes 'METHOD /path' verbatim, the typed lanes
*  pass their canonical spelling, and the text reads the same. */
function seatlessRefusal(host, sp, family, probeNames) {
	const live = [];
	for (const n of probeNames) try {
		if (host.get(n) !== void 0) live.push(n);
	} catch {}
	const liveVoice = live.length > 0 ? `Live seats here: ${live.join(", ")}.` : `No seat of that family is mounted on this lane (ABSENCE, not a broken registry; nothing crashed).`;
	throw new Error(`no seat on this lane serves ${sp} — the ${family} is not mounted. ${liveVoice} The queue-plane seats mount when the estate state root is pinned (the profile config's stateRoot / repoRoot fields). On a chat lane, compose via melite_construct onto the shared bench instead of the raw flow doors.`);
}
async function performEstateRequest(ctx, method, path, body, execSignal) {
	const viaSeats = await trySeats(ctx, method, path, body, execSignal);
	if (viaSeats !== void 0) return viaSeats;
	const { family, probeNames } = seatFamilyForPath(path);
	seatlessRefusal(ctx, `${method} ${path}`, family, probeNames);
}
/** Per-lane seat-family facts — the refusal names the family and
*  probes ONLY its own names (the eager-sweep hang, live proof
*  2026-09-22). The same rows seatFamilyForPath answers for the
*  router; spelled per lane because the lanes ARE the families. */
const BENCH_LANE = {
	family: "bench plane (draftsRemote/benchRemote seats)",
	probeNames: ["draftsRemote", "benchRemote"]
};
const RUNS_LANE = {
	family: "live-run registry (the runs seat)",
	probeNames: ["runs"]
};
const DISCLOSE_LANE = {
	family: "disclose",
	probeNames: ["disclose"]
};
const MANAGE_LANE = {
	family: "manage",
	probeNames: ["manage"]
};
const SKILLS_LANE = {
	family: "meliteSkills",
	probeNames: ["meliteSkills"]
};
const LOAD_LANE = {
	family: "load",
	probeNames: ["load"]
};
const QUEUE_LANE = {
	family: "queue",
	probeNames: ["queue"]
};
/** One typed lane: abort check → seat probe → the seat call → the
*  seatless fall-through (a served `undefined` refuses, the router's
*  exact law) → the wall-clock bound. `sp` is the lane's canonical
*  spelling for the refusal/bound voices. */
async function estateLane(ctx, sp, laneFacts, serve, signal, timeoutMs) {
	signal.throwIfAborted();
	const seats = seatsOf(ctx);
	return withEstateBound((async () => {
		const out = await Promise.resolve(serve(seats, signal));
		if (out === void 0) seatlessRefusal(ctx, sp, laneFacts.family, laneFacts.probeNames);
		return out;
	})(), sp, timeoutMs);
}
/** The typed lanes (see Estate). Same seats, same refusals, same
*  bounds as the URL router — no second answering of any lane law. */
function makeEstate(ctx) {
	const lane = (sp, facts, serve) => (signal, timeoutMs) => estateLane(ctx, sp, facts, serve, signal, timeoutMs);
	return {
		draftsList: lane("GET /v1/flows/drafts", BENCH_LANE, (s, signal) => s.draftsRemote === void 0 ? void 0 : s.draftsRemote.list(signal)),
		draftsGet: (draftId, signal, timeoutMs) => estateLane(ctx, `GET /v1/flows/drafts/${encodeURIComponent(draftId)}`, BENCH_LANE, (s) => s.draftsRemote === void 0 ? void 0 : s.draftsRemote.get(draftId, signal), signal, timeoutMs),
		draftsStagePatch: (draftId, stageId, patch, signal, timeoutMs) => estateLane(ctx, `PATCH /v1/flows/drafts/${encodeURIComponent(draftId)}/stages/${encodeURIComponent(stageId)}`, BENCH_LANE, (s) => s.draftsRemote === void 0 ? void 0 : s.draftsRemote.patch(draftId, stageId, patch, signal), signal, timeoutMs),
		cardCompose: (body, signal, timeoutMs) => {
			signal.throwIfAborted();
			return withEstateBound(cardComposeLane(ctx, seatsOf(ctx), body, signal), "POST /v1/flows/drafts", timeoutMs);
		},
		benchGet: (session, signal, timeoutMs) => estateLane(ctx, `GET /v1/bench/${encodeURIComponent(session)}`, BENCH_LANE, (s) => s.benchRemote === void 0 ? void 0 : s.benchRemote.get(session, signal), signal, timeoutMs),
		benchEnsure: (doc, signal, timeoutMs) => estateLane(ctx, "POST /v1/bench/ensure", BENCH_LANE, (s) => s.benchRemote === void 0 ? void 0 : s.benchRemote.ensure(doc, signal), signal, timeoutMs),
		benchVerb: (session, verb, doc, signal, timeoutMs) => estateLane(ctx, `POST /v1/bench/${encodeURIComponent(session)}/${verb}`, BENCH_LANE, (s) => {
			const bench = s.benchRemote;
			if (bench === void 0) return void 0;
			switch (verb) {
				case "patch": return bench.patch(session, doc, signal);
				case "add_stage": return bench.addStage(session, doc, signal);
				case "remove_stage": return bench.removeStage(session, doc, signal);
				case "clear": return bench.clear(session, doc, signal);
				case "rewire": return bench.rewire(session, doc, signal);
				case "undo": return bench.undo(session, doc, signal);
				default: throw new Error(`bench arm ${String(verb)} matched its pattern but has no seat`);
			}
		}, signal, timeoutMs),
		runsValidate: (doc, signal, timeoutMs) => estateLane(ctx, "POST /v1/flows/validate", RUNS_LANE, (s) => s.runs === void 0 ? void 0 : s.runs.validate(doc, signal), signal, timeoutMs),
		runsStart: (doc, signal, timeoutMs) => estateLane(ctx, "POST /v1/flows/start", RUNS_LANE, (s) => s.runs === void 0 ? void 0 : s.runs.start(doc, signal), signal, timeoutMs),
		runsStatus: (runId, includeLog, signal, timeoutMs) => estateLane(ctx, `GET /v1/flows/status/${encodeURIComponent(runId)}`, RUNS_LANE, (s) => s.runs === void 0 ? void 0 : s.runs.status(runId, signal, includeLog), signal, timeoutMs),
		runsStop: (runId, signal, timeoutMs) => estateLane(ctx, `POST /v1/flows/stop/${encodeURIComponent(runId)}`, RUNS_LANE, (s) => s.runs === void 0 ? void 0 : s.runs.stop(runId, signal), signal, timeoutMs),
		runsList: (limit, signal, timeoutMs) => estateLane(ctx, `GET /v1/flows/runs?limit=${encodeURIComponent(limit)}`, RUNS_LANE, (s) => s.runs === void 0 ? void 0 : s.runs.list(limit, signal), signal, timeoutMs),
		discover: (lookup, q, tags, signal, timeoutMs) => estateLane(ctx, "GET /v1/discover", DISCLOSE_LANE, (s) => s.disclose === void 0 ? void 0 : s.disclose.discover(lookup, q, tags), signal, timeoutMs),
		flowsContracts: lane("GET /v1/flows", DISCLOSE_LANE, (s) => s.disclose === void 0 ? void 0 : s.disclose.contracts()),
		manageAct: (doc, signal, timeoutMs) => estateLane(ctx, "POST /v1/manage", MANAGE_LANE, (s) => s.manage === void 0 ? void 0 : s.manage.act(doc, signal), signal, timeoutMs),
		skillsIndex: lane("GET /v1/skills", SKILLS_LANE, (s) => s.skills === void 0 ? void 0 : s.skills.index()),
		skillRead: (id, signal, timeoutMs) => estateLane(ctx, `GET /v1/skills/${encodeURIComponent(id)}`, SKILLS_LANE, (s) => s.skills === void 0 ? void 0 : s.skills.read(id, signal), signal, timeoutMs),
		loadCard: (inferenceType, name, signal, timeoutMs) => estateLane(ctx, `GET /v1/load?inference_type=${encodeURIComponent(inferenceType)}&name=${encodeURIComponent(name)}`, LOAD_LANE, (s) => s.load === void 0 ? void 0 : s.load.load(inferenceType, name), signal, timeoutMs),
		ledgerTail: (limit, event, signal, timeoutMs) => estateLane(ctx, "GET /v1/ledger", QUEUE_LANE, (s) => s.queue === void 0 ? [] : s.queue.ledger(limit, event), signal, timeoutMs)
	};
}
//#endregion
//#region src/faceStamp.ts
const liveRun = (args, cwd) => execFileSync("git", args, {
	cwd,
	encoding: "utf8",
	timeout: 15e3,
	stdio: [
		"ignore",
		"pipe",
		"pipe"
	]
});
/** Pure: short hash + dirty flag -> the stamp. */
function formatStamp(hash, dirty) {
	const h = hash.trim();
	if (h === "") return "unknown";
	return dirty ? `${h}+dirty` : h;
}
/** Read the stamp through an injectable runner — any git failure
*  (not a checkout, git absent, status unreadable) stamps `unknown`. */
function readStamp(run, root) {
	try {
		return formatStamp(run([
			"rev-parse",
			"--short",
			"HEAD"
		], root), run(["status", "--porcelain"], root).trim() !== "");
	} catch {
		return "unknown";
	}
}
let cached = null;
/** The serving process's stamp (resolved once, then the value). */
function faceStamp(root = resolveRepoRoot(), run = liveRun) {
	if (cached === null) cached = readStamp(run, root);
	return cached;
}
//#endregion
//#region src/stageViewPlane.ts
/** stageViewPlane.ts — THE STAGE-VIEW DECLARATION PLANE (2026-11-09,
*  the fallback extermination): the estate derives each card's
*  studio claim from the card package's own client index — the same
*  tree truth the mount census wall judges
*  (tests/walls/ts/suites/stage-view-mount-census.spec.ts).
*  `defineStageViewRegistration('<card-id>', …)` inside
*  packages/<genre>/<pkg>/src/client/index.ts, plus the manifest's
*  package name, is the declaration; specBody serves it as
*  FormSpecDoc.stage_view so the drill's dispatch can refuse LOUD
*  when the lane's module table lacks the plugin instead of
*  silently re-expressing the studio's params as a generic form.
*  The walk memoizes per process (the tree is boot-static where the
*  estate runs); an index that reads as absent is a legitimate
*  no-declaration — most cards have no studio. */
let cache = null;
function isDir(p) {
	/* v8 ignore next -- statSync on a raced deletion; the walk's inputs
	are readdirSync outputs that exist in the real tree */
	try {
		return statSync(p).isDirectory();
	} catch {
		return false;
	}
}
/** The repo root from this module's own seat (packages/harness/
*  melite-tools/src → 4 up), independent of process.cwd(). */
function repoRoot() {
	return join(dirname(fileURLToPath(import.meta.url)), "../../../..");
}
/** card id → declaring package name, derived once from the tree. */
function declarations() {
	if (cache !== null) return cache;
	const out = /* @__PURE__ */ new Map();
	const walk = (dir) => {
		let entries;
		try {
			entries = readdirSync(dir);
		} catch {
			/* v8 ignore next -- a dir stat'd as a dir vanishing mid-walk is
			a filesystem race; the real tree serves the walk whole */
			return;
		}
		for (const e of entries) {
			const p = join(dir, e);
			if (!isDir(p)) continue;
			if (e === "node_modules" || e === ".git" || e === "lib") continue;
			const index = join(p, "src", "client", "index.ts");
			let text;
			try {
				text = readFileSync(index, "utf8");
			} catch {
				walk(p);
				continue;
			}
			const m = text.match(/defineStageViewRegistration\(\s*'([^']+)'/);
			if (m === null) {
				walk(p);
				continue;
			}
			/* v8 ignore next 6 -- a registration whose manifest is unreadable
			or nameless declares nothing; every real card package names
			itself (the mount census judges the manifests independently) */
			try {
				const manifest = JSON.parse(readFileSync(join(p, "package.json"), "utf8"));
				if (typeof manifest.name === "string") out.set(m[1], manifest.name);
			} catch {}
			walk(p);
		}
	};
	walk(join(repoRoot(), "packages"));
	cache = out;
	return out;
}
/** The card's declaring package name, or undefined when the card
*  registers no studio (specBody serves null — the generic form is
*  that card's designed seat). */
function stageViewDeclaration(cardId) {
	return declarations().get(cardId);
}
//#endregion
//#region src/discovery.ts
/** The boarded map (family -> the card that boards it, first-seen).
*  Exported for the flow tool's bench pass (the card-id alias
*  resolution rides the SAME table form-spec serves — one truth). */
function boardedMap(defs) {
	const out = /* @__PURE__ */ new Map();
	for (const [cardId, def] of defs) for (const fam of def.boarded ?? []) if (!out.has(fam)) out.set(fam, cardId);
	return out;
}
/** Every route address a family's declaration names (variant routes
*  + cell routes) — the route->owner back edge. */
function declRoutes(decl) {
	const out = /* @__PURE__ */ new Set();
	for (const v of decl.variants ?? []) {
		if (v.route) out.add(v.route);
		for (const c of v.cells ?? []) if (c.route) out.add(c.route);
	}
	return out;
}
function resolveSpecKey(key, defs, boarded) {
	const def = defs.get(key);
	if (def !== void 0 && !(isFamilyKey(key) && owningAtom(key) === key)) {
		const boardedFams = def.boarded ?? [];
		const service = boardedFams.length > 0 ? boardedFams[0] : key;
		return {
			card: key,
			service,
			model: boardedFams.length > 0 ? service : void 0
		};
	}
	let decl;
	try {
		decl = getModel(key);
	} catch (e) {
		if (!modelsBooted()) throw e;
		return null;
	}
	if (!isServedFamily(decl)) return null;
	const self = boarded.get(key);
	if (self !== void 0) return {
		card: self,
		service: key,
		model: key
	};
	for (const [fam, card] of boarded) {
		let fdecl;
		try {
			fdecl = getModel(fam);
		} catch {
			continue;
		}
		if (declRoutes(fdecl).has(key)) return {
			card,
			service: fam,
			model: key
		};
	}
	return null;
}
/** The TOOL arm's resolution (melite_flow's card question): the
*  card census with the family fallback, SILENT on an unbooted
*  models table. The tool's own census is the CARD table
*  (loadCardDefs — always booted by the time it asks), and the
*  live estate boots the models seat before tools serve, so an
*  unbooted table here is a cold test process's state: the tool
*  keeps its own refusal voice, never the table's. Only the
*  form-spec family arm (resolveSpecKey itself) may speak the
*  table's voice.
*
* @param key the tool's card or family id.
* @param defs the booted card definitions.
* @param boarded family id → owning card id.
* @returns the resolution, or null when neither census answers. */
function resolveSpecKeyForTool(key, defs, boarded) {
	try {
		return resolveSpecKey(key, defs, boarded);
	} catch (e) {
		if (!modelsBooted()) return null;
		throw e;
	}
}
/** A key is a family key when a DECL names it (routes and owners
*  alike); otherwise a defs hit is a card-id alias. */
function isFamilyKey(key) {
	try {
		getModel(key);
		return true;
	} catch {
		return false;
	}
}
/** One DECL variant's wire row (the editor Variant contract: all ten
*  keys, always — null/"" for absent, never a missing key). Takes the
*  ONE-WALK matrix row (facts.ts deriveVariants) — the served spec
*  projects the same walk the door's facts row projects, never a
*  second walk of the DECL (the axis-unification cure, 2026-11-06:
*  the seats' separate walks drifted, and the served spec starved
*  anima's cells while the facts row carried them). */
function variantRow(v, declEngine) {
	return {
		id: v.id,
		label: v.label,
		group: v.group,
		defaults: {
			...v.resolver_defaults,
			...v.wire_defaults ?? {}
		},
		route: v.route,
		hint: v.hint ?? null,
		engine: v.engine ?? declEngine,
		sampler_envelope: v.sampler_envelope ?? null,
		quant: null,
		vram_peak_gb: null,
		owner: ""
	};
}
function capQuant(quant) {
	return quant.length > 0 ? quant[0].toUpperCase() + quant.slice(1) : /* v8 ignore next -- !c.quant gate */ quant;
}
/** THE LANE CONTRACT SERVE (2026-10-10, the fix shape 2+4): the
*  family's declared surface + relation words, verbatim, for the
*  form plane — the client resolves (family base ∪ variant
*  additions) with laneSurfaceOf and judges with
*  judgeLaneRelations, the same calls the bench-write door uses.
*  Served ONLY when the family declares a base surface (the
*  spread at the call site gates it). */
/** The key family's variants + its offered quant cells — THE SERVED
*  PROJECTION OF THE ONE WALK (facts.ts deriveVariants). A cell
*  serves the envelope iff its route is addressable at the key: a
*  ROUTE key scopes to its own lane (cells addressed at the key or
*  the owning family); a served FAMILY key (key === service) serves
*  its OWN DECL's cells ALWAYS — the boarded[0] gate may scope only
*  foreign lanes, never starve (the anima burn cure, 2026-11-06: the
*  old `primary` form dropped EVERY cell of a non-first-boarded
*  family — image-gen boards krea-2 first, so the served anima spec
*  carried zero Quant rows while the DECL declared two, and the
*  mirror refused with a voice that blamed the DECL). A routeless
*  cell follows its row — the route is the run's ROUTING stamp
*  (cardsCompose's resolved address), never a serve filter (the g2
*  lane-parity cure, 2026-10-20). Variant rows serve whole
*  (every key, always) regardless of route. A key naming a
*  hidden route serves an empty axis (the hidden-lane mirror).
*  Exported as the one
*  serializer the walls ride (the switching sweep; the sync wall's
*  P2 face is formSpecArm, this door's own body). */
function specVariants(decl, key) {
	const rows = [];
	const declEngine = decl.engine ?? "";
	const matrix = deriveVariants(decl);
	if (matrix.some((v) => v.hide_from_dropdown === true && (v.route === key || v.id === key || v.cells.some((c) => c.route === key))) || matrix.some((v) => v.cells.some((c) => c.hide_from_dropdown === true && c.route === key))) return rows;
	for (const v of matrix) {
		if (v.hide_from_dropdown === true) continue;
		rows.push(variantRow(v, declEngine));
		for (const c of v.cells) {
			if (c.hide_from_dropdown === true) continue;
			if (!c.quant) throw new Error(`${decl.id}/${v.id}: a cell needs a quant (refused at the spec's birth — an axis row without its coordinate must never serve)`);
			const id = c.quant;
			rows.push({
				id,
				label: c.label || capQuant(c.quant),
				group: "Quant",
				defaults: c.resolver_defaults ?? {},
				route: c.route,
				hint: null,
				engine: c.engine ?? declEngine,
				quant: c.quant,
				vram_peak_gb: c.vram_peak_gb ?? null,
				owner: v.id
			});
		}
	}
	const routed = /* @__PURE__ */ new Set();
	for (const v of matrix) {
		if (v.route) routed.add(v.route);
		for (const c of v.cells) if (c.route) routed.add(c.route);
	}
	if (!routed.has(decl.id)) {
		const resolving = matrix.find((v) => v.cells.length > 0) ?? matrix[0];
		if (resolving !== void 0 && resolving.hide_from_dropdown !== true) {
			const id = `${resolving.id}__head`;
			rows.push({
				id,
				label: resolving.label,
				group: "Variant",
				defaults: {},
				route: decl.id,
				hint: resolving.hint ?? null,
				engine: resolving.engine ?? declEngine,
				sampler_envelope: resolving.sampler_envelope ?? null,
				quant: null,
				vram_peak_gb: null,
				owner: ""
			});
		}
	}
	return rows;
}
/** The variant-group contract from the DECL's groups. */
function groupContract(decl) {
	const out = {};
	for (const g of decl?.variant_groups ?? []) {
		const entry = { label: g.label };
		if (g.tooltip) entry.tooltip = g.tooltip;
		if (g.default) entry.default = g.default;
		out[g.id] = entry;
	}
	return out;
}
/** The modifier-pack table (the subcard packs). controlnet waits
*  unboarded (the phantom-capability gate). kind/label/cardinality
*  are UI strings with no other live source — one row per pack,
*  stated once.
*  LANPAINT'S ROW (stroke 32 — the operator's missing-seat report:
*  image-edit's required image1 never rendered): the port moved the
*  anchor out of the schema into the lanpaint mod, so the old
*  "rides inline" exemption became a dropped seat — the family
*  boards lanpaint, mod_schemas serves it, compose requires it, but
*  no modifiers entry ever offered the brick. The rail seats the
*  anchor (the client half); this row offers the knobs.
*  EXPORTED (022's self-critique #3, 2026-09-24): the load bundle's
*  mods line serves the SAME grammar for DECL-boarded packs (the
*  qvoice seats) — one table, two consumers, never a copy. */
const MODIFIER_PACKS = {
	loras: {
		kind: "lora",
		label: "LoRAs",
		cardinality: "list",
		entry: "option",
		option_key: "id"
	},
	controlnet: {
		kind: "controlnet",
		label: "ControlNet",
		cardinality: "list",
		max_stack: 5,
		param_key: "controlnets",
		entry: "hybrid",
		option_key: "type"
	},
	mask: {
		kind: "mask",
		label: "Region Mask",
		cardinality: "list",
		max_stack: 1
	},
	lanpaint: {
		kind: "brick",
		label: "Lanpaint",
		cardinality: "list",
		max_stack: 1
	},
	ip_adapter: {
		kind: "ip_adapter",
		label: "IP-Adapter",
		cardinality: "list",
		max_stack: 5,
		param_key: "ip_adapters",
		entry: "hybrid",
		option_key: "kind",
		scalar_key: "weight"
	},
	qvoice: {
		kind: "qvoice",
		label: "Voice",
		cardinality: "list",
		max_stack: 1
	},
	qvoice_save: {
		kind: "qvoice_save",
		label: "Design",
		cardinality: "list",
		max_stack: 1
	}
};
function optionTooltip(row, shared) {
	const base = row.tooltip ?? (row.category ? `${row.category} — ${row.filename}` : row.filename);
	return shared ? `${base} — runtime catalog` : base;
}
/** The modifiers offer: one entry per boarded modifier pack (the
*  DECL's mods order, filtered to the pack table). Options ride the
*  pack rows (union-served rows carry the shared suffix); the
*  entry's param rows derive client-side off `mod_schemas[pack]`
*  (the absorbed contract's own toJSON — same walker as the card
*  fields, one meta path). THE ENVELOPE MIRROR (born the
*  voice-lock mod catch 2026-09-21, same stroke as the seat): a
*  pack with no envelope for THIS family
*  serves no entry — the client walks mod_schemas[pack] for rows,
*  so a seat with no envelope is a brick by construction (the
*  qvoice pack boards the DECL but the base lane's envelope is
*  dropped by owner-scoping — the entry must drop with it). */
/** THE ENVELOPE PREDICATE (schema-strictness fix 5, 2026-10-01):
*  the serialized schemastery envelope arrives from the ENGINE plane
*  as `unknown` (its toJSON), and the served contract types it.
*  The envelope's two facts are checked here; the ref table's per-node
*  facts ride the client's walker and the client's own wtype gate. */
function isSchemaEnvelope(e) {
	if (typeof e !== "object" || e === null || Array.isArray(e)) return false;
	const env = e;
	return typeof env.uid === "number" && typeof env.refs === "object" && env.refs !== null && !Array.isArray(env.refs);
}
/** The engine's own form doc (the engine-doc arm) narrowed to the
*  served contract — same predicate, the form's own name checked. */
/** One envelope off the engine's formSchemas — a malformed
*  envelope refuses (the served contract is never a lie). */
function servedEnvelope(e, card) {
	if (e === null || e === void 0) return null;
	if (!isSchemaEnvelope(e)) throw new Error(`form-spec: card '${card}' serialized a malformed schema envelope (uid number + refs object)`);
	return e;
}
/** The absorbed mod envelopes, keyed by pack (the same check, per
*  pack). */
function servedModEnvelopes(mods, card) {
	const out = {};
	for (const [pack, env] of Object.entries(mods)) out[pack] = servedEnvelope(env, card);
	return out;
}
function isFormSpecDoc(e) {
	const doc = e;
	if (typeof doc.form !== "string") return false;
	if (doc.schema !== null && doc.schema !== void 0 && !isSchemaEnvelope(doc.schema)) return false;
	return true;
}
/** THE SERVED-KIND NARROW (schema-strictness fix 5, 2026-10-01):
*  the card-declared kind rows arrive from the ENGINE plane as loose
*  records (the engine cannot name card-base's field rows), and the
*  served contract types them. The three required keys are checked
*  here, at the serve boundary — a malformed row refuses instead of
*  riding as `Record<string, unknown>`. */
function servedFields(rows, where) {
	if (rows === void 0) return void 0;
	return rows.map((row, i) => {
		const name = row["name"];
		const label = row["label"];
		const type = row["type"];
		if (typeof name !== "string" || typeof label !== "string" || typeof type !== "string") throw new Error(`form-spec: ${where} field ${i} must carry string name/label/type — ${JSON.stringify(row).slice(0, 120)}`);
		return {
			...row,
			name,
			label,
			type
		};
	});
}
/** The pick-option narrow (the served kind's option rows: value +
*  label are the two the leaf renders). */
function servedOptions(rows, where) {
	if (rows === void 0) return void 0;
	return rows.map((row, i) => {
		const value = row["value"];
		const label = row["label"];
		if (typeof value !== "string" || typeof label !== "string") throw new Error(`form-spec: ${where} option ${i} must carry string value/label — ${JSON.stringify(row).slice(0, 120)}`);
		return {
			...row,
			value,
			label
		};
	});
}
/** THE ENGINE LISTING READER (the lora-from-url cure, operator order
*  2026-11-09): the engine's own LoRA combo — the SAME reader + memo
*  the manage plane's lora_list rides (`liveObjectInfo`, cached per
*  engine for the process life, dropped by the lora_fetch landing) —
*  so the picker's candidates and the lora doors can never disagree
*  about what the engine will load. Absent (undefined) when the
*  engine is unreachable or undeclared: the picker serves its DECL
*  rows alone — an engine that proves nothing never invents
*  candidates (the honest-empty law). @param boundMs the live read's
*  deadline bound (the manage doors' own railMs posture, tighter
*  here: a form-spec serve must not hang on a dead engine).
*  @returns the combo names ('<family>/<file>'), or undefined. */
async function engineLorasListing(boundMs = 3e3) {
	try {
		return loraNamesFromObjectInfo(await liveObjectInfo(resolveEngineBaseUrl(), void 0, boundMs));
	} catch {
		return;
	}
}
function specModifiers(svc, card, key, decl, def, enveloped, engineLoras) {
	const out = [];
	for (const m of decl?.mods ?? []) {
		const pack = typeof m === "string" ? m : m.pack;
		const marries = typeof m === "string" ? void 0 : m.marries;
		const meta = MODIFIER_PACKS[pack];
		if (meta === void 0) continue;
		if (!enveloped.has(pack)) continue;
		const cat = svc.modCatalog(pack, key);
		const entry = {
			kind: meta.kind,
			label: meta.label,
			param_key: meta.param_key ?? pack,
			schema_key: pack,
			cardinality: meta.cardinality
		};
		if (marries !== void 0) entry.marries = marries;
		if (meta.max_stack !== void 0) entry.max_stack = meta.max_stack;
		if (meta.entry !== void 0) entry.entry = meta.entry;
		if (meta.option_key !== void 0) entry.option_key = meta.option_key;
		if (meta.scalar_key !== void 0) entry.scalar_key = meta.scalar_key;
		entry.options = cat.rows.map((r) => ({
			value: r.id,
			label: r.label ?? r.id,
			tooltip: optionTooltip(r, cat.shared),
			defaults: r.default_strength === void 0 && r.default_weight === void 0 && r.steps === void 0 && r.steps_min === void 0 && r.steps_max === void 0 && r.shift_video === void 0 ? {} : Object.fromEntries(Object.entries({
				[meta.scalar_key ?? "strength"]: r.default_strength ?? r.default_weight,
				steps: r.steps,
				steps_min: r.steps_min,
				steps_max: r.steps_max,
				shift_video: r.shift_video
			}).filter(([, v]) => v !== void 0)),
			model: r.filename,
			...r.preprocessor !== void 0 ? { preprocessor: r.preprocessor } : {}
		}));
		if (pack === "loras" && engineLoras !== void 0) {
			const prefix = key + "/";
			const declared = new Set(cat.rows.map((r) => r.filename));
			const served = new Set(entry.options.map((o) => o.value));
			const engineRows = [];
			for (const name of engineLoras) {
				if (!name.startsWith(prefix)) continue;
				if (declared.has(name) || served.has(name)) continue;
				engineRows.push({
					value: name,
					label: name.slice(prefix.length),
					tooltip: "the engine’s own loras/" + key + "/ listing — land more with comfy_manage lora_fetch",
					model: name
				});
			}
			if (engineRows.length > 0) entry.options = [...entry.options, ...engineRows];
		}
		out.push(entry);
	}
	for (const k of def?.mods ?? []) {
		if (typeof k.kind !== "string" || k.kind === "" || typeof k.label !== "string" || k.label === "" || typeof k.param_key !== "string" || k.param_key === "" || typeof k.cardinality !== "string" || k.cardinality === "") throw new Error(`form-spec: card '${card}' declares a malformed mod kind (kind/label/param_key/cardinality required) — ${JSON.stringify(k).slice(0, 120)}`);
		const entry = {
			kind: k.kind,
			label: k.label,
			param_key: k.param_key,
			cardinality: k.cardinality
		};
		if (k.entry !== void 0) entry.entry = k.entry;
		if (k.option_key !== void 0) entry.option_key = k.option_key;
		if (k.scalar_key !== void 0) entry.scalar_key = k.scalar_key;
		if (k.max_stack !== void 0) entry.max_stack = k.max_stack;
		if (k.category !== void 0) entry.category = k.category;
		const servedFieldsRow = servedFields(k.fields, `mod kind ${k.kind}`);
		if (servedFieldsRow !== void 0) entry.fields = servedFieldsRow;
		const servedKindFields = servedFields(k.kindFields, `mod kind ${k.kind} kindFields`);
		if (servedKindFields !== void 0) entry.kindFields = servedKindFields;
		const servedOptionsRow = servedOptions(k.options, `mod kind ${k.kind}`);
		if (servedOptionsRow !== void 0) entry.options = servedOptionsRow;
		if (k.leaf_face !== void 0) entry.leaf_face = k.leaf_face;
		if (k.section !== void 0) entry.section = k.section;
		if (k.requires !== void 0) entry.requires = k.requires;
		out.push(entry);
	}
	return out;
}
/** One form-spec envelope (the /v1/form-spec?model= body — the
*  editor's render truth for one served key). Everything scopes to
*  the KEY family; the owner supplies only the service
*  attribution. Keys insert alphabetically (the frozen shape). */
/** The family's DECL face ("MOSS-SFX v2") — registryModel in a
* guard, degrading to the id (the module singleton's law: a read
* that can miss never throws — same shape as the getModel guard
* above). Never the composed variant+quant row. The variant-route
* scan died here 2026-09-21 (the README stroke: qwen3-tts-base was
* never a variant route — but that was PRE-FOLD law: THE QWEN
* FOLD (2026-10-26) made Base a CELL ROUTE under the one qwen3-tts
* family (F6 audit 2026-10-12-audit-display-fold — the header
* taught the dead two-family world while the fold code below served
* one); a route address reaching here faces the COMPOSED view label,
* and DISPLAY surfaces fold it to its owning atom before it ever
* renders (owningAtom, the 645e77e0b law). */
function familyFace(fam) {
	try {
		return registryModel(fam).label;
	} catch {
		try {
			return getModel(fam).label;
		} catch {
			return fam;
		}
	}
}
function stampOptionsFrom(schema, svc, family, boardedPacks) {
	const env = schema;
	if (env == null || env.refs == null || env.uid == null) return;
	const root = env.refs[String(env.uid)] ?? env.refs[env.uid];
	if (root?.dict == null) return;
	for (const [field, refId] of Object.entries(root.dict)) {
		const node = env.refs[String(refId)];
		if (node == null || node.meta == null) continue;
		const extra = node.meta.extra;
		if (extra == null || typeof extra.optionsFrom !== "string") continue;
		const pack = extra.optionsFrom;
		if (!boardedPacks.has(pack)) {
			const boarded = [...boardedPacks].sort().join(", ");
			throw new Error(`form-spec: field '${field}' names optionsFrom pack '${pack}' the ${family} envelope does not board (${boarded === "" ? "no packs boarded" : `boarded: ${boarded}`})`);
		}
		const rows = svc.modCatalog(pack, family).rows;
		const options = [];
		if (node.meta.default === "" || node.meta.default === void 0) options.push({
			value: "",
			label: "— none —"
		});
		for (const r of rows) options.push({
			value: r.id,
			label: r.id
		});
		const clone = {
			...extra,
			options
		};
		delete clone.optionsFrom;
		node.meta.extra = clone;
	}
}
/** THE UNKNOWN-CARD VOICE, SPOKEN ONCE (one voice per refusal):
*  the defs guard and the formSchemas miss are the same condition, so
*  both build the same sentence from this function. Two literals is
*  how they drifted apart in the first place. */
const unknownCardVoice = (card) => `form-spec: card '${card}' unknown`;
function specBody(svc, defs, res, engineLoras) {
	const def = defs.get(res.card);
	if (def === void 0) throw new Error(unknownCardVoice(res.card));
	const ident = def.identity;
	if (ident === void 0) throw new Error(`form-spec: card '${res.card}' declares no identity`);
	const key = res.model ?? res.card;
	let decl = null;
	try {
		decl = getModel(key);
	} catch {
		decl = null;
	}
	const envelopeKey = owningAtom(key);
	const schemas = svc.formSchemas(res.card, envelopeKey);
	if (schemas === null) throw new Error(unknownCardVoice(res.card));
	const boardedPacks = new Set(Object.keys(schemas.mods));
	stampOptionsFrom(schemas.schema, svc, envelopeKey, boardedPacks);
	const modifiers = specModifiers(svc, res.card, envelopeKey, decl, def, boardedPacks, engineLoras);
	let liveMids;
	try {
		liveMids = new Set(liveScanOrder());
	} catch {
		/* v8 ignore next -- the booted registry serves in practice; an
		empty set degrades to all-absent marks, never a throw */
		liveMids = /* @__PURE__ */ new Set();
	}
	const surface = def.surface ?? {};
	def.boarded;
	const inputs = Object.entries(def.flowKinds.inputs).map(([name, kind]) => ({
		name,
		kind
	}));
	return {
		contract: null,
		model_defaults: {
			...def.schema === void 0 ? {} : declaredDefaults(def.schemaCarrier ?? def.schema, def.boarded ?? []),
			...Object.fromEntries(Object.entries(decl?.defaults ?? {}).filter(([, v]) => v !== null && !Array.isArray(v)))
		},
		engine: decl?.engine ?? "comfyui",
		enhance_prompt: null,
		enhance_prompts: enhanceRecipeFor(key, res.service) !== null ? { prompt: enhanceRecipeFor(key, res.service) } : {
			prompt: null,
			lyrics: ""
		},
		features: {
			modifiers,
			variant_groups: groupContract(decl)
		},
		...def.preview !== void 0 ? { preview: def.preview } : {},
		form: res.card,
		genre: ident.genre,
		guide: null,
		inputs,
		label: ident.label,
		layout: surface.layout === "studio" ? "studio" : null,
		loader_info: null,
		mod_schemas: servedModEnvelopes(schemas.mods, res.card),
		model: res.model ?? null,
		params: decl?.params,
		...decl?.studio?.writes !== void 0 ? { studio_writes: decl.studio.writes } : {},
		stage_view: stageViewDeclaration(res.card) ?? null,
		...decl?.familyLaw !== void 0 ? { familyLaw: decl.familyLaw } : {},
		outputs: def.flowKinds.outputs,
		schema: servedEnvelope(schemas.schema, res.card),
		service: res.service,
		size: surface.size === "huge" ? "huge" : null,
		variants: decl ? specVariants(decl, key) : [],
		...decl !== null && (decl.params !== void 0 || decl.relations !== void 0 || decl.bounds !== void 0 || (decl.variants ?? []).some((v) => v.params !== void 0 || v.relations !== void 0 || v.bounds !== void 0 || v.sampler_envelope !== void 0 || (v.cells ?? []).some((c) => c.params !== void 0))) ? { lanes: laneContractOf(decl) } : {},
		packs: svc.packPresence(def.requiresByFamily?.[key] ?? def.requires ?? []),
		families: [...new Set((def.boarded ?? []).map((fam) => owningAtom(fam)))].filter((atom) => {
			if (atom === key) return true;
			let fdecl;
			try {
				fdecl = getModel(atom);
			} catch {
				return true;
			}
			return specVariants(fdecl, atom).length > 0;
		}).map((atom) => ({
			id: atom,
			present: liveMids.has(atom),
			label: familyFace(atom)
		}))
	};
}
/** The forms table (the /v1/forms body — card meta only, no fields).
*  Sorted by (sidebar order, card id) — deterministic. */
function formsTable(defs) {
	const rows = [];
	for (const [id, def] of defs) {
		const sidebar = def.sidebar ?? {
			key: "",
			order: 0
		};
		const boarded = [...def.boarded ?? []];
		rows.push({
			id,
			order: typeof sidebar.order === "number" ? sidebar.order : 0,
			row: {
				label: def.identity?.label ?? id,
				genre: def.identity?.genre ?? "",
				order: sidebar.order,
				plugin: "comfyui",
				sidebar_key: sidebar.key,
				default_service: boarded.length > 0 ? boarded[0] : id,
				hidden: sidebar.hidden === true,
				covers: boarded.length > 0 ? boarded : [id],
				inputs: def.flowKinds.inputs,
				outputs: def.flowKinds.outputs
			}
		});
	}
	rows.sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : 1));
	const out = {};
	for (const r of rows) out[r.id] = r.row;
	return out;
}
/** The kinds arm (the /v1/kinds body — CARD_KINDS in its own
*  alphabetical order, projected to the served seven keys). */
function kindsArm() {
	return { kinds: CARD_KINDS.map((k) => ({
		kind: k.kind,
		runnable: k.runnable,
		executable: k.executable,
		formSpec: k.formSpec,
		compound: k.compound,
		opensStudio: k.opensStudio,
		badgeTone: k.badgeTone
	})) };
}
/** The live card sections (the catalog arm's cards + capabilities —
*  alphabetical by card id). families/default ride boarding
*  (boarded[0] ?? the card itself); principles ride the identity
*  rung. */
function cardSections(defs) {
	const cards = {};
	const capabilities = {};
	for (const id of [...defs.keys()].sort()) {
		const def = defs.get(id);
		const ident = def.identity;
		if (ident === void 0) throw new Error(`catalog: card '${id}' declares no identity`);
		const boarded = [...def.boarded ?? []];
		const df = boarded[0] ?? null;
		const atomFamilies = [...new Set(boarded.map((fam) => owningAtom(fam)))];
		cards[id] = {
			id,
			label: ident.label,
			description: ident.description,
			genre: ident.genre,
			families: atomFamilies,
			principles: [...ident.principles ?? []],
			skills: [],
			has_inference: false,
			has_rubric: false
		};
		capabilities[id] = {
			label: ident.label,
			description: ident.description,
			...df !== null ? {
				default_family: df,
				resolved: {
					family: df,
					model: df,
					params: {}
				}
			} : {},
			families: atomFamilies,
			kind: "generation",
			icon: ident.icon ?? ""
		};
	}
	return {
		cards,
		capabilities
	};
}
/** /v1/card-tools — the 1:1 flow port's picker manifests: one row
* per card package, the manifest shape the old ServicePicker renders
* (name/model/stage_title/description/params_schema with declared
* defaults). Projected from the live card defs via emitParamsSchema
* — the same SSOT the form-spec door rides, never a re-derivation. */
async function cardToolsArm() {
	const defs = await loadCardDefs();
	const out = [];
	for (const id of [...defs.keys()].sort()) {
		const def = defs.get(id);
		const ident = def.identity;
		/* v8 ignore next -- loadCardDefs asserts identity (the m1 wall), so live defs always carry it (2026-09-12) */
		if (ident === void 0) continue;
		const boarded = [...def.boarded ?? []];
		const carrier = def.schemaCarrier ?? def.schema;
		const schema = emitParamsSchema(carrier, boarded);
		const mods = emitModifierKinds(def.mods);
		const lanes = {};
		for (const fam of boarded) {
			const atom = owningAtom(fam);
			if (atom in lanes) continue;
			let fdecl = null;
			try {
				fdecl = getModel(atom);
			} catch {
				fdecl = null;
			}
			if (fdecl !== null && (fdecl.params?.length ?? 0) > 0) lanes[atom] = laneContractOf(fdecl);
		}
		out.push({
			name: id,
			version: 1,
			kind: "generation",
			model: boarded[0] ?? null,
			stage_title: ident.label,
			description: ident.description,
			genre: ident.genre,
			families: [...new Set(boarded.map((fam) => owningAtom(fam)))],
			params_schema: schema,
			...Object.keys(lanes).length > 0 ? { lanes } : {},
			...mods.length > 0 ? { modifiers: mods } : {},
			face_stamp: faceStamp()
		});
	}
	return out;
}
/** The full live catalog section (models/families ride the registry
*  emission; cards/capabilities ride the cards; the vocabulary rides
*  the slot SSOT). The GENERIC MCP card row folds into CARDS with
* the same live census /v1/forms rides (the picker reads this
* section — ONE surface; a row only here is invisible, a row only
* there was). */
function catalogSection(defs, mcpServers = []) {
	const live = buildCatalog(modelIds().map((id) => getModel(id)));
	const { cards, capabilities } = cardSections(defs);
	if (mcpServers.length > 0) cards["mcp"] = {
		id: "mcp",
		label: "MCP (experimental)",
		description: "Spawn a standalone DSH subagent provisioned with the chosen MCP servers’ tools — stack MCP tiles to grant servers, hand it artifacts through Inputs, the Task is its brief.",
		genre: "3d",
		families: [],
		principles: [],
		skills: [],
		has_inference: false,
		has_rubric: false
	};
	return {
		models: live["models"],
		families: live["families"],
		capabilities,
		cards
	};
}
/** /v1/model-catalog — the live catalog section (the OPTED-IN MCP
* servers fold LIVE — the door passes the engines-seat opt-in census
* (error j2: ambient tools presence is not intent), the same read
* formsArm rides; an un-opted lane folds nothing). */
async function modelCatalogArm(mcpServers = []) {
	return catalogSection(await loadCardDefs(), mcpServers);
}
/** /v1/forms — the forms table (card rows + the GENERIC MCP row:
*  ONE engine-served row, id 'mcp' — the subagent-spawn card; the
*  surface the cards tab lists; the census is the caller's OPT-IN
*  fold (error j2), never static and never ambient). */
function formsWithEngines(cardRows, mcpServers) {
	const out = { ...cardRows };
	if (mcpServers.length > 0) out["mcp"] = {
		label: "MCP (experimental)",
		genre: "3d",
		order: 23,
		plugin: "mcp",
		sidebar_key: "3d",
		default_service: "mcp",
		hidden: false,
		covers: ["mcp"],
		inputs: {},
		outputs: { default: "text" }
	};
	return out;
}
/** /v1/forms — the forms table. */
async function formsArm(mcpServers = []) {
	return formsWithEngines(formsTable(await loadCardDefs()), mcpServers);
}
/** /v1/kinds — the kinds arm. */
async function kindsDoorArm() {
	return kindsArm();
}
/** /v1/form-spec?model=<key> — the envelope, or null when the key
*  does not resolve (the door 404s, same body as ever). A model
*  FAMILY name against an unbooted table THROWS the table's own
*  refusal (never a 404 — the census-arm split, 2026-10-13). */
async function formSpecArm(model, engineDocs, engineLoras) {
	const buildEngine = engineDocs?.get(model);
	if (buildEngine !== void 0) {
		const engineDoc = buildEngine();
		if (!isFormSpecDoc(engineDoc)) throw new Error(`form-spec: engine '${model}' built a form doc without a form name / malformed schema envelope`);
		return engineDoc;
	}
	if (model === "mcp" || model.startsWith("mcp:")) return null;
	const defs = await loadCardDefs();
	const res = resolveSpecKey(model, defs, boardedMap(defs));
	if (res === null) return null;
	return specBody(theService(), defs, res, await engineLoras);
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
* `{ quiet: true }` (the preference arm): an unresolvable or
* ambiguous name returns undefined instead of throwing — a
* preference is an ordered candidate, so the caller skips to its
* next arm; every resolve rule above is unchanged.
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
function matchHarnessRoute(routes, want, opts) {
	const exact = routes.find((r) => routeName(r) === want);
	if (exact) return exact;
	const bare = routes.filter((r) => r.model === want);
	if (bare.length === 1) return bare[0];
	if (bare.length > 1) {
		if (opts?.quiet === true) return void 0;
		throw new Error("enhance: ambiguous llm \"" + want + "\" — advertised by " + bare.map(routeName).join(", ") + "; name provider/model");
	}
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
	if (opts?.quiet === true) return void 0;
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
*   - preference (operator order, "muse-spark-1.3-contributor i
*     want to use over glm-5v-turbo"): a route name the door
*     prefers BETWEEN explicit and the host default. An ordered
*     candidate, not a contract — a name that does not resolve
*     against the live list is SKIPPED (the default arm serves);
*     a named-live preference that fails to complete is still the
*     honest 502 (no step-past, ever).
*   - unresolvable name → throw naming the live routes (the route
*     maps explicit→400, stale default→502).
*   - the ONE route completes; its failure is the honest error
*     (502 naming route + cause) — never a silent other model.
*
* `via` echoes the serving route. This is the keystore era's shape
* (one configured model, loud otherwise) with the model resolved
* from the host default instead of the retired keystore.
*/
async function harnessEnhance(llm, req, defaultLlm, preference) {
	const routes = await resolveHarnessRoutes(llm);
	const explicit = typeof req.llm === "string" && req.llm.length > 0 ? req.llm : void 0;
	if (explicit !== void 0) {
		const route = matchHarnessRoute(routes, explicit);
		return {
			...parseEnhanceJson(await harnessCompleteOnRoute(llm, route, req)),
			via: routeName(route)
		};
	}
	if (typeof preference === "string" && preference.length > 0) {
		const preferred = matchHarnessRoute(routes, preference, { quiet: true });
		if (preferred !== void 0) return {
			...parseEnhanceJson(await harnessCompleteOnRoute(llm, preferred, req)),
			via: routeName(preferred)
		};
	}
	if (typeof defaultLlm === "string" && defaultLlm.length > 0) {
		const route = matchHarnessRoute(routes, defaultLlm);
		return {
			...parseEnhanceJson(await harnessCompleteOnRoute(llm, route, req)),
			via: routeName(route)
		};
	}
	throw new Error("enhance: no llm named and no host default configured — name llm (\"provider/model\") or set the host default model");
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
export { seatFamilyForPath as _, MODIFIER_PACKS as a, engineLorasListing as c, kindsDoorArm as d, modelCatalogArm as f, makeEstateRequest as g, makeEstate as h, routeName as i, formSpecArm as l, asEstateCall as m, matchHarnessRoute as n, boardedMap as o, resolveSpecKeyForTool as p, resolveHarnessRoutes as r, cardToolsArm as s, harnessEnhance as t, formsArm as u };
