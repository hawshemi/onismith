import type { SaveGame } from "@/lib/save-parser/model";
import { asNumber, asString } from "./save-selector-utils";

export interface ActiveMod {
  id: string;
  title: string;
  distributionPlatform: number;
}

export function selectActiveMods(saveGame: SaveGame | null): ActiveMod[] {
  const labels = saveGame?.world?.active_mods;
  if (!Array.isArray(labels)) {
    return [];
  }

  return labels
    .map((label) => {
      const id = asString(label?.id);
      if (!id) {
        return null;
      }
      return {
        id,
        title: asString(label?.title, id),
        distributionPlatform: asNumber(label?.distribution_platform, 0),
      } satisfies ActiveMod;
    })
    .filter((mod): mod is ActiveMod => mod !== null)
    .sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
}
