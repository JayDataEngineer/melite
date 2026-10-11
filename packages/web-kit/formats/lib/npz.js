/**
 * npz — minimal browser-side NPZ (NumPy ZIP) reader.
 *
 * NPZ files are ZIP archives whose entries are .npy arrays. NumPy's
 * np.savez_compressed (what Kimodo emits) uses DEFLATE (ZIP method 8);
 * np.savez uses stored (method 0). Both are handled here via the browser's
 * native DecompressionStream — no dependency.
 *
 * Only the subset needed for motion preview is implemented: little-endian
 * float32 / float64 arrays, 1-D through N-D. Integers / strings / big-endian
 * are rejected with a clear error.
 */
// ── ZIP signatures (little-endian on disk: 50 4b 0x 0x) ───────────────────
const CDFH_SIG = 0x02014b50; // central directory file header
// LFH_SIG isn't checked — we trust the central directory's local-header offset.
function readU16(d, o) {
    return d[o] | (d[o + 1] << 8);
}
function readU32(d, o) {
    return ((d[o] | (d[o + 1] << 8) | (d[o + 2] << 16) | (d[o + 3] << 24)) >>> 0);
}
async function inflateRaw(compressed) {
    // 'deflate-raw' = ZIP method 8 (raw DEFLATE, no zlib header/checksum).
    // Supported in Chrome 103+, Firefox 113+, Safari 16.4+ — fine for a
    // WebGL dev tool. Blob → stream → pipeThrough → arrayBuffer.
    const ds = new DecompressionStream("deflate-raw");
    const stream = new Blob([compressed]).stream().pipeThrough(ds);
    const buf = await new Response(stream).arrayBuffer();
    return new Uint8Array(buf);
}
/** Parse a single .npy file from its raw (decompressed) bytes. */
function parseNpy(bytes) {
    // Magic: \x93 N U M P Y  (6 bytes), then version major/minor, then header.
    if (bytes.length < 10 ||
        bytes[0] !== 0x93 || bytes[1] !== 0x4e || bytes[2] !== 0x55 ||
        bytes[3] !== 0x4d || bytes[4] !== 0x50 || bytes[5] !== 0x59) {
        throw new Error("Invalid .npy magic bytes");
    }
    // bytes[0..5] = magic, bytes[6] = major version, bytes[7] = minor version.
    const ver = bytes[6];
    let headerLen;
    let headerOff;
    if (ver <= 1) {
        headerLen = readU16(bytes, 8);
        headerOff = 10;
    }
    else {
        headerLen = readU32(bytes, 8);
        headerOff = 12;
    }
    const headerBytes = bytes.subarray(headerOff, headerOff + headerLen);
    const header = new TextDecoder().decode(headerBytes);
    const dataBytes = bytes.subarray(headerOff + headerLen);
    const shapeMatch = header.match(/'shape':\s*\(([^)]*)\)/);
    const dtypeMatch = header.match(/'descr':\s*'([^']+)'/);
    if (!shapeMatch || !dtypeMatch) {
        throw new Error(`Unparseable .npy header: ${header.slice(0, 120)}`);
    }
    const shape = shapeMatch[1]
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .map(Number);
    const dtype = dtypeMatch[1].trim();
    // Copy the data bytes into a fresh, 4/8-byte-aligned ArrayBuffer so the
    // typed-array view is always valid (the .npy data offset may not share
    // alignment with the enclosing NPZ buffer).
    const copy = new Uint8Array(dataBytes.length);
    copy.set(dataBytes);
    if (dtype === "<f4" || dtype === "|f4" || dtype === "=f4") {
        return { shape, data: new Float32Array(copy.buffer, 0, Math.floor(copy.length / 4)) };
    }
    if (dtype === "<f8" || dtype === "|f8" || dtype === "=f8") {
        const f64 = new Float64Array(copy.buffer, 0, Math.floor(copy.length / 8));
        return { shape, data: new Float32Array(f64) };
    }
    // int32 (lbs_indices in the SOMA skin) and int64 (faces) — needed for the
    // neutral soma skin NPZ. Uint32Array for int32 (face/idx values are
    // non-negative), BigInt64Array for int64 (face indices can exceed 2^31 in
    // large meshes; here max is 18056 so it fits, but keep the lossless path).
    if (dtype === "<i4" || dtype === "|i4" || dtype === "=i4") {
        const i32 = new Int32Array(copy.buffer, 0, Math.floor(copy.length / 4));
        return { shape, data: new Uint32Array(i32) };
    }
    if (dtype === "<i8" || dtype === "|i8" || dtype === "=i8") {
        return { shape, data: new BigInt64Array(copy.buffer, 0, Math.floor(copy.length / 8)) };
    }
    throw new Error(`Unsupported .npy dtype "${dtype}" (float32/64 + int32/64 supported)`);
}
/** Find the End-of-Central-Directory record, searching backward from EOF. */
function findEocd(bytes) {
    const min = Math.max(0, bytes.length - 22 - 65535);
    for (let i = bytes.length - 22; i >= min; i--) {
        if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b &&
            bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) {
            return i;
        }
    }
    return -1;
}
/**
 * Parse an NPZ file and return a map of array-name → {shape, data}.
 * Entry names have their `.npy` extension stripped (so `posed_joints.npy`
 * is keyed as `"posed_joints"`).
 */
export async function parseNpz(bytes) {
    const out = new Map();
    const eocd = findEocd(bytes);
    if (eocd < 0)
        throw new Error("NPZ parse failed: End-of-Central-Directory not found");
    const cdEntries = readU16(bytes, eocd + 10);
    const cdOff = readU32(bytes, eocd + 16);
    let off = cdOff;
    for (let i = 0; i < cdEntries; i++) {
        if (readU32(bytes, off) !== CDFH_SIG)
            break;
        const method = readU16(bytes, off + 10);
        const compSize = readU32(bytes, off + 20);
        const nameLen = readU16(bytes, off + 28);
        const extraLen = readU16(bytes, off + 30);
        const commentLen = readU16(bytes, off + 32);
        const localOff = readU32(bytes, off + 42);
        const name = new TextDecoder().decode(bytes.subarray(off + 46, off + 46 + nameLen));
        // Read the local file header to find the true data offset (the central
        // directory's compressed-size is authoritative; the local header's own
        // size fields can be zero when the ZIP was streamed).
        const lfhNameLen = readU16(bytes, localOff + 26);
        const lfhExtraLen = readU16(bytes, localOff + 28);
        const dataOff = localOff + 30 + lfhNameLen + lfhExtraLen;
        const compressed = bytes.subarray(dataOff, dataOff + compSize);
        let raw;
        if (method === 0) {
            raw = compressed; // stored, no compression
        }
        else if (method === 8) {
            raw = await inflateRaw(compressed);
        }
        else {
            throw new Error(`NPZ entry "${name}": unsupported compression method ${method}`);
        }
        if (name.endsWith(".npy")) {
            const key = name.slice(0, -4); // strip ".npy"
            // Skip entries with dtypes we don't handle (bool flags, int indices,
            // string arrays — Kimodo packs metadata alongside the float arrays).
            // The caller asks for specific keys (posed_joints, fps) and gets a
            // clear error if those are missing; non-float metadata is irrelevant.
            try {
                out.set(key, parseNpy(raw));
            }
            catch {
                /* unsupported dtype — skip */
            }
        }
        off += 46 + nameLen + extraLen + commentLen;
    }
    return out;
}
//# sourceMappingURL=npz.js.map