#!/usr/bin/env python3
"""Phase 6 of the Core/Surfaces restructure: decompose TextToPoseTab.tsx.

Splits the 3,293-line file into two modules:

    useTextToPoseStudio.ts   the ENTIRE hook body (state pairs, refs,
                             callbacks, effects, derived values) as a custom
                             hook returning every binding. Imports recomputed
                             per module from the original import statements.
    TextToPoseTab.tsx        a thin shell: destructures the JSX-used bindings
                             off the hook and renders the JSX return verbatim.

Why one mega-hook instead of several smaller ones: the closure is a single
connected graph — the hubs (result, frameIdx, error, toast, keyframes,
editableJoints, ...) are each referenced by 10–53 other bindings, so any
partition passes those hubs around as 30+ parameter bundles. The honest
first cut is the hook boundary: the logic moves out of the component file,
the JSX stays byte-identical (the destructure feeds it the same names), and
future sub-extraction can carve clean clusters out of the hook module with
explicit param bundles. This follows the ROADMAP: "extraction as custom
hooks, not components".

Pure refactor: the hook body moves verbatim (only the function name and the
trailing `return { ... }` literal are added). Zero behavior change.

Usage:
    python scripts/pose_studio_split.py --dry-run   # report plan
    python scripts/pose_studio_split.py             # write the 2 files
"""
import re
import sys
from pathlib import Path

DIR = Path(__file__).resolve().parent.parent / "src" / "surfaces" / "pose"
FILE = DIR / "TextToPoseTab.tsx"
DRY = "--dry-run" in sys.argv

# ─── parsing ────────────────────────────────────────────────────────────────
# One parsed import member: (spec, alias, is_type); one import statement:
# (whole_is_type, source, members). Namespace imports (`import * as ns`)
# ride as a ("*", alias, False) member.
ImportMembers = list[tuple[str, str, bool]]
ImportEntry = tuple[bool, str, ImportMembers]

def parse_imports(text: str) -> list[ImportEntry]:
    imports = []
    # some import blocks carry inline comments (`// constants` above members)
    text = re.sub(r"//[^\n]*", "", text)
    # namespace imports (`import * as THREE from "three"`)
    for m in re.finditer(
        r"import\s+\*\s+as\s+(\w+)\s+from\s+['\"]([^'\"]+)['\"]", text
    ):
        imports.append((False, m.group(2), [("*", m.group(1), False)]))
    for m in re.finditer(
        r"import\s+(type\s+)?\{([^}]*)\}\s+from\s+['\"]([^'\"]+)['\"]", text, re.S
    ):
        whole_is_type = bool(m.group(1))
        source = m.group(3)
        members = []
        for part in m.group(2).split(","):
            part = part.strip()
            if not part:
                continue
            tm = re.match(r"^(type\s+)?([\w$]+)(?:\s+as\s+([\w$]+))?$", part)
            if not tm:
                raise SystemExit(f"!! unparseable import member: {part!r}")
            members.append((tm.group(2), tm.group(3) or tm.group(2), bool(tm.group(1))))
        imports.append((whole_is_type, source, members))
    return imports

def bracket_depth(line: str) -> int:
    return (line.count("(") + line.count("[") + line.count("{")
            - line.count(")") - line.count("]") - line.count("}"))

def until_closing(text: str, open_ch: str, close_ch: str) -> str:
    """Return the inner text of the first top-level bracket group."""
    depth = 0
    for i, ch in enumerate(text):
        if ch == open_ch:
            depth += 1
        elif ch == close_ch:
            depth -= 1
            if depth == 0:
                return text[1:i]
    raise SystemExit(f"!! unbalanced {open_ch}{close_ch} in: {text[:60]}")

def parse_bindings(body: list[str]) -> list[str]:
    """Parse 2-space-indented top-level const/let declarations → bound names.

    Handles single bindings (`const x = ...`), array patterns
    (`const [a, setA] = useState...` — multi-line safe), and object
    destructures (`const { a, b: c } = useX()` → a, c). Continuation lines
    are consumed while brackets are unbalanced. Nested object/array patterns
    inside a pattern element are rare here; if one shows up, its inner
    identifiers are collected too (best-effort; tsc is the backstop)."""
    names = []
    i, n = 0, len(body)
    while i < n:
        l = body[i]
        m = re.match(r"^  (const|let) ", l)
        if not m:
            i += 1
            continue
        stmt = [l]
        depth = bracket_depth(l)
        j = i
        while depth > 0 and j + 1 < n:
            j += 1
            stmt.append(body[j])
            depth += bracket_depth(body[j])
        rest = "\n".join(stmt)[len(m.group(0)):]
        if rest.startswith("["):
            inner = until_closing(rest, "[", "]")
            names.extend(re.findall(r"[A-Za-z_$]\w*", inner))
        elif rest.startswith("{"):
            inner = until_closing(rest, "{", "}")
            for part in re.split(r",\s*", inner):
                part = part.strip()
                if not part:
                    continue
                if part.startswith("..."):
                    mm = re.match(r"\.\.\.([A-Za-z_$]\w*)", part)
                    if mm:
                        names.append(mm.group(1))
                elif ":" in part:
                    # `key: alias` binds the alias; a nested `{...}`/`[...]`
                    # pattern binds whatever is inside it
                    sub = part.split(":", 1)[1].strip()
                    if sub[:1] in "[{":
                        names.extend(re.findall(r"[A-Za-z_$]\w*",
                                                until_closing(sub, sub[0],
                                                              "]" if sub[0] == "[" else "}")))
                    else:
                        mm = re.match(r"([A-Za-z_$]\w*)", sub)
                        if mm:
                            names.append(mm.group(1))
                else:
                    mm = re.match(r"([A-Za-z_$]\w*)", part)
                    if mm:
                        names.append(mm.group(1))
        else:
            mm = re.match(r"([A-Za-z_$]\w*)", rest)
            if mm:
                names.append(mm.group(1))
        i = j + 1
    return names

def used_identifiers(text: str) -> set[str]:
    """Identifiers in code only — strip comments and string literals so
    prose/classNames never pull imports. JSX text content is deliberately
    NOT stripped: a word in prose is harmless (it only ever over-includes
    an unused import), while any regex attempt to find `>`...`<` text
    boundaries misfires on comparison operators in `{...}` expressions
    (`totalFrames > 0 && ... < ...`) and swallows real code."""
    t = re.sub(r"//[^\n]*", "", text)
    t = re.sub(r"/\*.*?\*/", "", t, flags=re.S)
    t = re.sub(r"\"(?:[^\"\\]|\\.)*\"", "", t)
    t = re.sub(r"'(?:[^'\\]|\\.)*'", "", t)
    # plain backtick templates (no ${}) are strings; ${}-templates carry code
    t = re.sub(r"`(?:[^`\\]|\\.)*`",
               lambda m: "" if "${" not in m.group(0) else m.group(0), t)
    return set(re.findall(r"[A-Za-z_$]\w*", t))

# ─── emission ───────────────────────────────────────────────────────────────
HOOK_HEAD = [
    "// useTextToPoseStudio — the entire TextToPoseTab logic as one custom",
    "// hook. State pairs, refs, callbacks, effects, and derived values all",
    "// share one closure (the hubs — result, frameIdx, error, toast,",
    "// keyframes, editableJoints — are referenced by 10–53 bindings each,",
    "// so the module boundary is the honest seam; sub-clusters can be",
    "// carved out of here with explicit param bundles later).",
    "//",
    "// Carved from TextToPoseTab.tsx by scripts/pose_studio_split.py",
    "// (Phase 6 restructure) — pure refactor.",
]

COMPONENT_HEAD = [
    "// TextToPoseTab — Kimodo-parity pose studio surface.",
    "//",
    "// Thin shell: all state + actions live in useTextToPoseStudio(); this",
    "// component destructures what the JSX needs and renders. The JSX is",
    "// unchanged from the pre-split file.",
    "//",
    "// Carved by scripts/pose_studio_split.py (Phase 6 restructure) —",
    "// pure refactor.",
]

def emit_imports(imports: list[ImportEntry], used: set[str]) -> list[str]:
    """Import statements whose members (or namespace alias) are used."""
    lines = []
    for whole_is_type, source, members in imports:
        # mm = (spec, alias, is_type) — the alias is always the local name,
        # and for namespace members spec == "*"
        sub = [mm for mm in members if mm[1] in used]
        if not sub:
            continue
        # namespace imports can't mix with members — one statement each
        ns = [mm for mm in sub if mm[0] == "*"]
        if ns:
            lines += [f"import * as {mm[1]} from '{source}'" for mm in ns]
            continue
        parts = []
        for spec, alias, is_type in sub:
            tok = ("" if whole_is_type else ("type " if is_type else "")) + spec
            if alias != spec:
                tok += " as " + alias
            parts.append(tok)
        kind = "type " if whole_is_type else ""
        lines.append(f"import {kind}{{ {', '.join(parts)} }} from '{source}'")
    return lines

def main() -> None:
    src = FILE.read_text().split("\n")
    n = len(src)
    # locate the function boundary + the return JSX
    fn_i = next(i for i, l in enumerate(src) if l.startswith("export function TextToPoseTab"))
    ret_i = next(i for i, l in enumerate(src) if l.startswith("  return ("))
    assert ret_i > fn_i, "return must come after the function start"
    close_i = n - 1
    while close_i > ret_i and src[close_i].strip() == "":
        close_i -= 1
    assert src[close_i].strip() == "}", "last non-blank line must close the function"

    imports = parse_imports("\n".join(src[:fn_i]))
    body = src[fn_i:ret_i]          # includes the `export function` line
    jsx = src[ret_i:close_i]        # the `  return (` ... `  )` block

    bindings = list(dict.fromkeys(parse_bindings(body[1:])))  # after the fn line
    jsx_used = used_identifiers("\n".join(jsx))

    import_locals = set()
    for _, _, members in imports:
        for _, alias, _ in members:
            import_locals.add(alias)
    destructure = [b for b in bindings if b in jsx_used]

    # sanity: every jsx-used binding must be destructured; leftover non-binding
    # identifiers are params/local names (e.g. `a => !a`) or JSX attrs — fine
    missing = jsx_used & set(bindings) - set(destructure)
    assert not missing, f"!! jsx-used bindings not destructured: {sorted(missing)}"
    unknown = sorted(jsx_used - set(bindings) - import_locals)
    if unknown:
        print(f"  note: non-binding JSX identifiers ({len(unknown)}): "
              + ", ".join(unknown[:40]) + (" …" if len(unknown) > 40 else ""))

    body_text = "\n".join(body[1:])
    body_used = used_identifiers(body_text)

    if DRY:
        print(f"  file: {len(src)} lines")
        print(f"  hook body: L{fn_i + 1}–{ret_i} ({ret_i - fn_i} lines, "
              f"{len(bindings)} bindings)")
        print(f"  jsx: L{ret_i + 1}–{close_i + 1} ({close_i - ret_i} lines, "
              f"{len(destructure)} destructured bindings)")
        print(f"  hook file: {len(body) + 5 + len(bindings)} lines (est.)")
        print(f"  component file: {len(jsx) + 6 + len(destructure) // 12 + 10} lines (est.)")
        return

    # ── hook file ──
    lines = list(HOOK_HEAD)
    lines += emit_imports(imports, body_used)
    # the original `export function TextToPoseTab` line becomes the hook
    body = [body[0].replace("export function TextToPoseTab(",
                            "export function useTextToPoseStudio(")] + body[1:]
    lines += ["", *body, "  return {"]
    lines += [f"    {name}," for name in bindings]
    lines += ["  }", "}", ""]
    hook_path = DIR / "useTextToPoseStudio.ts"
    hook_path.write_text("\n".join(lines))

    # ── component file ──
    lines = list(COMPONENT_HEAD)
    lines += emit_imports(imports, jsx_used)
    lines.append("import { useTextToPoseStudio } from './useTextToPoseStudio'")
    lines += ["", "export function TextToPoseTab({ onSaved }: { onSaved?: () => void }) {",
              "  const {", "    " + ", ".join(destructure), "  } = useTextToPoseStudio({ onSaved })",
              *jsx, "}", ""]
    comp_path = DIR / "TextToPoseTab.tsx"
    comp_path.write_text("\n".join(lines))

    print(f"wrote {hook_path.relative_to(Path.cwd())} ({len(hook_path.read_text().splitlines())} lines)")
    print(f"wrote {comp_path.relative_to(Path.cwd())} ({len(comp_path.read_text().splitlines())} lines)")
    print(f"  bindings: {len(bindings)}, destructured: {len(destructure)}")

if __name__ == "__main__":
    main()
