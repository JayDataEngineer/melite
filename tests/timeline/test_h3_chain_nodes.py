#!/usr/bin/env python3
"""h3_chain node law tests (2026-08-30 container edition).

RayH3SaveLatentTail / RayH3ChainLatentAV are executed DIRECTLY (no
ComfyUI) with a fake folder_paths module: the container-boundary
contract is the law here —

  * SAVE writes into the OUTPUT dir under a RELATIVE run-scoped path,
    returns BOTH files as UI outputs (so /history lists them and the
    gateway can /view them), and authors the .meta.json from the same
    grid math everything else uses.
  * CHAIN reads from the INPUT dir (the gateway's /upload landing zone)
    and REFUSES any seam whose uploaded meta disagrees with its own
    clamp (drift = hard error, never a silent splice).
  * Absolute paths are rejected loudly — the 2026-08-30 lesson: an
    absolute repo path writes into the container's overlay and the
    bytes never reach the host.

Run: python3 tests/timeline/test_h3_chain_nodes.py
"""
import json
import os
import sys
import types

import torch

REPO = os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__))))
NODES = os.path.join(REPO, "plugins/comfyui/custom_nodes",
                     "melite-h3-motion-nodes")

FAILS = []


def check(cond, label):
    print(("  PASS  " if cond else "  FAIL  ") + label)
    if not cond:
        FAILS.append(label)


class FakeNT:
    """Minimal stand-in for comfy's NestedTensor (tensors tuple)."""

    def __init__(self, tensors):
        self.tensors = tensors


def fake_latent(t_slots, a_frames, h=28, w=48):
    video = torch.randn(1, 24, t_slots, h, w)
    audio = torch.randn(1, 32, 2, a_frames)
    return {"samples": FakeNT((video, audio))}


def main():
    # fake folder_paths so the nodes resolve against tmp dirs
    out_dir = "/tmp/h3chain_test_output"
    in_dir = "/tmp/h3chain_test_input"
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(in_dir, exist_ok=True)
    fp = types.ModuleType("folder_paths")
    fp.get_output_directory = lambda: out_dir
    fp.get_input_directory = lambda: in_dir
    sys.modules["folder_paths"] = fp

    # fake comfy.nested_tensor for the chain node output
    comfy = types.ModuleType("comfy")
    nt_mod = types.ModuleType("comfy.nested_tensor")
    nt_mod.NestedTensor = FakeNT
    comfy.nested_tensor = nt_mod
    sys.modules["comfy"] = comfy
    sys.modules["comfy.nested_tensor"] = nt_mod

    sys.path.insert(0, NODES)
    import h3_chain

    print("-- save node: output-dir law")
    save = h3_chain.RayH3SaveLatentTail()
    src_latent = fake_latent(26, 347)   # 56f window: 26 slots
    ret = save.execute(src_latent, "run-x/window1_tail.pt", 6)

    pt = os.path.join(out_dir, "run-x", "window1_tail.pt")
    meta_p = pt + ".meta.json"
    check(os.path.exists(pt), "tail .pt written under output/<run>/")
    check(os.path.exists(meta_p), "tail .meta.json written next to it")
    blob = torch.load(pt, weights_only=True)
    check(blob["video"].shape[2] == 26, "tail carries full 26 slots")
    ui = ret["ui"]["outputs"]
    names = sorted(e["filename"] for e in ui)
    check(names == ["window1_tail.pt", "window1_tail.pt.meta.json"],
          "UI outputs list BOTH files %r" % names)
    check(all(e["subfolder"] == "run-x" and e["type"] == "output"
              for e in ui), "UI outputs carry subfolder+type=output")
    meta = json.load(open(meta_p))
    check(meta["carried_pixel_frames"] == 18,
          "meta carried_pixel_frames == 18 (carry 6 on 26 slots): %d"
          % meta["carried_pixel_frames"])
    check(meta["carried_video_slots"] == 6, "meta slots == 6")
    check(ret["result"][0] is src_latent, "passthrough latent unchanged")

    print("-- save node: absolute path is the container bug -> loud")
    try:
        save.execute(src_latent, "/tmp/abs_tail.pt", 6)
        check(False, "absolute path rejected")
    except ValueError as e:
        check("RELATIVE" in str(e), "absolute path rejected loudly: %s"
              % str(e)[:60])

    print("-- chain node: input-dir law + splice")
    # stage the tail (+meta) into the INPUT dir the way the gateway does
    import shutil
    os.makedirs(os.path.join(in_dir, "run-y"), exist_ok=True)
    shutil.copy(pt, os.path.join(in_dir, "run-y", "window1_tail.pt"))
    shutil.copy(meta_p, os.path.join(in_dir, "run-y",
                                     "window1_tail.pt.meta.json"))

    chain = h3_chain.RayH3ChainLatentAV()
    # a seam window's sampled tile (89 delivered + 18 carried = 107f
    # -> 32 slots); slot math is shape-agnostic, 27 exercises it fine
    tgt = fake_latent(27, 360)
    out = chain.execute(tgt, "run-y/window1_tail.pt", 6)[0]
    spliced = out["samples"].tensors[0]
    check(spliced.shape[2] == 27, "spliced window keeps 27 slots")
    check(torch.allclose(spliced[:, :, :6], blob["video"][:, :, -6:]),
          "head 6 slots are the tail's last 6, bit-exact")
    check(torch.allclose(spliced[:, :, 6:], tgt["samples"].tensors[0][:, :, :21]),
          "free slots are the target's head")
    vmask = out["noise_mask"].tensors[0]
    check(vmask.shape[2] == 27 and float(vmask[:, :, :6].max()) == 0.0,
          "carry mask zeroes the carried slots")

    print("-- chain node: uploaded meta drift = hard error")
    bad = json.load(open(meta_p))
    bad["carried_video_slots"] = 3
    with open(os.path.join(in_dir, "run-y", "window1_tail.pt.meta.json"),
              "w") as f:
        json.dump(bad, f)
    try:
        chain.execute(tgt, "run-y/window1_tail.pt", 6)
        check(False, "meta drift rejected")
    except ValueError as e:
        check("drift" in str(e), "meta drift rejected loudly: %s"
              % str(e)[:60])

    print("-- chain node: absolute path rejected (container law)")
    try:
        chain.execute(tgt, "/tmp/window1_tail.pt", 6)
        check(False, "absolute tail_path rejected")
    except ValueError as e:
        check("RELATIVE" in str(e), "absolute tail_path rejected loudly")

    print("-- clamp law: carry larger than the window clamps, not breaks")
    small = fake_latent(5, 80)
    ret2 = save.execute(small, "run-x/tiny_tail.pt", 32)
    m2 = json.load(open(os.path.join(out_dir, "run-x",
                                     "tiny_tail.pt.meta.json")))
    check(m2["carried_video_slots"] == 4,
          "carry 32 on 5 slots clamps to 4 (S-1): %d"
          % m2["carried_video_slots"])

    print()
    if FAILS:
        print("%d FAILURES" % len(FAILS))
        return 1
    print("all h3_chain node law checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
