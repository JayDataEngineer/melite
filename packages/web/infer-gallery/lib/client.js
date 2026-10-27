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
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let _melite_three_client_client = require("@melite/three-client/client");
		_melite_three_client_client = __toESM(_melite_three_client_client, 1);
		let _melite_card_base_client = require("@melite/card-base/client");
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		//#region \0dsh-css:packages/web/infer-gallery/src/client/overlay.module.css.mjs
		const css = ".P_5Nua_lightbox{width:min(1200px,96vw);max-width:96vw}.P_5Nua_dangerVerb{color:var(--dsw-alias-state-error-primary)}.P_5Nua_walkBtn{z-index:10;border:1px solid var(--dsw-alias-border-l3);border-radius:999px;width:40px;height:40px;padding:0;position:absolute;top:50%;transform:translateY(-50%)}.P_5Nua_walkBtn[aria-label=Previous\\ media]{left:10px}.P_5Nua_walkBtn[aria-label=Next\\ media]{right:10px}.P_5Nua_overlayClose{z-index:10;position:absolute;top:8px;right:8px}.P_5Nua_renameInput{width:min(280px,60vw)}.P_5Nua_wand{z-index:3;background:var(--dsw-alias-fill-subtle,#020617d1);color:var(--dsw-alias-state-warn-primary,#fde68a);letter-spacing:.4px;cursor:pointer;opacity:0;border-radius:6px;align-items:center;gap:4px;padding:4px 6px;font-family:inherit;font-size:9px;font-weight:700;transition:opacity .12s;display:flex;position:absolute;top:6px;right:6px}.P_5Nua_tile:hover .P_5Nua_wand,.P_5Nua_tile:focus-visible .P_5Nua_wand,.P_5Nua_wand:focus-visible{opacity:1}";
		const tagId = "@melite-plugin/dsh-gallery/overlay.module.css@71525c21";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite-plugin/dsh-gallery";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var overlay_module_css_default = {
			"dangerVerb": "P_5Nua_dangerVerb",
			"lightbox": "P_5Nua_lightbox",
			"overlayClose": "P_5Nua_overlayClose",
			"renameInput": "P_5Nua_renameInput",
			"tile": "P_5Nua_tile",
			"walkBtn": "P_5Nua_walkBtn",
			"wand": "P_5Nua_wand"
		};
		//#endregion
		//#region ../../web-kit/formats/src/glbLoad.ts
		/**
		* glbLoad — THE shared GLB loading kernel (2026-09-05 dedup order).
		*
		* One DRACO-configured GLTFLoader for the whole estate. Before this,
		* three independent copies of the same loader + shared-decoder dance
		* lived in the 3d plugin's viewers (Stage, AnimatedGLBViewer,
		* MeshPoster) — and glbSkin parsed with NO decoder at all (a
		* DRACO-compressed character GLB failed there while the same file
		* loaded fine one dialog over). The user's audit order was explicit:
		* the three 3d cards "should all render the same, and share most
		* render code."
		*
		* THE DECODER SHIPS LOCAL: the gstatic CDN path every copy hardcoded
		* (1.5.7) was both a hardcode and an offline SPOF. The decoder files
		* from three's own package (the exact pairing three@0.184 was tested
		* with) are copied into the editor's public tree
		* (public/draco/gltf/) and resolved through the vite BASE_URL —
		* correct in dev, in the built dist, and in the DSH embed that
		* serves dist under the same base. No network dependency.
		*
		* Consumers:
		*   • @melite-plugin/3d viewers (Stage, AnimatedGLBViewer, MeshPoster)
		*   • glbSkin (this package — character GLB → SomaSkin substrate)
		*   • anything else that needs the estate's ONE GLB parse policy
		*/
		let _draco = null;
		let _loader = null;
		/* v8 ignore next -- the shipped client bundles never carry BASE_URL
		* (the clientBundle preset defines import.meta.env as {MODE} only),
		* so the fallback IS the production path; under vitest the module
		* env always carries BASE_URL "/", making the right arm unreachable
		* here (modelCatalog.ts precedent, 2026-09-12). */
		const base = {}.env?.BASE_URL ?? "/";
		function dracoLoader() {
			if (!_draco) {
				_draco = new _melite_three_client_client.DRACOLoader();
				_draco.setDecoderPath(`${base}draco/gltf/`);
			}
			return _draco;
		}
		/** A GLTFLoader configured with the estate's shared DRACO decoder —
		*  for parse-based consumers (glbSkin parses pre-fetched bytes). */
		function makeGLTFLoader() {
			const loader = new _melite_three_client_client.GLTFLoader();
			loader.setDRACOLoader(dracoLoader());
			return loader;
		}
		/** Load a GLB/GLTF from a URL with the estate's shared DRACO-configured
		*  loader. One loader instance + one decoder worker pool for every
		*  consumer (the decoder worker is reused, never respawned per view). */
		function loadGLB(url) {
			if (!_loader) _loader = makeGLTFLoader();
			return new Promise((resolve, reject) => {
				_loader.load(url, resolve, void 0, reject);
			});
		}
		/**
		* Normalize a loaded scene to a known viewing size: center X/Z, scale
		* the largest dimension to `targetHeight`, feet on y=0. Mutates the
		* root IN PLACE (scale + position) and returns the computed box.
		*
		* The shared normalization every viewer applies — TRELLIS props,
		* SOMAX/Anny characters, and composite uploads arrive at wildly
		* different scales (cm, m, 100× unit boxes); this is the one place
		* that reconciles them, so the poster tile, the dialog viewer, and
		* the stage floor all frame the mesh identically.
		*/
		function fitObjectToHeight(root, targetHeight = 1.6) {
			const box = new _melite_three_client_client.Box3().setFromObject(root);
			const size = box.getSize(new _melite_three_client_client.Vector3());
			const center = box.getCenter(new _melite_three_client_client.Vector3());
			const maxDim = Math.max(size.x, size.y, size.z);
			const scale = maxDim > 0 ? targetHeight / maxDim : 1;
			root.scale.setScalar(scale);
			root.position.x = -center.x * scale;
			root.position.z = -center.z * scale;
			root.position.y = -box.min.y * scale;
			return box;
		}
		//#endregion
		//#region ../../web-kit/contracts/src/mediaKinds.ts
		/** The estate media-kind vocabulary (typed DATA — see header). */
		function mediaVocab() {
			return {
				image: [
					"png",
					"jpg",
					"jpeg",
					"webp",
					"gif",
					"svg",
					"bmp",
					"avif"
				],
				audio: [
					"wav",
					"flac",
					"mp3",
					"ogg",
					"m4a",
					"aac",
					"qvoice"
				],
				video: [
					"mp4",
					"webm",
					"mkv",
					"mov",
					"m4v",
					"avi"
				],
				model: ["glb", "gltf"],
				text: [
					"txt",
					"csv",
					"md",
					"json"
				],
				galleryImage: [
					"png",
					"jpg",
					"jpeg",
					"webp",
					"gif"
				],
				galleryAudio: [
					"wav",
					"flac",
					"ogg",
					"mp3"
				],
				galleryVideo: [
					"mp4",
					"webm",
					"mov"
				],
				galleryModel: ["glb", "gltf"],
				galleryText: [
					"txt",
					"csv",
					"md",
					"json"
				],
				maxListedImages: 3
			};
		}
		const KIND_BY_EXT = (() => {
			const table = {};
			const vocab = mediaVocab();
			[
				"video",
				"image",
				"audio",
				"model",
				"text"
			].forEach((kind) => {
				for (const ext of vocab[kind]) if (table[ext] === void 0) table[ext] = kind;
			});
			return table;
		})();
		/** The media kind a filename carries, or undefined for non-media. */
		function mediaKindOf(name) {
			const dot = name.lastIndexOf(".");
			if (dot < 0 || dot === name.length - 1) return void 0;
			return KIND_BY_EXT[name.slice(dot + 1).toLowerCase()];
		}
		/** Is this a 3D-MODEL url or data-URI? THE ONE spelling
		*  (2026-10-13, the card-UI duplication audit: five seats carried
		*  their own model regex and they had already drifted — one matched
		*  a query or fragment, two matched only a bare extension, so the
		*  same ".glb?v=2" classified as a model in one seat and as nothing
		*  in another. A new extension in the vocabulary reaches every seat
		*  through THIS.) Query and fragment are stripped before the
		*  vocabulary answers, and the glTF data-URI forms are recognised
		*  because a data URI has no extension. */
		function isModelUrl(value) {
			if (/^data:model\/gltf(?:-binary|\+json)[;,]/i.test(value)) return true;
			const withoutQuery = value.split(/[?#]/, 1)[0];
			return mediaKindOf(withoutQuery) === "model";
		}
		//#endregion
		//#region src/client/artifact-ops.ts
		/**
		* artifact-ops — the modal's delete + rename wires (the media
		* sidebar's popup modal on media stuff).
		*
		* Both doors ride the gallery host's SAME-ORIGIN mutating routes
		* (POST /infer-gallery/artifact-delete {path},
		* POST /infer-gallery/artifact-rename {path, name}) — the read
		* artifact route stays read-only, so a prefetcher can never mutate
		* by URL. Failures surface as thrown Errors carrying the door's
		* `error` code, never silent.
		*/
		/** The artifact's FILE NAME behind an artifact URL — THE ONE LAW
		*  (the operator's 2026-09-26 report: a real .glb was refused as
		*  `"artifact" is not a .glb/.gltf artifact`, because the media route
		*  serves `/infer-gallery/artifact?path=<run>/<file>` and the caller
		*  read the ROUTE's last path segment). `?path=` first, the plain URL
		*  path second (a directly-served file has no query). */
		function artifactNameOf(url) {
			const path = artifactPathOfUrl(url) ?? url.split("?")[0];
			return path.slice(path.lastIndexOf("/") + 1);
		}
		/** The run-relative artifact path behind one same-origin artifact
		*  URL (`/infer-gallery/artifact?path=run-<id>/<file>`) — null when
		*  the URL rides no such path (foreign URLs, card previews). */
		function artifactPathOfUrl(url) {
			try {
				const target = new URL(url, "http://artifact-ops.invalid").searchParams.get("path");
				return target !== null && target !== "" ? target : null;
			} catch {
				return null;
			}
		}
		async function refusalOf$1(res, answer) {
			const err = answer?.["error"];
			return typeof err === "string" && err !== "" ? err : "HTTP " + String(res.status);
		}
		/** Unlink one run-relative artifact file. */
		async function deleteArtifact(path) {
			let res;
			try {
				res = await fetch("/infer-gallery/artifact-delete", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ path })
				});
			} catch (e) {
				throw new Error("delete failed — " + (e instanceof Error ? e.message : String(e)));
			}
			if (!res.ok) {
				const answer = await res.json().catch(() => null);
				throw new Error("delete failed (" + await refusalOf$1(res, answer) + ")");
			}
		}
		/** Unlink several run-relative artifacts, one door call per file (the
		*  host route has no batch arm). A failure is RECORDED, not thrown:
		*  the remaining files still delete, and the caller voices the
		*  failures over the feed the survivor rows still render in. */
		async function deleteArtifacts(paths) {
			const failed = [];
			let deleted = 0;
			for (const path of paths) try {
				await deleteArtifact(path);
				deleted += 1;
			} catch (e) {
				failed.push({
					path,
					message: e instanceof Error ? e.message : String(e)
				});
			}
			return {
				deleted,
				failed
			};
		}
		/** Rename one artifact inside its own directory — resolves the new
		*  run-relative path + its same-origin URL (the preview re-points). */
		async function renameArtifact(path, name) {
			let res;
			try {
				res = await fetch("/infer-gallery/artifact-rename", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						path,
						name
					})
				});
			} catch (e) {
				throw new Error("rename failed — " + (e instanceof Error ? e.message : String(e)));
			}
			const answer = await res.json().catch(() => null);
			if (!res.ok) throw new Error("rename failed (" + await refusalOf$1(res, answer) + ")");
			const row = answer ?? {};
			if (typeof row.path !== "string" || typeof row.url !== "string") throw new Error("rename failed (bad_rename_answer)");
			return {
				path: row.path,
				url: row.url
			};
		}
		//#endregion
		//#region src/client/artifact-address.ts
		/**
		* artifact-address — the estate-artifact address codec, the one home of
		* the format (2026-09-10's cross-plugin contract, in-tree since the
		* mesh tab landed): `dsh-resource://estate-artifact/<b64url of the
		* same-origin artifact URL>`. Run artifacts live outside the DSH
		* workspace, so no document owner can read them; the native seam for
		* addressable non-workspace content is a resource address claimed by
		* this package's own tab type (the mesh seat). Both directions live
		* here because both seats ride this package — minting in MediaPanel,
		* decoding in the tab body.
		*/
		/** The address kind this package claims (see client index.ts). */
		const ARTIFACT_PREFIX = "dsh-resource://estate-artifact/";
		function b64uEncode(text) {
			const bytes = new TextEncoder().encode(text);
			let bin = "";
			for (const b of bytes) bin += String.fromCharCode(b);
			return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
		}
		function b64uDecode(seg) {
			const b64 = seg.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - seg.length % 4) % 4);
			const bin = atob(b64);
			const bytes = new Uint8Array(bin.length);
			for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
			return new TextDecoder().decode(bytes);
		}
		/** Mint one estate-artifact address from an artifact URL. */
		function estateArtifactAddress(url) {
			return ARTIFACT_PREFIX + b64uEncode(url);
		}
		/** The artifact URL behind one estate-artifact address — null when the
		*  address is not ours or its segment is malformed (a foreign or
		*  corrupt address never renders a tab body; the caller voices the
		*  refusal honestly). A valid non-empty segment cannot decode to an
		*  empty string (atob rejects padding-only inputs), so no length
		*  re-check follows the decode. */
		function artifactUrlOfAddress(address) {
			if (!address.startsWith("dsh-resource://estate-artifact/")) return null;
			const seg = address.slice(31);
			if (seg.length === 0) return null;
			try {
				return b64uDecode(seg);
			} catch {
				return null;
			}
		}
		//#endregion
		//#region src/client/galleryCopy.ts
		/**
		* galleryCopy.ts — THE INFER-GALLERY COPY DICTIONARY (the copy-scope
		* extension, 2026-11-05). Client UI copy is locale-owned (the estate's
		* decision, the DSH verify-client-ui-i18n law): presentation code owns
		* no copy literals; it consumes them here through the typed seat. A
		* second locale plugs into this dictionary without touching a single
		* gallery component.
		*
		* THE BOUND: static user-visible FACES live here (panel title, tab and
		* sort pills, select/confirm verbs, empty and failure states, aria
		* names, the walk + pagination faces, the kind labels, the mesh tile
		* and mesh viewer copy). Parameterized sentences whose shape is fixed
		* but whose slots are live live here as typed dict functions (the
		* square.ts pattern) — the site passes exactly the params the entry
		* declares. DATA never rides the dictionary: refusal-identity Error
		* leads (`delete failed —`, `rename failed (bad_rename_answer)`, the
		* `HTTP <status>` feed identity, the bench refusal formatting) stay in
		* artifact-ops/useFeed/bench-load — they are wire identities callers
		* and tests match, not presentation copy.
		*/
		/** The typed dictionary. Keys are stable copy ids. */
		// v8 ignore next -- exercised key-by-key by the copy wall's census arm
		const galleryCopy = {
			/** The panel's title face. */
			panelTitle: "Infer Media",
			/** The header stat line's runs/artifacts body. */
			statRunsArtifacts: (p) => `${p.runs} runs · ${p.artifacts} artifacts`,
			/** The header stat line's gateway-error suffix (pluralized). */
			statGatewayNotes: (p) => ` · ${p.count} gateway note${p.count > 1 ? "s" : ""}`,
			/** The header stat line's truncation suffix. */
			statCapped: (p) => ` · ${p.count} capped`,
			/** The header's boot-staged face: the persisted feed is painted
			*  while the fresh one seats (E2-3 arm 2 — instant first paint). */
			statStale: " · stale — refreshing",
			/** The flows tab's stat body (the drafts face's own count — the
			*  stale suffix rides it when the drafts feed is boot-staged,
			*  boot-feed audit F1: the flows tab never hydrates silently). */
			statDrafts: (p) => `${p.count} drafts`,
			/** The window tile's segment chip: the face shown is the run's
			*  final film, not this window segment's own frame (the previews
			*  cure class 2 — a poster-less video tile wears the film lead). */
			chipSegment: "SEGMENT",
			/** The flows tab pill face. */
			tabFlows: (p) => `Flows ${p.count}`,
			/** The artifacts tab pill face. */
			tabArtifacts: (p) => `Artifacts ${p.count}`,
			/** The sort pill: newest first. */
			sortNewest: "Newest",
			/** The sort pill: oldest first. */
			sortOldest: "Oldest",
			/** The sort pill: alphabetical by file. */
			sortAlpha: "A–Z",
			/** The multi-select toggle pill. */
			selectAction: "Select",
			/** The live selection count. */
			selectedCount: (p) => `${p.count} selected`,
			/** The selection-clearing pill. */
			clearAction: "Clear",
			/** The armed destructive pill (names the count). */
			confirmDelete: (p) => `Confirm delete ${p.count}?`,
			/** The un-armed destructive pill. */
			deleteSelected: "Delete selected",
			/** The search box placeholder. */
			searchPlaceholder: "search prompt, file…",
			/** The all-kinds chip face. */
			chipAll: "All",
			/** Kind label: video. */
			kindVideo: "Video",
			/** Kind label: images (the gallery's image face is plural). */
			kindImages: "Images",
			/** Kind label: audio. */
			kindAudio: "Audio",
			/** Kind label: 3D meshes (the tile badge's face too). */
			kindModel: "3D",
			/** Kind label: text artifacts. */
			kindText: "Text",
			/** The Media tab's chip + guide-row title (one home, both read it). */
			mediaTabTitle: "Media",
			/** The guide row's description under the Media title. */
			mediaTabGuide: "Every run's artifacts — the archive, with the lightbox, chips, search and the cards wand.",
			/** The estate-artifact tab's title when the address decodes to no file. */
			artifactFallbackTitle: "artifact",
			/** The empty flows face. */
			emptyDrafts: "no composed cards yet — build one in a chat.",
			/** A draft row's fallback kind word when the model is unknown. */
			draftKindFallback: "card",
			/** The explicit per-row restore affordance face (the operator's
			*  literal ask: the row click restores, but only this names it). */
			restoreAction: "Restore",
			/** A draft row's accessible restore name. */
			restoreDraftAria: (p) => `Restore ${p.name} onto the bench`,
			/** The open-failure banner lead. */
			openFailed: (p) => `open failed: ${p.error}`,
			/** The feed-failure banner lead. */
			feedFailed: (p) => `failed to load runs: ${p.error}`,
			/** The first-load face. */
			loadingRuns: "loading runs…",
			/** The empty-filter face. */
			noArtifacts: "no artifacts match.",
			/** The wand's accessible name. */
			wandAria: "Open as cards — this run",
			/** The in-flight restore voice beside the wand (never hover-gated). */
			restoringAction: "restoring…",
			/** The previous-page pill. */
			prevPage: "‹ Prev",
			/** The page position line. */
			pageOf: (p) => `page ${p.page} of ${p.pages} · ${p.count} artifacts`,
			/** The next-page pill. */
			nextPage: "Next ›",
			/** The idle chip's label. */
			tileLoadPreview: "Preview 3D",
			/** The armed seat's collapse affordance. */
			tileClosePreview: "Close preview",
			/** The idle chip's accessible name for one artifact. */
			tileLoadPreviewOf: (file) => `Load 3D preview of ${file}`,
			/** The canvas's accessible name for one artifact. */
			viewOf: (file) => `3D view of ${file}`,
			/** The .gltf honest failure (sidecar buffers the route never serves). */
			viewUnavailableGltf: "3D view unavailable — this .gltf references external buffers the media route does not serve. Download it to open it in a 3D tool.",
			/** The not-a-mesh honest failure, naming the file. */
			viewUnavailableNotArtifact: (p) => `3D view unavailable — "${p.name}" is not a .glb/.gltf artifact.`,
			/** The loading line for one artifact. */
			loadingFile: (file) => `loading ${file}…`,
			/** The estate-artifact tab's malformed-address refusal. */
			addressUnreadable: "artifact address unreadable — the viewer cannot decode it",
			/** The refresh button's busy face. */
			refreshBusy: "loading…",
			/** The refresh button's idle face. */
			refreshIdle: "refresh",
			/** One gateway's warning line. */
			gatewayNote: (p) => `gateway ${p.gateway}: ${p.message}`,
			/** The text view's fetch-failure face. */
			textLoadFailed: "the text could not load —",
			/** The generic loading word. */
			loadingWord: "loading…",
			/** The download link face for one artifact. */
			downloadFile: (file) => `download ${file}`,
			/** The sidebar hand-off link face. */
			openInSidebar: "open 3D view in sidebar",
			/** The modal title's fallback when the item has no file name. */
			previewTitleFallback: "media preview",
			/** The close button's accessible name. */
			closePreviewAria: "Close preview",
			/** The walk-previous button's accessible name. */
			prevMediaAria: "Previous media",
			/** The walk-next button's accessible name. */
			nextMediaAria: "Next media",
			/** The rename verb's face. */
			renameAction: "Rename",
			/** The rename verb's accessible name. */
			renameAria: "Rename media file",
			/** The delete verb's face. */
			deleteAction: "Delete",
			/** The delete verb's accessible name. */
			deleteAria: "Delete media file",
			/** The delete confirmation line, naming the file. */
			deleteConfirmLine: (file) => `Delete ${file}?`,
			/** The deleting busy face. */
			deletingWord: "Deleting…",
			/** The delete confirmation verb's face. */
			confirmDeleteWord: "Confirm delete",
			/** The delete confirmation verb's accessible name. */
			confirmDeleteAria: "Confirm delete media file",
			/** The cancel verb's face (both mutation flows). */
			cancelWord: "Cancel",
			/** The cancel verb's accessible name in the delete flow. */
			cancelDeleteAria: "Cancel delete",
			/** The rename input's accessible name. */
			renameInputAria: "New file name",
			/** The renaming busy face. */
			renamingWord: "Renaming…",
			/** The rename save verb's face. */
			saveWord: "Save",
			/** The rename save verb's accessible name. */
			saveRenameAria: "Save new file name",
			/** The cancel verb's accessible name in the rename flow. */
			cancelRenameAria: "Cancel rename",
			/** The lightbox's escape hint. */
			escHint: "Esc or click the mask to close"
		};
		//#endregion
		//#region src/client/ui.tokens.ts
		/**
		* Design tokens — every var(--dsw-alias-…) string in the media family
		* declared ONCE (audit F6). Numbered suffixes = same alias, different
		* fallback (opacity variants). Pinned by
		* tests/walls/ts/suites/media-sidebar.spec.ts (tokens single site).
		*/
		const bgBase1 = "var(--dsw-alias-bg-base, #000)";
		const bgBase2 = "var(--dsw-alias-bg-base, #0b0e14)";
		const bgBase3 = "var(--dsw-alias-bg-base, #422006)";
		const bgLayer1 = "var(--dsw-alias-bg-layer-1, #1e293b)";
		const bgLayer2 = "var(--dsw-alias-bg-layer-2, #0f172a)";
		const bgOverlay1 = "var(--dsw-alias-bg-overlay, rgba(127,29,29,0.35))";
		const borderL2 = "var(--dsw-alias-border-l2, rgba(148,163,184,0.25))";
		const fillSubtle2 = "var(--dsw-alias-fill-subtle, rgba(2,6,23,0.72))";
		/** Caption-scrim weight of the same fill token (the full port's
		*  single-site fix: the old package restated this raw spelling inline
		*  in ui.tsx — one token, one site, three weights). */
		const fillSubtleCaption = "var(--dsw-alias-fill-subtle, rgba(2,6,23,0.92))";
		const labelPrimary1 = "var(--dsw-alias-label-primary, rgb(226,232,240))";
		const labelPrimary2 = "var(--dsw-alias-label-primary, rgba(226,232,240,0.85))";
		const labelPrimary3 = "var(--dsw-alias-label-primary, rgba(226,232,240,0.92))";
		const labelSecondary2 = "var(--dsw-alias-label-secondary, rgba(148,163,184,0.9))";
		const stateBusinessPrimary = "var(--dsw-alias-state-business-primary, rgb(147,197,253))";
		const stateBusinessPrimaryBg2 = "var(--dsw-alias-state-business-primary-bg, rgba(59,130,246,0.28))";
		const stateWarnPrimary1 = "var(--dsw-alias-state-warn-primary, rgba(250,204,21,0.9))";
		const stateWarnPrimary2 = "var(--dsw-alias-state-warn-primary, rgba(250,204,21,0.92))";
		const textTertiary2 = "var(--dsw-alias-text-tertiary, rgba(148,163,184,0.75))";
		const textTertiary3 = "var(--dsw-alias-text-tertiary, rgba(148,163,184,0.8))";
		//#endregion
		//#region src/client/mesh-view.tsx
		/**
		* mesh-view — THE 3D VIEWPORT for the media plane (the operator's
		* 2026-09-26 order, paraphrased: 3d output is hooked into the media
		* doors, visually. A `.glb` artifact opens HERE, in the drilldown,
		* orbitable — not as a download link with a sidebar hand-off.
		*
		* WHY IT LIVES IN THE GALLERY (and not as another viewer): a 3D run's
		* artifact is a MEDIA artifact, and the media drilldown is the one face
		* every surface already shares (the gallery tiles AND the cards' stage
		* zoom both route through `MediaDrilldown`). The 3D case was the only
		* kind that did not render — it degraded to a link, so a mesh artifact
		* was reachable but never VIEWABLE in the product.
		*
		* SUBSTRATE LAW (verbatim from card-base/glb-stage.tsx): RAW three.js,
		* an imperative scene in an effect, NO @react-three — r3f's bundled
		* react-reconciler version-skews against the seeded React internals and
		* crashes at boot. And ONE substrate: this mounts the estate's shared
		* stage core (`@melite/card-base/client`, the same module every card
		* viewport mounts) and loads through the estate's ONE GLB parse policy
		* (`@melite/formats/glbLoad` — the single DRACO-configured GLTFLoader
		* and the single autoFit normalization). It is a VIEWER, not a second
		* loader: no GLTFLoader, no DRACOLoader, no autoFit copy here.
		*
		* THE HONEST-FAILURE LAW: a viewer that cannot show the mesh says so
		* in words. WebGL refusal (no context), a decode failure, and an
		* unsupported extension each render their own copy — the artifact stays
		* downloadable either way, because "we could not render it" must never
		* become "we lost it".
		*/
		/** Extensions the shared loader can parse. `.gltf` is accepted by the
		*  loader but a bare `.gltf` usually references sidecar buffers the
		*  artifact route does not serve next to it — so the copy below names
		*  the case rather than letting the fetch fail as a decode error. */
		function unsupportedCopy(url) {
			/* v8 ignore next 3 -- String#split always returns at least one
			* element ("" splits to [""]), so index 0 is a string and the ??
			* guarded an impossibility the type already forbids. */
			const path = artifactPathOfUrl(url) ?? url.split("?")[0] ?? "";
			if (path.toLowerCase().endsWith(".gltf")) return galleryCopy.viewUnavailableGltf;
			if (!isModelUrl(path))
 /* v8 ignore next 2 -- same: split never yields an empty array, so
			* pop() returns the last segment as a string. */
			return galleryCopy.viewUnavailableNotArtifact({ name: path.split("/").pop() ?? url });
			return null;
		}
		/** Frame the camera on the loaded root: target the box centre, pull
		*  back by its bounding sphere. A fixed camera seat (the card stage's
		*  [2.2,1.6,2.6]) frames a 1.6m creature and crops a 40m prop; the
		*  drilldown shows every model's extents, so the framing is derived. */
		function frameCamera(stage, root) {
			const box = new _melite_three_client_client.Box3().setFromObject(root);
			if (box.isEmpty()) return;
			const center = box.getCenter(new _melite_three_client_client.Vector3());
			const radius = Math.max(box.getBoundingSphere(new _melite_three_client_client.Sphere()).radius, .001);
			stage.controls.target.copy(center);
			stage.camera.position.set(center.x + radius * 1.4, center.y + radius * .9, center.z + radius * 1.7);
			stage.camera.near = Math.max(radius / 1e3, 1e-4);
			stage.camera.far = radius * 100;
			stage.camera.updateProjectionMatrix();
			stage.controls.update();
		}
		/** Dispose a loaded glTF subtree (geometries + materials + textures).
		*  The modal mounts and unmounts on every artifact walk; without this
		*  each open leaks a 33MB mesh's GPU buffers. */
		function disposeRoot(root) {
			root.traverse((o) => {
				const mesh = o;
				if (mesh.geometry !== void 0 && typeof mesh.geometry.dispose === "function") mesh.geometry.dispose();
				const material = mesh.material;
				if (material === void 0) return;
				for (const m of Array.isArray(material) ? material : [material]) {
					for (const value of Object.values(m)) if (value !== null && typeof value === "object" && typeof value.isTexture === "boolean" && value.isTexture) value.dispose();
					m.dispose();
				}
			});
		}
		/** The 3D face. Renders a canvas, a loading line, or an honest
		*  failure line — never a blank box. */
		function MeshView({ url, file, height = "52vh" }) {
			const canvasRef = react.useRef(null);
			const [failure, setFailure] = react.useState(null);
			const [loading, setLoading] = react.useState(true);
			react.useEffect(() => {
				const unsupported = unsupportedCopy(url);
				if (unsupported !== null) {
					setFailure(unsupported);
					setLoading(false);
					return;
				}
				const canvas = canvasRef.current;
				/* v8 ignore next 2 -- React assigns refs BEFORE an effect runs, and
				* this effect only exists on the path that rendered the canvas, so
				* the ref is the element. */
				if (canvas === null) return;
				let stage = null;
				let root = null;
				let cancelled = false;
				let disposeEnv = null;
				stage = (0, _melite_card_base_client.mountStage3D)(canvas, {
					fov: 40,
					toneMapping: _melite_three_client_client.NoToneMapping,
					onContextFailure: (msg) => {
						if (!cancelled) setFailure(`3D view unavailable — WebGL refused the canvas (${msg}).`);
					}
				});
				if (stage === null) {
					setLoading(false);
					return;
				}
				stage.scene.add(new _melite_three_client_client.HemisphereLight(16777215, 9079434, 1.4));
				const key = new _melite_three_client_client.DirectionalLight(16777215, 2.2);
				key.position.set(3, 5, 2);
				stage.scene.add(key);
				try {
					const pmrem = new _melite_three_client_client.PMREMGenerator(stage.renderer);
					const envRT = pmrem.fromScene(new _melite_three_client_client.RoomEnvironment(), .04);
					stage.scene.environment = envRT.texture;
					stage.scene.environmentIntensity = .85;
					disposeEnv = () => {
						if (stage !== null) stage.scene.environment = null;
						envRT.dispose();
						pmrem.dispose();
					};
				} catch {
					disposeEnv = null;
				}
				loadGLB(url).then((gltf) => {
					if (cancelled) {
						disposeRoot(gltf.scene);
						return;
					}
					root = gltf.scene;
					fitObjectToHeight(gltf.scene, 1.6);
					stage?.scene.add(gltf.scene);
					if (stage !== null) frameCamera(stage, gltf.scene);
					setLoading(false);
				}, (e) => {
					if (cancelled) return;
					setLoading(false);
					setFailure(`3D view unavailable — ${file} failed to load (${e instanceof Error ? e.message : String(e)}).`);
				});
				return () => {
					cancelled = true;
					if (root !== null) {
						stage?.scene.remove(root);
						disposeRoot(root);
					}
					disposeEnv?.();
					stage?.dispose();
				};
			}, [url, file]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					flexDirection: "column",
					gap: 6,
					alignItems: "center",
					width: "100%"
				},
				children: [
					failure === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("canvas", {
						ref: canvasRef,
						"data-testid": "mesh-view-canvas",
						"aria-label": galleryCopy.viewOf(file),
						style: {
							width: "100%",
							height,
							maxHeight: "72vh",
							display: "block",
							borderRadius: 8,
							background: bgBase1,
							touchAction: "none"
						}
					}) : null,
					failure !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						"data-testid": "mesh-view-failure",
						style: {
							width: "100%",
							minHeight: 120,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							textAlign: "center",
							padding: 16,
							borderRadius: 8,
							background: bgBase1,
							color: stateWarnPrimary1,
							fontSize: 13,
							lineHeight: 1.5
						},
						children: failure
					}) : null,
					failure === null && loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						"data-testid": "mesh-view-loading",
						style: {
							color: textTertiary3,
							fontSize: 12
						},
						children: galleryCopy.loadingFile(file)
					}) : null
				]
			});
		}
		/** The estate-artifact tab body: the address IS the data (the b64url
		*  segment decodes to the artifact URL — see artifact-address.ts). A
		*  malformed segment is this package's own bug and voices itself as
		*  the mesh seat's honest-failure copy, never a blank pane. Absent
		*  hook (headless harnesses) renders the same honest refusal. */
		function ArtifactTabBody({ useTabInfo }) {
			const tabInfo = useTabInfo !== void 0 ? useTabInfo() : void 0;
			const url = tabInfo !== void 0 ? artifactUrlOfAddress(tabInfo.tab.navigation.address) : null;
			if (url === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-testid": "mesh-view-failure",
				style: {
					width: "100%",
					minHeight: 120,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					textAlign: "center",
					padding: 16,
					borderRadius: 8,
					background: bgBase1,
					color: stateWarnPrimary1,
					fontSize: 13,
					lineHeight: 1.5
				},
				children: galleryCopy.addressUnreadable
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MeshView, {
				url,
				file: artifactNameOf(url),
				height: "72vh"
			});
		}
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
		/** Text artifact view (the text-kind stroke, 2026-10-24): the
		*  words FETCHED and shown in the modal — a text artifact the
		*  operator can read and copy, with the same download link the mesh
		*  seat carries (a fetch that refuses must not strand the file). */
		function TextView({ item }) {
			const [body, setBody] = react.useState(null);
			const [failed, setFailed] = react.useState(false);
			react.useEffect(() => {
				let alive = true;
				setBody(null);
				setFailed(false);
				fetch(item.url).then((r) => {
					if (!r.ok) throw new Error(String(r.status));
					return r.text();
				}).then((t) => {
					if (alive) setBody(t);
				}).catch(() => {
					if (alive) setFailed(true);
				});
				return () => {
					alive = false;
				};
			}, [item.url]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					flexDirection: "column",
					gap: 10,
					alignItems: "center",
					width: "100%"
				},
				children: [body !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
					"data-testid": "drill-text-body",
					style: {
						width: "min(860px, 90vw)",
						maxHeight: "60vh",
						overflow: "auto",
						margin: 0,
						padding: 14,
						borderRadius: 8,
						background: bgBase1,
						color: labelPrimary2,
						fontSize: 13,
						lineHeight: 1.55,
						whiteSpace: "pre-wrap",
						wordBreak: "break-word",
						textAlign: "left",
						fontFamily: "ui-monospace, monospace"
					},
					children: body
				}) : failed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					"data-testid": "drill-text-failed",
					style: {
						color: labelPrimary2,
						fontSize: 14
					},
					children: galleryCopy.textLoadFailed
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					"data-testid": "drill-text-loading",
					style: {
						color: labelPrimary2,
						fontSize: 14
					},
					children: galleryCopy.loadingWord
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
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
					children: galleryCopy.downloadFile(item.file)
				})]
			});
		}
		/** 3D artifact view — THE MESH RENDERS HERE, IN THE MODAL (the
		*  operator's 2026-09-26 order: the 3D lane is hooked into the media
		*  plane with a real visual door). `MeshView` mounts the estate's shared
		*  stage core + the shared GLB loader, so a `.glb` is orbitable in the
		*  drilldown exactly as an image is visible in the drilldown — no
		*  sidebar round-trip required to see the artifact.
		*
		*  The two links under the canvas stay, and both are load-bearing:
		*  the sidebar hand-off (an estate-artifact RESOURCE address claimed by
		*  a viewer tab type — a bigger, docked orbit beside the run list) and
		*  the download (when WebGL or the decode refuses, or the viewer plugin
		*  is absent, the artifact must still be reachable). openArtifact is
		*  OPTIONAL: a surface with no sidebar door (the card zoom) hides that
		*  link and keeps the canvas + the download. */
		function ModelView({ item, openArtifact }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					flexDirection: "column",
					gap: 10,
					alignItems: "center",
					width: "100%"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MeshView, {
						url: item.url,
						file: item.file
					}),
					openArtifact !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
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
						children: galleryCopy.openInSidebar
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
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
						children: galleryCopy.downloadFile(item.file)
					})
				]
			});
		}
		/** THE MEDIA DRILLDOWN (the gallery Overlay, verbatim — one face).
		* THE WALK ARROWS (2026-09-20, the operator's catch: "where are my
		* side arrows when I open an image so scroll through to others"):
		* an OPTIONAL sibling walk — the caller passes the visible list;
		* arrows render only when there is more than one to walk. The
		* arrows paint their OWN chip (explicit bg + label tokens — the
		* white-✕ lesson: never inherit the page's text color on a
		* self-painted surface), walk WRAP-AROUND, and the keyboard
		* ArrowLeft/ArrowRight ride the same verbs. No siblings = exactly
		* the old face (both call sites unchanged until wired). */
		function MediaDrilldown({ item, onClose, openArtifact, siblings, onNavigate, onDelete, onRename }) {
			const walkable = siblings ?? [];
			const at = walkable.findIndex((s) => s.url === item.url);
			const seat = react.useRef(null);
			react.useEffect(() => {
				seat.current?.focus();
			}, []);
			const canWalk = onNavigate !== void 0 && walkable.length > 1 && at >= 0;
			const atHead = at === 0;
			const atTail = at === walkable.length - 1;
			const step = (delta) => {
				const next = at + delta;
				if (next < 0 || next >= walkable.length) return;
				onNavigate(walkable[next]);
			};
			const onKey = (e) => {
				if (!canWalk) return;
				if (e.key === "ArrowLeft") {
					e.stopPropagation();
					step(-1);
				}
				if (e.key === "ArrowRight") {
					e.stopPropagation();
					step(1);
				}
			};
			react.useEffect(() => {
				const nat = (e) => {
					onKey(e);
				};
				window.addEventListener("keydown", nat);
				return () => {
					window.removeEventListener("keydown", nat);
				};
			});
			const [mode, setMode] = react.useState("idle");
			const [draftName, setDraftName] = react.useState("");
			const [busy, setBusy] = react.useState(false);
			const [opError, setOpError] = react.useState("");
			const inflight = react.useRef(false);
			const mountedRef = react.useRef(true);
			const seatUrlRef = react.useRef(item.url);
			react.useEffect(() => () => {
				mountedRef.current = false;
			}, []);
			react.useEffect(() => {
				seatUrlRef.current = item.url;
				setMode("idle");
				setDraftName("");
				setBusy(false);
				setOpError("");
				inflight.current = false;
			}, [item.url]);
			const canDelete = onDelete !== void 0;
			const canRename = onRename !== void 0;
			const showActions = canDelete || canRename;
			const startDelete = () => {
				setOpError("");
				setMode("confirmDelete");
			};
			const confirmDelete = () => {
				if (onDelete === void 0 || inflight.current) return;
				const seat = item.url;
				inflight.current = true;
				setBusy(true);
				setOpError("");
				onDelete(item).catch((e) => {
					if (!mountedRef.current || seatUrlRef.current !== seat) return;
					setOpError(e instanceof Error ? e.message : String(e));
				}).finally(() => {
					inflight.current = false;
					if (!mountedRef.current || seatUrlRef.current !== seat) return;
					setBusy(false);
					setMode("idle");
				});
			};
			const startRename = () => {
				setOpError("");
				setDraftName(item.file);
				setMode("renaming");
			};
			const confirmRename = () => {
				if (onRename === void 0 || inflight.current) return;
				const name = draftName.trim();
				if (name === "" || name === item.file) return;
				const seat = item.url;
				inflight.current = true;
				setBusy(true);
				setOpError("");
				onRename(item, name).catch((e) => {
					if (!mountedRef.current || seatUrlRef.current !== seat) return;
					setOpError(e instanceof Error ? e.message : String(e));
				}).finally(() => {
					inflight.current = false;
					if (!mountedRef.current || seatUrlRef.current !== seat) return;
					setBusy(false);
					setMode("idle");
				});
			};
			const actionBtn = (label, verb, opts) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "outline",
				size: "sm",
				"aria-label": opts.aria,
				"data-testid": opts.testid,
				disabled: busy,
				className: opts?.danger === true ? overlay_module_css_default.dangerVerb : void 0,
				onClick: (e) => {
					e.stopPropagation();
					verb();
				},
				children: label
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose,
				title: item.file || galleryCopy.previewTitleFallback,
				headless: true,
				className: overlay_module_css_default.lightbox,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					ref: seat,
					tabIndex: -1,
					style: {
						position: "relative",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						gap: 14,
						padding: 24,
						outline: "none"
					},
					onKeyDown: onKey,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							"aria-label": galleryCopy.closePreviewAria,
							variant: "ghost",
							size: "sm",
							onClick: onClose,
							className: overlay_module_css_default.overlayClose,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, {})
						}),
						canWalk ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							"aria-label": galleryCopy.prevMediaAria,
							"data-testid": "drill-prev",
							disabled: atHead,
							onClick: () => {
								step(-1);
							},
							className: overlay_module_css_default.walkBtn,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronLeftOutlineRegular, { size: 20 })
						}) : null,
						canWalk ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							"aria-label": galleryCopy.nextMediaAria,
							"data-testid": "drill-next",
							disabled: atTail,
							onClick: () => {
								step(1);
							},
							className: overlay_module_css_default.walkBtn,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutlineRegular, { size: 20 })
						}) : null,
						item.kind === "video" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("video", {
							src: item.url,
							controls: true,
							autoPlay: true,
							playsInline: true,
							style: {
								width: "100%",
								maxHeight: "72vh",
								objectFit: "contain",
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
						}) : item.kind === "text" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextView, { item }) : item.kind === "image" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
							src: item.url,
							alt: item.file,
							style: {
								width: "100%",
								maxHeight: "72vh",
								objectFit: "contain",
								borderRadius: 8
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
						showActions ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								display: "flex",
								alignItems: "center",
								gap: 8,
								flexWrap: "wrap",
								justifyContent: "center"
							},
							onClick: (e) => {
								e.stopPropagation();
							},
							children: mode === "idle" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [canRename ? actionBtn(galleryCopy.renameAction, startRename, {
								testid: "drill-rename",
								aria: galleryCopy.renameAria
							}) : null, canDelete ? actionBtn(galleryCopy.deleteAction, startDelete, {
								danger: true,
								testid: "drill-delete",
								aria: galleryCopy.deleteAria
							}) : null] }) : mode === "confirmDelete" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										color: labelPrimary2,
										fontSize: 12
									},
									children: galleryCopy.deleteConfirmLine(item.file)
								}),
								actionBtn(busy ? galleryCopy.deletingWord : galleryCopy.confirmDeleteWord, confirmDelete, {
									danger: true,
									testid: "drill-delete-confirm",
									aria: galleryCopy.confirmDeleteAria
								}),
								actionBtn(galleryCopy.cancelWord, () => {
									setMode("idle");
									setOpError("");
								}, {
									testid: "drill-delete-cancel",
									aria: galleryCopy.cancelDeleteAria
								})
							] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									"aria-label": galleryCopy.renameInputAria,
									"data-testid": "drill-rename-input",
									value: draftName,
									disabled: busy,
									className: overlay_module_css_default.renameInput,
									onChange: (e) => {
										setDraftName(e.target.value);
									},
									onKeyDown: (e) => {
										e.stopPropagation();
										if (e.key === "Enter") confirmRename();
										if (e.key === "Escape") {
											setMode("idle");
											setOpError("");
										}
									}
								}),
								actionBtn(busy ? galleryCopy.renamingWord : galleryCopy.saveWord, confirmRename, {
									testid: "drill-rename-save",
									aria: galleryCopy.saveRenameAria
								}),
								actionBtn(galleryCopy.cancelWord, () => {
									setMode("idle");
									setOpError("");
								}, {
									testid: "drill-rename-cancel",
									aria: galleryCopy.cancelRenameAria
								})
							] })
						}) : null,
						opError !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							"data-testid": "drill-op-error",
							style: {
								color: stateWarnPrimary1,
								fontSize: 12
							},
							children: opError
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								color: textTertiary3,
								fontSize: 12
							},
							children: galleryCopy.escHint
						})
					]
				})
			});
		}
		//#endregion
		//#region ../../web-kit/contracts/src/benchStage.ts
		/** The card plane's engine (the estate composes cards on ComfyUI by
		*  construction — the card arm's own law). Derived, never authored:
		*  a stage that names a CARD and no engine is a card stage. A stage
		*  that names no card and no engine is an mcp/flow stage and must say
		*  where it runs — never guessed. */
		const CARD_PLANE_ENGINE$1 = "comfyui";
		/** The LIVE run-media spelling. */
		const RUN_MEDIA_PREFIX$1 = "/melite-media/runs";
		/** The spelling that died with the gateway app. Still SERVED forever
		*  (the media route mounts both names) and healed on every write
		*  here — nothing new is ever written dead, and nothing stored ever
		*  breaks. */
		const LEGACY_RUN_MEDIA_PREFIX$1 = "/v1/assets/runs";
		/** The run-media prefix a path addresses, or null when it addresses
		*  none (the caller leaves such a value verbatim — this is a rewrite,
		*  never a filter). */
		function runMediaPrefixOf$1(value) {
			if (value === "/melite-media/runs" || value.startsWith("/melite-media/runs/")) return RUN_MEDIA_PREFIX$1;
			if (value === "/v1/assets/runs" || value.startsWith("/v1/assets/runs/")) return LEGACY_RUN_MEDIA_PREFIX$1;
			return null;
		}
		/** THE ONE SPELLING: a run-media path in any spelling becomes the
		*  live one. Everything else — a local file, an https URL, a $spell,
		*  a run-relative name — rides verbatim. */
		function canonicalRunMediaUrl$1(value) {
			const prefix = runMediaPrefixOf$1(value);
			if (prefix === null || prefix === "/melite-media/runs") return value;
			return RUN_MEDIA_PREFIX$1 + value.slice(prefix.length);
		}
		/** Rewrite every legacy run-media path inside a value (deep,
		*  value-preserving, total). */
		function healRunMediaPaths$1(value) {
			if (typeof value === "string") return canonicalRunMediaUrl$1(value);
			if (Array.isArray(value)) return value.map((x) => healRunMediaPaths$1(x));
			if (value !== null && typeof value === "object") {
				const out = {};
				for (const [k, v] of Object.entries(value)) out[k] = healRunMediaPaths$1(v);
				return out;
			}
			return value;
		}
		/** What a RESTORE strips before re-stamping the stage that actually
		*  ran (the gallery's law — a bench never shows another run's
		*  outputs). */
		const RESTORE_STRIP_KEYS$1 = [
			"result",
			"resultParams",
			"runStatus",
			"resolved",
			"history"
		];
		/** Strip a list of keys off a row (in place — the arm owns the row). */
		function stripKeys$1(row, keys) {
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
		function stageEngineOf$1(row) {
			const own = row["engine"];
			if (typeof own === "string" && own !== "") return own;
			return CARD_PLANE_ENGINE$1;
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
		function normalizeBenchStage$1(row, index) {
			const out = row !== null && typeof row === "object" && !Array.isArray(row) ? { ...row } : {};
			if (typeof out["id"] !== "string") out["id"] = typeof index === "number" ? "s_" + String(index) : index;
			out["engine"] = stageEngineOf$1(out);
			const ins = out["inputs"];
			out["inputs"] = ins !== null && typeof ins === "object" && !Array.isArray(ins) ? healRunMediaPaths$1({ ...ins }) : {};
			const params = out["params"];
			const healed = healRunMediaPaths$1(params !== null && typeof params === "object" && !Array.isArray(params) ? params : {});
			const rowCard = out["card"];
			stripSelfNamedModel$1(rowCard, healed);
			out["params"] = healed;
			const outputs = out["outputs"];
			out["outputs"] = outputs !== null && typeof outputs === "object" && !Array.isArray(outputs) ? { ...outputs } : typeof rowCard === "string" && rowCard !== "" ? {} : { default: "image" };
			return out;
		}
		/**
		* THE RUN ID GRAMMAR (2026-10-10, the bypass audit's MEDIUM-2: it was
		* spelled in five modules — the media route, the source echo, the
		* gallery, and two agent tools — with no pin, so a change to the mint
		* would have some readers accept and some refuse, silently).
		* A run id is `run-<hex>-<token>`; the media route's parse and every
		* reader that keys a path by it use this one.
		*/
		/** THE SESSION GRAMMAR — the bench key (the identity law, 2026-09-28).
		*
		*  This grammar was spelled in FOUR places: the drafts owner, two
		*  inline copies in melite-construct (the agent's bench key), and
		*  the browser's own. The grammar wall pinned the server and two
		*  clients, so tightening ONE copy left the whole suite green — a
		*  copy the wall does not name is a copy the wall does not hold.
		*
		*  The contract floor owns it now, and both sides import it: the
		*  drafts package re-exports it for its own callers, the agent tool
		*  reads it, and the wall bans the inline spelling everywhere else.
		*  A bench key is an ADDRESS (it names a stored document), and an
		*  address has one grammar. */
		/** THE RESTORED-PROVENANCE SPELLING (the identity law, 2026-09-28).
		*
		*  "restored" is the coordinate the model-repair law reads: a row
		*  that came off an archive is exempt from the live admission, and a
		*  live composer's typo of it is refused. It was WRITTEN as a bare
		*  literal in five places (the drafts reader, the snapshot restore,
		*  and three client restore arms) while the estate's door already
		*  carried a named spelling — a door and its callers reading the same
		*  coordinate from two sources. The contract floor owns it now, and
		*  the door re-exports it, so every reader and every writer agree by
		*  construction. */
		const RESTORED_PROVENANCE_SPELLING$1 = "restored";
		const SESSION_RE$1 = /^[A-Za-z0-9_-]{1,64}$/;
		const RUN_ID_RE$1 = /^run-[0-9a-f]+-[A-Za-z0-9_-]+$/;
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
		function benchSessionOf$1(id) {
			return typeof id === "string" && SESSION_RE$1.test(id) ? id : "main";
		}
		/** THE PARSE-EDGE / TEST MINT: brand a draft id read off the wire or
		*  disk (route the typeof-guarded value through here at the door
		*  that pulled it), or mint a test literal. One line, no runtime
		*  validation — the brand is compile-time-only; the return cast is
		*  the construction door (the newRunId pattern).
		*  @param literal the plain draft id string at its parse edge
		*  @returns the same string, branded for the typed seats downstream */
		function draftIdOf$1(literal) {
			return literal;
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
		function runTailOf$1(path) {
			const segments = path.split("/");
			let found;
			for (let i = 0; i < segments.length - 1; i++) {
				if (segments[i + 1] === "") continue;
				if (RUN_ID_RE$1.test(segments[i])) found = segments.slice(i).join("/");
			}
			return found;
		}
		/**
		* THE CARDS WHOSE OWN ID IS ALSO A FAMILY (2026-10-10, the work
		* audit's R5). `anny` is the original: the card boards the `anny`
		* family, and its compose declares `requiresModel: false` (its
		* weights ride provisions, not a model choice). A row stating
		* `model: 'anny'` is a real boarding, not the era's family-less
		* compose residue — so the self-naming strip leaves it alone, the row
		* is judged with its model present, and the read-back shows what the
		* operator wrote.
		*
		* `h3-timeline` joined 2026-09-28 (the closure gate's A-C1 fix): the
		* film card's id collides with its own DEFAULT LANE id, and the
		* h3_timeline tool writes `model: "h3-timeline"` on every explicit
		* call — the strip was silently eating the operator's lane choice
		* from both the judged view and the stored row (the one-spelling
		* law: what the operator wrote is what is judged and read back).
		*
		* A new card whose id is also a family id must be ADDED here, and the
		* self-naming-strip wall (closure-gate RULE 4c, live-registry derived
		* with floors and two-way equality) fails when a card's own id is a
		* family but is missing from this list.
		*/
		const SELF_NAMED_FAMILIES$1 = /* @__PURE__ */ new Set(["anny", "h3-timeline"]);
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
		function stripSelfNamedModel$1(card, params) {
			if (typeof card !== "string" || card === "") return;
			if (typeof params !== "object" || params === null || Array.isArray(params)) return;
			const bag = params;
			if (bag["model"] !== card) return;
			if (SELF_NAMED_FAMILIES$1.has(card)) return;
			delete bag["model"];
		}
		//#endregion
		//#region ../../web-kit/contracts/src/benchSnapshot.ts
		function isRecord(v) {
			return typeof v === "object" && v !== null && !Array.isArray(v);
		}
		/** THE LOAD-CRITICAL ROW LAW (see the module doc). Returns the
		* row's problem, or null when the row loads. */
		function rowProblem(row, at) {
			if (!isRecord(row)) return `stages[${at}]: not an object`;
			const id = row["id"];
			if (typeof id !== "string" || id === "") return `stages[${at}]: id must be a non-empty string`;
			const params = row["params"];
			if (params !== void 0 && !isRecord(params)) return `stages[${at}]: params must be an object`;
			const inputs = row["inputs"];
			if (inputs !== void 0 && !isRecord(inputs)) return `stages[${at}]: inputs must be an object`;
			const engine = row["engine"];
			if (engine !== void 0 && typeof engine !== "string") return `stages[${at}]: engine must be a string`;
			const card = row["card"];
			if (card !== void 0 && typeof card !== "string") return `stages[${at}]: card must be a string`;
			const children = row["children"];
			if (children !== void 0 && !Array.isArray(children)) return `stages[${at}]: children must be an array`;
			return null;
		}
		/** Judge a stage list exactly as the loader consumes it (the
		* wrapper below is its only public face). */
		function parseBenchSnapshotStages(value) {
			if (!Array.isArray(value)) return {
				ok: false,
				problems: ["stages: must be an array"]
			};
			const stages = [];
			const problems = [];
			for (let i = 0; i < value.length; i++) {
				const problem = rowProblem(value[i], i);
				if (problem !== null) problems.push(problem);
				else stages.push(value[i]);
			}
			if (problems.length > 0) return {
				ok: false,
				problems
			};
			return {
				ok: true,
				value: stages
			};
		}
		/** Judge a `bench_snapshot` body exactly as the loader consumes
		* it. A partial row set is NOT a pass — one bad row refuses the
		* whole snapshot (the loader posts the list whole; a silent
		* partial restore is the fabrication this contract exists to
		* kill). */
		function parseBenchSnapshot(value) {
			if (!isRecord(value)) return {
				ok: false,
				problems: ["bench_snapshot: not an object"]
			};
			const stages = parseBenchSnapshotStages(value["stages"]);
			if (!stages.ok) return {
				ok: false,
				problems: stages.problems.map((p) => `bench_snapshot.${p}`)
			};
			const intent = value["intent"];
			if (intent !== void 0 && typeof intent !== "string") return {
				ok: false,
				problems: ["bench_snapshot.intent: must be a string"]
			};
			const head = value["bench_head"];
			if (head !== void 0 && !isRecord(head)) return {
				ok: false,
				problems: ["bench_snapshot.bench_head: must be an object"]
			};
			return {
				ok: true,
				value: {
					stages: stages.value,
					intent: typeof intent === "string" ? intent : "",
					...head !== void 0 ? { bench_head: head } : {}
				}
			};
		}
		/** Judge a `card_snapshot` body exactly as the loader consumes it. */
		function parseCardSnapshot(value) {
			if (!isRecord(value)) return {
				ok: false,
				problems: ["card_snapshot: not an object"]
			};
			const card = value["card"];
			if (typeof card !== "string" || card === "") return {
				ok: false,
				problems: ["card_snapshot.card: must be a non-empty string"]
			};
			const params = value["params"];
			if (params !== void 0 && !isRecord(params)) return {
				ok: false,
				problems: ["card_snapshot.params: must be an object"]
			};
			return {
				ok: true,
				value: {
					card,
					params: isRecord(params) ? params : {}
				}
			};
		}
		//#endregion
		//#region src/client/waitState.ts
		/**
		* waitState — the estate's boot-race WAIT voices, in one place.
		*
		* A lane's estate seats mount behind its boot URL: during that
		* window the doors answer 503 `estate/pending` (doors.ts
		* ESTATE_PENDING_GRACE_MS, 120s) and the gallery's own rows answer
		* 502 `no_estate_seat` for the same in-flight composition (observed
		* live 2026-10-18: a seat probe misses while composition runs —
		* absence, never a broken registry). Both are wait states: the
		* client retries within the doors' own grace window instead of
		* rendering a terminal error that heals itself seconds later.
		*
		* Every other !ok response — a generic 503, a 502 with a different
		* code, a 4xx — is terminal at this seam and returns to the caller
		* unchanged.
		*/
		/** The doors' own pending grace (doors.ts ESTATE_PENDING_GRACE_MS):
		* the window within which a wait voice is a boot race, not a
		* misconfiguration. Past it the 502 no_estate_seat voice surfaces
		* as the honest error it then is — a seat that never mounted. */
		const ESTATE_WAIT_GRACE_MS = 12e4;
		/** The retry cadence inside the grace window. */
		const ESTATE_WAIT_RETRY_MS = 1e3;
		/** PENDING IS A WAIT, NOT A DEADLINE (E2-3, operator burn
		* 2026-10-22: "the first load from history takes 5+ minutes"):
		* measured activation on the 1931-run estate is ~112s and longer
		* under load — colliding with the old grace cap terminaled the
		* history panel mid-boot and every reload entered a fresh
		* activation window. A 503 estate/pending body is the door still
		* SAYING it activates; the door outranks the clock: pending
		* retries past the grace at a backing-off cadence (doubling to
		* this ceiling). Only the 502 no_estate_seat voice is
		* grace-bounded (absence past the window is misconfiguration). */
		const ESTATE_WAIT_BACKOFF_CEILING_MS = 5e3;
		/** Does this response body carry a boot-race wait voice?
		*  @param status the HTTP status (503 or 502 carry the voices).
		*  @param body the parsed JSON body (unknown at this seam).
		*  @returns true when the response is the estate still activating. */
		function estateWaitVoiceOf(status, body) {
			if (status === 503) {
				const rec = body;
				return typeof rec === "object" && rec !== null && (rec["code"] === "estate/pending" || rec["pending"] === true);
			}
			if (status === 502) {
				const rec = body;
				return typeof rec === "object" && rec !== null && rec["error"] === "no_estate_seat";
			}
			return false;
		}
		/** Rebuild a consumed response so callers can re-read the body. */
		function rebuild(status, bodyText, headers) {
			return new Response(bodyText, {
				status,
				headers
			});
		}
		/** Fetch a same-origin estate door, retrying the boot-race wait
		*  voices (503 estate/pending, 502 no_estate_seat) until the doors'
		*  grace window closes. The FIRST non-wait response — success or
		*  failure alike — returns to the caller as-is.
		*
		*  POST retries are safe here: the estate doors never executed the
		*  request while its seat was absent, and the bench ensure rides a
		*  CAS (expect_rev), so a retry either lands once or refuses.
		*
		*  THE ABORT LAW (audit V-E2, 2026-10-22): an aborted init.signal
		*  ends the wait IMMEDIATELY — the loop checks the signal each pass,
		*  the in-flight fetch rejects natively (init rides verbatim), and
		*  the retry nap races the signal instead of sleeping through it.
		*  Abort surfaces as the signal's own rejection, never a 120s hang
		*  the caller cannot cancel.
		*
		*  @param input the same-origin URL.
		*  @param init the request init, passed verbatim on every attempt.
		*  @param now the clock the grace window reads (injectable).
		*  @param sleep the delay between attempts (injectable).
		*  @returns the final Response, body re-readable. */
		async function fetchUntilSeated(input, init, now = Date.now, sleep = (ms) => new Promise((resolve) => {
			setTimeout(resolve, ms);
		})) {
			const signal = init?.signal ?? null;
			const deadline = now() + ESTATE_WAIT_GRACE_MS;
			let cadence = ESTATE_WAIT_RETRY_MS;
			for (;;) {
				if (signal?.aborted === true) throw abortOf(signal);
				const res = await fetch(input, init);
				if (res.status !== 502 && res.status !== 503) return res;
				const bodyText = await res.text();
				let body = null;
				try {
					body = JSON.parse(bodyText);
				} catch {
					body = null;
				}
				if (!estateWaitVoiceOf(res.status, body)) return rebuild(res.status, bodyText, res.headers);
				if (res.status === 502 && now() >= deadline) return rebuild(res.status, bodyText, res.headers);
				await nap(sleep, cadence, signal);
				cadence = Math.min(cadence * 2, ESTATE_WAIT_BACKOFF_CEILING_MS);
			}
		}
		/** The abort reason a cancelled wait throws: the signal's own
		*  reason when it carries one, else the standard AbortError. */
		function abortOf(signal) {
			return signal.reason ?? new DOMException("The wait was aborted", "AbortError");
		}
		/** One retry nap that ends the moment the signal aborts — the bare
		*  sleep kept the wait alive a full cadence past every abort. */
		async function nap(sleep, ms, signal) {
			if (signal === null) {
				await sleep(ms);
				return;
			}
			await Promise.race([sleep(ms), new Promise((_, reject) => {
				if (signal.aborted) {
					reject(abortOf(signal));
					return;
				}
				signal.addEventListener("abort", () => {
					reject(abortOf(signal));
				}, { once: true });
			})]);
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
		*  load writes the ACTIVE session's bench, never a stranger's).
		*  THE ONE SPELLING (the li-ay stroke): the sanitize decision used
		*  to be this file's own function over the imported grammar; the
		*  decision now lives beside its grammar on the contract floor and
		*  every seat (this client, the cards tab, the agent tool) imports
		*  the same function. */
		/** The bench tab's address for one session (cross-plugin contract,
		* the estate-artifact pattern: client bundles cannot import across
		* plugins, so the form is restated with its definition site named —
		* cards-resource.ts's benchAddressOf). */
		function cardsBenchAddress(sessionId) {
			return "dsh-resource://cards/bench/" + benchSessionOf$1(sessionId);
		}
		/** The run's own preview, stamped onto the restored stage (stroke
		*  45b, the operator's catch: the flow loaded but the card showed no
		*  image — a ran stage's result {run_id, url} IS the preview the
		*  cards tile renders; the media-sidebar audit 2026-09-22: the stamp
		*  was image-only, so every restored TTS / video / 3D card landed
		*  with NO preview). _flow.json.artifacts are absolute paths; the
		*  URL is the GALLERY'S OWN same-origin artifact route carrying the
		*  run-relative tail (the mask-recovery break's second half, live
		*  proof: /melite-media/* 502s 'estate-media/no-queue-seat' on a
		*  host without the queue seat, while /infer-gallery/artifact
		*  serves the same file 200 — the preview is a BROWSER <img>/<video>
		*  src, so it must ride the route that serves in THIS host; the
		*  engine-side PATH params keep /melite-media — different consumer,
		*  the engine's own lane). THE KIND UNION is the preview seam's own
		*  vocabulary, restated (client bundles cannot import across
		*  plugins — the parity site is named: melite-card-view's
		*  preview-kinds.ts previewKindFor). */
		function resultOfRun(flow, runId) {
			const arts = flow?.["artifacts"];
			if (!Array.isArray(arts)) return void 0;
			const isMedia = (a) => typeof a === "string" && mediaKindOf(a) !== void 0;
			const isVideo = (p) => mediaKindOf(p) === "video";
			const WINDOW_FILM = /_w\d+_\w+_?\.mp4$/i;
			const media = arts.filter(isMedia);
			if (media.length === 0) return void 0;
			const film = media.find((p) => /(?:^|\/)h3_t4_film_\d+_\.mp4$/i.test(p) && !WINDOW_FILM.test(p));
			const video = media.find((p) => isVideo(p) && !WINDOW_FILM.test(p));
			const hero = film ?? video ?? media.find((p) => !WINDOW_FILM.test(p)) ?? media[0];
			const tailOf = runTailOf$1;
			const heroTail = tailOf(hero);
			if (heroTail === void 0) return void 0;
			const route = (tail) => "/infer-gallery/artifact?path=" + encodeURIComponent(tail);
			const artifacts = {};
			const assetUrls = [];
			for (const p of [hero, ...media.filter((m) => m !== hero)]) {
				const tail = tailOf(p);
				if (tail === void 0 || artifacts[tail] !== void 0) continue;
				artifacts[tail] = route(tail);
				assetUrls.push(route(tail));
			}
			return {
				run_id: runId,
				url: route(heroTail),
				artifacts,
				assetUrls
			};
		}
		/** One stage's OWN preview, from its sidecar row (the per-stage
		* preview law, operator 2026-10-26: "IMAGE PREVIEWS DO NOT WORK ON
		* RELOAD, IT CHOOSES A RANDOM IMAGE AS THE PREVIEW OUTPUT FOR ALL
		* CARDS" — the D6 stamp shared resultOfRun's ONE run-level hero
		* across every stage, so every restored card painted the same
		* image). queueSidecar.ts's SidecarStage carries each stage's own
		* `url` + `gallery` names; this builder mirrors the estate's
		* terminal outcome (hero url first, the gallery as the artifacts
		* map, hero-first) over the gallery's own artifact route. The names
		* are run-relative tails on today's sidecars; an absolute spelling
		* folds through the contract's runTailOf, and a path that names no
		* run tail and is not itself relative refuses (undefined — the
		* run-level floor answers).
		* @param stage the sidecar's stage row (url/gallery optional — a
		*   legacy row without either carries no per-stage truth)
		* @param runId the run the sidecar names
		* @returns the stage's own result, or undefined when the row is
		*   preview-less */
		function resultOfStage(stage, runId) {
			if (stage === void 0) return void 0;
			const tailOf = (p) => {
				const folded = runTailOf$1(p);
				return folded !== void 0 ? folded : p.startsWith("/") ? void 0 : p;
			};
			const runIdOf = (p) => runTailOf$1(p)?.split("/")[0] ?? "";
			const prefixRun = (tail) => {
				return runIdOf(tail) !== "" ? tail : `${runId}/${tail}`;
			};
			const url = typeof stage["url"] === "string" && stage["url"] !== "" ? tailOf(stage["url"]) : void 0;
			const gallery = Array.isArray(stage["gallery"]) ? stage["gallery"] : [];
			const names = [];
			for (const g of gallery) {
				if (typeof g?.name !== "string" || g.name === "") continue;
				if (mediaKindOf(g.name) === void 0) continue;
				const tail = tailOf(g.name);
				if (tail !== void 0 && !names.includes(tail)) names.push(tail);
			}
			if (url === void 0 && names.length === 0) return void 0;
			const hero = prefixRun(url ?? names[0]);
			const ordered = names.map(prefixRun);
			const route = (tail) => "/infer-gallery/artifact?path=" + encodeURIComponent(tail);
			const artifacts = {};
			const assetUrls = [];
			for (const n of [hero, ...ordered.filter((m) => m !== hero)]) {
				if (artifacts[n] !== void 0) continue;
				artifacts[n] = route(n);
				assetUrls.push(route(n));
			}
			return {
				run_id: runId,
				url: route(hero),
				artifacts,
				assetUrls
			};
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
			const BENCH_SESSION = benchSessionOf$1(deps.sessionId);
			try {
				let expectRev;
				const getRes = await fetchUntilSeated("/v1/bench/" + encodeURIComponent(BENCH_SESSION), {
					headers: { accept: "application/json" },
					...deps.signal !== void 0 ? { signal: deps.signal } : {}
				});
				if (getRes.ok) {
					const rev = (await getRes.json().catch(() => null))?.["rev"];
					if (typeof rev === "number") expectRev = rev;
				}
				const ensureRes = await fetchUntilSeated("/v1/bench/ensure", {
					method: "POST",
					headers: { "content-type": "application/json" },
					...deps.signal !== void 0 ? { signal: deps.signal } : {},
					body: JSON.stringify({
						session: BENCH_SESSION,
						author: "user",
						stages,
						intent,
						overwrite: true,
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
				const docRes = await fetchUntilSeated("/v1/flows/drafts/" + encodeURIComponent(draftId), {
					headers: { accept: "application/json" },
					...deps.signal !== void 0 ? { signal: deps.signal } : {}
				});
				const doc = await docRes.json().catch(() => null);
				if (!docRes.ok || typeof doc !== "object" || doc === null) {
					deps.onError("could not read that card (" + await refusalOf(docRes, doc) + ")");
					return;
				}
				const stages = doc["stages"];
				const intent = doc["intent"];
				const rows = Array.isArray(stages) ? stages : [];
				for (const st of rows) if (typeof st === "object" && st !== null && !Array.isArray(st)) stripKeys$1(st, RESTORE_STRIP_KEYS$1);
				await loadStagesOntoBench(rows, typeof intent === "string" && intent !== "" ? intent : "restored draft", deps);
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
			benchSessionOf$1(deps.sessionId);
			try {
				const sideRes = await fetchUntilSeated("/infer-gallery/flow?run_id=" + encodeURIComponent(runId), {
					headers: { accept: "application/json" },
					...deps.signal !== void 0 ? { signal: deps.signal } : {}
				});
				const side = await sideRes.json().catch(() => null);
				if (!sideRes.ok || typeof side !== "object" || side === null) {
					deps.onError("that run keeps no readable sidecar (" + await refusalOf(sideRes, side) + ")");
					return;
				}
				const flow = side["flow"];
				const snap = typeof flow === "object" && flow !== null ? flow["card_snapshot"] : void 0;
				const benchSnap = typeof flow === "object" && flow !== null ? flow["bench_snapshot"] : void 0;
				if (typeof benchSnap === "object" && benchSnap !== null) {
					const parsedBench = parseBenchSnapshot(benchSnap);
					if (!parsedBench.ok) {
						deps.onError("this run keeps an unloadable bench snapshot (" + parsedBench.problems.join("; ") + ")");
						return;
					}
					const bs = parsedBench.value;
					const bsStages = bs.stages.map((st) => ({ ...st }));
					if (bsStages.length > 1) {
						const result = resultOfRun(flow, String(side["run_id"] ?? ""));
						for (const [i, st] of bsStages.entries()) {
							stripKeys$1(st, RESTORE_STRIP_KEYS$1);
							stripSelfNamedModel$1(st["card"], st["params"]);
							const rawSideStages = flow["stages"];
							const sideStages = Array.isArray(rawSideStages) ? rawSideStages.filter((s) => typeof s === "object" && s !== null && !Array.isArray(s)) : [];
							const sideRowFor = (benchId, index) => sideStages.find((s) => s["bench_stage_id"] === benchId) ?? sideStages.find((s) => s["id"] === benchId) ?? (sideStages.length === bsStages.length ? sideStages[index] : void 0);
							const skippedRaw = side["skipped_stages"];
							if (!(Array.isArray(skippedRaw) ? skippedRaw : []).some((k) => k === st["id"])) {
								const own = resultOfStage(sideRowFor(st["id"], i), String(side["run_id"] ?? ""));
								if (own !== void 0) st["result"] = own;
								else if (result !== void 0) st["result"] = result;
							}
							st["provenance"] = RESTORED_PROVENANCE_SPELLING$1;
						}
						await loadStagesOntoBench(bsStages, (bs.intent !== "" ? bs.intent : "restored run").slice(0, 77), deps);
						return;
					}
				}
				if (typeof snap === "object" && snap !== null) {
					const parsedCard = parseCardSnapshot(snap);
					if (!parsedCard.ok) {
						deps.onError("this run keeps an unloadable card snapshot (" + parsedCard.problems.join("; ") + ")");
						return;
					}
					const card = parsedCard.value.card;
					const params = { ...parsedCard.value.params };
					delete params["draft_id"];
					delete params["test"];
					stripSelfNamedModel$1(card, params);
					const intentSrc = typeof params["prompt"] === "string" ? params["prompt"] : "restored run";
					const result = resultOfRun(flow, String(side["run_id"] ?? ""));
					const restoredCardRow = {
						...normalizeBenchStage$1({
							id: "s_0",
							card,
							params
						}, 0),
						provenance: RESTORED_PROVENANCE_SPELLING$1
					};
					if (result !== void 0) restoredCardRow["result"] = result;
					await loadStagesOntoBench([restoredCardRow], intentSrc.slice(0, 77), deps);
					return;
				}
				const request = side["request"];
				if (typeof request === "object" && request !== null && typeof request["model"] === "string") {
					const params = { ...request };
					delete params["draft_id"];
					delete params["test"];
					const result = resultOfRun(flow, String(side["run_id"] ?? ""));
					const restoredBareRow = {
						...normalizeBenchStage$1({
							id: "s_0",
							params
						}, 0),
						provenance: RESTORED_PROVENANCE_SPELLING$1
					};
					if (result !== void 0) restoredBareRow["result"] = result;
					await loadStagesOntoBench([restoredBareRow], "restored run", deps);
					return;
				}
				const flowDraft = typeof flow === "object" && flow !== null ? flow["draft_id"] : void 0;
				const topDraft = side["draft_id"];
				const draftId = typeof flowDraft === "string" && flowDraft !== "" ? draftIdOf$1(flowDraft) : typeof topDraft === "string" && topDraft !== "" ? draftIdOf$1(topDraft) : draftIdOf$1("");
				if (draftId.startsWith("bench-")) {
					deps.onError("that run was born on a living bench and keeps no snapshot — nothing to restore exactly");
					return;
				}
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
			const errors = row(d.errors);
			const drafts = [];
			let dropped = 0;
			for (const raw of row(d.drafts)) {
				const r = raw ?? {};
				if (typeof r.draft_id !== "string" || r.draft_id === "") {
					dropped += 1;
					continue;
				}
				drafts.push(r);
			}
			if (dropped > 0) errors.push({
				gateway: "drafts",
				message: "dropped " + String(dropped) + " rows without draft_id (unkeyable)"
			});
			return {
				drafts,
				errors
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
		/** The staged-cache seat (E2-3 arm 2, operator 2026-10-22: "the
		*  first load from history takes 5+ minutes"): the last served feed
		*  persists client-side and paints instantly on the next boot. Keyed
		*  by the feed url — localStorage is origin-scoped, so two estates
		*  (two lanes, two ports) never cross-paint. A cache that will not
		*  parse is discarded, never a crashed boot.
		*
		*  THE VERSION STAMP (audit F6 close, 2026-11-12): a cache written
		*  by an older-era decoder hydrated and painted UNDER-REPORTED faces
		*  (live example: pre-2b caches under-reporting `truncated`) until a
		*  fresh load seated — the door's shape check is at the keyability
		*  floor only, so an old cache passes it with missing keys. Every
		*  write wraps the feed with the cache version; a read unwraps and
		*  REFUSES any cache whose stamp is absent (an older era) or foreign
		*  — discarded AND EVICTED, so the poison never re-hydrates on the
		*  next boot. */
		const FEED_CACHE_VERSION = 1;
		const feedCacheKey = (url) => "melite:feed:" + url;
		function readFeedCache(url) {
			const key = feedCacheKey(url);
			const evict = () => {
				try {
					localStorage.removeItem(key);
				} catch {}
				return null;
			};
			try {
				const raw = localStorage.getItem(key);
				if (raw === null) return null;
				const parsed = JSON.parse(raw);
				if (typeof parsed !== "object" || parsed === null) return evict();
				const env = parsed;
				if (env.v !== FEED_CACHE_VERSION || !("feed" in env)) return evict();
				return env.feed ?? null;
			} catch {
				return evict();
			}
		}
		function writeFeedCache(url, json) {
			try {
				const env = {
					v: FEED_CACHE_VERSION,
					feed: json
				};
				localStorage.setItem(feedCacheKey(url), JSON.stringify(env));
			} catch {}
		}
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
			const [boot] = (0, react.useState)(() => {
				const json = readFeedCache(url);
				if (json === null) return { cached: null };
				try {
					decode(json);
					return { cached: json };
				} catch {
					try {
						localStorage.removeItem(feedCacheKey(url));
					} catch {}
					return { cached: null };
				}
			});
			const [data, setData] = (0, react.useState)(() => {
				if (boot.cached === null) return initial;
				try {
					return decode(boot.cached);
				} catch {
					return initial;
				}
			});
			const [stale, setStale] = (0, react.useState)(boot.cached !== null);
			const [loading, setLoading] = (0, react.useState)(true);
			const [error, setError] = (0, react.useState)("");
			const abortRef = (0, react.useRef)(null);
			const load = (0, react.useCallback)(() => {
				abortRef.current?.abort();
				const ctrl = new AbortController();
				abortRef.current = ctrl;
				setLoading(true);
				setError("");
				fetchUntilSeated(url, { signal: ctrl.signal }).then(async (r) => {
					const json = await r.json();
					if (!r.ok) {
						const msg = json.error;
						throw new Error(typeof msg === "string" && msg !== "" ? msg : "HTTP " + String(r.status));
					}
					setData(decode(json));
					writeFeedCache(url, json);
				}).catch((e) => {
					if (ctrl.signal.aborted) return;
					setError(e instanceof Error ? e.message : String(e));
				}).finally(() => {
					if (!ctrl.signal.aborted) {
						setLoading(false);
						setStale(false);
					}
				});
			}, [url, decode]);
			(0, react.useEffect)(() => {
				load();
				return () => {
					abortRef.current?.abort();
				};
			}, [load]);
			useRefreshOnVisible(load, 15e3);
			return {
				data,
				loading,
				error,
				reload: load,
				setData,
				stale
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
				children: loading ? galleryCopy.refreshBusy : galleryCopy.refreshIdle
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
				role: "status",
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
		function FeedErrors({ errors }) {
			if (errors.length === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: errors.map((e) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					fontSize: 11,
					color: stateWarnPrimary1,
					marginBottom: 4
				},
				children: galleryCopy.gatewayNote({
					gateway: e.gateway,
					message: e.message
				})
			}, e.gateway + e.message)) });
		}
		//#endregion
		//#region src/client/media-kinds.ts
		/**
		* Media kinds — the CLIENT plane's kind vocabulary, DERIVED from the
		* contract's mediaVocab() (the li-ay stroke, 2026-10-11).
		*
		* History: the deleted dsh-media package classified from its own
		* media-kinds.json; the 2026-09-11 full port carried a HAND COPY of
		* the vocabulary here ("parity-pinned" byte-equal by the wall — two
		* typed copies, zero drift, by assertion). The copy is dead: the
		* contract floor is importable from the browser (both planes build
		* on it), so the client DERIVES now — exts and gallery subsets come
		* from mediaVocab() itself, and only the UI LABELS are this file's
		* own (a label is presentation, not classification).
		*
		* The laws the data carries (from the original file's $comment,
		* preserved):
		*  - gallery = exts that LIST in the sidebar; exts = the full
		*    classifier. Gallery extras classify but do NOT list —
		*    deliberate, documented at the vocab, not scattered.
		*  - key order = classifier precedence (on a contradictory row the
		*    earlier kind wins: video beats image).
		*  - maxListedImages is the DOOR-tier cap (the estate serves it in
		*    the run row's truncated marker); the client's >20 frame-dump
		*    guard is the display-tier fallback, never the truncation law.
		*/
		/** The labels are the dictionary's (locale-owned copy — the estate's
		*  copy-scope law); every EXTENSION LIST is the contract's vocabulary,
		*  verbatim, in the vocab's own order. */
		const LABELS = {
			video: galleryCopy.kindVideo,
			image: galleryCopy.kindImages,
			audio: galleryCopy.kindAudio,
			model: galleryCopy.kindModel,
			text: galleryCopy.kindText
		};
		const GALLERY_KEY = {
			video: "galleryVideo",
			image: "galleryImage",
			audio: "galleryAudio",
			model: "galleryModel",
			text: "galleryText"
		};
		/** The client classifier's vocabulary (DERIVED — see header). */
		const MEDIA_KINDS = (() => {
			const vocab = mediaVocab();
			const kinds = {};
			for (const kind of [
				"video",
				"image",
				"audio",
				"model",
				"text"
			]) kinds[kind] = {
				label: LABELS[kind],
				exts: vocab[kind],
				gallery: vocab[GALLERY_KEY[kind]]
			};
			return {
				kinds,
				policy: { maxListedImages: vocab.maxListedImages }
			};
		})();
		//#endregion
		//#region src/client/mesh-tile.tsx
		/**
		* mesh-tile — THE MODEL TILE'S PREVIEW (the operator's 2026-10-18
		* order: a mesh artifact must show SOMETHING in the media sidebar,
		* never a blank tile).
		*
		* ROOT CAUSE IT CURES (see the audit): flatten() sets poster only
		* for video/image, so MediaPanel's tile seat rendered null for every
		* model artifact — a gradient with a cube glyph, no preview. MeshView
		* was wired only in the drilldown and the estate-artifact tab, never
		* in the grid. This component is the grid's wire: a model tile mounts
		* it in its media seat.
		*
		* CLICK-TO-LOAD (never mount-on-visible): a hero mesh is 47MB — an
		* IntersectionObserver auto-mount would fetch GLBs the user only
		* scrolled past, and the panel's first paint must never wait on a
		* fetch. The tile paints its idle chip immediately (no fetch, no
		* WebGL); the stage mounts only on the user's explicit arm. Loading
		* and named-failure states are MeshView's own (shared loader, shared
		* honest-failure copy) — this file adds no loader and no three.js
		* import, so the page keeps its ONE three.js copy (three-client law).
		*
		* COPY LAW: user-visible copy is locale-owned — it lives in the tree's
		* typed galleryCopy dictionary (client/galleryCopy.ts), never inline in
		* the JSX (the former local MESH_TILE_COPY rows joined the tree
		* dictionary, 2026-11-05).
		*/
		/** Keyboard activation (Enter/Space) shared by both affordances. */
		function activate(key) {
			return key === "Enter" || key === " ";
		}
		/** The model tile's media seat: an idle chip until armed, the shared
		*  MeshView after. The seat lives inside the tile button, so every
		*  pointer and keyboard arm stops propagation — arming or orbiting
		*  must never open the drilldown. The drilldown stays reachable
		*  through the tile's caption, wand, and keyboard. */
		function ModelTilePreview({ url, file }) {
			const [armed, setArmed] = (0, react.useState)(false);
			if (!armed) {
				const name = galleryCopy.tileLoadPreviewOf(file);
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: {
						position: "absolute",
						inset: 0,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						pointerEvents: "none"
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						role: "button",
						tabIndex: 0,
						"data-testid": "model-tile-load",
						"aria-label": name,
						title: name,
						onClick: (e) => {
							e.stopPropagation();
							setArmed(true);
						},
						onKeyDown: (e) => {
							if (activate(e.key)) {
								e.stopPropagation();
								setArmed(true);
							}
						},
						style: {
							pointerEvents: "auto",
							background: stateBusinessPrimaryBg2,
							color: stateBusinessPrimary,
							borderRadius: 6,
							padding: "4px 10px",
							fontSize: 11,
							fontWeight: 700,
							cursor: "pointer"
						},
						children: galleryCopy.tileLoadPreview
					})
				});
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				"data-testid": "model-tile-preview",
				onClick: (e) => {
					e.stopPropagation();
				},
				style: {
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					bottom: 34,
					overflow: "hidden"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MeshView, {
					url,
					file,
					height: 120
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					role: "button",
					tabIndex: 0,
					"data-testid": "model-tile-close",
					"aria-label": galleryCopy.tileClosePreview,
					title: galleryCopy.tileClosePreview,
					onClick: (e) => {
						e.stopPropagation();
						setArmed(false);
					},
					onKeyDown: (e) => {
						if (activate(e.key)) {
							e.stopPropagation();
							setArmed(false);
						}
					},
					style: {
						position: "absolute",
						top: 4,
						right: 4,
						background: bgBase1,
						color: labelPrimary3,
						borderRadius: 5,
						padding: "2px 7px",
						fontSize: 10,
						cursor: "pointer"
					},
					children: galleryCopy.tileClosePreview
				})]
			});
		}
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
		/** JSON key order = classifier precedence (video beats image on a contradictory row). */
		const KIND_ORDER = Object.keys(MEDIA_KINDS.kinds);
		const KIND_LABEL = Object.fromEntries(KIND_ORDER.map((k) => [k, MEDIA_KINDS.kinds[k].label]));
		const extRe = (exts) => new RegExp("\\.(" + exts.join("|") + ")(\\?|$)", "i");
		const KIND_RE = Object.fromEntries(KIND_ORDER.map((kind) => [kind, extRe(MEDIA_KINDS.kinds[kind].exts)]));
		/** Numbered frame dumps (per-frame PNG exports) — noise in a run with 100+ frames. */
		const FRAME_DUMP = /(^|_)\d{3,}_?\.png$/i;
		/** THE PAGE SIZE (operator 2026-10-22, "some sort of pagination"): the
		*  grid mounts one page of tiles — each video tile holds a
		*  metadata-preload element, so a full 500-run window at once is the
		*  sidebar's heaviest surface. The drilldown's prev/next still walks
		*  the WHOLE filtered list (its siblings stay `shown`). */
		const PAGE_SIZE = 60;
		/** Concatenated film = video WITHOUT a per-window suffix; window films
		*  carry it. THE REAL SPELLING (live proof, BRIEF4 2026-09-23):
		*  `<stem>_w<idx>_<seq>_.mp4` — the sequence rides a TRAILING
		*  UNDERSCORE before the extension; the old hash-then-dot pattern
		*  matched nothing, so windows classified as finals. */
		const WINDOW_FILM = /_w\d+_\w+_?\.mp4$/i;
		/** (D-C2, 2026-09-28: the `i` flag is not cosmetic — bench-load's
		* hero pick spelled the same law case-insensitively while this
		* listing filter did not, so an .MP4 window film classified as a
		* FINAL here while the hero skipped it. The media-sidebar wall's
		* one-spelling arm caught the drift; the two declarations are now
		* character-identical.) */
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
			if (t.startsWith("text/") || t === "text") return "text";
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
		/** The artifact's file name — THE ONE LAW (artifact-ops' resolver):
		*  an artifact-route URL's last path segment is the ROUTE's word, so
		*  reading the path named every artifact "artifact". */
		function baseName(u) {
			return artifactNameOf(u);
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
		*  guard, dedup by url, label law, final-film-first sort tie-break). */
		function flatten(runs) {
			const items = [];
			const seen = /* @__PURE__ */ new Set();
			for (const run of runs) {
				const arts = Array.isArray(run.artifacts) ? run.artifacts : [];
				const posters = /* @__PURE__ */ new Map();
				for (const a of arts) {
					const n = a.name ?? baseName(a.url ?? "");
					const m = POSTER_STEMS.map((re) => n.match(re)).find((x) => x !== null);
					if (m !== void 0 && a.url) posters.set(m[1], a.url);
				}
				const dropFrames = arts.reduce((n, a) => kindOf(a) === "image" ? n + 1 : n, 0) > 20;
				const finalFilmUrl = arts.reduce((lead, a) => {
					if (lead !== null) return lead;
					const u = a.url ?? "";
					const f = a.name ?? baseName(u);
					return kindOf(a) === "video" && u !== "" && !WINDOW_FILM.test(f) ? u : null;
				}, null);
				const thumbIsVideo = typeof run.thumbnail === "string" && KIND_RE.video.test(run.thumbnail);
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
					let face = url;
					let segment = false;
					if (kind === "video") {
						poster = posters.get(stem) ?? "";
						if (poster === "" && !thumbIsVideo) poster = run.thumbnail ?? "";
						if (isFinal) {
							if (poster === "") poster = url;
						} else {
							segment = true;
							face = poster !== "" ? url : finalFilmUrl ?? (thumbIsVideo ? run.thumbnail : null) ?? url;
						}
					} else if (kind === "image") poster = url;
					items.push({
						id: url,
						kind,
						url,
						face,
						poster,
						segment,
						head,
						final: isFinal,
						runId: String(run.run_id ?? ""),
						draftId: typeof run.draft_id === "string" ? draftIdOf$1(run.draft_id) : draftIdOf$1(""),
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
			if (kind === "text") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 24 24",
				fill: "none",
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "M5.5 4.5h9L18.5 8.5v11a1 1 0 0 1-1 1h-12a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1Z",
						stroke: "currentColor",
						strokeWidth: "1.6",
						strokeLinejoin: "round"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "M14 4.5v4.5h4.5",
						stroke: "currentColor",
						strokeWidth: "1.6",
						strokeLinejoin: "round"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "M8 13h8M8 16.5h5.5",
						stroke: "currentColor",
						strokeWidth: "1.6",
						strokeLinecap: "round"
					})
				]
			});
			return kind;
		}
		/** Tile badge rule — ONE place: a model tile always badges 3D,
		*  everything else badges nothing (the operator's order: the FINAL
		*  FILM tag is dead — a tile's preview IS its currency, never a
		*  status ribbon). */
		function badgeFor(item) {
			if (item.kind === "model") return {
				text: galleryCopy.kindModel,
				warn: false
			};
			return null;
		}
		/** The wand's face — a HISTORY glyph (the operator's order:
		*  no 'CARDS' text on the tile). The action is unchanged: restore
		*  this run's workflow onto the bench and open the cards tab. */
		function HistoryIcon({ size = 13 }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 24 24",
				fill: "none",
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "M4.6 8.2A8 8 0 1 1 4 14",
						stroke: "currentColor",
						strokeWidth: "2",
						strokeLinecap: "round"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "M4.2 3.4v5h5",
						stroke: "currentColor",
						strokeWidth: "2",
						strokeLinecap: "round",
						strokeLinejoin: "round"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "M12 7.5V12l3.5 2",
						stroke: "currentColor",
						strokeWidth: "2",
						strokeLinecap: "round",
						strokeLinejoin: "round"
					})
				]
			});
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
		function Overlay({ item, onClose, openArtifact, siblings, onNavigate, onDelete, onRename }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MediaDrilldown, {
				item,
				onClose,
				openArtifact: (drill) => {
					openArtifact(item);
				},
				siblings,
				onNavigate: (next) => {
					/* v8 ignore next 1 -- the walk item came FROM siblings; find-by-url always hits (probe 2026-09-20) */
					onNavigate(siblings.find((s) => s.url === next.url));
				},
				onDelete: (drill) => onDelete(item),
				onRename: (drill, name) => onRename(item, name)
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
		/** THE CANONICAL TAB-BODY FACE (2026-10-24, the deliverables
		*  receipt): the shell's `sidebar.right.pane.tab` seat threads its
		*  session-scoped standard props to EVERY registered body —
		*  `useTabInfo` AND `sessionId` arrive as props (the reference
		*  consumer: dsh-client-ui-deliverables' ReviewTab destructures
		*  exactly `{ useTabInfo, sessionId, ... }`). MediaPanel IS that
		*  face — the slot seats the conversation, no adapter read, no
		*  factory. The 2026-11-06 mediaTabBodyWith factory read
		*  uiSession.adapter.current (the MAIN binding) — which stays
		*  absent on this host — and its explicit sessionId={undefined}
		*  OVERWROTE the standard prop the forward already delivered:
		*  every restore kept landing on 'main'. Deleted; the props are
		*  the seam. */
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
			const gatewayErrors = [...runsFeed.data.errors, ...draftsFeed.data.errors];
			const drafts = draftsFeed.data.drafts;
			const loading = runsFeed.loading;
			const [uiError, setUiError] = (0, react.useState)("");
			const feedError = runsFeed.error;
			const setError = setUiError;
			const [restoringId, setRestoringId] = (0, react.useState)("");
			const [cat, setCat] = (0, react.useState)("all");
			const [search, setSearch] = (0, react.useState)("");
			const [preview, setPreview] = (0, react.useState)(null);
			const [tab, setTab] = (0, react.useState)("artifacts");
			const [sort, setSort] = (0, react.useState)("new");
			const [selectMode, setSelectMode] = (0, react.useState)(false);
			const [selected, setSelected] = (0, react.useState)(/* @__PURE__ */ new Set());
			const [deleteArmed, setDeleteArmed] = (0, react.useState)(false);
			const [deleting, setDeleting] = (0, react.useState)(false);
			const deletingRef = (0, react.useRef)(false);
			const draftInflight = (0, react.useRef)(/* @__PURE__ */ new Set());
			const [deleteNote, setDeleteNote] = (0, react.useState)("");
			const [page, setPage] = (0, react.useState)(0);
			(0, react.useEffect)(() => {
				setPage(0);
			}, [
				cat,
				search,
				sort,
				tab
			]);
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
			/** THE WAND (hunk 4, 2026-09-10; restore arm 2026-09-11;
			*  RUN-FIRST law, the media-sidebar audit 2026-09-22): "recover
			*  the cards that made this media" restores the run's workflow onto
			*  THE BENCH and opens the cards tab on it. NOT a bare run-address
			*  open: the run view hydrates from the registry's LIVE runs only,
			*  so settled runs land on `runs/unknown-run` — the wand resolves
			*  the run's OWN sidecar record first (stroke 45's law: the
			*  workflow that HAD that media — a live row draft serves whatever
			*  the draft holds NOW, which is wrong the moment the draft moved
			*  on). The row draft is the FALLBACK only: when the sidecar keeps
			*  no recoverable record but the draft still lives (a pruned run
			*  dir), the draft restores through the same bench CAS load. The
			*  window-global → DOM-claim → iframe relay it replaced
			*  (window.__meliteDeckOpenWithDraft) retired with the deck
			*  takeover. */
			const openCards = (item) => {
				setUiError("");
				const open = tabInfo?.tab.actions.openResource;
				if (open === void 0) {
					setError("Melite Bench view unavailable — the sidebar tab service is not loaded.");
					return;
				}
				const deps = {
					openResource: open,
					onError: setError,
					sessionId
				};
				const canDraft = item.draftId !== "" && !item.draftId.startsWith("bench-");
				setRestoringId(item.id);
				(async () => {
					try {
						if (item.runId !== "") {
							const probed = [];
							let probeError = "";
							await loadRunOntoBench(item.runId, {
								openResource: (address) => {
									probed.push(address);
								},
								onError: (message) => {
									probeError = message;
								},
								sessionId
							});
							if (probed.length > 0) {
								try {
									for (const address of probed) open(address);
								} catch (e) {
									setError("the cards tab refused the open (" + (e instanceof Error ? e.message : String(e)) + ")");
								}
								return;
							}
							if (canDraft) {
								await loadDraftOntoBench(item.draftId, deps);
								return;
							}
							setError(probeError !== "" ? probeError : "this run keeps no card record — nothing to restore");
							return;
						}
						if (canDraft) {
							await loadDraftOntoBench(item.draftId, deps);
							return;
						}
						setError("this run keeps no card record — nothing to restore");
					} catch (e) {
						setError("bench load failed — " + (e instanceof Error ? e.message : String(e)));
					} finally {
						setRestoringId("");
					}
				})();
			};
			/** FLOW OPEN (hunk 4): a draft row loads onto THE BENCH (the shared
			*  state both authors edit) and opens the cards tab — bench-load.ts.
			*  THE RESTORING VOICE (the operator's flows-face complaint): the
			*  wand voices its restore but the draft click went silent — a slow
			*  load read as a dead button. The row names the in-flight restore
			*  until the chain settles every exit (the guarded clear keeps a
			*  second gesture's voice when two clicks overlap).
			*  THE OVERLAP DEDUPE (journey audit 2026-10-22): the guarded clear
			*  compares ids, so it cannot hold a SAME-row overlap — two ensures
			*  would race one expect_rev and the loser would 409 over a restore
			*  that landed. A second click on an in-flight draft is ignored
			*  (the ref above); a different row still loads alongside. */
			const openDraft = (draftId) => {
				if (draftId === "") return;
				if (draftInflight.current.has(draftId)) return;
				setUiError("");
				const open = tabInfo?.tab.actions.openResource;
				if (open === void 0) {
					setError("Melite Bench view unavailable — the sidebar tab service is not loaded.");
					return;
				}
				draftInflight.current.add(draftId);
				setRestoringId(draftId);
				loadDraftOntoBench(draftId, {
					openResource: open,
					onError: setError,
					sessionId
				}).catch((e) => {
					setError("bench load failed — " + (e instanceof Error ? e.message : String(e)));
				}).finally(() => {
					draftInflight.current.delete(draftId);
					setRestoringId((cur) => cur === draftId ? "" : cur);
				});
			};
			/** THE MODAL MUTATIONS (the mediasidebar's popup modal on media
			*  stuff): delete unlinks the artifact file then closes the modal
			*  and reloads the feed; rename re-points the open preview onto
			*  the door's answer and reloads behind it. Both throw LOUD for
			*  the drilldown's error face when the URL rides no gallery path
			*  or the door refuses. */
			const deleteItem = async (item) => {
				const target = artifactPathOfUrl(item.url);
				if (target === null) throw new Error("delete failed (not a gallery artifact — nothing to delete)");
				await deleteArtifact(target);
				setPreview(null);
				load();
			};
			const renameItem = async (item, name) => {
				const target = artifactPathOfUrl(item.url);
				if (target === null) throw new Error("rename failed (not a gallery artifact — nothing to rename)");
				const next = await renameArtifact(target, name);
				setPreview({
					...item,
					id: next.url,
					url: next.url,
					file: next.path.split("/").pop() ?? name
				});
				load();
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
				const out = items.filter((it) => {
					if (cat !== "all" && it.kind !== cat) return false;
					if (q === "") return true;
					return (it.head + " " + it.file + " " + it.time).toLowerCase().includes(q);
				});
				if (sort === "old") out.sort((a, b) => a.created - b.created);
				else if (sort === "name") out.sort((a, b) => a.file.localeCompare(b.file));
				return out;
			}, [
				items,
				cat,
				search,
				sort
			]);
			const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
			const safePage = Math.min(page, pageCount - 1);
			const pageItems = (0, react.useMemo)(() => shown.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE), [shown, safePage]);
			const toggleSelect = (it) => {
				setDeleteArmed(false);
				setSelected((was) => {
					const next = new Set(was);
					if (next.has(it.id)) next.delete(it.id);
					else next.add(it.id);
					return next;
				});
			};
			/** THE MASS DELETE (operator 2026-10-22): one armed verb over the
			*  selected tiles. Doors run per file and a failure is RECORDED, not
			*  thrown — the feed reloads either way, so deleted tiles leave and
			*  failed tiles stay visible under the spoken summary. */
			const deleteSelected = async () => {
				if (deletingRef.current) return;
				const targets = [];
				let notGallery = 0;
				for (const it of items) {
					if (!selected.has(it.id)) continue;
					const p = artifactPathOfUrl(it.url);
					if (p === null) notGallery += 1;
					else targets.push(p);
				}
				deletingRef.current = true;
				setDeleting(true);
				try {
					const answer = await deleteArtifacts(targets);
					setSelected(/* @__PURE__ */ new Set());
					setDeleteArmed(false);
					setSelectMode(false);
					if (answer.failed.length > 0 || notGallery > 0) {
						const first = answer.failed[0]?.message ?? "";
						setDeleteNote("deleted " + String(answer.deleted) + " · failed " + String(answer.failed.length + notGallery) + (first === "" ? "" : " — " + first) + (notGallery > 0 ? " (· " + String(notGallery) + " selection(s) are not gallery files)" : ""));
					} else setDeleteNote("");
					load();
				} finally {
					deletingRef.current = false;
					setDeleting(false);
				}
			};
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
								children: galleryCopy.panelTitle
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Stat, { children: [
								galleryCopy.statRunsArtifacts({
									runs: runs.length,
									artifacts: items.length
								}),
								gatewayErrors.length > 0 ? galleryCopy.statGatewayNotes({ count: gatewayErrors.length }) : "",
								truncatedRuns > 0 ? galleryCopy.statCapped({ count: truncatedRuns }) : "",
								runsFeed.stale ? galleryCopy.statStale : ""
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
									children: t === "flows" ? galleryCopy.tabFlows({ count: drafts.length }) : galleryCopy.tabArtifacts({ count: items.length })
								}, t))
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									display: "flex",
									gap: 4
								},
								children: [
									["new", galleryCopy.sortNewest],
									["old", galleryCopy.sortOldest],
									["name", galleryCopy.sortAlpha]
								].map(([m, label]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
									active: sort === m,
									onClick: () => {
										setSort(m);
									},
									children: label
								}, m))
							}),
							tab === "artifacts" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
								active: selectMode,
								onClick: () => {
									if (selectMode) {
										setSelected(/* @__PURE__ */ new Set());
										setDeleteArmed(false);
										setSelectMode(false);
										return;
									}
									setSelectMode(true);
								},
								children: galleryCopy.selectAction
							}), selectMode && selected.size > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								style: {
									display: "flex",
									gap: 6,
									alignItems: "center"
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											fontSize: 12,
											color: "var(--dsw-alias-label-primary, rgba(226,232,240,0.85))"
										},
										children: galleryCopy.selectedCount({ count: selected.size })
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
										active: false,
										onClick: () => {
											setSelected(/* @__PURE__ */ new Set());
											setDeleteArmed(false);
										},
										children: galleryCopy.clearAction
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
										active: deleteArmed,
										"aria-busy": deleting,
										onClick: () => {
											if (deleting) return;
											if (!deleteArmed) {
												setDeleteArmed(true);
												return;
											}
											deleteSelected();
										},
										children: deleteArmed ? galleryCopy.confirmDelete({ count: selected.size }) : galleryCopy.deleteSelected
									})
								]
							})] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SearchInput, {
								value: search,
								onChange: setSearch,
								placeholder: galleryCopy.searchPlaceholder
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
						children: [chip("all", galleryCopy.chipAll), KIND_ORDER.map((k) => chip(k, KIND_LABEL[k]))]
					}),
					tab === "flows" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							"data-infer-media-drafts-stat": "1",
							style: {
								fontSize: 11,
								color: labelSecondary2,
								marginBottom: 8
							},
							children: [galleryCopy.statDrafts({ count: drafts.length }), draftsFeed.stale ? galleryCopy.statStale : ""]
						}),
						uiError !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ErrorBanner, { children: galleryCopy.openFailed({ error: uiError }) }) : null,
						drafts.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Empty, { children: galleryCopy.emptyDrafts }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							"data-infer-media-drafts": "1",
							style: {
								display: "flex",
								flexDirection: "column",
								gap: 6
							},
							children: drafts.map((d) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								onClick: () => {
									openDraft(draftIdOf$1(d.draft_id ?? ""));
								},
								"data-draft": d.draft_id,
								"aria-label": galleryCopy.restoreDraftAria({ name: d.name || d.draft_id || "" }),
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
												d.model || galleryCopy.draftKindFallback,
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
									}) : null,
									restoringId !== "" && restoringId === d.draft_id ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											fontSize: 9,
											fontWeight: 700,
											letterSpacing: "0.4px",
											color: labelPrimary1,
											border: "1px solid " + borderL2,
											borderRadius: 6,
											padding: "2px 6px",
											background: fillSubtle2
										},
										children: galleryCopy.restoringAction
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											fontSize: 9,
											fontWeight: 700,
											letterSpacing: "0.4px",
											color: labelPrimary1,
											border: "1px solid " + borderL2,
											borderRadius: 6,
											padding: "2px 6px"
										},
										children: galleryCopy.restoreAction
									})
								]
							}, d.draft_id ?? Math.random()))
						})
					] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FeedErrors, { errors: gatewayErrors }),
					tab === "artifacts" && deleteNote !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ErrorBanner, { children: deleteNote }) : null,
					tab === "artifacts" && uiError !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ErrorBanner, { children: galleryCopy.openFailed({ error: uiError }) }) : null,
					tab === "artifacts" && (feedError !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ErrorBanner, { children: galleryCopy.feedFailed({ error: feedError }) }) : loading && items.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Empty, { children: galleryCopy.loadingRuns }) : shown.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Empty, { children: galleryCopy.noArtifacts }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							display: "grid",
							gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))",
							gap: 10
						},
						children: pageItems.map((it) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							onClick: () => {
								if (selectMode) toggleSelect(it);
								else setPreview(it);
							},
							"aria-pressed": selectMode ? selected.has(it.id) : void 0,
							className: overlay_module_css_default.tile,
							style: {
								position: "relative",
								aspectRatio: "16 / 9",
								borderRadius: 10,
								overflow: "hidden",
								border: "1px solid " + (selectMode && selected.has(it.id) ? "var(--dsw-alias-state-business-primary, rgb(147,197,253))" : "var(--dsw-alias-border-l2, rgba(148,163,184,0.25))"),
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
								it.poster !== "" && it.kind !== "video" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
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
								}) : it.kind === "video" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("video", {
									src: it.face,
									poster: it.poster !== "" && it.poster !== it.url && it.poster !== it.face ? it.poster : void 0,
									muted: true,
									playsInline: true,
									preload: "metadata",
									disablePictureInPicture: true,
									"aria-hidden": "true",
									tabIndex: -1,
									style: {
										position: "absolute",
										inset: 0,
										width: "100%",
										height: "100%",
										objectFit: "contain",
										pointerEvents: "none"
									}
								}) : it.kind === "model" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelTilePreview, {
									url: it.url,
									file: it.file
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
								it.segment ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										position: "absolute",
										left: 6,
										bottom: 6,
										background: "var(--dsw-alias-fill-subtle, rgba(2,6,23,0.72))",
										borderRadius: 6,
										padding: "3px 6px",
										lineHeight: 0,
										color: "var(--dsw-alias-label-primary, #e2e8f0)",
										fontSize: 10,
										letterSpacing: "0.04em"
									},
									children: galleryCopy.chipSegment
								}) : null,
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TileBadge, { item: it }),
								selectMode ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										position: "absolute",
										left: 6,
										top: 6,
										width: 18,
										height: 18,
										borderRadius: "50%",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										fontSize: 11,
										lineHeight: 1,
										background: selected.has(it.id) ? "var(--dsw-alias-state-business-primary, rgb(147,197,253))" : "var(--dsw-alias-fill-subtle, rgba(2,6,23,0.72))",
										color: selected.has(it.id) ? "var(--dsw-alias-bg-base, #000)" : "var(--dsw-alias-label-primary, rgba(226,232,240,0.92))",
										border: "1px solid var(--dsw-alias-border-l2, rgba(148,163,184,0.25))"
									},
									children: selected.has(it.id) ? "✓" : ""
								}) : null,
								!selectMode && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									role: "button",
									tabIndex: 0,
									className: overlay_module_css_default.wand,
									"aria-label": galleryCopy.wandAria,
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
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HistoryIcon, {})
								}),
								restoringId === it.id && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										position: "absolute",
										left: 6,
										top: 6,
										zIndex: 3,
										borderRadius: 6,
										padding: "4px 6px",
										background: "var(--dsw-alias-fill-subtle, rgba(2,6,23,0.72))",
										color: "var(--dsw-alias-label-primary, rgb(226,232,240))",
										fontSize: 9,
										fontWeight: 700,
										letterSpacing: "0.4px"
									},
									children: galleryCopy.restoringAction
								}),
								it.poster === "" && it.kind !== "video" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
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
					}), pageCount > 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: 6,
							marginTop: 10,
							justifyContent: "center"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
								active: false,
								onClick: () => {
									if (safePage > 0) setPage(safePage - 1);
								},
								children: galleryCopy.prevPage
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									fontSize: 11,
									color: "var(--dsw-alias-label-primary, rgba(226,232,240,0.92))"
								},
								children: galleryCopy.pageOf({
									page: safePage + 1,
									pages: pageCount,
									count: shown.length
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
								active: false,
								onClick: () => {
									if (safePage < pageCount - 1) setPage(safePage + 1);
								},
								children: galleryCopy.nextPage
							})
						]
					})] })),
					preview !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Overlay, {
						item: preview,
						onClose: () => {
							setPreview(null);
						},
						openArtifact,
						siblings: shown,
						onNavigate: (next) => {
							setPreview(next);
						},
						onDelete: deleteItem,
						onRename: renameItem
					}) : null
				]
			});
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
		function shouldRetryStatus$1(status, method) {
			return GATEWAY_CODES$1.has(status) || SAFE_METHODS$1.has(method) && status >= 500 && status < 600;
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
				if (Date.now() - _cacheTime$1 > _CACHE_TTL_MS$1 && !_inflight$4) _inflight$4 = (async () => {
					try {
						_ingest$1(await apiJson$1("/v1/model-catalog"));
					} catch (e) {
						if (e instanceof CatalogContractError$1) useCatalogContractStore$1.getState().reportViolation(e.violations);
						else useCatalogContractStore$1.getState().reportError(e instanceof Error ? e.message : String(e));
					}
					return catalogStore$1.getState().catalog;
				})().finally(() => {
					_inflight$4 = null;
				});
				return cached;
			}
			if (_inflight$4) return _inflight$4;
			_inflight$4 = (async () => {
				try {
					return _ingest$1(await apiJson$1("/v1/model-catalog"));
				} catch (e) {
					if (e instanceof CatalogContractError$1) useCatalogContractStore$1.getState().reportViolation(e.violations);
					else useCatalogContractStore$1.getState().reportError(e instanceof Error ? e.message : String(e));
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
		function ensureCatalog$1() {
			if (catalogStore$1.getState().loaded) return;
			if (_inflight$4) return;
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
		var CARD_GENRES$1, catalogStore$1, _cacheTime$1, _CACHE_TTL_MS$1, _inflight$4, _bgRetryTimer$1;
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
			_inflight$4 = null;
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
		/** THE WRITE-SEAT SPELLING of the frictionless-authoring ruling
		*  (operator 2026-11-11: "The refusal is never one keystroke at a
		*  time … you are submitting a form, not hacking the mainframe"):
		*  the ONE function every write-side gate calls after the strict
		*  judge — it drops the authoring-incomplete class (the
		*  unstated-required word, a together half, an either_or half).
		*  The registry's write doors AND the form's inline gate BOTH drop
		*  through THIS function — attempt 12 (2026-11-11) was exactly this
		*  drift: the door filtered, the form's own copy of the judgment
		*  didn't, and the operator's keystroke refused while every wall
		*  was green because the walls drove the door, not the form. One
		*  spelling; a second copy of this class test anywhere is the
		*  multiple-seat disease.
		* @param violations the strict judge's violations (any seat)
		* @returns the violations a write-side gate may voice */
		function dropAuthoringIncomplete(violations) {
			return violations.filter((v) => !isUnstatedRequiredVoice(v.message) && !isTogetherHalfVoice(v.message) && !isEitherOrHalfVoice(v.message));
		}
		/** The together-half class test: the sentence names a together group
		*  whose members are not all stated yet.
		* @param text the refusal sentence to classify
		* @returns true when the sentence is the together-half voice */
		function isTogetherHalfVoice(text) {
			return text.includes(TOGETHER_HALF_STEM);
		}
		/** The either_or-half class test: the sentence names an alternative
		*  none of whose groups the stated fields complete yet.
		* @param text the refusal sentence to classify
		* @returns true when the sentence is the either_or-half voice */
		function isEitherOrHalfVoice(text) {
			return text.includes(EITHER_OR_HALF_STEM);
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
		/** The transitive together-closure of a stale set: a stale member
		*  takes its together-group with it, and a group-mate made stale by
		*  THAT pass takes its own group too — a FIXPOINT, never a single
		*  pass (overlapping groups in the wrong declaration order would
		*  strand a transitively-dropped sibling: [{together:[b,c]},
		*  {together:[a,b]}] with stale {a} closes to {a,b,c} in BOTH
		*  declaration orders; a single pass yields {a,b} when [b,c] is
		*  declared first). Siblings already blank are not carried state
		*  and stay put.
		*  @param rows the judged relations (family + resolved variant —
		*  the same rows the admission judges)
		*  @param stale the seed stale members (mutated in place to the
		*  closure; callers pass the seat's own set)
		*  @param values the merged view (a stated, non-blank sibling is
		*  carried state; a blank one is not)
		*  @returns the closed stale set (the same set instance). */
		function laneTogetherClosure(rows, stale, values) {
			let grew = true;
			while (grew) {
				grew = false;
				for (const rel of rows) for (const group of rel?.together ?? []) {
					if (!group.fields.some((m) => stale.has(m))) continue;
					for (const m of group.fields) {
						if (stale.has(m)) continue;
						if (laneBlank(values[m])) continue;
						stale.add(m);
						grew = true;
					}
				}
			}
			return stale;
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
		*  THE HONEST VOICE (the axis-unification cure, 2026-11-06 — the
		*  operator's anima burn: the served matrix carried zero Quant rows
		*  while the DECL declared two, and the old empty tail asserted the
		*  DECL's absence, which the caller's matrix cannot see). An empty
		*  `known` is a statement about the CALLER'S PROJECTION — the served
		*  matrix it was handed — so the tail names the projection and the
		*  sync break, never a DECL fact; the DECL's own cells, when the
		*  projection carries them, ride the known list.
		*
		* @param stated the quant the caller stated, verbatim.
		* @param model the model id the cells belong to.
		* @param variant the variant whose cells were searched.
		* @param known the variant's offered quants, door order; empty
		*  yields the projection-break tail.
		* @returns the refusal body, frame-free. */
		function unknownQuantVoice(stated, model, variant, known) {
			return "unknown quant " + JSON.stringify(stated) + " for model " + JSON.stringify(model) + " variant " + JSON.stringify(variant) + (known.length > 0 ? " (known: " + known.join(", ") + ")" : " (the served matrix declares no cells for this variant — DECL/projection sync break)");
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
		/** THE MARRIED-KNOB AGGREGATION (#36, the recipes rework — compose
		*  card.ts's own layering verbatim: "a call's own knobs > the lora
		*  entry's steps > this steps row"): when a served kind declares a
		*  knob marriage and a counting bag rides, the knob is the BAG's —
		*  stated on the row first, else the catalog row's default,
		*  Math.max across the bag ("8 on a 4-step distill is fine, 4 on an
		*  8-step is undercooked"). THE ONE SPELLING (axis-unification item
		*  6, D6 — the resolver-consolidation home, beside the voices): the
		*  face's resolver (card-base resolveValue) displays through this
		*  math instead of a private copy, so the display and the compose
		*  layering cannot drift. A bag id the catalog does not serve
		*  contributes nothing (the mod plane and the compose door refuse
		*  unknown ids loudly — the display never invents a refusal of its
		*  own). PURE, no I/O.
		*
		*  @param kind the served modifier kind (marries + catalog options).
		*  @param bag the doc's riding array for the kind's param_key —
		*  entries may be any shape; non-object rows contribute nothing.
		*  @returns the knob → married value map, only knobs with at least
		*  one finite count; absent keys are untouched by the caller. */
		function marriedKnobValues(kind, bag) {
			const out = {};
			if (kind.marries === void 0) return out;
			const catalog = new Map((kind.options ?? []).map((o) => [o.value, o]));
			for (const knob of Object.keys(kind.marries)) {
				const counts = [];
				for (const row of bag) {
					if (row === null || typeof row !== "object") continue;
					const stated = row[knob];
					if (typeof stated === "number" && Number.isFinite(stated)) {
						counts.push(stated);
						continue;
					}
					const id = row["id"];
					const fromCatalog = typeof id === "string" ? catalog.get(id)?.defaults?.[knob] : void 0;
					if (typeof fromCatalog === "number" && Number.isFinite(fromCatalog)) counts.push(fromCatalog);
				}
				if (counts.length > 0) out[knob] = Math.max(...counts);
			}
			return out;
		}
		/** THE DEFAULT POOL (the wire face): offered rows minus the Recipe
		*  group; an all-Recipe family falls back to every offered row (the
		*  recipe-only family still resolves — the door's own
		*  configured.length gate). Exported for the seat that must refuse
		*  an all-hidden family BEFORE its stated search (the door's early
		*  check, order-pinned by its suite) — the pool itself has one
		*  spelling here. */
		function offeredPool(variants) {
			const offered = visibleRows(variants);
			const configured = offered.filter((v) => v.group !== "Recipe");
			return configured.length > 0 ? configured : offered;
		}
		/** THE VARIANT COORDINATE, one law per scope. Stated coordinates
		*  search the matrix the caller handed (its ids are the honest known
		*  list on a miss); unstated coordinates resolve through the scope's
		*  default (declared: first row; offered: the address claim, then
		*  the pool's first row).
		*
		*  @param variants the caller's variant matrix — DECL rows, facts
		*  rows, or the flat-matrix fold.
		*  @param stated the body's `variant` value verbatim: a string —
		*  including the empty string — is stated (the false-admit cure's
		*  loud refusal); null/undefined (and non-strings) are unstated.
		*  @param address the compose address (the family/route key the run
		*  addresses); '' when the seat has none — no claim is made.
		*  @param scope the face the caller resolves for. */
		function resolveVariantRow(variants, stated, address, scope) {
			if (scope === "declared") {
				if (stated === null || stated === void 0) return {
					status: "resolved",
					variant: variants[0]
				};
				const want = typeof stated === "string" ? stated : "";
				const hit = variants.find((v) => v.id === want);
				if (hit === void 0) return {
					status: "missing",
					stated: want,
					known: knownIds(variants)
				};
				return {
					status: "resolved",
					variant: hit
				};
			}
			const want = statedOf(stated);
			if (want !== null) {
				const hit = variants.find((v) => v.id === want || v.route === want);
				if (hit === void 0) return {
					status: "missing",
					stated: want,
					known: knownIds(variants)
				};
				if (hit.hide_from_dropdown === true) return {
					status: "hidden",
					variant: hit
				};
				return {
					status: "resolved",
					variant: hit
				};
			}
			const pool = offeredPool(variants);
			if (pool.length === 0) return {
				status: "pool-empty",
				known: knownIds(variants)
			};
			if (address !== "") {
				const claimed = pool.find((v) => v.route === address || visibleCells(v.cells ?? []).some((c) => c.route !== "" && c.route === address));
				if (claimed !== void 0) return {
					status: "resolved",
					variant: claimed
				};
			}
			return {
				status: "resolved",
				variant: pool[0]
			};
		}
		/** THE QUANT COORDINATE, one law per scope, over the RESOLVED
		*  variant's cells. Stated coordinates match the quant VALUE (never
		*  the flat row id — the axisStampOf vocabulary); unstated ones
		*  claim the address's cell, else the first (visible) cell. A
		*  variant with no cells resolves `cell: null, quant: ''` — the
		*  honest empty, the caller's voice names the sync break when it
		*  must.
		*
		*  @param variant the resolved variant row (its cells are searched).
		*  @param stated the body's `quant` value verbatim: a string —
		*  including '' — is stated; null/undefined and non-strings are
		*  unstated.
		*  @param address the compose address; '' makes no claim.
		*  @param scope the face the caller resolves for. */
		function resolveCellRow(variant, stated, address, scope) {
			const cells = variant?.cells ?? [];
			const searched = scope === "declared" ? cells : visibleCells(cells);
			const want = statedOf(stated);
			if (want !== null) {
				const hit = searched.find((c) => c.quant === want);
				if (hit === void 0) return {
					status: "missing",
					stated: want,
					known: knownQuants(searched)
				};
				return {
					status: "resolved",
					cell: hit,
					quant: want
				};
			}
			const cell = (address !== "" ? searched.find((c) => c.route !== "" && c.route === address) : void 0) ?? searched[0] ?? null;
			return {
				status: "resolved",
				cell,
				quant: cell !== null && typeof cell.quant === "string" ? cell.quant : ""
			};
		}
		/** THE FLAT-MATRIX FOLD (the mirror's P2 face of the one resolver):
		*  the served spec flattens cells into `group: 'Quant'` rows with
		*  `owner` backrefs; the resolver reads the nested matrix. This fold
		*  re-nests the wire rows — Variant/Recipe rows stay (a stated Recipe
		*  id searches like at the door; the POOL still excludes it from
		*  defaults), each row's cells become the Quant rows it OWNS, keyed
		*  by the quant COORDINATE (never the namespaced row id — D2's stamp
		*  plane: the address is the row's, the value is the cell's). Orphan
		*  Quant rows (no owner match) drop — the judge could never reach
		*  them either. The original members ride the spread verbatim.
		*
		*  @param rows the served spec's variants array (or any flat matrix).
		*  @returns the nested matrix: every non-Quant row with its folded
		*  cells attached. */
		function variantMatrixFromFlatRows(rows) {
			return rows.filter((r) => r.group !== "Quant").map((r) => ({
				...r,
				cells: rows.filter((c) => c.group === "Quant" && c.owner === r.id).map((c) => ({
					...c,
					id: typeof c.id === "string" ? c.id : "",
					quant: typeof c.quant === "string" ? c.quant : "",
					route: typeof c.route === "string" ? c.route : "",
					...c.hide_from_dropdown === true ? { hide_from_dropdown: true } : {}
				}))
			}));
		}
		var RELATION_WORDS, quote, UNSTATED_REQUIRED_STEM, TOGETHER_HALF_STEM, EITHER_OR_HALF_STEM, statedOf, visibleRows, visibleCells, knownIds, knownQuants;
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
			TOGETHER_HALF_STEM = " ride together on this lane (state all or none)";
			EITHER_OR_HALF_STEM = " — the stated combination completes none of them";
			statedOf = (stated) => typeof stated === "string" ? stated : null;
			visibleRows = (variants) => variants.filter((v) => v.hide_from_dropdown !== true);
			visibleCells = (cells) => cells.filter((c) => c.hide_from_dropdown !== true);
			knownIds = (variants) => variants.map((v) => v.id);
			knownQuants = (cells) => cells.map((c) => typeof c.quant === "string" ? c.quant : "");
		}));
		//#endregion
		//#region ../../web-kit/contracts/lib/familyLane.js
		/** A key is present for the family derivation when it states
		*  something: null/undefined/blank/empty-array are absence. The
		*  presence grammar every family judge shares — the derivation,
		*  the drop math, and the client mirror's refusal clause read the
		*  same seats the same way (a private spelling elsewhere is a
		*  split family waiting to burn).
		*  @param v the stated value
		*  @returns true when the value states something */
		function familyKeyPresent(v) {
			if (v === null || v === void 0) return false;
			if (typeof v === "string") return v.trim() !== "";
			if (Array.isArray(v)) return v.length > 0;
			return true;
		}
		/** Derive the doc's family lane, generic over the declared law data
		*  (the DECL's own law, pinned to the family's derivation module by
		*  the contract wall): lanes in declared order, first match wins —
		*  minCalls against the calls length, guideKeys at the doc level,
		*  callGuideKeys inside each calls row; a lane with no qualifiers is
		*  the fallthrough. No match = the last declared lane.
		*  @param law the family's declared lane law.
		*  @param doc the doc-shaped params (calls/keyframes/ref surface).
		*  @returns the derived lane id ('' only for an empty law — a shape
		*    the declaration judge refuses at boot). */
		function deriveFamilyLane(law, doc) {
			const calls = Array.isArray(doc["calls"]) ? doc["calls"] : [];
			for (const lane of law.lanes) {
				if (lane.minCalls === void 0 && lane.guideKeys === void 0 && lane.callGuideKeys === void 0) return lane.lane;
				if (lane.minCalls !== void 0 && calls.length >= lane.minCalls) return lane.lane;
				if (lane.guideKeys?.some((k) => familyKeyPresent(doc[k]))) return lane.lane;
				if (lane.callGuideKeys?.some((k) => calls.some((c) => familyKeyPresent(c?.[k])))) return lane.lane;
			}
			return law.lanes[law.lanes.length - 1]?.lane ?? "";
		}
		/** THE RESEAT DROP (the one seat's math — h3's reseatFamilyDead
		*  spine, generalized over the declaration): when the MERGED doc's
		*  derived lane refuses keys the law names dead, every dead key the
		*  doc states that the PRIOR row also stated is stale carry the
		*  family flip stranded — it drops before the judges and the store,
		*  so the row that lands is the row the next run composes. THE
		*  CARRY LINE (2026-11-11): a dead key the merged doc holds only
		*  because THIS write states it is authored, stands untouched, and
		*  the write door's family judge refuses it in the run door's own
		*  voice — the drop is never a launderer. A doc whose lane honors
		*  every stated key rides unchanged (dropped: []).
		*  @param law the family's declared lane law.
		*  @param doc the MERGED params view the write door would judge.
		*  @param prior the stored row's params BEFORE the merge.
		*  @returns the cleaned view (a NEW record when keys dropped; the
		*    input reference otherwise) + the dropped key names. */
		function reseatDeadKeys(law, doc, prior) {
			const lane = deriveFamilyLane(law, doc);
			const dead = law.deadKeys[lane];
			if (dead === void 0 || dead.length === 0) return {
				params: doc,
				dropped: []
			};
			const dropped = dead.filter((k) => Object.prototype.hasOwnProperty.call(doc, k) && Object.prototype.hasOwnProperty.call(prior, k)).sort();
			if (dropped.length === 0) return {
				params: doc,
				dropped: []
			};
			const reseated = { ...doc };
			for (const k of dropped) delete reseated[k];
			return {
				params: reseated,
				dropped
			};
		}
		var init_familyLane = __esmMin((() => {}));
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
		//#region ../../../@deepseek-ai/dsh-util-values/lib/index.js
		function isWhitespace(c) {
			return c === " " || c === "\n" || c === "\r" || c === "	";
		}
		function isHex(c) {
			return c >= "0" && c <= "9" || c >= "a" && c <= "f" || c >= "A" && c <= "F";
		}
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
		var SIMPLE_ESCAPES, CONTENT_ESCAPE;
		var init_lib$2 = __esmMin((() => {
			SIMPLE_ESCAPES = {
				"\"": "\"",
				"\\": "\\",
				"/": "/",
				b: "\b",
				f: "\f",
				n: "\n",
				r: "\r",
				t: "	"
			};
			CONTENT_ESCAPE = /[\\\u0000-\u001f]/u;
			(class PartialArguments {
				/** The view of a call with no arguments available. */
				static EMPTY = PartialArguments.fromObject({});
				/**
				* View finished argument text without scanning it until a reader asks.
				* @param text - the complete argument JSON text.
				* @returns a sealed view.
				*/
				static fromText(text) {
					const view = new PartialArguments();
					view.append(text);
					view.sealed = true;
					return view;
				}
				/**
				* View an already parsed argument payload, such as a PTC dispatch object.
				* @param value - the parsed argument value.
				* @returns a sealed view; a non-object payload has no fields.
				*/
				static fromObject(value) {
					const view = new PartialArguments();
					view.object = typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
					view.sealed = true;
					return view;
				}
				/**
				* The source: text so far or a parsed object, plus whether it can still grow.
				* These are the only enumerable fields, so two views over the same source
				* compare equal structurally however far each has been read.
				*/
				chunks = [];
				object;
				sealed = false;
				#ends = [];
				#size = 0;
				#consumed = 0;
				#mode = "root";
				#escape = false;
				#keyStart = 0;
				#keyEscaped = false;
				#key = "";
				#current = null;
				#nestedEnds = [];
				#nestedInString = false;
				#invalidAt;
				#invalidValue = false;
				#entries = /* @__PURE__ */ new Map();
				#order = [];
				#reads = /* @__PURE__ */ new Map();
				/** Whether this view rejects further appends; does not scan text or register reads. */
				get isSealed() {
					return this.sealed;
				}
				/** Whether indexing or a content read found invalid JSON; unread value contents are not validated. */
				get invalid() {
					this.scan();
					return this.#mode === "invalid" || this.#invalidValue;
				}
				/**
				* Retain streamed argument text without scanning or comparing observed answers.
				* @param fragment - the text following every fragment appended before.
				*/
				append(fragment) {
					if (this.sealed) throw new Error("PartialArguments: cannot append to a sealed view");
					if (fragment.length === 0) return;
					this.chunks.push(fragment);
					this.#size += fragment.length;
					this.#ends.push(this.#size);
				}
				/**
				* Reconcile a streamed prefix with authoritative complete text without joining the fragments.
				* @param text - the final argument text, which replaces missing or conflicting deltas.
				* @returns this view sealed with its caches retained when every character matches; otherwise a new sealed view.
				*/
				settle(text) {
					if (this.object !== void 0 || text.length !== this.#size) return PartialArguments.fromText(text);
					let offset = 0;
					for (const chunk of this.chunks) {
						if (!text.startsWith(chunk, offset)) return PartialArguments.fromText(text);
						offset += chunk.length;
					}
					this.chunks = text.length === 0 ? [] : [text];
					this.#ends = text.length === 0 ? [] : [text.length];
					this.sealed = true;
					return this;
				}
				/**
				* Compare observed answers and advance their publication baseline. Unread views remain unscanned.
				* @returns whether any observed answer changed since its first read or the preceding refresh.
				*/
				refresh() {
					if (this.#reads.size === 0) return false;
					this.scan();
					let changed = false;
					let completions = false;
					for (const read of this.#reads.values()) {
						if (read.completion) {
							completions = true;
							continue;
						}
						changed = this.refreshRead(read) || changed;
					}
					if (completions) {
						for (const read of this.#reads.values()) if (read.completion) changed = this.refreshRead(read) || changed;
					}
					if (this.sealed) this.#reads.clear();
					return changed;
				}
				refreshRead(read) {
					const now = read.answer();
					if (Object.is(now, read.last)) return false;
					read.last = now;
					return true;
				}
				/**
				* Check whether no further fields can arrive.
				* @returns whether the outer object closed, indexing failed, or the view is sealed; unread values are not validated.
				*/
				closed() {
					return this.remember("closed", "", () => this.closedNow());
				}
				/**
				* List discovered fields in first-appearance order.
				* @returns top-level keys seen so far, in first-appearance order.
				*/
				keys() {
					return this.remember("keys", "", () => this.keysNow(), (keys) => keys.length);
				}
				/**
				* Check whether a top-level field has appeared.
				* @param key - argument name.
				* @returns whether the field has appeared (a string opened or another value began).
				*/
				has(key) {
					return this.remember("has", key, () => this.hasNow(key));
				}
				/**
				* Check whether a field's closing delimiter has arrived, without validating its contents.
				* @param key - argument name.
				* @returns whether its delimiter arrived and no content reader has reported an error for this value.
				*/
				complete(key) {
					return this.remember("complete", key, () => this.completeNow(key));
				}
				/**
				* Read string length without materializing its text.
				* @param key - argument name.
				* @param options - change granularity for a streaming string.
				* @returns decoded UTF-16 length of the string field so far; undefined when absent or not a string.
				*/
				stringLength(key, options) {
					const step = Math.max(1, Math.floor(options?.step ?? 1));
					const offset = options?.offset ?? 0;
					return this.remember(`length:${step}:${offset}`, key, () => this.lengthNow(key), (length) => length === void 0 ? void 0 : Math.ceil((length + offset) / step));
				}
				/**
				* Check a string against a decoded UTF-16 length limit without materializing it.
				* @param key - argument name.
				* @param maxLength - decoded UTF-16 limit, floored to at least zero.
				* @returns whether the string is longer than the limit; false when absent or not a string.
				*/
				stringExceeds(key, maxLength) {
					const limit = Math.max(0, Math.floor(maxLength));
					return this.remember(`exceeds:${limit}`, key, () => (this.lengthNow(key, limit + 1) ?? 0) > limit);
				}
				/**
				* Read a decoded string, including a streaming prefix.
				* @param key - argument name.
				* @returns the string field's decoded text so far; undefined when absent or not a string.
				*/
				text(key) {
					return this.remember("text", key, () => this.textNow(key));
				}
				/**
				* Read at most the first decoded UTF-16 units of a string.
				* @param key - argument name.
				* @param maxLength - maximum decoded UTF-16 length, floored to at least one.
				* @returns the bounded string prefix; undefined when absent or not a string.
				*/
				textPrefix(key, maxLength) {
					const limit = Math.max(1, Math.floor(maxLength));
					return this.remember(`prefix:${limit}`, key, () => this.textPrefixNow(key, limit));
				}
				/**
				* Read a completed non-string argument.
				* @param key - argument name.
				* @returns the parsed non-string value once it closed; undefined while open, absent, or a string.
				*/
				value(key) {
					return this.remember("value", key, () => this.valueNow(key));
				}
				/** Answer a question and, on a streaming view, remember it for change detection. */
				remember(kind, key, read, comparison) {
					this.scan();
					const result = read();
					if (!this.sealed) {
						const id = `${kind}/${key}`;
						if (!this.#reads.has(id)) this.#reads.set(id, {
							completion: kind === "complete",
							answer: comparison === void 0 ? read : () => comparison(read()),
							last: comparison === void 0 ? result : comparison(result)
						});
					}
					return result;
				}
				closedNow() {
					return this.sealed || this.#mode === "closed" || this.#mode === "invalid";
				}
				keysNow() {
					return this.object === void 0 ? this.#order : Object.keys(this.object);
				}
				hasNow(key) {
					return this.object === void 0 ? this.#entries.has(key) : Object.hasOwn(this.object, key);
				}
				completeNow(key) {
					if (this.object !== void 0) return Object.hasOwn(this.object, key);
					const entry = this.#entries.get(key);
					return entry !== void 0 && entry.end >= 0 && (entry.kind === "string" ? entry.invalidAt === void 0 : !entry.invalid);
				}
				lengthNow(key, limit = Number.POSITIVE_INFINITY) {
					if (this.object !== void 0) {
						const field = Object.hasOwn(this.object, key) ? this.object[key] : void 0;
						return typeof field === "string" ? field.length : void 0;
					}
					const entry = this.#entries.get(key);
					if (entry?.kind !== "string") return void 0;
					if (entry.text !== void 0 && entry.text.at === entry.end) return entry.text.length;
					const read = entry.length ??= {
						at: entry.start,
						length: 0,
						text: ""
					};
					this.readString(entry, read, limit, false);
					return read.length;
				}
				textNow(key) {
					if (this.object !== void 0) {
						const field = Object.hasOwn(this.object, key) ? this.object[key] : void 0;
						return typeof field === "string" ? field : void 0;
					}
					const entry = this.#entries.get(key);
					if (entry?.kind !== "string") return void 0;
					if (entry.text === void 0 && entry.end >= 0 && entry.needsDecoding && entry.invalidAt === void 0) {
						let text;
						try {
							text = JSON.parse(`"${this.slice(entry.start, entry.end)}"`);
						} catch (_error) {}
						if (text !== void 0) entry.text = {
							at: entry.end,
							length: text.length,
							text
						};
					}
					const read = entry.text ??= {
						at: entry.start,
						length: 0,
						text: ""
					};
					this.readString(entry, read, Number.POSITIVE_INFINITY, true);
					return read.text;
				}
				textPrefixNow(key, maxLength) {
					if (this.object !== void 0) {
						const field = Object.hasOwn(this.object, key) ? this.object[key] : void 0;
						return typeof field === "string" ? field.slice(0, maxLength) : void 0;
					}
					const entry = this.#entries.get(key);
					if (entry?.kind !== "string") return void 0;
					const prefixes = entry.prefixes ??= /* @__PURE__ */ new Map();
					let read = prefixes.get(maxLength);
					if (read === void 0) {
						read = {
							at: entry.start,
							length: 0,
							text: ""
						};
						prefixes.set(maxLength, read);
					}
					this.readString(entry, read, maxLength, true);
					return read.text;
				}
				valueNow(key) {
					if (this.object !== void 0) {
						if (!Object.hasOwn(this.object, key)) return void 0;
						const field = this.object[key];
						return typeof field === "string" ? void 0 : field;
					}
					const entry = this.#entries.get(key);
					if (entry?.kind !== "value" || entry.end < 0 || entry.invalid) return void 0;
					if (entry.parsed === void 0) try {
						entry.parsed = JSON.parse(this.slice(entry.start, entry.end));
					} catch (_error) {
						entry.invalid = true;
						this.#invalidValue = true;
					}
					return entry.parsed;
				}
				chunkAt(at) {
					let low = 0;
					let high = this.#ends.length;
					while (low < high) {
						const mid = low + high >>> 1;
						if (this.#ends[mid] <= at) low = mid + 1;
						else high = mid;
					}
					return low;
				}
				/** Materialize only a requested range, never the cumulative source. */
				slice(start, end) {
					if (start >= end) return "";
					const first = this.chunkAt(start);
					const last = this.chunkAt(end - 1);
					const base = first === 0 ? 0 : this.#ends[first - 1];
					if (first === last) return this.chunks[first].slice(start - base, end - base);
					const parts = [this.chunks[first].slice(start - base)];
					for (let i = first + 1; i < last; i++) parts.push(this.chunks[i]);
					parts.push(this.chunks[last].slice(0, end - this.#ends[last - 1]));
					return parts.join("");
				}
				readString(entry, read, limit, materialize) {
					const end = Math.min(entry.end < 0 ? this.#consumed : entry.end, entry.invalidAt ?? Number.POSITIVE_INFINITY, this.#invalidAt ?? Number.POSITIVE_INFINITY);
					if (!entry.needsDecoding) {
						const length = Math.min(end - read.at, limit - read.length);
						if (length <= 0) return;
						if (materialize) read.text += this.slice(read.at, read.at + length);
						read.at += length;
						read.length += length;
						return;
					}
					let chunkIndex = this.chunkAt(read.at);
					while (read.at < end && read.length < limit) {
						const base = chunkIndex === 0 ? 0 : this.#ends[chunkIndex - 1];
						const chunk = this.chunks[chunkIndex];
						const remaining = chunk.slice(read.at - base, Math.min(chunk.length, end - base));
						const boundary = remaining.search(CONTENT_ESCAPE);
						const length = Math.min(boundary < 0 ? remaining.length : boundary, limit - read.length);
						if (length > 0) {
							if (materialize) read.text += remaining.slice(0, length);
							read.at += length;
							read.length += length;
							if (read.at === base + chunk.length) chunkIndex++;
							continue;
						}
						const type = remaining.length > 1 ? remaining[1] : read.at + 1 < end ? this.chunks[chunkIndex + 1][0] : void 0;
						let decoded;
						let width = 2;
						if (remaining[0] === "\\" && type === void 0 && entry.end < 0) return;
						if (remaining[0] === "\\" && type === "u") {
							const hex = this.slice(read.at + 2, Math.min(end, read.at + 6));
							let valid = true;
							for (let i = 0; i < hex.length; i++) if (!isHex(hex[i])) valid = false;
							if (valid) {
								if (hex.length < 4 && entry.end < 0) return;
								if (hex.length === 4) decoded = String.fromCharCode(Number.parseInt(hex, 16));
							}
							width = 6;
						} else if (remaining[0] === "\\" && type !== void 0) decoded = SIMPLE_ESCAPES[type];
						if (decoded === void 0) {
							entry.invalidAt = read.at;
							this.#invalidValue = true;
							return;
						}
						if (materialize) read.text += decoded;
						read.length++;
						read.at += width;
						while (chunkIndex < this.chunks.length && read.at >= this.#ends[chunkIndex]) chunkIndex++;
					}
				}
				/** Locate new field ranges without decoding or parsing their contents. */
				scan() {
					if (this.object !== void 0 || this.#consumed === this.#size) return;
					for (let i = this.chunkAt(this.#consumed); i < this.chunks.length && this.#invalidAt === void 0; i++) {
						const pending = this.chunks[i];
						const base = i === 0 ? 0 : this.#ends[i - 1];
						for (let index = this.#consumed - base; index < pending.length && this.#mode !== "invalid"; index++) {
							if (this.#mode === "string" || this.#mode === "nested" && this.#nestedInString) {
								const end = this.stringBoundary(pending, index);
								this.#consumed += end - index;
								index = end;
								if (index === pending.length) break;
							}
							this.step(pending[index], this.#consumed);
							this.#consumed++;
						}
					}
				}
				/** Only raw quotes and their preceding backslash runs can terminate a string. */
				stringBoundary(fragment, start) {
					let at = start;
					while (true) {
						const quote = fragment.indexOf("\"", at);
						const end = quote < 0 ? fragment.length : quote;
						if (this.#mode === "string") {
							const entry = this.#current;
							if (!entry.needsDecoding && CONTENT_ESCAPE.test(fragment.slice(at, end))) entry.needsDecoding = true;
						}
						let slashStart = end;
						while (slashStart > at && fragment[slashStart - 1] === "\\") slashStart--;
						const escaped = (end - slashStart) % 2 === 1 !== (slashStart === at && this.#escape);
						this.#escape = quote < 0 && escaped;
						if (quote < 0 || !escaped) return end;
						at = quote + 1;
					}
				}
				step(c, at) {
					switch (this.#mode) {
						case "root":
							if (isWhitespace(c)) return;
							if (c === "{") {
								this.#mode = "key-or-end";
								return;
							}
							this.fail();
							return;
						case "key-or-end":
							if (isWhitespace(c)) return;
							if (c === "}") {
								this.#mode = "closed";
								return;
							}
							if (c === "\"") {
								this.beginKey(at);
								return;
							}
							this.fail();
							return;
						case "key-only":
							if (isWhitespace(c)) return;
							if (c === "\"") {
								this.beginKey(at);
								return;
							}
							this.fail();
							return;
						case "key":
							this.stepKey(c, at);
							return;
						case "colon":
							if (isWhitespace(c)) return;
							if (c === ":") {
								this.#mode = "value";
								return;
							}
							this.fail();
							return;
						case "value":
							this.beginValue(c, at);
							return;
						case "string": {
							const entry = this.#current;
							entry.end = at;
							this.#current = null;
							this.#mode = "comma-or-end";
							return;
						}
						case "scalar":
							this.stepScalar(c, at);
							return;
						case "nested":
							this.stepNested(c, at);
							return;
						case "comma-or-end":
							if (isWhitespace(c)) return;
							if (c === ",") {
								this.#mode = "key-only";
								return;
							}
							if (c === "}") {
								this.#mode = "closed";
								return;
							}
							this.fail();
							return;
						case "closed":
							if (isWhitespace(c)) return;
							this.fail();
							return;
						/* v8 ignore next 2 -- scan() stops stepping once the view is invalid. */
						case "invalid": return;
						/* v8 ignore next 2 -- Every scanner mode has a handler above. */
						default: assertNever(this.#mode);
					}
				}
				fail() {
					this.#invalidAt = this.#consumed;
					this.#mode = "invalid";
					this.#current = null;
				}
				beginKey(at) {
					this.#mode = "key";
					this.#keyStart = at + 1;
					this.#keyEscaped = false;
					this.#escape = false;
				}
				stepKey(c, at) {
					if (c < " ") {
						this.fail();
						return;
					}
					if (this.#escape) {
						this.#escape = false;
						return;
					}
					if (c === "\\") {
						this.#escape = true;
						this.#keyEscaped = true;
						return;
					}
					if (c !== "\"") return;
					const raw = this.slice(this.#keyStart, at);
					if (this.#keyEscaped) try {
						this.#key = JSON.parse(`"${raw}"`);
					} catch (_error) {
						this.fail();
						return;
					}
					else this.#key = raw;
					this.#mode = "colon";
				}
				open(entry) {
					if (!this.#entries.has(this.#key)) this.#order.push(this.#key);
					this.#entries.set(this.#key, entry);
					this.#current = entry;
				}
				beginValue(c, at) {
					if (isWhitespace(c)) return;
					if (c === "\"") {
						this.open({
							kind: "string",
							start: at + 1,
							end: -1,
							needsDecoding: false,
							invalidAt: void 0,
							length: void 0,
							text: void 0,
							prefixes: void 0
						});
						this.#escape = false;
						this.#mode = "string";
						return;
					}
					if (c === "}" || c === "," || c === ":" || c === "]") {
						this.fail();
						return;
					}
					this.open({
						kind: "value",
						start: at,
						end: -1,
						parsed: void 0,
						invalid: false
					});
					if (c === "{" || c === "[") {
						this.#mode = "nested";
						this.#nestedEnds = [c === "{" ? "}" : "]"];
						this.#nestedInString = false;
						this.#escape = false;
						return;
					}
					this.#mode = "scalar";
				}
				stepScalar(c, at) {
					if (c !== "," && c !== "}" && !isWhitespace(c)) return;
					this.closeValue(at);
					this.#mode = c === "," ? "key-only" : c === "}" ? "closed" : "comma-or-end";
				}
				stepNested(c, at) {
					if (this.#nestedInString) {
						this.#nestedInString = false;
						return;
					}
					if (c === "\"") {
						this.#nestedInString = true;
						return;
					}
					if (c === "{" || c === "[") {
						this.#nestedEnds.push(c === "{" ? "}" : "]");
						return;
					}
					if (c === "}" || c === "]") {
						if (this.#nestedEnds.pop() !== c) {
							this.fail();
							return;
						}
						if (this.#nestedEnds.length === 0) {
							this.closeValue(at + 1);
							this.#mode = "comma-or-end";
						}
					}
				}
				closeValue(end) {
					const entry = this.#current;
					entry.end = end;
					this.#current = null;
				}
			});
		}));
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
		/** THE PARSE-EDGE / TEST MINT: brand a draft id read off the wire or
		*  disk (route the typeof-guarded value through here at the door
		*  that pulled it), or mint a test literal. One line, no runtime
		*  validation — the brand is compile-time-only; the return cast is
		*  the construction door (the newRunId pattern).
		*  @param literal the plain draft id string at its parse edge
		*  @returns the same string, branded for the typed seats downstream */
		function draftIdOf(literal) {
			return literal;
		}
		/** The MINT — the inverse of benchSessionOf (2026-10-13, the card-UI
		*  duplication audit). The grammar moved to this floor and the DECISION
		*  beside it, but the mint stayed behind in six seats spelling
		*  `"bench-" + session` — one of which stripped the prefix and added
		*  it straight back. An address has one grammar, one sanitize, and now
		*  one mint. The composed bench id is BORN here, so the mint is one
		*  of the DraftId brand's two producers: the return cast is the
		*  construction door (the newRunId pattern).
		*  @param session the sanitized bench session key
		*  @returns the composed draft id, branded */
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
			deriveFamilyLane: () => deriveFamilyLane,
			draftIdOf: () => draftIdOf,
			dropAuthoringIncomplete: () => dropAuthoringIncomplete,
			extraOf: () => extraOf,
			familyKeyPresent: () => familyKeyPresent,
			hasModifierCapability: () => hasModifierCapability,
			healRunMediaPaths: () => healRunMediaPaths,
			isDataUrl: () => isDataUrl,
			isEitherOrHalfVoice: () => isEitherOrHalfVoice,
			isLiveRunStatus: () => isLiveRunStatus,
			isProvenance: () => isProvenance,
			isPurelyUnstatedRequiredVoice: () => isPurelyUnstatedRequiredVoice,
			isTerminalStatus: () => isTerminalStatus,
			isTogetherHalfVoice: () => isTogetherHalfVoice,
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
			laneTogetherClosure: () => laneTogetherClosure,
			loraAdaptersOf: () => loraAdaptersOf,
			loraIdOf: () => loraIdOf,
			loraLabel: () => loraLabel,
			loraStrengthBoundsOf: () => loraStrengthBoundsOf,
			marriedKnobValues: () => marriedKnobValues,
			modifiersFeatureOf: () => modifiersFeatureOf,
			moveItem: () => moveItem,
			newControlnetEntry: () => newControlnetEntry,
			newGenericEntry: () => newGenericEntry,
			newLoraEntry: () => newLoraEntry,
			normalizeBenchStage: () => normalizeBenchStage,
			normalizeBenchStages: () => normalizeBenchStages,
			normalizeLoraEntry: () => normalizeLoraEntry,
			normalizeSegmentStatus: () => normalizeSegmentStatus,
			offeredPool: () => offeredPool,
			projectStageView: () => projectStageView,
			projectUpstreamStages: () => projectUpstreamStages,
			reseatDeadKeys: () => reseatDeadKeys,
			resolveCellRow: () => resolveCellRow,
			resolveVariantRow: () => resolveVariantRow,
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
			unknownVariantVoice: () => unknownVariantVoice,
			variantMatrixFromFlatRows: () => variantMatrixFromFlatRows
		});
		var init_lib$1 = __esmMin((() => {
			init_extraKeys();
			init_laneRelations();
			init_familyLane();
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
				if (Date.now() - _cacheTime > _CACHE_TTL_MS && !_inflight$3) _inflight$3 = (async () => {
					try {
						_ingest(await apiJson("/v1/model-catalog"));
					} catch (e) {
						if (e instanceof CatalogContractError) useCatalogContractStore.getState().reportViolation(e.violations);
						else useCatalogContractStore.getState().reportError(e instanceof Error ? e.message : String(e));
					}
					return catalogStore.getState().catalog;
				})().finally(() => {
					_inflight$3 = null;
				});
				return cached;
			}
			if (_inflight$3) return _inflight$3;
			_inflight$3 = (async () => {
				try {
					return _ingest(await apiJson("/v1/model-catalog"));
				} catch (e) {
					if (e instanceof CatalogContractError) useCatalogContractStore.getState().reportViolation(e.violations);
					else useCatalogContractStore.getState().reportError(e instanceof Error ? e.message : String(e));
					throw e;
				}
			})().finally(() => {
				_inflight$3 = null;
			});
			return _inflight$3;
		}
		/** Fire-and-forget background load with auto-retry. If the first attempt
		* fails (gateway reloading, network blip), schedules a retry after 3s.
		* Keeps trying until the catalog loads, then notifies subscribers.
		* Safe to call multiple times — collapses into a single inflight request. */
		function ensureCatalog() {
			if (catalogStore.getState().loaded) return;
			if (_inflight$3) return;
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
		var CARD_GENRES, catalogStore, _cacheTime, _CACHE_TTL_MS, _inflight$3, _bgRetryTimer;
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
			_inflight$3 = null;
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
			if (_inflight$2) return _inflight$2;
			_inflight$2 = (async () => {
				try {
					const data = await apiJson("/v1/flows/families/param-schemas");
					if (!isValidSchemaIndex$1(data)) throw new Error(`families/param-schemas returned a malformed body (audit R-S7) — not cached, deferring to the backend gate`);
					_cache$1 = data;
					return data;
				} finally {
					_inflight$2 = null;
				}
			})();
			return _inflight$2;
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
		var _cache$1, _inflight$2, WIRE_RELAXED_KEYS$1, EDITOR_MOD_ENTRY_KEYS$1;
		var init_familyParamContract$1 = __esmMin((() => {
			init_api();
			_cache$1 = null;
			_inflight$2 = null;
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
		/** Mint the card doc for a start body. The doc carries the body
		*  verbatim (intent/stages/model/params become the card extras —
		*  see the drafts door, packages/estate/drafts, POST /v1/flows/drafts),
		*  so what the card shows is what the run consumed. Throws LOUDLY
		*  on any refusal — a refused compose never proceeds to a start
		*  (no silent cardless runs).
		*  @param body the raw start body (rides the compose POST verbatim)
		*  @param signal the caller's abort signal
		*  @returns the composed draft id, branded at this birth */
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
			return draftIdOf(draftId);
		}
		/** The card-birth half of every run start: return the body's
		*  declared draft_id when present, else compose the card and return
		*  the minted id. Stamp the result onto the start envelope BEFORE
		*  the start fetch:
		*
		*    startBody.draft_id = await ensureDraftId(startBody, signal)
		*
		*  @param body the raw start body (its declared draft_id wins)
		*  @param signal the caller's abort signal
		*  @returns the declared-or-composed draft id, branded at this door */
		async function ensureDraftId$1(body, signal) {
			const declared = body.draft_id;
			if (typeof declared === "string" && declared !== "") return draftIdOf(declared);
			return composeCard$1(body, signal);
		}
		var init_cardBirth$1 = __esmMin((() => {
			init_benchStage();
		}));
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
		async function initTagSync() {
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
		function tagsOf(key) {
			return useTagMap$1.getState().map[key] ?? [];
		}
		var TagColor$1, TAG_COLOR_VALUES$1, TAG_COLOR_META, STORAGE_KEY$1, SYNC_DEBOUNCE_MS$1, serverSyncEnabled$1, syncTimer$1, _retrySyncOnNextMutation$1, initial$1, tagMapActions$1, useTagMap$1;
		var init_tagMap = __esmMin((() => {
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
		async function loadForms(opts) {
			if (Object.keys(formsStore$1.getState().cache).length > 0 && !opts?.force) return formsStore$1.getState().cache;
			if (_inflight$1) return _inflight$1;
			_inflight$1 = (async () => {
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
					_inflight$1 = null;
				}
			})();
			return _inflight$1;
		}
		function getCachedForms() {
			return formsStore$1.getState().cache;
		}
		function subscribeForms(fn) {
			return formsStore$1.subscribe(() => {
				fn();
			});
		}
		/**
		* Reverse-lookup: given a sidebar_key (the value the rest of the app calls
		* `selectedService`), return the form-tag it belongs to. This is THE
		* primitive that drives every render decision in GenerateFormBody.
		*/
		function formForSidebarKey(sidebarKey, forms = formsStore$1.getState().cache) {
			for (const [formTag, entry] of Object.entries(forms)) if (entry.sidebar_key === sidebarKey) return formTag;
		}
		/**
		* Check whether the given sidebar_key belongs to the given form-tag.
		* Internal — the convenience predicates below are the public API.
		*/
		function isForm(sidebarKey, formTag, forms = formsStore$1.getState().cache) {
			return forms[formTag]?.sidebar_key === sidebarKey;
		}
		/** True if the sidebar_key belongs to ANY of the given form-tags. */
		function isInAnyForm(sidebarKey, formTags, forms = formsStore$1.getState().cache) {
			return formTags.some((t) => isForm(sidebarKey, t, forms));
		}
		/**
		* True if the sidebar_key belongs to any audio-genre form-tag.
		* (form_tts, form_voice, form_voice_studio, form_music, form_sound)
		*/
		function isAudioForm(sidebarKey, forms = formsStore$1.getState().cache) {
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
		var formsStore$1, _inflight$1, isTtsForm, isVoiceForm, isVoiceStudioForm, isMusicForm, isGenerateForm, isEditForm;
		var init_serviceForms = __esmMin((() => {
			init_api();
			init_clientStore();
			formsStore$1 = createClientStore({ cache: {} });
			_inflight$1 = null;
			isTtsForm = (k) => isForm(k, "form_tts");
			isVoiceForm = (k) => isForm(k, "form_voice");
			isVoiceStudioForm = (k) => isForm(k, "form_voice_studio");
			isMusicForm = (k) => isForm(k, "form_music");
			isGenerateForm = (k) => isForm(k, "form_generate");
			isEditForm = (k) => isForm(k, "form_edit");
		}));
		//#endregion
		//#region ../../web-kit/catalog/lib/waveform-peaks.js
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
		/** The audio-cue draw path (E3.14 READ side, seated 2026-10-26): the
		*  bars a cue surface paints at a given pixel width — the module's
		*  documented consumer, riding the store's own cue shape.
		*
		*  The LOD cache is the truth whenever it exists: the legacy
		*  200-bucket max-amplitude array is NEVER read behind a cache — it
		*  carries no min (the waveform's asymmetry is lost) and no zoom
		*  detail to select. A cache-less legacy cue (persisted before
		*  E3.14) lifts its array into symmetric min/max bars at the asked
		*  width — honest about its resolution. A cue with neither has no
		*  truth to draw; the caller paints the placeholder. */
		function cuePeaksForWidth(cue, width) {
			if (cue.waveformPeaksLOD) return getPeaksForWidth(cue.waveformPeaksLOD, width);
			const legacy = cue.waveformPeaks;
			if (legacy && legacy.length > 0) return resampleForWidth(legacy.map((p) => ({
				min: -p,
				max: p
			})), width);
			return [];
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
		//#region ../../web-kit/catalog/lib/enhance.js
		/**
		* The card's model picker source (2026-09-06): the LIVE route list
		* off the proof route — never a restated copy. Null when this
		* editor is NOT under a DSH host (no picker renders).
		*/
		async function fetchEnhanceRoutes(signal) {
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
		var init_enhance = __esmMin((() => {
			init_api();
		}));
		//#endregion
		//#region ../../web-kit/catalog/lib/cardLlm.js
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
		//#region ../../web-kit/catalog/lib/familyProvenance.js
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
		//#region ../../web-kit/catalog/lib/index.js
		var lib_exports = /* @__PURE__ */ __exportAll({
			CARD_LLM_KEY: () => CARD_LLM_KEY,
			CatalogContractError: () => CatalogContractError,
			LOD_BUCKETS: () => LOD_BUCKETS,
			LOD_ORDER: () => LOD_ORDER,
			RUN_STATUSES: () => RUN_STATUSES,
			RunStatusContractError: () => RunStatusContractError,
			TAG_COLOR_META: () => TAG_COLOR_META,
			TAG_COLOR_VALUES: () => TAG_COLOR_VALUES$1,
			TagColor: () => TagColor$1,
			activeVariantForRoute: () => activeVariantForRoute,
			agentEnhance: () => agentEnhance,
			apiFetch: () => apiFetch,
			apiJson: () => apiJson,
			assertNoParamDrops: () => assertNoParamDrops$1,
			assertParamsMatchFamilySchema: () => assertParamsMatchFamilySchema$1,
			axisCellExists: () => axisCellExists,
			canvasDefaultModel: () => canvasDefaultModel,
			cardLlmArg: () => cardLlmArg,
			coerceParamsToSchema: () => coerceParamsToSchema$1,
			collectNamedArtifacts: () => collectNamedArtifacts$1,
			collectStageUrls: () => collectStageUrls$1,
			composeCard: () => composeCard$1,
			composeVariantRoute: () => composeVariantRoute,
			computeMinMaxPeaks: () => computeMinMaxPeaks,
			computeWaveformLODs: () => computeWaveformLODs,
			contractToast: () => contractToast,
			controlnetTypesOf: () => controlnetTypesOf,
			cuePeaksForWidth: () => cuePeaksForWidth,
			decodeAudioPeaks: () => decodeAudioPeaks,
			describeErrorBody: () => describeErrorBody$1,
			dropdownModels: () => dropdownModels,
			enhancePrompt: () => enhancePrompt,
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
			familyProvenance: () => familyProvenance,
			familyTransformMatrix: () => familyTransformMatrix,
			fetchEnhanceRoutes: () => fetchEnhanceRoutes,
			formForSidebarKey: () => formForSidebarKey,
			formOf: () => formOf,
			formSidebarItems: () => formSidebarItems,
			formatLastRun: () => formatLastRun,
			getBackendState: () => getBackendState,
			getCachedCatalog: () => getCachedCatalog,
			getCachedForms: () => getCachedForms,
			getCardLlm: () => getCardLlm,
			getFamilySchema: () => getFamilySchema$1,
			getPeaksForWidth: () => getPeaksForWidth,
			hasViolationsSignature: () => hasViolationsSignature,
			hiddenFromDropdown: () => hiddenFromDropdown,
			initTagSync: () => initTagSync,
			isAudioForm: () => isAudioForm,
			isCatalogLoaded: () => isCatalogLoaded,
			isEditForm: () => isEditForm,
			isEmbedded: () => isEmbedded,
			isFamilySchemaCachePopulated: () => isFamilySchemaCachePopulated$1,
			isGenerateForm: () => isGenerateForm,
			isMusicForm: () => isMusicForm,
			isTagColor: () => isTagColor$1,
			isTtsForm: () => isTtsForm,
			isVoiceForm: () => isVoiceForm,
			isVoiceStudioForm: () => isVoiceStudioForm,
			loadCatalog: () => loadCatalog,
			loadFamilySchemas: () => loadFamilySchemas$1,
			loadForms: () => loadForms,
			modelDescription: () => modelDescription,
			modelLabel: () => modelLabel,
			narrowGenre: () => narrowGenre,
			onBackendState: () => onBackendState,
			onCatalogReady: () => onCatalogReady,
			parsePickerAria: () => parsePickerAria,
			pollFlowRun: () => pollFlowRun$1,
			presetsForRoute: () => presetsForRoute,
			primeCatalog: () => primeCatalog,
			readPickerModel: () => readPickerModel,
			resampleForWidth: () => resampleForWidth,
			resolvePickerRoute: () => resolvePickerRoute,
			retryTagSyncAfterFault: () => retryTagSyncAfterFault$1,
			routeCoordinates: () => routeCoordinates,
			runCompiledGeneration: () => runCompiledGeneration$1,
			sanitizeRevivedResult: () => sanitizeRevivedResult$1,
			selectLOD: () => selectLOD,
			setCardLlm: () => setCardLlm,
			setContractToastSink: () => setContractToastSink,
			setRequiredEmptyResolver: () => setRequiredEmptyResolver$1,
			studioOf: () => studioOf,
			subscribeForms: () => subscribeForms,
			tagsOf: () => tagsOf,
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
			init_tagMap();
			init_runStatusContractStore();
			init_runStatusContract();
			init_serviceForms();
			init_waveform_peaks();
			init_cardBirth$1();
			init_enhance();
			init_cardLlm();
			init_familyProvenance();
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
			if (_inflight) return _inflight;
			_inflight = (async () => {
				try {
					const data = await apiJson$1("/v1/flows/families/param-schemas");
					if (!isValidSchemaIndex(data)) throw new Error(`families/param-schemas returned a malformed body (audit R-S7) — not cached, deferring to the backend gate`);
					_cache = data;
					return data;
				} finally {
					_inflight = null;
				}
			})();
			return _inflight;
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
		var _cache, _inflight, WIRE_RELAXED_KEYS, EDITOR_MOD_ENTRY_KEYS;
		var init_familyParamContract = __esmMin((() => {
			init_api$1();
			_cache = null;
			_inflight = null;
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
		*  (no silent cardless runs).
		*  @param body the raw start body (rides the compose POST verbatim)
		*  @param signal the caller's abort signal
		*  @returns the composed draft id, branded at this birth */
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
			return draftIdOf(draftId);
		}
		/** The card-birth half of every run start: return the body's
		*  declared draft_id when present, else compose the card and return
		*  the minted id. Stamp the result onto the start envelope BEFORE
		*  the start fetch:
		*
		*    startBody.draft_id = await ensureDraftId(startBody, signal)
		*
		*  @param body the raw start body (its declared draft_id wins)
		*  @param signal the caller's abort signal
		*  @returns the declared-or-composed draft id, branded at this door */
		async function ensureDraftId(body, signal) {
			const declared = body.draft_id;
			if (typeof declared === "string" && declared !== "") return draftIdOf(declared);
			return composeCard(body, signal);
		}
		var init_cardBirth = __esmMin((() => {
			init_benchStage();
		}));
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
		init_clientStore$1();
		init_api$1();
		const TAG_COLOR_VALUES = Object.values({
			brand: "brand",
			sky: "sky",
			violet: "violet",
			rose: "rose",
			emerald: "emerald",
			amber: "amber",
			cyan: "cyan"
		});
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
		const STORAGE_KEY = "melite:tag-map:v1";
		const SYNC_DEBOUNCE_MS = 500;
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
		let serverSyncEnabled = false;
		let syncTimer = null;
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
		/**
		* Hydrate the store from the server (canonical) + enable server pushes.
		* Called once by the app shell on mount. The store already has the
		* localStorage cache (loaded synchronously at module init), so the UI renders
		* immediately; this replaces it with the server copy if one exists (the server
		* wins ties — it's the cross-device source of truth). After this call,
		* mutations push to the server via the debounced PUT.
		*
		* Silent on failure: if the server is unreachable, the store keeps the
		* localStorage cache and server pushes stay disabled (offline mode).
		*/
		let _retrySyncOnNextMutation = false;
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
		const initial = loadPersisted();
		const tagMapActions = (set, get) => ({
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
		const useTagMap = createClientStore$1((set, get) => ({
			...tagMapActions(set, get),
			tags: initial.tags,
			map: initial.map
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/serviceForms.ts
		init_api$1();
		init_clientStore$1();
		createClientStore$1({ cache: {} });
		//#endregion
		//#region ../../web-kit/catalog/src/enhance.ts
		init_api$1();
		//#endregion
		//#region ../../web-kit/catalog/src/index.ts
		init_api$1();
		init_contractToast$1();
		init_catalogContract$1();
		init_catalogContractStore$1();
		init_modelCatalog$1();
		init_FlowProtocol();
		init_familyParamContract();
		init_runStatusContractStore$1();
		init_runStatusContract$1();
		init_cardBirth();
		//#endregion
		//#region src/client/index.ts
		setContractToastSink$1((type, message, action) => {
			_melite_card_base_client.useToastStore.getState().addToast(type, message, action);
		});
		/** The tab type's identity (the id its body registers under — the
		*  deleted package's contract spelling, restored). */
		const MEDIA_TAB_ID = "infer-media:media";
		/** The estate-artifact resource type's identity (its body registers under it). */
		const ESTATE_ARTIFACT_TAB_ID = "infer-media:estate-artifact";
		/** Required services (fiber inject waiting — the tab registry must be
		*  up first). NO uiSession: the pane-tab slot itself threads the
		*  session-scoped standard props to the body (the deliverables
		*  ReviewTab receipt — sessionId arrives as a prop). */
		const inject = ["slots", "sidebarRightTabs"];
		/**
		* Client apply: registers
		* the Media tab (type + body) exactly as the deleted client and the
		* shipped tabs do.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			try {
				ctx.effect(() => ctx.sidebarRightTabs.register({
					id: MEDIA_TAB_ID,
					kind: "media",
					title: () => galleryCopy.mediaTabTitle,
					guide: [{
						id: "media-tab-guide",
						order: 51,
						title: () => galleryCopy.mediaTabTitle,
						description: () => galleryCopy.mediaTabGuide,
						icon: MediaTabIcon
					}]
				}), "melite-gallery: media tab type");
			} catch (error) {
				console.error("[melite-gallery] media tab type registration failed:", error);
			}
			try {
				ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({
					name: "sidebar.right.pane.tab",
					key: MEDIA_TAB_ID
				}, MediaPanel));
			} catch (error) {
				console.error("[melite-gallery] media tab body registration failed:", error);
			}
			try {
				ctx.effect(() => ctx.sidebarRightTabs.register({
					id: ESTATE_ARTIFACT_TAB_ID,
					kind: "estate-artifact",
					patterns: ["dsh-resource://estate-artifact/**"],
					priority: "builtin",
					title: (address) => {
						const url = artifactUrlOfAddress(address);
						return url !== null ? artifactNameOf(url) : galleryCopy.artifactFallbackTitle;
					}
				}), "melite-gallery: estate-artifact tab type");
			} catch (error) {
				console.error("[melite-gallery] estate-artifact tab type registration failed:", error);
			}
			try {
				ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({
					name: "sidebar.right.pane.tab",
					key: ESTATE_ARTIFACT_TAB_ID
				}, ArtifactTabBody));
			} catch (error) {
				console.error("[melite-gallery] estate-artifact tab body registration failed:", error);
			}
		}
		//#endregion
		exports.MEDIA_KINDS = MEDIA_KINDS;
		exports.MediaPanel = MediaPanel;
		exports.MediaTabIcon = MediaTabIcon;
		exports.apply = apply;
		exports.artifactPathOfUrl = artifactPathOfUrl;
		exports.callsTextOf = callsTextOf;
		exports.cardsBenchAddress = cardsBenchAddress;
		Object.defineProperty(exports, "cardsRunAddress", {
			enumerable: true,
			get: function() {
				return _melite_card_base_client.cardsRunAddress;
			}
		});
		exports.decodeDrafts = decodeDrafts;
		exports.decodeRuns = decodeRuns;
		exports.deleteArtifact = deleteArtifact;
		exports.flatten = flatten;
		exports.inject = inject;
		exports.kindOf = kindOf;
		exports.loadDraftOntoBench = loadDraftOntoBench;
		exports.loadRunOntoBench = loadRunOntoBench;
		exports.renameArtifact = renameArtifact;
		exports.useFeed = useFeed;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
