/**
 * InputPrepStudio — the input-prep card's own stage view (operator
 * 2026-11, defect 3: "turn the Image Prep into something like an
 * ANNY studio card — the preview is where you have the image, drag
 * a box to crop, then optional upscale/downscale parameters with a
 * model choice"). Registered on the `cards.stage.view` seam under
 * key 'input-prep' (src/client/index.ts).
 *
 * THE STATE LAW (the estate's own, DeclarativeStudio verbatim):
 * edits ride LOCAL user state seeded from the frozen bench row, and
 * EVERY EDIT SCHEDULES its patch through the slot's own door
 * (onPatch → the bench's trailing coalescer) at edit time — the
 * display follows the optimistic layer instantly while the ledger
 * holds the truth, so every run door (the frame's pill, the bench
 * tile, the sidebar draft lane, an agent's press) sweeps the
 * scheduled write before it composes; no door composes a row the
 * studio no longer shows (the 2026-10-20 run-carry burn: the pill's
 * verb was a last-bind-wins race and the losing verb dropped the
 * pick). The studio binds NO run verb of its own — the drill owns
 * the pill, one writer. The crop gesture is
 * the leaf's atomic commit (CropPreview fires onChange once per
 * release); this component translates between the four flat crop
 * params (the card's declared knobs — crop_x/y/width/height, -1 =
 * unset) and the leaf's CropRect, and owns the resample rail
 * (scale_width/scale_height/scale_method). THE MODEL CHOICE rides
 * the same rail since the operator's 2026-11-08 directive: a picked
 * scale_model (the standard ComfyUI upscale-model roster, ""
 * unstated) composes THIS card's own UpscaleModelLoader →
 * ImageUpscaleWithModel ahead of the plain width/height resize —
 * the former ruling that parked the diffusion upscaler on the
 * upscale-tools card is superseded (the compose lives in
 * packages/models/input/src/actions.ts, the family's declared
 * action).
 */
import { useEffect, useRef, useState } from 'react'
import type { StageViewOwnerProps } from '@melite/contracts/stageView'
import { StudioShell, SourceRow } from '@melite/card-base/client'
import { SCALE_METHODS, SCALE_MODEL_OPTIONS } from '@melite/models-input'
import { CropPreview } from './CropPreview.tsx'
import type { CropRect, NaturalSize } from './CropPreview.tsx'
import css from './prep.module.css'

const SCALE_KEYS = ['scale_width', 'scale_height'] as const

/** The one stable identity for a row that carries no params object
 * (audit input-prep F4: a render-derived {} re-seats the user layer
 * every render and wipes every pick). */
const EMPTY_PARAMS: Record<string, unknown> = {}

/** Read one numeric param (numbers only — anything else is unset). */
const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null

/** The four crop params as one rect (null unless ALL four are
 * seated >= 0 — the card's own -1-unset grammar). */
export function cropOf(params: Record<string, unknown>): CropRect | null {
  const x = num(params['crop_x'])
  const y = num(params['crop_y'])
  const w = num(params['crop_width'])
  const h = num(params['crop_height'])
  if (x === null || y === null || w === null || h === null) return null
  if (x < 0 || y < 0 || w < 0 || h < 0) return null
  return { x, y, width: w, height: h }
}

/** Whether a source string is previewable in an <img> (data:,
 * blob:, http(s):, or a rooted path — the bench's own URL grammar;
 * a bare staged input-dir name is NOT browser-loadable and the
 * studio says so instead of rendering a broken frame). */
export const isPreviewable = (source: string): boolean =>
  source.startsWith('data:') || source.startsWith('blob:')
  || source.startsWith('http://') || source.startsWith('https://')
  || source.startsWith('/')

/** THE MEDIA-KIND SNIFF (audit input-prep F2, 2026-10-20): an
 * audio pick was unseat-able as audio — no media_type verb existed,
 * so a .wav drop composed the IMAGE lane (LoadImage with an audio
 * filename) and died in engine dialect. The pick's own shape seats
 * the lane: an audio-shaped source carries media_type:'audio' with
 * the pick, an image-shaped one carries 'image'; an unrecognizable
 * shape seats the source alone (the row keeps whatever lane it had
 * — the sniff never fights an explicit choice). */
const AUDIO_EXT = new Set(['wav', 'mp3', 'ogg', 'oga', 'flac', 'm4a', 'aac', 'opus', 'aiff', 'wv'])
const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'avif', 'tiff', 'svg'])

export function sniffMediaType(source: string): 'audio' | 'image' | null {
  if (source.startsWith('data:audio/') || source.startsWith('blob:audio/')) return 'audio'
  if (source.startsWith('data:image/') || source.startsWith('blob:image/')) return 'image'
  const ext = source.slice(source.lastIndexOf('.') + 1).toLowerCase()
  if (ext === '' || source.lastIndexOf('.') < 0) return null
  if (AUDIO_EXT.has(ext)) return 'audio'
  if (IMAGE_EXT.has(ext)) return 'image'
  return null
}

export function InputPrepStudio(props: StageViewOwnerProps) {
  const { row } = props
  // THE ABSENT-PARAMS ROW (audit input-prep F4): a row without a
  // params object must yield ONE stable identity, never a fresh {}
  // per render — the re-seat effect keys on object identity, and a
  // render-derived empty object loops setUser and wipes every pick.
  const params = typeof row['params'] === 'object' && row['params'] !== null
    ? row['params'] as Record<string, unknown> : EMPTY_PARAMS

  // THE USER LAYER: the frozen bench row verbatim (presence IS the
  // override mark; defaults derive per render — the settings law).
  // Re-seeded when the row's params OBJECT identity changes (a
  // landed patch — ours or an agent's) AND the stage's writes are
  // quiet (hasUnsettledWrites, the drill2 probe: a re-render that
  // arrives mid-write must not wipe what the operator just typed):
  // optimistic edits persist until the truth actually moves, then
  // the truth re-seats.
  const [user, setUser] = useState<Record<string, unknown>>(params)
  const settledRef = useRef(props.hasUnsettledWrites ?? null)
  settledRef.current = props.hasUnsettledWrites ?? null
  useEffect(() => {
    if (settledRef.current?.() === true) return
    setUser(params)
  }, [params])

  // THE DISPLAY READS THE USER (the 2026-11-09 input burn: source
  // and media_type read the FROZEN row while edit() wrote the user —
  // a picked source never populated the preview until a patch
  // landed; the square, the notes, and the pane all follow the
  // optimistic layer, and the edit itself schedules the patch to
  // the row).
  const source = typeof user['source'] === 'string' ? user['source'] : ''
  const mediaType = user['media_type'] === 'audio' ? 'audio' : 'image'

  const [natural, setNatural] = useState<NaturalSize | null>(null)
  const previewable = source !== '' && isPreviewable(source) && mediaType === 'image'

  // A NEW SOURCE RE-ARMS THE DECODE (audit input-prep-total F2,
  // 2026-11-10): the presets and the meta line read the natural size —
  // the previous source's decode must never ride the new pick's
  // window (the leaf clears its own copy on the src change).
  useEffect(() => { setNatural(null) }, [source])

  const crop = cropOf(user)
  const scaleW = num(user['scale_width'])
  const scaleH = num(user['scale_height'])
  const method = typeof user['scale_method'] === 'string'
    && (SCALE_METHODS as readonly string[]).includes(user['scale_method'])
    ? user['scale_method'] : 'lanczos'
  // THE MODEL CHOICE: the stated roster member verbatim; anything
  // else (absent, non-string) is the "" unstated face.
  const scaleModel = typeof user['scale_model'] === 'string'
    && (SCALE_MODEL_OPTIONS as readonly string[]).includes(user['scale_model'])
    ? user['scale_model'] : ''

  // THE EDIT SCHEDULES (audit input-prep F1, the run-carry burn: the
  // pill's verb was a last-bind-wins race between the drill's flush
  // verb and this studio's patch-first verb — whichever lost dropped
  // the pick, the bench tile's Run carried no studio verb at all,
  // and the sidebar's draft lane passed no bindRun, so an optimistic
  // edit composed the FROZEN row from three of four doors). THE LAW:
  // the edit itself schedules its patch through the slot's own door
  // (onPatch → the bench's trailing coalescer — bursts merge into
  // one write, the display stays instant on the optimistic layer);
  // EVERY run door — the pill, the bench tile, the sidebar, an
  // agent's press — sweeps the scheduled write through the run gate
  // before it composes, so no door can compose a row the studio no
  // longer shows. The studio binds NO run verb of its own: the
  // frame's pill owns exactly one writer (the drill's flush verb),
  // whose fence force-sweeps this studio's scheduled patch.
  const patchRef = useRef(props.onPatch)
  patchRef.current = props.onPatch
  const edit = (patch: Record<string, unknown>): void => {
    setUser((prev) => ({ ...prev, ...patch }))
    void patchRef.current(patch)
  }

  /** The source pick seats its own lane with it (audit F2: the
   * compose branch keys on media_type — a picked .wav composing the
   * image lane is the silent wrong-arm burn). THE RE-SWITCH LAW
   * (audit input-prep-total F1, 2026-11-10): when the sniff FLIPS the
   * lane, the SAME patch seats every transform key's unset grammar —
   * edit is merge-only, so without this seat the previous lane's
   * crop/scale keys stayed in the doc (compose dropped them silently
   * on the audio passthrough, and flipping back resurrected the stale
   * box over the new source). scale_method rides no seat: it is a
   * modifier of the stated dims (compose reads it only under a stated
   * width/height) and its vocabulary has no unset member. */
  const pickSource = (v: string): void => {
    const media = sniffMediaType(v)
    if (media === null) { edit({ source: v }); return }
    if (media === mediaType) { edit({ source: v, media_type: media }); return }
    edit({
      source: v,
      media_type: media,
      crop_x: -1, crop_y: -1, crop_width: -1, crop_height: -1,
      scale_width: -1, scale_height: -1,
      scale_model: '',
    })
  }

  /** The leaf's atomic commit → the four flat params. */
  const onCropCommit = (next: CropRect | null): void => {
    edit(next === null
      ? { crop_x: -1, crop_y: -1, crop_width: -1, crop_height: -1 }
      : { crop_x: next.x, crop_y: next.y, crop_width: next.width, crop_height: next.height })
  }

  /** The crop box (or the full frame when uncropped) — the base the
   * scale presets multiply. */
  const base = crop ?? (natural !== null ? { x: 0, y: 0, width: natural.width, height: natural.height } : null)
  const preset = (factor: number): void => {
    if (base === null) return
    edit({
      scale_width: Math.max(1, Math.round(base.width * factor)),
      scale_height: Math.max(1, Math.round(base.height * factor)),
    })
  }

  // THE SHARED SHELL (operator 2026-11-09, verbatim: "Parameters to
  // the left, preview / edit window to the right. THAT IS HOW EVERY
  // CARD WORKS." — the handrolled flex rendered the preview FIRST and
  // the rail second, the exact inversion). StudioShell owns the
  // three-slot shape: params LEFT, preview RIGHT; this component owns
  // only the CONTENT of each slot (studio.tsx's law: a takeover rides
  // beside the shared renderer, never a fork of its chrome).
  return (
    <div data-testid="prep-studio" className={css.studioHost}>
    <StudioShell
      // LEFT — the params rail: THE SOURCE SEAT first (the
      // construction law — the studio replaced the generic form when
      // it declared a stage view, and the fork dropped the upload
      // square with it: "WHERE IS THE IMAGE UPLOAD SPOT?"). The ONE
      // SourceRow every card rides: upload / from-flow / from-media /
      // clear, writing the source param.
      params={(
        <div className={css.paramsCol}>
          <SourceRow
            name="source"
            label="Source file"
            kind="file"
            value={source}
            onEdit={pickSource}
            candidates={props.upstream.map((u) => ({ id: u.id, label: u.title, url: u.url }))}
          />
          {/* THE DECLARED SURFACE LAW (image-3d wave-2): the transform
              rail mirrors the declaration's visible_when — crop/scale
              are image-lane knobs (card.ts); on the audio arm the rail
              hid nothing and compose silently dropped the keys. */}
          {mediaType === 'image' && (
          <div className={css.rail} data-testid="prep-rail">
        <div className={css.railTitle}>Transform</div>
        <div className={css.railRow}>
          <button
            type="button"
            className={css.chip}
            data-testid="prep-clear-crop"
            disabled={crop === null}
            onClick={() => { onCropCommit(null) }}
          >clear crop</button>
          <span className={css.railHint}>drag on the image to set the box</span>
        </div>
        <div className={css.railTitle}>Scale (optional)</div>
        <div className={css.railRow}>
          <label className={css.field}>
            <span>width (px)</span>
            <input
              type="number"
              min={1}
              data-testid="prep-scale-scale_width"
              value={scaleW === null || scaleW < 0 ? '' : String(scaleW)}
              placeholder="unset"
              onChange={(e) => {
                const raw = e.target.value
                // THE FINITE LAW (audit F6.4): 1e999 parses to
                // Infinity, Math.max(1, Infinity) seats Infinity,
                // and JSON.stringify turns it to null at the door —
                // a non-finite keystroke seats the UNSET key
                const parsed = raw === '' ? -1 : Number(raw)
                edit({ scale_width: Number.isFinite(parsed) && parsed > 0 ? Math.max(1, Math.round(parsed)) : -1 })
              }}
            />
          </label>
          <label className={css.field}>
            <span>height (px)</span>
            <input
              type="number"
              min={1}
              data-testid="prep-scale-scale_height"
              value={scaleH === null || scaleH < 0 ? '' : String(scaleH)}
              placeholder="unset"
              onChange={(e) => {
                const raw = e.target.value
                const parsed = raw === '' ? -1 : Number(raw)
                edit({ scale_height: Number.isFinite(parsed) && parsed > 0 ? Math.max(1, Math.round(parsed)) : -1 })
              }}
            />
          </label>
        </div>
        <div className={css.railRow}>
          <button type="button" className={css.chip} data-testid="prep-preset-2x" disabled={base === null} onClick={() => { preset(2) }}>2×</button>
          <button type="button" className={css.chip} data-testid="prep-preset-half" disabled={base === null} onClick={() => { preset(0.5) }}>½×</button>
          <button
            type="button"
            className={css.chip}
            data-testid="prep-clear-scale"
            disabled={scaleW === null && scaleH === null}
            onClick={() => { edit({ scale_width: -1, scale_height: -1 }) }}
          >clear</button>
        </div>
        <label className={css.field} data-testid="prep-method-field">
          <span>resample method</span>
          <select
            data-testid="prep-scale-method"
            value={method}
            onChange={(e) => { edit({ scale_method: e.target.value }) }}
          >
            {SCALE_METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className={css.field} data-testid="prep-model-field">
          <span>upscale model</span>
          <select
            data-testid="prep-scale-model"
            value={scaleModel}
            onChange={(e) => { edit({ scale_model: e.target.value }) }}
          >
            {SCALE_MODEL_OPTIONS.map((m) => (
              <option key={m} value={m}>{m === '' ? '(none — plain resample only)' : m}</option>
            ))}
          </select>
        </label>
        <span className={css.railHint}>
          pick a model to run the engine's model upscaler in this lane (UpscaleModelLoader → ImageUpscaleWithModel); a width/height resize rides after it
        </span>
          </div>
          )}
        </div>
      )}
      // RIGHT — the preview / edit window: the drag-crop pane (the
      // domain takeover content — the one thing no renderer declares).
      preview={(
        <div className={css.previewPane}>
        {mediaType === 'audio' && (
          <div className={css.paneNote} data-testid="prep-audio-note">
            audio restage — crop and scale are image-lane knobs (LoadAudio → SaveAudio composes without them)
          </div>
        )}
        {mediaType === 'image' && source === '' && (
          <div className={css.paneNote} data-testid="prep-empty-note">
            pick a source file first — the preview crops what the run stages
          </div>
        )}
        {mediaType === 'image' && source !== '' && !previewable && (
          <div className={css.paneNote} data-testid="prep-staged-note">
            staged source "{source}" — the engine holds this file; the drag-crop preview needs a browser-loadable image (upload or asset drop)
          </div>
        )}
        {previewable && (
          <CropPreview src={source} crop={crop} onChange={onCropCommit} onNatural={setNatural} />
        )}
        {previewable && natural !== null && (
          <div className={css.paneMeta} data-testid="prep-natural">
            source {natural.width}×{natural.height}
            {crop !== null ? ` — crop ${crop.width}×${crop.height} at ${crop.x},${crop.y}` : ''}
          </div>
        )}
        </div>
      )}
    />
    </div>
  )
}
