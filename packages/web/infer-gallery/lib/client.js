window.__ModuleLoader__.load({
	id: "@melite-plugin/dsh-gallery",
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
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/apply-guard.ts
		/**
		* Apply guard: a duplicated client injection (module factory executed twice in
		* one page lifetime) would otherwise register a second sidebar entry and
		* overlay. First application wins; later calls become no-ops. The claim is
		* released when the owning fiber unloads, so a rebuilt bundle can claim again.
		*/
		let claimed = false;
		function claimGalleryApply() {
			if (claimed) return false;
			claimed = true;
			return true;
		}
		function releaseGalleryApply() {
			claimed = false;
		}
		//#endregion
		//#region \0dsh-css:infer-gallery/src/client/overlay.module.css.mjs
		const css = "._2saHFG_lightbox{width:min(1200px,96vw);max-width:96vw}._2saHFG_wand{z-index:3;background:var(--dsw-alias-fill-subtle,#020617d1);color:var(--dsw-alias-state-warn-primary,#fde68a);letter-spacing:.4px;cursor:pointer;opacity:1;border-radius:6px;align-items:center;gap:4px;padding:4px 6px;font-family:inherit;font-size:9px;font-weight:700;display:flex;position:absolute;top:6px;right:6px}";
		const tagId = "@melite-plugin/dsh-gallery/overlay.module.css@d29a3d30";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite-plugin/dsh-gallery";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var overlay_module_css_default = {
			"lightbox": "_2saHFG_lightbox",
			"wand": "_2saHFG_wand"
		};
		//#endregion
		//#region src/client/ui.tokens.ts
		/**
		* Design tokens — every var(--dsw-alias-…) string in the media family
		* declared ONCE (audit F6). Numbered suffixes = same alias, different
		* fallback (opacity variants). Pinned by the parity wall
		* (tests/walls/ts/suites/media-sidebar.test.ts — tokens single site).
		*/
		const bgBase1 = "var(--dsw-alias-bg-base, #000)";
		const bgBase2 = "var(--dsw-alias-bg-base, #0b0e14)";
		const bgBase3 = "var(--dsw-alias-bg-base, #422006)";
		const bgLayer1 = "var(--dsw-alias-bg-layer-1, #1e293b)";
		const bgLayer2 = "var(--dsw-alias-bg-layer-2, #0f172a)";
		const bgOverlay1 = "var(--dsw-alias-bg-overlay, rgba(127,29,29,0.35))";
		const borderL2 = "var(--dsw-alias-border-l2, rgba(148,163,184,0.25))";
		/** Caption-scrim weight of the same fill token (the full port's
		*  single-site fix: the old package restated this raw spelling inline
		*  in ui.tsx — one token, one site, three weights). */
		const fillSubtleCaption = "var(--dsw-alias-fill-subtle, rgba(2,6,23,0.92))";
		const labelPrimary1 = "var(--dsw-alias-label-primary, rgb(226,232,240))";
		const labelPrimary2 = "var(--dsw-alias-label-primary, rgba(226,232,240,0.85))";
		const labelSecondary2 = "var(--dsw-alias-label-secondary, rgba(148,163,184,0.9))";
		const stateBusinessPrimary = "var(--dsw-alias-state-business-primary, rgb(147,197,253))";
		const stateBusinessPrimaryBg2 = "var(--dsw-alias-state-business-primary-bg, rgba(59,130,246,0.28))";
		const stateWarnPrimary1 = "var(--dsw-alias-state-warn-primary, rgba(250,204,21,0.9))";
		const stateWarnPrimary2 = "var(--dsw-alias-state-warn-primary, rgba(250,204,21,0.92))";
		const textTertiary2 = "var(--dsw-alias-text-tertiary, rgba(148,163,184,0.75))";
		const textTertiary3 = "var(--dsw-alias-text-tertiary, rgba(148,163,184,0.8))";
		//#endregion
		//#region src/drilldown.tsx
		/**
		* drilldown.tsx — THE MEDIA DRILLDOWN, one component for every surface
		* (the operator's hour-24 order: "clicking the preview component should
		* mirror the media drilldown view 1:1"). Extracted VERBATIM from the
		* gallery's MediaPanel Overlay — the gallery's media tiles and the
		* cards' stage previews ride the SAME face: DSH's Modal (headless —
		* body portal, mask, Escape, aria-modal and focus handling are the
		* primitive's, never ours), the kind-switched full-size artifact, the
		* caption, the esc hint.
		*
		* The gallery's MediaItem EXTENDS MediaDrilldownItem; the cards map
		* their stage artifact onto it (mesh kind → 'model' — the media vocab
		* alignment, one spelling).
		*/
		/** 3D artifact view — hands the artifact to the sidebar as a RESOURCE
		*  (estate-artifact address, claimed by a viewer tab type; the mesh
		*  renders in the right panel, orbitable beside the run list).
		*  The download link stays: when the viewer plugin is absent no tab
		*  type claims the address and openResource is a no-op — the artifact
		*  must still be reachable. openArtifact is OPTIONAL: a surface with
		*  no sidebar door (the card zoom) simply hides the link. */
		function ModelView({ item, openArtifact }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					flexDirection: "column",
					gap: 10,
					alignItems: "center"
				},
				children: [openArtifact !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
					role: "button",
					tabIndex: 0,
					style: {
						color: stateBusinessPrimary,
						fontSize: 14,
						cursor: "pointer"
					},
					onClick: (e) => {
						e.stopPropagation();
						openArtifact(item);
					},
					onKeyDown: (e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.stopPropagation();
							openArtifact(item);
						}
					},
					children: "open 3D view in sidebar"
				}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
					href: item.url,
					download: item.file,
					style: {
						color: textTertiary3,
						fontSize: 13,
						cursor: "pointer"
					},
					onClick: (e) => {
						e.stopPropagation();
					},
					children: ["download ", item.file]
				})]
			});
		}
		/** THE MEDIA DRILLDOWN (the gallery Overlay, verbatim — one face). */
		function MediaDrilldown({ item, onClose, openArtifact }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose,
				title: item.file || "media preview",
				headless: true,
				className: overlay_module_css_default.lightbox,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						position: "relative",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						gap: 14,
						padding: 24
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							"aria-label": "Close preview",
							onClick: onClose,
							style: {
								position: "absolute",
								top: 8,
								right: 8,
								zIndex: 10,
								background: "none",
								border: "none",
								cursor: "pointer",
								fontSize: 20,
								lineHeight: 1,
								padding: "4px 6px",
								borderRadius: 6
							},
							children: "✕"
						}),
						item.kind === "video" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("video", {
							src: item.url,
							controls: true,
							autoPlay: true,
							playsInline: true,
							style: {
								maxWidth: "94vw",
								maxHeight: "78vh",
								borderRadius: 8,
								background: bgBase1
							}
						}) : item.kind === "audio" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("audio", {
							src: item.url,
							controls: true,
							autoPlay: true,
							style: { width: "min(560px, 90vw)" }
						}) : item.kind === "model" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelView, {
							item,
							openArtifact
						}) : item.kind === "image" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
							src: item.url,
							alt: item.file,
							style: {
								maxWidth: "94vw",
								maxHeight: "78vh",
								borderRadius: 8,
								objectFit: "contain"
							}
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								color: labelPrimary2,
								fontSize: 13,
								maxWidth: "80vw",
								textAlign: "center",
								lineHeight: 1.5
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: { fontWeight: 600 },
								children: item.head
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: { opacity: .7 },
								children: [item.time, item.file].filter(Boolean).join(" · ")
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								color: textTertiary3,
								fontSize: 12
							},
							children: "Esc or click the mask to close"
						})
					]
				})
			});
		}
		//#endregion
		//#region src/client/bench-load.ts
		/**
		* bench-load — the restore gestures of the media plane (MediaPanel's
		* wand + its Flows face), 2026-09-10 (the bench rework's hunk 4: the
		* DECK_OPEN_WITH_DRAFT window seam retired with the deck takeover);
		* FULL PORT 2026-09-11 onto the gallery's routes + the CAS law.
		*
		* The gesture realizes "one shared state": a draft row click LOADS that
		* draft's stages onto THE BENCH (POST /v1/bench/ensure — the same load
		* wire melite_flow's bench verb rides; stages replace, the append-only
		* log records a load entry, undo restores) and then opens the cards
		* tab. The user refines on the bench — the same state the agent edits.
		*
		* THE CAS READ-MODIFY-WRITE (the door's own law, upgraded since the
		* original port): under persistent storage the shared bench SURVIVES
		* runs — a bare {stages} ensure on an existing bench refuses
		* bench/cas-conflict. Read the row first (GET /v1/bench/<session>); a
		* live bench's rev rides as expect_rev, a missing bench births (no
		* expect_rev — the only arm that may create).
		*
		* All wires are same-origin doors the host already serves; failures
		* surface as honest caller-side errors, never thrown past React.
		*/
		/** One bench session key — 'main' only for unattributed seats
		*  (stroke 44: the bench belongs to the conversation; the gallery's
		*  load writes the ACTIVE session's bench, never a stranger's). */
		const BENCH_SESSION_RE = /^[A-Za-z0-9_-]{1,64}$/;
		function benchSessionOf(id) {
			return typeof id === "string" && BENCH_SESSION_RE.test(id) ? id : "main";
		}
		/** The bench tab's address for one session (cross-plugin contract,
		* the estate-artifact pattern: client bundles cannot import across
		* plugins, so the form is restated with its definition site named —
		* cards-resource.ts's benchAddressOf). */
		function cardsBenchAddress(sessionId) {
			return "dsh-resource://cards/bench/" + benchSessionOf(sessionId);
		}
		/** The run tab's address (same contract; live runs open in the cards
		*  tab's run view — the wand restores through the bench address
		*  instead, so this twin stays for address-compat, pinned by the
		*  wall + the codec test). */
		function cardsRunAddress(runId) {
			return "dsh-resource://cards/run/" + encodeURIComponent(runId);
		}
		/** The error message an !ok JSON response carries, else HTTP n. */
		async function refusalOf(res, answer) {
			const err = answer?.["error"];
			return typeof err === "string" && err !== "" ? err : "HTTP " + String(res.status);
		}
		/** Load one draft onto the bench and open the cards tab.
		*  @param draftId the drafts door's row id (never empty — callers gate).
		*  @param deps the open action + the error surface. */
		/** The shared load tail (stroke 45): stages onto THE conversation's
		*  bench (the CAS law — read rev, ensure with expect_rev, birth on
		*  miss) + open the cards tab on it. */
		async function loadStagesOntoBench(stages, intent, deps) {
			const BENCH_SESSION = benchSessionOf(deps.sessionId);
			try {
				let expectRev;
				const getRes = await fetch("/v1/bench/" + encodeURIComponent(BENCH_SESSION), { headers: { accept: "application/json" } });
				if (getRes.ok) {
					const rev = (await getRes.json().catch(() => null))?.["rev"];
					if (typeof rev === "number") expectRev = rev;
				}
				const ensureRes = await fetch("/v1/bench/ensure", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						session: BENCH_SESSION,
						author: "user",
						stages: Array.isArray(stages) ? stages : [],
						intent,
						...expectRev !== void 0 ? { expect_rev: expectRev } : {}
					})
				});
				const answer = await ensureRes.json().catch(() => null);
				if (!ensureRes.ok) {
					deps.onError("the bench refused the load (" + await refusalOf(ensureRes, answer) + ")");
					return;
				}
				deps.openResource(cardsBenchAddress(deps.sessionId));
			} catch (e) {
				deps.onError("bench load failed — " + (e instanceof Error ? e.message : String(e)));
			}
		}
		/** Load one draft onto the bench and open the cards tab.
		*  @param draftId the drafts door's row id (never empty — callers gate).
		*  @param deps the open action + the error surface. */
		async function loadDraftOntoBench(draftId, deps) {
			try {
				const docRes = await fetch("/v1/flows/drafts/" + encodeURIComponent(draftId), { headers: { accept: "application/json" } });
				const doc = await docRes.json().catch(() => null);
				if (!docRes.ok || typeof doc !== "object" || doc === null) {
					deps.onError("could not read that card (" + await refusalOf(docRes, doc) + ")");
					return;
				}
				const stages = doc["stages"];
				const intent = doc["intent"];
				await loadStagesOntoBench(Array.isArray(stages) ? stages : [], typeof intent === "string" && intent !== "" ? intent : "restored draft", deps);
			} catch (e) {
				deps.onError("bench load failed — " + (e instanceof Error ? e.message : String(e)));
			}
		}
		/** Load one RUN's card onto the bench and open the cards tab.
		*  WHY THE SIDECAR (2026-09-11, the wand proof): the cards tab's run
		*  view hydrates from `runs/status`, which reads the registry's LIVE
		*  runs only — every settled run answers `runs/unknown-run`, so a
		*  wand that merely opens `cards/run/<id>` lands on a failure frame
		*  for the whole archive. The gallery host's sidecar route names the
		*  producing draft for settled runs too, so the wand resolves the
		*  draft itself and rides the same bench-load every other gesture
		*  uses — the workflow is back on the bench before the cards tab
		*  opens, for live and settled runs alike.
		*  @param runId the runs door's row id (never empty — callers gate).
		*  @param deps the open action + the error surface. */
		async function loadRunOntoBench(runId, deps) {
			benchSessionOf(deps.sessionId);
			try {
				const sideRes = await fetch("/infer-gallery/flow?run_id=" + encodeURIComponent(runId), { headers: { accept: "application/json" } });
				const side = await sideRes.json().catch(() => null);
				if (!sideRes.ok || typeof side !== "object" || side === null) {
					deps.onError("that run keeps no readable sidecar (" + await refusalOf(sideRes, side) + ")");
					return;
				}
				const flow = side["flow"];
				const snap = typeof flow === "object" && flow !== null ? flow["card_snapshot"] : void 0;
				if (typeof snap === "object" && snap !== null && typeof snap["card"] === "string") {
					const card = snap["card"];
					const rawParams = snap["params"];
					const params = typeof rawParams === "object" && rawParams !== null ? { ...rawParams } : {};
					delete params["draft_id"];
					delete params["test"];
					const intentSrc = typeof params["prompt"] === "string" ? params["prompt"] : "restored run";
					await loadStagesOntoBench([{
						id: "s_0",
						engine: "comfyui",
						card,
						params,
						provenance: "restored"
					}], intentSrc.slice(0, 77), deps);
					return;
				}
				const request = side["request"];
				if (typeof request === "object" && request !== null && typeof request["model"] === "string") {
					const params = { ...request };
					delete params["draft_id"];
					delete params["test"];
					const intentSrc = typeof params["prompt"] === "string" ? params["prompt"] : "restored run";
					await loadStagesOntoBench([{
						id: "s_0",
						engine: "comfyui",
						params,
						provenance: "restored"
					}], intentSrc.slice(0, 77), deps);
					return;
				}
				const flowDraft = typeof flow === "object" && flow !== null ? flow["draft_id"] : void 0;
				const topDraft = side["draft_id"];
				const draftId = typeof flowDraft === "string" && flowDraft !== "" ? flowDraft : typeof topDraft === "string" && topDraft !== "" ? topDraft : "";
				if (draftId === "") {
					deps.onError("this run keeps no card record — nothing to restore");
					return;
				}
				await loadDraftOntoBench(draftId, deps);
			} catch (e) {
				deps.onError("bench load failed — " + (e instanceof Error ? e.message : String(e)));
			}
		}
		//#endregion
		//#region src/client/decode.ts
		const row = (v) => Array.isArray(v) ? v : [];
		function decodeRuns(json) {
			const d = json ?? {};
			const errors = row(d.errors);
			const runs = [];
			let dropped = 0;
			for (const raw of row(d.runs)) {
				const r = raw ?? {};
				if (typeof r.run_id !== "string" || r.run_id === "") {
					dropped += 1;
					continue;
				}
				runs.push(r);
			}
			if (dropped > 0) errors.push({
				gateway: "runs",
				message: "dropped " + String(dropped) + " rows without run_id (unkeyable)"
			});
			return {
				runs,
				errors
			};
		}
		function decodeDrafts(json) {
			const d = json ?? {};
			return {
				drafts: row(d.drafts),
				errors: row(d.errors)
			};
		}
		//#endregion
		//#region src/client/useFeed.ts
		/**
		* useFeed — the ONE fetch/load/never-stale engine for sidebar feeds
		* (audit F6: the runs and drafts feeds each carried a hand-copied
		* load + 15s-throttled visibility/focus refetch + error trio).
		*
		* decode validates at the door: it receives unknown JSON and returns the
		* typed feed; malformed shapes fall back to empty lists THERE, in one
		* place per feed, instead of Array.isArray sprinkles at render sites.
		*/
		/** Refetch when the page becomes visible / regains focus, throttled.
		* A new chat session does NOT reload the SPA — without this the panel
		* sits on hour-old data while fresh runs exist. */
		function useRefreshOnVisible(reload, throttleMs) {
			const ref = (0, react.useRef)(reload);
			ref.current = reload;
			(0, react.useEffect)(() => {
				let last = Date.now();
				const refresh = () => {
					if (Date.now() - last < throttleMs) return;
					last = Date.now();
					ref.current();
				};
				const onVis = () => {
					if (document.visibilityState === "visible") refresh();
				};
				document.addEventListener("visibilitychange", onVis);
				window.addEventListener("focus", refresh);
				return () => {
					document.removeEventListener("visibilitychange", onVis);
					window.removeEventListener("focus", refresh);
				};
			}, [throttleMs]);
		}
		function useFeed(url, decode, initial) {
			const [data, setData] = (0, react.useState)(initial);
			const [loading, setLoading] = (0, react.useState)(true);
			const [error, setError] = (0, react.useState)("");
			const load = (0, react.useCallback)(() => {
				setLoading(true);
				setError("");
				fetch(url).then(async (r) => {
					const json = await r.json();
					if (!r.ok) {
						const msg = json.error;
						throw new Error(typeof msg === "string" && msg !== "" ? msg : "HTTP " + String(r.status));
					}
					setData(decode(json));
				}).catch((e) => {
					setError(e instanceof Error ? e.message : String(e));
				}).finally(() => {
					setLoading(false);
				});
			}, [url, decode]);
			(0, react.useEffect)(() => {
				load();
			}, [load]);
			useRefreshOnVisible(load, 15e3);
			return {
				data,
				loading,
				error,
				reload: load,
				setData
			};
		}
		//#endregion
		//#region src/client/ui.tsx
		const FONT = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
		/** The stage every non-image tile/card sits on. */
		const gradientStage = `linear-gradient(160deg, ${bgLayer1} 0%, ${bgLayer2} 100%)`;
		/** Caption scrim over posters. */
		const gradientCaption = `linear-gradient(to top, ${fillSubtleCaption}, transparent)`;
		function PanelShell({ dataAttr, children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				["data-" + dataAttr]: "1",
				style: {
					padding: 14,
					fontFamily: FONT,
					color: labelPrimary1,
					height: "100%",
					overflowY: "auto",
					boxSizing: "border-box"
				},
				children
			});
		}
		function Stat({ children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				style: {
					fontSize: 11,
					color: labelSecondary2
				},
				children
			});
		}
		function SearchInput({ value, onChange, placeholder }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
				value,
				onChange: (e) => {
					onChange(e.target.value);
				},
				placeholder,
				style: { width: 170 }
			});
		}
		function RefreshButton({ loading, onClick }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "outline",
				size: "sm",
				onClick,
				disabled: loading,
				children: loading ? "loading…" : "refresh"
			});
		}
		function Empty({ children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					color: labelSecondary2,
					fontSize: 13,
					padding: 20
				},
				children
			});
		}
		function ErrorBanner({ children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					padding: 14,
					borderRadius: 8,
					background: bgOverlay1,
					border: "1px solid var(--dsw-alias-state-error-primary, rgba(248,113,113,0.4))",
					fontSize: 13
				},
				children
			});
		}
		/** Per-gateway notes: transport failures, door drops and dedupe overlap
		* all ride the same errors channel — the message says which. */
		function GatewayErrors({ errors }) {
			if (errors.length === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: errors.map((e) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					fontSize: 11,
					color: stateWarnPrimary1,
					marginBottom: 4
				},
				children: [
					"gateway ",
					e.gateway,
					": ",
					e.message
				]
			}, e.gateway + e.message)) });
		}
		//#endregion
		//#region src/client/media-kinds.ts
		/** The client classifier's vocabulary (typed DATA — see header). */
		const MEDIA_KINDS = {
			kinds: {
				video: {
					label: "Video",
					exts: [
						"mp4",
						"webm",
						"mkv",
						"mov"
					],
					gallery: [
						"mp4",
						"webm",
						"mov"
					]
				},
				image: {
					label: "Images",
					exts: [
						"png",
						"jpg",
						"jpeg",
						"webp",
						"gif",
						"svg",
						"bmp"
					],
					gallery: [
						"png",
						"jpg",
						"jpeg",
						"webp",
						"gif"
					]
				},
				audio: {
					label: "Audio",
					exts: [
						"wav",
						"flac",
						"mp3",
						"ogg",
						"m4a",
						"aac"
					],
					gallery: [
						"wav",
						"flac",
						"ogg",
						"mp3"
					]
				},
				model: {
					label: "3D",
					exts: ["glb", "gltf"],
					gallery: ["glb", "gltf"]
				}
			},
			policy: { maxListedImages: 3 }
		};
		//#endregion
		//#region src/client/MediaPanel.tsx
		/**
		* MediaPanel — the native media archive tab (THE FULL PORT, 2026-09-11:
		* the deleted dsh-media package's panel, ported onto the gallery's own
		* host routes — every feature the migrations lost is here again).
		*
		* One grid over the gallery's runs route DIRECTLY (GET
		* /infer-gallery/runs, same-origin — the host rewrites run-relative
		* artifact names to its same-origin artifact route and serves the
		* 500-run window, the runs-window law). Everything renders with
		* NATIVE elements: <video controls autoPlay> in a fullscreen overlay,
		* <img>, <audio controls>. No iframe, no editor SPA dependency, no
		* asset-type resolver to fall through.
		*
		* Label law (operator-specified format):
		*   "first 48 chars of the prompt…" — Aug 28, 05:01 AM · filename.mp4
		* Runs with an empty prompt fall back to run name/flow.
		*/
		/** THE ESTATE-ARTIFACT ADDRESS (2026-09-10 regression fix): run artifacts
		*  live outside the DSH workspace, so no document owner can read them.
		*  The native seam for addressable non-workspace content is a resource
		*  address claimed by a tab type — the viewer tab claims
		*  `dsh-resource://estate-artifact/<b64url of the same-origin artifact
		*  URL>` (its own tab renders the mesh). The URL this panel embeds is
		*  its SAME-ORIGIN route path (fetchable from the body; no foreign
		*  origin ever leaks). The address FORMAT is the cross-plugin contract
		*  (both sides carry the 4-line codec — client bundles cannot import
		*  across plugins). When no viewer tab is loaded, openResource on the
		*  address is a no-op and the download link stays — the artifact must
		*  remain reachable either way. */
		const ARTIFACT_PREFIX = "dsh-resource://estate-artifact/";
		function b64uEncode(text) {
			const bytes = new TextEncoder().encode(text);
			let bin = "";
			for (const b of bytes) bin += String.fromCharCode(b);
			return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
		}
		function estateArtifactAddress(url) {
			return ARTIFACT_PREFIX + b64uEncode(url);
		}
		/** JSON key order = classifier precedence (video beats image on a contradictory row). */
		const KIND_ORDER = Object.keys(MEDIA_KINDS.kinds);
		const KIND_LABEL = Object.fromEntries(KIND_ORDER.map((k) => [k, MEDIA_KINDS.kinds[k].label]));
		const extRe = (exts) => new RegExp("\\.(" + exts.join("|") + ")(\\?|$)", "i");
		const KIND_RE = Object.fromEntries(KIND_ORDER.map((kind) => [kind, extRe(MEDIA_KINDS.kinds[kind].exts)]));
		/** Numbered frame dumps (per-frame PNG exports) — noise in a run with 100+ frames. */
		const FRAME_DUMP = /(^|_)\d{3,}_?\.png$/i;
		/** Concatenated film = video WITHOUT a per-window suffix; window films
		*  carry it (video lanes emit `<stem>_w<idx>_<hash>.mp4`). */
		const WINDOW_FILM = /_w\d+_[0-9a-f]+\.mp4$/;
		/** Poster siblings rendered beside a film, keyed by artifact stem. */
		const POSTER_STEMS = [/^(.+)_last_frame\.png$/i, /^(.+)_poster\.png$/i];
		/** Classifier — kind ORDER comes from the SSOT's key order; the
		*  type field beats the URL, mime prefixes are the last resort. */
		function kindOf(a) {
			const t = a.type ?? "";
			const u = a.url ?? "";
			for (const kind of KIND_ORDER) if (t === kind) return kind;
			for (const kind of KIND_ORDER) if (KIND_RE[kind].test(u)) return kind;
			if (t.startsWith("video/")) return "video";
			if (t.startsWith("audio/") || t === "audio") return "audio";
			if (t.startsWith("image/")) return "image";
			return null;
		}
		/** params is UNTRUSTED wire data — only a structurally-validated
		* calls[0].text feeds tile labels (audit F8: the old raw cast trusted
		* any object shape). */
		function callsTextOf(params) {
			if (params == null || typeof params !== "object") return "";
			const calls = params.calls;
			if (!Array.isArray(calls) || calls.length === 0) return "";
			const text = calls[0]?.text;
			return typeof text === "string" ? text.replace(/\s+/g, " ").trim() : "";
		}
		function baseName(u) {
			const clean = u.split("?")[0] ?? u;
			const parts = clean.split("/");
			return parts[parts.length - 1] ?? clean;
		}
		function timeLabel(sec) {
			if (typeof sec !== "number" || !Number.isFinite(sec) || sec <= 0) return "";
			try {
				return (/* @__PURE__ */ new Date(sec * 1e3)).toLocaleString(void 0, {
					month: "short",
					day: "numeric",
					hour: "2-digit",
					minute: "2-digit",
					hour12: false
				});
			} catch {
				return "";
			}
		}
		/** Flatten the runs feed into media tiles (poster map, frame-flood
		*  guard, dedup by url, label law, FINAL FILM detection, newest sort). */
		function flatten(runs) {
			const items = [];
			const seen = /* @__PURE__ */ new Set();
			for (const run of runs) {
				const arts = Array.isArray(run.artifacts) ? run.artifacts : [];
				const posters = /* @__PURE__ */ new Map();
				for (const a of arts) {
					const n = a.name ?? baseName(a.url ?? "");
					const m = POSTER_STEMS.map((re) => n.match(re)).find((x) => x !== null);
					if (m !== void 0 && a.url) posters.set(m[1] ?? "", a.url);
				}
				const dropFrames = arts.reduce((n, a) => kindOf(a) === "image" ? n + 1 : n, 0) > 20;
				let lastWindowPoster = "";
				for (const a of arts) {
					const kind = kindOf(a);
					const url = a.url ?? "";
					if (kind === null || url === "" || seen.has(url)) continue;
					seen.add(url);
					const file = a.name ?? baseName(url);
					if (dropFrames && kind === "image" && FRAME_DUMP.test(file)) continue;
					const stem = file.replace(/\.[^.]+$/, "");
					const prompt = String(run.prompt ?? "").replace(/\s+/g, " ").trim();
					const callsText = callsTextOf(run.params);
					const labelSrc = prompt !== "" ? prompt : (run.name ?? "") !== "" ? String(run.name) : callsText;
					const head = labelSrc !== "" ? "\"" + labelSrc.slice(0, 48) + (labelSrc.length > 48 ? "…" : "") + "\"" : String(run.flow ?? run.run_id ?? "");
					const isFinal = kind === "video" && !WINDOW_FILM.test(file);
					let poster = "";
					if (kind === "video") {
						poster = posters.get(stem) ?? (isFinal ? url : "");
						if (poster === "" && isFinal) poster = lastWindowPoster;
						if (WINDOW_FILM.test(file)) {
							const wf = posters.get(stem);
							if (wf !== void 0 && wf !== "") lastWindowPoster = wf;
						}
						if (poster === "") poster = run.thumbnail ?? "";
					} else if (kind === "image") poster = url;
					items.push({
						id: url,
						kind,
						url,
						poster,
						head,
						final: isFinal,
						runId: String(run.run_id ?? ""),
						draftId: typeof run.draft_id === "string" ? run.draft_id : "",
						time: timeLabel(run.created_at),
						file,
						created: typeof run.created_at === "number" ? run.created_at : 0
					});
				}
			}
			items.sort((a, b) => b.created - a.created || Number(b.final) - Number(a.final));
			return items;
		}
		function Glyph({ kind, size = 26 }) {
			if (kind === "video") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 24 24",
				fill: "none",
				"aria-hidden": "true",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
					x: "2.5",
					y: "5",
					width: "13",
					height: "14",
					rx: "2.2",
					stroke: "currentColor",
					strokeWidth: "1.6"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M15.5 10.5 21 7.6v8.8l-5.5-2.9",
					stroke: "currentColor",
					strokeWidth: "1.6",
					strokeLinejoin: "round"
				})]
			});
			if (kind === "audio") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 24 24",
				fill: "none",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M4 10v4M8 6.5v11M12 3.5v17M16 7.5v9M20 10v4",
					stroke: "currentColor",
					strokeWidth: "1.6",
					strokeLinecap: "round"
				})
			});
			if (kind === "model") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 24 24",
				fill: "none",
				"aria-hidden": "true",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M12 2.8 20 7.4v9.2l-8 4.6-8-4.6V7.4",
					stroke: "currentColor",
					strokeWidth: "1.6",
					strokeLinejoin: "round"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M12 12 20 7.4M12 12 4 7.4M12 12v9.2",
					stroke: "currentColor",
					strokeWidth: "1.6",
					strokeLinejoin: "round"
				})]
			});
			if (kind === "image") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 24 24",
				fill: "none",
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "3.5",
						y: "4.5",
						width: "17",
						height: "15",
						rx: "2",
						stroke: "currentColor",
						strokeWidth: "1.6"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "m6 16 4.5-5.5 3 3.5L16 11l2.5 3",
						stroke: "currentColor",
						strokeWidth: "1.6",
						strokeLinejoin: "round"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "9",
						cy: "8.5",
						r: "1.3",
						fill: "currentColor"
					})
				]
			});
			return kind;
		}
		/** Tile badge rule — ONE place: a model tile always badges 3D, a final
		*  film badges FINAL FILM, everything else badges nothing. */
		function badgeFor(item) {
			if (item.kind === "model") return {
				text: "3D",
				warn: false
			};
			if (item.final) return {
				text: "FINAL FILM",
				warn: true
			};
			return null;
		}
		function TileBadge({ item }) {
			const badge = badgeFor(item);
			if (badge === null) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				style: {
					position: "absolute",
					left: 6,
					top: 6,
					background: badge.warn ? stateWarnPrimary2 : stateBusinessPrimaryBg2,
					color: badge.warn ? bgBase3 : stateBusinessPrimary,
					borderRadius: 5,
					padding: "2px 6px",
					fontSize: 9,
					fontWeight: 700,
					letterSpacing: .4
				},
				children: badge.text
			});
		}
		/** Image tiles sit on the base surface (no letterbox); everything else on
		*  the gradient stage — the shared token-backed gradient (ui.tsx), never
		*  a restated literal (the single-site token law). */
		function tileBgFor(kind) {
			if (kind === "image") return bgBase2;
			return gradientStage;
		}
		/**
		* The centered preview — DSH's Modal (headless), the FlowCards drilldown
		* ride verbatim: body portal, mask, Escape, aria-modal, and focus
		* handling are the primitive's, never ours. The 2026-09-10 operator
		* audit caught this as a handrolled portal (own keydown listener, own
		* fixed mask div, own z-index) — retired. Media sizing rides the
		* `.lightbox` class (overlay.module.css); inner flex + captions stay
		* as content styles. (THE LOST MODAL, restored with the full port —
		* the bare gallery opened a new browser tab instead.)
		*/
		function Overlay({ item, onClose, openArtifact }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MediaDrilldown, {
				item,
				onClose,
				openArtifact: (drill) => {
					openArtifact(item);
				}
			});
		}
		/** Sidebar tab glyph — exported for the (JSX-free) client entry. */
		function MediaTabIcon({ size }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "1.8",
						y: "3",
						width: "8.4",
						height: "10",
						rx: "1.4",
						stroke: "currentColor",
						strokeWidth: "1.3"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "M10.2 6.4 14 4.6v6.8l-3.8-1.8",
						stroke: "currentColor",
						strokeWidth: "1.3",
						strokeLinejoin: "round"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "M3.6 5.4h1.6M3.6 8h1.6M3.6 10.6h1.6",
						stroke: "currentColor",
						strokeWidth: "1.1",
						strokeLinecap: "round"
					})
				]
			});
		}
		function MediaPanel({ useTabInfo, sessionId }) {
			const runsFeed = useFeed("/infer-gallery/runs", decodeRuns, {
				runs: [],
				errors: []
			});
			const draftsFeed = useFeed("/infer-gallery/drafts", decodeDrafts, {
				drafts: [],
				errors: []
			});
			const runs = runsFeed.data.runs;
			const gatewayErrors = runsFeed.data.errors;
			const drafts = draftsFeed.data.drafts;
			const loading = runsFeed.loading;
			const [uiError, setUiError] = (0, react.useState)("");
			const error = runsFeed.error !== "" ? runsFeed.error : uiError;
			const setError = setUiError;
			const [cat, setCat] = (0, react.useState)("all");
			const [search, setSearch] = (0, react.useState)("");
			const [preview, setPreview] = (0, react.useState)(null);
			const [tab, setTab] = (0, react.useState)("artifacts");
			const tabInfo = useTabInfo !== void 0 ? useTabInfo() : void 0;
			/** Open one 3D artifact as the estate-artifact resource (ModelView). */
			const openArtifact = (item) => {
				const open = tabInfo?.tab.actions.openResource;
				if (open === void 0) {
					setUiError("3D view unavailable — the sidebar tab service is not loaded.");
					return;
				}
				open(estateArtifactAddress(item.url));
			};
			const load = runsFeed.reload;
			/** THE WAND (hunk 4, 2026-09-10; restore arm 2026-09-11): "recover
			*  the cards that made this media" restores the run's workflow onto
			*  THE BENCH and opens the cards tab on it. NOT a bare run-address
			*  open: the run view hydrates from the registry's LIVE runs only,
			*  so settled runs land on `runs/unknown-run` — the wand resolves
			*  the producing draft itself (row fast path, else the sidecar)
			*  and rides the bench CAS load. The window-global → DOM-claim →
			*  iframe relay it replaced (window.__meliteDeckOpenWithDraft)
			*  retired with the deck takeover. */
			const openCards = (item) => {
				const open = tabInfo?.tab.actions.openResource;
				if (open === void 0) {
					setError("Cards view unavailable — the sidebar tab service is not loaded.");
					return;
				}
				const deps = {
					openResource: open,
					onError: setError,
					sessionId
				};
				if (item.draftId !== "" && !item.draftId.startsWith("bench-")) {
					loadDraftOntoBench(item.draftId, deps);
					return;
				}
				if (item.runId === "") return;
				loadRunOntoBench(item.runId, deps);
			};
			/** FLOW OPEN (hunk 4): a draft row loads onto THE BENCH (the shared
			*  state both authors edit) and opens the cards tab — bench-load.ts. */
			const openDraft = (draftId) => {
				if (draftId === "") return;
				const open = tabInfo?.tab.actions.openResource;
				if (open === void 0) {
					setError("Cards view unavailable — the sidebar tab service is not loaded.");
					return;
				}
				loadDraftOntoBench(draftId, {
					openResource: open,
					onError: setError,
					sessionId
				});
			};
			const items = (0, react.useMemo)(() => flatten(runs), [runs]);
			const truncatedRuns = (0, react.useMemo)(() => runs.filter((r) => r.truncated !== void 0 && r.truncated.total > r.truncated.listed).length, [runs]);
			const counts = (0, react.useMemo)(() => {
				const c = {
					all: items.length,
					...Object.fromEntries(KIND_ORDER.map((k) => [k, 0]))
				};
				for (const it of items) c[it.kind] += 1;
				return c;
			}, [items]);
			const shown = (0, react.useMemo)(() => {
				const q = search.trim().toLowerCase();
				return items.filter((it) => {
					if (cat !== "all" && it.kind !== cat) return false;
					if (q === "") return true;
					return (it.head + " " + it.file + " " + it.time).toLowerCase().includes(q);
				});
			}, [
				items,
				cat,
				search
			]);
			const chip = (c, label) => {
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
					active: cat === c,
					onClick: () => {
						setCat(c);
					},
					children: [
						label,
						" ",
						counts[c]
					]
				}, c);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(PanelShell, {
				dataAttr: "infer-media-panel",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: 10,
							flexWrap: "wrap",
							marginBottom: 10
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									fontWeight: 700,
									fontSize: 14
								},
								children: "Infer Media"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Stat, { children: [
								runs.length,
								" runs · ",
								items.length,
								" artifacts",
								gatewayErrors.length > 0 ? " · " + gatewayErrors.length + " gateway note" + (gatewayErrors.length > 1 ? "s" : "") : "",
								truncatedRuns > 0 ? " · " + truncatedRuns + " capped" : ""
							] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: { flex: 1 } }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									display: "flex",
									gap: 4
								},
								children: ["flows", "artifacts"].map((t) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
									active: tab === t,
									onClick: () => {
										setTab(t);
									},
									children: t === "flows" ? "Flows " + String(drafts.length) : "Artifacts " + String(items.length)
								}, t))
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SearchInput, {
								value: search,
								onChange: setSearch,
								placeholder: "search prompt, file…"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RefreshButton, {
								loading,
								onClick: load
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							gap: 6,
							marginBottom: 12,
							flexWrap: "wrap"
						},
						children: [chip("all", "All"), KIND_ORDER.map((k) => chip(k, KIND_LABEL[k]))]
					}),
					tab === "flows" ? drafts.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Empty, { children: "no composed cards yet — build one in a chat." }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						"data-infer-media-drafts": "1",
						style: {
							display: "flex",
							flexDirection: "column",
							gap: 6
						},
						children: drafts.map((d) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							onClick: () => {
								openDraft(d.draft_id ?? "");
							},
							"data-draft": d.draft_id,
							style: {
								display: "flex",
								alignItems: "center",
								gap: 10,
								textAlign: "left",
								border: "1px solid " + borderL2,
								borderRadius: 10,
								padding: "8px 12px",
								background: gradientStage,
								cursor: "pointer",
								color: labelPrimary1,
								fontFamily: "inherit"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										fontSize: 15,
										lineHeight: 0,
										color: stateWarnPrimary1
									},
									children: "▸"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: {
										flex: 1,
										minWidth: 0,
										display: "flex",
										flexDirection: "column",
										gap: 2
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											fontSize: 13,
											fontWeight: 600,
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap"
										},
										children: d.name || d.draft_id
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: {
											fontSize: 10,
											fontFamily: "ui-monospace, monospace",
											color: labelSecondary2,
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap"
										},
										children: [
											d.model || "card",
											" · ",
											d.draft_id
										]
									})]
								}),
								typeof d.source === "string" && d.source !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										fontSize: 9,
										color: textTertiary2,
										border: "1px solid " + borderL2,
										borderRadius: 6,
										padding: "2px 6px"
									},
									children: d.source.replace(/^https?:\/\//, "")
								}) : null
							]
						}, d.draft_id ?? Math.random()))
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GatewayErrors, { errors: gatewayErrors }),
					tab === "artifacts" && (error !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(ErrorBanner, { children: ["failed to load runs: ", error] }) : loading && items.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Empty, { children: "loading runs…" }) : shown.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Empty, { children: "no artifacts match." }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							display: "grid",
							gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))",
							gap: 10
						},
						children: shown.map((it) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							onClick: () => {
								setPreview(it);
							},
							style: {
								position: "relative",
								aspectRatio: "16 / 9",
								borderRadius: 10,
								overflow: "hidden",
								border: "1px solid var(--dsw-alias-border-l2, rgba(148,163,184,0.25))",
								cursor: "pointer",
								padding: 0,
								background: tileBgFor(it.kind),
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								color: "var(--dsw-alias-text-tertiary, rgba(148,163,184,0.75))",
								textAlign: "left",
								fontFamily: "inherit"
							},
							children: [
								it.poster !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
									src: it.poster,
									alt: "",
									loading: "lazy",
									style: {
										position: "absolute",
										inset: 0,
										width: "100%",
										height: "100%",
										objectFit: "cover"
									}
								}) : null,
								it.kind === "video" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										position: "absolute",
										right: 6,
										bottom: 6,
										background: "var(--dsw-alias-fill-subtle, rgba(2,6,23,0.72))",
										borderRadius: 6,
										padding: 3,
										lineHeight: 0,
										color: "var(--dsw-alias-label-primary, #e2e8f0)"
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, {
										kind: "video",
										size: 14
									})
								}) : null,
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TileBadge, { item: it }),
								it.runId !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
									label: "Open as cards — this run, live in the cards tab",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										role: "button",
										tabIndex: 0,
										className: overlay_module_css_default.wand,
										"aria-label": "Open as cards — this run",
										onClick: (e) => {
											e.stopPropagation();
											openCards(it);
										},
										onKeyDown: (e) => {
											if (e.key === "Enter") {
												e.stopPropagation();
												openCards(it);
											}
										},
										children: "✦ CARDS"
									})
								}) : null,
								it.poster === "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: { color: "var(--dsw-alias-text-tertiary, rgba(148,163,184,0.55))" },
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, { kind: it.kind })
								}) : null,
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: {
										position: "absolute",
										left: 0,
										right: 0,
										bottom: 0,
										padding: "16px 6px 4px",
										background: gradientCaption,
										fontSize: 10,
										lineHeight: 1.35,
										color: "var(--dsw-alias-label-primary, rgba(226,232,240,0.92))",
										display: "-webkit-box",
										WebkitLineClamp: 2,
										WebkitBoxOrient: "vertical",
										overflow: "hidden"
									},
									children: [it.head !== "" ? it.head + " — " : "", [it.time, it.file].filter(Boolean).join(" · ")]
								})
							]
						}, it.id))
					})),
					preview !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Overlay, {
						item: preview,
						onClose: () => {
							setPreview(null);
						},
						openArtifact
					}) : null
				]
			});
		}
		//#endregion
		//#region src/client/index.ts
		/** The tab type's identity (the id its body registers under — the
		*  deleted package's contract spelling, restored). */
		const MEDIA_TAB_ID = "infer-media:media";
		/** Required services (fiber inject waiting — the tab registry must be
		*  up first). */
		const inject = ["slots", "sidebarRightTabs"];
		/**
		* Client apply: claims the single application slot, then registers
		* the Media tab (type + body) exactly as the deleted client and the
		* shipped tabs do.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			if (!claimGalleryApply()) return;
			ctx.effect(() => releaseGalleryApply, "melite-gallery: apply claim");
			const tab = ctx;
			try {
				tab.effect(() => tab.sidebarRightTabs.register({
					id: MEDIA_TAB_ID,
					kind: "media",
					title: () => "Media",
					guide: [{
						order: 51,
						title: () => "Media",
						description: () => "Every run's artifacts — the archive, with the lightbox, chips, search and the cards wand.",
						icon: MediaTabIcon
					}]
				}), "melite-gallery: media tab type");
			} catch (error) {
				console.error("[melite-gallery] media tab type registration failed:", error);
			}
			try {
				tab.slots.inject("sidebar.right.pane.tab", () => tab.slots.register({
					name: "sidebar.right.pane.tab",
					key: MEDIA_TAB_ID
				}, MediaPanel));
			} catch (error) {
				console.error("[melite-gallery] media tab body registration failed:", error);
			}
		}
		//#endregion
		exports.MEDIA_KINDS = MEDIA_KINDS;
		exports.MediaPanel = MediaPanel;
		exports.MediaTabIcon = MediaTabIcon;
		exports.apply = apply;
		exports.callsTextOf = callsTextOf;
		exports.cardsBenchAddress = cardsBenchAddress;
		exports.cardsRunAddress = cardsRunAddress;
		exports.decodeDrafts = decodeDrafts;
		exports.decodeRuns = decodeRuns;
		exports.flatten = flatten;
		exports.inject = inject;
		exports.kindOf = kindOf;
		exports.loadDraftOntoBench = loadDraftOntoBench;
		exports.loadRunOntoBench = loadRunOntoBench;
		exports.useFeed = useFeed;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map