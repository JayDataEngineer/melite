#!/usr/bin/env python3
"""skin_pack.py — deterministic skin detail pack generator (skin-card stroke 1).

Date: 2026-09-06 · Status: landed stroke 1 (design docs/design/skin-card.md).

Seeded tiling albedo + normal detail maps (the meld skin_detail.py method:
periodic value-noise fbm, seamless in U and V) PLUS the kind sidecar JSON
the CharacterSkinController schema consumes. CPU-only: no queue slot, no GPU,
no network — same seed gives same bytes (pinned by the wall).

Usage: uv run python tools/skin_pack.py --kind keeper --out <dir> [--size 512]
"""

from __future__ import annotations

import argparse
import json
import os
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, 'py'))

import numpy as np
from PIL import Image

from skin_spec import KIND_TABLE, SKIN_SEED, SkinSpec, row_for, sidecar

ALBEDO_NAME = 'skin_detail_albedo.png'
NORMAL_NAME = 'skin_detail_normal.png'


def periodic_value_noise(size: int, cells: int, rng: np.random.Generator) -> np.ndarray:
    """Value noise on a torus: wraps at the edges, perfectly tiling."""
    gx = rng.random((cells, cells))
    xs = np.linspace(0, cells, size, endpoint=False)
    fx = xs - xs.astype(int) if cells > 1 else xs * 0
    xi = xs.astype(int) % cells
    xw = fx * fx * (3 - 2 * fx)
    i0 = xi
    i1 = (xi + 1) % cells
    ys = np.linspace(0, cells, size, endpoint=False)
    yi = ys.astype(int) % cells
    yw = ys - ys.astype(int)
    yw = yw * yw * (3 - 2 * yw)
    j0 = yi
    j1 = (yi + 1) % cells
    v00 = gx[np.ix_(j0, i0)]
    v01 = gx[np.ix_(j0, i1)]
    v10 = gx[np.ix_(j1, i0)]
    v11 = gx[np.ix_(j1, i1)]
    wx = xw[None, :]
    wy = yw[:, None]
    top = v00 * (1 - wx) + v01 * wx
    bot = v10 * (1 - wx) + v11 * wx
    return top * (1 - wy) + bot * wy


def fbm(size: int, base_cells: int, octaves: int, rng: np.random.Generator, persistence: float = 0.5) -> np.ndarray:
    acc = np.zeros((size, size))
    amp = 1.0
    total = 0.0
    for o in range(octaves):
        cells = base_cells * (2 ** o)
        if cells > size:
            break
        acc += amp * periodic_value_noise(size, cells, rng)
        total += amp
        amp *= persistence
    return acc / total


def generate_detail_maps(size: int, seed: int) -> tuple[np.ndarray, np.ndarray]:
    """Return (albedo, normal) uint8 arrays, size x size. Pure function of (size, seed)."""
    if int(seed) < 0:
        raise ValueError("seed %r is negative — the -1 RANDOM sentinel is minted compose-side (the skin card re-parses phase 2); a raw -1 here would mint inside deterministic bytes" % (seed,))
    rng = np.random.default_rng(seed)
    pores = fbm(size, 96, 2, rng)
    undulation = fbm(size, 12, 3, rng)
    fine_lines = fbm(size, 48, 1, rng)
    height = 0.45 * pores + 0.35 * undulation + 0.20 * fine_lines
    base = np.array([1.00, 0.930, 0.865])
    shade = 0.92 + 0.16 * height
    albedo = base[None, None, :] * shade[:, :, None]
    albedo = np.clip(albedo, 0, 1)
    gy = np.roll(height, -1, axis=0) - np.roll(height, 1, axis=0)
    gx = np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)
    strength = 2.2
    nx = -gx * strength * size / 96.0
    ny = -gy * strength * size / 96.0
    nz = np.ones_like(height)
    nlen = np.sqrt(nx ** 2 + ny ** 2 + nz ** 2)
    nx /= nlen
    ny /= nlen
    nz /= nlen
    normal = np.stack([nx, ny, nz], axis=-1) * 0.5 + 0.5
    return (albedo * 255).astype(np.uint8), (normal * 255).astype(np.uint8)


def write_pack(out_dir: str, spec: SkinSpec) -> dict[str, str]:
    """Generate + write the pack. Spec construction already validated; KeyError names bad kinds."""
    row = row_for(spec.kind)
    albedo, normal = generate_detail_maps(spec.size, spec.seed)
    os.makedirs(out_dir, exist_ok=True)
    albedo_path = os.path.join(out_dir, ALBEDO_NAME)
    normal_path = os.path.join(out_dir, NORMAL_NAME)
    sidecar_path = os.path.join(out_dir, spec.kind + '.json')
    Image.fromarray(albedo, 'RGB').save(albedo_path)
    Image.fromarray(normal, 'RGB').save(normal_path)
    with open(sidecar_path, 'w', encoding='utf-8') as fh:
        json.dump(sidecar(spec, row), fh, indent=2, sort_keys=True)
        fh.write('\n')
    return {'albedo': albedo_path, 'normal': normal_path, 'sidecar': sidecar_path}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description='Deterministic skin detail pack generator.')
    parser.add_argument('--kind', required=True, help='Kind id (one of the 20 KIND_TABLE rows).' )
    parser.add_argument('--out', required=True, help='Output directory.')
    parser.add_argument('--size', type=int, default=512, help='Map edge in px (256/512/1024/2048).' )
    parser.add_argument('--seed', type=int, default=SKIN_SEED, help='Deterministic seed.')
    args = parser.parse_args(argv)
    try:
        spec = SkinSpec(kind=args.kind, size=args.size, seed=args.seed)
    except Exception as exc:
        print('skin_pack: spec refused: %s' % (exc,), file=sys.stderr)
        return 2
    try:
        paths = write_pack(args.out, spec)
    except KeyError as exc:
        print('skin_pack: %s' % (exc,), file=sys.stderr)
        return 2
    print('wrote %s + %s + %s' % (paths['albedo'], paths['normal'], paths['sidecar']))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
