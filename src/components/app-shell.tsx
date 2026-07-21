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
  FaEllipsisVertical,
  FaRotateLeft,
  FaRotateRight,
} from "react-icons/fa6";
import { useI18n } from "@/lib/i18n/i18n-context";
import {
  selectCreatures,
  selectDuplicants,
  selectGeysers,
} from "@/lib/oni/save-selectors";
import { useSaveSession } from "@/lib/save-session/save-session-context";
import M3Breadcrumbs from "@/components/ui/m3-breadcrumbs";
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
        label: "Back to Duplicant Management",
        buttonLabel: "Back",
      }
    : normalizedPathname.startsWith("/creatures-editor")
      ? {
          href: "/creatures",
          label: "Back to Creatures",
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
    lastLoadAttemptStrictness,
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
  } = useSaveSession();
  const previousStatusRef = useRef<string>(status);
  const mainRef = useRef<HTMLElement | null>(null);
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

  // Two-step confirm: discarding clears the undo history, so it is not
  // recoverable. First click arms, second commits, blur cancels.
  const onDiscardClick = () => {
    if (!canDiscard || isBusy) {
      return;
    }
    if (discardArmed) {
      discardChanges();
      setDiscardArmed(false);
      announce("Unsaved changes discarded.");
    } else {
      setDiscardArmed(true);
    }
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
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
        announce("Change undone.");
      } else if ((key === "z" && event.shiftKey) || key === "y") {
        event.preventDefault();
        redo();
        announce("Change redone.");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [announce, hasSave, isBusy, redo, undo]);

  // Move focus to the content region on navigation so keyboard and screen-reader
  // users land on the new page instead of falling back to <body>. Skipped on the
  // first render to avoid stealing focus on initial load.
  useEffect(() => {
    if (!hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      return;
    }
    mainRef.current?.focus();
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

  // Single session-status indicator merging the operation lifecycle
  // (loading/saving/error) with the save-file dirty state. While busy or
  // errored, that takes precedence; otherwise it reports the save-file state.
  const sessionStatus = useMemo(() => {
    if (status === "loading") {
      return {
        label: t("save-file.conditions.loading", { fallback: "Loading" }),
        chipClass: "border-[var(--outline-strong)] bg-[var(--state-hover)]",
        valueClass: "",
        dotClass: "bg-[var(--accent)]",
      };
    }
    if (status === "saving") {
      return {
        label: t("save-file.conditions.saving", { fallback: "Saving" }),
        chipClass: "border-[var(--outline-strong)] bg-[var(--state-hover)]",
        valueClass: "",
        dotClass: "bg-[var(--accent)]",
      };
    }
    if (status === "error") {
      return {
        label: t("app.status.error", { fallback: "Error" }),
        chipClass: "border-[var(--error-outline)] bg-[var(--error-surface)]",
        valueClass: "font-bold text-[var(--error)]",
        dotClass: "bg-[var(--error)]",
      };
    }
    if (!hasSave) {
      return {
        label: t("app.save-file.not-loaded", { fallback: "Not Loaded" }),
        chipClass:
          "border-[var(--outline-faint)] bg-[var(--surface-container-high)]",
        valueClass: "",
        dotClass: "bg-[var(--muted)]",
      };
    }
    if (isModified) {
      return {
        label: t("save-file.conditions.modified", { fallback: "Modified" }),
        chipClass: "border-[var(--outline-strong)] bg-[var(--state-hover)]",
        valueClass: "font-bold text-[var(--accent)]",
        dotClass: "bg-[var(--accent)]",
      };
    }
    if (showSavedState) {
      return {
        label: t("app.save-file.saved", { fallback: "Saved" }),
        chipClass:
          "border-[var(--success-outline)] bg-[var(--success-surface)]",
        valueClass: "font-bold text-[var(--success)]",
        dotClass: "bg-[var(--success)]",
      };
    }
    return {
      label: t("app.save-file.clean", { fallback: "Loaded" }),
      chipClass: "border-[var(--success-outline)] bg-[var(--success-surface)]",
      valueClass: "text-[var(--success)]",
      dotClass: "bg-[var(--success)]",
    };
  }, [hasSave, isModified, showSavedState, status, t]);
  const loadButtonClassName = hasSave
    ? "m3-button m3-button-hollow px-3 py-2 text-sm"
    : "m3-button m3-button-tonal px-3 py-2 text-sm";

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
        open={mobileActionsOpen}
        onClose={() => setMobileActionsOpen(false)}
        labelledBy="mobile-actions-title"
        className="w-full max-w-sm p-5"
      >
        <h2 id="mobile-actions-title" className="text-xl font-semibold">
          Page actions
        </h2>
        <div className="mt-4 grid gap-2">
          {hasSave ? (
            <>
              <M3OutlinedButton
                onClick={() => {
                  undo();
                  announce("Change undone.");
                }}
                disabled={!canUndo || isBusy}
                className="w-full px-4 py-2.5 text-sm"
              >
                Undo
              </M3OutlinedButton>
              <M3OutlinedButton
                onClick={() => {
                  redo();
                  announce("Change redone.");
                }}
                disabled={!canRedo || isBusy}
                className="w-full px-4 py-2.5 text-sm"
              >
                Redo
              </M3OutlinedButton>
              <button
                type="button"
                onClick={() => {
                  const wasArmed = discardArmed;
                  onDiscardClick();
                  if (wasArmed) {
                    setMobileActionsOpen(false);
                  }
                }}
                onBlur={() => setDiscardArmed(false)}
                disabled={!canDiscard || isBusy}
                className={`m3-button w-full px-4 py-2.5 text-sm ${
                  discardArmed
                    ? "m3-button-outlined text-[var(--error)]"
                    : "m3-button-hollow"
                }`}
              >
                {discardArmed
                  ? t("app.discard.confirm", {
                      fallback: "Confirm discard?",
                    })
                  : t("app.discard.label", { fallback: "Discard changes" })}
              </button>
              <M3OutlinedButton
                onClick={() => {
                  setMobileActionsOpen(false);
                  void onLoadButtonClick();
                }}
                disabled={isBusy}
                className="w-full px-4 py-2.5 text-sm"
              >
                Load another save
              </M3OutlinedButton>
            </>
          ) : null}
          <M3OutlinedButton
            href="/settings"
            onClick={() => setMobileActionsOpen(false)}
            className="w-full px-4 py-2.5 text-center text-sm"
          >
            {t("app.page-title.settings", { fallback: "Settings" })}
          </M3OutlinedButton>
        </div>
      </M3Dialog>
      <div
        inert={isBusy ? true : undefined}
        className="mx-auto flex h-full w-full max-w-[1720px] flex-col p-2.5 sm:p-3"
      >
        <div role="status" aria-live="polite" className="sr-only">
          {liveMessage}
        </div>
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
                  }
                : undefined
            }
            pathname={pathname}
            hasSave={hasSave}
            bottomSlot={
              <div className="mt-auto border-t border-[var(--outline-faint)] pt-4">
                <div
                  className={`w-full rounded-xl border px-3 py-2.5 ${sessionStatus.chipClass}`}
                  role="status"
                  aria-live="polite"
                >
                  <p className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] opacity-60">
                    {t("app.status-label", { fallback: "Save status" })}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-sm">
                    <span
                      aria-hidden="true"
                      className={`h-2 w-2 shrink-0 rounded-full ${sessionStatus.dotClass}`}
                    />
                    <span className={sessionStatus.valueClass}>
                      {sessionStatus.label}
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 px-1 text-xs opacity-65">
                  <span>Editor version</span>
                  <span className="font-medium tracking-wide tabular-nums">
                    {UI_VERSION_LABEL}
                  </span>
                </div>
              </div>
            }
            t={t}
          />

          <div className="m3-surface flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <header className="border-b border-[var(--outline)] bg-[var(--surface)] px-4 py-2.5 sm:px-5">
              <div className="hidden sm:block">
                <M3Breadcrumbs normalizedPathname={normalizedPathname} t={t} />
              </div>
              <div className="flex items-center gap-2 sm:mt-2.5">
                <div className="mr-auto flex min-w-0 items-center gap-2">
                  <M3HollowButton
                    onClick={() => setMobileNavOpen(true)}
                    aria-label={t("app.nav.open", {
                      fallback: "Open navigation",
                    })}
                    aria-expanded={mobileNavOpen}
                    aria-controls="app-mobile-nav"
                    className="px-2.5 py-2 text-sm md:hidden"
                  >
                    <FaBars aria-hidden="true" className="h-3.5 w-3.5" />
                  </M3HollowButton>
                  {editorBackLink ? (
                    <M3HollowButton
                      href={editorBackLink.href}
                      aria-label={editorBackLink.label}
                      title={editorBackLink.label}
                      className="px-3 py-2 text-sm"
                    >
                      {editorBackLink.buttonLabel}
                    </M3HollowButton>
                  ) : null}
                  <h1 className="truncate text-lg font-semibold">
                    {pageTitle}
                  </h1>
                </div>
                <div className="flex shrink-0 items-center gap-2 md:hidden">
                  {hasSave ? (
                    <M3TonalButton
                      onClick={onSaveButtonClick}
                      disabled={isBusy}
                      className="px-3 py-2 text-sm"
                    >
                      {t("save-file.verbs.save_titlecase", {
                        fallback: "Save",
                      })}
                    </M3TonalButton>
                  ) : (
                    <button
                      type="button"
                      onClick={onLoadButtonClick}
                      disabled={isBusy}
                      className="m3-button m3-button-tonal px-3 py-2 text-sm"
                    >
                      {t("save-file.verbs.load_titlecase", {
                        fallback: "Load",
                      })}
                    </button>
                  )}
                  <M3HollowButton
                    onClick={() => setMobileActionsOpen(true)}
                    aria-label="Open page actions"
                    aria-expanded={mobileActionsOpen}
                    className="px-2.5 py-2 text-sm"
                  >
                    <FaEllipsisVertical
                      aria-hidden="true"
                      className="h-3.5 w-3.5"
                    />
                  </M3HollowButton>
                </div>
                <div className="hidden flex-wrap items-center gap-2 md:flex">
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
                        className="px-2.5 py-2 text-sm"
                      >
                        <FaRotateLeft
                          aria-hidden="true"
                          className="h-3.5 w-3.5"
                        />
                      </M3HollowButton>
                      <M3HollowButton
                        onClick={() => {
                          redo();
                          announce("Change redone.");
                        }}
                        disabled={!canRedo || isBusy}
                        aria-label="Redo"
                        title="Redo (Ctrl+Shift+Z)"
                        className="px-2.5 py-2 text-sm"
                      >
                        <FaRotateRight
                          aria-hidden="true"
                          className="h-3.5 w-3.5"
                        />
                      </M3HollowButton>
                      <button
                        type="button"
                        onClick={onDiscardClick}
                        onBlur={() => setDiscardArmed(false)}
                        disabled={!canDiscard || isBusy}
                        title="Discard all unsaved changes"
                        className={`m3-button px-3 py-2 text-sm ${
                          discardArmed
                            ? "m3-button-outlined text-[var(--error)]"
                            : "m3-button-hollow"
                        }`}
                      >
                        {discardArmed
                          ? t("app.discard.confirm", {
                              fallback: "Confirm discard?",
                            })
                          : t("app.discard.label", { fallback: "Discard" })}
                      </button>
                    </>
                  ) : null}
                  <M3HollowButton
                    href="/settings"
                    className="px-3 py-2 text-sm"
                  >
                    {t("app.page-title.settings", { fallback: "Settings" })}
                  </M3HollowButton>
                  <button
                    type="button"
                    onClick={onLoadButtonClick}
                    disabled={isBusy}
                    className={loadButtonClassName}
                  >
                    {t("save-file.verbs.load_titlecase", {
                      fallback: "Load",
                    })}
                  </button>
                  {hasSave ? (
                    <M3TonalButton
                      onClick={onSaveButtonClick}
                      disabled={isBusy}
                      className="px-3 py-2 text-sm"
                    >
                      {t("save-file.verbs.save_titlecase", {
                        fallback: "Save",
                      })}
                    </M3TonalButton>
                  ) : null}
                </div>
              </div>
              {error?.message ? (
                <div
                  role="alert"
                  className="mt-3 rounded-lg border border-[var(--error-outline)] bg-[var(--error-surface)] p-3 text-sm"
                >
                  <p className="font-semibold text-[var(--error)]">
                    {errorGuidance.title}
                  </p>
                  <p className="mt-1 text-xs text-[var(--error)]/90">
                    {errorGuidance.detail}
                  </p>
                  <p className="mt-1 text-xs text-[var(--error)]/90">
                    {error.message}
                    {error.code ? (
                      <>
                        {" "}
                        (<code>{error.code}</code>)
                      </>
                    ) : null}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {pendingFile ? (
                      <M3OutlinedButton
                        onClick={retryLoadPendingFile}
                        disabled={isBusy}
                        className="border-[var(--error-outline)] px-2 py-1 text-xs text-[var(--error)]"
                      >
                        Retry ({lastLoadAttemptStrictness})
                      </M3OutlinedButton>
                    ) : null}
                    {canForceLoad ? (
                      <M3OutlinedButton
                        onClick={forceLoadPendingFile}
                        disabled={isBusy}
                        className="border-[var(--error-outline)] px-2 py-1 text-xs text-[var(--error)]"
                      >
                        {t("app.error.force-load-major", {
                          fallback: "Force Load (major)",
                        })}
                      </M3OutlinedButton>
                    ) : null}
                    <M3OutlinedButton
                      onClick={clearError}
                      className="border-[var(--error-outline)] px-2 py-1 text-xs text-[var(--error)]"
                    >
                      {t("app.error.dismiss", { fallback: "Dismiss" })}
                    </M3OutlinedButton>
                  </div>
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
              key={normalizedPathname}
              ref={mainRef}
              tabIndex={-1}
              className="m3-page-enter m3-scrollbar m3-vertical-scroll relative flex-1 bg-[var(--surface-container)] focus:outline-none"
              onDragEnter={onMainDragEnter}
              onDragOver={onMainDragOver}
              onDragLeave={onMainDragLeave}
              onDrop={onMainDrop}
            >
              {isFileDragging ? (
                <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-[var(--scrim-medium)] p-4">
                  <div className="m3-surface-raised border-2 border-dashed border-[var(--accent)] px-6 py-5 text-center">
                    <p className="text-lg font-semibold">
                      {t("app.drop.title", {
                        fallback: "Drop your save to load it",
                      })}
                    </p>
                    <p className="mt-1 text-sm opacity-75">
                      {t("app.drop.hint", {
                        fallback: "Release a .sav file anywhere here",
                      })}
                    </p>
                  </div>
                </div>
              ) : null}
              <div className="min-h-full px-4 py-4 sm:px-5 sm:py-5">
                {children}
              </div>
            </main>
          </div>
        </div>
        <footer className="mt-2 px-4 py-2 text-center text-xs text-[var(--muted)] sm:px-6">
          Crafted by{" "}
          <a
            href="https://github.com/hawshemi"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-[var(--outline)] transition-colors hover:text-[var(--accent)] hover:decoration-[var(--accent)]"
          >
            hawshemi
          </a>
        </footer>
      </div>
    </div>
  );
}
