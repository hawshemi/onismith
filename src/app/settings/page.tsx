"use client";

import { useMemo, useState } from "react";
import { useI18n, type LanguageOption } from "@/lib/i18n/i18n-context";
import { useSaveSession } from "@/lib/save-session/save-session-context";
import M3Select from "@/components/ui/m3-select";
import M3PageHeader from "@/components/ui/m3-page-header";
import M3OutlinedButton from "@/components/ui/m3-outlined-button";
import SettingsDevTools from "./settings-dev-tools";

export default function SettingsPage() {
  const { locale, setLocale, languages, supportedLocales, t } = useI18n();
  const { parseStrictness, setParseStrictness } = useSaveSession();
  const [developerToolsVisible, setDeveloperToolsVisible] = useState(false);
  const currentLanguageLabel = useMemo(
    () =>
      languages.find((entry: LanguageOption) => entry.code === locale)?.label ||
      locale,
    [languages, locale],
  );
  const isSingleLocale = supportedLocales.length <= 1;
  const orderedLanguages = useMemo(
    () =>
      [...languages].sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
      ),
    [languages],
  );
  return (
    <div className="m3-page m3-page-flow max-w-3xl">
      <M3PageHeader
        title={null}
        description="Editor preferences and compatibility options."
      />
      <section className="m3-card p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Language</h2>
        {isSingleLocale ? (
          <p className="mt-2 text-sm text-[var(--muted)]">
            {currentLanguageLabel}
          </p>
        ) : (
          <>
            <label htmlFor="language-select" className="sr-only">
              Language
            </label>
            <M3Select
              id="language-select"
              aria-label="Language"
              containerClassName="mt-2"
              className="m3-field w-full px-3 py-2 text-sm"
              value={locale}
              onChange={(event) => setLocale(event.target.value)}
            >
              {orderedLanguages.map((entry: LanguageOption) => (
                <option key={entry.code} value={entry.code}>
                  {entry.label}
                </option>
              ))}
            </M3Select>
          </>
        )}
      </section>
      <details className="m3-card p-4 sm:p-5">
        <summary className="cursor-pointer text-lg font-semibold">
          Advanced
        </summary>
        <div className="mt-5">
          <label htmlFor="strictness-select" className="text-sm font-semibold">
            Save compatibility check
          </label>
          <p
            id="strictness-description"
            className="mt-1 text-sm text-[var(--muted)]"
          >
            The recommended check supports compatible game updates. Change this
            only when troubleshooting a save that will not load.
          </p>
          <M3Select
            id="strictness-select"
            aria-label="Save compatibility check"
            aria-describedby="strictness-description"
            containerClassName="mt-3"
            className="m3-field w-full px-3 py-2 text-sm"
            value={parseStrictness}
            onChange={(event) => setParseStrictness(event.target.value)}
          >
            <option value="major">Recommended compatibility check</option>
            <option value="minor">Exact save version</option>
            <option value="none">Skip version checks</option>
          </M3Select>
          {parseStrictness === "none" ? (
            <p className="mt-2 text-sm text-[var(--warning)]">
              Unsupported save formats may lose data. Keep an original backup.
            </p>
          ) : null}
        </div>
        <div className="mt-6 border-t border-[var(--outline-faint)] pt-5">
          <h3 className="font-semibold">Developer tools</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Inspect parser diagnostics and preview interface components.
          </p>
          <M3OutlinedButton
            onClick={() => setDeveloperToolsVisible((visible) => !visible)}
            aria-expanded={developerToolsVisible}
            aria-controls="settings-developer-tools"
            className="mt-3 px-4 py-2 text-sm"
          >
            {developerToolsVisible
              ? "Hide developer tools"
              : "Show developer tools"}
          </M3OutlinedButton>
          <p className="mt-4 text-xs text-[var(--muted)]">
            {t("settings.i18n.namespaces", {
              fallback: "Loaded namespaces: common, oni",
            })}
          </p>
        </div>
        {developerToolsVisible ? (
          <div id="settings-developer-tools" className="mt-5">
            <SettingsDevTools />
          </div>
        ) : null}
      </details>
    </div>
  );
}
