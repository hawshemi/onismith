"use client";

import { useCallback } from "react";
import { SimHashNames, type SaveGame } from "@/lib/save-parser/model";
import { clampToFloat32 } from "@/lib/oni/clamp";
import { getHashedStringHash } from "@/lib/oni/minion-interests";
import { setPathValue } from "@/lib/oni/raw-path-utils";
import {
  applySandboxModeFlags,
  findGameObjectLocation,
  getBehaviorCandidates,
  isPlainObject,
  mergeDeep,
  moveGameObjectToGroup,
  mutateGameObjectById,
  setBuildingName,
  setCycleCount,
  updateBehaviorExtra,
  updateBehaviorTemplate,
  updateSaveGameRoot,
  upsertDifficultySetting,
  type BehaviorTemplate,
} from "./save-mutations";
import type { SetSaveGameOptions } from "./save-session-state";

type SetSaveGame = (
  saveGame: SaveGame | null,
  options?: SetSaveGameOptions,
) => void;

export function useWorldActions(
  saveGame: SaveGame | null,
  setSaveGame: SetSaveGame,
) {
  const commit = useCallback(
    (next: SaveGame) => {
      setSaveGame(next, { isModified: next !== saveGame });
    },
    [saveGame, setSaveGame],
  );

  const updateDifficultySetting = useCallback(
    (difficultyType: string, value: string) => {
      if (!saveGame) return;
      let next: SaveGame = {
        ...saveGame,
        gameData: {
          ...saveGame.gameData,
          customGameSettings: {
            ...saveGame.gameData.customGameSettings,
            CurrentQualityLevelsBySetting: upsertDifficultySetting(
              saveGame.gameData?.customGameSettings
                ?.CurrentQualityLevelsBySetting,
              difficultyType,
              value,
            ),
          },
        },
      };
      if (difficultyType === "SandboxMode") {
        next = applySandboxModeFlags(next, value === "Enabled");
      }
      commit(next);
    },
    [commit, saveGame],
  );

  const updateColonyName = useCallback(
    (name: string) => {
      const gameInfo = saveGame?.header?.gameInfo;
      if (!saveGame || !gameInfo || gameInfo.baseName === name) return;
      commit({
        ...saveGame,
        header: {
          ...saveGame.header,
          gameInfo: { ...gameInfo, baseName: name },
        },
      });
    },
    [commit, saveGame],
  );

  const updateCycleCount = useCallback(
    (cycles: number) => {
      if (!saveGame) return;
      const next = setCycleCount(saveGame, cycles);
      if (next === saveGame) return;
      commit(next);
    },
    [commit, saveGame],
  );

  const updateGeyserType = useCallback(
    (gameObjectId: number, geyserType: string) => {
      if (!saveGame || !geyserType) return;
      const location = findGameObjectLocation(saveGame, gameObjectId);
      if (!location) return;
      const nextObject = updateBehaviorTemplate(
        location.gameObject,
        "Geyser",
        (template) => ({
          ...(template || {}),
          configuration: {
            ...(template?.configuration || {}),
            typeId: { hash: getHashedStringHash(geyserType) },
          },
        }),
      );
      commit(
        moveGameObjectToGroup(
          saveGame,
          location,
          nextObject,
          `GeyserGeneric_${geyserType}`,
        ),
      );
    },
    [commit, saveGame],
  );

  const updateGeyserParameter = useCallback(
    (gameObjectId: number, parameterName: string, value: number) => {
      if (!saveGame || !parameterName || !Number.isFinite(value)) return;
      commit(
        mutateGameObjectById(saveGame, gameObjectId, (gameObject) =>
          updateBehaviorTemplate(gameObject, "Geyser", (template) => ({
            ...(template || {}),
            configuration: {
              ...(template?.configuration || {}),
              [parameterName]: clampToFloat32(value),
            },
          })),
        ),
      );
    },
    [commit, saveGame],
  );

  const updateCreaturePosition = useCallback(
    (gameObjectId: number, axis: "x" | "y" | "z", value: number) => {
      if (
        !saveGame ||
        !Number.isFinite(gameObjectId) ||
        !Number.isFinite(value)
      ) {
        return;
      }
      commit(
        mutateGameObjectById(saveGame, gameObjectId, (gameObject) => {
          const clamped = clampToFloat32(value);
          return gameObject.position?.[axis] === clamped
            ? gameObject
            : {
                ...gameObject,
                position: { ...gameObject.position, [axis]: clamped },
              };
        }),
      );
    },
    [commit, saveGame],
  );

  const updateRawValue = useCallback(
    (path: Array<string | number>, value: unknown) => {
      if (!saveGame || path.length === 0) return;
      commit(setPathValue(saveGame, path, value) as SaveGame);
    },
    [commit, saveGame],
  );

  const updateBuildingName = useCallback(
    (gameObjectId: number, name: string) => {
      if (!saveGame) return;
      commit(setBuildingName(saveGame, gameObjectId, name));
    },
    [commit, saveGame],
  );

  const modifyBehavior = useCallback(
    (
      gameObjectId: number,
      behaviorName: string,
      target: string,
      value: unknown,
      merge = false,
    ) => {
      if (!saveGame || !Number.isFinite(gameObjectId)) return;
      const candidates = getBehaviorCandidates(behaviorName);
      if (candidates.length === 0) return;
      const targetKey = target === "extraData" ? "extraData" : "templateData";
      commit(
        mutateGameObjectById(saveGame, gameObjectId, (gameObject) => {
          let nextObject = gameObject;
          for (const name of candidates) {
            const update = (original: unknown) => {
              if (!merge) {
                if (!isPlainObject(original) || !isPlainObject(value)) {
                  return value;
                }
                return { ...original, ...value };
              }
              return mergeDeep(
                isPlainObject(original) ? original : {},
                isPlainObject(value) ? value : {},
              );
            };
            const updated =
              targetKey === "extraData"
                ? updateBehaviorExtra(nextObject, name, update)
                : updateBehaviorTemplate(nextObject, name, update);
            if (updated !== nextObject) {
              nextObject = updated;
              break;
            }
          }
          return nextObject;
        }),
      );
    },
    [commit, saveGame],
  );

  const updatePlanet = useCallback(
    (planetId: number, patch: Record<string, unknown>) => {
      if (!saveGame || !Number.isFinite(planetId) || !patch) return;
      commit(
        updateSaveGameRoot(saveGame, (gameObject) =>
          updateBehaviorTemplate(
            gameObject,
            "SpacecraftManager",
            (template) => {
              if (!template || typeof template !== "object") return template;
              const destinations = Array.isArray(template.destinations)
                ? template.destinations
                : [];
              if (
                !destinations.some(
                  (entry: BehaviorTemplate) => entry?.id === planetId,
                )
              ) {
                return template;
              }
              return {
                ...template,
                destinations: destinations.map((entry: BehaviorTemplate) =>
                  entry?.id === planetId ? { ...entry, ...patch } : entry,
                ),
              };
            },
          ),
        ),
      );
    },
    [commit, saveGame],
  );

  const deleteLooseMaterial = useCallback(
    async (materialType?: string | null) => {
      if (!saveGame || !Array.isArray(saveGame.gameObjects)) return;
      const removeSet = new Set(
        materialType ? [String(materialType)] : SimHashNames.map(String),
      );
      if (removeSet.size === 0) return;
      commit({
        ...saveGame,
        gameObjects: saveGame.gameObjects.filter(
          (group) => !group?.name || !removeSet.has(group.name),
        ),
      });
    },
    [commit, saveGame],
  );

  return {
    deleteLooseMaterial,
    modifyBehavior,
    updateBuildingName,
    updateColonyName,
    updateCreaturePosition,
    updateCycleCount,
    updateDifficultySetting,
    updateGeyserParameter,
    updateGeyserType,
    updatePlanet,
    updateRawValue,
  };
}
