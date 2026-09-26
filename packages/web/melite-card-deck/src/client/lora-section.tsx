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
 */
import * as React from 'react'
import { postManage } from './assets-tab.tsx'

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

function LoraBlock(): ReturnType<typeof React.createElement> {
  const [data, setData] = React.useState<LoraListData | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [refusal, setRefusal] = React.useState<string | null>(null)
  const [path, setPath] = React.useState('')
  const [families, setFamilies] = React.useState('z-image')

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
      setData((reply.data ?? {}) as LoraListData)
    } catch (e) {
      setRefusal(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [])

  const openedRef = React.useRef(false)
  const openAndLoad = React.useCallback((): void => {
    setOpen((was) => {
      const next = !was
      if (next && openedRef.current !== true) {
        openedRef.current = true
        void refresh()
      }
      return next
    })
  }, [refresh])

  const install = React.useCallback(async (): Promise<void> => {
    if (path.trim() === '') return
    setBusy(true)
    setRefusal(null)
    try {
      await postManage('lora_install', {
        path: path.trim(),
        families: families.split(',').map((f) => f.trim()).filter((f) => f !== ''),
      })
      await refresh()
    } catch (e) {
      setRefusal(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [families, path, refresh])

  const engine: string[] = data?.engine_loras ?? []
  const rows = data?.user_rows ?? []
  const unboarded: string[] = data?.unboarded ?? []
  const problems: string[] = data?.user_row_problems ?? []

  return React.createElement('div', { 'data-testid': 'manage-loras' },
    React.createElement('div', { className: 'row' },
      React.createElement('strong', null, 'LoRAs'),
      open
        ? React.createElement('button', { onClick: () => void refresh(), disabled: busy }, 'Refresh')
        : React.createElement('button', { onClick: openAndLoad, disabled: busy }, 'Show LoRAs'),
    ),
    open === false ? React.createElement('p', { className: 'hint' },
      'Add a LoRA you already have: the engine accepts only the names in its own list, so copy the file in, restart, then add a row.') : null,
    React.createElement('p', { className: 'hint' },
      'The engine accepts ' + String(engine.length) + ' LoRA name(s) — a name outside its list refuses at run time, so add the file first.'),
    data?.install_dir === undefined
      ? null
      : React.createElement('p', { className: 'hint mono' }, 'install dir: ' + data.install_dir),
    // THE UNBOARDED ROWS: named here, not at /prompt
    unboarded.length === 0
      ? null
      : React.createElement('div', { className: 'warn' },
        unboarded.length + ' of your row(s) are not in the engine list yet (install the file, then restart the engine):',
        ...unboarded.map((u) => React.createElement('div', { key: u, className: 'mono' }, '· ' + u))),
    // THE USER'S OWN ROWS
    React.createElement('div', { className: 'hint' },
      'your rows: ' + (data?.user_rows_present === true ? String(rows.length) : 'none') +
      (data?.user_rows_path === undefined ? '' : ' — ' + data.user_rows_path)),
    ...rows.map((r) => React.createElement('div', { key: String(r.id), className: 'mono' },
      '· ' + String(r.label ?? r.id) + '  (' + String(r.filename) + ')' +
      (r.default_strength === undefined ? '' : '  @' + String(r.default_strength)) +
      (r.families === undefined ? '' : '  [' + r.families.join(', ') + ']'))),
    problems.length === 0
      ? null
      : React.createElement('div', { className: 'warn' },
        ...problems.map((p) => React.createElement('div', { key: p, className: 'mono' }, 'refused row — ' + p))),
    // THE FILE DOOR — a copy, never a fetch
    React.createElement('div', { className: 'row' },
      React.createElement('input', {
        placeholder: '/abs/path/to/my_lora.safetensors',
        value: path,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => setPath(e.target.value),
        style: { flex: 1 },
      }),
      React.createElement('input', {
        placeholder: 'families (comma)',
        value: families,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => setFamilies(e.target.value),
        style: { width: '12rem' },
      }),
      React.createElement('button', { onClick: () => void install(), disabled: busy || path.trim() === '' },
        'Copy LoRA in')),
    React.createElement('p', { className: 'hint' },
      'A copied file enters the engine list only after a restart — the button below asks for one.'),
    React.createElement('div', { className: 'row' },
      React.createElement('button', {
        onClick: () => void postManage('restart', {}).then(refresh).catch((e: unknown) => {
          setRefusal(e instanceof Error ? e.message : String(e))
        }),
        disabled: busy,
      }, 'Restart engine')),
    refusal === null ? null : React.createElement('div', { className: 'warn' }, refusal))
}

export default LoraBlock
