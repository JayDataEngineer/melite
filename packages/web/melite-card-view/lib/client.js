window.__ModuleLoader__.load({
	id: "@melite-plugin/dsh-card-view",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
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
		/** The terminal states (polling stops; the tile settles). */
		function runFinished(status) {
			return status === "completed" || status === "failed" || status === "error" || status === "stopped";
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
			const liveStages = /* @__PURE__ */ new Map();
			if (live?.stages) for (const s of live.stages) liveStages.set(s.id, s);
			return doc.stages.map((stage) => {
				const runStage = liveStages.get(stage.id);
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
		*   (c-2) NO HOOK: the run-status POLL loop (useDraft). No shipped
		*         interval/poll hook exists in client/*; useEffect +
		*         clearInterval, terminal-state stop, refresh-on-finish.
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
		/** Required services (fiber inject waiting — the slot registry must be up first). */
		const inject = ["slots"];
		/**
		* Register the flow card for EVERY card tool so drafts always render
		* as interactive flows in the chat — regardless of which tool made them.
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
		}
		//#endregion
		exports.CARD_TOOLS = CARD_TOOLS;
		exports.FLOW_START_TOOL = FLOW_START_TOOL;
		exports.FlowCards = FlowCards;
		exports.apply = apply;
		exports.inject = inject;
		exports.parseCardsBlock = parseCardsBlock;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
