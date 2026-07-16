import type { GameObjectBehavior, SaveGame } from "@/lib/save-parser/model";
import {
  AI_EFFECT_IDS,
  BIONIC_MINION_SKILL_GROUPS,
  DUPLICANT_HEALTH_MODIFIERS,
  EFFECT_SECONDS_PER_CYCLE,
  STANDARD_MINION_SKILL_GROUPS,
  type MinionSkillGroupDefinition,
} from "@/lib/oni/oni-constants";
import { isObjectLike } from "@/lib/oni/raw-path-utils";
import {
  DUPLICANT_INTEREST_NAMES,
  getSkillGroupDisplayName,
  getSkillGroupNameByHash,
} from "@/lib/oni/minion-interests";
import { isBionicIdentityTraitId } from "@/lib/oni/trait-names";

interface DuplicantAppearance {
  hairOrdinal: number;
  headOrdinal: number;
  eyesOrdinal: number;
}

interface DuplicantAttributeSummary {
  attributeId: string;
  displayName: string;
  levelLabel: string;
}

export interface DuplicantSummary {
  id: number;
  name: string;
  gender: string;
  traits: string[];
  appearance: DuplicantAppearance;
  attributes: DuplicantAttributeSummary[];
}

interface DuplicantAttributeLevel {
  attributeId: string;
  displayName: string;
  level: number;
}

interface DuplicantHealthModifier {
  modifier: string;
  value: number;
  max: number;
}

interface DuplicantSkill {
  skillId: string;
  displayName: string;
  mastered: boolean;
}

interface DuplicantSkillGroup {
  groupId: string;
  displayName: string;
  context?: string;
  skills: DuplicantSkill[];
}

interface DuplicantSkillModel {
  totalExperienceGained: number;
  groups: DuplicantSkillGroup[];
}

interface DuplicantEffect {
  id: string;
  timeRemaining: number;
  cyclesRemaining: number;
}

interface DuplicantEffectsModel {
  effects: DuplicantEffect[];
  availableEffects: string[];
}

export interface DuplicantEditorModel {
  id: number;
  name: string;
  traits: string[];
  interests: string[];
  availableInterests: string[];
  unknownInterestHashes: number[];
  attributes: DuplicantAttributeLevel[];
  gender: string;
  genderStringKey: string;
  appearance: DuplicantAppearance;
  health: DuplicantHealthModifier[];
  skills: DuplicantSkillModel;
  effects: DuplicantEffect[];
  availableEffects: string[];
}

const DUPLICANT_ATTRIBUTE_ORDER = [
  "Athletics",
  "Cooking",
  "Digging",
  "Caring",
  "Ranching",
  "Machinery",
  "Construction",
  "Art",
  "Botanist",
  "Learning",
  "Strength",
];

const DUPLICANT_PILOTING_ATTRIBUTE_IDS = [
  "Piloting",
  "SpaceNavigation",
  "Rocketry",
];

const DUPLICANT_ATTRIBUTE_DISPLAY_NAMES: Record<string, string> = {
  SpaceNavigation: "Piloting",
  Piloting: "Piloting",
  Rocketry: "Piloting",
  Construction: "Construction",
  Digging: "Excavation",
  Machinery: "Machinery",
  Athletics: "Athletics",
  Learning: "Science",
  Cooking: "Cuisine",
  Caring: "Medicine",
  Strength: "Strength",
  Art: "Creativity",
  Botanist: "Agriculture",
  Ranching: "Husbandry",
};

function getAttributeDisplayName(attributeId: string): string {
  if (typeof attributeId !== "string" || !attributeId.trim()) {
    return "";
  }
  return DUPLICANT_ATTRIBUTE_DISPLAY_NAMES[attributeId] || attributeId;
}

function getPilotingAttributeId(attributeMap: Record<string, number>): string {
  for (const attributeId of DUPLICANT_PILOTING_ATTRIBUTE_IDS) {
    if (Object.prototype.hasOwnProperty.call(attributeMap, attributeId)) {
      return attributeId;
    }
  }
  return DUPLICANT_PILOTING_ATTRIBUTE_IDS[0];
}

function getOrderedDuplicantAttributeIds(
  attributeMap: Record<string, number>,
): string[] {
  return [
    ...DUPLICANT_ATTRIBUTE_ORDER,
    getPilotingAttributeId(attributeMap),
  ].sort((a, b) => {
    const nameA = getAttributeDisplayName(a);
    const nameB = getAttributeDisplayName(b);
    const byName = nameA.localeCompare(nameB);
    if (byName !== 0) {
      return byName;
    }
    return a.localeCompare(b);
  });
}

const DUPLICANT_HEALTH_MAX: Record<string, number> = {
  Calories: 4000000,
};

import {
  asNumber,
  asString,
  getBehavior,
  getBehaviorAny,
  getGameObjectId,
  levelWithSign,
} from "./save-selector-utils";
function parseAccessoryName(accessory: unknown): string | null {
  const guid =
    isObjectLike(accessory) && isObjectLike(accessory.guid)
      ? accessory.guid.Guid
      : undefined;
  if (typeof guid !== "string") {
    return null;
  }
  const prefix = "Root.Accessories.";
  if (!guid.startsWith(prefix)) {
    return null;
  }
  return guid.slice(prefix.length);
}

function parseAccessoryOrdinal(accessoryName: string, fallback = 1): number {
  if (typeof accessoryName !== "string") {
    return fallback;
  }
  const match = accessoryName.match(/_(\d+)$/);
  if (!match) {
    return fallback;
  }
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readAccessoryOrdinals(accessories: unknown): DuplicantAppearance {
  const list = Array.isArray(accessories) ? accessories : [];

  let hairOrdinal = 1;
  let headOrdinal = 1;
  let eyesOrdinal = 1;

  for (const accessory of list) {
    const name = parseAccessoryName(accessory);
    if (!name) {
      continue;
    }
    if (name.startsWith("hair_")) {
      hairOrdinal = parseAccessoryOrdinal(name, hairOrdinal);
    }
    if (name.startsWith("headshape_")) {
      headOrdinal = parseAccessoryOrdinal(name, headOrdinal);
    }
    if (name.startsWith("eyes_")) {
      eyesOrdinal = parseAccessoryOrdinal(name, eyesOrdinal);
    }
  }

  return {
    hairOrdinal,
    headOrdinal,
    eyesOrdinal,
  };
}

function readHealthModifiers(
  modifiersBehavior: GameObjectBehavior | null,
): DuplicantHealthModifier[] {
  const rawAmounts = modifiersBehavior?.extraData?.amounts;
  const amounts = Array.isArray(rawAmounts) ? rawAmounts : [];

  const map: Record<string, number> = {};
  for (const amount of amounts) {
    const name = amount?.name;
    if (typeof name !== "string") {
      continue;
    }
    map[name] = asNumber(amount?.value?.value, 0);
  }

  return DUPLICANT_HEALTH_MODIFIERS.map((modifier) => ({
    modifier,
    value: asNumber(map[modifier], 0),
    max: DUPLICANT_HEALTH_MAX[modifier] || 100,
  }));
}

function readSkillModel(
  resumeBehavior: GameObjectBehavior | null,
  isBionic: boolean,
  activeDlcIds: readonly string[],
): DuplicantSkillModel {
  const template = resumeBehavior?.templateData || {};
  const experience = asNumber(template.totalExperienceGained, 0);
  const masteryList: unknown[] = Array.isArray(template.MasteryBySkillID)
    ? template.MasteryBySkillID
    : [];

  const masterySet = new Set(
    masteryList
      .filter(
        (entry): entry is unknown[] =>
          Array.isArray(entry) && entry[1] === true,
      )
      .map((entry) => entry[0] as string),
  );

  const allDefinitions: readonly MinionSkillGroupDefinition[] = isBionic
    ? BIONIC_MINION_SKILL_GROUPS
    : STANDARD_MINION_SKILL_GROUPS;
  const activeDlcSet = new Set(activeDlcIds);
  const definitions = allDefinitions.filter(
    (group) =>
      (!group.requiredDlc || activeDlcSet.has(group.requiredDlc)) &&
      (!group.excludedDlc || !activeDlcSet.has(group.excludedDlc)),
  );
  const knownSkillIds = new Set<string>(
    definitions.flatMap((group) => group.skills.map((skill) => skill.skillId)),
  );
  const groups: DuplicantSkillGroup[] = definitions.map((group) => ({
    groupId: group.groupId,
    displayName: group.displayName,
    ...(group.context ? { context: group.context } : {}),
    skills: group.skills.map((skill) => ({
      skillId: skill.skillId,
      displayName: skill.displayName,
      mastered: masterySet.has(skill.skillId),
    })),
  }));
  const unknownSkills = [...masterySet]
    .filter((skillId) => !knownSkillIds.has(skillId))
    .sort((a, b) => a.localeCompare(b));

  if (unknownSkills.length > 0) {
    groups.push({
      groupId: "other",
      displayName: "Other saved skills",
      skills: unknownSkills.map((skillId) => ({
        skillId,
        displayName: skillId,
        mastered: true,
      })),
    });
  }

  return {
    totalExperienceGained: experience,
    groups,
  };
}

function readEffectsModel(
  effectsBehavior: GameObjectBehavior | null,
): DuplicantEffectsModel {
  const rawEffects = effectsBehavior?.templateData?.saveLoadEffects;
  const saveLoadEffects = Array.isArray(rawEffects) ? rawEffects : [];

  const effectIds = new Set(
    saveLoadEffects.map((effect) => effect?.id).filter(Boolean),
  );
  const effectsById = new Map<string, number>();

  for (const effect of saveLoadEffects) {
    if (typeof effect?.id !== "string") continue;
    const timeRemaining = asNumber(effect.timeRemaining, 0);
    const savedTime = effectsById.get(effect.id);
    if (savedTime === undefined || timeRemaining > savedTime) {
      effectsById.set(effect.id, timeRemaining);
    }
  }

  return {
    effects: [...effectsById].map(([id, timeRemaining]) => ({
      id,
      timeRemaining,
      cyclesRemaining: timeRemaining / EFFECT_SECONDS_PER_CYCLE,
    })),
    availableEffects: AI_EFFECT_IDS.filter(
      (effectId) => !effectIds.has(effectId),
    ),
  };
}

export function selectDuplicants(
  saveGame: SaveGame | null,
): DuplicantSummary[] {
  const groups = saveGame?.gameObjects;
  const minionGroup = Array.isArray(groups)
    ? groups.find((group) => group?.name === "Minion")
    : null;

  const minionGameObjects = minionGroup?.gameObjects;
  const minions = Array.isArray(minionGameObjects) ? minionGameObjects : [];
  const list: DuplicantSummary[] = [];

  for (const gameObject of minions) {
    const id = getGameObjectId(gameObject);
    if (id === null) {
      continue;
    }
    const identity = getBehavior(gameObject, "MinionIdentity");
    const traitsBehavior = getBehaviorAny(gameObject, [
      "Klei.AI.Traits",
      "MinionTraits",
    ]);
    const attributesBehavior = getBehaviorAny(gameObject, [
      "Klei.AI.AttributeLevels",
      "AttributeLevels",
    ]);
    const accessorizerBehavior = getBehavior(gameObject, "Accessorizer");

    const rawAttributes = Array.isArray(
      attributesBehavior?.templateData?.saveLoadLevels,
    )
      ? attributesBehavior?.templateData?.saveLoadLevels
      : [];

    const attributeMap: Record<string, number> = {};
    for (const entry of rawAttributes) {
      const attributeId = entry?.attributeId;
      if (!attributeId) {
        continue;
      }
      attributeMap[attributeId] = entry?.level;
    }

    const traitIds = traitsBehavior?.templateData?.TraitIds;

    list.push({
      id,
      name: asString(identity?.templateData?.name, `Duplicant ${id}`),
      gender: asString(
        identity?.templateData?.genderStringKey ??
          identity?.templateData?.gender,
        "UNKNOWN",
      ),
      traits: Array.isArray(traitIds) ? traitIds : [],
      appearance: readAccessoryOrdinals(
        accessorizerBehavior?.templateData?.accessories,
      ),
      attributes: getOrderedDuplicantAttributeIds(attributeMap).map(
        (attributeId) => ({
          attributeId,
          displayName: getAttributeDisplayName(attributeId),
          levelLabel: levelWithSign(attributeMap[attributeId]),
        }),
      ),
    });
  }

  return list.sort((a, b) => a.id - b.id);
}

export function selectDuplicantEditorModel(
  saveGame: SaveGame | null,
  duplicantId: number | null,
): DuplicantEditorModel | null {
  if (duplicantId === null || !Number.isFinite(duplicantId)) {
    return null;
  }
  const duplicants = selectDuplicants(saveGame);
  const summary = duplicants.find((item) => item.id === duplicantId);
  if (!summary) {
    return null;
  }

  const groups = saveGame?.gameObjects;
  const minionGroup = Array.isArray(groups)
    ? groups.find((group) => group?.name === "Minion")
    : null;
  const minionGameObjects = minionGroup?.gameObjects;
  const minions = Array.isArray(minionGameObjects) ? minionGameObjects : [];

  const source = minions.find((obj) => getGameObjectId(obj) === duplicantId);

  const identityBehavior = getBehavior(source, "MinionIdentity");
  const attributesBehavior = getBehaviorAny(source, [
    "Klei.AI.AttributeLevels",
    "AttributeLevels",
  ]);
  const resumeBehavior = getBehavior(source, "MinionResume");
  const effectsBehavior = getBehavior(source, "Klei.AI.Effects");
  const modifiersBehavior = getBehavior(source, "MinionModifiers");
  const accessorizerBehavior = getBehavior(source, "Accessorizer");

  const rawAttributes = Array.isArray(
    attributesBehavior?.templateData?.saveLoadLevels,
  )
    ? attributesBehavior?.templateData?.saveLoadLevels
    : [];
  const rawInterests = Array.isArray(
    resumeBehavior?.templateData?.AptitudeBySkillGroup,
  )
    ? resumeBehavior?.templateData?.AptitudeBySkillGroup
    : [];

  const attributeMap: Record<string, number> = {};
  const selectedInterestSet = new Set<string>();
  const unknownInterestSet = new Set<number>();

  for (const entry of rawAttributes) {
    if (!entry?.attributeId) {
      continue;
    }
    attributeMap[entry.attributeId] = Number.isFinite(entry.level)
      ? entry.level
      : 0;
  }

  for (const entry of rawInterests) {
    if (!Array.isArray(entry) || entry.length < 2) {
      continue;
    }
    const hashedName = entry[0];
    const value = entry[1];
    const hash = hashedName?.hash;
    if (!Number.isFinite(hash) || !Number.isFinite(value) || value <= 0) {
      continue;
    }
    const knownName = getSkillGroupNameByHash(hash);
    if (knownName) {
      selectedInterestSet.add(knownName);
    } else {
      unknownInterestSet.add(hash);
    }
  }

  const compareInterestsByDisplayName = (a: string, b: string): number => {
    const aName = getSkillGroupDisplayName(a);
    const bName = getSkillGroupDisplayName(b);
    const byName = aName.localeCompare(bName);
    if (byName !== 0) {
      return byName;
    }
    return a.localeCompare(b);
  };

  const selectedInterests = [...selectedInterestSet].sort(
    compareInterestsByDisplayName,
  );
  const unknownInterestHashes = [...unknownInterestSet].sort((a, b) => a - b);
  const selectedSet = new Set(selectedInterests);
  const headerDlcIds = saveGame?.header?.gameInfo?.dlcIds;
  const legacyDlcId = saveGame?.header?.gameInfo?.dlcId;
  const activeDlcIds = Array.isArray(headerDlcIds)
    ? headerDlcIds
    : typeof legacyDlcId === "string" && legacyDlcId
      ? [legacyDlcId]
      : [];

  return {
    id: summary.id,
    name: summary.name,
    traits: summary.traits,
    interests: selectedInterests,
    availableInterests: DUPLICANT_INTEREST_NAMES.filter(
      (name) => !selectedSet.has(name),
    ).sort(compareInterestsByDisplayName),
    unknownInterestHashes,
    attributes: getOrderedDuplicantAttributeIds(attributeMap).map(
      (attributeId) => ({
        attributeId,
        displayName: getAttributeDisplayName(attributeId),
        level: Number.isFinite(attributeMap[attributeId])
          ? attributeMap[attributeId]
          : 0,
      }),
    ),
    gender: asString(identityBehavior?.templateData?.gender, "UNKNOWN"),
    genderStringKey: asString(
      identityBehavior?.templateData?.genderStringKey,
      "UNKNOWN",
    ),
    appearance: readAccessoryOrdinals(
      accessorizerBehavior?.templateData?.accessories,
    ),
    health: readHealthModifiers(modifiersBehavior),
    skills: readSkillModel(
      resumeBehavior,
      summary.traits.some(isBionicIdentityTraitId),
      activeDlcIds,
    ),
    ...readEffectsModel(effectsBehavior),
  };
}
