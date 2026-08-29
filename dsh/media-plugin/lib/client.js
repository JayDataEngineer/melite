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
		let react_dom = require("react-dom");
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
		* Runs with an empty prompt fall back to run name/pipeline.
		*/
		const VIDEO_EXT = /\.(mp4|webm|mov|mkv)(\?|$)/i;
		const IMAGE_EXT = /\.(png|jpe?g|webp|gif|bmp)(\?|$)/i;
		const AUDIO_EXT = /\.(mp3|wav|flac|ogg|m4a|aac)(\?|$)/i;
		/** Numbered frame dumps (per-frame PNG exports) — noise in a run with 100+ frames. */
		const FRAME_DUMP = /(^|_)\d{3,}_?\.png$/i;
		function kindOf(a) {
			const t = a.type ?? "";
			const u = a.url ?? "";
			if (t === "video" || t.startsWith("video/") || VIDEO_EXT.test(u)) return "video";
			if (t === "audio" || t.startsWith("audio/") || AUDIO_EXT.test(u)) return "audio";
			if (t === "image" || t.startsWith("image/") || IMAGE_EXT.test(u)) return "image";
			return null;
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
		function flatten(runs) {
			const items = [];
			const seen = /* @__PURE__ */ new Set();
			for (const run of runs) {
				const arts = Array.isArray(run.artifacts) ? run.artifacts : [];
				const posters = /* @__PURE__ */ new Map();
				for (const a of arts) {
					const n = a.name ?? baseName(a.url ?? "");
					const m = n.match(/^(.+)_last_frame\.png$/i) ?? n.match(/^(.+)_poster\.png$/i);
					if (m !== null && a.url) posters.set(m[1] ?? "", a.url);
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
					const callsText = String(run.params?.calls?.[0]?.text ?? "").replace(/\s+/g, " ").trim();
					const labelSrc = prompt !== "" ? prompt : (run.name ?? "") !== "" ? String(run.name) : callsText;
					const head = labelSrc !== "" ? "\"" + labelSrc.slice(0, 48) + (labelSrc.length > 48 ? "…" : "") + "\"" : String(run.pipeline ?? run.run_id ?? "");
					const isFinal = kind === "video" && !/_w\d+_[0-9a-f]+\.mp4$/.test(file);
					let poster = "";
					if (kind === "video") {
						poster = posters.get(stem) ?? "";
						if (poster === "" && isFinal) poster = lastWindowPoster;
						if (/_w\d+_[0-9a-f]+\.mp4$/.test(file)) {
							const wf = posters.get(stem);
							if (wf !== "") lastWindowPoster = wf;
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
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
		}
		function Overlay({ item, onClose }) {
			(0, react.useEffect)(() => {
				const onKey = (e) => {
					if (e.key === "Escape") onClose();
				};
				window.addEventListener("keydown", onKey);
				return () => window.removeEventListener("keydown", onKey);
			}, [onClose]);
			return (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				onClick: onClose,
				style: {
					position: "fixed",
					inset: 0,
					zIndex: 2147483e3,
					background: "rgba(8,9,12,0.93)",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					gap: 14,
					padding: 24,
					cursor: "zoom-out"
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
							background: "#000",
							cursor: "default"
						},
						onClick: (e) => {
							e.stopPropagation();
						}
					}) : item.kind === "audio" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("audio", {
						src: item.url,
						controls: true,
						autoPlay: true,
						style: { width: "min(560px, 90vw)" },
						onClick: (e) => {
							e.stopPropagation();
						}
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
						src: item.url,
						alt: item.file,
						style: {
							maxWidth: "94vw",
							maxHeight: "78vh",
							borderRadius: 8,
							objectFit: "contain",
							cursor: "default"
						},
						onClick: (e) => {
							e.stopPropagation();
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							color: "rgba(226,232,240,0.85)",
							fontSize: 13,
							maxWidth: "80vw",
							textAlign: "center",
							lineHeight: 1.5,
							cursor: "default"
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
							color: "rgba(148,163,184,0.8)",
							fontSize: 12
						},
						children: "click anywhere or press Esc to close"
					})
				]
			}), document.body);
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
		function MediaPanel() {
			const [runs, setRuns] = (0, react.useState)([]);
			const [loading, setLoading] = (0, react.useState)(true);
			const [error, setError] = (0, react.useState)("");
			const [gatewayErrors, setGatewayErrors] = (0, react.useState)([]);
			const [cat, setCat] = (0, react.useState)("all");
			const [search, setSearch] = (0, react.useState)("");
			const [preview, setPreview] = (0, react.useState)(null);
			const load = (0, react.useCallback)(() => {
				setLoading(true);
				setError("");
				fetch("/infer-media/runs").then(async (r) => {
					const data = await r.json();
					if (!r.ok) throw new Error(String(data.error ?? r.status));
					setRuns(Array.isArray(data.runs) ? data.runs : []);
					setGatewayErrors(Array.isArray(data.errors) ? data.errors : []);
				}).catch((e) => {
					setError(e instanceof Error ? e.message : String(e));
				}).finally(() => {
					setLoading(false);
				});
			}, []);
			(0, react.useEffect)(() => {
				load();
			}, [load]);
			(0, react.useEffect)(() => {
				let last = Date.now();
				const refresh = () => {
					if (Date.now() - last < 15e3) return;
					last = Date.now();
					load();
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
			}, [load]);
			const items = (0, react.useMemo)(() => flatten(runs), [runs]);
			const counts = (0, react.useMemo)(() => {
				const c = {
					all: items.length,
					video: 0,
					image: 0,
					audio: 0
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
				const active = cat === c;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					onClick: () => {
						setCat(c);
					},
					style: {
						border: "1px solid " + (active ? "rgba(96,165,250,0.9)" : "rgba(148,163,184,0.25)"),
						background: active ? "rgba(59,130,246,0.18)" : "transparent",
						color: active ? "rgb(147,197,253)" : "rgb(203,213,225)",
						borderRadius: 999,
						padding: "3px 10px",
						fontSize: 12,
						cursor: "pointer",
						fontFamily: "inherit"
					},
					children: [
						label,
						" ",
						counts[c]
					]
				}, c);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-infer-media-panel": "1",
				style: {
					padding: 14,
					fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
					color: "rgb(226,232,240)",
					height: "100%",
					overflowY: "auto",
					boxSizing: "border-box"
				},
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
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								style: {
									fontSize: 11,
									color: "rgba(148,163,184,0.9)"
								},
								children: [
									runs.length,
									" runs · ",
									items.length,
									" artifacts",
									gatewayErrors.length > 0 ? " · " + gatewayErrors.length + " gateway down" : ""
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: { flex: 1 } }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								value: search,
								onChange: (e) => {
									setSearch(e.target.value);
								},
								placeholder: "search prompt, file\\u2026",
								style: {
									background: "rgba(15,23,42,0.9)",
									border: "1px solid rgba(148,163,184,0.25)",
									color: "rgb(226,232,240)",
									borderRadius: 8,
									padding: "5px 10px",
									fontSize: 12,
									width: 200,
									fontFamily: "inherit"
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								onClick: () => {
									load();
								},
								disabled: loading,
								style: {
									border: "1px solid rgba(148,163,184,0.25)",
									background: "transparent",
									color: "rgb(203,213,225)",
									borderRadius: 8,
									padding: "5px 10px",
									fontSize: 12,
									cursor: loading ? "default" : "pointer",
									fontFamily: "inherit"
								},
								children: loading ? "loading…" : "refresh"
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
						children: [
							chip("all", "All"),
							chip("video", "Video"),
							chip("image", "Images"),
							chip("audio", "Audio")
						]
					}),
					gatewayErrors.length > 0 ? gatewayErrors.map((e) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							fontSize: 11,
							color: "rgba(251,191,36,0.9)",
							marginBottom: 4
						},
						children: [
							"gateway ",
							e.gateway,
							" unreachable — ",
							e.message
						]
					}, e.gateway)) : null,
					error !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							padding: 14,
							borderRadius: 8,
							background: "rgba(127,29,29,0.35)",
							border: "1px solid rgba(248,113,113,0.4)",
							fontSize: 13
						},
						children: ["failed to load runs: ", error]
					}) : loading && items.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							color: "rgba(148,163,184,0.9)",
							fontSize: 13,
							padding: 20
						},
						children: "loading runs\\u2026"
					}) : shown.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							color: "rgba(148,163,184,0.9)",
							fontSize: 13,
							padding: 20
						},
						children: "no artifacts match."
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
								border: "1px solid rgba(148,163,184,0.18)",
								cursor: "pointer",
								padding: 0,
								background: it.kind === "image" ? "#0b0e14" : "linear-gradient(160deg, #1e293b 0%, #0f172a 100%)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								color: "rgba(148,163,184,0.75)",
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
										background: "rgba(2,6,23,0.72)",
										borderRadius: 6,
										padding: 3,
										lineHeight: 0,
										color: "#e2e8f0"
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, {
										kind: "video",
										size: 14
									})
								}) : null,
								it.final ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										position: "absolute",
										left: 6,
										top: 6,
										background: "rgba(250,204,21,0.92)",
										color: "#422006",
										borderRadius: 5,
										padding: "2px 6px",
										fontSize: 9,
										fontWeight: 700,
										letterSpacing: .4
									},
									children: "FINAL FILM"
								}) : null,
								it.poster === "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: { color: "rgba(148,163,184,0.55)" },
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, { kind: it.kind })
								}) : null,
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: {
										position: "absolute",
										left: 0,
										right: 0,
										bottom: 0,
										padding: "16px 6px 4px",
										background: "linear-gradient(to top, rgba(2,6,23,0.92), rgba(2,6,23,0))",
										fontSize: 10,
										lineHeight: 1.35,
										color: "rgba(226,232,240,0.92)",
										display: "-webkit-box",
										WebkitLineClamp: 2,
										WebkitBoxOrient: "vertical",
										overflow: "hidden"
									},
									children: [it.head !== "" ? it.head + " — " : "", [it.time, it.file].filter(Boolean).join(" · ")]
								})
							]
						}, it.id))
					}),
					preview !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Overlay, {
						item: preview,
						onClose: () => {
							setPreview(null);
						}
					}) : null
				]
			});
		}
		//#endregion
		//#region src/client/index.ts
		/**
		* `@infer-media/dsh-media` — client half.
		*
		* Registers ONE native sidebar tab ("Media", order 55 — sits above the Melite
		* Media tab at 60) backed by the host half's merged /infer-media/runs route.
		* Tab contract mirrors the better-sidebar public registry (same shape the
		* melite-card-deck registers with): { id, title(), icon(size), order, single,
		* component }, disposed through the ctx.effect cleanup.
		*
		* This entry is deliberately JSX-free (the shared preset only discovers
		* src/client/index.ts); React elements are built with createElement and the
		* glyph lives in MediaPanel.tsx.
		*/
		const inject = ["slots", "betterSidebar"];
		function apply(ctx) {
			if (!claimMediaApply()) return;
			ctx.effect(() => releaseMediaApply, "infer-media: apply claim");
			const bs = ctx.betterSidebar;
			if (bs == null || typeof bs.registerTab !== "function") {
				console.warn("[infer-media] betterSidebar registry unavailable — tab not registered");
				return;
			}
			ctx.effect(() => {
				const dispose = bs.registerTab({
					id: "infer-media:media",
					title: () => "Media",
					icon: (size) => react.createElement(MediaTabIcon, { size }),
					order: 55,
					single: true,
					component: MediaPanel
				});
				let rounds = 0;
				const timer = window.setInterval(() => {
					rounds++;
					if (document.querySelector("[data-infer-media-panel]") != null || rounds > 12) {
						window.clearInterval(timer);
						return;
					}
					try {
						bs.openTab?.({ type: "infer-media:media" });
					} catch {
						window.clearInterval(timer);
					}
				}, 700);
				return () => {
					window.clearInterval(timer);
					if (typeof dispose === "function") dispose();
				};
			}, "infer-media: media tab");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map