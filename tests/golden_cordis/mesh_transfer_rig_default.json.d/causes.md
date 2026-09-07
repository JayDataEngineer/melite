# causes — mesh_transfer_rig_default

2026-09-07: img-to-mesh card golden (transfer_rig_t1 arm, cluster
H), captured from the PRODUCTION python renderer
(`render("transfer_rig_t1", doc, TransferRig)`). Path params are
absolute mount refs (PrimitiveString constants — the anny
CompositeCharacter pattern); the compose step doc stamps
filename_prefix "<run_id>/out" but the renderer never reads it, so
the graph carries no prefix. Four nodes, all pack nodes
(melite-autorig-nodes: KimodoTransferWeights + SaveRiggedModel).

Pins the rig-copy branch of cards/img-to-mesh.ts.
