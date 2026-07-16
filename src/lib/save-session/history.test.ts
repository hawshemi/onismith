import { describe, expect, it } from "vitest";
import { MAX_HISTORY, record, redo, undo, type History } from "./history";

const empty = <T>(): History<T> => ({ past: [], future: [] });

describe("record", () => {
  it("pushes the present onto past and clears the redo branch", () => {
    const start: History<number> = { past: [1], future: [9] };
    const next = record(start, 2);
    expect(next.past).toEqual([1, 2]);
    expect(next.future).toEqual([]);
  });

  it("caps the past stack at the given max, dropping the oldest", () => {
    const start: History<number> = { past: [1, 2, 3], future: [] };
    const next = record(start, 4, 3);
    expect(next.past).toEqual([2, 3, 4]);
  });

  it("defaults to MAX_HISTORY depth", () => {
    let history = empty<number>();
    for (let i = 0; i < MAX_HISTORY + 10; i += 1) {
      history = record(history, i);
    }
    expect(history.past).toHaveLength(MAX_HISTORY);
    expect(history.past[history.past.length - 1]).toBe(MAX_HISTORY + 9);
  });
});

describe("undo", () => {
  it("returns null when there is nothing to undo", () => {
    expect(undo(empty<number>(), 5)).toBeNull();
  });

  it("moves the top of past to present and pushes present onto future", () => {
    const history: History<number> = { past: [1, 2], future: [] };
    const result = undo(history, 3);
    expect(result).not.toBeNull();
    expect(result?.present).toBe(2);
    expect(result?.history.past).toEqual([1]);
    expect(result?.history.future).toEqual([3]);
  });

  it("caps the future stack at the given max", () => {
    const history: History<number> = { past: [1], future: [10, 11] };
    const result = undo(history, 3, 2);
    expect(result?.history.future).toEqual([3, 10]);
  });
});

describe("redo", () => {
  it("returns null when there is nothing to redo", () => {
    expect(redo(empty<number>(), 5)).toBeNull();
  });

  it("moves the head of future to present and pushes present onto past", () => {
    const history: History<number> = { past: [1], future: [2, 3] };
    const result = redo(history, 0);
    expect(result?.present).toBe(2);
    expect(result?.history.past).toEqual([1, 0]);
    expect(result?.history.future).toEqual([3]);
  });
});

describe("round-trip", () => {
  it("undo then redo restores the original present and history", () => {
    const start: History<string> = { past: ["a", "b"], future: [] };
    const present = "c";
    const undone = undo(start, present);
    expect(undone?.present).toBe("b");
    const redone = redo(undone!.history, undone!.present);
    expect(redone?.present).toBe("c");
    expect(redone?.history.past).toEqual(["a", "b"]);
    expect(redone?.history.future).toEqual([]);
  });

  it("recording after an undo discards the redo branch", () => {
    const start: History<number> = { past: [1, 2], future: [] };
    const undone = undo(start, 3);
    expect(undone?.history.future).toEqual([3]);
    const recorded = record(undone!.history, 99);
    expect(recorded.future).toEqual([]);
    expect(recorded.past).toEqual([1, 99]);
  });
});
