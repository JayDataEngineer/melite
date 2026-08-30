#!/usr/bin/env python3
# Silhouette + pixel-diff stats for gate render A/B sets.
# Usage: .venv/bin/python silhouette_stats.py <dir>   # expects v2_*.png / v3_*.png
import sys
from pathlib import Path

import numpy as np
from PIL import Image


def mask_of(p):
    im = np.asarray(Image.open(p).convert('RGB'), dtype=np.int16)
    corners = np.stack([im[2, 2], im[2, -3], im[-3, 2], im[-3, -3]])
    bg = corners.mean(axis=0)
    return (np.abs(im - bg).sum(axis=2) > 24), im


d = Path(sys.argv[1])
for v in ('front', 'left', 'back'):
    pa = d / ('v2_' + v + '.png')
    pb = d / ('v3_' + v + '.png')
    if not pa.exists() or not pb.exists():
        print(v, 'MISSING', pa.exists(), pb.exists())
        continue
    a, aim = mask_of(str(pa))
    b, bim = mask_of(str(pb))
    union = np.logical_or(a, b).sum()
    inter = np.logical_and(a, b).sum()
    iou = inter / union if union else 0.0
    [REDACTED 2026-11-05] = float(np.abs(aim.astype(int) - bim.astype(int)).mean())
    print(v,
          'silIoU=%.4f' % iou,
          'areaV2=%.4f' % a.mean(),
          'areaV3=%.4f' % b.mean(),
          'meanPixDiff=%.3f' % [REDACTED 2026-11-05])
