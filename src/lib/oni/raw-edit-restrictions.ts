import type { GameObject, SaveGame } from "@/lib/save-parser/model";
import { getPathValue } from "./raw-path-utils";
import { getBehavior } from "./save-selector-utils";

function startsWithPath(path: readonly string[], prefix: readonly string[]) {
  return prefix.every((segment, index) => path[index] === segment);
}

const LINKED_HEADER_PATHS = new Set([
  "header.buildVersion",
  "header.gameInfo.clusterId",
  "header.gameInfo.numberOfCycles",
  "header.gameInfo.numberOfDuplicants",
  "header.gameInfo.sandboxEnabled",
  "gameData.debugWasUsed",
]);

const READ_ONLY_WORLD_PATHS = [
  ["world", "WidthInCells"],
  ["world", "HeightInCells"],
  ["world", "clusterID"],
  ["world", "active_mods"],
  ["world", "requiredMods"],
] as const;

export function getRawEditRestriction(
  saveGame: SaveGame,
  path: readonly string[],
): string | null {
  if (startsWithPath(path, ["world", "streamed"])) {
    return "Streamed grid and fog data is opaque and is preserved without editing.";
  }
  if (READ_ONLY_WORLD_PATHS.some((prefix) => startsWithPath(path, prefix))) {
    return "World layout and mod metadata is read-only because it is linked to generated save content.";
  }
  if (startsWithPath(path, ["gameData", "worldDetail"])) {
    return "World-generation and biome data is linked to the generated grid and is inspect-only.";
  }
  if (startsWithPath(path, ["simData"]) || path.includes("extraRaw")) {
    return "Opaque binary data is preserved without editing.";
  }
  if (startsWithPath(path, ["gameData", "storySetings"])) {
    return "Story data has a linked copy elsewhere in the save and is inspect-only.";
  }
  if (startsWithPath(path, ["header", "gameInfo", "dlcIds"])) {
    return "Active DLC metadata is read-only because changing it does not add or remove DLC content.";
  }
  if (
    startsWithPath(path, [
      "gameData",
      "customGameSettings",
      "CurrentMixingLevelsBySetting",
    ])
  ) {
    return "DLC mixing choices are world-generation metadata and are read-only after generation.";
  }
  if (LINKED_HEADER_PATHS.has(path.join("."))) {
    return "This metadata is linked to gameplay data or save history and cannot be edited independently.";
  }

  if (path.length === 3 && path[0] === "gameObjects" && path[2] === "name") {
    return "Serialized object-group names are structural identifiers and cannot be edited safely.";
  }

  if (
    path[0] === "gameObjects" &&
    path[2] === "gameObjects" &&
    path.length > 4
  ) {
    const group = getPathValue(saveGame, path.slice(0, 2)) as
      { name?: unknown } | undefined;
    const gameObject = getPathValue(
      saveGame,
      path.slice(0, 4),
    ) as GameObject | null;
    if (group?.name === "Asteroid") {
      return "Planetoid data is linked to starmap, grid, and discovery state and is inspect-only.";
    }
    if (getBehavior(gameObject, "BuildingComplete")) {
      return "Building data includes linked runtime state and is inspect-only.";
    }
  }

  const behaviorsIndex = path.indexOf("behaviors");
  if (behaviorsIndex >= 0 && path.length > behaviorsIndex + 1) {
    const behaviorPath = path.slice(0, behaviorsIndex + 2);
    const behavior = getPathValue(saveGame, behaviorPath) as
      { name?: unknown } | undefined;
    const fieldPath = path.slice(behaviorsIndex + 2).join(".");
    if (fieldPath === "name") {
      return "Serialized behavior names are structural identifiers and cannot be edited safely.";
    }
    if (
      behavior?.name === "StoryManager" &&
      fieldPath.startsWith("templateData")
    ) {
      return "Story data has a linked copy elsewhere in the save and is inspect-only.";
    }
    if (behavior?.name === "GameClock" && fieldPath === "templateData.cycle") {
      return "Cycle is linked to the save header. Use the Overview editor.";
    }
    if (
      behavior?.name === "SaveGame" &&
      fieldPath === "templateData.sandboxEnabled"
    ) {
      return "Sandbox mode is linked to other save fields. Use the Overview editor.";
    }
  }

  if (
    startsWithPath(path, [
      "gameData",
      "customGameSettings",
      "CurrentQualityLevelsBySetting",
    ]) &&
    path.at(-1) === "1"
  ) {
    const pair = getPathValue(saveGame, path.slice(0, -1));
    const settingName = Array.isArray(pair) ? pair[0] : null;
    if (settingName === "SandboxMode") {
      return "Sandbox mode is linked to other save fields. Use the Overview editor.";
    }
    if (settingName === "ClusterLayout") {
      return "Cluster layout is world-generation metadata and is read-only after generation.";
    }
  }

  return null;
}
