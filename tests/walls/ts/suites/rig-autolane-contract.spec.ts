/** rig-autolane-contract.spec.ts — THE RIG AUTO-LANE CONTRACT (the
 *  seat-the-desk burn, 2026-11: the rig auto lane weighted a seated
 *  figure fused with its desk and chair, then the old writer's
 *  ``scenes[0]["nodes"] = [armature, mesh]`` orphaned every other
 *  node in the user's live Godot asset).
 *
 *  The law: the auto lane rigs a STANDING humanoid in rest pose and
 *  nothing else. The stdlib judge (vendor pack ``rig_preflight.py``)
 *  reads the body plan — roles, facing, the standing gates — and the
 *  executor refuses any non-standing source with MEASURED numbers
 *  before a vertex moves. A Z-up scene converts wholesale; worn parts
 *  world-bake and re-seat as identity scene roots; static props pass
 *  through untouched; the scene root list only ever grows.
 *
 *  Canon axes: ACCURACY (each arm judges one invariant on its own
 *  firing path), COVERAGE (judge verdicts + executor doors + node
 *  voice + live behavioral parity), ENFORCEMENT (the venv parity arm
 *  reds on a toggled gate — the receipt records the toggles),
 *  DEPTH (the arms ride the real pack files and spawn the real CLI).
 *
 *  CI note: the judge arms run on bare python (rig_preflight is
 *  stdlib-only); the executor parity arm stands down without the
 *  engine venv (pack-parity-kimodo precedent). */
import { describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pythonBin } from "../lib/python-bin";

const ROOT = join(__dirname, "../../../../");
const PACK = join(ROOT, "vendor/comfyui_extensions/melite-autorig-nodes");
const VENV_PYTHON = "/home/user/tools/comfyui/.venv/bin/python";

const pack = (name: string): string => readFileSync(join(PACK, name), "utf8");

/** One axis-aligned box as a subdivided hollow shell (n=6: the judge's
 *  column walk samples raw vertices per 5%-height slab, so the shell needs
 *  vertex rows finer than two slab heights). */
function box(out: { pos: number[]; idx: number[] }, lo: [number, number, number], hi: [number, number, number], n = 6): void {
  const [x0, y0, z0] = lo;
  const [x1, y1, z1] = hi;
  for (const [a, b, c, side] of [
    [0, 1, 2, 0], [0, 1, 2, 1], [1, 2, 0, 0], [1, 2, 0, 1], [2, 0, 1, 0], [2, 0, 1, 1],
  ] as [number, number, number, number][]) {
    const base = out.pos.length / 3;
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= n; j++) {
        const p = [x0, y0, z0];
        p[a] += ((i / n) * (hi[a] - lo[a]));
        p[b] += ((j / n) * (hi[b] - lo[b]));
        p[c] = side === 0 ? lo[c] : hi[c];
        out.pos.push(p[0], p[1], p[2]);
      }
    }
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const v00 = base + i * (n + 1) + j;
        const v01 = v00 + 1;
        const v10 = v00 + (n + 1);
        const v11 = v10 + 1;
        out.idx.push(v00, v10, v11, v00, v11, v01);
      }
    }
  }
}

/** A minimal GLB (one mesh, one primitive, Y-up positions given). */
function writeGlb(path: string, pos: number[], idx: number[]): void {
  const json = {
    asset: { version: "2.0" }, scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: "figure" }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, mode: 4 }] }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: pos.length / 3, type: "VEC3",
        min: [Math.min(...pos.filter((_, i) => i % 3 === 0)), Math.min(...pos.filter((_, i) => i % 3 === 1)), Math.min(...pos.filter((_, i) => i % 3 === 2))],
        max: [Math.max(...pos.filter((_, i) => i % 3 === 0)), Math.max(...pos.filter((_, i) => i % 3 === 1)), Math.max(...pos.filter((_, i) => i % 3 === 2))] },
      { bufferView: 1, componentType: 5125, count: idx.length, type: "SCALAR" },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: pos.length * 4 },
      { buffer: 0, byteOffset: pos.length * 4, byteLength: idx.length * 4 },
    ],
    buffers: [{ byteLength: pos.length * 4 + idx.length * 4 }],
  };
  const jsonBytes = Buffer.from(JSON.stringify(json), "utf8");
  const jsonPad = Buffer.alloc((4 - (jsonBytes.length % 4)) % 4, 0x20);
  const bin = Buffer.concat([
    Buffer.from(Float32Array.from(pos).buffer),
    Buffer.from(Uint32Array.from(idx).buffer),
  ]);
  const binPad = Buffer.alloc((4 - (bin.length % 4)) % 4, 0);
  const total = 12 + 8 + jsonBytes.length + jsonPad.length + 8 + bin.length + binPad.length;
  const head = Buffer.alloc(12);
  head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(total, 8);
  const jchunk = Buffer.alloc(8);
  jchunk.writeUInt32LE(jsonBytes.length + jsonPad.length, 0); jchunk.writeUInt32LE(0x4e4f534a, 4);
  const bchunk = Buffer.alloc(8);
  bchunk.writeUInt32LE(bin.length + binPad.length, 0); bchunk.writeUInt32LE(0x004e4942, 4);
  writeFileSync(path, Buffer.concat([head, jchunk, jsonBytes, jsonPad, bchunk, bin, binPad]));
}

/** A standing figure in rest pose from boxes (Y-up). */
function standingFigure(): { pos: number[]; idx: number[] } {
  const out = { pos: [] as number[], idx: [] as number[] };
  box(out, [-0.18, 0.85, -0.10], [0.18, 1.45, 0.10]);   // torso
  box(out, [-0.09, 1.45, -0.09], [0.09, 1.62, 0.09]);   // head
  box(out, [-0.17, 0.0, -0.07], [-0.05, 0.85, 0.07]);   // left leg
  box(out, [0.05, 0.0, -0.07], [0.17, 0.85, 0.07]);     // right leg
  box(out, [-0.20, 0.0, -0.04], [-0.04, 0.06, 0.14]);   // left foot (+Z front)
  box(out, [0.04, 0.0, -0.04], [0.20, 0.06, 0.14]);     // right foot
  box(out, [-0.24, 0.85, -0.05], [-0.18, 1.40, 0.05]);  // left arm
  box(out, [0.18, 0.85, -0.05], [0.24, 1.40, 0.05]);    // right arm
  return out;
}

/** A desk: tabletop on four legs — readable feet and a solid column to the
 *  top (legs carry the tabletop), but depth/height 0.91 against the band
 *  0.07-0.40: the furniture class the depth gate exists for. */
function deskFigure(): { pos: number[]; idx: number[] } {
  const out = { pos: [] as number[], idx: [] as number[] };
  box(out, [-0.7, 0.72, -0.35], [0.7, 0.77, 0.35]);   // tabletop
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    box(out, [x * 0.6 - 0.025, 0, z * 0.25 - 0.025], [x * 0.6 + 0.025, 0.72, z * 0.25 + 0.025]);
  }
  return out;
}

/** A solid slab: one connected bottom wider than any foot and no column —
 *  refused on the measured column voice (the colleague class). */
function slab(): { pos: number[]; idx: number[] } {
  const out = { pos: [] as number[], idx: [] as number[] };
  box(out, [-1.0, 0.0, -0.45], [1.0, 0.6, 0.45]);
  return out;
}

/** The same figure authored Z-up (+Z is up, the body stands above z = 0). */
function standingFigureZup(): { pos: number[]; idx: number[] } {
  const f = standingFigure();
  const pos: number[] = [];
  for (let i = 0; i < f.pos.length; i += 3) pos.push(f.pos[i], -f.pos[i + 2], f.pos[i + 1]);
  return { pos, idx: f.idx };
}

describe("rig-autolane-contract — the auto lane rigs a STANDING humanoid, refuses everything else with measured numbers", () => {
  it("the pack carries the stdlib judge with the standing gates (proportion bands, column reach, refusal class)", () => {
    const pf = pack("rig_preflight.py");
    expect(existsSync(join(PACK, "rig_preflight.py")), "rig_preflight.py exists").toBe(true);
    for (const needle of ["class RigRefusal", "DEPTH_OVER_HEIGHT", "LATERAL_OVER_HEIGHT",
      "LEG_REACH_MIN = 0.60", "def read_body(", "def plan_for(", "def judge(path)",
      "def ensure_yup(", "def bake_to_world("]) {
      expect(pf, `the judge carries ${needle}`).toContain(needle);
    }
  });

  it("THE STANDING JUDGE (CI-live): a synthetic standing figure passes, and the verdict carries measured stats", () => {
    const dir = mkdtempSync(join(tmpdir(), "rig-wall-"));
    try {
      const f = standingFigure();
      const path = join(dir, "standing.glb");
      writeGlb(path, f.pos, f.idx);
      const r = spawnSync(pythonBin(), [join(PACK, "rig_preflight.py"), path], { encoding: "utf8", timeout: 60_000 });
      expect(r.status, `the standing figure passes (stderr: ${r.stderr})`).toBe(0);
      const verdict = JSON.parse(r.stdout);
      expect(verdict.violations, "no violations").toEqual([]);
      expect(verdict.reach, "the column reach is measured (a standing body holds 0.60+)").toBeGreaterThanOrEqual(0.6);
      expect(verdict.roles.up, "the figure reads Y-up").toBe(1);
      expect(verdict.stats.thigh, "the thigh band extent is reported").toBeLessThan(0.2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("THE STANDING JUDGE: a Z-up standing figure passes (roles read before any verdict)", () => {
    const dir = mkdtempSync(join(tmpdir(), "rig-wall-"));
    try {
      const f = standingFigureZup();
      const path = join(dir, "zup.glb");
      writeGlb(path, f.pos, f.idx);
      const r = spawnSync(pythonBin(), [join(PACK, "rig_preflight.py"), path], { encoding: "utf8", timeout: 60_000 });
      expect(r.status, `the Z-up figure passes (stderr: ${r.stderr})`).toBe(0);
      expect(JSON.parse(r.stdout).roles.up, "the judge reads up = Z, not the convention").toBe(2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("THE STANDING JUDGE refuses furniture with the MEASURED depth band, exit 1 (the seat-the-desk class)", () => {
    const dir = mkdtempSync(join(tmpdir(), "rig-wall-"));
    try {
      const desk = deskFigure();
      const path = join(dir, "desk.glb");
      writeGlb(path, desk.pos, desk.idx);
      const r = spawnSync(pythonBin(), [join(PACK, "rig_preflight.py"), path], { encoding: "utf8", timeout: 60_000 });
      expect(r.status, "the desk is refused").toBe(1);
      const verdict = JSON.parse(r.stdout);
      const text = verdict.violations.join("; ");
      expect(text, "the refusal names the measured proportion, not a vibe").toContain("depth/height");
      expect(text, "the refusal names the band").toContain("0.07-0.40");
      expect(text, "the refusal carries the measured box").toContain("measures");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("THE STANDING JUDGE refuses solid furniture on the measured column voice, exit 1 (the seated/merged class)", () => {
    const dir = mkdtempSync(join(tmpdir(), "rig-wall-"));
    try {
      const s = slab();
      const path = join(dir, "slab.glb");
      writeGlb(path, s.pos, s.idx);
      const r = spawnSync(pythonBin(), [join(PACK, "rig_preflight.py"), path], { encoding: "utf8", timeout: 60_000 });
      expect(r.status, "the slab is refused").toBe(1);
      const verdict = JSON.parse(r.stdout);
      const text = verdict.violations.join("; ");
      expect(text, "the refusal names the measured column end (the colleague's voice)").toContain("the solid column above the feet ends at");
      expect(text, "the refusal carries the measured percentage").toContain("% of the body's height");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("THE EXECUTOR'S DOORS: the transfer reads the plan, refuses on violations before geometry, and carries no guessers", () => {
    const swt = pack("soma_weight_transfer.py");
    for (const needle of [
      "def _load_preflight(", "import rig_preflight",
      'raise _pf.RigRefusal(plan["violations"]',   // the pre-geometry gate (fires twice: plan + post-conversion)
      "_pf.ensure_yup(", "_pf.bake_to_world(",     // wholesale conversion + world bake, the scene-integrity doors
      "MEMBER_RADIUS", "MEMBER_MIN", "FIT_GATE_MAX",  // membership + the numpy fit gate
      'prim["attributes"]["JOINTS_0"] = acc_j',    // per-part skinning (not mesh0-only)
      "def _aabb_align_uniform",                   // kept: animation_writer imports it
      'scene["nodes"].append(armature_node_idx)',  // the root list is grown, never replaced
    ]) {
      expect(swt, `the executor carries ${needle}`).toContain(needle);
    }
    for (const dead of ["def _aabb_align(", "def _aabb_align_per_axis_safe", "_need_yup_fix", "mesh_spreads"]) {
      expect(swt, `the guesser is gone: ${dead}`).not.toContain(dead);
    }
  });

  it("THE NODE'S VOICE: KimodoExportFBX catches the judge's refusal through the shared channel and re-raises ValueError with the standing contract", () => {
    const nodes = pack("nodes.py");
    expect(nodes, "the judge is imported (not re-loaded by path — a second load mints a distinct class the except can never catch)")
      .toContain("import rig_preflight");
    expect(nodes, "the refusal is caught").toContain("except rig_preflight.RigRefusal as refusal:");
    expect(nodes, "the refusal is re-raised as the node's measured ValueError").toContain('"KimodoExportFBX refuses this source: "');
    expect(nodes, "the refusal carries the measured stats").toContain('(" (measured: %s)" % measured if measured else "")');
    expect(nodes, "the refusal names the standing contract and the copy alternative").toContain("the auto lane rigs a STANDING humanoid in rest pose");
  });

  it("SCENE INTEGRITY is absolute: no file in the lane ASSIGNS scenes[0]['nodes'] except the grow-only ensure-empty (AST-judged, comments never count)", () => {
    const script = [
      "import ast, sys",
      "banned = []",
      "for path in sys.argv[1:]:",
      "    tree = ast.parse(open(path, encoding='utf-8').read(), path)",
      "    for node in ast.walk(tree):",
      "        if not isinstance(node, ast.Assign):",
      "            continue",
      "        for t in node.targets:",
      "            if (isinstance(t, ast.Subscript) and isinstance(t.value, ast.Subscript)",
      "                    and isinstance(t.value.value, ast.Name) and t.value.value.id == 'scenes'",
      "                    and getattr(t.value.slice, 'value', None) == 0",
      "                    and getattr(t.slice, 'value', None) == 'nodes'):",
      "                if not (isinstance(node.value, ast.List) and not node.value.elts):",
      "                    banned.append(path + ':' + str(node.lineno))",
      "print('BANNED ' + ';'.join(banned) if banned else 'SCENE-ROOTS-CLEAN')",
    ].join("\n");
    const files = ["soma_weight_transfer.py", "rig_preflight.py", "nodes.py"].map((n) => join(PACK, n));
    const r = spawnSync(pythonBin(), ["-c", script, ...files], { encoding: "utf8", timeout: 60_000 });
    expect(r.status, `the AST scan runs (stderr: ${r.stderr})`).toBe(0);
    expect(r.stdout.trim(), "the old scenes[0]['nodes'] = [armature, mesh] rewrite stays dead (it orphaned every other node in a live Godot asset)")
      .toBe("SCENE-ROOTS-CLEAN");
  });

  it("THE VENV PARITY (stands down without the engine venv): the executor rigs a standing multi-part scene with static props intact, and refuses a slab with no output", () => {
    const probe = join(__dirname, "../fixtures/rig-autolane-parity.py");
    expect(existsSync(probe), "the parity probe fixture exists").toBe(true);
    let out: string;
    try {
      out = execFileSync(VENV_PYTHON, [probe, PACK], { encoding: "utf8", timeout: 600_000 });
    } catch (err) {
      const failure = err as { status?: number; stderr?: string; stdout?: string };
      if (failure.status === 3) return; // no engine venv / no template on this box
      throw new Error(`the parity probe exited ${failure.status}\n${failure.stdout}\n${failure.stderr}`);
    }
    expect(out, "the executor rigs standing, keeps props static, preserves every node, and refuses seated with no output")
      .toContain("PARITY-OK");
  });
});
