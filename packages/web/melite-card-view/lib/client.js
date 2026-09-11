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
		const css = ".vYZV7a_card{flex-direction:column;min-width:0;margin:4px 0;font-size:12px;line-height:1.45;display:flex}.vYZV7a_load{color:var(--dsw-alias-label-secondary,#9a9aa5);padding:2px 0}.vYZV7a_head{align-items:center;gap:8px;min-width:0;display:flex}.vYZV7a_model{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-weight:600;overflow:hidden}.vYZV7a_state{border-radius:999px;flex:none;margin-left:auto;padding:1px 8px}.vYZV7a_state[data-state=completed]{color:var(--dsw-alias-state-success-primary,#3fb96f)}.vYZV7a_state[data-state=running],.vYZV7a_state[data-state=queued],.vYZV7a_state[data-state=pending],.vYZV7a_state[data-state=starting],.vYZV7a_state[data-state=draft]{color:var(--dsw-alias-state-warn-primary,#d9a53f)}.vYZV7a_state[data-state=failed],.vYZV7a_state[data-state=error],.vYZV7a_state[data-state=stopped],.vYZV7a_state[data-state=interrupted]{color:var(--dsw-alias-state-error-primary,#e05656)}.vYZV7a_prompt{color:var(--dsw-alias-text-secondary,#9a9aa5);-webkit-line-clamp:2;-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden}.vYZV7a_link:hover{text-decoration:underline}.vYZV7a_row{color:inherit;cursor:pointer;font:inherit;text-align:left;background:0 0;border:none;border-radius:6px;align-items:center;gap:8px;width:100%;min-width:0;padding:4px 6px;display:flex}.vYZV7a_row:hover{background:var(--dsw-alias-interactive-bg-hover,#2631480f)}.vYZV7a_row:focus-visible{outline:1px solid var(--dsw-alias-state-business-primary,#4f7bd8);outline-offset:-1px}.vYZV7a_thumb{object-fit:cover;border-radius:4px;flex:none;width:34px;height:34px}.vYZV7a_rowTitle{text-overflow:ellipsis;white-space:nowrap;flex:none;max-width:40%;font-weight:600;overflow:hidden}.vYZV7a_drill{width:92vw;max-width:min(860px,92vw)}.vYZV7a_split{grid-template-columns:minmax(240px,1fr) minmax(0,1.2fr);gap:14px;min-width:0;display:grid}@media (width<=640px){.vYZV7a_split{grid-template-columns:1fr}}.vYZV7a_params{flex-direction:column;gap:8px;min-width:0;max-height:60vh;display:flex;overflow-y:auto}.vYZV7a_field{flex-direction:column;gap:3px;min-width:0;display:flex}.vYZV7a_fieldKey{color:var(--dsw-alias-label-secondary,#9a9aa5);font-size:11px}.vYZV7a_outputs{flex-direction:column;align-items:center;gap:10px;min-width:0;display:flex}.vYZV7a_outputImg{object-fit:contain;border-radius:8px;max-width:100%;max-height:46vh}.vYZV7a_runRow{justify-content:flex-end;align-items:center;gap:10px;width:100%;display:flex}.vYZV7a_runError{color:var(--dsw-alias-label-error,#e05656);overflow-wrap:anywhere;font-size:11px}.vYZV7a_state[data-state=legacy]{color:var(--dsw-alias-label-secondary,#9a9aa5)}.vYZV7a_cardsBench{flex-direction:column;gap:8px;display:flex}.vYZV7a_benchHead{justify-content:space-between;align-items:center;gap:8px;display:flex}.vYZV7a_revTag{color:var(--dsw-alias-label-secondary,#61666b);font-family:var(--dsw-alias-font-mono,ui-monospace, monospace);font-size:11px}.vYZV7a_runBtn,.vYZV7a_back,.vYZV7a_restore{border:1px solid var(--dsw-alias-label-dimmed,#e1e5ee);color:inherit;cursor:pointer;font:inherit;background:0 0;border-radius:6px;padding:2px 10px;font-size:12px}.vYZV7a_runBtn:hover:not(:disabled),.vYZV7a_back:hover,.vYZV7a_restore:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,#2631480f);border-color:var(--dsw-alias-state-business-primary,#4f7bd8)}.vYZV7a_runBtn:disabled,.vYZV7a_restore:disabled{cursor:default;opacity:.45}.vYZV7a_category{flex-direction:column;gap:2px;display:flex}.vYZV7a_catTitle{color:var(--dsw-alias-label-secondary,#61666b);letter-spacing:.06em;text-transform:uppercase;margin:4px 0 2px;font-size:11px;font-weight:600}.vYZV7a_stages{flex-direction:column;gap:2px;margin:0;padding:0;list-style:none;display:flex}.vYZV7a_stage{list-style:none}.vYZV7a_stageTitle{text-overflow:ellipsis;white-space:nowrap;flex:none;max-width:45%;font-weight:600;overflow:hidden}.vYZV7a_stageEngine{color:var(--dsw-alias-label-secondary,#61666b);flex:none;font-size:11px}.vYZV7a_stageArtifact{color:var(--dsw-alias-state-business-primary,#4f7bd8);font-size:12px;text-decoration:none}.vYZV7a_stageArtifact:hover{text-decoration:underline}.vYZV7a_empty,.vYZV7a_loading,.vYZV7a_failed,.vYZV7a_missing,.vYZV7a_logHead,.vYZV7a_restoreNote{color:var(--dsw-alias-label-secondary,#61666b);margin:0;font-size:12px;font-style:italic}.vYZV7a_runView{flex-direction:column;gap:8px;display:flex}.vYZV7a_runHead{align-items:baseline;gap:8px;display:flex}.vYZV7a_runId{font-family:var(--dsw-alias-font-mono,ui-monospace, monospace);font-size:12px;font-weight:600}.vYZV7a_runStatus{border:1px solid var(--dsw-alias-label-dimmed,#e1e5ee);color:var(--dsw-alias-label-secondary,#61666b);border-radius:999px;padding:0 8px;font-size:11px}.vYZV7a_runActions{gap:8px;display:flex}.vYZV7a_stageDetail{grid-template-columns:auto 1fr;gap:2px 12px;margin:0;display:grid}.vYZV7a_stageDetail dt{color:var(--dsw-alias-label-secondary,#61666b);text-align:right;text-transform:uppercase;font-size:11px}.vYZV7a_stageDetail dd{min-width:0;margin:0}.vYZV7a_mono{font-family:var(--dsw-alias-font-mono,ui-monospace, monospace);font-size:12px;overflow-x:auto}.vYZV7a_tileGrid{grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin:0;padding:0;list-style:none;display:grid}.vYZV7a_tile{margin:0;padding:0;display:block}.vYZV7a_tileInner{border:1px solid var(--dsw-alias-label-dimmed,#e1e5ee);cursor:pointer;font:inherit;text-align:left;background:0 0;border-radius:10px;flex-direction:column;align-items:stretch;width:100%;padding:0;display:flex;overflow:hidden}.vYZV7a_tileInner:hover{border-color:var(--dsw-alias-state-business-primary,#4f7bd8);background:var(--dsw-alias-interactive-bg-hover,#2631480f)}.vYZV7a_tilePreview{aspect-ratio:1;flex:1;width:100%;min-height:0;margin:0;display:block;position:relative}.vYZV7a_tileImg,.vYZV7a_tileImgLink{width:100%;height:100%;display:block}.vYZV7a_tileImg{object-fit:cover}.vYZV7a_kindFace{background:var(--dsw-alias-interactive-bg-hover,#2631480f);color:var(--dsw-alias-label-secondary,#61666b);flex-direction:column;justify-content:center;align-items:center;gap:4px;width:100%;height:100%;display:flex}.vYZV7a_kindInitial{font-size:28px;font-weight:700;line-height:1}.vYZV7a_kindName{font-family:var(--dsw-alias-font-mono,ui-monospace, monospace);text-overflow:ellipsis;white-space:nowrap;padding:0 6px;font-size:10px;overflow:hidden}.vYZV7a_tileDot{position:absolute;bottom:6px;right:6px}.vYZV7a_tileCaption{border-top:1px solid var(--dsw-alias-label-dimmed,#e1e5ee);flex-direction:column;flex:none;gap:2px;padding:6px 8px;display:flex}.vYZV7a_tileTitle{text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:600;overflow:hidden}.vYZV7a_tileMeta{color:var(--dsw-alias-label-secondary,#61666b);font-family:var(--dsw-alias-font-mono,ui-monospace, monospace);align-items:center;gap:6px;font-size:10px;display:flex;overflow:hidden}.vYZV7a_tilePrompt{text-overflow:ellipsis;white-space:nowrap;flex:1;overflow:hidden}.vYZV7a_tileAdd .vYZV7a_tileInner{border-style:dashed}.vYZV7a_addFace{color:var(--dsw-alias-label-secondary,#61666b);justify-content:center;align-items:center;font-size:34px;font-weight:300;display:flex}.vYZV7a_picker{flex-direction:column;gap:10px;max-height:60vh;display:flex;overflow-y:auto}.vYZV7a_pickerGenre{flex-direction:column;gap:4px;display:flex}.vYZV7a_pickerCard{border:1px solid var(--dsw-alias-label-dimmed,#e1e5ee);color:inherit;cursor:pointer;font:inherit;text-align:left;background:0 0;border-radius:8px;align-items:baseline;gap:8px;width:100%;padding:8px 10px;display:flex}.vYZV7a_pickerCard:hover{background:var(--dsw-alias-interactive-bg-hover,#2631480f);border-color:var(--dsw-alias-state-business-primary,#4f7bd8)}.vYZV7a_pickerCardLabel{white-space:nowrap;font-size:13px;font-weight:600}.vYZV7a_pickerCardDesc{color:var(--dsw-alias-label-secondary,#61666b);text-overflow:ellipsis;white-space:nowrap;flex:1;font-size:12px;overflow:hidden}.vYZV7a_specForm{flex-direction:column;gap:12px;display:flex}.vYZV7a_specGroup{flex-direction:column;gap:8px;display:flex}.vYZV7a_specGroupTitle{color:var(--dsw-alias-label-secondary,#61666b);letter-spacing:.04em;text-transform:uppercase;margin:0 0 2px;font-size:11px;font-weight:600}.vYZV7a_specField{flex-direction:column;gap:3px;display:flex}.vYZV7a_specFieldKey{color:var(--dsw-alias-label-secondary,#61666b);font-size:12px}.vYZV7a_specRequired{color:var(--dsw-alias-state-critical,#e5484d)}.vYZV7a_specHint{color:var(--dsw-alias-label-secondary,#61666b);font-size:11px}.vYZV7a_specSelect{background:var(--dsw-alias-interactive-bg-hover,#2631480f);border:1px solid var(--dsw-alias-label-dimmed,#e1e5ee);color:inherit;font:inherit;border-radius:6px;width:100%;padding:5px 8px;font-size:13px}.vYZV7a_specSliderRow{align-items:center;gap:8px;display:flex}.vYZV7a_specSlider{flex:1}.vYZV7a_specSliderValue{color:var(--dsw-alias-label-secondary,#61666b);font-family:var(--dsw-alias-font-mono,ui-monospace, monospace);text-align:right;min-width:4ch;font-size:12px}.vYZV7a_specTextarea{background:var(--dsw-alias-interactive-bg-hover,#2631480f);border:1px solid var(--dsw-alias-label-dimmed,#e1e5ee);color:inherit;font:inherit;resize:vertical;border-radius:6px;width:100%;padding:6px 8px;font-size:13px}";
		const tagId = "@melite-plugin/dsh-card-view/card.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite-plugin/dsh-card-view";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var card_module_css_default = {
			"addFace": "vYZV7a_addFace",
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
			"kindFace": "vYZV7a_kindFace",
			"kindInitial": "vYZV7a_kindInitial",
			"kindName": "vYZV7a_kindName",
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
			"picker": "vYZV7a_picker",
			"pickerCard": "vYZV7a_pickerCard",
			"pickerCardDesc": "vYZV7a_pickerCardDesc",
			"pickerCardLabel": "vYZV7a_pickerCardLabel",
			"pickerGenre": "vYZV7a_pickerGenre",
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
			"specField": "vYZV7a_specField",
			"specFieldKey": "vYZV7a_specFieldKey",
			"specForm": "vYZV7a_specForm",
			"specGroup": "vYZV7a_specGroup",
			"specGroupTitle": "vYZV7a_specGroupTitle",
			"specHint": "vYZV7a_specHint",
			"specRequired": "vYZV7a_specRequired",
			"specSelect": "vYZV7a_specSelect",
			"specSlider": "vYZV7a_specSlider",
			"specSliderRow": "vYZV7a_specSliderRow",
			"specSliderValue": "vYZV7a_specSliderValue",
			"specTextarea": "vYZV7a_specTextarea",
			"split": "vYZV7a_split",
			"stage": "vYZV7a_stage",
			"stageArtifact": "vYZV7a_stageArtifact",
			"stageDetail": "vYZV7a_stageDetail",
			"stageEngine": "vYZV7a_stageEngine",
			"stageTitle": "vYZV7a_stageTitle",
			"stages": "vYZV7a_stages",
			"state": "vYZV7a_state",
			"thumb": "vYZV7a_thumb",
			"tile": "vYZV7a_tile",
			"tileAdd": "vYZV7a_tileAdd",
			"tileCaption": "vYZV7a_tileCaption",
			"tileDot": "vYZV7a_tileDot",
			"tileGrid": "vYZV7a_tileGrid",
			"tileImg": "vYZV7a_tileImg",
			"tileImgLink": "vYZV7a_tileImgLink",
			"tileInner": "vYZV7a_tileInner",
			"tileMeta": "vYZV7a_tileMeta",
			"tilePreview": "vYZV7a_tilePreview",
			"tilePrompt": "vYZV7a_tilePrompt",
			"tileTitle": "vYZV7a_tileTitle"
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
		//#region src/client/spec-form.tsx
		/**
		* spec-form.tsx — THE CARD FORM, spec-driven (2026-09-11 rebirth).
		*
		* THE OLD SYSTEM'S LAW (the editor's flowParamEditor + the /v1/form-spec
		* SSOT): a card's knob surface is DECLARED, not guessed — the Schemastery
		* schema projects to the served form spec (typed atoms: textarea, number,
		* slider, select, seed, switch; defaults seeded; groups; visible-when).
		* The picker and the drilldown both render THIS — the nice formatting is
		* the spec's own shape, never a raw key/value dump.
		*
		* DSH NATIVE: Input from the installed ui-primitives where it fits;
		* the atoms the primitives set lacks (select, slider, textarea) are
		* layout-only module CSS over native elements, every color an
		* inherited --dsw-alias-* token. No second app, no iframe — same-origin
		* /v1 doors (the 2026-09-11 production restore: model-catalog,
		* form-spec) and the bench wire door.
		*/
		/** Seed the editable values from the spec's declared defaults (the old
		*  picker's law: pick → defaults seeded → the user edits from there). */
		function specDefaults(fields) {
			const out = {};
			for (const f of fields) if (f.default !== void 0 && f.default !== null) out[f.name] = f.default;
			return out;
		}
		/** evalVisibleWhen's serving shape: "key=value" (a field shows when its
		*  guard key holds the value). A field with no visible_when always
		*  shows. Unknown guard keys: show (never hide on a typo). */
		function fieldVisible(f, values) {
			const rule = f.visible_when;
			if (typeof rule !== "string" || rule === "") return true;
			const eq = rule.indexOf("=");
			if (eq < 0) return true;
			const key = rule.slice(0, eq);
			const want = rule.slice(eq + 1);
			const held = values[key];
			return String(held ?? "") === want;
		}
		/** Group the visible fields (the spec's own group key, first-appearance
		*  order — ungrouped first under no heading). */
		function groupFields(fields, values) {
			const out = [];
			for (const f of fields) {
				if (!fieldVisible(f, values)) continue;
				const g = typeof f.group === "string" && f.group !== "" ? f.group : null;
				const known = out.find((x) => x.group === g);
				if (known === void 0) out.push({
					group: g,
					fields: [f]
				});
				else known.fields.push(f);
			}
			return out;
		}
		/** Read a same-origin /v1 JSON door. Non-200 → named throw (the door's
		*  own error text when present). */
		async function v1Get(path, signal) {
			const res = await fetch(path, { ...signal === void 0 ? {} : { signal } });
			const body = await res.json().catch(() => null);
			if (!res.ok) {
				const err = typeof body === "object" && body !== null ? Reflect.get(body, "error") : void 0;
				throw new Error(typeof err === "string" ? err : path + ": HTTP " + String(res.status));
			}
			return body;
		}
		/** /v1/model-catalog → the cards section (the picker's ONE surface —
		*  action cards, one tile per card package; models are NOT entries). */
		async function fetchCardCatalog(signal) {
			const raw = (await v1Get("/v1/model-catalog", signal))["cards"] ?? {};
			const out = [];
			for (const [id, row] of Object.entries(raw)) {
				if (typeof row !== "object" || row === null) continue;
				const famsRaw = row["families"];
				out.push({
					id,
					label: typeof row["label"] === "string" ? row["label"] : id,
					description: typeof row["description"] === "string" ? row["description"] : "",
					genre: typeof row["genre"] === "string" ? row["genre"] : "",
					families: Array.isArray(famsRaw) ? famsRaw.filter((x) => typeof x === "string") : [id]
				});
			}
			return out.sort((a, b) => a.label.localeCompare(b.label));
		}
		/** /v1/form-spec?model=<family> — the card family's declared knob set. */
		async function fetchFormSpec(model, signal) {
			const doc = await v1Get("/v1/form-spec?model=" + encodeURIComponent(model), signal);
			if (!Array.isArray(doc["fields"])) throw new Error("form-spec: no fields array");
			return doc;
		}
		/** One spec atom — typed by the declaration, edited as a raw string
		*  while typing (decimal dots survive; coercion happens once at patch). */
		function SpecAtom({ f, value, onEdit }) {
			if (f.type === "select" && Array.isArray(f.options) && f.options.length > 0) return (0, react.createElement)("select", {
				className: card_module_css_default.specSelect,
				value: String(value ?? ""),
				onChange: (e) => onEdit(f.name, e.target.value),
				"aria-label": f.label
			}, f.options.map((o) => (0, react.createElement)("option", {
				key: o.value,
				value: o.value
			}, o.label)));
			if (f.type === "slider") {
				const num = typeof value === "number" ? value : Number(value);
				return (0, react.createElement)("span", { className: card_module_css_default.specSliderRow }, (0, react.createElement)("input", {
					className: card_module_css_default.specSlider,
					type: "range",
					min: f.min ?? 0,
					max: f.max ?? 10,
					step: f.step ?? .1,
					value: Number.isFinite(num) ? num : f.default ?? 0,
					onInput: (e) => onEdit(f.name, e.target.value),
					"aria-label": f.label
				}), (0, react.createElement)("span", { className: card_module_css_default.specSliderValue }, String(value ?? f.default ?? "")));
			}
			if (f.type === "switch" || f.type === "boolean") {
				const on = value === true || value === "true";
				return (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
					active: on,
					onClick: () => onEdit(f.name, !on)
				}, on ? "on" : "off");
			}
			if (f.type === "textarea") return (0, react.createElement)("textarea", {
				className: card_module_css_default.specTextarea,
				rows: 3,
				value: String(value ?? ""),
				placeholder: f.placeholder ?? "",
				onChange: (e) => onEdit(f.name, e.target.value),
				"aria-label": f.label
			});
			return (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Input, {
				value: String(value ?? ""),
				placeholder: f.placeholder ?? "",
				onChange: (e) => onEdit(f.name, e.target.value),
				"aria-label": f.label
			});
		}
		/** THE CARD FORM — the spec's fields, grouped, visible-when honored,
		*  defaults seeded by the caller. Edits ride the caller's values map. */
		function SpecForm({ fields, values, onEdit }) {
			const groups = groupFields(fields, values);
			return (0, react.createElement)("div", { className: card_module_css_default.specForm }, groups.map((g) => (0, react.createElement)("section", {
				key: g.group ?? "",
				className: card_module_css_default.specGroup
			}, g.group !== null ? (0, react.createElement)("h4", { className: card_module_css_default.specGroupTitle }, g.group) : null, g.fields.map((f) => (0, react.createElement)("label", {
				key: f.name,
				className: card_module_css_default.specField
			}, (0, react.createElement)("span", { className: card_module_css_default.specFieldKey }, f.label, f.required === true ? (0, react.createElement)("span", { className: card_module_css_default.specRequired }, " *") : null), (0, react.createElement)(SpecAtom, {
				f,
				value: values[f.name],
				onEdit
			}), f.tooltip !== void 0 && f.tooltip !== "" ? (0, react.createElement)("span", { className: card_module_css_default.specHint }, f.tooltip) : null)))));
		}
		/** Coerce the raw edit strings to the spec's declared types — ONCE, at
		*  patch time (the editPatch law). Only keys that CHANGED from the
		*  stage's held params ride the patch. */
		function specPatch(fields, values, held) {
			const out = {};
			for (const f of fields) {
				const v = values[f.name];
				if (v === void 0) continue;
				const before = held[f.name] ?? f.default;
				if (String(v) === String(before ?? "")) continue;
				if (f.type === "number" || f.type === "seed" || f.type === "slider") {
					const n = Number(v);
					out[f.name] = Number.isFinite(n) ? n : v;
				} else if (f.type === "switch" || f.type === "boolean") out[f.name] = v === true || v === "true";
				else out[f.name] = v;
			}
			return out;
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
		/** Re-read the shared bench (session 'main') — the consumer's reload
		*  after its own edits (the provider's bench stream is a single
		*  snapshot; same-address navigation does not re-run it). */
		async function fetchBench(signal) {
			return readBench(await wireCall("bench/get", { sessionKey: "main" }, signal));
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
					const row = await wireCall("bench/add-stage", {
						sessionKey: "main",
						doc
					}, signal);
					if (typeof row["rev"] === "number") rev = row["rev"];
					report.added += 1;
				} catch (e) {
					const message = e instanceof Error ? e.message : String(e);
					if (id !== null && message.includes("already on the bench")) {
						const retry = { ...doc };
						delete retry["id"];
						try {
							const row = await wireCall("bench/add-stage", {
								sessionKey: "main",
								doc: retry
							}, signal);
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
		//#region src/client/add-stage.ts
		/**
		* add-stage.ts — the bench add-stage wire door caller (the tab's
		* add-card path). The remote's signature is (sessionKey, doc) — the
		* args frame carries BOTH named; the doc holds card/author/engine/
		* params/expect_rev (the CAS law: the caller reads bench/get first
		* and chains the rev). */
		async function addStageWire(doc, signal) {
			const rpcId = nextRpcId$1();
			const res = await fetch("/api/bench/add-stage", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					type: "client-request",
					rpcId,
					method: "bench/add-stage",
					payload: { args: {
						sessionKey: "main",
						doc
					} }
				}),
				...signal === void 0 ? {} : { signal }
			});
			if (!res.ok) throw new Error("bench/add-stage: HTTP " + String(res.status));
			const body = await res.json();
			if (typeof body !== "object" || body === null || Reflect.get(body, "type") !== "server-response" || Reflect.get(body, "rpcId") !== rpcId) throw new Error("bench/add-stage: malformed response frame");
			const result = Reflect.get(body, "result");
			if (typeof result !== "object" || result === null) throw new Error("bench/add-stage: malformed result");
			if (Reflect.get(result, "ok") !== true) {
				const error = Reflect.get(result, "error");
				throw new Error(typeof error === "object" && error !== null && typeof Reflect.get(error, "message") === "string" ? Reflect.get(error, "message") : "bench/add-stage refused");
			}
			const value = Reflect.get(result, "value");
			if (typeof value !== "object" || value === null) throw new Error("bench/add-stage: not an object");
			return value;
		}
		/** The bench remove-stage wire door caller (the drill's Remove path).
		*  Same frame as the add (sessionKey, doc); the doc holds stage/
		*  expect_rev (the CAS law: the caller chains the bench rev it
		*  rendered, so a concurrent edit refuses instead of slicing wrong). */
		async function removeStageWire(doc, signal) {
			const rpcId = nextRpcId$1();
			const res = await fetch("/api/bench/remove-stage", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					type: "client-request",
					rpcId,
					method: "bench/remove-stage",
					payload: { args: {
						sessionKey: "main",
						doc
					} }
				}),
				...signal === void 0 ? {} : { signal }
			});
			if (!res.ok) throw new Error("bench/remove-stage: HTTP " + String(res.status));
			const body = await res.json();
			if (typeof body !== "object" || body === null || Reflect.get(body, "type") !== "server-response" || Reflect.get(body, "rpcId") !== rpcId) throw new Error("bench/remove-stage: malformed response frame");
			const result = Reflect.get(body, "result");
			if (typeof result !== "object" || result === null) throw new Error("bench/remove-stage: malformed result");
			if (Reflect.get(result, "ok") !== true) {
				const error = Reflect.get(result, "error");
				throw new Error(typeof error === "object" && error !== null && typeof Reflect.get(error, "message") === "string" ? Reflect.get(error, "message") : "bench/remove-stage refused");
			}
			const value = Reflect.get(result, "value");
			if (typeof value !== "object" || value === null) throw new Error("bench/remove-stage: not an object");
			return value;
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
		async function runTheBench(bench) {
			const stages = bench.stages.map(projectStage);
			if (stages.length === 0) return { refused: "nothing to run" };
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
							flow_inline: {
								id: bench.draftId,
								stages
							},
							draft_id: bench.draftId,
							test: false
						} } }
					})
				});
				if (!res.ok) return { refused: "run refused: HTTP " + String(res.status) };
				const body = await res.json().catch(() => null);
				if (typeof body !== "object" || body === null || Reflect.get(body, "type") !== "server-response" || Reflect.get(body, "rpcId") !== rpcId) return { refused: "run refused: malformed response frame" };
				const result = Reflect.get(body, "result");
				if (typeof result !== "object" || result === null) return { refused: "run refused: malformed result" };
				if (Reflect.get(result, "ok") === true) {
					const runId = Reflect.get(Reflect.get(result, "value"), "run_id");
					if (typeof runId === "string" && runId !== "") return { runId };
					return { refused: "run refused: no run_id in the answer" };
				}
				const error = Reflect.get(result, "error");
				const message = typeof error === "object" && error !== null && typeof Reflect.get(error, "message") === "string" ? Reflect.get(error, "message") : "runs/start refused";
				return { refused: String(message) };
			} catch (e) {
				return { refused: e instanceof Error ? e.message : "run request failed" };
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
		/** THE CARD ROW — the chat plane's CardRowLine grammar VERBATIM
		*  (f3026845, the 9-10 card system): [artifact thumb | kind Pill],
		*  bold title, service Pill, live StateDot, clipped prompt. ONE card
		*  system, both planes — the tab renders the SAME row the chat
		*  renders, from the same stylesheet (the .row/.thumb/.rowTitle/
		*  .prompt classes below are the flow block's own). */
		/** THE CARD TILE — the operator's CardTile law (flowCardTile.tsx)
		*  ported to the tab, DSH native: the visual card (INNER) is ONE flex
		*  column with exactly two flow children —
		*    1. the PREVIEW CELL — flex-1 min-h-0, aspect-square: it owns
		*       every pixel the caption strip doesn't need. Media fills it
		*       edge to edge (object-cover); no artifact yet → the KIND FACE
		*       (the kind initial, the glyph chain's face without the editor
		*       runtime). A portrait artifact can NOT drive the row height
		*       (SQUARE LAW, 2026-08-23).
		*    2. the CAPTION STRIP — shrink-0, natural height: the declared
		*       summary line (title · engine) + the live status dot.
		*  Image-anchored overlays (the status dot) live INSIDE the preview
		*  cell so their anchors ride the artifact's corner. Click = the
		*  drilldown (the second state, the shared CardDrill). */
		function StageTile({ row, onOpen }) {
			return (0, react.createElement)("li", {
				className: card_module_css_default.tile,
				"data-stage-id": row.id,
				"data-stage-status": row.status
			}, (0, react.createElement)("button", {
				className: card_module_css_default.tileInner,
				type: "button",
				"data-status": row.status,
				onClick: () => onOpen(row)
			}, (0, react.createElement)("span", { className: card_module_css_default.tilePreview }, row.thumbUrl !== null ? (0, react.createElement)("img", {
				className: card_module_css_default.tileImg,
				src: row.thumbUrl,
				alt: row.title,
				loading: "lazy"
			}) : (0, react.createElement)("span", {
				className: card_module_css_default.kindFace,
				"data-kind": row.kind
			}, (0, react.createElement)("span", { className: card_module_css_default.kindInitial }, row.kind.slice(0, 1).toUpperCase()), (0, react.createElement)("span", { className: card_module_css_default.kindName }, row.kind)), row.dot !== null ? (0, react.createElement)("span", { className: card_module_css_default.tileDot }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: row.dot })) : null), (0, react.createElement)("span", { className: card_module_css_default.tileCaption }, (0, react.createElement)("span", { className: card_module_css_default.tileTitle }, row.title), (0, react.createElement)("span", { className: card_module_css_default.tileMeta }, row.service !== null ? row.service : null, row.prompt !== null ? (0, react.createElement)("span", { className: card_module_css_default.tilePrompt }, row.prompt) : null))));
		}
		function benchRow(stage) {
			const title = stage.title ?? stage.card ?? stage.id;
			const status = typeof stage.runStatus === "string" && stage.runStatus !== "" ? stage.runStatus : "ready";
			const params = typeof stage.params === "object" && stage.params !== null ? stage.params : {};
			const promptRaw = typeof params["prompt"] === "string" ? params["prompt"] : "";
			const result = stage.result;
			const url = typeof result === "object" && result !== null && typeof Reflect.get(result, "url") === "string" ? Reflect.get(result, "url") : "";
			return {
				id: stage.id,
				kind: String(stage.card ?? "card"),
				title: String(title),
				service: typeof stage.engine === "string" && stage.engine !== "" ? stage.engine : null,
				status,
				dot: STAGE_DOT[status] ?? null,
				prompt: promptRaw !== "" ? promptRaw.slice(0, 96) : null,
				thumbUrl: /^(https?:\/\/|\/)/.test(url) ? url : null,
				stage
			};
		}
		/** THE SHARED DRILLDOWN — spec-formatted (the old system's law): the
		*  stage's card carries a DECLARED form (/v1/form-spec — typed atoms,
		*  groups, defaults); the drill renders THAT, never a raw key/value
		*  dump. Params left, Run right; the patch carries only CHANGED keys
		*  (coerced once, at patch time — the editPatch law); then the run
		*  gesture (patch lands in the domain BEFORE the run reads it). */
		function StageDrill({ stage, bench, running, onRun, onClose, onRemoved }) {
			const title = String(stage.title ?? stage.card ?? stage.id);
			const held = typeof stage.params === "object" && stage.params !== null ? stage.params : {};
			const [spec, setSpec] = (0, react.useState)(null);
			const [values, setValues] = (0, react.useState)({});
			const [error, setError] = (0, react.useState)(null);
			const [loaded, setLoaded] = (0, react.useState)(false);
			const [removing, setRemoving] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				let alive = true;
				const family = String(stage.card ?? "");
				if (family === "") {
					setLoaded(true);
					return;
				}
				fetchFormSpec(family).then((doc) => {
					if (!alive) return;
					setSpec(doc);
					setValues({
						...specDefaults(doc.fields),
						...held
					});
					setLoaded(true);
				}).catch((e) => {
					if (!alive) return;
					setError(e instanceof Error ? e.message : "form-spec unavailable");
					setLoaded(true);
				});
				return () => {
					alive = false;
				};
			}, [stage.id]);
			const onEdit = (0, react.useCallback)((name, v) => {
				setValues((m) => ({
					...m,
					[name]: v
				}));
			}, []);
			const run = async () => {
				setError(null);
				try {
					const patch = spec !== null ? specPatch(spec.fields, values, held) : {};
					if (Object.keys(patch).length > 0) await patchStageParams(bench.draftId, stage.id, patch);
					onRun();
				} catch (e) {
					setError(e instanceof Error ? e.message : "run failed");
				}
			};
			const remove = async () => {
				setError(null);
				setRemoving(true);
				try {
					await removeStageWire({
						stage: stage.id,
						expect_rev: bench.rev
					});
					onRemoved();
				} catch (e) {
					setError(e instanceof Error ? e.message : "remove failed");
					setRemoving(false);
				}
			};
			return (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose,
				title: "Stage " + title,
				closeLabel: "Close stage",
				className: card_module_css_default.drill
			}, (0, react.createElement)("div", { className: card_module_css_default.split }, (0, react.createElement)("div", { className: card_module_css_default.params }, !loaded ? (0, react.createElement)("div", { className: card_module_css_default.load }, "form…") : spec !== null ? (0, react.createElement)(SpecForm, {
				fields: spec.fields,
				values,
				onEdit
			}) : (0, react.createElement)("pre", { className: card_module_css_default.mono }, JSON.stringify(held, null, 2))), (0, react.createElement)("div", { className: card_module_css_default.outputs }, (0, react.createElement)("div", { className: card_module_css_default.runRow }, error !== null ? (0, react.createElement)("span", { className: card_module_css_default.runError }, error) : null, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "primary",
				disabled: running,
				onClick: () => {
					run();
				}
			}, running ? "running…" : "Run")), (0, react.createElement)("div", { className: card_module_css_default.runRow }, (0, react.createElement)("button", {
				className: card_module_css_default.back,
				type: "button",
				disabled: running || removing,
				onClick: () => {
					remove();
				}
			}, removing ? "removing…" : "Remove stage")))));
		}
		/** THE ADD-CARD DOOR (the old system's power, DSH-native): the trailing
		*  + tile → the picker (the catalog's action cards, search + genre
		*  groups) → the card's DECLARED form (defaults seeded) → bench/add-stage
		*  as the user (CAS-chained). ONE surface: action cards; models are not
		*  entries (the model select lives ON the card's form). */
		function AddCardDoor({ bench, onAdded, onClose }) {
			const [cards, setCards] = (0, react.useState)(null);
			const [catalogError, setCatalogError] = (0, react.useState)(null);
			const [query, setQuery] = (0, react.useState)("");
			const [picked, setPicked] = (0, react.useState)(null);
			const [spec, setSpec] = (0, react.useState)(null);
			const [values, setValues] = (0, react.useState)({});
			const [formError, setFormError] = (0, react.useState)(null);
			const [adding, setAdding] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				let alive = true;
				fetchCardCatalog().then((list) => {
					if (alive) setCards(list);
				}).catch((e) => {
					if (alive) setCatalogError(e instanceof Error ? e.message : "catalog unavailable");
				});
				return () => {
					alive = false;
				};
			}, []);
			const pick = (card) => {
				setPicked(card);
				setSpec(null);
				setFormError(null);
				fetchFormSpec(card.families[0] ?? card.id).then((doc) => {
					setSpec(doc);
					setValues(specDefaults(doc.fields));
				}).catch((e) => setFormError(e instanceof Error ? e.message : "form-spec unavailable"));
			};
			const onEdit = (0, react.useCallback)((name, v) => {
				setValues((m) => ({
					...m,
					[name]: v
				}));
			}, []);
			const add = async () => {
				if (picked === null) return;
				setAdding(true);
				setFormError(null);
				try {
					const doc = {
						card: picked.id,
						author: "user",
						engine: spec?.engine ?? "comfyui",
						expect_rev: bench.rev
					};
					const params = spec !== null ? specPatch(spec.fields, values, specDefaults(spec.fields)) : {};
					if (Object.keys(params).length > 0) doc["params"] = {
						...specDefaults(spec?.fields ?? []),
						...values
					};
					await addStageWire(doc);
					setAdding(false);
					onAdded();
				} catch (e) {
					setFormError(e instanceof Error ? e.message : "add refused");
					setAdding(false);
				}
			};
			const filtered = (cards ?? []).filter((c) => {
				if (query === "") return true;
				const q = query.toLowerCase();
				return c.label.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || c.genre.toLowerCase().includes(q);
			});
			const genres = [];
			for (const c of filtered) {
				const g = c.genre !== "" ? c.genre : "other";
				const known = genres.find((x) => x[0] === g);
				if (known === void 0) genres.push([g, [c]]);
				else known[1].push(c);
			}
			return (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose,
				title: "Add a card",
				closeLabel: "Close picker",
				className: card_module_css_default.drill
			}, picked === null ? (0, react.createElement)("div", { className: card_module_css_default.picker }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Input, {
				value: query,
				placeholder: "search cards…",
				onChange: (e) => setQuery(e.target.value),
				"aria-label": "Search cards"
			}), catalogError !== null ? (0, react.createElement)("p", { className: card_module_css_default.runError }, catalogError) : null, cards === null && catalogError === null ? (0, react.createElement)("div", { className: card_module_css_default.load }, "cards…") : null, genres.map(([g, list]) => (0, react.createElement)("section", {
				key: g,
				className: card_module_css_default.pickerGenre
			}, (0, react.createElement)("h4", { className: card_module_css_default.specGroupTitle }, g), list.map((c) => (0, react.createElement)("button", {
				key: c.id,
				type: "button",
				className: card_module_css_default.pickerCard,
				onClick: () => pick(c)
			}, (0, react.createElement)("span", { className: card_module_css_default.pickerCardLabel }, c.label), c.description !== "" ? (0, react.createElement)("span", { className: card_module_css_default.pickerCardDesc }, c.description) : null, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Pill, null, c.families[0] ?? c.id)))))) : (0, react.createElement)("div", { className: card_module_css_default.split }, (0, react.createElement)("div", { className: card_module_css_default.params }, (0, react.createElement)("button", {
				type: "button",
				className: card_module_css_default.back,
				onClick: () => {
					setPicked(null);
					setSpec(null);
				}
			}, "← " + (cards?.length ?? 0) + " cards"), spec === null && formError === null ? (0, react.createElement)("div", { className: card_module_css_default.load }, "form…") : null, formError !== null ? (0, react.createElement)("p", { className: card_module_css_default.runError }, formError) : null, spec !== null ? (0, react.createElement)(SpecForm, {
				fields: spec.fields,
				values,
				onEdit
			}) : null), (0, react.createElement)("div", { className: card_module_css_default.outputs }, (0, react.createElement)("div", { className: card_module_css_default.runRow }, formError !== null ? (0, react.createElement)("span", { className: card_module_css_default.runError }, formError) : null, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "primary",
				disabled: adding || spec === null,
				onClick: () => {
					add();
				}
			}, adding ? "adding…" : "Add card")))));
		}
		function BenchView({ bench, onRun, running }) {
			const [live, setLive] = (0, react.useState)(bench);
			(0, react.useEffect)(() => {
				setLive(bench);
			}, [bench.draftId, bench.rev]);
			const [open, setOpen] = (0, react.useState)(null);
			const [adding, setAdding] = (0, react.useState)(false);
			const [reloadError, setReloadError] = (0, react.useState)(null);
			const onOpen = (0, react.useCallback)((stage) => setOpen(stage), []);
			const onClose = (0, react.useCallback)(() => setOpen(null), []);
			const onAddCard = (0, react.useCallback)(() => setAdding(true), []);
			const reload = (0, react.useCallback)(() => {
				setReloadError(null);
				fetchBench().then((next) => {
					setLive(next);
					setOpen(null);
				}).catch((e) => {
					setReloadError(e instanceof Error ? e.message : "bench reload failed");
				});
			}, []);
			const onAdded = (0, react.useCallback)(() => {
				setAdding(false);
				reload();
			}, [reload]);
			const benchRev = live.rev;
			return (0, react.createElement)("section", {
				className: card_module_css_default.cardsBench,
				"data-cards-bench": benchRev
			}, (0, react.createElement)("header", { className: card_module_css_default.benchHead }, (0, react.createElement)("span", { className: card_module_css_default.revTag }, "rev " + benchRev), (0, react.createElement)("button", {
				className: card_module_css_default.runBtn,
				type: "button",
				disabled: running || live.stages.length === 0,
				onClick: onRun
			}, "Run")), reloadError !== null ? (0, react.createElement)("p", { className: card_module_css_default.runError }, reloadError) : null, live.stages.length === 0 ? (0, react.createElement)("p", { className: card_module_css_default.empty }, "The bench is empty — construct stages (the agent adds them; they land here).") : (0, react.createElement)("ol", { className: card_module_css_default.tileGrid }, live.stages.map((s) => {
				const row = benchRow(s);
				return (0, react.createElement)(StageTile, {
					key: s.id,
					row,
					onOpen: (r) => onOpen(r.stage)
				});
			}), (0, react.createElement)("li", { className: card_module_css_default.tile + " " + card_module_css_default.tileAdd }, (0, react.createElement)("button", {
				type: "button",
				className: card_module_css_default.tileInner,
				"aria-label": "Add a card",
				onClick: onAddCard
			}, (0, react.createElement)("span", { className: card_module_css_default.tilePreview + " " + card_module_css_default.addFace }, "+"), (0, react.createElement)("span", { className: card_module_css_default.tileCaption }, (0, react.createElement)("span", { className: card_module_css_default.tileTitle }, "Add a card"))))), live.log.length > 0 ? (0, react.createElement)("p", { className: card_module_css_default.logHead }, live.log.length + " log entr" + (live.log.length === 1 ? "y" : "ies")) : null, open !== null ? (0, react.createElement)(StageDrill, {
				stage: open,
				bench: live,
				running,
				onRun,
				onClose,
				onRemoved: () => {
					setOpen(null);
					reload();
				}
			}) : null, adding ? (0, react.createElement)(AddCardDoor, {
				bench: live,
				onAdded,
				onClose: () => {
					setAdding(false);
				}
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
			}, restoring ? "Restoring…" : "Restore to bench")), note !== null ? (0, react.createElement)("p", { className: card_module_css_default.restoreNote }, note) : null, run.stages.length === 0 ? (0, react.createElement)("p", { className: card_module_css_default.empty }, "No stage rows yet.") : (0, react.createElement)("ol", { className: card_module_css_default.tileGrid }, run.stages.map((s) => {
				const thumb = s.url !== void 0 ? mediaUrl(run.runId, s.url) : null;
				const dot = s.status === "done" ? "done" : s.status === "running" ? "ongoing" : s.status === "failed" ? "error" : s.status === "queued" || s.status === "pending" ? "warning" : null;
				const face = thumb !== null ? (0, react.createElement)("a", {
					href: thumb,
					target: "_blank",
					rel: "noreferrer",
					className: card_module_css_default.tileImgLink
				}, (0, react.createElement)("img", {
					className: card_module_css_default.tileImg,
					src: thumb,
					alt: s.id,
					loading: "lazy"
				})) : (0, react.createElement)("span", {
					className: card_module_css_default.kindFace,
					"data-kind": s.id
				}, (0, react.createElement)("span", { className: card_module_css_default.kindInitial }, s.id.slice(0, 1).toUpperCase()), (0, react.createElement)("span", { className: card_module_css_default.kindName }, s.id));
				return (0, react.createElement)("li", {
					key: s.id,
					className: card_module_css_default.tile,
					"data-stage-status": s.status
				}, (0, react.createElement)("div", {
					className: card_module_css_default.tileInner,
					"data-status": s.status
				}, (0, react.createElement)("span", { className: card_module_css_default.tilePreview }, face, dot !== null ? (0, react.createElement)("span", { className: card_module_css_default.tileDot }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: dot })) : null), (0, react.createElement)("span", { className: card_module_css_default.tileCaption }, (0, react.createElement)("span", { className: card_module_css_default.tileTitle }, s.id), (0, react.createElement)("span", { className: card_module_css_default.tileMeta }, s.status))));
			})));
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
			const [localRun, setLocalRun] = (0, react.useState)(null);
			const [localRunError, setLocalRunError] = (0, react.useState)(null);
			const runStreamAbort = (0, react.useRef)(null);
			(0, react.useEffect)(() => () => {
				runStreamAbort.current?.abort();
			}, []);
			const onStarted = (0, react.useCallback)((runId) => {
				setRunning(false);
				if (openResource !== void 0) {
					openResource(cardsRunAddress(runId));
					return;
				}
				runStreamAbort.current?.abort();
				const ctrl = new AbortController();
				runStreamAbort.current = ctrl;
				setLocalRunError(null);
				(async () => {
					try {
						for await (const frame of openCardsResource(cardsRunAddress(runId), { signal: ctrl.signal })) {
							if (ctrl.signal.aborted) return;
							if (frame.ok) setLocalRun(frame.value);
							else {
								const err = typeof frame === "object" && frame !== null && "error" in frame ? frame.error : null;
								setLocalRunError(err instanceof Error ? err.message : "run stream failed");
								return;
							}
						}
					} catch (e) {
						if (!ctrl.signal.aborted) setLocalRunError(e instanceof Error ? e.message : "run stream failed");
					}
				})();
			}, [openResource]);
			const onRun = (0, react.useCallback)(() => {
				if (snapshot?.value?.kind !== "bench") return;
				setRunning(true);
				setLocalRunError(null);
				runTheBench(snapshot.value).then((res) => {
					if ("runId" in res) onStarted(res.runId);
					else {
						setRunning(false);
						setLocalRunError(res.refused);
					}
				});
			}, [snapshot, onStarted]);
			const onBack = (0, react.useCallback)(() => {
				if (openResource !== void 0) openResource(CARDS_BENCH_ADDRESS);
			}, [openResource]);
			const onLocalBack = (0, react.useCallback)(() => {
				runStreamAbort.current?.abort();
				setLocalRun(null);
				setLocalRunError(null);
			}, []);
			if (localRun !== null) return (0, react.createElement)(RunView, {
				run: localRun,
				onBack: onLocalBack,
				onRestored: onLocalBack
			});
			if (snapshot === void 0) return (0, react.createElement)("p", { className: card_module_css_default.missing }, "cards resource hook unavailable");
			if (snapshot.status === "loading" || snapshot.status === "none") return (0, react.createElement)("p", { className: card_module_css_default.loading }, "loading " + address + "…");
			if (snapshot.status === "failed") return (0, react.createElement)("p", { className: card_module_css_default.failed }, snapshot.failure?.message ?? "cards resource failed");
			const value = snapshot.value;
			if (value === void 0) return (0, react.createElement)("p", { className: card_module_css_default.failed }, "cards resource gave no value");
			return value.kind === "bench" ? (0, react.createElement)(react.Fragment, null, localRunError !== null ? (0, react.createElement)("p", { className: card_module_css_default.runError }, localRunError) : null, (0, react.createElement)(BenchView, {
				bench: value,
				onRun,
				running
			})) : (0, react.createElement)(RunView, {
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
					title: (address) => {
						const resolved = resolveCardsAddress(address);
						return resolved === "dsh-resource://cards/bench" ? "Cards" : resolved.replace(/^dsh-resource:\/\/cards\//, "");
					},
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
