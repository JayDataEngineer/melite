"""bake.py — the anny base body recipe (pilot stroke 2, 2026-09-05).

Date: 2026-09-05 · Status: landed

Reproduces anny-base-body.glb, the DECLARED neutral body the anny card
resolves an empty body_glb to (model.py _ANNY_BASE_BODY — the sha in
that row pins THIS recipe's output). Run in the SERVING venv (the anny
package rides the multihmr2 pin in models/3d/nodes.yaml pip:):

    data/runtime/comfyui/.venv/bin/python bake.py [dest.glb]

Constructions rules (each load-bearing, live-probed 2026-09-05):
- create_fullbody_model(triangulate_faces=True) — the deprecated
  legacy-defaults constructor is deliberate: it preserves the neutral
  full-body rig; quad faces cannot ride a GLB turnaround.
- get_rest_vertices(ZERO coeffs) — the zero-coeff TEMPLATE is the
  model's mean body, the honest neutral (the phenotype vector maps
  into blendshape space; 0.5-fill phenotype ≈ mean anyway. Zero is
  exact, principled, and matches the published bytes).
- Z-up → Y-up (-90° about X) then feet-grounded + origin-centered —
  anny's skeleton is Z-up with the head at +Z (live-probed 2026-09-05:
  high-z vertex ring is compact = head); glTF/three.js/the turnaround
  renderers are Y-up. The FIRST published bake skipped the bake and
  rendered BLANK; the SECOND (+90°) rendered but HEAD-DOWN (upright
  verified only on 2026-09-05 via the commercial chain's pyrender
  turnaround: +90° maps +Z → -Y). The orientation fix is part of the
  recipe forever — re-bake + re-publish on ANY sign change (the HF
  sha pin in model.py must move with it).
"""

import sys
from pathlib import Path

import numpy as np
import trimesh

import anny  # serving venv: rides the multihmr2 dep pin


def bake(dest: Path) -> str:
    import hashlib

    import torch

    model = anny.create_fullbody_model(triangulate_faces=True)
    coeffs = torch.zeros((1, model.blendshapes.shape[0]), dtype=torch.float64)
    verts = np.asarray(model.get_rest_vertices(coeffs).numpy(), dtype=np.float64)[0]
    faces = np.asarray(
        model.faces.numpy() if hasattr(model.faces, "numpy") else model.faces,
        dtype=np.int64,
    )

    rot = trimesh.transformations.rotation_matrix(-np.pi / 2, [1, 0, 0])
    verts = trimesh.transform_points(verts, rot)
    verts[:, 1] -= verts[:, 1].min()
    verts[:, 0] -= (verts[:, 0].max() + verts[:, 0].min()) / 2
    verts[:, 2] -= (verts[:, 2].max() + verts[:, 2].min()) / 2

    trimesh.Trimesh(vertices=verts, faces=faces, process=False).export(str(dest))
    return hashlib.sha256(dest.read_bytes()).hexdigest()


if __name__ == "__main__":
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("anny-base-body.glb")
    print(bake(out))
