#!/usr/bin/env python3
"""THE SECOND-DRIVE RULE, walled (operator order, standing):
ALL AI model weights live on the second drive (/mnt/data — the
persistent weights volume). The system drive carries code and
fixtures only.

Two violation classes this wall refuses:
  1. WEIGHT BLOBS outside /mnt/data — any model-extension file over
     the floor (50 MB) living in the repo tree, the runtime, or the
     home dir. Weights are POINTED at (extra_model_paths.yaml,
     symlinks, env-configured roots), never copied to the system
     drive. The seedvr2 pack auto-download (2026-09-04: the canary's
     first use pulled 6.32 GB into data/runtime/comfyui/models/
     because the pack's `seedvr2` folder category was unregistered)
     is the precedent: the fix was DECLARING the category so the
     pack DISCOVERS the volume copy instead of downloading.
  2. SILENT REGROWTH — the same pack (or a sibling) downloading
     again after a cache clear. The wall runs over the LIVE dirs
     every time; a re-download fails it within one CI pass.

Documented carve-outs (checked, not skipped silently — the wall
FAILS if a carve-out's justification goes stale by the carve-out
itself disappearing):
  - data/runtime/kimodo/weights/generated/llm2vec-text-bundle —
    DERIVED build output (30+ layer ggufs the kimodo generator
    emits from the LLM2Vec base, which itself lives on the volume).
    15 GB of regenerable build product, not source weights; blocked
    from the volume by capacity (12 G free < 15 G) until the
    operator prunes or expands. The SOURCE weights
    (weights/models/) ARE on the volume — the local path is a
    symlink (asserted below).

Script-form wall (the estate's law): python3
tests/test_models_on_second_drive.py
"""

import os
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SECOND_DRIVE_ROOT = "/mnt/data"

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

# the pointer artifacts that MUST exist (the moved-weights contract)
_POINTERS = {
    os.path.join(REPO, "data/runtime/kimodo/weights/models"):
        "/mnt/data/models/motion/kimodo/models",
    os.path.expanduser("~/.cache/anny"):
        "/mnt/data/models/3d/anny-cache",
}


def _blobs(root):
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


def main():
    fails = 0

    def check(ok, label, detail=""):
        nonlocal fails
        print("  %s  %s%s" % ("ok " if ok else "FAIL", label,
                              (" — " + detail) if detail else ""))
        if not ok:
            fails += 1

    print("second-drive rule: model blobs >%dMB must live under %s"
          % (_FLOOR_MB, SECOND_DRIVE_ROOT))

    for root in _SCAN_ROOTS:
        if not os.path.isdir(root):
            continue
        bad = [p for p in _blobs(root)
               if not os.path.realpath(p).startswith(SECOND_DRIVE_ROOT)
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
        if ptr == os.path.expanduser("~/.cache/anny"):
            ok = (os.path.islink(ptr)
                  and os.path.realpath(ptr) == target)
        else:
            ok = (os.path.islink(ptr)
                  and os.path.realpath(ptr) == target
                  and os.path.isdir(target))
        check(ok, "pointer %s → %s holds" % (ptr, target))

    print("PASS" if fails == 0 else "FAIL %d" % fails)
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
