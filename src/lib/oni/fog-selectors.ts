import type { SaveGame } from "@/lib/save-parser/model";

export interface FogStreamSummary {
  name: string;
  bytes: number;
}

export interface FogSummary {
  width: number;
  height: number;
  cellCount: number;
  hasVisibilityData: boolean;
  visibleEntryCount: number | null;
  visibleEntryRatio: number | null;
  streams: FogStreamSummary[];
  totalBytes: number;
}

export function selectFogSummary(saveGame: SaveGame | null): FogSummary {
  const width = Number.isFinite(saveGame?.world?.WidthInCells)
    ? Math.max(0, Number(saveGame?.world?.WidthInCells))
    : 0;
  const height = Number.isFinite(saveGame?.world?.HeightInCells)
    ? Math.max(0, Number(saveGame?.world?.HeightInCells))
    : 0;
  const rawStreams = Array.isArray(saveGame?.world?.streamed)
    ? saveGame.world.streamed
    : [];
  const streams = rawStreams
    .map(([name, data]) => ({
      name: String(name),
      bytes: ArrayBuffer.isView(data) ? data.byteLength : 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const visibility = rawStreams.find(([name]) => name === "GridVisible")?.[1];
  const hasVisibilityData = visibility instanceof Uint8Array;
  const visibleEntryCount = hasVisibilityData
    ? Array.from(visibility).reduce(
        (count, value) => count + (value === 0 ? 0 : 1),
        0,
      )
    : null;

  return {
    width,
    height,
    cellCount: width * height,
    hasVisibilityData,
    visibleEntryCount,
    visibleEntryRatio:
      visibleEntryCount !== null &&
      visibility instanceof Uint8Array &&
      visibility.byteLength > 0
        ? visibleEntryCount / visibility.byteLength
        : null,
    streams,
    totalBytes: streams.reduce((total, stream) => total + stream.bytes, 0),
  };
}
