import {
  SimHashes,
  SimHashNames,
  type OverworldCell,
  type SaveGame,
} from "@/lib/save-parser/model";
import {
  asNumber,
  asString,
  getBehavior,
  getGameObjectId,
} from "./save-selector-utils";
import { getWorldDisplayName } from "./world-names";

interface PlanetRecoverableElement {
  element: string;
  // Original sim hash, retained so edits can be written back as [hash, fraction]
  // tuples without re-resolving the name.
  hash: number;
  fraction: number;
}

export interface Planet {
  id: number;
  type: string;
  distance: number;
  availableMass: number;
  startingOrbitPercentage: number;
  activePeriod: number;
  inactivePeriod: number;
  recoverableElements: PlanetRecoverableElement[];
}

interface PlanetoidBiome {
  zoneType: number;
  names: string[];
  cellCount: number;
}

export interface Planetoid {
  id: number;
  name: string;
  worldName: string;
  displayWorldName: string;
  worldType: string;
  starmapLocation: { q: number; r: number } | null;
  worldOffset: { x: number; y: number };
  worldSize: { x: number; y: number };
  isStartWorld: boolean;
  isDiscovered: boolean;
  isDupeVisited: boolean;
  isSurfaceRevealed: boolean;
  biomes: PlanetoidBiome[];
}

export interface LargeImpactor {
  id: number;
  currentLocation: { q: number; r: number } | null;
  targetLocation: { q: number; r: number } | null;
  crashStampLocation: { x: number; y: number } | null;
  opaqueStateBytes: number;
}

const NON_BIOME_TAG_NAMES = new Set([
  "ErodePointToBorderInv",
  "IgnoreCaveOverride",
  "NoGlobalFeatureSpawning",
  "NoGravitasFeatures",
  "Overworld",
  "RemoveWorldBorderOverVacuum",
  "StartWorld",
  "SwapLakesToBelow",
]);

const BIOME_DISPLAY_NAMES: Record<string, string> = {
  CarrotQuarry: "Cool Pool",
  PrehistoricGarden: "Garden",
  PrehistoricRaptor: "Feather",
  PrehistoricWetlands: "Wetlands",
  SugarWoods: "Nectar",
};

function isBiomeTag(name: string): boolean {
  return (
    Boolean(name) &&
    !name.startsWith("At") &&
    !name.startsWith("Erode") &&
    !NON_BIOME_TAG_NAMES.has(name)
  );
}

function humanizeIdentifier(value: string): string {
  const displayName = BIOME_DISPLAY_NAMES[value];
  if (displayName) {
    return displayName;
  }
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readOptionalPoint(value: unknown): { x: number; y: number } | null {
  const point = value as { x?: unknown; y?: unknown } | null;
  const x = asNumber(point?.x, NaN);
  const y = asNumber(point?.y, NaN);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

function readPoint(value: unknown): { x: number; y: number } {
  const point = value as { x?: unknown; y?: unknown } | null;
  return {
    x: asNumber(point?.x, 0),
    y: asNumber(point?.y, 0),
  };
}

function readStarmapLocation(value: unknown): { q: number; r: number } | null {
  const location = value as { q?: unknown; r?: unknown } | null;
  const q = asNumber(location?.q, NaN);
  const r = asNumber(location?.r, NaN);
  return Number.isFinite(q) && Number.isFinite(r) ? { q, r } : null;
}

function getCellCenter(cell: OverworldCell): { x: number; y: number } | null {
  const vertices = Array.isArray(cell?.poly?.vertices)
    ? cell.poly.vertices
    : [];
  if (vertices.length === 0) {
    return null;
  }
  let x = 0;
  let y = 0;
  for (const vertex of vertices) {
    x += asNumber(vertex?.x, 0);
    y += asNumber(vertex?.y, 0);
  }
  return { x: x / vertices.length, y: y / vertices.length };
}

function cellBelongsToPlanetoid(
  cell: OverworldCell,
  worldOffset: Planetoid["worldOffset"],
  worldSize: Planetoid["worldSize"],
): boolean {
  const center = getCellCenter(cell);
  if (!center) {
    return false;
  }
  return (
    center.x >= worldOffset.x &&
    center.x < worldOffset.x + worldSize.x &&
    center.y >= worldOffset.y &&
    center.y < worldOffset.y + worldSize.y
  );
}

function selectPlanetoidBiomes(
  cells: OverworldCell[],
  worldOffset: Planetoid["worldOffset"],
  worldSize: Planetoid["worldSize"],
): PlanetoidBiome[] {
  const byZone = new Map<
    number,
    { zoneType: number; names: Set<string>; cellCount: number }
  >();

  for (const cell of cells) {
    if (!cellBelongsToPlanetoid(cell, worldOffset, worldSize)) {
      continue;
    }
    const zoneType = asNumber(cell?.zoneType, NaN);
    if (!Number.isFinite(zoneType)) {
      continue;
    }
    const current = byZone.get(zoneType) ?? {
      zoneType,
      names: new Set<string>(),
      cellCount: 0,
    };
    current.cellCount += 1;
    for (const tag of Array.isArray(cell?.tags?.tags) ? cell.tags.tags : []) {
      const name = asString(tag?.name);
      if (isBiomeTag(name)) {
        current.names.add(humanizeIdentifier(name));
      }
    }
    byZone.set(zoneType, current);
  }

  return [...byZone.values()]
    .map(({ zoneType, names, cellCount }) => ({
      zoneType,
      names: [...names].sort((a, b) => a.localeCompare(b)),
      cellCount,
    }))
    .sort((a, b) => a.zoneType - b.zoneType);
}

export function selectPlanetoids(saveGame: SaveGame | null): Planetoid[] {
  const groups = Array.isArray(saveGame?.gameObjects)
    ? saveGame.gameObjects
    : [];
  const asteroidGroup = groups.find((group) => group?.name === "Asteroid");
  const instances = Array.isArray(asteroidGroup?.gameObjects)
    ? asteroidGroup.gameObjects
    : [];
  const cells = Array.isArray(saveGame?.gameData?.worldDetail?.overworldCells)
    ? saveGame.gameData.worldDetail.overworldCells
    : [];

  return instances
    .map((instance) => {
      const world = getBehavior(instance, "WorldContainer")?.templateData;
      if (!world || typeof world !== "object") {
        return null;
      }
      const id = asNumber(world.id, NaN);
      if (!Number.isFinite(id)) {
        return null;
      }
      const grid = getBehavior(instance, "AsteroidGridEntity")?.templateData;
      const worldOffset = readPoint(world.worldOffset);
      const worldSize = readPoint(world.worldSize);
      const worldName = asString(world.worldName, "Unknown");
      const fallbackName = humanizeIdentifier(
        worldName.split("/").pop() || `Planetoid ${id}`,
      );

      return {
        id,
        name: asString(grid?.m_name, fallbackName),
        worldName,
        displayWorldName: getWorldDisplayName(worldName),
        worldType: asString(world.worldType),
        starmapLocation: readStarmapLocation(grid?.m_location),
        worldOffset,
        worldSize,
        isStartWorld: Boolean(world.isStartWorld),
        isDiscovered: Boolean(world.isDiscovered),
        isDupeVisited: Boolean(world.isDupeVisited),
        isSurfaceRevealed: Boolean(world.isSurfaceRevealed),
        biomes: selectPlanetoidBiomes(cells, worldOffset, worldSize),
      } satisfies Planetoid;
    })
    .filter((planetoid): planetoid is Planetoid => planetoid !== null)
    .sort((a, b) => {
      if (a.isStartWorld !== b.isStartWorld) {
        return a.isStartWorld ? -1 : 1;
      }
      return a.id - b.id;
    });
}

export function selectLargeImpactors(
  saveGame: SaveGame | null,
): LargeImpactor[] {
  const groups = Array.isArray(saveGame?.gameObjects)
    ? saveGame.gameObjects
    : [];
  const group = groups.find((entry) => entry?.name === "LargeImpactor");
  const instances = Array.isArray(group?.gameObjects) ? group.gameObjects : [];

  return instances
    .map((instance) => {
      const id = getGameObjectId(instance);
      if (id === null) {
        return null;
      }
      const state = getBehavior(instance, "StateMachineController")?.extraRaw;
      return {
        id,
        currentLocation: readStarmapLocation(
          getBehavior(instance, "ClusterMapMeteorShowerVisualizer")
            ?.templateData?.m_location,
        ),
        targetLocation: readStarmapLocation(
          getBehavior(instance, "ClusterDestinationSelector")?.templateData
            ?.m_destination,
        ),
        crashStampLocation: readOptionalPoint(
          getBehavior(instance, "LargeImpactorCrashStamp")?.templateData
            ?.stampLocation,
        ),
        opaqueStateBytes: state instanceof ArrayBuffer ? state.byteLength : 0,
      } satisfies LargeImpactor;
    })
    .filter((impactor): impactor is LargeImpactor => impactor !== null)
    .sort((a, b) => a.id - b.id);
}

// Element names offered when adding a recoverable element to a planet.
// SimHashNames is the element catalog (the same set used to detect loose
// materials), so it is the correct pool of choices here.
export const RECOVERABLE_ELEMENT_NAMES = [...SimHashNames]
  .map(String)
  .sort((a, b) => a.localeCompare(b));

// Resolve an element name back to its sim hash for write-back as a
// [hash, fraction] tuple. Returns null for names not in the element catalog.
export function getSimHashByElementName(name: string): number | null {
  const value = (SimHashes as unknown as Record<string, number>)[name];
  return typeof value === "number" ? value : null;
}

function toRecoverableElement(tuple: unknown): PlanetRecoverableElement | null {
  if (!Array.isArray(tuple)) {
    return null;
  }
  const hash = tuple[0];
  const fraction = tuple[1];
  if (typeof hash !== "number") {
    return null;
  }
  const name = SimHashes[hash];
  return {
    element: typeof name === "string" ? name : String(hash),
    hash,
    fraction: asNumber(fraction, 0),
  };
}

export function selectPlanets(saveGame: SaveGame | null): Planet[] {
  const allGroups = saveGame?.gameObjects;
  const groups = Array.isArray(allGroups) ? allGroups : [];

  for (const group of groups) {
    const groupGameObjects = group?.gameObjects;
    const instances = Array.isArray(groupGameObjects) ? groupGameObjects : [];
    for (const instance of instances) {
      const behavior = getBehavior(instance, "SpacecraftManager");
      if (!behavior) {
        continue;
      }
      const destinations = behavior.templateData?.destinations;
      const list = Array.isArray(destinations) ? destinations : [];
      return list
        .map((destination) => {
          const id = asNumber(destination?.id, NaN);
          if (!Number.isFinite(id)) {
            return null;
          }
          const recoverableElements = Array.isArray(
            destination?.recoverableElements,
          )
            ? destination.recoverableElements
                .map(toRecoverableElement)
                .filter(
                  (
                    entry: PlanetRecoverableElement | null,
                  ): entry is PlanetRecoverableElement => entry !== null,
                )
            : [];
          const planet: Planet = {
            id,
            type: asString(destination?.type, "Unknown"),
            distance: asNumber(destination?.distance, 0),
            availableMass: asNumber(destination?.availableMass, 0),
            startingOrbitPercentage: asNumber(
              destination?.startingOrbitPercentage,
              0,
            ),
            activePeriod: asNumber(destination?.activePeriod, 0),
            inactivePeriod: asNumber(destination?.inactivePeriod, 0),
            recoverableElements,
          };
          return planet;
        })
        .filter((planet): planet is Planet => planet !== null)
        .sort((a, b) => a.id - b.id);
    }
  }

  return [];
}
