"use client";

import { useCallback, type Dispatch } from "react";
import type { SaveGame } from "@/lib/save-parser/model";
import { parseSaveInWorker, writeSaveInWorker } from "@/lib/oni/parser-client";
import {
  deriveBackupName,
  deriveOutputName,
  downloadArrayBuffer,
  hasSavExtension,
  writeToFileHandle,
} from "./save-file-utils";
import {
  DEFAULT_STRICTNESS,
  normalizeError,
  normalizeStrictness,
  withErrorCode,
  type LoadPickerOptions,
  type LoadSaveOptions,
  type SaveCurrentFileOptions,
  type SaveOutcome,
  type SaveSessionAction,
  type SaveSessionState,
  type SetSaveGameOptions,
  type ShowOpenFilePicker,
} from "./save-session-state";

export function useSaveFileActions(
  state: SaveSessionState,
  dispatch: Dispatch<SaveSessionAction>,
) {
  const loadSaveFile = useCallback(
    async (file: File | null | undefined, options: LoadSaveOptions = {}) => {
      if (!file) return;
      if (!hasSavExtension(file.name)) {
        dispatch({
          type: "LOAD_ERROR",
          error: withErrorCode(
            "Only .sav files are supported.",
            "E_FILE_EXTENSION",
          ),
        });
        return;
      }

      const strictness =
        options.versionStrictness ||
        state.preferredStrictness ||
        DEFAULT_STRICTNESS;
      dispatch({ type: "LOAD_BEGIN", file, strictness });
      try {
        const data = await file.arrayBuffer();
        const startedAt = performance.now();
        const saveGame = await parseSaveInWorker(data, {
          versionStrictness: strictness,
          reportProgress: true,
          onProgress: (message) => dispatch({ type: "LOAD_PROGRESS", message }),
        });
        dispatch({
          type: "LOAD_SUCCESS",
          saveGame,
          fileName: file.name,
          fileHandle: options.fileHandle || null,
          parseTimeMs: Math.round(performance.now() - startedAt),
        });
      } catch (error) {
        dispatch({ type: "LOAD_ERROR", error: normalizeError(error) });
      }
    },
    [dispatch, state.preferredStrictness],
  );

  const loadSaveWithPicker = useCallback(
    async (options: LoadPickerOptions = {}) => {
      if (typeof window === "undefined") {
        return false;
      }
      const picker = (
        window as unknown as { showOpenFilePicker?: ShowOpenFilePicker }
      ).showOpenFilePicker;
      if (typeof picker !== "function") {
        return false;
      }

      try {
        const [handle] = await picker({
          id: "oni-save-files",
          startIn: state.fileHandle || "documents",
          multiple: false,
          excludeAcceptAllOption: true,
          types: [
            {
              description: "Oxygen Not Included Save (*.sav)",
              accept: {
                "application/x-oxygen-not-included-save": [".sav"],
              },
            },
          ],
        });
        if (!handle) return false;
        await loadSaveFile(await handle.getFile(), {
          versionStrictness: options.versionStrictness,
          fileHandle: handle,
        });
        return true;
      } catch (error) {
        if ((error as { name?: string } | null)?.name === "AbortError") {
          return true;
        }
        dispatch({ type: "LOAD_ERROR", error: normalizeError(error) });
        return true;
      }
    },
    [dispatch, loadSaveFile, state.fileHandle],
  );

  const forceLoadPendingFile = useCallback(async () => {
    if (state.pendingFile) {
      await loadSaveFile(state.pendingFile, { versionStrictness: "major" });
    }
  }, [loadSaveFile, state.pendingFile]);

  const retryLoadPendingFile = useCallback(async () => {
    if (state.pendingFile) {
      await loadSaveFile(state.pendingFile, {
        versionStrictness: state.lastLoadAttemptStrictness || "major",
      });
    }
  }, [loadSaveFile, state.lastLoadAttemptStrictness, state.pendingFile]);

  const saveCurrentFile = useCallback(
    async (options: SaveCurrentFileOptions = {}) => {
      if (!state.saveGame) return;
      dispatch({ type: "SAVE_BEGIN" });
      try {
        const data = await writeSaveInWorker(state.saveGame, {
          reportProgress: true,
          onProgress: (message) => dispatch({ type: "SAVE_PROGRESS", message }),
        });
        const preferInPlaceSave = options.inPlace !== false;
        let inPlaceFallbackError: unknown = null;
        let outcome: SaveOutcome = "download-started";

        if (preferInPlaceSave && state.fileHandle) {
          try {
            if (
              options.backup !== false &&
              typeof state.fileHandle.getFile === "function"
            ) {
              const existingFile = await state.fileHandle.getFile();
              const existingData = await existingFile.arrayBuffer();
              if (existingData.byteLength > 0) {
                downloadArrayBuffer(
                  existingData,
                  deriveBackupName(existingFile.name || state.fileName),
                );
              }
            }
            await writeToFileHandle(state.fileHandle, data);
            outcome = "original-updated";
          } catch (writeError) {
            inPlaceFallbackError = writeError;
            outcome = "download-fallback";
            downloadArrayBuffer(
              data,
              deriveOutputName(
                options.fileName ?? state.fileName,
                state.saveGame,
              ),
            );
          }
        } else {
          downloadArrayBuffer(
            data,
            deriveOutputName(
              options.fileName ?? state.fileName,
              state.saveGame,
            ),
          );
        }

        dispatch({ type: "SAVE_SUCCESS", bytes: data.byteLength, outcome });
        if (inPlaceFallbackError) {
          console.error(
            "In-place save failed. A copy download was started instead.",
            inPlaceFallbackError,
          );
          dispatch({
            type: "SET_ERROR",
            error: withErrorCode(
              "Couldn't update the original file. A copy download was started instead. Check your browser downloads before leaving.",
              "E_SAVE_FALLBACK",
            ),
          });
        }
      } catch (error) {
        dispatch({ type: "SAVE_ERROR", error: normalizeError(error) });
      }
    },
    [dispatch, state.fileHandle, state.fileName, state.saveGame],
  );

  const setParseStrictness = useCallback(
    (strictness: string) => {
      dispatch({
        type: "SET_STRICTNESS",
        strictness: normalizeStrictness(strictness),
      });
    },
    [dispatch],
  );

  const setSaveGame = useCallback(
    (saveGame: SaveGame | null, options: SetSaveGameOptions = {}) => {
      dispatch({
        type: "SET_SAVE_GAME",
        saveGame,
        isModified: options.isModified,
      });
    },
    [dispatch],
  );

  return {
    forceLoadPendingFile,
    loadSaveFile,
    loadSaveWithPicker,
    retryLoadPendingFile,
    saveCurrentFile,
    setParseStrictness,
    setSaveGame,
  };
}
