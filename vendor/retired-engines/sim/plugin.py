"""plugin.py — sim plugin declaration (row 6, 2026-09-07)."""


class Plugin:
    id = "sim"
    label = "Sim"
    description = (
        "Queue-native test backend — executes flow stages through the "
        "real worker loop with zero inference (text files only, no "
        "models, no GPU). Named ONLY by walls (engine=\"sim\"); boards "
        "no models, serves no cards, appears in no offered surface.")
    engines = ("sim",)
    # plain assigns (no annotations) — the manifest wall's
    # AST walk reads ast.Assign only; an annotated bind is
    # invisible to it
    genres = ()
    dependencies = ()
