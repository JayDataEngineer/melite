# qwen-img-edit-2511's loras mod — the RUNTIME CATALOG door.
#
# The family boards the loras channel with NO rows of its own: this
# lane has no family-trained loras yet, but the operator's loras are
# ESTATE assets (operator order, 2026-09-05, verbatim: "THE LORAS
# DON'T MAP, I DON'T SEE MY KREA2 LORAS... RUNTIME VALIDATION"). The
# form-spec serves the RUNTIME CATALOG — the union of every family's
# declared LoraRow rows — and the compose door validates picks against
# the same union at run time, refusing unknown ids LOUD. A qwen-native
# lora collection lands here as rows the day one exists (family rows
# always win over the union in both doors).

from melite_cards import LorasMod


class Loras(LorasMod):
    """The edit lane's loras — the runtime catalog door (no own rows)."""
    pack = "loras"
    rows = ()
    runtime_catalog = True
