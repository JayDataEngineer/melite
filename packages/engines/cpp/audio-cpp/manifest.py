"""manifest.py — audio-cpp kernel manifests (PORT 4, 2026-09-06).

TWO kernels, one binary: the music card's workflow-dict shape
(music_out.wav, task default gen, duration/prompt/lyrics + seed
conditionals) and the legacy knob-map flat shape (audio_out.wav,
task default tts, instruct/speaker/temperature + seed
conditionals). The shim picks on `workflow` presence — the same
branch the retired execute walked.

Binary: the model row's own cli pin (lane data → $cli_path,
wins) → AUDIO_CPP_CLI env → runtime build → vendored build.
No cwd in the retired spawn — both kernels run in $run.
No PATH names. Timeout 1800s (music renders long).
"""

from __future__ import annotations

import sys
from pathlib import Path

_PLUGIN_ROOT = Path(__file__).resolve().parent
_REPO = _PLUGIN_ROOT.parents[3]
_PY = str(_REPO / "py")
if _PY not in sys.path:
    sys.path.insert(0, _PY)

from kernel_manifest import (ExecMode, KernelManifest, Mount,  # noqa: E402
                             SubprocessExec)

_CANDIDATES = (
    str(_REPO / "data" / "runtime" / "audio.cpp" / "build" / "bin"
        / "audiocpp_cli"),
    str(_PLUGIN_ROOT / "vendor" / "audio.cpp" / "build" / "bin"
        / "audiocpp_cli"),
)

AUDIO_MUSIC_MANIFEST = KernelManifest(
    id="audio_cpp",
    version="1",
    card="music-native",
    engine="audio_cpp",
    exec=ExecMode.SUBPROCESS,
    subprocess=SubprocessExec(
        bin_env="AUDIO_CPP_CLI",
        bin_candidates=_CANDIDATES,
        bin_override="$cli_path|",
        argv=(
            "$bin",
            "--task", "$workflow.task|gen",
            "--family", "$workflow.family|",
            "--model", "$workflow.model|",
            "--backend", "$workflow.backend|cuda",
            "--output", "$out/music_out.wav",
        ),
        argv_when=(
            ("$workflow.duration_sec",
             ("--duration", "$workflow.duration_sec")),
            ("$workflow.prompt",
             ("--prompt", "$workflow.prompt")),
            ("$workflow.lyrics",
             ("--lyrics", "$workflow.lyrics")),
            ("$workflow.seed",
             ("--seed", "$workflow.seed")),
        ),
        cwd="$run",
        output_channel="wav",
        output_file="music_out.wav",
        timeout_s=1800.0,
    ),
    mount=Mount.STAGE,   # graph via the bridge extension
    artifacts=(),
)

AUDIO_LEGACY_MANIFEST = KernelManifest(
    id="audio_cpp",
    version="1",
    card="music-native",
    engine="audio_cpp",
    exec=ExecMode.SUBPROCESS,
    subprocess=SubprocessExec(
        bin_env="AUDIO_CPP_CLI",
        bin_candidates=_CANDIDATES,
        bin_override="$cli_path|",
        argv=(
            "$bin",
            "--task", "$task|tts",
            "--family", "$family|",
            "--model", "$model|",
            "--backend", "$backend|cuda",
            "--output", "$out/audio_out.wav",
        ),
        argv_when=(
            ("$instruct", ("--instruct", "$instruct")),
            ("$speaker", ("--speaker", "$speaker")),
            ("$temperature", ("--temperature", "$temperature")),
            ("$seed", ("--seed", "$seed")),
        ),
        cwd="$run",
        output_channel="wav",
        output_file="audio_out.wav",
        timeout_s=1800.0,
    ),
    mount=Mount.STAGE,
    artifacts=(),
)
