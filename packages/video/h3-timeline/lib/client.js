window.__ModuleLoader__.load({
	id: "@melite/video-h3-timeline",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __esmMin = (fn, res, err) => () => {
			if (err) throw err[0];
			try {
				return fn && (res = fn(fn = 0)), res;
			} catch (e) {
				throw err = [e], e;
			}
		};
		var __exportAll = (all, no_symbols) => {
			let target = {};
			for (var name in all) __defProp(target, name, {
				get: all[name],
				enumerable: true
			});
			if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
			return target;
		};
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		react = __toESM(react, 1);
		let _melite_card_base_client = require("@melite/card-base/client");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		//#region ../../web-kit/contracts/src/stageView.ts
		function recordOf$2(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
		}
		function nonEmptyString$1(value) {
			return typeof value === "string" && value !== "" ? value : "";
		}
		function stringsOf$1(value) {
			return Array.isArray(value) ? value.filter((entry) => typeof entry === "string" && entry !== "") : [];
		}
		/** THE STATUS FOLD — the one owner of "what does this raw status word
		*  mean" (2026-10-13, the card-UI duplication audit: five seats folded
		*  the same words privately and disagreed — 'cached' rendered as `done`
		*  in one and a failure-looking `stopped` in another, and a stage the
		*  estate settles as 'completed' matched no branch at all in one of
		*  them). Every seat asks THIS. */
		function statusOf$1(value) {
			switch (value.toLowerCase()) {
				case "done":
				case "completed":
				case "succeeded":
				case "success": return "done";
				case "failed":
				case "error": return "error";
				case "stopped":
				case "interrupted":
				case "unknown": return "stopped";
				case "stopping": return "running";
				case "running":
				case "live": return "running";
				case "pending":
				case "queued":
				case "ready": return "queued";
				case "stale": return "stale";
				case "cached": return "cached";
				case "skipped": return "skipped";
				case "reused": return "reused";
				case "": return "pending";
				default: {
					const known = [...RUN_STATUS_WORDS$1].join(", ");
					throw new Error(`statusOf: unknown run-status word ${JSON.stringify(value)} — the vocabulary is RUN_STATUS_WORDS (${known}); add the word to the fold and the set together, never fold garbage to 'pending'`);
				}
			}
		}
		/** THE TERMINAL JUDGEMENT — the other half of the same question ("is
		*  this run finished?"), which five seats also spelled privately with
		*  DISAGREEMENT: one set treated `unknown` as terminal and `error` as
		*  live, the other the reverse, so a run in either word never stopped
		*  a poller on one plane. The estate's own vocabulary is the node
		*  truth (`RunStatus = queued|running|completed|failed|stopped|
		*  stopping`, estate-queue/src/runsTypes.ts); `error` and `unknown`
		*  additionally ride the wire (melite-run-wire documents `error` as
		*  the run record's own failure stamp; runStatusContract lists
		*  `unknown` as a schema value), so both belong on the terminal side
		*  here. */
		function isTerminalStatus$1(value) {
			return TERMINAL_RUN_STATUSES$1.has(value.toLowerCase());
		}
		/** The terminal word set, exported so a seat that needs to SHOW it
		*  (a poll's stop condition, a doc) reads the same list. Reconciled
		*  with the backend's RUN_STATUSES (catalog/src/runStatusContract.ts)
		*  2026-10-01: `interrupted` joined, and the file-era done words
		*  (`succeeded`, `success`) became terminal — a poller handed either
		*  previously ran to its ceiling. The card-plane words (done, cached,
		*  reused, skipped, stale) stay out: runs are never stamped with
		*  them; they describe artifacts, not run lifecycle. */
		const TERMINAL_RUN_STATUSES$1 = /* @__PURE__ */ new Set([
			"completed",
			"failed",
			"stopped",
			"error",
			"unknown",
			"interrupted",
			"succeeded",
			"success"
		]);
		/** THE LIVE JUDGEMENT — the third question seats spelled privately
		*  ({running,queued} in one file, {running,queued,pending} in another,
		*  both omitting the wire's `live` and the estate's `stopping`): is
		*  this word a run still in motion? LIVE words are the KNOWN live
		*  vocabulary only — an unrecognized word is NOT live (spinning on a
		*  word we cannot read is a fake state; every private set this
		*  replaces already excluded strangers). Pollers that must keep
		*  watching unknown words read !isTerminalStatus, not this. */
		const LIVE_RUN_STATUSES$1 = /* @__PURE__ */ new Set([
			"running",
			"live",
			"stopping",
			"queued",
			"pending"
		]);
		function isLiveRunStatus$1(value) {
			return !isTerminalStatus$1(value) && LIVE_RUN_STATUSES$1.has(value.toLowerCase());
		}
		/** The fold's whole input domain — every run-level word `statusOf` and
		* the terminal/live judgements branch on, in ONE list. Boundary readers
		* (readRunStatus) throw on words outside it: garbage must fail loud at
		* the read, never fold to 'pending' or pass through raw (the
		* schema-strictness audit's fix 3, 2026-10-01). Kept in lockstep with
		* statusOf's case list by the walls spec (a word in one and not the
		* other fails the test). */
		const RUN_STATUS_WORDS$1 = /* @__PURE__ */ new Set([
			"done",
			"completed",
			"succeeded",
			"success",
			"failed",
			"error",
			"stopped",
			"interrupted",
			"unknown",
			"stopping",
			"running",
			"live",
			"pending",
			"queued",
			"ready",
			"stale",
			"cached",
			"skipped",
			"reused"
		]);
		/** THE VIEW-SIDE READ (the shared seam, 2026-10-12): a projection
		*  answers "what should this row show", and a word outside the
		*  vocabulary has no answer to show — it is the no-information home,
		*  not a crash. `statusOf` above stays the strict classifier (it
		*  refuses, because a caller asking it for a classification deserves
		*  the truth); every view seat reads through THIS so the membership
		*  law lives once instead of per seat. Absence ('') folds the same
		*  way, which is why it needs no case of its own downstream. */
		function statusOrPendingOf$1(value) {
			return RUN_STATUS_WORDS$1.has(value.toLowerCase()) ? statusOf$1(value) : "pending";
		}
		function galleryOf$1(value) {
			if (!Array.isArray(value)) return void 0;
			const gallery = value.flatMap((entry) => {
				const row = recordOf$2(entry);
				const name = nonEmptyString$1(row["name"]);
				const url = nonEmptyString$1(row["url"]);
				return name !== "" && url !== "" ? [{
					name,
					url
				}] : [];
			});
			return gallery.length > 0 ? gallery : void 0;
		}
		function previewsOf$1(value) {
			if (!Array.isArray(value)) return void 0;
			const previews = value.flatMap((entry) => {
				const row = recordOf$2(entry);
				const label = nonEmptyString$1(row["label"]);
				const artifact = nonEmptyString$1(row["artifact"]);
				const url = row["url"] === null || typeof row["url"] === "string" ? row["url"] : null;
				return label !== "" && artifact !== "" ? [{
					label,
					url,
					artifact
				}] : [];
			});
			return previews.length > 0 ? previews : void 0;
		}
		function cardResultFromRecord$1(value) {
			const result = recordOf$2(value);
			const artifacts = {};
			for (const [name, url] of Object.entries(recordOf$2(result["artifacts"]))) {
				const clean = nonEmptyString$1(url);
				if (clean !== "") artifacts[name] = clean;
			}
			const assetUrls = stringsOf$1(result["assetUrls"]);
			const metadata = recordOf$2(result["metadata"]);
			if (Object.keys(artifacts).length === 0 && assetUrls.length === 0) return null;
			return {
				artifacts,
				assetUrls,
				metadata,
				...typeof result["durationSec"] === "number" ? { durationSec: result["durationSec"] } : {},
				...galleryOf$1(result["gallery"]) === void 0 ? {} : { gallery: galleryOf$1(result["gallery"]) },
				...previewsOf$1(result["motionPreviews"]) === void 0 ? {} : { motionPreviews: previewsOf$1(result["motionPreviews"]) }
			};
		}
		function inputBindingsOf$1(value) {
			const bindings = [];
			for (const [slot, raw] of Object.entries(recordOf$2(value))) {
				const ref = recordOf$2(raw);
				const stage = nonEmptyString$1(ref["stage"]);
				if (stage !== "") {
					const output = nonEmptyString$1(ref["output"]);
					bindings.push({
						slot,
						source: output === "" ? { stage } : {
							stage,
							output
						}
					});
				} else if (typeof ref["initial"] === "string") bindings.push({
					slot,
					source: { initial: true }
				});
			}
			return bindings;
		}
		function projectStageView$1(owner, options = {}) {
			const row = owner.row;
			const resolved = recordOf$2(row["resolved"]);
			const rowParams = recordOf$2(row["params"]);
			const params = owner.effective?.params ?? rowParams;
			const card = nonEmptyString$1(row["card"]) || owner.cardName;
			const kind = options.kind ?? (card || "stage");
			const service = options.service ?? (nonEmptyString$1(row["service"]) || kind);
			const model = nonEmptyString$1(owner.effective?.model) || nonEmptyString$1(resolved["model"]) || nonEmptyString$1(row["model"]) || nonEmptyString$1(params["model"]) || service;
			const inputSlots = (owner.effective?.inputSlots ?? []).filter((slot) => typeof slot === "string" && slot !== "");
			const inputBindings = inputBindingsOf$1(row["inputs"]);
			const inputs = inputBindings.flatMap((binding) => "stage" in binding.source ? [binding.source.stage] : []);
			const inputOutputs = inputBindings.map((binding) => "stage" in binding.source ? binding.source.output ?? null : null);
			const priorStageIds = owner.priorStageIds ?? owner.upstream.map((stage) => stage.id);
			const inputIndices = inputs.map((id) => priorStageIds.indexOf(id));
			const result = cardResultFromRecord$1(row["result"]);
			const harvested = options.result === void 0 ? result : options.result(row, result);
			const resultRecord = recordOf$2(row["result"]);
			const metadata = recordOf$2(harvested?.metadata);
			const error = nonEmptyString$1(row["error"]) || nonEmptyString$1(resultRecord["error"]) || nonEmptyString$1(metadata["error"]);
			const runId = owner.runId || nonEmptyString$1(row["runId"]) || nonEmptyString$1(resultRecord["runId"]) || nonEmptyString$1(resultRecord["run_id"]) || nonEmptyString$1(metadata["runId"]) || null;
			const tags = Array.isArray(row["tags"]) ? row["tags"].filter((tag) => tag === "ai_generated") : void 0;
			return {
				id: owner.stageId,
				title: nonEmptyString$1(row["title"]) || card || owner.stageId,
				kind,
				service,
				model,
				...options.genre === void 0 ? {} : { genre: options.genre },
				...tags === void 0 ? {} : { tags },
				params,
				...inputSlots.length === 0 ? {} : { inputSlots },
				...inputBindings.length === 0 ? {} : { inputBindings },
				inputs,
				...inputOutputs.length === 0 ? {} : { inputOutputs },
				inputIndices,
				result: harvested,
				...Array.isArray(row["history"]) ? { history: row["history"] } : {},
				status: statusOrPendingOf$1(owner.runStatus),
				...error === "" ? {} : { error },
				runId,
				...typeof row["saveToAssets"] === "boolean" ? { saveToAssets: row["saveToAssets"] } : {}
			};
		}
		function projectUpstreamStages$1(owner, options = {}) {
			return owner.upstream.map((upstream) => ({
				id: upstream.id,
				title: upstream.title,
				kind: options.kind ?? "image",
				service: options.service ?? "",
				genre: options.genre ?? "image",
				params: {},
				inputs: [],
				inputIndices: [],
				result: {
					artifacts: upstream.title === "" ? {} : { [upstream.title]: upstream.url },
					assetUrls: upstream.url === "" ? [] : [upstream.url],
					metadata: {}
				},
				status: "done"
			}));
		}
		//#endregion
		//#region \0dsh-css:packages/video/h3-timeline/src/ui/studio/studio.module.css.mjs
		const css$1 = ".ezL1Ba_tabular{font-variant-numeric:tabular-nums}.ezL1Ba_nowrap{white-space:nowrap}.ezL1Ba_sz10{width:10px;height:10px}.ezL1Ba_sz12{width:12px;height:12px}.ezL1Ba_ctlInput::placeholder{color:var(--dsw-alias-label-tertiary)}.ezL1Ba_ctlInput:focus,.ezL1Ba_ctlSelect:focus,.ezL1Ba_selMenuBox:focus{border-color:var(--dsw-alias-brand-primary)}.ezL1Ba_selMenuBox:disabled{opacity:.5}.ezL1Ba_studioRoot.ezL1Ba_studioRoot>:first-child{grid-area:1/1;min-width:0;min-height:0}.ezL1Ba_studioRoot.ezL1Ba_studioRoot>:nth-child(2){flex-direction:column;grid-area:1/2;min-width:0;min-height:0;display:flex;overflow:hidden}.ezL1Ba_studioRoot.ezL1Ba_studioRoot>:nth-child(3){grid-area:2/1/auto/-1;min-width:0;min-height:0;max-height:none;overflow:visible}.ezL1Ba_studioRoot{box-sizing:border-box;height:100%;min-height:0;color:var(--dsw-alias-label-primary);gap:8px;padding:12px}.ezL1Ba_railCol{flex-direction:column;gap:8px;min-width:0;height:100%;min-height:0;padding:10px 12px;display:flex;overflow:clip auto}.ezL1Ba_docBlock{border-bottom:1px solid var(--dsw-alias-border-l1);flex:none;min-width:0;padding-bottom:10px}.ezL1Ba_railCol>*{min-width:0}.ezL1Ba_docLines{color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;flex-direction:column;gap:4px;padding:0 4px;font-size:10px;line-height:1.625;display:flex}.ezL1Ba_warnRow{color:var(--dsw-alias-state-warn-primary);align-items:flex-start;gap:4px;display:flex}.ezL1Ba_warnIcon{flex:none;margin-top:2px}.ezL1Ba_runFold{border-bottom:1px solid var(--dsw-alias-border-l1);flex:none}.ezL1Ba_runSummaryNote{text-transform:none;letter-spacing:normal;color:var(--dsw-alias-label-tertiary);font-size:9px;font-weight:400}.ezL1Ba_runBody{flex-direction:column;gap:8px;padding-bottom:10px;display:flex}.ezL1Ba_panel{flex:none}.ezL1Ba_rowsHead{align-items:baseline;gap:6px;padding-bottom:4px;display:flex}.ezL1Ba_focusHead{align-items:center;gap:8px;padding-bottom:6px;display:flex}.ezL1Ba_backBtn{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);height:24px;color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:6px;flex:none;align-items:center;gap:4px;padding:0 6px;font-size:10px;transition:color .15s,border-color .15s;display:flex}.ezL1Ba_backBtn:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}.ezL1Ba_beatFlag{color:var(--dsw-alias-brand-primary);flex:none;font-size:9px}.ezL1Ba_compactList{flex-direction:column;gap:4px;display:flex}.ezL1Ba_focusList{flex-direction:column;gap:8px;display:flex}.ezL1Ba_callRow{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);text-align:left;cursor:pointer;border-radius:6px;align-items:center;gap:8px;width:100%;padding:6px 8px;transition:border-color .15s,background-color .15s;display:flex}.ezL1Ba_callRow:hover{border-color:var(--dsw-alias-brand-primary);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 5%, transparent)}.ezL1Ba_callIdx{text-transform:uppercase;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);flex:none;font-size:9px;font-weight:600}.ezL1Ba_excerpt{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;font-size:10px;overflow:hidden}.ezL1Ba_excerptFull{color:var(--dsw-alias-label-primary)}.ezL1Ba_excerptEmpty{color:var(--dsw-alias-label-tertiary);font-style:italic}.ezL1Ba_callDur{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);flex:none;font-size:9px}.ezL1Ba_kfPanel{border-top:1px solid var(--dsw-alias-border-l1);margin-top:8px;padding-top:6px}.ezL1Ba_kfHead{align-items:baseline;gap:6px;padding-bottom:4px;display:flex}.ezL1Ba_kfRow{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:6px;align-items:center;gap:8px;padding:4px 8px;display:flex}.ezL1Ba_kfKind{text-transform:uppercase;letter-spacing:.06em;border-radius:6px;padding:2px 6px;font-size:9px;font-weight:600}.ezL1Ba_kfTime{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);flex:none;font-size:9px}.ezL1Ba_kfDel{width:20px;height:20px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:6px;flex:none;justify-content:center;align-items:center;transition:background-color .15s,color .15s;display:flex}.ezL1Ba_kfDel:hover{background:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-label-primary)}.ezL1Ba_textIn>input,.ezL1Ba_srcIn>input,.ezL1Ba_prevNum>input{border:1px solid var(--dsw-alias-border-l2);background:color-mix(in srgb, var(--dsw-alias-bg-base) 30%, transparent);width:100%;font-family:var(--dsw-alias-font-mono,ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);color:var(--dsw-alias-label-primary);border-radius:6px;outline:none;padding:2px 6px;font-size:10px;line-height:1.5}.ezL1Ba_textIn>input:focus,.ezL1Ba_srcIn>input:focus,.ezL1Ba_prevNum>input:focus{border-color:var(--dsw-alias-brand-primary)}.ezL1Ba_callCard{padding:6px 2px;transition:color .15s}.ezL1Ba_callCardSel .ezL1Ba_cardId,.ezL1Ba_callCardSel .ezL1Ba_cardSpan{color:var(--dsw-alias-label-primary)}.ezL1Ba_cardHead{align-items:center;gap:8px;padding-bottom:4px;display:flex}.ezL1Ba_cardId{text-transform:uppercase;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);flex:none;font-size:9px;font-weight:600}.ezL1Ba_cardSpan{text-overflow:ellipsis;white-space:nowrap;font-variant-numeric:tabular-nums;min-width:0;color:var(--dsw-alias-label-tertiary);flex:auto;font-size:9px;overflow:hidden}.ezL1Ba_knobTag{border:1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, transparent);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent);text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-brand-primary);border-radius:6px;flex:none;padding:1px 4px;font-size:8px;font-weight:600}.ezL1Ba_delBtn{border:1px solid var(--dsw-alias-border-l2);text-transform:uppercase;letter-spacing:.06em;height:20px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border-radius:6px;flex:none;align-items:center;gap:4px;margin-left:auto;padding:0 6px;font-size:9px;transition:border-color .15s,background-color .15s,color .15s;display:flex}.ezL1Ba_delBtn:hover{border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 60%, transparent);background:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-label-primary)}.ezL1Ba_spanRow{align-items:center;gap:6px;padding:4px 0;display:flex}.ezL1Ba_spanRow>span{min-width:0}.ezL1Ba_spanRow input{width:100%;max-width:100%}.ezL1Ba_spanLabel{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-tertiary);flex:none;font-size:9px}.ezL1Ba_spanDash,.ezL1Ba_spanNote{color:var(--dsw-alias-label-tertiary);font-size:9px}.ezL1Ba_guidesRow{align-items:center;gap:8px;display:flex}.ezL1Ba_guideWrap{flex:none;position:relative}.ezL1Ba_guideDot{pointer-events:none;z-index:10;width:6px;height:6px;position:absolute;top:50%;left:6px;transform:translateY(-50%)rotate(45deg)}.ezL1Ba_callRefs{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:6px;padding:6px}.ezL1Ba_refCountOver{color:var(--dsw-alias-state-warn-primary)}.ezL1Ba_callRefsBody{flex-direction:column;gap:4px;margin-top:4px;display:flex}.ezL1Ba_knobFold{margin-top:4px}.ezL1Ba_knobCount{border:1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, transparent);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent);color:var(--dsw-alias-brand-primary);border-radius:6px;padding:0 4px;font-size:8px}.ezL1Ba_knobGrid{border-top:1px solid var(--dsw-alias-border-l1);grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:6px 16px;margin-top:4px;padding-top:6px;display:grid}.ezL1Ba_knobGrid>*,.ezL1Ba_knobGrid label>span{min-width:0}.ezL1Ba_knobGrid input,.ezL1Ba_knobGrid select{max-width:100%}.ezL1Ba_knobGrid select,.ezL1Ba_seamRow>select{color-scheme:light}.ezL1Ba_beatsWrap{flex-direction:column;gap:4px;display:flex}.ezL1Ba_beatsWrap>*{min-width:0}.ezL1Ba_railCol input,.ezL1Ba_railCol select,.ezL1Ba_railCol textarea{box-sizing:border-box}.ezL1Ba_iconMini:hover{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 15%, transparent)}.ezL1Ba_iconMini:disabled{opacity:.3}.ezL1Ba_iconMiniMut:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.ezL1Ba_beatErr{color:var(--dsw-alias-state-error-primary);font-size:8px;line-height:1.25}.ezL1Ba_beatDel:hover{background:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-label-primary)}.ezL1Ba_textHead{justify-content:space-between;align-items:center;display:flex}.ezL1Ba_textLabel{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-tertiary);font-size:9px}.ezL1Ba_enhanceRow{align-items:center;gap:4px;display:flex}.ezL1Ba_enhanceBtn{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-brand-primary);cursor:pointer;background:0 0;border:none;border-radius:6px;padding:2px 4px;font-size:9px;font-weight:500;transition:background-color .15s}.ezL1Ba_enhanceBtn:hover{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 15%, transparent)}.ezL1Ba_enhanceBtn:disabled{opacity:.3}.ezL1Ba_undoBtn{color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:6px;padding:2px 4px;font-size:9px;transition:background-color .15s,color .15s}.ezL1Ba_undoBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.ezL1Ba_promptBox{resize:vertical;border:1px solid var(--dsw-alias-border-l2);background:color-mix(in srgb, var(--dsw-alias-bg-base) 30%, transparent);width:100%;height:auto;min-height:2.25rem;color:var(--dsw-alias-label-primary);border-radius:6px;outline:none;padding:4px 8px;font-size:11px;line-height:1.5}.ezL1Ba_promptBox::placeholder{color:var(--dsw-alias-label-tertiary)}.ezL1Ba_promptBox:focus{border-color:var(--dsw-alias-brand-primary)}.ezL1Ba_promptBoxEmpty{border-color:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 40%, transparent);color:var(--dsw-alias-state-warn-primary)}.ezL1Ba_promptBoxEmpty::placeholder{color:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 40%, transparent)}.ezL1Ba_promptBoxEmpty:focus{border-color:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 70%, transparent)}.ezL1Ba_linkBtn:hover{opacity:.8}.ezL1Ba_srcIn>input{font-size:10px}.ezL1Ba_srcIn>input::placeholder{color:var(--dsw-alias-label-tertiary);font-family:sans-serif}.ezL1Ba_fileErr{color:var(--dsw-alias-state-error-primary);font-size:8px;line-height:1.25}.ezL1Ba_linkClose:hover{color:var(--dsw-alias-label-primary)}.ezL1Ba_linkRow:hover{background:var(--dsw-alias-interactive-bg-hover)}.ezL1Ba_seamRow{color:var(--dsw-alias-label-secondary);align-items:center;gap:4px;font-size:10px;line-height:1.25;display:flex}.ezL1Ba_seamRow>select{min-width:0;max-width:100%}.ezL1Ba_seamLabel{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-secondary);flex:none}.ezL1Ba_prevLabel{flex-wrap:wrap;align-items:center;gap:4px;font-size:10px;line-height:1.25;display:flex}.ezL1Ba_prevLabelOn{color:var(--dsw-alias-label-secondary)}.ezL1Ba_prevLabelOff{cursor:not-allowed;color:var(--dsw-alias-label-tertiary)}.ezL1Ba_prevNum{flex:none;width:3rem;display:inline-flex}.ezL1Ba_prevNum>input{border:1px solid var(--dsw-alias-border-l2);background:color-mix(in srgb, var(--dsw-alias-bg-base) 30%, transparent);text-align:center;width:100%;font-family:var(--dsw-alias-font-mono,ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary);border-radius:6px;outline:none;padding:1px 4px;font-size:10px}.ezL1Ba_prevNum9>input{font-size:9px}.ezL1Ba_prevNum>input:focus{border-color:var(--dsw-alias-brand-primary)}.ezL1Ba_prevNote{width:100%;color:var(--dsw-alias-label-tertiary);font-size:8px}.ezL1Ba_refRow{flex-direction:column;gap:2px;display:flex}.ezL1Ba_chips{flex-wrap:wrap;gap:4px;display:flex}.ezL1Ba_declaredChip{border:1px dashed var(--dsw-alias-border-l2);min-width:0;max-width:100%;color:var(--dsw-alias-label-secondary);border-radius:6px;align-items:center;gap:4px;padding:2px 6px 2px 2px;font-size:9px;display:inline-flex}.ezL1Ba_declaredThumb{object-fit:cover;border-radius:4px;flex:none;width:24px;height:24px}.ezL1Ba_declaredName{text-overflow:ellipsis;white-space:nowrap;flex:auto;min-width:0;overflow:hidden}.ezL1Ba_declaredTag{text-transform:uppercase;letter-spacing:.04em;color:var(--dsw-alias-label-tertiary);flex:none;font-size:8px}.ezL1Ba_busAnchor{flex-direction:column;gap:2px;min-width:0;display:flex}.ezL1Ba_chipX:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.ezL1Ba_pickSelBoxOk:focus{border-color:var(--dsw-alias-brand-primary)}.ezL1Ba_uploadBtn:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary)}.ezL1Ba_group{flex-direction:column;gap:6px;display:flex}.ezL1Ba_groupTitle{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-tertiary);font-size:9px;font-weight:600}.ezL1Ba_winSize{align-items:center;gap:4px;display:flex}.ezL1Ba_times{color:var(--dsw-alias-label-tertiary)}.ezL1Ba_clipsRow{align-items:center;gap:8px;display:flex}.ezL1Ba_clipsNote{text-overflow:ellipsis;white-space:nowrap;min-width:0;color:var(--dsw-alias-label-tertiary);flex:1;font-size:10px;overflow:hidden}.ezL1Ba_clipsHint{text-overflow:ellipsis;white-space:nowrap;border-left:1px solid var(--dsw-alias-border-l2);max-width:46%;color:var(--dsw-alias-label-tertiary);opacity:.85;flex-shrink:0;padding-left:8px;font-size:10px;overflow:hidden}.ezL1Ba_filmBox{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-interactive-bg-hover);border-radius:6px;flex-direction:column;flex:1;min-height:0;padding:8px 10px;display:flex}.ezL1Ba_histRow{flex-wrap:wrap;flex:none;align-items:center;gap:4px;padding-bottom:6px;display:flex}.ezL1Ba_histChip{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-interactive-bg-hover);font-family:var(--dsw-alias-font-mono,ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);color:var(--dsw-alias-label-secondary);border-radius:6px;padding:2px 6px;font-size:9px;text-decoration:none;transition:border-color .15s,color .15s}.ezL1Ba_histChip:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}.ezL1Ba_heroRow{flex:1;align-items:center;gap:8px;min-height:0;padding-bottom:4px;display:flex;overflow-x:auto}.ezL1Ba_finalCut{box-sizing:border-box;border:1px solid var(--dsw-alias-brand-primary);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 7%, transparent);min-width:0;height:100%;box-shadow:0 0 18px -6px color-mix(in srgb, var(--dsw-alias-brand-primary) 35%, transparent);border-radius:6px;flex-direction:column;flex:1;gap:4px;padding:6px;display:flex}.ezL1Ba_player{object-fit:contain;background:color-mix(in srgb, var(--dsw-alias-bg-base) 50%, transparent);border-radius:6px;flex:1;width:100%;height:100%;min-height:0}.ezL1Ba_cutBar{align-items:center;gap:4px;padding:0 2px;display:flex}.ezL1Ba_cutIcon{width:12px;height:12px;color:var(--dsw-alias-brand-primary);flex:none}.ezL1Ba_cutTime{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);margin-left:4px;font-size:9px}.ezL1Ba_cutOpen{color:var(--dsw-alias-brand-primary);text-underline-offset:2px;margin-left:auto;font-size:9px}.ezL1Ba_cutOpen:hover{text-decoration:underline}.ezL1Ba_winTile{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-interactive-bg-hover);border-radius:6px;flex-direction:column;flex:none;gap:4px;width:9rem;height:100%;padding:6px;transition:border-color .15s;display:flex}.ezL1Ba_winTile:hover{border-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, transparent)}.ezL1Ba_winVid{background:color-mix(in srgb, var(--dsw-alias-bg-base) 50%, transparent);object-fit:cover;border-radius:6px;flex:1;width:100%;min-height:0}.ezL1Ba_winName{text-overflow:ellipsis;white-space:nowrap;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary);padding:0 2px;font-size:9px;overflow:hidden}.ezL1Ba_emptyGlyph{width:20px;height:20px;color:var(--dsw-alias-label-tertiary)}.ezL1Ba_laneInspector{border-top:1px solid color-mix(in srgb, var(--dsw-alias-label-tertiary) 25%, transparent);flex-direction:column;gap:4px;padding:6px 0 2px;display:flex}.ezL1Ba_laneRow{align-items:center;gap:6px;display:flex}.ezL1Ba_laneName{text-overflow:ellipsis;white-space:nowrap;max-width:160px;color:var(--dsw-alias-label-secondary);flex:none;font-size:10px;overflow:hidden}.ezL1Ba_laneSelect{border:1px solid color-mix(in srgb, var(--dsw-alias-label-tertiary) 40%, transparent);color:var(--dsw-alias-label-primary);background:0 0;border-radius:4px;flex:none;padding:1px 4px;font-size:10px}.ezL1Ba_laneText{border:1px solid color-mix(in srgb, var(--dsw-alias-label-tertiary) 40%, transparent);min-width:120px;color:var(--dsw-alias-label-primary);background:0 0;border-radius:4px;flex:1;padding:2px 6px;font-size:10px}.ezL1Ba_laneDelete{color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;flex:none;padding:0 4px;font-size:12px}.ezL1Ba_laneDelete:hover{color:var(--dsw-alias-state-danger-primary)}.ezL1Ba_blockerWrap{display:block}.ezL1Ba_laneBlocker{border:1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary) 45%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 12%, transparent);color:var(--dsw-alias-label-primary);border-radius:8px;margin-bottom:6px;padding:6px 10px;font-size:11px;line-height:1.45}.ezL1Ba_gateFace{color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere;font-size:11px;line-height:1.45}.ezL1Ba_modPathForm{align-items:center;gap:4px;display:inline-flex}.ezL1Ba_modPathForm input{border:1px solid var(--dsw-alias-border-l2);width:180px;color:inherit;background:0 0;border-radius:6px;padding:2px 6px;font-size:10px}.ezL1Ba_modPathForm button{border:1px solid var(--dsw-alias-border-l2);color:inherit;cursor:pointer;background:0 0;border-radius:6px;padding:2px 8px;font-size:10px}.ezL1Ba_spanInfo{color:var(--dshtx2,#8b8f98);cursor:help;user-select:none;font-size:12px;line-height:1}";
		const tagId$1 = "@melite/video-h3-timeline/studio.module.css@41618497";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite/video-h3-timeline";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var studio_module_css_default = {
			"backBtn": "ezL1Ba_backBtn",
			"beatDel": "ezL1Ba_beatDel",
			"beatErr": "ezL1Ba_beatErr",
			"beatFlag": "ezL1Ba_beatFlag",
			"beatsWrap": "ezL1Ba_beatsWrap",
			"blockerWrap": "ezL1Ba_blockerWrap",
			"busAnchor": "ezL1Ba_busAnchor",
			"callCard": "ezL1Ba_callCard",
			"callCardSel": "ezL1Ba_callCardSel",
			"callDur": "ezL1Ba_callDur",
			"callIdx": "ezL1Ba_callIdx",
			"callRefs": "ezL1Ba_callRefs",
			"callRefsBody": "ezL1Ba_callRefsBody",
			"callRow": "ezL1Ba_callRow",
			"cardHead": "ezL1Ba_cardHead",
			"cardId": "ezL1Ba_cardId",
			"cardSpan": "ezL1Ba_cardSpan",
			"chipX": "ezL1Ba_chipX",
			"chips": "ezL1Ba_chips",
			"clipsHint": "ezL1Ba_clipsHint",
			"clipsNote": "ezL1Ba_clipsNote",
			"clipsRow": "ezL1Ba_clipsRow",
			"compactList": "ezL1Ba_compactList",
			"ctlInput": "ezL1Ba_ctlInput",
			"ctlSelect": "ezL1Ba_ctlSelect",
			"cutBar": "ezL1Ba_cutBar",
			"cutIcon": "ezL1Ba_cutIcon",
			"cutOpen": "ezL1Ba_cutOpen",
			"cutTime": "ezL1Ba_cutTime",
			"declaredChip": "ezL1Ba_declaredChip",
			"declaredName": "ezL1Ba_declaredName",
			"declaredTag": "ezL1Ba_declaredTag",
			"declaredThumb": "ezL1Ba_declaredThumb",
			"delBtn": "ezL1Ba_delBtn",
			"docBlock": "ezL1Ba_docBlock",
			"docLines": "ezL1Ba_docLines",
			"emptyGlyph": "ezL1Ba_emptyGlyph",
			"enhanceBtn": "ezL1Ba_enhanceBtn",
			"enhanceRow": "ezL1Ba_enhanceRow",
			"excerpt": "ezL1Ba_excerpt",
			"excerptEmpty": "ezL1Ba_excerptEmpty",
			"excerptFull": "ezL1Ba_excerptFull",
			"fileErr": "ezL1Ba_fileErr",
			"filmBox": "ezL1Ba_filmBox",
			"finalCut": "ezL1Ba_finalCut",
			"focusHead": "ezL1Ba_focusHead",
			"focusList": "ezL1Ba_focusList",
			"gateFace": "ezL1Ba_gateFace",
			"group": "ezL1Ba_group",
			"groupTitle": "ezL1Ba_groupTitle",
			"guideDot": "ezL1Ba_guideDot",
			"guideWrap": "ezL1Ba_guideWrap",
			"guidesRow": "ezL1Ba_guidesRow",
			"heroRow": "ezL1Ba_heroRow",
			"histChip": "ezL1Ba_histChip",
			"histRow": "ezL1Ba_histRow",
			"iconMini": "ezL1Ba_iconMini",
			"iconMiniMut": "ezL1Ba_iconMiniMut",
			"kfDel": "ezL1Ba_kfDel",
			"kfHead": "ezL1Ba_kfHead",
			"kfKind": "ezL1Ba_kfKind",
			"kfPanel": "ezL1Ba_kfPanel",
			"kfRow": "ezL1Ba_kfRow",
			"kfTime": "ezL1Ba_kfTime",
			"knobCount": "ezL1Ba_knobCount",
			"knobFold": "ezL1Ba_knobFold",
			"knobGrid": "ezL1Ba_knobGrid",
			"knobTag": "ezL1Ba_knobTag",
			"laneBlocker": "ezL1Ba_laneBlocker",
			"laneDelete": "ezL1Ba_laneDelete",
			"laneInspector": "ezL1Ba_laneInspector",
			"laneName": "ezL1Ba_laneName",
			"laneRow": "ezL1Ba_laneRow",
			"laneSelect": "ezL1Ba_laneSelect",
			"laneText": "ezL1Ba_laneText",
			"linkBtn": "ezL1Ba_linkBtn",
			"linkClose": "ezL1Ba_linkClose",
			"linkRow": "ezL1Ba_linkRow",
			"modPathForm": "ezL1Ba_modPathForm",
			"nowrap": "ezL1Ba_nowrap",
			"panel": "ezL1Ba_panel",
			"pickSelBoxOk": "ezL1Ba_pickSelBoxOk",
			"player": "ezL1Ba_player",
			"prevLabel": "ezL1Ba_prevLabel",
			"prevLabelOff": "ezL1Ba_prevLabelOff",
			"prevLabelOn": "ezL1Ba_prevLabelOn",
			"prevNote": "ezL1Ba_prevNote",
			"prevNum": "ezL1Ba_prevNum",
			"prevNum9": "ezL1Ba_prevNum9",
			"promptBox": "ezL1Ba_promptBox",
			"promptBoxEmpty": "ezL1Ba_promptBoxEmpty",
			"railCol": "ezL1Ba_railCol",
			"refCountOver": "ezL1Ba_refCountOver",
			"refRow": "ezL1Ba_refRow",
			"rowsHead": "ezL1Ba_rowsHead",
			"runBody": "ezL1Ba_runBody",
			"runFold": "ezL1Ba_runFold",
			"runSummaryNote": "ezL1Ba_runSummaryNote",
			"seamLabel": "ezL1Ba_seamLabel",
			"seamRow": "ezL1Ba_seamRow",
			"selMenuBox": "ezL1Ba_selMenuBox",
			"spanDash": "ezL1Ba_spanDash",
			"spanInfo": "ezL1Ba_spanInfo",
			"spanLabel": "ezL1Ba_spanLabel",
			"spanNote": "ezL1Ba_spanNote",
			"spanRow": "ezL1Ba_spanRow",
			"srcIn": "ezL1Ba_srcIn",
			"studioRoot": "ezL1Ba_studioRoot",
			"sz10": "ezL1Ba_sz10",
			"sz12": "ezL1Ba_sz12",
			"tabular": "ezL1Ba_tabular",
			"textHead": "ezL1Ba_textHead",
			"textIn": "ezL1Ba_textIn",
			"textLabel": "ezL1Ba_textLabel",
			"times": "ezL1Ba_times",
			"undoBtn": "ezL1Ba_undoBtn",
			"uploadBtn": "ezL1Ba_uploadBtn",
			"warnIcon": "ezL1Ba_warnIcon",
			"warnRow": "ezL1Ba_warnRow",
			"winName": "ezL1Ba_winName",
			"winSize": "ezL1Ba_winSize",
			"winTile": "ezL1Ba_winTile",
			"winVid": "ezL1Ba_winVid"
		};
		//#endregion
		//#region ../../../clsx/dist/clsx.mjs
		function r(e) {
			var t, f, n = "";
			if ("string" == typeof e || "number" == typeof e) n += e;
			else if ("object" == typeof e) if (Array.isArray(e)) {
				var o = e.length;
				for (t = 0; t < o; t++) e[t] && (f = r(e[t])) && (n && (n += " "), n += f);
			} else for (f in e) e[f] && (n && (n += " "), n += f);
			return n;
		}
		function clsx() {
			for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++) (e = arguments[f]) && (t = r(e)) && (n && (n += " "), n += t);
			return n;
		}
		//#endregion
		//#region ../../web-kit/timeline/src/timeline/motionTimelineState.ts
		const MOTION_TIMELINE_TRACKS = [
			{
				uuid: "fullbody",
				name: "Full-Body",
				track_type: "keyframe",
				color: [
					219,
					148,
					86
				],
				height_scale: .5
			},
			{
				uuid: "root2d",
				name: "2D Root",
				track_type: "keyframe",
				color: [
					150,
					100,
					200
				],
				height_scale: .5
			},
			{
				uuid: "left-hand",
				name: "Left Hand",
				track_type: "keyframe",
				color: [
					100,
					200,
					150
				],
				height_scale: .5
			},
			{
				uuid: "right-hand",
				name: "Right Hand",
				track_type: "keyframe",
				color: [
					200,
					100,
					150
				],
				height_scale: .5
			},
			{
				uuid: "left-foot",
				name: "Left Foot",
				track_type: "keyframe",
				color: [
					219,
					148,
					86
				],
				height_scale: .5
			},
			{
				uuid: "right-foot",
				name: "Right Foot",
				track_type: "keyframe",
				color: [
					150,
					100,
					200
				],
				height_scale: .5
			}
		];
		//#endregion
		//#region ../../web-kit/timeline/src/timeline/MotionTimelineBarLayout.ts
		/**
		* MotionTimelineBarLayout — shared geometry + formatting atoms for
		* the motion timeline bar (split from MotionTimelineBar.tsx, pure move).
		*
		* Pure values only (no hooks, no JSX): row heights, the pinned gutter
		* width, zoom bounds, rgb/clamp/fmtTimecode. The bar re-exports this
		* surface, so the public import path never moves.
		*/
		const rgb = (c) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
		const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
		/** Zoom bounds: multiplier steps + the px-per-frame ceiling. */
		const ZOOM_STEP = 1.6;
		/** mm:ss:ff at the bar's axis fps — the DaVinci position readout
		* (2026-09-01 audit F5: the bar had NO position indicator; the only
		* readout lived under the player with a different fps divisor). */
		const fmtTimecode = (frame, fps) => {
			const f = Math.max(0, Math.round(frame));
			const safeFps = Math.max(1, Math.round(fps));
			const ff = f % safeFps;
			const totalSec = Math.floor(f / safeFps);
			const ss = totalSec % 60;
			const mm = Math.floor(totalSec / 60);
			const p = (n) => String(n).padStart(2, "0");
			return `${p(mm)}:${p(ss)}:${p(ff)}`;
		};
		//#endregion
		//#region ../../web-kit/timeline/src/timeline/MotionTimelineBarScale.ts
		/**
		* MotionTimelineBarScale — the bar's ABSOLUTE scale model (split from
		* MotionTimelineBar.tsx, pure move): measure-once pin, zoom,
		* playhead-anchored scroll, frame<->px. Bodies below are the bar's.
		*/
		/** Ruler ticks over the content (bar line 790): seconds coverage of
		*  the frames plus the trailing lead-out room. */
		function buildTicks(contentW, effPpf, totalFrames, fps) {
			const viewSec = totalFrames / Math.max(1, fps);
			const fullSec = contentW / Math.max(1, effPpf) / Math.max(1, fps);
			const stepSec = viewSec <= 4 ? .5 : Math.max(1, Math.ceil(viewSec / 16));
			const ticks = [];
			for (let s = 0; s <= fullSec + 1e-6; s += stepSec) ticks.push(Math.round(s * 10) / 10);
			return {
				ticks,
				stepSec
			};
		}
		/** The bar's zoom/scroll state + converters (bar line 400). */
		function useTimelineScale(opts) {
			const { scrollRef, frameIdx, totalFrames, fps, initialSeconds } = opts;
			const [boxW, setBoxW] = (0, react.useState)(0);
			const [ppf, setPpf] = (0, react.useState)(null);
			const [basePpf, setBasePpf] = (0, react.useState)(null);
			const [dragScale, setDragScale] = (0, react.useState)(null);
			const anchorRef = (0, react.useRef)(null);
			const measure = () => {
				const el = scrollRef.current;
				if (el && el.getBoundingClientRect().width > 0) setBoxW(el.getBoundingClientRect().width);
			};
			(0, react.useEffect)(() => {
				measure();
				let ro = null;
				if (typeof ResizeObserver !== "undefined" && scrollRef.current) {
					ro = new ResizeObserver(() => measure());
					ro.observe(scrollRef.current);
				}
				window.addEventListener("resize", measure);
				return () => {
					ro?.disconnect();
					window.removeEventListener("resize", measure);
				};
			}, []);
			const T1 = Math.max(0, Math.floor(totalFrames) - 1);
			const fitPpf = boxW > 0 && T1 > 0 ? boxW / T1 : 10;
			(0, react.useEffect)(() => {
				if (boxW > 0 && T1 > 0 && ppf == null) {
					let mount = Math.max(1, fitPpf);
					if (initialSeconds != null && initialSeconds > 0 && fps > 0) mount = Math.max(1, boxW / (initialSeconds * fps));
					setPpf(mount);
					setBasePpf(mount);
				}
			}, [boxW, T1]);
			const effPpf = dragScale ?? ppf ?? Math.max(1, fitPpf);
			const LEAD_OUT = Math.max(240, boxW * .35);
			const contentW = Math.max(boxW, T1 * effPpf + LEAD_OUT);
			const frameToPx = (f) => f * effPpf;
			const zoom = (factor) => {
				const el = scrollRef.current;
				if (el) anchorRef.current = {
					frame: frameIdx,
					off: frameToPx(frameIdx) - el.scrollLeft
				};
				const next = (ppf ?? Math.max(1, fitPpf)) * factor;
				if (next <= fitPpf * 1.0001) {
					setPpf(Math.max(1, fitPpf));
					setBasePpf(Math.max(1, fitPpf));
				} else setPpf(Math.min(40, next));
			};
			(0, react.useLayoutEffect)(() => {
				const el = scrollRef.current;
				const a = anchorRef.current;
				if (el && a) el.scrollLeft = Math.max(0, a.frame * effPpf - a.off);
				anchorRef.current = null;
			}, [effPpf]);
			const frameAt = (clientX) => {
				const el = scrollRef.current;
				if (!el) return null;
				const r = el.getBoundingClientRect();
				if (r.width <= 0 && boxW <= 0) return null;
				const x = clientX - r.left + el.scrollLeft;
				return Math.round(x / effPpf);
			};
			const xToFrame = (clientX) => {
				const f = frameAt(clientX);
				return f == null ? null : clamp(f, 0, T1);
			};
			const keepTailVisible = (endFrame) => {
				const el = scrollRef.current;
				if (!el) return;
				const r = el.getBoundingClientRect();
				if (r.width <= 0) return;
				const rightPx = endFrame * effPpf;
				if (rightPx > el.scrollLeft + r.width - 24) {
					const max = Math.max(0, el.scrollWidth - r.width);
					el.scrollLeft = Math.min(max, rightPx - r.width + 24);
				}
			};
			return {
				boxW,
				ppf,
				setPpf,
				basePpf,
				setBasePpf,
				dragScale,
				setDragScale,
				anchorRef,
				T1,
				fitPpf,
				effPpf,
				contentW,
				frameToPx,
				frameAt,
				xToFrame,
				zoom,
				keepTailVisible
			};
		}
		//#endregion
		//#region ../../web-kit/timeline/src/timeline/MotionTimelineBarDrag.ts
		/**
		* MotionTimelineBarDrag — the bar's one global pointer session (split
		* from MotionTimelineBar.tsx, pure move): scrub + clip drag/resize +
		* keyframe drag, the pose-studio pattern (window listeners + live-ref
		* drag state). Bodies below are the bar's.
		*/
		/** The bar's pointer-session state + gesture entry points (bar line 369). */
		function useTimelineDragSession(opts) {
			const { T1, effPpf, ppf, dragScale, setPpf, setBasePpf, setDragScale, prompts, audioLayers, packed, xToFrame, keepTailVisible, onFrameChange, onScrubStart, onScrubEnd, onSelect, onKeyframeMove, onPromptMove, onPromptResize, onExtend, onAudioClipMove } = opts;
			const [dragId, setDragId] = (0, react.useState)(null);
			const dragRef = (0, react.useRef)(null);
			const suppressClickRef = (0, react.useRef)(false);
			const lastPromptRef = (0, react.useRef)(null);
			lastPromptRef.current = prompts.length ? prompts.reduce((a, b) => b.end_frame > a.end_frame ? b : a).uuid : null;
			const firstPromptRef = (0, react.useRef)(null);
			firstPromptRef.current = prompts.length ? prompts.reduce((a, b) => b.start_frame < a.start_frame ? b : a).uuid : null;
			const promptsRef = (0, react.useRef)(prompts);
			promptsRef.current = prompts;
			const startDrag = (e, d) => {
				if (e.button !== 0) return;
				e.stopPropagation();
				e.preventDefault();
				dragRef.current = {
					...d,
					t1AtStart: T1
				};
				setDragScale(effPpf);
				if (d.kind !== "scrub") setDragId(d.id);
			};
			(0, react.useEffect)(() => {
				const endDrag = () => {
					const d = dragRef.current;
					dragRef.current = null;
					setDragId(null);
					setDragScale(null);
					if (d?.moved) suppressClickRef.current = true;
					const grewDoc = d ? T1 > (d.t1AtStart ?? T1) : false;
					if (d && grewDoc && ppf == null && dragScale != null) {
						setPpf(dragScale);
						setBasePpf(dragScale);
					}
					if (d && d.kind === "scrub") onScrubEnd?.();
					if (d && d.kind === "kf" && !d.moved) onFrameChange(d.frame);
					if (d && (d.kind === "prompt-move" || d.kind === "prompt-l" || d.kind === "prompt-r") && !d.moved) onSelect?.(d.id);
					if (d && d.kind === "audio-clip" && !d.moved) suppressClickRef.current = true;
				};
				const onMove = (e) => {
					const d = dragRef.current;
					if (!d) return;
					if (e.pointerType === "mouse" && e.buttons === 0) {
						endDrag();
						return;
					}
					if (d.kind === "scrub") {
						if (Math.abs(e.clientX - d.startX) > 2) d.moved = true;
						const f = xToFrame(e.clientX);
						if (f != null) onFrameChange(f);
						return;
					}
					const dxF = (e.clientX - d.startX) / effPpf;
					if (Math.abs(e.clientX - d.startX) > 5) d.moved = true;
					if (d.kind === "kf") onKeyframeMove(d.id, clamp(Math.round(d.frame + dxF), 0, T1));
					else if (d.kind === "audio-clip") {
						const others = ((audioLayers?.find((x) => x.id === d.layerId))?.clips ?? []).filter((c) => c.id !== d.id);
						const prevEnd = others.filter((c) => c.start_frame < d.startF).reduce((m, c) => Math.max(m ?? 0, c.start_frame + c.dur_frames), null);
						const nextStart = others.filter((c) => c.start_frame > d.startF).reduce((m, c) => Math.min(m ?? T1, c.start_frame), null);
						let ns = clamp(Math.round(d.startF + dxF), 0, Math.max(0, T1 - d.durF));
						if (prevEnd != null) ns = Math.max(ns, prevEnd + 1);
						if (nextStart != null) ns = Math.min(ns, Math.max(0, nextStart - 1 - d.durF));
						onAudioClipMove?.(d.layerId, d.id, ns);
					} else {
						const neighborsOf = (id) => {
							const sorted = [...promptsRef.current].sort((a, b) => a.start_frame - b.start_frame);
							const i = sorted.findIndex((p) => p.uuid === id);
							if (i === -1) return {
								prevEnd: null,
								prevStart: null,
								nextStart: null,
								nextEnd: null
							};
							return {
								prevEnd: i > 0 ? sorted[i - 1].end_frame : null,
								prevStart: i > 0 ? sorted[i - 1].start_frame : null,
								nextStart: i < sorted.length - 1 ? sorted[i + 1].start_frame : null,
								nextEnd: i < sorted.length - 1 ? sorted[i + 1].end_frame : null
							};
						};
						if (d.kind === "prompt-move") {
							const live = promptsRef.current.find((x) => x.uuid === d.id);
							const endF = live?.end_frame ?? d.endF;
							const startF = live?.start_frame ?? d.startF;
							const dur = Math.max(1, endF - startF);
							const { prevEnd, prevStart, nextStart, nextEnd } = neighborsOf(d.id);
							let ns = Math.max(0, Math.round(d.startF + dxF));
							if (prevEnd != null) ns = Math.max(ns, packed ? (prevStart ?? 0) + 1 : prevEnd + 1);
							const ne = ns + dur;
							if (ne > T1 && d.id === lastPromptRef.current) {
								onExtend(ne + 1);
								onPromptMove(d.id, ns, ne);
								keepTailVisible(ne);
							} else {
								const maxNs = Math.max(0, T1 - dur);
								let c = clamp(ns, 0, maxNs);
								if (nextStart != null) c = Math.min(c, Math.max(0, packed ? (nextEnd ?? T1) - 1 - dur : nextStart - 1 - dur));
								onPromptMove(d.id, c, c + dur);
							}
						} else if (d.kind === "prompt-l") {
							const endF = promptsRef.current.find((x) => x.uuid === d.id)?.end_frame ?? d.endF;
							const { prevEnd, prevStart } = neighborsOf(d.id);
							let ns = clamp(Math.round(d.startF + dxF), 0, endF - 1);
							if (prevEnd != null) ns = Math.max(ns, packed ? (prevStart ?? 0) + 1 : prevEnd + 1);
							onPromptResize(d.id, ns, endF);
							onFrameChange(ns);
						} else {
							const startF = promptsRef.current.find((x) => x.uuid === d.id)?.start_frame ?? d.startF;
							const { nextStart, nextEnd } = neighborsOf(d.id);
							let ne = Math.round(d.endF + dxF);
							if (ne > T1 && d.id === lastPromptRef.current) onExtend(ne + 1);
							else {
								ne = clamp(ne, startF + 1, T1);
								if (nextStart != null) ne = Math.min(ne, Math.max(startF + 1, packed ? (nextEnd ?? T1) - 1 : nextStart - 1));
							}
							onPromptResize(d.id, startF, ne);
							onFrameChange(ne);
							if (d.id === lastPromptRef.current) keepTailVisible(ne);
						}
					}
				};
				window.addEventListener("pointermove", onMove);
				window.addEventListener("pointerup", endDrag);
				window.addEventListener("pointercancel", endDrag);
				return () => {
					window.removeEventListener("pointermove", onMove);
					window.removeEventListener("pointerup", endDrag);
					window.removeEventListener("pointercancel", endDrag);
				};
			}, [
				T1,
				effPpf,
				onFrameChange,
				onKeyframeMove,
				onPromptMove,
				onPromptResize,
				onExtend
			]);
			const seek = (e) => {
				if (e.button !== 0) return;
				dragRef.current = {
					kind: "scrub",
					startX: e.clientX,
					moved: false
				};
				onScrubStart?.();
				const f = xToFrame(e.clientX);
				if (f != null) onFrameChange(f);
			};
			return {
				dragId,
				dragRef,
				suppressClickRef,
				lastPromptRef,
				firstPromptRef,
				promptsRef,
				startDrag,
				seek
			};
		}
		//#endregion
		//#region ../../web-kit/timeline/src/timeline/icons.tsx
		function base(name, className) {
			return {
				xmlns: "http://www.w3.org/2000/svg",
				width: 24,
				height: 24,
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: 2,
				strokeLinecap: "round",
				strokeLinejoin: "round",
				"aria-hidden": true,
				className: [
					"lucide",
					`lucide-${name}`,
					className
				].filter(Boolean).join(" ")
			};
		}
		function ListMusic({ className, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				...base("list-music", className),
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M16 5H3" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M11 12H3" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M11 19H3" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M21 16V5" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "18",
						cy: "16",
						r: "3"
					})
				]
			});
		}
		function Music({ className, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				...base("music", className),
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M9 18V5l12-2v13" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "6",
						cy: "18",
						r: "3"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "18",
						cy: "16",
						r: "3"
					})
				]
			});
		}
		function ZoomIn({ className, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				...base("zoom-in", className),
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "11",
						cy: "11",
						r: "8"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
						x1: "21",
						x2: "16.65",
						y1: "21",
						y2: "16.65"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
						x1: "11",
						x2: "11",
						y1: "8",
						y2: "14"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
						x1: "8",
						x2: "14",
						y1: "11",
						y2: "11"
					})
				]
			});
		}
		function Mic({ className, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				...base("mic", className),
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M19 10v2a7 7 0 0 1-14 0v-2" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
						x1: "12",
						x2: "12",
						y1: "19",
						y2: "22"
					})
				]
			});
		}
		function Zap({ className, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				...base("zap", className),
				...rest,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("polygon", { points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2" })
			});
		}
		function ZoomOut({ className, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				...base("zoom-out", className),
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "11",
						cy: "11",
						r: "8"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
						x1: "21",
						x2: "16.65",
						y1: "21",
						y2: "16.65"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
						x1: "8",
						x2: "14",
						y1: "11",
						y2: "11"
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:packages/web-kit/timeline/src/timeline/timeline.module.css.mjs
		const css = ".t2WLSa_root{user-select:none;display:flex}.t2WLSa_gutter{border-right:1px solid var(--dsw-alias-border-l2);flex-direction:column;flex:none;display:flex}.t2WLSa_zoomRow{border-bottom:1px solid var(--dsw-alias-border-l2);justify-content:center;align-items:center;gap:2px;display:flex}.t2WLSa_zoomBtn{width:20px;height:20px;color:var(--dsw-alias-label-secondary);font-size:inherit;cursor:pointer;background:0 0;border:none;border-radius:4px;justify-content:center;align-items:center;padding:0;line-height:1;display:inline-flex}.t2WLSa_zoomBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-brand-primary)}.t2WLSa_zoomBtn svg{width:14px;height:14px}.t2WLSa_zoomPct{min-width:32px;height:auto;color:var(--dsw-alias-label-secondary);text-align:center;font-variant-numeric:tabular-nums;cursor:pointer;background:0 0;border:none;border-radius:4px;padding:0 2px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px}.t2WLSa_zoomPct:hover{color:var(--dsw-alias-brand-primary)}.t2WLSa_laneHead,.t2WLSa_laneHeadBeats{border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);align-items:center;gap:6px;padding:0 8px;display:flex}.t2WLSa_laneHead>svg,.t2WLSa_laneHeadBeats>svg{width:14px;height:14px;color:var(--dsw-alias-brand-primary);flex:none}.t2WLSa_laneHeadBeats>svg{color:var(--dsw-alias-brand-primary)}.t2WLSa_gutterLabel{text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);font-size:10px;font-weight:500;overflow:hidden}.t2WLSa_audioHead{border-bottom:1px solid var(--dsw-alias-border-l1);align-items:center;gap:6px;padding:0 8px;display:flex}.t2WLSa_audioHead>svg{width:12px;height:12px;color:var(--dsw-alias-state-business-primary);flex:none}.t2WLSa_gutterLabelDim{text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);font-size:10px;font-weight:500;overflow:hidden}.t2WLSa_detachBtn{width:16px;height:16px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:4px;flex:none;justify-content:center;align-items:center;margin-left:auto;padding:0;display:inline-flex}.t2WLSa_detachBtn:hover{background:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-label-primary)}.t2WLSa_detachBtn svg{width:10px;height:10px}.t2WLSa_uploadBtn{width:16px;height:16px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:4px;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}.t2WLSa_uploadBtn:hover{background:color-mix(in srgb, var(--dsw-alias-label-tertiary) 14%, transparent);color:var(--dsw-alias-label-primary)}.t2WLSa_uploadBtn svg{width:10px;height:10px}.t2WLSa_laneRow{border-bottom:1px solid var(--dsw-alias-border-l1);align-items:center;gap:6px;padding:0 8px;display:flex}.t2WLSa_laneRow:last-child{border-bottom:0}.t2WLSa_laneDot{border-radius:9999px;flex:none;width:6px;height:6px}.t2WLSa_laneName{text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);font-size:10px;overflow:hidden}.t2WLSa_contentWrap{flex:1;min-width:0;position:relative}.t2WLSa_scroller{scrollbar-width:thin;scrollbar-color:var(--dsw-alias-border-l3) transparent;height:100%;overflow:auto hidden}.t2WLSa_scroller::-webkit-scrollbar{height:8px}.t2WLSa_scroller::-webkit-scrollbar-track{background:0 0}.t2WLSa_scroller::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l2);border-radius:4px}.t2WLSa_content{position:relative}.t2WLSa_ruler{border-bottom:1px solid var(--dsw-alias-border-l2);cursor:ew-resize;touch-action:none;position:relative}.t2WLSa_tick{position:absolute;top:0;bottom:0}.t2WLSa_tickLine{background:var(--dsw-alias-border-l2);width:1px;height:100%}.t2WLSa_tickLabel{color:var(--dsw-alias-label-tertiary);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;line-height:1;position:absolute;top:2px;left:4px}.t2WLSa_timecode{z-index:10;font-variant-numeric:tabular-nums;height:100%;color:var(--dsw-alias-brand-primary);align-items:center;padding-left:6px;padding-right:8px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;line-height:1;display:flex;position:sticky;left:0}.t2WLSa_promptsLane{border-bottom:1px solid var(--dsw-alias-border-l1);position:relative}.t2WLSa_canAdd{cursor:copy}.t2WLSa_emptyCenter{justify-content:center;align-items:center;display:flex;position:absolute;inset:0}.t2WLSa_emptyHint{color:var(--dsw-alias-label-tertiary);font-size:10px}.t2WLSa_promptClip{touch-action:none;cursor:grab;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;position:absolute;top:4px;bottom:4px;overflow:hidden}.t2WLSa_promptClip:hover{border-color:var(--dsw-alias-border-l4)}.t2WLSa_clipSelected{z-index:30;border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent);border-width:0}.t2WLSa_clipSelected:hover{border-color:var(--dsw-alias-brand-primary)}.t2WLSa_clipMoving{z-index:30;cursor:grabbing;border:1px solid var(--dsw-alias-brand-primary);box-shadow:0 20px 25px -5px color-mix(in srgb, var(--dsw-alias-bg-base) 50%, transparent), 0 8px 10px -6px color-mix(in srgb, var(--dsw-alias-bg-base) 50%, transparent), 0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 70%, transparent)}.t2WLSa_edgeL{z-index:30;touch-action:none;cursor:ew-resize;justify-content:center;align-items:center;width:12px;display:flex;position:absolute;top:0;bottom:0;left:0}.t2WLSa_edgeL:hover{background:var(--dsw-alias-interactive-bg-hover)}.t2WLSa_edgeDead{cursor:default;opacity:.35}.t2WLSa_edgeDead:hover{background:0 0}.t2WLSa_gripPill{background:color-mix(in srgb, var(--dsw-alias-label-primary) 25%, transparent);border-radius:9999px;width:3px;height:20px}.t2WLSa_promptClip:hover .t2WLSa_gripPill{background:color-mix(in srgb, var(--dsw-alias-label-primary) 60%, transparent)}.t2WLSa_seamDot{z-index:35;border-radius:9999px;width:8px;height:8px;position:absolute;top:0;left:0;transform:translate(-50%,-50%)}.t2WLSa_edgeR{z-index:30;touch-action:none;cursor:ew-resize;justify-content:center;align-items:center;width:12px;display:flex;position:absolute;top:16px;bottom:0;right:0}.t2WLSa_edgeR:hover{background:var(--dsw-alias-interactive-bg-hover)}.t2WLSa_edgeWide{width:16px}.t2WLSa_gripPillR{background:color-mix(in srgb, var(--dsw-alias-label-primary) 25%, transparent);border-radius:9999px;width:3px;height:20px}.t2WLSa_gripPillBright{background:color-mix(in srgb, var(--dsw-alias-label-primary) 45%, transparent)}.t2WLSa_promptClip:hover .t2WLSa_gripPillR{background:color-mix(in srgb, var(--dsw-alias-label-primary) 60%, transparent)}.t2WLSa_promptClip:hover .t2WLSa_gripPillBright{background:color-mix(in srgb, var(--dsw-alias-label-primary) 80%, transparent)}.t2WLSa_clipEditor{background:color-mix(in srgb, var(--dsw-alias-bg-base) 60%, transparent);height:24px;box-shadow:0 0 0 1px color-mix(in srgb, var(--dsw-alias-brand-primary) 50%, transparent);pointer-events:auto;border:none;border-radius:4px;align-items:center;padding:0 6px;display:inline-flex;position:absolute;top:50%;left:8px;right:8px;transform:translateY(-50%)}.t2WLSa_clipEditor input{width:100%;min-width:0;height:100%;color:var(--dsw-alias-label-primary);background:0 0;border:none;outline:none;flex:1;padding:0;font-size:11px;line-height:1.5}.t2WLSa_clipEditor input::placeholder{color:var(--dsw-alias-label-tertiary)}.t2WLSa_previewWrap{z-index:10;pointer-events:none;position:absolute;inset:0;overflow:hidden}.t2WLSa_previewVideo{object-fit:cover;opacity:.6;width:100%;height:100%;position:absolute;inset:0}.t2WLSa_scrim{background:linear-gradient(to top, color-mix(in srgb, var(--dsw-alias-bg-base) 85%, transparent), color-mix(in srgb, var(--dsw-alias-bg-base) 45%, transparent) 50%, color-mix(in srgb, var(--dsw-alias-bg-base) 10%, transparent));position:absolute;inset:0}.t2WLSa_clipTextCol{z-index:20;flex-direction:column;gap:2px;padding:0 12px 6px;display:flex;position:absolute;bottom:0;left:0;right:0}.t2WLSa_clipTextStack{z-index:10;pointer-events:none;flex-direction:column;justify-content:center;gap:2px;padding:0 12px;display:flex;position:absolute;inset:0}.t2WLSa_clipTitle{text-overflow:ellipsis;white-space:nowrap;font-size:11px;font-weight:500;overflow:hidden}.t2WLSa_clipEmpty{color:var(--dsw-alias-label-tertiary);font-style:italic}.t2WLSa_clipDur{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);font-size:10px}.t2WLSa_knobDot{z-index:20;background:var(--dsw-alias-brand-primary);width:6px;height:6px;box-shadow:0 0 6px color-mix(in srgb, var(--dsw-alias-brand-primary) 80%, transparent);pointer-events:none;border-radius:9999px;position:absolute;top:4px;right:6px}.t2WLSa_refAudioBadge{z-index:20;width:10px;height:10px;color:var(--dsw-alias-state-business-primary);pointer-events:none;position:absolute;top:12px;right:4px}.t2WLSa_refBadge{z-index:20;pointer-events:none;align-items:center;gap:1px;display:flex;position:absolute;top:22px;right:2px}.t2WLSa_refBadge svg{width:8px;height:8px;color:var(--dsw-alias-state-success-primary)}.t2WLSa_refCount{color:var(--dsw-alias-state-success-primary);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:8px;line-height:1}.t2WLSa_promptDelete{z-index:40;background:var(--dsw-alias-state-error-primary);opacity:0;cursor:pointer;border:none;border-radius:9999px;justify-content:center;align-items:center;width:16px;height:16px;padding:0;display:inline-flex;position:absolute;top:4px;right:4px}.t2WLSa_promptDelete:hover{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 85%, var(--dsw-alias-label-primary))}.t2WLSa_promptClip:hover .t2WLSa_promptDelete{opacity:1}.t2WLSa_promptDelete svg{width:8px;height:8px;color:var(--dsw-alias-label-primary)}.t2WLSa_beatsLane{border-bottom:1px solid var(--dsw-alias-border-l1);position:relative}.t2WLSa_beatsAdd{cursor:crosshair}.t2WLSa_beatsEmpty{align-items:center;padding-left:12px;display:flex;position:absolute;inset:0}.t2WLSa_hintLine{color:var(--dsw-alias-label-tertiary);font-size:10px}.t2WLSa_beatClip{border:1px solid var(--dsw-alias-border-l2);cursor:pointer;border-radius:6px;position:absolute;top:4px;bottom:4px;overflow:hidden}.t2WLSa_beatClip:hover{border-color:var(--dsw-alias-border-l4)}.t2WLSa_beatSelected{z-index:30;border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent)}.t2WLSa_beatSelected:hover{border-color:var(--dsw-alias-brand-primary)}.t2WLSa_beatLabel{color:var(--dsw-alias-label-secondary);pointer-events:none;align-items:center;padding:0 6px;font-size:10px;line-height:1.25;display:flex;position:absolute;inset:0}.t2WLSa_truncate{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.t2WLSa_beatEmpty{color:var(--dsw-alias-label-tertiary);font-style:italic}.t2WLSa_audioLane{border-bottom:1px solid var(--dsw-alias-border-l1);position:relative}.t2WLSa_audioClip{border:1px solid color-mix(in srgb, var(--dsw-alias-state-business-primary) 40%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 25%, transparent);cursor:grab;touch-action:none;border-radius:2px;position:absolute;top:2px;bottom:2px;overflow:hidden}.t2WLSa_audioClip:active{cursor:grabbing}.t2WLSa_audioCard{border-radius:6px;top:3px;bottom:3px}.t2WLSa_audioCardIcon{pointer-events:none;display:flex;position:absolute;top:50%;left:5px;transform:translateY(-50%)}.t2WLSa_audioCardIcon svg{width:13px;height:13px}.t2WLSa_audioCard .t2WLSa_audioClipLabel{flex-direction:column;justify-content:center;align-items:flex-start;gap:1px;font-size:10px;display:flex;left:23px;right:4px}.t2WLSa_audioCard .t2WLSa_audioTime{margin-left:0}.t2WLSa_gainFill{background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 20%, transparent);pointer-events:none;position:absolute;bottom:0;left:0;right:0}.t2WLSa_audioClipLabel{text-overflow:ellipsis;white-space:nowrap;color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 70%, var(--dsw-alias-label-primary));pointer-events:none;align-items:center;padding:0 4px;font-size:9px;line-height:1;display:flex;position:absolute;inset:0;overflow:hidden}.t2WLSa_audioName{text-overflow:ellipsis;white-space:nowrap;font-weight:500;overflow:hidden}.t2WLSa_audioTime{font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 50%, var(--dsw-alias-label-tertiary));flex:none;margin-left:4px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.t2WLSa_audioClipDelete{background:color-mix(in srgb, var(--dsw-alias-bg-base) 40%, transparent);width:14px;height:14px;color:var(--dsw-alias-label-tertiary);cursor:pointer;border:none;border-radius:0 0 0 4px;justify-content:center;align-items:center;padding:0;display:none;position:absolute;top:0;right:0}.t2WLSa_audioClipDelete:hover{background:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-label-primary)}.t2WLSa_audioClip:hover .t2WLSa_audioClipDelete{display:flex}.t2WLSa_audioClipDelete svg{width:8px;height:8px}.t2WLSa_audioSlice{border:1px solid color-mix(in srgb, var(--dsw-alias-state-business-primary) 25%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 15%, transparent);border-radius:2px;position:absolute;top:2px;bottom:2px;overflow:hidden}.t2WLSa_sliceLabel{text-overflow:ellipsis;white-space:nowrap;font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 70%, var(--dsw-alias-label-secondary));pointer-events:none;justify-content:center;align-items:center;padding:0 4px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:9px;display:flex;position:absolute;inset:0;overflow:hidden}.t2WLSa_audioDrop{border:1px dashed color-mix(in srgb, var(--dsw-alias-state-business-primary) 20%, transparent);pointer-events:none;border-radius:4px;justify-content:center;align-items:center;display:flex;position:absolute;inset:2px 4px}.t2WLSa_dropHint{text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);padding:0 8px;font-size:9px;overflow:hidden}.t2WLSa_kfLane{border-bottom:1px solid var(--dsw-alias-border-l1);position:relative}.t2WLSa_kfLane:last-child{border-bottom:0}.t2WLSa_laneHint{color:var(--dsw-alias-label-tertiary);pointer-events:none;align-items:center;padding-left:12px;font-size:10px;display:flex;position:absolute;inset:0}.t2WLSa_kfWrap{position:absolute;top:0;bottom:0}.t2WLSa_kfBtn{cursor:grab;background:0 0;border:none;justify-content:center;align-items:center;width:16px;height:16px;padding:0;display:flex;position:absolute;top:50%;left:0;transform:translate(-50%,-50%)}.t2WLSa_kfBtn:active{cursor:grabbing;transform:translate(-50%)}.t2WLSa_kfDiamond{width:10px;height:10px;box-shadow:0 0 0 1px var(--dsw-alias-border-l4);border:1px solid;display:block;transform:rotate(45deg)}.t2WLSa_kfMoving{transform:rotate(45deg)scale(1.25)}.t2WLSa_kfDelete{z-index:10;background:var(--dsw-alias-state-error-primary);opacity:0;cursor:pointer;border:none;border-radius:9999px;justify-content:center;align-items:center;width:14px;height:14px;padding:0;display:inline-flex;position:absolute;top:0;left:6px}.t2WLSa_kfDelete:hover{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 85%, var(--dsw-alias-label-primary))}.t2WLSa_kfWrap:hover .t2WLSa_kfDelete{opacity:1}.t2WLSa_kfDelete svg{width:8px;height:8px;color:var(--dsw-alias-label-primary)}.t2WLSa_playhead{z-index:40;pointer-events:none;position:absolute;top:0;bottom:0}.t2WLSa_playheadCap{border:1px solid var(--dsw-alias-border-l4);border-radius:9999px;width:8px;height:8px;position:absolute;top:0;left:50%;transform:translate(-50%)}.t2WLSa_miniBtn{border:1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 15%, transparent);width:20px;height:20px;color:var(--dsw-alias-brand-primary);cursor:pointer;border-radius:6px;flex:none;justify-content:center;align-items:center;padding:0;font-size:13px;line-height:1;display:inline-flex}.t2WLSa_miniBtn:hover{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 25%, transparent)}.t2WLSa_miniFitBtn{border:1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 15%, transparent);height:20px;color:var(--dsw-alias-brand-primary);cursor:pointer;border-radius:6px;flex:none;justify-content:center;align-items:center;padding:0 6px;font-size:10px;font-weight:600;display:inline-flex}.t2WLSa_miniFitBtn:hover{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 25%, transparent)}.t2WLSa_scrubBar{align-items:center;gap:8px;width:100%;display:flex}.t2WLSa_scrubToggle{cursor:pointer;background:0 0;border:none;flex:none;padding:4px 2px;font-size:11px;line-height:1}.t2WLSa_scrubTrack{cursor:pointer;touch-action:none;flex:1;min-width:0;height:18px;position:relative}.t2WLSa_scrubFill{background:var(--dsw-alias-interactive-bg-active);border-radius:2px;height:4px;position:absolute;top:7px;left:0}.t2WLSa_scrubHead{background:var(--dsw-alias-label-primary);border-radius:1px;width:2px;height:10px;margin-left:-1px;position:absolute;top:4px}.t2WLSa_scrubReadout{color:var(--dsw-alias-label-secondary);white-space:nowrap;flex:none;font-size:11px}";
		const tagId = "@melite/video-h3-timeline/timeline.module.css@9598b92a";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite/video-h3-timeline";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var timeline_module_css_default = {
			"audioCard": "t2WLSa_audioCard",
			"audioCardIcon": "t2WLSa_audioCardIcon",
			"audioClip": "t2WLSa_audioClip",
			"audioClipDelete": "t2WLSa_audioClipDelete",
			"audioClipLabel": "t2WLSa_audioClipLabel",
			"audioDrop": "t2WLSa_audioDrop",
			"audioHead": "t2WLSa_audioHead",
			"audioLane": "t2WLSa_audioLane",
			"audioName": "t2WLSa_audioName",
			"audioSlice": "t2WLSa_audioSlice",
			"audioTime": "t2WLSa_audioTime",
			"beatClip": "t2WLSa_beatClip",
			"beatEmpty": "t2WLSa_beatEmpty",
			"beatLabel": "t2WLSa_beatLabel",
			"beatSelected": "t2WLSa_beatSelected",
			"beatsAdd": "t2WLSa_beatsAdd",
			"beatsEmpty": "t2WLSa_beatsEmpty",
			"beatsLane": "t2WLSa_beatsLane",
			"canAdd": "t2WLSa_canAdd",
			"clipDur": "t2WLSa_clipDur",
			"clipEditor": "t2WLSa_clipEditor",
			"clipEmpty": "t2WLSa_clipEmpty",
			"clipMoving": "t2WLSa_clipMoving",
			"clipSelected": "t2WLSa_clipSelected",
			"clipTextCol": "t2WLSa_clipTextCol",
			"clipTextStack": "t2WLSa_clipTextStack",
			"clipTitle": "t2WLSa_clipTitle",
			"content": "t2WLSa_content",
			"contentWrap": "t2WLSa_contentWrap",
			"detachBtn": "t2WLSa_detachBtn",
			"dropHint": "t2WLSa_dropHint",
			"edgeDead": "t2WLSa_edgeDead",
			"edgeL": "t2WLSa_edgeL",
			"edgeR": "t2WLSa_edgeR",
			"edgeWide": "t2WLSa_edgeWide",
			"emptyCenter": "t2WLSa_emptyCenter",
			"emptyHint": "t2WLSa_emptyHint",
			"gainFill": "t2WLSa_gainFill",
			"gripPill": "t2WLSa_gripPill",
			"gripPillBright": "t2WLSa_gripPillBright",
			"gripPillR": "t2WLSa_gripPillR",
			"gutter": "t2WLSa_gutter",
			"gutterLabel": "t2WLSa_gutterLabel",
			"gutterLabelDim": "t2WLSa_gutterLabelDim",
			"hintLine": "t2WLSa_hintLine",
			"kfBtn": "t2WLSa_kfBtn",
			"kfDelete": "t2WLSa_kfDelete",
			"kfDiamond": "t2WLSa_kfDiamond",
			"kfLane": "t2WLSa_kfLane",
			"kfMoving": "t2WLSa_kfMoving",
			"kfWrap": "t2WLSa_kfWrap",
			"knobDot": "t2WLSa_knobDot",
			"laneDot": "t2WLSa_laneDot",
			"laneHead": "t2WLSa_laneHead",
			"laneHeadBeats": "t2WLSa_laneHeadBeats",
			"laneHint": "t2WLSa_laneHint",
			"laneName": "t2WLSa_laneName",
			"laneRow": "t2WLSa_laneRow",
			"miniBtn": "t2WLSa_miniBtn",
			"miniFitBtn": "t2WLSa_miniFitBtn",
			"playhead": "t2WLSa_playhead",
			"playheadCap": "t2WLSa_playheadCap",
			"previewVideo": "t2WLSa_previewVideo",
			"previewWrap": "t2WLSa_previewWrap",
			"promptClip": "t2WLSa_promptClip",
			"promptDelete": "t2WLSa_promptDelete",
			"promptsLane": "t2WLSa_promptsLane",
			"refAudioBadge": "t2WLSa_refAudioBadge",
			"refBadge": "t2WLSa_refBadge",
			"refCount": "t2WLSa_refCount",
			"root": "t2WLSa_root",
			"ruler": "t2WLSa_ruler",
			"scrim": "t2WLSa_scrim",
			"scroller": "t2WLSa_scroller",
			"scrubBar": "t2WLSa_scrubBar",
			"scrubFill": "t2WLSa_scrubFill",
			"scrubHead": "t2WLSa_scrubHead",
			"scrubReadout": "t2WLSa_scrubReadout",
			"scrubToggle": "t2WLSa_scrubToggle",
			"scrubTrack": "t2WLSa_scrubTrack",
			"seamDot": "t2WLSa_seamDot",
			"sliceLabel": "t2WLSa_sliceLabel",
			"tick": "t2WLSa_tick",
			"tickLabel": "t2WLSa_tickLabel",
			"tickLine": "t2WLSa_tickLine",
			"timecode": "t2WLSa_timecode",
			"truncate": "t2WLSa_truncate",
			"uploadBtn": "t2WLSa_uploadBtn",
			"zoomBtn": "t2WLSa_zoomBtn",
			"zoomPct": "t2WLSa_zoomPct",
			"zoomRow": "t2WLSa_zoomRow"
		};
		//#endregion
		//#region ../../web-kit/timeline/src/timelineCopy.ts
		/**
		* timelineCopy.ts — THE TIMELINE KIT COPY DICTIONARY (the copy-scope
		* extension, 2026-11-05). Client UI copy is locale-owned (the estate's
		* decision, the DSH verify-client-ui-i18n law): presentation code owns
		* no copy literals; it consumes them here through the typed seat. A
		* second locale plugs into this dictionary without touching a single
		* timeline component.
		*
		* THE BOUND: static user-visible FACES of the melite-authored
		* components live here (lane heads, zoom aria names, clip and keyframe
		* labels, empty/hint states, the scrub bar's transport copy).
		* Parameterized sentences whose shape is fixed but whose slots are live
		* live here as typed dict functions (the square.ts pattern) — the site
		* passes exactly the params the entry declares. Two exclusions carry
		* the estate's documented bounds: `tip=` hover help is not a census
		* seat and stays at the site (the motionCopy bound), and the vendored
		* `viser-timeline/` subtree is NVIDIA upstream kept pull-diff-clean —
		* its remaining rendered faces (the canvas seconds unit, the "(Empty)"
		* placeholder) are upstream's, argued at the copy wall's pin, never
		* this dictionary's. (F2, 2026-11-05: the zoom cluster re-homed out of
		* the vendored dir to `TimelineScrollbar.tsx`; its copy joined this
		* dictionary — `zoomFitTip`/`zoomFitLabel` beside the aria names.)
		*/
		/** The typed dictionary. Keys are stable copy ids. */
		// v8 ignore next -- exercised key-by-key by the copy wall's census arm
		const timelineCopy = {
			/** A new audio track's fallback label (F-B4, the 2026-11-05 timeline
			*  nativity audit: melite-authored copy planted outside the dict at
			*  store/timelineAudio.ts — the pin's own admitted debt seat). */
			audioTrackFallback: (n) => `Audio ${n}`,
			/** The prompts lane's gutter head (the bar's default label). */
			lanePrompts: "Prompts",
			/** The beats lane's gutter head (the bar's default label). */
			laneBeats: "Beats",
			/** A chapter marker's auto label when the caller names none. */
			markerAutoLabel: (p) => `Marker ${p.index}`,
			/** The keyframe lanes' empty hint (the bar's default). */
			laneHintDefault: "Double-click a lane to pin a pose constraint at the playhead",
			/** The prompts lane's empty hint (the bar's default). */
			emptyPromptsHint: "No prompt cards — the Add button carves one",
			/** The beats lane's empty hint (the bar's default). */
			beatsHintDefault: "double-click to add a beat — prompt segments join into the call's one prompt",
			/** The zoom-out button's accessible name. */
			zoomOutAria: "Zoom out",
			/** The zoom-in button's accessible name. */
			zoomInAria: "Zoom in",
			/** The fit-to-window button's hover title + accessible name. */
			zoomFitTip: "Fit to window (reset zoom)",
			/** The fit-to-window button's rendered glyph text. */
			zoomFitLabel: "fit",
			/** A stem-carrying layer's hover title (the bed-under-every-cut law). */
			audioBedTitle: (p) => `${p.stem} — one bed under every cut; each window hears its own slice in time`,
			/** A layer head's hover title before a stem is wired. */
			audioDropTitle: "drop an audio / music track — sliced to each window in time",
			/** The add door's accessible name for one layer. */
			addClipAria: (p) => `Add ${p.label} clip`,
			/** The add door's hover title for one layer. */
			addClipTitle: (p) => `Add a ${p.label} clip — from flow, from media, or from file`,
			/** The detach button's accessible name for one layer. */
			detachAria: (p) => `Detach ${p.label}`,
			/** The ruler tick's second-suffixed label. */
			tickSeconds: (p) => `${p.value}s`,
			/** A first clip's dead left-edge hover title (the frame-0 wall). */
			firstCallTitle: "First call — nothing before it to trim into",
			/** The extend-seam dot's hover title. */
			seamExtendTitle: "extend — latent tail carries across this seam",
			/** The clip editor's placeholder. */
			promptPlaceholder: "Enter prompt…",
			/** A clip's face when its prompt text is empty. */
			emptyClip: "(empty)",
			/** A clip's duration chip ("2.4s"). */
			clipSeconds: (p) => `${p.seconds}s`,
			/** The knob-override dot's hover title. */
			knobOverrideTitle: "This call overrides run knobs (per-call)",
			/** The reference-image badge's hover title (singular/plural). */
			refImagesTitle: (p) => `${p.count} reference image${p.count === 1 ? "" : "s"} (guide + extras)`,
			/** The clip delete button's accessible name. */
			deletePromptCardAria: "Delete this prompt card",
			/** An audio clip's hover title (name · window · gain — drag law). */
			audioClipTitle: (p) => `${p.name} · ${p.start}–${p.end}s${p.gain !== null ? ` · gain ${p.gain}` : ""} — drag to move`,
			/** The audio clip delete button's accessible name. */
			deleteClipAria: (p) => `Delete ${p.name}`,
			/** A stem slice's hover title (which call hears which window). */
			audioSliceTitle: (p) => `call #${p.call} · window hears bed ${p.start}–${p.end}s`,
			/** A stem slice's rendered range ("1.0–3.5s"). */
			sliceRange: (p) => `${p.start}–${p.end}s`,
			/** The empty audio lane's drop hint. */
			audioDropHint: "drop or upload audio — clips land where you drop them, drag to move",
			/** A keyframe pin's accessible name. */
			keyframeAria: (p) => `${p.track} keyframe at frame ${p.frame}`,
			/** A keyframe delete button's accessible name. */
			deleteKeyframeAria: (p) => `Delete ${p.track} keyframe at frame ${p.frame}`,
			/** The toggle's accessible name while playing. */
			scrubPauseAria: "Pause",
			/** The toggle's accessible name while paused. */
			scrubPlayAria: "Play",
			/** The scrub track's accessible name. */
			scrubAria: "Timeline scrub",
			/** The track's value text ("1.2s of 9.8s"). */
			scrubValuetext: (p) => `${p.current} of ${p.duration}`,
			/** The readout's frame column (" · frame 24/96"). */
			scrubFramesSuffix: (p) => ` · frame ${p.frame}/${p.total}`,
			/** The sub-minute second unit ("5.2s"). */
			secondsUnit: "s"
		};
		//#endregion
		//#region ../../web-kit/timeline/src/timeline/MotionTimelineBarChrome.tsx
		/**
		* MotionTimelineBarChrome — the bar's pinned + ruler + playhead chrome
		* (split from MotionTimelineBar.tsx, pure move): the label gutter
		* (zoom cluster + lane heads), the scrollable content shell with the
		* click-away deselect, the ruler, the playhead. Lane bodies live in
		* MotionTimelineBarLanes.
		*/
		/** The pinned label gutter (bar line 820): the zoom cluster + lane
		*  heads. The Fit pin reads the live scale — the body is the bar's. */
		function TimelineGutter(props) {
			const { scale, scrollRef, frameIdx, promptsHeight, promptsLabel, beats, beatsLabel, beatsHeight, audioLayers, onAudioDetach, tracks, audioClipCards } = props;
			const { zoom, anchorRef, frameToPx, setPpf, setBasePpf, fitPpf, effPpf, basePpf } = scale;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: timeline_module_css_default.gutter,
				style: { width: 112 },
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: timeline_module_css_default.zoomRow,
						style: { height: 28 },
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
								tip: "Zoom out (back toward fit)",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									size: "sm",
									onClick: () => zoom(1 / ZOOM_STEP),
									"aria-label": timelineCopy.zoomOutAria,
									className: timeline_module_css_default.zoomBtn,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZoomOut, {})
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
								tip: "Fit the whole motion in view",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									size: "sm",
									onClick: () => {
										anchorRef.current = {
											frame: frameIdx,
											off: frameToPx(frameIdx) - (scrollRef.current?.scrollLeft ?? 0)
										};
										setPpf(Math.max(1, fitPpf));
										setBasePpf(Math.max(1, fitPpf));
									},
									className: timeline_module_css_default.zoomPct,
									children: [Math.round(effPpf / (basePpf ?? fitPpf) * 100), "%"]
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
								tip: "Zoom in — more pixels per frame (the bar scrolls horizontally)",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									size: "sm",
									onClick: () => zoom(ZOOM_STEP),
									"aria-label": timelineCopy.zoomInAria,
									className: timeline_module_css_default.zoomBtn,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZoomIn, {})
								})
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: timeline_module_css_default.laneHead,
						style: { height: promptsHeight },
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Film, { "aria-hidden": true }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: timeline_module_css_default.gutterLabel,
							children: promptsLabel
						})]
					}),
					beats && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: timeline_module_css_default.laneHeadBeats,
						style: { height: beatsHeight },
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ListMusic, { "aria-hidden": true }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: timeline_module_css_default.gutterLabel,
							children: beatsLabel
						})]
					}),
					audioLayers?.map((L) => {
						const Glyph = L.icon === "mic" ? Mic : L.icon === "zap" ? Zap : Music;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: timeline_module_css_default.audioHead,
							"data-audio-icon": L.icon ?? "music",
							style: {
								height: audioClipCards ? 44 : 26,
								...L.accent ? { color: L.accent } : {}
							},
							title: L.stem ? timelineCopy.audioBedTitle({ stem: L.stem }) : timelineCopy.audioDropTitle,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, { "aria-hidden": true }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: timeline_module_css_default.gutterLabelDim,
									children: L.label
								}),
								L.onUpload && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									size: "sm",
									"data-audio-upload": L.id,
									"aria-label": timelineCopy.addClipAria({ label: L.label }),
									title: timelineCopy.addClipTitle({ label: L.label }),
									className: timeline_module_css_default.uploadBtn,
									onClick: (e) => {
										L.onUpload?.(e.currentTarget);
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Upload, { "aria-hidden": true })
								}),
								(L.stem || (L.clips?.length ?? 0) > 0) && onAudioDetach && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									size: "sm",
									onClick: () => onAudioDetach(L.id),
									"aria-label": timelineCopy.detachAria({ label: L.label }),
									className: timeline_module_css_default.detachBtn,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, {})
								})
							]
						}, L.id);
					}),
					tracks.map((t) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: timeline_module_css_default.laneRow,
						style: { height: 24 },
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: timeline_module_css_default.laneDot,
							style: { background: rgb(t.color ?? [
								176,
								180,
								186
							]) },
							"aria-hidden": true
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: timeline_module_css_default.laneName,
							children: t.name
						})]
					}, t.uuid))
				]
			}) });
		}
		/** The scrollable shell + click-away deselect (bar line 921). */
		function TimelineContent(props) {
			const { scrollRef, contentW, suppressClickRef, onSelect, children } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: timeline_module_css_default.contentWrap,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					ref: scrollRef,
					"data-testid": "motion-timeline-scroll",
					className: timeline_module_css_default.scroller,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						"data-testid": "motion-timeline-content",
						className: timeline_module_css_default.content,
						style: {
							width: contentW,
							minWidth: "100%"
						},
						onClick: (e) => {
							if (suppressClickRef.current) {
								suppressClickRef.current = false;
								return;
							}
							if (e.target.closest("[data-prompt-clip],[data-beat-clip],[data-testid=\"motion-timeline-ruler\"]")) return;
							onSelect?.(null);
						},
						children
					})
				})
			}) });
		}
		/** The ruler: scrub surface, ticks, sticky timecode (bar line 947). */
		function TimelineRuler(props) {
			const { ticks, stepSec, fps, frameIdx, barBg, frameToPx, frameAt, seek, onPromptAdd } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
				tip: onPromptAdd ? "Click or drag to move the playhead — double-click to add a call at that frame" : "Click or drag to move the playhead",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					"data-testid": "motion-timeline-ruler",
					className: timeline_module_css_default.ruler,
					style: { height: 28 },
					onPointerDown: seek,
					onDoubleClick: (e) => {
						if (!onPromptAdd) return;
						const f = frameAt(e.clientX);
						if (f != null) onPromptAdd(f);
					},
					children: [ticks.map((s) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: timeline_module_css_default.tick,
						style: { left: frameToPx(s * fps) },
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: timeline_module_css_default.tickLine }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: timeline_module_css_default.tickLabel,
							children: timelineCopy.tickSeconds({ value: stepSec < 1 ? s.toFixed(1) : String(s) })
						})]
					}, s)), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						"data-testid": "motion-timeline-timecode",
						className: timeline_module_css_default.timecode,
						style: {
							background: barBg,
							boxShadow: "2px 0 6px -2px color-mix(in srgb, var(--dsw-alias-bg-base) 80%, transparent)"
						},
						children: fmtTimecode(frameIdx, fps)
					})]
				})
			}) });
		}
		/** The playhead, spanning every row (bar line 1517). */
		function TimelinePlayhead(props) {
			const { frameIdx, frameToPx, playhead } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-testid": "motion-timeline-playhead",
				className: timeline_module_css_default.playhead,
				style: {
					left: frameToPx(frameIdx),
					width: 2,
					background: playhead,
					boxShadow: `0 0 6px color-mix(in srgb, ${playhead} 40%, transparent)`,
					transform: "translateX(-50%)"
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: timeline_module_css_default.playheadCap,
					style: { background: playhead }
				})
			}) });
		}
		//#endregion
		//#region ../../web-kit/timeline/src/timeline/viser-timeline/styles.ts
		const PROMPT_COLORS = [
			[
				0,
				233,
				236
			],
			[
				239,
				68,
				68
			],
			[
				249,
				115,
				22
			],
			[
				234,
				179,
				8
			],
			[
				34,
				197,
				94
			],
			[
				59,
				130,
				246
			],
			[
				168,
				85,
				247
			],
			[
				236,
				72,
				153
			]
		];
		PROMPT_COLORS[0];
		//#endregion
		//#region ../../web-kit/timeline/src/timeline/MotionTimelineBarLanes.tsx
		/**
		* MotionTimelineBarLanes — the bar's lane bodies (split from
		* MotionTimelineBar.tsx, pure move): prompt clips, beats, audio
		* tracks, keyframe lanes. Chrome (gutter/ruler/playhead) lives in
		* MotionTimelineBarChrome.
		*/
		/** Draggable/resizable prompt clips (bar line 994). */
		function TimelinePromptsLane(props) {
			const { prompts, fps, promptsHeight, emptyPromptsHint, onPromptAdd, dragId, lastPromptRef, firstPromptRef, selectedId, previews, frameToPx, frameAt, startDrag, playhead, onPromptUpdate, onPromptDelete } = props;
			const [editingId, setEditingId] = (0, react.useState)(null);
			const [editText, setEditText] = (0, react.useState)("");
			const commitEdit = (id) => {
				setEditingId(null);
				const text = editText.trim();
				const p = prompts.find((x) => x.uuid === id);
				if (p && text !== p.text) onPromptUpdate(id, text);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: clsx(timeline_module_css_default.promptsLane, onPromptAdd && timeline_module_css_default.canAdd),
				style: {
					height: promptsHeight,
					background: "var(--dsw-alias-bg-layer-1)"
				},
				onDoubleClick: (e) => {
					if (!onPromptAdd) return;
					if (e.target.closest("[data-prompt-clip]")) return;
					const f = frameAt(e.clientX);
					if (f != null) onPromptAdd(f);
				},
				children: [prompts.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: timeline_module_css_default.emptyCenter,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: timeline_module_css_default.emptyHint,
						children: emptyPromptsHint
					})
				}), prompts.map((p, i) => {
					const color = rgb(PROMPT_COLORS[i % PROMPT_COLORS.length]);
					const isEditing = editingId === p.uuid;
					const isMoving = dragId === p.uuid;
					const isLast = p.uuid === lastPromptRef.current;
					const isFirst = p.uuid === firstPromptRef.current;
					const isSelected = selectedId === p.uuid;
					const previewUrl = previews?.[p.uuid];
					const wPx = frameToPx(Math.max(1, p.end_frame - p.start_frame));
					const clipTip = `${p.text || "(empty)"} — frames ${p.start_frame}–${p.end_frame} (${((p.end_frame - p.start_frame) / Math.max(1, fps)).toFixed(1)}s)\n\nDrag body: move · Drag edges: resize · Double-click: edit · Click: select`;
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
						tip: clipTip,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							"data-prompt-clip": p.uuid,
							className: clsx(timeline_module_css_default.promptClip, isMoving ? timeline_module_css_default.clipMoving : isSelected ? timeline_module_css_default.clipSelected : void 0),
							style: {
								left: frameToPx(p.start_frame),
								width: `max(26px, ${wPx}px)`,
								background: `linear-gradient(135deg, ${color}33, ${color}14)`,
								borderLeft: `3px solid ${color}`,
								transition: isMoving ? "none" : "border-color .12s"
							},
							onMouseEnter: (e) => {
								const v = e.currentTarget.querySelector("video");
								if (v) v.play().catch(() => {});
							},
							onMouseLeave: (e) => {
								const v = e.currentTarget.querySelector("video");
								if (v) v.pause();
							},
							onPointerDown: (e) => !isEditing && startDrag(e, {
								kind: "prompt-move",
								id: p.uuid,
								startX: e.clientX,
								startF: p.start_frame,
								endF: p.end_frame,
								moved: false
							}),
							onDoubleClick: (e) => {
								e.stopPropagation();
								setEditText(p.text);
								setEditingId(p.uuid);
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									"data-prompt-edge": "l",
									title: isFirst ? timelineCopy.firstCallTitle : void 0,
									className: clsx(timeline_module_css_default.edgeL, isFirst && timeline_module_css_default.edgeDead),
									onPointerDown: (e) => !isFirst && startDrag(e, {
										kind: "prompt-l",
										id: p.uuid,
										startX: e.clientX,
										startF: p.start_frame,
										endF: p.end_frame,
										moved: false
									}),
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: timeline_module_css_default.gripPill })
								}),
								p.seam === "extend" && !isFirst && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: timeline_module_css_default.seamDot,
									style: {
										background: playhead,
										boxShadow: `0 0 4px ${playhead}`
									},
									title: timelineCopy.seamExtendTitle
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
									tip: isLast ? "PULL to extend the motion — the timeline + duration grow as you drag" : "Drag to resize this card",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										"data-prompt-edge": "r",
										className: clsx(timeline_module_css_default.edgeR, isLast && timeline_module_css_default.edgeWide),
										onPointerDown: (e) => startDrag(e, {
											kind: "prompt-r",
											id: p.uuid,
											startX: e.clientX,
											startF: p.start_frame,
											endF: p.end_frame,
											moved: false
										}),
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: clsx(timeline_module_css_default.gripPillR, isLast && timeline_module_css_default.gripPillBright) })
									})
								}),
								isEditing ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									autoFocus: true,
									value: editText,
									onChange: (e) => setEditText(e.target.value),
									onBlur: () => commitEdit(p.uuid),
									onKeyDown: (e) => {
										if (e.key === "Enter") commitEdit(p.uuid);
										if (e.key === "Escape") setEditingId(null);
									},
									onPointerDown: (e) => e.stopPropagation(),
									onDoubleClick: (e) => e.stopPropagation(),
									placeholder: timelineCopy.promptPlaceholder,
									className: timeline_module_css_default.clipEditor
								}) : previewUrl ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: timeline_module_css_default.previewWrap,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("video", {
											src: previewUrl,
											muted: true,
											loop: true,
											playsInline: true,
											preload: "metadata",
											className: timeline_module_css_default.previewVideo
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: timeline_module_css_default.scrim }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: timeline_module_css_default.clipTextCol,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: timeline_module_css_default.clipTitle,
												style: { color },
												children: p.text || /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: timeline_module_css_default.clipEmpty,
													children: timelineCopy.emptyClip
												})
											}), wPx > 72 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: timeline_module_css_default.clipDur,
												children: timelineCopy.clipSeconds({ seconds: ((p.end_frame - p.start_frame) / Math.max(1, fps)).toFixed(1) })
											})]
										})
									]
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: timeline_module_css_default.clipTextStack,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: timeline_module_css_default.clipTitle,
										style: { color },
										children: p.text || /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: timeline_module_css_default.clipEmpty,
											children: timelineCopy.emptyClip
										})
									}), wPx > 64 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: timeline_module_css_default.clipDur,
										children: timelineCopy.clipSeconds({ seconds: ((p.end_frame - p.start_frame) / Math.max(1, fps)).toFixed(1) })
									})]
								}),
								p.override && !isEditing && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									title: timelineCopy.knobOverrideTitle,
									className: timeline_module_css_default.knobDot
								}),
								p.audio && !isEditing && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Music, {
									"aria-hidden": true,
									className: timeline_module_css_default.refAudioBadge
								}),
								(p.refImages ?? 0) > 0 && !isEditing && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									"data-testid": "tl-ref-badge",
									className: timeline_module_css_default.refBadge,
									title: timelineCopy.refImagesTitle({ count: p.refImages ?? 0 }),
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Image, { "aria-hidden": true }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: timeline_module_css_default.refCount,
										children: p.refImages
									})]
								}),
								!isEditing && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
									tip: "Delete this prompt card",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "ghost",
										size: "sm",
										onPointerDown: (e) => e.stopPropagation(),
										onClick: (e) => {
											e.stopPropagation();
											onPromptDelete(p.uuid);
										},
										"aria-label": timelineCopy.deletePromptCardAria,
										className: timeline_module_css_default.promptDelete,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, {})
									})
								})
							]
						})
					}, p.uuid);
				})]
			}) });
		}
		/** Layer C prompt beats within the calls (bar line 1261). */
		function TimelineBeatsLane(props) {
			const { beats, beatsHeight, beatsHint, fps, selectedId, onSelect, onBeatAdd, xToFrame, frameToPx } = props;
			if (beats == null) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-beats-row": true,
				className: clsx(timeline_module_css_default.beatsLane, onBeatAdd && timeline_module_css_default.beatsAdd),
				style: {
					height: beatsHeight,
					background: "var(--dsw-alias-bg-layer-1)"
				},
				onDoubleClick: (e) => {
					if (!onBeatAdd) return;
					const f = xToFrame(e.clientX);
					if (f != null) onBeatAdd(f);
				},
				children: [beats.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: timeline_module_css_default.beatsEmpty,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: timeline_module_css_default.hintLine,
						children: beatsHint
					})
				}), beats.map((b) => {
					const color = rgb(b.color ?? [
						176,
						180,
						186
					]);
					const isSelected = selectedId === b.id;
					const bW = frameToPx(Math.max(1, b.end_frame - b.start_frame));
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
						tip: `${b.text || "(empty)"} — frames ${b.start_frame}–${b.end_frame} (${((b.end_frame - b.start_frame) / Math.max(1, fps)).toFixed(1)}s)\n\nClick: edit in the call card`,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							"data-beat-clip": b.id,
							onClick: () => onSelect?.(b.id),
							className: clsx(timeline_module_css_default.beatClip, isSelected && timeline_module_css_default.beatSelected),
							style: {
								left: frameToPx(b.start_frame),
								width: `max(14px, ${bW}px)`,
								background: `linear-gradient(135deg, ${color}2e, ${color}12)`,
								borderLeft: `3px solid ${color}`
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: timeline_module_css_default.beatLabel,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: timeline_module_css_default.truncate,
									children: b.text || /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: timeline_module_css_default.beatEmpty,
										children: timelineCopy.emptyClip
									})
								})
							})
						})
					}, b.id);
				})]
			}) });
		}
		/** Native audio tracks, same scroll + scale (bar line 1316). */
		function TimelineAudioLanes(props) {
			const { audioLayers, prompts, fps, frameToPx, xToFrame, startDrag, audioClipCards, onAudioDrop, onAudioDropAt, onAudioFileDrop, onAudioClipMove, onAudioClipDelete } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: audioLayers?.map((L) => {
				const clips = L.clips ?? [];
				const Glyph = L.icon === "mic" ? Mic : L.icon === "zap" ? Zap : Music;
				const accent = L.accent;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					"data-audio-layer": L.id,
					"data-wired": L.stem ? "true" : "false",
					"data-clips": clips.length ? "true" : "false",
					"data-lane-cards": audioClipCards ? "true" : "false",
					className: timeline_module_css_default.audioLane,
					style: {
						height: audioClipCards ? 44 : 26,
						background: "color-mix(in srgb, var(--dsw-alias-state-business-primary) 3%, transparent)"
					},
					onDragOver: (e) => e.preventDefault(),
					onDrop: (e) => {
						e.preventDefault();
						const t = xToFrame(e.clientX);
						const f = t != null && Number.isFinite(t) ? t : 0;
						const file = e.dataTransfer.files?.[0];
						if (file) {
							onAudioFileDrop?.(L.id, file, f);
							return;
						}
						try {
							const payload = JSON.parse(e.dataTransfer.getData(_melite_card_base_client.ASSET_DRAG_MIME) || "null");
							if (payload && typeof payload.url === "string") {
								if (onAudioDropAt) onAudioDropAt(L.id, payload.url, f);
								else onAudioDrop?.(L.id, payload.url);
							}
						} catch {}
					},
					children: clips.length ? clips.map((c) => {
						const a = (c.start_frame / Math.max(1, fps)).toFixed(1);
						const b = ((c.start_frame + c.dur_frames) / Math.max(1, fps)).toFixed(1);
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							"data-audio-clip": c.id,
							"data-card": audioClipCards ? "true" : void 0,
							title: timelineCopy.audioClipTitle({
								name: c.name,
								start: a,
								end: b,
								gain: c.gain != null ? c.gain.toFixed(2) : null
							}),
							className: clsx(timeline_module_css_default.audioClip, audioClipCards && timeline_module_css_default.audioCard),
							style: {
								left: frameToPx(c.start_frame),
								width: `max(6px, ${frameToPx(Math.max(1, c.dur_frames))}px)`,
								...audioClipCards && accent ? {
									background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 32%, transparent), color-mix(in srgb, ${accent} 10%, transparent))`,
									borderColor: `color-mix(in srgb, ${accent} 45%, transparent)`,
									borderLeftColor: accent,
									borderLeftWidth: 3
								} : {}
							},
							onPointerDown: (e) => {
								if (!onAudioClipMove) return;
								startDrag(e, {
									kind: "audio-clip",
									layerId: L.id,
									id: c.id,
									startX: e.clientX,
									startF: c.start_frame,
									durF: c.dur_frames,
									moved: false
								});
							},
							children: [
								audioClipCards && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									"aria-hidden": true,
									className: timeline_module_css_default.audioCardIcon,
									style: accent ? { color: accent } : void 0,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, {})
								}),
								c.gain != null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									"aria-hidden": true,
									className: timeline_module_css_default.gainFill,
									style: { height: `${Math.max(4, Math.min(100, c.gain * 50))}%` }
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: timeline_module_css_default.audioClipLabel,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: timeline_module_css_default.audioName,
										children: c.name
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: timeline_module_css_default.audioTime,
										children: timelineCopy.clipSeconds({ seconds: a })
									})]
								}),
								onAudioClipDelete && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									size: "sm",
									"data-audio-clip-delete": c.id,
									"aria-label": timelineCopy.deleteClipAria({ name: c.name }),
									onClick: (e) => {
										e.stopPropagation();
										onAudioClipDelete(L.id, c.id);
									},
									className: timeline_module_css_default.audioClipDelete,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, {})
								})
							]
						}, c.id);
					}) : L.stem ? prompts.map((p, i) => {
						const a = (p.start_frame / Math.max(1, fps)).toFixed(1);
						const b = (p.end_frame / Math.max(1, fps)).toFixed(1);
						return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							"data-audio-slice": i,
							title: timelineCopy.audioSliceTitle({
								call: i,
								start: a,
								end: b
							}),
							className: timeline_module_css_default.audioSlice,
							style: {
								left: frameToPx(p.start_frame),
								width: `max(4px, ${frameToPx(Math.max(1, p.end_frame - p.start_frame))}px)`
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: timeline_module_css_default.sliceLabel,
								children: timelineCopy.sliceRange({
									start: a,
									end: b
								})
							})
						}, p.uuid);
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: timeline_module_css_default.audioDrop,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: timeline_module_css_default.dropHint,
							children: timelineCopy.audioDropHint
						})
					})
				}, L.id);
			}) });
		}
		/** Keyframe lanes: pin, drag, hover-X delete (bar line 1443). */
		function TimelineKeyframeLanes(props) {
			const { tracks, keyframes, laneHint, dragId, frameToPx, xToFrame, startDrag, onKeyframeAdd, onKeyframeDelete } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: tracks.map((track, ti) => {
				const kfs = keyframes.filter((k) => k.track_id === track.uuid);
				const color = rgb(track.color ?? [
					176,
					180,
					186
				]);
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					"data-lane": track.uuid,
					className: timeline_module_css_default.kfLane,
					style: { height: 24 },
					onDoubleClick: (e) => {
						const f = xToFrame(e.clientX);
						if (f != null) onKeyframeAdd(track.uuid, f);
					},
					children: [keyframes.length === 0 && ti === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: timeline_module_css_default.laneHint,
						children: laneHint
					}), kfs.map((kf) => {
						const isMoving = dragId === kf.uuid;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: timeline_module_css_default.kfWrap,
							style: { left: frameToPx(kf.frame) },
							"data-drop-hint": kf.dropHint,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
									tip: `${track.name} constraint @ frame ${kf.frame} — drag to move, click to jump, hover ✕ to delete${kf.dropHint ? `\n\n${kf.dropHint}` : ""}`,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "ghost",
										size: "sm",
										"data-kf": kf.uuid,
										"aria-label": kf.ariaLabel ?? timelineCopy.keyframeAria({
											track: track.name,
											frame: kf.frame
										}),
										onPointerDown: (e) => startDrag(e, {
											kind: "kf",
											id: kf.uuid,
											startX: e.clientX,
											frame: kf.frame,
											moved: false
										}),
										onDoubleClick: (e) => e.stopPropagation(),
										className: timeline_module_css_default.kfBtn,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: clsx(timeline_module_css_default.kfDiamond, isMoving && timeline_module_css_default.kfMoving),
											style: {
												background: color,
												borderColor: color
											}
										})
									})
								}),
								kf.thumbUrl !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
									src: kf.thumbUrl,
									alt: "",
									draggable: false,
									"data-kf-thumb": kf.uuid,
									style: {
										position: "absolute",
										left: 10,
										top: "50%",
										transform: "translateY(-50%)",
										width: 14,
										height: 14,
										borderRadius: 3,
										objectFit: "cover",
										pointerEvents: "none",
										boxShadow: "0 0 0 1px var(--dsw-alias-border-l4)"
									}
								}),
								kf.readout !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									"data-kf-frame": kf.uuid,
									style: {
										position: "absolute",
										left: kf.thumbUrl !== void 0 ? 26 : 10,
										top: "50%",
										transform: "translateY(-50%)",
										fontSize: 9,
										lineHeight: 1,
										color: "var(--dsw-alias-label-secondary)",
										whiteSpace: "nowrap",
										fontVariantNumeric: "tabular-nums",
										pointerEvents: "none"
									},
									children: kf.readout
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
									tip: `Delete ${track.name} keyframe at frame ${kf.frame}`,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "ghost",
										size: "sm",
										onPointerDown: (e) => e.stopPropagation(),
										onClick: (e) => {
											e.stopPropagation();
											onKeyframeDelete(kf.uuid);
										},
										"aria-label": timelineCopy.deleteKeyframeAria({
											track: track.name,
											frame: kf.frame
										}),
										className: timeline_module_css_default.kfDelete,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, {})
									})
								})
							]
						}, kf.uuid);
					})]
				}, track.uuid);
			}) });
		}
		//#endregion
		//#region ../../web-kit/timeline/src/timeline/MotionTimelineBar.tsx
		/**
		* MotionTimelineBar — the motion card's bar, pose-studio display model.
		*
		* 2026-08-14 rethink: the vendored viser Timeline (canvas-drawn, Kimodo
		* demo parity) is replaced by the LEGACY POSE STUDIO's interaction model —
		* DOM clips you can SEE and GRAB: prompt cards drag (body = move, edges =
		* resize), double-click to edit inline, hover-X to delete; keyframe lanes
		* with draggable diamonds. The user's words: "I could click and drag prompt
		* in the motion studio, was useful."
		*
		* Zoom + horizontal scroll (pose-studio parity, round 2): the bar DEFAULTS
		* to fit (every frame on screen — no hidden content), but −/%/+ zooms in;
		* past fit the content scrolls horizontally (native thin scrollbar, wheel,
		* trackpad, shift-wheel) while the label gutter stays pinned. Zooming is
		* ANCHORED to the playhead — the frame under the playhead stays put, the
		* rest grows around it.
		*
		* Pull-the-tail (2026-08-14, the "stuck at 5 seconds" fix): the end is not
		* a wall. Dragging the LAST prompt card's right edge past the end EXTENDS
		* the timeline (onExtend → the parent grows its envelope + duration_sec),
		* with auto-scroll following the cursor — the DaVinci Resolve rule that
		* the sequence is as long as its content. Non-last cards clamp as before.
		*
		* What stayed: ALL the state + persistence beneath (tlPrompts /
		* tlKeyframes / constraintPayloads in MotionCardEditor, constraints.ts
		* serialize/hydrate, MOTION_TIMELINE_TRACKS lane colors from the Kimodo
		* demo). This is a view-layer swap only — every prop is one of the
		* callbacks the viser Timeline used to receive.
		*
		* Video-timeline re-tenanting round 2 (2026-08-16, "the bar needs to be
		* TALLER, show the videos, and have a beats row UNDER the calls"): the
		* row heights grew (ruler 28 / prompts 36 — the video studio passes 64),
		* call clips render their WINDOW PREVIEW inside the clip (first frame at
		* rest, plays on hover — NLE strip behavior), and a Layer C BEATS row
		* sits under the calls: prompt segments within a call, clickable (the
		* sidebar edits them), never cut-bearers. Clicking a call OR beat clip
		* selects it (`onSelect`) — the tenant's sidebar populates that item's
		* inputs/options; the selected clip gets a ring (calls brand cyan, beats
		* cyan-300). A click on the EMPTY timeline deselects (`onSelect(null)`)
		* — the sidebar shifts back to its global mode; a real drag never
		* deselects (the post-pointerup synthetic click is suppressed).
		*
		* Theme: the DSH tokens (bg --dsw-alias-bg-layer-1, playhead
		* --dsw-alias-brand-primary), the 2026-09-13 color law. The palette is
		* themeable per mount (the 2026-09-07 styling seam: className/style on
		* the root, theme.{barBg,playhead} for the accents) — defaults render
		* byte-identical, so no tenant changes.
		*/
		/** Playhead accent — the DSH brand token. */
		const PLAYHEAD = "var(--dsw-alias-brand-primary)";
		/** Unified background for the timeline bar and its sticky timecode chip. */
		const BAR_BG = "var(--dsw-alias-bg-layer-1)";
		function MotionTimelineBar({ prompts, keyframes, frameIdx, onFrameChange, onScrubStart, onScrubEnd, totalFrames, fps, initialSeconds, onKeyframeAdd, onKeyframeMove, onKeyframeDelete, onPromptUpdate, onPromptMove, onPromptResize, onPromptDelete, onExtend, tracks = MOTION_TIMELINE_TRACKS, promptsLabel = timelineCopy.lanePrompts, laneHint = timelineCopy.laneHintDefault, packed = false, emptyPromptsHint = timelineCopy.emptyPromptsHint, promptsHeight = 36, beats, beatsLabel = timelineCopy.laneBeats, beatsHeight = 26, beatsHint = timelineCopy.beatsHintDefault, onBeatAdd, onPromptAdd, previews, selectedId = null, onSelect, audioLayers, onAudioDrop, onAudioDropAt, onAudioFileDrop, onAudioClipMove, onAudioClipDelete, onAudioDetach, audioClipCards = false, className, style, theme }) {
			const barBg = theme?.barBg ?? BAR_BG;
			const playhead = theme?.playhead ?? PLAYHEAD;
			const scrollRef = (0, react.useRef)(null);
			const scale = useTimelineScale({
				scrollRef,
				frameIdx,
				totalFrames,
				fps,
				initialSeconds
			});
			const drag = useTimelineDragSession({
				T1: scale.T1,
				effPpf: scale.effPpf,
				ppf: scale.ppf,
				dragScale: scale.dragScale,
				setPpf: scale.setPpf,
				setBasePpf: scale.setBasePpf,
				setDragScale: scale.setDragScale,
				prompts,
				audioLayers,
				packed,
				xToFrame: scale.xToFrame,
				keepTailVisible: scale.keepTailVisible,
				onFrameChange,
				onScrubStart,
				onScrubEnd,
				onSelect,
				onKeyframeMove,
				onPromptMove,
				onPromptResize,
				onExtend,
				onAudioClipMove
			});
			const { ticks, stepSec } = buildTicks(scale.contentW, scale.effPpf, totalFrames, fps);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-testid": "motion-timeline-bar",
				className: clsx(timeline_module_css_default.root, className),
				style: {
					background: barBg,
					...style
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TimelineGutter, {
					scale,
					scrollRef,
					frameIdx,
					promptsHeight,
					promptsLabel,
					beats,
					beatsLabel,
					beatsHeight,
					audioLayers,
					onAudioDetach,
					tracks,
					audioClipCards
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(TimelineContent, {
					scrollRef,
					contentW: scale.contentW,
					suppressClickRef: drag.suppressClickRef,
					onSelect,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TimelineRuler, {
							ticks,
							stepSec,
							fps,
							frameIdx,
							barBg,
							frameToPx: scale.frameToPx,
							frameAt: scale.frameAt,
							seek: drag.seek,
							onPromptAdd
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TimelinePromptsLane, {
							prompts,
							fps,
							promptsHeight,
							emptyPromptsHint,
							onPromptAdd,
							dragId: drag.dragId,
							selectedId,
							previews,
							lastPromptRef: drag.lastPromptRef,
							firstPromptRef: drag.firstPromptRef,
							frameToPx: scale.frameToPx,
							frameAt: scale.frameAt,
							startDrag: drag.startDrag,
							playhead,
							onPromptUpdate,
							onPromptDelete
						}),
						beats && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TimelineBeatsLane, {
							beats,
							beatsHeight,
							beatsHint,
							fps,
							selectedId,
							onSelect,
							onBeatAdd,
							xToFrame: scale.xToFrame,
							frameToPx: scale.frameToPx
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TimelineAudioLanes, {
							audioLayers,
							prompts,
							fps,
							audioClipCards,
							frameToPx: scale.frameToPx,
							xToFrame: scale.xToFrame,
							startDrag: drag.startDrag,
							onAudioDrop,
							onAudioDropAt,
							onAudioFileDrop,
							onAudioClipMove,
							onAudioClipDelete
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TimelineKeyframeLanes, {
							tracks,
							keyframes,
							laneHint,
							dragId: drag.dragId,
							frameToPx: scale.frameToPx,
							xToFrame: scale.xToFrame,
							startDrag: drag.startDrag,
							onKeyframeAdd,
							onKeyframeDelete
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TimelinePlayhead, {
							frameIdx,
							frameToPx: scale.frameToPx,
							playhead
						})
					]
				})]
			});
		}
		//#endregion
		//#region ../../web-kit/timeline/src/timeline/FilmPlayer.tsx
		/**
		* FilmPlayer — ONE film, ONE native player (the timeline genre's
		* shared video surface, moved from h3-timeline's kit 2026-09-17:
		* the operator's generic-tools stroke — "other cards, like H3
		* Timeline (timeline bar at the bottom, video preview, dynamic
		* parameters on the left), share code"). The timeline-genre card
		* now composes from shared rails: StudioShell + CardForm
		* (@melite/card-base), MotionTimelineBar (this package), and THIS
		* player — the imperative seam the bar's playhead drives
		* (seekTo/current/duration/play/pause/toggle) with the
		* time/duration/playing reports. Time reports keep both sources
		* (the element's timeupdate clock + a 4Hz poll while playing) so a
		* silent event path never freezes the bar.
		*/
		const FilmPlayer = (0, react.forwardRef)(function FilmPlayer({ src, onTime, onDuration, onPlayingChange, onEnded, muted, loop, autoPlay, poster, className, "data-testid": tid }, ref) {
			const videoRef = (0, react.useRef)(null);
			const pendingSeekRef = (0, react.useRef)(null);
			const seekRafRef = (0, react.useRef)(null);
			const seekTo = (0, react.useCallback)((sec) => {
				pendingSeekRef.current = sec;
				if (seekRafRef.current != null) return;
				seekRafRef.current = requestAnimationFrame(() => {
					seekRafRef.current = null;
					const target = pendingSeekRef.current;
					pendingSeekRef.current = null;
					const el = videoRef.current;
					if (!el) return;
					const d = el.duration;
					el.currentTime = Math.max(0, Number.isFinite(d) && d > 0 ? Math.min(target, d) : target);
				});
			}, []);
			(0, react.useEffect)(() => () => {
				if (seekRafRef.current != null) cancelAnimationFrame(seekRafRef.current);
			}, []);
			(0, react.useImperativeHandle)(ref, () => ({
				seekTo,
				current: () => videoRef.current.currentTime,
				duration: () => {
					const d = videoRef.current.duration;
					return Number.isFinite(d) ? d : 0;
				},
				play: () => {
					videoRef.current?.play().catch(() => {});
				},
				pause: () => void videoRef.current?.pause(),
				toggle: () => {
					const el = videoRef.current;
					if (el.paused) el.play().catch(() => {});
					else el.pause();
				}
			}), [seekTo]);
			const onTimeRef = (0, react.useRef)(onTime);
			onTimeRef.current = onTime;
			const handleTime = (0, react.useCallback)((t) => {
				onTimeRef.current?.(t);
			}, []);
			(0, react.useEffect)(() => {
				const id = window.setInterval(() => {
					const el = videoRef.current;
					if (el.paused || el.ended) return;
					const t = el.currentTime;
					if (Number.isFinite(t) && t >= 0) onTimeRef.current?.(t);
				}, 250);
				return () => window.clearInterval(id);
			}, []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("video", {
				ref: videoRef,
				className,
				"data-testid": tid,
				src,
				muted,
				loop,
				autoPlay,
				playsInline: true,
				preload: "metadata",
				controls: true,
				poster,
				onTimeUpdate: (e) => handleTime(e.currentTarget.currentTime),
				onPlay: () => onPlayingChange?.(true),
				onPause: () => onPlayingChange?.(false),
				onEnded: () => onEnded?.(),
				onLoadedMetadata: (e) => {
					const d = e.currentTarget.duration;
					if (Number.isFinite(d) && d > 0) onDuration?.(d);
				}
			});
		});
		(0, react.createContext)({ useGui: (selector) => selector({ theme: { dark_mode: true } }) });
		//#endregion
		//#region ../../../@deepseek-ai/dsh-util-values/lib/index.js
		/** Duplicate-install-safe JSON and immutable-value helpers. @module @deepseek-ai/dsh-util-values */
		/**
		* Mark an unreachable closed-union branch.
		* @param value - impossible value; an unhandled typed variant fails at the call site.
		* @param context - optional switch-site label included in the failure message.
		* @returns never; a runtime value that escaped its type always throws.
		*/
		function assertNever(value, context) {
			const rendered = JSON.stringify(value) ?? String(value);
			throw new Error(`unreachable variant${context ? ` in ${context}` : ""}: ${rendered}`);
		}
		var init_lib$2 = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/src/timelineTypes.ts
		const DEFAULT_SEGMENT_PARAMS$1 = {
			seed: 42,
			width: 640,
			height: 480,
			frames: 33,
			fps: 16,
			resizeMethod: "crop",
			samplingSteps: 10,
			guideScale: 5,
			model: "h3",
			profile: "fast",
			motionAmplitude: 1,
			flfMode: false,
			teacacheEnabled: false,
			teacacheThreshold: .01,
			progressiveEnabled: false,
			progressiveLevels: 2,
			progressiveDelta: .15,
			progressiveMode: "dct",
			relayEpsilon: .01,
			guideStrength: 1,
			guideCrf: 0,
			scaleBy: 1,
			upscaleMethod: "bicubic",
			useTiledEncode: false,
			tileSize: 256,
			tileOverlap: 64,
			imageAttentionStrength: 1,
			loras: [],
			motionVideoB64: null,
			motionStrength: .7,
			motionTrimStart: 0,
			motionTrimEnd: 0,
			motionOffset: 0,
			resampleMode: "nearest",
			retakePrompt: "",
			retakeStartFrame: 0,
			retakeEndFrame: -1
		};
		Object.values({
			agent: "agent",
			user: "user",
			imported: "imported"
		});
		const REF_CAPS = {
			images: 8,
			videos: 3,
			audios: 3,
			refmods: 8
		};
		function transitionOverlap(transition) {
			return transition === "cut" ? 0 : 22;
		}
		function gridSnap(length) {
			const k = Math.round((length - 22) / 17);
			return Math.min(362, Math.max(22, 22 + 17 * k));
		}
		/** THE GRID PREDICATE, one owner: a length the engine can render is
		*  22+17k inside [22,362]. Every refusal door asks this question, so
		*  knob pins, single windows, cut windows, and carried windows cannot
		*  drift into different laws. */
		function isGridLength(length) {
			return Number.isInteger(length) && length >= 22 && length <= 362 && (length - 22) % 17 === 0;
		}
		function deliveredFrames(call, index) {
			const span = call.end_frame - call.start_frame;
			if (index === 0 || call.transition === "cut") return span;
			return Math.max(0, span - 22);
		}
		function splitRefList(value) {
			if (!value) return [];
			const out = [];
			let i = 0;
			while (i < value.length) {
				while (i < value.length && (value[i] === "," || value[i] === " " || value[i] === "	")) i++;
				if (i >= value.length) break;
				const start = i;
				const isData = value.startsWith("data:", i);
				let mimeComma = false;
				while (i < value.length) {
					if (value[i] === ",") {
						if (isData && !mimeComma) {
							mimeComma = true;
							i++;
							continue;
						}
						break;
					}
					i++;
				}
				let end = i;
				while (end > start && (value[end - 1] === " " || value[end - 1] === "	")) end--;
				out.push(value.slice(start, end));
			}
			return out;
		}
		function normalizeDeclaredRefs(value) {
			if (Array.isArray(value)) return value.filter((entry) => typeof entry === "string" && entry.trim() !== "");
			if (typeof value === "string") return splitRefList(value);
			return [];
		}
		function joinRefList(value) {
			if (Array.isArray(value)) {
				const entries = value.map(String).map((entry) => entry.trim()).filter(Boolean);
				return entries.length > 0 ? entries.join(", ") : void 0;
			}
			if (typeof value === "string" && value.trim()) return value.trim();
		}
		function refGenreOf(name, url) {
			const lowerName = name.toLowerCase();
			if (/^video_w\d+_/.test(lowerName)) {
				if (lowerName.endsWith("_last_frame") || lowerName.includes("_prev")) return "image";
				return "video";
			}
			const extension = `${lowerName} ${url ? url.toLowerCase().split("?")[0] : ""}`.split(".").pop().split(/[^a-z0-9]/)[0];
			if ([
				"png",
				"jpg",
				"jpeg",
				"webp",
				"gif",
				"bmp",
				"avif"
			].includes(extension)) return "image";
			if ([
				"mp4",
				"webm",
				"mov",
				"mkv",
				"avi",
				"m4v"
			].includes(extension)) return "video";
			if ([
				"mp3",
				"wav",
				"flac",
				"ogg",
				"m4a",
				"aac",
				"opus"
			].includes(extension)) return "audio";
			return "other";
		}
		const KNOB_ORDER = [
			"steps",
			"denoise",
			"sampler_name",
			"sched_name",
			"shift_video",
			"shift_audio",
			"sla_sparsity",
			"sla_block_size",
			"sla_min_seq_len",
			"sla_dense_last_steps",
			"sla_protect_audio",
			"sla_stabilize_motion",
			"sla_reference_protection",
			"sla_dense_backend",
			"sla_dense_steps",
			"sla_disable_fp16_accum",
			"sharpen_enabled",
			"sharpen_method",
			"sharpen_strength",
			"sharpen_radius",
			"sharpen_threshold",
			"sharpen_iterations",
			"interpolate_enabled",
			"interp_model",
			"interp_multiplier",
			"length"
		];
		const CALL_KNOB_KEYS = new Set(KNOB_ORDER);
		const LEGACY_KNOB_KEY = {
			sampling_steps: "steps",
			sampler: "sampler_name",
			scheduler: "sched_name",
			h3_sla_sparsity: "sla_sparsity",
			h3_sla_block_size: "sla_block_size",
			h3_sla_min_seq_len: "sla_min_seq_len",
			h3_sla_dense_last_steps: "sla_dense_last_steps",
			h3_sla_protect_audio: "sla_protect_audio",
			h3_sla_stabilize_motion: "sla_stabilize_motion",
			h3_sla_reference_protection: "sla_reference_protection",
			h3_sla_dense_backend: "sla_dense_backend",
			h3_sla_dense_steps: "sla_dense_steps",
			h3_sla_disable_fp16_accum: "sla_disable_fp16_accum",
			interpolate_model: "interp_model",
			interpolate_multiplier: "interp_multiplier"
		};
		function migrateCallKnobKey(key) {
			return LEGACY_KNOB_KEY[key] ?? key;
		}
		//#endregion
		//#region src/ui/studio/projection.ts
		/**
		* projection.ts — the h3 tenant's owner-currency projection (PURE
		* MOVE from src/client/index.ts, 2026-10-27, the one-truth currency
		* completion: the tenant speaks StageViewOwnerProps and projects
		* its CardStage internally — the adapter is a pass-through, no
		* second contract at the boundary). Every line below the export is
		* verbatim from the adapter; the harvest shape law (named map, flat
		* list, gallery, stage url, junk refused) is unchanged.
		*/
		function recordOf$1(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
		}
		function isWindowName(name) {
			return /^h3_t4_w\d+_\d+_\.mp4$/i.test(name) || /^video_w\d+_/.test(name);
		}
		function videoUrlOf(artifacts, assetUrls, direct, allowWindow = false) {
			const rows = Object.entries(artifacts).filter((entry) => {
				const [name, url] = entry;
				return typeof url === "string" && url !== "" && refGenreOf(name, url) === "video";
			});
			const film = rows.find(([name, url]) => /(?:^|\/)h3_t4_film_\d+_\.mp4$/i.test(name) || /h3_t4_film_\d+_\.mp4(?:$|[?#])/i.test(url));
			if (film !== void 0) return film[1];
			if (typeof direct === "string" && direct !== "" && refGenreOf("", direct) === "video") return direct;
			const named = rows.find(([name]) => allowWindow || !isWindowName(name));
			if (named !== void 0) return named[1];
			return assetUrls.find((url) => refGenreOf("", url) === "video") ?? "";
		}
		/** THE ONE PER-ENTRY HARVEST LAW (the rail-law audit, 2026-10-31:
		* this law was owned twice — here and a drift copy in StudioPreview
		* with a different priority order and no error arm — one owner now).
		* One raw history entry → one row, or null when it holds no video:
		* the named artifact map (film lead, windows allowed), then a
		* directly-named video url (either the raw `url` key or an
		* already-harvested row's `video` key), then the flat assetUrls; an
		* absent status with a present error folds to 'failed'.
		*
		* @param value one raw history entry (row.history, metadata.history,
		* or an already-harvested H3HistoryRow).
		* @returns the normalized row, or null when no video survives. */
		function historyEntryOf(value) {
			const entry = recordOf$1(value);
			const video = videoUrlOf(recordOf$1(entry["artifacts"]), Array.isArray(entry["assetUrls"]) ? entry["assetUrls"].filter((url) => typeof url === "string") : [], typeof entry["url"] === "string" ? entry["url"] : typeof entry["video"] === "string" ? entry["video"] : "", true);
			if (video === "") return null;
			const runId = typeof entry["runId"] === "string" ? entry["runId"] : typeof entry["run_id"] === "string" ? entry["run_id"] : void 0;
			const error = typeof entry["error"] === "string" ? entry["error"] : "";
			const status = typeof entry["status"] === "string" ? entry["status"] : error !== "" ? "failed" : void 0;
			const duration = typeof entry["durationSec"] === "number" ? entry["durationSec"] : void 0;
			const at = typeof entry["at"] === "number" ? entry["at"] : void 0;
			return {
				...runId !== void 0 ? { runId } : {},
				...status !== void 0 ? { status } : {},
				...at !== void 0 ? { at } : {},
				...duration !== void 0 ? { durationSec: duration } : {},
				video
			};
		}
		/** One source list → deduped rows, newest-first, estate cap 12 (the
		*  dedupe key is the run id, else the video url). */
		function historyRowsFrom(sources) {
			const rows = [];
			for (const value of sources) {
				const row = historyEntryOf(value);
				if (row !== null) rows.push(row);
			}
			const seen = /* @__PURE__ */ new Set();
			return rows.filter((entry) => {
				const key = entry.runId ?? entry.video;
				if (seen.has(key)) return false;
				seen.add(key);
				return true;
			}).slice(0, 12);
		}
		function historyRows(row, result, metadata) {
			const sources = [];
			if (Array.isArray(row["history"])) {
				sources.push(result);
				sources.push(...row["history"]);
			}
			const legacy = metadata["history"];
			if (Array.isArray(legacy)) sources.push(...legacy);
			return historyRowsFrom(sources);
		}
		/** The studio's history read (THE ONE OWNER, rail-law audit
		*  2026-10-31): the stage's own two history sources — the harvested
		*  result.metadata.history and the stage-level history list —
		*  through the same per-entry law, dedupe, and cap the contract's
		*  harvest rides. The preview imports THIS; no second harvest face.
		*
		* @param stage the projected document stage.
		* @returns the deduped history rows (newest first, cap 12). */
		function stageHistoryRows(stage) {
			const sources = [];
			const metadataHistory = stage.result?.metadata?.history;
			if (Array.isArray(metadataHistory)) sources.push(...metadataHistory);
			if (Array.isArray(stage.history)) sources.push(...stage.history);
			return historyRowsFrom(sources);
		}
		function harvestResult(row, base) {
			const result = recordOf$1(row["result"]);
			const artifacts = { ...base?.artifacts ?? {} };
			const gallery = Array.isArray(result["gallery"]) ? result["gallery"] : [];
			for (const entry of gallery) {
				const item = recordOf$1(entry);
				const name = typeof item["name"] === "string" ? item["name"] : "";
				const url = typeof item["url"] === "string" ? item["url"] : "";
				if (name !== "" && url !== "") artifacts[name] = url;
			}
			const assetUrls = base?.assetUrls ?? [];
			const video = videoUrlOf(artifacts, assetUrls, result["url"]);
			if (video !== "") artifacts["video"] = video;
			else if (artifacts["video"] !== void 0 && refGenreOf("video", artifacts["video"]) !== "video") delete artifacts["video"];
			const rawMetadata = result["metadata"];
			const metadata = {
				...base?.metadata ?? {},
				...recordOf$1(rawMetadata)
			};
			const history = historyRows(row, result, metadata);
			if (history.length > 0) metadata["history"] = history;
			return {
				assetUrls,
				artifacts,
				metadata,
				...base?.durationSec === void 0 ? {} : { durationSec: base.durationSec },
				...base?.gallery === void 0 ? {} : { gallery: base.gallery },
				...base?.motionPreviews === void 0 ? {} : { motionPreviews: base.motionPreviews }
			};
		}
		/**
		* The tenant's owner-currency projection: the bench host's
		* StageViewOwnerProps become the document stage (params IS the
		* document) plus the read-only upstream stages. The write channel
		* needs no projection — onSave IS owner.onPatch, 1:1.
		*
		* @param owner the bench host's StageViewOwnerProps for this stage.
		* @returns the projected CardStage and the upstream CardStages.
		*/
		function projectH3StageViewProps(owner) {
			return {
				stage: projectStageView$1(owner, {
					genre: "video",
					result: harvestResult
				}),
				upstreams: projectUpstreamStages$1(owner)
			};
		}
		//#endregion
		//#region src/ui/studio/studioCopy.ts
		/**
		* studioCopy.ts — THE STUDIO COPY DICTIONARY (the rail-law audit's
		* H8, 2026-10-31). Client UI copy is locale-owned (the estate's
		* decision, mirrored from card-base's square.ts): presentation code
		* owns no copy literals; it consumes them here through the typed
		* seat. A second locale plugs into this dictionary without touching
		* a single studio component.
		*
		* THE BOUND: static user-visible FACES live here (labels, titles,
		* placeholders, aria names). Computed LAW WORDINGS — a hover title
		* that narrates its lane's own rule with live numbers ("3 claimed —
		* the loader holds 8 slots…") — are one-of-a-kind per seat and ride
		* the seat; the dictionary would only rename them, not own them.
		* The refusal/error literals that EVERY seat shares live in
		* refUtils (FOREIGN_URL_REFUSAL, REF_READ_ERROR) — one law, one
		* home, not two.
		*/
		/** The typed dictionary. Keys are stable copy ids. */
		// v8 ignore next -- exercised key-by-key by the copy wall's census arm
		const studioCopy = {
			/** Image-bus label (terse face law, 2026-11-05: the anchor-slot
			*  prose died with the anchor face — the cap tail carries the
			*  count; labels are faces, prose lives in hint seats). */
			imagesBusLabel: "Images",
			/** Ref-videos lane label (terse, symmetric with the sister lanes). */
			refVideos: "Videos",
			/** Ref-audios lane label (terse, symmetric with the sister lanes). */
			refAudios: "Audios",
			/** Ref-mods lane label (engine-side packs). */
			refMods: "Ref mods (packs)",
			/** The mods chip strip's hover action. */
			removePack: "remove this pack",
			/** The mods path door's placeholder (the wire's example path). */
			/** The mods path door's accessible name. */
			/** The anchor slot's square caption (the bus's slot 1). */
			anchorSlot: "anchor ref · slot 1",
			/** The seam picker's carried option. */
			seamCarried: "carried — drift-control chain",
			/** The seam picker's cut option. */
			seamCut: "cut — independent window",
			/** The strip pane's head. */
			timelineTitle: "Timeline",
			/** The preview pane's head. */
			previewTitle: "Preview",
			/** The preview's empty state (the run order, in one line). */
			previewEmpty: "No render yet — author the calls below, then Run.",
			/** Focused mode's back door. */
			backToGlobal: "Back to global parameters",
			/** The seam picker's hover law (how carried vs cut join). */
			seamHelp: "How this call joins the previous one: carried continues the previous window's latent through drift control (schedule-matched carry, soft audio release — seamless across the seam); cut is an independent window, a true butt",
			/** The prompt lane's enhance action. */
			enhanceAction: "Rewrite this call's prompt in H3 cinematic style",
			/** The prompt lane's empty-state placeholder (and its refusal hint). */
			promptPlaceholder: "describe the action, camera, and mood for this call — empty calls refuse the plan",
			/** The recipe engine's frame-rate seat. */
			fps: "FPS",
			/** (operator 2026-11-05) the GENERAL head — the studio-owned
			*  clock rides here above the generic knobs (fps is a doc
			*  control, not a card param; CardForm cannot seat it). */
			generalTitle: "General",
			/** (operator 2026-11-05: "THE FPS DIDN'T GET MOVED TO THE GENERAL
			*  knobs below it. */
			/** The refs-clips lane's per-clip removal. */
			removeClip: "remove the clip",
			/** The declared chip's card tag (the inherit arm's marker). */
			declaredCardTag: "card",
			/** The bucket door-guard's stand-down default (a pinned window owns its audio). */
			pinnedStanddown: "pinned window — this input stands down",
			/** The bus-count tail's pinned dot. */
			countPinnedTail: " · pinned",
			/** The bus-count tail's override dot. */
			countOverridesTail: " · overrides",
			/** The declared chip's hover law (card-level defaults ride until a stated lane replaces them). */
			declaredChipTitle: (url) => `card-level default — rides this window while the call states no chips of its own (a stated lane replaces it; edit via the card params)\n${url}`,
			/** The mod chip's hover law (engine-side packs stem into the loader). */
			modChipTitle: (chip) => `engine-side pack — the compose stems it into the loader (must be .safetensors under models/refmods/)\n${chip}`,
			/** The call head shared by the focused card and the compact row (one face, two seats). */
			modelCallHead: (index) => `#${index} · Model call ${index + 1}`,
			/** The card header's span readout (frames, span seconds, seam-carried delivery). */
			spanReadout: (start, end, spanSec, deliveredSec) => `frames ${start}–${end} · span ${spanSec}s → delivered ${deliveredSec}s`,
			/** The knob badge (per-call override count). */
			knobTag: (count) => `${count} knob${count === 1 ? "" : "s"}`,
			/** The call Delete button's accessible name. */
			deleteCallAria: (index) => `Delete call ${index}`,
			/** The call Delete button's visible verb. */
			deleteAction: "Delete",
			/** The span row's head. */
			spanWord: "Span",
			/** The span start field's label. */
			callStartLabel: (index) => `Call ${index} start frame`,
			/** The span end field's label. */
			callEndLabel: (index) => `Call ${index} end frame`,
			/** The span row's ripple note. */
			spanNote: "the frame where this call ends — the next call starts there",
			/** The reference bundle's head. */
			refsHead: "Reference bundle (this call)",
			/** The image lane's add-row verb. */
			addRefImage: "+ image",
			/** The add-row faces, one per lane (symmetric law, 2026-11-05). */
			addRefVideo: "+ video",
			addRefAudio: "+ audio",
			/** The knob fold's head. */
			knobsHead: "Call knobs",
			/** A knob row's accessible name. */
			callKnobAria: (index, knob) => `Call ${index} knob: ${knob}`,
			/** The data-URL chip's slot label. */
			uploadChipLabel: (slot) => `upload ${slot}`,
			/** The prompt lane's head. */
			promptHead: "the prompt this call sends to H3",
			/** The enhance button's accessible name. */
			enhanceCallPromptLabel: (index) => `Enhance call ${index} prompt`,
			/** The enhance button's in-flight face. */
			enhancingNow: "enhancing…",
			/** The enhance button's rest face. */
			enhanceStyleAction: "✨ H3 style",
			/** The undo-enhance button's accessible name. */
			undoEnhanceCallPromptLabel: (index) => `Undo enhance call ${index} prompt`,
			/** The undo-enhance button's visible verb. */
			undoAction: "↩ undo",
			/** The prompt textarea's accessible name. */
			callPromptAria: (index) => `Call ${index} prompt`,
			/** The rail's head in global mode. */
			/** The rail's hint (rows, prompts, guides, the compiler's cut law). */
			/** The focused mode's back action. */
			globalAction: "Global",
			/** The compact row's empty-prompt face. */
			/** A duration in whole seconds with its unit (call rows, keyframe times). */
			secondsLabel: (value) => `${value}s`,
			/** The keyframes panel's head (operator 2026-11-05: keyframes ARE
			*  the surface — never "legacy", never an escape hatch). */
			keyframesTitle: "Keyframes",
			/** The keyframes panel's hint: the pin contract, terse. */
			keyframesHint: "image pins — endpoint pins anchor the window's first/last frame",
			/** A keyframe row's frame field label. */
			keyframeFrameLabel: (index) => `Keyframe ${index} frame`,
			/** A keyframe row's source square label. */
			kfSourceLabel: (index) => `kf ${index}`,
			/** A keyframe row's source square accessible name. */
			keyframeAria: (index) => `Keyframe ${index}`,
			/** A keyframe row's Delete button accessible name. */
			deleteKeyframeAria: (index) => `Delete keyframe ${index}`,
			/** A keyframe row's Delete tooltip (the pin channel has one kind). */
			deleteKeyframeTip: "Delete this keyframe",
			/** A guide square's label. */
			guideSlotLabel: (kind) => `${kind} guide`,
			/** The strip clip's chrome head: index · seconds — prompt text (F-B1;
			*  consumed at docCalls.ts clip-header; the spanReadout class). */
			clipHeader: (index, seconds, text) => `C${index + 1} · ${seconds}s — ${text}`,
			/** The bus-count tail's over-cap arm (F-B2; consumed CallCard ×2). */
			overCapTail: "over cap",
			/** The bus-count tail's over-bus arm (F-B2; consumed CallCard). */
			overBusTail: "over bus",
			/** The image guide lane's gutter name (F-B3; VIDEO_TIMELINE_TRACKS). */
			imageGuideLane: "Keyframes",
			/** A keyframe-lane chip's accessible name (F-B6; slice 3's lane UI). */
			keyframeLaneChipAria: (frame) => `Image pin at frame ${frame}`,
			/** A keyframe-lane chip's visible frame readout (F-B6; slice 3). */
			keyframeFrameReadout: (frame) => `${String(frame)}`,
			/** The drop hint when a pin will snap to a window boundary (F-B6). */
			dropSnapHint: "snap to window edge",
			/** The drop hint when a pin stays interior to its window (F-B6). */
			dropInteriorHint: "interior guide",
			/** The strip refusal when a pin lands outside every window (F-B6;
			*  the plan door's own refusal, surfaced). */
			gapRefusal: "that frame is outside every call window — pins ride inside a window",
			/** The keyframe lanes' hint when no pins exist (F11; strip prop). */
			keyframeLaneHint: "double-click a lane to pin an image at that frame",
			/** The strip's empty-calls hint (F11; strip prop, was a raw literal). */
			stripEmptyPromptsHint: "No calls — double-click the timeline to add one",
			/** The preview pane's empty face hint (F11; StudioPreview). */
			previewEmptyHint: "render a run to see the film",
			/** The preview pane's frames meta (F11; StudioPreview). */
			previewFramesMeta: (frames, fps) => `${String(frames)} frames · ${String(fps)} fps`,
			/** The preview pane's cut meta (F11; StudioPreview). */
			previewCutMeta: (index, count) => `cut ${String(index + 1)} / ${String(count)}`,
			/** A guide square's accessible name. */
			callGuideSlotLabel: (callIndex, kind) => `Call ${callIndex} ${kind} guide`,
			/** The seam row's head. */
			seamWord: "seam",
			/** The seam picker's field label. */
			seamModeLabel: (callIndex) => `Call ${callIndex} seam mode`,
			/** The recipe group's head. */
			/** The clips row's head. */
			clipsTitle: "Clips",
			/** The clips count face (clips present). */
			clipsCountNote: (count) => `${count} clip${count === 1 ? "" : "s"} on the audio lanes — drag to move, × to remove`,
			/** The clips count face (no clips yet). */
			clipsEmptyHint: "none — add from a lane's ⤴ in the timeline, or drop a file on any lane",
			/** The door-guard hint (clips pin their windows). */
			clipsGuardHint: "pinned windows own their audio: music clip ⇒ no bed there · dialogue/sfx clip ⇒ ref audios mute there — no accidental overlap",
			/** The lane inspector's head. */
			lanesInspectorTitle: "Lanes — words & events",
			/** The dialogue lane's option face. */
			laneDialogue: "Dialogue",
			/** The music lane's option face. */
			laneMusic: "Music",
			/** The sfx lane's option face. */
			laneSfx: "SFX",
			/** The lane picker's accessible name: the clip's own name leads. */
			laneSelectLabel: (name) => `${name} lane`,
			/** The dialogue lane's text placeholder. */
			dialoguePlaceholder: "the exact spoken words (verbatim, unabridged — they move the mouth)",
			/** The sfx lane's text placeholder. */
			sfxPlaceholder: "the event the soundscape times (e.g. a sudden explosion rocks the room)",
			/** The music lane's text placeholder. */
			musicPlaceholder: "music description (rides non_diegetic_music)",
			/** The run-history row's head. */
			runsTitle: (count) => `Runs (${count})`,
			/** A run-history chip's visible face (short id + duration). */
			historyChipLabel: (shortId, duration) => `${shortId} · ${duration}s`,
			/** The final-cut bar's head. */
			finalCutTitle: "Final cut",
			/** The final-cut bar's time readout. */
			cutTimeLabel: (sec, frame, total) => `${sec}s · frame ${frame}/${total}`,
			/** The final-cut bar's open action. */
			openAction: "open",
			/** A window tile's fallback name word. */
			windowTileWord: "window",
			/** The strip's meta line (calls, frames, clock, seconds). */
			stripMeta: (args) => `${args.calls} call${args.calls === 1 ? "" : "s"} · ${args.frames} fr · ${args.fps} fps · ${args.seconds}s`,
			/** The strip's hint (one card = one call, edges, extend, knobs dot). */
			stripHint: "one card = one model call · drag an edge = move the cut · double-click = edit · pull the tail = extend · cyan dot = knobs override · click a call = edit it in the left panel",
			/** The lane blocker (reference audio locks the D-M-E lanes). */
			laneBlockedMessage: "reference audio is wired on a call — the dialogue / music / SFX lanes are LOCKED (the clips and the audio inputs are mutually exclusive; clear the call's Ref audios to place clips)",
			/** The bar's calls lane label. */
			callsLabel: "Calls",
			/** The document readout (calls, seconds, guides, knobbed calls). */
			docReadout: (args) => `${args.calls} call${args.calls === 1 ? "" : "s"} · ${args.seconds}s · ${args.guides} guide${args.guides === 1 ? "" : "s"}${args.knobs > 0 ? ` · ${args.knobs} call${args.knobs === 1 ? "" : "s"} with knobs` : ""}`,
			/** The unwired-keyframes warning. */
			unwiredWarning: (count) => `${count} keyframe source${count === 1 ? "" : "s"} unwired — wire them below or the run door names them as TODOs.`,
			/** The run fold's head. */
			runParametersTitle: "Run parameters",
			/** The run fold's layer note. */
			runLayerNote: "Layer A — global · calls inherit",
			/** The Steps knob's face. */
			knobSteps: "Steps",
			/** The Denoise knob's face. */
			knobDenoise: "Denoise",
			/** The Sampler knob's face. */
			knobSampler: "Sampler",
			/** The Scheduler knob's face. */
			knobScheduler: "Scheduler",
			/** The Video shift knob's face. */
			knobShiftVideo: "Video shift",
			/** The Audio shift knob's face. */
			knobShiftAudio: "Audio shift",
			/** The SLA sparsity knob's face. */
			knobSlaSparsity: "SLA sparsity",
			/** The SLA block size knob's face. */
			knobSlaBlockSize: "SLA block size",
			/** The SLA min seq len knob's face. */
			knobSlaMinSeqLen: "SLA min seq len",
			/** The SLA dense last steps knob's face. */
			knobSlaDenseLastSteps: "SLA dense last steps",
			/** The SLA protect audio knob's face. */
			knobSlaProtectAudio: "SLA protect audio",
			/** The SLA stabilize motion knob's face. */
			knobSlaStabilizeMotion: "SLA stabilize motion",
			/** The SLA ref protection knob's face. */
			knobSlaRefProtection: "SLA ref protection",
			/** The SLA dense backend knob's face. */
			knobSlaDenseBackend: "SLA dense backend",
			/** The SLA dense steps knob's face. */
			knobSlaDenseSteps: "SLA dense steps",
			/** The SLA full-prec accum knob's face. */
			knobSlaFullPrecAccum: "SLA full-prec accum",
			/** The Sharpen knob's face. */
			knobSharpen: "Sharpen",
			/** The Sharpen method knob's face. */
			knobSharpenMethod: "Sharpen method",
			/** The Sharpen strength knob's face. */
			knobSharpenStrength: "Sharpen strength",
			/** The Sharpen radius knob's face. */
			knobSharpenRadius: "Sharpen radius",
			/** The Sharpen noise gate knob's face. */
			knobSharpenNoiseGate: "Sharpen noise gate",
			/** The Sharpen iterations knob's face. */
			knobSharpenIterations: "Sharpen iterations",
			/** The Interpolate knob's face. */
			knobInterpolate: "Interpolate",
			/** The Interp model knob's face. */
			knobInterpModel: "Interp model",
			/** The Interp multiplier knob's face. */
			knobInterpMultiplier: "Interp multiplier",
			/** The Window length knob's face. */
			knobWindowLength: "Window length (frames)"
		};
		//#endregion
		//#region src/ui/studio/StudioPreview.tsx
		/** THE SEAT-HELD LAW LINE (the dictionary's own bound, audit-blessed):
		*  the run-history chip's hover narrates its run (id, status, wall
		*  time) with live values — one of a kind, so the wording lives here,
		*  never in the dictionary. Rides a call (opaque to the copy census,
		*  as any locale lookup is). No `: string` return annotation on
		*  purpose: the census descends explicit string returns in .tsx; the
		*  concatenation infers string. */
		function historyTitleLine(h) {
			return h.runId + " · " + (h.status ?? "?") + " · " + (h.durationSec ?? "?") + "s" + (h.at ? " · " + (/* @__PURE__ */ new Date(h.at * 1e3)).toLocaleString() : "");
		}
		/** Preview pane: final cut + window tiles + run history (lines 3928–4061).
		* Chrome rides the shared kit (2026-09-07): preview PaneHeader +
		* EmptyState (the aspirational TimelinePreview twin is deleted; this
		* pane is the one preview).
		*
		*  Behavior-neutral wiring (the ONLY edit in the whole split): the inline
		*  `onDuration={(sec) => setFilmDurSec(sec)}` is now the `onDuration` prop —
		*  the tenant passes the identical closure. The `running` prop is threaded
		*  explicitly (unlike the aspirational TimelinePreview sibling, which
		*  derives it from stage.status — that derivation can transiently disagree
		*  with the shell's live run flag, so this pane keeps the prop).
		*
		*  THE HISTORY READ HAS ONE OWNER (rail-law audit, 2026-10-31): the
		*  run-history chips ride projection.ts's stageHistoryRows — the
		*  same per-entry law, dedupe, and cap the contract harvest rides.
		*  A second harvest face lived here until 2026-10-31 (priority
		*  drift: direct-over-film; no error arm) — the wall
		*  (studio-harvest-one-truth.spec.tsx) refuses its return. */
		function StudioPreview({ stage, running, filmstrip, filmRef, filmMap, frameIdx, barTotal, fps, handleFilmTime, handlePlayingChange, onDuration }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-testid": "tl-filmstrip",
				"data-running": running ? "true" : void 0,
				className: studio_module_css_default.filmBox,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.PaneHeader, {
						variant: "preview",
						title: studioCopy.previewTitle,
						meta: studioCopy.previewFramesMeta(barTotal, fps)
					}),
					(() => {
						const hist = stageHistoryRows(stage);
						if (!hist?.length) return null;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							"data-testid": "tl-run-history",
							className: studio_module_css_default.histRow,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.SectionLabel, { children: studioCopy.runsTitle(hist.length) }), hist.slice(0, 8).map((h, i) => {
								const word = (h.status ?? "").toLowerCase();
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
									href: h.video,
									target: "_blank",
									rel: "noreferrer",
									title: historyTitleLine(h),
									className: studio_module_css_default.histChip,
									children: [
										RUN_STATUS_WORDS$1.has(word) && statusOf$1(word) === "done" ? "✓" : "×",
										" ",
										studioCopy.historyChipLabel((h.runId ?? "run").replace(/^run-/, "").slice(0, 8), h.durationSec ?? "?")
									]
								}, h.runId ?? i);
							})]
						});
					})(),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: studio_module_css_default.heroRow,
						children: [
							filmstrip.final && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								"data-testid": "tl-final-cut",
								className: studio_module_css_default.finalCut,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FilmPlayer, {
									ref: filmRef,
									src: filmstrip.final,
									className: studio_module_css_default.player,
									"data-testid": "tl-film-player",
									onTime: handleFilmTime,
									onPlayingChange: handlePlayingChange,
									onDuration
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: studio_module_css_default.cutBar,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Clapperboard, {
											className: studio_module_css_default.cutIcon,
											"aria-hidden": true
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.SectionLabel, { children: studioCopy.finalCutTitle }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: studio_module_css_default.cutTime,
											children: studioCopy.cutTimeLabel((frameIdx / (filmMap?.fps ?? (fps || 24))).toFixed(2), frameIdx, barTotal)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
											href: filmstrip.final,
											target: "_blank",
											rel: "noreferrer",
											className: studio_module_css_default.cutOpen,
											children: studioCopy.openAction
										})
									]
								})]
							}),
							!filmstrip.final && filmstrip.windows.map((w) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								"data-testid": "tl-window-tile",
								"data-window": w.name,
								title: w.name,
								className: studio_module_css_default.winTile,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("video", {
									src: w.url,
									muted: true,
									playsInline: true,
									preload: "metadata",
									controls: true,
									className: studio_module_css_default.winVid
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: studio_module_css_default.winName,
									title: w.name,
									children: /_w(\d+)_/.exec(w.name)?.[1] != null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
										studioCopy.windowTileWord,
										" ",
										/_w(\d+)_/.exec(w.name)[1]
									] }) : w.name
								})]
							}, w.name)),
							!filmstrip.windows.length && !filmstrip.final && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.EmptyState, {
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Clapperboard, {
									className: studio_module_css_default.emptyGlyph,
									"aria-hidden": true
								}),
								title: studioCopy.previewEmpty,
								hint: studioCopy.previewEmptyHint
							})
						]
					})
				]
			}) });
		}
		//#endregion
		//#region src/ui/studio/refUtils.ts
		const REF_UPLOAD_SPEC = {
			image: {
				accept: "image/*",
				maxMb: 20,
				note: "≤20 MB"
			},
			video: {
				accept: "video/*",
				maxMb: 24,
				note: "≤24 MB"
			},
			audio: {
				accept: "audio/*",
				maxMb: 16,
				note: "≤16 MB"
			}
		};
		/** THE FOREIGN-URL REFUSAL (the upload audit's M1, 2026-10-26; ONE
		*  literal since the rail-law audit's H2, 2026-10-31 — it lived as
		*  three seat-local spellings): a picked URL that is not this run's
		*  artifact committed VERBATIM and died later at the run's refs
		*  resolution. Every seat — anchor, buckets, strip lanes — refuses
		*  the identical gesture with the identical words. */
		const FOREIGN_URL_REFUSAL = "that URL is not in this run's artifacts — pick a run artifact or upload a file";
		/** THE UPLOAD COMMIT CHECK (one law since the rail-law audit's square
		*  gap follow-through, 2026-10-31 — the genre gate + cap + read error
		*  lived as seat-local spellings at the anchor and the buckets): the
		*  same gate, the same words, at every source seat.
		* @param file the OS-picked or dropped file.
		* @param kind the lane's genre (the accept family).
		* @returns the visible refusal when the file fails the gate, else null. */
		function refUploadError(file, kind) {
			if (!file.type.startsWith(`${kind}/`)) return `wrong file type (${file.type || "unknown type"}) — expected ${kind}/*`;
			if (file.size > REF_UPLOAD_SPEC[kind].maxMb * 1024 * 1024) return `file too large (max ${REF_UPLOAD_SPEC[kind].maxMb} MB)`;
			return null;
		}
		/** THE DISPLAY TRANSLATION, ONE SPELLING (2026-11-04, the stale-✕
		*  cure): a committed source is a ctx-key NAME (the wire law — the
		*  estate re-resolves names each run) or a data: URL; the square
		*  displays the SERVABLE url. This is the display half only — the
		*  param keeps its name verbatim (the currency law). It lived as
		*  three seat-local `startsWith("data:") ? v : map.get(v) ?? v`
		*  closures (anchor, guides, keyframes, buckets); one spelling now,
		*  because a map miss must degrade to the HELD face (the raw name,
		*  detach armed) at every seat alike — a divergence here is exactly
		*  the seat that painted PLUS over a full slot.
		* @param v the committed source (a ctx-key name or a data: URL).
		* @param nameToUrl the artifact index's NAME → servable url map.
		* @returns the data: URL verbatim, the mapped url, else the raw
		*  value (held — the square's held face carries it). */
		function displaySource(v, nameToUrl) {
			if (v.startsWith("data:")) return v;
			return nameToUrl.get(v) ?? v;
		}
		/** Short display name for a declared URL (last path segment) — the
		* full URL rides the title. */
		function declaredShortName(url) {
			const path = url.split("?")[0];
			const tail = path.slice(path.lastIndexOf("/") + 1);
			return tail === "" ? url : tail;
		}
		studioCopy.knobSteps, studioCopy.knobDenoise, studioCopy.knobSampler, studioCopy.knobScheduler, studioCopy.knobShiftVideo, studioCopy.knobShiftAudio, studioCopy.knobSlaSparsity, studioCopy.knobSlaBlockSize, studioCopy.knobSlaMinSeqLen, studioCopy.knobSlaDenseLastSteps, studioCopy.knobSlaProtectAudio, studioCopy.knobSlaStabilizeMotion, studioCopy.knobSlaRefProtection, studioCopy.knobSlaDenseBackend, studioCopy.knobSlaDenseSteps, studioCopy.knobSlaFullPrecAccum, studioCopy.knobSharpen, studioCopy.knobSharpenMethod, studioCopy.knobSharpenStrength, studioCopy.knobSharpenRadius, studioCopy.knobSharpenNoiseGate, studioCopy.knobSharpenIterations, studioCopy.knobInterpolate, studioCopy.knobInterpModel, studioCopy.knobInterpMultiplier, studioCopy.knobWindowLength;
		/**
		* Convert a legacy audio_stem artifact name into a positioned clip at
		* frame 0. The caller owns the async duration probe (Audio metadata)
		* for precise dur_frames — this gives a visible 4-second fallback that
		* corrects on probe completion. Exported so tests can exercise the pure
		* conversion logic without mounting the full component.
		*/
		function stemToClip(stemSrc, fps, id) {
			const name = stemSrc.includes("/") ? stemSrc.split("/").pop() : stemSrc;
			return {
				id: id ?? `aclip-stem-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
				name,
				src: stemSrc,
				start_frame: 0,
				dur_frames: Math.round(4 * (typeof fps === "number" && fps > 0 ? fps : DEFAULT_SEGMENT_PARAMS$1.fps)),
				gain: 1
			};
		}
		/** The retired Layer A spellings → the card's wire names (hydration
		* migrates; serialization writes only the wire names). The lora knob
		* pair maps through the mod bag: a legacy lora_name resolves to a
		* catalog id when the filename matches, else drops with a warning
		* (it was decorative anyway — compose never read it). */
		const LEGACY_LAYERA_KEY = {
			...LEGACY_KNOB_KEY,
			rtx_vsr_enabled: "sr_switch",
			h3_ref_image_size: "ref_image_size"
		};
		/** H3 prompt style (Layer B ✨): rewrite ONE model call's prompt into
		* the cinematic MiniMax-H3 dialect. One call = ONE continuous shot
		* (cuts are CALL boundaries — never describe a cut inside a call);
		* concrete camera + subject + action + environment language, present
		* tense, duration-aware, no meta ("prompt", "video of") noise. */
		const H3_ENHANCE_SYSTEM = [
			"You rewrite video-generation prompts for the MiniMax H3 model.",
			"One prompt describes ONE continuous camera shot — never describe cuts, transitions, or editing inside a prompt.",
			"Style rules: present tense; concrete cinematic camera language (dolly, crane, handheld, static tripod, orbit); named subject with visible physical detail; specific action beats that fit the shot's duration; environment, lighting and atmosphere; film-stock or lens texture where it helps.",
			"Keep the original subject, intent, and any proper nouns exactly. Do not invent new characters or change the story.",
			"Length: 2-4 flowing sentences, dense but not padded. No lists, no headings, no meta-commentary.",
			"Output STRICT JSON exactly: {\"positive\": \"<the rewritten prompt>\", \"negative\": \"\"} — nothing else outside the JSON."
		].join(" ");
		/** The beat's guide kinds — the planner's KEYFRAME_KINDS, in the lane /
		* panel order. Colors: image = blue, clip = amber, audio = violet. */
		const GUIDE_KINDS = [
			"image",
			"clip",
			"audio"
		];
		/** The fresh-card document: ONE window 0→90 — the t4_open draft
		* budget . The canvas IS the film: the readout shows
		* 3.8 s and 3.8 s renders. A user authoring a longer window gets it
		* ungated (the operator's order 2026-09-17) — the span-vs-engine
		* receipts live in the ledger, not in any gate. Used only when
		* params carry no valid calls (never authored, or legacy malformed). */
		const STARTER_CALLS = [{
			text: "A single shot — describe the action, camera, and mood.",
			start_frame: 0,
			end_frame: 90
		}];
		/** The three guide lanes — the keyframe kinds of the planner
		* (video_plan.KEYFRAME_KINDS), in lane order. Colors sit apart from the
		* prompt cycle and from each other: image = blue, clip = amber, audio =
		* violet. */
		const VIDEO_TIMELINE_TRACKS = [{
			uuid: "image",
			name: studioCopy.imageGuideLane,
			track_type: "keyframe",
			color: [
				86,
				140,
				245
			],
			height_scale: .6
		}];
		//#endregion
		//#region src/ui/studio/docGrid.ts
		/**
		* docGrid.ts — THE AUTHORING GRID (studio side, 2026-09-25).
		*
		* WHY THIS FILE EXISTS: the card's admission gate became UNIFORM
		* (`assertSpanGrid` — every window shape refuses an off-grid authored
		* span instead of silently re-framing it). A refusal-only card would
		* break the authoring surface: the bar drag, the span number inputs
		* and the call splitter all move frames by hand, and every one of them
		* used to hand the engine whatever the operator's pixel resolved to.
		* So the authoring boundary snaps, VISIBLY, to the same law the card
		* refuses against — the number inputs and the bar show the snapped
		* frames, and the card never has to repair a doc this surface built.
		*
		* THE LAW (one owner, imported from the card's own contract — no
		* duplicated constants):
		*   - a window generates 22+17k frames in [22,362];
		*   - a CARRIED window (i>0, non-cut) generates span+22, so its
		*     authored span must be 17k;
		*   - a FIRST or CUT window generates its span verbatim, so its
		*     authored span must be 22+17k;
		*   - calls TILE: every call starts where the previous one ended.
		*
		* The seam toggle re-frames by exactly 22 frames (a carried span
		* loses 22, a cut span gains 22) because both shapes cannot be legal
		* for one span — arithmetic, not policy. The operator sees the new end
		* frame in the input; nothing is repaired behind their back.
		*/
		/** The span editors' string→number parse: SpecAtom hands the RAW
		*  edit string (card-base atoms pass strings only, the no-coercion
		*  proof); an empty or non-finite edit is no edit. */
		function parseSpecNumber(v) {
			const t = v.trim();
			if (t === "") return void 0;
			const n = Number(t);
			return Number.isFinite(n) ? n : void 0;
		}
		/** The span seat's ONE narrowing of the atom grammar's unknown edit
		*  value into a frame write (both span inputs shared this guard
		*  inline before — the parallel-values extraction law). Non-string
		*  values and non-numeric strings are no write, never a NaN frame.
		* @param v the atom's edit value, unknown at the grammar seam.
		* @returns the rounded frame, or undefined when the edit writes nothing. */
		function parseFrameEdit(v) {
			if (typeof v !== "string") return void 0;
			const n = parseSpecNumber(v);
			return n === void 0 ? void 0 : Math.round(n);
		}
		/** Is this window's seam a carried join? Index-aware, exactly the
		*  card's own `chainLike` law (filmMix's stanzaSecs reads the same). */
		function isCarriedShape(index, call) {
			return index > 0 && transitionOverlap(call.transition) > 0;
		}
		/** Is this authored LENGTH legal for the window's shape? */
		function isLegalCallLength(length, carried) {
			if (carried) return Number.isInteger(length) && length >= 17 && length + 22 <= 362 && length % 17 === 0;
			return isGridLength(length);
		}
		/** Nearest legal authored length for the window's shape. */
		function snapCallLength(length, carried) {
			if (carried) {
				const k = Math.max(1, Math.round(length / 17));
				return Math.min(340, 17 * k);
			}
			return gridSnap(Math.max(22, length));
		}
		/** The grid's step, re-exported so the authoring setters never grow a
		*  second copy of the number. Both length families advance by 17. */
		const GRID_STEP = 17;
		/** The grid's base — the shortest first/cut window. */
		const GRID_BASE = 22;
		/** The shortest legal authored length for this window's shape. */
		function shortestCallLength(index, call) {
			return isCarriedShape(index, call) ? 17 : 22;
		}
		/** The exclusive end this call would carry at the requested end: the
		*  length snaps, the start is the operator's. */
		function snapCallEnd(call, index, end) {
			return call.start_frame + snapCallLength(end - call.start_frame, isCarriedShape(index, call));
		}
		/** The splice frame for a split where BOTH halves must be legal — the
		*  gesture's frame when it already qualifies, else the nearest one that
		*  does. Never returns a frame that leaves an off-grid half. */
		function snapSplitFrame(start, end, leftCarried, rightCarried, gesture) {
			let best = gesture;
			let bestDistance = Number.POSITIVE_INFINITY;
			for (let frame = start + 1; frame < end; frame++) {
				if (!isLegalCallLength(frame - start, leftCarried)) continue;
				if (!isLegalCallLength(end - frame, rightCarried)) continue;
				const distance = Math.abs(frame - gesture);
				if (distance < bestDistance) {
					bestDistance = distance;
					best = frame;
				}
			}
			return best;
		}
		/** The seam toggle's re-frame: the 22-frame carry moves from the
		*  generation head to (or from) the authored span. A first window has
		*  no carry either way, so its toggle never moves frames. */
		function reflowSeamSpan(call, index, next) {
			const wasCarried = isCarriedShape(index, call);
			const willCarried = isCarriedShape(index, { transition: next });
			if (wasCarried === willCarried) return call.end_frame;
			const length = call.end_frame - call.start_frame;
			return call.start_frame + (willCarried ? length - 22 : length + 22);
		}
		/** The window that would cover a pin at `frame` — the plan gate's own
		*  predicate (f ∈ [start_frame, end_frame), the first matching call).
		*
		* @param calls the document's calls (the windows).
		* @param frame the FILM-absolute pin frame.
		* @returns the covering call, or null when the frame falls outside
		*   every window (the plan door's gap — the strip surfaces the
		*   refusal; the write still lands). */
		function pinWindowOf(calls, frame) {
			return calls.find((c) => frame >= c.start_frame && frame <= c.end_frame - 1) ?? null;
		}
		/** The keyframe chip's drop verdict, over the shared grid law:
		*  "snap" when the pin sits within one GRID_STEP_FRAMES of its
		*  window's boundary (the anchor/end-anchor seats), "interior" when
		*  it stays mid-window, null when no window covers it (the gap — the
		*  refusal face's seat, never a hint).
		*
		* @param calls the document's calls (the windows).
		* @param frame the FILM-absolute pin frame.
		* @returns the verdict for the chip's hint face. */
		function pinDropVerdict(calls, frame) {
			const w = pinWindowOf(calls, frame);
			if (w === null) return null;
			const toStart = Math.abs(frame - w.start_frame);
			const toEnd = Math.abs(frame - (w.end_frame - 1));
			return Math.min(toStart, toEnd) <= 17 ? "snap" : "interior";
		}
		//#endregion
		//#region src/ui/studio/StudioStripPane.tsx
		/**
		* h3-timeline studio split (2026-09-06) — PURE MOVE from
		* ui/studio/component.tsx. No behavior change: headers/footers are new,
		* every logic line is verbatim from the monolith (source range noted).
		*/
		/** Pinned strip: the bar IS the document (monolith lines 4078–4162).
		*
		*  The chrome rides the shared kit (2026-09-07): PaneShell + the
		*  strip PaneHeader — the same box/header the motion bar carries
		*  (the aspirational TimelineFooter twin is deleted; this pane is
		*  the one strip). */
		const AUDIO_ROW_RE = /\.(mp3|wav|flac|ogg|m4a|aac|aif|aiff|opus|webm)(\?|$)/i;
		const LANE_OF = {
			"audio:dialogue": "dialogue",
			"audio:sfx": "sfx",
			"audio:music": "music"
		};
		/** THE DEP LAW (2026-09-22, the From-media freeze): the provider's
		*  modal effect keys on the loadMedia FUNCTION'S IDENTITY — an
		*  inline arrow in the component is a fresh identity every render,
		*  and the effect re-fires per render into an infinite load loop
		*  that freezes the card (the base's own comment: the 4GB OOM). The
		*  audio filter wrapper lives at MODULE SCOPE — one identity,
		*  forever; the effect fires once per modal opening. */
		const loadAudioMedia = async (_kind, signal) => {
			return (await (0, _melite_card_base_client.fetchMediaLibrary)("all", signal)).filter((r) => AUDIO_ROW_RE.test(r.url) || AUDIO_ROW_RE.test(r.name));
		};
		function StudioStripPane({ calls, totalFrames, fps, seconds, barPrompts, barLanes, barAudioClips, barTotal, frameIdx, callPreviews, selectedBarId, filmMap, handleBarFrame, handleScrubStart, handleScrubEnd, handleKeyframeAdd, handleKeyframeMove, handleKeyframeDelete, handlePromptUpdate, handlePromptMove, handlePromptResize, handlePromptDelete, handleExtend, addCallAt, handleTimelineSelect, layerA, refAudiosBlocked, addAudioClip, takeAudioFile, moveAudioClip, deleteAudioClip, updateAudioClip, setLayerAKey, artifactIndex, docFromFilm, keyframes }) {
			const pickLane = (0, react.useRef)("music");
			const [laneErr, setLaneErr] = (0, react.useState)(null);
			const laneField = (lane) => ({
				name: `audio:${lane}`,
				label: lane,
				type: "file"
			});
			const { square, wireMenu } = (0, _melite_card_base_client.useSquareProvider)((name, v) => {
				if (typeof v !== "string" || v === "") return;
				if (refAudiosBlocked) {
					setLaneErr(studioCopy.laneBlockedMessage);
					return;
				}
				if (/^https?:\/\//.test(v) && !artifactIndex.byUrl.has(v)) {
					setLaneErr(FOREIGN_URL_REFUSAL);
					return;
				}
				setLaneErr(null);
				addAudioClip(artifactIndex.byUrl.get(v) ?? v, v, 0, LANE_OF[name]);
			}, {
				candidates: Array.from(artifactIndex.byUrl.entries()).filter(([url]) => AUDIO_ROW_RE.test(url)).map(([url, name2]) => ({
					id: url,
					label: name2,
					url
				})),
				loadMedia: loadAudioMedia,
				accept: "audio/*",
				onFile: (file) => {
					setLaneErr(null);
					if (refAudiosBlocked) {
						setLaneErr(studioCopy.laneBlockedMessage);
						return;
					}
					takeAudioFile(file, 0, pickLane.current, setLaneErr);
				}
			});
			const openLanePicker = (lane) => (anchor) => {
				pickLane.current = lane;
				square(laneField(lane))?.verbs.onPick?.(anchor);
			};
			const kfChips = barLanes.map((k, i) => {
				const docFrame = keyframes[i]?.frame;
				const verdict = typeof docFrame === "number" ? pinDropVerdict(calls, docFrame) : null;
				return {
					...k,
					ariaLabel: typeof docFrame === "number" ? studioCopy.keyframeLaneChipAria(docFrame) : void 0,
					readout: typeof docFrame === "number" ? studioCopy.keyframeFrameReadout(docFrame) : void 0,
					dropHint: verdict === null ? void 0 : verdict === "snap" ? studioCopy.dropSnapHint : studioCopy.dropInteriorHint
				};
			});
			const gapPin = keyframes.some((k) => pinDropVerdict(calls, k.frame) === null);
			const refusalFace = laneErr ?? (gapPin ? studioCopy.gapRefusal : null);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_melite_card_base_client.PaneShell, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.PaneHeader, {
				title: studioCopy.timelineTitle,
				meta: studioCopy.stripMeta({
					calls: calls.length,
					frames: totalFrames,
					fps,
					seconds
				}),
				hint: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: studioCopy.stripHint })
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: studio_module_css_default.blockerWrap,
				children: [
					refusalFace !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						"data-testid": "tl-strip-file-error",
						className: studio_module_css_default.fileErr,
						role: "alert",
						children: refusalFace
					}),
					refAudiosBlocked && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						"data-testid": "tl-lane-blocker",
						className: studio_module_css_default.laneBlocker,
						children: studioCopy.laneBlockedMessage
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MotionTimelineBar, {
						prompts: barPrompts,
						keyframes: kfChips,
						frameIdx,
						totalFrames: barTotal,
						fps: filmMap?.fps ?? fps,
						initialSeconds: 10,
						onFrameChange: handleBarFrame,
						onScrubStart: handleScrubStart,
						onScrubEnd: handleScrubEnd,
						onKeyframeAdd: (trackId, frame) => handleKeyframeAdd(trackId, docFromFilm(frame)),
						onKeyframeMove: (id, frame) => handleKeyframeMove(id, docFromFilm(frame)),
						onKeyframeDelete: handleKeyframeDelete,
						onPromptUpdate: handlePromptUpdate,
						onPromptMove: (id, s, e) => handlePromptMove(id, docFromFilm(s), docFromFilm(e)),
						onPromptResize: (id, s, e) => handlePromptResize(id, docFromFilm(s), docFromFilm(e)),
						onPromptDelete: handlePromptDelete,
						onExtend: (newTotal) => handleExtend(newTotal - barTotal + totalFrames),
						tracks: VIDEO_TIMELINE_TRACKS,
						packed: true,
						promptsLabel: studioCopy.callsLabel,
						laneHint: studioCopy.keyframeLaneHint,
						emptyPromptsHint: studioCopy.stripEmptyPromptsHint,
						promptsHeight: 64,
						onPromptAdd: (frame) => addCallAt(docFromFilm(frame)),
						previews: callPreviews,
						selectedId: selectedBarId,
						onSelect: handleTimelineSelect,
						audioClipCards: true,
						audioLayers: [
							{
								id: "dialogue",
								label: studioCopy.laneDialogue,
								icon: "mic",
								accent: "#22d3ee",
								onUpload: refAudiosBlocked ? void 0 : openLanePicker("dialogue"),
								clips: barAudioClips.filter((c) => (c.class ?? (c.text ? "dialogue" : "music")) === "dialogue")
							},
							{
								id: "music",
								label: studioCopy.laneMusic,
								icon: "music",
								accent: "#a78bfa",
								stem: layerA.audio_stem ?? null,
								onUpload: refAudiosBlocked ? void 0 : openLanePicker("music"),
								clips: barAudioClips.filter((c) => (c.class ?? (c.text ? "dialogue" : "music")) === "music")
							},
							{
								id: "sfx",
								label: studioCopy.laneSfx,
								icon: "zap",
								accent: "#fb923c",
								onUpload: refAudiosBlocked ? void 0 : openLanePicker("sfx"),
								clips: barAudioClips.filter((c) => (c.class ?? (c.text ? "dialogue" : "music")) === "sfx")
							}
						],
						onAudioDropAt: (id, url, frame) => {
							setLaneErr(null);
							if (refAudiosBlocked) {
								setLaneErr(studioCopy.laneBlockedMessage);
								return;
							}
							const name = artifactIndex.byUrl.get(url);
							if (!name) {
								setLaneErr(FOREIGN_URL_REFUSAL);
								return;
							}
							addAudioClip(name, name, docFromFilm(frame), id);
						},
						onAudioFileDrop: (id, file, frame) => {
							setLaneErr(null);
							if (refAudiosBlocked) {
								setLaneErr(studioCopy.laneBlockedMessage);
								return;
							}
							takeAudioFile(file, docFromFilm(frame), id, setLaneErr);
						},
						onAudioClipMove: (_id, clipId, frame) => {
							moveAudioClip(clipId, docFromFilm(frame));
						},
						onAudioClipDelete: (_id, clipId) => {
							deleteAudioClip(clipId);
						},
						onAudioDetach: (layerId) => {
							const laneCls = layerId === "music" ? "music" : layerId === "sfx" ? "sfx" : "dialogue";
							const kept = (layerA.audio_clips ?? []).filter((c) => (c.class ?? (c.text ? "dialogue" : "music")) !== laneCls);
							setLayerAKey("audio_clips", kept.length ? kept : void 0);
							if (layerId === "music") setLayerAKey("audio_stem", void 0);
						}
					}),
					wireMenu
				]
			})] });
		}
		//#endregion
		//#region src/ui/studio/pickVerdict.ts
		/**
		* pickVerdict — the recipe/axis pick's truth-in-hand law (the
		* collapse: the touched ledger is dead with the mirror).
		*
		* THE MECHANISM IT REPLACED (Cure 3's touched-keys law): the old
		* mirror was a whole-channel snapshot, so keys the operator never
		* touched could sit stale beside the persisted row — the verdict
		* spread the whole mirror over truth and a stale key both refused
		* legal picks and rode the next persist back over truth. The cure
		* filtered the mirror through the touched set.
		*
		* THE COLLAPSE: there is no mirror. The user layer IS the shown
		* document (durable projection + live ops — stated-or-settled by
		* construction), so it composes over the held row WHOLE: no stale
		* value can refuse a legal pick (nothing unstated reaches the
		* gate), and the commit writes the shown value it already has (no
		* rebase — nothing to rebase). Spread semantics are the
		* candidate's own (an undefined still overwrites — the unset
		* signal, unchanged).
		*/
		/** The pick verdict's document: held (persisted truth) under user
		*  (the shown layerA, serialized — sparse: unstated keys absent)
		*  under frame (the pick's stamps — null deletes, the candidate
		*  law). */
		function resolvePickVerdictDoc(held, user, frame) {
			return (0, _melite_card_base_client.composeCandidateDoc)(held, user, frame);
		}
		//#endregion
		//#region src/ui/studio/RunRecipeEngine.tsx
		/**
		* RunRecipeEngine — the Layer A rail.
		*
		* THE GENERIC SEAM LAW (operator, 2026-09-19: "h3 FORM SEAM = THE
		* GENERIC FORM SEAM — we added primitives to the default card UI
		* package to handle this"): the parameter surface IS CardForm —
		* the same component the bench drill seats. Groups, the sampling
		* 2-column grid (sampler + scheduler side by side, the kit's
		* columns/width facts), visible_when, the recipe pills on the
		* model axes, mod-owned exclusion — every layout law lands in
		* card-base ONCE and every card inherits it. The hand-rolled
		* SpecPanel sections and window SpecAtoms are DEAD (the anti-DRY
		* break: any law the generic seam learned, this surface silently
		* missed — the blank-steps and split-sampler crimes both lived
		* here).
		*
		* What stays STUDIO CHROME (never card params): the Model-route
		* pin (the sibling-family switch, a document concept) and the doc
		* FPS (a document-local clock fact, undeclared by design). THE
		* GEOMETRY READOUT IS DEAD (operator 2026-09-21: "WHY DO I STILL
		* SEE THIS READOUT SKIN? 1344×768 @ 24 doc-fps" — a read-only text
		* row outside the generic seam's grid grammar; the Width/Height
		* injects own geometry, one surface).
		*/
		/** Layer A rail: Recipe (clock) + Engine (H3 sampling) + geometry. */
		function RunRecipeEngine({ base, layerA, setLayerAKey, setLayerA, refArtifacts }) {
			const { spec, edit, resolved } = (0, _melite_card_base_client.useResolvedForm)("h3-timeline", layerA, setLayerAKey, base);
			const wire = {
				candidates: refArtifacts.map((a) => ({
					id: a.name,
					label: a.name,
					url: a.url
				})),
				loadMedia: _melite_card_base_client.fetchMediaLibrary
			};
			const [gateFace, setGateFace] = (0, react.useState)(null);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				gateFace !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					role: "alert",
					"data-gate-face": "1",
					className: studio_module_css_default.gateFace,
					children: gateFace
				}) : null,
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.SectionLabel, { children: studioCopy.generalTitle }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.ControlRow, {
					label: studioCopy.fps,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.SpecAtom, {
						f: {
							name: "fps",
							label: studioCopy.fps,
							type: "number",
							min: 1,
							max: 60,
							step: 1
						},
						value: resolved.fps ?? DEFAULT_SEGMENT_PARAMS$1.fps,
						onEdit: (_, v) => {
							if (typeof v !== "string") return;
							const n = parseSpecNumber(v);
							if (n !== void 0 && n > 0) setLayerAKey("fps", n);
						}
					})
				}),
				spec !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.CardForm, {
					spec,
					user: layerA,
					base,
					omitInputRail: true,
					onSet: edit,
					onUnset: (n) => setLayerAKey(n, void 0),
					onPick: (patch) => {
						const candidate = resolvePickVerdictDoc(base ?? {}, layerA, patch);
						const violations = (0, _melite_card_base_client.composeValidate)(spec, candidate);
						if (violations.length > 0) {
							setGateFace("THE COMPOSE GATE REFUSED — " + violations[0].message + " — the write never left the studio. Fix the stated value, or pick a different route.");
							return;
						}
						setGateFace(null);
						setLayerA((prev) => {
							const next = { ...prev };
							for (const [k, v] of Object.entries(patch)) if ((0, _melite_card_base_client.axisUnset)(k, v, spec)) next[k] = void 0;
							else next[k] = v;
							return next;
						});
					},
					wire
				}) : null
			] });
		}
		//#endregion
		//#region src/ui/studio/RunRefsClips.tsx
		/**
		* h3-timeline studio split (2026-09-06) — PURE MOVE from
		* ui/studio/component.tsx.
		*
		* THE LAYER A/B LAW REWORK (2026-09-17): the RUN-LEVEL identity
		* refs panel is GONE — refs are PER-CALL (a call's SourceRow group
		* in CallCard); nothing at run level ever staged them. What remains
		* is the legitimate Layer A NLE concept: the positioned AUDIO CLIPS
		* bed (the Music row). THE DIALOGUE HALF (2026-09-21): a clip that
		* spans a window CONDITIONS that window (the model hears it — the
		* lip-sync lane, one of the 3 audio lanes; a full bus refuses loud
		* at compose), mixes over the final cut at film time (the audible
		* authority), and ducks the generated voice under the real clip.
		* Music-only clips (no window overlap) overlay clean, no lane.
		*/
		/** Layer A rail: the audio-clips upload door (3189–3315, refs cut) +
		* THE LANE INSPECTOR (2026-09-22): every clip's lane and words/event
		* text — the authored half of the D-M-E law (the text is what tells
		* the model WHAT the audio is; the pin is the other half). */
		function RunRefsClips({ layerA, updateAudioClip, deleteAudioClip }) {
			const clipCount = layerA.audio_clips?.length ?? 0;
			const [openLane, setOpenLane] = (0, react.useState)(null);
			const laneRows = [
				{
					id: "dialogue",
					label: studioCopy.laneDialogue
				},
				{
					id: "music",
					label: studioCopy.laneMusic
				},
				{
					id: "sfx",
					label: studioCopy.laneSfx
				}
			];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: studio_module_css_default.clipsRow,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.SectionLabel, { children: studioCopy.clipsTitle }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: studio_module_css_default.clipsNote,
						children: clipCount > 0 ? studioCopy.clipsCountNote(clipCount) : studioCopy.clipsEmptyHint
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: studio_module_css_default.clipsHint,
						"data-testid": "tl-clips-lane-hint",
						children: studioCopy.clipsGuardHint
					})
				]
			}), (layerA.audio_clips?.length ?? 0) > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: studio_module_css_default.laneInspector,
				"data-testid": "tl-lane-inspector",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.SectionLabel, { children: studioCopy.lanesInspectorTitle }), layerA.audio_clips.map((c) => {
					const cls = c.class ?? (c.text ? "dialogue" : "music");
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: studio_module_css_default.laneRow,
						"data-testid": "tl-lane-row",
						"data-clip": c.name,
						"data-lane": cls,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: studio_module_css_default.laneName,
								title: c.src,
								children: c.name
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
								open: openLane === c.id,
								onClose: () => {
									setOpenLane(null);
								},
								compact: true,
								portal: true,
								items: laneRows,
								selectedId: cls,
								onSelect: (id) => {
									setOpenLane(null);
									updateAudioClip(c.id, { class: id });
								},
								anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									type: "button",
									size: "sm",
									variant: "outline",
									className: studio_module_css_default.laneSelect,
									"data-testid": "tl-lane-class",
									"aria-label": studioCopy.laneSelectLabel(c.name),
									onClick: () => {
										setOpenLane(openLane === c.id ? null : c.id);
									},
									children: laneRows.find((r) => r.id === cls)?.label ?? ""
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								className: studio_module_css_default.laneText,
								"data-testid": "tl-lane-text",
								type: "text",
								placeholder: cls === "dialogue" ? studioCopy.dialoguePlaceholder : cls === "sfx" ? studioCopy.sfxPlaceholder : studioCopy.musicPlaceholder,
								value: c.text ?? "",
								onChange: (e) => updateAudioClip(c.id, { text: e.target.value })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "ghost",
								className: studio_module_css_default.laneDelete,
								"data-testid": "tl-lane-delete",
								title: studioCopy.removeClip,
								onClick: () => deleteAudioClip(c.id),
								children: "×"
							})
						]
					}, c.id);
				})]
			})] });
		}
		//#endregion
		//#region src/ui/studio/CallFrameSubcard.tsx
		/** The call's seam law — carried vs cut (rule 3b). Renders under the
		*  image bus (the seam is the CALL'S join, not a bundle slot).
		*  (2026-09-20: the seam is AUTOMATIC — the drift-control continuation
		*  carries every non-cut join at the director's proven 22-frame
		*  overlap with the soft AV audio release; the seconds picker died
		*  with the MotionContext seam. The one authorable fact left is
		*  whether the join carries at all.) */
		function SeamControls({ callIndex, transition, onTransition }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: onTransition !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: studio_module_css_default.seamRow,
				title: studioCopy.seamHelp,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: studio_module_css_default.seamLabel,
					children: studioCopy.seamWord
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.SpecAtom, {
					f: {
						name: "seam_mode",
						label: studioCopy.seamModeLabel(callIndex),
						type: "select",
						options: [{
							value: "extend",
							label: studioCopy.seamCarried
						}, {
							value: "cut",
							label: studioCopy.seamCut
						}]
					},
					value: transition === "cut" ? "cut" : "extend",
					onEdit: (_, v) => onTransition?.(v === "extend" ? "extend" : "cut")
				})]
			}) });
		}
		//#endregion
		//#region src/ui/studio/CallCardPrompt.tsx
		/**
		* h3-timeline studio split (2026-09-06) — PURE MOVE from
		* ui/studio/component.tsx. (2026-09-15, the operator's cut: NO
		* prompt segments, NO prompt beats — text mode only, forever.)
		*
		* WHY-NOT SpecAtom (2026-10-27, UI-conformance audit job 3): the
		* textarea is bound to the DocCall DOCUMENT (c.text via
		* handlePromptUpdate), not a FormSpec field — SpecAtom's textarea
		* face needs a field spec + resolveValue/onSet, so seating it here
		* would mean a synthetic field + adapter for zero gain (LAW 2).
		* The enhance/undo/error chrome (useEnhance, tl-call-enhance
		* testids) is H3 behavior no atom owns. This file is inside h3's
		* sanctioned cards.stage.view takeover (client/index.ts:1-19, the
		* mount law: the card package's own studio on the bench slot —
		* content no renderer can declare rides beside the renderer, never
		* a fork) — a doc-model editor, not a spec row. Revisit only if the
		* prompt ever becomes a real spec field.
		*/
		/** One call's prompt editor: ONE textarea + ✨ H3 style. */
		function CallCardPrompt({ c, i, handlePromptUpdate, enhanceOne, undoEnhance, enhancing, enhanceErr, enhanceUndo }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: studio_module_css_default.beatsWrap,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: studio_module_css_default.textHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: studio_module_css_default.textLabel,
							children: studioCopy.promptHead
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: studio_module_css_default.enhanceRow,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								type: "button",
								title: studioCopy.enhanceAction,
								"aria-label": studioCopy.enhanceCallPromptLabel(i),
								"data-testid": "tl-call-enhance",
								disabled: !(c.text ?? "").trim() || enhancing["call-" + i] === true,
								onClick: () => void enhanceOne("call-" + i, c.text, (t) => handlePromptUpdate("call-" + i, t)),
								className: studio_module_css_default.enhanceBtn,
								children: enhancing["call-" + i] === true ? studioCopy.enhancingNow : studioCopy.enhanceStyleAction
							}), enhanceUndo["call-" + i] !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								type: "button",
								"aria-label": studioCopy.undoEnhanceCallPromptLabel(i),
								"data-testid": "tl-call-enhance-undo",
								onClick: () => undoEnhance("call-" + i, (t) => handlePromptUpdate("call-" + i, t)),
								className: studio_module_css_default.undoBtn,
								children: studioCopy.undoAction
							})]
						})]
					}),
					enhanceErr["call-" + i] && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: studio_module_css_default.beatErr,
						"data-testid": "tl-call-enhance-error",
						children: enhanceErr["call-" + i]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
						value: c.text ?? "",
						placeholder: studioCopy.promptPlaceholder,
						"aria-label": studioCopy.callPromptAria(i),
						"data-testid": "tl-call-prompt",
						rows: 2,
						onChange: (e) => handlePromptUpdate(`call-${i}`, e.target.value),
						className: (0, _melite_card_base_client.cn)(studio_module_css_default.promptBox, !(c.text ?? "").trim() && studio_module_css_default.promptBoxEmpty)
					})
				]
			});
		}
		//#endregion
		//#region src/ui/studio/CallCard.tsx
		/**
		* h3-timeline studio split (2026-09-06) — PURE MOVE from
		* ui/studio/component.tsx. No behavior change: headers/footers are new,
		* every logic line is verbatim from the monolith (source range noted).
		*/
		/** THE SEAT-HELD LAW LINES (the dictionary's own bound): computed
		*  hover titles narrating their lane's rule with live numbers are
		*  one-of-a-kind per seat — the wording lives HERE, never in the
		*  dictionary. Each rides a call (opaque to the copy census, as any
		*  locale lookup is) so the static faces stay the census's subject.
		*  No `: string` return annotation on purpose: the census descends
		*  explicit string returns in .tsx, which would re-flag these lines;
		*  the template infers string regardless. Names dodge the census's
		*  copy-suffixes for the same reason (the wording, not the name, is
		*  the law). */
		/** The generic bucket's count-tail hover (bus holds / overrides / defaults). */
		function refsTailLine(info) {
			if (info.over) return `${info.count} claimed — the bus holds ${info.cap}`;
			if (info.overrides) return `${info.count} of ${info.cap} — this call overrides the card defaults`;
			if (info.declaredCount > 0) return `${info.count} of ${info.cap} — the card defaults (add a chip to override)`;
			return `${info.count} of ${info.cap}`;
		}
		/** The mods lane's count-tail hover (loader slots / card mods). */
		function modsTailLine(info) {
			if (info.over) return `${info.count} claimed — the loader holds ${info.cap} slots (the compose refuses the overflow loud)`;
			if (info.overrides) return `${info.count} of ${info.cap} — this call overrides the card mods`;
			if (info.declaredCount > 0) return `${info.count} of ${info.cap} — the card mods (add a path to override)`;
			return `${info.count} of ${info.cap}`;
		}
		/** The card header's span hover (frames + seam-carried delivery). */
		function cardSpanLine(start, end, delivered) {
			return `frames ${start}–${end} (end exclusive) — delivered ${delivered}f after the seam's carry`;
		}
		/** A CARD-LEVEL reference chip (the Layer A/B canon, 2026-10-24):
		*  display-only — the studio never writes the declared surface (the
		*  agent path owns it), so there is no edit door to lie about. It
		*  renders only while this call's lane states no chips (the inherit
		*  arm); a stated lane REPLACES the defaults. The full URL rides
		*  the title; a dead URL shows its broken thumb honestly. */
		function DeclaredChip({ url, kind }) {
			const short = declaredShortName(url);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: studio_module_css_default.declaredChip,
				"data-testid": "tl-declared-ref",
				title: studioCopy.declaredChipTitle(url),
				children: [
					kind === "image" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
						src: url,
						alt: short,
						className: studio_module_css_default.declaredThumb
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: studio_module_css_default.declaredName,
						children: short
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: studio_module_css_default.declaredTag,
						children: studioCopy.declaredCardTag
					})
				]
			});
		}
		/** ONE ref bucket — the estate's SourceRow per chip (the operator's
		*  2026-09-13 law: SourceRow owns EVERY input slot): pick from the
		*  available artifacts, upload inline (data: URL chip), remove via
		*  clear. The wire form is the comma string (the card's wireList
		*  law — trimmed entries, empties absent).
		*
		*  ONE BUCKET SINCE 2026-10-31 (the rail-law audit's S1): the image
		*  lane — a ~130-line inline copy of this exact bucket — rides THIS
		*  component through its parameterization (anchor slot, bus-count
		*  offset, custom count title, over-bus wording). The wall
		*  (studio-call-buckets.spec.tsx) drives both seats through one
		*  face; a second inline copy is a contract break. */
		function RefsBucket({ label, kind, accept, cap, countOffset = 0, overWord = studioCopy.overCapTail, countTestId, countTitle, addLabel, anchorSlot, value, artifacts, onChange, disabled, disabledHint, declared, errorTestId }) {
			const [fileError, setFileError] = (0, react.useState)(null);
			const chips = splitRefList(value);
			const overrides = chips.length > 0;
			const bus = overrides ? chips : declared;
			const total = countOffset + bus.length;
			const over = total > cap;
			const shown = chips.map((ch, idx) => ({
				ch,
				idx
			}));
			const candidates = artifacts.filter((a) => refGenreOf(a.name, a.url) === kind && !chips.includes(a.name)).map((a) => ({
				id: a.name,
				label: a.name,
				url: a.url
			}));
			const setChips = (next) => onChange(next.length ? next.join(", ") : "");
			const up = REF_UPLOAD_SPEC[kind];
			const disabledTitle = disabledHint ?? studioCopy.pinnedStanddown;
			const tailTitle = countTitle !== void 0 ? countTitle({
				total,
				cap,
				over,
				overrides,
				declaredCount: declared.length
			}) : disabled ? disabledTitle : refsTailLine({
				count: bus.length,
				cap,
				over,
				overrides,
				declaredCount: declared.length
			});
			const chipOf = (v) => {
				const byUrl = candidates.find((c) => c.url === v);
				return byUrl !== void 0 ? byUrl.id : v;
			};
			const chipUrl = new Map(artifacts.map((a) => [a.name, a.url]));
			const commitChip = (v) => {
				if (/^https?:\/\//.test(v) && !candidates.some((c) => c.url === v)) {
					setFileError(FOREIGN_URL_REFUSAL);
					return false;
				}
				return true;
			};
			const commitUpload = async (f, at) => {
				if (f.size > up.maxMb * 1024 * 1024) {
					setFileError(`file too large (max ${up.maxMb} MB)`);
					return;
				}
				try {
					const data = await (0, _melite_card_base_client.readAsDataURL)(f);
					setFileError(null);
					setChips(at === null ? [...chips, data] : chips.map((x, idx) => idx === at ? data : x));
				} catch {
					setFileError("could not read that file");
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: studio_module_css_default.refRow,
				"data-testid": "tl-call-ref-bucket",
				"data-disabled": disabled ? "true" : void 0,
				title: disabled ? disabledTitle : void 0,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.SectionLabel, {
						tail: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BusCount, {
							total,
							cap,
							over,
							overWord,
							pinned: disabled === true,
							overrides,
							title: tailTitle,
							testId: countTestId
						}),
						children: label
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: studio_module_css_default.chips,
						style: disabled ? {
							opacity: .45,
							pointerEvents: "none"
						} : void 0,
						children: [
							anchorSlot,
							!overrides && declared.map((url) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DeclaredChip, {
								url,
								kind
							}, `declared-${url}`)),
							shown.map(({ ch: chip, idx: ci }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.SourceRow, {
								label: chip.startsWith("data:") ? studioCopy.uploadChipLabel(ci + 1) : chip,
								kind: kind === "image" ? "image" : "file",
								accept,
								value: displaySource(chip, chipUrl),
								onEdit: (v) => {
									if (v === "") setChips(chips.filter((_, x) => x !== ci));
									else if (commitChip(v)) {
										setFileError(null);
										setChips(chips.map((x, idx) => idx === ci ? chipOf(v) : x));
									}
								},
								candidates,
								loadMedia: _melite_card_base_client.fetchMediaLibrary,
								onFile: (f) => {
									commitUpload(f, ci);
								}
							}, `chip-${ci}`)),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.SourceRow, {
								label: addLabel ?? `+ ${label.toLowerCase()}`,
								kind: kind === "image" ? "image" : "file",
								accept,
								value: null,
								onEdit: (v) => {
									if (v !== "" && commitChip(v)) {
										setFileError(null);
										setChips([...chips, chipOf(v)]);
									}
								},
								candidates,
								loadMedia: _melite_card_base_client.fetchMediaLibrary,
								onFile: (f) => {
									commitUpload(f, null);
								}
							})
						]
					}),
					fileError && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						"data-testid": errorTestId,
						className: studio_module_css_default.fileErr,
						children: fileError
					})
				]
			});
		}
		/** THE BUS COUNT FACE (the rail-law audit's H5, 2026-10-31 — the
		*  count tail lived as three hand-rolled spellings): `n/cap`, the
		*  over word, the guard dot, the arm dot. The hover title stays at
		*  the seat (lane law wording); the FACE is one spelling.
		* @param total claimed slots (chips, or inherited defaults, + the
		*  lane's out-of-chips seats like the anchor).
		* @param cap the bus's slot count.
		* @param over total past the cap (red + the over word).
		* @param overWord the over-tail's word (the dictionary's overCapTail).
		* @param pinned the door guard's stand-down dot.
		* @param overrides a stated lane replaces the declared defaults.
		* @param title the hover title (the seat's own law wording).
		* @param testId the count face's testid. */
		function BusCount({ total, cap, over, overWord = studioCopy.overCapTail, pinned = false, overrides = false, title, testId }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: over || pinned ? studio_module_css_default.refCountOver : void 0,
				title,
				"data-testid": testId,
				children: [
					total,
					"/",
					cap,
					over ? ` ${overWord}` : "",
					pinned ? studioCopy.countPinnedTail : "",
					overrides ? studioCopy.countOverridesTail : ""
				]
			});
		}
		/** The mods seat's suffix face (the square's OWN pre-validation
		*  voice — the compose keeps its loud refusal for the entries the
		*  wire actually carries; this face names a refused DROP at the
		*  gesture, in the seat's words, never the compose's text). */
		function modsSuffixLine(entry) {
			return `${entry} is not a .safetensors pack — the loader picks up packs under models/refmods/`;
		}
		/** THE MODS LANE (2026-10-24, the operator's compound report: "at
		*  layer B, i do not see a refmod spot") — reusable reference-mod
		*  packs, engine-side .safetensors under models/refmods/. NOT an
		*  artifact bucket: packs are engine files, never run artifacts.
		*  THE SQUARE (slice 4, design §B): the lane's add door rides the
		*  SourceRow grammar — the pick arm commits the engine listing's
		*  stems in the wire form the compose stems (`stem.safetensors`;
		*  actions.ts' modStem basenames + suffix-checks, its loud refusal
		*  stays compose-side); the upload arm is CLOSED (the engine-side
		*  files law — a file gesture refuses loud, never the provider's
		*  default upload); the manual path form stays as the fallback arm,
		*  the only non-pick write. The chips keep the compact face (the
		*  strip verb is the row-icon class). Same wire form as the other
		*  lanes (the comma string), the canon's override display (stated
		*  lane replaces; absent inherits), same cap tail. */
		function ModsBucket({ label, cap, value, onChange, declared, listing }) {
			const [fileError, setFileError] = (0, react.useState)(null);
			const chips = splitRefList(value);
			const overrides = chips.length > 0;
			const bus = overrides ? chips : declared;
			const over = bus.length > cap;
			const setChips = (next) => onChange(next.length ? next.join(", ") : "");
			const held = new Set(chips.map((chip) => {
				const base = chip.split(/[\\/]/).pop();
				return base.endsWith(".safetensors") ? base.slice(0, -12) : base;
			}));
			const candidates = (listing ?? []).filter((stem) => !held.has(stem)).map((stem) => ({
				id: stem,
				label: stem,
				url: `${stem}.safetensors`
			}));
			const commitMod = (v) => {
				// v8 ignore next -- the empty cell carries no clear verb (the square renders no Detach without an attached value) — '' is unconstructible through the seam; the guard is the type fence, never a UI path
				if (v === "") return;
				if (!v.endsWith(".safetensors")) {
					setFileError(modsSuffixLine(v));
					return;
				}
				setFileError(null);
				setChips([...chips, v]);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: studio_module_css_default.refRow,
				"data-testid": "tl-call-mods-bucket",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.SectionLabel, {
						tail: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BusCount, {
							total: bus.length,
							cap,
							over,
							overrides,
							title: modsTailLine({
								count: bus.length,
								cap,
								over,
								overrides,
								declaredCount: declared.length
							}),
							testId: "tl-call-mods-count"
						}),
						children: label
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: studio_module_css_default.chips,
						children: [
							!overrides && declared.map((path) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DeclaredChip, {
								url: path,
								kind: "mod"
							}, `declared-${path}`)),
							chips.map((chip, ci) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: studio_module_css_default.declaredChip,
								"data-testid": "tl-call-mod-chip",
								title: studioCopy.modChipTitle(chip),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: studio_module_css_default.declaredName,
									children: chip
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									type: "button",
									variant: "ghost",
									className: studio_module_css_default.declaredTag,
									"data-testid": "tl-call-mod-strip",
									onClick: () => setChips(chips.filter((_, x) => x !== ci)),
									title: studioCopy.removePack,
									"aria-label": studioCopy.removePack,
									children: "×"
								})]
							}, `${chip}-${ci}`)),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.SourceRow, {
								label: `+ ${label.toLowerCase()}`,
								ariaLabel: `+ ${label.toLowerCase()}`,
								kind: "file",
								hideLabel: true,
								candidates,
								onEdit: commitMod,
								onFile: (f) => {
									if (!f.name.endsWith(".safetensors")) {
										setFileError(modsSuffixLine(f.name));
										return;
									}
									commitMod(f.name);
								}
							})
						]
					}),
					fileError && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						"data-testid": "tl-call-mods-error",
						className: studio_module_css_default.fileErr,
						children: fileError
					})
				]
			});
		}
		/** One focused model-call card (monolith lines 3418–3466 + 3641–3844;
		*  the prompt block lives in CallCardPrompt). */
		function CallCard({ c, i, deps }) {
			const { selected, fps, layerA, knobFields, callCardRefs, artifactIndex, linkGroups, guideLinks, refArtifacts, handlePromptDelete, handlePromptUpdate, enhanceOne, undoEnhance, enhancing, enhanceErr, enhanceUndo, setCallSpan, setCallGuide, setCallTransition, setCallRefs, setCallKnob, voicePinnedCalls, audioClipsPresent } = deps;
			const modsListing = deps.modsListing;
			const [knobsOpen, setKnobsOpen] = (0, react.useState)(false);
			if (selected != null && i !== selected.callIdx) return null;
			const activeKnobs = c.knobs ? Object.keys(c.knobs).length : 0;
			const callSelected = selected?.callIdx === i;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-call-card": i,
				"data-guides": GUIDE_KINDS.filter((k) => (c[k] ?? "").trim()).join(" ") || void 0,
				"data-knobs": activeKnobs || void 0,
				"data-selected": callSelected ? "true" : void 0,
				ref: (el) => {
					callCardRefs.current[i] = el;
				},
				className: (0, _melite_card_base_client.cn)(studio_module_css_default.callCard, callSelected && studio_module_css_default.callCardSel),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: studio_module_css_default.cardHead,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: studio_module_css_default.cardId,
								children: studioCopy.modelCallHead(i)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: studio_module_css_default.cardSpan,
								title: cardSpanLine(c.start_frame, c.end_frame, deliveredFrames(c, i)),
								children: studioCopy.spanReadout(c.start_frame, c.end_frame, ((c.end_frame - c.start_frame) / fps).toFixed(1), (deliveredFrames(c, i) / fps).toFixed(1))
							}),
							activeKnobs > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
								className: studio_module_css_default.knobTag,
								children: studioCopy.knobTag(activeKnobs)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
								tip: "Delete this call — its span merges into the neighbor",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									onClick: () => handlePromptDelete(`call-${i}`),
									"aria-label": studioCopy.deleteCallAria(i),
									className: studio_module_css_default.delBtn,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { className: studio_module_css_default.sz10 }),
										" ",
										studioCopy.deleteAction
									]
								})
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CallCardPrompt, {
						c,
						i,
						handlePromptUpdate,
						enhanceOne,
						undoEnhance,
						enhancing,
						enhanceErr,
						enhanceUndo
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: studio_module_css_default.spanRow,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: studio_module_css_default.spanLabel,
								children: studioCopy.spanWord
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.SpecAtom, {
								f: {
									name: `call_${i}_start_frame`,
									label: studioCopy.callStartLabel(i),
									type: "number",
									min: 0,
									step: 1
								},
								value: c.start_frame,
								placeholder: "",
								onEdit: (_, v) => {
									const n = parseFrameEdit(v);
									if (n !== void 0) setCallSpan(i, "start", n);
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: studio_module_css_default.spanDash,
								children: "–"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.SpecAtom, {
								f: {
									name: `call_${i}_end_frame`,
									label: studioCopy.callEndLabel(i),
									type: "number",
									min: 0,
									step: 1
								},
								value: c.end_frame,
								placeholder: "",
								onEdit: (_, v) => {
									const n = parseFrameEdit(v);
									if (n !== void 0) setCallSpan(i, "end", n);
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
								tip: studioCopy.spanNote,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									"aria-hidden": "true",
									className: studio_module_css_default.spanInfo,
									"data-testid": "tl-span-info",
									children: "ⓘ"
								})
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: studio_module_css_default.callRefs,
						"data-testid": "tl-call-refs",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.SectionLabel, { children: studioCopy.refsHead }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: studio_module_css_default.callRefsBody,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RefsBucket, {
									label: studioCopy.imagesBusLabel,
									kind: "image",
									cap: REF_CAPS.images,
									overWord: studioCopy.overBusTail,
									countTestId: "tl-call-ref-images",
									countTitle: ({ total, over, overrides, declaredCount }) => over ? `${total} image slots claimed — the bus holds ${REF_CAPS.images}; the compose slices the overflow` : `${total} of ${REF_CAPS.images} image slots on the bus${overrides ? " — this call overrides the card defaults" : declaredCount > 0 ? " — the card defaults (add a chip to override)" : ""}`,
									addLabel: studioCopy.addRefImage,
									value: c.refs?.images,
									artifacts: refArtifacts,
									onChange: (next) => setCallRefs(i, "images", next),
									declared: normalizeDeclaredRefs(layerA?.ref_images),
									errorTestId: "tl-call-ref-images-error"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RefsBucket, {
									label: studioCopy.refVideos,
									addLabel: studioCopy.addRefVideo,
									kind: "video",
									accept: "video/*",
									cap: REF_CAPS.videos,
									value: c.refs?.videos,
									artifacts: refArtifacts,
									onChange: (v) => setCallRefs(i, "videos", v),
									declared: normalizeDeclaredRefs(layerA?.ref_videos),
									errorTestId: "tl-call-ref-videos-error"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RefsBucket, {
									label: studioCopy.refAudios,
									addLabel: studioCopy.addRefAudio,
									kind: "audio",
									accept: "audio/*",
									cap: REF_CAPS.audios,
									value: c.refs?.audios,
									artifacts: refArtifacts,
									onChange: (v) => setCallRefs(i, "audios", v),
									declared: normalizeDeclaredRefs(layerA?.ref_audios),
									disabled: audioClipsPresent || (voicePinnedCalls?.has(i) ?? false),
									disabledHint: audioClipsPresent ? "THE BLOCKER: the timeline carries audio clips — the clips own the model's audio inputs; clear the D-M-E lanes to use reference audio" : "a dialogue/sfx clip pins this window — the pin owns its audio conditioning (remove the clip or move it to hear this input again)",
									errorTestId: "tl-call-ref-audios-error"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModsBucket, {
									label: studioCopy.refMods,
									cap: REF_CAPS.refmods,
									value: c.refs?.mods,
									onChange: (v) => setCallRefs(i, "mods", v),
									declared: normalizeDeclaredRefs(layerA?.ref_mods),
									listing: modsListing
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SeamControls, {
									callIndex: i,
									transition: c.transition,
									onTransition: (t) => setCallTransition(i, t)
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.DisclosureRow, {
						className: studio_module_css_default.knobFold,
						icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSlidersTwoOutlineRegular, { size: 14 }),
						title: studioCopy.knobsHead,
						open: knobsOpen,
						expandable: true,
						expandOnRowClick: true,
						onToggle: () => {
							setKnobsOpen((v) => !v);
						},
						keepContentWhenOpen: true,
						collapsedContent: activeKnobs > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
							className: studio_module_css_default.knobCount,
							children: activeKnobs
						}) : null,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: studio_module_css_default.knobGrid,
							children: KNOB_ORDER.map((knob) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.OverlayKnob, {
								name: knob,
								field: knobFields[knob],
								value: c.knobs?.[knob],
								base: layerA?.[knob],
								ariaLabel: studioCopy.callKnobAria(i, knob),
								onEdit: (v) => setCallKnob(i, knob, v)
							}, knob))
						})
					})
				]
			}, i);
		}
		//#endregion
		//#region src/ui/studio/CallCardsPanel.tsx
		/**
		* h3-timeline studio split (2026-09-06) — PURE MOVE from
		* ui/studio/component.tsx. No behavior change: headers/footers are new,
		* every logic line is verbatim from the monolith (source range noted).
		*/
		/** Layer B rail: compact call rows ⇄ focused call editor + legacy
		*  keyframes (monolith lines 3320–3416 + 3847–3924; per-call bodies
		*  render through CallCard). */
		function CallCardsPanel({ calls, selected, setSelected, fps, sourceOptions, keyframes, handleKeyframeMove, handleKeyframeDelete, setKeyframeImage, deps }) {
			const [kfUploadErrors, setKfUploadErrors] = (0, react.useState)({});
			const setKfUploadError = (i, err) => {
				setKfUploadErrors((prev) => ({
					...prev,
					[i]: err
				}));
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: studio_module_css_default.panel,
				"data-testid": "tl-call-panel",
				children: [
					selected != null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: studio_module_css_default.focusHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
							tip: "Back to the run's global parameters — or click any empty spot in the timeline",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "ghost",
								onClick: () => setSelected(null),
								"aria-label": studioCopy.backToGlobal,
								"data-testid": "tl-back-to-global",
								className: studio_module_css_default.backBtn,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronLeftOutlineRegular, { className: studio_module_css_default.sz12 }),
									" ",
									studioCopy.globalAction
								]
							})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.SectionLabel, {
							tail: studioCopy.previewCutMeta(selected.callIdx, calls.length),
							children: studioCopy.modelCallHead(selected.callIdx)
						})]
					}),
					selected != null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: studio_module_css_default.focusList,
						children: calls.map((c, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CallCard, {
							c,
							i,
							deps
						}, i))
					}),
					keyframes.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: studio_module_css_default.kfPanel,
						"data-testid": "tl-keyframe-panel",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: studio_module_css_default.kfHead,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.SectionLabel, {
								tail: studioCopy.keyframesHint,
								children: studioCopy.keyframesTitle
							})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: studio_module_css_default.compactList,
							children: keyframes.map((k, i) => {
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									"data-kf-row": i,
									"data-wired": k.image.trim() ? "true" : "false",
									className: studio_module_css_default.kfRow,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.SourceRow, {
											label: studioCopy.kfSourceLabel(i),
											ariaLabel: studioCopy.keyframeAria(i),
											kind: "file",
											hideLabel: true,
											value: k.image.trim() === "" ? null : displaySource(k.image, deps.artifactIndex.byName),
											candidates: sourceOptions.map((o) => ({
												id: o.name,
												label: `${o.title} · ${o.name}`,
												url: deps.artifactIndex.byName.get(o.name) ?? ""
											})),
											loadMedia: _melite_card_base_client.fetchMediaLibrary,
											onFile: (f) => {
												const err = refUploadError(f, "image");
												if (err !== null) {
													setKfUploadError(i, err);
													return;
												}
												(async () => {
													try {
														setKeyframeImage(i, await (0, _melite_card_base_client.readAsDataURL)(f));
														setKfUploadError(i, null);
													} catch {
														setKfUploadError(i, "could not read that file");
													}
												})();
											},
											onEdit: (src) => {
												if (src === "") {
													setKeyframeImage(i, "");
													return;
												}
												if (src.startsWith("data:")) {
													setKeyframeImage(i, src);
													return;
												}
												const name = deps.artifactIndex.byUrl.get(src);
												if (name !== void 0) {
													setKeyframeImage(i, name);
													setKfUploadError(i, null);
													return;
												}
												setKfUploadError(i, "that URL is not in this run's artifacts — pick a run artifact or upload a file");
											}
										}),
										kfUploadErrors[i] != null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											"data-testid": `tl-kf-source-error-${i}`,
											className: studio_module_css_default.fileErr,
											children: kfUploadErrors[i]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: studio_module_css_default.kfTime,
											title: studioCopy.keyframeFrameLabel(i),
											children: studioCopy.secondsLabel((k.frame / fps).toFixed(2))
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
											tip: studioCopy.deleteKeyframeTip,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												variant: "ghost",
												onClick: () => handleKeyframeDelete(`kf-${i}`),
												"aria-label": studioCopy.deleteKeyframeAria(i),
												className: studio_module_css_default.kfDel,
												children: "×"
											})
										})
									]
								}, i);
							})
						})]
					})
				]
			}) });
		}
		//#endregion
		//#region ../../models/h3/src/filmMix.ts
		/** Parse raw audio_clips rows — the card's one law for what a clip
		*  IS: a src without a numeric start_frame refuses loud (never a
		*  silent misplacement); a row without src is junk and skips; the
		*  class auto law (text → dialogue, textless → music) rides here. */
		function parseFilmMixClips(rows) {
			const clips = [];
			const INT_STRING = /^[+-]?\d+$/;
			const wireInt = (x) => typeof x === "string" && INT_STRING.test(x.trim()) ? Number(x.trim()) : x;
			for (const c of rows) {
				if (c === null || typeof c !== "object") continue;
				const row = c;
				row["start_frame"] = wireInt(row["start_frame"]);
				row["dur_frames"] = wireInt(row["dur_frames"]);
				const src = typeof row.src === "string" ? row.src.trim() : "";
				if (src === "") {
					if (row.start_frame !== void 0 || row.dur_frames !== void 0 || typeof row.text === "string" && row.text.trim() !== "" || typeof row.class === "string" && row.class.trim() !== "" || typeof row.id === "string" && row.id.trim() !== "" || typeof row.name === "string" && row.name.trim() !== "") throw new Error("audio_clips: a positioned clip row has no src — the film mix cannot place a source-less row");
					continue;
				}
				if (typeof row.start_frame !== "number" || !Number.isFinite(row.start_frame)) throw new Error(`audio_clips: a clip with src but no numeric start_frame — the audio lanes own placement (re-add the clip)`);
				const dur = typeof row.dur_frames === "number" && Number.isFinite(row.dur_frames) && row.dur_frames > 0 ? row.dur_frames : 0;
				const text = typeof row.text === "string" ? row.text.trim() : "";
				const clsRaw = typeof row.class === "string" ? row.class.trim().toLowerCase() : "";
				if (clsRaw !== "" && clsRaw !== "dialogue" && clsRaw !== "sfx" && clsRaw !== "music") throw new Error(`audio_clips: unknown class "${clsRaw}" — dialogue | sfx | music (omit for auto: text → dialogue, else music)`);
				const cls = clsRaw !== "" ? clsRaw : text !== "" ? "dialogue" : "music";
				clips.push({
					src,
					start: row.start_frame,
					dur,
					text,
					cls
				});
			}
			return clips;
		}
		//#endregion
		//#region src/ui/studio/docHydrate.ts
		/** Card-level ref lists hydrate to arrays; absent/empty stays absent
		* (undefined = the compose sees no declared surface — same as today). */
		function optRefs(raw, k) {
			const list = normalizeDeclaredRefs(raw?.[k]);
			return list.length > 0 ? list : void 0;
		}
		function arrayValue(value, field) {
			if (Array.isArray(value)) return value;
			if (typeof value !== "string" || !value.trimStart().startsWith("[")) return [];
			try {
				return JSON.parse(value);
			} catch {
				console.error(`VideoTimelineStudio: params.${field} is array-shaped but unparseable — the audio timeline is corrupt; the film composes WITHOUT it. Fix or re-author the clips.`);
				return [];
			}
		}
		function hydrateAudioClips(value) {
			const clips = [];
			for (const [index, raw] of arrayValue(value, "audio_clips").entries()) {
				if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
					console.warn(`VideoTimelineStudio: audio_clips[${index}] is not a clip row — dropped.`);
					continue;
				}
				const row = raw;
				let parsed;
				try {
					parsed = parseFilmMixClips([{ ...row }])[0];
				} catch (e) {
					console.warn(`VideoTimelineStudio: audio_clips[${index}] failed to hydrate (${String(e).slice(0, 120)}) — dropped; the film composes without this clip.`);
					continue;
				}
				if (parsed === void 0) continue;
				const id = typeof row.id === "string" && row.id.trim() !== "" ? row.id.trim() : `aclip-${index}`;
				const fallbackName = parsed.src.startsWith("data:") ? `clip-${index}` : parsed.src.split("/").pop();
				const name = typeof row.name === "string" && row.name.trim() !== "" ? row.name.trim() : fallbackName;
				const gain = typeof row.gain === "number" && Number.isFinite(row.gain) ? row.gain : void 0;
				clips.push({
					id,
					name,
					src: parsed.src,
					start_frame: parsed.start,
					dur_frames: parsed.dur,
					...gain !== void 0 ? { gain } : {},
					...typeof row.class === "string" && row.class.trim() !== "" ? { class: parsed.cls } : {},
					...parsed.text !== "" ? { text: parsed.text } : {}
				});
			}
			return clips.length > 0 ? clips : void 0;
		}
		/** The family's loras flavor catalog (id by filename) — the mod bag
		* resolves legacy lora knob picks; rows without a catalog match were
		* decorative (compose never read the knob pair) and drop. */
		const LORA_FILENAME_TO_ID = {
			"h3/minimax_h3_fl2v_lightx2v_v0.1_dareties_v4_step600_comfy_fro.safetensors": "h3_lightx2v_dareties",
			"h3/minimax_h3_fl2v_lightx2v_turbo_4to8step_v0.1-v1.0_768p_v4_step600_dareties.safetensors": "h3_lightx2v_turbo"
		};
		function migrateLayerARaw(raw) {
			if (raw === void 0) return raw;
			const out = {};
			for (const [k, v] of Object.entries(raw)) {
				const mapped = LEGACY_LAYERA_KEY[k] ?? k;
				out[mapped] = v;
			}
			const legacyName = typeof raw.lora_name === "string" ? raw.lora_name.trim() : "";
			if (legacyName !== "" && LORA_FILENAME_TO_ID[legacyName] !== void 0) {
				const bag = Array.isArray(out.loras) ? out.loras : [];
				bag.push({
					id: LORA_FILENAME_TO_ID[legacyName],
					strength: typeof raw.lora_strength === "number" ? raw.lora_strength : 1
				});
				out.loras = bag;
			}
			return out;
		}
		function hydrateLayerA(rawDoc) {
			const raw = migrateLayerARaw(rawDoc);
			const num = (k, d) => {
				const v = raw?.[k];
				const n = typeof v === "number" ? v : Number(v);
				return Number.isFinite(n) && n > 0 ? n : d;
			};
			const optNum = (k) => {
				const v = raw?.[k];
				if (v == null || v === "") return void 0;
				const n = Number(v);
				return Number.isFinite(n) ? n : void 0;
			};
			const optStr = (k) => typeof raw?.[k] === "string" && raw[k].trim() !== "" ? raw[k] : void 0;
			return {
				fps: (() => {
					const f = optNum("fps");
					return f !== void 0 && f > 0 ? f : void 0;
				})(),
				seed: num("seed", 42),
				shift_video: optNum("shift_video"),
				shift_audio: optNum("shift_audio"),
				steps: optNum("steps"),
				denoise: optNum("denoise"),
				width: optNum("width"),
				height: optNum("height"),
				sampler_name: optStr("sampler_name"),
				sched_name: optStr("sched_name"),
				sla_enabled: raw?.sla_enabled !== false,
				sla_sparsity: optNum("sla_sparsity"),
				sla_block_size: raw?.sla_block_size === "32" || raw?.sla_block_size === "64" || raw?.sla_block_size === "128" ? raw.sla_block_size : void 0,
				sla_min_seq_len: optNum("sla_min_seq_len"),
				sla_dense_last_steps: optNum("sla_dense_last_steps"),
				sla_protect_audio: raw?.sla_protect_audio !== false,
				sla_stabilize_motion: raw?.sla_stabilize_motion !== false,
				sla_reference_protection: raw?.sla_reference_protection === "Off" || raw?.sla_reference_protection === "Light" || raw?.sla_reference_protection === "Heavy Enforcement" ? raw.sla_reference_protection : void 0,
				sla_dense_backend: raw?.sla_dense_backend === "comfy_kitchen" || raw?.sla_dense_backend === "pytorch" || raw?.sla_dense_backend === "auto" ? raw.sla_dense_backend : void 0,
				sla_dense_steps: typeof raw?.sla_dense_steps === "string" && /^\s*[0-9]+(-[0-9]+)?(\s*,\s*[0-9]+(-[0-9]+)?)*\s*$/.test(raw.sla_dense_steps) ? raw.sla_dense_steps.trim() : void 0,
				sla_disable_fp16_accum: raw?.sla_disable_fp16_accum === true,
				sharpen_enabled: raw?.sharpen_enabled === true,
				sharpen_method: raw?.sharpen_method === "rcas" || raw?.sharpen_method === "adaptive_usm" || raw?.sharpen_method === "high_pass" || raw?.sharpen_method === "deconvolution" ? raw.sharpen_method : void 0,
				sharpen_strength: optNum("sharpen_strength"),
				sharpen_radius: optNum("sharpen_radius"),
				sharpen_threshold: optNum("sharpen_threshold"),
				sharpen_iterations: optNum("sharpen_iterations"),
				interpolate_enabled: raw?.interpolate_enabled === true,
				interp_model: raw?.interp_model === "film_net_fp16.safetensors" || raw?.interp_model === "rife47.pth" ? raw.interp_model : void 0,
				interp_multiplier: optNum("interp_multiplier"),
				sr_switch: raw?.sr_switch === true,
				sr_model: raw?.sr_model === "seedvr2_ema_3b_fp16.safetensors" || raw?.sr_model === "seedvr2_ema_3b_fp8_e4m3fn.safetensors" ? raw.sr_model : void 0,
				sr_resolution: optNum("sr_resolution"),
				ref_image_size: raw?.ref_image_size === "match" || raw?.ref_image_size === "max" ? raw.ref_image_size : void 0,
				loras: Array.isArray(raw?.loras) ? raw.loras.filter((r) => !!r && typeof r.id === "string").map((r) => {
					const steps = typeof r.steps === "number" && Number.isFinite(r.steps) ? r.steps : void 0;
					return {
						id: r.id,
						strength: typeof r.strength === "number" ? r.strength : void 0,
						...steps !== void 0 ? { steps } : {}
					};
				}) : void 0,
				variant: optStr("variant"),
				model: optStr("model"),
				audio_stem: optStr("audio_stem"),
				audio_clips: (() => {
					const parsed = hydrateAudioClips(raw?.audio_clips);
					const stem = optStr("audio_stem");
					if (stem !== void 0 && parsed === void 0) return [stemToClip(stem, optNum("fps"))];
					return parsed;
				})(),
				ref_images: optRefs(raw, "ref_images"),
				ref_videos: optRefs(raw, "ref_videos"),
				ref_audios: optRefs(raw, "ref_audios"),
				ref_mods: optRefs(raw, "ref_mods")
			};
		}
		/** Layer A → the persisted doc shape: ONLY card wire keys, ONLY
		* non-undefined (undefined = absent = the family default rides — the
		* engine default must never be pinned by a control never touched).
		* THE CONTRACT (pinned by the studio-contract wall test): every key
		* here ∈ the h3-timeline card's declared surface and READ by
		* compose. fps and variant ARE card doc keys (card.ts's own list)
		* and the RunRecipe control writes fps — they ride when stated.
		*
		* THE DELETE RIDE (R2, 2026-10-27): the save door is per-key JSON
		* Merge Patch — an absent key leaves the persisted value standing.
		* A gesture that CLEARS a field (state → undefined, or "" / an
		* emptied array) therefore rode nothing and the old value survived
		* every save: silent-wrong-data on reload. With `base` (the
		* persisted doc's raw layer-A record) the serializer emits an
		* explicit `null` for exactly the keys the base carries whose
		* state is now cleared — the door's own delete. Keys whose state
		* exists but the serializer gates (sr_* under a false switch) ride
		* nothing and delete nothing: their state survives a refresh. */
		/** The layer-A serializer's whole key universe — the loop list plus
		* every special-cased emission. The DELETE RIDE gates on this set:
		* a base key outside the universe (calls, keyframes, document —
		* other doc planes) never deletes, whatever the state says. */
		const LAYERA_KEY_UNIVERSE = /* @__PURE__ */ new Set([
			"seed",
			"fps",
			"variant",
			"shift_video",
			"shift_audio",
			"steps",
			"denoise",
			"width",
			"height",
			"sampler_name",
			"sched_name",
			"sla_sparsity",
			"sla_block_size",
			"sla_min_seq_len",
			"sla_dense_last_steps",
			"sla_reference_protection",
			"sla_dense_backend",
			"sla_dense_steps",
			"sla_enabled",
			"sla_protect_audio",
			"sla_stabilize_motion",
			"sla_disable_fp16_accum",
			"sharpen_enabled",
			"sharpen_method",
			"sharpen_strength",
			"sharpen_radius",
			"sharpen_threshold",
			"sharpen_iterations",
			"interpolate_enabled",
			"interp_model",
			"interp_multiplier",
			"sr_switch",
			"sr_model",
			"sr_resolution",
			"ref_image_size",
			"model",
			"audio_stem",
			"loras",
			"audio_clips",
			"ref_images",
			"ref_videos",
			"ref_audios",
			"ref_mods"
		]);
		function serializeLayerA(a, base) {
			const out = {
				seed: a.seed,
				sla_protect_audio: a.sla_protect_audio,
				sla_stabilize_motion: a.sla_stabilize_motion,
				sla_disable_fp16_accum: a.sla_disable_fp16_accum,
				sharpen_enabled: a.sharpen_enabled === true,
				interpolate_enabled: a.interpolate_enabled === true
			};
			for (const k of [
				"fps",
				"variant",
				"shift_video",
				"shift_audio",
				"steps",
				"denoise",
				"width",
				"height",
				"sampler_name",
				"sched_name",
				"sla_sparsity",
				"sla_block_size",
				"sla_min_seq_len",
				"sla_dense_last_steps",
				"sla_reference_protection",
				"sla_dense_backend",
				"sla_dense_steps",
				"sharpen_method",
				"sharpen_strength",
				"sharpen_radius",
				"sharpen_threshold",
				"sharpen_iterations",
				"interp_model",
				"interp_multiplier",
				"ref_image_size",
				"model",
				"audio_stem"
			]) {
				const v = a[k];
				if (v !== void 0 && v !== "") out[k] = v;
			}
			if (a.loras !== void 0 && a.loras.length > 0) out.loras = a.loras;
			if (a.sr_switch === true) {
				out.sr_switch = true;
				if (a.sr_model != null) out.sr_model = a.sr_model;
				if (a.sr_resolution != null) out.sr_resolution = a.sr_resolution;
			}
			if (a.sla_enabled === false) out.sla_enabled = false;
			if (a.audio_clips?.length) out.audio_clips = a.audio_clips;
			if (a.ref_images?.length) out.ref_images = a.ref_images;
			if (a.ref_videos?.length) out.ref_videos = a.ref_videos;
			if (a.ref_audios?.length) out.ref_audios = a.ref_audios;
			if (a.ref_mods?.length) out.ref_mods = a.ref_mods;
			if (base !== void 0) {
				const cleared = (v) => v === void 0 || v === "" || Array.isArray(v) && v.length === 0;
				const state = a;
				for (const k of Object.keys(base)) if (LAYERA_KEY_UNIVERSE.has(k) && !(k in out) && base[k] !== void 0 && base[k] !== null && cleared(state[k])) out[k] = null;
			}
			return out;
		}
		//#endregion
		//#region src/ui/studio/docCalls.ts
		/** An array-SHAPED string that will not parse (or parses to a
		* non-array) is a CORRUPT calls/beats document — the 2026-08-30 crime
		* class ("the persist effect wrote 1 call back, and the multi-call
		* plan was destroyed permanently"). The parseable case self-heals
		* (parse → the mount commit writes it as a real array); the
		* corrupt case must never fall to the starter SILENTLY. The studio
		* shows the starter as VIEW state, the corruption is named loudly
		* here, and useShownDoc's sentinel treats the field as PRESENT so no
		* mount commit ever writes the starter back over the corrupt
		* source. Non-array-shaped strings ("not-json") are foreign values
		* the vocabulary has always tolerated — not this crime. */
		function corruptCallsField(raw) {
			for (const field of ["calls", "beats"]) {
				const v = raw[field];
				if (typeof v !== "string" || !v.trimStart().startsWith("[")) continue;
				try {
					if (Array.isArray(JSON.parse(v))) continue;
				} catch {}
				return field;
			}
			return null;
		}
		function hydrateCalls(raw) {
			const corrupt = corruptCallsField(raw);
			if (corrupt !== null) console.error(`VideoTimelineStudio: params.${corrupt} is array-shaped but unparseable — the document is corrupt. The starter is shown as view state ONLY; nothing persists over the corrupt source until you edit.`);
			let callsRaw = raw.calls;
			if (typeof callsRaw === "string" && callsRaw.trimStart().startsWith("[")) try {
				const parsed = JSON.parse(callsRaw);
				if (Array.isArray(parsed)) callsRaw = parsed;
			} catch {}
			let beatsRaw = raw.beats;
			if (typeof beatsRaw === "string" && beatsRaw.trimStart().startsWith("[")) try {
				const parsed = JSON.parse(beatsRaw);
				if (Array.isArray(parsed)) beatsRaw = parsed;
			} catch {}
			const list = Array.isArray(callsRaw) && callsRaw.length > 0 ? callsRaw : Array.isArray(beatsRaw) && beatsRaw.length > 0 ? beatsRaw : null;
			if (!list) return STARTER_CALLS;
			const calls = [];
			for (const c of list) {
				if (typeof c !== "object" || c === null) continue;
				const r = c;
				const start = Number(r.start_frame);
				const end = Number(r.end_frame);
				if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
				const call = {
					text: "",
					start_frame: Math.round(start),
					end_frame: Math.round(end)
				};
				const rawSegs = r.beats;
				if (Array.isArray(rawSegs) && rawSegs.length > 0) {
					const joined = [];
					for (const sg of rawSegs) if (typeof sg === "object" && sg !== null) {
						const t = sg.text;
						if (typeof t === "string" && t.trim()) joined.push(t.trim());
					}
					if (joined.length) {
						console.warn(`VideoTimelineStudio: call ${calls.length} carried prompt segments — their texts joined into the one prompt (segments were cut 2026-09-15; no words lost)`);
						call.text = joined.join(" ");
					}
				}
				if (!call.text.trim() && typeof r.text === "string") call.text = r.text;
				for (const kind of GUIDE_KINDS) {
					const src = r[kind];
					if (typeof src === "string" && src.trim()) call[kind] = src;
				}
				if (typeof r.last_frame === "string" && r.last_frame.trim()) console.warn(`VideoTimelineStudio: call ${calls.length} carried last_frame (${r.last_frame}) — dropped; the closing-still control was cut 2026-09-15 (the reference lane owns no last-frame input)`);
				if (r.transition === "extend" || r.transition === "cut") call.transition = r.transition;
				const refs = {};
				const rr = r.refs !== null && typeof r.refs === "object" && !Array.isArray(r.refs) ? r.refs : {};
				const im = joinRefList(rr.images ?? r.ref_images);
				const vi = joinRefList(rr.videos ?? r.ref_videos);
				const au = joinRefList(rr.audios ?? r.ref_audios);
				const mo = joinRefList(rr.mods);
				if (im) refs.images = im;
				if (vi) refs.videos = vi;
				if (au) refs.audios = au;
				if (mo) refs.mods = mo;
				if (Object.keys(refs).length) call.refs = refs;
				if (r.knobs !== null && typeof r.knobs === "object") {
					const knobs = {};
					for (const [rawK, v] of Object.entries(r.knobs)) {
						const k = migrateCallKnobKey(rawK);
						if (!CALL_KNOB_KEYS.has(k)) {
							console.warn(`VideoTimelineStudio: dropping unknown call knob "${rawK}" (the card's knob vocabulary)`);
							continue;
						}
						if (v === null || v === void 0 || v === "") continue;
						const target = knobs;
						if (k === "length" || k === "steps" || k === "denoise" || k === "shift_video" || k === "shift_audio" || k === "sla_sparsity" || k === "sla_min_seq_len" || k === "sla_dense_last_steps" || k === "sharpen_strength" || k === "sharpen_radius" || k === "sharpen_threshold" || k === "sharpen_iterations" || k === "interp_multiplier") {
							const n = Number(v);
							if (Number.isFinite(n)) target[k] = n;
						} else if (k === "sampler_name" || k === "sched_name") {
							if (typeof v === "string" && v.trim()) target[k] = v;
						} else if (k === "sla_block_size") {
							if (v === "32" || v === "64" || v === "128") target.sla_block_size = v;
						} else if (k === "sla_reference_protection") {
							if (v === "Off" || v === "Light" || v === "Heavy Enforcement") target.sla_reference_protection = v;
						} else if (k === "sla_dense_backend") {
							if (v === "comfy_kitchen" || v === "pytorch" || v === "auto") target.sla_dense_backend = v;
						} else if (k === "sla_dense_steps") {
							if (typeof v === "string" && /^[0-9]+(-[0-9]+)?(,[0-9]+(-[0-9]+)?)*$/.test(v.trim())) target.sla_dense_steps = v.trim();
						} else if (k === "sharpen_method") {
							if (v === "rcas" || v === "adaptive_usm" || v === "high_pass" || v === "deconvolution") target.sharpen_method = v;
						} else if (k === "interp_model") {
							if (v === "film_net_fp16.safetensors" || v === "rife47.pth") target.interp_model = v;
						} else {
							const b = typeof v === "boolean" ? v : v === "true" ? true : v === "false" ? false : void 0;
							if (b !== void 0) target[k] = b;
						}
					}
					if (Object.keys(knobs).length) call.knobs = knobs;
				}
				calls.push(call);
			}
			if (calls.length === 0) return STARTER_CALLS;
			return calls.sort((a, b) => a.start_frame - b.start_frame);
		}
		/** The keyframe pin channel's hydration (the keyframe lane's shape,
		*  2026-11-05: `{image, frame}` — FILM-absolute frame, square-grammar
		*  source). Forgiving like every channel: non-object rows and rows
		*  without a finite frame skip. LEGACY MIGRATION (the kinded rows —
		*  `{frame, kind, source}`): the `source` alias rides onto `image`
		*  for image-kind (and kind-absent) rows — no source lost; clip/audio
		*  rows drop with a LOUD warn (the pin channel is image pins only;
		*  a clip/audio diamond never had a compose meaning — the last_frame
		*  precedent: named, never silent). Sorted by frame (the plan
		*  vocabulary is sorted pins — hydrateCalls' own law). */
		function hydrateKeyframes(raw) {
			if (!Array.isArray(raw)) return [];
			const out = [];
			for (const k of raw) {
				if (typeof k !== "object" || k === null) continue;
				const r = k;
				const frame = Number(r.frame);
				if (!Number.isFinite(frame)) continue;
				const kind = typeof r.kind === "string" && r.kind !== "" ? r.kind : "image";
				const legacySource = typeof r.source === "string" ? r.source : "";
				const image = typeof r.image === "string" ? r.image : legacySource;
				if (kind !== "image") {
					console.warn(`VideoTimelineStudio: keyframe at frame ${Math.round(frame)} carried kind "${kind}" — dropped; the pin channel is image pins (a ${kind} diamond had no compose meaning)`);
					continue;
				}
				out.push({
					image,
					frame: Math.round(frame)
				});
			}
			return out.sort((a, b) => a.frame - b.frame);
		}
		/** The keyframes channel's persisted shape (the sorted-write law,
		*  2026-11-05): vocabulary-only rows `{image, frame}`, sorted by
		*  frame — the door never carries a stale kind/source spelling, and
		*  row order is the frame order (the retirement digest is
		*  order-sensitive, so both doors ride THIS serializer). */
		function serializeKeyframes(kfs) {
			return [...kfs].sort((a, b) => a.frame - b.frame).map((k) => ({
				image: k.image,
				frame: k.frame
			}));
		}
		const hasKnobs = (c) => !!c.knobs && Object.keys(c.knobs).length > 0;
		/** Document → bar prompts. end_frame inclusive; uuid is the call's index
		* (index-derived ids are stable for the life of a gesture — no gesture
		* spans a structural change, and every render re-derives consistently).
		* `override` = the call carries per-call knobs → the cyan dot (Layer C
		* shows where a call departs from the run's globals). */
		function callsToPrompts(calls, fps) {
			const clock = typeof fps === "number" && fps > 0 ? fps : DEFAULT_SEGMENT_PARAMS$1.fps;
			return calls.map((c, i) => ({
				uuid: `call-${i}`,
				text: studioCopy.clipHeader(i, ((c.end_frame - c.start_frame) / Math.max(1, clock)).toFixed(1), c.text ?? ""),
				start_frame: c.start_frame,
				end_frame: c.end_frame - 1,
				color: null,
				override: hasKnobs(c),
				audio: !!(c.audio ?? "").trim(),
				refImages: (() => {
					return splitRefList(c.refs?.images).length + ((c.image ?? "").trim() ? 1 : 0);
				})(),
				seam: c.transition === "cut" ? "cut" : "extend"
			}));
		}
		/** The chip thumb's displayable-source check (slice 3, 2026-11-05):
		*  the SHARED isImageUrl rule (card-base square.ts — the same law the
		*  Link2 groups ride: data:image/blob, or an http(s)/root-relative
		*  path with an image extension). Anything else is a bare artifact
		*  NAME (or a foreign seat) — the derived view resolves names through
		*  artifactIndex.byName, and an unresolvable name leaves the thumb
		*  ABSENT (the diamond-only chip — never a broken <img>).
		*
		* @param src the pin's square-grammar source.
		* @returns true when the source renders in an <img> verbatim. */
		function displayableThumbUrl(src) {
			return src !== "" && (0, _melite_card_base_client.isImageUrl)(src);
		}
		/** Document keyframes → bar diamonds. Same index-derived uuid contract.
		*  Every pin rides the IMAGE track — the pin channel is image pins
		*  (the keyframe lane's design); the clip/audio lane decls stay for
		*  the strip's track table, they simply carry no diamonds. Legacy/
		*  frame-exact keyframes only — beat-attached guides are NOT lane
		*  diamonds (2026-08-15): the beat is one entity and its guides live in
		*  the beat panel; the lanes render only when the document actually
		*  carries hand keyframes. (Slice 3) a displayable source rides the
		*  chip's `thumbUrl` (displayableThumbUrl — names resolve in the
		*  derived view, never here: this mapper stays index-free). */
		function keyframesToLanes(kfs) {
			return kfs.map((k, i) => {
				return {
					uuid: `kf-${i}`,
					track_id: "image",
					frame: k.frame < 0 ? 0 : k.frame,
					value: null,
					...displayableThumbUrl(k.image) ? { thumbUrl: k.image } : {}
				};
			});
		}
		/** Calls → the persisted document shape (the `calls` vocabulary, Layer
		* B): guide keys ride ONLY when non-blank (blank = none — the planner's
		* contract, kept here so the saved doc never carries "" noise); knobs
		* ride only when non-empty, and every knob value is written VERBATIM
		* (undefined was never stored — the setter deletes the key, so absent
		* IS inherit, never null). The prompt is ONE `text` — segments were
		* cut 2026-09-15 (hydration joins old beats' texts; the serializer
		* never writes beats). */
		function serializeCalls(calls) {
			return calls.map((c) => {
				const out = {
					text: c.text ?? "",
					start_frame: c.start_frame,
					end_frame: c.end_frame
				};
				for (const kind of GUIDE_KINDS) {
					const src = c[kind];
					if (src && src.trim()) out[kind] = src;
				}
				if (c.transition === "extend" || c.transition === "cut") out.transition = c.transition;
				if (c.refs) {
					const images = joinRefList(splitRefList(c.refs.images));
					const videos = joinRefList(splitRefList(c.refs.videos));
					const audios = joinRefList(splitRefList(c.refs.audios));
					const mods = joinRefList(splitRefList(c.refs.mods));
					if (images || videos || audios || mods) out.refs = {
						...images ? { images } : {},
						...videos ? { videos } : {},
						...audios ? { audios } : {},
						...mods ? { mods } : {}
					};
				}
				if (hasKnobs(c)) out.knobs = { ...c.knobs };
				return out;
			});
		}
		const callIndexOf = (id) => {
			const i = Number(id.replace(/^call-/, ""));
			return Number.isInteger(i) ? i : -1;
		};
		const kfIndexOf = (id) => {
			const i = Number(id.replace(/^kf-/, ""));
			return Number.isInteger(i) ? i : -1;
		};
		//#endregion
		//#region src/ui/studio/pendingOps.ts
		/** Canonical JSON for content comparison (A1, 2026-10-27): keys
		* sorted recursively, arrays order-preserved (row order is
		* semantic), undefined-valued keys SKIPPED (the door's own JSON
		* serialization drops them — `{k: undefined}` ≡ `{}` at the wire;
		* an explicit null is NOT undefined and stays, until patchView
		* strips it for retirement). JSON.stringify's key-order dependence
		* made retirement a coin flip — a settlement that wrote equal
		* content in a different key order left its op live forever.
		* Every comparison in this file (and useShownDoc's no-op law)
		* rides this digest. */
		function canonicalJson(v) {
			if (Array.isArray(v)) return `[${v.map(canonicalJson).join(",")}]`;
			if (v !== null && typeof v === "object") {
				const rec = v;
				return `{${Object.keys(rec).filter((k) => rec[k] !== void 0).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(rec[k])}`).join(",")}}`;
			}
			return JSON.stringify(v) ?? "null";
		}
		/** The merge-patch view of a layer-A payload: an explicit null IS
		* the delete — after the door settles it, the key is simply ABSENT.
		* Retirement therefore compares both sides with nulls stripped: an
		* op carrying `{k: null}` retires exactly when the settled doc's
		* payload carries no `k` (P2's delete ride, 2026-10-27). */
		function patchView(v) {
			if (v !== null && typeof v === "object" && !Array.isArray(v)) {
				const out = {};
				for (const [k, val] of Object.entries(v)) if (val !== null) out[k] = val;
				return out;
			}
			return v;
		}
		/** Content-equal under the door's merge-patch semantics. */
		function settledEquals(a, b) {
			return canonicalJson(patchView(a)) === canonicalJson(patchView(b));
		}
		/** Pure projection: the bench row hydrated (the doc, verbatim). */
		function projectDoc(params) {
			return {
				calls: hydrateCalls({
					calls: params?.calls,
					beats: params?.beats
				}),
				keyframes: hydrateKeyframes(params?.keyframes),
				layerA: hydrateLayerA(params)
			};
		}
		/** Serialize one projected channel into the door's shape (the
		*  retirement comparison's common currency). */
		function serializeChannel(doc, channel) {
			switch (channel) {
				case "calls": return serializeCalls(doc.calls);
				case "keyframes": return serializeKeyframes(doc.keyframes);
				case "layerA": return serializeLayerA(doc.layerA);
			}
		}
		/** The live ops: ops whose value the projected doc does not yet
		*  contain. Derived per render — never bookkept, so nothing can
		*  leak or go stale (an op is retired by the settlement itself). */
		function liveOps(doc, ops) {
			return ops.filter((op) => !settledEquals(serializeChannel(doc, op.channel), op.value));
		}
		/** The shown document: the projection with the live ops applied
		*  (latest op per channel wins; hydration re-runs so the shown doc
		*  is always well-formed view state, never raw payload). */
		function overlayDoc(doc, ops) {
			const live = liveOps(doc, ops);
			const latest = (channel) => {
				let out;
				for (const op of live) if (op.channel === channel && (out === void 0 || op.seq > out.seq)) out = op;
				return out;
			};
			const callsOp = latest("calls");
			const kfOp = latest("keyframes");
			const layerOp = latest("layerA");
			if (callsOp === void 0 && kfOp === void 0 && layerOp === void 0) return doc;
			return {
				calls: callsOp === void 0 ? doc.calls : hydrateCalls({
					calls: callsOp.value,
					beats: void 0
				}),
				keyframes: kfOp === void 0 ? doc.keyframes : hydrateKeyframes(kfOp.value),
				layerA: layerOp === void 0 ? doc.layerA : hydrateLayerA(layerOp.value)
			};
		}
		//#endregion
		//#region src/ui/studio/useShownDoc.ts
		/**
		* useShownDoc — THE COLLAPSE (the rework, 2026-10-27: one truth).
		*
		* THE LAW (DSH doc law: presenters are pure functions of durable
		* truth; the adapter owns writes; live incrementality is transient
		* and marked): the bench doc is the ONLY document state. This hook
		* holds NO mirror — it projects the row (projectDoc), overlays the
		* transient op log (overlayDoc), and commits every gesture
		* straight through the adapter (onSave) while appending the exact
		* sent value as an op. An op retires when the durable doc itself
		* contains it. No guard, no resend epoch, no unsettled probe, no
		* touched set — a stale refresh cannot rewrite stated content
		* because there is no second state to rewrite into.
		*
		* REPLACES useDocState (mirror + guard + epoch + probe + touched)
		* and useDocEffects' three persist arms (moved to the gesture).
		* The view-sync thirds (playhead clamp, selection scroll/guard)
		* live in useStudioViewSync — no save, no guards.
		*/
		function channelPayload(channel, value) {
			if (channel === "calls") return { calls: value };
			if (channel === "keyframes") return { keyframes: value };
			return value;
		}
		function useShownDoc(stage, onSave) {
			const projected = (0, react.useMemo)(() => projectDoc(stage.params), [canonicalJson(stage.params)]);
			const [ops, setOps] = (0, react.useState)([]);
			const seqRef = (0, react.useRef)(0);
			const projectedRef = (0, react.useRef)(projected);
			projectedRef.current = projected;
			const baseRef = (0, react.useRef)(stage.params);
			baseRef.current = stage.params;
			const opsRef = (0, react.useRef)(ops);
			opsRef.current = ops;
			const stageIdRef = (0, react.useRef)(stage.id);
			if (stageIdRef.current !== stage.id) {
				stageIdRef.current = stage.id;
				opsRef.current = [];
				setOps([]);
			}
			const params = stage.params;
			const rawList = Array.isArray(params?.calls) && (params?.calls).length > 0 ? params?.calls : Array.isArray(params?.beats) && (params?.beats).length > 0 ? params?.beats : null;
			const docArrivedRef = (0, react.useRef)(rawList !== null);
			if (!docArrivedRef.current && rawList !== null) {
				docArrivedRef.current = true;
				opsRef.current = opsRef.current.filter((o) => o.channel !== "calls");
				setOps(opsRef.current);
			} else if (docArrivedRef.current && rawList === null) docArrivedRef.current = false;
			const starterOwed = rawList === null && corruptCallsField({
				calls: params?.calls,
				beats: params?.beats
			}) === null;
			(0, react.useEffect)(() => {
				if (starterOwed) {
					const payload = serializeCalls(projectedRef.current.calls);
					onSave({ calls: payload });
					const op = {
						channel: "calls",
						value: payload,
						seq: seqRef.current++
					};
					opsRef.current = [op];
					setOps([op]);
				}
			}, [stage.id]);
			const live = (0, react.useMemo)(() => liveOps(projected, ops), [projected, ops]);
			const shown = (0, react.useMemo)(() => overlayDoc(projected, live), [projected, live]);
			/** Retract one appended op by its commit order (the P8 async arm —
			*  a mount-local helper, never a render read: refs stay the
			*  within-tick truth, state follows). */
			function dropOp(seq) {
				opsRef.current = opsRef.current.filter((o) => o.seq !== seq);
				setOps(opsRef.current);
			}
			const commit = (channel, serialize, getShown) => (u) => {
				const prev = getShown(overlayDoc(projectedRef.current, liveOps(projectedRef.current, opsRef.current)));
				const payload = serialize(typeof u === "function" ? u(prev) : u);
				if (canonicalJson(payload) === canonicalJson(serialize(prev))) return;
				const answer = onSave(channelPayload(channel, payload));
				if (answer === false) return;
				const op = {
					channel,
					value: payload,
					seq: seqRef.current++
				};
				const seq = op.seq;
				opsRef.current = [...opsRef.current.filter((o) => o.channel !== channel), op];
				setOps(opsRef.current);
				if (answer instanceof Promise) answer.then((landed) => {
					if (landed === false) dropOp(seq);
				}, () => {
					dropOp(seq);
				});
			};
			const updateCalls = (0, react.useMemo)(() => commit("calls", serializeCalls, (d) => d.calls), [onSave]);
			const updateKeyframes = (0, react.useMemo)(() => commit("keyframes", serializeKeyframes, (d) => d.keyframes), [onSave]);
			const updateLayerA = (0, react.useMemo)(() => commit("layerA", (v) => serializeLayerA(v, baseRef.current), (d) => d.layerA), [onSave]);
			const setLayerAKey = (0, react.useMemo)(() => (k, v) => {
				updateLayerA((prev) => prev[k] === v ? prev : {
					...prev,
					[k]: v
				});
			}, [updateLayerA]);
			return {
				calls: shown.calls,
				keyframes: shown.keyframes,
				layerA: shown.layerA,
				updateCalls,
				updateKeyframes,
				updateLayerA,
				setLayerAKey
			};
		}
		//#endregion
		//#region src/ui/studio/useStudioViewSync.ts
		/**
		* useStudioViewSync — the collapse's view thirds (the rework).
		*
		* WHAT SURVIVED of useDocEffects: the playhead clamp, the
		* selection→sidebar scroll, and the stale-selection guard. NO
		* save, NO guards, NO persist — the adapter owns writes (a gesture
		* commits; this hook only keeps the VIEW coherent). Takes the
		* SHOWN calls (f(doc, pendingOps)), so its bounds are never stale.
		*/
		function useStudioViewSync(args) {
			const { totalFrames, setFrameIdx, selected, setSelected, calls, callCardRefs } = args;
			(0, react.useEffect)(() => {
				setFrameIdx((f) => Math.min(f, Math.max(0, totalFrames - 1)));
			}, [totalFrames]);
			(0, react.useEffect)(() => {
				if (!selected) return;
				callCardRefs.current[selected.callIdx]?.scrollIntoView({
					block: "nearest",
					behavior: "smooth"
				});
			}, [selected]);
			(0, react.useEffect)(() => {
				if (!selected) return;
				if (selected.callIdx >= calls.length) setSelected(null);
			}, [calls, selected]);
		}
		//#endregion
		//#region src/ui/studio/useViewSelection.ts
		/**
		* h3-timeline studio split (2026-09-06) — PURE MOVE from
		* ui/studio/component.tsx, reworked 2026-10-31 (the rail-law audit):
		* the dead beat-selection arm is deleted (Layer C beats left the bar
		* 2026-09-15 — text mode only; the parser, the beat refs, and the
		* beat flag were a contract with no producer), junk clip ids no
		* longer clear the seat (a deselect is an explicit gesture — null,
		* the empty timeline, or the back button), and a stage switch resets
		* the selection (the bench slot can receive a new stage without
		* remounting; an index carried across stages points at a different
		* stage's call).
		*/
		/** THE DELETE-FOLLOW LAW (the rail-law audit, 2026-10-31): calls are
		*  INDEX-addressed, so a delete repoints the focused editor at
		*  whatever slid into the index unless the seat follows the doc.
		*  Deleting the SELECTED call clears the focus (the editor that
		*  replaces it would silently be a different call's); deleting an
		*  EARLIER call walks the focus back one so the editor stays on the
		*  call it was editing; anything else leaves the seat untouched.
		*
		*  @param selected the live selection (null = global rail).
		*  @param deletedId the bar/card delete gesture's clip id (`call-N`).
		*  @returns the selection the rail should hold after the delete. */
		function nextSelectionAfterDelete(selected, deletedId) {
			if (selected == null || !/^call-\d+$/.test(deletedId)) return selected;
			const i = Number(deletedId.slice(5));
			if (i === selected.callIdx) return null;
			if (i < selected.callIdx) return { callIdx: selected.callIdx - 1 };
			return selected;
		}
		function useViewSelection(calls, layerA, stageId) {
			const [frameIdx, setFrameIdx] = (0, react.useState)(0);
			const [selected, setSelected] = (0, react.useState)(null);
			const callCardRefs = (0, react.useRef)([]);
			const stageIdRef = (0, react.useRef)(stageId);
			if (stageIdRef.current !== stageId) {
				stageIdRef.current = stageId;
				setSelected(null);
			}
			/** Bar clip id → the sidebar selection. `call-N` → that call's
			*  card; null = a click on the empty timeline — the sidebar shifts
			*  back to global params (the mode-switching rail: global ⇄ the
			*  selected call). An UNRECOGNIZED id changes nothing: only an
			*  explicit deselect gesture (null, the empty timeline, the back
			*  button) leaves the focused editor — a junk id is not one. */
			const handleTimelineSelect = (id) => {
				if (id === null) {
					setSelected(null);
					return;
				}
				const callMatch = /^call-(\d+)$/.exec(id);
				if (callMatch !== null) setSelected({ callIdx: Number(callMatch[1]) });
			};
			return {
				frameIdx,
				setFrameIdx,
				selected,
				setSelected,
				callCardRefs,
				handleTimelineSelect,
				fps: layerA.fps ?? DEFAULT_SEGMENT_PARAMS$1.fps,
				totalFrames: calls.length ? calls[calls.length - 1].end_frame : 1
			};
		}
		//#endregion
		//#region src/ui/studio/useFilmSync.ts
		/**
		* h3-timeline studio split (2026-09-06) — PURE MOVE from
		* ui/studio/component.tsx. No behavior change: headers/footers are new,
		* every logic line is verbatim from the monolith (source range noted).
		*/
		/** Player↔bar playhead sync + rail readout stats (tenant §3). Verbatim lines 1592–1670. */
		function useFilmSync(args) {
			const { fps, totalFrames, keyframes, calls, setFrameIdx } = args;
			const filmRef = (0, react.useRef)(null);
			const isScrubbingRef = (0, react.useRef)(false);
			const wasPlayingRef = (0, react.useRef)(false);
			const handleScrubStart = (0, react.useCallback)(() => {
				isScrubbingRef.current = true;
				wasPlayingRef.current = filmRef.current ? !isPausedRef.current : false;
				if (wasPlayingRef.current) filmRef.current?.pause();
			}, []);
			const handleScrubEnd = (0, react.useCallback)(() => {
				isScrubbingRef.current = false;
				if (wasPlayingRef.current) {
					wasPlayingRef.current = false;
					filmRef.current?.play();
				}
			}, []);
			const filmFpsRef = (0, react.useRef)(null);
			const axisFps = (0, react.useCallback)(() => filmFpsRef.current ?? fps, [fps]);
			const handleFilmTime = (0, react.useCallback)((sec) => {
				if (isScrubbingRef.current) return;
				const f = Math.round(sec * axisFps());
				setFrameIdx((prev) => prev === f ? prev : f);
			}, [axisFps]);
			const handleBarFrame = (0, react.useCallback)((f) => {
				setFrameIdx(f);
				filmRef.current?.seekTo(f / axisFps());
			}, [axisFps]);
			/** Playing state mirror — needed by handleScrubStart to know whether
			*  to resume on release (the handle has no isPaused getter; keep one
			*  frame of truth here from onPlayingChange). */
			const isPausedRef = (0, react.useRef)(true);
			const handlePlayingChange = (0, react.useCallback)((playing) => {
				isPausedRef.current = !playing;
				setFilmPlaying(playing);
			}, []);
			/** (Layer A NLE) film playing mirror — the mixer drives clip elements
			*  from this + frameIdx; the FilmPlayer's own track (dialogue + any
			*  window audio) plays from the player element itself. */
			const [filmPlaying, setFilmPlaying] = (0, react.useState)(false);
			return {
				filmRef,
				isScrubbingRef,
				wasPlayingRef,
				handleScrubStart,
				handleScrubEnd,
				filmFpsRef,
				axisFps,
				handleFilmTime,
				handleBarFrame,
				isPausedRef,
				handlePlayingChange,
				filmPlaying,
				seconds: (totalFrames / fps).toFixed(1),
				unwired: keyframes.filter((k) => !k.image.trim()).length,
				emptyText: calls.filter((c) => !c.text.trim()).length,
				guideCount: calls.reduce((n, c) => n + GUIDE_KINDS.filter((k) => (c[k] ?? "").trim()).length, 0),
				knobOverrides: calls.filter(hasKnobs).length
			};
		}
		//#endregion
		//#region src/ui/studio/useFilmAudio.ts
		/**
		* h3-timeline studio split (2026-09-06) — PURE MOVE from
		* ui/studio/component.tsx. No behavior change: headers/footers are new,
		* every logic line is verbatim from the monolith (source range noted).
		*/
		/** Davinci map, artifact index, positioned audio clips + the mixer
		*  (tenant §5). Verbatim lines 1731–1946. */
		function useFilmAudio(args) {
			const { stage, upstreams, layerA, setLayerA, setLayerAKey, fps, frameIdx, filmPlaying, filmFpsRef } = args;
			const filmMap = (0, react.useMemo)(() => {
				const m = (stage.result?.metadata)?.film;
				return m && Array.isArray(m.windows) && m.windows.length > 0 && m.totalFrames ? m : null;
			}, [stage.result]);
			filmFpsRef.current = filmMap?.fps ?? null;
			const filmFromDoc = (0, react.useCallback)((f) => {
				const ws = filmMap?.windows;
				if (!ws) return f;
				let w = ws[0];
				for (const c of ws) if (f >= c.docStart) w = c;
				else break;
				const scale = w.docSpan > 0 ? (w.len - w.trim) / w.docSpan : 1;
				if (f <= w.docStart + w.docSpan) return Math.round(w.start + w.trim + (f - w.docStart) * scale);
				return w.start + w.len;
			}, [filmMap]);
			const docFromFilm = (0, react.useCallback)((g) => {
				const ws = filmMap?.windows;
				if (!ws) return g;
				let w = ws[ws.length - 1];
				for (const c of ws) if (g < c.start + c.len) {
					w = c;
					break;
				}
				const scale = w.docSpan > 0 ? (w.len - w.trim) / w.docSpan : 1;
				const t = Math.max(0, g - w.start - w.trim);
				return Math.round(w.docStart + Math.min(t / scale, w.docSpan));
			}, [filmMap]);
			const artifactIndex = (0, react.useMemo)(() => {
				const byName = /* @__PURE__ */ new Map();
				const byUrl = /* @__PURE__ */ new Map();
				const ownArts = stage.result?.artifacts;
				if (ownArts) {
					for (const [name, url] of Object.entries(ownArts)) if (typeof url === "string" && url) {
						byName.set(name, url);
						byUrl.set(url, name);
					}
				}
				for (const u of upstreams ?? []) {
					const arts = u.result?.artifacts;
					if (!arts) continue;
					for (const [name, url] of Object.entries(arts)) if (typeof url === "string" && url) {
						byName.set(name, url);
						byUrl.set(url, name);
					}
				}
				return {
					byName,
					byUrl
				};
			}, [upstreams, stage.result]);
			/** The refs pickers' candidates: the full artifact index (own run
			* ∪ upstreams — see artifactIndex), genre-filtered per bucket inside
			* RefPickerRow (2026-09-02: own outputs included, not just upstream). */
			const refArtifacts = (0, react.useMemo)(() => [...artifactIndex.byName.entries()].map(([name, url]) => ({
				name,
				url
			})), [artifactIndex]);
			/** Resolve a clip's src to a PLAYABLE url: a data: URL is itself; an
			* artifact name maps through the index. Unresolvable → null (the
			* mixer skips it — never a bad fetch). */
			const audioSrcUrl = (0, react.useCallback)((src) => {
				if (src.startsWith("data:")) return src;
				return artifactIndex.byName.get(src) ?? null;
			}, [artifactIndex.byName]);
			/** Add a clip: probe its duration (Audio metadata), land it at the
			* frame. dur fallback 4s worth of frames — VISIBLE, then correctable
			* by the probe's completion. */
			const addAudioClip = (0, react.useCallback)((name, src, startFrame, cls) => {
				const id = `aclip-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
				const f = fps;
				const clip = {
					id,
					name,
					src,
					start_frame: Math.max(0, Math.round(startFrame)),
					dur_frames: Math.round(4 * f),
					...cls ? { class: cls } : {}
				};
				setLayerA((prev) => ({
					...prev,
					audio_clips: [...prev.audio_clips ?? [], clip]
				}));
				const url = src.startsWith("data:") ? src : null;
				const probe = new Audio();
				probe.preload = "metadata";
				const done = () => {
					if (Number.isFinite(probe.duration) && probe.duration > 0) {
						const durF = Math.max(1, Math.round(probe.duration * f));
						setLayerA((prev) => ({
							...prev,
							audio_clips: (prev.audio_clips ?? []).map((c) => c.id === id ? {
								...c,
								dur_frames: durF
							} : c)
						}));
					}
				};
				probe.addEventListener("loadedmetadata", done, { once: true });
				probe.src = url ?? artifactIndex.byName.get(src) ?? "";
				return id;
			}, [
				fps,
				artifactIndex.byName,
				setLayerA
			]);
			const moveAudioClip = (0, react.useCallback)((clipId, docFrame) => {
				setLayerA((prev) => prev.audio_clips?.some((c) => c.id === clipId) ? {
					...prev,
					audio_clips: prev.audio_clips.map((c) => c.id === clipId ? {
						...c,
						start_frame: Math.max(0, Math.round(docFrame))
					} : c)
				} : prev);
			}, []);
			const deleteAudioClip = (0, react.useCallback)((clipId) => {
				setLayerA((prev) => ({
					...prev,
					audio_clips: (prev.audio_clips ?? []).filter((c) => c.id !== clipId)
				}));
			}, []);
			/** Patch a clip's lane/text (the inspector's pen): only the
			* authored fields move — placement/duration own their own doors. */
			const updateAudioClip = (0, react.useCallback)((clipId, patch) => {
				setLayerA((prev) => prev.audio_clips?.some((c) => c.id === clipId) ? {
					...prev,
					audio_clips: prev.audio_clips.map((c) => c.id === clipId ? {
						...c,
						...patch
					} : c)
				} : prev);
			}, []);
			/** OS file → clip: audio only, 30 MB cap. A refusal is VISIBLE —
			* the every-seat upload law (2026-10-26, the upload audit's C1):
			* this arm silently dropped wrong-type files, oversize files and
			* unreadable files (three bare returns) reachable from the
			* lane-picker From-file arm AND OS drops on the strip. The
			* gesture seat owns the face; the refusal rides onError with the
			* same message vocabulary the call card's lanes use. */
			const takeAudioFile = (0, react.useCallback)((file, startFrame, cls, onError) => {
				if (!file.type.startsWith("audio/")) {
					onError?.(file.type ? `not an audio file (${file.type}) — the lanes take audio only` : "not an audio file — the lanes take audio only");
					return;
				}
				if (file.size > 31457280) {
					onError?.(`file too large (max 30 MB)`);
					return;
				}
				(0, _melite_card_base_client.readAsDataURL)(file).then((dataUrl) => {
					addAudioClip(file.name, dataUrl, startFrame, cls);
				}).catch(() => {
					onError?.("could not read that file");
				});
			}, [addAudioClip]);
			const clipElsRef = (0, react.useRef)(/* @__PURE__ */ new Map());
			(0, react.useEffect)(() => {
				const live = clipElsRef.current;
				const ids = new Set((layerA.audio_clips ?? []).map((c) => c.id));
				for (const [id, el] of live) if (!ids.has(id)) {
					el.pause();
					live.delete(id);
				}
				for (const c of layerA.audio_clips ?? []) if (!live.has(c.id)) live.set(c.id, new Audio());
			}, [layerA.audio_clips]);
			(0, react.useEffect)(() => {
				if (!layerA.audio_clips?.length) return;
				const fpsEff = filmMap?.fps ?? fps;
				const t = frameIdx / fpsEff;
				for (const c of layerA.audio_clips) {
					const el = clipElsRef.current.get(c.id);
					const url = audioSrcUrl(c.src);
					if (!el || !url) continue;
					if (el.src !== url) el.src = url;
					el.volume = c.gain != null ? Math.max(0, Math.min(1, c.gain)) : 1;
					const startSec = (filmMap ? filmFromDoc(c.start_frame) : c.start_frame) / fpsEff;
					const mediaSec = c.dur_frames / fps;
					const local = t - startSec;
					if (filmPlaying && local >= 0 && local < mediaSec) {
						if (el.paused) {
							el.currentTime = local;
							el.play().catch(() => {});
						} else if (Math.abs(el.currentTime - local) > .12) el.currentTime = local;
					} else if (!el.paused) el.pause();
				}
			}, [
				frameIdx,
				filmPlaying,
				layerA.audio_clips,
				audioSrcUrl,
				filmMap,
				filmFromDoc,
				fps
			]);
			(0, react.useEffect)(() => () => {
				for (const [, el] of clipElsRef.current) el.pause();
				clipElsRef.current.clear();
			}, []);
			return {
				filmMap,
				filmFromDoc,
				docFromFilm,
				artifactIndex,
				refArtifacts,
				audioSrcUrl,
				addAudioClip,
				moveAudioClip,
				deleteAudioClip,
				updateAudioClip,
				takeAudioFile,
				clipElsRef
			};
		}
		//#endregion
		//#region src/ui/studio/docPatch.ts
		/** Copy the array with the element at `i` replaced by `next` — the
		*  single-index patch every one-field setter rides.
		*
		* @param xs the array to copy (the state's previous value).
		* @param i the index to replace (bounds-guarded at the seat).
		* @param next the replacement element.
		* @returns the copied array with `next` seated at `i`. */
		function patchAt(xs, i, next) {
			const copy = [...xs];
			copy[i] = next;
			return copy;
		}
		//#endregion
		//#region src/ui/studio/usePromptMutations.ts
		/** Bar↔card prompt gestures (tenant §6). Verbatim lines 1948–2042. */
		function usePromptMutations(setCalls) {
			const handlePromptResize = (id, s, e) => {
				const i = callIndexOf(id);
				setCalls((prev) => {
					if (i < 0 || i >= prev.length) return prev;
					const cur = prev[i];
					const next = [...prev];
					if (s !== cur.start_frame && i > 0) {
						next[i] = {
							...cur,
							start_frame: s
						};
						next[i - 1] = {
							...prev[i - 1],
							end_frame: s
						};
					} else if (e !== cur.end_frame - 1) {
						next[i] = {
							...cur,
							end_frame: e + 1
						};
						if (i < prev.length - 1) next[i + 1] = {
							...prev[i + 1],
							start_frame: e + 1
						};
					} else return prev;
					return next;
				});
			};
			const handlePromptMove = (id, s, e) => {
				const i = callIndexOf(id);
				setCalls((prev) => {
					if (i < 0 || i >= prev.length) return prev;
					const cur = prev[i];
					if (s === cur.start_frame && e + 1 === cur.end_frame) return prev;
					const next = [...prev];
					next[i] = {
						...cur,
						start_frame: s,
						end_frame: e + 1
					};
					if (i > 0) next[i - 1] = {
						...next[i - 1],
						end_frame: s
					};
					if (i < prev.length - 1) next[i + 1] = {
						...next[i + 1],
						start_frame: e + 1
					};
					return next;
				});
			};
			const handlePromptDelete = (id) => {
				const i = callIndexOf(id);
				setCalls((prev) => {
					if (i < 0 || i >= prev.length) return prev;
					if (prev.length === 1) return STARTER_CALLS.map((c) => ({ ...c }));
					const next = prev.filter((_, j) => j !== i);
					if (i > 0) next[i - 1] = {
						...next[i - 1],
						end_frame: prev[i].end_frame
					};
					else next[0] = {
						...next[0],
						start_frame: prev[0].start_frame
					};
					return next;
				});
			};
			const handlePromptUpdate = (id, text) => {
				const i = callIndexOf(id);
				setCalls((prev) => {
					if (i < 0 || i >= prev.length) return prev;
					const cur = prev[i];
					if (cur.text === text) return prev;
					return patchAt(prev, i, {
						...cur,
						text
					});
				});
			};
			return {
				handlePromptResize,
				handlePromptMove,
				handlePromptDelete,
				handlePromptUpdate
			};
		}
		//#endregion
		//#region ../../web-kit/catalog/src/sleep.ts
		/**
		* sleep.ts — ONE delay for the package (the hand-roll audit's 7.9).
		*
		* Four clones across this package's own sources carried three
		* different contracts: an abortable sleep that rejects with an
		* `AbortError` (api.ts's retry backoff), a plain delay
		* (text-to-pose's poll), and two inline `new Promise(r =>
		* setTimeout(r, ms))` waits (FlowProtocol's poll ticks). They are one
		* function with an optional signal: a caller with no signal gets the
		* plain delay, a caller with one gets the abort that clears the timer.
		*
		* Why this is a local module and not the DSH timer seat: this package
		* is a browser client (no `Context`), and `ctx.timeout` is fiber-owned
		* by the Cordis plugin. The cross-package fold the row names is
		* unavailable to every one of these sites for that reason alone; what
		* IS available is one implementation per package, which is this.
		* @module @melite/catalog/sleep
		*/
		/**
		* Await `ms` milliseconds; an `AbortSignal` clears the timer and
		* rejects with a DOM `AbortError`, the spelling the retry path
		* already catches.
		* @param ms - delay in milliseconds.
		* @param signal - optional cancellation; an already-aborted signal rejects without waiting.
		* @returns resolves after the delay, rejects on abort.
		*/
		function sleep$1(ms, signal) {
			return new Promise((resolve, reject) => {
				if (signal?.aborted === true) {
					reject(new DOMException("Aborted", "AbortError"));
					return;
				}
				const timer = setTimeout(() => {
					signal?.removeEventListener("abort", onAbort);
					resolve();
				}, ms);
				const onAbort = () => {
					clearTimeout(timer);
					reject(new DOMException("Aborted", "AbortError"));
				};
				signal?.addEventListener("abort", onAbort, { once: true });
			});
		}
		var init_sleep$1 = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/catalog/src/clientStore.ts
		/**
		* clientStore — THE client store seat: a bound, zustand-shaped store over the
		* DSH platform snapshot store (`@deepseek-ai/dsh-client-store`, the
		* zustand/immer engine the web shell shares through its frozen module table —
		* see packages/web/shared/web-platform.ts).
		*
		* The engine owns observation, synchronous publication, and Immer-backed
		* updates. This module owns the binding every browser store in the repository
		* shares: the module-level lifetime (the document survives remounts and is
		* shared across tenants), the `getState`/`setState`/`subscribe`/
		* `getInitialState`/`destroy` statics module-level callers use, and the
		* selector hook.
		*
		* `setState` shallow-merges a patch into the record and replaces the record
		* whole when `replace` is true. A patch that leaves the record unchanged keeps
		* the current snapshot and notifies nobody.
		*/
		function createClientStore$1(init) {
			const engine = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(void 0);
			const stops = /* @__PURE__ */ new Set();
			let initialState;
			const getState = () => engine.getSnapshot();
			const setState = (partial, replace) => {
				const patch = typeof partial === "function" ? partial(getState()) : partial;
				if (replace === true) {
					engine.set(patch);
					return;
				}
				engine.update((draft) => {
					Object.assign(draft, patch);
				});
			};
			const subscribe = (listener) => {
				let previous = getState();
				const stop = engine.subscribe(() => {
					const next = getState();
					const before = previous;
					previous = next;
					listener(next, before);
				});
				stops.add(stop);
				return () => {
					stops.delete(stop);
					stop();
				};
			};
			const api = {
				setState,
				getState,
				getInitialState: () => initialState,
				subscribe,
				destroy: () => {
					for (const stop of stops) stop();
					stops.clear();
				}
			};
			const initial = typeof init === "function" ? init(setState, getState, api) : init;
			engine.set(initial);
			initialState = initial;
			function useStore(selector, equalityFn = Object.is) {
				const selectorRef = (0, react.useRef)(selector);
				selectorRef.current = selector;
				const equalityRef = (0, react.useRef)(equalityFn);
				equalityRef.current = equalityFn;
				const getSnapshot = (0, react.useMemo)(() => {
					let prev;
					let hasPrev = false;
					return () => {
						const sel = selectorRef.current;
						const next = sel ? sel(getState()) : getState();
						if (hasPrev && equalityRef.current(prev, next)) return prev;
						hasPrev = true;
						prev = next;
						return next;
					};
				}, []);
				return (0, react.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
			}
			/* v8 ignore stop */
			return Object.assign(useStore, api);
		}
		var init_clientStore$1 = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/catalog/src/api.ts
		/** The named escape for non-table URLs. Every use is deliberate and
		* greppable. */
		function externalUrl$1(u) {
			return u;
		}
		function shouldRetryStatus$1(status, method) {
			return GATEWAY_CODES$1.has(status) || SAFE_METHODS$1.has(method) && status >= 500 && status < 600;
		}
		function getBackendState$1() {
			return backendStore$1.getState().state;
		}
		/** Subscribe to backend liveness changes. Returns an unsubscribe fn. */
		function onBackendState$1(cb) {
			return backendStore$1.subscribe((next) => {
				cb(next.state);
			});
		}
		function setState$1(next) {
			if (next === backendStore$1.getState().state) return;
			backendStore$1.setState({ state: next });
		}
		/** True if `input` targets our own backend (same-origin or root-relative). */
		function isBackendUrl$1(input) {
			if (input.startsWith("/")) return true;
			try {
				return new URL(input, window.location.origin).origin === window.location.origin;
			} catch {
				return false;
			}
		}
		function backoffMs$1(attempt) {
			const exp = Math.min(CAP_MS$1, BASE_MS$1 * 2 ** attempt);
			return Math.round(exp * (.5 + Math.random() * .5));
		}
		/**
		* Drop-in replacement for `fetch()` with retry, backoff, GET dedup, and a
		* global liveness signal. Throws only on persistent network failure (after
		* MAX_RETRIES) or caller AbortError. Returns the Response for any HTTP
		* status (including 4xx/5xx) so existing `if (!res.ok)` checks keep working.
		*/
		async function apiFetch$1(input, init = {}) {
			const method = (init.method ?? "GET").toUpperCase();
			const backend = isBackendUrl$1(input);
			const dedupKey = method === "GET" && backend ? input : null;
			if (dedupKey && inflight$1.has(dedupKey)) return inflight$1.get(dedupKey).then((r) => {
				if (init.signal?.aborted) throw new DOMException("Aborted", "AbortError");
				if (r && typeof r.clone === "function") return r.clone();
				return r;
			});
			const run = async () => {
				const deadline = Date.now() + TOTAL_BUDGET_MS$1;
				let lastErr = null;
				for (let attempt = 0; attempt <= MAX_RETRIES$1; attempt++) {
					if (init.signal?.aborted) throw new DOMException("Aborted", "AbortError");
					try {
						const ctrl = new AbortController();
						const callerSignal = init.signal;
						const bridge = () => ctrl.abort();
						callerSignal?.addEventListener("abort", bridge, { once: true });
						let res;
						try {
							res = await fetch(input, {
								...init,
								signal: ctrl.signal
							});
						} finally {
							callerSignal?.removeEventListener("abort", bridge);
						}
						if (shouldRetryStatus$1(res.status, method) && attempt < MAX_RETRIES$1 && Date.now() < deadline) {
							if (backend) setState$1("degraded");
							await sleep$1(backoffMs$1(attempt), callerSignal);
							continue;
						}
						if (backend) {
							consecutiveFail$1 = 0;
							setState$1("online");
						}
						return res;
					} catch (err) {
						if (err instanceof DOMException && err.name === "AbortError") throw err;
						lastErr = err;
						if (backend) {
							consecutiveFail$1++;
							setState$1(consecutiveFail$1 >= OFFLINE_THRESHOLD$1 ? "offline" : "degraded");
						}
						if (attempt < MAX_RETRIES$1 && Date.now() < deadline) {
							const backSig = init.signal;
							await sleep$1(backoffMs$1(attempt), backSig);
						}
					}
				}
				throw lastErr instanceof Error ? lastErr : /* @__PURE__ */ new Error("network request failed");
			};
			const p = run();
			if (dedupKey) {
				inflight$1.set(dedupKey, p);
				p.then(() => {
					inflight$1.delete(dedupKey);
				}, () => {
					inflight$1.delete(dedupKey);
				});
			}
			return p;
		}
		/**
		* Convenience for JSON endpoints. Throws an Error on non-2xx (message
		* includes status + body excerpt) so callers can use try/catch directly.
		*/
		async function apiJson$1(input, init) {
			const res = await apiFetch$1(input, init);
			if (!res.ok) {
				let body = "";
				try {
					body = await res.text();
				} catch (readErr) {
					throw new Error(`${input}: ${res.status} ${res.statusText} (body read failed: ${readErr instanceof Error ? readErr.message : String(readErr)})`);
				}
				throw new Error(`${input}: ${res.status} ${res.statusText} ${body.slice(0, 200)}`);
			}
			return res.json();
		}
		var MAX_RETRIES$1, BASE_MS$1, CAP_MS$1, OFFLINE_THRESHOLD$1, TOTAL_BUDGET_MS$1, SAFE_METHODS$1, GATEWAY_CODES$1, backendStore$1, consecutiveFail$1, inflight$1;
		var init_api$1 = __esmMin((() => {
			init_sleep$1();
			init_clientStore$1();
			MAX_RETRIES$1 = 4;
			BASE_MS$1 = 400;
			CAP_MS$1 = 4e3;
			OFFLINE_THRESHOLD$1 = 3;
			TOTAL_BUDGET_MS$1 = 15e3;
			SAFE_METHODS$1 = /* @__PURE__ */ new Set(["GET", "HEAD"]);
			GATEWAY_CODES$1 = /* @__PURE__ */ new Set([
				502,
				503,
				504
			]);
			backendStore$1 = createClientStore$1({ state: "online" });
			consecutiveFail$1 = 0;
			inflight$1 = /* @__PURE__ */ new Map();
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/contractToast.ts
		/**
		* Wire the toast pusher the contract stores report through.
		* @param toast - the row's addToast (browser), a test recorder, or
		*                null to unwire (face teardown / HMR reload).
		*/
		function setContractToastSink$1(toast) {
			sink$1 = toast;
		}
		/**
		* Fire one contract toast through the wired sink.
		* @param type - toast severity.
		* @param message - the operator-facing text.
		* @param action - optional Retry-style button.
		* @throws when no sink is wired — an unwired verdict must surface,
		*          not vanish.
		*/
		function contractToast$1(type, message, action) {
			if (sink$1 === null) throw new Error("contract toast sink unset — call setContractToastSink() from the owning client face before reporting");
			sink$1(type, message, action);
		}
		var sink$1;
		var init_contractToast$1 = __esmMin((() => {
			sink$1 = null;
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/catalogContract.ts
		function validateCatalogContract$1(catalog) {
			const violations = [];
			if (!isObj$3(catalog)) return {
				valid: false,
				violations: [{
					kind: "catalog",
					message: "Catalog is not an object — this is an error body, not a contract."
				}]
			};
			const families = catalog.families;
			if (!isObj$3(families)) violations.push({
				kind: "catalog",
				message: "Catalog has no `families` record — no family can be located."
			});
			const models = catalog.models;
			if (!isObj$3(models)) violations.push({
				kind: "catalog",
				message: "Catalog has no `models` record — no model can be located."
			});
			const capabilities = catalog.capabilities;
			if (capabilities !== void 0 && !isObj$3(capabilities)) violations.push({
				kind: "catalog",
				message: "`capabilities` is not a record keyed by id — capability routing is dead."
			});
			if (families === void 0 || models === void 0) return {
				valid: false,
				violations
			};
			if (isObj$3(families)) for (const [id, entry] of Object.entries(families)) {
				if (!isObj$3(entry)) {
					violations.push({
						kind: id,
						message: `Family ${id} is not an object.`
					});
					continue;
				}
				if (!isNonEmptyString$1(entry.label)) violations.push({
					kind: id,
					message: `Family ${id} declares no "label" — it would render as an empty picker entry.`
				});
				const modifiers = entry.modifiers;
				if (modifiers !== void 0 && modifiers !== null && !Array.isArray(modifiers)) violations.push({
					kind: id,
					message: `Family ${id} declares "modifiers" but it is not an array — modifier capability is unreadable.`
				});
				else if (Array.isArray(modifiers)) for (const raw of modifiers) {
					if (!isObj$3(raw) || typeof raw.kind !== "string") continue;
					if (raw.kind !== "controlnet" && raw.kind !== "lora") continue;
					const options = Array.isArray(raw.options) ? raw.options : [];
					if ((raw.cardinality ?? "list") === "list" && options.length === 0 && !raw.upload_dir) violations.push({
						kind: id,
						message: `Family ${id} modifier kind "${raw.kind}" carries ZERO options and no upload_dir — the dropdown would render empty (phantom capability).`
					});
				}
			}
			if (isObj$3(models)) for (const [id, entry] of Object.entries(models)) {
				if (!isObj$3(entry)) {
					violations.push({
						kind: id,
						message: `Model ${id} is not an object.`
					});
					continue;
				}
				const missing = [];
				if (!isNonEmptyString$1(entry.family)) missing.push("family");
				if (!isNonEmptyString$1(entry.form)) missing.push("form");
				if (!isNonEmptyString$1(entry.label)) missing.push("label");
				if (missing.length > 0) violations.push({
					kind: id,
					message: `Model ${id} is missing required key(s) ${missing.join(", ")} — it cannot route or render.`
				});
			}
			if (isObj$3(capabilities)) for (const [id, entry] of Object.entries(capabilities)) {
				if (!isObj$3(entry)) {
					violations.push({
						kind: id,
						message: `Capability ${id} is not an object.`
					});
					continue;
				}
				const missing = [];
				if (!isNonEmptyString$1(entry.label)) missing.push("label");
				const declaredFam = entry.default_family;
				if (declaredFam !== void 0 && !isNonEmptyString$1(declaredFam)) missing.push("default_family (present but not a string)");
				const resolved = entry.resolved;
				const hasRoute = isObj$3(resolved) && isNonEmptyString$1(resolved.family) && isNonEmptyString$1(resolved.model);
				if (!(Array.isArray(entry.families) && entry.families.length === 0) && !hasRoute && !isNonEmptyString$1(declaredFam)) missing.push("default_family or resolved route");
				if (!Array.isArray(entry.families)) missing.push("families");
				else if (entry.families.some((f) => !isNonEmptyString$1(f))) missing.push("families (non-string entries)");
				else if (entry.families.length === 0 && (isNonEmptyString$1(declaredFam) || hasRoute)) missing.push("families (routed but empty — the default points at no family)");
				if (missing.length > 0) violations.push({
					kind: id,
					message: `Capability ${id} is missing required key(s) ${missing.join(", ")} — it cannot route.`
				});
			}
			return {
				valid: violations.length === 0,
				violations
			};
		}
		var CatalogContractError$1, isObj$3, isNonEmptyString$1;
		var init_catalogContract$1 = __esmMin((() => {
			CatalogContractError$1 = class extends Error {
				constructor(violations) {
					super(`Catalog contract violation (${violations.length}): ${violations[0]?.message ?? "unknown"}`);
					this.name = "CatalogContractError";
					this.violations = violations;
				}
			};
			isObj$3 = (v) => v != null && typeof v === "object" && !Array.isArray(v);
			isNonEmptyString$1 = (v) => typeof v === "string" && v.trim().length > 0;
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/modelCatalog.ts
		var modelCatalog_exports$1 = /* @__PURE__ */ __exportAll({
			activeVariantForRoute: () => activeVariantForRoute$1,
			axisCellExists: () => axisCellExists$1,
			canvasDefaultModel: () => canvasDefaultModel$1,
			composeVariantRoute: () => composeVariantRoute$1,
			controlnetTypesOf: () => controlnetTypesOf$1,
			dropdownModels: () => dropdownModels$1,
			ensureCatalog: () => ensureCatalog$1,
			familiesForForm: () => familiesForForm$1,
			familyAccepts: () => familyAccepts$1,
			familyCardSummary: () => familyCardSummary$1,
			familyConditioning: () => familyConditioning$1,
			familyGenre: () => familyGenre$1,
			familyHasVariantAxis: () => familyHasVariantAxis$1,
			familyLabel: () => familyLabel$1,
			familyOf: () => familyOf$1,
			familyOptionalOutputs: () => familyOptionalOutputs$1,
			familyPrimaryRoute: () => familyPrimaryRoute$1,
			familyTransformMatrix: () => familyTransformMatrix$1,
			formOf: () => formOf$1,
			getCachedCatalog: () => getCachedCatalog$1,
			hiddenFromDropdown: () => hiddenFromDropdown$1,
			isCatalogLoaded: () => isCatalogLoaded$1,
			loadCatalog: () => loadCatalog$1,
			modelDescription: () => modelDescription$1,
			modelLabel: () => modelLabel$1,
			narrowGenre: () => narrowGenre$1,
			onCatalogReady: () => onCatalogReady$1,
			presetsForRoute: () => presetsForRoute$1,
			primeCatalog: () => primeCatalog$1,
			routeCoordinates: () => routeCoordinates$1,
			studioOf: () => studioOf$1,
			variantLabel: () => variantLabel$1,
			variantSiblings: () => variantSiblings$1,
			variantsForRoute: () => variantsForRoute$1
		});
		/** Narrow the wire's plain string genre (string | null — the backend
		* Literal does not survive the wire as a type) onto the view union.
		* Out-of-vocabulary values return undefined (callers fall back) — never a
		* silent cast: an unknown genre must NOT masquerade as a known one. */
		function narrowGenre$1(g) {
			return CARD_GENRES$1.find((genre) => genre === g);
		}
		/** CN type keys a family declares — derived from its ``modifiers:`` block
		* (kind=controlnet options; the ONLY source of truth, Phase A finalé).
		* ServicePicker advertises CN support per tile from this — the "weird
		* reason" most models show no CN subcards: only families that declare a
		* controlnet kind have CN support (DiT models without compatible CN
		* trainings correctly declare nothing). */
		function controlnetTypesOf$1(family) {
			return ((family?.modifiers ?? []).find((m) => m.kind === "controlnet")?.options ?? []).map((o) => ({
				type: o.value,
				label: o.label
			}));
		}
		/** Subscribe to catalog readiness. Called when the catalog transitions from
		* null → populated. Returns an unsubscribe fn. R-S10 (2026-10-22): the
		* guard honors the doc — background TTL refreshes (setState with a new
		* catalog) re-fire nothing; only the null → populated transition fires. */
		function onCatalogReady$1(fn) {
			return catalogStore$1.subscribe((next, prev) => {
				if (!prev.catalog && next.catalog) fn();
			});
		}
		/** True after the catalog has been successfully loaded at least once. */
		function isCatalogLoaded$1() {
			return catalogStore$1.getState().loaded;
		}
		/** Fetch the model catalog. THROWS on non-2xx (no silent empty `{}`).
		* The caller MUST surface the error. Returning a fake empty catalog here
		* is what hid every "model dropdown is empty" bug — the user saw nothing
		* and the console warning was invisible. Loud failure is honest. */
		/** The ONE ingest gate (2026-08-11): validate BEFORE caching.
		* A catalog that violates the contract is a BACKEND bug — reported to the
		* contract store, NEVER cached, and the caller gets a
		* CatalogContractError (ensureCatalog will not auto-retry it). */
		function _ingest$1(data) {
			const { valid, violations } = validateCatalogContract$1(data);
			if (!valid) throw new CatalogContractError$1(violations);
			useCatalogContractStore$1.getState().reportOk();
			const catalog = data;
			_cacheTime$1 = Date.now();
			catalogStore$1.setState({
				catalog,
				loaded: true
			});
			return catalog;
		}
		async function loadCatalog$1(opts) {
			const cached = catalogStore$1.getState().catalog;
			if (cached && !opts?.force) {
				if (Date.now() - _cacheTime$1 > _CACHE_TTL_MS$1 && !_inflight$5) _inflight$5 = (async () => {
					try {
						_ingest$1(await apiJson$1("/v1/model-catalog"));
					} catch (e) {
						if (e instanceof CatalogContractError$1) useCatalogContractStore$1.getState().reportViolation(e.violations);
						else useCatalogContractStore$1.getState().reportError(e instanceof Error ? e.message : String(e));
					}
					return catalogStore$1.getState().catalog;
				})().finally(() => {
					_inflight$5 = null;
				});
				return cached;
			}
			if (_inflight$5) return _inflight$5;
			_inflight$5 = (async () => {
				try {
					return _ingest$1(await apiJson$1("/v1/model-catalog"));
				} catch (e) {
					if (e instanceof CatalogContractError$1) useCatalogContractStore$1.getState().reportViolation(e.violations);
					else useCatalogContractStore$1.getState().reportError(e instanceof Error ? e.message : String(e));
					throw e;
				}
			})().finally(() => {
				_inflight$5 = null;
			});
			return _inflight$5;
		}
		/** Fire-and-forget background load with auto-retry. If the first attempt
		* fails (gateway reloading, network blip), schedules a retry after 3s.
		* Keeps trying until the catalog loads, then notifies subscribers.
		* Safe to call multiple times — collapses into a single inflight request. */
		function ensureCatalog$1() {
			if (catalogStore$1.getState().loaded) return;
			if (_inflight$5) return;
			loadCatalog$1().then(() => {
				if (_bgRetryTimer$1) {
					clearTimeout(_bgRetryTimer$1);
					_bgRetryTimer$1 = null;
				}
			}).catch((e) => {
				if (e instanceof CatalogContractError$1) {
					console.error("[modelCatalog] catalog contract violation — not auto-retrying:", e.message);
					return;
				}
				console.warn("[modelCatalog] load failed, will retry in 3s:", e);
				if (_bgRetryTimer$1) clearTimeout(_bgRetryTimer$1);
				_bgRetryTimer$1 = setTimeout(() => {
					_bgRetryTimer$1 = null;
					ensureCatalog$1();
				}, 3e3);
			});
		}
		function getCachedCatalog$1() {
			return catalogStore$1.getState().catalog;
		}
		/** Seed the cache with pre-fetched data (test utility — production code uses
		* loadCatalog/ensureCatalog which fetch from the endpoint). Lets tests inject
		* a fake catalog without going to the network. */
		function primeCatalog$1(data) {
			catalogStore$1.setState({
				catalog: data,
				loaded: true
			});
		}
		/**
		* For route keys that are NOT top-level catalog entries (e.g. a quant-tier
		* sibling that only appears as a variant route on its parent), find the
		* parent model that owns the route via its ``variants:`` block.
		*/
		function parentModelForRoute$1(routeKey, cat) {
			for (const [key, spec] of Object.entries(cat.models)) if ((spec.variants ?? []).some((v) => v.route === routeKey)) return key;
		}
		function familyOf$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			if (!cat?.models) return void 0;
			const own = cat.models[routeKey]?.family;
			if (own) return own;
			const parent = parentModelForRoute$1(routeKey, cat);
			return parent ? cat.models[parent].family : void 0;
		}
		function studioOf$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf$1(routeKey, cat);
			if (!fam) return void 0;
			return cat.families?.[fam]?.studio ?? void 0;
		}
		/**
		* The catalog-declared FORM for a route key (the model's ``form`` — the
		* same id _FORM_CONFIGS keys by on the backend). Resolves variants to
		* their parent model like familyOf. The tag routes the model's
		* editor surface (the FORM LAW: a model without a form cannot route
		* or render). The 2026-09-18 retirement: the retired per-form alias
		* tables are gone — forms no longer reshape slot keys.
		*/
		function formOf$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			if (!cat?.models) return void 0;
			const own = cat.models[routeKey]?.form;
			if (own) return own;
			const parent = parentModelForRoute$1(routeKey, cat);
			return parent ? cat.models[parent].form : void 0;
		}
		function familyLabel$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf$1(routeKey, cat);
			if (!fam) return routeKey;
			return cat.families?.[fam]?.label ?? routeKey;
		}
		/**
		* The family-declared media genre for a route key. Resolves model routes
		* AND raw family ids (``detect``) — the catalog passthrough
		* emits ``genre:`` verbatim. Non-catalog services (trellis, kimodo, yaml
		* brick families) return undefined → callers fall back to their generic
		* badge. The schema-driven replacement for engine-name substring
		* classifiers.
		*/
		function familyGenre$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf$1(routeKey, cat);
			return narrowGenre$1((fam ? cat.families?.[fam]?.genre : void 0) ?? cat.families?.[routeKey]?.genre);
		}
		/**
		* The source-media types a family declares it ingests (FamilyEntry.accepts,
		* a closed literal on the backend). Returns the declared list, or
		* [] when the family declares none / is unknown.
		*
		* THE READER TODAY, STATED HONESTLY (the accepts-consumer audit,
		* 2026-10-10): this gate is SERVED (catalogEmission puts the DECL's
		* accepts on the /v1/model-catalog families block) and READ here,
		* but the promised last-mile consumer — a canvas drop handler
		* spawning an input card only for accepted media types — does not
		* exist in this checkout (the drop surface targets card slots via
		* the shared ASSET_DRAG_MIME contract, never spawns). The DECL's
		* truth is not a lie; the old comment's consumer was. The wiring
		* is owed work on the ROADMAP (canvas drop-spawn), and this
		* reader is the gate it will call — never a free-coded
		* isImageFile prefix check. (authored 2026-08-09; corrected
		* 2026-10-10)
		*/
		function familyAccepts$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf$1(routeKey, cat);
			return cat.families?.[fam ?? routeKey]?.accepts ?? [];
		}
		/**
		* The media-type→param applicability matrix for a family's gated source
		* params: {paramName → [media types it applies to]}. Returns {} when the
		* family declares no transforms / is unknown. The InputCardEditor gates
		* field renders on this (no trim control for an image — no time axis) and
		* applySource strips params whose declared types no longer include the new
		* source's type — both driven ENTIRELY by this declaration, no hardcoded
		* image/video/audio branches. ONE source (input_prep.yaml transforms:),
		* TWO consumers (this editor + backend _validate_params_for_media), zero
		* drift. (2026-08-09)
		*/
		function familyTransformMatrix$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf$1(routeKey, cat);
			const transforms = cat.families?.[fam ?? routeKey]?.transforms;
			if (!transforms) return {};
			const out = {};
			for (const t of transforms) out[t.name] = t.applies_to;
			return out;
		}
		/**
		* The family's declared video conditioning slots ([first_frame,
		* last_frame] for ltx) —
		* schema-driven input-wiring labels (no engine-name classifiers).
		*/
		/**
		* The compact card's declared size line (FamilyEntry.card_summary, a
		* validated block on the backend). Returns {width_param, height_param}
		* for generation families (rendered "WxH") OR {size_param, size_suffix} for
		* the Enhance / upscale families (rendered as a single value), or null when
		* the family declares no size line / is unknown. The CardTile reads whichever
		* is declared — no free-coded per-family dimension logic in the view.
		* (2026-08-09; size_param added 2026-08-10.)
		*/
		function familyCardSummary$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf$1(routeKey, cat);
			return cat.families?.[fam ?? routeKey]?.card_summary ?? null;
		}
		function familyConditioning$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf$1(routeKey, cat);
			if (!fam) return void 0;
			return cat.families?.[fam]?.video?.conditioning ?? void 0;
		}
		/**
		* The family's declared optional outputs (Option A — the optional-outputs
		* vocabulary). Empty/undefined when the family declares none (legacy
		* single-output compat). Consumers render one editor per entry, keyed by
		* ``genre`` — the input card no longer declares any (mask removed
		* 2026-08-14), so this is the vocabulary for OTHER families that do.
		*/
		function familyOptionalOutputs$1(familyId, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			return cat.families?.[familyId]?.optional_outputs ?? [];
		}
		/**
		* The catalog-declared Canvas default model route — the model whose entry
		* carries ``canvas_default: true`` (krea-2). Replaces the hardcoded
		* CANVAS_DEFAULT_MODEL; returns undefined before the catalog loads (the
		* caller keeps its own pre-catalog bootstrap value).
		*/
		function canvasDefaultModel$1(cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			return Object.entries(cat.models).find(([, m]) => m.canvas_default)?.[0];
		}
		/** Display name for a model within its family variant picker (Turbo / Base / Raw / …). */
		function variantLabel$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const m = cat.models?.[routeKey];
			return m?.variant_label ?? m?.label ?? routeKey;
		}
		/**
		* One entry per model family that has dropdown-visible members in the given
		* form. The primaryRoute is the catalog-declared `default_model` if present
		* (and visible), else the member whose key equals the family ID, else the
		* first visible member. Used to drive the family-level dropdown and the
		* empty-model seed. The default is FULLY catalog-declared — the frontend
		* never picks a default itself.
		*/
		function familiesForForm$1(formTag, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const visible = dropdownModels$1(formTag, cat);
			const seen = /* @__PURE__ */ new Set();
			const result = [];
			for (const key of visible) {
				const fam = cat.models[key]?.family ?? key;
				if (seen.has(fam)) continue;
				seen.add(fam);
				const members = visible.filter((k) => (cat.models[k]?.family ?? k) === fam);
				const declared = cat.families[fam]?.default_model;
				const primary = (declared && members.includes(declared) ? declared : void 0) ?? members.find((k) => k === fam) ?? members[0];
				result.push({
					familyId: fam,
					primaryRoute: primary,
					label: cat.families[fam]?.label ?? fam
				});
			}
			return result;
		}
		/**
		* Given a route key (including quant-tier variants like z-image-sd-q8),
		* return the family's primary route key — the one to use as the dropdown
		* value so the dropdown always shows the family even when a sub-variant is
		* selected.
		*/
		function familyPrimaryRoute$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf$1(routeKey, cat);
			if (!fam) return routeKey;
			const declared = cat.families[fam]?.default_model;
			if (declared && cat.models[declared]?.family === fam) return declared;
			const members = Object.entries(cat.models).filter(([, s]) => s.family === fam).map(([k]) => k);
			return members.find((k) => k === fam) ?? members[0];
		}
		function modelLabel$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const m = cat.models[routeKey];
			if (!m) return routeKey;
			return m.label ?? cat.families[m.family]?.label ?? routeKey;
		}
		/** Description for a model route, or undefined. Callers provide their own
		* fallback string — this returns `undefined` so `??` works. Reads the
		* `description:` declared on the model's family in the catalog YAML. */
		function modelDescription$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf$1(routeKey, cat);
			if (!fam) return void 0;
			return cat.families?.[fam]?.description ?? void 0;
		}
		function dropdownModels$1(formTag, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const out = [];
			for (const [key, spec] of Object.entries(cat.models)) {
				if (spec.hide_from_dropdown) continue;
				if (formTag) {
					if (spec.form !== formTag) continue;
				} else if (spec.edit_only) continue;
				out.push(key);
			}
			return out.sort();
		}
		function variantSiblings$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf$1(routeKey, cat);
			if (!fam) return routeKey ? [routeKey] : [];
			return Object.entries(cat.models).filter(([, s]) => s.family === fam).map(([k]) => k);
		}
		/**
		* Models hidden from the dropdown because they're reachable only via a
		* variant toggle (e.g. z-image-q5 — picked by clicking the Q5 button).
		*/
		function hiddenFromDropdown$1(cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			return new Set(Object.entries(cat.models).filter(([, m]) => m.hide_from_dropdown).map(([k]) => k));
		}
		/**
		* The ``variants:`` list for a model — resolves through the parent if the
		* route key is a quant-tier sibling (e.g. z-image-q5 inherits z-image's
		* variants). Returns ``[]`` for models without variants.
		*/
		function variantsForRoute$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const own = cat.models[routeKey]?.variants;
			if (own) return own;
			const parent = parentModelForRoute$1(routeKey, cat);
			return parent ? cat.models[parent].variants : [];
		}
		/**
		* The route's served recipe presets — the LOAD-TIME per-route merge
		* (2026-08-18, compose model): every route's ``presets`` dict is the
		* head base layer (presets/ on the model head) ⊕ the owning variant's
		* layer (variants/<vid>/presets/), both only_routes-filtered AT LOAD
		* (variant wins on id collision). Own-only read: the backend attaches
		* the merged dict to EVERY route, so a fallback chain (tree-head scan,
		* the retired family-block carve-out) would be a second precedence —
		* the exact two-sources drift the composer's contract forbids. The
		* card and the run door read the SAME per-route dict, so the
		* h3-timeline incident dies by construction. only_routes gating is
		* not re-derived here — the wire never carries a gated-out preset.
		*/
		function presetsForRoute$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const own = cat.models[routeKey]?.presets;
			return own && typeof own === "object" && Object.keys(own).length > 0 ? own : void 0;
		}
		/**
		* Find the variant whose route matches ``routeKey`` — used to highlight the
		* active toggle when the form is hydrated from saved state.
		*/
		function activeVariantForRoute$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const ownList = variantsForRoute$1(routeKey, cat);
			const own = ownList.find((v) => v.route === routeKey && (v.group ?? "Quant") === "Quant") ?? ownList.find((v) => v.route === routeKey);
			if (own) return own;
			for (const spec of Object.values(cat.models)) {
				const list = spec.variants ?? [];
				const hit = list.find((v) => v.route === routeKey && (v.group ?? "Quant") === "Quant") ?? list.find((v) => v.route === routeKey);
				if (hit) return hit;
			}
		}
		/**
		* The matrix coordinates of a route within its family's variant grid —
		* the values that distinguish it from its siblings. Read from the model
		* spec's ``variant`` (Turbo / Raw / Distilled / Base …) and ``quant``
		* (fp8 / q8 / q5 …) fields, resolving the FP8 default's quant through
		* its variant entries (the default route omits ``quant:`` since it IS
		* the fp8 tier).
		*
		* This is the ONE model for how variant axes compose (2026-08-08): every
		* axis is a labeled toggle row declared in ``variant_groups``, and the
		* routes are the cells of the grid. Krea 2 = Variant (Turbo/Raw) × Quant
		* (FP8/Q8/Q5) → 6 routes. The composer below switches one axis while
		* preserving the others.
		*/
		function routeCoordinates$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const m = cat.models[routeKey];
			return {
				variant: m?.variant ?? void 0,
				quant: m?.quant ?? activeVariantForRoute$1(routeKey, cat)?.quant ?? void 0
			};
		}
		/**
		* Resolve the route that combines the clicked variant's axis with the
		* current route's OTHER axes. Scans the family's routes (including the
		* ``hide_from_dropdown`` quant siblings) for the coordinate match, so
		* clicking "Raw" while on Turbo+Q8 lands on Raw+Q8 — never Raw+FP8.
		*
		* Group → axis mapping: a ``Quant`` group switches the quant tier (base
		* variant preserved); a ``Variant`` group switches the base variant (quant
		* preserved). The vocabulary is closed to Variant/Quant (the
		* canonical variant-group law, 2026-08-09 — "Speed" was a duplicate name for
		* the Variant axis). Patch-only entries (Lightning/Standard LoRA style)
		* with no ``route:`` never reach here — the caller handles those as draft
		* overlays.
		*
		* Falls back to the clicked entry's own ``route`` when no matrix sibling
		* matches (single-axis families, or a quant tier with no sibling for the
		* target variant). This is the ONE composition path — there is no longer
		* a separate sibling-picker (2026-08-08).
		*/
		/** The wanted matrix coordinates after one axis switch — the ONE
		* derivation shared by the composer and the existence check (a second
		* copy of this arithmetic would be the exact two-sources drift the
		* composer's contract forbids). A ``Quant`` click keeps the current
		* variant and takes the clicked quant; a ``Variant`` click keeps the
		* current quant and takes the clicked variant. */
		function axisWants$1(currentRoute, clicked, cat) {
			const cur = routeCoordinates$1(currentRoute, cat);
			const tgt = routeCoordinates$1(clicked.route, cat);
			const switchesQuant = clicked.group === "Quant";
			return {
				variant: switchesQuant ? cur.variant : tgt.variant ?? cur.variant,
				quant: switchesQuant ? clicked.quant ?? tgt.quant : cur.quant
			};
		}
		/** The ONE matrix-cell lookup: the route in ``fam`` whose coordinates are
		* exactly (variant, quant), or undefined when no such cell exists. */
		function matrixCell$1(fam, variant, quant, cat) {
			for (const [key, spec] of Object.entries(cat.models)) {
				if ((spec.family ?? key) !== fam) continue;
				const rc = routeCoordinates$1(key, cat);
				if (rc.variant === variant && rc.quant === quant) return key;
			}
		}
		function composeVariantRoute$1(currentRoute, clicked, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf$1(currentRoute, cat);
			const clickedRoute = clicked.route;
			if (!fam || !clickedRoute) return clickedRoute ?? currentRoute;
			const wants = axisWants$1(currentRoute, clicked, cat);
			return matrixCell$1(fam, wants.variant, wants.quant, cat) ?? clickedRoute;
		}
		/**
		* Only-existing-combinations (2026-08-16 — "ONLY show models combinations
		* that exist"): does clicking `clicked` from `currentRoute` land on a
		* REAL catalog cell?
		*
		* Derives the SAME wanted coordinates as the composer (axisWants — one
		* derivation) and asks the matrix directly whether that cell exists
		* (matrixCell). This is NOT derivable from composeVariantRoute's return:
		* the composer falls back to ``clicked.route`` when the cell is missing,
		* so a phantom combo and a real one return the same string — the silent
		* sibling-axis switch the fallback causes is exactly the phantom
		* combination this check keeps OUT of the axis dropdowns.
		*
		* Patch-only variants (no ``route``) always compose — they layer onto
		* whatever cell is active, so they always exist. An unresolvable family
		* (catalog not loaded yet) also passes: without the matrix we cannot
		* positively know a cell is missing, and the served variants list is
		* itself catalog-derived — hiding is only correct on positive evidence.
		*/
		function axisCellExists$1(currentRoute, clicked, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			if (!clicked.route) return true;
			const fam = familyOf$1(currentRoute, cat);
			if (!fam) return true;
			const wants = axisWants$1(currentRoute, clicked, cat);
			return matrixCell$1(fam, wants.variant, wants.quant, cat) !== void 0;
		}
		/**
		* True when the family owns its version axis via a declared ``Variant``
		* group (Krea 2 Turbo/Raw, …). The legacy sibling-picker defers to the
		* matrix system in that case so the two never render duplicate rows
		* (2026-08-08 — one system, not two).
		*/
		function familyHasVariantAxis$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf$1(routeKey, cat);
			const groups = fam ? cat.families?.[fam]?.variant_groups : void 0;
			return !!groups && "Variant" in groups;
		}
		var CARD_GENRES$1, catalogStore$1, _cacheTime$1, _CACHE_TTL_MS$1, _inflight$5, _bgRetryTimer$1;
		var init_modelCatalog$1 = __esmMin((() => {
			init_api$1();
			init_catalogContract$1();
			init_catalogContractStore$1();
			init_clientStore$1();
			CARD_GENRES$1 = [
				"image",
				"video",
				"audio",
				"3d",
				"motion",
				"other",
				"text"
			];
			catalogStore$1 = createClientStore$1({
				catalog: null,
				loaded: false
			});
			_cacheTime$1 = 0;
			_CACHE_TTL_MS$1 = 3e4;
			_inflight$5 = null;
			_bgRetryTimer$1 = null;
			/* v8 ignore next -- module warm-load runs only in browser builds
			* (Vite sets MODE to exactly "development"/"production"); under vitest
			* MODE is "test", and under a plain-Node import (the release probe)
			* import.meta.env is undefined — both arms never reach the load, so
			* no fetch fires and no retry timer keeps the process alive
			* (2026-09-12). */
			if ({}.env?.MODE === "development" || {}.env?.MODE === "production") ensureCatalog$1();
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/catalogContractStore.ts
		/** Wall-clock stamp for error surfaces — a once-only toast may outlive the
		*  outage that produced it, so the operator should also see WHEN it fired.
		*  24h local time, seconds resolution. */
		function _stamp$1() {
			return (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour12: false });
		}
		/** Sink-safe toast for the STORE report paths (audit R-S4, 2026-10-22):
		*  `contractToast` stays loud for direct callers — an unwired sink must
		*  surface — but the outcome paths themselves must never throw through
		*  their result. At cold boot the module-warm ensureCatalog can race the
		*  entry face that wires the sink; an unwired reportOk used to throw
		*  BEFORE catalogStore.setState — a healthy load rejected and every
		*  retry re-failed. The toast is lost + logged here; the record stands.
		*/
		function _reportToast$1(type, message, action) {
			try {
				contractToast$1(type, message, action);
			} catch (err) {
				console.error("[catalogContract] toast not delivered (sink unwired):", message, err);
			}
		}
		/** Retry = force re-fetch the catalog (bypasses the TTL cache), which
		*  re-validates + re-reports. Lazy import: modelCatalog imports THIS store
		*  (for CatalogContractError reporting) — a static import would be circular. */
		function retryCatalog$1() {
			Promise.resolve().then(() => (init_modelCatalog$1(), modelCatalog_exports$1)).then(({ loadCatalog }) => loadCatalog({ force: true })).catch((err) => {
				console.error("[catalogContract] retryCatalog failed:", err);
			});
		}
		var IDLE$1, _lastToastedOutage$1, useCatalogContractStore$1;
		var init_catalogContractStore$1 = __esmMin((() => {
			init_clientStore$1();
			init_contractToast$1();
			IDLE$1 = {
				state: "idle",
				violations: [],
				error: null
			};
			_lastToastedOutage$1 = null;
			useCatalogContractStore$1 = createClientStore$1((set, get) => ({
				record: IDLE$1,
				reportOk: () => {
					const wasOutage = get().record.state === "error";
					_lastToastedOutage$1 = null;
					set({ record: {
						state: "loaded",
						violations: [],
						error: null
					} });
					if (wasOutage) _reportToast$1("info", `Catalog back online (at ${_stamp$1()}).`);
				},
				reportViolation: (violations) => {
					console.error(`[catalogContract] catalog contract violation (at ${_stamp$1()}):`, violations);
					set({ record: {
						state: "violation",
						violations,
						error: null
					} });
					const first = violations[0];
					_reportToast$1("error", `Catalog contract violation — ${first ? first.kind && first.kind !== "catalog" ? `${first.kind}: ${first.message}` : first.message : "the catalog response did not match the expected shape"} (at ${_stamp$1()}). Some models may be missing. Retry re-fetches the catalog.`, {
						label: "Retry",
						onClick: retryCatalog$1
					});
				},
				reportError: (message) => {
					const clean = message.trim();
					console.error(`[catalogContract] catalog fetch failed (at ${_stamp$1()}):`, clean);
					set({ record: {
						state: "error",
						violations: [],
						error: clean
					} });
					if (clean === _lastToastedOutage$1) return;
					_lastToastedOutage$1 = clean;
					_reportToast$1("error", `Catalog unavailable — ${clean} (at ${_stamp$1()}). Retry re-fetches the catalog.`, {
						label: "Retry",
						onClick: retryCatalog$1
					});
				},
				clear: () => {
					_lastToastedOutage$1 = null;
					set({ record: IDLE$1 });
				}
			}));
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/runStatusContract.ts
		/** Validate a status payload against the ONE status-channel contract.
		* Accepts a parsed body of ANY response (200 or non-ok) — the caller
		* decides what a violation means on its branch. */
		function validateRunStatusContract$1(payload) {
			const violations = [];
			if (!isObj$2(payload)) return {
				valid: false,
				violations: [{
					field: "body",
					kind: "shape",
					message: "Status payload is not an object — this is an error body, not a contract."
				}]
			};
			if (typeof payload.run_id !== "string" || !payload.run_id) violations.push({
				field: "run_id",
				kind: "missing",
				message: "Status payload has no run_id — it cannot identify the run."
			});
			if (typeof payload.status !== "string" || !RUN_STATUSES$1.has(payload.status)) violations.push({
				field: "status",
				kind: "invalid",
				message: `Run-level status ${JSON.stringify(payload.status)} is not in the backend vocabulary (${[...RUN_STATUSES$1].join(", ")}).`
			});
			if (!Array.isArray(payload.stages)) violations.push({
				field: "stages",
				kind: "missing",
				message: "Status payload has no stages array — stage progress cannot be located."
			});
			else payload.stages.forEach((stage, i) => {
				if (!isObj$2(stage)) {
					violations.push({
						field: `stages.${i}`,
						kind: "shape",
						message: `Stage ${i} is not an object.`
					});
					return;
				}
				const core = [
					["id", stage.id],
					["name", stage.name],
					["index", stage.index],
					["status", stage.status]
				];
				for (const [field, value] of core) if (field === "index" ? typeof value !== "number" : typeof value !== "string") violations.push({
					field: `stages.${i}.${field}`,
					kind: "missing",
					message: `Stage ${i} has no ${field} — the stage cannot be rendered.`
				});
			});
			return {
				valid: violations.length === 0,
				violations
			};
		}
		/** True when a non-ok body carries the backend's contract-violation
		* signature (flow_status 500s: {error, run_id, violations: [...]}). */
		function hasViolationsSignature$1(body) {
			return isObj$2(body) && Array.isArray(body.violations);
		}
		var _RUN_STATUS_VALUES$1, RUN_STATUSES$1, RunStatusContractError$1, isObj$2;
		var init_runStatusContract$1 = __esmMin((() => {
			_RUN_STATUS_VALUES$1 = [
				"pending",
				"running",
				"completed",
				"failed",
				"stopped",
				"interrupted",
				"unknown",
				"queued"
			];
			RUN_STATUSES$1 = new Set(_RUN_STATUS_VALUES$1);
			RunStatusContractError$1 = class extends Error {
				constructor(runId, violations) {
					super(`Run status contract violation for ${runId} (${violations.length}): ${violations[0]?.message ?? "unknown"}`);
					this.name = "RunStatusContractError";
					this.violations = violations;
				}
			};
			isObj$2 = (v) => v != null && typeof v === "object" && !Array.isArray(v);
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/runStatusContractStore.ts
		/** Re-poll the run — the toast's Retry action. Recovered → clear; still
		*  bad → re-report (a fresh toast). Lazy import: FlowProtocol pulls the
		*  whole protocol layer; the store only needs it on click. */
		function repoll$1(runId) {
			if (repollInFlight$1.has(runId)) return;
			repollInFlight$1.add(runId);
			Promise.resolve().then(() => (init_FlowProtocol(), FlowProtocol_exports)).then(({ pollFlowRun }) => pollFlowRun(runId, void 0, {
				maxWaitMs: 3e4,
				intervalMs: 2e3
			})).then(() => useRunStatusContractStore$1.getState().clear()).catch((err) => {
				console.error("[runStatusContract] repoll failed:", runId, err);
			}).finally(() => {
				repollInFlight$1.delete(runId);
			});
		}
		function toastVerdict$1(v) {
			const toast = contractToast$1;
			if (v.kind === "violation") {
				const first = v.violations[0]?.message ?? "the status response did not match the expected shape";
				toast("error", `Run ${v.runId}: ${v.violations.length} contract issue(s) — ${first}. Retry to re-check, or re-run the card.`, {
					label: "Retry",
					onClick: () => repoll$1(v.runId)
				});
			} else toast("error", `Run ${v.runId}: status channel error — ${v.message}. Retry to re-check.`, {
				label: "Retry",
				onClick: () => repoll$1(v.runId)
			});
		}
		var repollInFlight$1, useRunStatusContractStore$1;
		var init_runStatusContractStore$1 = __esmMin((() => {
			init_clientStore$1();
			init_contractToast$1();
			repollInFlight$1 = /* @__PURE__ */ new Set();
			useRunStatusContractStore$1 = createClientStore$1((set) => ({
				verdict: null,
				reportViolation: (runId, violations) => {
					console.error("[runStatusContract] status channel violation:", runId, violations);
					const verdict = {
						kind: "violation",
						runId,
						violations
					};
					set({ verdict });
					toastVerdict$1(verdict);
				},
				reportError: (runId, message) => {
					console.error("[runStatusContract] status channel error:", runId, message);
					const verdict = {
						kind: "error",
						runId,
						message
					};
					set({ verdict });
					toastVerdict$1(verdict);
				},
				clear: () => set({ verdict: null })
			}));
		}));
		//#endregion
		//#region ../../web-kit/contracts/lib/extraKeys.js
		/** THE TYPED WRITE — declarations pass their literal through this
		*  so an unknown key or malformed value fails EVERY wall: tsc at
		*  the literal, this throw at runtime (spread arms), the boot
		*  validator on any served envelope, and the estate law suite on
		*  the wire. Never a silently dead write. */
		function bag(b) {
			const where = "extra bag";
			for (const key of Object.keys(b)) if (!EXTRA_KEY_SET.has(key)) throw new Error(where + " carries '" + key + "' — not in the contract's vocabulary (packages/web-kit/contracts/src/extraKeys.ts). A key outside the table has no reader spelling and would be a silent dead write. Add it to EXTRA_KEYS with its type and owners, or fix the spelling.");
			const str = (k) => {
				const v = b[k];
				if (v !== void 0 && typeof v !== "string") throw new Error(where + "." + k + " must be a string — got " + JSON.stringify(v));
			};
			const num = (k) => {
				const v = b[k];
				if (v !== void 0 && typeof v !== "number") throw new Error(where + "." + k + " must be a number — got " + JSON.stringify(v));
			};
			const bool = (k) => {
				const v = b[k];
				if (v !== void 0 && typeof v !== "boolean") throw new Error(where + "." + k + " must be a boolean — got " + JSON.stringify(v));
			};
			str("group");
			str("visible_when");
			str("tooltip");
			str("placeholder");
			str("optionsFrom");
			str("wtype");
			str("zone");
			str("media");
			bool("required");
			bool("hidden");
			bool("serveDefault");
			num("width");
			num("columns");
			num("max_stack");
			{
				const v = b["order"];
				if (v !== void 0 && v !== null && typeof v !== "number") throw new Error(where + ".order must be a number or null — got " + JSON.stringify(v));
			}
			{
				const v = b["families"];
				if (v !== void 0 && (!Array.isArray(v) || v.some((x) => typeof x !== "string"))) throw new Error(where + ".families must be a string[] — got " + JSON.stringify(v));
			}
			if (b.wtype !== void 0 && !WTYPE_SET.includes(b.wtype)) throw new Error(where + " carries wtype '" + b.wtype + "' — not in WTYPE_SET. The renderer has no arm for it (a foreign wtype silently renders as a plain text input). Add it to WTYPE_SET with its seat, or fix the spelling.");
			if (b.zone !== void 0 && !ZONE_SET.includes(b.zone)) throw new Error(where + " carries zone '" + b.zone + "' — not in ZONE_SET (" + ZONE_SET.join(", ") + ").");
			if (b.media !== void 0 && !MEDIA_SET.includes(b.media)) throw new Error(where + " carries media '" + b.media + "' — not in MEDIA_SET (" + MEDIA_SET.join(", ") + ").");
			if (b.options !== void 0) {
				const seen = /* @__PURE__ */ new Set();
				for (const row of b.options) {
					const value = typeof row === "string" ? row : row.value;
					const label = typeof row === "string" ? row : row.label;
					if (value === "") throw new Error(where + ".options carries an empty value");
					if (label === "") throw new Error(where + ".options row '" + value + "' carries an empty label");
					if (seen.has(value)) throw new Error(where + ".options carries duplicate value '" + value + "' — an ambiguous pick");
					seen.add(value);
				}
			}
			if (b.visible_when !== void 0 && b.visible_when !== "") for (const guard of b.visible_when.split("&")) {
				const g = guard.trim();
				const ne = g.indexOf("!=");
				const eq = ne >= 0 ? -1 : g.indexOf("=");
				if (ne < 0 && eq < 0) throw new Error(where + ".visible_when guard '" + g + "' carries no operator (= or !=)");
				const at = ne >= 0 ? ne : eq;
				const key = g.slice(0, at).trim();
				const rhs = g.slice(at + (ne >= 0 ? 2 : 1)).trim();
				if (key === "") throw new Error(where + ".visible_when guard '" + g + "' carries an empty key");
				if (rhs === "") throw new Error(where + ".visible_when guard '" + g + "' carries an empty value");
			}
			return b;
		}
		/** THE TYPED READ — one getter for every face. `extraOf(node)`
		*  narrows a serialized ref node's meta.extra to the bag type;
		*  faces read keys off the result, never off a bare record. */
		function extraOf(node) {
			const raw = node?.meta?.["extra"];
			if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
			const w = raw["wtype"];
			if (w !== void 0 && w !== "" && !WTYPE_SET.includes(w)) throw new Error("serialized extra carries wtype '" + String(w) + "' — not in WTYPE_SET. The renderer has no arm for it (add it with its seat, or fix the spelling).");
			return raw;
		}
		var EXTRA_KEYS, EXTRA_KEY_SET, WTYPE_SET, WTYPE_SEATS, MEDIA_SET, ZONE_SET, ROLE_SET;
		var init_extraKeys = __esmMin((() => {
			EXTRA_KEYS = [
				"order",
				"group",
				"zone",
				"wtype",
				"width",
				"columns",
				"visible_when",
				"required_when",
				"tooltip",
				"required",
				"hidden",
				"families",
				"max_stack",
				"media",
				"placeholder",
				"options",
				"optionsFrom",
				"serveDefault",
				"default"
			];
			EXTRA_KEY_SET = new Set(EXTRA_KEYS);
			WTYPE_SET = [
				"number",
				"select",
				"slider",
				"text",
				"textarea",
				"boolean",
				"image",
				"file",
				"mesh",
				"image_list",
				"mask",
				"loras",
				"ip_adapters",
				"controlnets"
			];
			WTYPE_SEATS = {
				number: "atom",
				select: "atom",
				slider: "atom",
				text: "atom",
				textarea: "atom",
				boolean: "atom",
				image: "atom",
				file: "atom",
				mesh: "atom",
				image_list: "rail",
				mask: "mod-face",
				loras: "mod-face",
				ip_adapters: "mod-face",
				controlnets: "mod-face"
			};
			MEDIA_SET = [
				"video",
				"audio",
				"mod"
			];
			ZONE_SET = [
				"inputs",
				"params",
				"mods"
			];
			ROLE_SET = ["path"];
		}));
		//#endregion
		//#region ../../web-kit/contracts/lib/laneRelations.js
		/** THE BLANK LAW (the estate's own): undefined, null, empty or
		*  whitespace string, empty array, empty object = NOT stated. A
		*  number (0 included), a boolean, a non-empty array (mod bag) or
		*  object = stated. Pure, shared by every word. */
		function laneBlank(v) {
			if (v === void 0 || v === null) return true;
			if (typeof v === "string") return v.trim() === "";
			if (Array.isArray(v)) return v.every((entry) => laneBlank(entry));
			if (typeof v === "object") {
				const proto = Object.getPrototypeOf(v);
				if (proto !== null && proto !== Object.prototype) return false;
				return Object.values(v).every((entry) => laneBlank(entry));
			}
			return false;
		}
		/** Judge the four words over one stated state. PURE: no I/O, no
		*  card code — the same call the bench door refuses with and the
		*  form renders inline. Every row fires only on the STATED side of
		*  the law (blank fields never violate requires/together; either_or
		*  stays unarmed until a member is stated — authoring-in-progress
		*  is never a write refusal). */
		function judgeLaneRelations(relations, values) {
			const out = [];
			const stated = (name) => Object.prototype.hasOwnProperty.call(values, name) && !laneBlank(values[name]);
			for (const rel of relations) {
				if (rel === null || typeof rel !== "object") continue;
				for (const row of rel.requires ?? []) {
					if (row === null || typeof row !== "object" || typeof row.field !== "string") continue;
					if (!stated(row.field)) continue;
					const missing = (row.needs ?? []).filter((n) => !stated(n));
					if (missing.length === 0) continue;
					out.push({
						field: row.field,
						message: "field '" + row.field + "' requires " + quote(missing) + " on this lane" + (row.cure !== void 0 && row.cure !== "" ? " — " + row.cure : " — state " + quote(missing) + " too, or drop '" + row.field + "'")
					});
				}
				for (const row of rel.conflicts ?? []) {
					if (row === null || typeof row !== "object") continue;
					if (typeof row.a !== "string" || typeof row.b !== "string") continue;
					if (!stated(row.a) || !stated(row.b)) continue;
					out.push({
						field: row.a,
						message: "fields '" + row.a + "' + '" + row.b + "' conflict on this lane" + (row.cure !== void 0 && row.cure !== "" ? " — " + row.cure : " — drop one of them")
					});
				}
				for (const row of rel.together ?? []) {
					if (row === null || typeof row !== "object") continue;
					const members = Array.isArray(row.fields) ? row.fields : [];
					if (members.length === 0) continue;
					if (!members.some(stated)) continue;
					if (members.filter((m) => !stated(m)).length === 0) continue;
					out.push({
						field: members.find(stated),
						message: "fields " + quote(members) + " ride together on this lane (state all or none)" + (row.cure !== void 0 && row.cure !== "" ? " — " + row.cure : " — state " + quote(members) + " together, or drop " + quote(members))
					});
				}
				for (const row of rel.either_or ?? []) {
					if (row === null || typeof row !== "object") continue;
					const groups = Array.isArray(row.groups) ? row.groups.filter((g) => Array.isArray(g)) : [];
					if (groups.length === 0) continue;
					const everyMember = groups.flat();
					if (!everyMember.some(stated)) continue;
					if (groups.filter((g) => g.every(stated)).length > 0) continue;
					out.push({
						field: everyMember.find(stated),
						message: "this lane takes one of " + groups.map((g) => "(" + quote(g) + ")").join(" or ") + " — the stated combination completes none of them" + (row.cure !== void 0 && row.cure !== "" ? " — " + row.cure : " — state one complete source, or drop the stated half")
					});
				}
				for (const row of rel.at_most_one ?? []) {
					if (row === null || typeof row !== "object") continue;
					const fields = Array.isArray(row.fields) ? row.fields.filter((f) => typeof f === "string") : [];
					if (fields.length < 2) continue;
					const present = fields.filter(stated);
					if (present.length <= 1) continue;
					out.push({
						field: present[1],
						message: "this lane takes at most one of " + quote(fields) + " — the state carries " + present.length + " (" + quote(present) + ")" + (row.cure !== void 0 && row.cure !== "" ? " — " + row.cure : " — one slot, one value")
					});
				}
				for (const row of rel.required ?? []) {
					if (row === null || typeof row !== "object") continue;
					const fields = Array.isArray(row.fields) ? row.fields.filter((f) => typeof f === "string") : [];
					if (row.any_of === true) {
						if (fields.length === 0) continue;
						if (fields.some(stated)) continue;
						out.push({
							field: fields[0],
							message: "this lane requires one of " + quote(fields) + " — none is stated" + (row.cure !== void 0 && row.cure !== "" ? " — " + row.cure : " — state one of them")
						});
						continue;
					}
					const missing = fields.filter((f) => !stated(f));
					if (missing.length === 0) continue;
					out.push({
						field: missing[0],
						message: "this lane requires " + quote(fields) + " — " + quote(missing) + " is not stated" + (row.cure !== void 0 && row.cure !== "" ? " — " + row.cure : " — state it, or use a lane that does not need it")
					});
				}
			}
			const seen = /* @__PURE__ */ new Set();
			return out.filter((v) => {
				if (seen.has(v.message)) return false;
				seen.add(v.message);
				return true;
			});
		}
		/** The unstated-required sentence stem — the opening words of every
		*  violation this judge emits for a required word that is simply
		*  UNSTATED (the incomplete-draft class). Exported as the ONE
		*  spelling every seat tests: the write door's filter (drop the
		*  class at the add seat), the run seat's refusal code (the class
		*  rides card_compose_incomplete, never a run face), and the drafts
		*  domain's one-time heal of rows the old carry poisoned. A text
		*  CARRIES the class when the stem appears anywhere in it — the
		*  judge's own messages open with it, and persisted composites
		*  embed it after the door's prefix.
		* @param text the refusal sentence to classify
		* @returns true when the sentence is the unstated-required voice */
		function isUnstatedRequiredVoice(text) {
			return text.includes(UNSTATED_REQUIRED_STEM);
		}
		/** The heal's stricter twin: the text is the unstated-required class
		* AND NOTHING ELSE. A composite refusal (the judge joins multiple
		* violations with "; ") can carry the stem beside a stated-wrong
		* half — healing that row would erase a REAL failure. The drafts
		* domain's one-time heal runs on persisted rows and must fire only
		* on pure members of the class: every segment passes the stem test
		* or the row keeps its failed face.
		* @param text the persisted refusal sentence to classify
		* @returns true when every segment of the text is the
		*  unstated-required voice */
		function isPurelyUnstatedRequiredVoice(text) {
			if (!isUnstatedRequiredVoice(text)) return false;
			return text.split(/;\s*|\n/).filter((segment) => segment.trim() !== "").every((segment) => isUnstatedRequiredVoice(segment));
		}
		/** Judge the LANE SURFACE (the parameter-surface half of the same
		*  declaration): a STATED card-schema field outside the lane's
		*  declared surface fires nothing at compose — refuse it here, in
		*  the field's voice, a priori. `schemaFields` are the card's own
		*  field names (the walk the claim law already owns); fields the
		*  surface declares but the card does not carry are the claim
		*  law's refusal, never this one. A null surface (the family
		*  declares none) judges nothing — legacy families keep the card's
		*  union table until they declare. */
		function judgeLaneSurface(surface, schemaFields, values) {
			if (surface === null || surface === void 0) return [];
			const declared = new Set(surface);
			const out = [];
			for (const name of schemaFields) {
				if (declared.has(name)) continue;
				if (!Object.prototype.hasOwnProperty.call(values, name)) continue;
				if (laneBlank(values[name])) continue;
				out.push({
					field: name,
					message: "field '" + name + "' fires nothing on this lane (the variant's declared surface is " + (surface.length > 0 ? surface.join(", ") : "empty") + ") — drop it or switch lane"
				});
			}
			return out;
		}
		/** THE LANE MIGRATION CARRY (operator 2026-10-12, the stuck-switch
		*  incident — live on :3088: a CustomVoice draft carrying `voice`,
		*  the variant switched to VoiceDesign, and the write REFUSED
		*  "field 'voice' fires nothing on this lane — drop it or switch
		*  lane" while the form HIDES the voice row on the new lane: the
		*  named cure is unclickable and the switch itself cannot land,
		*  wedging the studio between "the studio shows your edit; the
		*  bench does not").
		*
		*  THE LAW: a lane change is a MIGRATION, not a refusal. A stated
		*  member that the PRIOR lane's surface declared but the new lane's
		*  does not take is stale carry — it rides nothing at compose, so
		*  the write door DROPS it and lands the switch. The a priori
		*  refusal keeps its teeth exactly where they belong: a member
		*  stated on the CURRENT lane that no prior lane declared is
		*  authored state, refused in the field's voice as before. This is
		*  the same blank law judgeLaneSurface already runs — the stale set
		*  is precisely the refusal set ∩ the prior surface. The membership
		*  test rides the SURFACES (the DECL's own vocabulary), never the
		*  card schema walk: surfaces name members the card schema does not
		*  carry flat (voice_name is a mod rider — the schemaNames walk
		*  skipped it and the pair half-survived the first cut of this
		*  law).
		*
		*  @param prevSurface the prior (family × variant) lane's surface —
		*  the lane the state is leaving
		*  @param nextSurface the resolved lane's surface — the lane the
		*  write selects
		*  @param values the MERGED view the write door would judge
		*  @returns the stale member names to delete from the merged view
		*  (empty when the surfaces name no such members). */
		function laneStaleCarry(prevSurface, nextSurface, values) {
			if (prevSurface === null || prevSurface === void 0) return [];
			if (nextSurface === null || nextSurface === void 0) return [];
			const prev = new Set(prevSurface);
			const next = new Set(nextSurface);
			const out = [];
			for (const name of Object.keys(values)) {
				if (next.has(name)) continue;
				if (!prev.has(name)) continue;
				if (laneBlank(values[name])) continue;
				out.push(name);
			}
			return out;
		}
		/** The effective surface for one (family × variant) lane: the
		*  family base plus the variant's additions (the cascade law —
		*  later layers add, never subtract). Null family params = the
		*  family declares no surface (the legacy card-authored truth). */
		function laneSurfaceOf(familyParams, variantParams, cellParams) {
			if (familyParams === void 0 || familyParams === null) return null;
			if ((variantParams === void 0 || variantParams === null) && (cellParams === void 0 || cellParams === null)) return [...familyParams];
			return [.../* @__PURE__ */ new Set([
				...familyParams,
				...variantParams ?? [],
				...cellParams ?? []
			])];
		}
		function laneBoundsOf(familyBounds, variantBounds) {
			if (familyBounds === void 0 || familyBounds === null) return variantBounds === void 0 || variantBounds === null ? null : { ...variantBounds };
			if (variantBounds === void 0 || variantBounds === null) return { ...familyBounds };
			const merged = { ...familyBounds };
			for (const [name, row] of Object.entries(variantBounds)) merged[name] = {
				...familyBounds[name] ?? {},
				...row
			};
			return merged;
		}
		/** Judge the bounds over one stated state. PURE. Blank fields never
		*  violate (the blank law: unstated is the family default's
		*  business, not a refusal); non-numbers are the card schema's own
		*  refusal, never re-voiced here; a stated number outside its row
		*  refuses IN THE FIELD'S VOICE, cure included. */
		function judgeLaneBounds(bounds, values) {
			if (bounds === null) return [];
			const out = [];
			for (const [name, row] of Object.entries(bounds)) {
				if (!Object.prototype.hasOwnProperty.call(values, name)) continue;
				const v = values[name];
				if (laneBlank(v) || typeof v !== "number" || !Number.isFinite(v)) continue;
				const floor = row.min;
				const ceiling = row.max;
				if (!(floor !== void 0 && v < floor) && !(ceiling !== void 0 && v > ceiling)) continue;
				const span = floor !== void 0 && ceiling !== void 0 ? floor + "–" + ceiling : floor !== void 0 ? "at least " + floor : "at most " + ceiling;
				out.push({
					field: name,
					message: "'" + name + "': " + v + " is outside this lane's range (" + span + ") — the model owns the floor and the ceiling (the declaration, not the form)"
				});
			}
			return out;
		}
		/** The variant rail's unknown-variant refusal body — the one
		*  spelling, composed by the door (cardsVariant) and the client
		*  mirror (card-base composeValidate) alike; the FRAME rides the
		*  caller (`card_compose phase N:` at the door, the phase-less
		*  `card_compose:` on the client).
		*
		* @param stated the variant the caller stated, verbatim.
		* @param model the model id the variant pool belongs to.
		* @param known the offered variant ids, door order.
		* @returns the refusal body, frame-free. */
		function unknownVariantVoice(stated, model, known) {
			return "unknown variant " + JSON.stringify(stated) + " for model " + JSON.stringify(model) + " (known: " + known.join(", ") + ")";
		}
		/** The variant rail's unknown-quant refusal body — same contract as
		*  {@link unknownVariantVoice}: one spelling, frame at the caller.
		*
		* @param stated the quant the caller stated, verbatim.
		* @param model the model id the cells belong to.
		* @param variant the variant whose cells were searched.
		* @param known the variant's offered quants, door order; empty
		*  yields the declares-no-cells tail.
		* @returns the refusal body, frame-free. */
		function unknownQuantVoice(stated, model, variant, known) {
			return "unknown quant " + JSON.stringify(stated) + " for model " + JSON.stringify(model) + " variant " + JSON.stringify(variant) + (known.length > 0 ? " (known: " + known.join(", ") + ")" : " (the variant declares no cells)");
		}
		/** THE ROUTE ENVELOPE GATE'S ONE JUDGE (the voice audit, 2026-10-11:
		*  six hand-mirrored spellings, two frames): a stated numeric
		*  steps/cfg outside the selected variant's closed envelope is the
		*  one refusal — the door (cardsVariant's envelopeRefusal) and the
		*  client mirror (card-base composeValidate clause 3) both ask this
		*  judge, never a divergent copy. The skips ride verbatim: a null
		*  envelope, an absent bound, a non-numeric or non-finite statement
		*  never refuse; a stated value inside the closed interval is
		*  caller agency. The married clause and the lane-read tail are the
		*  DOOR's own decorations — callers append what their seat knows.
		*
		* @param stated the caller's raw body — only numeric steps/cfg ride.
		* @param envelope the selected variant's declared envelope, null
		*  when the variant declares none; each bound is the closed
		*  [min, max] pair the DECL law writes.
		* @param variant the selected variant's id and route.
		* @returns the first offending knob with its composed voice, or
		*  null when every stated value sits inside. */
		function judgeSamplerEnvelope(stated, envelope, variant) {
			if (envelope === null) return null;
			for (const knob of ["steps", "cfg"]) {
				const bound = envelope[knob];
				if (bound === void 0) continue;
				const value = stated[knob];
				if (typeof value !== "number" || !Number.isFinite(value)) continue;
				const [lo, hi] = bound;
				if (value >= lo && value <= hi) continue;
				return {
					knob,
					stated: value,
					lo,
					hi,
					voice: "stated " + knob + " " + String(value) + " is OUTSIDE the route envelope for variant " + JSON.stringify(variant.id) + (variant.route !== void 0 && variant.route !== "" ? " (route " + variant.route + ")" : "") + " — the declared envelope is [" + String(lo) + ", " + String(hi) + "]"
				};
			}
			return null;
		}
		/** The envelope refusal's CURE — the sentence that tells the
		*  operator what to do about it. Both seats append it verbatim
		*  after the judge's voice (the door interleaves its marriage
		*  clause between); the cure is one spelling because it is the
		*  half the operator reads.
		*
		* @returns the cure sentence, unpunctuated at both ends. */
		function samplerEnvelopeCure() {
			return "The variant rail owns its sampler marriage: state values inside the envelope, or pick a different route.";
		}
		/** One family's declared lane surface + laws, verbatim. Absent
		*  members stay absent (the absent-equals-empty law: nothing is
		*  invented, and a family that declares nothing yields an empty
		*  base with no relations key). */
		function laneContractOf(decl) {
			const variants = {};
			for (const v of decl.variants ?? []) {
				const cells = {};
				for (const c of v.cells ?? []) if (c.params !== void 0) cells[c.quant] = { params: [...c.params] };
				if (v.params === void 0 && v.relations === void 0 && v.bounds === void 0 && v.sampler_envelope === void 0 && Object.keys(cells).length === 0) continue;
				variants[v.id] = {
					...v.params !== void 0 ? { params: [...v.params] } : {},
					...v.relations !== void 0 ? { relations: v.relations } : {},
					...v.bounds !== void 0 || v.sampler_envelope !== void 0 ? { bounds: envelopeBoundsOf(v.bounds, v.sampler_envelope) } : {},
					...v.sampler_envelope !== void 0 ? { sampler_envelope: v.sampler_envelope } : {},
					...Object.keys(cells).length > 0 ? { cells } : {}
				};
			}
			return {
				...decl.params !== void 0 ? { base: [...decl.params] } : {},
				...decl.relations !== void 0 ? { relations: decl.relations } : {},
				...decl.bounds !== void 0 ? { bounds: decl.bounds } : {},
				variants
			};
		}
		/** THE ROUTE ENVELOPE IS BOUNDS (2026-10-11, the operator's wall:
		* "the entire point of the schema rework was so this was impossible
		* by design"): a variant's sampler_envelope is the SAME closed
		* interval the bench's stamp gate refuses with (envelopeRefusal) —
		* project it into the variant's bounds rows so the form's inline
		* gate, the run gate, and the compose door judge ONE truth. The
		* envelope OWNS both endpoints for steps/cfg (the door is the
		* authority; a family bound that contradicts its own variant's
		* envelope is a DECL bug, and the door's voice wins). Before this,
		* a family that declared only envelopes (krea-2) served bounds
		* null — the form judged NOTHING while the door refused the write
		* 300ms after the press. */
		function envelopeBoundsOf(bounds, envelope) {
			const out = { ...bounds ?? {} };
			if (envelope === void 0) return out;
			if (Array.isArray(envelope.steps) && envelope.steps.length === 2) out.steps = {
				...out.steps ?? {},
				min: envelope.steps[0],
				max: envelope.steps[1]
			};
			if (Array.isArray(envelope.cfg) && envelope.cfg.length === 2) out.cfg = {
				...out.cfg ?? {},
				min: envelope.cfg[0],
				max: envelope.cfg[1]
			};
			return out;
		}
		/** THE CONTRACT MAP for a card's declared families: family id → its
		*  lane contract. Families that declare no params and no laws are
		*  omitted (legacy families judge nothing; serving an empty row
		*  would only cost the agent tokens). */
		function laneContractsFor(familyIds, declOf) {
			const out = {};
			for (const id of familyIds) {
				const decl = declOf(id);
				if (decl === void 0) continue;
				const contract = laneContractOf(decl);
				if ((contract.base ?? []).length === 0 && contract.relations === void 0 && contract.bounds === void 0 && Object.keys(contract.variants).length === 0) continue;
				out[id] = contract;
			}
			return out;
		}
		var RELATION_WORDS, quote, UNSTATED_REQUIRED_STEM;
		var init_laneRelations = __esmMin((() => {
			RELATION_WORDS = {
				requires: true,
				conflicts: true,
				together: true,
				either_or: true,
				at_most_one: true,
				required: true
			};
			quote = (fields) => fields.map((f) => "'" + f + "'").join(" + ");
			UNSTATED_REQUIRED_STEM = "this lane requires ";
		}));
		//#endregion
		//#region ../../web-kit/contracts/lib/FlowTypes.js
		var init_FlowTypes = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/lib/benchResult.js
		/** benchResult.ts — THE BENCH STAGE RESULT CONTRACT (the operator's
		* law, 2026-09-20: "this can all be validated by contract"). The
		* run observer patches this row onto the bench stage; every
		* consumer (the preview harvest, the drill, the studio adapters)
		* reads through this shape. The contract carries its own runtime
		* validator — `benchResultDefects` — and the WRITER asserts it
		* before patching, the READER normalizes through it, and the WALLS
		* pin it against real served bytes. A fixture can lie; a contract
		* pinned to the live shape cannot.
		*
		* THE ONE-FILE-ONE-KEY LAW: every url appears under EXACTLY ONE
		* artifacts key. A file under two keys renders twice — the doubled
		* rowset disease (the legacy 'video' stamp wrote the stage url —
		* which IS gallery[0] — under a second key, so every image-gen
		* result rendered the same picture as hero AND rest-thumb). The
		* primary `url` field may NAME a file that also lives in the map
		* (it is the primary POINTER, not a second key) — but the map's
		* VALUES are unique, always. */
		/** Validate a result row against the contract. Returns the defect
		* list — EMPTY means the row is lawful. Each defect names the law
		* and the offending keys, in the door's own voice. */
		function benchResultDefects(row) {
			if (typeof row !== "object" || row === null || Array.isArray(row)) return ["result: not an object"];
			const r = row;
			const defects = [];
			if (typeof r.run_id !== "string" || r.run_id === "") defects.push("run_id: missing or empty (every result names its run)");
			if (r.url !== void 0 && (typeof r.url !== "string" || r.url === "")) defects.push("url: present but not a non-empty string");
			if (r.artifacts !== void 0) {
				if (typeof r.artifacts !== "object" || r.artifacts === null || Array.isArray(r.artifacts)) defects.push("artifacts: not an object (the name→url map)");
				else {
					const seen = /* @__PURE__ */ new Map();
					for (const [k, v] of Object.entries(r.artifacts)) {
						if (typeof v !== "string" || v === "") {
							defects.push(`artifacts.${k}: not a non-empty string url`);
							continue;
						}
						const keys = seen.get(v) ?? [];
						keys.push(k);
						seen.set(v, keys);
					}
					for (const [url, keys] of seen) if (keys.length > 1) defects.push("one-file-one-key: " + url + " rides " + keys.length + " keys (" + keys.join(", ") + ") — a file under two keys renders twice");
				}
			}
			if (r.reports !== void 0) {
				if (typeof r.reports !== "object" || r.reports === null || Array.isArray(r.reports)) defects.push("reports: not an object (the name→verdict map)");
				else for (const [k, v] of Object.entries(r.reports)) {
					if (typeof v !== "object" || v === null || Array.isArray(v)) {
						defects.push(`reports.${k}: not an object (kind 'report' entry)`);
						continue;
					}
					const rep = v;
					if (rep["kind"] !== "report") defects.push(`reports.${k}: kind is not 'report' (the only entry kind)`);
					if (rep["status"] !== "pass" && rep["status"] !== "fail" && rep["status"] !== "warn") defects.push(`reports.${k}: status is not pass|fail|warn`);
					if (rep["title"] !== void 0 && (typeof rep["title"] !== "string" || rep["title"] === "")) defects.push(`reports.${k}.title: present but not a non-empty string`);
					if (rep["chips"] !== void 0) {
						if (!Array.isArray(rep["chips"])) defects.push(`reports.${k}.chips: not an array`);
						else rep["chips"].forEach((c, i) => {
							if (typeof c !== "string" || c === "") defects.push(`reports.${k}.chips[${String(i)}]: not a non-empty string`);
						});
					}
					if (rep["rows"] !== void 0) {
						if (typeof rep["rows"] !== "object" || rep["rows"] === null || Array.isArray(rep["rows"])) defects.push(`reports.${k}.rows: not an object (the key-value body)`);
						else for (const [rk, rv] of Object.entries(rep["rows"])) if (typeof rv !== "string" && typeof rv !== "number" && typeof rv !== "boolean") defects.push(`reports.${k}.rows.${rk}: not a string|number|boolean`);
					}
				}
			}
			if (r.assetUrls !== void 0) {
				if (!Array.isArray(r.assetUrls)) defects.push("assetUrls: not an array");
				else r.assetUrls.forEach((u, i) => {
					if (typeof u !== "string" || u === "") defects.push(`assetUrls[${String(i)}]: not a non-empty string url`);
				});
			}
			if (r.error !== void 0 && typeof r.error !== "string") defects.push("error: present but not a string");
			return defects;
		}
		/** THE DOWNLOAD FILENAME (the boundary audit's C5, promoted to the
		*  contract by A-M10): a source URL names a file by its PATHNAME's
		*  last segment, percent-decoded — never the query, never the
		*  fragment, never "". `split("/").pop()` kept both, so the manager
		*  downloaded under a clean name while the row inspected one with
		*  "f.safetensors?download=1" glued on, and the post-download check
		*  reported model-not-landed for a model that WAS on disk. A URL
		*  ending in "/" names no file: the result is "" and the caller's
		*  destination check refuses it by name. One derivation, contract-
		*  owned, so the wall can DRIVE it (a source-substring pin passed on
		*  dead code).
		*
		*  THE INPUT IS ABSOLUTE, ALWAYS: the sole caller hands it a cell
		*  artifact's `source_url`, which the DECL contract pins to
		*  `/^https?:\/\//` (models/families/contract.ts, CellArtifact), so
		*  `new URL()` never throws here and a relative spelling cannot
		*  reach this function (the re-audit, 2026-10-16). */
		function artifactFileName(sourceUrl) {
			const pathname = new URL(sourceUrl).pathname;
			if (pathname.endsWith("/")) return "";
			const last = pathname.split("/").filter((s) => s !== "").pop();
			try {
				return decodeURIComponent(last);
			} catch {
				return last;
			}
		}
		var init_benchResult = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/lib/card.js
		var init_card = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/lib/character.js
		var init_character = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/lib/loraTypes.js
		var init_loraTypes = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/lib/mediaTypes.js
		var init_mediaTypes = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/lib/modifierFaces.js
		var init_modifierFaces = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/lib/modifierSubcards.js
		/** Stable drag id. Both entry kinds key by `id` (the lora entry's id IS
		* the adapter catalog id). `?? name` tolerates pre-2026-09-06 drafts so
		* old cards load; the next save rewrites them as id-keyed rows. */
		function subcardId(kind, entry) {
			return kind === "controlnet" ? entry.id ?? "" : `lora-${entry.id ?? entry.name ?? ""}`;
		}
		/** Normalize a wire lora row: id wins, the fossil `name` key migrates.
		* An empty id passes through — compose refuses it loudly; the tile still
		* renders so the operator can see and delete the broken entry. */
		function loraIdOf(entry) {
			return String(entry.id ?? entry.name ?? "").trim();
		}
		/** A fossil `{name, strength}` row (pre-2026-09-06 wire) becomes an
		* id-keyed row — ONE shape leaves every boundary (modal draft, bag
		* commit, run body). The fossil key is dropped, never re-emitted.
		* A row missing `strength` (never emitted by the pre-flip UI, but a
		* hand-edited draft may carry one) takes 1.0 — the same house default
		* the catalog row seeds at compose. A finite `steps` rides verbatim —
		* the step-claiming distinction (service.ts, 007 L2) honors a row
		* that declares it; every other value drops to the catalog default. */
		function normalizeLoraEntry(entry) {
			const steps = typeof entry.steps === "number" && Number.isFinite(entry.steps) ? entry.steps : void 0;
			return {
				id: loraIdOf(entry),
				strength: typeof entry.strength === "number" ? entry.strength : 1,
				...steps !== void 0 ? { steps } : {}
			};
		}
		/** Derive the subcard view from the param bag — a pure projection. */
		function subcardsFromParams(params) {
			const loras = params.loras ?? [];
			const cns = params.controlnets ?? [];
			return [...loras.map((l) => {
				const lid = loraIdOf(l);
				return {
					id: `lora-${lid}`,
					kind: "lora",
					label: loraLabel(lid),
					name: lid,
					enabled: true,
					strength: typeof l.strength === "number" ? l.strength : 1,
					strengthSet: typeof l.strength === "number"
				};
			}), ...cns.map((c) => ({
				id: subcardId("controlnet", c),
				kind: "controlnet",
				label: c.type,
				enabled: c.enabled,
				strength: c.strength,
				type: c.type,
				model: c.model,
				preprocessor: c.preprocessor,
				image_b64: c.image_b64,
				start_percent: c.start_percent,
				end_percent: c.end_percent
			}))];
		}
		/** Human label for a LoRA entry (file base name, extension stripped). */
		function loraLabel(name) {
			return name.split("/").pop().replace(/\.(safetensors|pt|ckpt)$/, "");
		}
		/** Total subcard count on a card — the collapsed-tile "+N" hint. */
		function subcardCount(params) {
			const loras = params.loras ?? [];
			const cns = params.controlnets ?? [];
			return loras.length + cns.length;
		}
		/** Pure array move — the ONLY way order changes (dragEnd → this). */
		function moveItem(arr, from, to) {
			if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
			const next = [...arr];
			const [moved] = next.splice(from, 1);
			next.splice(to, 0, moved);
			return next;
		}
		/**
		* Resolve which declared kind a draggable subcard id belongs to. Walks each
		* LIST-kind's wire array (scalar kinds aren't draggable — no reorder
		* semantics on a single value). Returns the kind spec or null when the id
		* isn't a known subcard (e.g. a stale drag handle). Generic over arbitrary
		* kinds — the param_key comes from the spec, not a hardcoded kind→key map.
		*/
		function kindForId(params, id, kinds) {
			for (const kind of kinds) {
				if (kind.cardinality === "scalar") continue;
				if ((params[kind.param_key] ?? []).some((e) => subcardId(kind.kind, e) === id)) return kind;
			}
			return null;
		}
		/**
		* Apply a drag drop to the param bag. Cross-kind drops are no-ops (each kind
		* has its own wire array at ``params[kind.param_key]``; a LoRA cannot swap
		* places with a ControlNet, nor with a clip_skip). Returns the same params
		* object when nothing moved (stable identity → no re-render).
		*
		* The ``kinds`` list is the declared modifier vocabulary (from
		* modifiersFeatureOf) — the param_key lookup is data-driven, not a hardcoded
		* ``kind === "lora" ? "loras" : "controlnets"`` ternary. A novel kind's drag
		* works the day it's declared, with zero code change here.
		*/
		function applySubcardDrop(params, activeId, overId, kinds) {
			const spec = kindForId(params, activeId, kinds);
			if (!spec) return params;
			if (kindForId(params, overId, kinds)?.kind !== spec.kind) return params;
			const arr = params[spec.param_key];
			const next = moveItem(arr, arr.findIndex((e) => subcardId(spec.kind, e) === activeId), arr.findIndex((e) => subcardId(spec.kind, e) === overId));
			return next === arr ? params : {
				...params,
				[spec.param_key]: next
			};
		}
		function newCnId() {
			_cnIdCounter += 1;
			return `cn-${Date.now().toString(36)}-${_cnIdCounter}`;
		}
		/**
		* New ControlNet entry from a schema entry — honors the catalog's declared
		* defaults (model, preprocessor, default_strength) with ControlNetApplyAdvanced
		* defaults for the step range. Returns null when the stack is full (max_stack).
		* Takes the KIND SPEC (the one contract entry) — no parallel feature shape.
		*/
		function newControlnetEntry(entries, type, cnKind) {
			const maxStack = cnKind?.max_stack ?? 3;
			if (entries.length >= maxStack) return null;
			const schema = cnEntriesOf(cnKind).find((e) => e.type === type) ?? NO_CN_SCHEMA;
			const declaredDefault = (cnKind?.fields.find((f) => f.name === "strength"))?.default;
			const defaultStrength = typeof declaredDefault === "number" ? declaredDefault : .8;
			return {
				id: newCnId(),
				type,
				model: schema.model,
				preprocessor: schema.preprocessor,
				image_b64: "",
				strength: schema.default_strength ?? defaultStrength,
				start_percent: 0,
				end_percent: 1,
				enabled: true,
				source: "user"
			};
		}
		/** New LoRA entry from an adapter name — default strength 1.0 (the
		* LoRA stack's own default when the spec omits it). */
		function newLoraEntry(id, strength = 1) {
			return {
				id,
				strength
			};
		}
		/**
		* New generic entry for a NOVEL modifier kind (not lora / controlnet — those
		* keep their bespoke templates above). Renders from ``kind.fields``: the
		* selected option's ``defaults`` win over field-level ``default`` over the
		* raw type zero (0 / "" / false). Returns null when the list is full
		* (``max_stack``, cardinality=list only). Scalar kinds return a single dict
		* at ``params[kind.param_key]`` — no id, no stack check.
		*
		* This is the proof the user demanded: a YAML block declaring a new kind
		* (clip_skip, sampler_override, …) gets a working create-template with ZERO
		* code beyond the catalog edit + the one ``@register`` applier. The generic
		* grid row + generic modal editor render from the same ``kind.fields``.
		*/
		function newGenericEntry(kind, stackLength, optionValue) {
			if (kind.cardinality === "list") {
				if (stackLength >= (kind.max_stack ?? 5)) return null;
			}
			const option = kind.options?.find((o) => o.value === optionValue);
			const entry = {};
			for (const field of kind.fields) {
				const fromOption = option?.defaults?.[field.name];
				if (fromOption !== void 0) entry[field.name] = fromOption;
				else if (field.default !== void 0 && field.default !== null) entry[field.name] = field.default;
				else entry[field.name] = defaultForType(field.type);
			}
			if (kind.cardinality === "list") entry.id = newCnId();
			if (optionValue !== void 0 && !("value" in entry)) entry.value = optionValue;
			return entry;
		}
		/** The type-correct zero for a modifier field with no declared default.
		* The return union names the zeros every member yields; a 7th field
		* kind fails loud at compile through assertNever instead of returning
		* undefined through an `unknown` mask. */
		function defaultForType(type) {
			switch (type) {
				case "integer":
				case "float": return 0;
				case "boolean": return false;
				case "select": return "";
				case "image": return "";
				case "string": return "";
				default: return assertNever(type, "modifierSubcards.defaultForType");
			}
		}
		/** The lora kind's options as the legacy adapter list — the LoRA dropdown. */
		function loraAdaptersOf(kind) {
			if (!kind) return [];
			return (kind.options ?? []).map((o) => ({
				name: o.value,
				filename: o.model ?? o.value,
				label: o.label,
				category: o.metadata?.category ?? "LoRA",
				default_strength: o.defaults?.strength ?? 1,
				prompt_hint: o.metadata?.prompt_hint ?? null,
				installed: o.installed ?? true
			}));
		}
		/** The controlnet kind's options as the legacy schema-entry list — the CN dropdown. */
		function cnEntriesOf(kind) {
			if (!kind) return [];
			const strengthField = kind.fields.find((f) => f.name === "strength");
			return (kind.options ?? []).map((o) => ({
				type: o.value,
				label: o.label,
				tooltip: o.tooltip ?? void 0,
				model: o.model ?? void 0,
				default_strength: o.defaults?.strength ?? strengthField?.default ?? .8,
				preprocessor: o.metadata?.preprocessor ?? void 0,
				installed: o.installed ?? void 0
			}));
		}
		/** LoRA strength bounds — from the kind's strength field (one source). */
		function loraStrengthBoundsOf(kind) {
			const strengthField = kind?.fields.find((f) => f.name === "strength");
			return {
				min: strengthField?.min ?? -2,
				max: strengthField?.max ?? 5,
				step: strengthField?.step ?? .05
			};
		}
		/**
		* The generic arbitrary-kind list — the ONE key the frontend reads to decide
		* which modifier rows to render. Declared-only (Phase A finalé): the backend
		* emits ``features.modifiers`` from the catalog's ``modifiers:`` block and
		* nothing else — the legacy client-side projection is deleted (rule 4).
		* Returns ``[]`` when the family declares no modifier capability.
		*/
		function modifiersFeatureOf(formSpec) {
			const raw = formSpec?.features?.modifiers;
			return Array.isArray(raw) ? raw : [];
		}
		/** The family declares at least one modifier kind. The grid renders iff true. */
		function hasModifierCapability(formSpec) {
			return modifiersFeatureOf(formSpec).length > 0;
		}
		/** Find a kind's spec by its discriminator — convenience for the grid/modal. */
		function kindSpecOf(formSpec, kind) {
			return modifiersFeatureOf(formSpec).find((k) => k.kind === kind) ?? null;
		}
		var NO_CN_SCHEMA, _cnIdCounter;
		var init_modifierSubcards = __esmMin((() => {
			init_lib$2();
			NO_CN_SCHEMA = {
				type: "",
				label: ""
			};
			_cnIdCounter = 0;
		}));
		//#endregion
		//#region ../../web-kit/contracts/lib/objectUrlCache.js
		/** True iff `s` is a base64 data URL (large enough that streaming
		*  matters — the timeline package gates its blob handling on this).
		*  The object-URL cache this module once carried was deleted with the
		*  2026-10-21 dead-exports census: no production consumer converted
		*  through it — only the module's own spec. */
		function isDataUrl(s) {
			return typeof s === "string" && s.startsWith("data:") && s.length > 128;
		}
		var init_objectUrlCache = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/lib/rootsManifest.js
		/** §23 THE CROSS-ROOTS MANIFEST (2026-09-23): every run-resolving
		*  door (status/view/ledger/list — and, since the operator's law
		*  of the same night ("the agent maker and the user share
		*  EVERYTHING, THAT IS THE WHOLE POINT"), the ENGINE'S chained-
		*  input resolver too) searches the manifest IN ORDER — own root
		*  first (the fast path; own writes win), then the extras in
		*  their declared order. Extras are a CONFIG field (the J12
		*  conversion, 2026-10-19: the retired MELITE_STATE_ROOTS env
		*  seam was the only colon-spelling reader — roots are named in
		*  the queue/estate/engine config, never read from the process
		*  env). Dedup keeps the first occurrence (own root always
		*  leads). Pure for the walls.
		*
		*  HOSTED IN CONTRACTS (the one package every plane sees): the
		*  estate queue reads it for its run doors, the ComfyUI engine
		*  reads it when staging a chained input — the maker lane's runs
		*  resolve on the user's lane and back. One law, one spelling. */
		function rootsManifest(ownRoot, extras = []) {
			return [.../* @__PURE__ */ new Set([ownRoot, ...extras.filter((r) => r !== "")])];
		}
		/** The miss voice names every searched tree (the NAME-THE-ROOT
		*  law, extended across the manifest — a two-roots box stays
		*  debuggable on a miss, never a bare unknown). */
		function searchedVoice(roots) {
			return "(searched " + roots.join(", ") + ")";
		}
		/**
		* THE CROSS-ROOT ORDER, ONCE (the MCP/media audit's H4).
		*
		* Two readers resolve a run id across the manifest's roots and each
		* built its own list: the media list (own root first) and the gallery
		* artifact route (its own flow tree, then the manifest roots). With
		* a run id present in two trees they could disagree about which
		* bytes answer — the list serving one file while the artifact route
		* serves another for the SAME run id.
		*
		* This is the order both readers take: the caller's own tree first
		* (its own writes win), then the manifest roots in their declared
		* order, de-duplicated. `ownTree` is the caller's own CONFIGURED
		* tree and is a string at every seat — the gallery answers
		* `config.flowDir ?? DEFAULT_FLOW_DIR` — so the parameter declares no
		* null (the re-audit, 2026-10-16).
		*/
		function crossRootOrder(ownTree, roots) {
			const out = [];
			for (const tree of [ownTree, ...roots]) {
				if (tree === "") continue;
				if (!out.includes(tree)) out.push(tree);
			}
			return out;
		}
		var init_rootsManifest = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/lib/stagePreview.js
		var init_stagePreview = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/lib/stageView.js
		function recordOf(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
		}
		function nonEmptyString(value) {
			return typeof value === "string" && value !== "" ? value : "";
		}
		function stringsOf(value) {
			return Array.isArray(value) ? value.filter((entry) => typeof entry === "string" && entry !== "") : [];
		}
		/** THE STATUS FOLD — the one owner of "what does this raw status word
		*  mean" (2026-10-13, the card-UI duplication audit: five seats folded
		*  the same words privately and disagreed — 'cached' rendered as `done`
		*  in one and a failure-looking `stopped` in another, and a stage the
		*  estate settles as 'completed' matched no branch at all in one of
		*  them). Every seat asks THIS. */
		function statusOf(value) {
			switch (value.toLowerCase()) {
				case "done":
				case "completed":
				case "succeeded":
				case "success": return "done";
				case "failed":
				case "error": return "error";
				case "stopped":
				case "interrupted":
				case "unknown": return "stopped";
				case "stopping": return "running";
				case "running":
				case "live": return "running";
				case "pending":
				case "queued":
				case "ready": return "queued";
				case "stale": return "stale";
				case "cached": return "cached";
				case "skipped": return "skipped";
				case "reused": return "reused";
				case "": return "pending";
				default: {
					const known = [...RUN_STATUS_WORDS].join(", ");
					throw new Error(`statusOf: unknown run-status word ${JSON.stringify(value)} — the vocabulary is RUN_STATUS_WORDS (${known}); add the word to the fold and the set together, never fold garbage to 'pending'`);
				}
			}
		}
		/** THE TERMINAL JUDGEMENT — the other half of the same question ("is
		*  this run finished?"), which five seats also spelled privately with
		*  DISAGREEMENT: one set treated `unknown` as terminal and `error` as
		*  live, the other the reverse, so a run in either word never stopped
		*  a poller on one plane. The estate's own vocabulary is the node
		*  truth (`RunStatus = queued|running|completed|failed|stopped|
		*  stopping`, estate-queue/src/runsTypes.ts); `error` and `unknown`
		*  additionally ride the wire (melite-run-wire documents `error` as
		*  the run record's own failure stamp; runStatusContract lists
		*  `unknown` as a schema value), so both belong on the terminal side
		*  here. */
		function isTerminalStatus(value) {
			return TERMINAL_RUN_STATUSES.has(value.toLowerCase());
		}
		function isLiveRunStatus(value) {
			return !isTerminalStatus(value) && LIVE_RUN_STATUSES.has(value.toLowerCase());
		}
		/** THE VIEW-SIDE READ (the shared seam, 2026-10-12): a projection
		*  answers "what should this row show", and a word outside the
		*  vocabulary has no answer to show — it is the no-information home,
		*  not a crash. `statusOf` above stays the strict classifier (it
		*  refuses, because a caller asking it for a classification deserves
		*  the truth); every view seat reads through THIS so the membership
		*  law lives once instead of per seat. Absence ('') folds the same
		*  way, which is why it needs no case of its own downstream. */
		function statusOrPendingOf(value) {
			return RUN_STATUS_WORDS.has(value.toLowerCase()) ? statusOf(value) : "pending";
		}
		function galleryOf(value) {
			if (!Array.isArray(value)) return void 0;
			const gallery = value.flatMap((entry) => {
				const row = recordOf(entry);
				const name = nonEmptyString(row["name"]);
				const url = nonEmptyString(row["url"]);
				return name !== "" && url !== "" ? [{
					name,
					url
				}] : [];
			});
			return gallery.length > 0 ? gallery : void 0;
		}
		function previewsOf(value) {
			if (!Array.isArray(value)) return void 0;
			const previews = value.flatMap((entry) => {
				const row = recordOf(entry);
				const label = nonEmptyString(row["label"]);
				const artifact = nonEmptyString(row["artifact"]);
				const url = row["url"] === null || typeof row["url"] === "string" ? row["url"] : null;
				return label !== "" && artifact !== "" ? [{
					label,
					url,
					artifact
				}] : [];
			});
			return previews.length > 0 ? previews : void 0;
		}
		function cardResultFromRecord(value) {
			const result = recordOf(value);
			const artifacts = {};
			for (const [name, url] of Object.entries(recordOf(result["artifacts"]))) {
				const clean = nonEmptyString(url);
				if (clean !== "") artifacts[name] = clean;
			}
			const assetUrls = stringsOf(result["assetUrls"]);
			const metadata = recordOf(result["metadata"]);
			if (Object.keys(artifacts).length === 0 && assetUrls.length === 0) return null;
			return {
				artifacts,
				assetUrls,
				metadata,
				...typeof result["durationSec"] === "number" ? { durationSec: result["durationSec"] } : {},
				...galleryOf(result["gallery"]) === void 0 ? {} : { gallery: galleryOf(result["gallery"]) },
				...previewsOf(result["motionPreviews"]) === void 0 ? {} : { motionPreviews: previewsOf(result["motionPreviews"]) }
			};
		}
		function inputBindingsOf(value) {
			const bindings = [];
			for (const [slot, raw] of Object.entries(recordOf(value))) {
				const ref = recordOf(raw);
				const stage = nonEmptyString(ref["stage"]);
				if (stage !== "") {
					const output = nonEmptyString(ref["output"]);
					bindings.push({
						slot,
						source: output === "" ? { stage } : {
							stage,
							output
						}
					});
				} else if (typeof ref["initial"] === "string") bindings.push({
					slot,
					source: { initial: true }
				});
			}
			return bindings;
		}
		function projectStageView(owner, options = {}) {
			const row = owner.row;
			const resolved = recordOf(row["resolved"]);
			const rowParams = recordOf(row["params"]);
			const params = owner.effective?.params ?? rowParams;
			const card = nonEmptyString(row["card"]) || owner.cardName;
			const kind = options.kind ?? (card || "stage");
			const service = options.service ?? (nonEmptyString(row["service"]) || kind);
			const model = nonEmptyString(owner.effective?.model) || nonEmptyString(resolved["model"]) || nonEmptyString(row["model"]) || nonEmptyString(params["model"]) || service;
			const inputSlots = (owner.effective?.inputSlots ?? []).filter((slot) => typeof slot === "string" && slot !== "");
			const inputBindings = inputBindingsOf(row["inputs"]);
			const inputs = inputBindings.flatMap((binding) => "stage" in binding.source ? [binding.source.stage] : []);
			const inputOutputs = inputBindings.map((binding) => "stage" in binding.source ? binding.source.output ?? null : null);
			const priorStageIds = owner.priorStageIds ?? owner.upstream.map((stage) => stage.id);
			const inputIndices = inputs.map((id) => priorStageIds.indexOf(id));
			const result = cardResultFromRecord(row["result"]);
			const harvested = options.result === void 0 ? result : options.result(row, result);
			const resultRecord = recordOf(row["result"]);
			const metadata = recordOf(harvested?.metadata);
			const error = nonEmptyString(row["error"]) || nonEmptyString(resultRecord["error"]) || nonEmptyString(metadata["error"]);
			const runId = owner.runId || nonEmptyString(row["runId"]) || nonEmptyString(resultRecord["runId"]) || nonEmptyString(resultRecord["run_id"]) || nonEmptyString(metadata["runId"]) || null;
			const tags = Array.isArray(row["tags"]) ? row["tags"].filter((tag) => tag === "ai_generated") : void 0;
			return {
				id: owner.stageId,
				title: nonEmptyString(row["title"]) || card || owner.stageId,
				kind,
				service,
				model,
				...options.genre === void 0 ? {} : { genre: options.genre },
				...tags === void 0 ? {} : { tags },
				params,
				...inputSlots.length === 0 ? {} : { inputSlots },
				...inputBindings.length === 0 ? {} : { inputBindings },
				inputs,
				...inputOutputs.length === 0 ? {} : { inputOutputs },
				inputIndices,
				result: harvested,
				...Array.isArray(row["history"]) ? { history: row["history"] } : {},
				status: statusOrPendingOf(owner.runStatus),
				...error === "" ? {} : { error },
				runId,
				...typeof row["saveToAssets"] === "boolean" ? { saveToAssets: row["saveToAssets"] } : {}
			};
		}
		function projectUpstreamStages(owner, options = {}) {
			return owner.upstream.map((upstream) => ({
				id: upstream.id,
				title: upstream.title,
				kind: options.kind ?? "image",
				service: options.service ?? "",
				genre: options.genre ?? "image",
				params: {},
				inputs: [],
				inputIndices: [],
				result: {
					artifacts: upstream.title === "" ? {} : { [upstream.title]: upstream.url },
					assetUrls: upstream.url === "" ? [] : [upstream.url],
					metadata: {}
				},
				status: "done"
			}));
		}
		var TERMINAL_RUN_STATUSES, LIVE_RUN_STATUSES, RUN_STATUS_WORDS;
		var init_stageView = __esmMin((() => {
			TERMINAL_RUN_STATUSES = /* @__PURE__ */ new Set([
				"completed",
				"failed",
				"stopped",
				"error",
				"unknown",
				"interrupted",
				"succeeded",
				"success"
			]);
			LIVE_RUN_STATUSES = /* @__PURE__ */ new Set([
				"running",
				"live",
				"stopping",
				"queued",
				"pending"
			]);
			RUN_STATUS_WORDS = /* @__PURE__ */ new Set([
				"done",
				"completed",
				"succeeded",
				"success",
				"failed",
				"error",
				"stopped",
				"interrupted",
				"unknown",
				"stopping",
				"running",
				"live",
				"pending",
				"queued",
				"ready",
				"stale",
				"cached",
				"skipped",
				"reused"
			]);
		}));
		//#endregion
		//#region ../../web-kit/contracts/lib/studio.js
		var init_studio = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/lib/timelineTypes.js
		/** Coerce an unknown persisted/imported status into the SegmentStatus
		* union. Anything outside it (e.g. pre-refactor persisted "error") is
		* normalized to 'empty' — an out-of-union status silently breaks the
		* failed-state UI (the NLE clip check tests status === 'failed'). */
		function normalizeSegmentStatus(raw) {
			return typeof raw === "string" && SEGMENT_STATUSES.includes(raw) ? raw : "empty";
		}
		var SEGMENT_STATUSES, FLF_MODES, TRACK_COLORS, DEFAULT_SEGMENT_PARAMS, DEFAULT_LIPSYNC_FIELDS, EDITOR_ONLY_SEGMENT_KEYS;
		var init_timelineTypes = __esmMin((() => {
			SEGMENT_STATUSES = [
				"empty",
				"pending",
				"generating",
				"ready",
				"failed"
			];
			FLF_MODES = [{
				id: "off",
				label: "First frame only (standard I2V)"
			}, {
				id: "on",
				label: "First + Last frame (FLF2V)"
			}];
			TRACK_COLORS = [
				"#4ade80",
				"#facc15",
				"#fb923c",
				"#60a5fa",
				"#f472b6",
				"#a78bfa",
				"#34d399",
				"#fbbf24",
				"#f87171",
				"#38bdf8"
			];
			DEFAULT_SEGMENT_PARAMS = {
				seed: 42,
				width: 640,
				height: 480,
				frames: 33,
				fps: 16,
				resizeMethod: "crop",
				samplingSteps: 10,
				guideScale: 5,
				model: "h3",
				profile: "fast",
				motionAmplitude: 1,
				flfMode: false,
				teacacheEnabled: false,
				teacacheThreshold: .01,
				progressiveEnabled: false,
				progressiveLevels: 2,
				progressiveDelta: .15,
				progressiveMode: "dct",
				relayEpsilon: .01,
				guideStrength: 1,
				guideCrf: 0,
				scaleBy: 1,
				upscaleMethod: "bicubic",
				useTiledEncode: false,
				tileSize: 256,
				tileOverlap: 64,
				imageAttentionStrength: 1,
				loras: [],
				motionVideoB64: null,
				motionStrength: .7,
				motionTrimStart: 0,
				motionTrimEnd: 0,
				motionOffset: 0,
				resampleMode: "nearest",
				retakePrompt: "",
				retakeStartFrame: 0,
				retakeEndFrame: -1
			};
			DEFAULT_LIPSYNC_FIELDS = {
				lipSyncedVideoUrl: null,
				lipSyncPreferOriginal: false
			};
			EDITOR_ONLY_SEGMENT_KEYS = /* @__PURE__ */ new Set([
				"frames",
				"fps",
				"resizeMethod",
				"motionVideoB64",
				"motionStrength",
				"motionTrimStart",
				"motionTrimEnd",
				"motionOffset",
				"resampleMode",
				"scaleBy",
				"upscaleMethod",
				"useTiledEncode",
				"tileSize",
				"tileOverlap",
				"imageAttentionStrength",
				"flfMode",
				"profile",
				"guideStrength",
				"guideCrf",
				"relayEpsilon",
				"teacacheEnabled",
				"teacacheThreshold",
				"progressiveEnabled",
				"progressiveLevels",
				"progressiveDelta",
				"progressiveMode",
				"retakePrompt",
				"retakeStartFrame",
				"retakeEndFrame",
				"loras",
				"model",
				"samplingSteps",
				"guideScale",
				"motionAmplitude"
			]);
		}));
		//#endregion
		//#region ../../web-kit/contracts/lib/vocab.js
		/** Is the value a valid Provenance? Gate untrusted JSON (a past run's
		* metadata, a drag payload) before rendering. */
		function isProvenance(v) {
			return typeof v === "string" && PROVENANCE_VALUES.includes(v);
		}
		var Provenance, PROVENANCE_VALUES;
		var init_vocab = __esmMin((() => {
			Provenance = {
				agent: "agent",
				user: "user",
				imported: "imported"
			};
			PROVENANCE_VALUES = Object.values(Provenance);
		}));
		//#endregion
		//#region ../../web-kit/contracts/lib/benchStage.js
		/** The run-media prefix a path addresses, or null when it addresses
		*  none (the caller leaves such a value verbatim — this is a rewrite,
		*  never a filter). */
		function runMediaPrefixOf(value) {
			if (value === "/melite-media/runs" || value.startsWith("/melite-media/runs/")) return RUN_MEDIA_PREFIX;
			if (value === "/v1/assets/runs" || value.startsWith("/v1/assets/runs/")) return LEGACY_RUN_MEDIA_PREFIX;
			return null;
		}
		/** THE ONE SPELLING: a run-media path in any spelling becomes the
		*  live one. Everything else — a local file, an https URL, a $spell,
		*  a run-relative name — rides verbatim. */
		function canonicalRunMediaUrl(value) {
			const prefix = runMediaPrefixOf(value);
			if (prefix === null || prefix === "/melite-media/runs") return value;
			return RUN_MEDIA_PREFIX + value.slice(prefix.length);
		}
		/** Rewrite every legacy run-media path inside a value (deep,
		*  value-preserving, total). */
		function healRunMediaPaths(value) {
			if (typeof value === "string") return canonicalRunMediaUrl(value);
			if (Array.isArray(value)) return value.map((x) => healRunMediaPaths(x));
			if (value !== null && typeof value === "object") {
				const out = {};
				for (const [k, v] of Object.entries(value)) out[k] = healRunMediaPaths(v);
				return out;
			}
			return value;
		}
		/** Strip a list of keys off a row (in place — the arm owns the row). */
		function stripKeys(row, keys) {
			for (const k of keys) delete row[k];
		}
		/** The engine a BENCH stage row declares — DERIVED when it does
		*  not say, because the bench IS the card bench: every row in it
		*  composes a card on the card plane, and a row that names another
		*  engine says so out loud (the blender/mcp rows the bench carries
		*  for previews). The run door's stricter rule — an mcp/flow stage
		*  must NAME its engine — belongs to the flow document, which is a
		*  different shape with its own gate; a bench row is not that.
		*
		*  This is the derivation that used to be written out by hand in
		*  three writers (the bench normalizer, the add-card door, the run
		*  door), which is how a GUI row and an agent row became different
		*  documents. */
		function stageEngineOf(row) {
			const own = row["engine"];
			if (typeof own === "string" && own !== "") return own;
			return CARD_PLANE_ENGINE;
		}
		/** The one normalization every writer runs. Idempotent
		*  (normalize(normalize(x)) === normalize(x)) and total (never
		*  throws): a row in, a stage row out, with every derived field
		*  derived, every run-memory field stripped, every run-media path
		*  healed, and the era's self-naming model removed.
		*
		*  `index` is the row's position — the id fallback names it, so an
		*  unaddressable row becomes addressable rather than vanishing.
		*  Run memory is NOT stripped here: that is the birth/restore arms'
		*  law (BIRTH_STRIP_KEYS), and the contract names the keys rather
		*  than guessing which arm is running.
		*/
		function normalizeBenchStage(row, index) {
			const out = row !== null && typeof row === "object" && !Array.isArray(row) ? { ...row } : {};
			if (typeof out["id"] !== "string") out["id"] = typeof index === "number" ? "s_" + String(index) : index;
			out["engine"] = stageEngineOf(out);
			const ins = out["inputs"];
			out["inputs"] = ins !== null && typeof ins === "object" && !Array.isArray(ins) ? healRunMediaPaths({ ...ins }) : {};
			const params = out["params"];
			const healed = healRunMediaPaths(params !== null && typeof params === "object" && !Array.isArray(params) ? params : {});
			const rowCard = out["card"];
			stripSelfNamedModel(rowCard, healed);
			out["params"] = healed;
			const outputs = out["outputs"];
			out["outputs"] = outputs !== null && typeof outputs === "object" && !Array.isArray(outputs) ? { ...outputs } : typeof rowCard === "string" && rowCard !== "" ? {} : { default: "image" };
			return out;
		}
		/** Normalize a bench's whole stage list — the writers' array arm.
		*  Group rows (a row with `children`) ride as they are beyond the
		*  derived fields: they carry no engine or params of their own. */
		function normalizeBenchStages(stages) {
			if (!Array.isArray(stages)) return [];
			const out = [];
			for (const [i, row] of stages.entries()) {
				const normalized = normalizeBenchStage(row, i);
				const children = normalized["children"];
				if (Array.isArray(children)) {
					delete normalized["engine"];
					const healedParams = normalized["params"];
					if (Object.keys(healedParams).length === 0) delete normalized["params"];
				}
				out.push(normalized);
			}
			return out;
		}
		/** Sanitize one candidate id onto a legal bench session key —
		* 'main' for anything the grammar refuses. THE ONE SPELLING of the
		* routing decision (the li-ay stroke, 2026-10-11): the decision
		* `SESSION_RE.test(id) ? id : 'main'` was spelled FOUR times — the
		* gallery client (bench-load.benchSessionOf), the cards tab
		* (cards-resource.benchSessionKey), and TWICE inline in the agent
		* tool — and the walls pinned each copy's grammar import while a
		* gutted routing body ('main' for everything) stayed green behind
		* the codec arms. The grammar moved to this floor for exactly this
		* reason; the DECISION over it moves beside it, and every seat
		* imports the same function. An address has one grammar and one
		* sanitize — not four. */
		function benchSessionOf(id) {
			return typeof id === "string" && SESSION_RE.test(id) ? id : "main";
		}
		/** The MINT — the inverse of benchSessionOf (2026-10-13, the card-UI
		*  duplication audit). The grammar moved to this floor and the DECISION
		*  beside it, but the mint stayed behind in six seats spelling
		*  `"bench-" + session` — one of which stripped the prefix and added
		*  it straight back. An address has one grammar, one sanitize, and now
		*  one mint. */
		function benchDraftIdOf(session) {
			return "bench-" + session;
		}
		/** The run-relative tail of an absolute artifact path, or undefined
		* when the path carries no run directory — e.g.
		* "/data/runs/output/run-4f2a1c-ab12/tts/line.flac" →
		* "run-4f2a1c-ab12/tts/line.flac". THE TAIL GRAMMAR IS RUN_ID_RE
		* (the li-ay stroke): the restore stamp's private tailOf accepted
		* ANY "run-…" segment ("run-ZZZ/x.png" previewed; run ids are minted
		* run-<hex>-<base62> and never look like that), so a path a run
		* directory could not own still minted a served artifact address.
		* One grammar for minting and one for taking the tail: the LAST
		* run-shaped segment wins (the estate nests nothing under a run
		* today; the last-wins order is the old behavior, kept). */
		function runTailOf(path) {
			const segments = path.split("/");
			let found;
			for (let i = 0; i < segments.length - 1; i++) {
				if (segments[i + 1] === "") continue;
				if (RUN_ID_RE.test(segments[i])) found = segments.slice(i).join("/");
			}
			return found;
		}
		/** THE SELF-NAMING STRIP, AS A DECISION (2026-10-11, the client-plane
		*  audit's F1). `normalizeBenchStage` applies this inline; the RESTORE
		*  arms in `packages/web/infer-gallery/src/client/bench-load.ts` used
		*  to re-implement it, and both copies drifted from the contract:
		*
		*  - one copy guarded `card !== ""` and the other did not, so a row
		*    with `card: ""` and `params: {model: ""}` kept its model under
		*    the contract and lost it under the client;
		*  - one copy compared the RAW `params.model` and the other the
		*    HEALED one;
		*  - the multi-stage arm did not call `normalizeBenchStage` at all,
		*    so it skipped the run-media path heal and the engine derivation
		*    the single-card arm got.
		*
		*  All three were invisible: making both copies strip unconditionally
		*  — the exact historical anny/h3-timeline defect — left
		*  bench-stage-contract, closure-gate and media-sidebar GREEN, because
		*  those walls pin the CONTRACT and the SET, and never drove the two
		*  client use-sites.
		*
		*  One spelling now: every site asks this, which takes the row's card
		*  and the params bag and strips in place. It is the contract's law,
		*  stated once, with the `card !== ""` guard included. */
		function stripSelfNamedModel(card, params) {
			if (typeof card !== "string" || card === "") return;
			if (typeof params !== "object" || params === null || Array.isArray(params)) return;
			const bag = params;
			if (bag["model"] !== card) return;
			if (SELF_NAMED_FAMILIES.has(card)) return;
			delete bag["model"];
		}
		var CARD_PLANE_ENGINE, RUN_MEDIA_PREFIX, LEGACY_RUN_MEDIA_PREFIX, BIRTH_STRIP_KEYS, RESTORE_STRIP_KEYS, LOAD_CARRY_KEYS, STAGE_PATCH_KEYS, WIRE_STAGE_KEYS, RESTORED_PROVENANCE_SPELLING, SESSION_RE, BENCH_DRAFT_RE, RUN_ID_RE, BENCH_DRAFT_PREFIX_RE, SELF_NAMED_FAMILIES;
		var init_benchStage = __esmMin((() => {
			CARD_PLANE_ENGINE = "comfyui";
			RUN_MEDIA_PREFIX = "/melite-media/runs";
			LEGACY_RUN_MEDIA_PREFIX = "/v1/assets/runs";
			BIRTH_STRIP_KEYS = [
				"history",
				"resultParams",
				"runStatus",
				"resolved"
			];
			RESTORE_STRIP_KEYS = [
				"result",
				"resultParams",
				"runStatus",
				"resolved",
				"history"
			];
			LOAD_CARRY_KEYS = [
				"result",
				"runStatus",
				"history",
				"resultParams"
			];
			STAGE_PATCH_KEYS = [
				"params",
				"result",
				"runStatus",
				"health",
				"inputs",
				"inputOutputs"
			];
			WIRE_STAGE_KEYS = [
				"card",
				"card_io",
				"description",
				"engine",
				"expected",
				"id",
				"inputs",
				"outputs",
				"params",
				"retries",
				"skip_when",
				"timeout_s"
			];
			RESTORED_PROVENANCE_SPELLING = "restored";
			SESSION_RE = /^[A-Za-z0-9_-]{1,64}$/;
			BENCH_DRAFT_RE = /^bench-([A-Za-z0-9_-]{1,64})$/;
			RUN_ID_RE = /^run-[0-9a-f]+-[A-Za-z0-9_-]+$/;
			BENCH_DRAFT_PREFIX_RE = /^bench-/;
			SELF_NAMED_FAMILIES = /* @__PURE__ */ new Set(["anny", "h3-timeline"]);
		}));
		//#endregion
		//#region ../../web-kit/contracts/lib/index.js
		var lib_exports$1 = /* @__PURE__ */ __exportAll({
			BENCH_DRAFT_PREFIX_RE: () => BENCH_DRAFT_PREFIX_RE,
			BENCH_DRAFT_RE: () => BENCH_DRAFT_RE,
			BIRTH_STRIP_KEYS: () => BIRTH_STRIP_KEYS,
			CARD_PLANE_ENGINE: () => CARD_PLANE_ENGINE,
			DEFAULT_LIPSYNC_FIELDS: () => DEFAULT_LIPSYNC_FIELDS,
			DEFAULT_SEGMENT_PARAMS: () => DEFAULT_SEGMENT_PARAMS,
			EDITOR_ONLY_SEGMENT_KEYS: () => EDITOR_ONLY_SEGMENT_KEYS,
			EXTRA_KEYS: () => EXTRA_KEYS,
			EXTRA_KEY_SET: () => EXTRA_KEY_SET,
			FLF_MODES: () => FLF_MODES,
			LEGACY_RUN_MEDIA_PREFIX: () => LEGACY_RUN_MEDIA_PREFIX,
			LOAD_CARRY_KEYS: () => LOAD_CARRY_KEYS,
			MEDIA_SET: () => MEDIA_SET,
			NO_CN_SCHEMA: () => NO_CN_SCHEMA,
			PROVENANCE_VALUES: () => PROVENANCE_VALUES,
			Provenance: () => Provenance,
			RELATION_WORDS: () => RELATION_WORDS,
			RESTORED_PROVENANCE_SPELLING: () => RESTORED_PROVENANCE_SPELLING,
			RESTORE_STRIP_KEYS: () => RESTORE_STRIP_KEYS,
			ROLE_SET: () => ROLE_SET,
			RUN_ID_RE: () => RUN_ID_RE,
			RUN_MEDIA_PREFIX: () => RUN_MEDIA_PREFIX,
			RUN_STATUS_WORDS: () => RUN_STATUS_WORDS,
			SEGMENT_STATUSES: () => SEGMENT_STATUSES,
			SELF_NAMED_FAMILIES: () => SELF_NAMED_FAMILIES,
			SESSION_RE: () => SESSION_RE,
			STAGE_PATCH_KEYS: () => STAGE_PATCH_KEYS,
			TERMINAL_RUN_STATUSES: () => TERMINAL_RUN_STATUSES,
			TRACK_COLORS: () => TRACK_COLORS,
			WIRE_STAGE_KEYS: () => WIRE_STAGE_KEYS,
			WTYPE_SEATS: () => WTYPE_SEATS,
			WTYPE_SET: () => WTYPE_SET,
			ZONE_SET: () => ZONE_SET,
			applySubcardDrop: () => applySubcardDrop,
			artifactFileName: () => artifactFileName,
			bag: () => bag,
			benchDraftIdOf: () => benchDraftIdOf,
			benchResultDefects: () => benchResultDefects,
			benchSessionOf: () => benchSessionOf,
			canonicalRunMediaUrl: () => canonicalRunMediaUrl,
			cardResultFromRecord: () => cardResultFromRecord,
			cnEntriesOf: () => cnEntriesOf,
			crossRootOrder: () => crossRootOrder,
			extraOf: () => extraOf,
			hasModifierCapability: () => hasModifierCapability,
			healRunMediaPaths: () => healRunMediaPaths,
			isDataUrl: () => isDataUrl,
			isLiveRunStatus: () => isLiveRunStatus,
			isProvenance: () => isProvenance,
			isPurelyUnstatedRequiredVoice: () => isPurelyUnstatedRequiredVoice,
			isTerminalStatus: () => isTerminalStatus,
			isUnstatedRequiredVoice: () => isUnstatedRequiredVoice,
			judgeLaneBounds: () => judgeLaneBounds,
			judgeLaneRelations: () => judgeLaneRelations,
			judgeLaneSurface: () => judgeLaneSurface,
			judgeSamplerEnvelope: () => judgeSamplerEnvelope,
			kindForId: () => kindForId,
			kindSpecOf: () => kindSpecOf,
			laneBlank: () => laneBlank,
			laneBoundsOf: () => laneBoundsOf,
			laneContractOf: () => laneContractOf,
			laneContractsFor: () => laneContractsFor,
			laneStaleCarry: () => laneStaleCarry,
			laneSurfaceOf: () => laneSurfaceOf,
			loraAdaptersOf: () => loraAdaptersOf,
			loraIdOf: () => loraIdOf,
			loraLabel: () => loraLabel,
			loraStrengthBoundsOf: () => loraStrengthBoundsOf,
			modifiersFeatureOf: () => modifiersFeatureOf,
			moveItem: () => moveItem,
			newControlnetEntry: () => newControlnetEntry,
			newGenericEntry: () => newGenericEntry,
			newLoraEntry: () => newLoraEntry,
			normalizeBenchStage: () => normalizeBenchStage,
			normalizeBenchStages: () => normalizeBenchStages,
			normalizeLoraEntry: () => normalizeLoraEntry,
			normalizeSegmentStatus: () => normalizeSegmentStatus,
			projectStageView: () => projectStageView,
			projectUpstreamStages: () => projectUpstreamStages,
			rootsManifest: () => rootsManifest,
			runMediaPrefixOf: () => runMediaPrefixOf,
			runTailOf: () => runTailOf,
			samplerEnvelopeCure: () => samplerEnvelopeCure,
			searchedVoice: () => searchedVoice,
			stageEngineOf: () => stageEngineOf,
			statusOf: () => statusOf,
			statusOrPendingOf: () => statusOrPendingOf,
			stripKeys: () => stripKeys,
			stripSelfNamedModel: () => stripSelfNamedModel,
			subcardCount: () => subcardCount,
			subcardId: () => subcardId,
			subcardsFromParams: () => subcardsFromParams,
			unknownQuantVoice: () => unknownQuantVoice,
			unknownVariantVoice: () => unknownVariantVoice
		});
		var init_lib$1 = __esmMin((() => {
			init_extraKeys();
			init_laneRelations();
			init_FlowTypes();
			init_benchResult();
			init_card();
			init_character();
			init_loraTypes();
			init_mediaTypes();
			init_modifierFaces();
			init_modifierSubcards();
			init_objectUrlCache();
			init_rootsManifest();
			init_stagePreview();
			init_stageView();
			init_studio();
			init_timelineTypes();
			init_vocab();
			init_benchStage();
		}));
		//#endregion
		//#region ../../web-kit/catalog/lib/sleep.js
		/**
		* sleep.ts — ONE delay for the package (the hand-roll audit's 7.9).
		*
		* Four clones across this package's own sources carried three
		* different contracts: an abortable sleep that rejects with an
		* `AbortError` (api.ts's retry backoff), a plain delay
		* (text-to-pose's poll), and two inline `new Promise(r =>
		* setTimeout(r, ms))` waits (FlowProtocol's poll ticks). They are one
		* function with an optional signal: a caller with no signal gets the
		* plain delay, a caller with one gets the abort that clears the timer.
		*
		* Why this is a local module and not the DSH timer seat: this package
		* is a browser client (no `Context`), and `ctx.timeout` is fiber-owned
		* by the Cordis plugin. The cross-package fold the row names is
		* unavailable to every one of these sites for that reason alone; what
		* IS available is one implementation per package, which is this.
		* @module @melite/catalog/sleep
		*/
		/**
		* Await `ms` milliseconds; an `AbortSignal` clears the timer and
		* rejects with a DOM `AbortError`, the spelling the retry path
		* already catches.
		* @param ms - delay in milliseconds.
		* @param signal - optional cancellation; an already-aborted signal rejects without waiting.
		* @returns resolves after the delay, rejects on abort.
		*/
		function sleep(ms, signal) {
			return new Promise((resolve, reject) => {
				if (signal?.aborted === true) {
					reject(new DOMException("Aborted", "AbortError"));
					return;
				}
				const timer = setTimeout(() => {
					signal?.removeEventListener("abort", onAbort);
					resolve();
				}, ms);
				const onAbort = () => {
					clearTimeout(timer);
					reject(new DOMException("Aborted", "AbortError"));
				};
				signal?.addEventListener("abort", onAbort, { once: true });
			});
		}
		var init_sleep = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/catalog/lib/clientStore.js
		/**
		* clientStore — THE client store seat: a bound, zustand-shaped store over the
		* DSH platform snapshot store (`@deepseek-ai/dsh-client-store`, the
		* zustand/immer engine the web shell shares through its frozen module table —
		* see packages/web/shared/web-platform.ts).
		*
		* The engine owns observation, synchronous publication, and Immer-backed
		* updates. This module owns the binding every browser store in the repository
		* shares: the module-level lifetime (the document survives remounts and is
		* shared across tenants), the `getState`/`setState`/`subscribe`/
		* `getInitialState`/`destroy` statics module-level callers use, and the
		* selector hook.
		*
		* `setState` shallow-merges a patch into the record and replaces the record
		* whole when `replace` is true. A patch that leaves the record unchanged keeps
		* the current snapshot and notifies nobody.
		*/
		function createClientStore(init) {
			const engine = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(void 0);
			const stops = /* @__PURE__ */ new Set();
			let initialState;
			const getState = () => engine.getSnapshot();
			const setState = (partial, replace) => {
				const patch = typeof partial === "function" ? partial(getState()) : partial;
				if (replace === true) {
					engine.set(patch);
					return;
				}
				engine.update((draft) => {
					Object.assign(draft, patch);
				});
			};
			const subscribe = (listener) => {
				let previous = getState();
				const stop = engine.subscribe(() => {
					const next = getState();
					const before = previous;
					previous = next;
					listener(next, before);
				});
				stops.add(stop);
				return () => {
					stops.delete(stop);
					stop();
				};
			};
			const api = {
				setState,
				getState,
				getInitialState: () => initialState,
				subscribe,
				destroy: () => {
					for (const stop of stops) stop();
					stops.clear();
				}
			};
			const initial = typeof init === "function" ? init(setState, getState, api) : init;
			engine.set(initial);
			initialState = initial;
			function useStore(selector, equalityFn = Object.is) {
				const selectorRef = (0, react.useRef)(selector);
				selectorRef.current = selector;
				const equalityRef = (0, react.useRef)(equalityFn);
				equalityRef.current = equalityFn;
				const getSnapshot = (0, react.useMemo)(() => {
					let prev;
					let hasPrev = false;
					return () => {
						const sel = selectorRef.current;
						const next = sel ? sel(getState()) : getState();
						if (hasPrev && equalityRef.current(prev, next)) return prev;
						hasPrev = true;
						prev = next;
						return next;
					};
				}, []);
				return (0, react.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
			}
			/* v8 ignore stop */
			return Object.assign(useStore, api);
		}
		var init_clientStore = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/catalog/lib/api.js
		/** The named escape for non-table URLs. Every use is deliberate and
		* greppable. */
		function externalUrl(u) {
			return u;
		}
		function shouldRetryStatus(status, method) {
			return GATEWAY_CODES.has(status) || SAFE_METHODS.has(method) && status >= 500 && status < 600;
		}
		function getBackendState() {
			return backendStore.getState().state;
		}
		/** Subscribe to backend liveness changes. Returns an unsubscribe fn. */
		function onBackendState(cb) {
			return backendStore.subscribe((next) => {
				cb(next.state);
			});
		}
		function setState(next) {
			if (next === backendStore.getState().state) return;
			backendStore.setState({ state: next });
		}
		/** True if `input` targets our own backend (same-origin or root-relative). */
		function isBackendUrl(input) {
			if (input.startsWith("/")) return true;
			try {
				return new URL(input, window.location.origin).origin === window.location.origin;
			} catch {
				return false;
			}
		}
		function backoffMs(attempt) {
			const exp = Math.min(CAP_MS, BASE_MS * 2 ** attempt);
			return Math.round(exp * (.5 + Math.random() * .5));
		}
		/**
		* Drop-in replacement for `fetch()` with retry, backoff, GET dedup, and a
		* global liveness signal. Throws only on persistent network failure (after
		* MAX_RETRIES) or caller AbortError. Returns the Response for any HTTP
		* status (including 4xx/5xx) so existing `if (!res.ok)` checks keep working.
		*/
		async function apiFetch(input, init = {}) {
			const method = (init.method ?? "GET").toUpperCase();
			const backend = isBackendUrl(input);
			const dedupKey = method === "GET" && backend ? input : null;
			if (dedupKey && inflight.has(dedupKey)) return inflight.get(dedupKey).then((r) => {
				if (init.signal?.aborted) throw new DOMException("Aborted", "AbortError");
				if (r && typeof r.clone === "function") return r.clone();
				return r;
			});
			const run = async () => {
				const deadline = Date.now() + TOTAL_BUDGET_MS;
				let lastErr = null;
				for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
					if (init.signal?.aborted) throw new DOMException("Aborted", "AbortError");
					try {
						const ctrl = new AbortController();
						const callerSignal = init.signal;
						const bridge = () => ctrl.abort();
						callerSignal?.addEventListener("abort", bridge, { once: true });
						let res;
						try {
							res = await fetch(input, {
								...init,
								signal: ctrl.signal
							});
						} finally {
							callerSignal?.removeEventListener("abort", bridge);
						}
						if (shouldRetryStatus(res.status, method) && attempt < MAX_RETRIES && Date.now() < deadline) {
							if (backend) setState("degraded");
							await sleep(backoffMs(attempt), callerSignal);
							continue;
						}
						if (backend) {
							consecutiveFail = 0;
							setState("online");
						}
						return res;
					} catch (err) {
						if (err instanceof DOMException && err.name === "AbortError") throw err;
						lastErr = err;
						if (backend) {
							consecutiveFail++;
							setState(consecutiveFail >= OFFLINE_THRESHOLD ? "offline" : "degraded");
						}
						if (attempt < MAX_RETRIES && Date.now() < deadline) {
							const backSig = init.signal;
							await sleep(backoffMs(attempt), backSig);
						}
					}
				}
				throw lastErr instanceof Error ? lastErr : /* @__PURE__ */ new Error("network request failed");
			};
			const p = run();
			if (dedupKey) {
				inflight.set(dedupKey, p);
				p.then(() => {
					inflight.delete(dedupKey);
				}, () => {
					inflight.delete(dedupKey);
				});
			}
			return p;
		}
		/**
		* Convenience for JSON endpoints. Throws an Error on non-2xx (message
		* includes status + body excerpt) so callers can use try/catch directly.
		*/
		async function apiJson(input, init) {
			const res = await apiFetch(input, init);
			if (!res.ok) {
				let body = "";
				try {
					body = await res.text();
				} catch (readErr) {
					throw new Error(`${input}: ${res.status} ${res.statusText} (body read failed: ${readErr instanceof Error ? readErr.message : String(readErr)})`);
				}
				throw new Error(`${input}: ${res.status} ${res.statusText} ${body.slice(0, 200)}`);
			}
			return res.json();
		}
		var MAX_RETRIES, BASE_MS, CAP_MS, OFFLINE_THRESHOLD, TOTAL_BUDGET_MS, SAFE_METHODS, GATEWAY_CODES, backendStore, consecutiveFail, inflight;
		var init_api = __esmMin((() => {
			init_sleep();
			init_clientStore();
			MAX_RETRIES = 4;
			BASE_MS = 400;
			CAP_MS = 4e3;
			OFFLINE_THRESHOLD = 3;
			TOTAL_BUDGET_MS = 15e3;
			SAFE_METHODS = /* @__PURE__ */ new Set(["GET", "HEAD"]);
			GATEWAY_CODES = /* @__PURE__ */ new Set([
				502,
				503,
				504
			]);
			backendStore = createClientStore({ state: "online" });
			consecutiveFail = 0;
			inflight = /* @__PURE__ */ new Map();
		}));
		//#endregion
		//#region ../../web-kit/catalog/lib/contractToast.js
		/**
		* Wire the toast pusher the contract stores report through.
		* @param toast - the row's addToast (browser), a test recorder, or
		*                null to unwire (face teardown / HMR reload).
		*/
		function setContractToastSink(toast) {
			sink = toast;
		}
		/**
		* Fire one contract toast through the wired sink.
		* @param type - toast severity.
		* @param message - the operator-facing text.
		* @param action - optional Retry-style button.
		* @throws when no sink is wired — an unwired verdict must surface,
		*          not vanish.
		*/
		function contractToast(type, message, action) {
			if (sink === null) throw new Error("contract toast sink unset — call setContractToastSink() from the owning client face before reporting");
			sink(type, message, action);
		}
		var sink;
		var init_contractToast = __esmMin((() => {
			sink = null;
		}));
		//#endregion
		//#region ../../web-kit/catalog/lib/catalogContract.js
		function validateCatalogContract(catalog) {
			const violations = [];
			if (!isObj$1(catalog)) return {
				valid: false,
				violations: [{
					kind: "catalog",
					message: "Catalog is not an object — this is an error body, not a contract."
				}]
			};
			const families = catalog.families;
			if (!isObj$1(families)) violations.push({
				kind: "catalog",
				message: "Catalog has no `families` record — no family can be located."
			});
			const models = catalog.models;
			if (!isObj$1(models)) violations.push({
				kind: "catalog",
				message: "Catalog has no `models` record — no model can be located."
			});
			const capabilities = catalog.capabilities;
			if (capabilities !== void 0 && !isObj$1(capabilities)) violations.push({
				kind: "catalog",
				message: "`capabilities` is not a record keyed by id — capability routing is dead."
			});
			if (families === void 0 || models === void 0) return {
				valid: false,
				violations
			};
			if (isObj$1(families)) for (const [id, entry] of Object.entries(families)) {
				if (!isObj$1(entry)) {
					violations.push({
						kind: id,
						message: `Family ${id} is not an object.`
					});
					continue;
				}
				if (!isNonEmptyString(entry.label)) violations.push({
					kind: id,
					message: `Family ${id} declares no "label" — it would render as an empty picker entry.`
				});
				const modifiers = entry.modifiers;
				if (modifiers !== void 0 && modifiers !== null && !Array.isArray(modifiers)) violations.push({
					kind: id,
					message: `Family ${id} declares "modifiers" but it is not an array — modifier capability is unreadable.`
				});
				else if (Array.isArray(modifiers)) for (const raw of modifiers) {
					if (!isObj$1(raw) || typeof raw.kind !== "string") continue;
					if (raw.kind !== "controlnet" && raw.kind !== "lora") continue;
					const options = Array.isArray(raw.options) ? raw.options : [];
					if ((raw.cardinality ?? "list") === "list" && options.length === 0 && !raw.upload_dir) violations.push({
						kind: id,
						message: `Family ${id} modifier kind "${raw.kind}" carries ZERO options and no upload_dir — the dropdown would render empty (phantom capability).`
					});
				}
			}
			if (isObj$1(models)) for (const [id, entry] of Object.entries(models)) {
				if (!isObj$1(entry)) {
					violations.push({
						kind: id,
						message: `Model ${id} is not an object.`
					});
					continue;
				}
				const missing = [];
				if (!isNonEmptyString(entry.family)) missing.push("family");
				if (!isNonEmptyString(entry.form)) missing.push("form");
				if (!isNonEmptyString(entry.label)) missing.push("label");
				if (missing.length > 0) violations.push({
					kind: id,
					message: `Model ${id} is missing required key(s) ${missing.join(", ")} — it cannot route or render.`
				});
			}
			if (isObj$1(capabilities)) for (const [id, entry] of Object.entries(capabilities)) {
				if (!isObj$1(entry)) {
					violations.push({
						kind: id,
						message: `Capability ${id} is not an object.`
					});
					continue;
				}
				const missing = [];
				if (!isNonEmptyString(entry.label)) missing.push("label");
				const declaredFam = entry.default_family;
				if (declaredFam !== void 0 && !isNonEmptyString(declaredFam)) missing.push("default_family (present but not a string)");
				const resolved = entry.resolved;
				const hasRoute = isObj$1(resolved) && isNonEmptyString(resolved.family) && isNonEmptyString(resolved.model);
				if (!(Array.isArray(entry.families) && entry.families.length === 0) && !hasRoute && !isNonEmptyString(declaredFam)) missing.push("default_family or resolved route");
				if (!Array.isArray(entry.families)) missing.push("families");
				else if (entry.families.some((f) => !isNonEmptyString(f))) missing.push("families (non-string entries)");
				else if (entry.families.length === 0 && (isNonEmptyString(declaredFam) || hasRoute)) missing.push("families (routed but empty — the default points at no family)");
				if (missing.length > 0) violations.push({
					kind: id,
					message: `Capability ${id} is missing required key(s) ${missing.join(", ")} — it cannot route.`
				});
			}
			return {
				valid: violations.length === 0,
				violations
			};
		}
		var CatalogContractError, isObj$1, isNonEmptyString;
		var init_catalogContract = __esmMin((() => {
			CatalogContractError = class extends Error {
				violations;
				constructor(violations) {
					super(`Catalog contract violation (${violations.length}): ${violations[0]?.message ?? "unknown"}`);
					this.name = "CatalogContractError";
					this.violations = violations;
				}
			};
			isObj$1 = (v) => v != null && typeof v === "object" && !Array.isArray(v);
			isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;
		}));
		//#endregion
		//#region ../../web-kit/catalog/lib/modelCatalog.js
		var modelCatalog_exports = /* @__PURE__ */ __exportAll({
			activeVariantForRoute: () => activeVariantForRoute,
			axisCellExists: () => axisCellExists,
			canvasDefaultModel: () => canvasDefaultModel,
			composeVariantRoute: () => composeVariantRoute,
			controlnetTypesOf: () => controlnetTypesOf,
			dropdownModels: () => dropdownModels,
			ensureCatalog: () => ensureCatalog,
			familiesForForm: () => familiesForForm,
			familyAccepts: () => familyAccepts,
			familyCardSummary: () => familyCardSummary,
			familyConditioning: () => familyConditioning,
			familyGenre: () => familyGenre,
			familyHasVariantAxis: () => familyHasVariantAxis,
			familyLabel: () => familyLabel,
			familyOf: () => familyOf,
			familyOptionalOutputs: () => familyOptionalOutputs,
			familyPrimaryRoute: () => familyPrimaryRoute,
			familyTransformMatrix: () => familyTransformMatrix,
			formOf: () => formOf,
			getCachedCatalog: () => getCachedCatalog,
			hiddenFromDropdown: () => hiddenFromDropdown,
			isCatalogLoaded: () => isCatalogLoaded,
			loadCatalog: () => loadCatalog,
			modelDescription: () => modelDescription,
			modelLabel: () => modelLabel,
			narrowGenre: () => narrowGenre,
			onCatalogReady: () => onCatalogReady,
			presetsForRoute: () => presetsForRoute,
			primeCatalog: () => primeCatalog,
			routeCoordinates: () => routeCoordinates,
			studioOf: () => studioOf,
			variantLabel: () => variantLabel,
			variantSiblings: () => variantSiblings,
			variantsForRoute: () => variantsForRoute
		});
		/** Narrow the wire's plain string genre (string | null — the backend
		* Literal does not survive the wire as a type) onto the view union.
		* Out-of-vocabulary values return undefined (callers fall back) — never a
		* silent cast: an unknown genre must NOT masquerade as a known one. */
		function narrowGenre(g) {
			return CARD_GENRES.find((genre) => genre === g);
		}
		/** CN type keys a family declares — derived from its ``modifiers:`` block
		* (kind=controlnet options; the ONLY source of truth, Phase A finalé).
		* ServicePicker advertises CN support per tile from this — the "weird
		* reason" most models show no CN subcards: only families that declare a
		* controlnet kind have CN support (DiT models without compatible CN
		* trainings correctly declare nothing). */
		function controlnetTypesOf(family) {
			return ((family?.modifiers ?? []).find((m) => m.kind === "controlnet")?.options ?? []).map((o) => ({
				type: o.value,
				label: o.label
			}));
		}
		/** Subscribe to catalog readiness. Called when the catalog transitions from
		* null → populated. Returns an unsubscribe fn. R-S10 (2026-10-22): the
		* guard honors the doc — background TTL refreshes (setState with a new
		* catalog) re-fire nothing; only the null → populated transition fires. */
		function onCatalogReady(fn) {
			return catalogStore.subscribe((next, prev) => {
				if (!prev.catalog && next.catalog) fn();
			});
		}
		/** True after the catalog has been successfully loaded at least once. */
		function isCatalogLoaded() {
			return catalogStore.getState().loaded;
		}
		/** Fetch the model catalog. THROWS on non-2xx (no silent empty `{}`).
		* The caller MUST surface the error. Returning a fake empty catalog here
		* is what hid every "model dropdown is empty" bug — the user saw nothing
		* and the console warning was invisible. Loud failure is honest. */
		/** The ONE ingest gate (2026-08-11): validate BEFORE caching.
		* A catalog that violates the contract is a BACKEND bug — reported to the
		* contract store, NEVER cached, and the caller gets a
		* CatalogContractError (ensureCatalog will not auto-retry it). */
		function _ingest(data) {
			const { valid, violations } = validateCatalogContract(data);
			if (!valid) throw new CatalogContractError(violations);
			useCatalogContractStore.getState().reportOk();
			const catalog = data;
			_cacheTime = Date.now();
			catalogStore.setState({
				catalog,
				loaded: true
			});
			return catalog;
		}
		async function loadCatalog(opts) {
			const cached = catalogStore.getState().catalog;
			if (cached && !opts?.force) {
				if (Date.now() - _cacheTime > _CACHE_TTL_MS && !_inflight$4) _inflight$4 = (async () => {
					try {
						_ingest(await apiJson("/v1/model-catalog"));
					} catch (e) {
						if (e instanceof CatalogContractError) useCatalogContractStore.getState().reportViolation(e.violations);
						else useCatalogContractStore.getState().reportError(e instanceof Error ? e.message : String(e));
					}
					return catalogStore.getState().catalog;
				})().finally(() => {
					_inflight$4 = null;
				});
				return cached;
			}
			if (_inflight$4) return _inflight$4;
			_inflight$4 = (async () => {
				try {
					return _ingest(await apiJson("/v1/model-catalog"));
				} catch (e) {
					if (e instanceof CatalogContractError) useCatalogContractStore.getState().reportViolation(e.violations);
					else useCatalogContractStore.getState().reportError(e instanceof Error ? e.message : String(e));
					throw e;
				}
			})().finally(() => {
				_inflight$4 = null;
			});
			return _inflight$4;
		}
		/** Fire-and-forget background load with auto-retry. If the first attempt
		* fails (gateway reloading, network blip), schedules a retry after 3s.
		* Keeps trying until the catalog loads, then notifies subscribers.
		* Safe to call multiple times — collapses into a single inflight request. */
		function ensureCatalog() {
			if (catalogStore.getState().loaded) return;
			if (_inflight$4) return;
			loadCatalog().then(() => {
				if (_bgRetryTimer) {
					clearTimeout(_bgRetryTimer);
					_bgRetryTimer = null;
				}
			}).catch((e) => {
				if (e instanceof CatalogContractError) {
					console.error("[modelCatalog] catalog contract violation — not auto-retrying:", e.message);
					return;
				}
				console.warn("[modelCatalog] load failed, will retry in 3s:", e);
				if (_bgRetryTimer) clearTimeout(_bgRetryTimer);
				_bgRetryTimer = setTimeout(() => {
					_bgRetryTimer = null;
					ensureCatalog();
				}, 3e3);
			});
		}
		function getCachedCatalog() {
			return catalogStore.getState().catalog;
		}
		/** Seed the cache with pre-fetched data (test utility — production code uses
		* loadCatalog/ensureCatalog which fetch from the endpoint). Lets tests inject
		* a fake catalog without going to the network. */
		function primeCatalog(data) {
			catalogStore.setState({
				catalog: data,
				loaded: true
			});
		}
		/**
		* For route keys that are NOT top-level catalog entries (e.g. a quant-tier
		* sibling that only appears as a variant route on its parent), find the
		* parent model that owns the route via its ``variants:`` block.
		*/
		function parentModelForRoute(routeKey, cat) {
			for (const [key, spec] of Object.entries(cat.models)) if ((spec.variants ?? []).some((v) => v.route === routeKey)) return key;
		}
		function familyOf(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			if (!cat?.models) return void 0;
			const own = cat.models[routeKey]?.family;
			if (own) return own;
			const parent = parentModelForRoute(routeKey, cat);
			return parent ? cat.models[parent].family : void 0;
		}
		function studioOf(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf(routeKey, cat);
			if (!fam) return void 0;
			return cat.families?.[fam]?.studio ?? void 0;
		}
		/**
		* The catalog-declared FORM for a route key (the model's ``form`` — the
		* same id _FORM_CONFIGS keys by on the backend). Resolves variants to
		* their parent model like familyOf. The tag routes the model's
		* editor surface (the FORM LAW: a model without a form cannot route
		* or render). The 2026-09-18 retirement: the retired per-form alias
		* tables are gone — forms no longer reshape slot keys.
		*/
		function formOf(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			if (!cat?.models) return void 0;
			const own = cat.models[routeKey]?.form;
			if (own) return own;
			const parent = parentModelForRoute(routeKey, cat);
			return parent ? cat.models[parent].form : void 0;
		}
		function familyLabel(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf(routeKey, cat);
			if (!fam) return routeKey;
			return cat.families?.[fam]?.label ?? routeKey;
		}
		/**
		* The family-declared media genre for a route key. Resolves model routes
		* AND raw family ids (``detect``) — the catalog passthrough
		* emits ``genre:`` verbatim. Non-catalog services (trellis, kimodo, yaml
		* brick families) return undefined → callers fall back to their generic
		* badge. The schema-driven replacement for engine-name substring
		* classifiers.
		*/
		function familyGenre(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf(routeKey, cat);
			return narrowGenre((fam ? cat.families?.[fam]?.genre : void 0) ?? cat.families?.[routeKey]?.genre);
		}
		/**
		* The source-media types a family declares it ingests (FamilyEntry.accepts,
		* a closed literal on the backend). Returns the declared list, or
		* [] when the family declares none / is unknown.
		*
		* THE READER TODAY, STATED HONESTLY (the accepts-consumer audit,
		* 2026-10-10): this gate is SERVED (catalogEmission puts the DECL's
		* accepts on the /v1/model-catalog families block) and READ here,
		* but the promised last-mile consumer — a canvas drop handler
		* spawning an input card only for accepted media types — does not
		* exist in this checkout (the drop surface targets card slots via
		* the shared ASSET_DRAG_MIME contract, never spawns). The DECL's
		* truth is not a lie; the old comment's consumer was. The wiring
		* is owed work on the ROADMAP (canvas drop-spawn), and this
		* reader is the gate it will call — never a free-coded
		* isImageFile prefix check. (authored 2026-08-09; corrected
		* 2026-10-10)
		*/
		function familyAccepts(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf(routeKey, cat);
			return cat.families?.[fam ?? routeKey]?.accepts ?? [];
		}
		/**
		* The media-type→param applicability matrix for a family's gated source
		* params: {paramName → [media types it applies to]}. Returns {} when the
		* family declares no transforms / is unknown. The InputCardEditor gates
		* field renders on this (no trim control for an image — no time axis) and
		* applySource strips params whose declared types no longer include the new
		* source's type — both driven ENTIRELY by this declaration, no hardcoded
		* image/video/audio branches. ONE source (input_prep.yaml transforms:),
		* TWO consumers (this editor + backend _validate_params_for_media), zero
		* drift. (2026-08-09)
		*/
		function familyTransformMatrix(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf(routeKey, cat);
			const transforms = cat.families?.[fam ?? routeKey]?.transforms;
			if (!transforms) return {};
			const out = {};
			for (const t of transforms) out[t.name] = t.applies_to;
			return out;
		}
		/**
		* The family's declared video conditioning slots ([first_frame,
		* last_frame] for ltx) —
		* schema-driven input-wiring labels (no engine-name classifiers).
		*/
		/**
		* The compact card's declared size line (FamilyEntry.card_summary, a
		* validated block on the backend). Returns {width_param, height_param}
		* for generation families (rendered "WxH") OR {size_param, size_suffix} for
		* the Enhance / upscale families (rendered as a single value), or null when
		* the family declares no size line / is unknown. The CardTile reads whichever
		* is declared — no free-coded per-family dimension logic in the view.
		* (2026-08-09; size_param added 2026-08-10.)
		*/
		function familyCardSummary(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf(routeKey, cat);
			return cat.families?.[fam ?? routeKey]?.card_summary ?? null;
		}
		function familyConditioning(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf(routeKey, cat);
			if (!fam) return void 0;
			return cat.families?.[fam]?.video?.conditioning ?? void 0;
		}
		/**
		* The family's declared optional outputs (Option A — the optional-outputs
		* vocabulary). Empty/undefined when the family declares none (legacy
		* single-output compat). Consumers render one editor per entry, keyed by
		* ``genre`` — the input card no longer declares any (mask removed
		* 2026-08-14), so this is the vocabulary for OTHER families that do.
		*/
		function familyOptionalOutputs(familyId, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			return cat.families?.[familyId]?.optional_outputs ?? [];
		}
		/**
		* The catalog-declared Canvas default model route — the model whose entry
		* carries ``canvas_default: true`` (krea-2). Replaces the hardcoded
		* CANVAS_DEFAULT_MODEL; returns undefined before the catalog loads (the
		* caller keeps its own pre-catalog bootstrap value).
		*/
		function canvasDefaultModel(cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			return Object.entries(cat.models).find(([, m]) => m.canvas_default)?.[0];
		}
		/** Display name for a model within its family variant picker (Turbo / Base / Raw / …). */
		function variantLabel(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const m = cat.models?.[routeKey];
			return m?.variant_label ?? m?.label ?? routeKey;
		}
		/**
		* One entry per model family that has dropdown-visible members in the given
		* form. The primaryRoute is the catalog-declared `default_model` if present
		* (and visible), else the member whose key equals the family ID, else the
		* first visible member. Used to drive the family-level dropdown and the
		* empty-model seed. The default is FULLY catalog-declared — the frontend
		* never picks a default itself.
		*/
		function familiesForForm(formTag, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const visible = dropdownModels(formTag, cat);
			const seen = /* @__PURE__ */ new Set();
			const result = [];
			for (const key of visible) {
				const fam = cat.models[key]?.family ?? key;
				if (seen.has(fam)) continue;
				seen.add(fam);
				const members = visible.filter((k) => (cat.models[k]?.family ?? k) === fam);
				const declared = cat.families[fam]?.default_model;
				const primary = (declared && members.includes(declared) ? declared : void 0) ?? members.find((k) => k === fam) ?? members[0];
				result.push({
					familyId: fam,
					primaryRoute: primary,
					label: cat.families[fam]?.label ?? fam
				});
			}
			return result;
		}
		/**
		* Given a route key (including quant-tier variants like z-image-sd-q8),
		* return the family's primary route key — the one to use as the dropdown
		* value so the dropdown always shows the family even when a sub-variant is
		* selected.
		*/
		function familyPrimaryRoute(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf(routeKey, cat);
			if (!fam) return routeKey;
			const declared = cat.families[fam]?.default_model;
			if (declared && cat.models[declared]?.family === fam) return declared;
			const members = Object.entries(cat.models).filter(([, s]) => s.family === fam).map(([k]) => k);
			return members.find((k) => k === fam) ?? members[0];
		}
		function modelLabel(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const m = cat.models[routeKey];
			if (!m) return routeKey;
			return m.label ?? cat.families[m.family]?.label ?? routeKey;
		}
		/** Description for a model route, or undefined. Callers provide their own
		* fallback string — this returns `undefined` so `??` works. Reads the
		* `description:` declared on the model's family in the catalog YAML. */
		function modelDescription(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf(routeKey, cat);
			if (!fam) return void 0;
			return cat.families?.[fam]?.description ?? void 0;
		}
		function dropdownModels(formTag, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const out = [];
			for (const [key, spec] of Object.entries(cat.models)) {
				if (spec.hide_from_dropdown) continue;
				if (formTag) {
					if (spec.form !== formTag) continue;
				} else if (spec.edit_only) continue;
				out.push(key);
			}
			return out.sort();
		}
		function variantSiblings(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf(routeKey, cat);
			if (!fam) return routeKey ? [routeKey] : [];
			return Object.entries(cat.models).filter(([, s]) => s.family === fam).map(([k]) => k);
		}
		/**
		* Models hidden from the dropdown because they're reachable only via a
		* variant toggle (e.g. z-image-q5 — picked by clicking the Q5 button).
		*/
		function hiddenFromDropdown(cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			return new Set(Object.entries(cat.models).filter(([, m]) => m.hide_from_dropdown).map(([k]) => k));
		}
		/**
		* The ``variants:`` list for a model — resolves through the parent if the
		* route key is a quant-tier sibling (e.g. z-image-q5 inherits z-image's
		* variants). Returns ``[]`` for models without variants.
		*/
		function variantsForRoute(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const own = cat.models[routeKey]?.variants;
			if (own) return own;
			const parent = parentModelForRoute(routeKey, cat);
			return parent ? cat.models[parent].variants : [];
		}
		/**
		* The route's served recipe presets — the LOAD-TIME per-route merge
		* (2026-08-18, compose model): every route's ``presets`` dict is the
		* head base layer (presets/ on the model head) ⊕ the owning variant's
		* layer (variants/<vid>/presets/), both only_routes-filtered AT LOAD
		* (variant wins on id collision). Own-only read: the backend attaches
		* the merged dict to EVERY route, so a fallback chain (tree-head scan,
		* the retired family-block carve-out) would be a second precedence —
		* the exact two-sources drift the composer's contract forbids. The
		* card and the run door read the SAME per-route dict, so the
		* h3-timeline incident dies by construction. only_routes gating is
		* not re-derived here — the wire never carries a gated-out preset.
		*/
		function presetsForRoute(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const own = cat.models[routeKey]?.presets;
			return own && typeof own === "object" && Object.keys(own).length > 0 ? own : void 0;
		}
		/**
		* Find the variant whose route matches ``routeKey`` — used to highlight the
		* active toggle when the form is hydrated from saved state.
		*/
		function activeVariantForRoute(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const ownList = variantsForRoute(routeKey, cat);
			const own = ownList.find((v) => v.route === routeKey && (v.group ?? "Quant") === "Quant") ?? ownList.find((v) => v.route === routeKey);
			if (own) return own;
			for (const spec of Object.values(cat.models)) {
				const list = spec.variants ?? [];
				const hit = list.find((v) => v.route === routeKey && (v.group ?? "Quant") === "Quant") ?? list.find((v) => v.route === routeKey);
				if (hit) return hit;
			}
		}
		/**
		* The matrix coordinates of a route within its family's variant grid —
		* the values that distinguish it from its siblings. Read from the model
		* spec's ``variant`` (Turbo / Raw / Distilled / Base …) and ``quant``
		* (fp8 / q8 / q5 …) fields, resolving the FP8 default's quant through
		* its variant entries (the default route omits ``quant:`` since it IS
		* the fp8 tier).
		*
		* This is the ONE model for how variant axes compose (2026-08-08): every
		* axis is a labeled toggle row declared in ``variant_groups``, and the
		* routes are the cells of the grid. Krea 2 = Variant (Turbo/Raw) × Quant
		* (FP8/Q8/Q5) → 6 routes. The composer below switches one axis while
		* preserving the others.
		*/
		function routeCoordinates(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const m = cat.models[routeKey];
			return {
				variant: m?.variant ?? void 0,
				quant: m?.quant ?? activeVariantForRoute(routeKey, cat)?.quant ?? void 0
			};
		}
		/**
		* Resolve the route that combines the clicked variant's axis with the
		* current route's OTHER axes. Scans the family's routes (including the
		* ``hide_from_dropdown`` quant siblings) for the coordinate match, so
		* clicking "Raw" while on Turbo+Q8 lands on Raw+Q8 — never Raw+FP8.
		*
		* Group → axis mapping: a ``Quant`` group switches the quant tier (base
		* variant preserved); a ``Variant`` group switches the base variant (quant
		* preserved). The vocabulary is closed to Variant/Quant (the
		* canonical variant-group law, 2026-08-09 — "Speed" was a duplicate name for
		* the Variant axis). Patch-only entries (Lightning/Standard LoRA style)
		* with no ``route:`` never reach here — the caller handles those as draft
		* overlays.
		*
		* Falls back to the clicked entry's own ``route`` when no matrix sibling
		* matches (single-axis families, or a quant tier with no sibling for the
		* target variant). This is the ONE composition path — there is no longer
		* a separate sibling-picker (2026-08-08).
		*/
		/** The wanted matrix coordinates after one axis switch — the ONE
		* derivation shared by the composer and the existence check (a second
		* copy of this arithmetic would be the exact two-sources drift the
		* composer's contract forbids). A ``Quant`` click keeps the current
		* variant and takes the clicked quant; a ``Variant`` click keeps the
		* current quant and takes the clicked variant. */
		function axisWants(currentRoute, clicked, cat) {
			const cur = routeCoordinates(currentRoute, cat);
			const tgt = routeCoordinates(clicked.route, cat);
			const switchesQuant = clicked.group === "Quant";
			return {
				variant: switchesQuant ? cur.variant : tgt.variant ?? cur.variant,
				quant: switchesQuant ? clicked.quant ?? tgt.quant : cur.quant
			};
		}
		/** The ONE matrix-cell lookup: the route in ``fam`` whose coordinates are
		* exactly (variant, quant), or undefined when no such cell exists. */
		function matrixCell(fam, variant, quant, cat) {
			for (const [key, spec] of Object.entries(cat.models)) {
				if ((spec.family ?? key) !== fam) continue;
				const rc = routeCoordinates(key, cat);
				if (rc.variant === variant && rc.quant === quant) return key;
			}
		}
		function composeVariantRoute(currentRoute, clicked, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf(currentRoute, cat);
			const clickedRoute = clicked.route;
			if (!fam || !clickedRoute) return clickedRoute ?? currentRoute;
			const wants = axisWants(currentRoute, clicked, cat);
			return matrixCell(fam, wants.variant, wants.quant, cat) ?? clickedRoute;
		}
		/**
		* Only-existing-combinations (2026-08-16 — "ONLY show models combinations
		* that exist"): does clicking `clicked` from `currentRoute` land on a
		* REAL catalog cell?
		*
		* Derives the SAME wanted coordinates as the composer (axisWants — one
		* derivation) and asks the matrix directly whether that cell exists
		* (matrixCell). This is NOT derivable from composeVariantRoute's return:
		* the composer falls back to ``clicked.route`` when the cell is missing,
		* so a phantom combo and a real one return the same string — the silent
		* sibling-axis switch the fallback causes is exactly the phantom
		* combination this check keeps OUT of the axis dropdowns.
		*
		* Patch-only variants (no ``route``) always compose — they layer onto
		* whatever cell is active, so they always exist. An unresolvable family
		* (catalog not loaded yet) also passes: without the matrix we cannot
		* positively know a cell is missing, and the served variants list is
		* itself catalog-derived — hiding is only correct on positive evidence.
		*/
		function axisCellExists(currentRoute, clicked, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			if (!clicked.route) return true;
			const fam = familyOf(currentRoute, cat);
			if (!fam) return true;
			const wants = axisWants(currentRoute, clicked, cat);
			return matrixCell(fam, wants.variant, wants.quant, cat) !== void 0;
		}
		/**
		* True when the family owns its version axis via a declared ``Variant``
		* group (Krea 2 Turbo/Raw, …). The legacy sibling-picker defers to the
		* matrix system in that case so the two never render duplicate rows
		* (2026-08-08 — one system, not two).
		*/
		function familyHasVariantAxis(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf(routeKey, cat);
			const groups = fam ? cat.families?.[fam]?.variant_groups : void 0;
			return !!groups && "Variant" in groups;
		}
		var CARD_GENRES, catalogStore, _cacheTime, _CACHE_TTL_MS, _inflight$4, _bgRetryTimer;
		var init_modelCatalog = __esmMin((() => {
			init_api();
			init_catalogContract();
			init_catalogContractStore();
			init_clientStore();
			CARD_GENRES = [
				"image",
				"video",
				"audio",
				"3d",
				"motion",
				"other",
				"text"
			];
			catalogStore = createClientStore({
				catalog: null,
				loaded: false
			});
			_cacheTime = 0;
			_CACHE_TTL_MS = 3e4;
			_inflight$4 = null;
			_bgRetryTimer = null;
			ensureCatalog();
		}));
		//#endregion
		//#region ../../web-kit/catalog/lib/catalogContractStore.js
		/** Wall-clock stamp for error surfaces — a once-only toast may outlive the
		*  outage that produced it, so the operator should also see WHEN it fired.
		*  24h local time, seconds resolution. */
		function _stamp() {
			return (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour12: false });
		}
		/** Sink-safe toast for the STORE report paths (audit R-S4, 2026-10-22):
		*  `contractToast` stays loud for direct callers — an unwired sink must
		*  surface — but the outcome paths themselves must never throw through
		*  their result. At cold boot the module-warm ensureCatalog can race the
		*  entry face that wires the sink; an unwired reportOk used to throw
		*  BEFORE catalogStore.setState — a healthy load rejected and every
		*  retry re-failed. The toast is lost + logged here; the record stands.
		*/
		function _reportToast(type, message, action) {
			try {
				contractToast(type, message, action);
			} catch (err) {
				console.error("[catalogContract] toast not delivered (sink unwired):", message, err);
			}
		}
		/** Retry = force re-fetch the catalog (bypasses the TTL cache), which
		*  re-validates + re-reports. Lazy import: modelCatalog imports THIS store
		*  (for CatalogContractError reporting) — a static import would be circular. */
		function retryCatalog() {
			Promise.resolve().then(() => (init_modelCatalog(), modelCatalog_exports)).then(({ loadCatalog }) => loadCatalog({ force: true })).catch((err) => {
				console.error("[catalogContract] retryCatalog failed:", err);
			});
		}
		var IDLE, _lastToastedOutage, useCatalogContractStore;
		var init_catalogContractStore = __esmMin((() => {
			init_clientStore();
			init_contractToast();
			IDLE = {
				state: "idle",
				violations: [],
				error: null
			};
			_lastToastedOutage = null;
			useCatalogContractStore = createClientStore((set, get) => ({
				record: IDLE,
				reportOk: () => {
					const wasOutage = get().record.state === "error";
					_lastToastedOutage = null;
					set({ record: {
						state: "loaded",
						violations: [],
						error: null
					} });
					if (wasOutage) _reportToast("info", `Catalog back online (at ${_stamp()}).`);
				},
				reportViolation: (violations) => {
					console.error(`[catalogContract] catalog contract violation (at ${_stamp()}):`, violations);
					set({ record: {
						state: "violation",
						violations,
						error: null
					} });
					const first = violations[0];
					_reportToast("error", `Catalog contract violation — ${first ? first.kind && first.kind !== "catalog" ? `${first.kind}: ${first.message}` : first.message : "the catalog response did not match the expected shape"} (at ${_stamp()}). Some models may be missing. Retry re-fetches the catalog.`, {
						label: "Retry",
						onClick: retryCatalog
					});
				},
				reportError: (message) => {
					const clean = message.trim();
					console.error(`[catalogContract] catalog fetch failed (at ${_stamp()}):`, clean);
					set({ record: {
						state: "error",
						violations: [],
						error: clean
					} });
					if (clean === _lastToastedOutage) return;
					_lastToastedOutage = clean;
					_reportToast("error", `Catalog unavailable — ${clean} (at ${_stamp()}). Retry re-fetches the catalog.`, {
						label: "Retry",
						onClick: retryCatalog
					});
				},
				clear: () => {
					_lastToastedOutage = null;
					set({ record: IDLE });
				}
			}));
		}));
		//#endregion
		//#region ../../web-kit/catalog/lib/runStatusContract.js
		/** Validate a status payload against the ONE status-channel contract.
		* Accepts a parsed body of ANY response (200 or non-ok) — the caller
		* decides what a violation means on its branch. */
		function validateRunStatusContract(payload) {
			const violations = [];
			if (!isObj(payload)) return {
				valid: false,
				violations: [{
					field: "body",
					kind: "shape",
					message: "Status payload is not an object — this is an error body, not a contract."
				}]
			};
			if (typeof payload.run_id !== "string" || !payload.run_id) violations.push({
				field: "run_id",
				kind: "missing",
				message: "Status payload has no run_id — it cannot identify the run."
			});
			if (typeof payload.status !== "string" || !RUN_STATUSES.has(payload.status)) violations.push({
				field: "status",
				kind: "invalid",
				message: `Run-level status ${JSON.stringify(payload.status)} is not in the backend vocabulary (${[...RUN_STATUSES].join(", ")}).`
			});
			if (!Array.isArray(payload.stages)) violations.push({
				field: "stages",
				kind: "missing",
				message: "Status payload has no stages array — stage progress cannot be located."
			});
			else payload.stages.forEach((stage, i) => {
				if (!isObj(stage)) {
					violations.push({
						field: `stages.${i}`,
						kind: "shape",
						message: `Stage ${i} is not an object.`
					});
					return;
				}
				const core = [
					["id", stage.id],
					["name", stage.name],
					["index", stage.index],
					["status", stage.status]
				];
				for (const [field, value] of core) if (field === "index" ? typeof value !== "number" : typeof value !== "string") violations.push({
					field: `stages.${i}.${field}`,
					kind: "missing",
					message: `Stage ${i} has no ${field} — the stage cannot be rendered.`
				});
			});
			return {
				valid: violations.length === 0,
				violations
			};
		}
		/** True when a non-ok body carries the backend's contract-violation
		* signature (flow_status 500s: {error, run_id, violations: [...]}). */
		function hasViolationsSignature(body) {
			return isObj(body) && Array.isArray(body.violations);
		}
		var _RUN_STATUS_VALUES, RUN_STATUSES, RunStatusContractError, isObj;
		var init_runStatusContract = __esmMin((() => {
			_RUN_STATUS_VALUES = [
				"pending",
				"running",
				"completed",
				"failed",
				"stopped",
				"interrupted",
				"unknown",
				"queued"
			];
			RUN_STATUSES = new Set(_RUN_STATUS_VALUES);
			RunStatusContractError = class extends Error {
				violations;
				constructor(runId, violations) {
					super(`Run status contract violation for ${runId} (${violations.length}): ${violations[0]?.message ?? "unknown"}`);
					this.name = "RunStatusContractError";
					this.violations = violations;
				}
			};
			isObj = (v) => v != null && typeof v === "object" && !Array.isArray(v);
		}));
		//#endregion
		//#region ../../web-kit/catalog/lib/runStatusContractStore.js
		/** Re-poll the run — the toast's Retry action. Recovered → clear; still
		*  bad → re-report (a fresh toast). Lazy import: FlowProtocol pulls the
		*  whole protocol layer; the store only needs it on click. */
		function repoll(runId) {
			if (repollInFlight.has(runId)) return;
			repollInFlight.add(runId);
			Promise.resolve().then(() => (init_FlowProtocol$1(), FlowProtocol_exports$1)).then(({ pollFlowRun }) => pollFlowRun(runId, void 0, {
				maxWaitMs: 3e4,
				intervalMs: 2e3
			})).then(() => useRunStatusContractStore.getState().clear()).catch((err) => {
				console.error("[runStatusContract] repoll failed:", runId, err);
			}).finally(() => {
				repollInFlight.delete(runId);
			});
		}
		function toastVerdict(v) {
			const toast = contractToast;
			if (v.kind === "violation") {
				const first = v.violations[0]?.message ?? "the status response did not match the expected shape";
				toast("error", `Run ${v.runId}: ${v.violations.length} contract issue(s) — ${first}. Retry to re-check, or re-run the card.`, {
					label: "Retry",
					onClick: () => repoll(v.runId)
				});
			} else toast("error", `Run ${v.runId}: status channel error — ${v.message}. Retry to re-check.`, {
				label: "Retry",
				onClick: () => repoll(v.runId)
			});
		}
		var repollInFlight, useRunStatusContractStore;
		var init_runStatusContractStore = __esmMin((() => {
			init_clientStore();
			init_contractToast();
			repollInFlight = /* @__PURE__ */ new Set();
			useRunStatusContractStore = createClientStore((set) => ({
				verdict: null,
				reportViolation: (runId, violations) => {
					console.error("[runStatusContract] status channel violation:", runId, violations);
					const verdict = {
						kind: "violation",
						runId,
						violations
					};
					set({ verdict });
					toastVerdict(verdict);
				},
				reportError: (runId, message) => {
					console.error("[runStatusContract] status channel error:", runId, message);
					const verdict = {
						kind: "error",
						runId,
						message
					};
					set({ verdict });
					toastVerdict(verdict);
				},
				clear: () => set({ verdict: null })
			}));
		}));
		//#endregion
		//#region ../../web-kit/catalog/lib/familyParamContract.js
		var familyParamContract_exports$1 = /* @__PURE__ */ __exportAll({
			assertParamsMatchFamilySchema: () => assertParamsMatchFamilySchema$1,
			coerceParamsToSchema: () => coerceParamsToSchema$1,
			getFamilySchema: () => getFamilySchema$1,
			isFamilySchemaCachePopulated: () => isFamilySchemaCachePopulated$1,
			loadFamilySchemas: () => loadFamilySchemas$1,
			validateModifierEntries: () => validateModifierEntries$1,
			validateParamsAgainstSchema: () => validateParamsAgainstSchema$1
		});
		/** Ingest gate (audit R-S7, 2026-10-22): a 200 body is a schema index
		*  only when every value carries a `properties` record — an error
		*  envelope or a proxy's JSON non-index must never reach _cache. This
		*  mirrors modelCatalog._ingest (validate before caching), which this
		*  loader mirrors in every other respect. */
		function isValidSchemaIndex$1(data) {
			if (typeof data !== "object" || data === null) return false;
			for (const v of Object.values(data)) if (typeof v !== "object" || v === null || typeof v.properties !== "object" || v.properties === null) return false;
			return true;
		}
		/**
		* Load ALL family param schemas in ONE fetch. Mirrors loadCatalog: module-
		* level cache, inflight dedup, idempotent. Call at boot (alongside
		* loadCatalog) so the validator never blocks on a fetch.
		*
		* Returns the cached index on subsequent calls (no refetch). Use
		* { force: true } to bypass the cache.
		*/
		async function loadFamilySchemas$1(opts) {
			if (_cache$1 && !opts?.force) return _cache$1;
			if (_inflight$3) return _inflight$3;
			_inflight$3 = (async () => {
				try {
					const data = await apiJson("/v1/flows/families/param-schemas");
					if (!isValidSchemaIndex$1(data)) throw new Error(`families/param-schemas returned a malformed body (audit R-S7) — not cached, deferring to the backend gate`);
					_cache$1 = data;
					return data;
				} finally {
					_inflight$3 = null;
				}
			})();
			return _inflight$3;
		}
		/** Sync lookup — returns the cached schema for a family, or null if the
		* cache isn't loaded yet or the family is unknown. Pure, no fetch. */
		function getFamilySchema$1(familyId) {
			if (!_cache$1) return null;
			return _cache$1[familyId] ?? null;
		}
		/** Is the schema cache POPULATED (a successful bulk fetch with ≥1
		* family)? Distinguishes "transmission worked and the family is absent"
		* (a phantom family — throw) from the cache-cold/failed branch (defer). */
		function isFamilySchemaCachePopulated$1() {
			return !!_cache$1 && Object.keys(_cache$1).length > 0;
		}
		function jsonTypeOf$1(val) {
			/* v8 ignore next -- defensive: both callers (coerceParamsToSchema,
			* validateParamsAgainstSchema) route val === null through the defaulted
			* null path BEFORE calling, so null never reaches here (2026-09-12) */
			if (val === null) return "null";
			if (Array.isArray(val)) return "array";
			const t = typeof val;
			if (t === "string") return "string";
			if (t === "boolean") return "boolean";
			if (t === "number") return Number.isInteger(val) ? "integer" : "number";
			return "object";
		}
		/**
		* Coerce a params dict to a family's schema types — the TYPED RUN BODY.
		* Canonical coercions ONLY (2026-09-05 compile-time incident: form state,
		* stale drafts and legacy editors carry strings for numbers/booleans and
		* "" for empty arrays — the class admits the canonical forms, so the
		* boundary normalizes them instead of refusing what the backend takes):
		*   - integer/number: numbers kept (integer rejects fractions); a trimmed
		*     canonical numeric string becomes Number; "" means UNSET (falls into
		*     the null path: default-or-omit — "" is NEVER 0); anything else is
		*     a violation (never NaN into the wire).
		*   - boolean: booleans kept; "true"/"false" become bool; else violation.
		*   - array: arrays kept; "" becomes [] (the unowned picker's empty
		*     serialization — the class coerces the same); a non-empty string is
		*     a violation (ambiguous — never a split-guess).
		*   - string/object: kept on exact type; anything else is a violation
		*     (never String()-collapse, never JSON.parse-guess).
		*   - null / UNSET-"": OMITTED when the field declares a default —
		*     absent rides the backend default (the class's own semantics:
		*     explicit null refuses on numerics, so the boundary must never
		*     POST a null the click gate waved through — 2026-09-06
		*     frontend-impossible incident). A null/UNSET with NO default is
		*     kept so the validator refuses it loudly. Untyped fields (the
		*     loras/mask tile bags) pass null through untouched — the class's
		*     own None-coercion owns them, and it runs on explicit values.
		*   - fields with NO declared type (the loras/mask tile bags {}): passed
		*     through untouched — the compose door owns them.
		* Returns the typed copy + violations against the TYPED values (empty =
		* the body is exactly what the class admits — the POST must send THIS
		* body, never the raw draft).
		*/
		function coerceParamsToSchema$1(schema, params, opts = {}) {
			const out = [];
			const prefix = opts.pathPrefix ? `${opts.pathPrefix}.` : "";
			const typed = {};
			const props = schema.properties ?? {};
			for (const [key, val] of Object.entries(params)) {
				const field = props[key];
				if (!field || !field.type) {
					typed[key] = val;
					continue;
				}
				const expected = field.type;
				if (val === null) {
					if ("default" in field) continue;
					typed[key] = val;
					continue;
				}
				const actual = jsonTypeOf$1(val);
				if (actual === expected) {
					typed[key] = val;
					continue;
				}
				if (expected === "number" && actual === "integer") {
					typed[key] = val;
					continue;
				}
				const coerced = coerceScalar$1(key, expected, val);
				if ("value" in coerced) {
					typed[key] = coerced.value;
					continue;
				}
				if (coerced.unset) {
					if (field && "default" in field) continue;
					typed[key] = null;
					continue;
				}
				out.push({
					path: `${prefix}${key}`,
					message: `'${key}': expected ${expected}, got ${actual}`
				});
				typed[key] = val;
			}
			return {
				params: typed,
				violations: out
			};
		}
		/** Canonical scalar coercion. ok = coerced value; unset = "" for a
		* non-string field (the value is UNSET — the caller routes it into the
		* null path); neither = refuse loudly. */
		function coerceScalar$1(_key, expected, val) {
			if (typeof val === "string") {
				const t = val.trim();
				if (t === "") {
					if (expected === "array") return {
						ok: true,
						value: []
					};
					return {
						ok: false,
						unset: true
					};
				}
				if (expected === "integer" || expected === "number") {
					const n = Number(t);
					if (!Number.isFinite(n)) return {
						ok: false,
						unset: false
					};
					if (expected === "integer" && !Number.isInteger(n)) return {
						ok: false,
						unset: false
					};
					return {
						ok: true,
						value: n
					};
				}
				if (expected === "boolean") {
					if (t === "true") return {
						ok: true,
						value: true
					};
					if (t === "false") return {
						ok: true,
						value: false
					};
					return {
						ok: false,
						unset: false
					};
				}
				return {
					ok: false,
					unset: false
				};
			}
			return {
				ok: false,
				unset: false
			};
		}
		/**
		* Validate a params dict against a family's param schema. Pure + synchronous.
		* Returns violations (empty = clean). A null for a field WITH a default is
		* treated as "use the default" (no violation) — coerce strips such nulls
		* to absent before this runs, and absent rides the backend default; the
		* tolerance here is defense-in-depth for direct callers (the boundary
		* must NEVER POST a null the class would refuse — explicit null 400s
		* on every numeric row, so coerce omits, it never forwards). A null for
		* a field WITHOUT a default IS a violation.
		*
		* WHAT IT CATCHES (the motion_constraints bug class):
		*   - TYPE mismatches: a str param sent an object/number/array.
		*   - EXTRA fields: unknown param names (additionalProperties: false).
		*   - null for NON-defaulted fields.
		*
		* WHAT IT LEAVES TO THE BACKEND (no false positives):
		*   - REQUIRED-field presence — the frontend doesn't know which keys are
		*     injected from flow.shared via the consumes axis (comfy_url, model).
		*     The backend's card phase-1 compose knows the consumes set, so it
		*     knows. The frontend defers required-checking to the hard wire gate.
		*/
		function validateParamsAgainstSchema$1(schema, params, opts = {}) {
			const out = [];
			const prefix = opts.pathPrefix ? `${opts.pathPrefix}.` : "";
			const props = schema.properties ?? {};
			if (Object.keys(props).length === 0) return out;
			for (const [key, val] of Object.entries(params)) {
				const field = props[key];
				if (!field) {
					if (schema.additionalProperties === false && !WIRE_RELAXED_KEYS$1.has(key)) out.push({
						path: `${prefix}${key}`,
						message: `unknown parameter '${key}' — not in the family signature`
					});
					continue;
				}
				if (val === null) {
					if (!("default" in field)) out.push({
						path: `${prefix}${key}`,
						message: `'${key}' is null but has no default — provide a value`
					});
					continue;
				}
				const expected = field.type;
				if (!expected) continue;
				const actual = jsonTypeOf$1(val);
				if (actual === expected) continue;
				if (expected === "number" && actual === "integer") continue;
				out.push({
					path: `${prefix}${key}`,
					message: `'${key}': expected ${expected}, got ${actual}`
				});
			}
			return out;
		}
		/**
		* Validate a stage's modifier entries against the family's declared kinds.
		* validateModifierEntries (this file) is the owner: per declared kind with a
		* param_key, params[param_key] must honor the cardinality (list kinds take
		* a list of entry dicts bounded by max_stack; scalar kinds take ONE value),
		* and each entry's keys/required/type/bounds/select-membership must match
		* the declared fields. Empty = clean; never throws. No kinds → no-op.
		*/
		function validateModifierEntries$1(kinds, params) {
			const out = [];
			if (!kinds) return out;
			for (const kind of kinds) {
				const key = kind.param_key;
				const value = params[key];
				if (value === void 0 || value === null) continue;
				const fields = kind.fields ?? [];
				if ((kind.cardinality ?? "list") === "scalar") {
					if (typeof value === "object") {
						out.push({
							path: key,
							message: `expected a single scalar value for '${kind.kind}' (cardinality='scalar'), got ${Array.isArray(value) ? "array" : "object"}`
						});
						continue;
					}
					if (fields.length > 0 && fields[0].name) checkModEntry$1(out, { [fields[0].name]: value }, fields, kind, key, kind.kind === "controlnet");
					continue;
				}
				if (!Array.isArray(value)) {
					out.push({
						path: key,
						message: `expected a list of entries for '${kind.kind}' (cardinality='list'), got ${typeof value}`
					});
					continue;
				}
				if (typeof kind.max_stack === "number" && value.length > kind.max_stack) out.push({
					path: key,
					message: `stack of ${value.length} exceeds the declared max_stack (${kind.max_stack}) for '${kind.kind}'`
				});
				const cnKind = kind.kind === "controlnet";
				for (let i = 0; i < value.length; i++) {
					const entry = value[i];
					const entryPath = `${key}[${i}]`;
					if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
						out.push({
							path: entryPath,
							message: `expected a dict entry, got ${Array.isArray(entry) ? "array" : typeof entry}`
						});
						continue;
					}
					checkModEntry$1(out, entry, fields, kind, entryPath, cnKind);
				}
			}
			return out;
		}
		function checkModEntry$1(out, entry, fields, kind, path, cnKind) {
			const declared = /* @__PURE__ */ new Map();
			for (const f of fields) if (f.name) declared.set(f.name, f);
			const allowed = /* @__PURE__ */ new Set([...declared.keys(), ...EDITOR_MOD_ENTRY_KEYS$1]);
			for (const entryKey of Object.keys(entry)) if (!allowed.has(entryKey)) out.push({
				path: `${path}.${entryKey}`,
				message: `unknown field '${entryKey}'. Declared fields: ${[...declared.keys()].sort().join(", ")}.`
			});
			const kindOptions = (kind.options ?? []).map((o) => o?.value).filter((v) => typeof v === "string");
			const hasUploadDir = Boolean(kind.upload_dir);
			for (const f of fields) {
				const name = f.name;
				const val = entry[name];
				if (!(name in entry && val !== null && val !== void 0)) {
					if (f.default === void 0 && f.type !== "image" && name !== "artifact") out.push({
						path: `${path}.${name}`,
						message: `missing required field '${name}'.`
					});
					continue;
				}
				if (f.type === "integer" || f.type === "float") {
					if (typeof val !== "number") {
						out.push({
							path: `${path}.${name}`,
							message: `expected a number, got ${typeof val}.`
						});
						continue;
					}
					if (f.type === "integer" && !Number.isInteger(val)) {
						out.push({
							path: `${path}.${name}`,
							message: `expected an integer, got ${typeof val}.`
						});
						continue;
					}
					if (typeof f.min === "number" && val < f.min) out.push({
						path: `${path}.${name}`,
						message: `value ${val} below the declared minimum ${f.min}.`
					});
					if (typeof f.max === "number" && val > f.max) out.push({
						path: `${path}.${name}`,
						message: `value ${val} above the declared maximum ${f.max}.`
					});
				} else if (f.type === "boolean") {
					if (typeof val !== "boolean") out.push({
						path: `${path}.${name}`,
						message: `expected a boolean, got ${typeof val}.`
					});
				} else if (f.type === "string") {
					if (typeof val !== "string") out.push({
						path: `${path}.${name}`,
						message: `expected a string, got ${typeof val}.`
					});
					else if (name === "id" && kindOptions.length > 0 && !hasUploadDir && !cnKind) {
						if (!kindOptions.includes(val)) out.push({
							path: `${path}.${name}`,
							message: `unknown adapter '${val}'. Declared: ${[...kindOptions].sort().join(", ")}.`
						});
					}
				} else if (f.type === "select") {
					if (typeof val !== "string") {
						out.push({
							path: `${path}.${name}`,
							message: `expected a string, got ${typeof val}.`
						});
						continue;
					}
					if (f.options && f.options.length > 0) {
						if (!f.options.includes(val)) out.push({
							path: `${path}.${name}`,
							message: `unknown option '${val}'. Allowed: ${[...f.options].sort().join(", ")}.`
						});
					} else if (kindOptions.length > 0 && !hasUploadDir && !cnKind) {
						if (!kindOptions.includes(val)) out.push({
							path: `${path}.${name}`,
							message: `unknown option '${val}'. Declared: ${[...kindOptions].sort().join(", ")}.`
						});
					}
				}
			}
		}
		/**
		* Pre-submit gate: resolve model → family → schema (from the ONE cache),
		* validate params, throw on any violation. Called before EVERY GPU-starting
		* fetch so the crash comes before the button press, not after a round-trip.
		*
		* Ensures the schema cache is loaded (loadFamilySchemas) on the first call,
		* then validates synchronously.
		*
		* NO SILENT DEFERS (2026-08-16): the old gate no-op'd when the model was
		* missing from the catalog or the family had no schema — silently
		* shipping UNKNOWN params to the backend and calling that "the backend's
		* backstop". That is the silent-drop class this contract exists to kill:
		*   - catalog LOADED + model missing → THROW. The picker is showing a
		*     model that DOES NOT EXIST (the original operator complaint) — the
		*     catalog is the source of truth and the model is not in it.
		*   - family resolved + no schema → THROW. The schema transmission is
		*     broken (bulk fetch dropped it); deferring would validate against
		*     NOTHING. (The workflow:* exemption died with the workflow lane —
		*     §12.2; a workflow is a plugin card with a REAL signature now.)
		* The ONE honest defer left: the catalog cache is still cold at boot
		* (nothing fetched yet — cannot resolve anything, backend gate decides).
		*/
		async function assertParamsMatchFamilySchema$1(model, params) {
			let family;
			let modifiers;
			let cat;
			try {
				const { getCachedCatalog } = await Promise.resolve().then(() => (init_lib(), lib_exports));
				cat = getCachedCatalog();
				family = cat?.models?.[model]?.family;
				modifiers = cat?.families?.[family ?? ""]?.modifiers;
			} catch {
				return params;
			}
			if (!cat) return params;
			if (!family) throw new Error(`Parameter validation failed — model '${model}' is not in the catalog. The picker showed a model that DOES NOT EXIST; the catalog is the source of truth and this key is not in it. (The backend wire gate would 400 the same request.)`);
			try {
				await loadFamilySchemas$1();
			} catch {
				return params;
			}
			const schema = getFamilySchema$1(family);
			if (!schema) {
				if (isFamilySchemaCachePopulated$1()) throw new Error(`Parameter validation failed — family '${family}' (model '${model}') has no param schema in the populated cache — the backend does not know this family. Refusing to validate against nothing.`);
				return params;
			}
			const coerced = coerceParamsToSchema$1(schema, params);
			const violations = [...coerced.violations];
			violations.push(...validateParamsAgainstSchema$1(schema, coerced.params));
			violations.push(...validateModifierEntries$1(modifiers, params));
			if (violations.length > 0) {
				const lines = violations.map((v) => `  - ${v.path}: ${v.message}`).join("\n");
				throw new Error(`Parameter validation failed — the params do not match the '${family}' family signature. Fix before running:\n${lines}\n\n(The backend's wire gate would reject this same request with 400.)`);
			}
			return coerced.params;
		}
		var _cache$1, _inflight$3, WIRE_RELAXED_KEYS$1, EDITOR_MOD_ENTRY_KEYS$1;
		var init_familyParamContract$1 = __esmMin((() => {
			init_api();
			_cache$1 = null;
			_inflight$3 = null;
			WIRE_RELAXED_KEYS$1 = /* @__PURE__ */ new Set([
				"sampling_steps",
				"guide_scale",
				"num_frames",
				"end_image",
				"image1",
				"image2",
				"image3",
				"input_image",
				"first_frame",
				"last_frame",
				"input_glb",
				"prev_motion_artifact",
				"lanpaint_mask",
				"source_glb",
				"outfit_glb",
				"hair_glb",
				"motion_npz",
				"loras",
				"controlnets",
				"modifiers",
				"service",
				"source",
				"preset",
				"reference_audio",
				"reference_text",
				"rigged_path",
				"npz_path",
				"export_glb",
				"export_fbx",
				"export_usd",
				"export_obj",
				"detect_mode",
				"model_name",
				"t5_name",
				"vae_name"
			]);
			EDITOR_MOD_ENTRY_KEYS$1 = /* @__PURE__ */ new Set([
				"id",
				"value",
				"model",
				"preprocessor",
				"enabled",
				"source"
			]);
		}));
		//#endregion
		//#region ../../web-kit/catalog/lib/cardBirth.js
		var cardBirth_exports$1 = /* @__PURE__ */ __exportAll({
			composeCard: () => composeCard$1,
			ensureDraftId: () => ensureDraftId$1
		});
		/**
		* CARD BIRTH LAW (operator order 2026-09-06, verbatim):
		*
		*   "IF THERE IS NO DRAFT_ID, THAT IS A HARD ERROR! THAT NEEDS TO
		*    HAPPEN!"
		*
		* The start door (POST /v1/flows/start) refuses ANY body without a
		* valid, doc-backed draft_id — 4xx BEFORE any run registers
		* (submit(); wall:
		* the wall pins it).
		* Every run is born from an action card; a cardless row cannot be
		* born, so the media sidebar's "run has no action card (no draft_id
		* in its run row)" click error is unreachable for new runs.
		*
		* The ritual is mechanical and shared here (ONE implementation,
		* every caller — no copy-paste mints): compose the card first
		* (POST /v1/flows/drafts — the ray compose door mints the card doc,
		* the body preserved verbatim as its extras), then ride the minted
		* id on the start envelope.
		*/
		/** Mint the card doc for a start body. The doc carries the body
		*  verbatim (intent/stages/model/params become the card extras —
		*  see the drafts door, packages/estate/drafts, POST /v1/flows/drafts),
		*  so what the card shows is what the run consumed. Throws LOUDLY
		*  on any refusal — a refused compose never proceeds to a start
		*  (no silent cardless runs). */
		async function composeCard$1(body, signal) {
			const res = await fetch("/v1/flows/drafts", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
				signal
			});
			const text = await res.text();
			if (!res.ok) throw new Error(`card compose refused: HTTP ${res.status}${text ? `: ${text.slice(0, 400)}` : ""}`);
			let data;
			try {
				data = JSON.parse(text);
			} catch {
				throw new Error("card compose returned a non-JSON body");
			}
			const draftId = data.draftId;
			if (typeof draftId !== "string" || !draftId) throw new Error("card compose returned no draftId — refusing to start cardless");
			return draftId;
		}
		/** The card-birth half of every run start: return the body's
		*  declared draft_id when present, else compose the card and return
		*  the minted id. Stamp the result onto the start envelope BEFORE
		*  the start fetch:
		*
		*    startBody.draft_id = await ensureDraftId(startBody, signal)
		*/
		async function ensureDraftId$1(body, signal) {
			const declared = body.draft_id;
			if (typeof declared === "string" && declared !== "") return declared;
			return composeCard$1(body, signal);
		}
		var init_cardBirth$1 = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/catalog/lib/FlowProtocol.js
		var FlowProtocol_exports$1 = /* @__PURE__ */ __exportAll({
			assertNoParamDrops: () => assertNoParamDrops$1,
			collectNamedArtifacts: () => collectNamedArtifacts$1,
			collectStageUrls: () => collectStageUrls$1,
			describeErrorBody: () => describeErrorBody$1,
			pollFlowRun: () => pollFlowRun$1,
			runCompiledGeneration: () => runCompiledGeneration$1,
			sanitizeRevivedResult: () => sanitizeRevivedResult$1,
			setRequiredEmptyResolver: () => setRequiredEmptyResolver$1
		});
		/**
		* Extract the backend's error message from a non-2xx body for surfacing.
		*
		* Our backend always answers errors as `{"error": "..."}` — the string
		* carries REAL newlines once parsed (the wire JSON escapes them), which is
		* exactly what a multi-line flow doc parse error / validation report
		* looks like in the drilldown modal. When the body isn't JSON, or has no
		* string `error` field (proxy error page, unexpected shape), the raw text
		* is returned unchanged.
		*
		* 2026-08-10: the error path used to `slice(0, 200)` the body, which cut
		* "Validation failed: N violation(s)" reports mid-sentence — the full
		* error is now surfaced unmodified (user: "full errors in the modals").
		*/
		function describeErrorBody$1(text) {
			try {
				const parsed = JSON.parse(text);
				if (typeof parsed?.error === "string") return parsed.error;
			} catch {}
			return text;
		}
		/** Collect every artifact URL from a run status (stage.url + gallery).
		*  The FLAT list — preserves the legacy wire-by-position behavior (the
		*  primary output is always [0]). Use collectNamedArtifacts when the wire
		*  needs to address a specific named output (mask, detection, …). */
		function collectStageUrls$1(stages) {
			const urls = [];
			if (Array.isArray(stages)) for (const s of stages) {
				if (s.url) urls.push(s.url);
				if (Array.isArray(s.gallery)) {
					for (const g of s.gallery) if (g && typeof g.url === "string") urls.push(g.url);
				}
			}
			return urls;
		}
		/** Revived/stashed docs are untrusted (written by any client or session):
		*  artifacts + assetUrls must be STRING-only, or every consumer crashes
		*  (u.endsWith on undefined — motion card 2026-08-10). Filter instead of
		*  casting verbatim; callers still hard-error on structural doc junk.
		*  Missing numeric fields default so downstream guards (assetUrls.length)
		*  behave — never a null result while the result object is present. */
		function sanitizeRevivedResult$1(raw) {
			if (!raw || typeof raw !== "object") return null;
			const r = raw;
			const assetUrls = Array.isArray(r.assetUrls) ? r.assetUrls.filter((u) => typeof u === "string" && !!u) : [];
			const artifacts = {};
			if (r.artifacts && typeof r.artifacts === "object" && !Array.isArray(r.artifacts)) {
				for (const [k, v] of Object.entries(r.artifacts)) if (typeof v === "string" && v) artifacts[k] = v;
			}
			return {
				assetUrls,
				artifacts,
				metadata: r.metadata && typeof r.metadata === "object" ? r.metadata : {},
				completedAt: typeof r.completedAt === "number" ? r.completedAt : Date.now(),
				durationSec: typeof r.durationSec === "number" ? r.durationSec : 0
			};
		}
		/** Collect named artifacts from a run status → {name: URL}. The NAMED map
		*  — lets a downstream slot wire a SPECIFIC output (mask → lanpaint_mask)
		*  rather than only the primary (assetUrls[0]). Falls back to {} when the
		*  backend didn't send named_urls (legacy runs / single-output bricks). */
		function collectNamedArtifacts$1(stages) {
			const out = {};
			if (Array.isArray(stages)) {
				for (const s of stages) if (s.named_urls && typeof s.named_urls === "object") {
					for (const [name, url] of Object.entries(s.named_urls)) if (typeof url === "string" && url) out[name] = url;
				}
			}
			return out;
		}
		/**
		* Poll a flow run until terminal. Throws on error/timeout/abort.
		*
		* Terminal statuses: "completed"/"done" → success; "error"/"failed" →
		* throws with the run-level error message.
		*
		* `onTick(status)` fires after every successful poll — used by the store
		* to hydrate live KSampler step progress onto the running card BEFORE the
		* run goes terminal (so the per-card progress bar animates during the
		* run, 2026-08-08). Not fired on the terminal tick (the final status is
		* the return value).
		*/
		async function pollFlowRun$1(runId, signal, opts) {
			const maxWaitMs = opts?.maxWaitMs ?? 36e5;
			const intervalMs = opts?.intervalMs ?? 2e3;
			const started = performance.now();
			while (performance.now() - started < maxWaitMs) {
				if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
				const resp = await apiFetch(`/v1/flows/status/${runId}`, { signal });
				if (!resp.ok) {
					if (resp.status === 404) throw new Error(`Flow run ${runId} is gone — the server restarted mid-run. Re-run this card.`);
					let errorBody = null;
					try {
						errorBody = await resp.json();
					} catch {
						errorBody = null;
					}
					if (hasViolationsSignature(errorBody)) {
						const violations = errorBody.violations;
						useRunStatusContractStore.getState().reportViolation(runId, violations);
						throw new RunStatusContractError(runId, violations);
					}
					await sleep(intervalMs, signal);
					continue;
				}
				const data = await resp.json();
				const { valid, violations } = validateRunStatusContract(data);
				if (!valid) {
					useRunStatusContractStore.getState().reportViolation(runId, violations);
					throw new RunStatusContractError(runId, violations);
				}
				if (data.status === "completed") return data;
				if (data.status === "failed") {
					const detail = data.error;
					throw new Error(`Flow run ${runId} failed${detail ? `: ${detail}` : ""}`);
				}
				try {
					opts?.onTick?.(data);
				} catch (err) {
					console.error("[flow-protocol] onTick callback failed (poll continues):", err);
				}
				await sleep(intervalMs, signal);
			}
			throw new Error(`Flow run ${runId} timed out after ${Math.round(maxWaitMs / 6e4)} min`);
		}
		/** Register (or clear) the required-empty resolver. */
		function setRequiredEmptyResolver$1(fn) {
			_requiredEmptyResolver$1 = fn;
		}
		/**
		* HARD VALIDATION: no silent parameter drops in the generate request body.
		*
		* JSON.stringify silently drops `undefined` values — `{a: 1, b: undefined}`
		* serializes to `{"a":1}` with ZERO error. This is the TypeScript version
		* of the Python `**kwargs` absorb pattern: a field that was set in the form
		* state, survived into the body object, but vanishes on the wire with no
		* error, no warning. The backend receives defaults and the user sees
		* degraded output they can't diagnose.
		*
		* This function is called before EVERY GPU-starting fetch (generate,
		* startChain — the run doors) —
		* it is the universal gate. It catches:
		*   - `undefined` values (silently dropped by JSON.stringify)
		*   - `NaN` / `Infinity` (serialized as `null` — a value mutation)
		*   - `function` / `symbol` / `bigint` values (dropped or thrown by JSON)
		*   - empty string for known-critical fields (prompt, model)
		*
		* SILENT PARAMETER DROPS ARE COMPLETELY UNACCEPTABLE ANYWHERE EVER.
		*
		* @param body the request body about to be JSON.stringify'd and POST'd
		* @throws Error listing every field that would be silently dropped or mutated
		*/
		function assertNoParamDrops$1(body) {
			const dropped = [];
			const mutated = [];
			for (const [key, val] of Object.entries(body)) if (val === void 0) dropped.push(key);
			else if (typeof val === "number" && !Number.isFinite(val)) mutated.push(`${key} (NaN/Infinity → JSON serializes as null)`);
			else if (typeof val === "function" || typeof val === "symbol") dropped.push(`${key} (${typeof val} value — JSON.stringify drops it)`);
			else if (typeof val === "bigint") mutated.push(`${key} (bigint → JSON.stringify throws)`);
			if (typeof body.model === "string" && _requiredEmptyResolver$1) {
				const fields = _requiredEmptyResolver$1(body.model, body);
				for (const field of fields ?? []) {
					const v = body[field];
					if (typeof v === "string" && v.trim() === "") throw new Error(`'${field}' is empty for '${body.model}' — the model's form declares it required (the engine has no conditioning signal without it). Type it before running. (Backend semantic validator would 400 this same run.)`);
				}
			}
			if (dropped.length > 0 || mutated.length > 0) {
				const parts = [dropped.length > 0 ? `DROPPED: [${dropped.join(", ")}]` : "", mutated.length > 0 ? `MUTATED: [${mutated.join(", ")}]` : ""].filter(Boolean);
				throw new Error(`SILENT PARAMETER DROP DETECTED in generate request body — ${parts.join("; ")}. JSON.stringify would silently lose or mutate these values on the wire. SILENT PARAMETER DROPS ARE UNACCEPTABLE. Fix the caller to omit or set these fields explicitly.`);
			}
		}
		/** Append the door's 400 violation envelope ({violations: [{field,
		* message}]}) as one line per violation — a bare headline would silently
		* DROP the dotted paths (the whole point of a refusal is seeing WHICH
		* param failed). ONE construction, both run doors (compile + start). */
		function violationLines$1(text) {
			try {
				const parsed = JSON.parse(text);
				if (Array.isArray(parsed.violations)) {
					const lines = parsed.violations.map((v) => `${String(v.field ?? "?")}: ${String(v.message ?? "")}`).filter((line) => !line.endsWith(": "));
					if (lines.length > 0) return `\n${lines.join("\n")}`;
				}
			} catch {}
			return "";
		}
		async function runCompiledGeneration$1(body, signal, opts) {
			if (Array.isArray(body.loras)) {
				const { normalizeLoraEntry } = await Promise.resolve().then(() => (init_lib$1(), lib_exports$1));
				body = {
					...body,
					loras: body.loras.map((e) => e && typeof e === "object" ? normalizeLoraEntry(e) : e)
				};
			}
			assertNoParamDrops$1(body);
			let typedBody = body;
			if (typeof body.model === "string") {
				const { assertParamsMatchFamilySchema } = await Promise.resolve().then(() => (init_familyParamContract$1(), familyParamContract_exports$1));
				const paramOnly = {};
				for (const [k, v] of Object.entries(body)) {
					if (k === "model") continue;
					paramOnly[k] = v;
				}
				typedBody = {
					...await assertParamsMatchFamilySchema(body.model, paramOnly),
					model: body.model
				};
				const { ensureDraftId } = await Promise.resolve().then(() => (init_cardBirth$1(), cardBirth_exports$1));
				typedBody.draft_id = await ensureDraftId(typedBody, signal);
				const compileRes = await fetch("/v1/flows/validate", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(typedBody),
					signal
				});
				if (!compileRes.ok) {
					const text = await compileRes.text();
					throw new Error(`card failed to compile: HTTP ${compileRes.status}${text ? `: ${describeErrorBody$1(text)}` : ""}${violationLines$1(text)}`);
				}
			}
			if (typeof typedBody.draft_id !== "string" || typedBody.draft_id === "") {
				const { ensureDraftId } = await Promise.resolve().then(() => (init_cardBirth$1(), cardBirth_exports$1));
				typedBody.draft_id = await ensureDraftId(typedBody, signal);
			}
			const res = await fetch("/v1/flows/start", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(typedBody),
				signal
			});
			const text = await res.text();
			if (res.ok) {
				let data;
				try {
					data = JSON.parse(text);
				} catch {
					throw new Error(`generate failed: /v1/flows/start returned non-JSON body: ${text.slice(0, NON_JSON_BODY_CAP$1)}`);
				}
				const runId = data.run_id;
				if (typeof runId !== "string") throw new Error(`generate failed: /v1/flows/start returned no run_id: ${describeErrorBody$1(text)}`);
				try {
					opts?.onStart?.(runId);
				} catch (err) {
					console.error("[flow-protocol] onStart callback failed (run continues):", err);
				}
				const status = await pollFlowRun$1(runId, signal, {
					intervalMs: opts?.intervalMs,
					onTick: opts?.onTick
				});
				return {
					kind: "started",
					runId,
					status,
					urls: collectStageUrls$1(status.stages)
				};
			}
			throw new Error(`generate failed: HTTP ${res.status}${text ? `: ${describeErrorBody$1(text)}` : ""}${violationLines$1(text)}`);
		}
		var NON_JSON_BODY_CAP$1, _requiredEmptyResolver$1;
		var init_FlowProtocol$1 = __esmMin((() => {
			init_api();
			init_runStatusContract();
			init_runStatusContractStore();
			init_sleep();
			NON_JSON_BODY_CAP$1 = 2e3;
			_requiredEmptyResolver$1 = null;
		}));
		//#endregion
		//#region ../../web-kit/catalog/lib/tagMap.js
		/** Is the value a valid TagColor? Gates untrusted JSON (localStorage,
		*  a future server payload) before it enters the store. */
		function isTagColor$1(v) {
			return typeof v === "string" && TAG_COLOR_VALUES$1.includes(v);
		}
		function slugify$1(name) {
			return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "tag";
		}
		/** Generate a unique tag id from a name, appending -2, -3, … on collision. */
		function uniqueId$1(name, existing) {
			const base = slugify$1(name);
			if (!existing.has(base)) return base;
			let n = 2;
			while (existing.has(`${base}-${n}`)) n++;
			return `${base}-${n}`;
		}
		/** Cycle through the palette so consecutive new tags get distinct colors. */
		function nextColor$1(count) {
			return TAG_COLOR_VALUES$1[count % TAG_COLOR_VALUES$1.length];
		}
		/**
		* Boundary ratchet — gate untrusted JSON (localStorage OR a server payload)
		* before it enters the store. Drops any tag whose color isn't in the closed
		* enum, then rebuilds the forward index dropping orphan entries. This is the
		* store's own TagDocument validator; the server enforces the same rules
		* on PUT, but we don't trust the wire even from our own server
		* — defense in depth.
		*/
		function validateDocument$1(parsed) {
			const empty = {
				tags: {},
				map: {}
			};
			if (!parsed) return empty;
			const tags = {};
			for (const [id, def] of Object.entries(parsed.tags ?? {})) if (def && typeof def.name === "string" && isTagColor$1(def.color)) tags[id] = {
				id,
				name: def.name,
				color: def.color
			};
			const knownIds = new Set(Object.keys(tags));
			const map = {};
			for (const [key, ids] of Object.entries(parsed.map ?? {})) if (Array.isArray(ids)) {
				const clean = ids.filter((id) => typeof id === "string" && knownIds.has(id));
				if (clean.length > 0) map[key] = clean;
			}
			return {
				tags,
				map
			};
		}
		function loadPersisted$1() {
			if (typeof localStorage === "undefined") return {
				tags: {},
				map: {}
			};
			try {
				const raw = localStorage.getItem(STORAGE_KEY$1);
				if (!raw) return {
					tags: {},
					map: {}
				};
				return validateDocument$1(JSON.parse(raw));
			} catch {
				return {
					tags: {},
					map: {}
				};
			}
		}
		/**
		* Write-through to localStorage (synchronous cache) + schedule a debounced
		* server PUT. Called from every mutation action. The localStorage write is
		* unconditional (offline fallback stays fresh); the server PUT is gated by
		* `serverSyncEnabled`. Failures are swallowed (the local state is still
		* valid; the next successful mutation retries).
		*/
		function scheduleSync$1(data) {
			try {
				localStorage.setItem(STORAGE_KEY$1, JSON.stringify({
					tags: data.tags,
					map: data.map
				}));
			} catch {}
			retryTagSyncAfterFault$1();
			if (!serverSyncEnabled$1 || typeof fetch === "undefined") return;
			if (syncTimer$1) clearTimeout(syncTimer$1);
			syncTimer$1 = setTimeout(() => {
				syncTimer$1 = null;
				apiFetch("/v1/tags", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						tags: data.tags,
						map: data.map
					})
				}).catch((e) => {
					console.warn("[tagMap] server sync failed:", e);
				});
			}, SYNC_DEBOUNCE_MS$1);
		}
		async function initTagSync$1() {
			if (serverSyncEnabled$1) return;
			if (typeof fetch === "undefined") return;
			try {
				const res = await apiFetch("/v1/tags");
				if (!res.ok) {
					console.warn(`[tagMap] initTagSync got ${res.status} (not offline) — pushes deferred, will retry on next mutation`);
					_retrySyncOnNextMutation$1 = true;
					return;
				}
				const doc = validateDocument$1(await res.json());
				useTagMap$1.setState({
					tags: doc.tags,
					map: doc.map
				});
				serverSyncEnabled$1 = true;
			} catch {}
		}
		/** R-S9: called from the mutation path — retries the server sync exactly
		*  once after a transient boot fault, so the session's pushes resume
		*  without waiting for a reload. Server-canonical wholesale replace is
		*  NOT taken here (local edits may be newer); the debounced PUT after
		*  the next mutation reconciles the server copy. */
		async function retryTagSyncAfterFault$1() {
			if (serverSyncEnabled$1 || !_retrySyncOnNextMutation$1) return;
			_retrySyncOnNextMutation$1 = false;
			try {
				const res = await apiFetch("/v1/tags");
				if (!res.ok) {
					console.warn(`[tagMap] retryTagSync still ${res.status} — pushes stay off this session`);
					return;
				}
				serverSyncEnabled$1 = true;
				const { tags, map } = useTagMap$1.getState();
				scheduleSync$1({
					tags,
					map
				});
			} catch {}
		}
		/** Read tagsOf without a React subscription. The useListFilter accessor uses
		*  this so the filter flow doesn't need to re-subscribe on every item. */
		function tagsOf$1(key) {
			return useTagMap$1.getState().map[key] ?? [];
		}
		var TagColor$1, TAG_COLOR_VALUES$1, TAG_COLOR_META$1, STORAGE_KEY$1, SYNC_DEBOUNCE_MS$1, serverSyncEnabled$1, syncTimer$1, _retrySyncOnNextMutation$1, initial$1, tagMapActions$1, useTagMap$1;
		var init_tagMap$1 = __esmMin((() => {
			init_clientStore();
			init_api();
			TagColor$1 = {
				brand: "brand",
				sky: "sky",
				violet: "violet",
				rose: "rose",
				emerald: "emerald",
				amber: "amber",
				cyan: "cyan"
			};
			TAG_COLOR_VALUES$1 = Object.values(TagColor$1);
			TAG_COLOR_META$1 = {
				brand: {
					dot: "bg-brand",
					pill: "border-brand/30 bg-brand/10 text-brand"
				},
				sky: {
					dot: "bg-sky-500",
					pill: "border-sky-500/30 bg-sky-500/10 text-sky-400"
				},
				violet: {
					dot: "bg-violet-500",
					pill: "border-violet-500/30 bg-violet-500/10 text-violet-400"
				},
				rose: {
					dot: "bg-rose-500",
					pill: "border-rose-500/30 bg-rose-500/10 text-rose-400"
				},
				emerald: {
					dot: "bg-emerald-500",
					pill: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
				},
				amber: {
					dot: "bg-amber-500",
					pill: "border-amber-500/30 bg-amber-500/10 text-amber-400"
				},
				cyan: {
					dot: "bg-cyan-500",
					pill: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
				}
			};
			STORAGE_KEY$1 = "melite:tag-map:v1";
			SYNC_DEBOUNCE_MS$1 = 500;
			serverSyncEnabled$1 = false;
			syncTimer$1 = null;
			_retrySyncOnNextMutation$1 = false;
			initial$1 = loadPersisted$1();
			tagMapActions$1 = (set, get) => ({
				createTag: (name, color) => {
					const trimmed = name.trim();
					if (!trimmed) return "";
					const id = uniqueId$1(trimmed, new Set(Object.keys(get().tags)));
					const c = color ?? nextColor$1(Object.keys(get().tags).length);
					set((s) => {
						const tags = {
							...s.tags,
							[id]: {
								id,
								name: trimmed,
								color: c
							}
						};
						scheduleSync$1({
							tags,
							map: s.map
						});
						return { tags };
					});
					return id;
				},
				renameTag: (id, name) => {
					const trimmed = name.trim();
					if (!trimmed) return;
					set((s) => {
						const def = s.tags[id];
						if (!def) return s;
						const tags = {
							...s.tags,
							[id]: {
								...def,
								name: trimmed
							}
						};
						scheduleSync$1({
							tags,
							map: s.map
						});
						return { tags };
					});
				},
				recolorTag: (id, color) => {
					if (!isTagColor$1(color)) return;
					set((s) => {
						const def = s.tags[id];
						if (!def) return s;
						const tags = {
							...s.tags,
							[id]: {
								...def,
								color
							}
						};
						scheduleSync$1({
							tags,
							map: s.map
						});
						return { tags };
					});
				},
				deleteTag: (id) => {
					set((s) => {
						if (!s.tags[id]) return s;
						const tags = { ...s.tags };
						delete tags[id];
						const map = {};
						for (const [key, ids] of Object.entries(s.map)) {
							const filtered = ids.filter((t) => t !== id);
							if (filtered.length > 0) map[key] = filtered;
						}
						scheduleSync$1({
							tags,
							map
						});
						return {
							tags,
							map
						};
					});
				},
				setItemTags: (key, tagIds) => {
					const known = new Set(Object.keys(get().tags));
					const clean = [...new Set(tagIds)].filter((id) => known.has(id));
					set((s) => {
						const map = { ...s.map };
						if (clean.length > 0) map[key] = clean;
						else delete map[key];
						scheduleSync$1({
							tags: s.tags,
							map
						});
						return { map };
					});
				},
				addTagToItem: (key, tagId) => {
					if (!get().tags[tagId]) return;
					set((s) => {
						const current = s.map[key] ?? [];
						if (current.includes(tagId)) return s;
						const map = {
							...s.map,
							[key]: [...current, tagId]
						};
						scheduleSync$1({
							tags: s.tags,
							map
						});
						return { map };
					});
				},
				removeTagFromItem: (key, tagId) => {
					set((s) => {
						const current = s.map[key];
						if (!current || !current.includes(tagId)) return s;
						const next = current.filter((t) => t !== tagId);
						const map = { ...s.map };
						if (next.length > 0) map[key] = next;
						else delete map[key];
						scheduleSync$1({
							tags: s.tags,
							map
						});
						return { map };
					});
				},
				tagsOf: (key) => get().map[key] ?? [],
				hasTag: (key, tagId) => (get().map[key] ?? []).includes(tagId)
			});
			useTagMap$1 = createClientStore((set, get) => ({
				...tagMapActions$1(set, get),
				tags: initial$1.tags,
				map: initial$1.map
			}));
		}));
		//#endregion
		//#region ../../web-kit/catalog/lib/serviceForms.js
		async function loadForms$1(opts) {
			if (Object.keys(formsStore$1.getState().cache).length > 0 && !opts?.force) return formsStore$1.getState().cache;
			if (_inflight$2) return _inflight$2;
			_inflight$2 = (async () => {
				try {
					const res = await apiFetch("/v1/forms");
					if (!res.ok) {
						console.warn("[serviceForms] /v1/forms failed:", res.status);
						return formsStore$1.getState().cache;
					}
					const forms = (await res.json())?.forms;
					if (typeof forms !== "object" || forms === null || Array.isArray(forms)) {
						console.warn("[serviceForms] /v1/forms 200 with malformed body — keeping cache");
						return formsStore$1.getState().cache;
					}
					formsStore$1.setState({ cache: forms });
					return formsStore$1.getState().cache;
				} catch (e) {
					console.warn("[serviceForms] fetch error:", e);
					return formsStore$1.getState().cache;
				} finally {
					_inflight$2 = null;
				}
			})();
			return _inflight$2;
		}
		function getCachedForms$1() {
			return formsStore$1.getState().cache;
		}
		function subscribeForms$1(fn) {
			return formsStore$1.subscribe(() => {
				fn();
			});
		}
		/**
		* Reverse-lookup: given a sidebar_key (the value the rest of the app calls
		* `selectedService`), return the form-tag it belongs to. This is THE
		* primitive that drives every render decision in GenerateFormBody.
		*/
		function formForSidebarKey$1(sidebarKey, forms = formsStore$1.getState().cache) {
			for (const [formTag, entry] of Object.entries(forms)) if (entry.sidebar_key === sidebarKey) return formTag;
		}
		/**
		* Check whether the given sidebar_key belongs to the given form-tag.
		* Internal — the convenience predicates below are the public API.
		*/
		function isForm$1(sidebarKey, formTag, forms = formsStore$1.getState().cache) {
			return forms[formTag]?.sidebar_key === sidebarKey;
		}
		/** True if the sidebar_key belongs to ANY of the given form-tags. */
		function isInAnyForm$1(sidebarKey, formTags, forms = formsStore$1.getState().cache) {
			return formTags.some((t) => isForm$1(sidebarKey, t, forms));
		}
		/**
		* True if the sidebar_key belongs to any audio-genre form-tag.
		* (form_tts, form_voice, form_voice_studio, form_music, form_sound)
		*/
		function isAudioForm$1(sidebarKey, forms = formsStore$1.getState().cache) {
			return isInAnyForm$1(sidebarKey, [
				"form_tts",
				"form_voice",
				"form_voice_studio",
				"form_music",
				"form_sound"
			], forms);
		}
		/**
		* The ordered sidebar rows from a forms payload (§16 C-RAIL: /v1/forms is
		* rail-derived and carries `order`). Grouped by genre, sorted by
		* (order ?? Infinity, label) within the group — the entry's plugin-
		* declared order is the law; entries without one (legacy payloads) sort
		* last, label-alphabetical. Pure: the sidebar + tests share ONE item
		* builder, no drift between render and pin.
		*/
		function formSidebarItems$1(forms) {
			const out = {};
			for (const d of Object.values(forms)) {
				const genre = d.genre;
				const key = d.sidebar_key;
				if (!genre || !key) continue;
				const order = typeof d.order === "number" ? d.order : Infinity;
				(out[genre] ??= []).push({
					name: key,
					label: d.label || key,
					genre,
					order
				});
			}
			for (const items of Object.values(out)) items.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
			return out;
		}
		var formsStore$1, _inflight$2, isTtsForm$1, isVoiceForm$1, isVoiceStudioForm$1, isMusicForm$1, isGenerateForm$1, isEditForm$1;
		var init_serviceForms$1 = __esmMin((() => {
			init_api();
			init_clientStore();
			formsStore$1 = createClientStore({ cache: {} });
			_inflight$2 = null;
			isTtsForm$1 = (k) => isForm$1(k, "form_tts");
			isVoiceForm$1 = (k) => isForm$1(k, "form_voice");
			isVoiceStudioForm$1 = (k) => isForm$1(k, "form_voice_studio");
			isMusicForm$1 = (k) => isForm$1(k, "form_music");
			isGenerateForm$1 = (k) => isForm$1(k, "form_generate");
			isEditForm$1 = (k) => isForm$1(k, "form_edit");
		}));
		//#endregion
		//#region ../../web-kit/catalog/lib/waveform-peaks.js
		/** Compute min/max peaks for a single channel of PCM data.
		*  Exported for unit testing. */
		function computeMinMaxPeaks$1(data, numBuckets) {
			if (numBuckets <= 0 || data.length === 0) return [];
			const out = new Array(numBuckets);
			const blockSize = data.length / numBuckets;
			for (let i = 0; i < numBuckets; i++) {
				const start = Math.floor(i * blockSize);
				const end = Math.min(data.length, Math.floor((i + 1) * blockSize));
				let min = 0;
				let max = 0;
				for (let j = start; j < end; j++) {
					const v = data[j];
					if (v < min) min = v;
					if (v > max) max = v;
				}
				out[i] = {
					min,
					max
				};
			}
			return out;
		}
		/** Build all three LODs from raw PCM data. */
		function computeWaveformLODs$1(data) {
			return {
				low: computeMinMaxPeaks$1(data, LOD_BUCKETS$1.low),
				med: computeMinMaxPeaks$1(data, LOD_BUCKETS$1.med),
				high: computeMinMaxPeaks$1(data, LOD_BUCKETS$1.high)
			};
		}
		/** Pick the LOD whose bucket count best matches the available pixels.
		*  When pixelsAvailable is small, low; when huge, high. The threshold
		*  is the midpoint (geometric mean) between adjacent LODs. */
		function selectLOD$1(pixelsAvailable) {
			if (pixelsAvailable <= 0) return "low";
			if (pixelsAvailable < Math.sqrt(LOD_BUCKETS$1.low * LOD_BUCKETS$1.med)) return "low";
			if (pixelsAvailable < Math.sqrt(LOD_BUCKETS$1.med * LOD_BUCKETS$1.high)) return "med";
			return "high";
		}
		/** Resample a min/max peak array to a target output width by picking
		*  contiguous source buckets per output pixel (or aggregating when
		*  upscaling is needed). Returns a new array of length `targetWidth`. */
		function resampleForWidth$1(peaks, targetWidth) {
			if (targetWidth <= 0) return [];
			if (peaks.length === 0) return Array.from({ length: targetWidth }, () => ({
				min: 0,
				max: 0
			}));
			const out = new Array(targetWidth);
			if (peaks.length >= targetWidth) {
				const ratio = peaks.length / targetWidth;
				for (let i = 0; i < targetWidth; i++) {
					const start = Math.floor(i * ratio);
					const end = Math.min(peaks.length, Math.floor((i + 1) * ratio));
					let min = 0;
					let max = 0;
					for (let j = start; j < end; j++) {
						if (peaks[j].min < min) min = peaks[j].min;
						if (peaks[j].max > max) max = peaks[j].max;
					}
					out[i] = {
						min,
						max
					};
				}
			} else for (let i = 0; i < targetWidth; i++) {
				const src = peaks[Math.min(peaks.length - 1, Math.floor(i * peaks.length / targetWidth))];
				out[i] = {
					min: src.min,
					max: src.max
				};
			}
			return out;
		}
		/** Convenience: pick the right LOD + resample to exactly `width` pixels. */
		function getPeaksForWidth$1(cache, width) {
			return resampleForWidth$1(cache[selectLOD$1(width)], width);
		}
		/** Decode an audio URL into legacy + LOD waveform peaks.
		*
		*  Returns null on any failure (fetch error, decode error, etc.).
		*  The caller should treat null as "use the sine-wave placeholder". */
		async function decodeAudioPeaks$1(url) {
			let ctx = null;
			try {
				ctx = new AudioContext();
				const buf = await (await fetch(url)).arrayBuffer();
				const audio = await ctx.decodeAudioData(buf);
				const raw = audio.getChannelData(0);
				const samplesPerPeak = Math.max(1, Math.floor(raw.length / 80));
				const legacyPeaks = [];
				for (let i = 0; i < 80; i++) {
					let max = 0;
					for (let j = 0; j < samplesPerPeak; j++) {
						const val = Math.abs(raw[i * samplesPerPeak + j] || 0);
						if (val > max) max = val;
					}
					legacyPeaks.push(max);
				}
				const lod = computeWaveformLODs$1(raw);
				return {
					duration: audio.duration,
					legacyPeaks,
					lod
				};
			} catch (e) {
				console.error("[waveform-peaks] decodeAudioPeaks failed — falling back to the placeholder:", e);
				return null;
			} finally {
				if (ctx) Promise.resolve(ctx.close()).catch((e) => {
					console.error("[waveform-peaks] AudioContext close failed:", e);
				});
			}
		}
		var LOD_BUCKETS$1, LOD_ORDER$1;
		var init_waveform_peaks$1 = __esmMin((() => {
			LOD_BUCKETS$1 = {
				low: 100,
				med: 500,
				high: 2e3
			};
			LOD_ORDER$1 = [
				"low",
				"med",
				"high"
			];
		}));
		//#endregion
		//#region ../../web-kit/catalog/lib/enhance.js
		/**
		* The card's model picker source (2026-09-06): the LIVE route list
		* off the proof route — never a restated copy. Null when this
		* editor is NOT under a DSH host (no picker renders).
		*/
		async function fetchEnhanceRoutes$1(signal) {
			let res;
			try {
				res = await apiFetch(externalUrl("/melite-tools/catalog"), {
					method: "GET",
					signal
				});
			} catch (e) {
				console.error("[enhance] fetchEnhanceRoutes fetch failed (picker hidden):", e);
				return null;
			}
			if (!res.ok) {
				console.error(`[enhance] fetchEnhanceRoutes non-ok ${res.status} (picker hidden)`);
				return null;
			}
			try {
				const data = await res.json();
				if (!Array.isArray(data.llmRoutes)) {
					console.error("[enhance] fetchEnhanceRoutes body carried no llmRoutes array (picker hidden)");
					return null;
				}
				const routes = data.llmRoutes.filter((r) => typeof r === "string" && r.length > 0);
				return routes.length > 0 ? routes : null;
			} catch (e) {
				console.error("[enhance] fetchEnhanceRoutes body parse failed (picker hidden):", e);
				return null;
			}
		}
		/** Normalize a display/model name for matching: lowercase, keep
		* alphanumerics and dots ("GLM 4.7" / "glm-4.7" → "glm4.7"). */
		function normName$1(s) {
			return s.toLowerCase().replace(/[^a-z0-9.]/g, "");
		}
		/** Is this editor embedded under the DSH GUI (same-origin parent)?
		* Standalone → false (no picker exists; the host default serves). */
		function isEmbedded$1() {
			try {
				return window.parent !== window;
			} catch {
				return false;
			}
		}
		/**
		* Parse the picker trigger's aria-label (the LIVE-PROBED contract,
		* 2026-09-06: `Select model, current <NAME>, reasoning effort <E>`).
		* Returns the model display name, or null when the label doesn't
		* carry a current selection.
		*/
		function parsePickerAria$1(label) {
			const m = /select model,\s*current\s+(.+?)(?:,\s*reasoning|$)/i.exec(label);
			if (!m) return null;
			const name = m[1].trim();
			return name.length > 0 ? name : null;
		}
		/**
		* Read the GUI picker's CURRENT selection from the parent page
		* (2026-09-06, operator order: the button auto-follows the model I
		* have selected). The card iframe is same-origin with the DSH GUI.
		* Anchor (live-probed on the deployed build): the trigger button's
		* aria-label "Select model, current <NAME>, reasoning effort …" —
		* an accessible contract, not a CSS-module hash (the `*modelName*`
		* class probe found ZERO elements on the real page). Fallback: the
		* trigger's `*triggerLabel*` span text. Standalone/cross-origin →
		* null (host default serves).
		*/
		function readPickerModel$1() {
			try {
				const parent = window.parent;
				if (!parent || parent === window) return null;
				const doc = parent.document;
				if (!doc) return null;
				for (const btn of Array.from(doc.querySelectorAll("button[aria-label]"))) {
					const name = parsePickerAria$1(btn.getAttribute("aria-label") ?? "");
					if (name) return name;
				}
				const labels = Array.from(doc.querySelectorAll("[class*=\"triggerLabel\"]")).filter((el) => (el.textContent ?? "").trim().length > 0 && el.getClientRects().length > 0);
				const last = labels[labels.length - 1];
				return last ? last.textContent.trim() : null;
			} catch {
				return null;
			}
		}
		/**
		* Map the picker's display name onto one LIVE route
		* ("provider/model"). Exact normalized model equality first, then a
		* unique prefix ("Muse Spark" → muse-spark-1.3-contributor).
		* Ambiguous or unmatched → null (never a guess).
		*/
		function resolvePickerRoute$1(routes, pick) {
			const want = normName$1(pick);
			if (want.length === 0) return null;
			const models = routes.map((r) => {
				const i = r.indexOf("/");
				return {
					route: r,
					model: normName$1(i >= 0 ? r.slice(i + 1) : r)
				};
			});
			const exact = models.filter((m) => m.model === want);
			if (exact.length === 1) return exact[0].route;
			if (exact.length > 1) return null;
			const prefix = models.filter((m) => m.model.startsWith(want));
			if (prefix.length === 1) return prefix[0].route;
			return null;
		}
		/**
		* THE DeepSeek-harness door (2026-08-22): POST /melite-tools/enhance on the DSH
		* host — same origin from the chat embed — completes the enhancement with the
		* harness's OWN model (ctx.llm). NO keystore key involved, so inside the GUI
		* the Enhance button can never answer "no model". Returns null when this
		* editor is NOT running under the DSH host (standalone dev :5173 — the
		* route isn't there; Vite SPA-fallbacks answer HTML), letting the caller use
		* the keystore flow.
		*/
		async function enhanceViaHarness$1(systemPrompt, prompt, llm, signal) {
			let res;
			try {
				res = await apiFetch(externalUrl("/melite-tools/enhance"), {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					signal,
					body: JSON.stringify({
						system_prompt: systemPrompt,
						prompt,
						...llm !== void 0 && llm.length > 0 ? { llm } : {}
					})
				});
			} catch (e) {
				console.error("[enhance] enhance fetch failed (folding to the no-door verdict):", e);
				return null;
			}
			const text = await res.text();
			let data;
			try {
				data = JSON.parse(text);
			} catch {
				console.error(`[enhance] enhance answered non-JSON (status ${res.status}, body ${text.slice(0, 120)})`);
				if (!res.ok && isEmbedded$1()) {
					const err = /* @__PURE__ */ new Error(`Enhancement unavailable right now (the app host answered ${res.status} with a non-JSON body — likely transient; retry)`);
					err.name = "EnhanceTransientError";
					throw err;
				}
				return null;
			}
			if (typeof data.error === "string" && data.error.length > 0) throw new Error(`Enhancement failed (${res.status}): ${data.error.slice(0, 200)}`);
			if (!res.ok) {
				console.error(`[enhance] enhance answered JSON but not-ok ${res.status} with no error field`);
				if (isEmbedded$1()) {
					const err = /* @__PURE__ */ new Error(`Enhancement unavailable right now (the app host answered ${res.status}; likely transient — retry)`);
					err.name = "EnhanceTransientError";
					throw err;
				}
				return null;
			}
			const positive = String(data.positive ?? "").trim();
			const negative = String(data.negative ?? "").trim();
			if (!positive) {
				console.error(`[enhance] enhance answered ok but carried no positive prompt (via ${typeof data.via === "string" ? data.via : "?"})`);
				return null;
			}
			return {
				positive,
				negative,
				via: typeof data.via === "string" && data.via.length > 0 ? data.via : "?"
			};
		}
		async function enhancePrompt$1(systemPrompt, prompt, llm, signal) {
			const harnessed = await enhanceViaHarness$1(systemPrompt, prompt, llm, signal);
			if (harnessed !== null) return harnessed;
			throw new Error("Prompt enhance runs inside the DeepSeek app (/melite-tools/enhance not answered here)");
		}
		/**
		* AGENT ENHANCE (2026-08-22) — the ✦ Agent Enhance button's wire.
		* POST /melite-tools/enhance {model, prompt} on the DSH host: the agent
		* system's orchestration core sweeps EVERY declared enhance field of the
		* model (each with its own recipe) over the harness model in one press and
		* returns results keyed by field name. NO keystore key involved. Requires
		* the DSH app — standalone editors get an honest error.
		*/
		async function agentEnhance$1(model, prompt, temperature, llm, signal) {
			const res = await apiFetch(externalUrl("/melite-tools/enhance"), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				signal,
				body: JSON.stringify({
					model,
					prompt,
					...temperature !== void 0 ? { temperature } : {},
					...llm !== void 0 && llm.length > 0 ? { llm } : {}
				})
			});
			if (!res.ok) {
				const body = await res.text();
				let msg = body.slice(0, 200);
				try {
					const parsed = JSON.parse(body);
					if (typeof parsed.error === "string") msg = parsed.error;
				} catch {
					msg = "Agent Enhance runs inside the DeepSeek app — use Enhance here.";
				}
				throw new Error(`Agent Enhance failed (${res.status}): ${msg}`);
			}
			const data = await res.json();
			const results = {};
			for (const [field, v] of Object.entries(data.results ?? {})) results[field] = {
				positive: String(v?.positive ?? "").trim(),
				negative: String(v?.negative ?? "").trim(),
				via: typeof v?.via === "string" && v.via.length > 0 ? v.via : "?"
			};
			return results;
		}
		var init_enhance$1 = __esmMin((() => {
			init_api();
		}));
		//#endregion
		//#region ../../web-kit/catalog/lib/cardLlm.js
		/** Read the preferred card LLM route ("provider/model"), if set. */
		function getCardLlm$1() {
			try {
				const v = window.localStorage.getItem(CARD_LLM_KEY$1);
				return typeof v === "string" && v.length > 0 ? v : null;
			} catch {
				return null;
			}
		}
		/** Set (or clear, with null) the preferred card LLM route. */
		function setCardLlm$1(route) {
			try {
				if (route === null || route.length === 0) window.localStorage.removeItem(CARD_LLM_KEY$1);
				else window.localStorage.setItem(CARD_LLM_KEY$1, route);
			} catch {}
		}
		/**
		* The `llm` argument shape the enhance wire takes: undefined when
		* unset (Auto — the server resolves its preference chain).
		*/
		function cardLlmArg$1() {
			return getCardLlm$1() ?? void 0;
		}
		var CARD_LLM_KEY$1;
		var init_cardLlm$1 = __esmMin((() => {
			CARD_LLM_KEY$1 = "melite:card-llm:v1";
		}));
		//#endregion
		//#region ../../web-kit/catalog/lib/familyProvenance.js
		/** Fold runs into per-family provenance. Only runs that CARRY an
		*  artifact count (the fold's done family: done, cached, reused —
		*  the estate settles success as "completed", which the old raw
		*  `!== "done"` compare never matched, so every real run's
		*  provenance read "never"). Running / interrupted / stopped runs
		*  haven't produced anything yet. Runs with no families field
		*  (pre-provenance sidecars) or a family-less brick contribute
		*  nothing (backward compatible by construction). */
		function familyProvenance$1(runs) {
			const out = {};
			for (const run of runs) {
				const folded = statusOrPendingOf(run.status ?? "");
				if (folded !== "done" && folded !== "cached" && folded !== "reused") continue;
				const fams = run.families ?? [];
				if (fams.length === 0) continue;
				const at = typeof run.created_at === "number" ? run.created_at * 1e3 : 0;
				const seen = /* @__PURE__ */ new Set();
				for (const f of fams) {
					if (!f || seen.has(f)) continue;
					seen.add(f);
					const cur = out[f];
					if (cur) {
						cur.count += 1;
						if (at > cur.lastRunAt) cur.lastRunAt = at;
					} else out[f] = {
						count: 1,
						lastRunAt: at
					};
				}
			}
			return out;
		}
		/** Compact relative time for the tile title — "just now", "5m ago",
		*  "3h ago", "2d ago", then a short date. Pure; no i18n in scope. */
		function formatLastRun$1(at) {
			if (!at) return "never";
			const diff = Date.now() - at;
			if (diff < 6e4) return "just now";
			if (diff < 36e5) return `${Math.floor(diff / 6e4)}m ago`;
			if (diff < 864e5) return `${Math.floor(diff / 36e5)}h ago`;
			if (diff < 6048e5) return `${Math.floor(diff / 864e5)}d ago`;
			return new Date(at).toLocaleDateString();
		}
		var init_familyProvenance$1 = __esmMin((() => {
			init_stageView();
		}));
		//#endregion
		//#region ../../web-kit/catalog/lib/index.js
		var lib_exports = /* @__PURE__ */ __exportAll({
			CARD_LLM_KEY: () => CARD_LLM_KEY$1,
			CatalogContractError: () => CatalogContractError,
			LOD_BUCKETS: () => LOD_BUCKETS$1,
			LOD_ORDER: () => LOD_ORDER$1,
			RUN_STATUSES: () => RUN_STATUSES,
			RunStatusContractError: () => RunStatusContractError,
			TAG_COLOR_META: () => TAG_COLOR_META$1,
			TAG_COLOR_VALUES: () => TAG_COLOR_VALUES$1,
			TagColor: () => TagColor$1,
			activeVariantForRoute: () => activeVariantForRoute,
			agentEnhance: () => agentEnhance$1,
			apiFetch: () => apiFetch,
			apiJson: () => apiJson,
			assertNoParamDrops: () => assertNoParamDrops$1,
			assertParamsMatchFamilySchema: () => assertParamsMatchFamilySchema$1,
			axisCellExists: () => axisCellExists,
			canvasDefaultModel: () => canvasDefaultModel,
			cardLlmArg: () => cardLlmArg$1,
			coerceParamsToSchema: () => coerceParamsToSchema$1,
			collectNamedArtifacts: () => collectNamedArtifacts$1,
			collectStageUrls: () => collectStageUrls$1,
			composeCard: () => composeCard$1,
			composeVariantRoute: () => composeVariantRoute,
			computeMinMaxPeaks: () => computeMinMaxPeaks$1,
			computeWaveformLODs: () => computeWaveformLODs$1,
			contractToast: () => contractToast,
			controlnetTypesOf: () => controlnetTypesOf,
			decodeAudioPeaks: () => decodeAudioPeaks$1,
			describeErrorBody: () => describeErrorBody$1,
			dropdownModels: () => dropdownModels,
			enhancePrompt: () => enhancePrompt$1,
			ensureCatalog: () => ensureCatalog,
			ensureDraftId: () => ensureDraftId$1,
			externalUrl: () => externalUrl,
			familiesForForm: () => familiesForForm,
			familyAccepts: () => familyAccepts,
			familyCardSummary: () => familyCardSummary,
			familyConditioning: () => familyConditioning,
			familyGenre: () => familyGenre,
			familyHasVariantAxis: () => familyHasVariantAxis,
			familyLabel: () => familyLabel,
			familyOf: () => familyOf,
			familyOptionalOutputs: () => familyOptionalOutputs,
			familyPrimaryRoute: () => familyPrimaryRoute,
			familyProvenance: () => familyProvenance$1,
			familyTransformMatrix: () => familyTransformMatrix,
			fetchEnhanceRoutes: () => fetchEnhanceRoutes$1,
			formForSidebarKey: () => formForSidebarKey$1,
			formOf: () => formOf,
			formSidebarItems: () => formSidebarItems$1,
			formatLastRun: () => formatLastRun$1,
			getBackendState: () => getBackendState,
			getCachedCatalog: () => getCachedCatalog,
			getCachedForms: () => getCachedForms$1,
			getCardLlm: () => getCardLlm$1,
			getFamilySchema: () => getFamilySchema$1,
			getPeaksForWidth: () => getPeaksForWidth$1,
			hasViolationsSignature: () => hasViolationsSignature,
			hiddenFromDropdown: () => hiddenFromDropdown,
			initTagSync: () => initTagSync$1,
			isAudioForm: () => isAudioForm$1,
			isCatalogLoaded: () => isCatalogLoaded,
			isEditForm: () => isEditForm$1,
			isEmbedded: () => isEmbedded$1,
			isFamilySchemaCachePopulated: () => isFamilySchemaCachePopulated$1,
			isGenerateForm: () => isGenerateForm$1,
			isMusicForm: () => isMusicForm$1,
			isTagColor: () => isTagColor$1,
			isTtsForm: () => isTtsForm$1,
			isVoiceForm: () => isVoiceForm$1,
			isVoiceStudioForm: () => isVoiceStudioForm$1,
			loadCatalog: () => loadCatalog,
			loadFamilySchemas: () => loadFamilySchemas$1,
			loadForms: () => loadForms$1,
			modelDescription: () => modelDescription,
			modelLabel: () => modelLabel,
			narrowGenre: () => narrowGenre,
			onBackendState: () => onBackendState,
			onCatalogReady: () => onCatalogReady,
			parsePickerAria: () => parsePickerAria$1,
			pollFlowRun: () => pollFlowRun$1,
			presetsForRoute: () => presetsForRoute,
			primeCatalog: () => primeCatalog,
			readPickerModel: () => readPickerModel$1,
			resampleForWidth: () => resampleForWidth$1,
			resolvePickerRoute: () => resolvePickerRoute$1,
			retryTagSyncAfterFault: () => retryTagSyncAfterFault$1,
			routeCoordinates: () => routeCoordinates,
			runCompiledGeneration: () => runCompiledGeneration$1,
			sanitizeRevivedResult: () => sanitizeRevivedResult$1,
			selectLOD: () => selectLOD$1,
			setCardLlm: () => setCardLlm$1,
			setContractToastSink: () => setContractToastSink,
			setRequiredEmptyResolver: () => setRequiredEmptyResolver$1,
			studioOf: () => studioOf,
			subscribeForms: () => subscribeForms$1,
			tagsOf: () => tagsOf$1,
			useCatalogContractStore: () => useCatalogContractStore,
			useRunStatusContractStore: () => useRunStatusContractStore,
			useTagMap: () => useTagMap$1,
			validateCatalogContract: () => validateCatalogContract,
			validateModifierEntries: () => validateModifierEntries$1,
			validateParamsAgainstSchema: () => validateParamsAgainstSchema$1,
			validateRunStatusContract: () => validateRunStatusContract,
			variantLabel: () => variantLabel,
			variantSiblings: () => variantSiblings,
			variantsForRoute: () => variantsForRoute
		});
		var init_lib = __esmMin((() => {
			init_api();
			init_contractToast();
			init_catalogContract();
			init_catalogContractStore();
			init_modelCatalog();
			init_FlowProtocol$1();
			init_familyParamContract$1();
			init_tagMap$1();
			init_runStatusContractStore();
			init_runStatusContract();
			init_serviceForms$1();
			init_waveform_peaks$1();
			init_cardBirth$1();
			init_enhance$1();
			init_cardLlm$1();
			init_familyProvenance$1();
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/familyParamContract.ts
		var familyParamContract_exports = /* @__PURE__ */ __exportAll({
			assertParamsMatchFamilySchema: () => assertParamsMatchFamilySchema,
			coerceParamsToSchema: () => coerceParamsToSchema,
			getFamilySchema: () => getFamilySchema,
			isFamilySchemaCachePopulated: () => isFamilySchemaCachePopulated,
			loadFamilySchemas: () => loadFamilySchemas,
			validateModifierEntries: () => validateModifierEntries,
			validateParamsAgainstSchema: () => validateParamsAgainstSchema
		});
		/** Ingest gate (audit R-S7, 2026-10-22): a 200 body is a schema index
		*  only when every value carries a `properties` record — an error
		*  envelope or a proxy's JSON non-index must never reach _cache. This
		*  mirrors modelCatalog._ingest (validate before caching), which this
		*  loader mirrors in every other respect. */
		function isValidSchemaIndex(data) {
			if (typeof data !== "object" || data === null) return false;
			for (const v of Object.values(data)) if (typeof v !== "object" || v === null || typeof v.properties !== "object" || v.properties === null) return false;
			return true;
		}
		/**
		* Load ALL family param schemas in ONE fetch. Mirrors loadCatalog: module-
		* level cache, inflight dedup, idempotent. Call at boot (alongside
		* loadCatalog) so the validator never blocks on a fetch.
		*
		* Returns the cached index on subsequent calls (no refetch). Use
		* { force: true } to bypass the cache.
		*/
		async function loadFamilySchemas(opts) {
			if (_cache && !opts?.force) return _cache;
			if (_inflight$1) return _inflight$1;
			_inflight$1 = (async () => {
				try {
					const data = await apiJson$1("/v1/flows/families/param-schemas");
					if (!isValidSchemaIndex(data)) throw new Error(`families/param-schemas returned a malformed body (audit R-S7) — not cached, deferring to the backend gate`);
					_cache = data;
					return data;
				} finally {
					_inflight$1 = null;
				}
			})();
			return _inflight$1;
		}
		/** Sync lookup — returns the cached schema for a family, or null if the
		* cache isn't loaded yet or the family is unknown. Pure, no fetch. */
		function getFamilySchema(familyId) {
			if (!_cache) return null;
			return _cache[familyId] ?? null;
		}
		/** Is the schema cache POPULATED (a successful bulk fetch with ≥1
		* family)? Distinguishes "transmission worked and the family is absent"
		* (a phantom family — throw) from the cache-cold/failed branch (defer). */
		function isFamilySchemaCachePopulated() {
			return !!_cache && Object.keys(_cache).length > 0;
		}
		function jsonTypeOf(val) {
			/* v8 ignore next -- defensive: both callers (coerceParamsToSchema,
			* validateParamsAgainstSchema) route val === null through the defaulted
			* null path BEFORE calling, so null never reaches here (2026-09-12) */
			if (val === null) return "null";
			if (Array.isArray(val)) return "array";
			const t = typeof val;
			if (t === "string") return "string";
			if (t === "boolean") return "boolean";
			if (t === "number") return Number.isInteger(val) ? "integer" : "number";
			return "object";
		}
		/**
		* Coerce a params dict to a family's schema types — the TYPED RUN BODY.
		* Canonical coercions ONLY (2026-09-05 compile-time incident: form state,
		* stale drafts and legacy editors carry strings for numbers/booleans and
		* "" for empty arrays — the class admits the canonical forms, so the
		* boundary normalizes them instead of refusing what the backend takes):
		*   - integer/number: numbers kept (integer rejects fractions); a trimmed
		*     canonical numeric string becomes Number; "" means UNSET (falls into
		*     the null path: default-or-omit — "" is NEVER 0); anything else is
		*     a violation (never NaN into the wire).
		*   - boolean: booleans kept; "true"/"false" become bool; else violation.
		*   - array: arrays kept; "" becomes [] (the unowned picker's empty
		*     serialization — the class coerces the same); a non-empty string is
		*     a violation (ambiguous — never a split-guess).
		*   - string/object: kept on exact type; anything else is a violation
		*     (never String()-collapse, never JSON.parse-guess).
		*   - null / UNSET-"": OMITTED when the field declares a default —
		*     absent rides the backend default (the class's own semantics:
		*     explicit null refuses on numerics, so the boundary must never
		*     POST a null the click gate waved through — 2026-09-06
		*     frontend-impossible incident). A null/UNSET with NO default is
		*     kept so the validator refuses it loudly. Untyped fields (the
		*     loras/mask tile bags) pass null through untouched — the class's
		*     own None-coercion owns them, and it runs on explicit values.
		*   - fields with NO declared type (the loras/mask tile bags {}): passed
		*     through untouched — the compose door owns them.
		* Returns the typed copy + violations against the TYPED values (empty =
		* the body is exactly what the class admits — the POST must send THIS
		* body, never the raw draft).
		*/
		function coerceParamsToSchema(schema, params, opts = {}) {
			const out = [];
			const prefix = opts.pathPrefix ? `${opts.pathPrefix}.` : "";
			const typed = {};
			const props = schema.properties ?? {};
			for (const [key, val] of Object.entries(params)) {
				const field = props[key];
				if (!field || !field.type) {
					typed[key] = val;
					continue;
				}
				const expected = field.type;
				if (val === null) {
					if ("default" in field) continue;
					typed[key] = val;
					continue;
				}
				const actual = jsonTypeOf(val);
				if (actual === expected) {
					typed[key] = val;
					continue;
				}
				if (expected === "number" && actual === "integer") {
					typed[key] = val;
					continue;
				}
				const coerced = coerceScalar(key, expected, val);
				if ("value" in coerced) {
					typed[key] = coerced.value;
					continue;
				}
				if (coerced.unset) {
					if (field && "default" in field) continue;
					typed[key] = null;
					continue;
				}
				out.push({
					path: `${prefix}${key}`,
					message: `'${key}': expected ${expected}, got ${actual}`
				});
				typed[key] = val;
			}
			return {
				params: typed,
				violations: out
			};
		}
		/** Canonical scalar coercion. ok = coerced value; unset = "" for a
		* non-string field (the value is UNSET — the caller routes it into the
		* null path); neither = refuse loudly. */
		function coerceScalar(_key, expected, val) {
			if (typeof val === "string") {
				const t = val.trim();
				if (t === "") {
					if (expected === "array") return {
						ok: true,
						value: []
					};
					return {
						ok: false,
						unset: true
					};
				}
				if (expected === "integer" || expected === "number") {
					const n = Number(t);
					if (!Number.isFinite(n)) return {
						ok: false,
						unset: false
					};
					if (expected === "integer" && !Number.isInteger(n)) return {
						ok: false,
						unset: false
					};
					return {
						ok: true,
						value: n
					};
				}
				if (expected === "boolean") {
					if (t === "true") return {
						ok: true,
						value: true
					};
					if (t === "false") return {
						ok: true,
						value: false
					};
					return {
						ok: false,
						unset: false
					};
				}
				return {
					ok: false,
					unset: false
				};
			}
			return {
				ok: false,
				unset: false
			};
		}
		/**
		* Validate a params dict against a family's param schema. Pure + synchronous.
		* Returns violations (empty = clean). A null for a field WITH a default is
		* treated as "use the default" (no violation) — coerce strips such nulls
		* to absent before this runs, and absent rides the backend default; the
		* tolerance here is defense-in-depth for direct callers (the boundary
		* must NEVER POST a null the class would refuse — explicit null 400s
		* on every numeric row, so coerce omits, it never forwards). A null for
		* a field WITHOUT a default IS a violation.
		*
		* WHAT IT CATCHES (the motion_constraints bug class):
		*   - TYPE mismatches: a str param sent an object/number/array.
		*   - EXTRA fields: unknown param names (additionalProperties: false).
		*   - null for NON-defaulted fields.
		*
		* WHAT IT LEAVES TO THE BACKEND (no false positives):
		*   - REQUIRED-field presence — the frontend doesn't know which keys are
		*     injected from flow.shared via the consumes axis (comfy_url, model).
		*     The backend's card phase-1 compose knows the consumes set, so it
		*     knows. The frontend defers required-checking to the hard wire gate.
		*/
		function validateParamsAgainstSchema(schema, params, opts = {}) {
			const out = [];
			const prefix = opts.pathPrefix ? `${opts.pathPrefix}.` : "";
			const props = schema.properties ?? {};
			if (Object.keys(props).length === 0) return out;
			for (const [key, val] of Object.entries(params)) {
				const field = props[key];
				if (!field) {
					if (schema.additionalProperties === false && !WIRE_RELAXED_KEYS.has(key)) out.push({
						path: `${prefix}${key}`,
						message: `unknown parameter '${key}' — not in the family signature`
					});
					continue;
				}
				if (val === null) {
					if (!("default" in field)) out.push({
						path: `${prefix}${key}`,
						message: `'${key}' is null but has no default — provide a value`
					});
					continue;
				}
				const expected = field.type;
				if (!expected) continue;
				const actual = jsonTypeOf(val);
				if (actual === expected) continue;
				if (expected === "number" && actual === "integer") continue;
				out.push({
					path: `${prefix}${key}`,
					message: `'${key}': expected ${expected}, got ${actual}`
				});
			}
			return out;
		}
		/**
		* Validate a stage's modifier entries against the family's declared kinds.
		* validateModifierEntries (this file) is the owner: per declared kind with a
		* param_key, params[param_key] must honor the cardinality (list kinds take
		* a list of entry dicts bounded by max_stack; scalar kinds take ONE value),
		* and each entry's keys/required/type/bounds/select-membership must match
		* the declared fields. Empty = clean; never throws. No kinds → no-op.
		*/
		function validateModifierEntries(kinds, params) {
			const out = [];
			if (!kinds) return out;
			for (const kind of kinds) {
				const key = kind.param_key;
				const value = params[key];
				if (value === void 0 || value === null) continue;
				const fields = kind.fields ?? [];
				if ((kind.cardinality ?? "list") === "scalar") {
					if (typeof value === "object") {
						out.push({
							path: key,
							message: `expected a single scalar value for '${kind.kind}' (cardinality='scalar'), got ${Array.isArray(value) ? "array" : "object"}`
						});
						continue;
					}
					if (fields.length > 0 && fields[0].name) checkModEntry(out, { [fields[0].name]: value }, fields, kind, key, kind.kind === "controlnet");
					continue;
				}
				if (!Array.isArray(value)) {
					out.push({
						path: key,
						message: `expected a list of entries for '${kind.kind}' (cardinality='list'), got ${typeof value}`
					});
					continue;
				}
				if (typeof kind.max_stack === "number" && value.length > kind.max_stack) out.push({
					path: key,
					message: `stack of ${value.length} exceeds the declared max_stack (${kind.max_stack}) for '${kind.kind}'`
				});
				const cnKind = kind.kind === "controlnet";
				for (let i = 0; i < value.length; i++) {
					const entry = value[i];
					const entryPath = `${key}[${i}]`;
					if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
						out.push({
							path: entryPath,
							message: `expected a dict entry, got ${Array.isArray(entry) ? "array" : typeof entry}`
						});
						continue;
					}
					checkModEntry(out, entry, fields, kind, entryPath, cnKind);
				}
			}
			return out;
		}
		function checkModEntry(out, entry, fields, kind, path, cnKind) {
			const declared = /* @__PURE__ */ new Map();
			for (const f of fields) if (f.name) declared.set(f.name, f);
			const allowed = /* @__PURE__ */ new Set([...declared.keys(), ...EDITOR_MOD_ENTRY_KEYS]);
			for (const entryKey of Object.keys(entry)) if (!allowed.has(entryKey)) out.push({
				path: `${path}.${entryKey}`,
				message: `unknown field '${entryKey}'. Declared fields: ${[...declared.keys()].sort().join(", ")}.`
			});
			const kindOptions = (kind.options ?? []).map((o) => o?.value).filter((v) => typeof v === "string");
			const hasUploadDir = Boolean(kind.upload_dir);
			for (const f of fields) {
				const name = f.name;
				const val = entry[name];
				if (!(name in entry && val !== null && val !== void 0)) {
					if (f.default === void 0 && f.type !== "image" && name !== "artifact") out.push({
						path: `${path}.${name}`,
						message: `missing required field '${name}'.`
					});
					continue;
				}
				if (f.type === "integer" || f.type === "float") {
					if (typeof val !== "number") {
						out.push({
							path: `${path}.${name}`,
							message: `expected a number, got ${typeof val}.`
						});
						continue;
					}
					if (f.type === "integer" && !Number.isInteger(val)) {
						out.push({
							path: `${path}.${name}`,
							message: `expected an integer, got ${typeof val}.`
						});
						continue;
					}
					if (typeof f.min === "number" && val < f.min) out.push({
						path: `${path}.${name}`,
						message: `value ${val} below the declared minimum ${f.min}.`
					});
					if (typeof f.max === "number" && val > f.max) out.push({
						path: `${path}.${name}`,
						message: `value ${val} above the declared maximum ${f.max}.`
					});
				} else if (f.type === "boolean") {
					if (typeof val !== "boolean") out.push({
						path: `${path}.${name}`,
						message: `expected a boolean, got ${typeof val}.`
					});
				} else if (f.type === "string") {
					if (typeof val !== "string") out.push({
						path: `${path}.${name}`,
						message: `expected a string, got ${typeof val}.`
					});
					else if (name === "id" && kindOptions.length > 0 && !hasUploadDir && !cnKind) {
						if (!kindOptions.includes(val)) out.push({
							path: `${path}.${name}`,
							message: `unknown adapter '${val}'. Declared: ${[...kindOptions].sort().join(", ")}.`
						});
					}
				} else if (f.type === "select") {
					if (typeof val !== "string") {
						out.push({
							path: `${path}.${name}`,
							message: `expected a string, got ${typeof val}.`
						});
						continue;
					}
					if (f.options && f.options.length > 0) {
						if (!f.options.includes(val)) out.push({
							path: `${path}.${name}`,
							message: `unknown option '${val}'. Allowed: ${[...f.options].sort().join(", ")}.`
						});
					} else if (kindOptions.length > 0 && !hasUploadDir && !cnKind) {
						if (!kindOptions.includes(val)) out.push({
							path: `${path}.${name}`,
							message: `unknown option '${val}'. Declared: ${[...kindOptions].sort().join(", ")}.`
						});
					}
				}
			}
		}
		/**
		* Pre-submit gate: resolve model → family → schema (from the ONE cache),
		* validate params, throw on any violation. Called before EVERY GPU-starting
		* fetch so the crash comes before the button press, not after a round-trip.
		*
		* Ensures the schema cache is loaded (loadFamilySchemas) on the first call,
		* then validates synchronously.
		*
		* NO SILENT DEFERS (2026-08-16): the old gate no-op'd when the model was
		* missing from the catalog or the family had no schema — silently
		* shipping UNKNOWN params to the backend and calling that "the backend's
		* backstop". That is the silent-drop class this contract exists to kill:
		*   - catalog LOADED + model missing → THROW. The picker is showing a
		*     model that DOES NOT EXIST (the original operator complaint) — the
		*     catalog is the source of truth and the model is not in it.
		*   - family resolved + no schema → THROW. The schema transmission is
		*     broken (bulk fetch dropped it); deferring would validate against
		*     NOTHING. (The workflow:* exemption died with the workflow lane —
		*     §12.2; a workflow is a plugin card with a REAL signature now.)
		* The ONE honest defer left: the catalog cache is still cold at boot
		* (nothing fetched yet — cannot resolve anything, backend gate decides).
		*/
		async function assertParamsMatchFamilySchema(model, params) {
			let family;
			let modifiers;
			let cat;
			try {
				const { getCachedCatalog } = await Promise.resolve().then(() => (init_lib(), lib_exports));
				cat = getCachedCatalog();
				family = cat?.models?.[model]?.family;
				modifiers = cat?.families?.[family ?? ""]?.modifiers;
			} catch {
				return params;
			}
			if (!cat) return params;
			if (!family) throw new Error(`Parameter validation failed — model '${model}' is not in the catalog. The picker showed a model that DOES NOT EXIST; the catalog is the source of truth and this key is not in it. (The backend wire gate would 400 the same request.)`);
			try {
				await loadFamilySchemas();
			} catch {
				return params;
			}
			const schema = getFamilySchema(family);
			if (!schema) {
				if (isFamilySchemaCachePopulated()) throw new Error(`Parameter validation failed — family '${family}' (model '${model}') has no param schema in the populated cache — the backend does not know this family. Refusing to validate against nothing.`);
				return params;
			}
			const coerced = coerceParamsToSchema(schema, params);
			const violations = [...coerced.violations];
			violations.push(...validateParamsAgainstSchema(schema, coerced.params));
			violations.push(...validateModifierEntries(modifiers, params));
			if (violations.length > 0) {
				const lines = violations.map((v) => `  - ${v.path}: ${v.message}`).join("\n");
				throw new Error(`Parameter validation failed — the params do not match the '${family}' family signature. Fix before running:\n${lines}\n\n(The backend's wire gate would reject this same request with 400.)`);
			}
			return coerced.params;
		}
		var _cache, _inflight$1, WIRE_RELAXED_KEYS, EDITOR_MOD_ENTRY_KEYS;
		var init_familyParamContract = __esmMin((() => {
			init_api$1();
			_cache = null;
			_inflight$1 = null;
			WIRE_RELAXED_KEYS = /* @__PURE__ */ new Set([
				"sampling_steps",
				"guide_scale",
				"num_frames",
				"end_image",
				"image1",
				"image2",
				"image3",
				"input_image",
				"first_frame",
				"last_frame",
				"input_glb",
				"prev_motion_artifact",
				"lanpaint_mask",
				"source_glb",
				"outfit_glb",
				"hair_glb",
				"motion_npz",
				"loras",
				"controlnets",
				"modifiers",
				"service",
				"source",
				"preset",
				"reference_audio",
				"reference_text",
				"rigged_path",
				"npz_path",
				"export_glb",
				"export_fbx",
				"export_usd",
				"export_obj",
				"detect_mode",
				"model_name",
				"t5_name",
				"vae_name"
			]);
			EDITOR_MOD_ENTRY_KEYS = /* @__PURE__ */ new Set([
				"id",
				"value",
				"model",
				"preprocessor",
				"enabled",
				"source"
			]);
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/cardBirth.ts
		var cardBirth_exports = /* @__PURE__ */ __exportAll({
			composeCard: () => composeCard,
			ensureDraftId: () => ensureDraftId
		});
		/** Mint the card doc for a start body. The doc carries the body
		*  verbatim (intent/stages/model/params become the card extras —
		*  see the drafts door, packages/estate/drafts, POST /v1/flows/drafts),
		*  so what the card shows is what the run consumed. Throws LOUDLY
		*  on any refusal — a refused compose never proceeds to a start
		*  (no silent cardless runs). */
		async function composeCard(body, signal) {
			const res = await fetch("/v1/flows/drafts", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
				signal
			});
			const text = await res.text();
			if (!res.ok) throw new Error(`card compose refused: HTTP ${res.status}${text ? `: ${text.slice(0, 400)}` : ""}`);
			let data;
			try {
				data = JSON.parse(text);
			} catch {
				throw new Error("card compose returned a non-JSON body");
			}
			const draftId = data.draftId;
			if (typeof draftId !== "string" || !draftId) throw new Error("card compose returned no draftId — refusing to start cardless");
			return draftId;
		}
		/** The card-birth half of every run start: return the body's
		*  declared draft_id when present, else compose the card and return
		*  the minted id. Stamp the result onto the start envelope BEFORE
		*  the start fetch:
		*
		*    startBody.draft_id = await ensureDraftId(startBody, signal)
		*/
		async function ensureDraftId(body, signal) {
			const declared = body.draft_id;
			if (typeof declared === "string" && declared !== "") return declared;
			return composeCard(body, signal);
		}
		var init_cardBirth = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/catalog/src/FlowProtocol.ts
		var FlowProtocol_exports = /* @__PURE__ */ __exportAll({
			assertNoParamDrops: () => assertNoParamDrops,
			collectNamedArtifacts: () => collectNamedArtifacts,
			collectStageUrls: () => collectStageUrls,
			describeErrorBody: () => describeErrorBody,
			pollFlowRun: () => pollFlowRun,
			runCompiledGeneration: () => runCompiledGeneration,
			sanitizeRevivedResult: () => sanitizeRevivedResult,
			setRequiredEmptyResolver: () => setRequiredEmptyResolver
		});
		/**
		* Extract the backend's error message from a non-2xx body for surfacing.
		*
		* Our backend always answers errors as `{"error": "..."}` — the string
		* carries REAL newlines once parsed (the wire JSON escapes them), which is
		* exactly what a multi-line flow doc parse error / validation report
		* looks like in the drilldown modal. When the body isn't JSON, or has no
		* string `error` field (proxy error page, unexpected shape), the raw text
		* is returned unchanged.
		*
		* 2026-08-10: the error path used to `slice(0, 200)` the body, which cut
		* "Validation failed: N violation(s)" reports mid-sentence — the full
		* error is now surfaced unmodified (user: "full errors in the modals").
		*/
		function describeErrorBody(text) {
			try {
				const parsed = JSON.parse(text);
				if (typeof parsed?.error === "string") return parsed.error;
			} catch {}
			return text;
		}
		/** Collect every artifact URL from a run status (stage.url + gallery).
		*  The FLAT list — preserves the legacy wire-by-position behavior (the
		*  primary output is always [0]). Use collectNamedArtifacts when the wire
		*  needs to address a specific named output (mask, detection, …). */
		function collectStageUrls(stages) {
			const urls = [];
			if (Array.isArray(stages)) for (const s of stages) {
				if (s.url) urls.push(s.url);
				if (Array.isArray(s.gallery)) {
					for (const g of s.gallery) if (g && typeof g.url === "string") urls.push(g.url);
				}
			}
			return urls;
		}
		/** Revived/stashed docs are untrusted (written by any client or session):
		*  artifacts + assetUrls must be STRING-only, or every consumer crashes
		*  (u.endsWith on undefined — motion card 2026-08-10). Filter instead of
		*  casting verbatim; callers still hard-error on structural doc junk.
		*  Missing numeric fields default so downstream guards (assetUrls.length)
		*  behave — never a null result while the result object is present. */
		function sanitizeRevivedResult(raw) {
			if (!raw || typeof raw !== "object") return null;
			const r = raw;
			const assetUrls = Array.isArray(r.assetUrls) ? r.assetUrls.filter((u) => typeof u === "string" && !!u) : [];
			const artifacts = {};
			if (r.artifacts && typeof r.artifacts === "object" && !Array.isArray(r.artifacts)) {
				for (const [k, v] of Object.entries(r.artifacts)) if (typeof v === "string" && v) artifacts[k] = v;
			}
			return {
				assetUrls,
				artifacts,
				metadata: r.metadata && typeof r.metadata === "object" ? r.metadata : {},
				completedAt: typeof r.completedAt === "number" ? r.completedAt : Date.now(),
				durationSec: typeof r.durationSec === "number" ? r.durationSec : 0
			};
		}
		/** Collect named artifacts from a run status → {name: URL}. The NAMED map
		*  — lets a downstream slot wire a SPECIFIC output (mask → lanpaint_mask)
		*  rather than only the primary (assetUrls[0]). Falls back to {} when the
		*  backend didn't send named_urls (legacy runs / single-output bricks). */
		function collectNamedArtifacts(stages) {
			const out = {};
			if (Array.isArray(stages)) {
				for (const s of stages) if (s.named_urls && typeof s.named_urls === "object") {
					for (const [name, url] of Object.entries(s.named_urls)) if (typeof url === "string" && url) out[name] = url;
				}
			}
			return out;
		}
		/**
		* Poll a flow run until terminal. Throws on error/timeout/abort.
		*
		* Terminal statuses: "completed"/"done" → success; "error"/"failed" →
		* throws with the run-level error message.
		*
		* `onTick(status)` fires after every successful poll — used by the store
		* to hydrate live KSampler step progress onto the running card BEFORE the
		* run goes terminal (so the per-card progress bar animates during the
		* run, 2026-08-08). Not fired on the terminal tick (the final status is
		* the return value).
		*/
		async function pollFlowRun(runId, signal, opts) {
			const maxWaitMs = opts?.maxWaitMs ?? 36e5;
			const intervalMs = opts?.intervalMs ?? 2e3;
			const started = performance.now();
			while (performance.now() - started < maxWaitMs) {
				if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
				const resp = await apiFetch$1(`/v1/flows/status/${runId}`, { signal });
				if (!resp.ok) {
					if (resp.status === 404) throw new Error(`Flow run ${runId} is gone — the server restarted mid-run. Re-run this card.`);
					let errorBody = null;
					try {
						errorBody = await resp.json();
					} catch {
						errorBody = null;
					}
					if (hasViolationsSignature$1(errorBody)) {
						const violations = errorBody.violations;
						useRunStatusContractStore$1.getState().reportViolation(runId, violations);
						throw new RunStatusContractError$1(runId, violations);
					}
					await sleep$1(intervalMs, signal);
					continue;
				}
				const data = await resp.json();
				const { valid, violations } = validateRunStatusContract$1(data);
				if (!valid) {
					useRunStatusContractStore$1.getState().reportViolation(runId, violations);
					throw new RunStatusContractError$1(runId, violations);
				}
				if (data.status === "completed") return data;
				if (data.status === "failed") {
					const detail = data.error;
					throw new Error(`Flow run ${runId} failed${detail ? `: ${detail}` : ""}`);
				}
				try {
					opts?.onTick?.(data);
				} catch (err) {
					console.error("[flow-protocol] onTick callback failed (poll continues):", err);
				}
				await sleep$1(intervalMs, signal);
			}
			throw new Error(`Flow run ${runId} timed out after ${Math.round(maxWaitMs / 6e4)} min`);
		}
		/** Register (or clear) the required-empty resolver. */
		function setRequiredEmptyResolver(fn) {
			_requiredEmptyResolver = fn;
		}
		/**
		* HARD VALIDATION: no silent parameter drops in the generate request body.
		*
		* JSON.stringify silently drops `undefined` values — `{a: 1, b: undefined}`
		* serializes to `{"a":1}` with ZERO error. This is the TypeScript version
		* of the Python `**kwargs` absorb pattern: a field that was set in the form
		* state, survived into the body object, but vanishes on the wire with no
		* error, no warning. The backend receives defaults and the user sees
		* degraded output they can't diagnose.
		*
		* This function is called before EVERY GPU-starting fetch (generate,
		* startChain — the run doors) —
		* it is the universal gate. It catches:
		*   - `undefined` values (silently dropped by JSON.stringify)
		*   - `NaN` / `Infinity` (serialized as `null` — a value mutation)
		*   - `function` / `symbol` / `bigint` values (dropped or thrown by JSON)
		*   - empty string for known-critical fields (prompt, model)
		*
		* SILENT PARAMETER DROPS ARE COMPLETELY UNACCEPTABLE ANYWHERE EVER.
		*
		* @param body the request body about to be JSON.stringify'd and POST'd
		* @throws Error listing every field that would be silently dropped or mutated
		*/
		function assertNoParamDrops(body) {
			const dropped = [];
			const mutated = [];
			for (const [key, val] of Object.entries(body)) if (val === void 0) dropped.push(key);
			else if (typeof val === "number" && !Number.isFinite(val)) mutated.push(`${key} (NaN/Infinity → JSON serializes as null)`);
			else if (typeof val === "function" || typeof val === "symbol") dropped.push(`${key} (${typeof val} value — JSON.stringify drops it)`);
			else if (typeof val === "bigint") mutated.push(`${key} (bigint → JSON.stringify throws)`);
			if (typeof body.model === "string" && _requiredEmptyResolver) {
				const fields = _requiredEmptyResolver(body.model, body);
				for (const field of fields ?? []) {
					const v = body[field];
					if (typeof v === "string" && v.trim() === "") throw new Error(`'${field}' is empty for '${body.model}' — the model's form declares it required (the engine has no conditioning signal without it). Type it before running. (Backend semantic validator would 400 this same run.)`);
				}
			}
			if (dropped.length > 0 || mutated.length > 0) {
				const parts = [dropped.length > 0 ? `DROPPED: [${dropped.join(", ")}]` : "", mutated.length > 0 ? `MUTATED: [${mutated.join(", ")}]` : ""].filter(Boolean);
				throw new Error(`SILENT PARAMETER DROP DETECTED in generate request body — ${parts.join("; ")}. JSON.stringify would silently lose or mutate these values on the wire. SILENT PARAMETER DROPS ARE UNACCEPTABLE. Fix the caller to omit or set these fields explicitly.`);
			}
		}
		/** Append the door's 400 violation envelope ({violations: [{field,
		* message}]}) as one line per violation — a bare headline would silently
		* DROP the dotted paths (the whole point of a refusal is seeing WHICH
		* param failed). ONE construction, both run doors (compile + start). */
		function violationLines(text) {
			try {
				const parsed = JSON.parse(text);
				if (Array.isArray(parsed.violations)) {
					const lines = parsed.violations.map((v) => `${String(v.field ?? "?")}: ${String(v.message ?? "")}`).filter((line) => !line.endsWith(": "));
					if (lines.length > 0) return `\n${lines.join("\n")}`;
				}
			} catch {}
			return "";
		}
		async function runCompiledGeneration(body, signal, opts) {
			if (Array.isArray(body.loras)) {
				const { normalizeLoraEntry } = await Promise.resolve().then(() => (init_lib$1(), lib_exports$1));
				body = {
					...body,
					loras: body.loras.map((e) => e && typeof e === "object" ? normalizeLoraEntry(e) : e)
				};
			}
			assertNoParamDrops(body);
			let typedBody = body;
			if (typeof body.model === "string") {
				const { assertParamsMatchFamilySchema } = await Promise.resolve().then(() => (init_familyParamContract(), familyParamContract_exports));
				const paramOnly = {};
				for (const [k, v] of Object.entries(body)) {
					if (k === "model") continue;
					paramOnly[k] = v;
				}
				typedBody = {
					...await assertParamsMatchFamilySchema(body.model, paramOnly),
					model: body.model
				};
				const { ensureDraftId } = await Promise.resolve().then(() => (init_cardBirth(), cardBirth_exports));
				typedBody.draft_id = await ensureDraftId(typedBody, signal);
				const compileRes = await fetch("/v1/flows/validate", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(typedBody),
					signal
				});
				if (!compileRes.ok) {
					const text = await compileRes.text();
					throw new Error(`card failed to compile: HTTP ${compileRes.status}${text ? `: ${describeErrorBody(text)}` : ""}${violationLines(text)}`);
				}
			}
			if (typeof typedBody.draft_id !== "string" || typedBody.draft_id === "") {
				const { ensureDraftId } = await Promise.resolve().then(() => (init_cardBirth(), cardBirth_exports));
				typedBody.draft_id = await ensureDraftId(typedBody, signal);
			}
			const res = await fetch("/v1/flows/start", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(typedBody),
				signal
			});
			const text = await res.text();
			if (res.ok) {
				let data;
				try {
					data = JSON.parse(text);
				} catch {
					throw new Error(`generate failed: /v1/flows/start returned non-JSON body: ${text.slice(0, NON_JSON_BODY_CAP)}`);
				}
				const runId = data.run_id;
				if (typeof runId !== "string") throw new Error(`generate failed: /v1/flows/start returned no run_id: ${describeErrorBody(text)}`);
				try {
					opts?.onStart?.(runId);
				} catch (err) {
					console.error("[flow-protocol] onStart callback failed (run continues):", err);
				}
				const status = await pollFlowRun(runId, signal, {
					intervalMs: opts?.intervalMs,
					onTick: opts?.onTick
				});
				return {
					kind: "started",
					runId,
					status,
					urls: collectStageUrls(status.stages)
				};
			}
			throw new Error(`generate failed: HTTP ${res.status}${text ? `: ${describeErrorBody(text)}` : ""}${violationLines(text)}`);
		}
		var NON_JSON_BODY_CAP, _requiredEmptyResolver;
		var init_FlowProtocol = __esmMin((() => {
			init_api$1();
			init_runStatusContract$1();
			init_runStatusContractStore$1();
			init_sleep$1();
			NON_JSON_BODY_CAP = 2e3;
			_requiredEmptyResolver = null;
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/tagMap.ts
		/** Is the value a valid TagColor? Gates untrusted JSON (localStorage,
		*  a future server payload) before it enters the store. */
		function isTagColor(v) {
			return typeof v === "string" && TAG_COLOR_VALUES.includes(v);
		}
		function slugify(name) {
			return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "tag";
		}
		/** Generate a unique tag id from a name, appending -2, -3, … on collision. */
		function uniqueId(name, existing) {
			const base = slugify(name);
			if (!existing.has(base)) return base;
			let n = 2;
			while (existing.has(`${base}-${n}`)) n++;
			return `${base}-${n}`;
		}
		/** Cycle through the palette so consecutive new tags get distinct colors. */
		function nextColor(count) {
			return TAG_COLOR_VALUES[count % TAG_COLOR_VALUES.length];
		}
		/**
		* Boundary ratchet — gate untrusted JSON (localStorage OR a server payload)
		* before it enters the store. Drops any tag whose color isn't in the closed
		* enum, then rebuilds the forward index dropping orphan entries. This is the
		* store's own TagDocument validator; the server enforces the same rules
		* on PUT, but we don't trust the wire even from our own server
		* — defense in depth.
		*/
		function validateDocument(parsed) {
			const empty = {
				tags: {},
				map: {}
			};
			if (!parsed) return empty;
			const tags = {};
			for (const [id, def] of Object.entries(parsed.tags ?? {})) if (def && typeof def.name === "string" && isTagColor(def.color)) tags[id] = {
				id,
				name: def.name,
				color: def.color
			};
			const knownIds = new Set(Object.keys(tags));
			const map = {};
			for (const [key, ids] of Object.entries(parsed.map ?? {})) if (Array.isArray(ids)) {
				const clean = ids.filter((id) => typeof id === "string" && knownIds.has(id));
				if (clean.length > 0) map[key] = clean;
			}
			return {
				tags,
				map
			};
		}
		function loadPersisted() {
			if (typeof localStorage === "undefined") return {
				tags: {},
				map: {}
			};
			try {
				const raw = localStorage.getItem(STORAGE_KEY);
				if (!raw) return {
					tags: {},
					map: {}
				};
				return validateDocument(JSON.parse(raw));
			} catch {
				return {
					tags: {},
					map: {}
				};
			}
		}
		/**
		* Write-through to localStorage (synchronous cache) + schedule a debounced
		* server PUT. Called from every mutation action. The localStorage write is
		* unconditional (offline fallback stays fresh); the server PUT is gated by
		* `serverSyncEnabled`. Failures are swallowed (the local state is still
		* valid; the next successful mutation retries).
		*/
		function scheduleSync(data) {
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify({
					tags: data.tags,
					map: data.map
				}));
			} catch {}
			retryTagSyncAfterFault();
			if (!serverSyncEnabled || typeof fetch === "undefined") return;
			if (syncTimer) clearTimeout(syncTimer);
			syncTimer = setTimeout(() => {
				syncTimer = null;
				apiFetch$1("/v1/tags", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						tags: data.tags,
						map: data.map
					})
				}).catch((e) => {
					console.warn("[tagMap] server sync failed:", e);
				});
			}, SYNC_DEBOUNCE_MS);
		}
		async function initTagSync() {
			if (serverSyncEnabled) return;
			if (typeof fetch === "undefined") return;
			try {
				const res = await apiFetch$1("/v1/tags");
				if (!res.ok) {
					console.warn(`[tagMap] initTagSync got ${res.status} (not offline) — pushes deferred, will retry on next mutation`);
					_retrySyncOnNextMutation = true;
					return;
				}
				const doc = validateDocument(await res.json());
				useTagMap.setState({
					tags: doc.tags,
					map: doc.map
				});
				serverSyncEnabled = true;
			} catch {}
		}
		/** R-S9: called from the mutation path — retries the server sync exactly
		*  once after a transient boot fault, so the session's pushes resume
		*  without waiting for a reload. Server-canonical wholesale replace is
		*  NOT taken here (local edits may be newer); the debounced PUT after
		*  the next mutation reconciles the server copy. */
		async function retryTagSyncAfterFault() {
			if (serverSyncEnabled || !_retrySyncOnNextMutation) return;
			_retrySyncOnNextMutation = false;
			try {
				const res = await apiFetch$1("/v1/tags");
				if (!res.ok) {
					console.warn(`[tagMap] retryTagSync still ${res.status} — pushes stay off this session`);
					return;
				}
				serverSyncEnabled = true;
				const { tags, map } = useTagMap.getState();
				scheduleSync({
					tags,
					map
				});
			} catch {}
		}
		/** Read tagsOf without a React subscription. The useListFilter accessor uses
		*  this so the filter flow doesn't need to re-subscribe on every item. */
		function tagsOf(key) {
			return useTagMap.getState().map[key] ?? [];
		}
		var TagColor, TAG_COLOR_VALUES, TAG_COLOR_META, STORAGE_KEY, SYNC_DEBOUNCE_MS, serverSyncEnabled, syncTimer, _retrySyncOnNextMutation, initial, tagMapActions, useTagMap;
		var init_tagMap = __esmMin((() => {
			init_clientStore$1();
			init_api$1();
			TagColor = {
				brand: "brand",
				sky: "sky",
				violet: "violet",
				rose: "rose",
				emerald: "emerald",
				amber: "amber",
				cyan: "cyan"
			};
			TAG_COLOR_VALUES = Object.values(TagColor);
			TAG_COLOR_META = {
				brand: {
					dot: "bg-brand",
					pill: "border-brand/30 bg-brand/10 text-brand"
				},
				sky: {
					dot: "bg-sky-500",
					pill: "border-sky-500/30 bg-sky-500/10 text-sky-400"
				},
				violet: {
					dot: "bg-violet-500",
					pill: "border-violet-500/30 bg-violet-500/10 text-violet-400"
				},
				rose: {
					dot: "bg-rose-500",
					pill: "border-rose-500/30 bg-rose-500/10 text-rose-400"
				},
				emerald: {
					dot: "bg-emerald-500",
					pill: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
				},
				amber: {
					dot: "bg-amber-500",
					pill: "border-amber-500/30 bg-amber-500/10 text-amber-400"
				},
				cyan: {
					dot: "bg-cyan-500",
					pill: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
				}
			};
			STORAGE_KEY = "melite:tag-map:v1";
			SYNC_DEBOUNCE_MS = 500;
			serverSyncEnabled = false;
			syncTimer = null;
			_retrySyncOnNextMutation = false;
			initial = loadPersisted();
			tagMapActions = (set, get) => ({
				createTag: (name, color) => {
					const trimmed = name.trim();
					if (!trimmed) return "";
					const id = uniqueId(trimmed, new Set(Object.keys(get().tags)));
					const c = color ?? nextColor(Object.keys(get().tags).length);
					set((s) => {
						const tags = {
							...s.tags,
							[id]: {
								id,
								name: trimmed,
								color: c
							}
						};
						scheduleSync({
							tags,
							map: s.map
						});
						return { tags };
					});
					return id;
				},
				renameTag: (id, name) => {
					const trimmed = name.trim();
					if (!trimmed) return;
					set((s) => {
						const def = s.tags[id];
						if (!def) return s;
						const tags = {
							...s.tags,
							[id]: {
								...def,
								name: trimmed
							}
						};
						scheduleSync({
							tags,
							map: s.map
						});
						return { tags };
					});
				},
				recolorTag: (id, color) => {
					if (!isTagColor(color)) return;
					set((s) => {
						const def = s.tags[id];
						if (!def) return s;
						const tags = {
							...s.tags,
							[id]: {
								...def,
								color
							}
						};
						scheduleSync({
							tags,
							map: s.map
						});
						return { tags };
					});
				},
				deleteTag: (id) => {
					set((s) => {
						if (!s.tags[id]) return s;
						const tags = { ...s.tags };
						delete tags[id];
						const map = {};
						for (const [key, ids] of Object.entries(s.map)) {
							const filtered = ids.filter((t) => t !== id);
							if (filtered.length > 0) map[key] = filtered;
						}
						scheduleSync({
							tags,
							map
						});
						return {
							tags,
							map
						};
					});
				},
				setItemTags: (key, tagIds) => {
					const known = new Set(Object.keys(get().tags));
					const clean = [...new Set(tagIds)].filter((id) => known.has(id));
					set((s) => {
						const map = { ...s.map };
						if (clean.length > 0) map[key] = clean;
						else delete map[key];
						scheduleSync({
							tags: s.tags,
							map
						});
						return { map };
					});
				},
				addTagToItem: (key, tagId) => {
					if (!get().tags[tagId]) return;
					set((s) => {
						const current = s.map[key] ?? [];
						if (current.includes(tagId)) return s;
						const map = {
							...s.map,
							[key]: [...current, tagId]
						};
						scheduleSync({
							tags: s.tags,
							map
						});
						return { map };
					});
				},
				removeTagFromItem: (key, tagId) => {
					set((s) => {
						const current = s.map[key];
						if (!current || !current.includes(tagId)) return s;
						const next = current.filter((t) => t !== tagId);
						const map = { ...s.map };
						if (next.length > 0) map[key] = next;
						else delete map[key];
						scheduleSync({
							tags: s.tags,
							map
						});
						return { map };
					});
				},
				tagsOf: (key) => get().map[key] ?? [],
				hasTag: (key, tagId) => (get().map[key] ?? []).includes(tagId)
			});
			useTagMap = createClientStore$1((set, get) => ({
				...tagMapActions(set, get),
				tags: initial.tags,
				map: initial.map
			}));
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/serviceForms.ts
		async function loadForms(opts) {
			if (Object.keys(formsStore.getState().cache).length > 0 && !opts?.force) return formsStore.getState().cache;
			if (_inflight) return _inflight;
			_inflight = (async () => {
				try {
					const res = await apiFetch$1("/v1/forms");
					if (!res.ok) {
						console.warn("[serviceForms] /v1/forms failed:", res.status);
						return formsStore.getState().cache;
					}
					const forms = (await res.json())?.forms;
					if (typeof forms !== "object" || forms === null || Array.isArray(forms)) {
						console.warn("[serviceForms] /v1/forms 200 with malformed body — keeping cache");
						return formsStore.getState().cache;
					}
					formsStore.setState({ cache: forms });
					return formsStore.getState().cache;
				} catch (e) {
					console.warn("[serviceForms] fetch error:", e);
					return formsStore.getState().cache;
				} finally {
					_inflight = null;
				}
			})();
			return _inflight;
		}
		function getCachedForms() {
			return formsStore.getState().cache;
		}
		function subscribeForms(fn) {
			return formsStore.subscribe(() => {
				fn();
			});
		}
		/**
		* Reverse-lookup: given a sidebar_key (the value the rest of the app calls
		* `selectedService`), return the form-tag it belongs to. This is THE
		* primitive that drives every render decision in GenerateFormBody.
		*/
		function formForSidebarKey(sidebarKey, forms = formsStore.getState().cache) {
			for (const [formTag, entry] of Object.entries(forms)) if (entry.sidebar_key === sidebarKey) return formTag;
		}
		/**
		* Check whether the given sidebar_key belongs to the given form-tag.
		* Internal — the convenience predicates below are the public API.
		*/
		function isForm(sidebarKey, formTag, forms = formsStore.getState().cache) {
			return forms[formTag]?.sidebar_key === sidebarKey;
		}
		/** True if the sidebar_key belongs to ANY of the given form-tags. */
		function isInAnyForm(sidebarKey, formTags, forms = formsStore.getState().cache) {
			return formTags.some((t) => isForm(sidebarKey, t, forms));
		}
		/**
		* True if the sidebar_key belongs to any audio-genre form-tag.
		* (form_tts, form_voice, form_voice_studio, form_music, form_sound)
		*/
		function isAudioForm(sidebarKey, forms = formsStore.getState().cache) {
			return isInAnyForm(sidebarKey, [
				"form_tts",
				"form_voice",
				"form_voice_studio",
				"form_music",
				"form_sound"
			], forms);
		}
		/**
		* The ordered sidebar rows from a forms payload (§16 C-RAIL: /v1/forms is
		* rail-derived and carries `order`). Grouped by genre, sorted by
		* (order ?? Infinity, label) within the group — the entry's plugin-
		* declared order is the law; entries without one (legacy payloads) sort
		* last, label-alphabetical. Pure: the sidebar + tests share ONE item
		* builder, no drift between render and pin.
		*/
		function formSidebarItems(forms) {
			const out = {};
			for (const d of Object.values(forms)) {
				const genre = d.genre;
				const key = d.sidebar_key;
				if (!genre || !key) continue;
				const order = typeof d.order === "number" ? d.order : Infinity;
				(out[genre] ??= []).push({
					name: key,
					label: d.label || key,
					genre,
					order
				});
			}
			for (const items of Object.values(out)) items.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
			return out;
		}
		var formsStore, _inflight, isTtsForm, isVoiceForm, isVoiceStudioForm, isMusicForm, isGenerateForm, isEditForm;
		var init_serviceForms = __esmMin((() => {
			init_api$1();
			init_clientStore$1();
			formsStore = createClientStore$1({ cache: {} });
			_inflight = null;
			isTtsForm = (k) => isForm(k, "form_tts");
			isVoiceForm = (k) => isForm(k, "form_voice");
			isVoiceStudioForm = (k) => isForm(k, "form_voice_studio");
			isMusicForm = (k) => isForm(k, "form_music");
			isGenerateForm = (k) => isForm(k, "form_generate");
			isEditForm = (k) => isForm(k, "form_edit");
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/waveform-peaks.ts
		/** Compute min/max peaks for a single channel of PCM data.
		*  Exported for unit testing. */
		function computeMinMaxPeaks(data, numBuckets) {
			if (numBuckets <= 0 || data.length === 0) return [];
			const out = new Array(numBuckets);
			const blockSize = data.length / numBuckets;
			for (let i = 0; i < numBuckets; i++) {
				const start = Math.floor(i * blockSize);
				const end = Math.min(data.length, Math.floor((i + 1) * blockSize));
				let min = 0;
				let max = 0;
				for (let j = start; j < end; j++) {
					const v = data[j];
					if (v < min) min = v;
					if (v > max) max = v;
				}
				out[i] = {
					min,
					max
				};
			}
			return out;
		}
		/** Build all three LODs from raw PCM data. */
		function computeWaveformLODs(data) {
			return {
				low: computeMinMaxPeaks(data, LOD_BUCKETS.low),
				med: computeMinMaxPeaks(data, LOD_BUCKETS.med),
				high: computeMinMaxPeaks(data, LOD_BUCKETS.high)
			};
		}
		/** Pick the LOD whose bucket count best matches the available pixels.
		*  When pixelsAvailable is small, low; when huge, high. The threshold
		*  is the midpoint (geometric mean) between adjacent LODs. */
		function selectLOD(pixelsAvailable) {
			if (pixelsAvailable <= 0) return "low";
			if (pixelsAvailable < Math.sqrt(LOD_BUCKETS.low * LOD_BUCKETS.med)) return "low";
			if (pixelsAvailable < Math.sqrt(LOD_BUCKETS.med * LOD_BUCKETS.high)) return "med";
			return "high";
		}
		/** Resample a min/max peak array to a target output width by picking
		*  contiguous source buckets per output pixel (or aggregating when
		*  upscaling is needed). Returns a new array of length `targetWidth`. */
		function resampleForWidth(peaks, targetWidth) {
			if (targetWidth <= 0) return [];
			if (peaks.length === 0) return Array.from({ length: targetWidth }, () => ({
				min: 0,
				max: 0
			}));
			const out = new Array(targetWidth);
			if (peaks.length >= targetWidth) {
				const ratio = peaks.length / targetWidth;
				for (let i = 0; i < targetWidth; i++) {
					const start = Math.floor(i * ratio);
					const end = Math.min(peaks.length, Math.floor((i + 1) * ratio));
					let min = 0;
					let max = 0;
					for (let j = start; j < end; j++) {
						if (peaks[j].min < min) min = peaks[j].min;
						if (peaks[j].max > max) max = peaks[j].max;
					}
					out[i] = {
						min,
						max
					};
				}
			} else for (let i = 0; i < targetWidth; i++) {
				const src = peaks[Math.min(peaks.length - 1, Math.floor(i * peaks.length / targetWidth))];
				out[i] = {
					min: src.min,
					max: src.max
				};
			}
			return out;
		}
		/** Convenience: pick the right LOD + resample to exactly `width` pixels. */
		function getPeaksForWidth(cache, width) {
			return resampleForWidth(cache[selectLOD(width)], width);
		}
		/** Decode an audio URL into legacy + LOD waveform peaks.
		*
		*  Returns null on any failure (fetch error, decode error, etc.).
		*  The caller should treat null as "use the sine-wave placeholder". */
		async function decodeAudioPeaks(url) {
			let ctx = null;
			try {
				ctx = new AudioContext();
				const buf = await (await fetch(url)).arrayBuffer();
				const audio = await ctx.decodeAudioData(buf);
				const raw = audio.getChannelData(0);
				const samplesPerPeak = Math.max(1, Math.floor(raw.length / 80));
				const legacyPeaks = [];
				for (let i = 0; i < 80; i++) {
					let max = 0;
					for (let j = 0; j < samplesPerPeak; j++) {
						const val = Math.abs(raw[i * samplesPerPeak + j] || 0);
						if (val > max) max = val;
					}
					legacyPeaks.push(max);
				}
				const lod = computeWaveformLODs(raw);
				return {
					duration: audio.duration,
					legacyPeaks,
					lod
				};
			} catch (e) {
				console.error("[waveform-peaks] decodeAudioPeaks failed — falling back to the placeholder:", e);
				return null;
			} finally {
				if (ctx) Promise.resolve(ctx.close()).catch((e) => {
					console.error("[waveform-peaks] AudioContext close failed:", e);
				});
			}
		}
		var LOD_BUCKETS, LOD_ORDER;
		var init_waveform_peaks = __esmMin((() => {
			LOD_BUCKETS = {
				low: 100,
				med: 500,
				high: 2e3
			};
			LOD_ORDER = [
				"low",
				"med",
				"high"
			];
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/enhance.ts
		/**
		* The card's model picker source (2026-09-06): the LIVE route list
		* off the proof route — never a restated copy. Null when this
		* editor is NOT under a DSH host (no picker renders).
		*/
		async function fetchEnhanceRoutes(signal) {
			let res;
			try {
				res = await apiFetch$1(externalUrl$1("/melite-tools/catalog"), {
					method: "GET",
					signal
				});
			} catch (e) {
				console.error("[enhance] fetchEnhanceRoutes fetch failed (picker hidden):", e);
				return null;
			}
			if (!res.ok) {
				console.error(`[enhance] fetchEnhanceRoutes non-ok ${res.status} (picker hidden)`);
				return null;
			}
			try {
				const data = await res.json();
				if (!Array.isArray(data.llmRoutes)) {
					console.error("[enhance] fetchEnhanceRoutes body carried no llmRoutes array (picker hidden)");
					return null;
				}
				const routes = data.llmRoutes.filter((r) => typeof r === "string" && r.length > 0);
				return routes.length > 0 ? routes : null;
			} catch (e) {
				console.error("[enhance] fetchEnhanceRoutes body parse failed (picker hidden):", e);
				return null;
			}
		}
		/** Normalize a display/model name for matching: lowercase, keep
		* alphanumerics and dots ("GLM 4.7" / "glm-4.7" → "glm4.7"). */
		function normName(s) {
			return s.toLowerCase().replace(/[^a-z0-9.]/g, "");
		}
		/** Is this editor embedded under the DSH GUI (same-origin parent)?
		* Standalone → false (no picker exists; the host default serves). */
		function isEmbedded() {
			try {
				return window.parent !== window;
			} catch {
				return false;
			}
		}
		/**
		* Parse the picker trigger's aria-label (the LIVE-PROBED contract,
		* 2026-09-06: `Select model, current <NAME>, reasoning effort <E>`).
		* Returns the model display name, or null when the label doesn't
		* carry a current selection.
		*/
		function parsePickerAria(label) {
			const m = /select model,\s*current\s+(.+?)(?:,\s*reasoning|$)/i.exec(label);
			if (!m) return null;
			const name = m[1].trim();
			return name.length > 0 ? name : null;
		}
		/**
		* Read the GUI picker's CURRENT selection from the parent page
		* (2026-09-06, operator order: the button auto-follows the model I
		* have selected). The card iframe is same-origin with the DSH GUI.
		* Anchor (live-probed on the deployed build): the trigger button's
		* aria-label "Select model, current <NAME>, reasoning effort …" —
		* an accessible contract, not a CSS-module hash (the `*modelName*`
		* class probe found ZERO elements on the real page). Fallback: the
		* trigger's `*triggerLabel*` span text. Standalone/cross-origin →
		* null (host default serves).
		*/
		function readPickerModel() {
			try {
				const parent = window.parent;
				if (!parent || parent === window) return null;
				const doc = parent.document;
				if (!doc) return null;
				for (const btn of Array.from(doc.querySelectorAll("button[aria-label]"))) {
					const name = parsePickerAria(btn.getAttribute("aria-label") ?? "");
					if (name) return name;
				}
				const labels = Array.from(doc.querySelectorAll("[class*=\"triggerLabel\"]")).filter((el) => (el.textContent ?? "").trim().length > 0 && el.getClientRects().length > 0);
				const last = labels[labels.length - 1];
				return last ? last.textContent.trim() : null;
			} catch {
				return null;
			}
		}
		/**
		* Map the picker's display name onto one LIVE route
		* ("provider/model"). Exact normalized model equality first, then a
		* unique prefix ("Muse Spark" → muse-spark-1.3-contributor).
		* Ambiguous or unmatched → null (never a guess).
		*/
		function resolvePickerRoute(routes, pick) {
			const want = normName(pick);
			if (want.length === 0) return null;
			const models = routes.map((r) => {
				const i = r.indexOf("/");
				return {
					route: r,
					model: normName(i >= 0 ? r.slice(i + 1) : r)
				};
			});
			const exact = models.filter((m) => m.model === want);
			if (exact.length === 1) return exact[0].route;
			if (exact.length > 1) return null;
			const prefix = models.filter((m) => m.model.startsWith(want));
			if (prefix.length === 1) return prefix[0].route;
			return null;
		}
		/**
		* THE DeepSeek-harness door (2026-08-22): POST /melite-tools/enhance on the DSH
		* host — same origin from the chat embed — completes the enhancement with the
		* harness's OWN model (ctx.llm). NO keystore key involved, so inside the GUI
		* the Enhance button can never answer "no model". Returns null when this
		* editor is NOT running under the DSH host (standalone dev :5173 — the
		* route isn't there; Vite SPA-fallbacks answer HTML), letting the caller use
		* the keystore flow.
		*/
		async function enhanceViaHarness(systemPrompt, prompt, llm, signal) {
			let res;
			try {
				res = await apiFetch$1(externalUrl$1("/melite-tools/enhance"), {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					signal,
					body: JSON.stringify({
						system_prompt: systemPrompt,
						prompt,
						...llm !== void 0 && llm.length > 0 ? { llm } : {}
					})
				});
			} catch (e) {
				console.error("[enhance] enhance fetch failed (folding to the no-door verdict):", e);
				return null;
			}
			const text = await res.text();
			let data;
			try {
				data = JSON.parse(text);
			} catch {
				console.error(`[enhance] enhance answered non-JSON (status ${res.status}, body ${text.slice(0, 120)})`);
				if (!res.ok && isEmbedded()) {
					const err = /* @__PURE__ */ new Error(`Enhancement unavailable right now (the app host answered ${res.status} with a non-JSON body — likely transient; retry)`);
					err.name = "EnhanceTransientError";
					throw err;
				}
				return null;
			}
			if (typeof data.error === "string" && data.error.length > 0) throw new Error(`Enhancement failed (${res.status}): ${data.error.slice(0, 200)}`);
			if (!res.ok) {
				console.error(`[enhance] enhance answered JSON but not-ok ${res.status} with no error field`);
				if (isEmbedded()) {
					const err = /* @__PURE__ */ new Error(`Enhancement unavailable right now (the app host answered ${res.status}; likely transient — retry)`);
					err.name = "EnhanceTransientError";
					throw err;
				}
				return null;
			}
			const positive = String(data.positive ?? "").trim();
			const negative = String(data.negative ?? "").trim();
			if (!positive) {
				console.error(`[enhance] enhance answered ok but carried no positive prompt (via ${typeof data.via === "string" ? data.via : "?"})`);
				return null;
			}
			return {
				positive,
				negative,
				via: typeof data.via === "string" && data.via.length > 0 ? data.via : "?"
			};
		}
		async function enhancePrompt(systemPrompt, prompt, llm, signal) {
			const harnessed = await enhanceViaHarness(systemPrompt, prompt, llm, signal);
			if (harnessed !== null) return harnessed;
			throw new Error("Prompt enhance runs inside the DeepSeek app (/melite-tools/enhance not answered here)");
		}
		/**
		* AGENT ENHANCE (2026-08-22) — the ✦ Agent Enhance button's wire.
		* POST /melite-tools/enhance {model, prompt} on the DSH host: the agent
		* system's orchestration core sweeps EVERY declared enhance field of the
		* model (each with its own recipe) over the harness model in one press and
		* returns results keyed by field name. NO keystore key involved. Requires
		* the DSH app — standalone editors get an honest error.
		*/
		async function agentEnhance(model, prompt, temperature, llm, signal) {
			const res = await apiFetch$1(externalUrl$1("/melite-tools/enhance"), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				signal,
				body: JSON.stringify({
					model,
					prompt,
					...temperature !== void 0 ? { temperature } : {},
					...llm !== void 0 && llm.length > 0 ? { llm } : {}
				})
			});
			if (!res.ok) {
				const body = await res.text();
				let msg = body.slice(0, 200);
				try {
					const parsed = JSON.parse(body);
					if (typeof parsed.error === "string") msg = parsed.error;
				} catch {
					msg = "Agent Enhance runs inside the DeepSeek app — use Enhance here.";
				}
				throw new Error(`Agent Enhance failed (${res.status}): ${msg}`);
			}
			const data = await res.json();
			const results = {};
			for (const [field, v] of Object.entries(data.results ?? {})) results[field] = {
				positive: String(v?.positive ?? "").trim(),
				negative: String(v?.negative ?? "").trim(),
				via: typeof v?.via === "string" && v.via.length > 0 ? v.via : "?"
			};
			return results;
		}
		var init_enhance = __esmMin((() => {
			init_api$1();
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/cardLlm.ts
		/** Read the preferred card LLM route ("provider/model"), if set. */
		function getCardLlm() {
			try {
				const v = window.localStorage.getItem(CARD_LLM_KEY);
				return typeof v === "string" && v.length > 0 ? v : null;
			} catch {
				return null;
			}
		}
		/** Set (or clear, with null) the preferred card LLM route. */
		function setCardLlm(route) {
			try {
				if (route === null || route.length === 0) window.localStorage.removeItem(CARD_LLM_KEY);
				else window.localStorage.setItem(CARD_LLM_KEY, route);
			} catch {}
		}
		/**
		* The `llm` argument shape the enhance wire takes: undefined when
		* unset (Auto — the server resolves its preference chain).
		*/
		function cardLlmArg() {
			return getCardLlm() ?? void 0;
		}
		var CARD_LLM_KEY;
		var init_cardLlm = __esmMin((() => {
			CARD_LLM_KEY = "melite:card-llm:v1";
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/familyProvenance.ts
		/** Fold runs into per-family provenance. Only runs that CARRY an
		*  artifact count (the fold's done family: done, cached, reused —
		*  the estate settles success as "completed", which the old raw
		*  `!== "done"` compare never matched, so every real run's
		*  provenance read "never"). Running / interrupted / stopped runs
		*  haven't produced anything yet. Runs with no families field
		*  (pre-provenance sidecars) or a family-less brick contribute
		*  nothing (backward compatible by construction). */
		function familyProvenance(runs) {
			const out = {};
			for (const run of runs) {
				const folded = statusOrPendingOf(run.status ?? "");
				if (folded !== "done" && folded !== "cached" && folded !== "reused") continue;
				const fams = run.families ?? [];
				if (fams.length === 0) continue;
				const at = typeof run.created_at === "number" ? run.created_at * 1e3 : 0;
				const seen = /* @__PURE__ */ new Set();
				for (const f of fams) {
					if (!f || seen.has(f)) continue;
					seen.add(f);
					const cur = out[f];
					if (cur) {
						cur.count += 1;
						if (at > cur.lastRunAt) cur.lastRunAt = at;
					} else out[f] = {
						count: 1,
						lastRunAt: at
					};
				}
			}
			return out;
		}
		/** Compact relative time for the tile title — "just now", "5m ago",
		*  "3h ago", "2d ago", then a short date. Pure; no i18n in scope. */
		function formatLastRun(at) {
			if (!at) return "never";
			const diff = Date.now() - at;
			if (diff < 6e4) return "just now";
			if (diff < 36e5) return `${Math.floor(diff / 6e4)}m ago`;
			if (diff < 864e5) return `${Math.floor(diff / 36e5)}h ago`;
			if (diff < 6048e5) return `${Math.floor(diff / 864e5)}d ago`;
			return new Date(at).toLocaleDateString();
		}
		var init_familyProvenance = __esmMin((() => {
			init_stageView();
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/index.ts
		var src_exports = /* @__PURE__ */ __exportAll({
			CARD_LLM_KEY: () => CARD_LLM_KEY,
			CatalogContractError: () => CatalogContractError$1,
			LOD_BUCKETS: () => LOD_BUCKETS,
			LOD_ORDER: () => LOD_ORDER,
			RUN_STATUSES: () => RUN_STATUSES$1,
			RunStatusContractError: () => RunStatusContractError$1,
			TAG_COLOR_META: () => TAG_COLOR_META,
			TAG_COLOR_VALUES: () => TAG_COLOR_VALUES,
			TagColor: () => TagColor,
			activeVariantForRoute: () => activeVariantForRoute$1,
			agentEnhance: () => agentEnhance,
			apiFetch: () => apiFetch$1,
			apiJson: () => apiJson$1,
			assertNoParamDrops: () => assertNoParamDrops,
			assertParamsMatchFamilySchema: () => assertParamsMatchFamilySchema,
			axisCellExists: () => axisCellExists$1,
			canvasDefaultModel: () => canvasDefaultModel$1,
			cardLlmArg: () => cardLlmArg,
			coerceParamsToSchema: () => coerceParamsToSchema,
			collectNamedArtifacts: () => collectNamedArtifacts,
			collectStageUrls: () => collectStageUrls,
			composeCard: () => composeCard,
			composeVariantRoute: () => composeVariantRoute$1,
			computeMinMaxPeaks: () => computeMinMaxPeaks,
			computeWaveformLODs: () => computeWaveformLODs,
			contractToast: () => contractToast$1,
			controlnetTypesOf: () => controlnetTypesOf$1,
			decodeAudioPeaks: () => decodeAudioPeaks,
			describeErrorBody: () => describeErrorBody,
			dropdownModels: () => dropdownModels$1,
			enhancePrompt: () => enhancePrompt,
			ensureCatalog: () => ensureCatalog$1,
			ensureDraftId: () => ensureDraftId,
			externalUrl: () => externalUrl$1,
			familiesForForm: () => familiesForForm$1,
			familyAccepts: () => familyAccepts$1,
			familyCardSummary: () => familyCardSummary$1,
			familyConditioning: () => familyConditioning$1,
			familyGenre: () => familyGenre$1,
			familyHasVariantAxis: () => familyHasVariantAxis$1,
			familyLabel: () => familyLabel$1,
			familyOf: () => familyOf$1,
			familyOptionalOutputs: () => familyOptionalOutputs$1,
			familyPrimaryRoute: () => familyPrimaryRoute$1,
			familyProvenance: () => familyProvenance,
			familyTransformMatrix: () => familyTransformMatrix$1,
			fetchEnhanceRoutes: () => fetchEnhanceRoutes,
			formForSidebarKey: () => formForSidebarKey,
			formOf: () => formOf$1,
			formSidebarItems: () => formSidebarItems,
			formatLastRun: () => formatLastRun,
			getBackendState: () => getBackendState$1,
			getCachedCatalog: () => getCachedCatalog$1,
			getCachedForms: () => getCachedForms,
			getCardLlm: () => getCardLlm,
			getFamilySchema: () => getFamilySchema,
			getPeaksForWidth: () => getPeaksForWidth,
			hasViolationsSignature: () => hasViolationsSignature$1,
			hiddenFromDropdown: () => hiddenFromDropdown$1,
			initTagSync: () => initTagSync,
			isAudioForm: () => isAudioForm,
			isCatalogLoaded: () => isCatalogLoaded$1,
			isEditForm: () => isEditForm,
			isEmbedded: () => isEmbedded,
			isFamilySchemaCachePopulated: () => isFamilySchemaCachePopulated,
			isGenerateForm: () => isGenerateForm,
			isMusicForm: () => isMusicForm,
			isTagColor: () => isTagColor,
			isTtsForm: () => isTtsForm,
			isVoiceForm: () => isVoiceForm,
			isVoiceStudioForm: () => isVoiceStudioForm,
			loadCatalog: () => loadCatalog$1,
			loadFamilySchemas: () => loadFamilySchemas,
			loadForms: () => loadForms,
			modelDescription: () => modelDescription$1,
			modelLabel: () => modelLabel$1,
			narrowGenre: () => narrowGenre$1,
			onBackendState: () => onBackendState$1,
			onCatalogReady: () => onCatalogReady$1,
			parsePickerAria: () => parsePickerAria,
			pollFlowRun: () => pollFlowRun,
			presetsForRoute: () => presetsForRoute$1,
			primeCatalog: () => primeCatalog$1,
			readPickerModel: () => readPickerModel,
			resampleForWidth: () => resampleForWidth,
			resolvePickerRoute: () => resolvePickerRoute,
			retryTagSyncAfterFault: () => retryTagSyncAfterFault,
			routeCoordinates: () => routeCoordinates$1,
			runCompiledGeneration: () => runCompiledGeneration,
			sanitizeRevivedResult: () => sanitizeRevivedResult,
			selectLOD: () => selectLOD,
			setCardLlm: () => setCardLlm,
			setContractToastSink: () => setContractToastSink$1,
			setRequiredEmptyResolver: () => setRequiredEmptyResolver,
			studioOf: () => studioOf$1,
			subscribeForms: () => subscribeForms,
			tagsOf: () => tagsOf,
			useCatalogContractStore: () => useCatalogContractStore$1,
			useRunStatusContractStore: () => useRunStatusContractStore$1,
			useTagMap: () => useTagMap,
			validateCatalogContract: () => validateCatalogContract$1,
			validateModifierEntries: () => validateModifierEntries,
			validateParamsAgainstSchema: () => validateParamsAgainstSchema,
			validateRunStatusContract: () => validateRunStatusContract$1,
			variantLabel: () => variantLabel$1,
			variantSiblings: () => variantSiblings$1,
			variantsForRoute: () => variantsForRoute$1
		});
		var init_src = __esmMin((() => {
			init_api$1();
			init_contractToast$1();
			init_catalogContract$1();
			init_catalogContractStore$1();
			init_modelCatalog$1();
			init_FlowProtocol();
			init_familyParamContract();
			init_tagMap();
			init_runStatusContractStore$1();
			init_runStatusContract$1();
			init_serviceForms();
			init_waveform_peaks();
			init_cardBirth();
			init_enhance();
			init_cardLlm();
			init_familyProvenance();
		}));
		//#endregion
		//#region src/ui/studio/useEnhance.ts
		/**
		* h3-timeline studio split (2026-09-06) — PURE MOVE from
		* ui/studio/component.tsx. No behavior change: headers/footers are new,
		* every logic line is verbatim from the monolith (source range noted).
		*/
		/** Per-prompt H3-style enhancement (tenant §7). Verbatim lines 2044–2086. */
		function useEnhance() {
			const [enhancing, setEnhancing] = (0, react.useState)({});
			const [enhanceErr, setEnhanceErr] = (0, react.useState)({});
			const [enhanceUndo, setEnhanceUndo] = (0, react.useState)({});
			const setEnhancingKey = (k, v) => setEnhancing((m) => ({
				...m,
				[k]: v
			}));
			/** ✨ Enhance ONE prompt (call text or beat segment) into H3 style.
			* Zero-setup path first (the DSH harness model), keystore LLM second —
			* same enhancePrompt the host's ✨ buttons use. The card LLM
			* preference (the ✦ rail's dropdown, @melite/catalog's store)
			* threads through: unset = Auto (the estate's preference chain,
			* muse-spark over glm-5v). Never silent: errors render inline; the
			* previous text is kept for one-click undo. */
			const enhanceOne = async (key, text, apply) => {
				const cur = text.trim();
				if (!cur || enhancing[key]) return;
				setEnhancingKey(key, true);
				setEnhanceErr((m) => ({
					...m,
					[key]: null
				}));
				try {
					const { enhancePrompt, cardLlmArg } = await Promise.resolve().then(() => (init_src(), src_exports));
					const result = await enhancePrompt(H3_ENHANCE_SYSTEM, cur, cardLlmArg());
					setEnhanceUndo((m) => ({
						...m,
						[key]: text
					}));
					apply(result.positive);
				} catch (e) {
					setEnhanceErr((m) => ({
						...m,
						[key]: e instanceof Error ? e.message.slice(0, 160) : String(e).slice(0, 160)
					}));
				} finally {
					setEnhancingKey(key, false);
				}
			};
			/** ↩ Undo — restores the pre-enhancement text for one row. */
			const undoEnhance = (key, apply) => {
				const prev = enhanceUndo[key];
				if (prev === void 0) return;
				apply(prev);
				setEnhanceUndo((m) => {
					const { [key]: _drop, ...rest } = m;
					return rest;
				});
			};
			return {
				enhancing,
				enhanceErr,
				enhanceUndo,
				enhanceOne,
				undoEnhance
			};
		}
		//#endregion
		//#region src/ui/studio/useCallMutations.ts
		/** Call-structure setters: extend/add/guide/span/knobs (tenant §8).
		*  Verbatim lines 2088–2260, plus the authoring grid (2026-09-25):
		*  every gesture that writes a frame lands on the card's own span law
		*  (docGrid.ts), so a studio-built doc never trips the card's uniform
		*  off-grid refusal. */
		function useCallMutations(setCalls, fps) {
			/** Pull-the-tail: the bar grew the envelope — the last call's end
			* follows (exclusive count straight from the bar's onExtend), snapped
			* to the window's legal length. */
			const handleExtend = (newTotal) => {
				setCalls((prev) => {
					if (!prev.length) return prev;
					const last = prev.length - 1;
					const cur = prev[last];
					if (newTotal <= cur.end_frame) return prev;
					return patchAt(prev, last, {
						...cur,
						end_frame: snapCallEnd(cur, last, Math.round(newTotal))
					});
				});
			};
			/** Add call — TIMELINE-NATIVE (2026-08-16: "We don't need the add-call
			*  button. We can use the timeline to do this"): double-click the ruler
			*  or the calls row's empty area at a frame → split the call containing
			*  that frame there (both halves on the grid), or append a fresh call
			*  at the tail on the grid. The new call starts EMPTY: a call with no
			*  prompt is a TODO the plan names before any GPU work — never silent
			*  junk prompt. */
			const addCallAt = (frame) => {
				setCalls((prev) => {
					const i = prev.findIndex((c) => frame > c.start_frame && frame < c.end_frame);
					if (i >= 0) {
						const cur = prev[i];
						const next = [...prev];
						const split = snapSplitFrame(cur.start_frame, cur.end_frame, isCarriedShape(i, cur), isCarriedShape(i + 1, cur), Math.round(frame));
						next[i] = {
							...cur,
							end_frame: split
						};
						next.splice(i + 1, 0, {
							text: "",
							start_frame: split,
							end_frame: cur.end_frame
						});
						return next;
					}
					const T = prev.length ? prev[prev.length - 1].end_frame : 0;
					const shape = isCarriedShape(prev.length, { transition: "extend" });
					return [...prev.map((c) => ({ ...c })), {
						text: "",
						start_frame: T,
						end_frame: T + snapCallLength(Math.max(1, Math.round(fps * 2)), shape)
					}];
				});
			};
			/** Wire a call's guide source. Empty = none (the planner's
			* contract: blank guide keys never materialize — clearing the input
			* detaches the guide; sources are typed, not dropped-then-wired
			* like lane keyframes). The last-frame subcard was CUT 2026-09-15 —
			* the PlagueKind gen lane owns no last-frame input, so the control
			* wrote wire nothing reads. */
			const setCallGuide = (i, kind, source) => {
				setCalls((prev) => {
					if (i < 0 || i >= prev.length) return prev;
					if ((prev[i][kind] ?? "") === source) return prev;
					const call = { ...prev[i] };
					if (source.trim()) call[kind] = source;
					else delete call[kind];
					return patchAt(prev, i, call);
				});
			};
			/** Seam mode per call (2026-09-20: the seam is AUTOMATIC —
			* 'extend' = the drift-control continuation carries the previous
			* window's latent at the director's proven 22-frame overlap with
			* the soft AV audio release; 'cut' = independent window, a true
			* butt. The seconds picker died with the MotionContext seam.)
			*
			* THE SEAM TOGGLE RE-FRAMES (2026-09-25, the uniform span gate): a
			* carried span is 17k and a cut span is 22+17k, so one span cannot
			* be legal in both states. Toggling moves the window's end by the
			* carry (22f) so the doc stays runnable — the operator's end frame
			* shows the new value; the neighbor's start follows as it always
			* did. A first window carries nothing either way and never moves. */
			const setCallTransition = (i, t) => {
				setCalls((prev) => {
					if (i < 0 || i >= prev.length) return prev;
					const call = { ...prev[i] };
					if (call.transition === t) return prev;
					const end = reflowSeamSpan(call, i, t);
					if (end === call.end_frame) {
						call.transition = t;
						return patchAt(prev, i, call);
					}
					const next = [...prev];
					next[i] = {
						...call,
						transition: t,
						end_frame: end
					};
					if (i < next.length - 1) next[i + 1] = {
						...next[i + 1],
						start_frame: end
					};
					return next;
				});
			};
			/** Edit a call's identity refs (Ref2VA route): REPLACE the run-level
			* refs for THIS call's windows. Empty string = the key drops from the
			* serialized call (inherit the Layer A refs). */
			const setCallRefs = (i, key, value) => {
				setCalls((prev) => {
					if (i < 0 || i >= prev.length) return prev;
					if ((prev[i].refs?.[key] ?? "") === value) return prev;
					const call = { ...prev[i] };
					const refs = { ...call.refs ?? {} };
					if (value.trim()) refs[key] = value.trim();
					else delete refs[key];
					if (Object.keys(refs).length) call.refs = refs;
					else delete call.refs;
					return patchAt(prev, i, call);
				});
			};
			/** Edit a call's span from the card's number inputs. The cut ripples
			* into the neighbor (start → the previous call's end; end → the next
			* call's start; the LAST call's end grows/shrinks the envelope), and
			* the written frame lands on the window's legal length — the number
			* input shows the snapped frame, the card never re-frames it. */
			const setCallSpan = (i, which, frame) => {
				setCalls((prev) => {
					if (i < 0 || i >= prev.length) return prev;
					const cur = prev[i];
					const next = [...prev];
					if (which === "start" && i > 0) {
						const prevCall = prev[i - 1];
						const leftCarried = isCarriedShape(i - 1, prevCall);
						const rightCarried = isCarriedShape(i, cur);
						const gesture = Math.round(frame);
						let boundary = snapSplitFrame(prevCall.start_frame, cur.end_frame, leftCarried, rightCarried, gesture);
						if (boundary === prevCall.end_frame && gesture !== boundary) {
							const stepped = boundary + GRID_STEP * Math.sign(gesture - boundary);
							if (stepped > prevCall.start_frame && stepped < cur.end_frame && isLegalCallLength(stepped - prevCall.start_frame, leftCarried) && isLegalCallLength(cur.end_frame - stepped, rightCarried)) boundary = stepped;
						}
						if (boundary === prevCall.end_frame) return prev;
						next[i - 1] = {
							...prevCall,
							end_frame: boundary
						};
						next[i] = {
							...cur,
							start_frame: boundary
						};
					} else if (which === "start") {
						const gesture = Math.min(Math.max(Math.round(frame), 0), cur.end_frame - GRID_BASE);
						let start = cur.end_frame - snapCallLength(cur.end_frame - gesture, false);
						if (start === cur.start_frame) start += GRID_STEP * Math.sign(gesture - start);
						if (start === cur.start_frame) return prev;
						next[i] = {
							...cur,
							start_frame: start
						};
					} else {
						const gesture = Math.max(Math.round(frame), cur.start_frame + 1);
						let end = snapCallEnd(cur, i, gesture);
						if (end === cur.end_frame) {
							const stepped = end + GRID_STEP * Math.sign(gesture - end);
							if (stepped >= cur.start_frame + shortestCallLength(i, cur)) end = stepped;
						}
						if (end === cur.end_frame) return prev;
						next[i] = {
							...cur,
							end_frame: end
						};
						if (i < prev.length - 1) next[i + 1] = {
							...next[i + 1],
							start_frame: end
						};
					}
					return next;
				});
			};
			/** Set (or clear — undefined) one per-call knob override. Clearing the
			* last knob removes the whole `knobs` dict: absent = inherit. */
			const setCallKnob = (i, key, value) => {
				setCalls((prev) => {
					if (i < 0 || i >= prev.length) return prev;
					const call = { ...prev[i] };
					const knobs = { ...call.knobs ?? {} };
					if (value === void 0) delete knobs[key];
					else knobs[key] = value;
					if (Object.keys(knobs).length === 0) delete call.knobs;
					else call.knobs = { ...knobs };
					return patchAt(prev, i, call);
				});
			};
			return {
				handleExtend,
				addCallAt,
				setCallGuide,
				setCallTransition,
				setCallRefs,
				setCallSpan,
				setCallKnob
			};
		}
		//#endregion
		//#region src/ui/studio/useBeatMutations.ts
		/** Keyframe gestures — the pin channel's writers (the lane's slices
		*  1–3: doc model + spine riders first, the drag/lane UI lands on
		*  top). Every write rides patchAt (the single-index patch spine). */
		function useBeatMutations(keyframes, setKeyframes) {
			const handleKeyframeAdd = (trackId, frame) => {
				const id = `kf-${keyframes.length}`;
				setKeyframes((prev) => [...prev, {
					image: "",
					frame
				}]);
				return id;
			};
			const handleKeyframeMove = (id, frame) => {
				const i = kfIndexOf(id);
				setKeyframes((prev) => {
					if (i < 0 || i >= prev.length || prev[i].frame === frame) return prev;
					return patchAt(prev, i, {
						...prev[i],
						frame
					});
				});
			};
			const handleKeyframeDelete = (id) => {
				const i = kfIndexOf(id);
				setKeyframes((prev) => i < 0 || i >= prev.length ? prev : prev.filter((_, j) => j !== i));
			};
			const setKeyframeImage = (i, image) => {
				setKeyframes((prev) => {
					if (i < 0 || i >= prev.length || prev[i].image === image) return prev;
					return patchAt(prev, i, {
						...prev[i],
						image
					});
				});
			};
			return {
				handleKeyframeAdd,
				handleKeyframeMove,
				handleKeyframeDelete,
				setKeyframeImage
			};
		}
		//#endregion
		//#region src/ui/studio/useDerivedView.ts
		/**
		* h3-timeline studio split (2026-09-06) — PURE MOVE from
		* ui/studio/component.tsx. No behavior change: headers/footers are new,
		* every logic line is verbatim from the monolith (source range noted).
		*/
		/** Upstream vocabulary, filmstrip, bar-space memos (tenant §10).
		*  Verbatim lines 2474–2628. */
		function useDerivedView(args) {
			const { upstreams, stage, calls, layerA, keyframes, filmMap, filmFromDoc, selected, fps, totalFrames, artifactIndex } = args;
			const sourceOptions = (0, react.useMemo)(() => {
				const opts = [];
				for (const u of upstreams ?? []) {
					const arts = u.result?.artifacts;
					if (!arts) continue;
					for (const name of Object.keys(arts)) opts.push({
						title: u.title,
						name
					});
				}
				return opts;
			}, [upstreams]);
			const linkGroups = (0, react.useMemo)(() => {
				const out = [];
				for (const u of upstreams ?? []) {
					const arts = u.result?.artifacts;
					if (!arts) continue;
					for (const [name, url] of Object.entries(arts)) if (typeof url === "string" && url && (0, _melite_card_base_client.isImageUrl)(url)) out.push({
						name,
						url,
						title: u.title
					});
				}
				return out;
			}, [upstreams]);
			const guideLinks = (0, react.useMemo)(() => {
				const out = {
					clip: [],
					audio: []
				};
				for (const u of upstreams ?? []) {
					const arts = u.result?.artifacts;
					if (!arts) continue;
					for (const [name, url] of Object.entries(arts)) {
						if (typeof url !== "string" || url === "") continue;
						const genre = refGenreOf(name, url);
						if (genre === "video") out.clip.push({
							name,
							url,
							title: u.title
						});
						else if (genre === "audio") out.audio.push({
							name,
							url,
							title: u.title
						});
					}
				}
				return out;
			}, [upstreams]);
			const filmstrip = (0, react.useMemo)(() => {
				const res = stage.result;
				const arts = res?.artifacts ?? {};
				const urls = Array.isArray(res?.assetUrls) ? res.assetUrls : [];
				const windowIndexOf = (n) => {
					const legacy = /^video_w(\d+)_/.exec(n);
					if (legacy !== null) return Number(legacy[1]);
					const real = /^h3_t4_w(\d+)_\d+_\.mp4$/.exec(n);
					if (real !== null) return Number(real[1]);
					return null;
				};
				const windows = Object.keys(arts).filter((n) => windowIndexOf(n) !== null && !n.endsWith("_last_frame") && !n.includes("_seam") && !n.includes("_prev")).filter((n) => typeof arts[n] === "string" && arts[n] !== "").sort((a, b) => {
					return windowIndexOf(a) - windowIndexOf(b);
				}).map((name) => ({
					name,
					url: arts[name]
				}));
				if (urls.length > 1) {
					const have = new Set(windows.map((w) => w.url));
					for (let i = 1; i < urls.length; i++) {
						const u = urls[i];
						if (!u || have.has(u)) continue;
						have.add(u);
						const m = /window(\d+)_video/.exec(u);
						windows.push({
							name: m ? `video_w${m[1]}_main` : u.split("/").pop(),
							url: u
						});
					}
				}
				const filmName = Object.keys(arts).find((n) => /^h3_t4_film_\d+_\.mp4$/.test(n));
				const filmUrl = filmName !== void 0 && typeof arts[filmName] === "string" && arts[filmName] !== "" ? arts[filmName] : "";
				const namedVideo = Object.entries(arts).find(([name, url]) => typeof url === "string" && url !== "" && refGenreOf(name, url) === "video" && !/^h3_t4_w\d+_\d+_\.mp4$/i.test(name) && !/^video_w\d+_/.test(name))?.[1];
				const flatVideo = urls.find((url) => refGenreOf("", url) === "video" && !/(?:^|\/)h3_t4_w\d+_\d+_\.mp4$/i.test(url) && !/(?:^|\/)video_w\d+_/.test(url));
				return {
					windows,
					final: filmUrl !== "" ? filmUrl : typeof namedVideo === "string" ? namedVideo : flatVideo ?? null
				};
			}, [stage.result]);
			const prompts = (0, react.useMemo)(() => callsToPrompts(calls, layerA.fps), [calls, layerA.fps]);
			const lanes = (0, react.useMemo)(() => {
				const ls = keyframesToLanes(keyframes);
				const byName = artifactIndex?.byName;
				if (byName === void 0) return ls;
				return ls.map((l, i) => {
					if (l.thumbUrl !== void 0 || keyframes[i] === void 0) return l;
					const resolved = byName.get(keyframes[i].image);
					return resolved === void 0 ? l : {
						...l,
						thumbUrl: resolved
					};
				});
			}, [keyframes, artifactIndex]);
			/** The film's OWN duration off the player (master-axis fallback): a
			*  run whose metadata carries no probed map still sizes the bar from
			*  the rendered film, never from the plan frames. */
			const [filmDurSec, setFilmDurSec] = (0, react.useState)(0);
			const barTotal = filmMap?.totalFrames ?? (filmDurSec > 0 ? Math.round(filmDurSec * (filmMap?.fps ?? fps)) : totalFrames);
			const barPrompts = (0, react.useMemo)(() => filmMap ? prompts.map((p) => ({
				...p,
				start_frame: filmFromDoc(p.start_frame),
				end_frame: filmFromDoc(p.end_frame)
			})) : prompts, [
				prompts,
				filmMap,
				filmFromDoc
			]);
			const barLanes = (0, react.useMemo)(() => filmMap ? lanes.map((k) => ({
				...k,
				frame: filmFromDoc(k.frame)
			})) : lanes, [
				lanes,
				filmMap,
				filmFromDoc
			]);
			/** Every prompt segment flattened into the bar's BEATS row (under the
			* calls): id `beat-i-j`, end_frame translated to the bar's INCLUSIVE
			* vocabulary (the doc's end is exclusive), color = the call's prompt
			* color so a segment reads as belonging to its call. */
			/** (Layer A NLE) the Music row's clips in BAR space: both endpoints
			* through filmFromDoc (identity with no film map), width = the mapped
			* span — a clip crossing a trim boundary narrows like the calls do. */
			const barAudioClips = (0, react.useMemo)(() => (layerA.audio_clips ?? []).map((c) => {
				const g0 = filmFromDoc(c.start_frame);
				const g1 = filmFromDoc(c.start_frame + c.dur_frames);
				return {
					id: c.id,
					name: c.name,
					start_frame: g0,
					dur_frames: Math.max(1, g1 - g0),
					gain: c.gain,
					class: c.class,
					text: c.text
				};
			}), [layerA.audio_clips, filmFromDoc]);
			/** THE PIN MAP (2026-09-22, the door-guard UX arm): which calls'
			* spans carry a dialogue/sfx clip — those windows PIN, and the
			* pinned window's normal audio doors stand down (the CallCard
			* grays the Ref audios bucket; the compose owns the real wall —
			* this is the BEFORE-the-Run hint, doc-space overlap mirroring
			* the stamp law's doc-span arm). */
			const voicePinnedCalls = (0, react.useMemo)(() => {
				const set = /* @__PURE__ */ new Set();
				calls.forEach((call, i) => {
					const sf = call.start_frame, ef = call.end_frame;
					for (const c of layerA.audio_clips ?? []) {
						const cls = c.class ?? (c.text ? "dialogue" : "music");
						if (cls !== "dialogue" && cls !== "sfx") continue;
						if ((c.dur_frames ?? 0) <= 0) continue;
						if (c.start_frame < ef && c.start_frame + c.dur_frames > sf) {
							set.add(i);
							break;
						}
					}
				});
				return set;
			}, [calls, layerA.audio_clips]);
			/** THE BLOCKER (2026-09-22, the operator's lane-collision law):
			* the D-M-E clips and the normal audio inputs are MUTUALLY EXCLUSIVE
			* at authoring time — reference audio wired on ANY call locks the
			* lanes (no adds on ANY lane); ANY clip present locks the Ref audios
			* buckets on EVERY call. Doc-level, both directions, blunt on
			* purpose: the compose door guard stays only as the silent backstop
			* for docs that already carry both (it strips, never crashes). */
			const refAudiosPresent = (0, react.useMemo)(() => calls.some((c) => !!(c.refs?.audios ?? "").trim()), [calls]);
			const audioClipsPresent = (layerA.audio_clips?.length ?? 0) > 0;
			return {
				sourceOptions,
				linkGroups,
				guideLinks,
				filmstrip,
				prompts,
				lanes,
				filmDurSec,
				setFilmDurSec,
				barTotal,
				barPrompts,
				barLanes,
				barAudioClips,
				callPreviews: (0, react.useMemo)(() => Object.fromEntries(filmstrip.windows.slice(0, calls.length).map((w, i) => [`call-${i}`, w.url])), [filmstrip.windows, calls.length]),
				selectedBarId: selected ? `call-${selected.callIdx}` : null,
				voicePinnedCalls,
				refAudiosPresent,
				audioClipsPresent
			};
		}
		//#endregion
		//#region src/ui/studio/component.tsx
		let readManageLane;
		/** Seat the studio's manage lane (the client entry's apply calls
		*  this; `undefined` unseats — the honest-empty arm a host without
		*  the manage contribution meets). */
		function seatStudioManageLane(reader) {
			readManageLane = reader;
		}
		/** The envelope's stems row, wire-checked (the manage envelope's
		*  data is a JSON value at the wire boundary — the stems row is
		*  trusted only as far as it is a string array). @param envelope -
		*  the manage door's ManageEnvelopeRow. @returns the refmods stems,
		*  or empty when the answer carries none. */
		function stemsOfEnvelope(envelope) {
			const stems = envelope.data?.stems;
			return Array.isArray(stems) ? stems.filter((stem) => typeof stem === "string") : [];
		}
		/** THE LISTING, LOADED ONCE (AbortSignal-lawful, no waterfall — the
		*  fetch fires in the mount effect's own pass, beside every other
		*  mount fetch, and aborts with the surface). Every miss — absent
		*  manage remote, door refusal, engine down, pack absent — lands on
		*  the SAME honest empty: the manual path fallback is the only
		*  other writer, and no miss ever throws across a render. */
		function useModsListing() {
			const [stems, setStems] = (0, react.useState)([]);
			(0, react.useEffect)(() => {
				const ctrl = new AbortController();
				(async () => {
					try {
						const settled = await (readManageLane?.() ?? (0, _melite_card_base_client.manageRemote)()).act({ action: "refmods_list" }, ctrl.signal);
						if (ctrl.signal.aborted) return;
						if (settled.ok === true) setStems(stemsOfEnvelope(settled.value));
					} catch {}
				})();
				return () => {
					ctrl.abort();
				};
			}, []);
			return stems;
		}
		function VideoTimelineStudio(owner) {
			const { stage, upstreams } = projectH3StageViewProps(owner);
			const running = isLiveRunStatus$1(owner.runStatus);
			const onSave = owner.onPatch;
			const doc = useShownDoc(stage, onSave);
			const { calls, keyframes, layerA } = doc;
			const modsListing = useModsListing();
			const [runPanelOpen, setRunPanelOpen] = (0, react.useState)(false);
			const { spec: knobSpec } = (0, _melite_card_base_client.useFormSpec)("h3-timeline");
			const knobFields = (0, react.useMemo)(() => {
				if (knobSpec === null || knobSpec === void 0) return {};
				const out = {};
				for (const f of (0, _melite_card_base_client.fieldsOf)(knobSpec)) out[f.name] = f;
				return out;
			}, [knobSpec]);
			const view = useViewSelection(calls, layerA, stage.id);
			const { selected, fps, totalFrames } = view;
			const film = useFilmSync({
				fps,
				totalFrames,
				keyframes,
				calls,
				setFrameIdx: view.setFrameIdx
			});
			const { seconds, unwired, guideCount, knobOverrides } = film;
			useStudioViewSync({
				totalFrames,
				setFrameIdx: view.setFrameIdx,
				selected,
				setSelected: view.setSelected,
				calls,
				callCardRefs: view.callCardRefs
			});
			const audio = useFilmAudio({
				stage,
				upstreams,
				layerA,
				setLayerA: doc.updateLayerA,
				setLayerAKey: doc.setLayerAKey,
				fps,
				frameIdx: view.frameIdx,
				filmPlaying: film.filmPlaying,
				filmFpsRef: film.filmFpsRef
			});
			const pr = usePromptMutations(doc.updateCalls);
			const handlePromptDelete = (id) => {
				view.setSelected(nextSelectionAfterDelete(selected, id));
				pr.handlePromptDelete(id);
			};
			const enh = useEnhance();
			const mut = useCallMutations(doc.updateCalls, fps);
			const kf = useBeatMutations(keyframes, doc.updateKeyframes);
			const derived = useDerivedView({
				upstreams,
				stage,
				calls,
				layerA,
				keyframes,
				filmMap: audio.filmMap,
				filmFromDoc: audio.filmFromDoc,
				selected,
				fps,
				totalFrames,
				artifactIndex: audio.artifactIndex
			});
			const handleDuration = (sec) => derived.setFilmDurSec(sec);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.StudioShell, {
				className: (0, _melite_card_base_client.cn)(studio_module_css_default.studioRoot),
				params: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: studio_module_css_default.railCol,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: studio_module_css_default.docBlock,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: studio_module_css_default.docLines,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									"data-testid": "tl-doc-readout",
									className: studio_module_css_default.tabular,
									children: studioCopy.docReadout({
										calls: calls.length,
										seconds,
										guides: guideCount,
										knobs: knobOverrides
									})
								}), unwired > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: studio_module_css_default.warnRow,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningTriangleOutlineRegular, { className: (0, _melite_card_base_client.cn)(studio_module_css_default.warnIcon, studio_module_css_default.sz12) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: studioCopy.unwiredWarning(unwired) })]
								})]
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CallCardsPanel, {
							calls,
							selected,
							setSelected: view.setSelected,
							fps,
							sourceOptions: derived.sourceOptions,
							keyframes,
							handleKeyframeMove: kf.handleKeyframeMove,
							handleKeyframeDelete: kf.handleKeyframeDelete,
							setKeyframeImage: kf.setKeyframeImage,
							deps: {
								selected,
								fps,
								layerA,
								knobFields,
								modsListing,
								callCardRefs: view.callCardRefs,
								artifactIndex: audio.artifactIndex,
								linkGroups: derived.linkGroups,
								guideLinks: derived.guideLinks,
								refArtifacts: audio.refArtifacts,
								handlePromptDelete,
								handlePromptUpdate: pr.handlePromptUpdate,
								enhanceOne: enh.enhanceOne,
								undoEnhance: enh.undoEnhance,
								enhancing: enh.enhancing,
								enhanceErr: enh.enhanceErr,
								enhanceUndo: enh.enhanceUndo,
								setCallSpan: mut.setCallSpan,
								setCallGuide: mut.setCallGuide,
								setCallTransition: mut.setCallTransition,
								setCallRefs: mut.setCallRefs,
								setCallKnob: mut.setCallKnob,
								voicePinnedCalls: derived.voicePinnedCalls,
								audioClipsPresent: derived.audioClipsPresent
							}
						}),
						selected == null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							"data-testid": "tl-run-panel",
							className: studio_module_css_default.runFold,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.DisclosureRow, {
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSettingsOutlineRegular, { size: 14 }),
								title: studioCopy.runParametersTitle,
								open: runPanelOpen,
								expandable: true,
								expandOnRowClick: true,
								onToggle: () => {
									setRunPanelOpen((v) => !v);
								},
								keepContentWhenOpen: true,
								collapsedContent: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: studio_module_css_default.runSummaryNote,
									children: studioCopy.runLayerNote
								}),
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: studio_module_css_default.runBody,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RunRecipeEngine, {
										base: stage.params ?? void 0,
										layerA,
										setLayerAKey: doc.setLayerAKey,
										setLayerA: doc.updateLayerA,
										refArtifacts: audio.refArtifacts
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RunRefsClips, {
										layerA,
										updateAudioClip: audio.updateAudioClip,
										deleteAudioClip: audio.deleteAudioClip
									})]
								})
							})
						})
					]
				}),
				preview: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StudioPreview, {
					stage,
					running,
					filmstrip: derived.filmstrip,
					filmRef: film.filmRef,
					filmMap: audio.filmMap,
					frameIdx: view.frameIdx,
					barTotal: derived.barTotal,
					fps,
					handleFilmTime: film.handleFilmTime,
					handlePlayingChange: film.handlePlayingChange,
					onDuration: handleDuration
				}),
				bottom: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StudioStripPane, {
					calls,
					totalFrames,
					fps,
					seconds,
					barPrompts: derived.barPrompts,
					barLanes: derived.barLanes,
					barAudioClips: derived.barAudioClips,
					barTotal: derived.barTotal,
					frameIdx: view.frameIdx,
					callPreviews: derived.callPreviews,
					selectedBarId: derived.selectedBarId,
					filmMap: audio.filmMap,
					handleBarFrame: film.handleBarFrame,
					handleScrubStart: film.handleScrubStart,
					handleScrubEnd: film.handleScrubEnd,
					handleKeyframeAdd: kf.handleKeyframeAdd,
					handleKeyframeMove: kf.handleKeyframeMove,
					handleKeyframeDelete: kf.handleKeyframeDelete,
					handlePromptUpdate: pr.handlePromptUpdate,
					handlePromptMove: pr.handlePromptMove,
					handlePromptResize: pr.handlePromptResize,
					handlePromptDelete,
					handleExtend: mut.handleExtend,
					addCallAt: mut.addCallAt,
					handleTimelineSelect: view.handleTimelineSelect,
					layerA,
					refAudiosBlocked: derived.refAudiosPresent,
					addAudioClip: audio.addAudioClip,
					takeAudioFile: audio.takeAudioFile,
					moveAudioClip: audio.moveAudioClip,
					deleteAudioClip: audio.deleteAudioClip,
					updateAudioClip: audio.updateAudioClip,
					setLayerAKey: doc.setLayerAKey,
					artifactIndex: audio.artifactIndex,
					docFromFilm: audio.docFromFilm,
					keyframes
				})
			});
		}
		(0, _melite_card_base_client.defineShellDeclaration)({
			preview: { kind: "native" },
			bottom: { kind: "timeline" },
			params: { slots: [] }
		});
		//#endregion
		//#region src/client/index.ts
		/**
		* h3-timeline client entry — the card package's OWN cards.stage.view
		* surface (2026-09-12, the composition-root correction: a card's
		* studio registers from ITS package, never from the bench host —
		* adding a card never touches the host, the DSH plugin contract).
		*
		* THE MOUNT LAW (the studio removal, 2026-08-19: a card is a SEAM and
		* whatever renders its authoring surface is INJECTED): the h3-timeline
		* card's authoring surface is this package's own studio —
		* src/ui/studio/component.tsx (VideoTimelineStudio, the 26-file
		* three-layer NLE tenant the family serves as studio.tenant
		* "video/h3-timeline"). This module is the ADAPTER that mounts it on
		* the bench slot — never a second definition site: the owner props
		* pass through VERBATIM onto the tenant (the one-truth currency,
		* 2026-10-27 — the tenant speaks StageViewOwnerProps and projects
		* its CardStage internally in ui/studio/projection.ts); the document
		* rides stage.params; writes ride onPatch (patchStageParams' partial
		* merge — the E4 write channel, observed ⊆ the family's declared
		* writes); the run rides the host drill's own Run row.
		*/
		(0, _melite_card_base_client.wireContractToastToRowStore)();
		/** The registration (the ui-tool law): the card package registers its
		* own shipped studio's view under its card key. */
		/** The built-in registration (the ui-tool law, verbatim — the
		* module namespace IS the plugin: the loader consumes name/inject/apply). */
		const name = "h3TimelineStudio";
		const inject = ["slots"];
		const registerStageView = (0, _melite_card_base_client.defineStageViewRegistration)("h3-timeline", H3TimelineStudio);
		/** The row's apply: the keyed-seam registration, PLUS the one manage
		*  seat this studio speaks (THE REFMODS LISTING DOOR's client arm,
		*  2026-11-05). The deck's assets-tab pattern, studio-shaped: the
		*  deck seats `ctx.remote.manage` at apply because its static estate
		*  inject makes that read legal — a studio's would park it (the fifth
		*  receipt), so the seat arms over the SAME inject-free reflect seam
		*  the factory's lazy bind rides and is READ at verb time, when the
		*  mounter's $mount has long landed. A host without the manage
		*  contribution answers undefined — the tenant's honest-empty, the
		*  manual fallback unchanged (studios still boot without it). */
		function apply(ctx) {
			registerStageView(ctx);
			seatStudioManageLane(() => ctx.get("remote.manage"));
		}
		/** The timeline surface — registered under key 'h3-timeline'. The
		* ADAPTER: the tenant mounted verbatim on the owner props — the
		* projection lives inside the tenant (ui/studio/projection.ts),
		* never here. */
		function H3TimelineStudio(props) {
			return (0, react.createElement)("div", {
				"data-testid": "h3-studio-tenant",
				style: {
					height: "100%",
					minHeight: 0
				}
			}, (0, react.createElement)(VideoTimelineStudio, props));
		}
		//#endregion
		exports.H3TimelineStudio = H3TimelineStudio;
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
