import { describe, expect, it } from "vitest";
import type { SaveGame } from "@/lib/save-parser/model";
import { INITIAL_STATE, saveSessionReducer } from "./save-session-state";

function save(id: number): SaveGame {
  return { id } as unknown as SaveGame;
}

describe("saveSessionReducer", () => {
  it("tracks edits through undo and redo", () => {
    const original = save(1);
    const edited = save(2);
    const loaded = saveSessionReducer(INITIAL_STATE, {
      type: "LOAD_SUCCESS",
      saveGame: original,
      fileName: "colony.sav",
      parseTimeMs: 10,
    });

    const changed = saveSessionReducer(loaded, {
      type: "SET_SAVE_GAME",
      saveGame: edited,
    });
    expect(changed.isModified).toBe(true);
    expect(changed.history.past).toEqual([original]);

    const undone = saveSessionReducer(changed, { type: "UNDO" });
    expect(undone.saveGame).toBe(original);
    expect(undone.isModified).toBe(false);

    const redone = saveSessionReducer(undone, { type: "REDO" });
    expect(redone.saveGame).toBe(edited);
    expect(redone.isModified).toBe(true);
  });

  it("discards edits back to the latest saved baseline", () => {
    const original = save(1);
    const firstEdit = save(2);
    const secondEdit = save(3);
    let state = saveSessionReducer(INITIAL_STATE, {
      type: "LOAD_SUCCESS",
      saveGame: original,
      fileName: "colony.sav",
      parseTimeMs: 10,
    });
    state = saveSessionReducer(state, {
      type: "SET_SAVE_GAME",
      saveGame: firstEdit,
    });
    state = saveSessionReducer(state, {
      type: "SAVE_SUCCESS",
      bytes: 100,
      outcome: "original-updated",
    });
    state = saveSessionReducer(state, {
      type: "SET_SAVE_GAME",
      saveGame: secondEdit,
    });

    const discarded = saveSessionReducer(state, {
      type: "DISCARD_CHANGES",
    });
    expect(discarded.saveGame).toBe(firstEdit);
    expect(discarded.isModified).toBe(false);
    expect(discarded.history.past).toEqual([]);
  });

  it("keeps unsaved edits and history when a mutation does nothing", () => {
    const original = save(1);
    const edited = save(2);
    const loaded = saveSessionReducer(INITIAL_STATE, {
      type: "LOAD_SUCCESS",
      saveGame: original,
      fileName: "colony.sav",
      parseTimeMs: 10,
    });
    const changed = saveSessionReducer(loaded, {
      type: "SET_SAVE_GAME",
      saveGame: edited,
    });
    const unchanged = saveSessionReducer(changed, {
      type: "SET_SAVE_GAME",
      saveGame: edited,
      isModified: false,
    });

    expect(unchanged).toBe(changed);
    expect(unchanged.isModified).toBe(true);
    expect(saveSessionReducer(unchanged, { type: "UNDO" }).saveGame).toBe(
      original,
    );
  });

  it("keeps a clean session clean when a mutation does nothing", () => {
    const loaded = saveSessionReducer(INITIAL_STATE, {
      type: "LOAD_SUCCESS",
      saveGame: save(1),
      fileName: "colony.sav",
      parseTimeMs: 10,
    });
    expect(
      saveSessionReducer(loaded, {
        type: "SET_SAVE_GAME",
        saveGame: loaded.saveGame,
      }),
    ).toBe(loaded);
  });

  it.each([
    "original-updated",
    "download-started",
    "download-fallback",
  ] as const)(
    "records the %s result and clears it for the next save",
    (outcome) => {
      const saved = saveSessionReducer(INITIAL_STATE, {
        type: "SAVE_SUCCESS",
        bytes: 100,
        outcome,
      });
      expect(saved.lastSaveOutcome).toBe(outcome);
      expect(
        saveSessionReducer(saved, { type: "SAVE_BEGIN" }).lastSaveOutcome,
      ).toBeNull();
    },
  );
});
