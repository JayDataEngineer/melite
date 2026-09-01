#!/usr/bin/env python3
"""Add orphan LoadImage.1..9 nodes to all _t4r template files.

These orphan nodes are needed for multi-image reference support:
when the compose plugin wires identity refs or per-call refs, it
injects LoadImage.<i>.image and ref_images.ref_image_<i> wiring
into the template. The orphan nodes provide the placeholder slots
that ComfyUI's Autogrow mechanism can pick up.

Each orphan is a deep copy of LoadImage.0 (same class_type, same
inputs shape). They are never executed until a wiring key points
at them.

Usage: python3 tools/add_t4r_orphan_loadimages.py
"""
import json
import os
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TPL_DIR = os.path.join(REPO, "plugins", "comfyui", "models", "video", "h3-timeline")


def main():
    for wi in range(1, 5):
        path = os.path.join(TPL_DIR, "window%d_t4r.json" % wi)
        if not os.path.exists(path):
            print("SKIP: %s not found" % path)
            continue
        with open(path) as f:
            data = json.load(f)

        li0 = data.get("LoadImage.0")
        if li0 is None:
            print("WARNING: no LoadImage.0 in %s" % path)
            continue

        added = 0
        for i in range(1, 10):
            nid = "LoadImage.%d" % i
            if nid in data:
                continue
            import copy
            data[nid] = copy.deepcopy(li0)
            added += 1

        with open(path, "w") as f:
            json.dump(data, f, indent=2)
            f.write("\n")

        print("%s: added %d orphan LoadImage nodes" % (os.path.basename(path), added))


if __name__ == "__main__":
    main()
