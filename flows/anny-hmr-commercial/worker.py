"""commercial_chain.py — the commercial-chain worker.

Runs in the provisioned anny-commercial venv (data/runtime/anny-
commercial/, materialized by `uv run python tools/provision.py
commercial`). The ComfyUI node Sam3dBodyImageToAnny spawns it:

    python commercial_chain.py <photo> <out_dir> [person_index]

Chain (design record docs/design/commercial-estimator-chain.md):
  photo → torchvision FasterRCNN person boxes (external bboxes —
        SAM 3D Body's own vitdet/detectron2 stack, pinned 2024,
        mislabels under torch 2.10: people → class 77, its internal
        class-0 filter finds nobody; process_one_image takes
        external bboxes by design)
      → SAM 3D Body (Meta SAM License, operator-accepted 2026-09-05)
      → MHR params → parquet row (mhr2soma's schema)
      → mhr2soma (NVlabs SOMA-X, Apache 2.0) → SOMA npz
      → convert_identity_backend --target-backend anny → anny npz
        (phenotype + local-change rows; conversion_vertex_error is
        the optimizer's own bind-pose fit diagnostic)
      → fitted bind-pose GLB, grounded Y-up (anny native Z-up →
        +90° about X, feet on the ground, origin-centered)

Prints PROGRESS lines (the node streams them to the ComfyUI log);
exits non-zero with the failing stage's stderr surfaced by the node.
"""

import subprocess
import sys
import time
from pathlib import Path

import numpy as np

SOMAX = Path(__file__).resolve().parent / "SOMA-X"
PY = sys.executable


def _stage(name: str, fn):
    t0 = time.time()
    print(f"PROGRESS {name}", flush=True)
    out = fn()
    print(f"PROGRESS {name} done {time.time() - t0:.1f}s", flush=True)
    return out


def person_boxes(photo: str) -> np.ndarray:
    """Torchvision FasterRCNN person detection (COCO, label 1)."""
    import cv2
    import torch
    from torchvision.models.detection import (
        FasterRCNN_ResNet50_FPN_Weights, fasterrcnn_resnet50_fpn)

    det = fasterrcnn_resnet50_fpn(
        weights=FasterRCNN_ResNet50_FPN_Weights.DEFAULT).cuda().eval()
    bgr = cv2.imread(photo)
    if bgr is None:
        raise RuntimeError(
            f"commercial chain: cannot read photo '{photo}'.")
    rgb = bgr[:, :, ::-1].copy()
    t = torch.from_numpy(rgb.astype("float32") / 255.0).permute(2, 0, 1)
    with torch.no_grad():
        out = det([t.cuda()])[0]
    keep = (out["labels"] == 1) & (out["scores"] > 0.5)
    boxes = out["boxes"][keep].cpu().numpy()
    del det
    torch.cuda.empty_cache()
    return boxes


def main(photo: str, out_dir: Path, person_index: int = 0) -> int:
    out_dir.mkdir(parents=True, exist_ok=True)

    # ── 1. person boxes + SAM 3D Body: photo → MHR params ────────────────
    def _s3db():
        sys.path.insert(0, str(Path(__file__).resolve().parent
                                / "sam-3d-body"))
        from notebook.utils import setup_sam_3d_body

        boxes = person_boxes(photo)
        if len(boxes) <= person_index:
            raise RuntimeError(
                f"commercial chain: torchvision found {len(boxes)} "
                f"person(s) — index {person_index} out of range. Feed a "
                "photo with a visible person.")
        print(f"PROGRESS person_boxes {boxes.round().astype(int).tolist()}",
              flush=True)

        est = setup_sam_3d_body(
            hf_repo_id="facebook/sam-3d-body-dinov3", device="cuda")
        res = est.process_one_image(photo, bboxes=boxes)
        if len(res) <= person_index:
            raise RuntimeError(
                f"SAM 3D Body returned {len(res)} person result(s) — "
                f"index {person_index} out of range.")
        p = res[person_index]
        shape = np.asarray(p["shape_params"]).flatten().astype("float32")
        mhrp = np.asarray(p["mhr_model_params"]).flatten().astype("float32")
        if shape.shape[0] != 45 or mhrp.shape[0] != 204:
            raise RuntimeError(
                f"unexpected MHR param shapes {shape.shape}/{mhrp.shape} "
                "(expected 45/204) — SAM 3D Body output contract drift.")
        np.savez(out_dir / "mhr_params.npz", shape_params=shape,
                 model_params=mhrp, persons=len(res))
        return shape, mhrp

    shape, mhrp = _stage("sam3d_body", _s3db)

    # ── 2. parquet row (mhr2soma's schema) ────────────────────────────────
    import pandas as [REDACTED 2026-11-05]

    pq = out_dir / "sam3d.parquet"
    [REDACTED 2026-11-05].DataFrame({
        "mhr_valid": [True],
        # [REDACTED 2026-11-05].Series wrapping keeps cells as bare ndarrays — list-wrapped
        # cells break mhr2soma's np.stack (live-probed 2026-09-05)
        "shape_params": [REDACTED 2026-11-05].Series([shape]),
        "model_params": [REDACTED 2026-11-05].Series([mhrp]),
    }).to_parquet(pq)

    # ── 3. mhr2soma ────────────────────────────────────────────────────────
    soma_npz = out_dir / "soma.npz"

    def _m2s():
        r = subprocess.run(
            # --no-render: the tool's render block feeds the inversion's
            # 78-joint public-space rotations into the 110-joint high-LOD
            # skinning and crashes AFTER the npz is saved; the chain
            # needs only the npz (live-probed 2026-09-05).
            [PY, "-m", "tools.mhr2soma", "--input", str(pq),
             "--output-npz", str(soma_npz), "--no-render"],
            cwd=str(SOMAX), capture_output=True, text=True)
        if r.returncode != 0:
            print(r.stderr[-2000:], file=sys.stderr)
            raise RuntimeError("mhr2soma failed (see stderr above)")
        return None

    _stage("mhr2soma", _m2s)

    # ── 4. convert → anny ──────────────────────────────────────────────────
    anny_npz = out_dir / "anny_params.npz"

    def _conv():
        r = subprocess.run(
            [PY, "-m", "tools.convert_identity_backend", str(soma_npz),
             str(anny_npz), "--target-backend", "anny"],
            cwd=str(SOMAX), capture_output=True, text=True)
        if r.returncode != 0:
            print(r.stderr[-2000:], file=sys.stderr)
            raise RuntimeError("convert_identity_backend failed")
        return None

    _stage("convert_anny", _conv)
    err = float(np.load(anny_npz)["conversion_vertex_error"][0])
    print(f"PROGRESS anny_bind_pose_vertex_error {err:.5f}", flush=True)

    # ── 5. fitted GLB (grounded Y-up) ──────────────────────────────────────
    def _bake():
        import torch
        import trimesh
        sys.path.insert(0, str(SOMAX))
        from soma.body.identity_model import AnnySimplified
        import anny

        m = anny.create_fullbody_model(
            all_phenotypes=True, local_changes=True,
            remove_unattached_vertices=True)
        wrapper = AnnySimplified(m, torch.device("cpu"))
        d = np.load(anny_npz)
        verts = wrapper(
            phenotype_kwargs=torch.from_numpy(d["identity_coeffs"]).float(),
            local_changes_kwargs=torch.from_numpy(d["scale_params"]).float(),
        )
        verts = np.asarray(verts.detach())[0].astype(np.float64)
        faces = np.asarray(
            m.faces.numpy() if hasattr(m.faces, "numpy") else m.faces,
            dtype=np.int64)
        # anny native is Z-up with the head at +Z (live-probed: head
        # ring compact at z max). -90° about X maps +Z → +Y (head UP);
        # the estate bake.py's +90° is a live-proven sign bug (renders
        # head-down) — do NOT copy it.
        rot = trimesh.transformations.rotation_matrix(-np.pi / 2, [1, 0, 0])
        verts = trimesh.transform_points(verts, rot)
        verts[:, 1] -= verts[:, 1].min()
        verts[:, 0] -= (verts[:, 0].max() + verts[:, 0].min()) / 2
        verts[:, 2] -= (verts[:, 2].max() + verts[:, 2].min()) / 2
        out = out_dir / "commercial_body.glb"
        trimesh.Trimesh(vertices=verts, faces=faces,
                        process=False).export(str(out))
        ext = (verts.max(0) - verts.min(0)).round(3).tolist()
        print(f"PROGRESS glb {out.name} extent {ext}", flush=True)
        return out

    glb = _stage("bake_glb", _bake)
    import json
    print(json.dumps({
        "glb": str(glb),
        "anny_params": str(anny_npz),
        "vertex_error": err,
    }), flush=True)
    return 0


def _warmup() -> int:
    """Provision-time model load: caches S3DB + detector weights."""
    sys.path.insert(0, str(Path(__file__).resolve().parent / "sam-3d-body"))
    from notebook.utils import setup_sam_3d_body
    setup_sam_3d_body(
        hf_repo_id="facebook/sam-3d-body-dinov3", device="cuda")
    # torchvision detector weights (cached; construction downloads)
    from torchvision.models.detection import (
        FasterRCNN_ResNet50_FPN_Weights, fasterrcnn_resnet50_fpn)
    fasterrcnn_resnet50_fpn(
        weights=FasterRCNN_ResNet50_FPN_Weights.DEFAULT).cuda().eval()
    print("PROGRESS warmup complete", flush=True)
    return 0


if __name__ == "__main__":
    import os

    if len(sys.argv) == 3:
        sys.exit(main(sys.argv[1], Path(sys.argv[2]),
                      int(os.environ.get("PERSON_INDEX", "0"))))
    if len(sys.argv) == 4:
        sys.exit(main(sys.argv[1], Path(sys.argv[2]),
                      int(sys.argv[3])))
    if len(sys.argv) == 2 and sys.argv[1] == "--warmup":
        sys.exit(_warmup())
    print("usage: commercial_chain.py <photo> <out_dir> [person_index] "
          "| --warmup", file=sys.stderr)
    sys.exit(2)
