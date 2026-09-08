"""test_python_annotations.py — NO CHEATING TYPES (operator order, 2026-09-05).

The parameters in python have types. Full stop. The cheaters get tricky —
a bare parameter here, an Any there, an ignore comment where the checker
would have complained — so this wall hunts every known cheat shape with
the AST (annotations survive `from __future__ import annotations`: the
future import changes runtime evaluation, never the parse tree, so there
is no hiding behind it):

  1. test_every_parameter_typed — every parameter of every function
     (methods, async, nested, overloads, *args/**kwargs, keyword-only)
     carries an annotation. Only self/cls are exempt (they are bound,
     not passed). Lambdas are the one syntactic exemption: the grammar
     has nowhere to put an annotation.
  2. test_every_return_typed — every function declares its return,
     including __init__ (-> None) and test functions (-> None).
  3. test_no_any — the word Any in ANY annotation spelling (Any,
     typing.Any, Optional[Any], dict[str, Any], "Any", Annotated...)
     refuses. Alias laundering (X = Any, then x: X) refuses too: the
     alias definition is flagged and every annotation naming it.
     Semantic aliasing across modules is mypy's job (test_typing.py
     TARGETS); this wall owns the local cheat.
  4. test_no_bare_generics — a bare container is a hidden Any
     (dict == dict[Any, Any]) WHEREVER it hides: top-level dict,
     Optional[dict], list[dict], quoted "dict". dict/list/set/
     tuple/type/object and their typing/collections aliases must
     be parameterized; bare Union/Optional/Literal/Callable are
     meaningless and refuse. None, Final, ClassVar stay legal
     (they mean something bare). One precise exemption: object as
     the DIRECT parameter of type[...] (type[object] = any class
     object — a precise top, not a hidden value).
  5. test_no_ignores — the ignore comment in any spelling refuses.
     A silenced checker is a louder cheat than a missing annotation.

Scope: py/ packages/ tools/ tests/ infra/ — the code we own. data/
(checkouts, runtime), vendor/ and references/ (foreign code) are out
by PATH, never by exemption list: there is no allowlist in this file,
and there never will be. The wall scans itself (it lives under
tests/) — its own prose avoids the literal ignore-comment spelling
for exactly that reason.

Run: pytest tests/walls/suites/test_python_annotations.py
"""

import ast
import re
from pathlib import Path

from _anchor import REPO

SCOPES = ["py", "packages", "tools", "tests", "infra"]
SKIP_PARTS = {"__pycache__", ".venv", "node_modules", "data", "vendor", "references"}

EXEMPT_PARAM_NAMES = {"self", "cls"}

BARE_GENERICS = {
    # builtins (bare == [Any, ...])
    "dict", "list", "set", "frozenset", "tuple", "type", "object",
    # typing aliases (bare == [Any, ...])
    "Dict", "List", "Set", "FrozenSet", "Tuple", "Type", "Callable",
    "DefaultDict", "OrderedDict", "Counter", "ChainMap", "Deque",
    "Sequence", "MutableSequence", "Mapping", "MutableMapping",
    "Iterable", "Iterator", "Collection", "Container", "ItemsView",
    "KeysView", "ValuesView", "Generator",
    # meaningless unparameterized
    "Union", "Optional", "Literal",
}

_IGNORE_RE = re.compile(r"#\s*type\s*:\s*ignore")
_ANY_RE = re.compile(r"\bAny\b")

_STR_RE = re.compile(
    r"[rRbBfFuU]{0,2}'''(?:[^'\\]|\\.|'(?!''))*'''"
    r'|[rRbBfFuU]{0,2}"""(?:[^"\\]|\\.|"(?!""))*"""'
    r"|[rRbBfFuU]{0,2}'(?:[^'\\\n]|\\.)*'"
    r'|[rRbBfFuU]{0,2}"(?:[^"\\\n]|\\.)*"'
)

_BARE_WORD_RE = re.compile(
    r"(?<![\w.])(dict|list|set|frozenset|tuple|type|object|Dict|List|Set|FrozenSet|"
    r"Tuple|Type|Callable|DefaultDict|OrderedDict|Counter|ChainMap|Deque|"
    r"Sequence|MutableSequence|Mapping|MutableMapping|Iterable|Iterator|"
    r"Collection|Container|ItemsView|KeysView|ValuesView|Generator|Union|"
    r"Optional|Literal)(?![\w])(?!\s*\[)"
)


def _string_spans(seg: str) -> list[tuple[int, int, str]]:
    """(start, end, content) of every string literal in seg."""
    out = []
    for m in _STR_RE.finditer(seg):
        raw = m.group(0)
        body = re.sub(r"^[rRbBfFuU]*", "", raw)
        if body[:3] in ("'''", '"""'):
            content = body[3:-3]
        else:
            content = body[1:-1]
        out.append((m.start(), m.end(), content))
    return out


def _blank_spans(seg: str, spans: list[tuple[int, int, str]]) -> str:
    buf = list(seg)
    for s, e, _c in spans:
        for i in range(s, e):
            buf[i] = " "
    return "".join(buf)


def _literal_regions(blanked: str) -> list[tuple[int, int]]:
    """(start, end) of Literal[...] subscripts (input blanked: string
    contents can't confuse the depth count)."""
    regions = []
    for m in re.finditer(r"\bLiteral\s*\[", blanked):
        depth, i = 0, m.end() - 1
        while i < len(blanked):
            if blanked[i] == "[":
                depth += 1
            elif blanked[i] == "]":
                depth -= 1
                if depth == 0:
                    regions.append((m.start(), i + 1))
                    break
            i += 1
    return regions


def _scan_segment(seg: str) -> tuple[list[str], list[str]]:
    """All cheat hits in one annotation segment -> (any_hits, bare_hits).

    String literals are handled precisely: a bare name or Any smuggled
    inside quotes counts (Optional["Any"], X | "dict"), EXCEPT inside
    Literal[...] where quoted words are VALUES, never types
    (Literal["Any"] is the string "Any" — legal). A bare generic must
    carry its parameters wherever it appears: Optional[dict] and
    list[dict] refuse, not just top-level dict.
    """
    any_hits, bare_hits = [], []
    spans = _string_spans(seg)
    blanked = _blank_spans(seg, spans)
    lit_regions = _literal_regions(blanked)
    for s, _e, content in spans:
        if any(a <= s < b for a, b in lit_regions):
            continue
        if _ANY_RE.search(content):
            any_hits.append(f"quoted Any: {content.strip()[:40]}")
        elif content.strip() in BARE_GENERICS:
            bare_hits.append(f"quoted bare '{content.strip()}'")
    code = re.sub(r"#[^\n]*", " ", blanked)
    # type[object] is any class object — a precise top, not a cheat.
    code = re.sub(r"\b(?:typing\.)?(?:Type|type)\s*\[\s*object\s*\]",
                  "type[__AnyClass__]", code)
    if _ANY_RE.search(code):
        any_hits.append("Any")
    for m in _BARE_WORD_RE.finditer(code):
        bare_hits.append(f"bare '{m.group(1)}'")
    return any_hits, bare_hits


def _alias_names(tree: ast.Module, text: str) -> dict[str, int]:
    """Names bound to Any at module/class level (X = Any, X = "Any",
    X: TypeAlias = typing.Any, ...)."""
    found = {}
    for node in ast.walk(tree):
        target, value = None, None
        if isinstance(node, ast.Assign) and len(node.targets) == 1 \
                and isinstance(node.targets[0], ast.Name):
            target, value = node.targets[0].id, node.value
        elif isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name) \
                and node.value is not None:
            target, value = node.target.id, node.value
        if target is None:
            continue
        vseg = _seg(text, value).strip()
        if vseg[:3] in ("'''", '"""'):
            vcore = vseg[3:-3].strip()
        elif len(vseg) >= 2 and vseg[0] in "\"'" and vseg[-1] == vseg[0]:
            vcore = vseg[1:-1].strip()
        else:
            vcore = vseg
        if re.fullmatch(r"(?:typing\.)?Any", vcore):
            found[target] = node.lineno
    return found


def _scoped_files() -> list[Path]:
    out = []
    for scope in SCOPES:
        root = REPO / scope
        if not root.is_dir():
            continue
        for p in sorted(root.rglob("*.py")):
            if set(p.parts) & SKIP_PARTS:
                continue
            out.append(p)
    return out


def _parse(path: Path) -> tuple[ast.Module | None, str, list[str]]:
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        return None, "", [f"{path}: unreadable: {exc}"]
    try:
        return ast.parse(text), text, []
    except SyntaxError as exc:
        return None, text, [f"{path}:{exc.lineno}: unparseable ({exc.msg})"]


def _iter_functions(tree: ast.Module) -> list[ast.FunctionDef | ast.AsyncFunctionDef]:
    return [n for n in ast.walk(tree)
            if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]


def _params(fn: ast.FunctionDef | ast.AsyncFunctionDef) -> list[ast.arg]:
    a = fn.args
    params = list(a.posonlyargs) + list(a.args) + list(a.kwonlyargs)
    if a.vararg is not None:
        params.append(a.vararg)
    if a.kwarg is not None:
        params.append(a.kwarg)
    return params


def _seg(text: str, node: ast.AST | None) -> str:
    try:
        seg = ast.get_source_segment(text, node)
    except Exception:
        seg = None
    return seg if seg is not None else ""


def _collect() -> tuple[dict[Path, tuple[ast.Module, str]], list[str]]:
    """path -> (tree, text). Unparseable files are returned as violations."""
    parsed, broken = {}, []
    for path in _scoped_files():
        tree, text, errs = _parse(path)
        broken.extend(errs)
        if tree is not None:
            parsed[path] = (tree, text)
    return parsed, broken


def test_every_parameter_typed() -> None:
    parsed, broken = _collect()
    violations = list(broken)
    for path, (tree, _text) in parsed.items():
        rel = path.relative_to(REPO)
        for fn in _iter_functions(tree):
            for p in _params(fn):
                if p.arg in EXEMPT_PARAM_NAMES:
                    continue
                if p.annotation is None:
                    violations.append(f"{rel}:{fn.lineno}: {fn.name}({p.arg}) unannotated")
    assert not violations, (
        f"{len(violations)} unannotated parameters:\n" + "\n".join(violations[:30])
    )


def test_every_return_typed() -> None:
    parsed, broken = _collect()
    violations = list(broken)
    for path, (tree, _text) in parsed.items():
        rel = path.relative_to(REPO)
        for fn in _iter_functions(tree):
            if fn.returns is None:
                violations.append(f"{rel}:{fn.lineno}: {fn.name}() missing return annotation")
    assert not violations, (
        f"{len(violations)} missing return annotations:\n" + "\n".join(violations[:30])
    )


def test_no_any() -> None:
    parsed, broken = _collect()
    violations = list(broken)
    for path, (tree, text) in parsed.items():
        rel = path.relative_to(REPO)
        aliases = _alias_names(tree, text)
        for alias, lineno in aliases.items():
            violations.append(f"{rel}:{lineno}: Any laundered through alias '{alias}'")
        for fn in _iter_functions(tree):
            spots = [(p.arg, p.annotation) for p in _params(fn)
                     if p.annotation is not None]
            if fn.returns is not None:
                spots.append(("return", fn.returns))
            for name, ann in spots:
                seg = _seg(text, ann)
                any_hits, _bare = _scan_segment(seg)
                for hit in any_hits:
                    violations.append(f"{rel}:{fn.lineno}: {fn.name}({name}) {hit}: {seg.strip()[:60]}")
                if not any_hits:
                    for alias in aliases:
                        if re.search(r"\b" + re.escape(alias) + r"\b", seg):
                            violations.append(
                                f"{rel}:{fn.lineno}: {fn.name}({name}) uses Any-alias '{alias}'")
                            break
    assert not violations, (
        f"{len(violations)} Any cheats:\n" + "\n".join(violations[:30])
    )


def test_no_bare_generics() -> None:
    parsed, broken = _collect()
    violations = list(broken)
    for path, (tree, text) in parsed.items():
        rel = path.relative_to(REPO)
        for fn in _iter_functions(tree):
            spots = [(p.arg, p.annotation) for p in _params(fn)
                     if p.annotation is not None]
            if fn.returns is not None:
                spots.append(("return", fn.returns))
            for name, ann in spots:
                seg = _seg(text, ann)
                _any, bare_hits = _scan_segment(seg)
                for hit in bare_hits:
                    violations.append(f"{rel}:{fn.lineno}: {fn.name}({name}) {hit} (== hidden Any)")
    assert not violations, (
        f"{len(violations)} bare generics:\n" + "\n".join(violations[:30])
    )


def test_no_ignores() -> None:
    violations = []
    for path in _scoped_files():
        rel = path.relative_to(REPO)
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        for i, line in enumerate(text.splitlines(), 1):
            if _IGNORE_RE.search(line):
                violations.append(f"{rel}:{i}: silenced checker: {line.strip()[:80]}")
    assert not violations, (
        f"{len(violations)} silenced checkers:\n" + "\n".join(violations[:30])
    )
