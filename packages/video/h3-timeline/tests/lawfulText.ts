// lawfulText.ts — the gate-lawful call texts the card's film
// fixtures compose (the VID GEN handoff, 2026-11-12: the prompt
// gate refuses caption-grade call text at the compose door, so a
// fixture that composes a film rides REAL craft text — never a
// blanket waiver, which the served spec calls an operator decision,
// never a default). LAWFUL_TEXT is the prompt dictionary's own
// "good call passes" acceptance case — if the gate ever refuses its
// own dictionary's good call, every film fixture reds; the oracle
// is the fixture. LAWFUL_TEXT_CARRIED is a second distinct text so
// multi-call fixtures keep distinguishable windows. Both are
// self-verified against the gate at load: a fixture text that
// drifts below the law refuses here, never mid-suite.
import { DICTIONARY, checkPress } from "../src/promptGate.ts";

const caseText = (name: string): string => {
  const c = DICTIONARY.acceptance_cases.find((x) => x.name === name);
  if (c === undefined) throw new Error(`the dictionary ships no acceptance case '${name}'`);
  const calls = c.input.calls as Array<{ text?: unknown }>;
  if (!Array.isArray(calls) || typeof calls[0]?.text !== "string") {
    throw new Error(`acceptance case '${name}' carries no call text`);
  }
  return calls[0].text;
};

/** The opening call's lawful text (the dictionary's "good call
 * passes" case) — style line, scene + subject, pose, camera verb
 * with amplitude and speed, ambient sound. */
export const LAWFUL_TEXT = caseText("good call passes");

/** The carried call's lawful text — a distinct film beat under the
 * same laws (a second window of the same harbour film, the camera
 * pans right). */
export const LAWFUL_TEXT_CARRIED =
  "Live-action, cinematic, shallow depth of field. The same harbour as the light warms: the water turned to low gold, the boats' reflections steadying, a small boat entering from the left with an even, unhurried stroke. The gull has landed on the near piling and stays there, folded. The camera pans right with small amplitude at slow speed, following the boat across the frame without losing the quay's edge. Gulls call overhead, the boat's wake spreads and flattens behind it, and the water keeps its slow rhythm against the worn stone quay.";

/** The quiet call's lawful text — the authored 'no dialogue'
 * indication carried inside real craft (the authored-indication
 * arm's semantic subject: renderer honors /\bno[\s_-]*(speech|
 * dialogue|voice)/i, the gate's speech markers never match —
 * 'dialogue' alone is not a voice claim). */
export const LAWFUL_TEXT_QUIET =
  "Live-action, cinematic, natural light. A quiet street at dawn, no dialogue anywhere, wind only moving the loose shutters and paper scraps along the curb. A lone cyclist crosses far off, tires whispering on wet asphalt, then gone. The camera pushes in with small amplitude at slow speed along the empty sidewalk, holding the row of shuttered shops. Awnings breathe in the early gusts. Dust lifts past a streetlamp still lit. Pigeons settle on a wire and hold. The light climbs the brickwork slowly while the street stays empty and unwatched.";

for (const [name, text] of [["LAWFUL_TEXT", LAWFUL_TEXT], ["LAWFUL_TEXT_CARRIED", LAWFUL_TEXT_CARRIED], ["LAWFUL_TEXT_QUIET", LAWFUL_TEXT_QUIET]] as const) {
  const verdict = checkPress({ calls: [{ text }] }).verdict;
  if (verdict !== "pass") {
    throw new Error(`${name} is not gate-lawful (verdict ${verdict}) — a fixture text drifted below the prompt dictionary's law`);
  }
}
