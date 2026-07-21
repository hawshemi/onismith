import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseSaveGame } from "./index";

const FIXTURE_DIRECTORY = new URL("./test-fixtures/", import.meta.url);

function fixtureUrl(fileName: string): URL {
  return new URL(fileName, FIXTURE_DIRECTORY);
}

export function localSaveFixtureExists(fileName: string): boolean {
  return existsSync(fileURLToPath(fixtureUrl(fileName)));
}

export function parseLocalSaveFixture(fileName: string) {
  const bytes = readFileSync(fileURLToPath(fixtureUrl(fileName)));
  return parseSaveGame(
    bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer,
    { versionStrictness: "minor" },
  );
}
