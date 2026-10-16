/** poseCodec — the PURE codec half of the old lib/text-to-pose:
 * byte/b64 codecs + the SOMA-77 bone topology. Fetch-free by law —
 * the fetch-based off-main-thread decode stays app-side (lib/text-to-pose.ts). */
/** Canonical SOMA-77 mesh vertex count.
 *
 *  The LBS skinning weights are keyed to this exact vertex topology, so every
 *  shaped mesh — anny, mhr, soma, custom GLB — must have exactly this many
 *  vertices. The backend echoes the actual count via PoseMotion.vertex_count;
 *  this constant is the fallback for old responses that don't include it and
 *  the source of truth for UI prompts (CustomMeshLoader, etc.).
 */
export declare const SOMA_VERTEX_COUNT = 18056;
export declare const SOMA77_BONE_CONNECTIONS: [number, number][];
/** Encode a Uint8Array to a base64 string.
 *
 *  Processes the input in 32KB chunks because String.fromCharCode.apply has
 *  a ~65K argument limit on some engines (the historical V8 stack-arg limit).
 *  Uses Array.from() rather than the brittle `as unknown as number[]` cast. */
export declare function encodeBufferToB64(bytes: Uint8Array): string;
//# sourceMappingURL=poseCodec.d.ts.map
