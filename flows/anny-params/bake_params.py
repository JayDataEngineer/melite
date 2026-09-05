"""bake_params.py — preset params → grounded Y-up body GLB.

Usage: python bake_params.py <params.json> <out.glb>

The params→GLB instantiation behind the preset-load verb
(flows/anny-params: AnnyParamsToGlb shells this in the provisioned
anny-commercial runtime — the Sam3dBodyImageToAnny out-of-process
pattern). Runs where anny + soma install (the serving venv has
neither soma nor the SOMA-X checkout on its path).

params.json is the canonical node dialect (CharacterPreset.
canonical_json — sorted keys, compact):

  authored:  {dialect, phenotype:[11], local_changes:{name:value}}
             full anny model (all_phenotypes + local_changes), morph
             vector in local_change_labels order. An UNKNOWN morph
             name refuses LOUD — a silent skip would bake the wrong
             body (never a silent downgrade).
  estimated: {dialect, phenotype:[6], scale:[139]} — verbatim
             estimator output through the SAME AnnySimplified path
             the commercial worker bakes (bit-exact re-instantiation).

The bake matches the commercial worker exactly (full-model forward
→ -90° about X: anny native Z-up head-+Z → Y-up → feet grounded,
origin-centered). Prints PROGRESS lines + a final JSON {glb}.
"""

import json
import sys
from pathlib import Path

SOMAX = Path(__file__).resolve().parent / "SOMA-X"


def _fail(msg: str) -> int:
    print("bake_params: %s" % msg, flush=True)
    return 1


def main(params_path: str, out_path: str) -> int:
    import numpy as np

    try:
        doc = json.loads(Path(params_path).read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        return _fail("cannot read params %r (%s)" % (params_path, e))
    if not isinstance(doc, dict):
        return _fail("params root must be an object")
    dialect = doc.get("dialect")
    ph = doc.get("phenotype")

    import torch
    import trimesh
    import anny

    if dialect == "authored":
        if not isinstance(ph, list) or len(ph) != 11:
            return _fail("authored phenotype wants 11 numbers")
        lc_doc = doc.get("local_changes")
        if not isinstance(lc_doc, dict):
            return _fail("authored local_changes must be an object")
        print("PROGRESS instantiate authored preset", flush=True)
        m = anny.create_fullbody_model(
            all_phenotypes=True, local_changes=True,
            remove_unattached_vertices=True)
        labels = list(m.local_change_labels)
        vec = torch.zeros(1, len(labels))
        for name, value in lc_doc.items():
            if name not in labels:
                return _fail(
                    "unknown morph %r (not in the installed anny "
                    "local_change_labels — refusing, never a silent "
                    "skip)" % (name,))
            try:
                fval = float(value)
            except (TypeError, ValueError):
                return _fail("morph %r value %r is not a number"
                             % (name, value))
            vec[0, labels.index(name)] = fval
        out = m(phenotype_kwargs=torch.tensor([ph]).float(),
                local_changes_kwargs=vec.float())
        verts = np.asarray(out["vertices"].detach())[0].astype(np.float64)
        faces = np.asarray(
            m.faces.numpy() if hasattr(m.faces, "numpy") else m.faces,
            dtype=np.int64)
    elif dialect == "estimated":
        if not isinstance(ph, list) or len(ph) != 6:
            return _fail("estimated phenotype wants 6 numbers")
        sc = doc.get("scale")
        if not isinstance(sc, list) or len(sc) != 139:
            return _fail("estimated scale wants 139 numbers")
        print("PROGRESS instantiate estimated params", flush=True)
        sys.path.insert(0, str(SOMAX))
        from soma.body.identity_model import AnnySimplified
        m = anny.create_fullbody_model(
            all_phenotypes=True, local_changes=True,
            remove_unattached_vertices=True)
        wrapper = AnnySimplified(m, torch.device("cpu"))
        verts = wrapper(
            phenotype_kwargs=torch.tensor([ph]).float(),
            local_changes_kwargs=torch.tensor([sc]).float())
        verts = np.asarray(verts.detach())[0].astype(np.float64)
        faces = np.asarray(
            m.faces.numpy() if hasattr(m.faces, "numpy") else m.faces,
            dtype=np.int64)
    else:
        return _fail("unknown dialect %r (want authored|estimated)"
                     % (dialect,))

    # commercial-worker bake, verbatim: -90° about X (native Z-up
    # head-+Z → Y-up), feet grounded, origin-centered. The estate
    # bake.py's +90° is a live-proven sign bug — do NOT copy it.
    rot = trimesh.transformations.rotation_matrix(-np.pi / 2, [1, 0, 0])
    verts = trimesh.transform_points(verts, rot)
    verts[:, 1] -= verts[:, 1].min()
    verts[:, 0] -= (verts[:, 0].max() + verts[:, 0].min()) / 2
    verts[:, 2] -= (verts[:, 2].max() + verts[:, 2].min()) / 2
    extent = (verts.max(0) - verts.min(0)).round(3).tolist()
    if extent[1] < 0.5 * max(extent[0], extent[2]):
        return _fail(
            "baked mesh is not plausibly a standing figure (extent %s)"
            % (extent,))
    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    trimesh.Trimesh(vertices=verts, faces=faces,
                    process=False).export(str(out))
    print("PROGRESS glb %s extent %s" % (out.name, extent), flush=True)
    print(json.dumps({"glb": str(out)}), flush=True)
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(sys.argv[1], sys.argv[2]))
