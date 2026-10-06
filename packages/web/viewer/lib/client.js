window.__ModuleLoader__.load({
	id: "@melite/viewer",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_api_gateway_client = require("@deepseek-ai/dsh-api-gateway/client");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#endregion
		//#region ../../web-kit/contracts/src/stageView.ts
		/** The terminal word set, exported so a seat that needs to SHOW it
		*  (a poll's stop condition, a doc) reads the same list. Reconciled
		*  with the backend's RUN_STATUSES (catalog/src/runStatusContract.ts)
		*  2026-10-01: `interrupted` joined, and the file-era done words
		*  (`succeeded`, `success`) became terminal — a poller handed either
		*  previously ran to its ceiling. The card-plane words (done, cached,
		*  reused, skipped, stale) stay out: runs are never stamped with
		*  them; they describe artifacts, not run lifecycle. */
		const TERMINAL_RUN_STATUSES = /* @__PURE__ */ new Set([
			"completed",
			"failed",
			"stopped",
			"error",
			"unknown",
			"interrupted",
			"succeeded",
			"success"
		]);
		//#endregion
		//#region ../melite-run-wire/src/index.ts
		/** The list row's served artifact url onto the media route. The
		*  list's currency DIFFERS from the status door's: runArtifacts
		*  serves urls already prefixed with the run dir
		*  (`<runId>/<rel>` — `url: runBase + "/" + cand.rel`), while live
		*  stage urls are bare rels (runRel strips the dir). So the list
		*  url rides under the route root directly — prepending the run id
		*  again would double it. Absolute and rooted urls pass verbatim. */
		function listArtifactMediaUrl(url) {
			if (url === "") return null;
			if (/^(https?:\/\/|\/)/.test(url)) return url;
			return "/melite-media/runs/" + url.split("/").map((seg) => encodeURIComponent(seg)).join("/");
		}
		//#endregion
		//#region ../viewer-base/src/runCard.tsx
		/**
		* runCard.ts — the DEFAULT run-card view: one settled model-card call
		* (a call that returned {model, run_id, ...} for a gateway run)
		* rendered from the durable slice plus the run's artifacts.
		*
		* EVERY run card gets this row WITHOUT shipping any view code: the
		* composition (@melite/viewer's client half) claims the card's tool
		* name with `claimRunCardToolview` — the ui-tool built-ins pattern
		* (central default views; a card's own client half is a takeover, the
		* keyed slot's replacement arm). A card ships a client half only when
		* it has a specific override; all-defaults cards ship none.
		*
		* The row model is replay-stable exactly like ui-skill's SkillRow:
		* derived ONLY from the frozen call block — args for the prompt, the
		* card's presentationMeta projection on the settled node (the same
		* payload presentResult reads host-side; see image-gen's tool.ts) for
		* model/run/error. The gallery is the one live arm: it rides the run
		* resource's frames (runs/subscribe over the gateway's stream face),
		* handed down by the composition as the `runFrames` prop — the row
		* itself stays runtime-dep-free and presentational, deriving from
		* props only (the web-card law: raw events and persisted metadata,
		* never a fetch of its own). No source (a composition without the
		* estate's runs namespace) renders no gallery; the retired poll's
		* same-origin door answers 502 `estate_killed` by design since
		* 2026-09-10, so its answers were always the gone badge.
		*/
		/** Derive the row model from the durable slice alone (replay-safe). */
		function runCardModel(props) {
			const { block } = props;
			const settled = "kind" in block;
			const argsRaw = (settled ? block.call?.argsRaw : "argsRaw" in block ? block.argsRaw : void 0) ?? "";
			let prompt = null;
			try {
				const parsed = JSON.parse(argsRaw);
				if (typeof parsed.prompt === "string") prompt = parsed.prompt;
			} catch {}
			const meta = (settled ? block.meta : void 0) ?? {};
			const state = !settled ? "running" : typeof meta.error === "string" && meta.error !== "" ? "refused" : block.error?.code === "interrupted" ? "stopped" : block.isError ? "error" : "ok";
			const textParts = [];
			if (settled) for (const item of block.content) textParts.push(item.type === "text" ? item.text : JSON.stringify(item));
			return {
				state,
				model: typeof meta.model === "string" && meta.model !== "" ? meta.model : null,
				runId: typeof meta.run_id === "string" && meta.run_id !== "" ? meta.run_id : null,
				prompt,
				headline: textParts.join("\n") || null
			};
		}
		/** Ride the composition's run frames for the gallery arm. No source
		* (a composition without the estate's runs namespace) is no arm: the
		* state stays empty and the row renders its durable model alone. An
		* ended source keeps the last frame standing (the terminal row is the
		* source's own last yield). */
		function useRunGallery(runId, source) {
			const [state, setState] = (0, react.useState)({
				status: null,
				artifacts: []
			});
			(0, react.useEffect)(() => {
				if (runId === null || source === void 0) return;
				const controller = new AbortController();
				let stopped = false;
				(async () => {
					try {
						for await (const frame of source(runId, controller.signal)) {
							if (stopped) return;
							setState({
								status: frame.status,
								artifacts: frame.artifacts
							});
						}
					} catch (error) {
						console.error("[melite/viewer-base] run gallery tail failed:", error);
					}
				})();
				return () => {
					stopped = true;
					controller.abort();
				};
			}, [runId, source]);
			return state;
		}
		const DOT = {
			running: "ongoing",
			ok: "done",
			refused: "warning",
			error: "error",
			stopped: "warning"
		};
		function RunCardRow(props) {
			const { runFrames, ...view } = props;
			const model = runCardModel(view);
			const gallery = useRunGallery(model.state === "running" ? null : model.runId, runFrames);
			const badge = gallery.status ?? model.state;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-melite-run-card": true,
				style: {
					border: "1px solid rgba(128,128,128,0.35)",
					borderRadius: 8,
					padding: 10,
					fontSize: 13,
					lineHeight: 1.5
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: 8
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: DOT[model.state] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("strong", {
								style: { flex: 1 },
								children: [
									props.toolName,
									model.model !== null ? ` [${model.model}]` : "",
									model.runId !== null ? ` \u2192 ${model.runId}` : ""
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									opacity: .7,
									fontSize: 12
								},
								children: badge
							})
						]
					}),
					model.prompt !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							opacity: .75,
							marginTop: 6
						},
						children: model.prompt
					}),
					model.state === "refused" && model.headline !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							marginTop: 6,
							whiteSpace: "pre-wrap"
						},
						children: model.headline
					}),
					model.runId !== null && gallery.artifacts.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							display: "flex",
							gap: 8,
							flexWrap: "wrap",
							marginTop: 8
						},
						children: gallery.artifacts.flatMap((name) => {
							const url = listArtifactMediaUrl(name);
							return url === null ? [] : [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
								src: url,
								alt: name,
								loading: "lazy",
								style: {
									width: 128,
									height: 128,
									objectFit: "cover",
									borderRadius: 6,
									display: "block"
								}
							}, name)];
						})
					})
				]
			});
		}
		/**
		* Claim `tool.call.toolview` for one run card's wire tool name, with
		* the default row — the ui-skill registration shape (the
		* declaration-aware `slots.inject`, reconciling + disposal included).
		* `runFrames` (the composition's live-run source) rides the
		* registered component's props; absent, the row registers bare and
		* renders its durable model alone. Returns nothing; the claim lives
		* and dies with `ctx`.
		*
		* @param ctx the claiming composition's client ctx
		* @param toolName the card's wire tool name (the keyed slot's key)
		* @param label the effect's name (the composition's own line)
		* @param runFrames the live-run source the composition holds, if any
		*/
		function claimRunCardToolview(ctx, toolName, label, runFrames) {
			const Row = runFrames === void 0 ? RunCardRow : (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RunCardRow, {
				...props,
				runFrames
			});
			ctx.effect(() => ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
				name: "tool.call.toolview",
				key: toolName
			}, Row)), label);
		}
		//#endregion
		//#region src/client/index.ts
		/** The run cards this composition serves default views for. */
		const RUN_CARDS = [{
			name: "image_gen",
			label: "@melite/viewer: image_gen run-card claim"
		}];
		const TERMINAL = new Set(TERMINAL_RUN_STATUSES);
		/** Build the run-card gallery's live source: `runs/subscribe` through
		* the gateway's reconnecting RemoteStream, one frame per row that
		* moved — the run view's tail laws, held one-for-one where the
		* gallery has a face for them:
		*
		*  - NO FRAME SPAM: a frame yields only on row change (status or the
		*    artifacts' own bytes); the opening row is the baseline.
		*  - TERMINAL ROW: a settled run ends the source (the last frame
		*    stays as the gallery); the stream disposes.
		*  - ABORT: the holder's signal disposes the stream and ends the
		*    source clean.
		*  - CARRIER LOSS is voiceless for the gallery (the row's badge shows
		*    the last known status; the supervisor reconnects) — the run
		*    view's one-failure-frame voice is the view's own face, and a
		*    stream that ENDS in failure logs loud and ends, never throws:
		*    the last gallery state stands.
		*
		* @param remote the live remote face ($stream included)
		* @param runs the estate's runs namespace (runs/subscribe)
		* @returns the source the row's gallery arm consumes
		*/
		function viewerRunFrames(remote, runs) {
			return (runId, signal) => (async function* frames() {
				const stream = remote.$stream({
					name: "viewer run stream",
					open: (openSignal) => runs.subscribe(runId, openSignal),
					ended: (accepted) => new _deepseek_ai_dsh_api_gateway_client.RemoteStreamCarrierError(accepted ? `viewer run stream ended after its first frame (${runId})` : `viewer run stream ended before its first frame (${runId})`)
				});
				const onAbort = () => {
					stream.dispose();
				};
				if (signal.aborted) {
					onAbort();
					return;
				}
				signal.addEventListener("abort", onAbort, { once: true });
				const iterator = stream[Symbol.asyncIterator]();
				let first = true;
				let lastKey = "";
				try {
					for (;;) {
						const step = await iterator.next();
						if (step.done) return;
						const item = step.value;
						if (first) {
							item.accept();
							first = false;
						}
						const status = item.value["status"];
						if (typeof status !== "string") continue;
						const artifacts = Array.isArray(item.value["artifacts"]) ? item.value["artifacts"].filter((a) => typeof a === "string" && a !== "") : [];
						const key = status + "\n" + artifacts.join("\0");
						if (key === lastKey) continue;
						lastKey = key;
						yield {
							status,
							artifacts
						};
						if (TERMINAL.has(status)) return;
					}
				} catch (error) {
					console.error("[melite/viewer] run gallery stream failed:", error);
					return;
				} finally {
					signal.removeEventListener("abort", onAbort);
					await stream.dispose();
				}
			})();
		}
		const inject = ["slots", "remote"];
		function apply(ctx) {
			let runs;
			try {
				runs = ctx.get("remote.runs");
			} catch (error) {
				console.error("[melite/viewer] runs namespace read failed:", error);
			}
			const runFrames = runs === void 0 ? void 0 : viewerRunFrames(ctx.remote, runs);
			for (const card of RUN_CARDS) claimRunCardToolview(ctx, card.name, card.label, runFrames);
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.viewerRunFrames = viewerRunFrames;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
