#!/usr/bin/env python3
"""build_anny_person.py - NEW PERSON via ANNY Body Studio (operator law a+b).

  a) ANNY through Body Studio: POST /poser/skin/mesh {identity_model:'anny',
     identity_coeffs} -> shaped mesh (18056 verts, topology-stable) +
     POST /poser/skin/bind_pose -> identity-aware positions (77,3) +
     canonical rotations (77,3,3).
  b) somax[anny] makes the ANNY mesh: _write_rigged_glb (the writer every
     real character goes through) with the template's hand-painted weights
     (skin_standard.npz lbs_*) - topology identical, weights carry over.

Units law: engine vertices are cm; skin_standard.npz (and the writer's
expectation) is meters. Auto-detected and normalized to meters.

Usage:
  .venv/bin/python scripts/oneoff/build_anny_person.py \
      --name lorekeep_keeper_v3 --coeffs 0.15,0.88,0.62,0.62,0.58,0.42,0.0,0.35,0.5,0.2,0.6

Coeffs (11): gender age muscle weight height proportions cupsize firmness
              african asian caucasian  (0.5 = neutral; docs/anny-phenotype-mapping.md)
"""
from __future__ import annotations

import argparse
import json
import struct
import sys
import urllib.request
from pathlib import Path

import numpy as np
import trimesh

REPO = Path(__file__).resolve().parent.parent.parent
NPZ = REPO / "vendor/kimodo/kimodo/assets/skeletons/somaskel77/skin_standard.npz"
AUTORIG = REPO / "custom_nodes/melite-autorig-nodes"
COMFY = "http://127.0.0.1:18465"
RUNS = REPO / "datafolder/outputs/runs"


def _post(path: str, body: dict) -> dict:
    req = urllib.request.Request(
        COMFY + path, data=json.dumps(body).encode(),
        headers={"content-type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=180))


def _bare_glb(vertices_m, faces, tmp: Path) -> Path:
    mesh = trimesh.Trimesh(vertices=vertices_m.astype(np.float32),
                           faces=faces.astype(np.int64))
    tmp.parent.mkdir(parents=True, exist_ok=True)
    mesh.export(str(tmp), file_type="glb")
    return tmp


def _read_glb(path: Path):
    with open(path, "rb") as f:
        f.read(12)
        cl, ct = struct.unpack("<II", f.read(8))
        gltf = json.loads(f.read(cl))
        bl, bt = struct.unpack("<II", f.read(8))
        assert bt == 0x004E4942
        return gltf, f.read(bl)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--name", required=True)
    ap.add_argument("--coeffs", required=True)
    ap.add_argument("--model", default="anny")
    a = ap.parse_args()

    coeffs = [float(x) for x in a.coeffs.split(",")]
    assert len(coeffs) == 11, f"need 11 coeffs, got {len(coeffs)}"

    shaped = _post("/poser/skin/mesh", {
        "identity_model": a.model, "identity_coeffs": coeffs})
    verts = np.asarray(shaped["vertices"], dtype=np.float32)
    faces = np.asarray(shaped["faces"], dtype=np.int64)
    bj = np.asarray(shaped["bind_joints"], dtype=np.float32)
    vspan = float(np.abs(verts).max())
    if vspan > 10.0:
        verts = verts / 100.0
        bj = bj / 100.0
    print(f"shaped: {verts.shape} verts, {faces.shape} faces, {bj.shape} joints, "
          f"height~{float(verts[:, 1].max() - verts[:, 1].min()):.2f}m")

    bind = _post("/poser/skin/bind_pose", {
        "identity_model": a.model, "identity_coeffs": coeffs, "units": "m"})
    pos = np.asarray(bind["positions"], dtype=np.float32).reshape(77, 3)
    rot = np.asarray(bind["rotations"], dtype=np.float32).reshape(77, 3, 3)
    bind_mats = np.repeat(np.eye(4, dtype=np.float32)[None], 77, axis=0)
    bind_mats[:, :3, :3] = rot
    bind_mats[:, :3, 3] = pos
    print(f"bind: pos {pos.shape} rot {rot.shape} (units={bind.get('units')})")

    d = float(np.abs(pos - bj).max())
    print(f"mesh/bind_pose joint agreement: max |d| = {d:.4f} m")

    soma = np.load(NPZ, allow_pickle=True)
    joint_names = [str(x) for x in soma["rig_joint_names"]]
    lbs_idx = soma["lbs_indices"].astype(np.int32)
    lbs_w = soma["lbs_weights"].astype(np.float32)
    assert len(joint_names) == 77

    idx4 = lbs_idx[:, :4].astype(np.uint16)
    w4 = lbs_w[:, :4].astype(np.float32).copy()
    mask = idx4.astype(np.int16) < 0
    idx4[mask] = 0
    w4[mask] = 0.0
    sums = w4.sum(axis=1, keepdims=True)
    sums[sums == 0] = 1.0
    w4 /= sums

    sys.path.insert(0, str(AUTORIG))
    from soma_weight_transfer import _write_rigged_glb  # noqa: E402

    out_dir = RUNS / f"race_{a.name}"
    out_dir.mkdir(parents=True, exist_ok=True)
    tmp = _bare_glb(verts, faces, out_dir / "_bare.glb")
    src_gltf, src_bin = _read_glb(tmp)
    out = out_dir / "body.glb"
    _write_rigged_glb(
        source_gltf=src_gltf, source_bin=src_bin, source_pos=verts,
        joints=idx4, weights=w4, soma_joint_names=joint_names,
        soma_bind_aligned=bind_mats, output_path=str(out), t_align=None,
        preserve_texture=False)

    gltf, _ = _read_glb(out)
    skins = [(s.get("name"), len(s.get("joints", []))) for s in gltf.get("skins", [])]
    attrs = gltf["meshes"][0]["primitives"][0]["attributes"]
    n_verts = gltf["accessors"][attrs["POSITION"]]["count"]
    has_jw = "JOINTS_0" in attrs and "WEIGHTS_0" in attrs
    ok = bool(skins and skins[0] == ("SOMA-Mixamo", 77)
              and n_verts == 18056 and has_jw)
    print(f"wrote {out} ({out.stat().st_size // 1024} KB)")
    print(f"  skins={skins} verts={n_verts} rig_attrs={has_jw}")
    print("OK" if ok else "FAILED VERIFICATION")
    return 0 if ok else 2


if __name__ == "__main__":
    raise SystemExit(main())
