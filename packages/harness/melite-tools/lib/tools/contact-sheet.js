/**
 * melite_contact_sheet — B9 (promgen handoff, 2026-11-17): the sweep
 * judge's ONE call. Judging N runs through melite_view costs N full
 * images in the model's context (the 24-knight sweep; the 16-run
 * breadth arm was judged over a hand-built host-side PIL grid —
 * agent-side scripting outside every door). This door composes the
 * SAME judgment surface through the estate: N run ids × an artifact
 * filter → ONE labeled grid image, committed through the attachment
 * store exactly the way melite_view commits a still.
 *
 * THE WALK IS melite_view'S (one spelling, both observe doors): the
 * §23 cross-roots manifest (firstRootWithRun), the
 * spelling-normalized artifact filter (artifactRowMatches), the
 * newest-match pick. A run that holds no matching image is a GRAY
 * LABELED CELL, never a refusal — a sweep's failed runs are the data
 * being judged (the A1 evidence pair: one run failed, one completed;
 * the sheet shows both). A sheet where NO run holds an image refuses
 * loud (never built for nobody — the view door's own law).
 *
 * CONTAINMENT (verbatim from the view door): run ids must match the
 * queue's RUN_ID grammar (a typo'd id refuses loud, named, with its
 * index); artifact paths are BUILT from the walk's own rows (the
 * serve arm's both-leaf law — output/ then test-output/), never from
 * caller text; the caller's `artifact` is a substring filter over
 * names the walk produced. The grid composes HOST-SIDE through sharp
 * (the attachment service's own binary — no new dependency class,
 * no engine seat: tiling is bookkeeping, and the engine composes
 * media, not grids). The route gate rides melite_view's own
 * routeImageCapability — the sheet is pixels, so a route that
 * declares no image input refuses loud BEFORE any filesystem work
 * (there is no text-only observe arm to fall to: a grid of gray
 * cells in text is not an observation).
 */
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { defineTool } from '@deepseek-ai/dsh-tools';
import { RUN_ID_RE } from '@melite/contracts/benchStage';
import { rootsManifest, searchedVoice } from '@melite/estate-queue';
import { firstRootWithRun, artifactRowMatches, routeImageCapability, imageRefFromValue, } from "./melite-view.js";
/** The sweep cap: 36 cells keeps the composed sheet inside the
 *  attachment dimension and pixel limits at the default cell size
 *  (6×6). A wider wall splits into two calls — a refusal names the
 *  law, never a silent truncation. */
const MAX_RUNS = 36;
const DEFAULT_CELL = 384;
const MIN_CELL = 96;
const MAX_CELL = 768;
/** The label strip under every cell: the judging key (full run id,
 *  never truncated — a sweep's ids differ in their tails). */
const LABEL_H = 34;
const CELL_BG = '#101010';
const GRAY_CELL = '#585858';
const LABEL_BG = '#3a3a3a';
/** The label strip SVG: monospace white on dark. XML-escaped — a
 *  run id is grammar-safe but the missing-run voice is ours, and an
 *  unescaped label is a bug class, not a trust decision.
 *  @param text the run id (or the missing-run voice).
 *  @param width the cell width the strip spans. */
const labelSvg = (text, width) => Buffer.from('<svg width="' + String(width) + '" height="' + String(LABEL_H) + '" xmlns="http://www.w3.org/2000/svg">'
    + '<rect width="100%" height="100%" fill="' + LABEL_BG + '"/>'
    + '<text x="4" y="' + String(LABEL_H - 10) + '" font-family="monospace" font-size="12" fill="#ffffff">'
    + text.replace(/[<>&]/g, (c) => c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&amp;')
    + '</text></svg>');
/** Read one row's bytes — the serve arm's both-leaf law: output/
 *  first, then test-output/ (test:true starts land there; a walk
 *  that only ever read output/ grayed every test run's cell).
 *  @param rootDir the state root that served the row.
 *  @param runId the run directory name.
 *  @param name the row's relative artifact path.
 * @returns the bytes plus the host path, or null when neither leaf
 *  holds the file (raced/vanished — the cell goes gray, named). */
async function readRowBytes(rootDir, runId, name) {
    for (const leaf of ['output', 'test-output']) {
        const host = join(rootDir, leaf, runId, name);
        try {
            return { bytes: new Uint8Array(await readFile(host)), host };
        }
        catch { /* not under this leaf */ }
    }
    return null;
}
/** Compose the grid: one PNG, `columns` wide, every cell a
 *  contain-fit image over a labeled strip (a run without readable
 *  image bytes a flat gray cell labeled with its id + the voice).
 *  The cell size clamps to 96..768 and then shrinks (32px steps,
 *  floor MIN_CELL) until the whole sheet fits the store's own
 *  dimension and pixel limits — the limits bind the grid, never the
 *  caller's ambition.
 *  @param cells the resolved cells, in caller order.
 *  @param columns the grid column count.
 *  @param cellWanted the caller's cell size request.
 *  @param limits the attachment store's own caps.
 *  @returns the PNG bytes plus the sheet geometry and final cell. */
async function composeSheet(cells, columns, cellWanted, limits) {
    const rows = Math.ceil(cells.length / columns);
    let size = Math.max(MIN_CELL, Math.min(MAX_CELL, cellWanted));
    while (size > MIN_CELL
        && (columns * size > limits.maxImageDimension
            || rows * (size + LABEL_H) > limits.maxImageDimension
            || columns * size * rows * (size + LABEL_H) > limits.maxImagePixels)) {
        size -= 32;
    }
    const rowH = size + LABEL_H;
    const tiles = [];
    for (let i = 0; i < cells.length; i++) {
        const c = cells[i];
        const left = (i % columns) * size;
        const top = Math.floor(i / columns) * rowH;
        let art = null;
        if (c.bytes !== null) {
            try {
                art = await sharp(Buffer.from(c.bytes)).rotate().resize(size, size, { fit: 'inside' }).png().toBuffer();
            }
            catch {
                art = null; /* undecodable bytes — the gray cell names it */
            }
        }
        const label = c.bytes !== null
            ? c.runId
            : c.artifact !== null
                ? c.runId + ' — unreadable artifact'
                : c.runId + ' — no image artifact';
        let cellPng;
        if (art !== null) {
            const meta = await sharp(art).metadata();
            const offX = meta.width === undefined ? 0 : Math.max(0, Math.floor((size - meta.width) / 2));
            const offY = meta.height === undefined ? 0 : Math.max(0, Math.floor((size - meta.height) / 2));
            cellPng = await sharp({ create: { width: size, height: size, channels: 3, background: CELL_BG } })
                .composite([{ input: art, left: offX, top: offY }]).png().toBuffer();
        }
        else {
            cellPng = await sharp({ create: { width: size, height: size, channels: 3, background: GRAY_CELL } }).png().toBuffer();
        }
        const labeled = await sharp({ create: { width: size, height: size + LABEL_H, channels: 3, background: CELL_BG } })
            .composite([{ input: cellPng, left: 0, top: 0 }, { input: labelSvg(label, size), left: 0, top: size }])
            .png().toBuffer();
        tiles.push({ input: labeled, left, top });
    }
    const png = await sharp({ create: { width: columns * size, height: rows * rowH, channels: 3, background: CELL_BG } })
        .composite(tiles).png().toBuffer();
    return { png: new Uint8Array(png), width: columns * size, height: rows * rowH, cell: size };
}
/** The render: one text summary + the image block (melite_view's
 *  pairing law). The text names the grid geometry, the byte size,
 *  and every run that rendered gray (the sweep's failures are the
 *  judgment data — printed, never implied).
 *  @param value the canonical sheet value. */
/** The render-plane boundary narrow: the tool contract hands the
 * renderer a JsonValue (model/tool JSON boundary — the law's own
 * validation seat, never a cast); a foreign shape throws loud. */
function contactSheetValue(v) {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) {
        throw new Error('melite_contact_sheet render: the run value is not an object');
    }
    const runs = v.runs;
    if (!Array.isArray(runs))
        throw new Error('melite_contact_sheet render: the value carries no runs array');
    const image = v.image;
    if (typeof image !== 'object' || image === null || Array.isArray(image)) {
        throw new Error('melite_contact_sheet render: the value carries no image object');
    }
    const columns = v.columns;
    const cell = v.cell;
    if (typeof columns !== 'number' || typeof cell !== 'number') {
        throw new Error('melite_contact_sheet render: the value carries no grid counts');
    }
    for (const k of ['attachmentId', 'mediaType', 'bytes', 'width', 'height']) {
        if (image[k] === undefined) {
            throw new Error('melite_contact_sheet render: the image ref carries no ' + k);
        }
    }
    return { runs: runs, image: image, columns, cell };
}
function sheetContent(value) {
    const missing = value.runs.filter((r) => r.missing === true).map((r) => r.run_id);
    const image = value.image;
    return [
        { type: 'text', text: 'melite_contact_sheet: ' + String(value.runs.length) + ' runs, grid '
                + String(value.columns) + ' columns of ' + String(value.cell) + 'px cells (' + image.mediaType + ' '
                + String(image.width) + 'x' + String(image.height) + ', ' + String(image.bytes) + ' bytes)'
                + (missing.length > 0 ? '; no image artifact: ' + missing.join(', ') + ' (gray cells)' : '; every run imaged') },
        { type: 'image', attachment: imageRefFromValue(image) },
    ];
}
/** Build the melite_contact_sheet tool against the live cordis
 *  context (the seats: `attachments` — the durable store, `queue` —
 *  the runs tree root owner, `llm` — the route gate; all optional
 *  probes, the tool-fs inject law).
 *  @param ctx the host context.
 *  @returns the registered tool definition. */
export function meliteContactSheet(ctx) {
    const presentCall = (args) => {
        const a = (typeof args === 'object' && args !== null ? args : {});
        const ids = Array.isArray(a.run_ids) ? a.run_ids.filter((x) => typeof x === 'string') : [];
        return {
            card: 'generic',
            title: 'Contact sheet of ' + String(ids.length) + ' run' + (ids.length === 1 ? '' : 's'),
            kind: 'read',
            rawInput: { run_ids: ids, artifact: typeof a.artifact === 'string' ? a.artifact : undefined },
        };
    };
    const def = defineTool({
        name: 'melite_contact_sheet',
        description: 'Compose ONE labeled contact-sheet image from N estate runs — the sweep judge\'s single call '
            + '(judging a breadth sweep through melite_view costs one full image per run in model context; this door costs one total). '
            + 'Every cell shows the run\'s NEWEST image (or the artifact the filter names) with the run id labeled beneath; '
            + 'a run that holds no image artifact renders a gray labeled cell (a failed run is judgment data, never a refusal). '
            + 'Args: run_ids (1-36 estate run ids, grammar-refused otherwise, duplicates collapse), artifact (optional substring filter '
            + 'over each run\'s image names — the melite_view matcher), columns (optional; default near-square for the run count), '
            + 'cell (optional px, 96-768, default 384; the sheet shrinks to the attachment store\'s own limits). '
            + 'Refuses loud when no run holds an image (judge failures through ledger_tail instead) or the route declares no image input.',
        presentCall,
        parameters: {
            run_ids: {
                type: 'array',
                items: { type: 'string' },
                required: true,
                description: 'The estate run ids to judge (1-36; a "run-…" directory name under the runs tree).',
            },
            artifact: {
                type: 'string',
                description: 'Optional substring filter over each run\'s image artifact names (the melite_view spelling-normalized matcher).',
            },
            columns: {
                type: 'number',
                description: 'Grid column count (default: near-square for the run count).',
            },
            cell: {
                type: 'number',
                description: 'Cell size in px (96-768, default 384).',
            },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: true,
                properties: {
                    runs: {
                        type: 'array',
                        required: true,
                        description: 'Per-run rows: the picked artifact (artifact/url/host) or missing:true for the gray cells.',
                        items: { type: 'object', additionalProperties: true },
                    },
                    image: {
                        type: 'object',
                        additionalProperties: true,
                        required: true,
                        description: 'The committed sheet (attachmentId, mediaType, bytes, width, height) — the durable ref the image block re-brands.',
                    },
                    columns: { type: 'number', required: true, description: 'The grid column count used.' },
                    cell: { type: 'number', required: true, description: 'The cell size used, after the limits clamp.' },
                },
            },
            render: (_args, value) => sheetContent(contactSheetValue(value)),
        },
        isConcurrencySafe: () => true,
        async execute(args, exec0) {
            const exec = exec0;
            // run_ids is schema-typed array-of-string (InferArgs): the
            // wrapper gate rejects non-arrays and non-string members
            // before the body (ToolArgsError there). The bounds ride
            // here — the schema carries no minItems/maxItems.
            const rawIds = args.run_ids;
            if (rawIds.length === 0) {
                throw new Error('run_ids is empty — name the 1-' + String(MAX_RUNS) + ' estate runs to judge');
            }
            if (rawIds.length > MAX_RUNS) {
                throw new Error('run_ids carries ' + String(rawIds.length) + ' runs — the sheet caps at ' + String(MAX_RUNS) + ' cells (split the sweep into two calls)');
            }
            const runIds = [];
            for (let i = 0; i < rawIds.length; i++) {
                const v = rawIds[i].trim();
                if (!RUN_ID_RE.test(v)) {
                    throw new Error('run_ids[' + String(i) + '] "' + v + '" is not a run id — a run id is a "run-…" directory name under the runs tree (a typo\'d id would judge a silently-wrong cell)');
                }
                if (!runIds.includes(v))
                    runIds.push(v);
            }
            const attachments = ctx.get('attachments');
            if (attachments === undefined) {
                throw new Error('cannot compose the contact sheet: no attachment service is mounted — the sheet commits as an image attachment');
            }
            const seat = ctx.get('queue', false);
            if (seat === undefined) {
                throw new Error('cannot compose the contact sheet: the queue seat owns the runs tree root — mount @melite-plugin/dsh-estate');
            }
            // THE ROUTE GATE (melite_view's own law): a route that declares
            // no image input refuses LOUD before any filesystem work — the
            // sheet is pixels, and there is no text-only arm to fall to.
            const capability = await routeImageCapability(ctx, exec, runIds[0]);
            if (!capability.capable) {
                throw new Error('cannot compose the contact sheet on route "' + capability.model + '": the model declares no image input — the sheet is one image for the model to see (view single runs for their text observations, or route a vision-capable model)');
            }
            const filter = args.artifact !== undefined ? args.artifact.trim() : '';
            const cells = [];
            for (const runId of runIds) {
                const found = await firstRootWithRun(seat, 'image', runId);
                const row = found !== null ? found.own.find((r) => artifactRowMatches(r.name, filter)) : undefined;
                if (row === undefined || found === null) {
                    cells.push({ runId, bytes: null, host: null, url: null, artifact: null });
                }
                else {
                    const read = await readRowBytes(found.root, row.runId, row.name);
                    cells.push({
                        runId,
                        bytes: read !== null ? read.bytes : null,
                        host: read !== null ? read.host : null,
                        url: row.url,
                        artifact: row.name,
                    });
                }
            }
            if (cells.every((c) => c.bytes === null && c.artifact === null)) {
                throw new Error('none of the ' + String(cells.length) + ' runs hold an image artifact'
                    + (filter !== '' ? ' matching "' + filter + '"' : '')
                    + ' — a sheet of only gray cells judges nothing (check the run ids, or read the failures through ledger_tail) '
                    + searchedVoice(rootsManifest(seat.stateRoot, seat.stateRoots ?? [])));
            }
            const wanted = args.columns !== undefined && Number.isInteger(args.columns) && args.columns > 0 && args.columns <= cells.length
                ? args.columns
                : Math.ceil(Math.sqrt(cells.length));
            const sheet = await composeSheet(cells, wanted, args.cell !== undefined && args.cell > 0 ? args.cell : DEFAULT_CELL, attachments.imageLimits);
            const byteCap = Math.min(attachments.imageLimits.maxImageBytes, attachments.imageLimits.maxMessageImageBytes);
            if (sheet.png.byteLength > byteCap) {
                throw new Error('the composed sheet is ' + String(sheet.png.byteLength) + ' bytes — over the ' + String(byteCap) + '-byte image cap (shrink the cell or split the sweep into two calls)');
            }
            const ref = await attachments.saveImage({
                data: sheet.png,
                mediaType: 'image/png',
                name: 'contact-sheet-' + String(cells.length) + '-runs.png',
            });
            return {
                runs: cells.map((c) => c.artifact !== null
                    ? {
                        run_id: c.runId,
                        artifact: c.artifact,
                        url: c.url ?? undefined,
                        ...(c.host !== null ? { host: c.host } : {}),
                    }
                    : { run_id: c.runId, missing: true }),
                image: {
                    attachmentId: ref.attachmentId,
                    mediaType: ref.mediaType,
                    bytes: ref.bytes,
                    width: ref.width,
                    height: ref.height,
                    ...(ref.name === undefined ? {} : { name: ref.name }),
                    ...(ref.originalDimensions === undefined ? {} : { originalDimensions: { ...ref.originalDimensions } }),
                },
                columns: wanted,
                cell: sheet.cell,
            };
        },
    });
    return def;
}
//# sourceMappingURL=contact-sheet.js.map
