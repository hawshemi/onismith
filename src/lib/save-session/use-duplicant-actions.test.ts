import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { SaveGame } from "@/lib/save-parser/model";
import {
  DUPLICANT_INTEREST_NAMES,
  getSkillGroupHash,
} from "@/lib/oni/minion-interests";
import { getBehavior, getGameObjectById } from "./save-mutations";
import { INITIAL_STATE, saveSessionReducer } from "./save-session-state";
import { useDuplicantActions } from "./use-duplicant-actions";

function sessionActions(saveGame: SaveGame) {
  const options = {
    saveGame,
    copyPasteData: null,
    importWarning: null,
    setSaveGame: vi.fn(),
    setError: vi.fn(),
    setCopyPasteData: vi.fn(),
    setImportWarning: vi.fn(),
    clearImportWarning: vi.fn(),
    setSelectedDuplicantId: vi.fn(),
  };
  let actions: ReturnType<typeof useDuplicantActions> | undefined;
  function TestSession() {
    actions = useDuplicantActions(options);
    return null;
  }
  renderToStaticMarkup(createElement(TestSession));
  return { ...options, ...actions! };
}

function colony(nextUniqueID: number | null = 2): SaveGame {
  return {
    header: { gameInfo: { numberOfDuplicants: 1 } },
    settings: { nextUniqueID },
    gameObjects: [
      {
        name: "Minion",
        gameObjects: [
          {
            behaviors: [
              { name: "KPrefabID", templateData: { InstanceID: 1 } },
              { name: "MinionIdentity", templateData: { name: "Ada" } },
              {
                name: "MinionResume",
                templateData: { totalExperienceGained: 5 },
              },
            ],
          },
        ],
      },
    ],
  } as unknown as SaveGame;
}

describe("duplicant action results", () => {
  it.each(["Klei.AI.Traits", "MinionTraits"])(
    "writes canonical trait ids through %s without changing unknown ids",
    (name) => {
      const original = colony();
      original.gameObjects[0].gameObjects[0].behaviors.push({
        name,
        templateData: { TraitIds: ["Mod_CustomTrait"] },
      });
      const session = sessionActions(original);

      session.addDuplicantTrait(1, "DEEPERDIVERSLUNGS");

      const next = session.setSaveGame.mock.calls[0][0];
      expect(
        getBehavior(getGameObjectById(next, 1), name)?.templateData.TraitIds,
      ).toEqual(["Mod_CustomTrait", "DeeperDiversLungs"]);
      expect(
        original.gameObjects[0].gameObjects[0].behaviors.at(-1)?.templateData
          .TraitIds,
      ).toEqual(["Mod_CustomTrait"]);
    },
  );

  it("does not add a trait already present with different casing", () => {
    const original = colony();
    original.gameObjects[0].gameObjects[0].behaviors.push({
      name: "Klei.AI.Traits",
      templateData: { TraitIds: ["DeeperDiversLungs"] },
    });
    const session = sessionActions(original);

    session.addDuplicantTrait(1, "DEEPERDIVERSLUNGS");

    expect(session.setSaveGame).toHaveBeenCalledWith(original, {
      isModified: false,
    });
  });

  it("keeps distinct unknown mod ids when adding a trait", () => {
    const original = colony();
    original.gameObjects[0].gameObjects[0].behaviors.push({
      name: "Klei.AI.Traits",
      templateData: { TraitIds: ["Mod_CustomTrait"] },
    });
    const session = sessionActions(original);

    session.addDuplicantTrait(1, "MOD_CUSTOMTRAIT");

    const next = session.setSaveGame.mock.calls[0][0];
    expect(
      getBehavior(getGameObjectById(next, 1), "Klei.AI.Traits")?.templateData
        .TraitIds,
    ).toEqual(["Mod_CustomTrait", "MOD_CUSTOMTRAIT"]);
  });

  it("removes only the selected unknown mod id", () => {
    const original = colony();
    original.gameObjects[0].gameObjects[0].behaviors.push({
      name: "Klei.AI.Traits",
      templateData: { TraitIds: ["Mod_CustomTrait", "MOD_CUSTOMTRAIT"] },
    });
    const session = sessionActions(original);

    session.removeDuplicantTrait(1, "Mod_CustomTrait");

    const next = session.setSaveGame.mock.calls[0][0];
    expect(
      getBehavior(getGameObjectById(next, 1), "Klei.AI.Traits")?.templateData
        .TraitIds,
    ).toEqual(["MOD_CUSTOMTRAIT"]);
  });

  it("imports only selected categories from a file", async () => {
    const session = sessionActions(colony());
    const file = new File(
      [
        JSON.stringify({
          gameObjectType: "Minion",
          behaviors: {
            MinionIdentity: { templateData: { name: "Burt" } },
            MinionResume: { templateData: { totalExperienceGained: 10 } },
          },
        }),
      ],
      "duplicant.json",
    );

    expect(
      await session.importDuplicantBehaviors(1, file, ["MinionResume"]),
    ).toBe("applied");
    const next = session.setSaveGame.mock.calls[0][0];
    const duplicant = getGameObjectById(next, 1);
    expect(getBehavior(duplicant, "MinionIdentity")?.templateData?.name).toBe(
      "Ada",
    );
    expect(
      getBehavior(duplicant, "MinionResume")?.templateData
        ?.totalExperienceGained,
    ).toBe(10);

    expect(
      await session.importDuplicantBehaviors(1, file, ["MissingCategory"]),
    ).toBe("ignored");
  });

  it("reports a failed clone without pretending it changed the save", () => {
    const session = sessionActions(colony(null));
    expect(session.cloneDuplicant(1)).toBe(false);
    expect(session.setSaveGame).not.toHaveBeenCalled();
    expect(session.setError).toHaveBeenCalled();
  });

  it("reports success after a clone is added and selected", () => {
    const session = sessionActions(colony());
    expect(session.cloneDuplicant(1)).toBe(true);
    const next = session.setSaveGame.mock.calls[0][0];
    expect(next.header.gameInfo.numberOfDuplicants).toBe(2);
    expect(session.setSelectedDuplicantId).toHaveBeenCalledWith(2);
  });
});

describe("bulk duplicant interests", () => {
  it("checks standard interests without replacing selected aptitudes or unknown data", () => {
    const original = colony();
    const resume = getBehavior(getGameObjectById(original, 1), "MinionResume")!;
    const selected = [{ hash: getSkillGroupHash("Farming") }, 2.5];
    const unknown = [{ hash: 123456789 }, 4];
    const legacy = [{ hash: getSkillGroupHash("Management") }, 3];
    const inactive = [{ hash: getSkillGroupHash("Cooking") }, 0];
    resume.templateData = {
      ...resume.templateData,
      currentHat: "Research2",
      AptitudeBySkillGroup: [selected, unknown, legacy, inactive],
    };
    const session = sessionActions(original);

    session.setAllDuplicantInterests(1, true);

    expect(session.setSaveGame).toHaveBeenCalledTimes(1);
    const next = session.setSaveGame.mock.calls[0][0];
    const result = getBehavior(
      getGameObjectById(next, 1),
      "MinionResume",
    )!.templateData;
    expect(result.AptitudeBySkillGroup).toHaveLength(
      DUPLICANT_INTEREST_NAMES.length + 2,
    );
    expect(result.AptitudeBySkillGroup.slice(0, 3)).toEqual([
      selected,
      unknown,
      legacy,
    ]);
    for (const name of DUPLICANT_INTEREST_NAMES) {
      expect(result.AptitudeBySkillGroup).toContainEqual([
        { hash: getSkillGroupHash(name) },
        name === "Farming" ? 2.5 : 1,
      ]);
    }
    expect(result).toMatchObject({
      totalExperienceGained: 5,
      currentHat: "Research2",
    });
    expect(resume.templateData.AptitudeBySkillGroup).toEqual([
      selected,
      unknown,
      legacy,
      inactive,
    ]);

    const repeated = sessionActions(next);
    repeated.setAllDuplicantInterests(1, true);
    expect(repeated.setSaveGame).toHaveBeenCalledWith(next, {
      isModified: false,
    });
  });

  it("unchecks recognized interests while retaining unknown hashes and other resume fields", () => {
    const original = colony();
    const resume = getBehavior(getGameObjectById(original, 1), "MinionResume")!;
    const unknown = [{ hash: 123456789 }, 4];
    resume.templateData = {
      ...resume.templateData,
      MasteryBySkillID: [["Mining1", true]],
      AptitudeBySkillGroup: [
        ...DUPLICANT_INTEREST_NAMES.map((name) => [
          { hash: getSkillGroupHash(name) },
          1,
        ]),
        [{ hash: getSkillGroupHash("Management") }, 2],
        unknown,
      ],
    };
    const session = sessionActions(original);

    session.setAllDuplicantInterests(1, false);

    expect(session.setSaveGame).toHaveBeenCalledTimes(1);
    const next = session.setSaveGame.mock.calls[0][0];
    expect(
      getBehavior(getGameObjectById(next, 1), "MinionResume")!.templateData,
    ).toEqual({
      totalExperienceGained: 5,
      MasteryBySkillID: [["Mining1", true]],
      AptitudeBySkillGroup: [unknown],
    });
  });

  it.each([true, false])(
    "changes all interests with one undo step when enabled is %s",
    (enabled) => {
      const original = colony();
      const resume = getBehavior(
        getGameObjectById(original, 1),
        "MinionResume",
      )!;
      resume.templateData.AptitudeBySkillGroup = [
        [{ hash: getSkillGroupHash("Farming") }, 1],
        [{ hash: getSkillGroupHash("Building") }, 1],
      ];
      let state = saveSessionReducer(INITIAL_STATE, {
        type: "LOAD_SUCCESS",
        saveGame: original,
        fileName: "colony.sav",
        parseTimeMs: 0,
      });
      const session = sessionActions(original);
      session.setSaveGame.mockImplementation((saveGame, options) => {
        state = saveSessionReducer(state, {
          type: "SET_SAVE_GAME",
          saveGame,
          ...options,
        });
      });

      session.setAllDuplicantInterests(1, enabled);

      expect(state.history.past).toEqual([original]);
      expect(state.isModified).toBe(true);
      const undone = saveSessionReducer(state, { type: "UNDO" });
      expect(undone.saveGame).toBe(original);
      expect(undone.isModified).toBe(false);
    },
  );

  it.each(["BionicMinion", "Klei.AI.Traits", "MinionTraits"])(
    "preserves bionic duplicants identified by %s",
    (identity) => {
      const original = colony();
      if (identity === "BionicMinion") {
        original.gameObjects[0].name = identity;
      } else {
        original.gameObjects[0].gameObjects[0].behaviors.push({
          name: identity,
          templateData: { TraitIds: ["BIONICBUG1"] },
        });
      }
      const session = sessionActions(original);

      session.setAllDuplicantInterests(1, true);
      session.setAllDuplicantInterests(1, false);

      for (const [next, options] of session.setSaveGame.mock.calls) {
        expect(next).toBe(original);
        expect(options.isModified).toBe(false);
      }
      expect(
        getBehavior(getGameObjectById(original, 1), "MinionResume")!
          .templateData,
      ).toEqual({ totalExperienceGained: 5 });
    },
  );
});
