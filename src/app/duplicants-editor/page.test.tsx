import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import type { SaveGame } from "@/lib/save-parser/model";
import {
  getBehavior,
  getGameObjectById,
} from "@/lib/save-session/save-mutations";
import { useWorldActions } from "@/lib/save-session/use-world-actions";
import DuplicantEditorPage from "./page";
import type ReactionModal from "./reaction-modal";

const session = vi.hoisted(() => ({
  saveGame: null as SaveGame | null,
  modifyBehavior: null as
    ReturnType<typeof useWorldActions>["modifyBehavior"] | null,
  modal: null as ComponentProps<typeof ReactionModal> | null,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/save-session/save-session-context", () => ({
  useSaveSession: () => ({
    saveGame: session.saveGame,
    hasSave: true,
    selectedDuplicantId: 1,
    modifyBehavior: session.modifyBehavior,
  }),
}));

vi.mock("./reaction-modal", () => ({
  default: (props: ComponentProps<typeof ReactionModal>) => {
    session.modal = props;
    return null;
  },
}));

function editor(name: string, traits: string[]) {
  session.saveGame = {
    gameObjects: [
      {
        name: "Minion",
        gameObjects: [
          {
            behaviors: [
              { name: "KPrefabID", templateData: { InstanceID: 1 } },
              { name: "MinionIdentity", templateData: { name: "Ada" } },
              { name, templateData: { TraitIds: traits } },
            ],
          },
        ],
      },
    ],
  } as unknown as SaveGame;
  const setSaveGame = vi.fn();
  function Harness() {
    session.modifyBehavior = useWorldActions(
      session.saveGame,
      setSaveGame,
    ).modifyBehavior;
    return createElement(DuplicantEditorPage);
  }
  renderToStaticMarkup(createElement(Harness));
  return () =>
    getBehavior(getGameObjectById(setSaveGame.mock.calls[0][0], 1), name)
      ?.templateData.TraitIds;
}

it.each(["Klei.AI.Traits", "MinionTraits"])(
  "writes canonical ids for bulk additions through %s",
  (name) => {
    const result = editor(name, ["Mod_CustomTrait", "Greasemonkey"]);

    session.modal!.onSetCategoryTraits(
      ["GREASEMONKEY", "DEEPERDIVERSLUNGS", "GRANTSKILL_ARTING1"],
      true,
    );

    expect(result()).toEqual([
      "Mod_CustomTrait",
      "Greasemonkey",
      "DeeperDiversLungs",
      "GrantSkill_Arting1",
    ]);
  },
);

it.each(["Klei.AI.Traits", "MinionTraits"])(
  "writes canonical reaction ids through %s",
  (name) => {
    const result = editor(name, [
      "Mod_CustomTrait",
      "StickerBomber",
      "STICKERBOMBER",
      "BingeEater",
    ]);

    session.modal!.onApplyReaction("overjoyed", "SUPERPRODUCTIVE");

    expect(result()).toEqual([
      "Mod_CustomTrait",
      "BingeEater",
      "SuperProductive",
    ]);
  },
);
