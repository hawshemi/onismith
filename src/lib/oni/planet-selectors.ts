import {
  SimHashes,
  SimHashNames,
  type SaveGame,
} from "@/lib/save-parser/model";
import { asNumber, asString, getBehavior } from "./save-selector-utils";

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
