"""ffmpeg_concat engine — window stitch for card films.

Contract (from the C plugin): inputs carry video paths (video_0 may be
one path or a list); params carry trim_heads / spans / fps /
match_level. Trims each window to its span, concatenates, emits one
film under the run dir. LOUD on missing input or ffmpeg failure.
"""

from __future__ import annotations

import asyncio
import subprocess
from pathlib import Path


class EngineError(Exception):
    pass


async def execute(node, run_dir, inputs, stop_event):
    p = node.get("params", {})
    fps = p.get("fps", 24)
    clips = []
    for v in inputs.values():
        if isinstance(v, list):
            clips.extend(v)
        elif isinstance(v, str):
            clips.append(v)
    clips = [c for c in clips if c and Path(c).is_file()]
    if not clips:
        raise EngineError("ffmpeg_concat: no input video files (got %r)" % (list(inputs.values()),))
    trim_heads = p.get("trim_heads") or [0.0] * len(clips)
    spans = p.get("spans") or [None] * len(clips)

    parts = []
    for i, clip in enumerate(clips):
        part = Path(run_dir) / ("%s_part%d.mp4" % (node["id"], i))
        cmd = ["ffmpeg", "-y", "-loglevel", "error"]
        head = float(trim_heads[i]) if i < len(trim_heads) else 0.0
        if head:
            cmd += ["-ss", "%.4f" % head]
        cmd += ["-i", clip]
        span = spans[i] if i < len(spans) else None
        if span:
            cmd += ["-t", "%.4f" % float(span)]
        cmd += ["-c", "copy", str(part)]
        proc = await asyncio.create_subprocess_exec(*cmd)
        if await proc.wait() != 0:
            raise EngineError("ffmpeg trim failed on %s" % clip)
        parts.append(part)

    out = Path(run_dir) / ("%s_film.mp4" % node["id"])
    if len(parts) == 1:
        out.write_bytes(parts[0].read_bytes())
    else:
        lst = Path(run_dir) / ("%s_list.txt" % node["id"])
        lst.write_text("".join("file '%s'\n" % p.resolve() for p in parts))
        proc = await asyncio.create_subprocess_exec(
            "ffmpeg", "-y", "-loglevel", "error",
            "-f", "concat", "-safe", "0", "-i", str(lst),
            "-c", "copy", str(out))
        if await proc.wait() != 0:
            raise EngineError("ffmpeg concat failed")
    return {"outputs": {"video_0": str(out)},
            "artifacts": [{"path": str(out), "bytes": out.stat().st_size}]}
