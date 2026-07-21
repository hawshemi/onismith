export interface SaveModVersion {
  unsigned: boolean;
  lower: number;
  upper: number;
}

export interface SaveModLabel {
  distribution_platform: number;
  id: string;
  title: string;
  version: SaveModVersion;
}

export interface SaveGameWorld {
  WidthInCells: number;
  HeightInCells: number;
  streamed: [string, Uint8Array][];
  clusterID?: string | null;
  requiredMods?: unknown[] | null;
  active_mods?: SaveModLabel[] | null;
}
