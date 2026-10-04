// lora-section.spec.tsx — THE LORA BLOCK'S OWN WALLS: the block
// speaks exactly the manage plane's four verbs (lora_list,
// lora_install by path, lora_install by bytes, restart), asks for
// NOTHING on mount (the mount law), and renders the two honest
// boundaries the operator ordered: the engine's own combo (what
// /prompt will accept) and the user's own rows (with the unboarded
// and refused rows named, not discovered at run time).
//
// The transport is never under test: the manage lane is seated
// through the same seatManageNamespace seam the deck's apply uses,
// and the one refusal arm that is reachable — a block rendered
// before the manage contribution mounts — is pinned by its loud
// message, the panel's documented failure face.
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import LoraBlock from "../../src/client/lora-section";
import { seatManageNamespace } from "../../src/client/assets-tab";
import type { ManageActDoc, ManageEnvelopeRow, ManageJsonValue } from "@melite/estate-manage/types";
import type { RemoteResult } from "@deepseek-ai/dsh-typert-protocol";

interface Canned {
  data?: ManageJsonValue;
  detail?: string;
}

/** The list payload the real door serves (managePlane's lora_list:
 * engine combo, the user's parsed rows + problems, the unboarded
 * diff, the install dir). */
const LORA_LIST: Canned = {
  data: {
    engine_loras: ["flux-dev.safetensors", "z-image-turbo.safetensors"],
    user_rows: [{
      id: "u1",
      filename: "my-lora.safetensors",
      label: "My LoRA",
      families: ["z-image"],
      default_strength: 0.8,
    }],
    user_rows_path: "/x/user_loras.json",
    user_rows_present: true,
    user_row_problems: ["row u9: missing filename"],
    unboarded: ["ghost-lora.safetensors"],
    install_dir: "/x/loras",
  },
};

/** Seat ONE fake manage lane routing canned fixtures by action; every
 * act call is recorded verbatim so the assertions read the WIRE SHAPE
 * (the action + the payload fields), not a transport detail. */
function stubManageSeat(routes: Record<string, Canned | undefined>): Array<Record<string, unknown>> {
  const calls: Array<Record<string, unknown>> = [];
  seatManageNamespace({
    act: async (doc: ManageActDoc): Promise<RemoteResult<ManageEnvelopeRow>> => {
      calls.push({ ...doc });
      const canned = routes[doc.action];
      if (canned === undefined) {
        return { ok: true, value: { action: doc.action, ok: true, detail: `unstubbed action ${doc.action}` } };
      }
      return { ok: true, value: { action: doc.action, ok: true, detail: canned.detail ?? `canned ${doc.action}`, data: canned.data } };
    },
  });
  return calls;
}

const actionsOf = (calls: Array<Record<string, unknown>>): string[] =>
  calls.map((call) => String(call["action"]));

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  cleanup();
  seatManageNamespace(undefined);
});

test("THE MOUNT LAW: closed on render, asks for nothing until opened", () => {
  const calls = stubManageSeat({});
  render(<LoraBlock />);

  expect(screen.getByTestId("manage-loras")).toBeTruthy();
  expect(screen.getByText("Show LoRAs")).toBeTruthy();
  // the closed hint teaches the restart boundary before any fetch
  expect(screen.getByText(/Add a LoRA you already have:/)).toBeTruthy();
  expect(calls).toEqual([]);
});

test("opening the block posts lora_list once and renders both boundaries", async () => {
  const calls = stubManageSeat({ lora_list: LORA_LIST });
  render(<LoraBlock />);

  fireEvent.click(screen.getByText("Show LoRAs"));

  // the engine's own combo — what /prompt accepts
  expect(await screen.findByText(/The engine accepts 2 LoRA name/)).toBeTruthy();
  expect(screen.getByText("install dir: /x/loras")).toBeTruthy();
  // the user's rows, with the unboarded and refused rows named
  expect(screen.getByText(/1 of your row\(s\) are not in the engine list yet/)).toBeTruthy();
  expect(screen.getByText("· ghost-lora.safetensors")).toBeTruthy();
  expect(screen.getByText("your rows: 1 — /x/user_loras.json")).toBeTruthy();
  // exact textContent match: RTL's default normalizer would collapse
  // the row's deliberate double-space separators
  expect(
    screen.getByText((_, el) => el?.textContent === "· My LoRA  (my-lora.safetensors)  @0.8  [z-image]"),
  ).toBeTruthy();
  expect(screen.getByText("refused row — row u9: missing filename")).toBeTruthy();
  expect(actionsOf(calls)).toEqual(["lora_list"]);
});

test("Refresh posts lora_list again — the sequence is a law, not a accident", async () => {
  const calls = stubManageSeat({ lora_list: LORA_LIST });
  render(<LoraBlock />);
  fireEvent.click(screen.getByText("Show LoRAs"));
  await screen.findByText(/The engine accepts 2 LoRA name/);

  fireEvent.click(screen.getByText("Refresh"));

  await waitFor(() => {
    expect(actionsOf(calls)).toEqual(["lora_list", "lora_list"]);
  });
});

test("Copy LoRA in posts lora_install with the parsed path + families, then refreshes", async () => {
  const calls = stubManageSeat({ lora_list: LORA_LIST, lora_install: {} });
  render(<LoraBlock />);
  fireEvent.click(screen.getByText("Show LoRAs"));
  await screen.findByText(/The engine accepts 2 LoRA name/);

  const button = screen.getByText("Copy LoRA in") as HTMLButtonElement;
  expect(button.disabled).toBe(true); // an empty path never posts

  const pathInput = screen.getByTestId("manage-loras").querySelector("input[placeholder='/abs/path/to/my_lora.safetensors']") as HTMLInputElement;
  fireEvent.change(pathInput, { target: { value: "/abs/my.safetensors" } });
  const familiesInput = screen.getByTestId("manage-loras").querySelector("input[placeholder='families (comma)']") as HTMLInputElement;
  fireEvent.change(familiesInput, { target: { value: "z-image, flux" } });
  expect(button.disabled).toBe(false);

  fireEvent.click(button);

  await waitFor(() => {
    expect(actionsOf(calls)).toEqual(["lora_list", "lora_install", "lora_list"]);
  });
  const install = calls.find((call) => call["action"] === "lora_install") as Record<string, ManageJsonValue>;
  expect(install["path"]).toBe("/abs/my.safetensors");
  // the comma list is parsed: trimmed, empties dropped
  expect(install["families"]).toEqual(["z-image", "flux"]);
});

test("the upload door posts lora_install with filename + data-URL bytes (the civit flow)", async () => {
  const calls = stubManageSeat({ lora_list: LORA_LIST, lora_install: {} });
  render(<LoraBlock />);
  fireEvent.click(screen.getByText("Show LoRAs"));
  await screen.findByText(/The engine accepts 2 LoRA name/);

  const fileInput = screen.getByTestId("manage-loras").querySelector("input[type='file']") as HTMLInputElement;
  const file = new File(["bytes"], "downloaded.safetensors", { type: "application/octet-stream" });
  fireEvent.change(fileInput, { target: { files: [file] } });

  await waitFor(() => {
    expect(actionsOf(calls)).toContain("lora_install");
  });
  const install = calls.find((call) => call["action"] === "lora_install") as Record<string, ManageJsonValue>;
  expect(install["filename"]).toBe("downloaded.safetensors");
  // the browser read the file — the estate never fetched it
  expect(String(install["data"])).toMatch(/^data:/);
  // the default families field rides along parsed
  expect(install["families"]).toEqual(["z-image"]);
});

test("Restart engine posts restart, then refreshes the list", async () => {
  const calls = stubManageSeat({ lora_list: LORA_LIST, restart: {} });
  render(<LoraBlock />);
  fireEvent.click(screen.getByText("Show LoRAs"));
  await screen.findByText(/The engine accepts 2 LoRA name/);

  fireEvent.click(screen.getByText("Restart engine"));

  await waitFor(() => {
    expect(actionsOf(calls)).toEqual(["lora_list", "restart", "lora_list"]);
  });
});

test("a block rendered before the manage contribution mounts refuses loud", async () => {
  seatManageNamespace(undefined); // the loud-refusal arm: no lane seated
  render(<LoraBlock />);

  fireEvent.click(screen.getByText("Show LoRAs"));

  expect(await screen.findByText(/manage remote not mounted — the manage contribution must mount before any call/)).toBeTruthy();
  // and no list state was minted from the failure
  expect(screen.getByText(/The engine accepts 0 LoRA name/)).toBeTruthy();
});
