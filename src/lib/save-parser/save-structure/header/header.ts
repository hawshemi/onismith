export interface SaveGameHeader {
  buildVersion: number;
  headerVersion: number;
  isCompressed: boolean;
  gameInfo: SaveGameInfo;
}

/**
 * Class: "SaveGame+GameInfo"
 * Parser: "SaveGame.GetGameInfo(byte[] bytes)"
 */
interface SaveGameInfo {
  numberOfCycles: number;
  numberOfDuplicants: number;
  baseName: string;
  isAutoSave: boolean;
  originalSaveName: string;
  saveMajorVersion: number;
  saveMinorVersion: number;
  clusterId: string;
  //worldTraits: null; // Not sure what this is
  sandboxEnabled: boolean;
  colonyGuid: string;
  dlcId: string | null;
  dlcIds?: string[];
}

export function assertSaveGameHeader(
  value: SaveGameHeader,
): asserts value is SaveGameHeader {
  if (!value || typeof value !== "object") {
    throw new TypeError("Save header must be an object.");
  }
  if (!Number.isFinite(value.buildVersion)) {
    throw new TypeError("Save header buildVersion must be a finite number.");
  }
  if (!Number.isFinite(value.headerVersion)) {
    throw new TypeError("Save header headerVersion must be a finite number.");
  }
  if (typeof value.isCompressed !== "boolean") {
    throw new TypeError("Save header isCompressed must be a boolean.");
  }
  if (!value.gameInfo || typeof value.gameInfo !== "object") {
    throw new TypeError("Save header gameInfo must be an object.");
  }
}
