#!/usr/bin/env python3
"""fit_prop.py - 3D placement surgery: SOMAX body + static prop -> fitted GLB.

Date: 2026-09-06 - Status: landed (fit-card stroke 2a: the CPU placement core).

Implements the three meld fit laws (AttachmentRow modes) as bytes-in /
bytes-out GLB surgery in the CompositeCharacter helmet-method style: the
prop scene roots are grafted UNDER the bone node with a computed local
matrix, so the prop rides baked clip motion for free and stays STATIC
(socket law - never weight-transferred). Every failure raises with the
cause named; nothing partially writes.

CPU-only: no queue slot, no GPU. The queue card (stroke 2b) and pack nodes
(stroke 3) call this same math through their own doors.

Usage: uv run python tools/fit_prop.py --body body.glb --prop hat.glb
       --row @row.json --out-glb fitted.glb --out-record record.json
"""

from __future__ import annotations

import argparse
import json
import math
import os
import struct
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, 'py'))
# lane lens (row 3, 2026-09-06): fit_spec is card-owned — the fit
# card's py/ dir rides first so the tool reads the file production
# loads.
sys.path.insert(0, os.path.join(
    REPO, 'plugins/engines/comfyui/action_cards/3d/fit/py'))

import numpy as np

from fit_spec import (
    AttachmentRow, FitMode, FitRequest, fit_width, seat_drop,
)

_DTYPE = {5120: 'i1', 5121: 'u1', 5122: 'i2', 5123: 'u2', 5125: 'u4', 5126: 'f4'}
_NCOMP = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}

# glTF JSON values: parsed document subtrees (annotations only —
# never evaluated at runtime under `from __future__ import`).
type JsonValue = dict[str, "JsonValue"] | list["JsonValue"] | str | int | float | bool | None


def parse_glb(raw: bytes) -> tuple[dict[str, JsonValue], bytes]:
    if len(raw) < 20:
        raise ValueError('GLB too small (%d bytes)' % len(raw))
    magic, version, _total = struct.unpack_from('<III', raw, 0)
    if magic != 0x46546C67:
        raise ValueError('not a GLB (magic=0x%08x)' % magic)
    if version != 2:
        raise ValueError('unsupported GLB version %d' % version)
    json_len, json_type = struct.unpack_from('<II', raw, 12)
    if json_type != 0x4E4F534A:
        raise ValueError('chunk 0 not JSON')
    gltf = json.loads(raw[20:20 + json_len].decode())
    off = 20 + json_len
    if off + 8 > len(raw):
        return gltf, b''
    bin_len, bin_type = struct.unpack_from('<II', raw, off)
    if bin_type != 0x004E4942:
        raise ValueError('chunk 1 not BIN')
    return gltf, raw[off + 8:off + 8 + bin_len]


def build_glb(gltf: dict[str, JsonValue], bindata: bytes) -> bytes:
    js = json.dumps(gltf, separators=(',', ':')).encode()
    while len(js) % 4:
        js += b' '
    pad = b'\x00' * ((4 - len(bindata) % 4) % 4)
    bindata = bindata + pad
    total = 12 + 8 + len(js) + (8 + len(bindata) if bindata else 0)
    head = struct.pack('<III', 0x46546C67, 2, total)
    out = head + struct.pack('<II', len(js), 0x4E4F534A) + js
    if bindata:
        out += struct.pack('<II', len(bindata), 0x004E4942) + bindata
    return out


def read_accessor(gltf: dict[str, JsonValue], bindata: bytes, idx: int) -> np.ndarray:
    acc = gltf['accessors'][idx]
    comp = _DTYPE.get(acc['componentType'])
    if comp is None:
        raise ValueError('accessor %d: bad componentType %r' % (idx, acc['componentType']))
    ncomp = _NCOMP[acc['type']]
    bv = gltf['bufferViews'][acc['bufferView']]
    start = bv.get('byteOffset', 0) + acc.get('byteOffset', 0)
    count = acc['count']
    dt = np.dtype(comp)
    unit = ncomp * dt.itemsize
    stride = bv.get('byteStride', unit)
    buf = np.frombuffer(bindata, dtype=np.uint8)
    if stride == unit:
        flat = np.frombuffer(buf[start:start + count * unit].tobytes(), dtype=dt)
        return flat.reshape(count, ncomp) if ncomp > 1 else flat
    out = np.empty((count, ncomp), dtype=dt)
    for i in range(count):
        chunk = buf[start + i * stride:start + i * stride + unit].tobytes()
        out[i] = np.frombuffer(chunk, dtype=dt)
    return out


def node_local(node: dict[str, JsonValue]) -> np.ndarray:
    M = np.eye(4)
    if 'matrix' in node:
        return np.array(node['matrix'], dtype=float).reshape(4, 4).T
    if 'scale' in node:
        M = np.diag([node['scale'][0], node['scale'][1], node['scale'][2], 1.0]) @ M
    if 'rotation' in node:
        x, y, z, w = (float(v) for v in node['rotation'])
        R = np.array([
            [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 0],
            [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 0],
            [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y), 0],
            [0, 0, 0, 1]], dtype=float)
        M = R @ M
    if 'translation' in node:
        T = np.eye(4)
        T[0, 3], T[1, 3], T[2, 3] = (float(v) for v in node['translation'])
        M = T @ M
    return M


def unity_euler_deg(rx: float, ry: float, rz: float) -> np.ndarray:
    ax, ay, az = (math.radians(v) for v in (rx, ry, rz))
    cx, sx = math.cos(ax), math.sin(ax)
    cy, sy = math.cos(ay), math.sin(ay)
    cz, sz = math.cos(az), math.sin(az)
    Rx = np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]])
    Ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    Rz = np.array([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]])
    return Ry @ Rx @ Rz


def quat_from_mat(R: np.ndarray) -> tuple[float, float, float, float]:
    t = float(R[0, 0] + R[1, 1] + R[2, 2])
    if t > 0.0:
        s = 2.0 * math.sqrt(t + 1.0)
        w = 0.25 * s
        x = (R[2, 1] - R[1, 2]) / s
        y = (R[0, 2] - R[2, 0]) / s
        z = (R[1, 0] - R[0, 1]) / s
    elif R[0, 0] > R[1, 1] and R[0, 0] > R[2, 2]:
        s = 2.0 * math.sqrt(1.0 + R[0, 0] - R[1, 1] - R[2, 2])
        w = (R[2, 1] - R[1, 2]) / s
        x = 0.25 * s
        y = (R[0, 1] + R[1, 0]) / s
        z = (R[0, 2] + R[2, 0]) / s
    elif R[1, 1] > R[2, 2]:
        s = 2.0 * math.sqrt(1.0 + R[1, 1] - R[0, 0] - R[2, 2])
        w = (R[0, 2] - R[2, 0]) / s
        x = (R[0, 1] + R[1, 0]) / s
        y = 0.25 * s
        z = (R[1, 2] + R[2, 1]) / s
    else:
        s = 2.0 * math.sqrt(1.0 + R[2, 2] - R[0, 0] - R[1, 1])
        w = (R[1, 0] - R[0, 1]) / s
        x = (R[0, 2] + R[2, 0]) / s
        y = (R[1, 2] + R[2, 1]) / s
        z = 0.25 * s
    return (x, y, z, w)


def bind_worlds(gltf: dict[str, JsonValue]) -> tuple[dict[str, int], dict[int, np.ndarray]]:
    nodes = gltf.get('nodes', [])
    name_to_idx: dict[str, int] = {}
    for i, n in enumerate(nodes):
        nm = n.get('name', '')
        if nm:
            if nm in name_to_idx:
                raise ValueError('duplicate node name %r (Unity lookup ambiguous)' % nm)
            name_to_idx[nm] = i
    parent: dict[int, int] = {}
    for i, n in enumerate(nodes):
        for c in n.get('children', []):
            parent[c] = i
    worlds: dict[int, np.ndarray] = {}
    def world(i: int) -> np.ndarray:
        if i not in worlds:
            local = node_local(nodes[i])
            worlds[i] = local if i not in parent else world(parent[i]) @ local
        return worlds[i]
    for i in range(len(nodes)):
        world(i)
    return name_to_idx, worlds


def prop_positions(gltf: dict[str, JsonValue], bindata: bytes) -> np.ndarray:
    verts = []
    seen: set[int] = set()
    for mesh in gltf.get('meshes', []):
        for prim in mesh.get('primitives', []):
            ai = prim.get('attributes', {}).get('POSITION')
            if ai is None or ai in seen:
                continue
            seen.add(ai)
            verts.append(np.asarray(read_accessor(gltf, bindata, ai), dtype=float).reshape(-1, 3))
    if not verts:
        raise ValueError('prop meshes carry no POSITION attributes')
    return np.vstack(verts)


def _bone_frame(bone_world: np.ndarray, bone: str) -> tuple[np.ndarray, float]:
    Rb = bone_world[:3, :3]
    cols = [float(np.linalg.norm(Rb[:, i])) for i in range(3)]
    if max(cols) - min(cols) > 1e-4 * max(1.0, max(cols)):
        raise ValueError('bone %r bind world non-uniformly scaled %r' % (bone, cols))
    if cols[0] < 1e-9:
        raise ValueError('bone %r bind world degenerate' % bone)
    return Rb / cols[0], cols[0]


def law_socket(verts: np.ndarray, bone_world: np.ndarray, row: AttachmentRow) -> tuple[np.ndarray, dict[str, float]]:
    Rb_n, bs = _bone_frame(bone_world, row.bone)
    R = Rb_n @ unity_euler_deg(row.rotation[0], row.rotation[1], row.rotation[2])
    width = float(np.ptp(verts, axis=0).max())
    s = (row.target_width / width) if row.target_width > 0.0 else 1.0
    if width < 1e-9:
        raise ValueError('prop %r degenerate (zero width)' % row.model)
    off = np.array([row.position[0], row.position[1], row.position[2]], dtype=float)
    pos = bone_world[:3, 3] + Rb_n @ (off * bs)
    M = np.eye(4)
    M[:3, :3] = R * s
    M[:3, 3] = pos
    return M, {'scale': s, 'prop_width_m': width * s}


def law_fit(verts: np.ndarray, bone_world: np.ndarray, span_m: float, row: AttachmentRow, ref_pos: np.ndarray) -> tuple[np.ndarray, dict[str, float]]:
    width = float(np.ptp(verts, axis=0).max())
    if width < 1e-9:
        raise ValueError('prop %r degenerate (zero width)' % row.model)
    s = fit_width(span_m, row) / width
    Rb_n, _bs = _bone_frame(bone_world, row.bone)
    u = Rb_n[:, 1].copy()
    Rv = (Rb_n @ verts.T).T
    proj = Rv @ u
    Rc = Rb_n @ verts.mean(axis=0)
    drop = seat_drop(span_m, row)
    pos = ref_pos - u * (drop + s * float(proj.min()))
    for i in range(3):
        axis = Rb_n[:, i]
        if abs(float(axis @ u)) > 0.99:
            continue
        pos = pos + axis * float((ref_pos - s * Rc) @ axis - pos @ axis)
    M = np.eye(4)
    M[:3, :3] = Rb_n * s
    M[:3, 3] = pos
    return M, {'scale': s, 'span_m': span_m, 'seat_drop_m': drop, 'prop_width_m': width * s}


def law_grip(verts: np.ndarray, bone_world: np.ndarray, finger_pos: np.ndarray,
             thumb_pos: np.ndarray | None, row: AttachmentRow) -> tuple[np.ndarray, dict[str, float | int | list[float]]]:
    ext = verts.max(axis=0) - verts.min(axis=0)
    longest = int(np.argmax(ext))
    others_all = [i for i in range(3) if i != longest]
    flat_order = sorted(range(3), key=lambda i: float(ext[i]))
    flattest = flat_order[0]
    mid = [i for i in range(3) if i not in (longest, flattest)][0]
    width = float(ext.max())
    s = (row.target_width / width) if row.target_width > 0.0 else 1.0
    bone_pos = bone_world[:3, 3]
    f = finger_pos - bone_pos
    if float(np.linalg.norm(f)) < 1e-9:
        raise ValueError('finger bone %r coincides with %r' % (row.finger_bone, row.bone))
    f = f / float(np.linalg.norm(f))
    t = None
    if thumb_pos is not None:
        tt = thumb_pos - bone_pos
        tt = tt - f * float(tt @ f)
        if float(np.linalg.norm(tt)) > 1e-6:
            t = tt / float(np.linalg.norm(tt))
    if t is None:
        arb = np.array([1.0, 0.0, 0.0]) if abs(float(f[0])) < 0.9 else np.array([0.0, 1.0, 0.0])
        t = arb - f * float(arb @ f)
        t = t / float(np.linalg.norm(t))
    m = np.cross(t, f)
    m = m / float(np.linalg.norm(m))
    t2 = np.cross(f, m)
    basis = np.eye(3)
    basis[:, longest] = f
    basis[:, flattest] = t2
    basis[:, mid] = m
    if float(np.linalg.det(basis)) < 0.0:
        basis[:, mid] = -m
        t2 = np.cross(f, basis[:, mid])
        basis[:, flattest] = t2
    axis_vals = verts[:, longest]
    a_min, a_max = float(axis_vals.min()), float(axis_vals.max())
    nsl = 24
    edges = np.linspace(a_min, a_max, nsl + 1)
    widths = np.zeros(nsl)
    for k in range(nsl):
        sel = verts[(axis_vals >= edges[k]) & (axis_vals <= edges[k + 1])]
        widths[k] = float(np.ptp(sel[:, others_all].reshape(-1, len(others_all)), axis=0).max()) if len(sel) else 0.0
    w = int(np.argmax(widths))
    tip_end = 0 if widths[0] <= widths[-1] else nsl - 1
    nontip = (nsl - 1) - tip_end
    grip_t = 0.5 * (w / (nsl - 1) + nontip / (nsl - 1))
    grip_local = verts.mean(axis=0)
    grip_local[longest] = a_min + grip_t * (a_max - a_min)
    pos = bone_pos - (basis @ grip_local) * s
    M = np.eye(4)
    M[:3, :3] = basis * s
    M[:3, 3] = pos
    return M, {'scale': s, 'prop_width_m': width * s,
               'grip_local': [float(v) for v in grip_local],
               'longest_axis': longest, 'tip_end': tip_end, 'slices': nsl}


def graft(body: dict[str, JsonValue], body_bin: bytes, prop: dict[str, JsonValue], prop_bin: bytes,
          bone_idx: int, local: np.ndarray, model: str) -> tuple[dict[str, JsonValue], bytes]:
    for key in ('buffers', 'bufferViews', 'accessors', 'images', 'textures',
                'samplers', 'materials', 'meshes', 'nodes', 'scenes'):
        body.setdefault(key, [])
        prop.setdefault(key, [])
    if len(prop.get('buffers', [])) > 1:
        raise ValueError('prop %r has many buffers (single-buffer only)' % model)
    if prop.get('skins'):
        raise ValueError('prop %r skinned (socket law: static only)' % model)
    if prop.get('animations'):
        raise ValueError('prop %r animated (static props only)' % model)
    base = (len(body_bin) + 3) & ~3
    new_bin = body_bin + b'\x00' * (base - len(body_bin)) + prop_bin
    sh = {
        'bv': len(body['bufferViews']), 'acc': len(body['accessors']),
        'img': len(body['images']), 'smp': len(body['samplers']),
        'tex': len(body['textures']), 'mat': len(body['materials']),
        'mesh': len(body['meshes']), 'node': len(body['nodes']),
    }
    for bv in prop['bufferViews']:
        nb = dict(bv)
        nb['byteOffset'] = nb.get('byteOffset', 0) + base
        body['bufferViews'].append(nb)
    for acc in prop['accessors']:
        na = dict(acc)
        na['bufferView'] = na['bufferView'] + sh['bv']
        body['accessors'].append(na)
    for im in prop['images']:
        ni = dict(im)
        if 'bufferView' in ni:
            ni['bufferView'] = ni['bufferView'] + sh['bv']
        body['images'].append(ni)
    for sm in prop['samplers']:
        body['samplers'].append(dict(sm))
    for tx in prop['textures']:
        nt = dict(tx)
        if 'source' in nt:
            nt['source'] = nt['source'] + sh['img']
        if 'sampler' in nt:
            nt['sampler'] = nt['sampler'] + sh['smp']
        body['textures'].append(nt)
    for mt in prop['materials']:
        nm = json.loads(json.dumps(mt))
        _shift_tex_ref(nm, sh['tex'])
        body['materials'].append(nm)
    for me in prop['meshes']:
        nm = json.loads(json.dumps(me))
        for prim in nm.get('primitives', []):
            for k in list(prim.get('attributes', {}).keys()):
                prim['attributes'][k] = prim['attributes'][k] + sh['acc']
            if 'indices' in prim:
                prim['indices'] = prim['indices'] + sh['acc']
            if 'material' in prim:
                prim['material'] = prim['material'] + sh['mat']
        body['meshes'].append(nm)
    prop_scenes = prop.get('scenes', [])
    if prop_scenes and prop_scenes[0].get('nodes'):
        roots = list(prop_scenes[0]['nodes'])
    else:
        roots = list(range(len(prop['nodes'])))
    t = [float(local[0, 3]), float(local[1, 3]), float(local[2, 3])]
    sc = float(np.linalg.norm(local[:3, 0]))
    if sc < 1e-9:
        raise ValueError('fitted local matrix degenerate (scale ~0)')
    q = quat_from_mat(local[:3, :3] / sc)
    grafted = []
    for r in roots:
        nn = json.loads(json.dumps(prop['nodes'][r]))
        nn.pop('matrix', None)
        nn['translation'] = t
        nn['rotation'] = [q[0], q[1], q[2], q[3]]
        nn['scale'] = [sc, sc, sc]
        nn['name'] = model
        if 'mesh' in nn:
            nn['mesh'] = nn['mesh'] + sh['mesh']
        nn['children'] = [c + sh['node'] for c in nn.get('children', [])]
        body['nodes'].append(nn)
        grafted.append(len(body['nodes']) - 1)
    for idx, n in enumerate(prop['nodes']):
        if idx in roots:
            continue
        nn = json.loads(json.dumps(n))
        nn['children'] = [c + sh['node'] for c in nn.get('children', [])]
        if 'mesh' in nn:
            nn['mesh'] = nn['mesh'] + sh['mesh']
        body['nodes'].append(nn)
    body['nodes'][bone_idx].setdefault('children', []).extend(grafted)
    return body, new_bin


def _shift_tex_ref(o: JsonValue, add: int) -> None:
    if isinstance(o, dict):
        if 'index' in o and isinstance(o['index'], int) and 'texCoord' in o:
            o['index'] = o['index'] + add
        for v in o.values():
            _shift_tex_ref(v, add)
    elif isinstance(o, list):
        for v in o:
            _shift_tex_ref(v, add)


def fit_file(body_path: str, prop_path: str, row: AttachmentRow) -> tuple[bytes, dict[str, JsonValue]]:
    body, body_bin = parse_glb(open(body_path, 'rb').read())
    prop, prop_bin = parse_glb(open(prop_path, 'rb').read())
    names, worlds = bind_worlds(body)
    if row.bone not in names:
        raise ValueError('bone %r not in body (%d named nodes)' % (row.bone, len(names)))
    bone_idx = names[row.bone]
    bone_world = worlds[bone_idx]
    verts = prop_positions(prop, prop_bin)
    if row.mode is FitMode.socket:
        desired, meas = law_socket(verts, bone_world, row)
    elif row.mode is FitMode.fit:
        if row.fit_ref_bone not in names:
            raise ValueError('fit_ref_bone %r not in body' % row.fit_ref_bone)
        second = row.fit_ref_bone2 or row.bone
        if second not in names:
            raise ValueError('fit_ref_bone2 %r not in body' % second)
        a = worlds[names[second]][:3, 3]
        b = worlds[names[row.fit_ref_bone]][:3, 3]
        span = float(np.linalg.norm(b - a))
        if span < 1e-9:
            raise ValueError('fit span ~0 (%r coincides)' % row.fit_ref_bone)
        desired, meas = law_fit(verts, bone_world, span, row, b)
    else:
        if row.finger_bone not in names:
            raise ValueError('finger_bone %r not in body' % row.finger_bone)
        thumb = None
        if row.thumb_bone:
            if row.thumb_bone not in names:
                raise ValueError('thumb_bone %r not in body' % row.thumb_bone)
            thumb = worlds[names[row.thumb_bone]][:3, 3]
        desired, meas = law_grip(verts, bone_world, worlds[names[row.finger_bone]][:3, 3], thumb, row)
    local = np.linalg.inv(bone_world) @ desired
    out_gltf, out_bin = graft(body, body_bin, prop, prop_bin, bone_idx, local, row.model)
    record = {
        'body': os.path.basename(body_path),
        'prop': os.path.basename(prop_path),
        'row': row.to_manifest_row(),
        'measured': meas,
        'local_matrix': [[float(v) for v in r] for r in local],
    }
    return build_glb(out_gltf, out_bin), record


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description='Fit a static prop onto a SOMAX body.')
    parser.add_argument('--body', required=True)
    parser.add_argument('--prop', required=True)
    parser.add_argument('--row', required=True, help='Meld-JSON attachment row (@file or inline).' )
    parser.add_argument('--out-glb', required=True)
    parser.add_argument('--out-record', required=True)
    args = parser.parse_args(argv)
    raw = args.row
    if raw.startswith('@'):
        raw = open(raw[1:], encoding='utf-8').read()
    try:
        row = AttachmentRow.from_manifest_row(json.loads(raw))
    except Exception as exc:
        print('fit_prop: row refused: %s' % (exc,), file=sys.stderr)
        return 2
    try:
        blob, record = fit_file(args.body, args.prop, row)
    except Exception as exc:
        print('fit_prop: %s' % (exc,), file=sys.stderr)
        return 3
    open(args.out_glb, 'wb').write(blob)
    with open(args.out_record, 'w', encoding='utf-8') as fh:
        json.dump(record, fh, indent=2, sort_keys=True)
        fh.write('\n')
    print('wrote %s + %s' % (args.out_glb, args.out_record))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
