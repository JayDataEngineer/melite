# profile/ — THIS PROJECT'S dsh composition, handed to dsh-provision

This is the **file input** for the dev lane (`:3088`, `melite-test`).
It belongs to inference.cpp, not to the provisioner: the estate, the
cards, the hot door and the link: deps are all inference.cpp's own
surfaces, so the composition that loads them is inference.cpp's file
too. `dsh-provision` validates it (`./apply.sh validate profile/` runs
the standalone gate) and deploys it into the lane's home
(`~/.dsh-dev/profiles/melite-test`). **Apply copies from here and never
writes to here** — the deployed copy is output, and hand-editing it is
the 2026-09-28 outage class.

The lane declares it as a file input:

```yaml
  melite-test:
    profile: melite-test
    profile_dir: /home/user/Documents/programs/active/inference.cpp/profile
    dsh_home: /home/user/.dsh-dev      # a side spot — never ~/.dsh (prod)
    on_demand: true                   # ./apply.sh launch --lane melite-test
```

The contract (composition, pins, roster, default model, teams, env
wiring) is `dsh-provision/dev_docs/profile-handoff.md`. The dev loop for
drop-ins is `dsh-provision/dev_docs/hot-reload-playbook.md`.

**Differences from the prod lane, exactly:**

1. The melite series of extensions (link: deps into THIS tree) — live
   extension development: edit here, mount live, no rebuild.
2. The hot door (`- insert:` row) + the melite-estate repoRoot runs-tree
   pin (the queue seat refuses to mount unpinned).
3. No agent presets spliced (the GUI lane doesn't spawn preset subagents).
4. Side home + on-demand launch: prod keeps the main spot at `:3080`.

Everything else — roster, retry policies, default model — rides the
same harness train as prod (`dsh-provision/pin/dsh-version`, 0.2.0-rc.1)
and the same invariants. Version rows are EXACT pins at the train; the
contract rejects ranges and anything below the train.
