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
export type NpyData = Float32Array | Int32Array | BigInt64Array | Uint32Array;
export interface NpyArray {
    shape: number[];
    data: NpyData;
}
/**
 * Parse an NPZ file and return a map of array-name → {shape, data}.
 * Entry names have their `.npy` extension stripped (so `posed_joints.npy`
 * is keyed as `"posed_joints"`).
 */
export declare function parseNpz(bytes: Uint8Array): Promise<Map<string, NpyArray>>;
//# sourceMappingURL=npz.d.ts.map