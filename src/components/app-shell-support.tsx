import type { I18nContextValue } from "@/lib/i18n/i18n-context";
import type { SaveSessionValue } from "@/lib/save-session/save-session-context";
import {
  FaCode,
  FaCubes,
  FaEarthAmericas,
  FaHouse,
  FaPaw,
  FaUsers,
  FaWater,
} from "react-icons/fa6";
import M3Dialog from "@/components/ui/m3-dialog";
import M3ExpressiveLoadingIndicator from "@/components/ui/m3-expressive-loading-indicator";
import M3OutlinedButton from "@/components/ui/m3-outlined-button";
import M3TonalButton from "@/components/ui/m3-tonal-button";

type Translate = I18nContextValue["t"];

type ProgressMessage =
  | string
  | {
      message?: string;
      stage?: string;
      phase?: string;
      status?: string;
    }
  | null
  | undefined;

type SessionError = SaveSessionValue["error"];
type ImportWarning = SaveSessionValue["importWarning"];

export const NAV_ITEMS = [
  {
    href: "/",
    i18nKey: "overview-page.title",
    fallback: "Overview",
    saveRequired: false,
    icon: FaHouse,
  },
  {
    href: "/duplicants",
    i18nKey: "duplicant.noun_titlecase_plural",
    fallback: "Duplicants",
    saveRequired: true,
    icon: FaUsers,
  },
  {
    href: "/creatures",
    i18nKey: "creature.noun_titlecase_plural",
    fallback: "Creatures",
    saveRequired: true,
    icon: FaPaw,
  },
  {
    href: "/geysers",
    i18nKey: "geyser.noun_titlecase_plural",
    fallback: "Geysers",
    saveRequired: true,
    icon: FaWater,
  },
  {
    href: "/planets",
    i18nKey: "planet.noun_titlecase_plural",
    fallback: "Planets",
    saveRequired: true,
    icon: FaEarthAmericas,
  },
  {
    href: "/materials",
    i18nKey: "material.noun_titlecase_plural",
    fallback: "Materials",
    saveRequired: true,
    icon: FaCubes,
  },
  {
    href: "/raw",
    i18nKey: "raw-editor-page.title",
    fallback: "Raw Editor",
    saveRequired: true,
    icon: FaCode,
  },
];

const SAVE_REQUIRED_PATH_PREFIXES = [
  "/duplicants",
  "/duplicants-editor",
  "/creatures",
  "/creatures-editor",
  "/geysers",
  "/raw",
  "/planets",
  "/materials",
];
export const UI_VERSION_LABEL = "v1.0.0";
export const SAVED_STATUS_DURATION_MS = 3000;

export function normalizePathname(pathname: string | null | undefined): string {
  if (!pathname || pathname === "/") {
    return "/";
  }
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

export function getPageTitle(
  pathname: string | null | undefined,
  t: Translate,
): string {
  const normalizedPathname = normalizePathname(pathname);

  if (normalizedPathname === "/") {
    return t("overview-page.title", { fallback: "Overview" });
  }
  if (normalizedPathname.startsWith("/duplicants-editor")) {
    return t("app.page-title.duplicant-editor", {
      fallback: "Duplicant Editor",
    });
  }
  if (normalizedPathname.startsWith("/duplicants")) {
    return t("app.page-title.duplicants", { fallback: "Duplicants" });
  }
  if (normalizedPathname.startsWith("/creatures-editor")) {
    return t("app.page-title.creature-editor", {
      fallback: "Creature Editor",
    });
  }
  if (normalizedPathname.startsWith("/creatures")) {
    return t("app.page-title.creatures", { fallback: "Creatures" });
  }
  if (normalizedPathname.startsWith("/geysers")) {
    return t("app.page-title.geysers", { fallback: "Geysers" });
  }
  if (normalizedPathname.startsWith("/planets")) {
    return t("app.page-title.planets", { fallback: "Planets" });
  }
  if (normalizedPathname.startsWith("/materials")) {
    return t("app.page-title.materials", { fallback: "Materials" });
  }
  if (normalizedPathname.startsWith("/raw")) {
    return t("raw-editor-page.title", { fallback: "Raw Editor" });
  }
  if (normalizedPathname.startsWith("/settings")) {
    return t("app.page-title.settings", { fallback: "Settings" });
  }
  return t("overview-page.title", { fallback: "Overview" });
}

export function routeRequiresSave(pathname: string): boolean {
  return SAVE_REQUIRED_PATH_PREFIXES.some((prefix) => {
    if (pathname === prefix) {
      return true;
    }
    return pathname.startsWith(`${prefix}/`);
  });
}

export function getErrorGuidance(
  error: SessionError,
  t: Translate,
): { title: string; detail: string } {
  const code = error?.code;
  if (code === "E_VERSION_MINOR") {
    return {
      title: t("app.error.minor-version.title", {
        fallback: "Minor version mismatch",
      }),
      detail: t("app.error.minor-version.detail", {
        fallback:
          "The save minor version is newer than expected. You can retry with the same strictness or force-load with major strictness.",
      }),
    };
  }
  if (code === "E_VERSION_MAJOR") {
    return {
      title: t("app.error.major-version.title", {
        fallback: "Major version mismatch",
      }),
      detail: t("app.error.major-version.detail", {
        fallback:
          "The parser does not support this major save format yet. Usually this needs parser updates before loading safely.",
      }),
    };
  }
  return {
    title: t("app.error.generic.title", { fallback: "Operation failed" }),
    detail: t("app.error.generic.detail", {
      fallback: "See error details below. You can retry or dismiss this error.",
    }),
  };
}

function resolveProgressText(
  status: string,
  message: ProgressMessage,
  t: Translate,
): string {
  const fallbackMessage =
    status === "loading"
      ? t("app.progress.reading", { fallback: "Reading save data" })
      : t("app.progress.writing", { fallback: "Writing save data" });

  if (typeof message === "string") {
    const text = message.trim();
    return text || fallbackMessage;
  }

  if (message && typeof message === "object") {
    const text =
      message.message ||
      message.stage ||
      message.phase ||
      message.status ||
      fallbackMessage;

    return String(text).trim() || fallbackMessage;
  }

  return fallbackMessage;
}

type LoadingDialogProps = {
  status: string;
  message: ProgressMessage;
  fileName?: string | null;
  t: Translate;
};

export function LoadingDialog({
  status,
  message,
  fileName,
  t,
}: LoadingDialogProps) {
  if (status !== "loading" && status !== "saving") {
    return null;
  }

  const title =
    status === "loading"
      ? t("save-file.conditions.loading", { fallback: "Loading" })
      : t("save-file.conditions.saving", { fallback: "Saving" });
  const progressText = resolveProgressText(status, message, t);

  return (
    <M3Dialog
      open
      onClose={() => {}}
      labelledBy="loading-dialog-title"
      describedBy="loading-dialog-progress"
      className="w-full max-w-md p-5"
    >
      <div role="status" aria-live="polite" aria-atomic="true">
        <h2 id="loading-dialog-title" className="text-xl font-semibold">
          {title}
        </h2>
        {fileName ? (
          <p className="mt-1 text-xs opacity-70">
            {t("app.file-label", { fallback: "File" })}: <code>{fileName}</code>
          </p>
        ) : null}
        <div className="mt-4 flex items-center gap-3">
          <M3ExpressiveLoadingIndicator size={64} aria-hidden="true" />
          <p
            id="loading-dialog-progress"
            className="min-w-0 truncate text-sm opacity-85"
          >
            {progressText}
          </p>
        </div>
      </div>
    </M3Dialog>
  );
}

type ImportWarningDialogProps = {
  warning: ImportWarning;
  onConfirm: () => void;
  onCancel: () => void;
  t: Translate;
};

export function ImportWarningDialog({
  warning,
  onConfirm,
  onCancel,
  t,
}: ImportWarningDialogProps) {
  return (
    <M3Dialog
      open={Boolean(warning)}
      onClose={onCancel}
      role="alertdialog"
      labelledBy="import-warning-title"
      describedBy="import-warning-desc"
      className="w-full max-w-lg p-5"
    >
      {warning ? (
        <>
          <h3 id="import-warning-title" className="text-xl font-semibold">
            {t("app.import-warning.title", { fallback: "Checksum Warning" })}
          </h3>
          <p id="import-warning-desc" className="mt-2 text-sm opacity-85">
            {t("app.import-warning.detail", {
              fallback:
                "Import file checksum does not match the payload. Data may have been modified.",
            })}
          </p>
          <p className="mt-2 text-xs opacity-75">
            {t("app.file-label", { fallback: "File" })}:{" "}
            <code>{warning.fileName || "import.json"}</code>
          </p>
          <p className="mt-1 text-xs opacity-75">
            {t("app.expected", { fallback: "Expected" })}:{" "}
            <code>{warning.expectedHash || "N/A"}</code>
          </p>
          <p className="mt-1 text-xs opacity-75">
            {t("app.actual", { fallback: "Actual" })}:{" "}
            <code>{warning.actualHash || "N/A"}</code>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <M3OutlinedButton onClick={onCancel} className="px-3 py-2 text-sm">
              {t("dialog.verbs.cancel_titlecase", { fallback: "Cancel" })}
            </M3OutlinedButton>
            <M3TonalButton onClick={onConfirm} className="px-3 py-2 text-sm">
              {t("app.import-warning.import-anyway", {
                fallback: "Import Anyway",
              })}
            </M3TonalButton>
          </div>
        </>
      ) : null}
    </M3Dialog>
  );
}

type BackupPromptDialogProps = {
  open: boolean;
  onConfirm: () => void;
  onSkip: () => void;
  onCancel: () => void;
  t: Translate;
};

export function BackupPromptDialog({
  open,
  onConfirm,
  onSkip,
  onCancel,
  t,
}: BackupPromptDialogProps) {
  return (
    <M3Dialog
      open={open}
      onClose={onCancel}
      role="alertdialog"
      labelledBy="backup-prompt-title"
      describedBy="backup-prompt-desc"
      className="w-full max-w-lg p-5"
    >
      <h3 id="backup-prompt-title" className="text-xl font-semibold">
        {t("app.backup.title", { fallback: "Download Backup Save File?" })}
      </h3>
      <p id="backup-prompt-desc" className="mt-2 text-sm opacity-85">
        {t("app.backup.detail", {
          fallback:
            "You're about to overwrite the current save file. Do you want to download a backup first?",
        })}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <M3OutlinedButton onClick={onCancel} className="px-3 py-2 text-sm">
          {t("dialog.verbs.cancel_titlecase", { fallback: "Cancel" })}
        </M3OutlinedButton>
        <M3OutlinedButton onClick={onSkip} className="px-3 py-2 text-sm">
          {t("app.backup.skip", { fallback: "Skip Backup" })}
        </M3OutlinedButton>
        <M3TonalButton onClick={onConfirm} className="px-3 py-2 text-sm">
          {t("app.backup.confirm", { fallback: "Download Backup & Save" })}
        </M3TonalButton>
      </div>
    </M3Dialog>
  );
}
