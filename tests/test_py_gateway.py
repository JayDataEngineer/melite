"""Queue-law regression for the python gateway (mirrors the C chaos suite
essentials). Run: python3 tests/test_py_gateway.py  — exits non-zero on
any violation. No GPU, no network: parser + resolution + compose laws."""

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

print("PASS %d" % len(PASS))
for p in PASS:
    print("  ok  ", p)
if FAIL:
    print("FAIL %d" % len(FAIL))
    for f in FAIL:
        print("  FAIL", f)
sys.exit(1 if FAIL else 0)
