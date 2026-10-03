# packages/engines/cpp/ — the native-engine category

NATIVE engines: the plugin's execute runs a LOCAL subprocess against a
pinned CLI contract (vs the comfyui engine's remote-HTTP contract).
Membership is about the ABI, not the language — anyCreature is node, the
same way audio-cpp wraps a cmake-built binary and ffmpeg a system binary.

Each engine is a plugin dir here (compose-first shape + the vendor law):

    packages/engines/cpp/<name>/
      plugin.py            # class Plugin: id, engines=(<type>,), genres
      compose/__init__.py  # card_compose(phase 1/2) + execute (subprocess)
      models/<genre>/<model>/model.py   # frozen rows, only if weights exist
      vendor/<engine>/     # THE ENGINE SOURCE (submodule, fork-when-patched)

The source lives in-tree — no provision-time clones. Builds materialize
to data/runtime/<engine>/ (never committed); execute resolves env
override → runtime build → loud 4xx. Weights are never vendored.

Discovery note: the loader's category-subdir recursion is the one core
change this category needs (python/plugins.py `_iter_plugin_dirs` is depth-2
today). Until it lands, this README is the only resident — which the scan
ignores harmlessly.

Design record: dev_docs/plans/cpp-engines.md (the sketch — anyCreature forge
card, kimodo motion card, autoremesher quad-remesh card, the chain).
