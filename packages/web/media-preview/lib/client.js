window.__ModuleLoader__.load({
	id: "@melite/media-preview",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		// ../../web-kit/contracts/src/mediaKinds.ts
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
		/** Is this name audio a PLAYER can decode (operator 2026-11-12: a
		*  .qvoice output must carry no play button)? qvoice classifies as
		*  audio so a preserved voice LISTS in the media library (the TTS
		*  chain audit, 2026-10-15), but the container carries voice
		*  EMBEDDINGS, not PCM — the player seat (not the classifier) asks
		*  this predicate, so listing and playback stay two different
		*  questions with one spelling between them. @param name the file
		*  name or url (query/fragment stripped like every other seat). */
		function isPlayableAudioName(name) {
			const withoutQuery = name.split(/[?#]/, 1)[0];
			return mediaKindOf(withoutQuery) === "audio" && !withoutQuery.toLowerCase().endsWith(".qvoice");
		}
		/** The MIME table for artifact SERVING (the audio-seek stroke,
		*  2026-10-08): ONE spelling of extension → content-type shared by
		*  every route that serves run artifact bytes (the estate media
		*  route + the gallery artifact route — the gallery's inline
		*  ternary had already drifted: mp4 answered video/webm, audio
		*  answered octet-stream, and no player seeks what it is barely
		*  willing to name). Unknown extensions answer octet-stream.
		*
		*  svg is DELIBERATELY ABSENT: an inline image/svg+xml answer is a
		*  same-origin script execution vector — svg artifacts serve as
		*  octet-stream (a download), never an executable document. */
		const MIME_BY_EXT = {
			png: "image/png",
			jpg: "image/jpeg",
			jpeg: "image/jpeg",
			webp: "image/webp",
			gif: "image/gif",
			bmp: "image/bmp",
			mp4: "video/mp4",
			webm: "video/webm",
			mkv: "video/x-matroska",
			mov: "video/quicktime",
			mp3: "audio/mpeg",
			wav: "audio/wav",
			flac: "audio/flac",
			ogg: "audio/ogg",
			m4a: "audio/mp4",
			aac: "audio/aac",
			glb: "model/gltf-binary",
			gltf: "model/gltf+json",
			json: "application/json; charset=utf-8",
			txt: "text/plain; charset=utf-8",
			csv: "text/csv; charset=utf-8",
			md: "text/markdown; charset=utf-8"
		};
		/** The content-type one artifact answer carries: the extension's
		*  mapped media type, octet-stream for everything unknown. */
		function contentTypeForArtifact(name) {
			const dot = name.lastIndexOf(".");
			const ext = dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
			return MIME_BY_EXT[ext] ?? "application/octet-stream";
		}
		// src/client/mediaDocument.tsx
		/**
		* mediaDocument.tsx — the share door's preview bodies: one VIDEO face
		* and one AUDIO face for the GUI's sidebar document seat.
		*
		* THE SEAM (references/deepseek-harness/docs — the ui-deliverables +
		* sidebar-documentpreview pair): the agent's `present` toolcall
		* declares files; the delivery card's click opens the right-Sidebar
		* document tab; the tab picks a renderer from
		* `ctx.documentPreviews` by file suffix (extension band over builtin,
		* longest suffix first) and mounts its body from the keyed
		* `sidebar.right.tab.document` slot under the same id. This package
		* registers the estate's video/audio vocabulary there — before it,
		* a presented .mp4 or .wav hit the "known binary container suffix
		* without a registered renderer" dead end while a .png previewed
		* fine (the operator's exact gap: images work, video and audio do
		* not).
		*
		* THE BODIES are presentational only (the web-card law: derive from
		* the slot's shared state, own no fetch): `loading: 'bytes-complete'`
		* hands the whole file as `{ kind: 'bytes', data }`; the body mints
		* ONE Blob URL from those bytes with the estate's ONE MIME spelling
		* (contentTypeForArtifact — the audio-seek stroke law: no player
		* seeks what it is barely willing to name), mounts the native
		* element (`<video controls>` / `<audio controls>`), and revokes the
		* URL on unmount and on every bytes change (the DSH builtin image
		* renderer's own Blob lifecycle, mirrored).
		*
		* THE QVOICE LAW (cards-qvoice-no-play-button, operator 2026-11-12):
		* a .qvoice output carries NO player — the container is voice
		* embeddings, not PCM. The classifier keeps it in the audio
		* vocabulary so it lists; the PLAYER seat asks
		* `isPlayableAudioName` (the one spelling), so a qvoice preview
		* renders the embedding face (named note, never an audio element).
		*
		* The slot's owner fields arrive spread on the props themselves
		* (PropsRuntime = OwnerOf & … — content, resourceAddress, wrap at
		* the top level, the same shape ToolCallViewProps carries `block`).
		*/
		/** The shared bytes face: the body's Blob URL lifecycle, owned once.
		* A non-bytes content value (never delivered for a 'bytes-complete'
		* registration) renders nothing — the owner's own states carry the
		* pending/failure faces, and a renderer that guessed a source would
		* fight the seat. @returns the object URL, or null while bytes are
		* absent. */
		function useDocumentBlobUrl(owner) {
			const data = owner.content.kind === "bytes" ? owner.content.data : null;
			const url = (0, react.useMemo)(() => {
				if (data === null) return null;
				const leaf = owner.resourceAddress.slice(owner.resourceAddress.lastIndexOf("/") + 1);
				return URL.createObjectURL(new Blob([data], { type: contentTypeForArtifact(leaf) }));
			}, [data, owner.resourceAddress]);
			(0, react.useEffect)(() => () => {
				if (url !== null) URL.revokeObjectURL(url);
			}, [url]);
			return url;
		}
		/** The decoded filename the seat previews — the address's last
		* segment (separators stay literal in DSH file addresses; each
		* segment rides percent-encoded, decoded once like every consumer
		* of the address grammar). The renderer selection itself already
		* matched on this suffix. */
		function documentLeaf(owner) {
			const last = owner.resourceAddress.slice(owner.resourceAddress.lastIndexOf("/") + 1);
			try {
				return decodeURIComponent(last);
			} catch {
				return last;
			}
		}
		/** THE VIDEO FACE: the estate's video vocabulary (mp4 webm mkv mov
		* m4v avi — mediaVocab's own set, never a private list) behind one
		* native controls player. The element's own error face covers a
		* container the browser cannot decode (mkv/avi on some engines) —
		* the browser's honest answer, never the estate's silent dead end. */
		function VideoDocumentBody(props) {
			const url = useDocumentBlobUrl(props);
			if (url === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, {});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("video", {
				controls: true,
				src: url,
				"data-testid": "melite-media-preview-video",
				style: {
					display: "block",
					maxWidth: "100%",
					maxHeight: "100%",
					margin: "auto"
				}
			});
		}
		/** THE AUDIO FACE: the estate's audio vocabulary behind one native
		* controls player — except the qvoice arm, which renders the
		* embedding face (the no-play-button law, one spelling:
		* isPlayableAudioName). */
		function AudioDocumentBody(props) {
			const url = useDocumentBlobUrl(props);
			const leaf = documentLeaf(props);
			if (url === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, {});
			if (!isPlayableAudioName(leaf)) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-testid": "melite-media-preview-embedding",
				style: {
					padding: 24,
					opacity: .8
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
					style: { margin: 0 },
					children: [leaf, " — voice embeddings (qvoice), not audio a player can decode; the voice rides the tts lane’s own seats."]
				})
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("audio", {
				controls: true,
				src: url,
				"data-testid": "melite-media-preview-audio",
				style: {
					display: "block",
					width: "100%"
				}
			});
		}
		// src/client/index.ts
		const VIDEO_PREVIEW_ID = "melite.preview.video";
		const AUDIO_PREVIEW_ID = "melite.preview.audio";
		/** The video renderer's metadata: the estate's video vocabulary,
		* binary-whole (no plain-text fallback for a video container),
		* bytes-complete loading. Derived from mediaVocab — never a private
		* list. */
		function videoPreviewDefinition() {
			return {
				id: VIDEO_PREVIEW_ID,
				extensions: mediaVocab().video,
				binaryExtensions: mediaVocab().video,
				priority: "extension",
				title: () => "Video",
				loading: "bytes-complete"
			};
		}
		/** The audio renderer's metadata: the estate's audio vocabulary
		* (qvoice included — it registers so the tab opens the EMBEDDING
		* face instead of the unsupported dead end; the player arm stays
		* gated inside the body by isPlayableAudioName). */
		function audioPreviewDefinition() {
			return {
				id: AUDIO_PREVIEW_ID,
				extensions: mediaVocab().audio,
				binaryExtensions: mediaVocab().audio,
				priority: "extension",
				title: () => "Audio",
				loading: "bytes-complete"
			};
		}
		/** 'slots' (the keyed document-body seat) + the documentpreview
		*  registry — both provided by the web app bundle; this row is
		*  web-surface-disabled without it (the render-seat patch law). */
		const inject = ["slots", "documentPreviews"];
		function apply(ctx) {
			try {
				ctx.effect(() => ctx.documentPreviews.register(videoPreviewDefinition()), "@melite/media-preview: video renderer");
			} catch (error) {
				console.error("[melite/media-preview] video renderer registration failed:", error);
			}
			try {
				ctx.effect(() => ctx.slots.inject("sidebar.right.tab.document", () => ctx.slots.register({
					name: "sidebar.right.tab.document",
					key: VIDEO_PREVIEW_ID
				}, VideoDocumentBody)), "@melite/media-preview: video body");
			} catch (error) {
				console.error("[melite/media-preview] video body registration failed:", error);
			}
			try {
				ctx.effect(() => ctx.documentPreviews.register(audioPreviewDefinition()), "@melite/media-preview: audio renderer");
			} catch (error) {
				console.error("[melite/media-preview] audio renderer registration failed:", error);
			}
			try {
				ctx.effect(() => ctx.slots.inject("sidebar.right.tab.document", () => ctx.slots.register({
					name: "sidebar.right.tab.document",
					key: AUDIO_PREVIEW_ID
				}, AudioDocumentBody)), "@melite/media-preview: audio body");
			} catch (error) {
				console.error("[melite/media-preview] audio body registration failed:", error);
			}
		}
		exports.AUDIO_PREVIEW_ID = AUDIO_PREVIEW_ID;
		exports.AudioDocumentBody = AudioDocumentBody;
		exports.VIDEO_PREVIEW_ID = VIDEO_PREVIEW_ID;
		exports.VideoDocumentBody = VideoDocumentBody;
		exports.apply = apply;
		exports.audioPreviewDefinition = audioPreviewDefinition;
		exports.documentLeaf = documentLeaf;
		exports.inject = inject;
		exports.useDocumentBlobUrl = useDocumentBlobUrl;
		exports.videoPreviewDefinition = videoPreviewDefinition;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
