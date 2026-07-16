import { SimHashNames, type SaveGame } from "@/lib/save-parser/model";
import { asNumber, asString, getBehavior } from "./save-selector-utils";

const LOOSE_MATERIAL_NAMES = new Set<string>(SimHashNames);

export interface LooseMaterial {
  materialType: string;
  count: number;
  totalMass: number;
  averageTemperature: number;
}

export function selectLooseMaterials(
  saveGame: SaveGame | null,
): LooseMaterial[] {
  const allGroups = saveGame?.gameObjects;
  const groups = Array.isArray(allGroups) ? allGroups : [];
  const list: LooseMaterial[] = [];

  for (const group of groups) {
    const name = asString(group?.name);
    if (!name || !LOOSE_MATERIAL_NAMES.has(name)) {
      continue;
    }
    const groupGameObjects = group?.gameObjects;
    const instances = Array.isArray(groupGameObjects) ? groupGameObjects : [];
    if (instances.length === 0) {
      continue;
    }

    let totalMass = 0;
    let temperatureSum = 0;
    let temperatureCount = 0;
    for (const instance of instances) {
      const primary = getBehavior(instance, "PrimaryElement");
      totalMass += asNumber(primary?.templateData?.Units, 0);
      const temperature = primary?.templateData?._Temperature;
      if (typeof temperature === "number" && Number.isFinite(temperature)) {
        temperatureSum += temperature;
        temperatureCount += 1;
      }
    }

    list.push({
      materialType: name,
      count: instances.length,
      totalMass,
      averageTemperature:
        temperatureCount > 0 ? temperatureSum / temperatureCount : 0,
    });
  }

  return list.sort((a, b) => a.materialType.localeCompare(b.materialType));
}
