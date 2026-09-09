// The card's single-spelling data (M2′ stroke 2, 2026-09-09):
// the Schemastery schema and the authored identity. The plugin entry
// (index.ts), the tool face (tool.ts), and the gateway projection all
// derive from THIS module — never a second spelling.
import z from '@deepseek-ai/schemastery'

export const schema = z.object({
  // THE ESTATE-FILE CONTRACT (the upscale-tools precedent): a
  // file-typed param must EXIST at compose time — absolute path
  // expected. A $spell ("$body") names a WIRED STAGE INPUT, never a
  // file: rides verbatim, the runtime rewrites it against the wired
  // input. Compile-time, never inference-time.
  body: z.string().description(
    'Body mesh — absolute GLB/GLTF/FBX/OBJ path, or a $spell naming the wired upstream stage input'
  ).extra('extra', { required: true }),
  garment: z.string().description(
    'Garment mesh — absolute GLB/GLTF/FBX/OBJ path, or a $spell naming the wired upstream stage input'
  ).extra('extra', { required: true }),
  out_path: z.string().description(
    'Absolute path the placed scene GLB is written to (caller-staged under the run scratch)'
  ).extra('extra', { required: true }),
  position_x: z.number().default(0).description('Garment offset X from the placement base'),
  position_y: z.number().default(0).description('Garment offset Y from the placement base'),
  position_z: z.number().default(0).description('Garment offset Z from the placement base'),
  rotation_x: z.number().default(0).description('Garment rotation degrees about X'),
  rotation_y: z.number().default(0).description('Garment rotation degrees about Y'),
  rotation_z: z.number().default(0).description('Garment rotation degrees about Z'),
  // RANGE RULE: whoever owns the default owns the floor.
  scale: z.number().min(0.01).default(1).description('Uniform garment scale'),
  snap_to: z.string().default('').description(
    'Object or armature-bone name to place relative to (default: the body root)'),
  mirror_x: z.boolean().default(false).description('Mirror the garment across X (symmetry)'),
  mcp_addr: z.string().default('').description(
    'Session host:port override (default: MELITE_BLENDER_MCP_ADDR, else 127.0.0.1:9876)'),
  autoboot: z.boolean().default(true).description(
    'Boot a headless session when none listens (false = human-synced session only)'),
  timeout: z.number().min(10).step(1).default(300).description(
    'Seconds for the session to answer'),
})

export const identity = {
  label: 'Clothing Placement',
  description:
    'Place a garment mesh on a body mesh in a persistent Blender session (MCP) - snap, offset, rotate, scale, mirror; exports the placed scene GLB.',
  genre: '3d',
} as const
