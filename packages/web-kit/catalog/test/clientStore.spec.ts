// clientStore.spec.ts — THE client store seat: the two construction forms,
// shallow-merge vs whole-record writes, the no-op write that notifies nobody,
// the subscriber hand-off (with the previous record), unsubscribe, and destroy.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { createClientStore } from "../src/clientStore.ts";

interface Counter {
  count: number
  label: string
  bump: (by: number) => void
}

function counter(): ReturnType<typeof createClientStore<Counter>> {
  return createClientStore<Counter>((set, get) => ({
    count: 0,
    label: "seed",
    bump: (by) => {
      set((s) => ({ count: s.count + by, label: get().label }));
    },
  }));
}

describe("createClientStore", () => {
  it("the creator form records what the initializer returned", () => {
    const store = counter();
    assert.deepEqual(Object.keys(store.getInitialState()).sort(), ["bump", "count", "label"]);
    store.getState().bump(2);
    assert.equal(store.getState().count, 2);
  });

  it("the value form seeds the record directly", () => {
    const plain = createClientStore({ n: 1 });
    assert.equal(plain.getState().n, 1);
    assert.deepEqual(plain.getInitialState(), { n: 1 });
    plain.setState({ n: 2 });
    assert.equal(plain.getState().n, 2);
  });

  it("shallow-merges object and function patches", () => {
    const store = counter();
    store.setState({ label: "object" });
    assert.equal(store.getState().label, "object");
    assert.equal(store.getState().count, 0); // untouched field survives the merge
    store.setState((s) => ({ label: `${s.label}+fn` }));
    assert.equal(store.getState().label, "object+fn");
  });

  it("a write that changes nothing notifies nobody", () => {
    const store = counter();
    let calls = 0;
    const unsub = store.subscribe(() => calls++);
    store.setState({ label: store.getState().label });
    assert.equal(calls, 0);
    unsub();
  });

  it("replace swaps the whole record; an identical record notifies nobody", () => {
    const store = counter();
    let calls = 0;
    const unsub = store.subscribe(() => calls++);
    const next: Counter = { ...store.getState(), label: "replaced" };
    store.setState(next, true);
    assert.equal(store.getState().label, "replaced");
    assert.equal(calls, 1);
    store.setState(next, true);
    assert.equal(calls, 1);
    unsub();
  });

  it("a function patch under replace yields the whole record", () => {
    const store = counter();
    store.setState((s) => ({ ...s, count: 7 }) as Counter, true);
    assert.equal(store.getState().count, 7);
    assert.equal(typeof store.getState().bump, "function");
  });

  it("subscriber hand-off carries the previous record; unsubscribe stops it", () => {
    const store = counter();
    const seen: Array<[number, string]> = [];
    const unsub = store.subscribe((state, prev) => seen.push([prev.count, state.label]));
    store.setState({ count: 3 });
    assert.deepEqual(seen, [[0, "seed"]]);
    unsub();
    store.setState({ count: 4 });
    assert.deepEqual(seen, [[0, "seed"]]);
  });

  it("destroy drops every subscription", () => {
    const store = counter();
    let calls = 0;
    store.subscribe(() => calls++);
    store.destroy();
    store.setState({ count: 1 });
    assert.equal(calls, 0);
    assert.equal(store.getState().count, 1);
  });
});
