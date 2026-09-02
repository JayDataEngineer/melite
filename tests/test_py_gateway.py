"""Queue-law regression for the python gateway (mirrors the C chaos suite
essentials) + the plugin-bus wall (PLUGIN ARCHITECTURE LAW). Run:
python3 tests/test_py_gateway.py  — exits non-zero on any violation.
No GPU, no network: parser + resolution + compose laws + golden parity."""

import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "py"))

from gateway import (  # noqa: E402
    ValidationError, expand_inject, parse_pipeline_text, resolve_request,
)

PASS = []
FAIL = []


def check(name, cond, detail=""):
    (PASS if cond else FAIL).append(name if cond else "%s: %s" % (name, detail))


# C1: every estate yaml parses (all 9)
yards = sorted((REPO / "pipelines").glob("*/pipeline.yaml"))
for y in yards:
    try:
        g = parse_pipeline_text(y.read_text())
        check("parse %s" % y.parent.name, True)
    except ValidationError as e:
        check("parse %s" % y.parent.name, False, str(e)[:80])
check("estate yamls found", len(yards) >= 8, str(len(yards)))

# C2: QUEUE LANE — unknown yaml refused 4xx-loud
try:
    resolve_request({"yaml": "no-such-lane"})
    check("unknown yaml refused", False, "no refusal")
except ValidationError:
    check("unknown yaml refused", True)

# C3: no selection refused
try:
    resolve_request({"prompt": "x"})
    check("no selection refused", False, "no refusal")
except ValidationError:
    check("no selection refused", True)

# C4: illegal identifier refused
try:
    resolve_request({"yaml": "../etc"})
    check("illegal ident refused", False, "no refusal")
except ValidationError:
    check("illegal ident refused", True)

# C5: inject unresolved tensor = LOUD
try:
    expand_inject({"inject": {"2.prompt": "$missing"}}, {"prompt": "x"})
    check("inject unresolved loud", False, "no refusal")
except ValidationError:
    check("inject unresolved loud", True)

# C6: params must be one-line JSON or map — garbage refused
try:
    parse_pipeline_text("nodes:\n  - id: a\n    type: t\n    params: {bad}\n")
    check("bad params refused", False, "no refusal")
except ValidationError:
    check("bad params refused", True)

# C7: duplicate node ids refused
try:
    parse_pipeline_text("nodes:\n  - id: a\n    type: t\n  - id: a\n    type: t\n")
    check("dup ids refused", False, "no refusal")
except ValidationError:
    check("dup ids refused", True)

# C8: node without type refused
try:
    parse_pipeline_text("nodes:\n  - id: a\n")
    check("typeless node refused", False, "no refusal")
except ValidationError:
    check("typeless node refused", True)

# C9: __initial__ missing tensor refused (no fallback)
from gateway import resolve_inputs
try:
    resolve_inputs({"id": "n", "input_from": ["__initial__.prompt"]}, {})
    check("missing initial refused", False, "no refusal")
except ValidationError:
    check("missing initial refused", True)

# C10: dollar-tensor resolution top-level then params
out = resolve_inputs({"id": "n", "input_from": ["__initial__.$seed"]},
                     {"params": {"seed": 7}, "prompt": "x"})
check("dollar tensor from params", out.get("$seed") == 7, repr(out))

# C11: card model arm resolves (h3-timeline) — needs plugins dir
resolved = resolve_request({"model": "h3-timeline", "prompt": "x"})
check("card model arm", isinstance(resolved, dict) and resolved.get("__card__"), repr(type(resolved)))

# C12: unknown model refused loudly
try:
    resolve_request({"model": "no-such-model"})
    check("unknown model refused", False, "no refusal")
except ValidationError:
    check("unknown model refused", True)

# ── PLUGIN BUS WALL (PLUGIN ARCHITECTURE LAW, 2026-09-02 port) ──
import plugins  # noqa: E402

# C13: every engine type is owned by exactly one plugin (engine.yaml
# declarations; duplicate types fail LOUD at scan)
engines = plugins.scan_engines()
owners = {k: e.plugin_id for k, e in engines.items()}
check("engine scan one-owner", owners.get("comfyui") == "comfyui"
      and owners.get("audio_cpp") == "audio-cpp"
      and owners.get("ffmpeg_concat") == "ffmpeg"
      and owners.get("echo") == "core", repr(owners))

# C14: DETERMINISTIC model resolution — declarer wins over silent copies
# (the C glob-order bug: music3 could resolve to a stanza-less copy)
etype, _my = plugins.resolve_model("music3")
check("music3 resolves comfyui (declarer-wins)", etype == "comfyui", etype)
etype, _my = plugins.resolve_model("qwen3-tts")
check("qwen3-tts resolves audio_cpp", etype == "audio_cpp", etype)

# C15: no engine stanza = LOUD refusal (QUEUE LANE LAW — refuse to guess)
try:
    plugins.resolve_model("z-image")
    check("stanza-less model refused", False, "no refusal")
except plugins.ValidationError:
    check("stanza-less model refused", True)

# C16: engines load from the OWNING plugin dir (no core engine maps)
for et, attr in (("comfyui", "execute"), ("audio_cpp", "execute"),
                 ("ffmpeg_concat", "execute")):
    try:
        mod = plugins.load_engine(et)
        check("engine %s loads" % et, hasattr(mod, attr))
    except Exception as e:
        check("engine %s loads" % et, False, str(e)[:80])

# C17: compose refusals are LOUD and BY NAME (moss-sfx knob map, unknown
# param, missing required)
for name, body, model, et in (
    ("knob-map refusal", {"model": "moss-sfx", "params": {"prompt": "x"}}, "moss-sfx", ["audio_cpp"]),
    ("unknown knob refusal", {"model": "qwen3-tts", "params": {"text": "hi", "bogus": 1}}, "qwen3-tts", ["audio_cpp"]),
    ("required missing refusal", {"model": "qwen3-tts", "params": {"seed": 5}}, "qwen3-tts", ["audio_cpp"]),
):
    try:
        plugins.compose(body, model, "", "x", et)
        check(name, False, "no refusal")
    except plugins.ValidationError:
        check(name, True)

# C18: card kinds compose real graphs (image/music through the plugin bus)
yml, extra = plugins.compose({"model": "krea-2", "params": {"prompt": "fox"}},
                              "krea-2", "run-W1", "x", ["comfyui"])
check("krea-2 composes generate node", "- id: generate" in yml and "SaveImage" in yml)
yml, extra = plugins.compose({"model": "music3", "params": {"prompt": "Genre: x"}},
                              "music3", "run-W2", "x", ["comfyui"])
check("music3 composes music node", "- id: music" in yml and "SaveAudio" in yml)

# C19: no engine names in the core (banned shape — the SO_ENGINE_OWNERS
# hardcode class): py/gateway.py must not name any engine type literal)
gw_src = (REPO / "py" / "gateway.py").read_text()
core_ok = not any(t in gw_src for t in ('"comfyui"', '"audio_cpp"', '"ffmpeg_concat"'))
check("core names no engine", core_ok, "engine literal in gateway.py")

# C20: GOLDEN PARITY WALL — the py composes vs the C .so outputs
# captured before deletion (tests/golden_compose/, 3 documented
# deviations inside the runner)
import subprocess  # noqa: E402
r = subprocess.run([sys.executable, str(REPO / "tests" / "golden_compose" / "_runner.py")],
                   capture_output=True, text=True)
check("golden parity wall", r.returncode == 0, r.stdout[-400:] if r.returncode else "")

print("PASS %d" % len(PASS))
for p in PASS:
    print("  ok  ", p)
if FAIL:
    print("FAIL %d" % len(FAIL))
    for f in FAIL:
        print("  FAIL", f)
sys.exit(1 if FAIL else 0)
