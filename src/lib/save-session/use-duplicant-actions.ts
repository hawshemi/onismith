"use client";

import { useCallback } from "react";
import type { GameObject, SaveGame } from "@/lib/save-parser/model";
import { isAccessoryAssetAvailable } from "@/lib/oni/accessory-constraints";
import { getSkillGroupHash } from "@/lib/oni/minion-interests";
import {
  deepClone,
  findGameObjectLocation,
  getBehavior,
  getGameObjectById,
  getGameObjectTypeById,
  mutateDuplicant,
  mutateGameObjectById,
  resolveBehaviorName,
  setEffectCycles,
  setMasteryValues,
  updateAccessoryList,
  updateBehaviorData,
  updateBehaviorTemplate,
  updateBehaviorTemplateAny,
  updateModifierAmounts,
  type BehaviorPayload,
  type BehaviorTemplate,
} from "./save-mutations";
import { downloadText, hashObjectSha1 } from "./save-file-utils";
import type {
  BehaviorDataMap,
  CopyPasteData,
  ImportPayload,
  ImportResult,
  ImportWarningData,
  SetSaveGameOptions,
} from "./save-session-state";

const DUPLICANT_CLONE_BEHAVIOR_BLACKLIST = new Set<string>([
  "StateMachineController",
  "Navigator",
]);

type SetSaveGame = (
  saveGame: SaveGame | null,
  options?: SetSaveGameOptions,
) => void;

interface DuplicantActionsOptions {
  saveGame: SaveGame | null;
  copyPasteData: CopyPasteData | null;
  importWarning: ImportWarningData | null;
  setSaveGame: SetSaveGame;
  setError: (message: string, code?: string | null) => void;
  setCopyPasteData: (value: CopyPasteData) => void;
  setImportWarning: (value: ImportWarningData) => void;
  clearImportWarning: () => void;
  setSelectedDuplicantId: (id: number | null) => void;
}

export function useDuplicantActions({
  saveGame,
  copyPasteData,
  importWarning,
  setSaveGame,
  setError,
  setCopyPasteData,
  setImportWarning,
  clearImportWarning,
  setSelectedDuplicantId,
}: DuplicantActionsOptions) {
  const updateDuplicantName = useCallback(
    (duplicantId: number, name: string) => {
      if (!saveGame) {
        return;
      }
      const next = mutateDuplicant(saveGame, duplicantId, (gameObject) =>
        updateBehaviorTemplate(gameObject, "MinionIdentity", (template) => {
          if (!template || typeof template !== "object") {
            return template;
          }
          return {
            ...template,
            name,
          };
        }),
      );
      setSaveGame(next, { isModified: next !== saveGame });
    },
    [setSaveGame, saveGame],
  );

  const addDuplicantTrait = useCallback(
    (duplicantId: number, traitId: string) => {
      if (!saveGame || !traitId) {
        return;
      }
      const cleanTraitId = String(traitId).trim();
      if (!cleanTraitId) {
        return;
      }
      const next = mutateDuplicant(saveGame, duplicantId, (gameObject) =>
        updateBehaviorTemplateAny(
          gameObject,
          ["Klei.AI.Traits", "MinionTraits"],
          (template) => {
            const current = Array.isArray(template?.TraitIds)
              ? template.TraitIds
              : [];
            if (current.includes(cleanTraitId)) {
              return template;
            }
            return {
              ...(template || {}),
              TraitIds: [...current, cleanTraitId],
            };
          },
        ),
      );
      setSaveGame(next, { isModified: next !== saveGame });
    },
    [setSaveGame, saveGame],
  );

  const removeDuplicantTrait = useCallback(
    (duplicantId: number, traitId: string) => {
      if (!saveGame) {
        return;
      }
      const next = mutateDuplicant(saveGame, duplicantId, (gameObject) =>
        updateBehaviorTemplateAny(
          gameObject,
          ["Klei.AI.Traits", "MinionTraits"],
          (template) => {
            const current = Array.isArray(template?.TraitIds)
              ? template.TraitIds
              : [];
            const filtered = current.filter(
              (item: unknown) => item !== traitId,
            );
            if (filtered.length === current.length) {
              return template;
            }
            return {
              ...(template || {}),
              TraitIds: filtered,
            };
          },
        ),
      );
      setSaveGame(next, { isModified: next !== saveGame });
    },
    [setSaveGame, saveGame],
  );

  const updateDuplicantAttributeLevel = useCallback(
    (duplicantId: number, attributeId: string, nextLevel: number) => {
      if (!saveGame || !Number.isFinite(nextLevel)) {
        return;
      }
      // Attribute levels are whole numbers in ONI; round at the write boundary
      // so the invariant holds for any caller, not just the editor's own check.
      const level = Math.round(nextLevel);
      const next = mutateDuplicant(saveGame, duplicantId, (gameObject) =>
        updateBehaviorTemplateAny(
          gameObject,
          ["Klei.AI.AttributeLevels", "AttributeLevels"],
          (template) => {
            const levels = Array.isArray(template?.saveLoadLevels)
              ? template.saveLoadLevels
              : [];
            let found = false;
            const nextLevels = levels.map((entry: BehaviorTemplate) => {
              if (entry?.attributeId !== attributeId) {
                return entry;
              }
              found = true;
              return {
                ...entry,
                level,
              };
            });
            if (!found) {
              nextLevels.push({
                attributeId,
                experience: 0,
                level,
              });
            }
            return {
              ...(template || {}),
              saveLoadLevels: nextLevels,
            };
          },
        ),
      );
      setSaveGame(next, { isModified: next !== saveGame });
    },
    [setSaveGame, saveGame],
  );

  const setDuplicantInterest = useCallback(
    (duplicantId: number, interestName: string, enabled: boolean) => {
      if (!saveGame || typeof interestName !== "string") {
        return;
      }
      const hash = getSkillGroupHash(interestName);
      if (!Number.isFinite(hash)) {
        return;
      }

      const next = mutateDuplicant(saveGame, duplicantId, (gameObject) =>
        updateBehaviorTemplate(gameObject, "MinionResume", (template) => {
          if (!template || typeof template !== "object") {
            return template;
          }

          const entries = Array.isArray(template.AptitudeBySkillGroup)
            ? template.AptitudeBySkillGroup
            : [];

          if (enabled) {
            let found = false;
            const nextEntries = entries.map((entry: BehaviorTemplate) => {
              if (!Array.isArray(entry) || entry.length < 2) {
                return entry;
              }
              if (entry[0]?.hash !== hash) {
                return entry;
              }
              found = true;
              return [{ hash }, 1];
            });
            if (!found) {
              nextEntries.push([{ hash }, 1]);
            }
            return {
              ...template,
              AptitudeBySkillGroup: nextEntries,
            };
          }

          const nextEntries = entries.filter((entry: BehaviorTemplate) => {
            if (!Array.isArray(entry) || entry.length < 2) {
              return true;
            }
            return entry[0]?.hash !== hash;
          });

          if (nextEntries.length === entries.length) {
            return template;
          }

          return {
            ...template,
            AptitudeBySkillGroup: nextEntries,
          };
        }),
      );

      setSaveGame(next, { isModified: next !== saveGame });
    },
    [setSaveGame, saveGame],
  );

  const addDuplicantInterest = useCallback(
    (duplicantId: number, interestName: string) => {
      setDuplicantInterest(duplicantId, interestName, true);
    },
    [setDuplicantInterest],
  );

  const removeDuplicantInterest = useCallback(
    (duplicantId: number, interestName: string) => {
      setDuplicantInterest(duplicantId, interestName, false);
    },
    [setDuplicantInterest],
  );

  const updateDuplicantAppearance = useCallback(
    (duplicantId: number, type: string, ordinal: number) => {
      if (!saveGame || !Number.isFinite(ordinal)) {
        return;
      }
      const normalizedType = String(type || "");
      if (!["hair", "headshape", "eyes"].includes(normalizedType)) {
        return;
      }
      const nextOrdinal = Math.max(1, Math.floor(ordinal));
      if (
        normalizedType === "headshape" &&
        !isAccessoryAssetAvailable("head", nextOrdinal)
      ) {
        return;
      }
      if (
        normalizedType === "hair" &&
        !isAccessoryAssetAvailable("hair", nextOrdinal)
      ) {
        return;
      }
      const next = mutateDuplicant(saveGame, duplicantId, (gameObject) =>
        updateBehaviorTemplate(gameObject, "Accessorizer", (template) => {
          if (!template || typeof template !== "object") {
            return template;
          }
          const accessories = Array.isArray(template.accessories)
            ? template.accessories
            : [];
          return {
            ...template,
            accessories: updateAccessoryList(
              accessories,
              normalizedType,
              nextOrdinal,
            ),
          };
        }),
      );
      setSaveGame(next, { isModified: next !== saveGame });
    },
    [setSaveGame, saveGame],
  );

  const updateDuplicantGender = useCallback(
    (duplicantId: number, gender: string) => {
      if (!saveGame) {
        return;
      }
      const normalized = String(gender || "").toUpperCase();
      const allowed = new Set(["MALE", "FEMALE", "NB"]);
      if (!allowed.has(normalized)) {
        return;
      }
      const next = mutateDuplicant(saveGame, duplicantId, (gameObject) =>
        updateBehaviorTemplate(gameObject, "MinionIdentity", (template) => {
          if (!template || typeof template !== "object") {
            return template;
          }
          return {
            ...template,
            gender: normalized,
            genderStringKey: normalized,
          };
        }),
      );
      setSaveGame(next, { isModified: next !== saveGame });
    },
    [setSaveGame, saveGame],
  );

  const updateDuplicantHealthModifier = useCallback(
    (duplicantId: number, modifier: string, value: number) => {
      if (!saveGame || !modifier || !Number.isFinite(value)) {
        return;
      }
      const nextValue = Math.max(0, Number(value));
      const next = mutateDuplicant(saveGame, duplicantId, (gameObject) => {
        const behavior = getBehavior(gameObject, "MinionModifiers");
        if (!behavior) {
          return gameObject;
        }
        const extraData = behavior.extraData || {};
        const amounts = updateModifierAmounts(
          extraData.amounts,
          modifier,
          nextValue,
        );
        return updateBehaviorData(gameObject, "MinionModifiers", {
          extraData: {
            ...extraData,
            amounts,
          },
        });
      });

      setSaveGame(next, { isModified: next !== saveGame });
    },
    [setSaveGame, saveGame],
  );

  const updateDuplicantExperience = useCallback(
    (duplicantId: number, experience: number) => {
      if (!saveGame || !Number.isFinite(experience)) {
        return;
      }
      const nextExperience = Math.max(0, Number(experience));
      const next = mutateDuplicant(saveGame, duplicantId, (gameObject) =>
        updateBehaviorTemplate(gameObject, "MinionResume", (template) => {
          if (!template || typeof template !== "object") {
            return template;
          }
          return {
            ...template,
            totalExperienceGained: nextExperience,
          };
        }),
      );
      setSaveGame(next, { isModified: next !== saveGame });
    },
    [setSaveGame, saveGame],
  );

  const setDuplicantSkillsMastery = useCallback(
    (duplicantId: number, skillIds: readonly string[], enabled: boolean) => {
      if (!saveGame || skillIds.length === 0) {
        return;
      }
      const next = mutateDuplicant(saveGame, duplicantId, (gameObject) =>
        updateBehaviorTemplate(gameObject, "MinionResume", (template) => {
          if (!template || typeof template !== "object") {
            return template;
          }
          return {
            ...template,
            MasteryBySkillID: setMasteryValues(
              template.MasteryBySkillID,
              skillIds,
              Boolean(enabled),
            ),
          };
        }),
      );
      setSaveGame(next, { isModified: next !== saveGame });
    },
    [setSaveGame, saveGame],
  );

  const setDuplicantSkillMastery = useCallback(
    (duplicantId: number, skillId: string, enabled: boolean) => {
      if (skillId) {
        setDuplicantSkillsMastery(duplicantId, [skillId], enabled);
      }
    },
    [setDuplicantSkillsMastery],
  );

  const addDuplicantEffect = useCallback(
    (duplicantId: number, effectId: string, cycles: number) => {
      if (!saveGame || !effectId || !Number.isFinite(cycles) || cycles <= 0) {
        return;
      }
      const next = mutateDuplicant(saveGame, duplicantId, (gameObject) =>
        updateBehaviorTemplate(gameObject, "Klei.AI.Effects", (template) => {
          if (!template || typeof template !== "object") {
            return template;
          }
          return {
            ...template,
            saveLoadEffects: setEffectCycles(
              template.saveLoadEffects,
              effectId,
              cycles,
              "add",
            ),
          };
        }),
      );
      setSaveGame(next, { isModified: next !== saveGame });
    },
    [setSaveGame, saveGame],
  );

  const updateDuplicantEffectCycles = useCallback(
    (duplicantId: number, effectId: string, cycles: number) => {
      if (!saveGame || !effectId || !Number.isFinite(cycles) || cycles < 0) {
        return;
      }
      const next = mutateDuplicant(saveGame, duplicantId, (gameObject) =>
        updateBehaviorTemplate(gameObject, "Klei.AI.Effects", (template) => {
          if (!template || typeof template !== "object") {
            return template;
          }
          return {
            ...template,
            saveLoadEffects: setEffectCycles(
              template.saveLoadEffects,
              effectId,
              cycles,
              "update",
            ),
          };
        }),
      );
      setSaveGame(next, { isModified: next !== saveGame });
    },
    [setSaveGame, saveGame],
  );

  const removeDuplicantEffect = useCallback(
    (duplicantId: number, effectId: string) => {
      if (!saveGame || !effectId) {
        return;
      }
      const next = mutateDuplicant(saveGame, duplicantId, (gameObject) =>
        updateBehaviorTemplate(gameObject, "Klei.AI.Effects", (template) => {
          if (!template || typeof template !== "object") {
            return template;
          }
          return {
            ...template,
            saveLoadEffects: setEffectCycles(
              template.saveLoadEffects,
              effectId,
              0,
              "remove",
            ),
          };
        }),
      );
      setSaveGame(next, { isModified: next !== saveGame });
    },
    [setSaveGame, saveGame],
  );

  const copyDuplicantBehaviors = useCallback(
    (duplicantId: number, behaviorNames: string[]) => {
      if (
        !saveGame ||
        !Array.isArray(behaviorNames) ||
        behaviorNames.length === 0
      ) {
        return;
      }
      const gameObject = getGameObjectById(saveGame, duplicantId);
      const gameObjectType = getGameObjectTypeById(saveGame, duplicantId);
      if (!gameObject || !gameObjectType) {
        return;
      }
      const identity = getBehavior(gameObject, "MinionIdentity");
      const sourceName =
        typeof identity?.templateData?.name === "string" &&
        identity.templateData.name.trim()
          ? identity.templateData.name.trim()
          : `Duplicant ${duplicantId}`;

      const copyBehaviors: BehaviorDataMap = {};
      for (const requestedName of behaviorNames) {
        const resolvedName = resolveBehaviorName(gameObject, requestedName);
        if (!resolvedName) {
          continue;
        }
        const behavior = getBehavior(gameObject, resolvedName);
        if (!behavior) {
          continue;
        }
        const payload: BehaviorPayload = {};
        if (behavior.templateData !== undefined) {
          payload.templateData = deepClone(behavior.templateData);
        }
        if (behavior.extraData !== undefined) {
          payload.extraData = deepClone(behavior.extraData);
        }
        copyBehaviors[requestedName] = payload;
      }

      setCopyPasteData({
        gameObjectType,
        sourceId: duplicantId,
        sourceName,
        behaviors: copyBehaviors,
      });
    },
    [setCopyPasteData, saveGame],
  );

  const canPasteBehaviorsTo = useCallback(
    (gameObjectId: number) => {
      if (!copyPasteData || !saveGame) {
        return false;
      }
      const targetType = getGameObjectTypeById(saveGame, gameObjectId);
      if (!targetType) {
        return false;
      }
      return copyPasteData.gameObjectType === targetType;
    },
    [copyPasteData, saveGame],
  );

  const applyBehaviorMerge = useCallback(
    (
      saveGame: SaveGame,
      gameObjectId: number,
      behaviorDataMap: BehaviorDataMap,
      selectedNames: string[] | null = null,
    ) => {
      if (
        !saveGame ||
        !behaviorDataMap ||
        typeof behaviorDataMap !== "object"
      ) {
        return saveGame;
      }
      const targetNames =
        Array.isArray(selectedNames) && selectedNames.length > 0
          ? selectedNames
          : Object.keys(behaviorDataMap);

      return mutateGameObjectById(saveGame, gameObjectId, (gameObject) => {
        let nextObject = gameObject;
        for (const behaviorName of targetNames) {
          const behaviorData = behaviorDataMap[behaviorName];
          if (!behaviorData) {
            continue;
          }
          const resolvedName = resolveBehaviorName(nextObject, behaviorName);
          if (!resolvedName) {
            continue;
          }
          nextObject = updateBehaviorData(
            nextObject,
            resolvedName,
            behaviorData,
          );
        }
        return nextObject;
      });
    },
    [],
  );

  const pasteDuplicantBehaviors = useCallback(
    (duplicantId: number, behaviorNames: string[] | null = null) => {
      if (!saveGame || !copyPasteData) {
        return;
      }
      if (!canPasteBehaviorsTo(duplicantId)) {
        return;
      }
      const next = applyBehaviorMerge(
        saveGame,
        duplicantId,
        copyPasteData.behaviors,
        behaviorNames,
      );
      setSaveGame(next, { isModified: next !== saveGame });
    },
    [
      applyBehaviorMerge,
      canPasteBehaviorsTo,
      setSaveGame,
      copyPasteData,
      saveGame,
    ],
  );

  const exportDuplicantBehaviors = useCallback(
    async (duplicantId: number, behaviorNames: string[]) => {
      if (
        !saveGame ||
        !Array.isArray(behaviorNames) ||
        behaviorNames.length === 0
      ) {
        return;
      }
      const gameObject = getGameObjectById(saveGame, duplicantId);
      const gameObjectType = getGameObjectTypeById(saveGame, duplicantId);
      if (!gameObject || !gameObjectType) {
        return;
      }

      const behaviors: BehaviorDataMap = {};
      for (const requestedName of behaviorNames) {
        const resolvedName = resolveBehaviorName(gameObject, requestedName);
        if (!resolvedName) {
          continue;
        }
        const behavior = getBehavior(gameObject, resolvedName);
        if (!behavior) {
          continue;
        }
        const payload: BehaviorPayload = {};
        if (behavior.templateData !== undefined) {
          payload.templateData = deepClone(behavior.templateData);
        }
        if (behavior.extraData !== undefined) {
          payload.extraData = deepClone(behavior.extraData);
        }
        behaviors[requestedName] = payload;
      }

      const exportObject = {
        gameObjectType,
        behaviors,
      };

      const hash = await hashObjectSha1(exportObject);
      const output = hash
        ? {
            ...exportObject,
            $sha1: hash,
          }
        : exportObject;

      const identity = getBehavior(gameObject, "MinionIdentity");
      const safeName =
        identity?.templateData?.name || `duplicant-${duplicantId}`;
      downloadText(JSON.stringify(output, null, 2), `${safeName}.json`);
    },
    [saveGame],
  );

  const validateImportPayload = useCallback(
    (payload: unknown): string | null => {
      if (!payload || typeof payload !== "object") {
        return "Import file must be a JSON object.";
      }
      const candidate = payload as {
        gameObjectType?: unknown;
        behaviors?: unknown;
      };
      if (
        typeof candidate.gameObjectType !== "string" ||
        !candidate.gameObjectType
      ) {
        return "Import file is missing gameObjectType.";
      }
      if (
        !candidate.behaviors ||
        typeof candidate.behaviors !== "object" ||
        Array.isArray(candidate.behaviors)
      ) {
        return "Import file is missing behaviors.";
      }
      return null;
    },
    [],
  );

  const importDuplicantBehaviors = useCallback(
    async (
      duplicantId: number,
      file: File | null | undefined,
    ): Promise<ImportResult> => {
      if (!saveGame || !file) {
        return "ignored";
      }
      const targetType = getGameObjectTypeById(saveGame, duplicantId);
      if (!targetType) {
        setError("Target game object not found for import.");
        return "error";
      }

      let parsed: ImportPayload;
      try {
        const text = await file.text();
        parsed = JSON.parse(text);
      } catch {
        setError("Invalid import JSON file.");
        return "error";
      }

      const expectedHash =
        typeof parsed.$sha1 === "string" ? parsed.$sha1 : null;
      if (Object.prototype.hasOwnProperty.call(parsed, "$sha1")) {
        delete parsed.$sha1;
      }

      const validationError = validateImportPayload(parsed);
      if (validationError) {
        setError(validationError);
        return "error";
      }

      if (parsed.gameObjectType !== targetType) {
        setError(
          `Import gameObjectType mismatch. Expected ${targetType}, got ${parsed.gameObjectType}.`,
        );
        return "error";
      }

      const actualHash = await hashObjectSha1(parsed);
      const mismatch =
        Boolean(expectedHash) &&
        Boolean(actualHash) &&
        String(expectedHash).toLowerCase() !== String(actualHash).toLowerCase();

      if (mismatch) {
        setImportWarning({
          duplicantId,
          fileName: file.name || "import.json",
          expectedHash,
          actualHash,
          payload: parsed,
        });
        return "warning";
      }

      const next = applyBehaviorMerge(saveGame, duplicantId, parsed.behaviors);
      setSaveGame(next, { isModified: next !== saveGame });
      return "applied";
    },
    [
      applyBehaviorMerge,
      setError,
      setImportWarning,
      setSaveGame,
      saveGame,
      validateImportPayload,
    ],
  );

  const confirmImportWarning = useCallback(
    (shouldContinue: boolean) => {
      const warning = importWarning;
      clearImportWarning();
      if (!shouldContinue || !warning || !saveGame) {
        return;
      }
      const next = applyBehaviorMerge(
        saveGame,
        warning.duplicantId,
        warning.payload.behaviors,
      );
      setSaveGame(next, { isModified: next !== saveGame });
    },
    [
      applyBehaviorMerge,
      clearImportWarning,
      setSaveGame,
      importWarning,
      saveGame,
    ],
  );

  const cloneDuplicant = useCallback(
    (duplicantId: number) => {
      if (!saveGame || !Array.isArray(saveGame.gameObjects)) {
        return;
      }
      const location = findGameObjectLocation(saveGame, duplicantId);
      if (!location || location.group?.name !== "Minion") {
        return;
      }
      const source = location.gameObject;
      const newId = Number.isFinite(saveGame?.settings?.nextUniqueID)
        ? saveGame.settings.nextUniqueID
        : null;
      if (!Number.isFinite(newId)) {
        setError("Unable to clone duplicant: save has no nextUniqueID.");
        return;
      }

      let clone: GameObject = {
        ...deepClone(source),
        behaviors: Array.isArray(source.behaviors)
          ? deepClone(source.behaviors).filter(
              (behavior) =>
                !DUPLICANT_CLONE_BEHAVIOR_BLACKLIST.has(behavior?.name),
            )
          : [],
      };

      clone = updateBehaviorTemplate(clone, "KPrefabID", (template) => ({
        ...(template || {}),
        InstanceID: newId,
      }));

      const identity = getBehavior(source, "MinionIdentity");
      const oldName =
        identity?.templateData?.name || `Duplicant ${duplicantId}`;

      clone = updateBehaviorTemplate(clone, "MinionIdentity", (template) => ({
        ...(template || {}),
        assignableProxy: { id: -1 },
        name: `Clone of ${oldName}`,
      }));

      const nextGroups = saveGame.gameObjects.map((group, index) => {
        if (
          index !== location.groupIndex ||
          !Array.isArray(group?.gameObjects)
        ) {
          return group;
        }
        return {
          ...group,
          gameObjects: [...group.gameObjects, clone],
        };
      });

      const nextSaveGame: SaveGame = {
        ...saveGame,
        settings: {
          ...saveGame.settings,
          nextUniqueID: newId! + 1,
        },
        gameObjects: nextGroups,
      };
      setSaveGame(nextSaveGame, { isModified: true });
      setSelectedDuplicantId(newId);
    },
    [setError, setSaveGame, setSelectedDuplicantId, saveGame],
  );

  return {
    addDuplicantEffect,
    addDuplicantInterest,
    addDuplicantTrait,
    canPasteBehaviorsTo,
    cloneDuplicant,
    confirmImportWarning,
    copyDuplicantBehaviors,
    exportDuplicantBehaviors,
    importDuplicantBehaviors,
    pasteDuplicantBehaviors,
    removeDuplicantEffect,
    removeDuplicantInterest,
    removeDuplicantTrait,
    setDuplicantSkillMastery,
    setDuplicantSkillsMastery,
    updateDuplicantAppearance,
    updateDuplicantAttributeLevel,
    updateDuplicantEffectCycles,
    updateDuplicantExperience,
    updateDuplicantGender,
    updateDuplicantHealthModifier,
    updateDuplicantName,
  };
}
