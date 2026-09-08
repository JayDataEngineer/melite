"""compose/ui - the UI constructor.

Transforms action_cards definitions (card.py classes, tool.json,
action_cards/<lane>/ui overrides) into the surfaces upstream consumers
render: editor forms, card tiles, lane bundles. Pure derivation - the
action_cards tree is the SSOT; nothing here mutates card data.

(The TS lane folders under action_cards/<lane>/ui are the override
layer the future DRY consolidation folds into this constructor's
output; until then they ride next to their cards.)
"""
