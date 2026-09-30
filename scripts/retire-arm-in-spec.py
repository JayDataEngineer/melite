#!/usr/bin/env python3
"""Retire a kit lane arm from a family oracle spec: the legacy-vs-action
byte comparison becomes a committed-golden comparison.  Run from the repo
root:  python3 scripts/retire-arm-in-spec.py <spec.ts> <ArmName> [--dry]

The transformation is deliberately narrow: it only rewrites a test that
composes through BOTH arms and compares them, which is exactly the
oracle shape the kit-arm retirement removes.  Anything else fails loudly
rather than guessing.
"""
import re
import sys
import pathlib

def slug(title: str) -> str:
    """The golden's file name.  A truncated slug is a COLLISION waiting
    to happen (two titles agreeing for 60 chars map to one file, and a
    later refresh silently overwrites the earlier one), so a title that
    would truncate is rejected outright rather than shortened."""
    s = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    if len(s) > 60:
        raise SystemExit(f"golden name too long ({len(s)} chars) for '{title[:70]}' — shorten the test title")
    return s

def transform(path: str, arm: str, recorded_first: bool = False) -> None:
    p = pathlib.Path(path)
    src = p.read_text()

    # 1. the header: unwrap the leading comment block, replace every
    #    sentence that describes the twin, rewrap. Sentence-level, not
    #    a fixed pattern: the families word this header differently, and
    #    a header still describing a deleted arm is drift.
    head_end = src.index("\nimport ")
    head_lines = src[:head_end].split("\n")
    body = " ".join(l[3:] if l.startswith("// ") else l[2:] for l in head_lines if l.startswith("//"))
    # The header states WHERE the bytes came from, and may only claim the
    # stronger provenance when it is true.  `--recorded-before-delete` is
    # the operator asserting exactly that: the golden was recorded while
    # the twin still existed.  Without it the header says what actually
    # happened — the family action is the only implementation, and the
    # golden freezes the wire as it stands.
    golden_sentence = (
        "the wire is pinned to a COMMITTED GOLDEN — "
        + ("recorded while the kit's legacy " + arm + " still existed and this spec compared the two arms byte-for-byte"
           if recorded_first else
           "recorded from the family action itself; the kit's legacy " + arm
           + " is deleted with this spec, and the family action is the lane's only implementation")
        + ". That arm is deleted (the families own their lanes now), so the golden carries the compatibility law.")
    replaced = []
    def kill(m: re.Match) -> str:
        replaced.append(m.group(0))
        return golden_sentence
    body = re.sub(r"[^.]*?serialized prompt is BYTE-IDENTICAL to the[^.]*\.", kill, body, count=1)
    body = re.sub(r"[^.]*?byte-identical graphs on the same doc[^)]*\)[^.]*\.", kill, body, count=1) if replaced == 0 else body
    if replaced == 0:
        raise SystemExit(f"{path}: no twin sentence found in the header — fix it by hand")
    wrapped, line = [], ""
    for w in body.split():
        if line and len(line) + 1 + len(w) > 74:
            wrapped.append("// " + line)
            line = w
        else:
            line = f"{line} {w}".strip()
    if line:
        wrapped.append("// " + line)
    src = "\n".join(wrapped) + src[head_end:]

    # 2. imports: the arm leaves the kit import, the golden helper arrives
    src = re.sub(r"\b" + arm + r",\s*", "", src, count=1)
    if 'from "node:path"' not in src:
        src = src.replace(
            'import type { ModelFacts } from "@melite/comfyui-card-kit/facts";',
            'import { assertGraphGolden } from "../../../../tests/helpers/graph-golden.ts";\n'
            'import type { ModelFacts } from "@melite/comfyui-card-kit/facts";\n'
            'import { join } from "node:path";', 1)

    # 3. helpers after the PARAMS/facts block, before the first describe
    helpers = f"""
const golden = (name: string): string => join(import.meta.dirname, "golden", `${{name}}.json`);
const graphOf = (g: GraphBuilder): Record<string, {{ class_type: string; inputs: Record<string, unknown> }}> =>
  g.toJSON() as never;
"""
    if "const golden =" not in src:
        src = re.sub(r"\ndescribe\(", helpers + "\ndescribe(", src, count=1)

    # 4. each oracle test: drop the legacy arm, compare the golden instead
    out = []
    lines = src.split("\n")
    i = 0
    converted = 0
    while i < len(lines):
        line = lines[i]
        m = re.match(r'\s*it\("(.+?)", \(\) => \{', line)
        if m and any(arm + "(" in l for l in lines[i:i+12]):
            # find the test's extent
            depth = 0
            j = i
            while True:
                depth += lines[j].count("{") - lines[j].count("}")
                if depth == 0 and j > i:
                    break
                j += 1
            block = lines[i:j+1]
            title = re.sub(r"^the action's serialized prompt is identical to the legacy (lane|" + arm + r" arm)\b",
                           "the composed prompt is the committed golden", m.group(1))
            title = re.sub(r"^byte equality holds\b", "the golden holds", title)
            run = None
            for l in block:
                mr = re.search(r'instantiateAction\([^,]+,\s*[^,]+,\s*[^,]+,\s*\w+,\s*"([^"]+)"\)', l)
                if mr:
                    run = mr.group(1)
                    break
            assert run, f"{path}: no runId found in the '{title}' test"
            kept = [l for l in block if not re.match(rf"\s*const legacy = new GraphBuilder", l)
                    and not re.match(rf"\s*{arm}\(", l)]
            kept[0] = re.sub(r'\bit\(".*?", \(\) => \{', f'it("{title}", () => {{', kept[0], count=1)
            for k, l in enumerate(kept):
                if l.strip() == "assert.deepEqual(action.toJSON(), legacy.toJSON());":
                    kept[k] = f'    assertGraphGolden(golden("{slug(title)}"), graphOf(action), "{title}");'
                    converted += 1
                    break
            else:
                raise SystemExit(f"{path}: the '{title}' test has no byte comparison to convert")
            out.extend(kept)
            i = j + 1
            continue
        out.append(line)
        i += 1
    assert converted > 0, f"{path}: nothing converted"
    p.write_text("\n".join(out))
    print(f"{path}: {converted} oracle test(s) re-anchored to goldens (run: {run})")

if __name__ == "__main__":
    transform(sys.argv[1], sys.argv[2], '--recorded-before-delete' in sys.argv)
