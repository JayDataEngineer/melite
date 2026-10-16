/**
 * InputPrepStudio — the input-prep card's own stage view (operator
 * 2026-11, defect 3: "turn the Image Prep into something like an
 * ANNY studio card — the preview is where you have the image, drag
 * a box to crop, then optional upscale/downscale parameters with a
 * model choice"). Registered on the `cards.stage.view` seam under
 * key 'input-prep' (src/client/index.ts).
 *
 * THE STATE LAW (the estate's own, DeclarativeStudio verbatim):
 * edits ride LOCAL user state seeded from the frozen bench row; the
 * run verb PATCHES FIRST then starts the run (bindRun — the frame's
 * pill never runs past unflushed crop state). The crop gesture is
 * the leaf's atomic commit (CropPreview fires onChange once per
 * release); this component translates between the four flat crop
 * params (the card's declared knobs — crop_x/y/width/height, -1 =
 * unset) and the leaf's CropRect, and owns the resample rail
 * (scale_width/scale_height/scale_method — the METHOD ROW IS THE
 * MODEL CHOICE: the five resample models the card's compose
 * actually drives into ImageScale; the diffusion upscaler is the
 * upscale-tools card's own stage, never a phantom row here).
 */
import { useEffect, useRef, useState } from 'react'
import type { StageViewOwnerProps } from '@melite/contracts/stageView'
import { SCALE_METHODS } from '@melite/models-input'
import { CropPreview } from './CropPreview.tsx'
import type { CropRect, NaturalSize } from './CropPreview.tsx'
import css from './prep.module.css'

const CROP_KEYS = ['crop_x', 'crop_y', 'crop_width', 'crop_height'] as const
const SCALE_KEYS = ['scale_width', 'scale_height'] as const

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

export function InputPrepStudio(props: StageViewOwnerProps) {
  const { row, bindRun } = props
  const params = typeof row['params'] === 'object' && row['params'] !== null
    ? row['params'] as Record<string, unknown> : {}
  const source = typeof params['source'] === 'string' ? params['source'] : ''
  const mediaType = params['media_type'] === 'audio' ? 'audio' : 'image'

  // THE USER LAYER: the frozen bench row verbatim (presence IS the
  // override mark; defaults derive per render — the settings law).
  // Re-seeded when the row's params OBJECT identity changes (a
  // landed patch — ours or an agent's): optimistic edits persist
  // until the row actually moves, then the truth re-seats.
  const [user, setUser] = useState<Record<string, unknown>>(params)
  useEffect(() => { setUser(params) }, [params])
  const userRef = useRef(user)
  userRef.current = user

  const [natural, setNatural] = useState<NaturalSize | null>(null)
  const previewable = source !== '' && isPreviewable(source) && mediaType === 'image'

  const crop = cropOf(user)
  const scaleW = num(user['scale_width'])
  const scaleH = num(user['scale_height'])
  const method = typeof user['scale_method'] === 'string'
    && (SCALE_METHODS as readonly string[]).includes(user['scale_method'])
    ? user['scale_method'] : 'lanczos'

  const edit = (patch: Record<string, unknown>): void => {
    setUser((prev) => ({ ...prev, ...patch }))
  }

  /** The leaf's atomic commit → the four flat params. */
  const onCropCommit = (next: CropRect | null): void => {
    edit(next === null
      ? { crop_x: -1, crop_y: -1, crop_width: -1, crop_height: -1 }
      : { crop_x: next.x, crop_y: next.y, crop_width: next.width, crop_height: next.height })
  }

  /** PATCH FIRST, then run (the estate's run law — the frame's pill
   * calls this verb, never a bare onRun past unflushed state). */
  const runRef = useRef(props.onRun)
  runRef.current = props.onRun
  useEffect(() => {
    bindRun?.(() => {
      const patch: Record<string, unknown> = { ...userRef.current }
      void props.onPatch(patch)
      runRef.current()
    })
  }, [bindRun, props.onPatch])

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

  return (
    <div className={css.studio} data-testid="prep-studio">
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
                edit({ scale_width: raw === '' ? -1 : Math.max(1, Math.round(Number(raw))) })
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
                edit({ scale_height: raw === '' ? -1 : Math.max(1, Math.round(Number(raw))) })
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
          <span>resample model</span>
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
        <span className={css.railHint}>
          diffusion upscale is the Upscale Image card's own stage — wire this output into it
        </span>
      </div>
      )}
    </div>
  )
}
