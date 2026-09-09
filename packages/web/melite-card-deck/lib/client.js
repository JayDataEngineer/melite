window.__ModuleLoader__.load({
	id: "@melite-plugin/dsh-card-deck",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		let react_dom_client = require("react-dom/client");
		//#region src/client/apply-guard.ts
		/**
		* apply-guard — single-mount claim (module singleton). A duplicated client
		* injection would mount a second sidebar entry + overlay; the claim makes
		* the second apply a logged no-op.
		*/
		let claimed = false;
		function claimDeckApply() {
			if (claimed) {
				console.warn("[ray-card-deck] apply called twice — second mount skipped");
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
		const css$1 = ".ZRfIha_root{height:100%;min-height:0;color:var(--dsw-alias-label-primary);flex-direction:column;gap:12px;padding:12px;font-size:12px;display:flex;overflow-y:auto}.ZRfIha_head{flex-wrap:wrap;align-items:center;gap:8px;display:flex}.ZRfIha_title{letter-spacing:.02em;margin:0;font-size:13px;font-weight:650}.ZRfIha_sub{opacity:.65;font-size:11px}.ZRfIha_section{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:10px;flex-direction:column;gap:6px;padding:10px;display:flex}.ZRfIha_sectionTitle{text-transform:uppercase;letter-spacing:.08em;opacity:.5;margin:0 0 2px;font-size:10px}.ZRfIha_row{flex-flow:wrap;align-items:flex-end;gap:6px;display:flex}.ZRfIha_row>label{flex:120px;min-width:0}.ZRfIha_field{flex-direction:column;gap:3px;display:flex}.ZRfIha_fieldLabel{opacity:.7;font-size:10.5px;font-weight:550}.ZRfIha_input{background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l2);color:inherit;box-sizing:border-box;border-radius:7px;width:100%;padding:5px 8px;font-family:inherit;font-size:12px}.ZRfIha_input:focus{outline:1px solid var(--dsw-alias-state-business-primary);border-color:#0000}.ZRfIha_mono{font-family:ui-monospace,monospace;font-size:11px}.ZRfIha_btn{background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);color:inherit;cursor:pointer;white-space:nowrap;border-radius:7px;padding:5px 10px;font-size:12px}.ZRfIha_btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.ZRfIha_btn:disabled{opacity:.45;cursor:default}.ZRfIha_btnPrimary{border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-state-business-primary)}.ZRfIha_btnDanger{border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 55%, transparent);color:var(--dsw-alias-state-error-primary)}.ZRfIha_kvRow{flex-wrap:wrap;align-items:center;gap:6px;display:flex}.ZRfIha_kvKey{font-weight:550}.ZRfIha_dot{border-radius:50%;flex-shrink:0;width:8px;height:8px}.ZRfIha_dotOk{background:var(--dsw-alias-state-business-primary);}.ZRfIha_dotWarn{background:color-mix(in srgb, var(--dsw-alias-label-primary) 55%, transparent);}.ZRfIha_dotBad{background:var(--dsw-alias-state-error-primary);}.ZRfIha_device{grid-template-columns:minmax(60px,auto) 1fr auto;align-items:center;gap:8px;display:grid}.ZRfIha_bar{background:color-mix(in srgb, var(--dsw-alias-label-primary) 14%, transparent);border-radius:3px;height:5px;display:block;overflow:hidden}.ZRfIha_barFill{background:var(--dsw-alias-state-business-primary);border-radius:3px;height:100%;display:block}.ZRfIha_chips{flex-wrap:wrap;gap:5px;display:flex}.ZRfIha_chip{border:1px solid var(--dsw-alias-border-l2);opacity:.8;border-radius:999px;padding:2px 7px;font-size:10px}.ZRfIha_chipWarn{border:1px solid var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary);border-radius:999px;padding:2px 7px;font-size:10px}.ZRfIha_resultHead{flex-wrap:wrap;align-items:baseline;gap:8px;display:flex}.ZRfIha_resultOk{letter-spacing:.06em;background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 18%, transparent);color:var(--dsw-alias-state-business-primary);border-radius:999px;padding:2px 7px;font-size:10px;font-weight:700}.ZRfIha_resultBad{letter-spacing:.06em;background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 18%, transparent);color:var(--dsw-alias-state-error-primary);border-radius:999px;padding:2px 7px;font-size:10px;font-weight:700}.ZRfIha_details>summary{cursor:pointer;opacity:.6;font-size:11px}.ZRfIha_pre{white-space:pre-wrap;word-break:break-word;max-height:260px;margin:6px 0 0;font-family:ui-monospace,monospace;font-size:10.5px;line-height:1.45;overflow:auto}.ZRfIha_dangerNote{color:var(--dsw-alias-state-error-primary);margin:0;font-size:11px}.ZRfIha_checkRow{opacity:.8;align-items:center;gap:6px;font-size:11px;display:flex}.ZRfIha_list{flex-direction:column;gap:3px;max-height:180px;margin:0;padding:0;list-style:none;display:flex;overflow-y:auto}.ZRfIha_listRow{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);border-radius:7px;justify-content:space-between;align-items:center;gap:8px;padding:4px 8px;display:flex}";
		const tagId$1 = "@melite-plugin/dsh-card-deck/assets.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite-plugin/dsh-card-deck";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
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
		*   Ray ComfyUI — the ComfyUI MANAGER, NATIVE (2026-09-06): a direct GUI
		*     on the estate's management plane. Every button is ONE action of
		*     the python/manage.py SSOT (comfy-mcp + comfyui-manager + comfy-cli
		*     behind POST /v1/manage — PROVISIONING LAW's "management is python
		*     packages"), reached same-origin through THIS plugin's own /v1
		*     gateway proxy. The vocabulary mirrors the comfy_manage agent tool
		*     1:1 — enforced BOTH directions by the parity wall
		*     (tests/walls/suites/test_manage_parity.py). Progressive
		*     disclosure: status is the cheap index and refreshes SILENTLY
		*     after every mutating action (never through the result pane —
		*     that pane belongs to the user's last explicit dispatch);
		*     discovery (installed packs, snapshots) renders as ROWS in place.
		*     INFERENCE LAW honored by construction — no action here
		*     runs inference, and lifecycle actions are refused SERVER-side
		*     while any run reads running/queued (the guard lives in the SSOT,
		*     never in this panel).
		*
		* WHY NATIVE (operator complaint 2026-09-06: "it is a card view in the
		* right panel — it was supposed to be a comfyui manager"): the
		* 2026-08-25 tab iframed /editor/?rayAssets=comfy to mount the
		* pre-plugin editor's ComfyManagerRailPanel. That surface died with the
		* editor consolidation — the editor's embed params are
		* ?meliteAssets=media|cards, there is no comfy section — so the iframe
		* fell through to the editor's DEFAULT card studio. The manager now
		* renders here, no iframe, no editor dependency.
		*
		* Siblings' fate (NO LEGACY): Ray Media lives in @infer-media/dsh-media
		* since 20eb2c58 (own plugin, own host routes); Ray Flows retired with
		* the yaml spec library (35f2f830).
		*/
		/** POST one manage action (same-origin: the deck host proxies /v1). */
		async function postManage(action, payload) {
			const res = await fetch("/v1/manage", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					action,
					...payload
				})
			});
			try {
				return await res.json();
			} catch {
				return {
					action,
					ok: false,
					detail: "HTTP " + String(res.status)
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
		* through registerRayAssetsTab below. Hook-based: status auto-loads on
		* mount, every action posts through postManage and lands in the shared
		* result pane; mutating actions confirm first with the exact dispatch
		* and silently refresh the status section afterwards.
		*/
		function ComfyManagerPanel() {
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
					if (reply.ok === true) setStatus(reply.data ?? null);
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
			/** Browse rows: installed packs (cm_cli simple-show via the SSOT). */
			const loadExtensions = (0, react.useCallback)(async () => {
				const reply = await run("list_extensions");
				if (reply !== null && reply.ok === true && Array.isArray(reply.data)) setExtRows(reply.data.map(String));
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
				"data-ray-comfy-manager": "",
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
		function register(ctx, id, title, order, icon, component) {
			ctx.effect(() => {
				const dispose = ctx.betterSidebar.registerTab({
					id,
					title: () => title,
					icon,
					order,
					single: true,
					component
				});
				return typeof dispose === "function" ? dispose : () => {};
			}, "ray-card-deck: " + id + " tab");
		}
		/**
		* Register the non-card tab on the better-sidebar registry.
		*
		* NO CHROME-DRIVING SELF-HEAL. The 2026-08-26 auto-open tick machine that
		* used to live here (a 400ms interval that synthetic-clicked the shell's
		* expand toggle, the better-sidebar + button, and the menu's Ray Media
		* item) is deleted (2026-09-05): it could never latch and instead
		* toggled the host's + menu open/closed every 400ms forever. A plugin
		* never drives host chrome on a timer; reachability belongs to the user
		* (the + menu lists this tab) or to the service API (bs.openTab), never
		* to synthetic clicks on the shell's buttons.
		*/
		function registerRayAssetsTab(ctx) {
			register(ctx, "ray-card-deck:comfy", "Ray ComfyUI", 61, (s) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ComfyIcon, { size: s }), ComfyManagerPanel);
		}
		//#endregion
		//#region \0dsh-css:melite-card-deck/src/client/deck.module.css.mjs
		const css = ".al0K6a_overlay{z-index:60;background:color-mix(in srgb, var(--dsw-alias-label-primary) 45%, transparent);justify-content:flex-end;align-items:stretch;animation:.16s ease-out al0K6a_dkfade;display:flex;position:fixed;inset:0}.al0K6a_canvasFrame{width:100%;height:100%;min-height:0;overflow:hidden}.al0K6a_canvasIframe{background:var(--dsw-alias-bg-base);border:0;width:100%;height:100%;display:block}.al0K6a_canvas{flex-direction:column;width:100%;height:100%;min-height:0;display:flex;overflow:hidden}.al0K6a_tabRail{border-bottom:1px solid var(--dsw-alias-border-l1);flex-direction:row;flex-shrink:0;gap:2px;padding:8px 12px;display:flex;overflow-x:auto}.al0K6a_tabMain{flex:1;grid-template-columns:1fr 340px;min-height:0;display:grid}.al0K6a_tabEmpty{padding:18px 16px;overflow-y:auto}.al0K6a_tabRuns{flex-direction:column;gap:8px;margin-top:10px;display:flex}@keyframes al0K6a_dkfade{0%{opacity:0}to{opacity:1}}.al0K6a_frame{background:var(--dsw-alias-bg-layer-2);width:min(980px,94vw);height:100vh;color:var(--dsw-alias-label-primary);border-left:1px solid var(--dsw-alias-border-l1);box-shadow:-18px 0 48px color-mix(in srgb, var(--dsw-alias-label-primary) 40%, transparent);flex-direction:column;display:flex}.al0K6a_head{border-bottom:1px solid var(--dsw-alias-border-l1);align-items:center;gap:12px;padding:14px 18px;display:flex}.al0K6a_title{letter-spacing:.02em;margin:0;font-size:14px;font-weight:650}.al0K6a_subtitle{opacity:.6;font-size:11px}.al0K6a_closeBtn{color:inherit;cursor:pointer;background:0 0;border:0;border-radius:6px;margin-left:auto;padding:2px 8px;font-size:18px}.al0K6a_closeBtn:hover{background:var(--dsw-alias-interactive-bg-hover)}.al0K6a_body{flex:1;grid-template-columns:132px 1fr 340px;min-height:0;display:grid}.al0K6a_rail{border-right:1px solid var(--dsw-alias-border-l1);flex-direction:column;gap:2px;padding:10px 8px;display:flex;overflow-y:auto}.al0K6a_railBtn{color:inherit;text-align:left;cursor:pointer;text-transform:capitalize;background:0 0;border:0;border-radius:6px;justify-content:space-between;align-items:center;gap:6px;padding:6px 10px;font-size:12px;display:flex}.al0K6a_railBtn:hover{background:var(--dsw-alias-interactive-bg-hover)}.al0K6a_railBtn[data-active]{background:var(--dsw-specific-sidebar-nav-item-active);font-weight:600}.al0K6a_count{opacity:.55;font-size:10px}.al0K6a_grid{grid-template-columns:repeat(auto-fill,minmax(148px,1fr));align-content:start;gap:8px;padding:12px;display:grid;overflow-y:auto}.al0K6a_tile{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);cursor:pointer;color:inherit;text-align:left;border-radius:10px;flex-direction:column;align-items:flex-start;gap:4px;padding:10px 12px;display:flex}.al0K6a_tile:hover{border-color:var(--dsw-alias-border-l3);transform:translateY(-1px)}.al0K6a_tile[data-active]{border-color:var(--dsw-alias-state-business-primary);background:var(--dsw-specific-sidebar-nav-item-active)}.al0K6a_tileLabel{font-size:12.5px;font-weight:600}.al0K6a_tileGenre{text-transform:uppercase;letter-spacing:.06em;opacity:.55;font-size:9.5px}.al0K6a_tilePlugin{opacity:.4;font-family:ui-monospace,monospace;font-size:9px}.al0K6a_panel{border-left:1px solid var(--dsw-alias-border-l1);flex-direction:column;gap:10px;padding:14px;display:flex;overflow-y:auto}.al0K6a_panelHead{flex-wrap:wrap;align-items:baseline;gap:8px;display:flex}.al0K6a_panelTitle{margin:0;font-size:13px;font-weight:650}.al0K6a_panelForm{opacity:.5;font-size:9.5px}.al0K6a_modelLine{opacity:.75;margin:0;font-size:11px}.al0K6a_modelLine code{font-size:10.5px}.al0K6a_formSection{flex-direction:column;gap:6px;display:flex}.al0K6a_sectionTitle{text-transform:uppercase;letter-spacing:.08em;opacity:.5;margin:6px 0 2px;font-size:10px}.al0K6a_fieldRow{flex-direction:column;gap:3px;display:flex}.al0K6a_fieldLabel{align-items:center;gap:5px;font-size:11px;font-weight:550;display:flex}.al0K6a_fieldHint{border:1px solid var(--dsw-alias-border-l2);opacity:.6;cursor:help;border-radius:50%;justify-content:center;align-items:center;width:13px;height:13px;font-size:8.5px;display:inline-flex}.al0K6a_req{color:var(--dsw-alias-state-error-primary);margin-left:2px}.al0K6a_typeBadge{opacity:.45;text-transform:none;font-family:ui-monospace,monospace;font-size:8.5px}.al0K6a_input,.al0K6a_textarea{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);color:inherit;box-sizing:border-box;border-radius:7px;width:100%;padding:6px 8px;font-family:inherit;font-size:12px}.al0K6a_textarea{resize:vertical;min-height:44px}.al0K6a_input:focus,.al0K6a_textarea:focus{outline:1px solid var(--dsw-alias-state-business-primary);border-color:#0000}.al0K6a_guide{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:8px;font-size:11px}.al0K6a_guide summary{cursor:pointer;opacity:.7}.al0K6a_guideBody{white-space:pre-wrap;opacity:.8;max-height:180px;margin:6px 0 0;font-size:10.5px;overflow-y:auto}.al0K6a_runBtn{background:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-label-primary-inverted);cursor:pointer;border:0;border-radius:8px;margin-top:8px;padding:9px 14px;font-size:12.5px;font-weight:650}.al0K6a_runBtn:disabled{opacity:.45;cursor:not-allowed}.al0K6a_runs{border-top:1px solid var(--dsw-alias-border-l1);max-height:34vh;padding:10px 14px;overflow-y:auto}.al0K6a_runsTitle{text-transform:uppercase;letter-spacing:.08em;opacity:.5;margin:0 0 8px;font-size:10px}.al0K6a_runsRow{grid-template-columns:repeat(auto-fill,minmax(228px,1fr));gap:8px;display:grid}.al0K6a_runCard{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:10px;flex-direction:column;gap:6px;padding:9px 11px;display:flex}.al0K6a_runCard[data-status=completed]{border-color:var(--dsw-alias-state-success-primary)}.al0K6a_runCard[data-status=failed],.al0K6a_runCard[data-status=error]{border-color:var(--dsw-alias-state-error-primary)}.al0K6a_runHead{align-items:center;gap:8px;display:flex}.al0K6a_runId{opacity:.65;text-overflow:ellipsis;white-space:nowrap;font-family:ui-monospace,monospace;font-size:10px;overflow:hidden}.al0K6a_statusPill{text-transform:uppercase;letter-spacing:.05em;background:var(--dsw-alias-interactive-bg-hover);border-radius:999px;margin-left:auto;padding:2px 7px;font-size:9.5px}.al0K6a_statusPill[data-st=completed]{color:var(--dsw-alias-state-success-primary)}.al0K6a_statusPill[data-st=failed],.al0K6a_statusPill[data-st=error],.al0K6a_statusPill[data-st=interrupted],.al0K6a_statusPill[data-st=stopped]{color:var(--dsw-alias-state-error-primary)}.al0K6a_runClose{color:inherit;opacity:.5;cursor:pointer;background:0 0;border:0;font-size:13px}.al0K6a_runClose:hover{opacity:1}.al0K6a_runGrid{grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:4px;display:grid}.al0K6a_runGrid img{border-radius:6px;width:100%;display:block}.al0K6a_runPending{opacity:.6;margin:0;font-size:11px}.al0K6a_runOk{color:var(--dsw-alias-state-success-primary);margin:0;font-size:11px}.al0K6a_runError{white-space:pre-wrap;word-break:break-word;max-height:120px;color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 7%, transparent);border-radius:6px;margin:0;padding:6px 8px;font-size:10px;overflow-y:auto}.al0K6a_pending{opacity:.6;padding:12px;font-size:12px}.al0K6a_guideTitle{font:var(--ds-font-body-xs,12px/1.5 sans-serif);margin:0 0 4px;font-weight:600}.al0K6a_guideSection{font:var(--ds-font-body-xs,12px/1.5 sans-serif);margin:0 0 4px}.al0K6a_guideList{opacity:.75}.al0K6a_errBlock{padding:14px;font-size:12px}.al0K6a_errBlock pre{white-space:pre-wrap;opacity:.75;max-height:200px;font-size:10.5px;overflow-y:auto}.al0K6a_entry{width:100%;color:inherit;cursor:pointer;background:0 0;border:0;border-radius:6px;align-items:center;gap:8px;padding:7px 10px;font-size:12px;display:flex}.al0K6a_entry:hover{background:var(--dsw-alias-interactive-bg-hover)}.al0K6a_entry[data-active]{background:var(--dsw-specific-sidebar-nav-item-active)}.al0K6a_entryIcon{opacity:.8;display:inline-flex}.al0K6a_entryLabel{text-overflow:ellipsis;font-size:11.5px;overflow:hidden}[data-dsh-frame][data-sidebar-collapsed] .al0K6a_entry{justify-content:center;padding:0}[data-dsh-frame][data-sidebar-collapsed] .al0K6a_entryLabel{display:none}.al0K6a_assetsFrame{background:0 0;border:0;width:100%;height:100%;display:block}";
		const tagId = "@melite-plugin/dsh-card-deck/deck.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite-plugin/dsh-card-deck";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var deck_module_css_default = {
			"assetsFrame": "al0K6a_assetsFrame",
			"body": "al0K6a_body",
			"canvas": "al0K6a_canvas",
			"canvasFrame": "al0K6a_canvasFrame",
			"canvasIframe": "al0K6a_canvasIframe",
			"closeBtn": "al0K6a_closeBtn",
			"count": "al0K6a_count",
			"dkfade": "al0K6a_dkfade",
			"entry": "al0K6a_entry",
			"entryIcon": "al0K6a_entryIcon",
			"entryLabel": "al0K6a_entryLabel",
			"errBlock": "al0K6a_errBlock",
			"fieldHint": "al0K6a_fieldHint",
			"fieldLabel": "al0K6a_fieldLabel",
			"fieldRow": "al0K6a_fieldRow",
			"formSection": "al0K6a_formSection",
			"frame": "al0K6a_frame",
			"grid": "al0K6a_grid",
			"guide": "al0K6a_guide",
			"guideBody": "al0K6a_guideBody",
			"guideList": "al0K6a_guideList",
			"guideSection": "al0K6a_guideSection",
			"guideTitle": "al0K6a_guideTitle",
			"head": "al0K6a_head",
			"input": "al0K6a_input",
			"modelLine": "al0K6a_modelLine",
			"overlay": "al0K6a_overlay",
			"panel": "al0K6a_panel",
			"panelForm": "al0K6a_panelForm",
			"panelHead": "al0K6a_panelHead",
			"panelTitle": "al0K6a_panelTitle",
			"pending": "al0K6a_pending",
			"rail": "al0K6a_rail",
			"railBtn": "al0K6a_railBtn",
			"req": "al0K6a_req",
			"runBtn": "al0K6a_runBtn",
			"runCard": "al0K6a_runCard",
			"runClose": "al0K6a_runClose",
			"runError": "al0K6a_runError",
			"runGrid": "al0K6a_runGrid",
			"runHead": "al0K6a_runHead",
			"runId": "al0K6a_runId",
			"runOk": "al0K6a_runOk",
			"runPending": "al0K6a_runPending",
			"runs": "al0K6a_runs",
			"runsRow": "al0K6a_runsRow",
			"runsTitle": "al0K6a_runsTitle",
			"sectionTitle": "al0K6a_sectionTitle",
			"statusPill": "al0K6a_statusPill",
			"subtitle": "al0K6a_subtitle",
			"tabEmpty": "al0K6a_tabEmpty",
			"tabMain": "al0K6a_tabMain",
			"tabRail": "al0K6a_tabRail",
			"tabRuns": "al0K6a_tabRuns",
			"textarea": "al0K6a_textarea",
			"tile": "al0K6a_tile",
			"tileGenre": "al0K6a_tileGenre",
			"tileLabel": "al0K6a_tileLabel",
			"tilePlugin": "al0K6a_tilePlugin",
			"title": "al0K6a_title",
			"typeBadge": "al0K6a_typeBadge"
		};
		//#endregion
		//#region src/client/embed-bridge.ts
		/**
		* embed-bridge -- the DSH<->canvas integration (ALL of it lives here, the
		* editor is untouched; 3rd-party seams carry the weight):
		*
		* (a) THEME -- DSH's ui-theme presenter projects --dsw-alias-* tokens as
		*     inline vars on the DSH <body>. The bridge copies them onto the
		*     canvas iframe's <html> custom properties (the editor's tailwind
		*     @theme-inline utilities all resolve through them), so the canvas
		*     re-skins with Skin Center -- live, polled.
		* (b) RAIL  -- the canvas's own left ActivityBar and its Agent lane are
		*     hidden in embed; the DSH details column (the layout extension)
		*     hosts the canvas controls instead (DetailsPanel).
		* (c) LLM   -- the editor's Agent-settings lane is dead surface here
		*     (the assistant IS DSH); hiding it removes the second-LLM
		*     appearance. No /v1/llm call is ever issued from the embed.
		*/
		/** editor token <- DSW alias token (computed values, flipped by Skin Center) */
		const THEME_MAP = [
			["--background", "--dsw-alias-bg-base"],
			["--foreground", "--dsw-alias-label-primary"],
			["--card", "--dsw-alias-bg-layer-2"],
			["--card-foreground", "--dsw-alias-label-primary"],
			["--popover", "--dsw-alias-bg-layer-3"],
			["--popover-foreground", "--dsw-alias-label-primary"],
			["--secondary", "--dsw-alias-bg-module-platform"],
			["--secondary-foreground", "--dsw-alias-label-primary"],
			["--muted", "--dsw-alias-bg-module-platform"],
			["--muted-foreground", "--dsw-alias-label-secondary"],
			["--accent", "--dsw-alias-interactive-bg-hover-solid"],
			["--accent-foreground", "--dsw-alias-label-primary"],
			["--border", "--dsw-alias-border-l2"],
			["--input", "--dsw-alias-border-l3"],
			["--destructive", "--dsw-alias-state-error-primary"],
			["--sidebar", "--dsw-specific-sidebar-fill"],
			["--sidebar-border", "--dsw-alias-border-l2"],
			["--brand", "--dsw-alias-state-business-primary"],
			["--brand-foreground", "--dsw-alias-label-primary-inverted"],
			["--primary", "--dsw-alias-state-business-primary"],
			["--primary-foreground", "--dsw-alias-label-primary-inverted"],
			["--ring", "--dsw-alias-state-business-primary"],
			["--sidebar-primary", "--dsw-alias-state-business-primary"],
			["--sidebar-primary-foreground", "--dsw-alias-label-primary-inverted"],
			["--sidebar-ring", "--dsw-alias-state-business-primary"],
			["--sidebar-accent", "--dsw-alias-interactive-bg-hover-solid"],
			["--sidebar-accent-foreground", "--dsw-alias-label-primary"],
			["--sidebar-foreground", "--dsw-alias-label-primary"],
			["--chart-1", "--dsw-alias-state-business-primary"],
			["--chart-2", "--dsw-alias-state-success-primary"],
			["--chart-3", "--dsw-alias-state-warn-primary"],
			["--chart-4", "--dsw-alias-state-business-primary"],
			["--chart-5", "--dsw-alias-state-error-primary"]
		];
		/** editor button labels whose lanes are DEAD in the DSH embed */
		const HIDDEN_LANES = ["Agent settings"];
		/** The tailwind default palette is a SECOND manual color source
		*  (bg-emerald-500 etc. resolve var(--color-emerald-500)). Under DSH it
		*  does not exist: every chromatic hue is re-pointed at a live alias,
		*  so no palette class can render outside the DSH theme. */
		const PALETTE_HUES = {
			emerald: "--dsw-alias-state-success-primary",
			green: "--dsw-alias-state-success-primary",
			lime: "--dsw-alias-state-success-primary",
			teal: "--dsw-alias-state-business-primary",
			cyan: "--dsw-alias-state-business-primary",
			sky: "--dsw-alias-state-business-primary",
			blue: "--dsw-alias-state-business-primary",
			indigo: "--dsw-alias-state-business-primary",
			violet: "--dsw-alias-state-business-primary",
			purple: "--dsw-alias-state-business-primary",
			fuchsia: "--dsw-alias-state-business-primary",
			pink: "--dsw-alias-state-business-primary",
			red: "--dsw-alias-state-error-primary",
			rose: "--dsw-alias-state-error-primary",
			orange: "--dsw-alias-state-warn-primary",
			amber: "--dsw-alias-state-warn-primary",
			yellow: "--dsw-alias-state-warn-primary"
		};
		const PALETTE_SHADES = [
			"50",
			"100",
			"200",
			"300",
			"400",
			"500",
			"600",
			"700",
			"800",
			"900",
			"950"
		];
		/** Start the bridge for one iframe. Idempotent per frame; poll follows
		*  Skin Center changes and canvas re-mounts until stopped. */
		function startEmbedBridge(frame) {
			let stopped = false;
			const tick = () => {
				if (stopped) return;
				const doc = frame.contentDocument;
				if (!doc || !doc.documentElement) return;
				closeRightPanelTabs();
				const parentStyle = window.getComputedStyle(document.body);
				const root = doc.documentElement;
				for (const pair of THEME_MAP) {
					const value = parentStyle.getPropertyValue(pair[1]).trim();
					if (value !== "") root.style.setProperty(pair[0], value);
				}
				for (const hue of Object.keys(PALETTE_HUES)) {
					const value = parentStyle.getPropertyValue(PALETTE_HUES[hue]).trim();
					if (value === "") continue;
					for (const shade of PALETTE_SHADES) root.style.setProperty("--color-" + hue + "-" + shade, value);
				}
				const dshDark = document.body.hasAttribute("data-ds-dark-theme");
				root.classList.toggle("dark", dshDark);
				root.style.setProperty("color-scheme", dshDark ? "dark" : "light");
				if (!doc.getElementById("dsw-bridge-style")) {
					const style = doc.createElement("style");
					style.id = "dsw-bridge-style";
					style.textContent = "*,*::before,*::after{text-shadow:none!important}";
					(doc.head ?? doc.documentElement).appendChild(style);
				}
				const buttonLabel = (btn) => (btn.getAttribute("aria-label") ?? btn.getAttribute("title") ?? btn.textContent ?? "").trim();
				for (const btn of Array.from(doc.querySelectorAll("button"))) {
					const label = buttonLabel(btn);
					if (HIDDEN_LANES.some((lane) => label.includes(lane))) btn.style.display = "none";
					if (label === "Library") {
						let col = btn.closest("div");
						while (col && col !== doc.body) {
							const cls = (col.className ?? "").toString();
							if (cls.includes("w-12") && cls.includes("flex-col")) {
								col.style.display = "none";
								break;
							}
							col = col.parentElement;
						}
					}
				}
				for (const el of Array.from(doc.querySelectorAll("[aria-label]"))) {
					const a = el.getAttribute("aria-label") ?? "";
					if (HIDDEN_LANES.some((lane) => a === lane)) el.style.display = "none";
				}
			};
			/** Close the canvas's right-panel default tabs -- the strip is the
			*  frame-within-frame right sidebar; closing the last tab closes the
			*  rail itself (RightPanelHost contract). Latched: once the strip is
			*  down, panes the user reopens are never re-closed. JS clicks work
			*  on hidden elements, so order vs. lane-hiding is irrelevant. */
			let rightPanelClosed = false;
			const closeRightPanelTabs = () => {
				if (rightPanelClosed) return;
				const doc2 = frame.contentDocument;
				if (!doc2) return;
				const strip = doc2.querySelector("[aria-label=\"Right sidebar panes\"]");
				if (!strip || strip.childElementCount === 0) return;
				for (const closeBtn of Array.from(doc2.querySelectorAll("button[aria-label]"))) {
					const a = closeBtn.getAttribute("aria-label") ?? "";
					if (a.startsWith("Close ") && a.endsWith(" tab")) closeBtn.click();
				}
				rightPanelClosed = true;
			};
			tick();
			const timer = window.setInterval(tick, 1200);
			frame.addEventListener("load", () => {
				tick();
				closeRightPanelTabs();
			});
			return { stop() {
				stopped = true;
				window.clearInterval(timer);
				frame.removeEventListener("load", tick);
			} };
		}
		//#endregion
		//#region ../melite-card-view/src/client/zoomPromotion.ts
		const ZOOM_OVERLAY_SELECTOR = "[data-card-zoom-overlay]";
		const PREVIEW_DIALOG_SELECTOR = "[data-asset-preview-dialog]";
		const CLOSING_ATTR = "data-card-closing";
		const ROOT_CLOSING_SELECTOR = "[" + CLOSING_ATTR + "]";
		const GLIDE_MS = 300;
		const GLIDE_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
		const DEFAULT_SELECTORS = [ZOOM_OVERLAY_SELECTOR];
		const Z_INDEX = "2147483000";
		const BG = "var(--dsw-alias-bg-base, #17171c)";
		const FULLSCREEN_CLASS = "melite-zoom-fullscreen";
		const CLEARABLE = [
			"position",
			"inset",
			"width",
			"height",
			"zIndex",
			"background"
		];
		function createZoomPromotion(frame, deps) {
			let zoomOpen = false;
			let stopped = false;
			let timer;
			let observer = null;
			let restBox = null;
			let glide = null;
			const selectors = deps.overlaySelectors ?? DEFAULT_SELECTORS;
			const fitEnabled = deps.fitHeight ?? true;
			const slabBackground = deps.background ?? BG;
			const docOf = () => frame.contentDocument;
			const overlayRoots = () => {
				const doc = docOf();
				if (doc === null) return [];
				const out = [];
				for (const sel of selectors) try {
					const all = doc.querySelectorAll;
					if (typeof all === "function") all.call(doc, sel).forEach((el) => out.push(el));
					else {
						const one = doc.querySelector(sel);
						if (one != null) out.push(one);
					}
				} catch {}
				return out;
			};
			const overlayOpen = () => overlayRoots().length > 0;
			const closeGlideWanted = () => {
				if (docOf() === null) return false;
				const roots = overlayRoots();
				if (roots.length === 0) return false;
				return roots.every((root) => {
					try {
						return root.querySelector(ROOT_CLOSING_SELECTOR) != null;
					} catch {
						return false;
					}
				});
			};
			const gridNode = () => {
				const doc = docOf();
				if (doc === null) return null;
				try {
					return doc.querySelector("[data-grid-pin]") ?? null;
				} catch {
					return null;
				}
			};
			const pinGrid = () => {
				if (restBox === null) return;
				const grid = gridNode();
				if (grid === null) return;
				try {
					grid.style.maxWidth = restBox.width + "px";
				} catch {}
			};
			const unpinGrid = () => {
				const grid = gridNode();
				if (grid === null) return;
				try {
					grid.style.maxWidth = "";
				} catch {}
			};
			const fit = () => {
				if (stopped || !fitEnabled) return;
				const doc = docOf();
				if (doc === null || doc.documentElement === null) return;
				const h = Math.max(doc.documentElement.scrollHeight ?? 0, doc.body?.scrollHeight ?? 0);
				if (h > 0 && frame.style.position !== "fixed") frame.style.height = h + "px";
			};
			const cancelGlide = () => {
				if (glide === null) return;
				try {
					glide.cancel();
				} catch {}
				glide = null;
			};
			const applyZoom = (open) => {
				if (stopped || open === zoomOpen) return false;
				zoomOpen = open;
				if (open) {
					try {
						const r = frame.getBoundingClientRect?.();
						restBox = r ? {
							left: r.left,
							top: r.top,
							width: r.width,
							height: r.height
						} : null;
					} catch {
						restBox = null;
					}
					frame.classList.add(FULLSCREEN_CLASS);
					frame.style.position = "fixed";
					frame.style.inset = "0";
					frame.style.width = "100vw";
					frame.style.height = "100vh";
					frame.style.zIndex = Z_INDEX;
					frame.style.background = slabBackground;
					pinGrid();
				} else {
					cancelGlide();
					frame.classList.remove(FULLSCREEN_CLASS);
					for (const k of CLEARABLE) frame.style[k] = "";
					frame.style.transform = "";
					frame.style.clipPath = "";
					unpinGrid();
					fit();
				}
				return true;
			};
			const maybeGlide = () => {
				if (stopped || glide !== null || frame.animate === void 0) return;
				if (!closeGlideWanted()) return;
				let from = null;
				try {
					const r = frame.getBoundingClientRect?.();
					from = r ? {
						left: r.left,
						top: r.top,
						width: r.width,
						height: r.height
					} : null;
				} catch {
					from = null;
				}
				const to = restBox;
				if (from === null || to === null) return;
				const dx = to.left - from.left;
				const dy = to.top - from.top;
				const dw = from.width - to.width;
				const dh = from.height - to.height;
				if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(dw) < 1 && Math.abs(dh) < 1) return;
				const endClip = "inset(0px " + Math.max(0, dw) + "px " + Math.max(0, dh) + "px 0px)";
				try {
					glide = frame.animate([{
						transform: "translate(0px, 0px)",
						clipPath: "inset(0px 0px 0px 0px)"
					}, {
						transform: "translate(" + dx + "px, " + dy + "px)",
						clipPath: endClip
					}], {
						duration: GLIDE_MS,
						easing: GLIDE_EASE,
						fill: "forwards"
					});
				} catch {
					glide = null;
				}
			};
			const syncZoom = () => {
				if (stopped) return;
				const open = overlayOpen();
				if (applyZoom(open)) return;
				if (open) maybeGlide();
			};
			const tick = () => {
				if (stopped) return;
				syncZoom();
				if (zoomOpen) return;
				fit();
			};
			const arm = () => {
				if (stopped) return;
				const doc = docOf();
				if (doc === null) return;
				applyZoom(false);
				deps.onDocReady?.(doc);
				if (timer === void 0) timer = deps.setInterval(tick, deps.intervalMs);
				observer?.disconnect();
				observer = new deps.MutationObserverCtor(() => {
					if (stopped) return;
					syncZoom();
				});
				observer.observe(doc, {
					childList: true,
					subtree: true,
					attributes: true,
					attributeFilter: [CLOSING_ATTR]
				});
				tick();
			};
			return {
				attach() {
					frame.addEventListener("load", arm);
					if (frame.contentDocument?.readyState === "complete") arm();
				},
				detach() {
					stopped = true;
					frame.removeEventListener("load", arm);
					if (timer !== void 0) deps.clearInterval(timer);
					timer = void 0;
					observer?.disconnect();
					observer = null;
					cancelGlide();
					frame.classList.remove(FULLSCREEN_CLASS);
					for (const k of CLEARABLE) frame.style[k] = "";
					frame.style.transform = "";
					frame.style.clipPath = "";
					unpinGrid();
				},
				sync: syncZoom,
				tick,
				load: arm,
				isZoomOpen: () => zoomOpen
			};
		}
		//#endregion
		//#region src/client/DeckCanvas.tsx
		/**
		* DeckCanvas -- the Cards TAB body: the REAL card-authoring canvas
		* (web/editor surfaces/library+pipeline), served at /editor/ by the host
		* half and mounted here. The embed-bridge re-skins it with DSH theme
		* tokens and strips its own chrome -- the canvas rides DSH's sidebar and
		* details column, it does not bring its own frame.
		*/
		/** CARD REPLAY (2026-08-30, additive): a surface may ask the studio to
		* open with ONE draft loaded — the editor's own /editor/?meliteCards=<id>
		* mode (it fetches the draft and hydrateDraft()s the card with every
		* parameter filled). Parked here BEFORE mount by deck-sidebar-entry's
		* __meliteDeckOpenWithDraft door; consumed once by the canvas below.
		* (Ported 2026-09-02 from the ray twin — the fix landed there and this
		* repo's media-plugin wand was calling a door that never existed here;
		* caught by tests/test_plugin_freshness.py F3.) */
		let pendingDraftId = "";
		function setPendingDraft(draftId) {
			pendingDraftId = draftId;
		}
		/** Live-open event while the canvas is already mounted. */
		const OPEN_DRAFT_EVENT = "melite-cards-deck-open-draft";
		function DeckCanvas() {
			const frameRef = (0, react.useRef)(null);
			const nonce = (0, react.useRef)(0);
			const [open, setOpen] = (0, react.useState)(() => {
				const d = pendingDraftId;
				pendingDraftId = "";
				nonce.current += 1;
				return {
					id: d,
					n: nonce.current
				};
			});
			(0, react.useEffect)(() => {
				const onOpenDraft = (e) => {
					const d = e.detail?.draftId;
					if (typeof d === "string" && d !== "") {
						nonce.current += 1;
						setOpen({
							id: d,
							n: nonce.current
						});
					}
				};
				document.addEventListener(OPEN_DRAFT_EVENT, onOpenDraft);
				return () => {
					document.removeEventListener(OPEN_DRAFT_EVENT, onOpenDraft);
				};
			}, []);
			(0, react.useEffect)(() => {
				const frame = frameRef.current;
				if (!frame) return;
				let handle = null;
				const arm = () => {
					handle?.stop();
					handle = startEmbedBridge(frame);
				};
				arm();
				const promotion = createZoomPromotion(frame, {
					intervalMs: 500,
					setInterval: (fn, ms) => window.setInterval(fn, ms),
					clearInterval: (id) => window.clearInterval(id),
					MutationObserverCtor: window.MutationObserver,
					overlaySelectors: [ZOOM_OVERLAY_SELECTOR, PREVIEW_DIALOG_SELECTOR],
					fitHeight: false,
					background: "#000"
				});
				promotion.attach();
				return () => {
					promotion.detach();
					handle?.stop();
				};
			}, []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: deck_module_css_default.canvasFrame,
				"data-plugin": "ray-card-deck-canvas",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("iframe", {
					ref: frameRef,
					className: deck_module_css_default.canvasIframe,
					src: open.id === "" ? "/editor/" : "/editor/?meliteCards=" + encodeURIComponent(open.id) + "&_r=" + String(open.n),
					title: "Ray card canvas",
					allow: "clipboard-read; clipboard-write"
				})
			});
		}
		//#endregion
		//#region src/client/sidebar-entry-core.ts
		/** Find the sidebar shell root element, or undefined while not yet mounted. */
		function sidebarRoot() {
			const column = document.querySelector("[data-pane=\"sidebar\"], [class*=\"sidebarCol\"]");
			if (column === null) return void 0;
			return column.querySelector("[class*=\"logoRow\"]")?.parentElement ?? column.firstElementChild;
		}
		/** The New Session button: nested in the logo row on current shells, a direct child on legacy shells. */
		function newSessionButton(root) {
			const nested = root.querySelector("button[class*=\"newSession\"]");
			if (nested !== null) return nested;
			for (const child of root.children) if (child.tagName === "BUTTON") return child;
		}
		/** Build the entry row (a detached button; insert once the shell is up). */
		function createEntry(options) {
			const entry = document.createElement("button");
			entry.type = "button";
			entry.setAttribute(options.rowAttribute, "");
			if (options.plugin !== void 0) {
				entry.setAttribute("data-dsh-plugin", options.plugin);
				entry.setAttribute("data-dsh-part", "sidebar-entry");
			}
			entry.className = options.css["entry"] ?? "";
			entry.setAttribute("aria-label", options.label());
			if (options.tooltip !== void 0) entry.setAttribute("title", options.tooltip());
			entry.innerHTML = "<span class=\"" + (options.css["entryIcon"] ?? "") + "\">" + options.icon + "</span><span class=\"" + (options.css["entryLabel"] ?? "") + "\">" + options.label() + "</span>";
			entry.addEventListener("click", options.onToggle);
			return entry;
		}
		/** Re-insert the entry after the New Session row (before the browser region). */
		function placeEntry(root, entry, options) {
			const button = newSessionButton(root);
			if (button === void 0) return false;
			if (entry.parentElement !== root) {
				const row = button.closest("[class*=\"logoRow\"]");
				const base = row !== null && row.parentElement === root ? row : button;
				const family = Array.from(root.children).filter((el) => el instanceof HTMLElement && el.matches(options.familySelectors.join(", ")));
				const anchor = options.position === "before" ? family.length > 0 ? family[0] : base.nextElementSibling : family.length > 0 ? family[family.length - 1].nextElementSibling : base.nextElementSibling;
				root.insertBefore(entry, anchor);
			}
			return true;
		}
		/**
		* Mount the sidebar entry, waiting for the shell to render and self-healing
		* on later React re-renders.
		* @param options - the row's attribute/icon/copy/action/ordering configuration.
		* @returns disposer removing the entry and its observers.
		*/
		function mountSidebarEntry(options) {
			if (typeof document !== "undefined" && document.querySelector(options.rowSelector) !== null) return () => {};
			const entry = createEntry(options);
			let root;
			let placed = false;
			const tryPlace = () => {
				if (root !== void 0 && !root.isConnected) {
					rootObserver.disconnect();
					root = void 0;
					placed = false;
				}
				if (placed) {
					if (document.body.contains(entry)) return;
					rootObserver.disconnect();
					root = void 0;
					placed = false;
				}
				root ??= sidebarRoot();
				if (root === void 0) return;
				placed = placeEntry(root, entry, options);
				if (placed) rootObserver.observe(root, {
					childList: true,
					subtree: true
				});
			};
			const waitObserver = new MutationObserver(() => {
				tryPlace();
			});
			waitObserver.observe(document.body, {
				childList: true,
				subtree: true
			});
			const rootObserver = new MutationObserver(() => {
				if (root === void 0 || !root.isConnected) {
					placed = false;
					tryPlace();
					return;
				}
				if (!root.contains(entry)) placed = placeEntry(root, entry, options);
			});
			const unsubscribeActive = options.active === void 0 ? void 0 : (() => {
				const syncActive = () => {
					if (options.active.isOpen()) entry.dataset.active = "true";
					else delete entry.dataset.active;
				};
				const unsubscribe = options.active.subscribe(syncActive);
				syncActive();
				return unsubscribe;
			})();
			tryPlace();
			return () => {
				waitObserver.disconnect();
				rootObserver.disconnect();
				unsubscribeActive?.();
				entry.remove();
			};
		}
		//#endregion
		//#region src/client/deck-fullbleed.ts
		/** The deck's activation attribute on <html> (our namespace). */
		const ACTIVE_ATTR = "data-ray-deck-active";
		/** Family activation attributes — cleared when the deck opens. */
		const FAMILY_ACTIVE_ATTRS = ["data-dsh-taskboard-active", "data-dsh-ssh-active"];
		/** The family's cross-panel coordination event (verbatim protocol). */
		const PANEL_ACTIVATE_EVENT = "dsh-panel-activate";
		/** Our panel name on that event bus. */
		const PANEL_NAME = "ray-deck";
		/** The deck view node marker (host row of the canvas iframe). */
		const DECK_NODE_SEL = "[data-plugin=\"ray-card-deck-canvas\"]";
		/** The deck container the sidebar entry mounts in the column. */
		const CONTAINER_SEL$1 = "[data-ray-cards-deck-view]";
		/**
		* The bleed host attribute — THE scope of every hiding rule. Placed
		* only by claimCenterColumn()'s caller path below, only on the
		* verified center column, removed on rebind and on dispose.
		*/
		const COLUMN_HOST_ATTR = "data-ray-deck-column";
		/** The right-panel host — a column inside it is refused (RIGHT-PANEL LAW). */
		const RIGHT_PANEL_HOST_SEL = "[data-dsh-better-sidebar]";
		/**
		* The conversation PROOF seeds: the composer stack (the shell's own
		* family, every generation) or the chat input itself. A seed inside
		* the right-panel host is never used — the claim starts in the center.
		*/
		const COMPOSER_SEED_SEL = "[class*=\"composerStack\"], textarea, [contenteditable=\"true\"]";
		/**
		* The column match, checked against the seed's OWN ANCESTORS only
		* (never queried document-wide — a global hashed-class query was the
		* right-panel bleed vector). Both shell generations: the semantic
		* data-pane attribute and the centerCol layout class.
		*/
		const COLUMN_MATCH_SEL = "[data-pane=\"conversation\"], [class*=\"centerCol\"]";
		/**
		* The PROVEN center column — composer-seeded, ancestor-walked, host-
		* refused. The claim starts at the live conversation composer (never
		* inside the right-panel host) and walks UP that composer's own
		* ancestry to the first column-shaped element. The walk cannot cross
		* into the right panel (a separate subtree), the right-panel host
		* refusal is checked anyway (belt-and-braces), and no document-wide
		* hashed-class query ever runs. Returns null when no seed or no
		* column ancestor is found; the caller refuses, never falls back.
		*/
		function claimCenterColumn() {
			const seeds = document.querySelectorAll(COMPOSER_SEED_SEL);
			let seed = null;
			for (const el of seeds) if (el.closest(RIGHT_PANEL_HOST_SEL) === null) {
				seed = el;
				break;
			}
			if (seed === null) return null;
			let n = seed.parentElement;
			while (n !== null && n !== document.body) {
				if (n.matches(COLUMN_MATCH_SEL)) return n.closest(RIGHT_PANEL_HOST_SEL) !== null ? null : n;
				n = n.parentElement;
			}
			return null;
		}
		/** Structural takeover CSS. ZERO color literals — the theme law: the
		*  deck's own surfaces are themed by the editor canvas inside the
		*  iframe; this layer only positions and cedes. One rule per element,
		*  every hiding rule scoped under [data-ray-deck-column] (RIGHT-PANEL
		*  LAW #2 — pinned by the hygiene wall: a rule that hides must carry
		*  COLUMN_HOST_ATTR or it does not ship). */
		const OVERLAY_CSS = [
			`[${COLUMN_HOST_ATTR}] { position: relative; }`,
			`html[${ACTIVE_ATTR}]:not([data-dsh-taskboard-active]):not([data-dsh-ssh-active]) [${COLUMN_HOST_ATTR}] > :not(${CONTAINER_SEL$1}) { display: none !important; }`,
			`html[${ACTIVE_ATTR}]:not([data-dsh-taskboard-active]):not([data-dsh-ssh-active]) [${COLUMN_HOST_ATTR}] [class*="composerStack"] { display: none !important; }`,
			`html[${ACTIVE_ATTR}]:not([data-dsh-taskboard-active]):not([data-dsh-ssh-active]) ${RIGHT_PANEL_HOST_SEL} { position: relative; z-index: 70; }`
		].join("\n");
		/** Is the deck view currently the column's resident (exists + visible)? */
		function deckOwnsColumn() {
			const col = claimCenterColumn();
			if (col === null) return false;
			const deck = col.querySelector(DECK_NODE_SEL);
			if (deck === null) return false;
			const r = deck.getBoundingClientRect();
			return r.width > 40 && r.height > 40;
		}
		/** Apply the activation state: attribute + family coordination. */
		function setActive(on) {
			const el = document.documentElement;
			if (on === el.hasAttribute(ACTIVE_ATTR)) return;
			if (on) {
				for (const a of FAMILY_ACTIVE_ATTRS) el.removeAttribute(a);
				el.setAttribute(ACTIVE_ATTR, "");
				document.dispatchEvent(new CustomEvent(PANEL_ACTIVATE_EVENT, { detail: PANEL_NAME }));
			} else el.removeAttribute(ACTIVE_ATTR);
		}
		/** Mount the full-bleed layer: style + observers + event bus seat.
		*  @returns disposer removing everything this call installed. */
		function mountDeckFullbleed() {
			if (typeof document === "undefined") return () => {};
			const styleId = "ray-card-deck-fullbleed";
			if (!document.querySelector("style#" + styleId)) {
				const tag = document.createElement("style");
				tag.id = styleId;
				tag.textContent = OVERLAY_CSS;
				document.head.appendChild(tag);
			}
			let disposed = false;
			let settleTimer = null;
			/** The element currently carrying COLUMN_HOST_ATTR (ours alone). */
			let attributed = null;
			/** The element the column observer is bound to. */
			let observed = null;
			const columnObserver = new MutationObserver(() => {
				settle();
			});
			/** Re-bind the column observer to the verified column, if it changed. */
			function bindColumn() {
				const col = claimCenterColumn();
				if (col === observed) return;
				columnObserver.disconnect();
				observed = col;
				if (col !== null) columnObserver.observe(col, {
					childList: true,
					subtree: false,
					attributes: true,
					attributeFilter: [
						"style",
						"class",
						"hidden"
					]
				});
			}
			/** Sync the bleed host attribute: on the verified column, nowhere else. */
			function syncHostAttr() {
				const col = claimCenterColumn();
				if (attributed !== null && attributed !== col) attributed.removeAttribute(COLUMN_HOST_ATTR);
				attributed = col;
				if (col !== null) col.setAttribute(COLUMN_HOST_ATTR, "");
			}
			/** Debounced re-read of the DOM truth -> attribute. */
			const settle = () => {
				if (disposed) return;
				if (settleTimer) clearTimeout(settleTimer);
				settleTimer = setTimeout(() => {
					if (disposed) return;
					bindColumn();
					syncHostAttr();
					setActive(deckOwnsColumn());
				}, 80);
			};
			const bodyObserver = new MutationObserver(settle);
			bodyObserver.observe(document.body, {
				childList: true,
				subtree: true
			});
			const htmlObserver = new MutationObserver(settle);
			htmlObserver.observe(document.documentElement, {
				attributes: true,
				attributeFilter: [...FAMILY_ACTIVE_ATTRS, ACTIVE_ATTR]
			});
			const onPanelActivate = (e) => {
				if (e.detail !== PANEL_NAME) setActive(false);
			};
			document.addEventListener(PANEL_ACTIVATE_EVENT, onPanelActivate);
			window.addEventListener("resize", settle);
			settle();
			return () => {
				disposed = true;
				if (settleTimer) clearTimeout(settleTimer);
				bodyObserver.disconnect();
				columnObserver.disconnect();
				htmlObserver.disconnect();
				document.removeEventListener(PANEL_ACTIVATE_EVENT, onPanelActivate);
				window.removeEventListener("resize", settle);
				attributed?.removeAttribute(COLUMN_HOST_ATTR);
				attributed = null;
				setActive(false);
			};
		}
		//#endregion
		//#region src/client/deck-sidebar-entry.tsx
		/**
		* The Cards sidebar entry — the family pattern (Task Board / SSH): ONE row
		* in the left sidebar under New Session, ordered with the extension
		* family's rows. Toggling mounts a taskboard-style container (absolute
		* inset 0, z-60) as a direct child of the CENTER column — claimed via
		* deck-fullbleed's claimCenterColumn(), the PROVEN semantic anchor — and
		* renders DeckCanvas (the /editor card studio iframe) into it via its own
		* React root. deck-fullbleed observes the deck node's presence in the
		* verified column and applies the takeover.
		*
		* Restored 2026-09-05 (operator order: "clicking the button would …
		* change the middle panel to a pure action card flow view") after the
		* 2026-09-04 retirement (d157b6c) — with the RIGHT-PANEL LAW welded in:
		* the column claim is semantic ([data-pane="conversation"]), never the
		* retired hashed-class guess, and a claim that comes back null REFUSES
		* to mount (logged) instead of guessing. The bleed cannot reach the
		* right panel — see deck-fullbleed.ts.
		*
		* CARD REPLAY DOOR (2026-08-30, additive): other bundles (the media
		* panel's wand) open THE STUDIO with one draft loaded — the editor's
		* ?meliteCards=<id> hydration. Kept verbatim through the restore; the
		* media-plugin still calls it (4 sites).
		*/
		/** The mounted deck container (taskboard-style overlay child of the column). */
		const CONTAINER_SEL = "[data-ray-cards-deck-view]";
		/** Deck open-state events (the active-bridge the entry core subscribes to). */
		const OPEN_EVENT = "ray-cards-deck-open-changed";
		/** Family row selectors this entry orders against (task-board + ssh). */
		const FAMILY_SELECTORS = [
			"[data-dsh-taskboard-entry]",
			"[data-dsh-ssh-entry]",
			"[data-ray-cards-entry]"
		];
		/** Cards icon — two stacked cards, the shell's 16px nav-icon look. */
		const ICON = "<svg width=\"16\" height=\"16\" viewBox=\"0 0 16 16\" fill=\"none\" aria-hidden=\"true\"><rect x=\"5.5\" y=\"2.5\" width=\"8\" height=\"8\" rx=\"1.5\" stroke=\"currentColor\" stroke-width=\"1.3\"/><rect x=\"2.5\" y=\"5.5\" width=\"8\" height=\"8\" rx=\"1.5\" stroke=\"currentColor\" stroke-width=\"1.3\" fill=\"var(--dsw-alias-bg-base, #17171c)\"/></svg>";
		function isOpen() {
			return document.querySelector(CONTAINER_SEL) !== null;
		}
		/** Mount the deck container into the VERIFIED center column (idempotent).
		*  A null claim refuses — logged, never a fallback guess (RIGHT-PANEL LAW). */
		function openDeck() {
			if (isOpen()) return;
			const column = claimCenterColumn();
			if (column === null) {
				console.warn("[ray-card-deck] no verified center column — deck not mounted (refusing to guess)");
				return;
			}
			const container = document.createElement("div");
			container.setAttribute(CONTAINER_SEL.slice(1, -1), "");
			container.style.position = "absolute";
			container.style.inset = "0";
			container.style.zIndex = "60";
			container.style.display = "flex";
			container.style.flexDirection = "column";
			container.style.background = "var(--dsw-alias-bg-base, #17171c)";
			column.appendChild(container);
			(0, react_dom_client.createRoot)(container).render(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DeckCanvas, {}));
			container.dataset.root = "1";
			document.dispatchEvent(new CustomEvent(OPEN_EVENT));
		}
		/** Unmount and remove the deck container. */
		function closeDeck() {
			const container = document.querySelector(CONTAINER_SEL);
			if (container === null) return;
			container.remove();
			document.dispatchEvent(new CustomEvent(OPEN_EVENT));
		}
		/**
		* Mount the Cards sidebar entry (left sidebar, family block).
		* @returns disposer removing the row.
		*/
		function mountCardsSidebarEntry() {
			const dispose = mountSidebarEntry({
				rowAttribute: "data-ray-cards-entry",
				rowSelector: "[data-ray-cards-entry]",
				plugin: "ray-card-deck",
				icon: ICON,
				css: {
					entry: deck_module_css_default["entry"] ?? "",
					entryIcon: deck_module_css_default["entryIcon"] ?? "",
					entryLabel: deck_module_css_default["entryLabel"] ?? ""
				},
				label: () => "Cards",
				tooltip: () => "Ray card deck",
				onToggle: () => {
					isOpen() ? closeDeck() : openDeck();
				},
				position: "before",
				familySelectors: FAMILY_SELECTORS,
				active: {
					subscribe: (listener) => {
						document.addEventListener(OPEN_EVENT, listener);
						return () => {
							document.removeEventListener(OPEN_EVENT, listener);
						};
					},
					isOpen
				}
			});
			window.__meliteDeckOpenWithDraft = (draftId) => {
				if (typeof draftId !== "string" || draftId === "") return false;
				if (isOpen()) document.dispatchEvent(new CustomEvent(OPEN_DRAFT_EVENT, { detail: { draftId } }));
				else {
					setPendingDraft(draftId);
					openDeck();
				}
				return true;
			};
			return () => {
				delete window.__meliteDeckOpenWithDraft;
				dispose();
			};
		}
		//#endregion
		//#region src/client/index.ts
		/** 'betterSidebar': the public right-sidebar registry (dsh-better-sidebar,
		* mounted by the web profile's web-ui-all aggregate) — hosts the tabs. */
		const inject = ["slots", "betterSidebar"];
		function apply(ctx) {
			if (!claimDeckApply()) return;
			ctx.effect(() => releaseDeckApply, "ray-card-deck: apply claim");
			try {
				ctx.effect(() => mountCardsSidebarEntry(), "ray-card-deck: sidebar entry");
			} catch (error) {
				console.error("[ray-card-deck] sidebar entry mount failed:", error);
			}
			try {
				ctx.effect(() => mountDeckFullbleed(), "ray-card-deck: full-bleed");
			} catch (error) {
				console.error("[ray-card-deck] full-bleed mount failed:", error);
			}
			try {
				registerRayAssetsTab(ctx);
			} catch (error) {
				console.error("[ray-card-deck] assets tab registration failed:", error);
			}
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
