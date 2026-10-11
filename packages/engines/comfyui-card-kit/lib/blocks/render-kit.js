/** The text-encode pair: CLIPLoader + VAELoader from lane rows.
 *  Returns OUTPUT HANDLES (never NodeRefs — a ref in an inputs bag
 *  serializes as a scalar and the wall goes red). */
export function loadTextPair(g, li) {
    // (2026-09-08: the `as JsonValue` casts — lane rows are honestly
    // unknown-typed; the node inputs bag needs JsonValue. The cast is
    // type-level only; whatever the row carries rides unchanged.)
    const clip = g.node('CLIPLoader', { clip_name: li.text_encoder, type: li.clip_type }).out();
    const vae = g.node('VAELoader', { vae_name: li.vae }).out();
    return { clip, vae };
}
/** The image-lane tail: VAEDecode + SaveImage under the prefix.
 *  Returns the SaveImage NODE REF (terminal — no downstream wire):
 *  callers take `.out()` off it (kit.ts imageT2I) or discard it.
 *  (2026-09-08: the declared return was OutputHandle, which the
 *  implementation never returned — a NodeRef. OutputHandle has no
 *  .out() method, so "fixing" the implementation to match the
 *  declaration would crash kit.ts:88 at runtime; the declaration
 *  now names the truth. Type-level only; runtime-identical.) */
export function decodeSave(g, sampled, vae, filenamePrefix) {
    const decoded = g.node('VAEDecode', { samples: sampled, vae });
    return g.node('SaveImage', { images: decoded.out(), filename_prefix: filenamePrefix });
}
/** The lora chain (empty picks → the bare unet, byte-stable).
 *  Every link returns an OUTPUT HANDLE — a NodeRef left in the
 *  chain serializes as {"id": ...} and the wall goes red (caught
 *  live: empty-pick lanes never reached the bug). */
export function stackLoras(g, unet, picks) {
    let cur = unet;
    for (const p of picks) {
        cur = g.node('LoraLoaderModelOnly', { lora_name: p.name, strength_model: p.strength, model: cur }).out();
    }
    return cur;
}
/** The controlnet chain (the z-image restoration: empty picks →
 *  the bare model, byte-stable). Every link loads the union patch
 *  and wraps the running model in ZImageFunControlnet — the live
 *  ComfyUI nodes (ModelPatchLoader + comfy_extras'
 *  ZImageFunControlnet), array order = apply order. The conditioning
 *  source rides LoadImage exactly like the image-edit lane's slots
 *  (staged at submit by the upload walk — paths, estate asset URLs,
 *  and data URLs all stage there, never here). A pick whose still
 *  channel is empty (002 H2: clip/mask-only, a video-valued
 *  entry) refuses here — this lane serves STILL sources only, and
 *  a silent wrong run (LoadImage of "") is the one thing it never
 *  does.
 *
 *  THE SEAM (the packs.ts lanpaint precedent): the node pair is
 *  z-image's — a second controlnet family re-opens the node-selection
 *  seam here, never a silent node swap. */
export function stackControlNets(g, model, vae, 
// clip/mask are the upstream row vocabulary this still-only lane
// refuses loud — declared so a clip/mask-only pick is expressible
// and the refusal proof in tests/controlnet.spec.ts typechecks.
picks) {
    let cur = model;
    for (const p of picks) {
        if (p.image === "") {
            throw new Error(`controlnet '${p.type}' carries no still-image source (clip/mask only) — the ZImageFunControlnet lane conditions on a still image; a video- or mask-valued entry needs a family whose lane declares it`);
        }
        const image = g.node('LoadImage', { image: p.image, upload: 'image' }).out(0);
        const patch = g.node('ModelPatchLoader', { name: p.model }).out();
        cur = g.node('ZImageFunControlnet', {
            model: cur,
            model_patch: patch,
            vae,
            strength: p.strength,
            image,
        }).out();
    }
    return cur;
}
//# sourceMappingURL=render-kit.js.map
