"""_knobmap.py — the legacy knob-map compose arm (the C port).

The C card_compose port (py port of audio_plugin.c lines 471-678;
lived at engines/audio/compose.py until the compose-first flip):
every OTHER audio model (moss-sfx, qwen3-tts era) validates against
its model class's card_knobs tuple — the knob map IS the legal
surface, unknown keys refuse, engine truth (task/family/cli/
model_path/backend) is data on the model defaults. Documented
deviation from the C (golden tts_seed_temp): the C's ac_jq_s
scalar scan only read quoted STRINGS, so numeric seed/temperature
fell through to garbage atoi/atof results; the port reads real
JSON values.

This is ENGINE surface, not a card: the models it serves (moss-sfx,
qwen3-tts, ...) declared engine='comfyui' in the A-cluster
consolidation — their CARDS (sfx/tts/voice-lock) live in comfyui's
tree (SSOT: a card exists once). This module is the loud-refusal
parity surface the C17 bus tests pin; it emits nodes from model
DATA (card_knobs + defaults), never lane knowledge. It lives here
(beside the dispatcher, not inside it) so compose/__init__.py stays
a pure dispatcher (THE CARD PATTERN: no inline arm logic in the
bus door).
"""

from __future__ import annotations

from pathlib import Path

from flow_graph import FlowGraph, NodeRow

type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None

# _knobmap.py = <repo>/packages/engines/cpp/audio-cpp/compose/_knobmap.py
_REPO = Path(__file__).resolve().parents[5]

_GENRE_ORDER = ("audio", "video")


def _plugin_model_dirs(edir: Path) -> list[Path]:
    """A plugin dir's models/ trees — the plugin root itself and any
    <category>/<plugin>/ nesting (cpp/ peers)."""
    roots = []
    direct = edir / "models"
    if direct.is_dir():
        roots.append(direct)
    if (edir / "plugin.py").is_file() or direct.is_dir():
        # category nesting: packages/engines/<cat>/<plugin>/models
        for child in sorted(edir.iterdir()):
            if not child.is_dir() or child.name.startswith("."):
                continue
            nested = child / "models"
            if nested.is_dir():
                roots.append(nested)
    return roots


def _model_paths(model: str) -> tuple[str | None, type[Model] | None]:
    """(model_dir, model_class) for the model, or (None, None).

    model.yaml extinct — resolve via model.py class. Walks every
    plugin's models tree (audio families live under multiple plugins
    since the A-cluster consolidation)."""
    from melite_models import load_model_py
    plugins_dir = _REPO / "packages" / "engines"
    for edir in sorted(plugins_dir.iterdir()):
        if not edir.is_dir() or edir.name.startswith("."):
            continue
        for models_dir in _plugin_model_dirs(edir):
            genre_search = list(_GENRE_ORDER) + [
                g.name for g in sorted(models_dir.iterdir())
                if g.is_dir() and g.name not in _GENRE_ORDER]
            for genre in genre_search:
                mdir = models_dir / genre / model
                if not mdir.is_dir():
                    continue
                mpy = mdir / "model.py"
                if mpy.is_file():
                    try:
                        cls = load_model_py(str(mpy), edir.name)
                        return str(mdir), cls
                    except Exception:
                        continue
    return None, None


def _load_knobs(cls: type[Model] | None = None,
                model_dir: str | Path | None = None) -> list[tuple[str, bool]]:
    """ac_load_knobs: (2026-09-02) reads card_knobs from model class,
    falling back to card_knobs.yaml for backward compat."""
    if cls is not None:
        raw = getattr(cls, "card_knobs", None) or ()
        if raw:
            return [(e["card"], e.get("required", False))
                    for e in raw if isinstance(e, dict) and "card" in e]
    if model_dir:
        knob_path = Path(model_dir) / "card_knobs.yaml"
        knobs = []
        try:
            text = knob_path.read_text()
        except OSError:
            return knobs
        for line in text.splitlines():
            c = line.find("card:")
            k = line.find("kind:")
            if c < 0 or k < 0:
                continue
            card = line[c + 5:].split(",")[0].split("}")[0].strip()
            if not card:
                continue
            r = line.find("required:")
            req = r >= 0 and line[r + 9:].split(",")[0].split("}")[0].strip().startswith(("1", "true", "yes"))
            knobs.append((card, req))
        return knobs
    return []


def _model_defaults(cls: type[Model] | None = None,
                    model_dir: str | Path | None = None) -> dict[str, str]:
    """Engine truth from the model class defaults (data, not code)."""
    d = dict(getattr(cls, "defaults", None) or {}) if cls is not None else {}
    li = getattr(cls, "lane_inputs", None) if cls is not None else None
    return {
        "task": d.get("task", ""),
        "family": (getattr(li, "family", "") or d.get("family", "")),
        "model_path": (getattr(li, "model_path", "") or d.get("model_path", "")),
        "backend": d.get("backend", "cuda"),
        "cli": d.get("cli", ""),
    }


def knob_compose(body: dict[str, JsonValue], model: str, run_id: str,
                 graph: FlowGraph | None
                 ) -> tuple[int, FlowGraph | None,
                            dict[str, JsonValue] | None, str | None]:
    """(rc, graph, extra_dict, error_str); rc!=0 = LOUD refusal.

    The graph rides as a DICT-shaped FlowGraph (python hands python
    structures — PYTHON SHAPE rung 5); the passthrough on
    refusal/validation is the caller's own graph object, unchanged."""
    model_dir, model_cls = _model_paths(model)
    if model_dir is None:
        return -1, graph, None, ("audio card: model '%s' has no model.py "
                                 "under packages/*/models/*/ — the lane is "
                                 "not installed (refusing permissive "
                                 "compose)" % model)
    knobs = _load_knobs(cls=model_cls, model_dir=model_dir)
    if not knobs:
        return -1, graph, None, (
            "card_knobs could not be loaded for model '%s' (found 0 knob "
            "entries) - the knob map IS the card's legal surface; without it "
            "unknown keys cannot be rejected. Fix the lane install "
            "(models/*/%s/card_knobs) - the compose refuses to run "
            "permissive." % (model, model))

    params = body.get("params") if isinstance(body.get("params"), dict) else {}

    # strict surface check: every params key must be a knob
    surface = {k for k, _ in knobs}
    for key in params:
        if key not in surface:
            return -3, graph, None, ("unknown param '%s' — not in the %s "
                                     "card surface (card_knobs is "
                                     "the SSOT)" % (key, model))

    # required knobs: present AND non-empty
    for card, req in knobs:
        if not req:
            continue
        v = params.get(card)
        if v is None or v == "":
            return -3, graph, None, ("required param '%s' missing or "
                                     "empty on the %s card" % (card, model))

    d = _model_defaults(cls=model_cls, model_dir=model_dir)
    if not d["task"] or not d["family"] or not d["model_path"]:
        return -1, graph, None, ("model defaults incomplete for "
                                 "'%s' (need task/family/model_path) — "
                                 "engine truth is data, not code" % model)

    text = str(params.get("text", "") or "")
    instruct = str(params.get("style_instruction", "") or "")
    speaker = str(params.get("voice_name", "") or params.get("voice", "") or "")
    voice_ref = str(params.get("reference_audio", "") or "")
    seed = 42
    if params.get("seed") is not None:
        try:
            seed = int(float(params["seed"]))
        except (TypeError, ValueError):
            pass
    temperature = 0.7
    if params.get("temperature") is not None:
        try:
            temperature = float(params["temperature"])
        except (TypeError, ValueError):
            pass
    if not text:
        text = instruct                      # text falls back to style text
    if d["task"] == "vdes" and not instruct and text:
        instruct = text                      # vdes: design text rides instruct

    if not run_id:
        # (registration law) run inputs register as STRINGS
        return 0, graph, {"inputs": {"text": text if text else " ",
                                      "seed": "%d" % seed}}, None

    refs = ["__initial__.$text"]
    if voice_ref:
        refs.append("__initial__.$voice_ref")
    p = {"task": d["task"], "family": d["family"],
         "model": d["model_path"], "backend": d["backend"] or "cuda"}
    if d["cli"]:
        p["cli"] = d["cli"]
    if speaker:
        p["speaker"] = speaker
    if instruct:
        p["instruct"] = instruct
    if temperature != 0.7:
        p["temperature"] = round(temperature, 2)
    p["seed"] = seed
    return 0, FlowGraph(
        name=model, engine_type="audio_cpp",
        description="card-composed by the audio-cpp plugin",
        nodes=(NodeRow(node_id="voice", node_type="audio_cpp",
                       input_from=tuple(refs), params=p),),
    ), {}, None
