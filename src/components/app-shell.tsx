"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";
import { useSyncOnChange } from "@/lib/use-sync-on-change";
import { useModalDialog } from "@/lib/use-modal-dialog";
import {
  FaBars,
  FaArrowLeft,
  FaEllipsisVertical,
  FaRotateLeft,
  FaRotateRight,
} from "react-icons/fa6";
import { useI18n } from "@/lib/i18n/i18n-context";
import {
  selectBuildings,
  selectCreatures,
  selectDuplicants,
  selectGeysers,
} from "@/lib/oni/save-selectors";
import { useSaveSession } from "@/lib/save-session/save-session-context";
import M3NavigationDrawer from "@/components/ui/m3-navigation-drawer";
import M3TonalButton from "@/components/ui/m3-tonal-button";
import M3HollowButton from "@/components/ui/m3-hollow-button";
import M3OutlinedButton from "@/components/ui/m3-outlined-button";
import M3Dialog from "@/components/ui/m3-dialog";

import {
  BackupPromptDialog,
  ImportWarningDialog,
  LoadingDialog,
  NAV_ITEMS,
  SAVED_STATUS_DURATION_MS,
  UI_VERSION_LABEL,
  getErrorGuidance,
  getPageTitle,
  normalizePathname,
  routeRequiresSave,
} from "./app-shell-support";

export default function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const normalizedPathname = useMemo(
    () => normalizePathname(pathname),
    [pathname],
  );
  const editorBackLink = normalizedPathname.startsWith("/duplicants-editor")
    ? {
        href: "/duplicants",
        label: "Back to duplicants",
        buttonLabel: "Back",
      }
    : normalizedPathname.startsWith("/creatures-editor")
      ? {
          href: "/creatures",
          label: "Back to creatures",
          buttonLabel: "Back",
        }
      : null;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);
  const [showSavedState, setShowSavedState] = useState(false);
  const [discardArmed, setDiscardArmed] = useState(false);
  const [isFileDragging, setIsFileDragging] = useState(false);
  // Nested children fire their own dragenter/dragleave; count depth so the
  // overlay only clears when the pointer truly leaves the drop region.
  const dropDepthRef = useRef(0);
  const savedStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const {
    status,
    progressMessage,
    error,
    hasSave,
    saveGame,
    isBusy,
    isModified,
    fileHandle,
    canUndo,
    canRedo,
    canDiscard,
    undo,
    redo,
    discardChanges,
    canForceLoad,
    pendingFile,
    parseStrictness,
    loadSaveFile,
    loadSaveWithPicker,
    retryLoadPendingFile,
    forceLoadPendingFile,
    saveCurrentFile,
    clearError,
    importWarning,
    confirmImportWarning,
    fileName,
    lastSaveOutcome,
  } = useSaveSession();
  const previousStatusRef = useRef<string>(status);
  const mainRef = useRef<HTMLElement | null>(null);
  const errorRef = useRef<HTMLDivElement | null>(null);
  const hasNavigatedRef = useRef(false);
  // Polite announcements for actions that change page content without moving
  // focus (undo/redo/discard), for screen-reader users.
  const [liveMessage, setLiveMessage] = useState("");
  const liveNonceRef = useRef(0);
  const announce = useCallback((text: string) => {
    liveNonceRef.current += 1;
    // Toggle a trailing NBSP (not spoken) so repeating the same action still
    // changes the text node and re-announces.
    setLiveMessage(text + (liveNonceRef.current % 2 ? " " : ""));
  }, []);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeDrawer = () => {
      if (desktop.matches) setMobileNavOpen(false);
    };
    desktop.addEventListener("change", closeDrawer);
    return () => desktop.removeEventListener("change", closeDrawer);
  }, []);
  useEffect(() => {
    if (error && !isBusy) errorRef.current?.focus();
  }, [error, isBusy]);
  // The drawer element doubles as the mobile off-canvas panel; the trap only
  // activates while it's open, which on >=md never happens (the toggle is
  // md:hidden), so the desktop sidebar keeps its normal behavior.
  const mobileNavRef = useModalDialog<HTMLElement>(mobileNavOpen, () =>
    setMobileNavOpen(false),
  );
  // Close the mobile drawer whenever the route changes (render-phase reset, no
  // extra commit).
  useSyncOnChange([pathname], () => {
    setMobileNavOpen(false);
    setMobileActionsOpen(false);
  });
  const pageTitle = useMemo(() => getPageTitle(pathname, t), [pathname, t]);
  // Sidebar badge counts require full-tree scans (creatures/geysers walk every
  // game object) but only change when entities are added/removed, which is rare.
  // Derive them from a deferred save so an edit's render isn't blocked by the
  // scans; the badges catch up on a following low-priority render.
  const deferredSaveGame = useDeferredValue(saveGame);
  const duplicantsCount = useMemo(
    () => selectDuplicants(deferredSaveGame).length,
    [deferredSaveGame],
  );
  const creaturesCount = useMemo(
    () => selectCreatures(deferredSaveGame).length,
    [deferredSaveGame],
  );
  const geysersCount = useMemo(
    () => selectGeysers(deferredSaveGame).length,
    [deferredSaveGame],
  );
  const buildingsCount = useMemo(
    () => selectBuildings(deferredSaveGame).length,
    [deferredSaveGame],
  );

  const errorGuidance = useMemo(() => getErrorGuidance(error, t), [error, t]);

  // Loading replaces the session and resets undo history, so guard it when
  // there are unsaved edits. beforeunload only covers reload/close, not the
  // in-app load flow.
  const confirmDiscardIfModified = (): boolean => {
    if (!isModified) {
      return true;
    }
    return window.confirm(
      "You have unsaved changes that will be lost if you load another save. Continue?",
    );
  };

  const onLoadButtonClick = async () => {
    if (!confirmDiscardIfModified()) {
      return;
    }
    const usedEnhancedPicker = await loadSaveWithPicker({
      versionStrictness: parseStrictness,
    });
    if (!usedEnhancedPicker && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const onSaveButtonClick = () => {
    if (isBusy || !hasSave) {
      return;
    }
    if (fileHandle) {
      setShowBackupPrompt(true);
      return;
    }
    saveCurrentFile();
  };

  const onBackupConfirm = () => {
    setShowBackupPrompt(false);
    saveCurrentFile({ backup: true, inPlace: true });
  };

  const onBackupSkip = () => {
    setShowBackupPrompt(false);
    saveCurrentFile({ backup: false, inPlace: true });
  };

  const onBackupCancel = () => {
    setShowBackupPrompt(false);
  };

  const onDiscardClick = () => {
    if (!canDiscard || isBusy) {
      return;
    }
    setMobileActionsOpen(false);
    setDiscardArmed(true);
  };

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!confirmDiscardIfModified()) {
      event.target.value = "";
      return;
    }
    await loadSaveFile(file, { versionStrictness: parseStrictness });
    event.target.value = "";
  };

  // Drag a .sav onto the main area to load it. Only while no save is loaded,
  // so a stray drop can't silently overwrite in-progress edits.
  const canAcceptFileDrop = !hasSave && !isBusy;

  const dragHasFiles = (event: DragEvent<HTMLElement>) =>
    Array.from(event.dataTransfer?.types ?? []).includes("Files");

  const onMainDragEnter = (event: DragEvent<HTMLElement>) => {
    if (!canAcceptFileDrop || !dragHasFiles(event)) {
      return;
    }
    event.preventDefault();
    dropDepthRef.current += 1;
    setIsFileDragging(true);
  };

  const onMainDragOver = (event: DragEvent<HTMLElement>) => {
    if (!canAcceptFileDrop || !dragHasFiles(event)) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const onMainDragLeave = () => {
    if (!canAcceptFileDrop) {
      return;
    }
    dropDepthRef.current -= 1;
    if (dropDepthRef.current <= 0) {
      dropDepthRef.current = 0;
      setIsFileDragging(false);
    }
  };

  const onMainDrop = async (event: DragEvent<HTMLElement>) => {
    if (!canAcceptFileDrop) {
      return;
    }
    event.preventDefault();
    dropDepthRef.current = 0;
    setIsFileDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (!file || !file.name.toLowerCase().endsWith(".sav")) {
      return;
    }
    if (!confirmDiscardIfModified()) {
      return;
    }
    await loadSaveFile(file, { versionStrictness: parseStrictness });
  };

  // Reflect the current section in the browser tab. One-page site, so the base
  // name stands alone on the overview and gains the section name elsewhere.
  useEffect(() => {
    document.title =
      normalizedPathname === "/" ? "Onismith" : `Onismith - ${pageTitle}`;
  }, [normalizedPathname, pageTitle]);

  useEffect(() => {
    if (isBusy) {
      return;
    }
    if (!hasSave && routeRequiresSave(normalizedPathname)) {
      router.replace("/");
    }
  }, [hasSave, isBusy, normalizedPathname, router]);

  // Global undo/redo shortcuts. Skip when focus is in a text control so the
  // browser's native field-level undo still works there.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!hasSave || isBusy || !(event.ctrlKey || event.metaKey)) {
        return;
      }
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey && canUndo) {
        event.preventDefault();
        undo();
        announce("Change undone.");
      } else if (((key === "z" && event.shiftKey) || key === "y") && canRedo) {
        event.preventDefault();
        redo();
        announce("Change redone.");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [announce, canUndo, canRedo, hasSave, isBusy, redo, undo]);

  // Move focus to the content region on navigation so keyboard and screen-reader
  // users land on the new page instead of falling back to <body>. Skipped on the
  // first render to avoid stealing focus on initial load.
  useEffect(() => {
    if (!hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      return;
    }
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    if (previousStatus === "saving" && status === "ready" && hasSave) {
      setShowSavedState(true);
      if (savedStatusTimeoutRef.current) {
        clearTimeout(savedStatusTimeoutRef.current);
      }
      savedStatusTimeoutRef.current = setTimeout(() => {
        setShowSavedState(false);
        savedStatusTimeoutRef.current = null;
      }, SAVED_STATUS_DURATION_MS);
    }
    if (
      previousStatus === "loading" &&
      status === "ready" &&
      normalizedPathname !== "/"
    ) {
      router.replace("/");
    }
    previousStatusRef.current = status;
  }, [hasSave, normalizedPathname, router, status]);

  // Hide the "saved" badge as soon as edits resume. Done during render (not in
  // an effect) so it collapses into the same commit and satisfies
  // react-hooks/set-state-in-effect; the timer teardown stays in an effect.
  useSyncOnChange([isModified], () => {
    if (isModified) {
      setShowSavedState(false);
    } else {
      setDiscardArmed(false);
    }
  });

  useEffect(() => {
    if (isModified && savedStatusTimeoutRef.current) {
      clearTimeout(savedStatusTimeoutRef.current);
      savedStatusTimeoutRef.current = null;
    }
  }, [isModified]);

  useEffect(
    () => () => {
      if (savedStatusTimeoutRef.current) {
        clearTimeout(savedStatusTimeoutRef.current);
      }
    },
    [],
  );

  const sessionLabel = isModified
    ? "Unsaved changes"
    : lastSaveOutcome === "download-fallback"
      ? "Copy download started"
      : showSavedState && lastSaveOutcome === "original-updated"
        ? "Original file updated"
        : showSavedState && lastSaveOutcome === "download-started"
          ? "Download started"
          : "No unsaved changes";

  return (
    <div className="h-dvh overflow-hidden bg-background text-foreground">
      <LoadingDialog
        status={status}
        message={progressMessage}
        fileName={pendingFile?.name || fileName}
        t={t}
      />
      <ImportWarningDialog
        warning={importWarning}
        onCancel={() => confirmImportWarning(false)}
        onConfirm={() => confirmImportWarning(true)}
        t={t}
      />
      <BackupPromptDialog
        open={showBackupPrompt}
        onConfirm={onBackupConfirm}
        onSkip={onBackupSkip}
        onCancel={onBackupCancel}
        t={t}
      />
      <M3Dialog
        open={discardArmed}
        onClose={() => setDiscardArmed(false)}
        labelledBy="discard-title"
        describedBy="discard-description"
        role="alertdialog"
        className="w-full max-w-md p-5"
      >
        <h2 id="discard-title" className="text-xl font-semibold">
          Discard unsaved changes?
        </h2>
        <p
          id="discard-description"
          className="mt-2 text-sm text-[var(--muted)]"
        >
          All edits to {fileName || "this save"} since the last save will be
          removed. This also clears undo history.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <M3OutlinedButton
            onClick={() => setDiscardArmed(false)}
            className="px-4 py-2 text-sm"
          >
            Keep editing
          </M3OutlinedButton>
          <M3OutlinedButton
            onClick={() => {
              discardChanges();
              setDiscardArmed(false);
              announce("Unsaved changes discarded.");
            }}
            className="border-[var(--error-outline)] px-4 py-2 text-sm text-[var(--error)]"
          >
            Discard changes
          </M3OutlinedButton>
        </div>
      </M3Dialog>
      <M3Dialog
        open={mobileActionsOpen}
        onClose={() => setMobileActionsOpen(false)}
        labelledBy="file-actions-title"
        className="w-full max-w-sm p-5"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="file-actions-title" className="text-xl font-semibold">
            File actions
          </h2>
          <M3HollowButton
            onClick={() => setMobileActionsOpen(false)}
            className="px-3 py-2 text-sm"
          >
            Close
          </M3HollowButton>
        </div>
        <div className="mt-4 grid gap-2">
          {hasSave && fileHandle ? (
            <M3OutlinedButton
              onClick={() => {
                setMobileActionsOpen(false);
                void saveCurrentFile({ inPlace: false });
              }}
              disabled={isBusy}
              className="px-4 py-2.5 text-sm"
            >
              Download copy
            </M3OutlinedButton>
          ) : null}
          <M3OutlinedButton
            onClick={() => {
              setMobileActionsOpen(false);
              void onLoadButtonClick();
            }}
            disabled={isBusy}
            className="px-4 py-2.5 text-sm"
          >
            {hasSave ? "Load another save" : "Choose save file"}
          </M3OutlinedButton>
          {hasSave ? (
            <M3HollowButton
              onClick={onDiscardClick}
              disabled={!canDiscard || isBusy}
              className="px-4 py-2.5 text-sm text-[var(--error)]"
            >
              Discard changes
            </M3HollowButton>
          ) : null}
        </div>
      </M3Dialog>
      <div
        inert={isBusy ? true : undefined}
        className="mx-auto flex h-full w-full max-w-[1600px] flex-col sm:p-3"
      >
        <a
          href="#main-content"
          className="sr-only z-[60] rounded-md bg-[var(--accent)] p-3 text-[var(--on-accent)] focus:not-sr-only focus:absolute"
        >
          Skip to content
        </a>
        <div className="flex min-h-0 flex-1 gap-3">
          <M3NavigationDrawer
            appName="Onismith"
            id="app-mobile-nav"
            open={mobileNavOpen}
            onClose={() => setMobileNavOpen(false)}
            onNavigate={() => setMobileNavOpen(false)}
            drawerRef={mobileNavRef}
            navItems={NAV_ITEMS}
            itemBadges={
              hasSave
                ? {
                    "/duplicants": duplicantsCount,
                    "/creatures": creaturesCount,
                    "/geysers": geysersCount,
                    "/buildings": buildingsCount,
                  }
                : undefined
            }
            pathname={pathname}
            hasSave={hasSave}
            bottomSlot={
              <div className="mt-auto border-t border-[var(--outline-faint)] pt-3">
                <M3HollowButton
                  href="/settings"
                  onClick={() => setMobileNavOpen(false)}
                  aria-current={
                    normalizedPathname === "/settings" ? "page" : undefined
                  }
                  className="block w-full px-3 py-2.5 text-sm"
                >
                  Settings
                </M3HollowButton>
                <div className="mt-3 flex items-center justify-between px-3 text-xs text-[var(--muted)]">
                  <a
                    href="https://github.com/hawshemi"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-[var(--foreground)]"
                  >
                    By hawshemi
                  </a>
                  <span>{UI_VERSION_LABEL}</span>
                </div>
              </div>
            }
            t={t}
          />
          <div className="m3-surface flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-none border-0 sm:rounded-xl sm:border">
            <header className="shrink-0 border-b border-[var(--outline-faint)] bg-[var(--surface)] px-4 py-3 sm:px-6">
              <div className="flex items-center gap-1 sm:gap-2">
                <M3HollowButton
                  onClick={() => setMobileNavOpen(true)}
                  aria-label="Open navigation"
                  aria-expanded={mobileNavOpen}
                  aria-controls="app-mobile-nav"
                  className={
                    editorBackLink ? "hidden" : "px-2.5 py-2 md:hidden"
                  }
                >
                  <FaBars aria-hidden="true" className="h-4 w-4" />
                </M3HollowButton>
                {editorBackLink ? (
                  <M3HollowButton
                    href={editorBackLink.href}
                    aria-label={editorBackLink.label}
                    className="px-2 py-2 text-sm"
                  >
                    <FaArrowLeft
                      aria-hidden="true"
                      className="h-4 w-4 sm:hidden"
                    />
                    <span className="hidden sm:inline">Back</span>
                  </M3HollowButton>
                ) : null}
                <h1 className="mr-auto min-w-0 truncate text-lg font-semibold">
                  {pageTitle}
                </h1>
                {hasSave ? (
                  <>
                    <M3HollowButton
                      onClick={() => {
                        undo();
                        announce("Change undone.");
                      }}
                      disabled={!canUndo || isBusy}
                      aria-label="Undo"
                      title="Undo (Ctrl+Z)"
                      className="px-2.5 py-2"
                    >
                      <FaRotateLeft aria-hidden="true" className="h-4 w-4" />
                    </M3HollowButton>
                    <M3HollowButton
                      onClick={() => {
                        redo();
                        announce("Change redone.");
                      }}
                      disabled={!canRedo || isBusy}
                      aria-label="Redo"
                      title="Redo (Ctrl+Shift+Z)"
                      className="px-2.5 py-2"
                    >
                      <FaRotateRight aria-hidden="true" className="h-4 w-4" />
                    </M3HollowButton>
                    <M3HollowButton
                      onClick={() => setMobileActionsOpen(true)}
                      aria-label="Open file actions"
                      aria-expanded={mobileActionsOpen}
                      className="px-2.5 py-2"
                    >
                      <FaEllipsisVertical
                        aria-hidden="true"
                        className="h-4 w-4"
                      />
                    </M3HollowButton>
                  </>
                ) : null}
              </div>
              {hasSave ? (
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className="truncate text-sm"
                      title={fileName || undefined}
                    >
                      {fileName}
                    </p>
                    <p
                      role="status"
                      aria-live="polite"
                      className={
                        isModified
                          ? "text-xs text-[var(--accent)]"
                          : "text-xs text-[var(--muted)]"
                      }
                    >
                      {sessionLabel}
                    </p>
                  </div>
                  <M3TonalButton
                    onClick={onSaveButtonClick}
                    disabled={isBusy}
                    className="shrink-0 px-4 py-2 text-sm"
                  >
                    {fileHandle ? "Save changes" : "Download copy"}
                  </M3TonalButton>
                </div>
              ) : null}
              <input
                ref={fileInputRef}
                type="file"
                accept=".sav"
                className="hidden"
                onChange={onFileChange}
              />
            </header>
            <main
              id="main-content"
              key={normalizedPathname}
              ref={mainRef}
              tabIndex={-1}
              className="m3-page-enter m3-scrollbar m3-vertical-scroll relative flex-1 bg-[var(--surface)] focus:outline-none"
              onDragEnter={onMainDragEnter}
              onDragOver={onMainDragOver}
              onDragLeave={onMainDragLeave}
              onDrop={onMainDrop}
            >
              {isFileDragging ? (
                <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-[var(--scrim-medium)] p-4">
                  <div className="m3-surface-raised border-2 border-dashed border-[var(--accent)] px-6 py-5 text-center">
                    <p className="text-lg font-semibold">
                      Drop your save to load it
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Release a .sav file here
                    </p>
                  </div>
                </div>
              ) : null}
              <div className="min-h-full px-4 py-5 sm:px-6 sm:py-6">
                {error?.message ? (
                  <div
                    ref={errorRef}
                    tabIndex={-1}
                    role="alert"
                    className="mx-auto mb-5 max-w-[88rem] rounded-lg border border-[var(--error-outline)] bg-[var(--error-surface)] p-4 text-sm"
                  >
                    <p className="font-semibold">{errorGuidance.title}</p>
                    <p className="mt-1">{errorGuidance.detail}</p>
                    <details className="mt-2 text-xs text-[var(--muted)]">
                      <summary className="cursor-pointer py-1">
                        Technical details
                      </summary>
                      <p className="mt-1 break-words">
                        {error.message}
                        {error.code ? " (" + error.code + ")" : ""}
                      </p>
                    </details>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {pendingFile ? (
                        <M3OutlinedButton
                          onClick={() => {
                            if (confirmDiscardIfModified())
                              void retryLoadPendingFile();
                          }}
                          disabled={isBusy}
                          className="px-3 py-2 text-sm"
                        >
                          Try again
                        </M3OutlinedButton>
                      ) : null}
                      {canForceLoad ? (
                        <M3OutlinedButton
                          onClick={() => {
                            if (confirmDiscardIfModified())
                              void forceLoadPendingFile();
                          }}
                          disabled={isBusy}
                          className="px-3 py-2 text-sm"
                        >
                          Use recommended check
                        </M3OutlinedButton>
                      ) : null}
                      <M3HollowButton
                        onClick={clearError}
                        className="px-3 py-2 text-sm"
                      >
                        Dismiss
                      </M3HollowButton>
                    </div>
                  </div>
                ) : null}
                {children}
              </div>
            </main>
            {liveMessage ? (
              <div
                role="status"
                aria-live="polite"
                className="border-t border-[var(--outline-faint)] px-4 py-2 text-xs text-[var(--muted)] sm:px-6"
              >
                {liveMessage}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
