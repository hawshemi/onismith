import { ArrayDataReader, ArrayDataWriter } from "./binary-serializer";

import { parse, unparse, ParseInterceptor, UnparseInterceptor } from "./parser";

import type { SaveGame } from "./save-structure/save-game";
import {
  parseSaveGame as saveGameParser,
  unparseSaveGame as saveGameUnparser,
  SaveGameParserOptions,
} from "./save-structure/parser";

export { progressReporter } from "./progress";
export type { SaveGame } from "./save-structure/save-game";

export interface ParseOptions extends SaveGameParserOptions {
  interceptor?: ParseInterceptor;
}

export function parseSaveGame(
  data: ArrayBuffer,
  interceptor?: ParseInterceptor,
): SaveGame;
export function parseSaveGame(
  data: ArrayBuffer,
  options?: ParseOptions,
): SaveGame;
export function parseSaveGame(
  data: ArrayBuffer,
  opts?: ParseInterceptor | ParseOptions,
): SaveGame {
  let interceptor: ParseInterceptor | undefined = undefined;
  let parserOptions: SaveGameParserOptions = {};
  if (typeof opts === "function") {
    interceptor = opts;
  } else if (opts != null) {
    parserOptions = opts;
    interceptor = opts.interceptor;
  }
  const reader = new ArrayDataReader(data);
  const saveGame = parse<SaveGame>(
    reader,
    saveGameParser(parserOptions),
    interceptor,
  );
  return saveGame;
}

export function writeSaveGame(
  save: SaveGame,
  interceptor?: UnparseInterceptor,
): ArrayBuffer {
  const writer = new ArrayDataWriter();
  unparse<SaveGame>(writer, saveGameUnparser(save), interceptor);
  return writer.getBytes();
}
