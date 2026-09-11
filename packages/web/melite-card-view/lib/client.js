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
		const css = ".vYZV7a_card{flex-direction:column;min-width:0;margin:4px 0;font-size:12px;line-height:1.45;display:flex}.vYZV7a_load{color:var(--dsw-alias-label-secondary,#9a9aa5);padding:2px 0}.vYZV7a_head{align-items:center;gap:8px;min-width:0;display:flex}.vYZV7a_model{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-weight:600;overflow:hidden}.vYZV7a_state{border-radius:999px;flex:none;margin-left:auto;padding:1px 8px}.vYZV7a_state[data-state=completed]{color:var(--dsw-alias-state-success-primary,#3fb96f)}.vYZV7a_state[data-state=running],.vYZV7a_state[data-state=queued],.vYZV7a_state[data-state=pending],.vYZV7a_state[data-state=starting],.vYZV7a_state[data-state=draft]{color:var(--dsw-alias-state-warn-primary,#d9a53f)}.vYZV7a_state[data-state=failed],.vYZV7a_state[data-state=error],.vYZV7a_state[data-state=stopped],.vYZV7a_state[data-state=interrupted]{color:var(--dsw-alias-state-error-primary,#e05656)}.vYZV7a_prompt{color:var(--dsw-alias-text-secondary,#9a9aa5);-webkit-line-clamp:2;-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden}.vYZV7a_link:hover{text-decoration:underline}.vYZV7a_row{color:inherit;cursor:pointer;font:inherit;text-align:left;background:0 0;border:none;border-radius:6px;align-items:center;gap:8px;width:100%;min-width:0;padding:4px 6px;display:flex}.vYZV7a_row:hover{background:var(--dsw-alias-interactive-bg-hover-subtle,#ffffff0d)}.vYZV7a_row:focus-visible{outline:1px solid var(--dsw-alias-state-business-primary,#4f7bd8);outline-offset:-1px}.vYZV7a_thumb{object-fit:cover;border-radius:4px;flex:none;width:34px;height:34px}.vYZV7a_rowTitle{text-overflow:ellipsis;white-space:nowrap;flex:none;max-width:40%;font-weight:600;overflow:hidden}.vYZV7a_drill{width:92vw;max-width:min(860px,92vw)}.vYZV7a_split{grid-template-columns:minmax(240px,1fr) minmax(0,1.2fr);gap:14px;min-width:0;display:grid}@media (width<=640px){.vYZV7a_split{grid-template-columns:1fr}}.vYZV7a_params{flex-direction:column;gap:8px;min-width:0;max-height:60vh;display:flex;overflow-y:auto}.vYZV7a_field{flex-direction:column;gap:3px;min-width:0;display:flex}.vYZV7a_fieldKey{color:var(--dsw-alias-label-secondary,#9a9aa5);font-size:11px}.vYZV7a_outputs{flex-direction:column;align-items:center;gap:10px;min-width:0;display:flex}.vYZV7a_outputImg{object-fit:contain;border-radius:8px;max-width:100%;max-height:46vh}.vYZV7a_runRow{justify-content:flex-end;align-items:center;gap:10px;width:100%;display:flex}.vYZV7a_runError{color:var(--dsw-alias-label-error,#e05656);overflow-wrap:anywhere;font-size:11px}.vYZV7a_state[data-state=legacy]{color:var(--dsw-alias-label-secondary,#9a9aa5)}.vYZV7a_cardsBench{flex-direction:column;gap:8px;display:flex}.vYZV7a_benchHead{justify-content:space-between;align-items:center;gap:8px;display:flex}.vYZV7a_revTag{color:var(--dsw-alias-fg-muted,#ffffff8c);font-family:var(--dsw-alias-font-mono,ui-monospace, monospace);font-size:11px}.vYZV7a_runBtn,.vYZV7a_back,.vYZV7a_restore{border:1px solid var(--dsw-alias-border-subtle,#ffffff26);color:inherit;cursor:pointer;font:inherit;background:0 0;border-radius:6px;padding:2px 10px;font-size:12px}.vYZV7a_runBtn:hover:not(:disabled),.vYZV7a_back:hover,.vYZV7a_restore:hover:not(:disabled){background:var(--dsh-alias-interactive-bg-hover-subtle,#ffffff0d);border-color:var(--dsw-alias-state-business-primary,#4f7bd8)}.vYZV7a_runBtn:disabled,.vYZV7a_restore:disabled{cursor:default;opacity:.45}.vYZV7a_category{flex-direction:column;gap:2px;display:flex}.vYZV7a_catTitle{color:var(--dsw-alias-fg-muted,#ffffff8c);letter-spacing:.06em;text-transform:uppercase;margin:4px 0 2px;font-size:11px;font-weight:600}.vYZV7a_stages{flex-direction:column;gap:2px;margin:0;padding:0;list-style:none;display:flex}.vYZV7a_stage{list-style:none}.vYZV7a_stageTitle{text-overflow:ellipsis;white-space:nowrap;flex:none;max-width:45%;font-weight:600;overflow:hidden}.vYZV7a_stageEngine{color:var(--dsw-alias-fg-muted,#ffffff8c);flex:none;font-size:11px}.vYZV7a_stageArtifact{color:var(--dsw-alias-state-business-primary,#4f7bd8);font-size:12px;text-decoration:none}.vYZV7a_stageArtifact:hover{text-decoration:underline}.vYZV7a_empty,.vYZV7a_loading,.vYZV7a_failed,.vYZV7a_missing,.vYZV7a_logHead,.vYZV7a_restoreNote{color:var(--dsw-alias-fg-muted,#ffffff8c);margin:0;font-size:12px;font-style:italic}.vYZV7a_runView{flex-direction:column;gap:8px;display:flex}.vYZV7a_runHead{align-items:baseline;gap:8px;display:flex}.vYZV7a_runId{font-family:var(--dsw-alias-font-mono,ui-monospace, monospace);font-size:12px;font-weight:600}.vYZV7a_runStatus{border:1px solid var(--dsw-alias-border-subtle,#ffffff26);color:var(--dsw-alias-fg-muted,#ffffff8c);border-radius:999px;padding:0 8px;font-size:11px}.vYZV7a_runActions{gap:8px;display:flex}.vYZV7a_stageDetail{grid-template-columns:auto 1fr;gap:2px 12px;margin:0;display:grid}.vYZV7a_stageDetail dt{color:var(--dsw-alias-fg-muted,#ffffff8c);text-align:right;text-transform:uppercase;font-size:11px}.vYZV7a_stageDetail dd{min-width:0;margin:0}.vYZV7a_mono{font-family:var(--dsw-alias-font-mono,ui-monospace, monospace);font-size:12px;overflow-x:auto}";
		const tagId = "@melite-plugin/dsh-card-view/card.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite-plugin/dsh-card-view";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var card_module_css_default = {
			"back": "vYZV7a_back",
			"benchHead": "vYZV7a_benchHead",
			"card": "vYZV7a_card",
			"cardsBench": "vYZV7a_cardsBench",
			"catTitle": "vYZV7a_catTitle",
			"category": "vYZV7a_category",
			"drill": "vYZV7a_drill",
			"empty": "vYZV7a_empty",
			"failed": "vYZV7a_failed",
			"field": "vYZV7a_field",
			"fieldKey": "vYZV7a_fieldKey",
			"head": "vYZV7a_head",
			"link": "vYZV7a_link",
			"load": "vYZV7a_load",
			"loading": "vYZV7a_loading",
			"logHead": "vYZV7a_logHead",
			"missing": "vYZV7a_missing",
			"model": "vYZV7a_model",
			"mono": "vYZV7a_mono",
			"outputImg": "vYZV7a_outputImg",
			"outputs": "vYZV7a_outputs",
			"params": "vYZV7a_params",
			"prompt": "vYZV7a_prompt",
			"restore": "vYZV7a_restore",
			"restoreNote": "vYZV7a_restoreNote",
			"revTag": "vYZV7a_revTag",
			"row": "vYZV7a_row",
			"rowTitle": "vYZV7a_rowTitle",
			"runActions": "vYZV7a_runActions",
			"runBtn": "vYZV7a_runBtn",
			"runError": "vYZV7a_runError",
			"runHead": "vYZV7a_runHead",
			"runId": "vYZV7a_runId",
			"runRow": "vYZV7a_runRow",
			"runStatus": "vYZV7a_runStatus",
			"runView": "vYZV7a_runView",
			"split": "vYZV7a_split",
			"stage": "vYZV7a_stage",
			"stageArtifact": "vYZV7a_stageArtifact",
			"stageDetail": "vYZV7a_stageDetail",
			"stageEngine": "vYZV7a_stageEngine",
			"stageTitle": "vYZV7a_stageTitle",
			"stages": "vYZV7a_stages",
			"state": "vYZV7a_state",
			"thumb": "vYZV7a_thumb"
		};
		//#endregion
		//#region src/client/draft.ts
		/** Correlation id for one client-request frame (crypto.randomUUID is
		*  the browser standard). */
		function nextRpcId$2() {
			const cryptoApi = globalThis.crypto;
			if (cryptoApi?.randomUUID !== void 0) return cryptoApi.randomUUID();
			return "rpc-" + Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);
		}
		/** One wire call: POST /api/<method> with the client-request frame,
		*  answer narrowed to the value row. A refused result throws the
		*  RemoteError branch's message (the door's own name); a channel
		*  surprise throws honestly. */
		async function wireCall$1(method, args) {
			const rpcId = nextRpcId$2();
			const res = await fetch("/api/" + method, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					type: "client-request",
					rpcId,
					method,
					payload: { args }
				})
			});
			if (!res.ok) throw new Error(method + ": HTTP " + String(res.status));
			const body = await res.json().catch(() => null);
			if (typeof body !== "object" || body === null || Reflect.get(body, "type") !== "server-response" || Reflect.get(body, "rpcId") !== rpcId) throw new Error(method + ": malformed response frame");
			const result = Reflect.get(body, "result");
			if (typeof result !== "object" || result === null) throw new Error(method + ": malformed result");
			if (Reflect.get(result, "ok") !== true) {
				const error = Reflect.get(result, "error");
				const message = typeof error === "object" && error !== null && typeof Reflect.get(error, "message") === "string" ? Reflect.get(error, "message") : method + ": refused";
				throw new Error(message);
			}
			const value = Reflect.get(result, "value");
			if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(method + ": not a JSON object");
			return value;
		}
		/** The media URL seam — the twin of @melite/estate-media's mediaUrl
		*  (kept LOCAL: this is a browser module, the package main is a host
		*  plugin). Bare run-relative names ride the estate's media route;
		*  names that already carry a URL pass verbatim. */
		function mediaUrl(runId, name) {
			if (name === "") return name;
			if (/^(https?:\/\/|\/)/.test(name)) return name;
			return "/melite-media/runs/" + encodeURIComponent(runId) + "/" + name.split("/").map((seg) => encodeURIComponent(seg)).join("/");
		}
		/** The draft doc; throws the door's own named refusal on failure. */
		async function fetchDraft(draftId) {
			const doc = await wireCall$1("drafts/get", { draftId });
			if (typeof doc["draft_id"] !== "string" || !Array.isArray(doc["stages"])) throw new Error("drafts/get: not a draft doc");
			return doc;
		}
		/** Edit one stage's params — the REAL door, reborn 2026-09-11: the
		*  drafts remote's `drafts/patch` write arm over the drafts domain
		*  (the gateway-era PATCH /v1/flows/drafts/:id/stages/:sid died with
		*  the app; stroke L stubbed this to a loud throw — the shared-state
		*  door is back, same per-key merge semantics server-side). Throws
		*  the door's named refusal; delivered:false lands as a named throw
		*  (never a lying success). */
		async function patchStageParams(draftId, stageId, params) {
			const row = await wireCall$1("drafts/patch", {
				draftId,
				stageId,
				patch: { params }
			});
			if (row["delivered"] !== true) {
				const reason = typeof row["reason"] === "string" ? row["reason"] : "undelivered";
				throw new Error("drafts/patch: " + reason + " (draft " + draftId + ", stage " + stageId + ")");
			}
		}
		/** Start the run; returns the run_id or throws the door's named refusal. */
		async function startDraft(draftId) {
			const row = await wireCall$1("runs/start", { doc: { draft_id: draftId } });
			if (typeof row["run_id"] !== "string") throw new Error("runs/start: no run_id in the answer");
			return row["run_id"];
		}
		/** The run status (poll target). Throws on transport failure only. */
		async function runStatus(runId) {
			const doc = await wireCall$1("runs/status", { runId });
			if (typeof doc["status"] !== "string") throw new Error("runs/status: not a status doc");
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
					thumbUrl: typeof runStage?.url === "string" && runStage.url !== "" ? mediaUrl(live?.run_id ?? "", runStage.url) : null
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
		//#region src/client/card-drill.tsx
		/**
		* card-drill.tsx — THE CARD DRILLDOWN: the second state of the card
		* system, ONE component every card surface drills through (the chat
		* toolview FlowCards and the sidebar Cards tab — the 2026-09-10 UX
		* reborn 2026-09-11 as shared state + shared tool between the agent
		* and the user).
		*
		* DSH Modal (body portal, Escape/mask close — the operator's split
		* directive 2026-09-10): params LEFT (editable — switch fields ride
		* the Pill toggle, everything else a raw-string Input; editPatch
		* coerces ONCE at patch time so decimal dots survive typing), outputs
		* + Run RIGHT. Run ON THE CARD is a USER GESTURE, and it runs what
		* the user SEES: the caller receives the coerced patch and owns the
		* write-then-run order (the shared-state law — the patch lands in the
		* domain BEFORE the run reads it).
		*/
		function CardDrill({ title, fields, thumbUrl, running, onRun, onClose }) {
			const [edits, setEdits] = (0, react.useState)(/* @__PURE__ */ new Map());
			const [runError, setRunError] = (0, react.useState)(null);
			const patch = editPatch(fields, edits);
			const run = async () => {
				setRunError(null);
				try {
					await onRun(patch);
				} catch (e) {
					setRunError(e instanceof Error ? e.message : "run failed");
				}
			};
			const fieldNode = (f) => {
				if (f.atom === "switch") {
					const current = typeof f.value === "boolean" ? edits.get(f.key) ?? f.value : false;
					return (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
						active: current,
						onClick: () => {
							setEdits((m) => new Map(m).set(f.key, !current));
						}
					}, typeof f.value === "boolean" ? current ? "on" : "off" : "?");
				}
				return (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Input, {
					value: String(edits.get(f.key) ?? f.value),
					onChange: (e) => {
						const target = e;
						setEdits((m) => new Map(m).set(f.key, target.target.value));
					}
				});
			};
			return (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose,
				title,
				closeLabel: "Close card",
				className: card_module_css_default.drill
			}, (0, react.createElement)("div", { className: card_module_css_default.split }, (0, react.createElement)("div", { className: card_module_css_default.params }, fields.map((f) => (0, react.createElement)("label", {
				key: f.key,
				className: card_module_css_default.field
			}, (0, react.createElement)("span", { className: card_module_css_default.fieldKey }, f.key), fieldNode(f)))), (0, react.createElement)("div", { className: card_module_css_default.outputs }, thumbUrl !== null ? (0, react.createElement)("img", {
				className: card_module_css_default.outputImg,
				src: thumbUrl,
				alt: title
			}) : null, (0, react.createElement)("div", { className: card_module_css_default.runRow }, runError !== null ? (0, react.createElement)("span", { className: card_module_css_default.runError }, runError) : null, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "primary",
				disabled: running,
				onClick: () => {
					run();
				}
			}, running ? "running…" : "Run")))));
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
		* door (runs/start over the wire frame) is a user gesture, never the model's.
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
		*   (a-2) THE LIVE RUN, post-kill: the gateway-era events WS died
		*         with the gateway app (nothing serves it, by design); the
		*         poll over the runs/status remote IS the live channel until
		*         the collapse plan's stream remote exists (@Remote
		*         ({mode:'stream'}) over the mux). The fold mapping
		*         (idempotent stage frames by INDEX — the estate mapping law)
		*         stays in draft.ts for that day.
		*   (c-3) NO CLIENT: the draft/run remote layer (draft.ts). No DSH
		*         package wraps the estate's remotes as a browser client; the
		*         thin wire caller (client-request frame, api-gateway.md) is
		*         the sanctioned shape for plugins outside the web kernel.
		*/
		/** Run-status poll cadence (the editor's door, cheap same-host read). */
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
				fetchDraft(draftId).then((d) => {
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
					runStatus(runId).then((s) => {
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
					openRow !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CardDrill, {
						title: "Card " + openRow.title,
						fields: paramFields(openParams),
						thumbUrl: openRow.thumbUrl ?? null,
						running: false,
						onRun: async (patch) => {
							const draftId = parsed.draftId;
							if (draftId === null) throw new Error("draft id gone");
							if (patch !== null) await patchStageParams(draftId, openRow.stageId, patch);
							await startDraft(draftId);
							setOpenStage(null);
							refresh();
						},
						onClose: () => {
							setOpenStage(null);
							refresh();
						}
					})
				]
			});
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/@deepseek-ai+dsh-typert-protocol@0.1.5-rc.2_@deepseek-ai+cordis@4.0.2/node_modules/@deepseek-ai/dsh-typert-protocol/lib/index.js
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
		*  on the unclassified cards code; the address prefixes the diagnostic). */
		function failure(address, message) {
			return {
				ok: false,
				error: new RemoteError("cards/unclassified", address + ": " + message, {})
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
			for (const stage of stages) if (typeof stage.url === "string" && stage.url !== "" && !/^(https?:\/\/|\/)/.test(stage.url)) stage.url = "/melite-media/runs/" + encodeURIComponent(runId) + "/" + stage.url.split("/").map((seg) => encodeURIComponent(seg)).join("/");
			return {
				kind: "run",
				runId,
				status: typeof doc["status"] === "string" ? doc["status"] : "unknown",
				draftId: typeof doc["draft_id"] === "string" && doc["draft_id"] !== "" ? doc["draft_id"] : null,
				stages,
				lastFrame: void 0
			};
		}
		/** Correlation id for one client-request frame (crypto.randomUUID is
		*  the browser standard). */
		function nextRpcId$1() {
			const cryptoApi = globalThis.crypto;
			if (cryptoApi?.randomUUID !== void 0) return cryptoApi.randomUUID();
			return "rpc-" + Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);
		}
		/** Read a server-response envelope and narrow its result. A non-ok
		*  result throws the RemoteError branch's message (the caller frames
		*  the failure); a channel surprise throws honestly. */
		async function wireCall(nsMethod, args, signal) {
			const rpcId = nextRpcId$1();
			const res = await fetch("/api/" + nsMethod, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					type: "client-request",
					rpcId,
					method: nsMethod,
					payload: { args }
				}),
				...signal === void 0 ? {} : { signal }
			});
			if (!res.ok) throw new Error("wire: HTTP " + String(res.status));
			const body = await res.json();
			if (typeof body !== "object" || body === null || Reflect.get(body, "type") !== "server-response" || Reflect.get(body, "rpcId") !== rpcId) throw new Error("wire: malformed response frame");
			const result = Reflect.get(body, "result");
			if (typeof result !== "object" || result === null) throw new Error("wire: malformed result");
			if (Reflect.get(result, "ok") !== true) {
				const error = Reflect.get(result, "error");
				const message = typeof error === "object" && error !== null && typeof Reflect.get(error, "message") === "string" ? Reflect.get(error, "message") : "wire: refused";
				throw new Error(message);
			}
			const value = Reflect.get(result, "value");
			if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("wire: not a JSON object");
			return value;
		}
		/** Card-back-into-flow: restore a run's producing draft onto the
		*  shared bench — drafts/get (the draft holds the full
		*  card/engine/params stages) then per-stage bench/add-stage as the
		*  USER (the CAS law: bench/get first, each add carries expect_rev,
		*  chained from the previous answer's rev). A stage with no card is
		*  SKIPPED and counted (add-stage requires one); an id collision
		*  retries once without the id (the bench auto-ids s_<n>) and notes
		*  it. Any other refusal throws with the door's own text — the bench
		*  keeps whatever landed before it, and the report says so. */
		async function restoreRunToBench(run, signal) {
			if (run.draftId === null || run.draftId === "") throw new Error("this run names no draft — nothing to restore");
			let draft;
			try {
				draft = await wireCall("drafts/get", { draftId: run.draftId }, signal);
			} catch (e) {
				throw new Error("the producing draft is unreadable: " + (e instanceof Error ? e.message : String(e)));
			}
			const raw = draft["stages"];
			const stages = Array.isArray(raw) ? raw.filter((s) => typeof s === "object" && s !== null) : [];
			if (stages.length === 0) throw new Error("the producing draft holds no stages — nothing to restore");
			let bench;
			try {
				bench = await wireCall("bench/get", { sessionKey: "main" }, signal);
			} catch (e) {
				throw new Error("the bench is unreadable: " + (e instanceof Error ? e.message : String(e)));
			}
			let rev = typeof bench["rev"] === "number" ? bench["rev"] : 0;
			const report = {
				added: 0,
				skipped: 0,
				notes: []
			};
			for (const st of stages) {
				const card = st["card"];
				if (typeof card !== "string" || card === "") {
					report.skipped += 1;
					report.notes.push("skipped a stage with no card (add-stage requires one)");
					continue;
				}
				const doc = {
					card,
					author: "user",
					expect_rev: rev
				};
				if (typeof st["engine"] === "string" && st["engine"] !== "") doc["engine"] = st["engine"];
				if (typeof st["params"] === "object" && st["params"] !== null && !Array.isArray(st["params"])) doc["params"] = st["params"];
				const id = typeof st["id"] === "string" && st["id"] !== "" ? st["id"] : null;
				if (id !== null) doc["id"] = id;
				try {
					const row = await wireCall("bench/add-stage", doc, signal);
					if (typeof row["rev"] === "number") rev = row["rev"];
					report.added += 1;
				} catch (e) {
					const message = e instanceof Error ? e.message : String(e);
					if (id !== null && message.includes("already on the bench")) {
						const retry = { ...doc };
						delete retry["id"];
						try {
							const row = await wireCall("bench/add-stage", retry, signal);
							if (typeof row["rev"] === "number") rev = row["rev"];
							report.added += 1;
							report.notes.push(id + " was already on the bench — added under a fresh id");
						} catch (e2) {
							throw new Error("restore stopped after " + String(report.added) + " stage(s): " + (e2 instanceof Error ? e2.message : String(e2)));
						}
					} else throw new Error("restore stopped after " + String(report.added) + " stage(s): " + message);
				}
			}
			return report;
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
		*  'cards', open })`. The estate remotes over the wire frame; abort
		*  ends the stream per the contract. */
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
						value = readBench(await wireCall("bench/get", { sessionKey: "main" }));
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
					value = readRun(runId, await wireCall("runs/status", { runId }));
				} catch (e) {
					yield failure(address, e instanceof Error ? e.message : String(e));
					return;
				}
				yield {
					ok: true,
					value
				};
				if (ctx.signal.aborted) return;
				if (isTerminal(value.status)) return;
				yield* pollRunFrames(runId, value, ctx.signal);
			})();
		}
		/** The terminal statuses — the runs seat's own vocabulary (runsRegistry:
		*  stopFlag stamps 'stopped'; the settle path stamps 'completed' or
		*  'failed'. A settled run ends the stream; the hydrated/polled value
		*  stays as the last ok frame. */
		function isTerminal(status) {
			return status === "completed" || status === "failed" || status === "stopped";
		}
		/** The live tail (the honest degrade): poll `runs/status` and yield a
		*  value ONLY when the row moved (no frame spam) until the run turns
		*  terminal or the holder aborts. A poll error mid-run is not a
		*  failure frame — the last ok value stays (the kit keeps it); the
		*  next poll may recover. The cadence (1500ms) rides the run pump's
		*  own observation granularity, not user perception of latency: stage
		*  transitions inside the estate tick on the pump's settle path. */
		async function* pollRunFrames(runId, hydrated, signal) {
			let value = hydrated;
			const sleep = (ms) => new Promise((resolve) => {
				const t = setTimeout(() => {
					signal.removeEventListener("abort", onAbort);
					resolve("slept");
				}, ms);
				const onAbort = () => {
					clearTimeout(t);
					resolve("abort");
				};
				if (signal.aborted) {
					onAbort();
					return;
				}
				signal.addEventListener("abort", onAbort, { once: true });
			});
			while (!signal.aborted && !isTerminal(value.status)) {
				if (await sleep(1500) === "abort" || signal.aborted) return;
				let row;
				try {
					row = await wireCall("runs/status", { runId }, signal);
				} catch {
					continue;
				}
				const next = readRun(runId, row);
				if (!(next.status !== value.status || JSON.stringify(next.stages) !== JSON.stringify(value.stages))) continue;
				value = next;
				yield {
					ok: true,
					value
				};
			}
		}
		//#endregion
		//#region src/client/CardsTab.tsx
		/**
		* The Cards tab body — the bench's user plane (plan §5: "the user
		* browses visually in the tab").
		*
		* Bench view (`dsh-resource://cards/bench`): the stage rows GROUPED BY
		* CARD (the categories — each card's stages under its own header with
		* a count), each row opening a DSH Modal drilldown (id/card/engine/
		* params — the chat tile's drilldown pattern, primitives Modal), the
		* revision trail's head, and the Run gesture — which projects the
		* stages onto the flow_inline wire and starts them under the bench's
		* own draft_id, EXACTLY what melite_flow's bench verb does (one
		* truth, two planes; the model's plane is per-call reads, never this
		* component's frames).
		*
		* Run view (`dsh-resource://cards/run/<runId>`): live status + stage
		* rows + artifacts, riding the resource provider's frames — plus the
		* way back: "Back to bench" navigates home, and "Restore to bench"
		* turns the card BACK INTO A FLOW (drafts/get on the run's draft_id
		* + per-stage bench/add-stage as the user, CAS-chained).
		*
		* ADDRESS LAW (the `loading sidebar://cards…` hang, dead 2026-09-11):
		* the shell's navigation address is the SHELL's (guide clicks arrive
		* as the tab id's own address, not a cards address). An address that
		* does not parse as a cards address serves the BENCH — the tab never
		* sits on a resource no provider claims.
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
		/** Correlation id for one client-request frame (crypto.randomUUID is
		*  the browser standard). */
		function nextRpcId() {
			const cryptoApi = globalThis.crypto;
			if (cryptoApi?.randomUUID !== void 0) return cryptoApi.randomUUID();
			return "rpc-" + Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);
		}
		/** The Run gesture: start the bench as it stands, over the runs
		*  remote's wire door (same-origin POST /api/runs/start carrying the
		*  client-request frame — api-gateway.md; the gateway-era /v1/flows
		*  start died with the app, nothing serves it). Errors surface inline
		*  (the RemoteError branch's own refusal text — logged, never thrown
		*  past React). */
		async function runTheBench(bench, onStarted) {
			const stages = bench.stages.map(projectStage);
			if (stages.length === 0) return;
			const rpcId = nextRpcId();
			try {
				const res = await fetch("/api/runs/start", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						type: "client-request",
						rpcId,
						method: "runs/start",
						payload: { args: { doc: {
							flow_inline: { stages },
							draft_id: bench.draftId
						} } }
					})
				});
				if (!res.ok) {
					console.error("[cards] run refused: HTTP " + String(res.status));
					return;
				}
				const body = await res.json().catch(() => null);
				if (typeof body !== "object" || body === null || Reflect.get(body, "type") !== "server-response" || Reflect.get(body, "rpcId") !== rpcId) {
					console.error("[cards] run refused: malformed response frame");
					return;
				}
				const result = Reflect.get(body, "result");
				if (typeof result !== "object" || result === null) {
					console.error("[cards] run refused: malformed result");
					return;
				}
				if (Reflect.get(result, "ok") === true) {
					const runId = Reflect.get(Reflect.get(result, "value"), "run_id");
					if (typeof runId === "string" && runId !== "") onStarted(runId);
					else console.error("[cards] run refused: no run_id in the answer");
					return;
				}
				const error = Reflect.get(result, "error");
				const message = typeof error === "object" && error !== null && typeof Reflect.get(error, "message") === "string" ? Reflect.get(error, "message") : "runs/start refused";
				console.error("[cards] run refused:", message);
			} catch (e) {
				console.error("[cards] run request failed:", e);
			}
		}
		/** THE CATEGORIES: bench stages grouped by card (first-appearance
		*  order — the agent's construction order survives; stages with no
		*  card gather under 'uncategorized', never dropped). */
		function groupStagesByCard(stages) {
			const groups = [];
			for (const s of stages) {
				const card = typeof s.card === "string" && s.card !== "" ? s.card : "uncategorized";
				const known = groups.find((g) => g.card === card);
				if (known === void 0) groups.push({
					card,
					rows: [s]
				});
				else known.rows.push(s);
			}
			return groups;
		}
		/** Bench row run-status → the installed StateDot union (FlowCards'
		*  CardRowLine law: done|warning|ongoing|error — a stage that never
		*  ran shows NO dot, never a fake state). */
		const STAGE_DOT = {
			queued: "warning",
			pending: "warning",
			running: "ongoing",
			done: "done",
			failed: "error",
			ready: null
		};
		function StageRowView({ stage, onOpen }) {
			const title = stage.title ?? stage.card ?? stage.id;
			const engine = typeof stage.engine === "string" && stage.engine !== "" ? stage.engine : "comfyui";
			const rawStatus = typeof stage.runStatus === "string" ? stage.runStatus : void 0;
			const dot = rawStatus !== void 0 ? STAGE_DOT[rawStatus] ?? null : null;
			return (0, react.createElement)("li", {
				className: card_module_css_default.stage,
				"data-stage-id": stage.id
			}, (0, react.createElement)("button", {
				className: card_module_css_default.row,
				type: "button",
				"data-stage-status": rawStatus ?? "ready",
				onClick: () => onOpen(stage)
			}, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Pill, null, String(stage.card ?? "card")), (0, react.createElement)("span", { className: card_module_css_default.rowTitle }, String(title)), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Pill, null, engine), dot !== null ? (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: dot }) : null));
		}
		/** THE SHARED DRILLDOWN (card-drill.tsx): the bench stage's second
		*  state — editable params, Run on the card. THE SHARED-STATE LAW:
		*  the patch lands in the drafts domain (the bench IS a draft doc —
		*  the same records the agent authors through the bench verbs)
		*  BEFORE the run reads it; the run gesture is the user's, never the
		*  model's. */
		function StageDrill({ stage, bench, running, onRun, onClose }) {
			const title = String(stage.title ?? stage.card ?? stage.id);
			return (0, react.createElement)(CardDrill, {
				title: "Stage " + title,
				fields: paramFields(typeof stage.params === "object" && stage.params !== null ? stage.params : {}),
				thumbUrl: null,
				running,
				onRun: async (patch) => {
					if (patch !== null) await patchStageParams(bench.draftId, stage.id, patch);
					onRun();
				},
				onClose
			});
		}
		function BenchView({ bench, onRun, running }) {
			const [open, setOpen] = (0, react.useState)(null);
			const onOpen = (0, react.useCallback)((stage) => setOpen(stage), []);
			const onClose = (0, react.useCallback)(() => setOpen(null), []);
			const groups = groupStagesByCard(bench.stages);
			return (0, react.createElement)("section", {
				className: card_module_css_default.cardsBench,
				"data-cards-bench": bench.rev
			}, (0, react.createElement)("header", { className: card_module_css_default.benchHead }, (0, react.createElement)("span", { className: card_module_css_default.revTag }, "rev " + bench.rev), (0, react.createElement)("button", {
				className: card_module_css_default.runBtn,
				type: "button",
				disabled: running || bench.stages.length === 0,
				onClick: onRun
			}, "Run")), bench.stages.length === 0 ? (0, react.createElement)("p", { className: card_module_css_default.empty }, "The bench is empty — construct stages (the agent adds them; they land here).") : groups.map((g) => (0, react.createElement)("section", {
				key: g.card,
				className: card_module_css_default.category,
				"data-cards-category": g.card
			}, (0, react.createElement)("h3", { className: card_module_css_default.catTitle }, g.card + " · " + String(g.rows.length)), (0, react.createElement)("ol", { className: card_module_css_default.stages }, g.rows.map((s) => (0, react.createElement)(StageRowView, {
				key: s.id,
				stage: s,
				onOpen
			}))))), bench.log.length > 0 ? (0, react.createElement)("p", { className: card_module_css_default.logHead }, bench.log.length + " log entr" + (bench.log.length === 1 ? "y" : "ies")) : null, open !== null ? (0, react.createElement)(StageDrill, {
				stage: open,
				bench,
				running,
				onRun,
				onClose
			}) : null);
		}
		function RunView({ run, onBack, onRestored }) {
			const [restoring, setRestoring] = (0, react.useState)(false);
			const [note, setNote] = (0, react.useState)(null);
			const onRestore = (0, react.useCallback)(() => {
				setRestoring(true);
				setNote(null);
				restoreRunToBench(run).then((report) => {
					const extra = report.notes.length > 0 ? " (" + report.notes.join("; ") + ")" : "";
					const skipped = report.skipped > 0 ? ", " + String(report.skipped) + " skipped" : "";
					setNote("restored " + String(report.added) + " stage(s) to the bench" + skipped + extra);
					setRestoring(false);
					onRestored();
				}).catch((e) => {
					setNote(e instanceof Error ? e.message : String(e));
					setRestoring(false);
				});
			}, [run, onRestored]);
			return (0, react.createElement)("section", {
				className: card_module_css_default.runView,
				"data-run-status": run.status
			}, (0, react.createElement)("header", { className: card_module_css_default.runHead }, (0, react.createElement)("span", { className: card_module_css_default.runId }, run.runId), (0, react.createElement)("span", { className: card_module_css_default.runStatus }, run.status)), (0, react.createElement)("div", { className: card_module_css_default.runActions }, onBack !== void 0 ? (0, react.createElement)("button", {
				className: card_module_css_default.back,
				type: "button",
				onClick: onBack
			}, "Back to bench") : null, (0, react.createElement)("button", {
				className: card_module_css_default.restore,
				type: "button",
				disabled: restoring || run.draftId === null,
				title: run.draftId === null ? "this run names no draft — nothing to restore" : "copy this run’s stages back onto the bench as your own",
				onClick: onRestore
			}, restoring ? "Restoring…" : "Restore to bench")), note !== null ? (0, react.createElement)("p", { className: card_module_css_default.restoreNote }, note) : null, run.stages.length === 0 ? (0, react.createElement)("p", { className: card_module_css_default.empty }, "No stage rows yet.") : (0, react.createElement)("ol", { className: card_module_css_default.stages }, run.stages.map((s) => (0, react.createElement)("li", {
				key: s.id,
				className: card_module_css_default.stage,
				"data-stage-status": s.status
			}, (0, react.createElement)("span", { className: card_module_css_default.stageTitle }, s.id), (0, react.createElement)("span", { className: card_module_css_default.stageEngine }, s.status), s.url !== void 0 ? (0, react.createElement)("a", {
				href: mediaUrl(run.runId, s.url),
				target: "_blank",
				rel: "noreferrer",
				className: card_module_css_default.stageArtifact
			}, "artifact") : null))));
		}
		/** ADDRESS LAW (the `loading sidebar://cards…` hang, dead 2026-09-11):
		*  the shell's navigation address is the SHELL's (guide clicks arrive
		*  as the tab id's own address, not a cards address). An address that
		*  does not parse as a cards address serves the BENCH — the tab never
		*  sits on a resource no provider claims. */
		function resolveCardsAddress(rawAddress) {
			return parseCardsAddress(rawAddress) !== null ? rawAddress : CARDS_BENCH_ADDRESS;
		}
		/** The tab body component. */
		function CardsTab(props) {
			const info = typeof props.useTabInfo === "function" ? props.useTabInfo() : void 0;
			const address = resolveCardsAddress(info?.tab.navigation.address ?? info?.tab.contentId ?? "dsh-resource://cards/bench");
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
			const onBack = (0, react.useCallback)(() => {
				if (openResource !== void 0) openResource(CARDS_BENCH_ADDRESS);
			}, [openResource]);
			if (snapshot === void 0) return (0, react.createElement)("p", { className: card_module_css_default.missing }, "cards resource hook unavailable");
			if (snapshot.status === "loading" || snapshot.status === "none") return (0, react.createElement)("p", { className: card_module_css_default.loading }, "loading " + address + "…");
			if (snapshot.status === "failed") return (0, react.createElement)("p", { className: card_module_css_default.failed }, snapshot.failure?.message ?? "cards resource failed");
			const value = snapshot.value;
			if (value === void 0) return (0, react.createElement)("p", { className: card_module_css_default.failed }, "cards resource gave no value");
			return value.kind === "bench" ? (0, react.createElement)(BenchView, {
				bench: value,
				onRun,
				running
			}) : (0, react.createElement)(RunView, {
				run: value,
				onBack: openResource !== void 0 ? onBack : void 0,
				onRestored: onBack
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
		exports.groupStagesByCard = groupStagesByCard;
		exports.inject = inject;
		exports.mergeRunFrame = mergeRunFrame;
		exports.parseCardsAddress = parseCardsAddress;
		exports.parseCardsBlock = parseCardsBlock;
		exports.restoreRunToBench = restoreRunToBench;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
