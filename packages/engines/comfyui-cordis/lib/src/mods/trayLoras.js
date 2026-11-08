import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { loadEndpointConfig } from "../comfyui-config.js";
import { LORA_EXTENSIONS, resolveEngineLorasDir } from "../userLoras.js";
export const inject = ['comfyui'];
/** The tray's own rows for a loras dir: one row per weights file
 * under a FAMILY dir. A root-level weights file names no family and
 * is skipped (a row rides a model); non-weights files are skipped
 * (README, part files, dotfiles). PURE — the caller owns the
 * registration and the dedup.
 * @param dir the engine's own loras dir (resolveEngineLorasDir's value) */
export function trayLoraRows(dir) {
    let families = [];
    try {
        families = readdirSync(dir);
    }
    catch {
        return []; // no tray dir — nothing to serve (the caller logs)
    }
    const rows = [];
    for (const fam of families.sort()) {
        const famDir = join(dir, fam);
        let isDir = false;
        try {
            isDir = statSync(famDir).isDirectory();
        }
        catch {
            continue; // unreadable or broken — nothing to serve from it
        }
        if (!isDir)
            continue;
        let files = [];
        try {
            files = readdirSync(famDir);
        }
        catch {
            continue;
        }
        for (const name of files.sort()) {
            if (name.startsWith('.'))
                continue; // part files and dotfiles never serve
            if (!LORA_EXTENSIONS.includes(name.slice(name.lastIndexOf('.')).toLowerCase()))
                continue;
            const stem = name.slice(0, name.lastIndexOf('.'));
            if (stem === '')
                continue;
            rows.push({
                id: stem,
                filename: `${fam}/${name}`,
                families: [fam],
                label: stem,
                category: 'tray',
                default_strength: 0.8,
                tooltip: 'operator tray — dropped into the engine\'s own loras dir; no upstream link recorded',
            });
        }
    }
    return rows;
}
export function apply(ctx) {
    let cfg = {};
    try {
        cfg = loadEndpointConfig();
    }
    catch {
        // the endpoint file's parse law belongs to its readers — the
        // tray stands down, never guesses a dir
        return;
    }
    const dir = resolveEngineLorasDir(cfg);
    if (dir === null)
        return; // undeclared tray — the door's own law
    // THE BOARDING SET (the interlock law): only families that already
    // carry a loras flavor — the static family flavors and the loras
    // seeds composed before this module.
    const boarding = new Set(ctx.comfyui.lorasBoardingFamilies());
    const known = ctx.comfyui.lorasKnownFilenames();
    const all = trayLoraRows(dir);
    const rows = all.filter((r) => boarding.has(r.families[0] ?? '') && !known.has(r.filename));
    const skippedFamily = new Set(all.filter((r) => !boarding.has(r.families[0] ?? '')).map((r) => r.families[0] ?? ''));
    if (skippedFamily.size > 0) {
        ctx.logger('tray-loras').info('skipped (no loras boarding): ' + [...skippedFamily].sort().join(', '));
    }
    if (rows.length === 0)
        return;
    const families = [...new Set(rows.map((r) => r.families[0] ?? ''))].sort();
    ctx.effect(() => ctx.comfyui.registerFlavor({ pack: 'loras', families, rows }));
    ctx.logger('tray-loras').info(rows.length + ' tray row(s) served from ' + dir);
}
//# sourceMappingURL=trayLoras.js.map
