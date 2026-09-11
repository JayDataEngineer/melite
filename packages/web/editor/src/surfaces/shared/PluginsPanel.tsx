// PluginsPanel — the Plugins inventory (the HTTP register surface, §6
// item 4). ONE list, ONE toggle: every mounted plugin with its lanes and
// its enabled state. The toggle is the reversible unregister — POST
// /v1/packages/:id/enabled rides the SAME seam as the agent's
// plugin_set_enabled tool (register_action.ts); the effect is LIVE (no
// restart), so a disabled plugin's cards/models/flows vanish from
// the loaders immediately and re-register the moment it flips back.
//
// First-party chrome, but it rides the SAME seams a plugin shell would:
// the rail foot entry (activity.foot) is a registration in
// shell/activityEntries.tsx — not a hardcoded icon in ActivityBar.
import { useCallback, useEffect, useState } from "react"
import { Modal } from "@deepseek-ai/dsh-client-ui-primitives"
import { X } from "lucide-react"
import css from "./PluginsPanel.modal.module.css"
import { Badge } from "@melite/ui/badge"
import { Loader2, Palette, Puzzle, RefreshCw, Zap } from "lucide-react"
import { editorClient } from "@/rpc/editorClient"
import type { PluginRow } from "@melite/contracts"
 "@/shell/pluginShell"
 "@/surfaces/flow/pluginKinds"
 "@/shell/pluginUi"
// Themes lane (§16): the picker lives here — the Plugins panel is the
// plugin-data settings surface (the old settings gear was removed
// 2026-08-13; this panel owns every plugin-served preference).
import { useOptionalThemePicker, themeKey } from "@/shell/themeProvider"
 "@melite/ui"
import { cn } from "@melite/ui"

/**
 * The theme picker (themes lane, §16): Default (the built-in palettes,
 * byte-identical) + every theme the ENABLED plugins serve. Selection is
 * client-side (localStorage `melite:theme`) and applies LIVE as inline CSS
 * vars on :root. Hidden when no plugin ships a theme — an empty lane is
 * not a control.
 */
function ThemeSection() {
  const picker = useOptionalThemePicker()
  if (!picker) return null // no provider above (isolated embeds/tests)
  const { themes, selected, select } = picker
  if (!themes || themes.length === 0) return null
  const active = themes.find((t) => themeKey(t) === selected) ?? null
  return (
    <div className="flex items-center gap-3 rounded-md border border-border/50 bg-background/40 px-3 py-2">
      <Palette className="h-3.5 w-3.5 shrink-0 text-brand/70" />
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-medium text-foreground">Theme</div>
        <div className="mt-0.5 text-[10px] text-muted-foreground">
          {active?.description ?? "Served by plugins — applies live, saved locally."}
        </div>
      </div>
      <select
        data-testid="theme-select"
        aria-label="theme"
        value={selected}
        onChange={(e) => select(e.target.value)}
        className="max-w-[55%] shrink-0 rounded border border-sidebar-border/60 bg-background/60 px-1.5 py-0.5 text-[11px] text-foreground outline-none focus:border-brand/60"
      >
        <option value="">Default</option>
        {themes.map((t) => (
          <option key={themeKey(t)} value={themeKey(t)}>
            {t.label} · {t.plugin}
            {t.dark ? " (dark)" : ""}
          </option>
        ))}
      </select>
    </div>
  )
}

/**
 * One plugin row: identity + lanes + the enable toggle. melite-core carries
 * the whole core catalog — disabling it is legal (honest inventory) but
 * destructive, so its row warns instead of looking casual.
 */
function PluginRowView({
  plugin,
}: {
  plugin: PluginRow
}) {
  const isCore = plugin.id === "melite-core"
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border border-border/50 bg-background/40 px-3 py-2",
        !plugin.enabled && "opacity-55",
      )}
      data-testid={`plugin-row-${plugin.id}`}
    >
      <Puzzle className="h-3.5 w-3.5 shrink-0 text-brand/70" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[12px] font-medium text-foreground">
            {plugin.name}
          </span>
          <span className="rounded bg-sidebar/60 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
            {plugin.id}@{plugin.version}
          </span>
          {isCore && (
            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] text-amber-300">
              core catalog — disabling empties the editor
            </span>
          )}
          {!!plugin.hooks && (
            <span
              title={plugin.hooks + " run.complete webhook(s) — hooks.yaml"}
              className="flex items-center gap-0.5 rounded bg-sky-500/15 px-1.5 py-0.5 text-[9px] text-sky-300"
            >
              <Zap className="h-2.5 w-2.5" />
              {plugin.hooks}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="truncate font-mono">{plugin.root}</span>
          {plugin.lanes.length > 0 && <span>·</span>}
          {plugin.lanes.map((lane) => (
            <Badge key={lane} variant="outline" className="h-4 px-1.5 text-[9px]">
              {lane}
            </Badge>
          ))}
        </div>
      </div>
      <span
        className={cn(
          "shrink-0 rounded px-1.5 py-0.5 text-[9px]",
          plugin.enabled ? "bg-brand/20 text-brand" : "bg-sidebar text-muted-foreground",
        )}
      >
        {plugin.enabled ? "on" : "off"}
      </span>
    </div>
  )
}

/** The inventory dialog. Loads on open; read-only. */
export function PluginsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [rows, setRows] = useState<PluginRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    setRows(null)
    try {
      setRows(await editorClient.listPlugins())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    if (open) void load()
  }, [open, load])


  // S4f Modal stroke: the chrome rides the headless DSH Modal (mask +
  // body portal + Esc + card + aria-label). Headless — not the text
  // header — because this header is rich (icon + live enabled-count +
  // refresh control); restructuring it into the string-only DSH title
  // would shuffle controls for zero gain. The kit Dialog's built-in X
  // disappears with its chrome, so the header owns an inline X (same
  // row as refresh — no absolute overlap). Mask/Esc dismissals map to
  // onClose exactly as the kit onOpenChange did.
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Plugins"
      headless
      className={css.card}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Puzzle className="h-4 w-4 text-brand/70" />
          Plugins
          {rows && (
            <span className="text-[10px] font-normal text-muted-foreground">
              {rows.filter((r) => r.enabled).length}/{rows.length} enabled
            </span>
          )}
          <button
            type="button"
            aria-label="refresh plugins"
            className="ml-auto"
            onClick={() => void load()}
          >
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </button>
          <button
            type="button"
            aria-label="Close plugins dialog"
            className="rounded p-0.5 text-muted-foreground/70 transition-colors hover:text-foreground"
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        {error && (
          <p className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
            {error}
          </p>
        )}
        <ThemeSection />
        {!rows && !error && (
          <div className="flex items-center gap-2 px-1 py-6 text-[11px] text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading inventory…
          </div>
        )}
        {rows && (
          <div className="space-y-1.5">
            {rows.map((p) => (
              <PluginRowView key={p.id} plugin={p} />
            ))}
          </div>
        )}
        <p className="px-1 text-[10px] leading-relaxed text-muted-foreground">
          Read-only inventory — plugins register at boot. Drop new
          plugins in <span className="font-mono">packages/</span> or list
          out-of-tree dirs in <span className="font-mono">MELITE_PLUGIN_PATHS</span>.
        </p>
      </div>
    </Modal>
  )
}
