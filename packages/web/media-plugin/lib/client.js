window.__ModuleLoader__.load({
	id: "@infer-media/dsh-media",
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
		* Single-mount claim. The client bundle can be evaluated more than once per
		* page load (HMR, tab re-mount, duplicate injection); without a claim the
		* sidebar would register the same tab twice. Acquired once per bundle
		* lifetime and released from the apply effect cleanup.
		*/
		const CLAIM_KEY = "__infer_media_applied__";
		function claimMediaApply() {
			const w = globalThis;
			const prev = w[CLAIM_KEY];
			if (prev !== void 0 && prev.v === "1") return false;
			w[CLAIM_KEY] = { v: "1" };
			return true;
		}
		function releaseMediaApply() {
			const w = globalThis;
			delete w[CLAIM_KEY];
		}
		/**
		* Cards-studio seam (CARD REPLAY DOOR contract, provider:
		* melite-card-deck deck-sidebar-entry.tsx — sets
		* `window[DECK_OPEN_WITH_DRAFT] = (draftId: string) => boolean` at deck
		* entry mount, deletes it on dispose). The ONLY definition site of the
		* seam name repo-wide: every consumer imports this const (never a
		* restated literal) and fails LOUDLY via setError when the seam is
		* absent (deck plugin not loaded). Pinned by test_media_sidebar.py.
		*/
		const DECK_OPEN_WITH_DRAFT = "__meliteDeckOpenWithDraft";
		function openWithDraft(draftId) {
			const open = window[DECK_OPEN_WITH_DRAFT];
			if (typeof open !== "function") return "no-seam";
			return open(draftId) ? "ok" : "refused";
		}
		//#endregion
		//#region src/client/decode.ts
		const row = (v) => Array.isArray(v) ? v : [];
		function decodeRuns(json) {
			const d = json ?? {};
			return {
				runs: row(d.runs),
				errors: row(d.errors)
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
		* (audit F6: MediaPanel and FlowsPanel each carried a hand-copied
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
		//#region \0dsh-css:media-plugin/src/client/overlay.module.css.mjs
		const css = "._3EyOHW_lightbox{width:min(1200px,96vw);max-width:96vw}._3EyOHW_wand{z-index:3;background:var(--dsw-alias-fill-subtle,#020617d1);color:var(--dsw-alias-state-warn-primary,#fde68a);letter-spacing:.4px;cursor:pointer;opacity:1;border-radius:6px;align-items:center;gap:4px;padding:4px 6px;font-family:inherit;font-size:9px;font-weight:700;display:flex;position:absolute;top:6px;right:6px}._3EyOHW_wandDim{opacity:.35}";
		const tagId = "@infer-media/dsh-media/overlay.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@infer-media/dsh-media";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var overlay_module_css_default = {
			"lightbox": "_3EyOHW_lightbox",
			"wand": "_3EyOHW_wand",
			"wandDim": "_3EyOHW_wandDim"
		};
		//#endregion
		//#region src/client/ui.tokens.ts
		/**
		* Design tokens — every var(--dsw-alias-…) string in the media family
		* declared ONCE (audit F6). Numbered suffixes = same alias, different
		* fallback (opacity variants). Pinned by test_media_sidebar.py
		* (test_tokens_single_site).
		*/
		const bgBase1 = "var(--dsw-alias-bg-base, #000)";
		const bgBase2 = "var(--dsw-alias-bg-base, #0b0e14)";
		const bgBase3 = "var(--dsw-alias-bg-base, #422006)";
		const bgLayer1 = "var(--dsw-alias-bg-layer-1, #1e293b)";
		const bgLayer2 = "var(--dsw-alias-bg-layer-2, #0f172a)";
		const bgOverlay1 = "var(--dsw-alias-bg-overlay, rgba(127,29,29,0.35))";
		const borderL2 = "var(--dsw-alias-border-l2, rgba(148,163,184,0.25))";
		const labelPrimary1 = "var(--dsw-alias-label-primary, rgb(226,232,240))";
		const labelPrimary2 = "var(--dsw-alias-label-primary, rgba(226,232,240,0.85))";
		const labelSecondary1 = "var(--dsw-alias-label-secondary, rgb(203,213,225))";
		const labelSecondary2 = "var(--dsw-alias-label-secondary, rgba(148,163,184,0.9))";
		const stateBusinessPrimary = "var(--dsw-alias-state-business-primary, rgb(147,197,253))";
		const stateBusinessPrimaryBg2 = "var(--dsw-alias-state-business-primary-bg, rgba(59,130,246,0.28))";
		const stateWarnPrimary1 = "var(--dsw-alias-state-warn-primary, rgba(250,204,21,0.9))";
		const stateWarnPrimary2 = "var(--dsw-alias-state-warn-primary, rgba(250,204,21,0.92))";
		const textTertiary2 = "var(--dsw-alias-text-tertiary, rgba(148,163,184,0.75))";
		const textTertiary3 = "var(--dsw-alias-text-tertiary, rgba(148,163,184,0.8))";
		//#endregion
		//#region src/client/ui.tsx
		const FONT = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
		const MONO = "ui-monospace, monospace";
		/** The stage every non-image tile/card sits on. */
		const gradientStage = `linear-gradient(160deg, ${bgLayer1} 0%, ${bgLayer2} 100%)`;
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
		*  all ride the same errors channel — the message says which. */
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
		//#region media-kinds.json
		var kinds = {
			"video": {
				"label": "Video",
				"exts": [
					"mp4",
					"webm",
					"mkv",
					"mov"
				],
				"gallery": [
					"mp4",
					"webm",
					"mov"
				]
			},
			"image": {
				"label": "Images",
				"exts": [
					"png",
					"jpg",
					"jpeg",
					"webp",
					"gif",
					"svg",
					"bmp"
				],
				"gallery": [
					"png",
					"jpg",
					"jpeg",
					"webp",
					"gif"
				]
			},
			"audio": {
				"label": "Audio",
				"exts": [
					"wav",
					"flac",
					"mp3",
					"ogg",
					"m4a",
					"aac"
				],
				"gallery": [
					"wav",
					"flac",
					"ogg",
					"mp3"
				]
			},
			"model": {
				"label": "3D",
				"exts": ["glb", "gltf"],
				"gallery": ["glb", "gltf"]
			}
		};
		//#endregion
		//#region src/client/MediaPanel.tsx
		/**
		* MediaPanel — the native media archive tab.
		*
		* One merged grid over GET /infer-media/runs (host half merges every
		* gateway). Everything renders with NATIVE elements: <video controls
		* autoPlay> in a fullscreen overlay, <img>, <audio controls>. No iframe, no
		* editor SPA dependency, no asset-type resolver to fall through.
		*
		* Label law (operator-specified format):
		*   "first 48 chars of the prompt…" — Aug 28, 05:01 AM · filename.mp4
		* Runs with an empty prompt fall back to run name/flow.
		*/
		/** THE ESTATE-ARTIFACT ADDRESS (2026-09-10 regression fix): run artifacts
		*  live on the estate gateway, outside the DSH workspace, so no document
		*  owner can read them. The native seam for addressable non-workspace
		*  content is a resource address claimed by a tab type — dsh-glb-viewer
		*  claims `dsh-resource://estate-artifact/<b64url of the same-origin
		*  artifact URL>` (its own tab renders the mesh). The URL this panel
		*  embeds is its SAME-ORIGIN proxy path (fetchable from the body; the
		*  gateway origin never leaks). The address FORMAT is the cross-plugin
		*  contract (both sides carry the 4-line codec — client bundles cannot
		*  import across plugins); dsh-glb-viewer/src/client.js is the other side.
		*/
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
		const KIND_ORDER = Object.keys(kinds);
		const KIND_LABEL = Object.fromEntries(KIND_ORDER.map((k) => [k, kinds[k].label]));
		const extRe = (exts) => new RegExp("\\.(" + exts.join("|") + ")(\\?|$)", "i");
		const KIND_RE = Object.fromEntries(KIND_ORDER.map((kind) => [kind, extRe(kinds[kind].exts)]));
		/** Numbered frame dumps (per-frame PNG exports) — noise in a run with 100+ frames. */
		const FRAME_DUMP = /(^|_)\d{3,}_?\.png$/i;
		/** Concatenated film = video WITHOUT a per-window suffix; window films
		*  carry it (video lanes emit `<stem>_w<idx>_<hash>.mp4`). */
		const WINDOW_FILM = /_w\d+_[0-9a-f]+\.mp4$/;
		/** Poster siblings rendered beside a film, keyed by artifact stem. */
		const POSTER_STEMS = [/^(.+)_last_frame\.png$/i, /^(.+)_poster\.png$/i];
		/** Classifier — kind ORDER comes from the SSOT JSON's key order; the
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
		*  calls[0].text feeds tile labels (audit F8: the old raw cast trusted
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
		/** One row of the gateway drafts list — a COMPOSED action card (a
		*  flow instance). Wire shape in decode.ts (DraftRow); rendering here. */
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
		* 3D artifact view — hands the artifact to the sidebar as a RESOURCE
		* (estate-artifact address, claimed by dsh-glb-viewer's tab type; the
		* mesh renders in the right panel, orbitable beside the run list).
		* The download link stays: when the viewer plugin is absent no tab type
		* claims the address and openResource is a no-op — the artifact must
		* still be reachable.
		*/
		function ModelView({ item, openArtifact }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					flexDirection: "column",
					gap: 10,
					alignItems: "center"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
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
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
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
		/**
		* The centered preview — DSH's Modal (headless), the FlowCards drilldown
		* ride verbatim: body portal, mask, Escape, aria-modal, and focus
		* handling are the primitive's, never ours. The 2026-09-10 operator
		* audit caught this as a handrolled portal (own keydown listener, own
		* fixed mask div, own z-index) — retired. Media sizing rides the
		* `.lightbox` class (overlay.module.css); inner flex + captions stay
		* as content styles.
		*/
		function Overlay({ item, onClose, openArtifact }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose,
				title: item.file || "media preview",
				headless: true,
				className: overlay_module_css_default.lightbox,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						gap: 14,
						padding: 24
					},
					children: [
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
		function MediaPanel({ useTabInfo }) {
			const runsFeed = useFeed("/infer-media/runs", decodeRuns, {
				runs: [],
				errors: []
			});
			const draftsFeed = useFeed("/infer-media/drafts", decodeDrafts, {
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
			runsFeed.reload;
			/** CARD REPLAY (final wiring, 2026-08-30): the wand opens THE CARDS
			*  STUDIO — the left-sidebar Cards tab itself — by clicking its row,
			*  exactly as the operator does. The studio opens with its own embed
			*  bridge and full card system, untouched. No iframe here, no editor
			*  dependency in this panel; the row is the deck bundle's own entry
			*  ([data-melite-cards-entry]). The run→card link is the draft_id the
			*  gateway's runs list carries per row (same payload this panel already
			*  loaded — no extra fetch, no gallery route). Missing link or missing
			*  row = honest inline error. */
			const openCards = (runId, draftId) => {
				if (runId === "") return;
				if (draftId === "") {
					setError("run has no action card (no draft_id in its run row)");
					return;
				}
				const res = openWithDraft(draftId);
				if (res === "no-seam") setError("Cards studio unavailable (deck plugin not loaded)");
				else if (res === "refused") setError("Cards studio refused to open");
			};
			/** FLOW OPEN: click a draft row → the Cards studio opens with THAT
			*  card hydrated (same deck seam the run wand uses). The card is the
			*  queue-native object: refine it there, press Run when ready. */
			const openDraft = (draftId) => {
				if (draftId === "") return;
				const res = openWithDraft(draftId);
				if (res === "no-seam") setError("Cards studio unavailable (deck plugin not loaded)");
				else if (res === "refused") setError("Cards studio refused to open");
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
								placeholder: "search prompt, file\\u2026"
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
					tab === "artifacts" && (error !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(ErrorBanner, { children: ["failed to load runs: ", error] }) : loading && items.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Empty, { children: "loading runs\\u2026" }) : shown.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Empty, { children: "no artifacts match." }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
									label: it.draftId !== "" ? "Open as cards — this run’s card, setup and ready" : "No action card linked to this run",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										role: "button",
										tabIndex: 0,
										className: it.draftId !== "" ? overlay_module_css_default.wand : overlay_module_css_default.wand + " " + overlay_module_css_default.wandDim,
										"aria-label": it.draftId !== "" ? "Open as cards — this run’s card" : "No action card linked to this run",
										onClick: (e) => {
											e.stopPropagation();
											openCards(it.runId, it.draftId);
										},
										onKeyDown: (e) => {
											if (e.key === "Enter") {
												e.stopPropagation();
												openCards(it.runId, it.draftId);
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
										background: "linear-gradient(to top, var(--dsw-alias-fill-subtle, rgba(2,6,23,0.92)), transparent)",
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
		//#region src/client/FlowsPanel.tsx
		/**
		* FlowsPanel — the RIGHT-SIDEBAR Flows tab.
		*
		* Lists the composed action cards (drafts) from the host half's merged
		* /infer-media/drafts door — every gateway's queue-native flow
		* instances, newest first. Click a row: the Cards studio opens with THAT
		* card hydrated (the deck's own DECK_OPEN_WITH_DRAFT seam — the same
		* door the media panel's run wand uses), ready to refine and Run.
		*
		* Sibling to MediaPanel through the SHARED family (ui.ts primitives,
		* ui.tokens.ts, useFeed) — one system, zero copy-paste.
		*/
		/** Sidebar tab glyph — a flow arrow, exported for the client entry. */
		function FlowsTabIcon({ size }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "M2 4h5a3 3 0 0 1 3 3v2a3 3 0 0 0 3 3h1",
						stroke: "currentColor",
						strokeWidth: "1.6",
						strokeLinecap: "round"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "2.8",
						cy: "4",
						r: "1.4",
						fill: "currentColor"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "13.2",
						cy: "12",
						r: "1.4",
						fill: "currentColor"
					})
				]
			});
		}
		function FlowsPanel() {
			const feed = useFeed("/infer-media/drafts", decodeDrafts, {
				drafts: [],
				errors: []
			});
			const [search, setSearch] = (0, react.useState)("");
			const [uiError, setUiError] = (0, react.useState)("");
			const openDraft = (draftId) => {
				if (draftId === "") return;
				const res = openWithDraft(draftId);
				if (res === "no-seam") setUiError("Cards studio unavailable (deck plugin not loaded)");
				else if (res === "refused") setUiError("Cards studio refused to open");
			};
			const q = search.trim().toLowerCase();
			const shown = q === "" ? feed.data.drafts : feed.data.drafts.filter((d) => [
				d.name ?? "",
				d.model ?? "",
				d.draft_id ?? ""
			].join(" ").toLowerCase().includes(q));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(PanelShell, {
				dataAttr: "infer-flows-panel",
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
								children: "Flows"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Stat, { children: [
								feed.data.drafts.length,
								" cards",
								feed.data.errors.length > 0 ? " · " + feed.data.errors.length + " gateway note" + (feed.data.errors.length > 1 ? "s" : "") : ""
							] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: { flex: 1 } }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SearchInput, {
								value: search,
								onChange: setSearch,
								placeholder: "search name, model\\u2026"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RefreshButton, {
								loading: feed.loading,
								onClick: feed.reload
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(GatewayErrors, { errors: feed.data.errors }),
					feed.error !== "" || uiError !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ErrorBanner, { children: feed.error !== "" ? feed.error : uiError }) : feed.loading && feed.data.drafts.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Empty, { children: "loading cards\\u2026" }) : shown.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Empty, { children: "no composed cards yet — build one in a chat." }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							display: "flex",
							flexDirection: "column",
							gap: 6
						},
						children: shown.map((d) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							onClick: () => {
								openDraft(d.draft_id ?? "");
							},
							"data-draft": d.draft_id,
							style: {
								display: "flex",
								alignItems: "center",
								gap: 10,
								textAlign: "left",
								border: "1px solid var(--dsw-alias-border-l1, rgba(148,163,184,0.18))",
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
											fontFamily: MONO,
											color: labelSecondary1,
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
					})
				]
			});
		}
		//#endregion
		//#region src/client/index.ts
		/** 'slots' (seat declarations) + the native tab registry (the body slot
		*  is declared by the sidebar package itself; the registry must be up
		*  first for the type registrations). */
		const inject = ["slots", "sidebarRightTabs"];
		function apply(ctx) {
			if (!claimMediaApply()) return;
			ctx.effect(() => releaseMediaApply, "infer-media: apply claim");
			try {
				ctx.effect(() => ctx.sidebarRightTabs.register({
					id: "infer-media:media",
					kind: "media",
					title: () => "Media",
					guide: [{
						order: 51,
						title: () => "Media",
						description: () => "Every gateway's runs and artifacts, merged.",
						icon: MediaTabIcon
					}]
				}), "infer-media: media tab type");
				ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({
					name: "sidebar.right.pane.tab",
					key: "infer-media:media"
				}, MediaPanel));
			} catch (error) {
				console.error("[infer-media] media tab registration failed:", error);
			}
			try {
				ctx.effect(() => ctx.sidebarRightTabs.register({
					id: "infer-media:flows",
					kind: "flows",
					title: () => "Flows",
					guide: [{
						order: 52,
						title: () => "Flows",
						description: () => "The composed action cards (drafts), every gateway.",
						icon: FlowsTabIcon
					}]
				}), "infer-media: flows tab type");
				ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({
					name: "sidebar.right.pane.tab",
					key: "infer-media:flows"
				}, FlowsPanel));
			} catch (error) {
				console.error("[infer-media] flows tab registration failed:", error);
			}
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
