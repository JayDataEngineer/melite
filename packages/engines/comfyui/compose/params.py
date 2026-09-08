"""params.py — wire scalar params -> graph-injectable values (plugin-shared).

THE ACTION CARD PATTERN: every card admits a `seed` on the wire, and
every card's graph needs a deterministic non-negative integer for its
noise. The wire can deliver a missing key, None, a negative sentinel,
a float, or a numeric string — the normalization is PATTERN policy,
never card vocabulary.

    seed(value, default=42)   -> int
    input_dir(params)         -> str

Policy law (QUEUE LANE LAW): the seed default is DETERMINISTIC — no
hidden randomness at compose time; the same request composes the same
graph. An unparseable seed (a string that is not a number) refuses
LOUDLY — silently swapping a typo for the default is the banned
fallback shape. input_dir resolves params-stated over the plugin
config default; a card never hardcodes a path.
"""

import os


# Wire-JSON shape: wire scalar params (objects, arrays, scalars).
JsonValue = str | int | float | bool | None | list["JsonValue"] | dict[str, "JsonValue"]
JsonDict = dict[str, JsonValue]


def seed(value: str | int | float | bool | None, default: int = 42) -> int:
    """Normalize a wire seed to a non-negative int.

    missing/None/negative -> default (the deterministic clamp)
    int/float/numeric-str -> int(value)
    anything else         -> ValueError (LOUD — a typo is not 42)
    """
    if value is None:
        return default
    try:
        s = int(float(value))
    except (TypeError, ValueError):
        raise ValueError("wire seed %r is not a number" % (value,))
    return s if s >= 0 else default


def input_dir(params: dict[str, JsonValue]) -> str:
    """The ComfyUI input mount: params-stated, else the plugin config
    default (g_default_input_dir). Never a hardcoded path."""
    from _config import input_dir as _cfg_input_dir
    return (params or {}).get("input_dir", "") or _cfg_input_dir()


def output_mount() -> str:
    """The gateway's output mount (G_DEFAULT_OUTPUT_DIR) — where prior
    run artifacts live. Empty string when the gateway did not state
    one (the caller decides what absence means)."""
    return os.environ.get("G_DEFAULT_OUTPUT_DIR", "")
