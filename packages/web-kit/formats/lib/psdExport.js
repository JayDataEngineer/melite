// ─── Big-endian byte writer ──────────────────────────────────────────────────
class ByteWriter {
    chunks = [];
    view = new DataView(new ArrayBuffer(8));
    u8(v) {
        const b = new Uint8Array(1);
        b[0] = v & 0xff;
        this.chunks.push(b);
    }
    u16(v) {
        const dv = new DataView(new ArrayBuffer(2));
        dv.setUint16(0, v, false);
        this.chunks.push(new Uint8Array(dv.buffer));
    }
    /** signed 16 */
    i16(v) {
        const dv = new DataView(new ArrayBuffer(2));
        dv.setInt16(0, v, false);
        this.chunks.push(new Uint8Array(dv.buffer));
    }
    u32(v) {
        const dv = new DataView(new ArrayBuffer(4));
        dv.setUint32(0, v >>> 0, false);
        this.chunks.push(new Uint8Array(dv.buffer));
    }
    /** signed 32 */
    i32(v) {
        const dv = new DataView(new ArrayBuffer(4));
        dv.setInt32(0, v | 0, false);
        this.chunks.push(new Uint8Array(dv.buffer));
    }
    bytes(b) { this.chunks.push(b); }
    ascii(s) {
        const b = new Uint8Array(s.length);
        for (let i = 0; i < s.length; i++)
            b[i] = s.charCodeAt(i) & 0xff;
        this.chunks.push(b);
    }
    size() { return this.chunks.reduce((n, c) => n + c.length, 0); }
    toUint8() {
        const out = new Uint8Array(this.size());
        let off = 0;
        for (const c of this.chunks) {
            out.set(c, off);
            off += c.length;
        }
        return out;
    }
}
function loadImageData(dataUrl, w, h) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const c = document.createElement('canvas');
            c.width = w;
            c.height = h;
            const ctx = c.getContext('2d');
            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            resolve(ctx.getImageData(0, 0, w, h).data);
        };
        img.onerror = () => reject(new Error('Failed to decode layer for PSD'));
        img.src = dataUrl;
    });
}
/** Map our BlendMode to a PSD 4-char blend key. Unsupported → 'norm'. */
function blendKey(mode) {
    const map = {
        normal: 'norm',
        multiply: 'mul ',
        screen: 'scrn',
        overlay: 'over',
        darken: 'dark',
        lighten: 'lite',
        'color-dodge': 'd dg',
        'color-burn': 'div ',
        'hard-light': 'hLit',
        'soft-light': 'sLit',
        difference: 'diff',
        exclusion: 'smud',
        hue: 'hue ',
        saturation: 'sat ',
        color: 'colr',
        luminosity: 'lum ',
    };
    return map[mode] ?? 'norm';
}
/** Pad a byte count up to an even number (PSD sections must be even-length).
 *  Armor: every record component is a multiple of 2 bytes by construction
 *  (u16/i16 ×2, i32/u32/ascii-4 ×4, opacity/clip/flags/filler ×4, extra =
 *  8 + 4k via the mod-4 name pad, channel blocks = 4×(2+P)), so both call
 *  sites always pass even lengths and the +1 arm never fires — the padding
 *  stays as defense-in-depth for future layout edits (proven 2026-09-12). */
/* v8 ignore next -- even() odd arm: inputs always even (see proof above) (2026-09-12) */
function even(n) { return n % 2 === 0 ? n : n + 1; }
/**
 * Build a layered PSD Blob. `width`/`height` define the canvas; every layer is
 * composited into that extent. The merged composite flattens visible layers.
 */
export async function buildPsd(layers, width, height, mergedRgba) {
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    // Decode all layers into RGBA planes.
    const decoded = [];
    for (const l of layers) {
        if (!l.dataUrl)
            continue;
        try {
            const rgba = await loadImageData(l.dataUrl, w, h);
            decoded.push({ name: l.name, width: w, height: h, rgba, blendMode: l.blendMode, opacity: l.opacity, visible: l.visible });
        }
        catch (err) {
            console.warn('[psd] skipping undecodable layer:', l.name, err);
        }
    }
    // Merged composite (flattened visible layers) for the Image Data section.
    let merged = mergedRgba;
    if (!merged) {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        for (const l of decoded) {
            if (!l.visible)
                continue;
            ctx.globalAlpha = l.opacity;
            ctx.globalCompositeOperation = l.blendMode === 'normal' ? 'source-over' : l.blendMode;
            const lc = document.createElement('canvas');
            lc.width = w;
            lc.height = h;
            lc.getContext('2d').putImageData(new ImageData(l.rgba.slice(), w, h), 0, 0);
            ctx.drawImage(lc, 0, 0);
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        merged = ctx.getImageData(0, 0, w, h).data;
    }
    // ─── Build layer records + channel image data ───
    // Per layer channels: 0=R, 1=G, 2=B, -1=transparency.
    const CHANNEL_IDS = [0, 1, 2, -1];
    const numChannels = CHANNEL_IDS.length;
    const records = new ByteWriter();
    const channelData = new ByteWriter();
    // Channel plane size = w*h bytes (raw, +2 for compression type).
    const planeSize = w * h;
    for (const layer of decoded) {
        // Split RGBA into planes.
        const planes = {
            0: new Uint8Array(planeSize),
            1: new Uint8Array(planeSize),
            2: new Uint8Array(planeSize),
            [-1]: new Uint8Array(planeSize),
        };
        for (let i = 0; i < planeSize; i++) {
            planes[0][i] = layer.rgba[i * 4];
            planes[1][i] = layer.rgba[i * 4 + 1];
            planes[2][i] = layer.rgba[i * 4 + 2];
            planes[-1][i] = layer.rgba[i * 4 + 3];
        }
        // ── Layer record ──
        records.i32(0); // top
        records.i32(0); // left
        records.i32(h); // bottom
        records.i32(w); // right
        records.u16(numChannels); // channel count
        for (const id of CHANNEL_IDS) {
            records.i16(id); // channel id
            records.u32(2 + planeSize); // channel data length (compression + raw)
        }
        records.ascii('8BIM'); // blend mode signature
        records.ascii(blendKey(layer.blendMode)); // blend key (4 chars)
        records.u8(Math.round(layer.opacity * 255)); // opacity
        records.u8(0); // clipping (base)
        const flags = layer.visible ? 0b00000000 : 0b00000010; // bit1 set = hidden
        records.u8(flags); // flags
        records.u8(0); // filler
        // ── Extra data: mask(0) + blending ranges(0) + name ──
        const extra = new ByteWriter();
        extra.u32(0); // mask data length
        extra.u32(0); // blending ranges length
        // Pascal string name, padded to multiple of 4 (including length byte).
        const nameBytes = new TextEncoder().encode(layer.name.slice(0, 255));
        const nameBuf = new ByteWriter();
        nameBuf.u8(nameBytes.length);
        nameBuf.bytes(nameBytes);
        const nameLen = nameBuf.size();
        const pad = (4 - (nameLen % 4)) % 4;
        nameBuf.bytes(new Uint8Array(pad));
        extra.bytes(nameBuf.toUint8());
        const extraBytes = extra.toUint8();
        records.u32(extraBytes.length);
        records.bytes(extraBytes);
        // ── Channel image data for this layer ──
        for (const id of CHANNEL_IDS) {
            channelData.u16(0); // compression: raw
            channelData.bytes(planes[id]);
        }
    }
    // Layer count (signed; negative ⇒ first alpha = merged transparency).
    // We use positive count.
    const layerInfoBody = new ByteWriter();
    layerInfoBody.i16(decoded.length);
    layerInfoBody.bytes(records.toUint8());
    layerInfoBody.bytes(channelData.toUint8());
    const layerInfoBytes = layerInfoBody.toUint8();
    // Layer info section: 4-byte length (even-padded) + body.
    const layerInfoPadded = even(layerInfoBytes.length);
    const layerSection = new ByteWriter();
    layerSection.u32(layerInfoPadded);
    layerSection.bytes(layerInfoBytes);
    /* v8 ignore next -- layer-info pad bytes: layerInfoBytes.length is always
       even (2 + per-layer evens — see even() proof), so the body never runs (2026-09-12) */
    if (layerInfoPadded > layerInfoBytes.length) {
        layerSection.bytes(new Uint8Array(layerInfoPadded - layerInfoBytes.length));
    }
    // Layer and Mask Information: 4-byte length + layer section.
    const layerMaskBytes = layerSection.toUint8();
    const layerMaskPadded = even(layerMaskBytes.length);
    // ─── Merged image data: 3 RGB planes (raw) ───
    const mergedPlanes = [
        new Uint8Array(planeSize),
        new Uint8Array(planeSize),
        new Uint8Array(planeSize),
    ];
    for (let i = 0; i < planeSize; i++) {
        mergedPlanes[0][i] = merged[i * 4];
        mergedPlanes[1][i] = merged[i * 4 + 1];
        mergedPlanes[2][i] = merged[i * 4 + 2];
    }
    const imageData = new ByteWriter();
    imageData.u16(0); // compression: raw
    for (const p of mergedPlanes)
        imageData.bytes(p);
    // ─── Assemble file ───
    const out = new ByteWriter();
    // Header
    out.ascii('8BPS'); // signature
    out.u16(1); // version
    out.bytes(new Uint8Array(6)); // reserved
    out.u16(3); // channels (RGB)
    out.u32(h); // height
    out.u32(w); // width
    out.u16(8); // depth
    out.u16(3); // color mode (RGB)
    // Color mode data
    out.u32(0);
    // Image resources
    out.u32(0);
    // Layer and mask information
    out.u32(layerMaskPadded);
    out.bytes(layerMaskBytes);
    /* v8 ignore next -- layer-mask pad bytes: 4 + even is always even (see
       even() proof), so the body never runs (2026-09-12) */
    if (layerMaskPadded > layerMaskBytes.length) {
        out.bytes(new Uint8Array(layerMaskPadded - layerMaskBytes.length));
    }
    // Image data
    out.bytes(imageData.toUint8());
    return new Blob([out.toUint8()], { type: 'image/vnd.adobe.photoshop' });
}
/** Trigger a browser download for a Blob. */
export function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
//# sourceMappingURL=psdExport.js.map