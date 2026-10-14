/**
 * lora-section.tsx — THE LORA BLOCK for the ComfyUI Manager sidebar
 * (the operator's 2026-09-26 order: "custom LoRAs should be in the
 * ComfyUI manager sidebar").
 *
 * It speaks the manage plane's own two doors — `lora_list` and
 * `lora_install` — so this is the same vocabulary every other sidebar
 * action uses, and the same refusal envelope on a refusal. The block
 * states the two facts a user cannot see otherwise:
 *
 * - what the ENGINE will accept (its own `LoraLoaderModelOnly` combo —
 *   a name outside it is a 400 at /prompt, after the money is spent),
 *   with the rows the engine does NOT have named here;
 * - the user's own rows, and the honest boundary: a copied file only
 *   enters the combo after a RESTART (core enumerates folder_paths at
 *   import — the only refresh primitive this repo owns).
 *
 * The install is a COPY of a file the operator already has — never a
 * fetch ("THERE SHOULD NOT BE A LORAS REMOTE / IT'S ALL BUILT IN").
 *
 * Presentation rides the sidebar's own atoms (dsh Button/Input + the
 * assets module's field/row classes) — the 2026-10-22 operator review
 * retired this block's private raw-element markup: same doors, same
 * voices, native chrome.
 */
import * as React from 'react'
import { Button, Input, Menu } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './assets.module.css'
import { postManage } from './assets-tab.tsx'
import { assetsCopy } from '../assetsCopy.ts'

/** The manage plane's own envelope shape (the sidebar's, restated
 *  locally: assets-tab's copy is not exported, and this block must not
 *  couple to that file's internals beyond the one door it calls). */
interface ManageReply {
  action?: string
  ok?: boolean
  detail?: string
  data?: unknown
  code?: string
  status?: number
  state?: string
  next_action?: string
}

export interface LoraListData {
  engine_loras?: string[]
  user_rows?: Array<{ id?: string, filename?: string, label?: string, families?: string[], default_strength?: number }>
  user_rows_path?: string
  user_rows_present?: boolean
  user_row_problems?: string[]
  unboarded?: string[]
  install_dir?: string
}

export interface LoraInstallData {
  filename?: string
  bytes?: number
  in_combo_now?: boolean
  restart_required?: boolean
  row_suggestion?: Record<string, unknown>
}

/** The family vocabulary the panel's provision catalog serves — the
 *  same ModelOption rows the Models section renders. A LoRA row's
 *  families name model families, so the dropdown reads ONE catalog. */
export interface LoraFamilyOption {
  id: string
  label: string
}

/** The voice for a THROWN manage verb. postManage raises Error values
 *  only: a lane that throws anything else (a string, a number) is
 *  folded into {ok: false, detail} before it leaves the door
 *  (assets-tab.tsx:360-367), a missing lane raises its own Error
 *  (:329), and the one rethrow is the lane's AbortError — an Error
 *  instance. So the cast below reads a proven reachability fact, and
 *  every catch in this block speaks the same voice from it. */
function thrownVoice(e: unknown): string {
  return (e as Error).message
}

export interface LoraBlockProps {
  /** The provision catalog's families — absent in bare mounts (tests,
   *  previews) renders the dropdown with no options. */
  familyOptions?: ReadonlyArray<LoraFamilyOption>
}

function LoraBlock({ familyOptions = [] }: LoraBlockProps): ReturnType<typeof React.createElement> {
  const [data, setData] = React.useState<LoraListData | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [refusal, setRefusal] = React.useState<string | null>(null)
  const [path, setPath] = React.useState('')
  const [families, setFamilies] = React.useState<string[]>([])
  const [familyPickOpen, setFamilyPickOpen] = React.useState(false)

  // THE MOUNT LAW (the sidebar's own discipline, pinned by its walls:
  // mounting the tab asks for `status` and nothing else): this block
  // fetches when the operator OPENS it, never on mount — a panel that
  // asks the engine for its LoRA list before anyone looks at it is
  // noise, and the request sequence is a law here.
  const [open, setOpen] = React.useState(false)

  const refresh = React.useCallback(async (): Promise<void> => {
    setBusy(true)
    setRefusal(null)
    try {
      const reply: ManageReply = await postManage('lora_list', {})
      // A REFUSED DOOR IS NOT A THROW: postManage folds the protocol's
      // failure face into { ok: false, detail } (assets-tab.tsx:346),
      // so reading only `.data` rendered an EMPTY panel over a refusal
      // and said nothing — the one thing this block must never do.
      if (reply.ok !== true) {
        /* v8 ignore next -- postManage folds a refusal through
           * nonEmptyOr, so detail is NEVER empty (assets-tab.tsx:346);
           * the default text is a belt for a lane that answers
           * differently. */
        setRefusal(reply.detail ?? 'the engine refused the LoRA list')
        return
      }
      setData((reply.data ?? {}) as LoraListData)
    } catch (e) {
      setRefusal(thrownVoice(e))
    } finally {
      setBusy(false)
    }
  }, [])

  const openedRef = React.useRef(false)
  const openAndLoad = React.useCallback((): void => {
    setOpen((was) => {
      const next = !was
      /* v8 ignore next 3 -- the block has NO close affordance: the
       * open state renders Refresh as its only button (:151-153), so
       * openAndLoad's close half cannot be driven from the UI. */
      if (next && openedRef.current !== true) {
        openedRef.current = true
        void refresh()
      }
      return next
    })
  }, [refresh])

  const install = React.useCallback(async (): Promise<void> => {
    /* v8 ignore next 3 -- the Copy button is DISABLED while the path
     * is blank, so install cannot run with one; the guard is a belt
     * for a keyboard/programmatic activation. */
    if (path.trim() === '') return
    setBusy(true)
    setRefusal(null)
    try {
      const installed: ManageReply = await postManage('lora_install', {
        path: path.trim(),
        families,
      })
      if (installed.ok !== true) {
        /* v8 ignore next -- postManage folds a refusal through
           * nonEmptyOr, so detail is NEVER empty (assets-tab.tsx:346);
           * the default text is a belt for a lane that answers
           * differently. */
        setRefusal(installed.detail ?? 'the engine refused the install')
        return
      }
      await refresh()
    } catch (e) {
      setRefusal(thrownVoice(e))
    } finally {
      setBusy(false)
    }
  }, [families, path, refresh])

  const uploadChosen = React.useCallback(async (file: File): Promise<void> => {
    setBusy(true)
    setRefusal(null)
    try {
      // THE BINARY DOOR (2026-10-17, the transport cure): the bytes
      // stream straight through as octet-stream — no base64 data URL,
      // so a 200MB LoRA costs 200MB, never a ~267MB string inside a
      // JSON manage act (~2× peak memory). The door checks the
      // declared content-length against the cap BEFORE reading.
      const qs = new URLSearchParams({ filename: file.name })
      if (families.length > 0) qs.set('families', families.join(','))
      const res = await fetch('/v1/uploads/lora?' + qs.toString(), {
        method: 'POST',
        headers: { 'content-type': 'application/octet-stream' },
        body: file,
      })
      if (!res.ok) {
        const why = await res.json().then((r: { error?: unknown }) =>
          typeof r?.error === 'string' ? r.error : '').catch(() => '')
        throw new Error(why !== '' ? why : 'the lora door refused the upload (HTTP ' + String(res.status) + ')')
      }
      await refresh()
    } catch (e) {
      setRefusal(thrownVoice(e))
    } finally {
      setBusy(false)
    }
  }, [families, refresh])

  const addFamily = React.useCallback((id: string): void => {
    if (id === '') return
    setFamilies((was) => was.includes(id) ? was : [...was, id])
  }, [])

  const removeFamily = React.useCallback((id: string): void => {
    setFamilies((was) => was.filter((f) => f !== id))
  }, [])

  const engine: string[] = data?.engine_loras ?? []
  const rows = data?.user_rows ?? []
  const unboarded: string[] = data?.unboarded ?? []
  const problems: string[] = data?.user_row_problems ?? []
  const labelOf = (id: string): string => familyOptions.find((f) => f.id === id)?.label ?? id

  return (
    <div data-testid="manage-loras">
      <div className={css.row}>
        <h3 className={css.sectionTitle}>{assetsCopy.loraTitle}</h3>
        {open
          ? <Button onClick={() => { void refresh() }} disabled={busy}>{assetsCopy.loraRefresh}</Button>
          : <Button onClick={openAndLoad} disabled={busy}>{assetsCopy.loraShow}</Button>}
      </div>
      {open === false
        ? <p className={css.sub}>{assetsCopy.loraClosedNote}</p>
        : null}
      <p className={css.sub}>
        {assetsCopy.engineAcceptsNote({ count: engine.length })}
      </p>
      {data?.install_dir === undefined
        ? null
        : <p className={css.sub + ' ' + css.mono}>{assetsCopy.installDirNote({ dir: data.install_dir })}</p>}
      {/* THE UNBOARDED ROWS: named here, not at /prompt */}
      {unboarded.length === 0
        ? null
        : (
            <div className={css.warningNote}>
              {assetsCopy.unboardedNote({ count: unboarded.length })}
              {unboarded.map((u) => <div key={u} className={css.mono}>· {u}</div>)}
            </div>
          )}
      {/* THE USER'S OWN ROWS */}
      <p className={css.sub}>
        {assetsCopy.yourRowsLabel} {data?.user_rows_present === true ? String(rows.length) : assetsCopy.noneFallback}
        {data?.user_rows_path === undefined ? '' : ' — ' + data.user_rows_path}
      </p>
      {rows.map((r) => (
        <div key={String(r.id)} className={css.sub + ' ' + css.mono}>
          · {String(r.label ?? r.id)}  ({String(r.filename)})
          {r.default_strength === undefined ? '' : '  @' + String(r.default_strength)}
          {r.families === undefined ? '' : '  [' + r.families.join(', ') + ']'}
        </div>
      ))}
      {problems.length === 0
        ? null
        : (
            <div className={css.warningNote}>
              {problems.map((p) => <div key={p} className={css.mono}>{assetsCopy.refusedRowNote({ row: p })}</div>)}
            </div>
          )}
      {/* THE UPLOAD DOOR — THE CIVIT FLOW (civit.ai serves downloads
          behind Cloudflare and a per-account key, and the standing law
          forbids the estate fetching a LoRA at all): download it in YOUR
          browser, then choose the file here — or drop it on this row.
          The bytes ride the uploads rail as octet-stream; nothing is
          fetched by the estate. */}
      <div
        className={css.row}
        onDragOver={(e) => { e.preventDefault() }}
        onDrop={(e) => {
          e.preventDefault()
          const file = e.dataTransfer.files[0]
          if (file !== undefined && busy === false) void uploadChosen(file)
        }}
      >
        <label className={css.field}>
          <span className={css.fieldLabel}>{assetsCopy.loraFileField}</span>
          <input
            type="file"
            className={css.input}
            accept=".safetensors,.ckpt,.pt,.bin,.gguf"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file === undefined) return
              void uploadChosen(file)
            }}
            disabled={busy}
          />
        </label>
      </div>
      <p className={css.sub}>{assetsCopy.civitNote}</p>
      {/* THE FILE DOOR — a copy from the machine, never a fetch. The
          family vocabulary rides the panel's provision catalog (a
          dropdown, not free text — the 2026-10-22 operator review). */}
      <div className={css.row}>
        <label className={css.field}>
          <span className={css.fieldLabel}>{assetsCopy.absolutePathField}</span>
          <Input
            className={css.mono}
            placeholder={assetsCopy.absolutePathPlaceholder}
            value={path}
            onChange={(event) => { setPath(event.target.value) }}
          />
        </label>
        <div className={css.field}>
          <span className={css.fieldLabel}>{assetsCopy.familiesField}</span>
          {/* THE DSH MENU SELECT (the zoom.tsx idiom) — picking a row
              ADDS the family (the select was never persistent state). */}
          <Menu
            open={familyPickOpen}
            onClose={() => { setFamilyPickOpen(false) }}
            compact
            portal
            items={familyOptions.map((f) => ({ id: f.id, label: f.label }))}
            onSelect={(id) => {
              setFamilyPickOpen(false)
              addFamily(id)
            }}
            anchor={
              <Button size="sm" variant="outline" aria-label={assetsCopy.familiesField} disabled={busy || familyOptions.length === 0} onClick={() => { setFamilyPickOpen(!familyPickOpen) }}>
                {familyOptions.length === 0 ? assetsCopy.noFamiliesOption : assetsCopy.addFamilyOption}
              </Button>
            }
          />
        </div>
        <Button onClick={() => { void install() }} disabled={busy || path.trim() === ''}>{assetsCopy.copyLoraButton}</Button>
      </div>
      {families.length > 0
        ? (
            <div className={css.chipRow}>
              {families.map((f) => (
                <span key={f} className={css.chip}>
                  {labelOf(f)}
                  <button type="button" className={css.chipX} aria-label={assetsCopy.removeFamilyLabel({ label: labelOf(f) })} onClick={() => { removeFamily(f) }}>×</button>
                </span>
              ))}
            </div>
          )
        : null}
      <p className={css.sub}>{assetsCopy.restartNote}</p>
      <div className={css.row}>
        <Button
          className={css.btnDanger}
          onClick={() => {
            void postManage('restart', {}).then((reply: ManageReply) => {
              // same law as the list and the install: a refused restart is
              // a VALUE, and the button must not read as if it worked
              if (reply.ok !== true) {
                /* v8 ignore next -- postManage folds a refusal through
                   * nonEmptyOr, so detail is NEVER empty (assets-tab.tsx:346);
                   * the default text is a belt for a lane that answers
                   * differently. */
                setRefusal(reply.detail ?? 'the engine refused the restart')
                return
              }
              return refresh()
            }).catch((e: unknown) => {
              setRefusal(thrownVoice(e))
            })
          }}
          disabled={busy}
        >{assetsCopy.restartEngineButton}</Button>
      </div>
      {refusal === null ? null : <div className={css.warningNote} role="status">{refusal}</div>}
    </div>
  )
}

export default LoraBlock
