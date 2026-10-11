var __rewriteRelativeImportExtension = (this && this.__rewriteRelativeImportExtension) || function (path, preserveJsx) {
    if (typeof path === "string" && /^\.\.?\//.test(path)) {
        return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function (m, tsx, d, ext, cm) {
            return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : (d + ext + "." + cm.toLowerCase() + "js");
        });
    }
    return path;
};
/** The frozen load order, one row per family package. Exported for
 *  the census test: the roster is judged against packages/models
 *  without mounting a single plugin (loading is loadFamilies). */
export const FAMILY_PKGS = [
    "@melite/models-anny",
    "@melite/models-anycreature",
    "@melite/models-fit",
    "@melite/models-mesh_refine",
    "@melite/models-pixal3d",
    "@melite/models-skin",
    "@melite/models-skintokens",
    "@melite/models-somax",
    "@melite/models-step1x_texture",
    "@melite/models-transfer_rig",
    "@melite/models-trellis2-native",
    "@melite/models-trellis_native",
    "@melite/models-ace-step",
    "@melite/models-moss",
    "@melite/models-moss-sfx",
    "@melite/models-music3",
    "@melite/models-yue2",
    "@melite/models-qwen3-tts",
    "@melite/models-qwen3-tts-voicedesign",
    "@melite/models-anima",
    "@melite/models-auto-detect",
    "@melite/models-basic_resize",
    "@melite/models-florence2",
    "@melite/models-flux-fill-dev",
    "@melite/models-flux-klein",
    "@melite/models-input",
    "@melite/models-joycaption",
    "@melite/models-joytag",
    "@melite/models-krea-2",
    "@melite/models-mask",
    "@melite/models-pixel_upscale",
    "@melite/models-qwen-img-21",
    "@melite/models-qwen-img-edit-21",
    "@melite/models-qwen-img-edit-2511",
    "@melite/models-seedvr2_ema",
    "@melite/models-wd14",
    "@melite/models-z-image",
    "@melite/models-kimodo",
    "@melite/models-dwpose",
    "@melite/models-gem_soma",
    "@melite/models-latentsync",
    "@melite/models-see-through",
    "@melite/models-stretchy-rig",
    "@melite/models-concat",
    "@melite/models-h3",
    "@melite/models-ltx-2-3",
    "@melite/models-ltx-director-distilled",
    "@melite/models-rtx-vsr",
];
/** Load every family plugin, in table order. */
export async function loadFamilies() {
    const out = [];
    for (const pkg of FAMILY_PKGS) {
        const mod = (await import(__rewriteRelativeImportExtension(pkg)));
        out.push(mod.family);
    }
    return out;
}
//# sourceMappingURL=index.js.map
