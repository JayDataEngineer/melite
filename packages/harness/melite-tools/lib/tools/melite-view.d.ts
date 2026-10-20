import type { EngineJson } from '@melite/comfyui-cordis';
import type { Context } from '@deepseek-ai/cordis';
import type { ImageAttachmentRef, ImageMediaType } from '@deepseek-ai/dsh-attachment';
import type { ProbedStream } from './mp4Probe.js';
import type { MeshSummary } from './glbSummary.js';
import type { MediaListRow } from '@melite/estate-media';
import type { VisionQuestionKind, VisionRoute } from './vision-route.js';
import type { ToolDefinition } from '../types.js';
/** Identify the media type declared by a supported image signature. */
export declare function sniffImageMediaType(data: Uint8Array): ImageMediaType | undefined;
/** Map a path to its declared image media type by extension. */
export declare function imageMediaTypeForPath(filePath: string): ImageMediaType | undefined;
/** The structured outcome the output schema declares (read_image's
 * ImageReadValue shape, run-scoped). */
export interface ViewedImageValue {
    runId: string;
    url: string;
    /** THE TEXT-ONLY OBSERVE ARM: a route that declares no image input
     *  gets the measurements as text and NO image block (the contact
     *  sheet was never built). Present instead of `image`. */
    textObservation?: string;
    image?: {
        attachmentId: string;
        mediaType: ImageMediaType;
        bytes: number;
        width: number;
        height: number;
        name?: string;
        originalDimensions?: {
            width: number;
            height: number;
        };
    };
    /** THE FILM ARM (§24): when the run holds a film instead of
     *  images, the viewed image IS the contact sheet and this row
     *  carries the film's own summary (ffprobe verdict, byte-cheap
     *  flags). Absent on the image path. */
    film?: {
        file: string;
        duration_s?: number;
        size_bytes?: number;
        streams: Array<{
            codec: string;
            codec_type?: string;
            width?: number;
            height?: number;
            fps?: string;
            frames?: number;
        }>;
        sheet_of: number;
    };
    /** THE AUDIO ARM (§33 gap-6): the observed artifact is audio —
     *  the viewed image IS its waveform sheet and this row carries
     *  the probe verdict (duration/bytes/codec/rate/channels). The
     *  mint-time duration gap closes at the observe door: one native
     *  call, no shell. Absent on the image/film paths. */
    audio?: {
        file: string;
        duration_s?: number;
        size_bytes?: number;
        streams: Array<{
            codec: string;
            codec_type?: string;
            sample_rate?: number;
            channels?: number;
        }>;
        waveform_of: boolean;
    };
    /** THE MESH ARM (2026-09-26, the 3D-into-media hook): the observed
     *  artifact is a 3D model. The viewed image IS the mesh's own raster
     *  poster when the run emitted one next to the `.glb`
     *  (`<stem>_poster.png` — the same sibling contract the media
     *  sidebar reads), and this row carries the artifact's structural
     *  verdict either way: glTF counts, vertex/triangle totals, whether
     *  it is UV-mapped, and its bounds. Absent on the image/film/audio
     *  paths. The poster is REQUIRED on a served mesh row: the arm
     *  refuses a mesh with no poster (see the arm) rather than serving a
     *  structural read, so `poster` is never absent here (the re-audit,
     *  2026-10-16). */
    mesh?: MeshSummary & {
        poster: string;
    };
}
/** A probed stream row (mp4Probe's row, narrowed to what the view
 *  publishes). The audio arm shares this shape: sample_rate/channels
 *  ride on audio streams, geometry on video — one summary, both arms.
 *  Read from the CONTAINER BYTES in TypeScript; the harness spawns
 *  no binary to look at a file. */
export interface FilmStreamSummary extends ProbedStream {
}
/** Contact-sheet plan: four timestamps across the film's span (a
 *  beginning, two middles, near the end — the observe arm wants the
 *  arc, not four copies of frame one). Duration unknown (a probe
 *  without a format row) → one early frame, never a blind seek past
 *  the end. Pure. */
export declare function sheetPlan(duration_s: number | undefined): number[];
/** Re-brand the structured outcome into the durable reference an
 * ImageBlock carries (read_image's imageRefFromValue, copied). The
 * parameter is the PRESENT image — callers assert presence (the
 * text-only observe arm never reaches here). */
export declare function imageRefFromValue(image: NonNullable<ViewedImageValue['image']>): ImageAttachmentRef;
/** The engine render seam the sheet arms ride (one graph, one PNG
 *  back). Production submits the ESTATE'S OWN execute seat with the
 *  vendored view nodes (melite-utility-nodes: MeliteFrameSheet,
 *  MeliteWaveform — PyAV inside the engine, never a host binary, and
 *  the harness never becomes a codec vendor); the sheet lands in a
 *  scratch dir under os.tmpdir (never the run tree — a view mints no
 *  provenance) and returns as bytes. Tests pin every arm with fakes
 *  — no engine, no subprocess, nothing to install. */
export type MediaSheetRender = (node: 'MeliteFrameSheet' | 'MeliteWaveform', inputs: Record<string, EngineJson>, signal: AbortSignal) => Promise<Uint8Array>;
/** Default render: one utility graph through executeSingle (the
 *  estate's non-plugin execute face), PreviewImage so the sheet
 *  rides the engine's temp plane (the output tree stays untouched),
 *  fetched back through /view into the scratch dir. */
export declare const defaultMediaSheetRender: MediaSheetRender;
/** Read one artifact's stream facts from its container bytes. The
 *  refusal keeps the door's voice: a file the in-repo parser cannot
 *  read names ITSELF and the parser's reason, never a throw-through. */
/** The read seam the probe rides (the same shape the ffmpeg calls had,
 *  so a raced/unreadable artifact is pinnable without a POSIX-only
 *  permission trick). */
export type BytesReader = (absPath: string) => Promise<Uint8Array>;
export declare const defaultBytesReader: BytesReader;
/** View a film artifact: the container summary + a contact sheet committed
 *  as the viewed image (the §24 gate — one view artifact, stream
 *  summary + frames the model can SEE). Containment rides the walk's
 *  own row (absPath built from runId + name, never caller text); the
 *  sheet lands in os.tmpdir (never the run tree — a view must not
 *  mint provenance). */
export declare function viewFilmArtifact(seat: QueueSeatSeam, runId: string, artifact: string, exec: ViewExec, ctx: {
    get(name: string): unknown;
}, attachments: AttachmentsSeam, render?: MediaSheetRender, read?: BytesReader): Promise<ViewedImageValue>;
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
export declare function viewAudioArtifact(seat: QueueSeatSeam, runId: string, artifact: string, exec: ViewExec, ctx: {
    get(name: string): unknown;
}, attachments: AttachmentsSeam, render?: MediaSheetRender, read?: BytesReader): Promise<ViewedImageValue>;
/** The structural exec view the route gate reads (the types.ts
 * ToolExec adaptation, widened for THIS tool's need — the gate walks
 * exec.agent; contravariance-safe: a body accepting this accepts any
 * ToolRunContext). */
interface ViewExec {
    signal: AbortSignal;
    agent?: {
        session?: {
            requestHeader?: () => {
                config?: {
                    provider?: string;
                    model?: string;
                };
            } | undefined;
        };
        options?: {
            provider?: string;
            model?: string;
        };
    };
}
/** The structural attachment-store view melite_view exercises. */
interface AttachmentsSeam {
    saveImage(input: {
        data: Uint8Array;
        mediaType: ImageMediaType;
        name?: string;
    }): Promise<ImageAttachmentRef>;
    imageLimits: {
        maxImageBytes: number;
        maxMessageImageBytes: number;
        maxImageDimension: number;
        maxImagePixels: number;
        mediaTypes: readonly ImageMediaType[];
    };
}
/** The queue seat's structural view (stateRoot owner). stateRoots
 *  is the §23 manifest (J12: config-named by the queue seat —
 *  optional so narrower test seats stay assignable). */
interface QueueSeatSeam {
    stateRoot: string;
    stateRoots?: readonly string[];
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
export declare function routeImageCapability(ctx: {
    get(name: string): unknown;
}, exec: ViewExec, requestedRun: string): Promise<{
    capable: boolean;
    model: string;
}>;
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
export declare function seeingRoute(ctx: {
    get(name: string): unknown;
}, exec: ViewExec): Promise<VisionRoute | null>;
/** The file-bytes twin of the eye: resolve, commit, verify. Null
 *  when the lane seats no eye (the caller serves measurements). */
export declare function delegatedVisual(ctx: {
    get(name: string): unknown;
}, exec: ViewExec, image: {
    data: Uint8Array;
    mediaType: ImageMediaType;
    name?: string;
}, kind: VisionQuestionKind, attachments: AttachmentsSeam): Promise<{
    verdict: string;
    via: string;
} | null>;
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
export declare function viewModelArtifact(seat: QueueSeatSeam, runId: string, artifact: string, exec: ViewExec, ctx: {
    get(name: string): unknown;
}, attachments: AttachmentsSeam, read?: BytesReader): Promise<ViewedImageValue>;
/** THE STILL ARM (exported like its film/audio/mesh siblings — the
 *  suites call it directly): one image artifact observed through the
 *  walk's own row. A capable calling route gets the committed image;
 *  a blind route gets the file's facts as labeled text, or the
 *  lane's seeing route's verdict when the delegated eye resolves
 *  (the vision-capable route for the maker lane). */
export declare function viewStillArtifact(root: string, row: MediaListRow, runId: string, exec: ViewExec, ctx: {
    get(name: string): unknown;
}, attachments: AttachmentsSeam): Promise<ViewedImageValue>;
/** Build the melite_view tool against the live cordis context (the
 * seats: `attachments` — the durable store, `queue` — the runs tree
 * root owner, `llm` — the route gate; all optional probes, the
 * tool-fs inject law). */
export declare function meliteView(ctx: Context, render?: MediaSheetRender): ToolDefinition;
export {};
//# sourceMappingURL=melite-view.d.ts.map