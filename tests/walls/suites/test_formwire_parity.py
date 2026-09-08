#!/usr/bin/env python3
"""Formwire parity wall — python/form_wire.py vs its TypeScript gate twin.

Ladder P1 (editor manifest §1.6 + §5 step 1): the frozen wire contract
(FormFieldRow, SchemaGroupRow, VariantRow, ModifierFeatureRow,
FormFeaturesRow, FormSpecRow + KindGenre + refusal_reason) ported to
packages/gateway-core/src/schema/formWire.ts. This wall refuses drift between
the two sides:

  1. AGREEMENT — every tests/golden_http/form-spec*.json sample validates
     through BOTH py FormSpecRow.model_validate AND the TS validator
     (node --experimental-strip-types driver); accept/reject must agree
     on ALL samples.
  2. REFUSAL PARITY — malformed fixtures (formwire_fixtures/, crafted
     from the py refusal taxonomy: missing-required, extra-forbidden,
     bad-genre, empty-name) must refuse on BOTH sides with byte-identical
     refusal strings, plus the hollow {} body must refuse with the same
     10-loc set on both sides.
  3. DISCIPLINE — the TS port stays erasable (no enums), adds no
     validator dependency (no zod/schemastery), and imports the existing
     openapi FormSpec type instead of redefining it (no second truth).

Run: python3 tests/walls/suites/test_formwire_parity.py
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "python"))

import form_wire  # noqa: E402
from pydantic import ValidationError  # noqa: E402

FORMWIRE = REPO / "packages" / "gateway-core" / "src" / "schema" / "formWire.ts"
GOLDENS = REPO / "tests" / "golden_http"
FIXTURES = Path(__file__).resolve().parent / "formwire_fixtures"

# Fixture filename -> the EXACT py refusal (pins the refusal taxonomy;
# the TS side must reproduce these strings byte-for-byte).
EXPECT_REFUSAL = {
    "missing_fields.json": "fields: Field required",
    "extra_key.json": "sidebar_key: Extra inputs are not permitted",
    "bad_genre.json": (
        "genre: Input should be 'image', 'video', 'audio', 'motion', "
        "'text', '3d', 'creature' or 'other'"
    ),
    "empty_field_name.json": (
        "fields.0.name: String should have at least 1 character"
    ),
}

HOLLOW_LOCS = {
    "model", "form", "service", "label", "genre", "fields",
    "schema_groups", "features", "defaults", "variants",
}

DRIVER_SRC = """\
import { readFileSync } from "node:fs";
import { validateFormSpecRow, refusalReason } from "__FORMWIRE__";
const out = [];
for (const file of process.argv.slice(2)) {
  try {
    const body = JSON.parse(readFileSync(file, "utf8"));
    const r = validateFormSpecRow(body);
    out.push(JSON.stringify(
      r.valid ? { file, valid: true }
              : { file, valid: false, refusal: refusalReason(r.errors) }));
  } catch (e) {
    out.push(JSON.stringify({ file, valid: "driver-error", refusal: String(e) }));
  }
}
console.log(out.join("\\n"));
"""

PASS: list[str] = []
FAIL: list[str] = []


def _py_verdict(doc: object) -> tuple[bool, str]:
    try:
        form_wire.FormSpecRow.model_validate(doc)
        return True, ""
    except ValidationError as e:
        return False, form_wire.refusal_reason(e)


def _locs(refusal: str) -> set[str]:
    # Refusal messages on both sides are colon-free; the loc is the head.
    return {part.split(":")[0] for part in refusal.split("; ") if part}


def _run_ts(files: list[Path]) -> dict[str, dict[str, object]]:
    """One node invocation over all files -> {path: {valid, refusal}}."""
    node = shutil.which("node")
    if node is None:
        FAIL.append("node: no node on PATH — need node >= 22.6")
        return {}
    with tempfile.TemporaryDirectory(prefix="formwire_parity_") as tmp:
        driver = Path(tmp) / "formwire_driver.ts"
        driver.write_text(
            DRIVER_SRC.replace("__FORMWIRE__", FORMWIRE.as_posix()),
            encoding="utf-8",
        )
        r = subprocess.run(
            [node, "--experimental-strip-types", str(driver),
             *(str(f) for f in files)],
            capture_output=True, text=True, timeout=180, cwd=str(REPO))
    if r.returncode != 0:
        FAIL.append("ts_driver: node exited %d: %s"
                    % (r.returncode, (r.stderr.strip() or r.stdout.strip())[:400]))
        return {}
    out: dict[str, dict[str, object]] = {}
    for line in r.stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            FAIL.append("ts_driver: non-JSON line: %s" % line[:200])
            continue
        out[row["file"]] = row
    return out


def main() -> int:
    if not FORMWIRE.is_file():
        FAIL.append("port: %s missing" % FORMWIRE)
        print(f"PASS {len(PASS)} / FAIL {len(FAIL)}")
        return 1

    # ── 3. erasable + dependency + single-truth discipline ──────────
    text = FORMWIRE.read_text(encoding="utf-8")
    if "\nenum " in text or "export enum" in text:
        FAIL.append("discipline: formWire.ts declares an enum (erasable-TS bans enums)")
    else:
        PASS.append("discipline_no_enum")
    if re.search(r"""(from\s+["'][^"']*(zod|schemastery)[^"']*["']|require\(\s*["'][^"']*(zod|schemastery))""", text):
        FAIL.append("discipline: formWire.ts imports a validator library")
    else:
        PASS.append("discipline_no_new_dep")
    if "contracts/src/formSpec.ts" not in text:
        FAIL.append("discipline: formWire.ts does not import the openapi FormSpec type")
    else:
        PASS.append("discipline_imports_formspec")

    samples = sorted(p for p in GOLDENS.glob("form-spec*.json")
                     if p.suffix == ".json")
    if not samples:
        FAIL.append("samples: no tests/golden_http/form-spec*.json found")
        print(f"PASS {len(PASS)} / FAIL {len(FAIL)}")
        return 1

    fixtures = sorted(FIXTURES.glob("*.json"))
    missing = sorted(set(EXPECT_REFUSAL) - {p.name for p in fixtures})
    if missing:
        FAIL.append("fixtures: missing %s" % missing)
    else:
        PASS.append("fixtures_%d_present" % len(fixtures))

    # The hollow body rides along as an inline (tmp) file, not a fixture.
    with tempfile.TemporaryDirectory(prefix="formwire_hollow_") as tmp:
        hollow = Path(tmp) / "hollow.json"
        hollow.write_text("{}", encoding="utf-8")
        ts = _run_ts([*samples, *fixtures, hollow])
        hollow_key = str(hollow)

    def ts_verdict(path: Path) -> tuple[object, str] | None:
        row = ts.get(str(path))
        if row is None:
            FAIL.append("ts_driver: no verdict for %s" % path.name)
            return None
        if row.get("valid") == "driver-error":
            FAIL.append("ts_driver: %s raised: %s"
                        % (path.name, str(row.get("refusal"))[:300]))
            return None
        return row.get("valid"), str(row.get("refusal", ""))

    # ── 1. accept/reject agreement on every golden sample ───────────
    agree = 0
    for sample in samples:
        doc = json.loads(sample.read_text(encoding="utf-8"))
        py_valid, _ = _py_verdict(doc)
        got = ts_verdict(sample)
        if got is None:
            continue
        ts_valid, _ = got
        if py_valid is ts_valid:
            agree += 1
        else:
            FAIL.append("agreement: %s py=%s ts=%s"
                        % (sample.name, py_valid, ts_valid))
    if agree == len(samples):
        PASS.append("samples_%d_agree" % agree)
    else:
        FAIL.append("samples: %d/%d agree" % (agree, len(samples)))

    # ── 2a. malformed fixtures: refuse both sides + byte parity ─────
    for fixture in fixtures:
        name = fixture.name
        doc = json.loads(fixture.read_text(encoding="utf-8"))
        py_valid, py_refusal = _py_verdict(doc)
        if py_valid:
            FAIL.append("fixture %s: py ACCEPTED a malformed doc" % name)
            continue
        want = EXPECT_REFUSAL.get(name)
        if want is not None:
            if py_refusal == want:
                PASS.append("py_taxonomy_%s" % name)
            else:
                FAIL.append("py_taxonomy %s: %r != pinned %r"
                            % (name, py_refusal, want))
        got = ts_verdict(fixture)
        if got is None:
            continue
        ts_valid, ts_refusal = got
        if ts_valid:
            FAIL.append("fixture %s: ts ACCEPTED: py refused %r"
                        % (name, py_refusal))
            continue
        if _locs(ts_refusal) == _locs(py_refusal):
            PASS.append("locs_%s" % name)
        else:
            FAIL.append("locs %s: ts %r vs py %r"
                        % (name, ts_refusal, py_refusal))
        if ts_refusal == py_refusal:
            PASS.append("refusal_%s" % name)
        else:
            FAIL.append("refusal %s: ts %r != py %r"
                        % (name, ts_refusal, py_refusal))

    # ── 2b. hollow body: 10 required-key refusals, same locs ────────
    py_valid, py_refusal = _py_verdict({})
    if py_valid or _locs(py_refusal) != HOLLOW_LOCS:
        FAIL.append("hollow: py leg unexpected: %r" % py_refusal)
    else:
        PASS.append("py_hollow_10_locs")
    row = ts.get(hollow_key)
    if row is None or row.get("valid") == "driver-error":
        FAIL.append("hollow: ts driver gave no verdict")
    elif row.get("valid") is False and _locs(str(row.get("refusal"))) == HOLLOW_LOCS:
        PASS.append("hollow_locs_agree")
    else:
        FAIL.append("hollow: ts %r" % (row,))

    for p in PASS:
        print(f"  ok   {p}")
    for f in FAIL:
        print(f"  FAIL {f}")
    print(f"PASS {len(PASS)} / FAIL {len(FAIL)}")
    return 1 if FAIL else 0


if __name__ == "__main__":
    raise SystemExit(main())
