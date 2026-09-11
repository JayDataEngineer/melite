window.__ModuleLoader__.load({
	id: "@melite-plugin/dsh-card-deck",
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
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/apply-guard.ts
		/**
		* apply-guard — single-mount claim (module singleton). A duplicated client
		* injection would mount a second sidebar entry + overlay; the claim makes
		* the second apply a logged no-op.
		*/
		let claimed = false;
		function claimDeckApply() {
			if (claimed) {
				console.warn("[melite-card-deck] apply called twice — second mount skipped");
				return false;
			}
			claimed = true;
			return true;
		}
		function releaseDeckApply() {
			claimed = false;
		}
		//#endregion
		//#region \0dsh-css:melite-card-deck/src/client/assets.module.css.mjs
		const css = ".ZRfIha_root{height:100%;min-height:0;color:var(--dsw-alias-label-primary);flex-direction:column;gap:12px;padding:12px;font-size:12px;display:flex;overflow-y:auto}.ZRfIha_head{flex-wrap:wrap;align-items:center;gap:8px;display:flex}.ZRfIha_title{letter-spacing:.02em;margin:0;font-size:13px;font-weight:650}.ZRfIha_sub{opacity:.65;font-size:11px}.ZRfIha_section{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:10px;flex-direction:column;gap:6px;padding:10px;display:flex}.ZRfIha_sectionTitle{text-transform:uppercase;letter-spacing:.08em;opacity:.5;margin:0 0 2px;font-size:10px}.ZRfIha_row{flex-flow:wrap;align-items:flex-end;gap:6px;display:flex}.ZRfIha_row>label{flex:120px;min-width:0}.ZRfIha_field{flex-direction:column;gap:3px;display:flex}.ZRfIha_fieldLabel{opacity:.7;font-size:10.5px;font-weight:550}.ZRfIha_input{background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l2);color:inherit;box-sizing:border-box;border-radius:7px;width:100%;padding:5px 8px;font-family:inherit;font-size:12px}.ZRfIha_input:focus{outline:1px solid var(--dsw-alias-state-business-primary);border-color:#0000}.ZRfIha_mono{font-family:ui-monospace,monospace;font-size:11px}.ZRfIha_btn{background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);color:inherit;cursor:pointer;white-space:nowrap;border-radius:7px;padding:5px 10px;font-size:12px}.ZRfIha_btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.ZRfIha_btn:disabled{opacity:.45;cursor:default}.ZRfIha_btnPrimary{border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-state-business-primary)}.ZRfIha_btnDanger{border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 55%, transparent);color:var(--dsw-alias-state-error-primary)}.ZRfIha_kvRow{flex-wrap:wrap;align-items:center;gap:6px;display:flex}.ZRfIha_kvKey{font-weight:550}.ZRfIha_dot{border-radius:50%;flex-shrink:0;width:8px;height:8px}.ZRfIha_dotOk{background:var(--dsw-alias-state-business-primary);}.ZRfIha_dotWarn{background:color-mix(in srgb, var(--dsw-alias-label-primary) 55%, transparent);}.ZRfIha_dotBad{background:var(--dsw-alias-state-error-primary);}.ZRfIha_device{grid-template-columns:minmax(60px,auto) 1fr auto;align-items:center;gap:8px;display:grid}.ZRfIha_bar{background:color-mix(in srgb, var(--dsw-alias-label-primary) 14%, transparent);border-radius:3px;height:5px;display:block;overflow:hidden}.ZRfIha_barFill{background:var(--dsw-alias-state-business-primary);border-radius:3px;height:100%;display:block}.ZRfIha_chips{flex-wrap:wrap;gap:5px;display:flex}.ZRfIha_chip{border:1px solid var(--dsw-alias-border-l2);opacity:.8;border-radius:999px;padding:2px 7px;font-size:10px}.ZRfIha_chipWarn{border:1px solid var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary);border-radius:999px;padding:2px 7px;font-size:10px}.ZRfIha_resultHead{flex-wrap:wrap;align-items:baseline;gap:8px;display:flex}.ZRfIha_resultOk{letter-spacing:.06em;background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 18%, transparent);color:var(--dsw-alias-state-business-primary);border-radius:999px;padding:2px 7px;font-size:10px;font-weight:700}.ZRfIha_resultBad{letter-spacing:.06em;background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 18%, transparent);color:var(--dsw-alias-state-error-primary);border-radius:999px;padding:2px 7px;font-size:10px;font-weight:700}.ZRfIha_details>summary{cursor:pointer;opacity:.6;font-size:11px}.ZRfIha_pre{white-space:pre-wrap;word-break:break-word;max-height:260px;margin:6px 0 0;font-family:ui-monospace,monospace;font-size:10.5px;line-height:1.45;overflow:auto}.ZRfIha_dangerNote{color:var(--dsw-alias-state-error-primary);margin:0;font-size:11px}.ZRfIha_checkRow{opacity:.8;align-items:center;gap:6px;font-size:11px;display:flex}.ZRfIha_list{flex-direction:column;gap:3px;max-height:180px;margin:0;padding:0;list-style:none;display:flex;overflow-y:auto}.ZRfIha_listRow{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);border-radius:7px;justify-content:space-between;align-items:center;gap:8px;padding:4px 8px;display:flex}";
		const tagId = "@melite-plugin/dsh-card-deck/assets.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite-plugin/dsh-card-deck";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var assets_module_css_default = {
			"bar": "ZRfIha_bar",
			"barFill": "ZRfIha_barFill",
			"btn": "ZRfIha_btn",
			"btnDanger": "ZRfIha_btnDanger",
			"btnPrimary": "ZRfIha_btnPrimary",
			"checkRow": "ZRfIha_checkRow",
			"chip": "ZRfIha_chip",
			"chipWarn": "ZRfIha_chipWarn",
			"chips": "ZRfIha_chips",
			"dangerNote": "ZRfIha_dangerNote",
			"details": "ZRfIha_details",
			"device": "ZRfIha_device",
			"dot": "ZRfIha_dot",
			"dotBad": "ZRfIha_dotBad",
			"dotOk": "ZRfIha_dotOk",
			"dotWarn": "ZRfIha_dotWarn",
			"field": "ZRfIha_field",
			"fieldLabel": "ZRfIha_fieldLabel",
			"head": "ZRfIha_head",
			"input": "ZRfIha_input",
			"kvKey": "ZRfIha_kvKey",
			"kvRow": "ZRfIha_kvRow",
			"list": "ZRfIha_list",
			"listRow": "ZRfIha_listRow",
			"mono": "ZRfIha_mono",
			"pre": "ZRfIha_pre",
			"resultBad": "ZRfIha_resultBad",
			"resultHead": "ZRfIha_resultHead",
			"resultOk": "ZRfIha_resultOk",
			"root": "ZRfIha_root",
			"row": "ZRfIha_row",
			"section": "ZRfIha_section",
			"sectionTitle": "ZRfIha_sectionTitle",
			"sub": "ZRfIha_sub",
			"title": "ZRfIha_title"
		};
		//#endregion
		//#region src/client/assets-tab.tsx
		/**
		* assets-tab — the ONE DSH right-sidebar tab that is NOT cards:
		*
		*   ComfyUI Manager — a direct GUI on the estate's management plane.
		*     Every button is ONE action of the manage-plane SSOT
		*     (@melite/estate-queue's managePlane.ts — comfy-mcp +
		*     comfyui-manager + comfy-cli), reached over the `manage` Typert
		*     remote: a same-origin POST /api/manage/act carrying the
		*     client-request wire frame (the documented frame pair,
		*     api-gateway.md — the sanctioned caller shape for plugins outside
		*     the DSH web kernel; the host mounts the remote in the estate
		*     composition). The vocabulary mirrors the comfy_manage agent tool
		*     1:1 — enforced BOTH directions by the parity wall. Progressive
		*     disclosure: status is the cheap index and refreshes SILENTLY
		*     after every mutating action (never through the result pane —
		*     that pane belongs to the user's last explicit dispatch);
		*     discovery (installed packs, snapshots) renders as ROWS in place.
		*     INFERENCE LAW honored by construction — no action here
		*     runs inference, and lifecycle actions are refused SERVER-side
		*     while any run reads running/queued (the guard lives in the SSOT,
		*     never in this panel).
		*
		* Transport history (kill ledger): the tab's calls died with the
		* gateway app (this plugin's /v1/manage proxy, then a ctx.remote.lane
		* shape that never mounted client-side — "remote.lane is not a
		* function", 2026-09-10). The wire frame below is the DSH-native
		* replacement: no proxy, no gateway vocabulary, one fetch.
		*
		* Siblings' fate (NO LEGACY): Ray Media deleted with the media plugin
		* (5cbb5bcc — DSH's own media system owns that surface); Ray Flows
		* retired with the yaml spec library (35f2f830).
		*/
		/** Correlation id for one client-request frame (the reference caller
		* uses a random uuid per call; crypto.randomUUID is the browser
		* standard). */
		function nextRpcId() {
			const cryptoApi = globalThis.crypto;
			if (cryptoApi?.randomUUID !== void 0) return cryptoApi.randomUUID();
			return "rpc-" + Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);
		}
		/** POST one manage action over the `manage` remote's wire door —
		* same-origin /api/manage/act carrying the documented client-request
		* frame (api-gateway.md; the manage-remote wall pins the server
		* half). The single argument is `doc` (the adapter's parameter name
		* — the wire field rides it verbatim).
		*
		* A refusal is a DOMAIN outcome: the envelope carries it (ok:false +
		* detail), and a manage/refused RemoteError maps back onto the same
		* shape (its details ride the refused envelope's action/status/data).
		* A channel surprise (no /api route, malformed frame) is an honest
		* REFUSAL reply — never a silent success, never a throw past the
		* panel (an AbortError rethrows — cancellation is the caller's). */
		async function postManage(action, payload, signal) {
			const rpcId = nextRpcId();
			try {
				const response = await fetch("/api/manage/act", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						type: "client-request",
						rpcId,
						method: "manage/act",
						payload: { args: { doc: {
							action,
							...payload
						} } }
					}),
					...signal === void 0 ? {} : { signal }
				});
				if (!response.ok) return {
					action,
					ok: false,
					detail: "manage wire: HTTP " + String(response.status)
				};
				const body = await response.json();
				if (typeof body !== "object" || body === null || Reflect.get(body, "type") !== "server-response" || Reflect.get(body, "rpcId") !== rpcId) return {
					action,
					ok: false,
					detail: "manage wire: malformed response frame"
				};
				const result = Reflect.get(body, "result");
				if (typeof result !== "object" || result === null) return {
					action,
					ok: false,
					detail: "manage wire: malformed result"
				};
				if (Reflect.get(result, "ok") === true) {
					const value = Reflect.get(result, "value");
					if (typeof value !== "object" || value === null) return {
						action,
						ok: false,
						detail: "manage wire: malformed envelope"
					};
					return {
						action: typeof Reflect.get(value, "action") === "string" ? Reflect.get(value, "action") : action,
						ok: Reflect.get(value, "ok") === true,
						detail: typeof Reflect.get(value, "detail") === "string" ? Reflect.get(value, "detail") : "",
						data: Reflect.get(value, "data")
					};
				}
				const error = Reflect.get(result, "error");
				if (typeof error !== "object" || error === null) return {
					action,
					ok: false,
					detail: "manage wire: refused without an error frame"
				};
				const details = Reflect.get(error, "details");
				const d = typeof details === "object" && details !== null ? details : {};
				return {
					action: typeof d["action"] === "string" ? d["action"] : action,
					ok: false,
					detail: typeof Reflect.get(error, "message") === "string" ? Reflect.get(error, "message") : "manage wire: refused",
					data: d["data"]
				};
			} catch (e) {
				if (e instanceof Error && e.name === "AbortError") throw e;
				return {
					action,
					ok: false,
					detail: e instanceof Error ? e.message : String(e)
				};
			}
		}
		/** Bytes → GB string (ComfyUI reports raw bytes in system_stats). */
		function gb(bytes) {
			return typeof bytes === "number" && bytes > 0 ? (bytes / 2 ** 30).toFixed(1) : "?";
		}
		/** The result pane's data body: arrays render as lines (logs), else JSON. */
		function DataBody({ data }) {
			if (Array.isArray(data)) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
				className: assets_module_css_default.pre,
				children: data.map((line) => String(line)).join("\n")
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
				className: assets_module_css_default.pre,
				children: JSON.stringify(data, null, 2)
			});
		}
		function Field({ label, value, placeholder, mono, onChange }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: assets_module_css_default.field,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: assets_module_css_default.fieldLabel,
					children: label
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					className: assets_module_css_default.input + (mono ? " " + assets_module_css_default.mono : ""),
					value,
					placeholder,
					onChange: (e) => {
						onChange(e.target.value);
					}
				})]
			});
		}
		function Btn({ children, onClick, busy, primary, danger, disabled }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: [
					assets_module_css_default.btn,
					primary === true ? " " + assets_module_css_default.btnPrimary : "",
					danger === true ? " " + assets_module_css_default.btnDanger : ""
				].join(""),
				disabled: disabled === true || busy === true,
				onClick,
				children: [busy === true ? "… " : "", children]
			});
		}
		/** Mutating actions — the status section silently refreshes after each
		* (the result pane keeps the action's own reply; status never competes
		* for it — the shared-pane wipe bug, dead 2026-09-06). */
		const MUTATING = /* @__PURE__ */ new Set([
			"install_extension",
			"install_extension_url",
			"download_model",
			"provision_model",
			"launch",
			"restart",
			"stop",
			"update",
			"switch_version",
			"free",
			"snapshot_save",
			"snapshot_restore"
		]);
		/**
		* ComfyManagerPanel — the tab body. Exported for the vitest suite
		* (src/client/__tests__/assets-tab.test.tsx); the shell mounts it
		* through registerAssetsTab below. Hook-based: status auto-loads on
		* mount, every action posts through postManage and lands in the shared
		* result pane; mutating actions confirm first with the exact dispatch
		* and silently refresh the status section afterwards.
		*/
		function ComfyManagerPanel() {
			const [epUrl, setEpUrl] = (0, react.useState)("");
			const [status, setStatus] = (0, react.useState)(null);
			const [statusDetail, setStatusDetail] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)(null);
			const [result, setResult] = (0, react.useState)(null);
			const [extRows, setExtRows] = (0, react.useState)(null);
			const [extFilter, setExtFilter] = (0, react.useState)("");
			const [snapRows, setSnapRows] = (0, react.useState)(null);
			const [logTail, setLogTail] = (0, react.useState)("200");
			const [extIds, setExtIds] = (0, react.useState)("");
			const [extUrl, setExtUrl] = (0, react.useState)("");
			const [modelQuery, setModelQuery] = (0, react.useState)("");
			const [dlUrl, setDlUrl] = (0, react.useState)("");
			const [dlPath, setDlPath] = (0, react.useState)("");
			const [dlName, setDlName] = (0, react.useState)("");
			const [provModel, setProvModel] = (0, react.useState)("");
			const [provVariant, setProvVariant] = (0, react.useState)("");
			const [provQuant, setProvQuant] = (0, react.useState)("");
			const [swVersion, setSwVersion] = (0, react.useState)("");
			const [updateTarget, setUpdateTarget] = (0, react.useState)("comfy");
			const [force, setForce] = (0, react.useState)(false);
			/** Silent status refresh — updates the status section ONLY. The
			* result pane belongs to the user's last explicit dispatch; a status
			* reply landing there used to wipe search/browse results. */
			const fetchStatus = (0, react.useCallback)(async () => {
				try {
					const reply = await postManage("status", {});
					if (reply.ok === true) {
						const view = reply.data ?? null;
						setStatus(view);
						const live = view?.endpoint?.url;
						if (typeof live === "string" && live !== "") setEpUrl((prev) => prev === "" ? live : prev);
					}
					setStatusDetail(reply.detail ?? "");
				} catch (e) {
					setStatusDetail("request failed: " + String(e));
				}
			}, []);
			(0, react.useEffect)(() => {
				fetchStatus();
			}, [fetchStatus]);
			/** Dispatch one action; the reply lands in the result pane. A
			* mutating action silently refreshes the status section afterwards
			* (launch/restart/stop visibly change it — the panel must show the
			* world the action made, not the world before it). */
			const run = (0, react.useCallback)(async (action, payload = {}) => {
				setBusy(action);
				try {
					const reply = await postManage(action, payload);
					setResult(reply);
					return reply;
				} catch (e) {
					setResult({
						action,
						ok: false,
						detail: "request failed: " + String(e)
					});
					return null;
				} finally {
					setBusy(null);
					if (MUTATING.has(action)) fetchStatus();
				}
			}, [fetchStatus]);
			/** Browse rows: installed packs — the manage rail's rows are
			*  {name, version} objects; render "name — version" (never
			*  [object Object] — the operator-caught regression). */
			const loadExtensions = (0, react.useCallback)(async () => {
				const reply = await run("list_extensions");
				if (reply !== null && reply.ok === true && Array.isArray(reply.data)) setExtRows(reply.data.map((row) => {
					if (typeof row === "string") return row;
					if (typeof row === "object" && row !== null) {
						const r = row;
						const name = typeof r.name === "string" ? r.name : "?";
						const ver = typeof r.version === "string" ? r.version : typeof r.ver === "string" ? r.ver : "?";
						return name + " — " + ver;
					}
					return String(row);
				}));
			}, [run]);
			/** Browse rows: saved snapshots. */
			const loadSnapshots = (0, react.useCallback)(async () => {
				const reply = await run("snapshot_list");
				if (reply !== null && reply.ok === true && Array.isArray(reply.data)) setSnapRows(reply.data.map(String));
			}, [run]);
			/** Mutating actions confirm with the exact dispatch (one sentence). */
			function confirmRun(action, sentence, payload = {}, after) {
				if (window.confirm(sentence)) run(action, payload).then(() => {
					if (after !== void 0) after();
				});
			}
			const ep = status?.endpoint;
			const up = ep?.reachable === true;
			const workspaceUp = status?.server_info?.running === true;
			const activeRuns = status?.active_runs ?? [];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: assets_module_css_default.root,
				"data-comfy-manager": "",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: assets_module_css_default.head,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
								className: assets_module_css_default.title,
								children: "ComfyUI Manager"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: assets_module_css_default.sub,
								children: statusDetail
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Btn, {
								onClick: () => {
									fetchStatus();
								},
								primary: true,
								children: "Refresh"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: assets_module_css_default.section,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								className: assets_module_css_default.sectionTitle,
								children: "Server"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: assets_module_css_default.kvRow,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: up ? assets_module_css_default.dotOk : workspaceUp ? assets_module_css_default.dotWarn : assets_module_css_default.dotBad,
										"aria-hidden": "true"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: assets_module_css_default.kvKey,
										children: up ? "reachable" : workspaceUp ? "workspace up, server down" : "not reachable"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: assets_module_css_default.mono,
										children: [ep?.url ?? "", ep?.reachable !== true && ep?.reason !== void 0 ? " — " + ep.reason : ""]
									})
								]
							}),
							ep?.comfyui_version !== void 0 && ep.comfyui_version !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: assets_module_css_default.kvRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: assets_module_css_default.kvKey,
									children: "version"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: assets_module_css_default.mono,
									children: String(ep.comfyui_version)
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: assets_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									label: "server url",
									value: epUrl,
									placeholder: "http://127.0.0.1:8188",
									mono: true,
									onChange: setEpUrl
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Btn, {
									busy: busy === "endpoint_set",
									disabled: epUrl.trim() === "",
									onClick: () => {
										run("endpoint_set", { url: epUrl.trim() });
									},
									children: "Set"
								})]
							}),
							(ep?.devices ?? []).map((d, i) => {
								const total = typeof d.vram_total === "number" ? d.vram_total : 0;
								const free = typeof d.vram_free === "number" ? d.vram_free : 0;
								const pct = total > 0 ? Math.max(0, Math.min(100, Math.round(free / total * 100))) : 0;
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: assets_module_css_default.device,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: assets_module_css_default.kvKey,
											children: d.name ?? "gpu"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: assets_module_css_default.bar,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: assets_module_css_default.barFill,
												style: { width: pct + "%" }
											})
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: assets_module_css_default.mono,
											children: [
												gb(free),
												" / ",
												gb(total),
												" GB free"
											]
										})
									]
								}, i);
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: assets_module_css_default.chips,
								children: [
									status?.manager_security !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: assets_module_css_default.chip,
										children: ["manager security: ", String(status.manager_security)]
									}),
									Object.entries(status?.routing ?? {}).map(([k, v]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: assets_module_css_default.chip,
										children: [
											k,
											": ",
											String(v)
										]
									}, k)),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: activeRuns.length > 0 ? assets_module_css_default.chipWarn : assets_module_css_default.chip,
										children: [
											"active runs: ",
											activeRuns.length,
											activeRuns.length > 0 ? " (" + activeRuns.join(", ") + ")" : ""
										]
									})
								]
							})
						]
					}),
					result !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: assets_module_css_default.section,
						"data-testid": "manage-result",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: assets_module_css_default.resultHead,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: result.ok === true ? assets_module_css_default.resultOk : assets_module_css_default.resultBad,
									children: result.ok === true ? "OK" : "REFUSED"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: assets_module_css_default.mono,
									children: result.action ?? "?"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: assets_module_css_default.sub,
									children: result.detail ?? ""
								})
							]
						}), result.data !== void 0 && result.data !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
							className: assets_module_css_default.details,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: "data" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DataBody, { data: result.data })]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: assets_module_css_default.section,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								className: assets_module_css_default.sectionTitle,
								children: "Extensions"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: assets_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									label: "filter installed",
									value: extFilter,
									placeholder: "kj, moge…",
									onChange: setExtFilter
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Btn, {
									busy: busy === "list_extensions",
									onClick: () => {
										loadExtensions();
									},
									children: "Installed packs"
								})]
							}),
							extRows !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("ul", {
								className: assets_module_css_default.list,
								"data-testid": "ext-list",
								children: [extRows.filter((r) => r.toLowerCase().includes(extFilter.trim().toLowerCase())).map((r) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
									className: assets_module_css_default.listRow,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: assets_module_css_default.mono,
										children: r
									})
								}, r)), extRows.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
									className: assets_module_css_default.listRow,
									children: "no packs installed"
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: assets_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									label: "registry ids (comma-separated)",
									value: extIds,
									placeholder: "ComfyUI-KJNodes, ComfyUI-VideoHelperSuite",
									mono: true,
									onChange: setExtIds
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Btn, {
									busy: busy === "install_extension",
									disabled: extIds.trim() === "",
									onClick: () => {
										const nodes = extIds.split(",").map((s) => s.trim()).filter((s) => s !== "");
										confirmRun("install_extension", "Install extension pack(s) " + nodes.join(", ") + " through the manager rail?", { nodes }, () => {
											if (extRows !== null) loadExtensions();
										});
									},
									children: "Install"
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: assets_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									label: "git URL (cm_cli direct)",
									value: extUrl,
									placeholder: "https://github.com/…",
									mono: true,
									onChange: setExtUrl
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Btn, {
									busy: busy === "install_extension_url",
									disabled: extUrl.trim() === "",
									onClick: () => {
										confirmRun("install_extension_url", "Install extension from " + extUrl.trim() + "?", { url: extUrl.trim() }, () => {
											if (extRows !== null) loadExtensions();
										});
									},
									children: "Install from URL"
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: assets_module_css_default.section,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								className: assets_module_css_default.sectionTitle,
								children: "Snapshots"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: assets_module_css_default.sub,
								children: "Save before update / switch_version — restore is refused while runs are active (force overrides)."
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: assets_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Btn, {
									busy: busy === "snapshot_list",
									onClick: () => {
										loadSnapshots();
									},
									children: "List snapshots"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Btn, {
									busy: busy === "snapshot_save",
									primary: true,
									onClick: () => {
										confirmRun("snapshot_save", "Save an environment snapshot (comfyui + packs + pip)?", {}, () => {
											loadSnapshots();
										});
									},
									children: "Save snapshot"
								})]
							}),
							snapRows !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("ul", {
								className: assets_module_css_default.list,
								"data-testid": "snap-list",
								children: [snapRows.map((s) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
									className: assets_module_css_default.listRow,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: assets_module_css_default.mono,
										children: s
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Btn, {
										danger: true,
										busy: busy === "snapshot_restore",
										onClick: () => {
											confirmRun("snapshot_restore", "Restore snapshot " + s + "? Rewrites extensions + deps (restart required) — refused while runs are active unless force.", {
												snapshot: s,
												force
											}, () => {
												loadSnapshots();
											});
										},
										children: "Restore"
									})]
								}, s)), snapRows.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
									className: assets_module_css_default.listRow,
									children: "no snapshots — save one before switch/update"
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: assets_module_css_default.section,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								className: assets_module_css_default.sectionTitle,
								children: "Models"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: assets_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									label: "search",
									value: modelQuery,
									placeholder: "sdxl, wan…",
									onChange: setModelQuery
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Btn, {
									busy: busy === "search_models",
									disabled: modelQuery.trim() === "",
									onClick: () => {
										run("search_models", { query: modelQuery.trim() });
									},
									children: "Search"
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: assets_module_css_default.row,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
										label: "download URL",
										value: dlUrl,
										placeholder: "https://…/model.safetensors",
										mono: true,
										onChange: setDlUrl
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
										label: "relative path",
										value: dlPath,
										placeholder: "models/checkpoints",
										mono: true,
										onChange: setDlPath
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
										label: "filename",
										value: dlName,
										placeholder: "model.safetensors",
										mono: true,
										onChange: setDlName
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Btn, {
										busy: busy === "download_model",
										disabled: dlUrl.trim() === "",
										onClick: () => {
											const payload = { url: dlUrl.trim() };
											if (dlPath.trim() !== "") payload.relative_path = dlPath.trim();
											if (dlName.trim() !== "") payload.filename = dlName.trim();
											confirmRun("download_model", "Queue download of " + (dlName.trim() || dlUrl.trim()) + "?", payload);
										},
										children: "Download"
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: assets_module_css_default.row,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
										label: "provision catalog id",
										value: provModel,
										placeholder: "z-image",
										mono: true,
										onChange: setProvModel
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
										label: "variant",
										value: provVariant,
										onChange: setProvVariant
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
										label: "quant",
										value: provQuant,
										onChange: setProvQuant
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Btn, {
										busy: busy === "provision_model",
										disabled: provModel.trim() === "",
										onClick: () => {
											const payload = { model: provModel.trim() };
											if (provVariant.trim() !== "") payload.variant = provVariant.trim();
											if (provQuant.trim() !== "") payload.quant = provQuant.trim();
											confirmRun("provision_model", "Provision model " + provModel.trim() + " from the catalog (present files are skipped)?", payload);
										},
										children: "Provision"
									})
								]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: assets_module_css_default.section,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
							className: assets_module_css_default.sectionTitle,
							children: "Logs"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: assets_module_css_default.row,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: "tail lines",
								value: logTail,
								onChange: setLogTail,
								mono: true
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Btn, {
								busy: busy === "logs",
								onClick: () => {
									run("logs", { tail: Math.max(1, Math.min(Number.parseInt(logTail, 10) || 200, 2e3)) });
								},
								children: "View logs"
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: assets_module_css_default.section,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								className: assets_module_css_default.sectionTitle,
								children: "Lifecycle"
							}),
							activeRuns.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
								className: assets_module_css_default.dangerNote,
								children: [activeRuns.length, " active run(s) — lifecycle actions will be refused unless force is set."]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: assets_module_css_default.row,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Btn, {
										busy: busy === "launch",
										onClick: () => {
											confirmRun("launch", "Launch the ComfyUI server?");
										},
										children: "Launch"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Btn, {
										busy: busy === "restart",
										danger: true,
										onClick: () => {
											confirmRun("restart", "Restart the ComfyUI server?", { force });
										},
										children: "Restart"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Btn, {
										busy: busy === "stop",
										danger: true,
										onClick: () => {
											confirmRun("stop", "Stop the ComfyUI server?", { force });
										},
										children: "Stop"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Btn, {
										busy: busy === "free",
										onClick: () => {
											confirmRun("free", "Ask ComfyUI to free memory (next worker iteration)?");
										},
										children: "Free VRAM"
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: assets_module_css_default.row,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: assets_module_css_default.field,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: assets_module_css_default.fieldLabel,
											children: "update target"
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
											className: assets_module_css_default.input,
											value: updateTarget,
											onChange: (e) => {
												setUpdateTarget(e.target.value);
											},
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
													value: "comfy",
													children: "comfy"
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
													value: "cli",
													children: "cli"
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
													value: "all",
													children: "all"
												})
											]
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Btn, {
										busy: busy === "update",
										danger: true,
										onClick: () => {
											confirmRun("update", "Update " + updateTarget + "?", {
												target: updateTarget,
												force
											});
										},
										children: "Update"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
										label: "switch to version",
										value: swVersion,
										placeholder: "commit / tag",
										mono: true,
										onChange: setSwVersion
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Btn, {
										busy: busy === "switch_version",
										danger: true,
										disabled: swVersion.trim() === "",
										onClick: () => {
											confirmRun("switch_version", "Switch ComfyUI to " + swVersion.trim() + "?", {
												version: swVersion.trim(),
												force
											});
										},
										children: "Switch"
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: assets_module_css_default.checkRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: force,
									onChange: (e) => {
										setForce(e.target.checked);
									}
								}), "force (override the active-run guard)"]
							})
						]
					})
				]
			});
		}
		/** The server-rack glyph — ComfyUI management (the GPU backend + its upkeep). */
		function ComfyIcon({ size }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "2.5",
						y: "2.5",
						width: "11",
						height: "4.6",
						rx: "1.2",
						stroke: "currentColor",
						strokeWidth: "1.3"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "2.5",
						y: "8.9",
						width: "11",
						height: "4.6",
						rx: "1.2",
						stroke: "currentColor",
						strokeWidth: "1.3"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "5.1",
						cy: "4.8",
						r: "0.9",
						fill: "currentColor"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "5.1",
						cy: "11.2",
						r: "0.9",
						fill: "currentColor"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "M8.2 4.8h3.2M8.2 11.2h3.2",
						stroke: "currentColor",
						strokeWidth: "1.3",
						strokeLinecap: "round"
					})
				]
			});
		}
		function register(ctx, id, kind, title, guideOrder, guideDescription, icon, component) {
			ctx.effect(() => ctx.sidebarRightTabs.register({
				id,
				kind,
				title: () => title,
				guide: [{
					order: guideOrder,
					title: () => title,
					description: () => guideDescription,
					icon
				}]
			}), "melite-card-deck: " + id + " tab type");
			ctx.slots.inject("sidebar.right.pane.tab", () => {
				const dispose = ctx.slots.register({
					name: "sidebar.right.pane.tab",
					key: id
				}, component);
				return typeof dispose === "function" ? dispose : () => {};
			});
		}
		/**
		* Register the non-card tab on the native right-sidebar registry
		* (ui-sidebar-right's two-registration contract, 2026-09-10 migration —
		* the shipped documentpreview is the reference).
		*
		* NO CHROME-DRIVING SELF-HEAL. The 2026-08-26 auto-open tick machine that
		* used to live here (a 400ms interval that synthetic-clicked the shell's
		* expand toggle, the better-sidebar + button, and the menu's Ray Media
		* item) is deleted (2026-09-05): it could never latch and instead
		* toggled the host's + menu open/closed every 400ms forever. A plugin
		* never drives host chrome on a timer; reachability belongs to the user
		* (the guide page lists this tab) or to the service API
		* (ctx.sidebarRight.openTab), never to synthetic clicks on the shell's
		* buttons.
		*/
		function registerAssetsTab(ctx) {
			register(ctx, "melite-card-deck:comfy", "comfy-manager", "ComfyUI Manager", 61, "The estate's ComfyUI manager — packs, snapshots, status.", ComfyIcon, ComfyManagerPanel);
		}
		//#endregion
		//#region src/client/index.ts
		/** 'slots' (seat declarations) + the native right-sidebar tab registry
		*  (ui-sidebar-right, the web profile's own subsystem) — hosts the
		*  tabs. No transport inject: the panel carries its own wire caller. */
		const inject = ["slots", "sidebarRightTabs"];
		function apply(ctx) {
			if (!claimDeckApply()) return;
			ctx.effect(() => releaseDeckApply, "melite-card-deck: apply claim");
			try {
				registerAssetsTab(ctx);
			} catch (error) {
				console.error("[melite-card-deck] assets tab registration failed:", error);
			}
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
