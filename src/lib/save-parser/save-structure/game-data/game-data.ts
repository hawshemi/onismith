import { Vector2I } from "../../save-structure/data-types";

export interface OverworldCell {
  poly: {
    vertices: Array<{ x: number; y: number }>;
  };
  tags: {
    tags: Array<{ name: string; hash: number }>;
  };
  zoneType: number;
  biomeIdx: number;
}

interface WorldDetail {
  overworldCells: OverworldCell[];
  globalWorldSeed: number;
  globalWorldLayoutSeed: number;
  globalTerrainSeed: number;
  globalNoiseSeed: number;
}

export interface SaveGameData {
  // The `any` fields below are decoded from ONI type-templates whose binary
  // shapes are not modeled here; they round-trip as opaque template data.

  gasConduitFlow: any;
  liquidConduitFlow: any;
  simActiveRegionMin: Vector2I;
  simActiveRegionMax: Vector2I;
  fallingWater: any;
  bubbleManager?: any;
  unstableGround: any;
  worldDetail: WorldDetail;
  customGameSettings: CustomGameSettings;
  storySetings?: any;
  spaceScannerNetworkManager?: any;
  debugWasUsed: boolean;
  autoPrioritizeRoles: any;
  advancedPersonalPriorities: boolean;
  savedInfo: {
    discoveredSurface: boolean;
    discoveredOilField?: boolean;
    curedDisease?: boolean;
    blockedCometWithBunkerDoor?: boolean;
    creaturePoopAmount?: any;
    powerCreatedbyGeneratorType?: any;
  };
  dateGenerated?: string;
  changelistsPlayedOn?: number[];
}

interface CustomGameSettings {
  is_custom_game: boolean;
  customGameMode: number; // 0 normal, 1 easy, 255 custom
  CurrentQualityLevelsBySetting: QualityLevelSettings[];
  CurrentMixingLevelsBySetting?: QualityLevelSettings[];
}

export type QualityLevelSettings =
  | [
      "ImmuneSystem",
      "Compromised" | "Weak" | "Default" | "Strong" | "Invincible",
    ]
  | [
      "Stress",
      "Doomed" | "Pessimistic" | "Default" | "Optimistic" | "Indomitable",
    ]
  | [
      "Morale" | "CalorieBurn",
      "VeryHard" | "Hard" | "Default" | "Easy" | "Disabled",
    ]
  | ["StressBreaks", "Disabled" | "Default"]
  | ["SandboxMode", "Disabled" | "Enabled"];
