#!/usr/bin/env python3
"""pack_sprites.py — slice a sprite sheet, trim, pack an atlas (CPU only).

sheet.png --cols N --rows M -o outdir [--trim] [--name walk]
-> frames/<name>_NN.png, <name>_atlas.png, <name>_rows.json

Fails (exit 2) when background removal obviously failed: any frame fully
transparent, or sheet alpha coverage < 5%. That failure is the retry
trigger for the lane (retry-once, new seed).
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image


def alpha_coverage(im: Image.Image) -> float:
    a = np.asarray(im.convert("RGBA"))[:, :, 3]
    return float((a > 8).mean())


def trim(arr: np.ndarray, pad: int = 1) -> np.ndarray:
    a = arr[:, :, 3] > 8
    if not a.any():
        return arr
    ys, xs = np.where(a)
    y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad + 1, arr.shape[0])
    x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad + 1, arr.shape[1])
    return arr[y0:y1, x0:x1]


def shelf_pack(frames: list[np.ndarray]) -> tuple[np.ndarray, list[dict]]:
    """Simple left-to-right shelf packer (good enough for walk cycles
    and small tile sets; rows break when width would exceed the max).
    """
    max_w = max(f.shape[1] for f in frames)
    total_w = sum(f.shape[1] for f in frames) + len(frames)
    width = min(max(1024, max_w), max(total_w, max_w))
    x = y = shelf_h = 0
    rows, positions = [], []
    for f in frames:
        if x + f.shape[1] > width:
            x = 0
            y += shelf_h + 1
            shelf_h = 0
        positions.append((x, y))
        rows.append((f, x, y))
        x += f.shape[1] + 1
        shelf_h = max(shelf_h, f.shape[0])
    height = y + shelf_h
    atlas = np.zeros((height, width, 4), dtype=np.uint8)
    meta = []
    for f, px, py in rows:
        atlas[py:py + f.shape[0], px:px + f.shape[1]] = f
        meta.append({"x": px, "y": py, "w": int(f.shape[1]), "h": int(f.shape[0])})
    return atlas, meta


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("sheet")
    ap.add_argument("--cols", type=int, required=True)
    ap.add_argument("--rows", type=int, required=True)
    ap.add_argument("-o", "--out", required=True)
    ap.add_argument("--name", default="sheet")
    ap.add_argument("--trim", action="store_true")
    a = ap.parse_args()

    im = Image.open(a.sheet).convert("RGBA")
    W, H = im.size
    cw, ch = W // a.cols, H // a.rows
    if cw < 4 or ch < 4:
        print(f"REFUSED: cell {cw}x{ch} too small for {W}x{H} / {a.cols}x{a.rows}")
        return 1

    cov = alpha_coverage(im)
    if cov < 0.05:
        print(f"FAIL: sheet alpha coverage {cov:.3f} < 0.05 — background removal failed")
        return 2

    out = Path(a.out)
    (out / "frames").mkdir(parents=True, exist_ok=True)
    arr = np.asarray(im)
    frames, dead = [], []
    for r in range(a.rows):
        for c in range(a.cols):
            cell = arr[r * ch:(r + 1) * ch, c * cw:(c + 1) * cw]
            if a.trim:
                cell = trim(cell)
            if not (cell[:, :, 3] > 8).any():
                dead.append((r, c))
                continue
            frames.append(cell)

    if dead:
        print(f"FAIL: {len(dead)} fully-transparent frames at {dead[:6]}...")
        return 2

    for i, f in enumerate(frames):
        Image.fromarray(f).save(out / "frames" / f"{a.name}_{i:02d}.png")

    atlas, meta = shelf_pack(frames)
    Image.fromarray(atlas).save(out / f"{a.name}_atlas.png")
    rows = {f"{a.name}_{i:02d}": m for i, m in enumerate(meta)}
    report = {
        "source": str(a.sheet),
        "grid": [a.cols, a.rows],
        "cell": [cw, ch],
        "frames": len(frames),
        "alpha_coverage": round(cov, 4),
        "atlas": [int(atlas.shape[1]), int(atlas.shape[0])],
        "frames_meta": rows,
    }
    (out / f"{a.name}_rows.json").write_text(json.dumps(report, indent=2))
    print(json.dumps({k: report[k] for k in ("grid", "cell", "frames", "alpha_coverage", "atlas")}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
