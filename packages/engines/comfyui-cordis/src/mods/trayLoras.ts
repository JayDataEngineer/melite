// src/mods/trayLoras.ts — THE TRAY (operator 2026-11-04: "I want the
// functionality of adding random loras I found online, providing it
// to the agent, and then having it appear under loras mod with the
// right name, to just work"): a LoRA dropped into the engine's own
// loras dir serves as a picker row with NO rows file, no profile
// edit, no per-file blessing. The dir names the family
// (loras/krea-2/X.safetensors → the krea-2 picker), the filename is
// the right name, and the file's PRESENCE is the row's truth — the
// presence is what the engine's own lora list already serves, so the
// picker and the engine can never disagree about what exists.
//
// THE LAWS THIS KEEPS (nothing is relitigated):
// - NOTHING is fetched (the mods fate): the tray only ever SERVES
//   what is already on disk; a tray row carries no source_url
//   because the drop has none — the file is its own provenance.
// - DECLARED ROWS WIN: the tray registers LAST (composeModPlane
//   composes family flavors and the user rows file first) and skips
//   every filename a registered loras flavor already names, so a
//   static row's label/category/strength never get shadowed and the
//   flavor merge's first-wins law never even engages.
// - A FLAVOR RIDES A BOARDING FAMILY (the mod-interlock law): the
//   tray only registers families that already carry a loras flavor
//   — a dir naming no boarding family serves nothing and is logged,
//   never registered (an unboarded flavor is drift the boot gate
//   refuses).
// - THE LEAF STILL REFUSES HAND-TYPED NAMES: a tray row is a real
//   picker row (id/label/filename), never a typed string.
import type { Context } from '@deepseek-ai/cordis'
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { loadEndpointConfig } from '../comfyui-config.ts'
import { LORA_EXTENSIONS, resolveEngineLorasDir, type UserLoraRow } from '../userLoras.ts'
// the ctx.comfyui augmentation rides the service module:
import type { ComfyUIServiceFace } from '@melite/comfyui-card-kit/service-faces'

export const inject = ['comfyui']


/** The tray's own rows for a loras dir: one row per weights file
 * under a FAMILY dir. A root-level weights file names no family and
 * is skipped (a row rides a model); non-weights files are skipped
 * (README, part files, dotfiles). PURE — the caller owns the
 * registration and the dedup.
 * @param dir the engine's own loras dir (resolveEngineLorasDir's value) */
export function trayLoraRows(dir: string): UserLoraRow[] {
  let families: string[] = []
  try {
    families = readdirSync(dir)
  } catch {
    return [] // no tray dir — nothing to serve (the caller logs)
  }
  const rows: UserLoraRow[] = []
  for (const fam of families.sort()) {
    const famDir = join(dir, fam)
    let isDir = false
    try {
      isDir = statSync(famDir).isDirectory()
    } catch {
      continue // unreadable or broken — nothing to serve from it
    }
    if (!isDir) continue
    let files: string[] = []
    try {
      files = readdirSync(famDir)
    // an unreadable family dir serves nothing from it — the rest of the tray still lists
    } catch {
      continue
    }
    for (const name of files.sort()) {
      if (name.startsWith('.')) continue // part files and dotfiles never serve
      if (!LORA_EXTENSIONS.includes(name.slice(name.lastIndexOf('.')).toLowerCase())) continue
      const stem = name.slice(0, name.lastIndexOf('.'))
      if (stem === '') continue
      rows.push({
        id: stem,
        filename: `${fam}/${name}`,
        families: [fam],
        label: stem,
        category: 'tray',
        default_strength: 0.8,
        tooltip: 'operator tray — dropped into the engine\'s own loras dir; no upstream link recorded',
      })
    }
  }
  return rows
}

export function apply(ctx: Context): void {
  let cfg: Record<string, unknown> = {}
  try {
    cfg = loadEndpointConfig()
  } catch {
    // the endpoint file's parse law belongs to its readers — the
    // tray stands down, never guesses a dir
    return
  }
  const dir = resolveEngineLorasDir(cfg)
  if (dir === null) return // undeclared tray — the door's own law
  // THE BOARDING SET (the interlock law): only families that already
  // carry a loras flavor — the static family flavors and the loras
  // seeds composed before this module.
  const boarding = new Set<string>(ctx.comfyui.lorasBoardingFamilies())
  const known = ctx.comfyui.lorasKnownFilenames()
  const all = trayLoraRows(dir)
  const rows = all.filter((r) => boarding.has(r.families[0] ?? '') && !known.has(r.filename))
  const skippedFamily = new Set(
    all.filter((r) => !boarding.has(r.families[0] ?? '')).map((r) => r.families[0] ?? ''),
  )
  if (skippedFamily.size > 0) {
    ctx.logger('tray-loras').info(
      'skipped (no loras boarding): ' + [...skippedFamily].sort().join(', '),
    )
  }
  if (rows.length === 0) return
  const families = [...new Set(rows.map((r) => r.families[0] ?? ''))].sort()
  ctx.effect(() => ctx.comfyui.registerFlavor({ pack: 'loras', families, rows }))
  ctx.logger('tray-loras').info(rows.length + ' tray row(s) served from ' + dir)
}
