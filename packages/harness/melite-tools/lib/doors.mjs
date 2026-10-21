import { _ as seatFamilyForPath, c as engineLorasListing, d as kindsDoorArm, f as modelCatalogArm, g as makeEstateRequest, i as routeName, l as formSpecArm, r as resolveHarnessRoutes, s as cardToolsArm, t as harnessEnhance, u as formsArm } from "./llm-complete-DGKO2XNO.mjs";
import { remoteErrorOf } from "@deepseek-ai/dsh-typert-protocol";
import { buildSkillIndex, disclosureRoot } from "@melite/estate-queue";
import { loadEndpointConfig, resolveEngineBaseUrl, sdkClient } from "@melite/comfyui-cordis";
import { LORA_BYTES_CAP } from "@melite/comfyui-cordis/user-loras";
import { contentTypeForArtifact, segmentConfined } from "@melite/contracts/mediaKinds";
import { agentCardFormDoc, agentFormDoc } from "@melite/engine-agent";
import { craftFormDoc } from "@melite/engine-craft";
import { mcpFormDoc } from "@melite/engine-mcp/formDoc";
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
function enhanceOneField(llm, recipe, prompt, temperature, signal, llmWant, defaultLlm, preference) {
	return harnessEnhance(llm, {
		system: recipe,
		prompt,
		temperature,
		signal,
		...llmWant !== void 0 && llmWant.length > 0 ? { llm: llmWant } : {}
	}, defaultLlm, preference);
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
	for (const name of names) results[name] = await enhanceOneField(llm, fields[name], opts.prompt, opts.temperature, opts.signal, opts.llmWant, opts.defaultLlm, opts.preference);
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
/** The shipped default: the operator's named card model. */
const DEFAULT_ENHANCE_PREFERENCE = "muse-spark-1.3-contributor";
/** The seated MCP servers (folded LIVE from the tools seat's
*  schemas: every mcp__<server>__<tool> name contributes its
*  server; sorted for deterministic serving). Empty when none are
*  seated — the census IS the truth, never a config copy. */
function seatedMcpServers(c) {
	const servers = /* @__PURE__ */ new Set();
	for (const t of c.tools.schemas()) {
		if (!t.name.startsWith(MCP_WIRE_PREFIX)) continue;
		const rest = t.name.slice(MCP_WIRE_PREFIX.length);
		const cut = rest.indexOf("__");
		if (cut <= 0) continue;
		servers.add(rest.slice(0, cut));
	}
	return [...servers].sort();
}
/** The wire prefix of an mcp tool name (the executor composes the
*  same string — one spelling, here). */
const MCP_WIRE_PREFIX = "mcp__";
/** The prefix of an opted-in MCP engine id (the engines contract's
*  own vocabulary: `mcp:<server>` — packages/engines/contract's
*  ENGINE ID GRAMMAR; the seat's engineIdOk refuses a bare `mcp:`
*  at registration, so it never reaches this census). */
const MCP_ENGINE_PREFIX = "mcp:";
/** The raw opt-in read: the 'engines' seat's ids (null when the seat
*  is absent, its ids face is not a function, or the read is not an
*  array — the caller folds nothing on null). */
function probeMcpEngines(c) {
	const seat = c.get("engines");
	if (seat == null || typeof seat.ids !== "function") return null;
	const listed = seat.ids();
	if (!Array.isArray(listed)) return null;
	return listed.filter((id) => typeof id === "string" && id.startsWith(MCP_ENGINE_PREFIX)).map((id) => id.slice(4)).sort();
}
/** The OPTED-IN MCP servers (the estate's own engines seat: the
*  config's mcpEngines field seats ids 'mcp:<server>' — the
*  2026-10-12 operator law makes the MCP card EXPERIMENTAL OPT-IN,
*  so /v1/forms + /v1/model-catalog fold the card on the estate's
*  opt-in, NEVER on the ambient tools census: the operator's DSH
*  lane always carries harness mcp__<server>__<tool> schemas, and
*  ambient presence is not intent (error j2,
*  dev_docs/ERRORS.md:86). The card's TILES (the MCPs plus-box —
*  mcpToolsOf) and the per-server form-spec docs ride the ambient
*  seatedMcpServers still: the spawned subagent is a DSH harness
*  spawn, ambient servers are what it can actually be granted — only
*  the card's PRESENCE is opt-in. The probe never propagates: a
*  throw from get() or ids() folds nothing (the doors 200 with no
*  card rather than 500 on a half-mounted seat). */
function seatedMcpEngines(c) {
	try {
		return probeMcpEngines(c) ?? [];
	} catch {
		return [];
	}
}
/** One server's tool rows (the LIVE census for its form's options:
*  bare tool names — the executor composes mcp__<server>__<tool>
*  on the wire). */
function mcpToolsOf(c, server) {
	const prefix = `${MCP_WIRE_PREFIX}${server}__`;
	return c.tools.schemas().filter((t) => t.name.startsWith(prefix)).map((t) => ({
		value: t.name.slice(prefix.length),
		label: t.name.slice(prefix.length),
		tooltip: t.description
	}));
}
/** THE PENDING GRACE (the 3088 brick, 2026-09-26 — live proof: a
* fiber stuck mid-transition held the pending gate closed for 10
* hours while every non-seat door served fine). "Still activating"
* is a BOOT-RACE answer, but the state is cheap to observe and
* GLOBAL: any ONE wedged fiber (a failed plugin-tree reload, a hung
* MCP seat handshake) would brick every seat door forever. The
* stamp starts when the state is first observed and clears when it
* lifts; past ESTATE_PENDING_GRACE_MS the state is a WEDGE, not an
* activation — the gate opens and the seat probe's own honest voice
* answers (serve, or the missing-seat 502 naming the family). */
const ESTATE_PENDING_GRACE_MS = 12e4;
/** THE RE-ARM QUIET (li-l, the flap brick): a fiber cycling
*  activating→ready→activating (the multi-host blender-seat
*  collision, live proof 2026-10-10: three mcp_server.py children
*  from three hosts, 3379 remounts in one log) reset the stamp to
*  null on every momentary lift and held the gate closed FOREVER.
*  The stamp now lifts only after a SUSTAINED quiet — flapping
*  cannot extend the grace window. Exported for the re-arm wall
*  (a later boot race gets a fresh window: doors.spec.ts). */
const ESTATE_PENDING_REARM_MS = 1e4;
const estateStillActivating = (gate, c) => {
	let activating = false;
	for (const runtime of c.registry.values()) for (const fiber of runtime.fibers) if (fiber.uid !== null && (fiber.store === void 0 || fiber.inertia !== void 0)) activating = true;
	if (!activating) {
		if (gate.quietSince === null) gate.quietSince = Date.now();
		if (gate.pendingSince !== null && Date.now() - gate.quietSince >= 1e4) gate.pendingSince = null;
		return false;
	}
	gate.quietSince = null;
	if (gate.pendingSince === null) gate.pendingSince = Date.now();
	return Date.now() - gate.pendingSince < ESTATE_PENDING_GRACE_MS;
};
const POSER_ARMS = [
	{
		doorPath: "/v1/poser/mesh",
		enginePath: "/poser/skin/mesh",
		methods: ["GET", "POST"],
		timeoutMs: 12e4
	},
	{
		doorPath: "/v1/poser/identity-space",
		enginePath: "/poser/skin/identity-space",
		methods: ["GET"],
		timeoutMs: 3e4
	},
	{
		doorPath: "/v1/poser/presets",
		enginePath: "/poser/presets",
		methods: ["GET"],
		timeoutMs: 3e4
	},
	{
		doorPath: "/v1/poser/render",
		enginePath: "/poser/render",
		methods: ["POST"],
		timeoutMs: 12e4
	}
];
/** The poser arms' engine call: the SDK client's fetchApi to the
*  resolved engine base, the door's JSON contract on every
*  refusal. A JSON result serves through ok(); the render arm's
*  PNG serves bytes raw. */
const poserEngineCall = (arm, search, body, contentType, ok, serveBytes, fail) => {
	let base;
	try {
		base = resolveEngineBaseUrl();
	} catch (error) {
		fail(502, { error: `poser: no comfyui endpoint (${error instanceof Error ? error.message : /* v8 ignore next -- resolveEngineBaseUrl throws Errors only (2026-09-16) */ String(error)})` });
		return;
	}
	sdkClient(base).fetchApi(arm.enginePath + search, {
		method: body === null ? "GET" : "POST",
		body: body ?? void 0,
		headers: { "content-type": contentType },
		signal: AbortSignal.timeout(arm.timeoutMs)
	}).then(async (r) => {
		if (!(r.headers.get("content-type") ?? "").includes("json")) {
			serveBytes(r.status, Buffer.from(await r.arrayBuffer()));
			return;
		}
		const text = await r.text();
		ok(text === "" ? {} : JSON.parse(text));
	}).catch((error) => fail(502, { error: `poser: engine unreachable (${error instanceof Error ? error.message : /* v8 ignore next -- the SDK rejects with Errors only (2026-09-16) */ String(error)})` }));
};
function apply(c, config = {}) {
	const pendingGate = {
		pendingSince: null,
		quietSince: null
	};
	const readDefaultLlm = () => {
		try {
			const sel = c.get("agentDefaultModel")?.currentSelection?.();
			if (typeof sel?.provider === "string" && typeof sel?.model === "string") return sel.provider + "/" + sel.model;
		} catch {}
	};
	/** The card LLM preference as configured, else the shipped default.
	*  An explicit empty string DISABLES the preference arm (the
	*  profile pins pure host-default behavior); unset rides the
	*  operator's default. */
	const preferenceOf = (cfg) => {
		if (cfg.enhancePreference !== void 0) return cfg.enhancePreference.length > 0 ? cfg.enhancePreference : void 0;
		return DEFAULT_ENHANCE_PREFERENCE;
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
					defaultLlm: readDefaultLlm(),
					preference: preferenceOf(config)
				}).then((result) => respond(200, result)).catch(mapEnhanceError);
			}
			if (typeof body.system_prompt !== "string" || body.system_prompt.length === 0) return respond(400, { error: "either model (agent sweep) or system_prompt (one-shot) is required" });
			harnessEnhance(c.llm, {
				system: body.system_prompt,
				prompt: body.prompt,
				temperature,
				...llmWant !== void 0 ? { llm: llmWant } : {}
			}, readDefaultLlm(), preferenceOf(config)).then((result) => respond(200, result)).catch(mapEnhanceError);
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
	const SEG = (name) => !name.includes("/") && !name.includes("\\") && segmentConfined(name);
	{
		const inputDir = async () => {
			const path = await import("node:path");
			const { resolveRepoRoot } = await import("@melite/comfyui-cordis");
			const dir = path.join(resolveRepoRoot(), "data", "input");
			await (await import("node:fs/promises")).mkdir(dir, { recursive: true });
			return dir;
		};
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
					if (!SEG(filename)) return fail(400, "uploads: bad filename");
					const meshName = /\.glb$/i.test(filename) || /\.gltf$/i.test(filename);
					const b64 = /^data:(?:(image|video|audio)\/[a-z0-9.+-]+|model\/gltf(?:-binary|\+json)|(application\/octet-stream));base64,(.+)$/.exec(data);
					if (b64 === null || b64[2] !== void 0 && !meshName) return fail(400, "uploads: only image / video / audio / glb / gltf upload");
					const bytes = Buffer.from(b64[3], "base64");
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
					const url = new URL(req.url ?? "/", "http://melite.invalid");
					let name;
					try {
						name = decodeURIComponent(url.pathname.slice(18));
					} catch {
						return fail(400, "bad input name");
					}
					if (!SEG(name)) return fail(400, "bad input name");
					const dir = await inputDir();
					const path = await import("node:path");
					const fs = await import("node:fs/promises");
					const file = path.join(dir, name);
					const real = await fs.realpath(file).catch(() => void 0);
					const realDir = await fs.realpath(dir);
					if (real === void 0 || !real.startsWith(realDir + path.sep)) return fail(404, "no such input");
					const bytes = await fs.readFile(file);
					res.writeHead(200, {
						"content-type": contentTypeForArtifact(name),
						"content-length": String(bytes.byteLength)
					});
					res.end(bytes);
				})().catch((e) => fail(500, "inputs: " + (e instanceof Error ? e.message : /* v8 ignore next -- fs throws Errors only (2026-09-12) */ String(e))));
			}
		}), "melite-tools: input preview");
	}
	c.effect(() => c.webServer.register({
		kind: "exact",
		path: "/v1/uploads/lora",
		handler: (req, res) => {
			const fail = (code, err) => {
				const body = JSON.stringify({ error: err });
				res.writeHead(code, { "content-type": "application/json" });
				res.end(body);
			};
			(async () => {
				if (req.method !== "POST") return fail(405, "the lora door takes POST (raw bytes)");
				const type = String(req.headers["content-type"] ?? "");
				if (!/^application\/octet-stream/i.test(type)) return fail(415, "the lora door takes application/octet-stream (raw bytes — no base64)");
				const url = new URL(req.url ?? "/", "http://melite.invalid");
				let filename;
				try {
					filename = decodeURIComponent(url.searchParams.get("filename") ?? "");
				} catch {
					return fail(400, "bad filename");
				}
				if (filename === "" || !SEG(filename)) return fail(400, "the lora door needs a one-segment filename");
				const families = (url.searchParams.get("families") ?? "").split(",").map((f) => f.trim()).filter((f) => f !== "");
				if (families.some((f) => !/^[a-z0-9][a-z0-9-]*$/i.test(f))) return fail(400, "families must be comma-separated family ids");
				const declared = Number(req.headers["content-length"] ?? "");
				if (!Number.isFinite(declared) || declared <= 0) return fail(411, "the lora door needs a declared content-length (the cap is checked pre-read)");
				if (declared > LORA_BYTES_CAP) return fail(413, `the LoRA is over the ${Math.round(LORA_BYTES_CAP / 1048576)}MB door cap — copy it in from the machine instead (lora_install with a path)`);
				const { resolveEngineLorasDir, installUserLoraBuffer } = await import("@melite/comfyui-cordis/user-loras");
				const dir = resolveEngineLorasDir(loadEndpointConfig());
				if (dir === null) return fail(502, "the loras install dir is undeclared — set MELITE_COMFYUI_LORAS_DIR or the endpoint model_base_path (never guessed)");
				const bytes = await readBody(req);
				const landed = installUserLoraBuffer(filename, bytes, dir);
				if (!landed.ok) return fail(422, landed.reason);
				const out = JSON.stringify({
					filename: landed.filename,
					bytes: landed.bytes,
					install_dir: dir,
					next_action: "restart",
					restart_required: true,
					row_suggestion: {
						id: landed.filename.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9]+/g, "_"),
						filename: landed.filename,
						families,
						default_strength: 1
					}
				});
				res.writeHead(200, { "content-type": "application/json" });
				res.end(out);
			})().catch((e) => fail(500, "lora door: " + (e instanceof Error ? e.message : String(e))));
		}
	}), "melite-tools: binary lora door");
	c.effect(() => c.webServer.register({
		kind: "prefix",
		path: "/v1",
		handler: (req, res) => {
			const connection = c.get("connection");
			let rejection;
			try {
				rejection = connection?.requestRejection?.({ headers: req.headers });
			} catch (e) {
				const message = "connection/rejected: " + (e instanceof Error ? e.message : String(e));
				res.writeHead(500, {
					"content-type": "application/json",
					"content-length": String(Buffer.byteLength(message))
				});
				res.end(Buffer.from(message));
				return;
			}
			if (rejection !== void 0) {
				const body = JSON.stringify({
					error: "connection/" + (rejection === 403 ? "untrusted-request" : "unauthenticated"),
					status: rejection
				});
				res.writeHead(rejection, {
					"content-type": "application/json",
					"content-length": String(Buffer.byteLength(body))
				});
				res.end(Buffer.from(body));
				return;
			}
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
			/** The estate lanes' error map (the false-death fix, 2026-10-08,
			*  corrected twice — the second critique caught bench/
			*  store-failed defaulting to 400 and ~20 codes classified
			*  only by silence): a day-long hunt read every 502 as a dead
			*  runs seat — the 502s were seat REFUSALS, wrong bodies and
			*  boot-settle races, on a healthy lane. A named protocol
			*  refusal means the seat ANSWERED — never the absent-seat
			*  502 — and the failure's own details ride in the body
			*  verbatim (loc, per-stage errors, the manage envelope's
			*  action/status/data). THE COMPLETE CLASS INVENTORY — every
			*  code declared by the protocol's seats is named below, none
			*  rides the default silently:
			*   - 400 caller-fault — body/shape/refusal voices: the runs/
			*     family (bad-envelope, draft-required, draft-malformed,
			*     draft-unknown, invalid-request, preview-scope,
			*     flow-compile, workflow-pin, card-compose) — ALL raised
			*     from CardArmError(400) voices; lane-input-missing (the
			*     named asset has no store copy — the request is
			*     unexecutable as sent; the body carries the fetch URL);
			*     bench bad-body/bad-wire/self-wire/dead-wire (shape
			*     refusals); draft bad-id/bad-patch/bad-stage-id/
			*     patch-unknown-keys; media/kind; gateway/bad-request.
			*   - 404 not-found — runs/unknown-run, runs/run-unknown,
			*     bench/not-found, bench/stage-not-found,
			*     bench/wire-stage-not-found (a named thing absent),
			*     bench/nothing-to-undo (no live action matches the walk),
			*     draft/not-found.
			*   - 409 conflict — bench/cas-conflict (carries current_rev),
			*     bench/overwrite-required (the load's own overwrite law),
			*     bench/duplicate-stage.
			*   - 502 infra — the storage layer refused while the call was
			*     valid: bench/store-failed, draft/store-failed,
			*     draft/cannot-persist, media/no-seat, gateway/internal,
			*     gateway/cancelled.
			*   - manage/refused → the ENVELOPE's own details.status
			*     (the manage plane always sets one; a missing/garbage
			*     status is the SEAT's bug, not the caller's request —
			*     500, never 400).
			*  A code NOT in the table defaults to 400 — the honest class
			*  for an unknown future refusal (the seat answered; the body
			*  carries the code for discrimination), and every code the
			*  protocol declares today IS in the table. */
			const REFUSAL_STATUS = {
				"runs/unknown-run": 404,
				"runs/run-unknown": 404,
				"bench/not-found": 404,
				"bench/stage-not-found": 404,
				"bench/wire-stage-not-found": 404,
				"bench/nothing-to-undo": 404,
				"draft/not-found": 404,
				"bench/cas-conflict": 409,
				"bench/overwrite-required": 409,
				"bench/duplicate-stage": 409,
				"bench/store-failed": 502,
				"draft/store-failed": 502,
				"draft/cannot-persist": 502,
				"media/no-seat": 502,
				"gateway/internal": 502,
				"gateway/cancelled": 502
			};
			const failEstate = (error) => {
				const remote = remoteErrorOf(error);
				const message = error instanceof Error ? error.message : String(error);
				if (remote !== void 0) {
					let status = REFUSAL_STATUS[remote.code] ?? 400;
					const details = remote.details;
					const body = {};
					if (typeof details === "object" && details !== null) Object.assign(body, details);
					body["error"] = message;
					body["code"] = remote.code;
					if (remote.code === "manage/refused") {
						const envelopeStatus = details?.status;
						status = typeof envelopeStatus === "number" && Number.isInteger(envelopeStatus) && envelopeStatus >= 400 && envelopeStatus <= 599 ? envelopeStatus : 500;
					}
					fail(status, body);
					return;
				}
				fail(502, { error: message });
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
						modelCatalogArm(seatedMcpEngines(c)).then(ok, (e) => fail(500, { error: `discovery door: ${e instanceof Error ? e.message : String(e)}` }));
						return;
					}
					if (method === "GET" && path === "/v1/forms") {
						formsArm(seatedMcpEngines(c)).then(ok, (e) => fail(500, { error: `discovery door: ${e instanceof Error ? e.message : String(e)}` }));
						return;
					}
					if (method === "GET" && path === "/v1/kinds") {
						kindsDoorArm().then(ok, (e) => fail(500, { error: `discovery door: ${e instanceof Error ? e.message : String(e)}` }));
						return;
					}
					const poserArm = POSER_ARMS.find((a) => a.doorPath === path);
					if (poserArm !== void 0) {
						if (!poserArm.methods.includes(method)) {
							fail(405, {
								error: `poser: ${method} not allowed on ${path}`,
								allow: poserArm.methods.join(", ")
							});
							return;
						}
						if (method === "GET" && poserArm.doorPath !== "/v1/poser/presets") {
							if ((url.searchParams.get("identity_model") ?? "").length === 0) {
								fail(400, { error: "poser: the identity_model query parameter is required" });
								return;
							}
						}
						const serveBytes = (status, bytes) => {
							res.writeHead(status, {
								"content-type": "application/octet-stream",
								"content-length": String(bytes.byteLength)
							});
							res.end(bytes);
						};
						if (method === "POST") {
							readBody(req).then((buf) => {
								let parsed = {};
								try {
									parsed = buf.length > 0 ? JSON.parse(buf.toString("utf8")) : {};
								} catch {
									fail(400, { error: "poser: body must be JSON" });
									return;
								}
								if (poserArm.doorPath === "/v1/poser/mesh" && (typeof parsed["identity_model"] !== "string" || parsed["identity_model"].length === 0)) {
									fail(400, { error: "poser: identity_model (string) is required in the body" });
									return;
								}
								const ct = (Array.isArray(req.headers["content-type"]) ? req.headers["content-type"][0] : req.headers["content-type"]) ?? "application/json";
								poserEngineCall(poserArm, url.search, buf, ct, ok, serveBytes, fail);
							}).catch((error) => fail(400, { error: `poser: body read failed (${error instanceof Error ? error.message : String(error)})` }));
							return;
						}
						poserEngineCall(poserArm, url.search, null, "application/json", ok, serveBytes, fail);
						return;
					}
					if (method === "GET" && path === "/v1/form-spec") {
						const model = url.searchParams.get("model") ?? "";
						if (model.length === 0) return fail(400, { error: "form-spec: the model query parameter is required" });
						const servers = [...seatedMcpServers(c)];
						const skillCensus = () => {
							const idx = buildSkillIndex(disclosureRoot());
							return [...idx.families.flatMap((f) => f.entrance === null ? [] : [{
								value: f.entrance,
								label: f.id
							}]), ...idx.cards.flatMap((c2) => c2.entrance === null ? [] : [{
								value: c2.entrance,
								label: c2.id
							}])];
						};
						const mcpCensus = servers.map((v) => ({
							value: v,
							label: v
						}));
						const engineDocs = /* @__PURE__ */ new Map([["agent", () => agentFormDoc({
							mcps: mcpCensus,
							skills: skillCensus()
						})], ["craft", () => craftFormDoc()]]);
						if (servers.length > 0) engineDocs.set("mcp", () => agentCardFormDoc({
							mcps: mcpCensus,
							skills: skillCensus()
						}));
						for (const server of servers) engineDocs.set(`mcp:${server}`, () => mcpFormDoc({
							server,
							tools: mcpToolsOf(c, server),
							servers
						}));
						formSpecArm(model, engineDocs, engineLorasListing()).then((spec) => {
							if (spec === null) return fail(404, { error: `form-spec: '${model}' does not resolve (unknown, unoffered, or retired)` });
							return ok(spec);
						}, (e) => fail(500, { error: `discovery door: ${e instanceof Error ? e.message : String(e)}` }));
						return;
					}
				} catch (error) {
					return fail(500, { error: `discovery door: ${error instanceof Error ? error.message : /* v8 ignore next -- the try body throws Errors only (URL/arms are sync-Error sites, 2026-09-12) */ String(error)}` });
				}
				const pathWithQuery = url.pathname + url.search;
				if (seatFamilyForPath(path).probeNames.length > 0 && estateStillActivating(pendingGate, c)) return fail(503, {
					error: "estate composition is still activating",
					code: "estate/pending",
					pending: true
				});
				const request = makeEstateRequest(c);
				if (method === "POST") {
					readBody(req).then((buf) => {
						let body;
						try {
							body = buf.length > 0 ? JSON.parse(buf.toString("utf8")) : {};
						} catch {
							return fail(400, { error: "body must be JSON" });
						}
						if (body === null || typeof body !== "object" || Array.isArray(body)) return fail(400, { error: `seat lane: POST ${path} needs a JSON object body (got ${body === null ? "null" : Array.isArray(body) ? "an array" : `a ${typeof body}`})` });
						request(method, pathWithQuery, body, signal, 12e4).then((value) => ok(value)).catch(failEstate);
					}).catch((error) => fail(400, { error: `body read failed: ${error instanceof Error ? error.message : String(error)}` }));
					return;
				}
				request(method, pathWithQuery, void 0, signal, 12e4).then((value) => ok(value)).catch(failEstate);
			};
			return serve();
		}
	}), "melite-tools: /v1 prefix door");
}
//#endregion
export { DEFAULT_ENHANCE_PREFERENCE, ESTATE_PENDING_GRACE_MS, ESTATE_PENDING_REARM_MS, apply, inject, mcpToolsOf, seatedMcpEngines, seatedMcpServers };
