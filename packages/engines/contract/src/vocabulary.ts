// vocabulary.ts — the action-contract grammar (the atom vocabulary's
// engine-parameterized core — docs/design/atom-vocabulary-2026-10-12.md).
// This module carries only the shapes every engine shares: boundary
// ports, declared params with their managed affairs, and the action
// shell an atom declares and the interpreter instantiates. The
// per-engine instance — the slot-kind set, the facts door, the
// builder — lives at the engine plane (the ComfyUI one:
// comfyui-card-kit's action.ts). Source-plane TS (erasable syntax —
// no enums, no namespaces).

/** A typed port on an action boundary. `kind` names the engine's own
 *  slot vocabulary (the ComfyUI instance spells IMAGE, LATENT, MASK,
 *  ...); the set is the engine's, never averaged across engines. */
export interface PortSpec<K extends string = string> {
  readonly name: string;
  readonly kind: K;
}

/** A declared parameter of an action. `rule` names a managed affair
 *  the instantiator executes before the segment factory runs:
 *  "seed-sentinel" is GATE S — the param is the seed, -1 means
 *  random, and the one minter resolves it so every node sharing the
 *  seed shares the minted value. */
export interface ParamSpec {
  readonly name: string;
  readonly rule?: "seed-sentinel";
}

/** The action shell the atom declares: what it offers upward — the
 *  boundary output ports, the declared params, and the segment
 *  factory behind them. The engine instance widens `build`'s context
 *  (the typed facts, the engine's builder) and its return (the
 *  engine's terminal handle); cards compose actions, never nodes. */
export interface ActionSpec<C, R> {
  readonly id: string;
  readonly outputs: readonly PortSpec[];
  readonly params: readonly ParamSpec[];
  /** Present-only-when-true: the action reads nothing off a
   *  resolved model row, so a flow row may name it and the flow
   *  plane composes against the model-less facts shape. Absent =
   *  lane-bound — only a card's resolved row may dispatch it. */
  readonly laneIndependent?: boolean;
  readonly build: (ctx: C) => R;
}
