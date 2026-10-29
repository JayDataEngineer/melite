import { RUN_ID_RE } from "@melite/contracts/benchStage";
import { mediaVocab } from "@melite/contracts/mediaKinds";
/**
 * melite_view — the estate's OBSERVE arm for images (the decide
 * loop's eye, 2026-09-14). One run's artifact, VIEWED: the tool
 * resolves the run's output tree through the queue seat, reads the
 * newest image (or the artifact the caller names), and commits it
 * through the harness attachment store — the model receives the
 * image itself, not a description of it.
 *
 * THE COPY LAW (DSH tool-fs `read_image`, studied then copied): the
 * route gate (the session's routed provider/model must DECLARE
 * image input — a blind calling route gets labeled text or the
 * delegated eye's verdict, the mesh arm its strict refusal — BEFORE
 * pixels ride any block), the signature sniffer (extension first,
 * bytes authoritative), `attachments.saveImage` → durable
 * `ImageAttachmentRef`, and the render pairing — one text summary
 * block + one `{type:'image', attachment}` block re-branded from
 * the structured value (`imageRefFromValue`). No inline base64, no
 * bespoke vision lane: the attachment service owns normalization,
 * limits, and the durable log.
 *
 * VIEWING IS NOT A RUN PRESS (the interface law): this tool lands
 * in the BASE toolset — browser sessions may look at what a run
 * produced; only the run DOORS stay headless-gated.
 *
 * CONTAINMENT (estate/media's law, same spelling): the run id must
 * match the queue's RUN_ID grammar, and the file path is BUILT from
 * the walk's own answer (`stateRoot/output/<runId>/<name>` from
 * `listMedia`) — never from caller text. The caller's `artifact` is
 * a substring FILTER over names the walk already produced.
 */
import { basename, extname, join } from 'node:path';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { executeSingle } from '@melite/comfyui-cordis';
import { defineTool } from '@deepseek-ai/dsh-tools';
import { AttachmentError, AttachmentId } from '@deepseek-ai/dsh-attachment';
import { probeMedia } from "./mp4Probe.js";
import { meshVoice, summarizeMesh } from "./glbSummary.js";
import { listMedia } from '@melite/estate-media';
import { resolveVisionRoute, verifyVisual, viewRoutePreference } from "./vision-route.js";
import { rootsManifest, searchedVoice } from '@melite/estate-queue';
/** §23 CROSS-ROOTS (2026-09-23): the view walk searches the
 *  manifest in order — own root first, then the extras (the queue
 *  seat's stateRoots config). First root holding the run serves (own
 *  writes win); a miss names every searched root. */
const firstRootWithRun = async (seat, kind, runId) => {
    for (const root of rootsManifest(seat.stateRoot, seat.stateRoots ?? [])) {
        const { items } = await listMedia(root, kind);
        const own = items.filter((i) => i.runId === runId);
        if (own.length > 0)
            return { own, root };
    }
    return null;
};
/** The run-id grammar (estate/media's containment law, verbatim). */
const RUN_ID = RUN_ID_RE;
/**
 * Extension → declared media type for the image walk. THE EXT SET IS
 * DERIVED from mediaVocab's galleryImage mint set (the SSOT — the
 * li-ay stroke's law: one vocabulary, or the seats disagree by
 * construction); the MIME VALUES are bounded by dsh-attachment's
 * ImageMediaType union, the host seat saveImage accepts. An
 * extension the vocab classifies but the estate never mints
 * (svg/bmp/avif) or the SDK cannot attach never enters this table.
 */
const IMAGE_MEDIA_TYPES = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
};
const IMAGE_EXTENSIONS = Object.fromEntries(mediaVocab().galleryImage.flatMap((ext) => {
    const mediaType = IMAGE_MEDIA_TYPES[ext];
    return mediaType === undefined ? [] : [['.' + ext, mediaType]];
}));
/**
 * The audio and model intent vocabularies, DERIVED from the SSOT
 * (mediaVocab's full classifier sets — the 2026-11-12 fold: the
 * hand-copied audio set had already drifted, missing qvoice the
 * TTS-chain audit added to the vocab; a named `voice.qvoice` fell
 * through the audio arm to the image walk). One spelling, both
 * arms.
 */
const AUDIO_EXTENSIONS = new Set(mediaVocab().audio.map((ext) => '.' + ext));
const MODEL_EXTENSIONS = new Set(mediaVocab().model.map((ext) => '.' + ext));
/** PNG/JPEG file signatures; GIF/WebP match by ASCII (read_image). */
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const JPEG_SIGNATURE = [255, 216, 255];
const matchesBytes = (data, offset, expected) => {
    if (data.byteLength < offset + expected.length)
        return false;
    return expected.every((byte, index) => data[offset + index] === byte);
};
const matchesAscii = (data, offset, value) => {
    if (data.byteLength < offset + value.length)
        return false;
    for (let index = 0; index < value.length; index += 1) {
        if (data[offset + index] !== value.charCodeAt(index))
            return false;
    }
    return true;
};
/** Identify the media type declared by a supported image signature. */
export function sniffImageMediaType(data) {
    if (matchesBytes(data, 0, PNG_SIGNATURE))
        return 'image/png';
    if (matchesBytes(data, 0, JPEG_SIGNATURE))
        return 'image/jpeg';
    if (matchesAscii(data, 0, 'GIF87a') || matchesAscii(data, 0, 'GIF89a'))
        return 'image/gif';
    if (matchesAscii(data, 0, 'RIFF') && matchesAscii(data, 8, 'WEBP'))
        return 'image/webp';
    return undefined;
}
/** Map a path to its declared image media type by extension. */
export function imageMediaTypeForPath(filePath) {
    return IMAGE_EXTENSIONS[extname(filePath).toLowerCase()];
}
/** Contact-sheet plan: four timestamps across the film's span (a
 *  beginning, two middles, near the end — the observe arm wants the
 *  arc, not four copies of frame one). Duration unknown (a probe
 *  without a format row) → one early frame, never a blind seek past
 *  the end. Pure. */
export function sheetPlan(duration_s) {
    if (duration_s === undefined || !Number.isFinite(duration_s) || duration_s <= 0)
        return [0.5];
    const at = (f) => Math.round(duration_s * f * 100) / 100;
    return [at(0.1), at(0.4), at(0.7), at(0.95)];
}
/** Re-brand the structured outcome into the durable reference an
 * ImageBlock carries (read_image's imageRefFromValue, copied). The
 * parameter is the PRESENT image — callers assert presence (the
 * text-only observe arm never reaches here). */
export function imageRefFromValue(image) {
    return {
        attachmentId: AttachmentId(image.attachmentId),
        mediaType: image.mediaType,
        bytes: image.bytes,
        width: image.width,
        height: image.height,
        ...(image.name === undefined ? {} : { name: image.name }),
        ...(image.originalDimensions === undefined ? {} : { originalDimensions: { ...image.originalDimensions } }),
    };
}
/** Default render: one utility graph through executeSingle (the
 *  estate's non-plugin execute face), PreviewImage so the sheet
 *  rides the engine's temp plane (the output tree stays untouched),
 *  fetched back through /view into the scratch dir. */
export const defaultMediaSheetRender = async (node, inputs, signal) => {
    const work = await mkdtemp(join(tmpdir(), 'melite-view-'));
    try {
        const graph = {
            workflow: {
                '1': { class_type: node, inputs },
                '2': { class_type: 'PreviewImage', inputs: { images: ['1', 0] } },
            },
        };
        await executeSingle(work, graph, {}, { timeoutS: 300, shouldStop: () => signal.aborted });
        const names = (await readdir(work)).filter((n) => n.endsWith('.png'));
        if (names.length === 0) {
            throw new Error('the engine returned no sheet image for ' + node);
        }
        return new Uint8Array(await readFile(join(work, names[0])));
    }
    finally {
        await rm(work, { recursive: true, force: true });
    }
};
export const defaultBytesReader = async (absPath) => new Uint8Array(await readFile(absPath));
async function probeFile(absPath, name, kind, read = defaultBytesReader) {
    let bytes;
    try {
        bytes = await read(absPath);
    }
    catch (error) {
        throw new Error('cannot view the ' + kind + ' "' + name + '": the artifact could not be read (' + (error instanceof Error ? error.message : String(error)) + ')', { cause: error });
    }
    try {
        return probeMedia(bytes);
    }
    catch (error) {
        throw new Error('cannot view the ' + kind + ' "' + name + '": ' + String(error.message), { cause: error });
    }
}
/** THE SHEET COMMIT: the engine-produced contact sheet (the
 *  host-binary cure — the vendored MeliteFrameSheet node decodes the
 *  film inside the engine and composes the tiled sheet as a graph
 *  output) plus the durable store commit. Shared by the capable arm
 *  and the delegated eye (the blind route that found a seeing route
 *  builds the SAME sheet — no second truth). */
async function commitFilmSheet(attachments, render, rowName, absPath, stamps, signal) {
    let data;
    try {
        data = await render('MeliteFrameSheet', { video: absPath, stamps, width: 320 }, signal);
    }
    catch (error) {
        throw new Error('cannot view the film "' + rowName + '": the contact sheet could not be built (' + (error instanceof Error ? error.message : String(error)) + ')', { cause: error });
    }
    const byteCap = Math.min(attachments.imageLimits.maxImageBytes, attachments.imageLimits.maxMessageImageBytes);
    if (data.byteLength > byteCap) {
        throw new Error('cannot view the film "' + rowName + '": its contact sheet exceeds the ' + String(byteCap) + '-byte image cap');
    }
    try {
        return await attachments.saveImage({ data, mediaType: 'image/png', name: basename(rowName, extname(rowName)) + '-sheet.png' });
    }
    catch (error) {
        throw new Error('cannot commit the film contact sheet for "' + rowName + '": ' + (error instanceof Error ? error.message : String(error)), { cause: error });
    }
}
/** THE FILM'S DELEGATED EYE (Commission 17's cure): the calling
 *  route is blind but the lane seats an eye, so the contact sheet
 *  IS built — for the route that can see it — and the seeing
 *  route's verdict rides the measurements as labeled text. Null when
 *  the lane seats no eye: the sheet is never built for nobody (the
 *  old economy) and the caller serves the probe facts alone. */
async function delegatedFilmVisual(seat, runId, row, absPath, probe, exec, ctx, attachments, render) {
    const llm = ctx.get('llm');
    if (llm === undefined || typeof llm.stream !== 'function')
        return null;
    const route = await seeingRoute(ctx, exec);
    if (route === null)
        return null;
    const stamps = sheetPlan(probe.duration_s);
    const ref = await commitFilmSheet(attachments, render, row.name, absPath, stamps.length, exec.signal);
    const seen = await verifyVisual(llm, route, ref, 'film', exec.signal);
    const streams = probe.streams.map((s) => s.codec + (s.width !== undefined && s.height !== undefined ? ' ' + String(s.width) + 'x' + String(s.height) : '')
        + (s.fps !== undefined ? ' @' + s.fps : '') + (s.frames !== undefined ? ' ' + String(s.frames) + 'f' : '')).join(' + ');
    return {
        runId,
        url: row.url,
        host: absPath,
        textObservation: 'melite_view film: ' + row.name
            + (probe.duration_s !== undefined ? ', ' + String(probe.duration_s) + 's' : '')
            + ', ' + String(probe.size_bytes) + ' bytes, streams: ' + streams
            + ', contact sheet of ' + String(stamps.length)
            + '; VISUAL VERIFICATION via ' + seen.via + ' (a seeing route looked at the sheet): ' + seen.verdict,
    };
}
/** View a film artifact: the container summary + a contact sheet committed
 *  as the viewed image (the §24 gate — one view artifact, stream
 *  summary + frames the model can SEE). Containment rides the walk's
 *  own row (absPath built from runId + name, never caller text); the
 *  sheet lands in os.tmpdir (never the run tree — a view must not
 *  mint provenance). */
export async function viewFilmArtifact(seat, runId, artifact, exec, ctx, attachments, render = defaultMediaSheetRender, read = defaultBytesReader) {
    // §23 CROSS-ROOTS: the video walk spans the manifest (own root
    // first); the miss names every searched tree.
    const found = await firstRootWithRun(seat, 'video', runId);
    if (found === null) {
        // §23 NAME-THE-ROOT: the miss names the searched tree(s) (same
        // law as the registry's unknown-run — a two-roots box stays
        // debuggable). The prefix keeps the old walls green.
        throw new Error('run "' + runId + '" produced no image artifacts (and no viewable film — the run holds no video artifacts either) ' + searchedVoice(rootsManifest(seat.stateRoot, seat.stateRoots ?? [])));
    }
    const own = found.own;
    const picked = artifact.length > 0 ? own.filter((i) => i.name.includes(artifact)) : own;
    if (picked.length === 0) {
        throw new Error('run "' + runId + '" has no film artifact containing "' + artifact + '" — the run holds: ' + own.slice(0, 8).map((i) => i.name).join(', ') + ' ' + searchedVoice(rootsManifest(seat.stateRoot, seat.stateRoots ?? [])));
    }
    const row = picked[0];
    const absPath = join(found.root, 'output', row.runId, row.name);
    // THE PROBE IS TYPESCRIPT: the container is a box tree, so its facts
    // are read from bytes. No ffprobe, no host binary, no subprocess.
    const probe = await probeFile(absPath, row.name, 'film', read);
    // THE TEXT-ONLY OBSERVE ARM: the probe facts are text, so a route
    // that cannot take an image still gets the observation — unless the
    // lane seats a seeing route (the delegated eye below), in which
    // case the contact sheet IS built, for the eye that can see it.
    const capability = await routeImageCapability(ctx, exec, runId);
    if (!capability.capable) {
        const seen = await delegatedFilmVisual(seat, runId, row, absPath, probe, exec, ctx, attachments, render);
        if (seen !== null)
            return seen;
        return {
            runId,
            url: row.url,
            host: absPath,
            textObservation: filmTextObservation(row.name, probe, capability.model),
        };
    }
    const stamps = sheetPlan(probe.duration_s);
    const ref = await commitFilmSheet(attachments, render, row.name, absPath, stamps.length, exec.signal);
    return {
        runId: row.runId,
        url: row.url,
        host: absPath,
        image: {
            attachmentId: ref.attachmentId,
            mediaType: ref.mediaType,
            bytes: ref.bytes,
            width: ref.width,
            height: ref.height,
            ...(ref.name === undefined ? {} : { name: ref.name }),
            ...(ref.originalDimensions === undefined ? {} : { originalDimensions: { ...ref.originalDimensions } }),
        },
        film: {
            file: row.name,
            ...(probe.duration_s === undefined ? {} : { duration_s: probe.duration_s }),
            size_bytes: probe.size_bytes,
            streams: probe.streams.map((s) => ({ codec: s.codec, ...(s.codec_type === undefined ? {} : { codec_type: s.codec_type }), ...(s.width === undefined ? {} : { width: s.width }), ...(s.height === undefined ? {} : { height: s.height }), ...(s.fps === undefined ? {} : { fps: s.fps }), ...(s.frames === undefined ? {} : { frames: s.frames }) })),
            sheet_of: stamps.length,
        },
    };
}
/** View an audio artifact: ffprobe summary + a WAVEFORM sheet
 * committed as the viewed image (the audio twin of §24's film arm;
 * ROADMAP §33 gap-6, receipt: 032/034's makers shelled to ffprobe
 * because no estate door surfaced duration at mint time — the
 * observe arm answers it natively now, and the sheet SHOWS the
 * envelope: a 42µs stub renders an empty trace, real speech
 * renders bars). Containment rides the walk's own row (absPath
 * built from runId + name, never caller text); the sheet lands in
 * os.tmpdir (never the run tree — a view must not mint
 * provenance). */
export async function viewAudioArtifact(seat, runId, artifact, exec, ctx, attachments, render = defaultMediaSheetRender, read = defaultBytesReader) {
    const found = await firstRootWithRun(seat, 'audio', runId);
    if (found === null) {
        throw new Error('run "' + runId + '" produced no image artifacts (and no viewable film or audio — the run holds no image/video/audio artifacts either) ' + searchedVoice(rootsManifest(seat.stateRoot, seat.stateRoots ?? [])));
    }
    const own = found.own;
    const picked = artifact.length > 0 ? own.filter((i) => i.name.includes(artifact)) : own;
    if (picked.length === 0) {
        throw new Error('run "' + runId + '" has no audio artifact containing "' + artifact + '" — the run holds: ' + own.slice(0, 8).map((i) => i.name).join(', ') + ' ' + searchedVoice(rootsManifest(seat.stateRoot, seat.stateRoots ?? [])));
    }
    const row = picked[0];
    const absPath = join(found.root, 'output', row.runId, row.name);
    // THE PROBE IS TYPESCRIPT (the film's twin): bytes, not a binary.
    const probe = await probeFile(absPath, row.name, 'audio', read);
    // THE TEXT-ONLY OBSERVE ARM (the film's twin): the audio facts are
    // text, so a route without image input gets them — and the door
    // never spends an ffmpeg call building a waveform nobody can see.
    const audioCapability = await routeImageCapability(ctx, exec, runId);
    if (!audioCapability.capable) {
        const rows = probe.streams.map((s) => s.codec + (s.sample_rate !== undefined ? ' ' + String(s.sample_rate) + 'Hz' : '')
            + (s.channels !== undefined ? ' ' + String(s.channels) + 'ch' : '')).join(' + ');
        return {
            runId: row.runId,
            url: row.url,
            host: absPath,
            textObservation: 'melite_view audio: ' + row.name
                + (probe.duration_s !== undefined ? ', ' + String(probe.duration_s) + 's' : '')
                + ', ' + String(probe.size_bytes) + ' bytes, streams: ' + rows
                + '; TEXT-ONLY observation — model "' + audioCapability.model
                + '" declares no image input, so no waveform sheet was rendered. The measurements above are complete.',
        };
    }
    // THE WAVEFORM IS ENGINE-PRODUCED (the host-binary cure): the
    // vendored MeliteWaveform node decodes the audio inside the
    // engine (PyAV) and renders the showwavespic-shaped envelope —
    // never a host ffmpeg call.
    let data;
    try {
        data = await render('MeliteWaveform', { audio: absPath, width: 640, height: 240 }, exec.signal);
    }
    catch (error) {
        throw new Error('cannot view the audio "' + row.name + '": the waveform sheet could not be built (' + (error instanceof Error ? error.message : String(error)) + ')', { cause: error });
    }
    const byteCap = Math.min(attachments.imageLimits.maxImageBytes, attachments.imageLimits.maxMessageImageBytes);
    if (data.byteLength > byteCap) {
        throw new Error('cannot view the audio "' + row.name + '": its waveform sheet exceeds the ' + String(byteCap) + '-byte image cap');
    }
    let ref;
    try {
        ref = await attachments.saveImage({ data, mediaType: 'image/png', name: basename(row.name, extname(row.name)) + '-waveform.png' });
    }
    catch (error) {
        throw new Error('cannot commit the audio waveform sheet for "' + row.name + '": ' + (error instanceof Error ? error.message : String(error)), { cause: error });
    }
    return {
        runId: row.runId,
        url: row.url,
        host: absPath,
        image: {
            attachmentId: ref.attachmentId,
            mediaType: ref.mediaType,
            bytes: ref.bytes,
            width: ref.width,
            height: ref.height,
            ...(ref.name === undefined ? {} : { name: ref.name }),
            ...(ref.originalDimensions === undefined ? {} : { originalDimensions: { ...ref.originalDimensions } }),
        },
        audio: {
            file: row.name,
            ...(probe.duration_s === undefined ? {} : { duration_s: probe.duration_s }),
            size_bytes: probe.size_bytes,
            streams: probe.streams.map((s) => ({ codec: s.codec, ...(s.codec_type === undefined ? {} : { codec_type: s.codec_type }), ...(s.sample_rate === undefined ? {} : { sample_rate: s.sample_rate }), ...(s.channels === undefined ? {} : { channels: s.channels }) })),
            waveform_of: true,
        },
    };
}
/** THE TEXT-ONLY OBSERVE ARM (a live commission's finding,
 *  2026-09-26): the observation this door produces is mostly TEXT —
 *  a container probe (duration, streams, geometry, fps, frames,
 *  bytes) and, for a mesh, its structural summary. On a route that
 *  declares no image input, refusing the WHOLE view threw those facts
 *  away and left the maker with local ffprobe as its only observe
 *  arm — the exact gap this door exists to close. So the capability is
 *  REPORTED, and the caller serves the facts in text and names the one
 *  thing it cannot do (the image block). The mesh arm keeps the
 *  strict refusal for the caller that genuinely needs pixels (the
 *  blind block throws byte-identical to read_image's own law). */
export async function routeImageCapability(ctx, exec, requestedRun) {
    const routed = exec.agent?.session?.requestHeader?.()?.config;
    const provider = routed?.provider ?? exec.agent?.options?.provider;
    const model = routed?.model ?? exec.agent?.options?.model;
    const llm = ctx.get('llm');
    if (provider === undefined || model === undefined || llm === undefined) {
        throw new Error(`cannot view run "${requestedRun}": the current model route could not be resolved`);
    }
    const active = await llm.resolveModelInfo(provider, model, exec.signal);
    return {
        capable: active.inputModalities !== undefined && active.inputModalities.includes('image'),
        model,
    };
}
/** THE DELEGATED EYE (the charter's vision-capable route for the
 *  maker lane, dev_docs/ROADMAP.md): the calling route is blind, so
 *  the viewing runs through a route that CAN see — the lane's
 *  declared `MELITE_VIEW_ROUTE` verified image-capable, else the
 *  first image-capable route in enumeration (the craft critic's
 *  route law, vision-route.ts). A named-but-blind route throws LOUD
 *  (explicit means explicit — never a silent substitution, never a
 *  silent measurement pass); no eye on the lane resolves null and
 *  the caller serves its labeled measurements instead. A narrow seat
 *  (a fake exposing resolveModelInfo only) is also null — the old
 *  walls never grew an enumeration seam. */
export async function seeingRoute(ctx, exec) {
    const llm = ctx.get('llm');
    if (llm === undefined
        || typeof llm.listProviders !== 'function'
        || typeof llm.listModels !== 'function'
        || typeof llm.resolveModelInfo !== 'function'
        || typeof llm.stream !== 'function') {
        return null;
    }
    return resolveVisionRoute(llm, viewRoutePreference(), exec.signal);
}
/** The file-bytes twin of the eye: resolve, commit, verify. Null
 *  when the lane seats no eye (the caller serves measurements). */
export async function delegatedVisual(ctx, exec, image, kind, attachments) {
    const llm = ctx.get('llm');
    if (llm === undefined || typeof llm.stream !== 'function')
        return null;
    const route = await seeingRoute(ctx, exec);
    if (route === null)
        return null;
    const ref = await attachments.saveImage({ data: image.data, mediaType: image.mediaType, ...(image.name === undefined ? {} : { name: image.name }) });
    return verifyVisual(llm, route, ref, kind, exec.signal);
}
/** THE TEXT OBSERVATION: the film's facts as text — the same numbers
 *  the image route leads with, plus the one honest statement of what
 *  this route cannot be given. Named, never implied. */
function filmTextObservation(name, probe, model) {
    const streams = probe.streams.map((s) => s.codec + (s.width !== undefined && s.height !== undefined ? ' ' + String(s.width) + 'x' + String(s.height) : '')
        + (s.fps !== undefined ? ' @' + s.fps : '') + (s.frames !== undefined ? ' ' + String(s.frames) + 'f' : '')).join(' + ');
    return 'melite_view film: ' + name
        + (probe.duration_s !== undefined ? ', ' + String(probe.duration_s) + 's' : '')
        + ', ' + String(probe.size_bytes) + ' bytes, streams: ' + streams
        + '; TEXT-ONLY observation — model "' + model + '" declares no image input, so the contact sheet was neither built nor attached. The measurements above are complete; the pictures are what this route cannot have.';
}
/** The render: one text summary + the image block (read_image's
 * imageReadContent pairing, run-scoped). A film value's text leads
 * with the probe verdict (duration, streams, frame count) — the
 * image block IS the contact sheet. */
function viewedContent(value) {
    // the text-only arm: no image block is possible, and the value says
    // which facts it carries
    const hostVoice = value.host !== undefined ? ' (host: ' + value.host + ')' : '';
    if (value.textObservation !== undefined) {
        return [{ type: 'text', text: value.textObservation + hostVoice }];
    }
    if (value.film !== undefined) {
        const f = value.film;
        const streams = f.streams.map((s) => s.codec + (s.width !== undefined && s.height !== undefined ? ' ' + String(s.width) + 'x' + String(s.height) : '')
            + (s.fps !== undefined ? ' @' + s.fps : '') + (s.frames !== undefined ? ' ' + String(s.frames) + 'f' : '')).join(' + ');
        const image = value.image;
        return [
            { type: 'text', text: 'melite_view film: ' + value.url + ' (' + f.file
                    + (f.duration_s !== undefined ? ', ' + String(f.duration_s) + 's' : '')
                    + (f.size_bytes !== undefined ? ', ' + String(f.size_bytes) + ' bytes' : '')
                    + ', streams: ' + streams + '; contact sheet of ' + String(f.sheet_of)
                    + ': ' + image.mediaType + ' ' + String(image.width) + 'x' + String(image.height) + hostVoice + ')' },
            { type: 'image', attachment: imageRefFromValue(image) },
        ];
    }
    if (value.audio !== undefined) {
        const a = value.audio;
        const audio = value.image;
        const streams = a.streams.map((s) => s.codec + (s.sample_rate !== undefined ? ' ' + String(s.sample_rate) + 'Hz' : '') + (s.channels !== undefined ? ' ' + String(s.channels) + 'ch' : '')).join(' + ');
        return [
            { type: 'text', text: 'melite_view audio: ' + value.url + ' (' + a.file
                    + (a.duration_s !== undefined ? ', ' + String(a.duration_s) + 's' : '')
                    + ', ' + String(a.size_bytes) + ' bytes'
                    + ', streams: ' + streams + '; waveform sheet: ' + audio.mediaType + ' ' + String(audio.width) + 'x' + String(audio.height) + hostVoice + ')' },
            { type: 'image', attachment: imageRefFromValue(audio) },
        ];
    }
    if (value.mesh !== undefined) {
        const m = value.mesh;
        return [
            { type: 'text', text: 'melite_view mesh: ' + value.url + ' (' + meshVoice(m)
                    + '; poster: ' + m.poster + hostVoice + ')' },
            { type: 'image', attachment: imageRefFromValue(value.image) },
        ];
    }
    const still = value.image;
    return [
        { type: 'text', text: 'melite_view: ' + value.url + ' (' + still.mediaType + ', ' + String(still.width) + 'x' + String(still.height) + ', ' + String(still.bytes) + ' bytes)' + hostVoice },
        { type: 'image', attachment: imageRefFromValue(still) },
    ];
}
/** The mesh a poster sibling belongs to, or null when the image is the
 *  run's own. `<dir>/<stem>_poster.png` → `<dir>/<stem>.glb|gltf`. The
 *  check is the same directory + stem the media sidebar's POSTER_STEMS
 *  contract reads, so the door and the sidebar agree on what a poster
 *  is. A directory walk (no bytes read) — the caller has already
 *  decided to observe this run. */
async function meshBesidePoster(seat, runId, imageName) {
    const m = /^(.*)_poster\.(?:png|jpe?g|webp)$/i.exec(imageName);
    if (m === null)
        return null;
    const stem = m[1];
    const models = (await listMedia(seat.stateRoot, 'model')).items.filter((i) => i.runId === runId);
    const hit = models.find((i) => i.name === stem + '.glb' || i.name === stem + '.gltf');
    return hit === undefined ? null : hit.name;
}
/** THE MESH POSTER'S DELEGATED EYE: the blind calling route cannot
 *  take the poster block, but the lane's seeing route can still look
 *  at it — the verdict rides the structural row as labeled text.
 *  Null when the lane seats no eye (the caller keeps the strict
 *  gate's refusal — there is no raster any route could see). */
async function delegatedMeshPoster(root, runId, poster, exec, ctx, attachments, read, summary, posterName, row) {
    const llm = ctx.get('llm');
    if (llm === undefined || typeof llm.stream !== 'function')
        return null;
    const route = await seeingRoute(ctx, exec);
    if (route === null)
        return null;
    const posterPath = join(root, 'output', poster.runId, poster.name);
    const byteCap = Math.min(attachments.imageLimits.maxImageBytes, attachments.imageLimits.maxMessageImageBytes);
    const bytes = await read(posterPath);
    if (bytes.byteLength > byteCap) {
        throw new Error('cannot view "' + poster.name + '": the file exceeds the ' + String(byteCap) + '-byte image cap; downscale and retry');
    }
    const mediaType = sniffImageMediaType(bytes);
    if (mediaType === undefined) {
        throw new Error('cannot view the mesh poster "' + poster.name + '": the bytes are not an image '
            + '(the mesh lane wrote non-image content under the poster name this door mints)');
    }
    // The route already resolved above, so the verdict commits
    // directly (no second resolution — a re-resolve could only repeat
    // the same answer, and its null arm would be dead code).
    const ref = await attachments.saveImage({ data: bytes, mediaType, name: basename(poster.name) });
    const seen = await verifyVisual(llm, route, ref, 'poster', exec.signal);
    return {
        runId,
        url: row.url,
        host: join(root, 'output', row.runId, row.name),
        textObservation: 'melite_view mesh: ' + row.url + ' (' + meshVoice(summary)
            + '; poster: ' + posterName
            + '; VISUAL VERIFICATION via ' + seen.via + ' (a seeing route looked at the poster): ' + seen.verdict + ')',
        mesh: { ...summary, poster: posterName },
    };
}
/** THE MESH ARM (2026-09-26). A `.glb`/`.gltf` has no raster, so the
 *  door serves the mesh two ways, in this order:
 *
 *  1. THE POSTER: when the run emitted `<stem>_poster.png` beside the
 *     mesh (the sibling contract the media sidebar already reads), the
 *     model SEES the render and the `mesh` row carries the structural
 *     verdict alongside it.
 *  2. THE STRUCTURAL READ: with no poster there is nothing to attach,
 *     and this arm refuses — but it refuses WITH THE FACTS (meshes,
 *     vertices, triangles, materials, textures, UV-map, bounds,
 *     bytes) instead of the old "no image artifacts" dead end, and it
 *     names the upstream fix (the 3D lane emits no poster). It never
 *     fabricates an image to satisfy the schema: a fake picture of a
 *     mesh is worse than an honest structural answer. */
export async function viewModelArtifact(seat, runId, artifact, exec, ctx, attachments, read = defaultBytesReader) {
    const found = await firstRootWithRun(seat, 'model', runId);
    if (found === null) {
        // THE VOICE IS ADDITIVE (2026-09-26): the historical miss sentence
        // is pinned by walls and by every agent that has read it, so the
        // mesh truth is APPENDED to it rather than replacing it — a run
        // with nothing in it still hears the sentence it always heard,
        // plus the fact that no mesh was there either.
        throw new Error('run "' + runId + '" produced no image artifacts (and no viewable film or audio — the run holds no image/video/audio artifacts either) (and no mesh: the run holds no .glb/.gltf artifact either) ' + searchedVoice(rootsManifest(seat.stateRoot, seat.stateRoots ?? [])));
    }
    const own = found.own;
    const picked = artifact.length > 0 ? own.filter((i) => i.name.includes(artifact)) : own;
    if (picked.length === 0) {
        throw new Error('run "' + runId + '" has no mesh artifact containing "' + artifact + '" — the run holds: ' + own.slice(0, 8).map((i) => i.name).join(', ') + ' ' + searchedVoice(rootsManifest(seat.stateRoot, seat.stateRoots ?? [])));
    }
    const row = picked[0];
    const absPath = join(found.root, 'output', row.runId, row.name);
    const data = await read(absPath);
    const summary = summarizeMesh(data, row.name);
    // THE POSTER SIBLING: same directory, `<stem>_poster.png`.
    const slash = row.name.lastIndexOf('/');
    const dir = slash < 0 ? '' : row.name.slice(0, slash + 1);
    const stem = row.name.slice(slash + 1).replace(/\.(glb|gltf)$/i, '');
    const posterName = dir + stem + '_poster.png';
    const poster = (await listMedia(found.root, 'image')).items.find((i) => i.runId === runId && i.name === posterName);
    if (poster === undefined) {
        throw new Error('run "' + runId + '" holds the mesh "' + row.name + '" (' + meshVoice(summary) + ') '
            + 'but no raster poster beside it (' + posterName + ' is absent), so there is no image to show you. '
            + 'The 3D lane emits no poster today: read the numbers above, or open the mesh in the app\'s media drilldown, '
            + 'which renders it in 3D. ' + searchedVoice(rootsManifest(seat.stateRoot, seat.stateRoots ?? [])));
    }
    // THE POSTER'S DELEGATED EYE: the strict gate below refuses a
    // blind calling route — unless the lane seats a seeing route, in
    // which case the verdict rides the mesh row as labeled text (the
    // block itself can never ride a blind chat route, so the mesh row
    // pairs with a textObservation the same way the still does).
    const meshCapability = await routeImageCapability(ctx, exec, runId);
    if (!meshCapability.capable) {
        const seen = await delegatedMeshPoster(found.root, runId, poster, exec, ctx, attachments, read, summary, posterName, row);
        if (seen !== null)
            return seen;
        throw new Error('cannot view run "' + runId + '": model "' + meshCapability.model + '" does not declare image input; switch to an image-capable model to view artifacts');
    }
    // THE GATE STAYS STRICT (re-audit 2026-10-16): the probe above
    // decided capability, and the blind block already returned or
    // threw — reaching here means the calling route can take the
    // poster block, so the arm commits it.
    const posterPath = join(found.root, 'output', poster.runId, poster.name);
    const byteCap = Math.min(attachments.imageLimits.maxImageBytes, attachments.imageLimits.maxMessageImageBytes);
    const bytes = await read(posterPath);
    if (bytes.byteLength > byteCap) {
        throw new Error('cannot view "' + poster.name + '": the file exceeds the ' + String(byteCap) + '-byte image cap; downscale and retry');
    }
    // the sibling's name is minted by this door (`<stem>_poster.png`), so
    // the extension is never in doubt — but the BYTES are. A mesh lane
    // that wrote non-image bytes under that name is refused loudly: the
    // door states no media type it did not read (2026-09-26).
    const mediaType = sniffImageMediaType(bytes);
    if (mediaType === undefined) {
        throw new Error('cannot view the mesh poster "' + poster.name + '": the bytes are not an image '
            + '(the mesh lane wrote non-image content under the poster name this door mints)');
    }
    const ref = await attachments.saveImage({ data: bytes, mediaType, name: basename(poster.name) });
    return {
        runId,
        url: row.url,
        host: join(found.root, 'output', row.runId, row.name),
        image: { attachmentId: ref.attachmentId, mediaType, bytes: ref.bytes, width: ref.width, height: ref.height, name: basename(poster.name) },
        mesh: { ...summary, poster: posterName },
    };
}
/** THE STILL ARM (exported like its film/audio/mesh siblings — the
 *  suites call it directly): one image artifact observed through the
 *  walk's own row. A capable calling route gets the committed image;
 *  a blind route gets the file's facts as labeled text, or the
 *  lane's seeing route's verdict when the delegated eye resolves
 *  (the vision-capable route for the maker lane). */
export async function viewStillArtifact(root, row, runId, exec, ctx, attachments) {
    // CONTAINMENT BY CONSTRUCTION: the absolute path is built from
    // the walk's own root + runId + name — caller text never
    // reaches the filesystem as a path.
    const absPath = join(root, 'output', row.runId, row.name);
    const declared = imageMediaTypeForPath(row.name);
    if (declared !== undefined && !attachments.imageLimits.mediaTypes.includes(declared)) {
        throw new Error('cannot view "' + row.name + '": ' + declared + ' images are not accepted by this deployment');
    }
    // THE TEXT-ONLY OBSERVE ARM (the still's twin): a route that
    // cannot take an image still gets the file's facts — its sniffed
    // media type and byte count, which are read from the bytes, not
    // from a store round-trip — unless the lane seats a seeing
    // route, in which case the verdict below carries what the eye
    // saw. The pixels are what this route cannot have, and the
    // observation says so rather than refusing.
    const stillCapability = await routeImageCapability(ctx, exec, runId);
    if (!stillCapability.capable) {
        const data = await readFile(absPath, { signal: exec.signal });
        const sniffed = sniffImageMediaType(data);
        const facts = 'melite_view: ' + row.name + ' (' + String(data.byteLength) + ' bytes, '
            + (sniffed ?? declared ?? 'format not sniffed')
            + (declared !== undefined && sniffed !== undefined && declared !== sniffed
                ? '; the extension declares ' + declared + ' and the BYTES say ' + sniffed + ' — the bytes win'
                : '');
        const mediaType = sniffed ?? declared;
        const seen = mediaType === undefined
            ? null
            : await delegatedVisual(ctx, exec, { data, mediaType, name: basename(row.name) }, 'still', attachments);
        if (seen === null) {
            return {
                runId,
                url: row.url,
                host: absPath,
                textObservation: facts
                    + '; TEXT-ONLY observation — model "' + stillCapability.model
                    + '" declares no image input, so the file was not attached. The facts above are complete; the picture is what this route cannot have.',
            };
        }
        return {
            runId,
            url: row.url,
            host: absPath,
            textObservation: facts
                + '; VISUAL VERIFICATION via ' + seen.via + ' (a seeing route looked at the pixels): ' + seen.verdict,
        };
    }
    const byteCap = Math.min(attachments.imageLimits.maxImageBytes, attachments.imageLimits.maxMessageImageBytes);
    const data = await readFile(absPath, { signal: exec.signal });
    if (data.byteLength > byteCap) {
        throw new Error('cannot view "' + row.name + '": the file exceeds the ' + String(byteCap) + '-byte image cap; downscale and retry');
    }
    // THE BYTES-ARE-TRUTH LAW (035 attempt-16's gap #5, 2026-09-24):
    // the signature SNIFF outranks the declared extension — a
    // receipt reported mediaType image/jpeg for a PNG artifact
    // when the two seats disagreed. The sniff runs first; the
    // extension fills only when the bytes match no known
    // signature; an explicit disagreement still voices the sniff.
    const sniffed = sniffImageMediaType(data);
    const mediaType = sniffed ?? declared;
    if (mediaType === undefined) {
        throw new Error('cannot view "' + row.name + '": the file content is not a supported image format (PNG/JPEG/WebP/GIF)');
    }
    if (declared === undefined && !attachments.imageLimits.mediaTypes.includes(mediaType)) {
        throw new Error('cannot view "' + row.name + '": ' + mediaType + ' images are not accepted by this deployment');
    }
    let ref;
    try {
        ref = await attachments.saveImage({ data, mediaType, name: basename(row.name) });
    }
    catch (error) {
        if (!(error instanceof AttachmentError))
            throw error;
        if (error.code === 'IMAGE_DIMENSION_TOO_LARGE') {
            throw new Error('cannot view "' + row.name + '": at least one image side exceeds the ' + String(attachments.imageLimits.maxImageDimension) + 'px limit; downscale the image and view the smaller copy', { cause: error });
        }
        if (error.code === 'IMAGE_TOO_MANY_PIXELS') {
            throw new Error('cannot view "' + row.name + '": the image exceeds the ' + String(attachments.imageLimits.maxImagePixels) + '-pixel decoded-size limit; downscale the image and view the smaller copy', { cause: error });
        }
        if (error.code === 'IMAGE_TOO_LARGE') {
            throw new Error('cannot view "' + row.name + '": the image cannot be stored within the deployment\'s byte limits; downscale the image and view the smaller copy', { cause: error });
        }
        if (error.code === 'INVALID_IMAGE' && declared === undefined) {
            throw new Error('cannot view "' + row.name + '": the bytes do not decode as a supported PNG/JPEG/WebP/GIF image; the file may be truncated or corrupt', { cause: error });
        }
        throw error;
    }
    const value = {
        runId: row.runId,
        url: row.url,
        host: absPath,
        image: {
            attachmentId: ref.attachmentId,
            mediaType: ref.mediaType,
            bytes: ref.bytes,
            width: ref.width,
            height: ref.height,
            ...(ref.name === undefined ? {} : { name: ref.name }),
            ...(ref.originalDimensions === undefined ? {} : { originalDimensions: { ...ref.originalDimensions } }),
        },
    };
    return value;
}
/** Build the melite_view tool against the live cordis context (the
 * seats: `attachments` — the durable store, `queue` — the runs tree
 * root owner, `llm` — the route gate; all optional probes, the
 * tool-fs inject law). */
export function meliteView(ctx, render = defaultMediaSheetRender) {
    const presentCall = (args) => {
        const a = (typeof args === 'object' && args !== null ? args : {});
        return {
            card: 'generic',
            title: 'View run artifact',
            kind: 'read',
            rawInput: { run_id: a.run_id, artifact: a.artifact },
        };
    };
    const def = defineTool({
        name: 'melite_view',
        description: 'View one image artifact from a finished (or running) estate run — the model receives the image itself, '
            + 'never a description of it. When the run holds no images but holds a film, the observe arm serves the film instead: '
            + 'an ffprobe stream summary (duration, codecs, frame count) plus a contact-sheet image of frames across its span. '
            + 'This is the observe arm of the act/observe/decide loop: after a run lands, '
            + 'VIEW it before deciding the next step (never claim a match without viewing). '
            + 'Args: run_id (required, the run directory under the runs tree), artifact (optional substring — when a run '
            + 'produced several images, name the one to view; default is the newest). On a model that accepts image input the image rides the result; '
            + 'on a text-only model the observation is measurements as text, or a seeing route\u2019s verdict when the lane seats one — the observation says which.',
        // ParameterSchemaSpec grammar: the map IS the implicit object root.
        parameters: {
            run_id: {
                type: 'string',
                required: true,
                description: 'The run id (a "run-…" directory name under the runs tree).',
            },
            artifact: {
                type: 'string',
                description: 'Optional filename substring — when a run produced several images, pick the one whose name contains this.',
            },
        },
        presentCall,
        output: {
            schema: {
                type: 'object',
                additionalProperties: true,
                properties: {
                    runId: { type: 'string', description: 'The run the artifact belongs to.', required: true },
                    url: { type: 'string', description: 'The estate media URL of the viewed artifact.', required: true },
                    image: {
                        type: 'object',
                        additionalProperties: true,
                        description: 'The durable attachment metadata (attachmentId, mediaType, bytes, width, height). On the film path this IS the contact sheet. ABSENT on the text-only observe arm (a route with no image input gets textObservation instead — one of the two rides every result).',
                    },
                    film: {
                        type: 'object',
                        additionalProperties: true,
                        description: 'Present only on the film path: the ffprobe summary (file, duration_s, size_bytes, streams with codec/geometry/fps/frames) plus sheet_of (frames tiled).',
                    },
                },
            },
            render: (_args, value) => viewedContent(value),
        },
        isConcurrencySafe: () => true,
        async execute(args, exec0) {
            const exec = exec0;
            const a = args;
            // run_id is schema-typed string: the wrapper gate rejects
            // non-strings before the body (a non-string run_id throws
            // ToolArgsError there), so no non-string arm rides here — the
            // old one was gate-dead (the ledger-tail law, 2026-09-12).
            const runId = a.run_id.trim();
            if (runId.length === 0)
                throw new Error('run_id must be a non-empty string');
            if (!RUN_ID.test(runId)) {
                throw new Error('cannot view "' + runId + '": a run id is a "run-…" directory name under the runs tree (the containment grammar)');
            }
            const artifact = typeof a.artifact === 'string' ? a.artifact.trim() : '';
            const attachments = ctx.get('attachments');
            if (attachments === undefined) {
                throw new Error('cannot view run "' + runId + '": no attachment service is mounted');
            }
            const seat = ctx.get('queue', false);
            if (seat === undefined) {
                throw new Error('cannot view run "' + runId + '": the queue seat owns the runs tree root — mount @melite-plugin/dsh-estate');
            }
            // THE WALK (listMedia over the §23 manifest — same trees the
            // media/list door walks, own root first): run-filtered,
            // image-kind, newest first; the artifact substring only
            // narrows names the walk itself produced. A no-image run
            // falls to the film arm (§24) which walks video the same way.
            // THE AUDIO ARM (§33 gap-6): an artifact that names an audio
            // extension declares intent BEFORE the image walk — a run can
            // hold images AND audio (a portrait commission that also
            // exported a voice), and `melite_view run-x line.flac` must
            // observe the CLIP, not the newest png. Extension list =
            // mediaVocab's audio set (the SSOT, derived at module scope —
            // qvoice included: the tts lane's preserved voice is a named
            // clip like any other).
            if (artifact !== '' && AUDIO_EXTENSIONS.has(extname(artifact).toLowerCase())) {
                const heard = await viewAudioArtifact(seat, runId, artifact, exec, ctx, attachments, render);
                return heard;
            }
            // THE MESH ARM (2026-09-26): a 3D artifact names its intent the
            // same way audio does — BEFORE the image walk, because a 3D run
            // (img-to-mesh) holds no images at all and would otherwise walk
            // the whole miss chain before reaching the mesh.
            if (artifact !== '' && MODEL_EXTENSIONS.has(extname(artifact).toLowerCase())) {
                const meshed = await viewModelArtifact(seat, runId, artifact, exec, ctx, attachments);
                return meshed;
            }
            const found = await firstRootWithRun(seat, 'image', runId);
            if (found === null) {
                // THE FILM ARM (§24): a film run holds no images — observe
                // it through its own artifact (ffprobe summary + a contact
                // sheet the model can SEE). The no-film voice keeps the old
                // prefix (the walls pin it); the value carries the film row.
                try {
                    const filmed = await viewFilmArtifact(seat, runId, artifact, exec, ctx, attachments, render);
                    return filmed;
                }
                catch (filmMiss) {
                    // THE AUDIO-ONLY RUN (§33 gap-6): when the film arm found
                    // no VIDEO either, an audio-holding run (a tts/music/sfx
                    // commission) observes through the audio arm. Any other
                    // film-arm refusal (a real probe failure on a real film)
                    // rethrows — the chain never masks a working arm's error.
                    if (!(filmMiss instanceof Error && /produced no image artifacts/.test(filmMiss.message)))
                        throw filmMiss;
                    try {
                        const heard = await viewAudioArtifact(seat, runId, artifact, exec, ctx, attachments, render);
                        return heard;
                    }
                    catch (audioMiss) {
                        // THE MESH-ONLY RUN (2026-09-26): a 3D lane's run holds a
                        // .glb and nothing else, so the image walk, the film arm and
                        // the audio arm all miss before the mesh is even considered.
                        // The mesh arm is LAST in the chain and only claims the miss
                        // when the run really has no image/video/audio — a run whose
                        // film or audio arm failed for its OWN reason rethrows that
                        // reason untouched (the chain never masks a working arm).
                        if (!(audioMiss instanceof Error && /produced no image artifacts/.test(audioMiss.message)))
                            throw audioMiss;
                        // THE CLAIM THROWS ON EVERY REACH (the re-audit,
                        // 2026-10-16): this leg runs only when the image walk
                        // found no image for the run in ANY root, and the mesh
                        // arm's poster is REQUIRED (its no-poster refusal, :660)
                        // — a run with no image has no poster, so the call below
                        // refuses loud with the mesh verdict every time. Its
                        // return rides only because TypeScript cannot see that
                        // proof, and the chain's narrowing (`found` is non-null
                        // past this block) needs a total path.
                        /* v8 ignore next -- the mesh-only run's return is unreachable (the required poster); the arm's refusal is the behavior */
                        return viewModelArtifact(seat, runId, artifact, exec, ctx, attachments);
                    }
                }
            }
            const own = found.own;
            const picked = artifact.length > 0 ? own.filter((i) => i.name.includes(artifact)) : own;
            if (picked.length === 0) {
                throw new Error('run "' + runId + '" has no image artifact containing "' + artifact + '" — the run holds: ' + own.slice(0, 8).map((i) => i.name).join(', '));
            }
            const row = picked[0];
            // THE POSTER IS NOT AN INDEPENDENT IMAGE (2026-09-26): a 3D
            // lane's raster sibling (`<stem>_poster.png`) IS the mesh's
            // picture, so serving it through the plain image arm told the
            // model "here is your image" and taught it NOTHING about the
            // mesh the run actually produced — the 3D lane stayed invisible
            // to the agent even once it emitted a poster. When the picked
            // image is a poster sibling of a mesh in the same run, the mesh
            // arm owns the observation (it attaches this same poster AND
            // reports the structure). A run's own images are untouched.
            const meshOfPoster = await meshBesidePoster(seat, runId, row.name);
            if (meshOfPoster !== null) {
                const meshed = await viewModelArtifact(seat, runId, meshOfPoster, exec, ctx, attachments);
                return meshed;
            }
            // CONTAINMENT BY CONSTRUCTION: the absolute path is built from
            // the walk's own root + runId + name — caller text never
            // reaches the filesystem as a path.
            const value = await viewStillArtifact(found.root, row, runId, exec, ctx, attachments);
            return value;
        },
    });
    // (§7 P7: the presenter rides defineTool validation — no second,
    // ungated seat over the gate. The tool-presentation wall pins the
    // gated face.)
    return def;
}
//# sourceMappingURL=melite-view.js.map