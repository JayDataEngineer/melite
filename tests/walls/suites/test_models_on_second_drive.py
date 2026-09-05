#!/usr/bin/env python3
"""THE WEIGHTS-LOCATION RULE, walled (operator orders, standing):
model weights live under the CONFIGURED roots — never on the
system drive — and the configuration is made AT THE ROOT OF THE
PROJECT (operator order 2026-09-04): `inference.config.json` at
the repo root owns the global models roots + per-engine bases for
the WHOLE estate (comfyui, kimodo, every engine), parsed by
py/estate_config.py — the ONE parser. Engine-level configs (the
comfyui endpoint) override only when their keys are explicitly set.

  models.read_root      — where weights live (absolute, required)
  models.download_root  — where NEW downloads land (absolute,
                          required; the same tree in this
                          deployment)
  engines.<name>.base   — per-engine subdir under the roots, or an
                          absolute override

tools/provision.py paths re-lays the download pointers (category
symlinks) against the CURRENT config on every run — writers
(comfy-cli, pack auto-download, core) land wherever the config
says.

Two violation classes this wall refuses:
  1. WEIGHT BLOBS outside the configured roots — any model-extension
     file over the floor (50 MB) living in the repo tree, the
     runtime, or the home dir. The seedvr2 pack auto-download
     (2026-09-04: 6.32 GB into data/runtime/comfyui/models/ before
     the category was declared) is the precedent.
  2. A HARDCODED SPOT — the wall itself must never name a disk
     location; it reads the root config through the ONE parser. If
     the configured roots sit on the system root filesystem, that
     is a misconfiguration and fails here too.

Script-form wall (the estate's law): python3
tests/walls/suites/test_models_on_second_drive.py
"""

import json
import os
import sys
from collections.abc import Iterator
from pathlib import Path

from _anchor import REPO
import estate_config  # noqa: E402  (the ONE parser)

ENDPOINT_CFG = os.path.join(
    REPO, "plugins/engines/comfyui/data/comfyui_endpoint.json")

# model-weight extensions; floor excludes fixtures (source.png,
# rigged_char.glb, drive_pose.mp4 are test inputs, not weights)
_EXTS = (".safetensors", ".gguf", ".ckpt", ".pth", ".pt", ".onnx",
         ".bin", ".tflite", ".engine")
_FLOOR_MB = 50

# scan roots on the SYSTEM drive (repo tree + runtime + home cache)
_SCAN_ROOTS = [
    REPO,
    os.path.expanduser("~/.cache"),
    "/opt",
]

# derived build output (regenerable; source lives on the volume)
_DERIVED_OK = {
    os.path.join(
        REPO, "data/runtime/kimodo/weights/generated/"
        "llm2vec-text-bundle"): "derived build product of the kimodo "
        "generator; source LLM2Vec base is on the volume",
    # run OUTPUT artifacts (films/pngs/glbs + the trelliscpp debug
    # dumps) — products of runs, never weight files; the OUTPUT dir
    # is the ephemeral artifact home by config (output_dir)
    os.path.join(REPO, "data/output"): "run-output artifacts "
    "(products of runs, not weights)",
    # the OLD RAY foreign docker's home (server at :18465) —
    # untouchable per the standing 18465 law; its input dumps are
    # that server's business, not this estate's weights
    "/opt/ComfyUI": "old foreign ray server territory (:18465 "
    "law — never touch)",
}

# pointer artifacts that MUST hold (moved weights resolve through
# them; the kimodo pointer target is declared here because kimodo
# sits outside the comfyui endpoint config)
_POINTERS = {
    os.path.join(REPO, "data/runtime/kimodo/weights/models"):
        "/mnt/data/models/motion/kimodo/models",
    os.path.expanduser("~/.cache/anny"):
        "/mnt/data/models/3d/anny-cache",
}


def configured_roots() -> tuple[str, str, dict[str, str]]:
    """The DECLARED roots — the wall never names a disk spot
    itself. Reads the ROOT config (inference.config.json) through
    the ONE parser, with the comfyui endpoint's explicit overrides
    layered exactly like bound_model_folders layers them."""
    endpoint = json.load(open(ENDPOINT_CFG)) if os.path.isfile(
        ENDPOINT_CFG) else {}
    overrides = {k: v for k, v in endpoint.items()
                 if k in ("model_base_path", "model_download_path")
                 and str(v).strip()}
    paths = estate_config.model_paths("comfyui",
                                      endpoint_overrides=overrides)
    base, dl = paths["read_root"], paths["download_root"]
    folders = endpoint.get("extra_model_folders") or {}
    cats = {
        "models/" + c: os.path.join(dl, s)
        for c, s in folders.items()
    }
    return base, dl, cats


def _blobs(root: str | Path) -> Iterator[str]:
    for dirpath, _dirs, files in os.walk(root):
        # never descend into venvs/build caches — not model homes
        head = os.path.basename(dirpath)
        if head in (".venv", "node_modules", "__pycache__", ".git"):
            _dirs[:] = []
            continue
        for f in files:
            if not f.lower().endswith(_EXTS):
                continue
            p = os.path.join(dirpath, f)
            try:
                if os.path.getsize(p) < _FLOOR_MB * 1024 * 1024:
                    continue
            except OSError:
                continue
            yield p


def main() -> int:
    fails = 0

    def check(ok: bool, label: str, detail: str = "") -> None:
        nonlocal fails
        print("  %s  %s%s" % ("ok " if ok else "FAIL", label,
                              (" — " + detail) if detail else ""))
        if not ok:
            fails += 1

    base, dl, cats = configured_roots()
    print("weights-location rule: blobs >%dMB must live under the "
          "CONFIGURED roots" % _FLOOR_MB)
    check(bool(base), "root config: models.read_root resolves",
          repr(base))
    check(bool(dl), "root config: models.download_root resolves",
          repr(dl))

    # the configured roots must not live on the system root fs
    # (the second-drive rule; checked against the CONFIG, not a
    # hardcoded spot)
    for name, root in (("models.read_root", base),
                       ("models.download_root", dl)):
        if not root:
            continue
        on_sys = os.path.samefile("/", os.sep)
        check(not root.startswith(("/",)) or _on_persistent(root),
              "%s (%s) is not on the system root fs" % (name, root))

    allowed_real = [os.path.realpath(r) for r in (base, dl) if r]
    for root in _SCAN_ROOTS:
        if not os.path.isdir(root):
            continue
        bad = [p for p in _blobs(root)
               if not any(os.path.realpath(p).startswith(a + os.sep)
                          for a in allowed_real)
               and not any(p.startswith(d) for d in _DERIVED_OK)]
        check(not bad, "%s carries no weight blobs" % root,
              "; ".join("%s (%.1f GB)" % (p, os.path.getsize(p) / 1e9)
                        for p in bad[:4]))

    # the carve-outs must still BE carve-outs (stale justification =
    # the wall says so — never a silent skip)
    for d, why in _DERIVED_OK.items():
        check(os.path.isdir(d), "carve-out %s still exists" % d,
              "gone — remove its entry here (the justification is "
              "stale): %s" % why)

    # the pointer contract: moved weights resolve through the pointer
    for ptr, target in _POINTERS.items():
        ok = (os.path.islink(ptr)
              and os.path.realpath(ptr) == target)
        check(ok, "pointer %s → %s holds" % (ptr, target))

    # the download pointers: every mapped category in the runtime
    # tree points at the CONFIGURED download root (writers land
    # where the config says — provision.py paths lays these)
    models_dir = os.path.join(REPO, "data/runtime/comfyui/models")
    for cat_rel, want in sorted(cats.items()):
        cat = cat_rel.split("/", 1)[1]
        local = os.path.join(models_dir, cat)
        ok = (os.path.islink(local)
              and os.path.realpath(local) == os.path.realpath(want))
        check(ok, "download pointer %s → %s (configured)" % (cat, want))

    print("PASS" if fails == 0 else "FAIL %d" % fails)
    return 1 if fails else 0


def _on_persistent(root: str) -> bool:
    """A configured root is persistent when it is NOT on the same
    filesystem as / (mountpoint differs somewhere along the path)."""
    try:
        return os.stat(os.path.dirname(root)).st_dev != os.stat("/").st_dev \
            or os.stat(root).st_dev != os.stat("/").st_dev
    except OSError:
        return False


if __name__ == "__main__":
    sys.exit(main())
