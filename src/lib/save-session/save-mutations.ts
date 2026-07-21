import type {
  GameObject,
  GameObjectBehavior,
  GameObjectGroup,
  QualityLevelSettings,
  SaveGame,
} from "@/lib/save-parser/model";
import { EFFECT_SECONDS_PER_CYCLE } from "@/lib/oni/oni-constants";
import { isDuplicantGroupName } from "@/lib/oni/duplicant-groups";
import {
  getBionicPowerBankCapacityKilojoules,
  getBionicVitalDefinition,
} from "@/lib/oni/bionic-systems";

// Pure save-tree transforms shared by the session reducer and its action
// creators. Everything here operates on parser types and returns new objects via
// structural sharing (spread + map down only the changed path); the loaded
// `saveGame` is never mutated in place.

// Dynamic save-tree slots. The parser types `templateData`/`extraData` as `any`,
// so aliasing them lets updaters walk the tree without an explicit `any`.
export type BehaviorTemplate = GameObjectBehavior["templateData"];
export type BehaviorExtra = GameObjectBehavior["extraData"];

export interface BehaviorPayload {
  templateData?: unknown;
  extraData?: unknown;
}

export interface GameObjectLocation {
  groupIndex: number;
  objectIndex: number;
  group: GameObjectGroup;
  gameObject: GameObject;
}

const BEHAVIOR_ALIASES: Record<string, string[]> = {
  "Klei.AI.AttributeLevels": ["AttributeLevels"],
  AttributeLevels: ["Klei.AI.AttributeLevels"],
  "Klei.AI.Traits": ["MinionTraits"],
  MinionTraits: ["Klei.AI.Traits"],
};

const ACCESSORY_PREFIX = "Root.Accessories.";

export function deepClone<T>(value: T): T {
  if (value === undefined) {
    return undefined as T;
  }
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function mergeDeep(target: unknown, source: unknown): unknown {
  if (!isPlainObject(target) || !isPlainObject(source)) {
    return deepClone(source);
  }
  const output: Record<string, unknown> = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (isPlainObject(value) && isPlainObject(output[key])) {
      output[key] = mergeDeep(output[key], value);
    } else {
      output[key] = deepClone(value);
    }
  }
  return output;
}

export function getBehaviorCandidates(behaviorName: string): string[] {
  if (typeof behaviorName !== "string" || behaviorName.length === 0) {
    return [];
  }
  const aliases = Array.isArray(BEHAVIOR_ALIASES[behaviorName])
    ? BEHAVIOR_ALIASES[behaviorName]
    : [];
  return [behaviorName, ...aliases];
}

export function upsertDifficultySetting(
  current: QualityLevelSettings[] | undefined,
  difficultyType: string,
  value: string,
): QualityLevelSettings[] {
  const list = Array.isArray(current) ? [...current] : [];
  const index = list.findIndex(
    (item) => Array.isArray(item) && item[0] === difficultyType,
  );
  const nextEntry = [difficultyType, value] as QualityLevelSettings;
  if (index === -1) {
    list.push(nextEntry);
  } else {
    list[index] = nextEntry;
  }
  return list;
}

export function getBehavior(
  gameObject: GameObject | null | undefined,
  behaviorName: string,
): GameObjectBehavior | null {
  if (!gameObject || !Array.isArray(gameObject.behaviors)) {
    return null;
  }
  return (
    gameObject.behaviors.find((behavior) => behavior?.name === behaviorName) ||
    null
  );
}

function getGameObjectId(
  gameObject: GameObject | null | undefined,
): number | null {
  const behavior = getBehavior(gameObject, "KPrefabID");
  const id = behavior?.templateData?.InstanceID;
  return Number.isFinite(id) ? id : null;
}

export function resolveBehaviorName(
  gameObject: GameObject | null | undefined,
  behaviorName: string,
): string | null {
  const candidates = getBehaviorCandidates(behaviorName);
  for (const candidate of candidates) {
    if (getBehavior(gameObject, candidate)) {
      return candidate;
    }
  }
  return null;
}

// Cache an id -> location index per saveGame instance. Every mutation produces a
// new saveGame object (via spreads), so the WeakMap entry is naturally
// invalidated when the tree changes. Without this, each lookup linearly scanned
// all game objects, and the duplicants list ran that scan once per card on every
// render (O(cards * objects)).
const locationIndexCache = new WeakMap<
  object,
  Map<number, GameObjectLocation>
>();

function buildLocationIndex(
  saveGame: SaveGame | null | undefined,
): Map<number, GameObjectLocation> {
  const index = new Map<number, GameObjectLocation>();
  const groups = Array.isArray(saveGame?.gameObjects)
    ? saveGame.gameObjects
    : [];
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const group = groups[groupIndex];
    const objects = Array.isArray(group?.gameObjects) ? group.gameObjects : [];
    for (let objectIndex = 0; objectIndex < objects.length; objectIndex += 1) {
      const gameObject = objects[objectIndex];
      const id = getGameObjectId(gameObject);
      // Preserve the original "first match wins" scan semantics.
      if (id === null || index.has(id)) {
        continue;
      }
      index.set(id, { groupIndex, objectIndex, group, gameObject });
    }
  }
  return index;
}

export function findGameObjectLocation(
  saveGame: SaveGame | null | undefined,
  gameObjectId: number,
): GameObjectLocation | null {
  if (!saveGame || !Array.isArray(saveGame.gameObjects)) {
    return null;
  }
  let index = locationIndexCache.get(saveGame);
  if (!index) {
    index = buildLocationIndex(saveGame);
    locationIndexCache.set(saveGame, index);
  }
  return index.get(gameObjectId) || null;
}

export function getGameObjectById(
  saveGame: SaveGame | null | undefined,
  gameObjectId: number,
): GameObject | null {
  const location = findGameObjectLocation(saveGame, gameObjectId);
  return location?.gameObject || null;
}

export function getGameObjectTypeById(
  saveGame: SaveGame | null | undefined,
  gameObjectId: number,
): string | null {
  const location = findGameObjectLocation(saveGame, gameObjectId);
  return location?.group?.name || null;
}

function replaceGameObjectAtLocation(
  saveGame: SaveGame,
  location: GameObjectLocation | null | undefined,
  nextObject: GameObject | null | undefined,
): SaveGame {
  if (!location || !nextObject) {
    return saveGame;
  }
  const nextGroups = saveGame.gameObjects.map((group, groupIndex) => {
    if (
      groupIndex !== location.groupIndex ||
      !Array.isArray(group?.gameObjects)
    ) {
      return group;
    }
    const nextObjects = group.gameObjects.map((gameObject, objectIndex) => {
      if (objectIndex !== location.objectIndex) {
        return gameObject;
      }
      return nextObject;
    });
    return {
      ...group,
      gameObjects: nextObjects,
    };
  });

  return {
    ...saveGame,
    gameObjects: nextGroups,
  };
}

export function moveGameObjectToGroup(
  saveGame: SaveGame,
  location: GameObjectLocation | null | undefined,
  nextObject: GameObject | null | undefined,
  targetGroupName: string,
): SaveGame {
  if (!location || !nextObject || !targetGroupName) {
    return saveGame;
  }
  const groups = Array.isArray(saveGame?.gameObjects)
    ? saveGame.gameObjects
    : [];
  const sourceGroup = groups[location.groupIndex];
  if (!sourceGroup) {
    return saveGame;
  }

  if (sourceGroup.name === targetGroupName) {
    return replaceGameObjectAtLocation(saveGame, location, nextObject);
  }

  const nextGroups = groups.map((group, groupIndex) => {
    if (groupIndex !== location.groupIndex) {
      return group;
    }
    const gameObjects = Array.isArray(group?.gameObjects)
      ? group.gameObjects
      : [];
    return {
      ...group,
      gameObjects: gameObjects.filter(
        (_, objectIndex) => objectIndex !== location.objectIndex,
      ),
    };
  });

  const targetIndex = nextGroups.findIndex(
    (group) => group?.name === targetGroupName,
  );
  if (targetIndex >= 0) {
    const targetGroup = nextGroups[targetIndex];
    const targetObjects = Array.isArray(targetGroup?.gameObjects)
      ? targetGroup.gameObjects
      : [];
    nextGroups[targetIndex] = {
      ...targetGroup,
      gameObjects: [...targetObjects, nextObject],
    };
  } else {
    nextGroups.push({
      name: targetGroupName,
      gameObjects: [nextObject],
    });
  }

  return {
    ...saveGame,
    gameObjects: nextGroups,
  };
}

export function updateSaveGameRoot(
  saveGame: SaveGame,
  updater: (root: GameObject) => GameObject,
): SaveGame {
  if (!saveGame || !Array.isArray(saveGame.gameObjects)) {
    return saveGame;
  }
  const groups = saveGame.gameObjects;
  const index = groups.findIndex((group) => group?.name === "SaveGame");
  if (index === -1) {
    return saveGame;
  }
  const targetGroup = groups[index];
  const objects = Array.isArray(targetGroup?.gameObjects)
    ? targetGroup.gameObjects
    : [];
  if (objects.length === 0) {
    return saveGame;
  }
  const nextRoot = updater(objects[0]);
  if (!nextRoot || nextRoot === objects[0]) {
    return saveGame;
  }
  const nextGroup = {
    ...targetGroup,
    gameObjects: [nextRoot, ...objects.slice(1)],
  };
  const nextGroups = groups.map((group, groupIndex) =>
    groupIndex === index ? nextGroup : group,
  );
  return {
    ...saveGame,
    gameObjects: nextGroups,
  };
}

export function setCycleCount(saveGame: SaveGame, cycles: number): SaveGame {
  if (!Number.isFinite(cycles)) {
    return saveGame;
  }
  const nextCycles = Math.max(0, Math.trunc(cycles));
  const gameInfo = saveGame.header.gameInfo;
  const withHeader =
    gameInfo.numberOfCycles === nextCycles
      ? saveGame
      : {
          ...saveGame,
          header: {
            ...saveGame.header,
            gameInfo: { ...gameInfo, numberOfCycles: nextCycles },
          },
        };

  return updateSaveGameRoot(withHeader, (gameObject) =>
    updateBehaviorTemplate(gameObject, "GameClock", (template) => {
      if (!template || typeof template !== "object") {
        return template;
      }
      return template.cycle === nextCycles
        ? template
        : { ...template, cycle: nextCycles };
    }),
  );
}

export function syncDuplicantHeaderCount(
  saveGame: SaveGame,
  gameObjects: GameObjectGroup[] = saveGame.gameObjects,
): SaveGame {
  const numberOfDuplicants = gameObjects
    .filter((group) => isDuplicantGroupName(group?.name))
    .reduce((count, group) => count + (group.gameObjects?.length ?? 0), 0);
  if (saveGame.header.gameInfo.numberOfDuplicants === numberOfDuplicants) {
    return saveGame;
  }
  return {
    ...saveGame,
    header: {
      ...saveGame.header,
      gameInfo: {
        ...saveGame.header.gameInfo,
        numberOfDuplicants,
      },
    },
  };
}

export function updateBehaviorTemplate(
  gameObject: GameObject,
  behaviorName: string,
  updater: (template: BehaviorTemplate) => BehaviorTemplate,
): GameObject {
  if (!Array.isArray(gameObject?.behaviors)) {
    return gameObject;
  }
  let changed = false;
  const nextBehaviors = gameObject.behaviors.map((behavior) => {
    if (behavior?.name !== behaviorName) {
      return behavior;
    }
    const nextTemplate = updater(behavior.templateData);
    if (nextTemplate === behavior.templateData) {
      return behavior;
    }
    changed = true;
    return {
      ...behavior,
      templateData: nextTemplate,
    };
  });
  return changed ? { ...gameObject, behaviors: nextBehaviors } : gameObject;
}

export function updateBehaviorTemplateAny(
  gameObject: GameObject,
  behaviorNames: string[],
  updater: (template: BehaviorTemplate) => BehaviorTemplate,
): GameObject {
  for (const behaviorName of behaviorNames) {
    const next = updateBehaviorTemplate(gameObject, behaviorName, updater);
    if (next !== gameObject) {
      return next;
    }
  }
  return gameObject;
}

export function updateBehaviorExtra(
  gameObject: GameObject,
  behaviorName: string,
  updater: (extra: BehaviorExtra) => BehaviorExtra,
): GameObject {
  if (!Array.isArray(gameObject?.behaviors)) {
    return gameObject;
  }
  let changed = false;
  const nextBehaviors = gameObject.behaviors.map((behavior) => {
    if (behavior?.name !== behaviorName) {
      return behavior;
    }
    const nextExtra = updater(behavior.extraData);
    if (nextExtra === behavior.extraData) {
      return behavior;
    }
    changed = true;
    return {
      ...behavior,
      extraData: nextExtra,
    };
  });
  return changed ? { ...gameObject, behaviors: nextBehaviors } : gameObject;
}

export function updateBehaviorData(
  gameObject: GameObject,
  behaviorName: string,
  behaviorData: BehaviorPayload,
): GameObject {
  if (
    !Array.isArray(gameObject?.behaviors) ||
    !behaviorData ||
    typeof behaviorData !== "object"
  ) {
    return gameObject;
  }

  const hasTemplateData = Object.prototype.hasOwnProperty.call(
    behaviorData,
    "templateData",
  );
  const hasExtraData = Object.prototype.hasOwnProperty.call(
    behaviorData,
    "extraData",
  );
  if (!hasTemplateData && !hasExtraData) {
    return gameObject;
  }

  let changed = false;
  const nextBehaviors = gameObject.behaviors.map((behavior) => {
    if (behavior?.name !== behaviorName) {
      return behavior;
    }
    changed = true;
    const nextBehavior = { ...behavior };
    if (hasTemplateData) {
      nextBehavior.templateData = deepClone(behaviorData.templateData);
    }
    if (hasExtraData) {
      nextBehavior.extraData = deepClone(behaviorData.extraData);
    }
    return nextBehavior;
  });

  return changed ? { ...gameObject, behaviors: nextBehaviors } : gameObject;
}

export function updateStoredGameObjectById(
  owner: GameObject,
  storedGameObjectId: number,
  updater: (storedGameObject: GameObject) => GameObject,
): GameObject {
  if (!Array.isArray(owner.behaviors) || !Number.isFinite(storedGameObjectId)) {
    return owner;
  }

  let changed = false;
  const nextBehaviors = owner.behaviors.map((behavior) => {
    if (behavior?.name !== "Storage" || !Array.isArray(behavior.extraData)) {
      return behavior;
    }

    let behaviorChanged = false;
    const nextStoredObjects = behavior.extraData.map(
      (storedGameObject: GameObject) => {
        if (getGameObjectId(storedGameObject) !== storedGameObjectId) {
          return storedGameObject;
        }
        const nextStoredGameObject = updater(storedGameObject);
        if (nextStoredGameObject !== storedGameObject) {
          behaviorChanged = true;
          changed = true;
        }
        return nextStoredGameObject;
      },
    );

    return behaviorChanged
      ? { ...behavior, extraData: nextStoredObjects }
      : behavior;
  });

  return changed ? { ...owner, behaviors: nextBehaviors } : owner;
}

export function mutateGameObjectById(
  saveGame: SaveGame,
  gameObjectId: number,
  mutator: (gameObject: GameObject, location: GameObjectLocation) => GameObject,
): SaveGame {
  const location = findGameObjectLocation(saveGame, gameObjectId);
  if (!location) {
    return saveGame;
  }
  const nextObject = mutator(location.gameObject, location);
  if (!nextObject || nextObject === location.gameObject) {
    return saveGame;
  }
  return replaceGameObjectAtLocation(saveGame, location, nextObject);
}

export function setBuildingName(
  saveGame: SaveGame,
  gameObjectId: number,
  name: string,
): SaveGame {
  const nextName = name.trim().slice(0, 64);
  if (!nextName) {
    return saveGame;
  }
  return mutateGameObjectById(saveGame, gameObjectId, (gameObject) => {
    if (
      !getBehavior(gameObject, "BuildingComplete") ||
      typeof getBehavior(gameObject, "UserNameable")?.templateData
        ?.savedName !== "string"
    ) {
      return gameObject;
    }
    return updateBehaviorTemplate(gameObject, "UserNameable", (template) =>
      template?.savedName === nextName
        ? template
        : { ...template, savedName: nextName },
    );
  });
}

export function setBuildingPriority(
  saveGame: SaveGame,
  gameObjectId: number,
  priority: number,
): SaveGame {
  if (!Number.isFinite(priority)) {
    return saveGame;
  }
  const nextPriority = Math.min(9, Math.max(1, Math.round(priority)));
  return mutateGameObjectById(saveGame, gameObjectId, (gameObject) => {
    if (!getBehavior(gameObject, "BuildingComplete")) {
      return gameObject;
    }
    return updateBehaviorTemplate(gameObject, "Prioritizable", (template) => {
      const setting = template?.masterPrioritySetting;
      if (
        !isPlainObject(setting) ||
        typeof setting.priority_value !== "number" ||
        setting.priority_value === nextPriority
      ) {
        return template;
      }
      return {
        ...template,
        masterPrioritySetting: {
          ...setting,
          priority_value: nextPriority,
        },
      };
    });
  });
}

export function mutateDuplicant(
  saveGame: SaveGame,
  duplicantId: number,
  mutator: (gameObject: GameObject) => GameObject,
): SaveGame {
  if (!saveGame || !Array.isArray(saveGame.gameObjects)) {
    return saveGame;
  }
  const location = findGameObjectLocation(saveGame, duplicantId);
  if (!location || !isDuplicantGroupName(location.group?.name)) {
    return saveGame;
  }
  const nextObject = mutator(location.gameObject);
  if (!nextObject || nextObject === location.gameObject) {
    return saveGame;
  }
  return replaceGameObjectAtLocation(saveGame, location, nextObject);
}

export function applySandboxModeFlags(
  saveGame: SaveGame,
  enabled: boolean,
): SaveGame {
  const nextHeader = {
    ...saveGame.header,
    gameInfo: {
      ...saveGame.header?.gameInfo,
      sandboxEnabled: enabled,
    },
  };

  const nextGroups = Array.isArray(saveGame.gameObjects)
    ? saveGame.gameObjects.map((group) => {
        if (group?.name !== "SaveGame" || !Array.isArray(group.gameObjects)) {
          return group;
        }
        return {
          ...group,
          gameObjects: group.gameObjects.map((obj) => {
            if (!Array.isArray(obj?.behaviors)) {
              return obj;
            }
            let changed = false;
            const nextBehaviors = obj.behaviors.map((behavior) => {
              if (behavior?.name !== "SaveGame" || !behavior.templateData) {
                return behavior;
              }
              changed = true;
              return {
                ...behavior,
                templateData: {
                  ...behavior.templateData,
                  sandboxEnabled: enabled,
                },
              };
            });
            return changed ? { ...obj, behaviors: nextBehaviors } : obj;
          }),
        };
      })
    : saveGame.gameObjects;

  return {
    ...saveGame,
    header: nextHeader,
    gameObjects: nextGroups,
  };
}

function padAccessoryOrdinal(ordinal: number): string {
  return String(ordinal).padStart(3, "0");
}

interface Accessory {
  guid?: { Guid?: string };
}

function parseAccessoryGuid(
  accessory: Accessory | null | undefined,
): string | null {
  const guid = accessory?.guid?.Guid;
  if (typeof guid !== "string" || !guid.startsWith(ACCESSORY_PREFIX)) {
    return null;
  }
  return guid.slice(ACCESSORY_PREFIX.length);
}

function replaceAccessoryGuid(
  accessory: Accessory | null | undefined,
  replacementName: string,
): Accessory {
  return {
    ...(accessory || {}),
    guid: {
      ...(accessory?.guid || {}),
      Guid: `${ACCESSORY_PREFIX}${replacementName}`,
    },
  };
}

export function updateAccessoryList(
  accessories: Accessory[],
  type: string,
  ordinal: number,
): Accessory[] {
  if (!Array.isArray(accessories)) {
    return accessories;
  }

  const padded = padAccessoryOrdinal(ordinal);
  return accessories.map((accessory) => {
    const name = parseAccessoryGuid(accessory);
    if (!name) {
      return accessory;
    }
    if (name.startsWith(`${type}_`)) {
      return replaceAccessoryGuid(accessory, `${type}_${padded}`);
    }
    if (type === "hair" && name.startsWith("hat_hair_")) {
      return replaceAccessoryGuid(accessory, `hat_hair_${padded}`);
    }
    if (type === "hair" && name.startsWith("hair_always_")) {
      return replaceAccessoryGuid(accessory, `hair_always_${padded}`);
    }
    return accessory;
  });
}

interface ModifierAmount {
  name: string;
  value: { value: number; [key: string]: unknown };
  [key: string]: unknown;
}

export function updateModifierAmounts(
  amounts: ModifierAmount[] | undefined,
  modifierName: string,
  nextValue: number,
): ModifierAmount[] {
  const list = Array.isArray(amounts) ? [...amounts] : [];
  const index = list.findIndex((entry) => entry?.name === modifierName);
  if (index === -1) {
    list.push({ name: modifierName, value: { value: nextValue } });
    return list;
  }

  const current = list[index];
  list[index] = {
    ...current,
    value: {
      ...current.value,
      value: nextValue,
    },
  };
  return list;
}

export function setDuplicantBionicVitalValue(
  saveGame: SaveGame,
  duplicantId: number,
  vitalId: string,
  value: number,
): SaveGame {
  const definition = getBionicVitalDefinition(vitalId);
  if (
    !definition?.editable ||
    definition.max === null ||
    !Number.isFinite(value)
  ) {
    return saveGame;
  }

  const nextValue = Math.min(definition.max, Math.max(0, value));
  return mutateDuplicant(saveGame, duplicantId, (gameObject) => {
    const behavior = getBehavior(gameObject, "MinionModifiers");
    const extraData = behavior?.extraData;
    const amounts = Array.isArray(extraData?.amounts) ? extraData.amounts : [];
    if (
      !amounts.some(
        (amount: { name?: unknown }) => amount?.name === definition.id,
      )
    ) {
      return gameObject;
    }

    return updateBehaviorData(gameObject, "MinionModifiers", {
      extraData: {
        ...extraData,
        amounts: updateModifierAmounts(
          amounts,
          definition.id,
          nextValue * definition.divisor,
        ),
      },
    });
  });
}

export function setDuplicantBionicPowerBankCharge(
  saveGame: SaveGame,
  duplicantId: number,
  powerBankId: number,
  chargeKilojoules: number,
): SaveGame {
  if (!Number.isFinite(powerBankId) || !Number.isFinite(chargeKilojoules)) {
    return saveGame;
  }

  return mutateDuplicant(saveGame, duplicantId, (gameObject) => {
    const updatedGameObject = updateStoredGameObjectById(
      gameObject,
      powerBankId,
      (storedGameObject) => {
        const prefabId =
          typeof (storedGameObject as GameObject & { name?: unknown }).name ===
          "string"
            ? (storedGameObject as GameObject & { name: string }).name
            : "";
        const capacityKilojoules =
          getBionicPowerBankCapacityKilojoules(prefabId);
        const electrobank = getBehavior(storedGameObject, "Electrobank");
        if (
          capacityKilojoules === null ||
          typeof electrobank?.templateData?.charge !== "number" ||
          !Number.isFinite(electrobank.templateData.charge)
        ) {
          return storedGameObject;
        }

        const nextCharge =
          Math.min(capacityKilojoules, Math.max(0, chargeKilojoules)) * 1000;
        return updateBehaviorTemplate(
          storedGameObject,
          "Electrobank",
          (template) => ({
            ...template,
            charge: nextCharge,
          }),
        );
      },
    );
    if (updatedGameObject === gameObject) {
      return gameObject;
    }

    const totalCharge = (updatedGameObject.behaviors ?? [])
      .filter((behavior) => behavior?.name === "Storage")
      .flatMap((behavior) =>
        Array.isArray(behavior.extraData) ? behavior.extraData : [],
      )
      .reduce((total, storedGameObject: GameObject) => {
        const charge = getBehavior(storedGameObject, "Electrobank")
          ?.templateData?.charge;
        return (
          total +
          (typeof charge === "number" && Number.isFinite(charge) ? charge : 0)
        );
      }, 0);

    const modifiers = getBehavior(updatedGameObject, "MinionModifiers");
    const extraData = modifiers?.extraData;
    const amounts = Array.isArray(extraData?.amounts) ? extraData.amounts : [];
    if (
      !amounts.some(
        (amount: { name?: unknown }) =>
          amount?.name === "BionicInternalBattery",
      )
    ) {
      return updatedGameObject;
    }

    return updateBehaviorData(updatedGameObject, "MinionModifiers", {
      extraData: {
        ...extraData,
        amounts: updateModifierAmounts(
          amounts,
          "BionicInternalBattery",
          totalCharge,
        ),
      },
    });
  });
}

type MasteryEntry = [string, boolean];

export function setMasteryValues(
  entries: MasteryEntry[] | undefined,
  skillIds: readonly string[],
  enabled: boolean,
): MasteryEntry[] {
  const targetIds = new Set(skillIds.filter(Boolean));
  const list = (Array.isArray(entries) ? entries : []).filter(
    (entry) => !targetIds.has(entry[0]),
  );

  if (enabled) {
    list.push(
      ...[...targetIds].map((skillId): MasteryEntry => [skillId, true]),
    );
  }

  return list;
}

interface EffectEntry {
  id: string;
  timeRemaining: number;
}

export function setEffectCycles(
  saveLoadEffects: EffectEntry[] | undefined,
  effectId: string,
  cycles: number,
  mode: "update" | "add" | "remove" = "update",
): EffectEntry[] {
  const list = Array.isArray(saveLoadEffects) ? [...saveLoadEffects] : [];
  const timeRemaining = Number(cycles) * EFFECT_SECONDS_PER_CYCLE;
  const matchingIndexes = list.flatMap((entry, index) =>
    entry?.id === effectId ? [index] : [],
  );
  const firstIndex = matchingIndexes[0];

  if (mode === "remove") {
    return list.filter((entry) => entry?.id !== effectId);
  }

  const patch: EffectEntry = {
    id: effectId,
    timeRemaining,
  };

  if (mode === "add") {
    if (firstIndex === undefined) {
      list.push(patch);
      return list;
    }

    list[firstIndex] = patch;
    return list.filter(
      (entry, index) => entry?.id !== effectId || index === firstIndex,
    );
  }

  if (firstIndex === undefined) {
    return list;
  }

  list[firstIndex] = patch;
  return list.filter(
    (entry, index) => entry?.id !== effectId || index === firstIndex,
  );
}
