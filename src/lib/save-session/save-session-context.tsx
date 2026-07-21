"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { SaveGame } from "@/lib/save-parser/model";
import {
  INITIAL_STATE,
  STRICTNESS_STORAGE_KEY,
  normalizeStrictness,
  saveSessionReducer,
  withErrorCode,
  type CopyPasteData,
  type ImportResult,
  type ImportWarningData,
  type LoadPickerOptions,
  type LoadSaveOptions,
  type SaveCurrentFileOptions,
  type SaveSessionState,
  type SetSaveGameOptions,
} from "./save-session-state";
import { useSaveFileActions } from "./use-save-file-actions";
import { useDuplicantActions } from "./use-duplicant-actions";
import { useWorldActions } from "./use-world-actions";

export interface SaveSessionValue extends SaveSessionState {
  hasSave: boolean;
  isBusy: boolean;
  canForceLoad: boolean;
  canUndo: boolean;
  canRedo: boolean;
  canDiscard: boolean;
  undo: () => void;
  redo: () => void;
  discardChanges: () => void;
  parseStrictness: string;
  setParseStrictness: (strictness: string) => void;
  loadSaveFile: (
    file: File | null | undefined,
    options?: LoadSaveOptions,
  ) => Promise<void>;
  loadSaveWithPicker: (options?: LoadPickerOptions) => Promise<boolean>;
  forceLoadPendingFile: () => Promise<void>;
  retryLoadPendingFile: () => Promise<void>;
  saveCurrentFile: (options?: SaveCurrentFileOptions) => Promise<void>;
  setSaveGame: (
    saveGame: SaveGame | null,
    options?: SetSaveGameOptions,
  ) => void;
  clearError: () => void;
  clearImportWarning: () => void;
  setSelectedDuplicantId: (id: number | null) => void;
  setSelectedCreatureId: (id: number | null) => void;
  updateDifficultySetting: (difficultyType: string, value: string) => void;
  updateColonyName: (name: string) => void;
  updateCycleCount: (cycles: number) => void;
  updateBuildingName: (gameObjectId: number, name: string) => void;
  updateBuildingPriority: (gameObjectId: number, priority: number) => void;
  updateDuplicantName: (duplicantId: number, name: string) => void;
  addDuplicantTrait: (duplicantId: number, traitId: string) => void;
  removeDuplicantTrait: (duplicantId: number, traitId: string) => void;
  addDuplicantInterest: (duplicantId: number, interestName: string) => void;
  removeDuplicantInterest: (duplicantId: number, interestName: string) => void;
  updateDuplicantAttributeLevel: (
    duplicantId: number,
    attributeId: string,
    nextLevel: number,
  ) => void;
  updateDuplicantAppearance: (
    duplicantId: number,
    type: string,
    ordinal: number,
  ) => void;
  updateDuplicantGender: (duplicantId: number, gender: string) => void;
  updateDuplicantHealthModifier: (
    duplicantId: number,
    modifier: string,
    value: number,
  ) => void;
  updateDuplicantBionicVital: (
    duplicantId: number,
    vitalId: string,
    value: number,
  ) => void;
  updateDuplicantBionicPowerBankCharge: (
    duplicantId: number,
    powerBankId: number,
    chargeKilojoules: number,
  ) => void;
  updateDuplicantExperience: (duplicantId: number, experience: number) => void;
  setDuplicantSkillMastery: (
    duplicantId: number,
    skillId: string,
    enabled: boolean,
  ) => void;
  setDuplicantSkillsMastery: (
    duplicantId: number,
    skillIds: readonly string[],
    enabled: boolean,
  ) => void;
  addDuplicantEffect: (
    duplicantId: number,
    effectId: string,
    cycles: number,
  ) => void;
  updateDuplicantEffectCycles: (
    duplicantId: number,
    effectId: string,
    cycles: number,
  ) => void;
  removeDuplicantEffect: (duplicantId: number, effectId: string) => void;
  copyDuplicantBehaviors: (
    duplicantId: number,
    behaviorNames: string[],
  ) => void;
  canPasteBehaviorsTo: (gameObjectId: number) => boolean;
  pasteDuplicantBehaviors: (
    duplicantId: number,
    behaviorNames?: string[] | null,
  ) => void;
  exportDuplicantBehaviors: (
    duplicantId: number,
    behaviorNames: string[],
  ) => Promise<void>;
  importDuplicantBehaviors: (
    duplicantId: number,
    file: File | null | undefined,
  ) => Promise<ImportResult>;
  confirmImportWarning: (shouldContinue: boolean) => void;
  cloneDuplicant: (duplicantId: number) => void;
  updateGeyserType: (gameObjectId: number, geyserType: string) => void;
  updateGeyserParameter: (
    gameObjectId: number,
    parameterName: string,
    value: number,
  ) => void;
  updateRawValue: (path: Array<string | number>, value: unknown) => void;
  modifyBehavior: (
    gameObjectId: number,
    behaviorName: string,
    target: string,
    value: unknown,
    merge?: boolean,
  ) => void;
  updatePlanet: (planetId: number, patch: Record<string, unknown>) => void;
  updateCreaturePosition: (
    gameObjectId: number,
    axis: "x" | "y" | "z",
    value: number,
  ) => void;
  deleteLooseMaterial: (materialType?: string | null) => Promise<void>;
}

const SaveSessionContext = createContext<SaveSessionValue | null>(null);

export function SaveSessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(saveSessionReducer, INITIAL_STATE);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STRICTNESS_STORAGE_KEY);
      if (stored) {
        dispatch({
          type: "SET_STRICTNESS",
          strictness: normalizeStrictness(stored),
        });
      }
    } catch {
      // Ignore storage read failures.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STRICTNESS_STORAGE_KEY,
        state.preferredStrictness,
      );
    } catch {
      // Ignore storage write failures.
    }
  }, [state.preferredStrictness]);

  // Warn before leaving with unsaved edits. Edits live only in memory, so a
  // reload/close/navigation would silently discard them. The listener is only
  // attached while modified, so clean sessions leave the page instantly.
  useEffect(() => {
    if (!state.isModified) {
      return;
    }
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Legacy browsers require returnValue to be set to trigger the prompt.
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [state.isModified]);

  const {
    forceLoadPendingFile,
    loadSaveFile,
    loadSaveWithPicker,
    retryLoadPendingFile,
    saveCurrentFile,
    setParseStrictness,
    setSaveGame,
  } = useSaveFileActions(state, dispatch);
  const undo = useCallback(() => {
    dispatch({ type: "UNDO" });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: "REDO" });
  }, []);

  const discardChanges = useCallback(() => {
    dispatch({ type: "DISCARD_CHANGES" });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: "CLEAR_ERROR" });
  }, []);

  const setError = useCallback(
    (message: string, code: string | null = null) => {
      dispatch({
        type: "SET_ERROR",
        error: withErrorCode(message, code),
      });
    },
    [],
  );

  const setCopyPasteData = useCallback((copyPasteData: CopyPasteData) => {
    dispatch({ type: "SET_COPY_PASTE_DATA", copyPasteData });
  }, []);

  const setImportWarning = useCallback((importWarning: ImportWarningData) => {
    dispatch({ type: "SET_IMPORT_WARNING", importWarning });
  }, []);

  const clearImportWarning = useCallback(() => {
    dispatch({ type: "CLEAR_IMPORT_WARNING" });
  }, []);

  const setSelectedDuplicantId = useCallback((id: number | null) => {
    dispatch({
      type: "SET_SELECTED_DUPLICANT",
      id: Number.isFinite(id) ? id : null,
    });
  }, []);

  const setSelectedCreatureId = useCallback((id: number | null) => {
    dispatch({
      type: "SET_SELECTED_CREATURE",
      id: Number.isFinite(id) ? id : null,
    });
  }, []);

  const {
    deleteLooseMaterial,
    modifyBehavior,
    updateBuildingName,
    updateBuildingPriority,
    updateColonyName,
    updateCreaturePosition,
    updateCycleCount,
    updateDifficultySetting,
    updateGeyserParameter,
    updateGeyserType,
    updatePlanet,
    updateRawValue,
  } = useWorldActions(state.saveGame, setSaveGame);

  const {
    addDuplicantEffect,
    addDuplicantInterest,
    addDuplicantTrait,
    canPasteBehaviorsTo,
    cloneDuplicant,
    confirmImportWarning,
    copyDuplicantBehaviors,
    exportDuplicantBehaviors,
    importDuplicantBehaviors,
    pasteDuplicantBehaviors,
    removeDuplicantEffect,
    removeDuplicantInterest,
    removeDuplicantTrait,
    setDuplicantSkillMastery,
    setDuplicantSkillsMastery,
    updateDuplicantAppearance,
    updateDuplicantAttributeLevel,
    updateDuplicantEffectCycles,
    updateDuplicantExperience,
    updateDuplicantGender,
    updateDuplicantHealthModifier,
    updateDuplicantBionicPowerBankCharge,
    updateDuplicantBionicVital,
    updateDuplicantName,
  } = useDuplicantActions({
    saveGame: state.saveGame,
    copyPasteData: state.copyPasteData,
    importWarning: state.importWarning,
    setSaveGame,
    setError,
    setCopyPasteData,
    setImportWarning,
    setSelectedDuplicantId,
    clearImportWarning,
  });
  const value = useMemo<SaveSessionValue>(() => {
    const hasSave = Boolean(state.saveGame);
    const isBusy = state.status === "loading" || state.status === "saving";
    const canForceLoad =
      Boolean(state.pendingFile) &&
      state.lastLoadAttemptStrictness === "minor" &&
      state.error?.code === "E_VERSION_MINOR";

    return {
      ...state,
      hasSave,
      isBusy,
      canForceLoad,
      canUndo: state.history.past.length > 0,
      canRedo: state.history.future.length > 0,
      canDiscard: state.isModified,
      undo,
      redo,
      discardChanges,
      parseStrictness: state.preferredStrictness,
      setParseStrictness,
      loadSaveFile,
      loadSaveWithPicker,
      forceLoadPendingFile,
      retryLoadPendingFile,
      saveCurrentFile,
      setSaveGame,
      clearError,
      clearImportWarning,
      setSelectedDuplicantId,
      setSelectedCreatureId,
      updateDifficultySetting,
      updateBuildingName,
      updateBuildingPriority,
      updateColonyName,
      updateCycleCount,
      updateDuplicantName,
      addDuplicantTrait,
      removeDuplicantTrait,
      addDuplicantInterest,
      removeDuplicantInterest,
      updateDuplicantAttributeLevel,
      updateDuplicantAppearance,
      updateDuplicantGender,
      updateDuplicantHealthModifier,
      updateDuplicantBionicPowerBankCharge,
      updateDuplicantBionicVital,
      updateDuplicantExperience,
      setDuplicantSkillMastery,
      setDuplicantSkillsMastery,
      addDuplicantEffect,
      updateDuplicantEffectCycles,
      removeDuplicantEffect,
      copyDuplicantBehaviors,
      canPasteBehaviorsTo,
      pasteDuplicantBehaviors,
      exportDuplicantBehaviors,
      importDuplicantBehaviors,
      confirmImportWarning,
      cloneDuplicant,
      updateGeyserType,
      updateGeyserParameter,
      updateRawValue,
      modifyBehavior,
      updatePlanet,
      updateCreaturePosition,
      deleteLooseMaterial,
    };
  }, [
    addDuplicantEffect,
    addDuplicantInterest,
    addDuplicantTrait,
    canPasteBehaviorsTo,
    clearImportWarning,
    cloneDuplicant,
    confirmImportWarning,
    copyDuplicantBehaviors,
    exportDuplicantBehaviors,
    removeDuplicantInterest,
    removeDuplicantEffect,
    removeDuplicantTrait,
    forceLoadPendingFile,
    importDuplicantBehaviors,
    retryLoadPendingFile,
    loadSaveFile,
    loadSaveWithPicker,
    pasteDuplicantBehaviors,
    saveCurrentFile,
    setParseStrictness,
    setDuplicantSkillMastery,
    setDuplicantSkillsMastery,
    setSaveGame,
    undo,
    redo,
    discardChanges,
    clearError,
    setSelectedDuplicantId,
    setSelectedCreatureId,
    state,
    updateDuplicantAttributeLevel,
    updateDuplicantAppearance,
    updateDuplicantGender,
    updateDuplicantEffectCycles,
    updateDuplicantExperience,
    updateDuplicantHealthModifier,
    updateDuplicantBionicPowerBankCharge,
    updateDuplicantBionicVital,
    updateBuildingName,
    updateBuildingPriority,
    updateDifficultySetting,
    updateColonyName,
    updateCycleCount,
    updateDuplicantName,
    updateGeyserParameter,
    updateGeyserType,
    updateRawValue,
    modifyBehavior,
    updatePlanet,
    updateCreaturePosition,
    deleteLooseMaterial,
  ]);

  return (
    <SaveSessionContext.Provider value={value}>
      {children}
    </SaveSessionContext.Provider>
  );
}

export function useSaveSession(): SaveSessionValue {
  const value = useContext(SaveSessionContext);
  if (!value) {
    throw new Error("useSaveSession must be used within SaveSessionProvider");
  }
  return value;
}
