/**
 * glbSummary — the 3D artifact's STRUCTURAL summary, read from bytes.
 *
 * WHY IT EXISTS (the operator's 2026-09-26 order, paraphrased: 3d output
 * must be reachable from the media doors, visually"): `melite_view`'s image /
 * film / audio arms all end in an IMAGE the model can see. A `.glb` has
 * no raster, so before the 3D lanes emitted a poster the agent's only
 * honest observation of a mesh was a refusal that said nothing about
 * the artifact. This parser is what makes the door say something true:
 * it is the same glTF JSON chunk the viewer parses, read as DATA.
 *
 * THE CONTAINER WALK: a GLB is a 12-byte header (`glTF`, version, total
 * length) then length-prefixed chunks — JSON (0x4E4F534A) and BIN
 * (0x004E4942). Only the JSON chunk is read; the BIN chunk is skipped by
 * its declared length, never by seeking for a magic. A bare `.gltf` is
 * the same JSON without the wrapper, so one core serves both.
 *
 * THE CONTAINMENT + CAP LAWS are the caller's (the run walk builds the
 * path from its own root + runId + name); this module never sees a
 * caller-supplied path.
 */
/** One number triple / count set — the fields a caller reports. */
export interface MeshSummary {
    /** The artifact name (echoed for the refusal voice). */
    file: string;
    /** Byte length as read. */
    size_bytes: number;
    /** glTF version (GLB header), when the container carried one. */
    version?: number;
    /** The generator string, when present. */
    generator?: string;
    /** Mesh / primitive / material / texture / image counts. */
    meshes: number;
    primitives: number;
    materials: number;
    textures: number;
    images: number;
    /** Summed POSITION accessor counts across every primitive. */
    vertices: number;
    /** Triangle count (indexed count / 3, else positions / 3). */
    triangles: number;
    /** Whether any primitive carries a TEXCOORD_0 (a textured mesh). */
    textured: boolean;
    /** Union of POSITION accessor min/max, when the accessors declare it. */
    bounds?: {
        min: [number, number, number];
        max: [number, number, number];
    };
    /** True when the bytes were a JSON `.gltf` rather than a GLB. */
    gltf_json?: boolean;
}
/** Summarize a mesh artifact's bytes. Throws on a non-mesh container. */
export declare function summarizeMesh(data: Uint8Array, file: string): MeshSummary;
/** The one-line voice the agent reads when the mesh has no raster. */
export declare function meshVoice(s: MeshSummary): string;
//# sourceMappingURL=glbSummary.d.ts.map
