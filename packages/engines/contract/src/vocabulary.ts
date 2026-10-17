// vocabulary.ts — the action-contract grammar (the atom vocabulary's
// engine-parameterized core).
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

/** A declared parameter of an action — the write plane's unit. The
 *  declared surface is data: `type` names the value tier, `bounds`
 *  the numeric envelope, `options` the enum's closed set (engine
 *  vocabularies land here), and `rule` names a managed affair the
 *  instantiator executes before the segment factory runs:
 *  "seed-sentinel" is GATE S — the param is the seed, -1 means
 *  random, and the one minter resolves it so every node sharing the
 *  seed shares the minted value. A variant preset pinning a param
 *  the surface does not offer, or a value outside the envelope,
 *  refuses at the family door. `"image"` is the SCALAR media seat —
 *  the value is a media path (a string at the wire), the form face
 *  is the picker + upload square, never freehand text (the NO-DROP
 *  law's write half: run-899a8448 typed a stage name into a media
 *  seat that declared as plain string). */
export interface ParamSpec {
  readonly name: string;
  readonly type: "number" | "string" | "boolean" | "enum" | "image" | "image_list";
  readonly bounds?: readonly [number, number];
  readonly options?: readonly string[];
  readonly rule?: "seed-sentinel";
}

/** The action shell the atom declares: what it offers upward — the
 *  boundary input ports it accepts, the boundary output ports, the
 *  declared params, and the segment factory behind them. The engine
 *  instance widens `build`'s context (the typed facts, the engine's
 *  builder) and its return (the engine's terminal handle); cards
 *  compose actions, never nodes. A self-contained action (its own
 *  loaders inside the segment) declares `inputs: []`. */
export interface ActionSpec<C, R> {
  readonly id: string;
  readonly inputs: readonly PortSpec[];
  readonly outputs: readonly PortSpec[];
  readonly params: readonly ParamSpec[];
  /** Present-only-when-true: the action reads nothing off a
   *  resolved model row, so a flow row may name it and the flow
   *  plane composes against the model-less facts shape. Absent =
   *  lane-bound — only a card's resolved row may dispatch it. */
  readonly laneIndependent?: boolean;
  readonly build: (ctx: C) => R;
}
