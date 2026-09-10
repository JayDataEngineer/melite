window.__ModuleLoader__.load({
	id: "@melite-plugin/dsh-card-view",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		require("@deepseek-ai/cordis");
		//#region src/client/apply-guard.ts
		/** Claims the plugin apply slot. Returns true when this call won the slot. */
		function claimCardViewApply() {
			if (globalThis.__rayCardViewApplied === true) return false;
			globalThis.__rayCardViewApplied = true;
			return true;
		}
		/** Releases the claim so a hot-reloaded bundle can claim again in-page. */
		function releaseCardViewApply() {
			globalThis.__rayCardViewApplied = void 0;
		}
		//#endregion
		//#region \0dsh-css:melite-card-view/src/client/card.module.css.mjs
		const css = ".vYZV7a_card{flex-direction:column;min-width:0;margin:4px 0;font-size:12px;line-height:1.45;display:flex}.vYZV7a_load{color:var(--dsw-alias-label-secondary,#9a9aa5);padding:2px 0}.vYZV7a_head{align-items:center;gap:8px;min-width:0;display:flex}.vYZV7a_model{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-weight:600;overflow:hidden}.vYZV7a_state{border-radius:999px;flex:none;margin-left:auto;padding:1px 8px}.vYZV7a_state[data-state=completed]{color:var(--dsw-alias-state-success-primary,#3fb96f)}.vYZV7a_state[data-state=running],.vYZV7a_state[data-state=queued],.vYZV7a_state[data-state=pending],.vYZV7a_state[data-state=starting],.vYZV7a_state[data-state=draft]{color:var(--dsw-alias-state-warn-primary,#d9a53f)}.vYZV7a_state[data-state=failed],.vYZV7a_state[data-state=error],.vYZV7a_state[data-state=stopped],.vYZV7a_state[data-state=interrupted]{color:var(--dsw-alias-state-error-primary,#e05656)}.vYZV7a_prompt{color:var(--dsw-alias-text-secondary,#9a9aa5);-webkit-line-clamp:2;-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden}.vYZV7a_link:hover{text-decoration:underline}.vYZV7a_row{color:inherit;cursor:pointer;font:inherit;text-align:left;background:0 0;border:none;border-radius:6px;align-items:center;gap:8px;width:100%;min-width:0;padding:4px 6px;display:flex}.vYZV7a_row:hover{background:var(--dsw-alias-interactive-bg-hover-subtle,#ffffff0d)}.vYZV7a_row:focus-visible{outline:1px solid var(--dsw-alias-state-business-primary,#4f7bd8);outline-offset:-1px}.vYZV7a_thumb{object-fit:cover;border-radius:4px;flex:none;width:34px;height:34px}.vYZV7a_rowTitle{text-overflow:ellipsis;white-space:nowrap;flex:none;max-width:40%;font-weight:600;overflow:hidden}.vYZV7a_drill{width:92vw;max-width:min(860px,92vw)}.vYZV7a_split{grid-template-columns:minmax(240px,1fr) minmax(0,1.2fr);gap:14px;min-width:0;display:grid}@media (width<=640px){.vYZV7a_split{grid-template-columns:1fr}}.vYZV7a_params{flex-direction:column;gap:8px;min-width:0;max-height:60vh;display:flex;overflow-y:auto}.vYZV7a_field{flex-direction:column;gap:3px;min-width:0;display:flex}.vYZV7a_fieldKey{color:var(--dsw-alias-label-secondary,#9a9aa5);font-size:11px}.vYZV7a_outputs{flex-direction:column;align-items:center;gap:10px;min-width:0;display:flex}.vYZV7a_outputImg{object-fit:contain;border-radius:8px;max-width:100%;max-height:46vh}.vYZV7a_runRow{justify-content:flex-end;align-items:center;gap:10px;width:100%;display:flex}.vYZV7a_runError{color:var(--dsw-alias-label-error,#e05656);overflow-wrap:anywhere;font-size:11px}.vYZV7a_state[data-state=legacy]{color:var(--dsw-alias-label-secondary,#9a9aa5)}";
		const tagId = "@melite-plugin/dsh-card-view/card.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite-plugin/dsh-card-view";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var card_module_css_default = {
			"card": "vYZV7a_card",
			"drill": "vYZV7a_drill",
			"field": "vYZV7a_field",
			"fieldKey": "vYZV7a_fieldKey",
			"head": "vYZV7a_head",
			"link": "vYZV7a_link",
			"load": "vYZV7a_load",
			"model": "vYZV7a_model",
			"outputImg": "vYZV7a_outputImg",
			"outputs": "vYZV7a_outputs",
			"params": "vYZV7a_params",
			"prompt": "vYZV7a_prompt",
			"row": "vYZV7a_row",
			"rowTitle": "vYZV7a_rowTitle",
			"runError": "vYZV7a_runError",
			"runRow": "vYZV7a_runRow",
			"split": "vYZV7a_split",
			"state": "vYZV7a_state",
			"thumb": "vYZV7a_thumb"
		};
		//#endregion
		//#region ../../web-kit/catalog/src/FlowEvents.ts
		const TERMINAL = /* @__PURE__ */ new Set([
			"completed",
			"failed",
			"stopped",
			"unknown"
		]);
		const BACKOFF_BASE_MS = 500;
		const BACKOFF_CAP_MS = 5e3;
		/**
		* Open the events stream for one run. Returns immediately; frames land
		* in `onEvent`. Auto-reconnects with capped backoff until a terminal
		* `run` frame, an explicit close, or `signal` aborts.
		*/
		function streamFlowEvents(runId, onEvent, opts = {}) {
			let ws = null;
			let terminal = false;
			let closed = false;
			let attempt = 0;
			let timer = null;
			const cleanup = () => {
				if (timer) clearTimeout(timer);
				timer = null;
				if (ws) {
					ws.onmessage = null;
					ws.onclose = null;
					ws.onerror = null;
					try {
						ws.close();
					} catch {}
					ws = null;
				}
			};
			const finish = () => {
				terminal = true;
				cleanup();
			};
			const connect = () => {
				if (closed || terminal) return;
				if (typeof WebSocket === "undefined") return;
				const proto = typeof location !== "undefined" && location.protocol === "https:" ? "wss" : "ws";
				const host = typeof location !== "undefined" ? location.host : "";
				try {
					ws = new WebSocket(`${proto}://${host}/v1/flows/events?run_id=${encodeURIComponent(runId)}`);
				} catch {
					return;
				}
				ws.onmessage = (ev) => {
					if (closed || terminal) return;
					attempt = 0;
					let frame = null;
					try {
						frame = JSON.parse(String(ev.data));
					} catch {
						return;
					}
					if (!frame || typeof frame !== "object" || typeof frame.type !== "string") return;
					onEvent(frame);
					if (frame.type === "run" && TERMINAL.has(String(frame.status))) finish();
				};
				ws.onclose = () => {
					if (closed || terminal) return;
					const wait = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** attempt++);
					timer = setTimeout(connect, wait);
				};
				ws.onerror = () => {};
			};
			connect();
			if (opts.signal) opts.signal.addEventListener("abort", () => {
				closed = true;
				cleanup();
			}, { once: true });
			return {
				close: () => {
					closed = true;
					cleanup();
				},
				done: () => terminal
			};
		}
		//#endregion
		//#region src/client/draft.ts
		function jsonBody(res, what) {
			return res.json().catch(() => {
				throw new Error(`${what}: malformed JSON (HTTP ${res.status})`);
			});
		}
		/** GET the draft doc; throws with the door's own name on failure. */
		async function fetchDraft(fetchImpl, draftId) {
			const res = await fetchImpl("/v1/flows/drafts/" + encodeURIComponent(draftId));
			const doc = await jsonBody(res, "draft GET");
			if (!res.ok) {
				const err = doc.error;
				throw new Error(typeof err === "string" && err !== "" ? err : `draft GET failed: HTTP ${res.status}`);
			}
			if (typeof doc["draft_id"] !== "string" || !Array.isArray(doc["stages"])) throw new Error("draft GET: not a draft doc");
			return doc;
		}
		/** PATCH one stage's params (the editor's resultOutbox door, param edits only). */
		async function patchStageParams(fetchImpl, draftId, stageId, params) {
			const res = await fetchImpl("/v1/flows/drafts/" + encodeURIComponent(draftId) + "/stages/" + encodeURIComponent(stageId), {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ params })
			});
			if (!res.ok) {
				const err = (await jsonBody(res, "stage PATCH").catch(() => null))?.["error"];
				throw new Error(typeof err === "string" && err !== "" ? err : `stage PATCH failed: HTTP ${res.status}`);
			}
		}
		/** POST the run; returns {run_id} or throws the door's named refusal. */
		async function startDraft(fetchImpl, draftId) {
			const res = await fetchImpl("/v1/flows/start", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ draft_id: draftId })
			});
			const doc = await jsonBody(res, "flows/start");
			if (!res.ok || typeof doc["run_id"] !== "string") {
				const err = doc["error"];
				throw new Error(typeof err === "string" && err !== "" ? err : `flows/start failed: HTTP ${res.status}`);
			}
			return doc["run_id"];
		}
		/** GET the run status (poll target). Throws on transport failure only. */
		async function runStatus(fetchImpl, runId) {
			const res = await fetchImpl("/v1/flows/status/" + encodeURIComponent(runId));
			const doc = await jsonBody(res, "run status");
			if (!res.ok || typeof doc["status"] !== "string") throw new Error(`run status failed: HTTP ${res.status}`);
			return doc;
		}
		/** The terminal set — @melite/catalog FlowEvents' TERMINAL, verbatim
		* (the poll's stop condition must match the stream's, or a dropped
		* socket polls forever / an unknown run stops early). */
		function runFinished(status) {
			return status === "completed" || status === "failed" || status === "stopped" || status === "unknown";
		}
		function rowStatus(live, doc) {
			const s = live ?? doc ?? "ready";
			if (s === "running" || s === "queued" || s === "pending") return s === "running" ? "running" : "queued";
			if (s === "completed" || s === "done" || s === "cached" || s === "succeeded") return "done";
			if (s === "failed" || s === "error") return "failed";
			return "ready";
		}
		/** Distill the draft (+ optional live run status) into card rows. */
		function cardRows(doc, live) {
			const liveStages = live?.stages ?? [];
			return doc.stages.map((stage, index) => {
				const runStage = liveStages[index];
				const params = stage.params ?? {};
				const prompt = typeof params["prompt"] === "string" && params["prompt"] !== "" ? params["prompt"].slice(0, 96) : null;
				return {
					stageId: stage.id,
					title: stage.title ?? stage.id,
					kind: stage.kind ?? "stage",
					service: typeof stage.service === "string" && stage.service !== "" ? stage.service : null,
					prompt,
					status: rowStatus(runStage?.status, stage.status),
					thumbUrl: typeof runStage?.url === "string" && runStage.url !== "" ? runStage.url : null
				};
			});
		}
		/** Fold one events-bus frame onto the live status doc — the idempotent
		*  patch (FlowEvents.ts contract: "every frame is an idempotent patch
		*  onto the same store the poll writes"). Stage frames patch
		*  positionally by index; terminal run frames set the run status. */
		function foldFrame(prev, runId, frame) {
			if (frame.type === "stage") {
				const i = typeof frame.index === "number" ? frame.index : -1;
				if (i < 0) return prev ?? {
					run_id: runId,
					status: "running",
					stages: []
				};
				const stages = [...prev?.stages ?? []];
				const cur = stages[i] ?? {
					id: String(i),
					status: "running"
				};
				stages[i] = {
					id: cur.id,
					status: typeof frame.status === "string" && frame.status !== "" ? frame.status : cur.status,
					url: cur.url
				};
				return {
					run_id: runId,
					status: prev?.status ?? "running",
					stages
				};
			}
			return {
				run_id: runId,
				status: String(frame.status),
				stages: prev?.stages ?? []
			};
		}
		/** Project a stage's params into editable fields (in key order). */
		function paramFields(params) {
			const fields = [];
			for (const [key, value] of Object.entries(params)) if (typeof value === "boolean") fields.push({
				key,
				value,
				atom: "switch"
			});
			else if (typeof value === "number") fields.push({
				key,
				value,
				atom: "number"
			});
			else if (typeof value === "string") fields.push({
				key,
				value,
				atom: "text"
			});
			return fields;
		}
		/** Coerce an edited atom value back to the param's wire type. */
		function coerceEdit(field, next) {
			if (field.atom === "number") {
				const n = Number(next);
				return Number.isFinite(n) ? n : field.value;
			}
			return next;
		}
		/** The PATCH body for one stage: only the keys whose coerced value
		*  actually changed (a "1." retyped back to the original number is NOT
		*  an edit). */
		function editPatch(fields, edits) {
			const patch = {};
			let changed = false;
			for (const f of fields) {
				const raw = edits.get(f.key);
				if (raw === void 0) continue;
				const next = typeof raw === "boolean" ? raw : coerceEdit(f, raw);
				if (next === f.value) continue;
				patch[f.key] = next;
				changed = true;
			}
			return changed ? patch : null;
		}
		//#endregion
		//#region src/client/FlowCards.tsx
		/**
		* The melite_flow toolview — THE ACTION CARDS, rendered NATIVE in the
		* DSH React tree (2026-09-10 Phase 1: the iframe died).
		*
		* Keyed into the shipped `tool.call.toolview` seat for the wire tool
		* name `melite_flow`. NOT an iframe, NOT a bridge: the cards are React
		* components IN the host document —
		*   (a) THEME — inherited. The cards sit in DSH's tree, so every
		*       --dsw-alias-* token applies directly; the embed-bridge token
		*       copy is gone with the frame (the deck canvas keeps its own
		*       until Phase 2).
		*   (b) HEIGHT — gone as a problem. In-tree flow lays out natively;
		*       no polling, no scrollHeight reads.
		*   (c) DRILLDOWN — the ui-primitives Modal (body portal, Escape/
		*       mask close, aria-modal): the split detail — params left,
		*       outputs right — per the operator's directive 2026-09-10
		*       ("our cards go inside the dsh modal for the split drill
		*       down and drill up"). No zoom-promotion machine; DSH's own
		*       overlay machinery is the only layer.
		*
		* The wire is the editor's wire, same-origin via the card-deck host's
		* /v1 proxy (draft.ts owns every fetch). The user reviews the rows,
		* edits params in the drilldown, and presses Run ON THE CARD — the run
		* door (POST /v1/flows/start) is a user gesture, never the model's.
		*
		* WATERFALL LEDGER (operator law 2026-09-10: ride DSH 1:1 → minimize
		* our code → DOCUMENT what can't be ridden; each entry is for review):
		*   (a-1) RIDEN 1:1 — Button, Input, Pill, StateDot, Modal from the
		*         INSTALLED @deepseek-ai/dsh-client-ui-primitives rc.8 (Pill
		*         replaced hand-rolled capsule badges; Modal replaced the zoom
		*         machine). The css module is LAYOUT ONLY, every color an
		*         inherited --dsw-alias-* token — the ui-model-selection idiom.
		*   (c-4) rc.8 SURFACE GAP: the reference catalog also ships Tag and
		*         Switch; installed rc.8 does NOT. Pill is the shipped capsule
		*         for both (static span, no onClick = read-only badge; with
		*         onClick = the boolean toggle). REVIEW at the next rc bump:
		*         swap to Tag/Switch when installed.
		*   (c-1) NO ATOM: the card ROW (a list row that opens a Modal).
		*         DisclosureRow is inline expansion — a different interaction;
		*         no shipped atom covers row→modal. Hand-rolled, layout-only.
		*   (a-2) RIDEN 1:1 — the run-status STREAM: @melite/catalog's
		*         streamFlowEvents (the gateway's /v1/flows/events WS door,
		*         query form — the proxy-exact path, live bug 2026-09-04) folds
		*         idempotent stage frames positionally by INDEX (the estate
		*         mapping law); the poll stays TERMINAL AUTHORITY and the
		*         stream silently degrades to it — the FlowEvents contract,
		*         verbatim. (Supersedes the poll-only c-2 entry: the operator
		*         flagged it 2026-09-10 — "they do webhooks for us.")
		*   (c-3) NO CLIENT: the draft/run door layer (draft.ts). No DSH
		*         package serves the melite gateway's flows doors; fetch-
		*         injected thin client over the editor's own wire shapes.
		*/
		/** Run-status poll cadence (the editor's door, cheap gateway-local read). */
		const POLL_MS = 1500;
		/** Parse the melite_flow / card-tool call: the draft id + the model
		*  header. NATIVE CHANNEL FIRST: a settled result carries the tool's
		*  persisted presentationMeta (ToolResultNode.meta) with {draft_id} —
		*  every card tool emits it; the handle is read from meta, never
		*  parsed out of prose. The render-text token ('card <draftId>') is
		*  the LEGACY fallback: sessions logged before a tool grew its
		*  projector still hydrate through the parse rule. */
		function parseCardsBlock(block) {
			const settled = block.kind === "tool-result";
			const argsRaw = settled ? block.call?.argsRaw ?? "" : block.argsRaw ?? "";
			let model = null;
			if (argsRaw !== "") try {
				const args = JSON.parse(argsRaw);
				if (typeof args["model"] === "string" && args["model"] !== "") model = args["model"];
			} catch {}
			let draftId = null;
			if (settled && block.isError !== true) {
				const meta = block.meta;
				if (meta !== null && typeof meta === "object" && !Array.isArray(meta)) {
					const id = meta["draft_id"];
					if (typeof id === "string" && id !== "") draftId = id;
				}
				if (draftId === null && Array.isArray(block.content)) for (const part of block.content) {
					if (part === null || typeof part !== "object") continue;
					const text = part.text;
					if (typeof text !== "string") continue;
					const atCard = text.indexOf("card ");
					const atIdx = atCard >= 0 ? atCard : text.indexOf("draft ");
					if (atIdx < 0) continue;
					const rest = text.slice(atIdx + (atCard >= 0 ? 5 : 6));
					const end = rest.indexOf(" ");
					const tok = end < 0 ? rest : rest.slice(0, end);
					if ((tok.startsWith("draft-") || tok.startsWith("p_")) && tok.length > 2) {
						draftId = tok;
						break;
					}
				}
			}
			return {
				draftId,
				model,
				settled,
				isError: block.isError === true
			};
		}
		/** Draft doc + live run status, fetched and polled (all doors in draft.ts). */
		function useDraft(draftId) {
			const [doc, setDoc] = (0, react.useState)(null);
			const [live, setLive] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)(null);
			const [tick, setTick] = (0, react.useState)(0);
			const pollRef = (0, react.useRef)(null);
			const refresh = (0, react.useCallback)(() => {
				setTick((t) => t + 1);
			}, []);
			(0, react.useEffect)(() => {
				if (draftId === null) return;
				let alive = true;
				setDoc(null);
				setLive(null);
				setError(null);
				fetchDraft(fetch, draftId).then((d) => {
					if (alive) setDoc(d);
				}).catch((e) => {
					if (alive) setError(e instanceof Error ? e.message : "draft hydration failed");
				});
				return () => {
					alive = false;
				};
			}, [draftId, tick]);
			const runId = live?.run_id ?? null;
			(0, react.useEffect)(() => {
				if (runId === null) return;
				const ac = new AbortController();
				const handle = streamFlowEvents(runId, (frame) => {
					setLive((prev) => foldFrame(prev, runId, frame));
				}, { signal: ac.signal });
				return () => {
					handle.close();
					ac.abort();
				};
			}, [runId]);
			(0, react.useEffect)(() => {
				if (runId === null) return;
				let alive = true;
				const step = () => {
					runStatus(fetch, runId).then((s) => {
						if (!alive) return;
						setLive(s);
						if (runFinished(s.status)) {
							if (pollRef.current !== null) window.clearInterval(pollRef.current);
							pollRef.current = null;
							setTick((t) => t + 1);
						}
					}).catch(() => {});
				};
				step();
				pollRef.current = window.setInterval(step, POLL_MS);
				return () => {
					alive = false;
					if (pollRef.current !== null) window.clearInterval(pollRef.current);
					pollRef.current = null;
				};
			}, [runId]);
			return {
				doc,
				live,
				error,
				refresh
			};
		}
		/** The chat-listed card row: kind tag, title, service, status dot, prompt. */
		function CardRowLine({ row, onOpen }) {
			const dot = {
				queued: "warning",
				running: "ongoing",
				done: "done",
				failed: "error",
				ready: null
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: card_module_css_default.row,
				onClick: onOpen,
				"data-stage": row.stageId,
				"data-status": row.status,
				children: [
					row.thumbUrl !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
						className: card_module_css_default.thumb,
						src: row.thumbUrl,
						alt: row.title,
						loading: "lazy"
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, { children: row.kind }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: card_module_css_default.rowTitle,
						children: row.title
					}),
					row.service !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, { children: row.service }),
					dot[row.status] !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: dot[row.status] }),
					row.prompt !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: card_module_css_default.prompt,
						children: row.prompt
					})
				]
			});
		}
		/** The drilldown — DSH's Modal, split: params (left) / outputs + Run (right). */
		function CardDrilldown({ draftId, row, stage, onClose }) {
			const [edits, setEdits] = (0, react.useState)(/* @__PURE__ */ new Map());
			const [running, setRunning] = (0, react.useState)(false);
			const [runError, setRunError] = (0, react.useState)(null);
			const patch = (0, react.useMemo)(() => editPatch(stage, edits), [stage, edits]);
			const run = (0, react.useCallback)(async () => {
				setRunning(true);
				setRunError(null);
				try {
					if (patch !== null) await patchStageParams(fetch, draftId, row.stageId, patch);
					await startDraft(fetch, draftId);
					onClose();
				} catch (e) {
					setRunError(e instanceof Error ? e.message : "run failed");
					setRunning(false);
				}
			}, [
				draftId,
				patch,
				row,
				onClose
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose,
				title: "Card " + row.title,
				closeLabel: "Close card",
				className: card_module_css_default.drill,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: card_module_css_default.split,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: card_module_css_default.params,
						children: stage.map((f) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: card_module_css_default.field,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: card_module_css_default.fieldKey,
								children: f.key
							}), f.atom === "switch" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
								active: typeof f.value === "boolean" ? edits.get(f.key) ?? f.value : false,
								onClick: () => {
									const current = typeof f.value === "boolean" ? edits.get(f.key) ?? f.value : false;
									setEdits((m) => new Map(m).set(f.key, !current));
								},
								children: typeof f.value === "boolean" ? edits.get(f.key) ?? f.value ? "on" : "off" : "?"
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								value: String(edits.get(f.key) ?? f.value),
								onChange: (e) => {
									setEdits((m) => new Map(m).set(f.key, e.target.value));
								}
							})]
						}, f.key))
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: card_module_css_default.outputs,
						children: [row.thumbUrl !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
							className: card_module_css_default.outputImg,
							src: row.thumbUrl,
							alt: row.title
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: card_module_css_default.runRow,
							children: [runError !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: card_module_css_default.runError,
								children: runError
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "primary",
								disabled: running,
								onClick: () => {
									run();
								},
								children: running ? "running…" : "Run"
							})]
						})]
					})]
				})
			});
		}
		/** One melite_flow call as the REAL action cards (native React, in-tree). */
		function FlowCards({ block }) {
			const parsed = (0, react.useMemo)(() => parseCardsBlock(block), [block]);
			const { doc, live, error, refresh } = useDraft(parsed.draftId);
			const [openStage, setOpenStage] = (0, react.useState)(null);
			if (parsed.settled && !parsed.isError && parsed.draftId === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: card_module_css_default.card,
				"data-dsh-part": "melite-flow-card",
				"data-legacy": "1",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: card_module_css_default.head,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, { children: "melite" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: card_module_css_default.model,
							children: parsed.model ?? "flow"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: card_module_css_default.state,
							"data-state": "legacy",
							children: "cards · earlier draft"
						})
					]
				})
			});
			if (parsed.draftId === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: card_module_css_default.card,
				"data-dsh-part": "melite-flow-card",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: card_module_css_default.load,
					children: parsed.isError ? "draft failed" : "composing…"
				})
			});
			const rows = doc !== null ? cardRows(doc, live) : [];
			const openRow = rows.find((r) => r.stageId === openStage) ?? null;
			const openParams = doc?.stages.find((s) => s.id === openStage)?.params ?? {};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: card_module_css_default.card,
				"data-dsh-part": "melite-flow-card",
				"data-draft-id": parsed.draftId,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: card_module_css_default.head,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: card_module_css_default.badge,
								children: "melite"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: card_module_css_default.model,
								children: doc?.intent ?? parsed.model ?? "flow"
							}),
							error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: card_module_css_default.state,
								"data-state": "error",
								role: "button",
								tabIndex: 0,
								onClick: refresh,
								onKeyDown: refresh,
								children: [error, " · retry"]
							})
						]
					}),
					doc === null && error === null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: card_module_css_default.load,
						children: "cards…"
					}),
					rows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CardRowLine, {
						row,
						onOpen: () => {
							setOpenStage(row.stageId);
						}
					}, row.stageId)),
					openRow !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CardDrilldown, {
						draftId: parsed.draftId,
						row: openRow,
						stage: paramFields(openParams),
						onClose: () => {
							setOpenStage(null);
							refresh();
						}
					})
				]
			});
		}
		//#endregion
		//#region src/client/CardsTab.tsx
		/**
		* The Cards tab body — the bench's user plane (plan §5: "the user
		* browses visually in the tab").
		*
		* Bench view (`dsh-resource://cards/bench`): the stage rows with their
		* presentation extras (title/card), the revision trail's head, and the
		* Run gesture — which projects the stages onto the flow_inline wire
		* and starts them under the bench's own draft_id, EXACTLY what
		* melite_flow's bench verb does (one truth, two planes; the model's
		* plane is per-call reads, never this component's frames).
		*
		* Run view (`dsh-resource://cards/run/<runId>`): live status + stage
		* rows + artifacts, riding the resource provider's frames.
		*
		* The body is dispatched by the keyed `sidebar.right.pane.tab` seat
		* under the type's id; the address arrives through the standard
		* `useTabInfo` hook, the value through the standard `useResource`
		* hook. Local prop typings (the package's local-spelling pattern —
		* see index.ts) keep this package off sibling runtime imports.
		*/
		/** The flow_inline projection — the SAME wire shape melite_flow's bench
		*  verb sends (runner-owned keys strip; ids/engines/params stay). */
		function projectStage(s) {
			const row = {
				id: s.id,
				engine: s.engine ?? "comfyui"
			};
			if (s.params !== void 0 && Object.keys(s.params).length > 0) row["params"] = s.params;
			if (Array.isArray(s.inputs) && s.inputs.length > 0) row["inputs"] = s.inputs;
			if (Array.isArray(s.outputs) && s.outputs.length > 0) row["outputs"] = s.outputs;
			return row;
		}
		/** The Run gesture: start the bench as it stands. Errors surface inline
		*  (the door's own refusal text — logged, never thrown past React). */
		async function runTheBench(bench, onStarted) {
			const stages = bench.stages.map(projectStage);
			if (stages.length === 0) return;
			try {
				const res = await fetch("/v1/flows/start", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						flow_inline: { stages },
						draft_id: bench.draftId
					})
				});
				const doc = await res.json().catch(() => null);
				const runId = doc?.["run_id"];
				if (res.ok && typeof runId === "string" && runId !== "") onStarted(runId);
				else {
					const err = doc?.["error"];
					console.error("[cards] run refused:", typeof err === "string" ? err : "HTTP " + res.status);
				}
			} catch (e) {
				console.error("[cards] run request failed:", e);
			}
		}
		function StageRowView({ stage }) {
			const title = stage.title ?? stage.card ?? stage.id;
			const engine = typeof stage.engine === "string" && stage.engine !== "" ? stage.engine : "comfyui";
			return (0, react.createElement)("li", {
				className: "cards-stage",
				"data-stage-id": stage.id
			}, (0, react.createElement)("span", { className: "cards-stage-title" }, String(title)), (0, react.createElement)("span", { className: "cards-stage-engine" }, engine));
		}
		function BenchView({ bench, onRun, running }) {
			return (0, react.createElement)("section", {
				className: "cards-bench",
				"data-cards-bench": bench.rev
			}, (0, react.createElement)("header", { className: "cards-bench-head" }, (0, react.createElement)("span", { className: "cards-bench-rev" }, "rev " + bench.rev), (0, react.createElement)("button", {
				className: "cards-run",
				type: "button",
				disabled: running || bench.stages.length === 0,
				onClick: onRun
			}, "Run")), bench.stages.length === 0 ? (0, react.createElement)("p", { className: "cards-empty" }, "The bench is empty — construct stages (the agent adds them; they land here).") : (0, react.createElement)("ol", { className: "cards-stages" }, bench.stages.map((s) => (0, react.createElement)(StageRowView, {
				key: s.id,
				stage: s
			}))), bench.log.length > 0 ? (0, react.createElement)("p", { className: "cards-log-head" }, bench.log.length + " log entr" + (bench.log.length === 1 ? "y" : "ies")) : null);
		}
		function RunView({ run }) {
			return (0, react.createElement)("section", {
				className: "cards-run-view",
				"data-run-status": run.status
			}, (0, react.createElement)("header", { className: "cards-run-head" }, (0, react.createElement)("span", { className: "cards-run-id" }, run.runId), (0, react.createElement)("span", { className: "cards-run-status" }, run.status)), run.stages.length === 0 ? (0, react.createElement)("p", { className: "cards-empty" }, "No stage rows yet.") : (0, react.createElement)("ol", { className: "cards-stages" }, run.stages.map((s) => (0, react.createElement)("li", {
				key: s.id,
				className: "cards-stage",
				"data-stage-status": s.status
			}, (0, react.createElement)("span", { className: "cards-stage-title" }, s.id), (0, react.createElement)("span", { className: "cards-stage-engine" }, s.status), s.url !== void 0 ? (0, react.createElement)("a", {
				href: s.url,
				target: "_blank",
				rel: "noreferrer",
				className: "cards-stage-artifact"
			}, "artifact") : null))));
		}
		/** The tab body component. */
		function CardsTab(props) {
			const info = typeof props.useTabInfo === "function" ? props.useTabInfo() : void 0;
			const address = info?.tab.navigation.address ?? info?.tab.contentId ?? "dsh-resource://cards/bench";
			const openResource = info?.tab.actions.openResource;
			const snapshot = typeof props.useResource === "function" ? props.useResource(address) : void 0;
			const [running, setRunning] = (0, react.useState)(false);
			const onStarted = (0, react.useCallback)((runId) => {
				setRunning(false);
				if (openResource !== void 0) openResource("dsh-resource://cards/run/" + encodeURIComponent(runId));
			}, [openResource]);
			const onRun = (0, react.useCallback)(() => {
				if (snapshot?.value?.kind !== "bench") return;
				setRunning(true);
				runTheBench(snapshot.value, onStarted);
			}, [snapshot, onStarted]);
			if (snapshot === void 0) return (0, react.createElement)("p", { className: "cards-missing" }, "cards resource hook unavailable");
			if (snapshot.status === "loading" || snapshot.status === "none") return (0, react.createElement)("p", { className: "cards-loading" }, "loading " + address + "…");
			if (snapshot.status === "failed") return (0, react.createElement)("p", { className: "cards-failed" }, snapshot.failure?.message ?? "cards resource failed");
			const value = snapshot.value;
			if (value === void 0) return (0, react.createElement)("p", { className: "cards-failed" }, "cards resource gave no value");
			return value.kind === "bench" ? (0, react.createElement)(BenchView, {
				bench: value,
				onRun,
				running
			}) : (0, react.createElement)(RunView, { run: value });
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/@deepseek-ai+dsh-typert-protocol@0.1.5-rc.1_@deepseek-ai+cordis@4.0.2/node_modules/@deepseek-ai/dsh-typert-protocol/lib/index.js
		/** The one Remote failure class shared by owners, the Gateway, and consumers. */
		/**
		* One Remote call failure: a real Error carrying its stable code and typed
		* details. Owners throw it at the failure point; the Host Gateway encodes it
		* onto the wire unchanged; the Client face rebuilds an instance for the
		* `RemoteResult` error branch, so `throw result.error` keeps throw semantics.
		* Discrimination is always by `code`, never by instanceof.
		*/
		var RemoteError = class extends Error {
			code;
			details;
			/** Structural marker: cross-realm/bundle identification never uses instanceof. */
			isDSHRemoteError = true;
			/**
			* @param code - stable failure code declared in {@link RemoteErrorDetailsMap}.
			* @param message - human diagnostic carried across the wire.
			* @param details - structured payload typed by the code.
			* @param options - standard Error options (`cause` survives in-process only).
			*/
			constructor(code, message, details, options) {
				super(message, options);
				this.code = code;
				this.details = details;
				this.name = "RemoteError";
			}
		};
		//#endregion
		//#region src/client/cards-resource.ts
		/** The bench key the tab serves (melite-tools' DEFAULT_BENCH — 'main'). */
		const CARDS_BENCH_ADDRESS = "dsh-resource://cards/bench";
		/** The run address (the wand's target, plan §5). */
		function cardsRunAddress(runId) {
			return "dsh-resource://cards/run/" + encodeURIComponent(runId);
		}
		/** Parse a cards address; null when the path is not one of ours. */
		function parseCardsAddress(address) {
			if (!address.startsWith("dsh-resource://cards/")) return null;
			const rest = address.slice(21);
			if (rest === "bench") return { bench: true };
			if (rest.startsWith("run/")) {
				const runId = decodeURIComponent(rest.slice(4));
				if (runId !== "") return { run: runId };
			}
			return null;
		}
		/** One failure frame (the contract's error branch — a real RemoteError
		*  on the unclassified-Host code; the address prefixes the diagnostic). */
		function failure(address, message) {
			return {
				ok: false,
				error: new RemoteError("gateway/internal", address + ": " + message, {})
			};
		}
		/** Defensive row readers — the door's wire is untyped at this seam. */
		function readBench(doc) {
			const stages = Array.isArray(doc["stages"]) ? doc["stages"].filter((s) => typeof s === "object" && s !== null && typeof s["id"] === "string") : [];
			const log = Array.isArray(doc["log"]) ? doc["log"].filter((s) => typeof s === "object" && s !== null && typeof s["rev"] === "number") : [];
			return {
				kind: "bench",
				draftId: typeof doc["draft_id"] === "string" ? doc["draft_id"] : "bench-main",
				rev: typeof doc["rev"] === "number" ? doc["rev"] : 0,
				stages,
				log
			};
		}
		function readRun(runId, doc) {
			const stages = Array.isArray(doc["stages"]) ? doc["stages"].filter((s) => typeof s === "object" && s !== null && typeof s["id"] === "string") : [];
			return {
				kind: "run",
				runId,
				status: typeof doc["status"] === "string" ? doc["status"] : "unknown",
				stages,
				lastFrame: void 0
			};
		}
		async function getJson(path) {
			const res = await fetch(path, { headers: { accept: "application/json" } });
			const text = await res.text();
			let doc;
			try {
				doc = text === "" ? {} : JSON.parse(text);
			} catch {
				throw new Error("malformed JSON (HTTP " + res.status + ")");
			}
			if (!res.ok) {
				const err = doc?.["error"];
				throw new Error(typeof err === "string" && err !== "" ? err : "HTTP " + res.status);
			}
			if (typeof doc !== "object" || doc === null || Array.isArray(doc)) throw new Error("not a JSON object");
			return doc;
		}
		/** Merge one events frame into a run value (stage rows upserted by id;
		*  run-status frames replace the status; the frame is kept for the view). */
		function mergeRunFrame(value, frame) {
			const next = {
				...value,
				lastFrame: frame
			};
			const type = frame["type"];
			if (type === "run" && typeof frame["status"] === "string") next.status = frame["status"];
			if (type === "stage") {
				const stageId = frame["stage"];
				if (typeof stageId === "string") {
					if (next.stages.find((s) => s.id === stageId) === void 0) next.stages = [...next.stages, {
						id: stageId,
						status: "running"
					}];
					else next.stages = next.stages.map((s) => s.id === stageId ? {
						...s,
						status: "running"
					} : s);
				}
			}
			return next;
		}
		/** The provider registration body: `ctx.resources.register({ protocol:
		*  'cards', open })`. Same-origin wires (the deck host half's /v1 proxy
		*  + events tunnel); abort ends the stream per the contract. */
		function openCardsResource(address, ctx) {
			const target = parseCardsAddress(address);
			const bench = target !== null && "bench" in target;
			const runId = target !== null && "run" in target ? target.run : "";
			return (async function* () {
				if (target === null) {
					yield failure(address, "not a cards address");
					return;
				}
				if (bench) {
					let value;
					try {
						value = readBench(await getJson("/v1/bench/main"));
					} catch (e) {
						yield failure(address, e instanceof Error ? e.message : String(e));
						return;
					}
					yield {
						ok: true,
						value
					};
					return;
				}
				let value;
				try {
					value = readRun(runId, await getJson("/v1/flows/status/" + encodeURIComponent(runId)));
				} catch (e) {
					yield failure(address, e instanceof Error ? e.message : String(e));
					return;
				}
				yield {
					ok: true,
					value
				};
				if (ctx.signal.aborted) return;
				yield* runFrames(address, runId, value, ctx.signal);
			})();
		}
		/** The live tail: WS frames → values, ended on terminal status, socket
		*  close, or abort. A dead socket is not a failure frame — the hydrated
		*  value stays (the kit keeps the last ok frame's value). */
		async function* runFrames(address, runId, hydrated, signal) {
			const loc = typeof location === "object" && location !== null ? location : void 0;
			if (loc === void 0) return;
			const url = (loc.protocol === "https:" ? "wss:" : "ws:") + "//" + loc.host + "/v1/flows/events/" + encodeURIComponent(runId);
			let ws;
			try {
				ws = new WebSocket(url);
			} catch {
				return;
			}
			const aborted = () => {
				try {
					ws.close();
				} catch {}
			};
			signal.addEventListener("abort", aborted, { once: true });
			try {
				let value = hydrated;
				for (;;) {
					const message = await new Promise((resolve) => {
						const onMessage = (ev) => {
							cleanup();
							resolve(ev);
						};
						const onClose = () => {
							cleanup();
							resolve("closed");
						};
						const onAbort = () => {
							cleanup();
							resolve("abort");
						};
						const cleanup = () => {
							ws.removeEventListener("message", onMessage);
							ws.removeEventListener("close", onClose);
							signal.removeEventListener("abort", onAbort);
						};
						if (ws.readyState === WebSocket.CLOSED) {
							resolve("closed");
							return;
						}
						ws.addEventListener("message", onMessage);
						ws.addEventListener("close", onClose);
						signal.addEventListener("abort", onAbort);
					});
					if (message === "abort" || message === "closed") return;
					let frame;
					try {
						frame = JSON.parse(String(message.data));
					} catch {
						continue;
					}
					if (typeof frame !== "object" || frame === null) continue;
					value = mergeRunFrame(value, frame);
					yield {
						ok: true,
						value
					};
					const type = frame["type"];
					const status = frame["status"];
					if (type === "run" && typeof status === "string" && (status === "completed" || status === "failed" || status === "cancelled" || status === "error")) return;
				}
			} finally {
				signal.removeEventListener("abort", aborted);
				try {
					ws.close();
				} catch {}
			}
		}
		//#endregion
		//#region src/client/index.ts
		/** Every card tool that produces a draft — the card tile renders for ALL of them. */
		const CARD_TOOLS = [
			"melite_flow",
			"image_card",
			"tts_card",
			"video_card",
			"music_card",
			"sfx_card",
			"three_d_card",
			"motion_card",
			"body_card",
			"image_edit_card",
			"h3_timeline_card",
			"creature_flow",
			"humanoid_flow",
			"non_humanoid_flow",
			"prop_flow",
			"sprite_sheet"
		];
		/** @deprecated use CARD_TOOLS — kept for back-compat imports */
		const FLOW_START_TOOL = CARD_TOOLS[0];
		/** The tab type's identity (the key its body registers under). */
		const CARDS_TAB_ID = "@melite-plugin/dsh-card-view";
		/** Required services (fiber inject waiting — the registries must be up
		*  first: the native sidebar subsystem + the resource model). */
		const inject = [
			"slots",
			"sidebarRightTabs",
			"resources"
		];
		/**
		* Register both planes: the toolview keys for every card tool, and the
		* cards tab (type + body + resource provider).
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			if (!claimCardViewApply()) return;
			ctx.effect(() => releaseCardViewApply, "melite-card-view: apply claim");
			for (const tool of CARD_TOOLS) try {
				ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
					name: "tool.call.toolview",
					key: tool
				}, FlowCards));
			} catch (error) {
				console.error(`[melite-card-view] toolview registration failed for ${tool}:`, error);
			}
			try {
				ctx.effect(() => ctx.sidebarRightTabs.register({
					id: CARDS_TAB_ID,
					kind: "cards",
					patterns: ["dsh-resource://cards/**"],
					title: (address) => address === "dsh-resource://cards/bench" ? "Cards" : address.replace(/^dsh-resource:\/\/cards\//, ""),
					guide: [{
						order: 50,
						title: () => "Cards",
						description: () => "The working flow — the shared bench and its runs."
					}]
				}), "melite-card-view: cards tab type");
			} catch (error) {
				console.error("[melite-card-view] cards tab type registration failed:", error);
			}
			try {
				ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({
					name: "sidebar.right.pane.tab",
					key: CARDS_TAB_ID
				}, CardsTab));
			} catch (error) {
				console.error("[melite-card-view] cards tab body registration failed:", error);
			}
			try {
				ctx.effect(() => ctx.resources.register({
					protocol: "cards",
					open: openCardsResource
				}), "melite-card-view: cards resource provider");
			} catch (error) {
				console.error("[melite-card-view] cards resource provider registration failed:", error);
			}
		}
		//#endregion
		exports.CARDS_BENCH_ADDRESS = CARDS_BENCH_ADDRESS;
		exports.CARD_TOOLS = CARD_TOOLS;
		exports.CardsTab = CardsTab;
		exports.FLOW_START_TOOL = FLOW_START_TOOL;
		exports.FlowCards = FlowCards;
		exports.apply = apply;
		exports.cardsRunAddress = cardsRunAddress;
		exports.inject = inject;
		exports.mergeRunFrame = mergeRunFrame;
		exports.parseCardsAddress = parseCardsAddress;
		exports.parseCardsBlock = parseCardsBlock;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
