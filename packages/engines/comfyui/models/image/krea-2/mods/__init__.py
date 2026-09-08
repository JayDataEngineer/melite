# krea-2's mods package — the family's mod flavors (per-family
# subclasses of the melite_cards menu classes). model.py loads each
# via melite_models.load_mod(__file__, "<stem>", "<Class>"); the mods
# declaration stays in model.py's `mods = (...)` tuple. No __init__
# re-exports: load_mod is the canonical door (file-based spec, unique
# module names — plain relative imports do not resolve under
# load_model_py).
