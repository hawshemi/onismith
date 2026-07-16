import type { SaveGame } from "@/lib/save-parser/model";
import {
  EMPTY_HISTORY,
  record,
  redo as redoHistory,
  undo as undoHistory,
  type History,
} from "./history";
import type { BehaviorPayload } from "./save-mutations";

type SaveStatus = "idle" | "loading" | "ready" | "saving" | "error";

export interface AppError {
  message: string;
  code?: string | null;
  stack?: string | null;
}

export type BehaviorDataMap = Record<string, BehaviorPayload>;

export interface CopyPasteData {
  gameObjectType: string;
  sourceId: number;
  sourceName: string;
  behaviors: BehaviorDataMap;
}

export interface ImportPayload {
  gameObjectType: string;
  behaviors: BehaviorDataMap;
  $sha1?: string;
}

export interface ImportWarningData {
  duplicantId: number;
  fileName: string;
  expectedHash: string | null;
  actualHash: string | null;
  payload: ImportPayload;
}

export type ImportResult = "applied" | "warning" | "error" | "ignored";

export interface SaveSessionState {
  status: SaveStatus;
  progressMessage: string;
  error: AppError | null;
  saveGame: SaveGame | null;
  fileName: string | null;
  fileHandle: FileSystemFileHandle | null;
  parseTimeMs: number | null;
  lastWrittenBytes: number | null;
  isModified: boolean;
  selectedDuplicantId: number | null;
  selectedCreatureId: number | null;
  pendingFile: File | null;
  preferredStrictness: string;
  lastLoadAttemptStrictness: string;
  copyPasteData: CopyPasteData | null;
  importWarning: ImportWarningData | null;
  history: History<SaveGame>;
  savedSaveGame: SaveGame | null;
}

export type SaveSessionAction =
  | { type: "SET_STRICTNESS"; strictness?: string }
  | { type: "LOAD_BEGIN"; file: File; strictness: string }
  | { type: "LOAD_PROGRESS"; message?: string }
  | {
      type: "LOAD_SUCCESS";
      saveGame: SaveGame;
      fileName: string;
      fileHandle?: FileSystemFileHandle | null;
      parseTimeMs: number;
    }
  | { type: "LOAD_ERROR"; error: AppError }
  | { type: "SAVE_BEGIN" }
  | { type: "SAVE_PROGRESS"; message?: string }
  | { type: "SAVE_SUCCESS"; bytes: number }
  | { type: "SAVE_ERROR"; error: AppError }
  | { type: "SET_SAVE_GAME"; saveGame: SaveGame | null; isModified?: boolean }
  | { type: "SET_COPY_PASTE_DATA"; copyPasteData?: CopyPasteData | null }
  | { type: "SET_IMPORT_WARNING"; importWarning?: ImportWarningData | null }
  | { type: "CLEAR_IMPORT_WARNING" }
  | { type: "SET_SELECTED_DUPLICANT"; id: number | null }
  | { type: "SET_SELECTED_CREATURE"; id: number | null }
  | { type: "CLEAR_ERROR" }
  | { type: "SET_ERROR"; error?: AppError | null }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "DISCARD_CHANGES" };

export interface LoadSaveOptions {
  versionStrictness?: string;
  fileHandle?: FileSystemFileHandle | null;
}

export interface LoadPickerOptions {
  versionStrictness?: string;
}

export interface SaveCurrentFileOptions {
  inPlace?: boolean;
  backup?: boolean;
  fileName?: string;
}

export interface SetSaveGameOptions {
  isModified?: boolean;
}

interface OpenFilePickerOptions {
  id?: string;
  startIn?: FileSystemFileHandle | string;
  multiple?: boolean;
  excludeAcceptAllOption?: boolean;
  types?: Array<{
    description?: string;
    accept: Record<string, string | string[]>;
  }>;
}

export type ShowOpenFilePicker = (
  options?: OpenFilePickerOptions,
) => Promise<FileSystemFileHandle[]>;

export const STRICTNESS_STORAGE_KEY = "onismith.strictness";
export const DEFAULT_STRICTNESS = "major";

export const INITIAL_STATE: SaveSessionState = {
  status: "idle",
  progressMessage: "",
  error: null,
  saveGame: null,
  fileName: null,
  fileHandle: null,
  parseTimeMs: null,
  lastWrittenBytes: null,
  isModified: false,
  selectedDuplicantId: null,
  selectedCreatureId: null,
  pendingFile: null,
  preferredStrictness: DEFAULT_STRICTNESS,
  lastLoadAttemptStrictness: "major",
  copyPasteData: null,
  importWarning: null,
  history: EMPTY_HISTORY,
  savedSaveGame: null,
};

export function saveSessionReducer(
  state: SaveSessionState,
  action: SaveSessionAction,
): SaveSessionState {
  switch (action.type) {
    case "SET_STRICTNESS":
      return {
        ...state,
        preferredStrictness: action.strictness || DEFAULT_STRICTNESS,
      };
    case "LOAD_BEGIN":
      return {
        ...state,
        status: "loading",
        progressMessage: "",
        error: null,
        pendingFile: action.file,
        lastLoadAttemptStrictness: action.strictness,
      };
    case "LOAD_PROGRESS":
      return { ...state, progressMessage: action.message || "" };
    case "LOAD_SUCCESS":
      return {
        ...state,
        status: "ready",
        progressMessage: "",
        error: null,
        saveGame: action.saveGame,
        fileName: action.fileName,
        fileHandle: action.fileHandle || null,
        parseTimeMs: action.parseTimeMs,
        lastWrittenBytes: null,
        isModified: false,
        selectedDuplicantId: null,
        selectedCreatureId: null,
        pendingFile: null,
        importWarning: null,
        history: EMPTY_HISTORY,
        savedSaveGame: action.saveGame,
      };
    case "LOAD_ERROR":
      return {
        ...state,
        status: "error",
        progressMessage: "",
        error: action.error,
      };
    case "SAVE_BEGIN":
      return {
        ...state,
        status: "saving",
        progressMessage: "",
        error: null,
      };
    case "SAVE_PROGRESS":
      return { ...state, progressMessage: action.message || "" };
    case "SAVE_SUCCESS":
      return {
        ...state,
        status: "ready",
        progressMessage: "",
        error: null,
        lastWrittenBytes: action.bytes,
        isModified: false,
        savedSaveGame: state.saveGame,
      };
    case "SAVE_ERROR":
      return {
        ...state,
        status: "error",
        progressMessage: "",
        error: action.error,
      };
    case "SET_SAVE_GAME": {
      if (!action.saveGame) {
        return {
          ...state,
          saveGame: null,
          isModified: false,
          history: EMPTY_HISTORY,
          savedSaveGame: null,
        };
      }
      const isEdit =
        state.saveGame !== null && action.saveGame !== state.saveGame;
      return {
        ...state,
        saveGame: action.saveGame,
        isModified: action.isModified ?? true,
        history: isEdit
          ? record(state.history, state.saveGame as SaveGame)
          : state.history,
      };
    }
    case "SET_COPY_PASTE_DATA":
      return { ...state, copyPasteData: action.copyPasteData || null };
    case "SET_IMPORT_WARNING":
      return { ...state, importWarning: action.importWarning || null };
    case "CLEAR_IMPORT_WARNING":
      return { ...state, importWarning: null };
    case "SET_SELECTED_DUPLICANT":
      return { ...state, selectedDuplicantId: action.id };
    case "SET_SELECTED_CREATURE":
      return { ...state, selectedCreatureId: action.id };
    case "CLEAR_ERROR":
      return {
        ...state,
        error: null,
        status: state.saveGame ? "ready" : "idle",
      };
    case "SET_ERROR":
      return { ...state, error: action.error || null };
    case "UNDO": {
      if (!state.saveGame) return state;
      const result = undoHistory(state.history, state.saveGame);
      if (!result) return state;
      return {
        ...state,
        saveGame: result.present,
        history: result.history,
        isModified: result.present !== state.savedSaveGame,
      };
    }
    case "REDO": {
      if (!state.saveGame) return state;
      const result = redoHistory(state.history, state.saveGame);
      if (!result) return state;
      return {
        ...state,
        saveGame: result.present,
        history: result.history,
        isModified: result.present !== state.savedSaveGame,
      };
    }
    case "DISCARD_CHANGES":
      if (!state.savedSaveGame || state.saveGame === state.savedSaveGame) {
        return state;
      }
      return {
        ...state,
        saveGame: state.savedSaveGame,
        history: EMPTY_HISTORY,
        isModified: false,
      };
    default:
      return state;
  }
}

export function normalizeError(error: unknown): AppError {
  if (!error || typeof error !== "object") {
    return { message: "Unknown error" };
  }
  const source = error as {
    message?: string;
    code?: string;
    stack?: string;
  };
  return {
    message: source.message || "Unknown error",
    code: source.code || null,
    stack: source.stack || null,
  };
}

export function normalizeStrictness(value: string): string {
  return value === "minor" || value === "none" ? value : DEFAULT_STRICTNESS;
}

export function withErrorCode(
  message: string,
  code: string | null = null,
): AppError {
  return { message, code, stack: null };
}
