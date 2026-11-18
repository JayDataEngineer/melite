var __rewriteRelativeImportExtension = (this && this.__rewriteRelativeImportExtension) || function (path, preserveJsx) {
    if (typeof path === "string" && /^\.\.?\//.test(path)) {
        return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function (m, tsx, d, ext, cm) {
            return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : (d + ext + "." + cm.toLowerCase() + "js");
        });
    }
    return path;
};
/** The frozen roster, one row per family package. Exported for
 *  the census test: the roster is judged against packages/models
 *  without mounting a single plugin (loading is loadFamilies). */
export const FAMILY_ROWS = [
    { pkg: "@melite/models-anny", id: "anny" },
    { pkg: "@melite/models-fit", id: "fit" },
    { pkg: "@melite/models-pixal3d", id: "pixal3d" },
    { pkg: "@melite/models-skin", id: "skin" },
    { pkg: "@melite/models-somax", id: "somax" },
    { pkg: "@melite/models-transfer-rig", id: "transfer-rig" },
    { pkg: "@melite/models-trellis2-native", id: "trellis2-native" },
    { pkg: "@melite/models-moss-sfx", id: "moss-sfx" },
    { pkg: "@melite/models-music3", id: "music3" },
    { pkg: "@melite/models-yue2", id: "yue2" },
    { pkg: "@melite/models-qwen3-tts", id: "qwen3-tts" },
    { pkg: "@melite/models-seed-vc", id: "seed-vc" },
    { pkg: "@melite/models-anima", id: "anima" },
    { pkg: "@melite/models-fibo2-edit", id: "fibo2-edit" },
    { pkg: "@melite/models-florence2", id: "florence2" },
    { pkg: "@melite/models-flux-klein", id: "flux-klein" },
    { pkg: "@melite/models-h3-image", id: "h3-image" },
    { pkg: "@melite/models-h3-image-edit", id: "h3-image-edit" },
    { pkg: "@melite/models-input", id: "input" },
    { pkg: "@melite/models-joycaption", id: "joycaption" },
    { pkg: "@melite/models-joytag", id: "joytag" },
    { pkg: "@melite/models-krea-2", id: "krea-2" },
    { pkg: "@melite/models-mask", id: "mask-select" },
    { pkg: "@melite/models-moss-image", id: "moss-image" },
    { pkg: "@melite/models-qwen-img-21", id: "qwen-img-21" },
    { pkg: "@melite/models-qwen-img-edit-21", id: "qwen-img-edit-21" },
    { pkg: "@melite/models-seedvr2-ema", id: "seedvr2-ema" },
    { pkg: "@melite/models-wd14", id: "wd14" },
    { pkg: "@melite/models-z-image", id: "z-image" },
    { pkg: "@melite/models-kimodo", id: "kimodo" },
    { pkg: "@melite/models-gem-soma", id: "gem-soma" },
    { pkg: "@melite/models-concat", id: "concat" },
    { pkg: "@melite/models-h3", id: "h3" },
];
/** The package specifiers in load order (derived; the rows are the
 *  source of truth). Kept for the census wall and any roster reader
 *  that only needs the pkg column. */
export const FAMILY_PKGS = FAMILY_ROWS.map((r) => r.pkg);
function message(err) {
    return err instanceof Error ? err.message : String(err);
}
/** Load every family plugin, in table order. A package that fails
 *  to load retires ALONE into the dead roster (the plugin law); a
 *  loaded DECL whose id differs from its row REFUSES the whole load
 *  (that is authoring drift, never runtime absence); zero
 *  survivors refuses (total outage — the estate install is
 *  broken, the receipt's own law). */
export async function loadFamilies() {
    const families = [];
    const dead = [];
    for (const row of FAMILY_ROWS) {
        let mod;
        try {
            mod = (await import(__rewriteRelativeImportExtension(row.pkg)));
        }
        catch (err) {
            dead.push({ pkg: row.pkg, id: row.id, error: message(err) });
            continue;
        }
        if (mod.DECL?.id !== row.id) {
            throw new Error(`family table drift: ${row.pkg} DECL.id is '${mod.DECL?.id ?? "absent"}' but its row pins '${row.id}' (fix the row or the DECL)`);
        }
        families.push(mod.family);
    }
    if (families.length === 0) {
        throw new Error(`total family outage: all ${FAMILY_ROWS.length} family packages failed to load (the install is broken, not pruned — the plugin law absences single families, never the estate)`);
    }
    return { families, dead };
}
//# sourceMappingURL=index.js.map
