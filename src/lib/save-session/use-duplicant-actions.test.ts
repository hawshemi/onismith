import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { SaveGame } from "@/lib/save-parser/model";
import { getBehavior, getGameObjectById } from "./save-mutations";
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
