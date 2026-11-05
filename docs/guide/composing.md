# Composing and running

## In the browser (chat sessions)

The agent-facing compose contract is progressive disclosure:

```text
melite_discover → melite_load → melite_construct
```

- `melite_discover` finds the card or flow for the request.
- `melite_load` opens it — parameters, models, skills — and reports any
  missing weights or packs in the load payload.
- `melite_construct` authors the shared bench (`read`, `add_stage`,
  `patch`, `rewire`, and related verbs). You watch it land in the Cards
  tab and edit alongside.

Runs start at **your** Run press on the card — never the agent's. In
this mode the agent never drives the engine directly: every run crosses
the estate's queue. `comfy_manage` is for status and declared-resource
management (installing packs and weights), not generation.

## Delegated runs (headless commissions)

One-shot task runners are DSH's own surface — melite renders no parallel
headless mount:

```sh
dsh headless "<task brief>"
```

To let an agent START runs itself, flip the lane's delegation:

```text
/melite-runs on
```

The toggle persists in `${DSH_HOME:-$HOME/.dsh}/melite-runs-state.json`; a
boot whose record is ON seats `melite_flow` (submit a card or named flow)
and `run_status` (monitor). They cross the same queue and draft-backed
registration path as the studio. With the record OFF (the default), runs
wait for the user's Run press.

## Wiring the agent driver

The agent seats need one LLM driver: a `cordis.patch.yml` in
`${DSH_HOME:-$HOME/.dsh}` naming the provider and model, and the
provider key under the same root in `.credentials.yaml` (mode 0600;
never committed, never printed). With the key seated, the estate
job server selects the driver with `MELITE_AGENT_ROUTE`
(`<provider>/<model>`).

From there the flow is conversational: ask for an image, the agent
composes it on the bench card, and the run waits for your press.
