// provision-commercial — anny-commercial runtime (SOMA-X/sam-3d-body venv + patches).
// Split from scripts/provision.ts (pure move — no logic changes).

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO, die, info } from "./provision-shared.ts";

// ── anny-commercial runtime ──────────────────────────────────────
// docs/design/commercial-estimator-chain.md — SAM 3D Body → MHR →
// SOMA → anny. Its OWN venv: torch cu130.

export const SOMAX_REF = "d29dbe5a3f5a";     // NVlabs/SOMA-X, probed 2026-09-05
export const S3DB_REF = "b5c765a0d89d";      // facebookresearch/sam-3d-body
export const COM_DEPS: readonly string[] = [
  "pytorch-lightning", "pyrender", "opencv-python-headless", "yacs",
  "scikit-image", "einops", "timm", "dill", "pandas", "pyarrow", "rich",
  "hydra-core", "hydra-colorlog", "pyrootutils", "chump",
  "networkx==3.2.1", "roma", "joblib", "appdirs", "cython", "jsonlines",
  "loguru", "optree", "fvcore", "pycocotools", "xtcocotools",
  "tensorboard", "huggingface_hub", "braceexpand", "mhr", "warp-lang",
  "usd-core", "rtree", "anny==0.6.0", "setuptools==78.1.0",
];
export const COM_NVIDIA_LIB = "lib/python3.11/site-packages/nvidia/cu13/lib";

export interface SomaxPatch {
  rel: string;
  bad: string;
  good: string;
}

// The pinned SOMA-X friction patches (live-probed 2026-09-05),
// transcribed from the retired tools/provision.py _SOMAX_PATCHES.
// Each entry refuses on drift (expected text gone = upstream may
// have fixed it; re-pin SOMAX_REF and drop the entry) — never
// silently.
export const SOMAX_PATCHES: readonly SomaxPatch[] = [
  {
    // 1. pose_inversion.py:1053 lazy `from .body import SOMALayer`
    //    (→ soma.fitting.body, does not exist); line 27's absolute
    //    form is correct. Upstream typo kills mhr2soma at runtime.
    rel: "soma/fitting/pose_inversion.py",
    bad: "            from .body import SOMALayer",
    good: "            from ..body import SOMALayer",
  },
  {
    // 2. conversion_utils.export_soma_npz: PoseInversion returns
    //    rotations in the PUBLIC rig space (78 joints incl. Root)
    //    but the export removes orients from the full internal rig
    //    (110) — hard crash. Poses are NOT consumed downstream
    //    (convert_identity_backend rebuilds the bind pose from the
    //    layer), so consistent public-space shapes are sufficient.
    rel: "tools/conversion_utils.py",
    bad: "    orient = soma._t_pose_orient.to(device=rotations.device, dtype=rotations.dtype)\n" +
      "    orient_parent_T = soma._t_pose_orient_parent_T.to(\n" +
      "        device=rotations.device, dtype=rotations.dtype\n" +
      "    )\n" +
      "    rel_rotations = remove_joint_orient_local(rotations, orient, orient_parent_T)",
    good: "    orient = soma._t_pose_orient.to(device=rotations.device, dtype=rotations.dtype)\n" +
      "    orient_parent_T = soma._t_pose_orient_parent_T.to(\n" +
      "        device=rotations.device, dtype=rotations.dtype\n" +
      "    )\n" +
      "    joint_names = list(soma.rig_data[\"joint_names\"])\n" +
      "    if (\n" +
      "        orient.shape[0] != rotations.shape[1]\n" +
      "        and hasattr(soma, \"public_joint_names\")\n" +
      "        and len(soma.public_joint_names) == rotations.shape[1]\n" +
      "    ):\n" +
      "        from soma.geometry.rig_utils import precompute_joint_orient\n" +
      "\n" +
      "        bind_pub = soma.public_bind_transforms_world().to(\n" +
      "            device=rotations.device, dtype=rotations.dtype)\n" +
      "        if bind_pub.dim() == 4:  # cached binds are batched (B,J,4,4)\n" +
      "            bind_pub = bind_pub[0]\n" +
      "        parents = soma.public_joint_parent_ids\n" +
      "        if torch.is_tensor(parents):\n" +
      "            parents = parents.to(device=rotations.device)\n" +
      "        orient, orient_parent_T = precompute_joint_orient(\n" +
      "            bind_pub, parents)\n" +
      "        joint_names = list(soma.public_joint_names)\n" +
      "    rel_rotations = remove_joint_orient_local(rotations, orient, orient_parent_T)",
  },
  {
    rel: "tools/conversion_utils.py",
    bad: "        poses_rotvec,\n" +
      "        save_transl,\n" +
      "        joint_names=list(soma.rig_data[\"joint_names\"]),",
    good: "        poses_rotvec,\n" +
      "        save_transl,\n" +
      "        joint_names=joint_names,",
  },
  {
    rel: "tools/conversion_utils.py",
    bad: "from soma.geometry.rig_utils import remove_joint_orient_local",
    good: "import torch\n\n" +
      "from soma.geometry.rig_utils import remove_joint_orient_local",
  },
  {
    // 3. mhr2soma main: warm the identity cache before the npz
    //    export (the render loop's own pattern) — the export's
    //    public-bind read needs it and the inversion leaves it cold.
    rel: "tools/mhr2soma.py",
    bad: "    # --- Save output ---\n" +
      "    if args.output_npz:\n" +
      "        extra_arrays = {\"bone_length_flexibles\": bone_length_flexibles}",
    good: "    # --- Save output ---\n" +
      "    if args.output_npz:\n" +
      "        soma.prepare_identity(\n" +
      "            all_ic, all_sp,\n" +
      "            kwargs={\"bone_length_flexibles\": all_bl})\n" +
      "        extra_arrays = {\"bone_length_flexibles\": bone_length_flexibles}",
  },
];

export function sha16File(p: string): string {
  return createHash("sha256").update(readFileSync(p)).digest("hex")
    .slice(0, 16);
}

export function patchSomax(checkout: string): void {
  // The pinned SOMA-X friction patches (live-probed 2026-09-05).
  // Each entry refuses on drift — never silently.
  for (const { rel, bad, good } of SOMAX_PATCHES) {
    const p = join(checkout, rel);
    const text = readFileSync(p, "utf8");
    if (!text.includes(bad)) {
      if (text.includes(good)) {
        info("[commercial] patch already present in " + rel + " — " +
          "upstream fixed it; drop the entry + re-pin");
        continue;
      }
      die("SOMA-X patch drift: expected text not found in " + rel +
        " — upstream moved; re-pin SOMAX_REF and rewrite the patches file");
    }
    writeFileSync(p, text.replace(bad, good));
    info("[commercial] patched SOMA-X " + rel);
  }
}

export function cmdCommercial(warmup: boolean): void {
  // Materialize data/runtime/anny-commercial (venv + checkouts +
  // worker). Idempotent: a healthy runtime is left alone.
  const root = join(REPO, "data", "runtime", "anny-commercial");
  const venvPy = join(root, ".venv", "bin", "python");
  const marker = join(root, ".provisioned");
  const expected = [venvPy, join(root, "commercial_chain.py"),
    join(root, "SOMA-X", "tools", "mhr2soma.py"),
    join(root, "sam-3d-body", "notebook", "utils.py")];
  if (existsSync(marker) && expected.every((p) => existsSync(p))) {
    info("[commercial] runtime healthy at " + root + " — nothing to do");
    return;
  }
  if (readdirSync(root).length > 0 && !existsSync(marker)) {
    die(root + " exists but is not provisioned — remove it first " +
      "(a half-built runtime is never patched in place)");
  }
  const run = (cmd: string[], cwd?: string): void => {
    info("[commercial] " + cmd.slice(0, 6).join(" "));
    const r = spawnSync(cmd[0], cmd.slice(1),
      { cwd, encoding: "utf8", timeout: 1800000 });
    if (r.status !== 0) {
      die("provision step failed (" + cmd[0] + " …):\n" +
        (r.stdout ?? "").slice(-800) + "\n" + (r.stderr ?? "").slice(-1500));
    }
  };
  mkdirSync(root, { recursive: true });
  for (const [url, ref, name] of [
    ["https://github.com/NVlabs/SOMA-X.git", SOMAX_REF, "SOMA-X"],
    ["https://github.com/facebookresearch/sam-3d-body.git", S3DB_REF,
      "sam-3d-body"],
  ]) {
    run(["git", "clone", "-q", url, join(root, name)]);
    run(["git", "-C", join(root, name), "checkout", "-q", ref]);
  }
  patchSomax(join(root, "SOMA-X"));
  run(["uv", "venv", "-q", "--python", "3.11", join(root, ".venv")]);
  const uv = ["uv", "pip", "install", "--python", venvPy];
  run([...uv, "-q", "torch==2.10.0", "torchvision",
    "--index-url", "https://download.pytorch.org/whl/cu130"]);
  run([...uv, "-q", ...COM_DEPS]);
  run([...uv, "-q",
    "git+https://github.com/facebookresearch/detectron2.git@a1ce2f9",
    "--no-build-isolation", "--no-deps"]);
  run([...uv, "-q", "-e", join(root, "SOMA-X"),
    "git+https://github.com/microsoft/MoGe.git"]);
  copyFileSync(join(REPO, "flows", "anny-hmr-commercial", "worker.py"),
    join(root, "commercial_chain.py"));
  copyFileSync(join(REPO, "flows", "anny-params", "bake_params.py"),
    join(root, "bake_params.py"));
  if (warmup) {
    // The warmup runner is flows-lane Python (condemned with
    // S-flows) — it is orchestration-invoked here, never estate
    // code this tool owns. Until the flows lane lands its TS
    // warmup, --no-warmup provisions everything but the weight
    // cache (weights warm on first use).
    const nvidiaLib = join(root, ".venv", COM_NVIDIA_LIB);
    const env: Record<string, string> = {};
    for (const [k, v] of Object.entries(process.env)) {
      if (v !== undefined) env[k] = v;
    }
    env.LD_LIBRARY_PATH = nvidiaLib;
    info("[commercial] warmup (downloads S3DB + detector weights)");
    const r = spawnSync(venvPy, [join(root, "commercial_chain.py"),
      "--warmup"], { cwd: root, env, encoding: "utf8", timeout: 3600000 });
    if (r.status !== 0) {
      die("warmup failed (weights unreachable or model drift):\n" +
        (r.stdout ?? "").slice(-600) + "\n" + (r.stderr ?? "").slice(-1200));
    }
  } else {
    info("[commercial] warmup skipped (--no-warmup — weights warm " +
      "on first use)");
  }
  writeFileSync(marker,
    "SOMA-X@" + SOMAX_REF + " sam-3d-body@" + S3DB_REF +
    " torch=2.10.0+cu130\n" +
    "worker sha: " + sha16File(join(root, "commercial_chain.py")) + "\n" +
    "bake sha: " + sha16File(join(root, "bake_params.py")) + "\n" +
    "warmup: " + (warmup ? "done" : "pending") + "\n");
  info("[commercial] runtime provisioned at " + root);
  info("[commercial] node spawn env: LD_LIBRARY_PATH=" +
    join(root, ".venv", COM_NVIDIA_LIB));
}
