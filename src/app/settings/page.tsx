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
    <div className="m3-page m3-page-flow">
      <M3PageHeader
        title={null}
        description="App language, save-parsing strictness, and developer tools."
      />

      <section className="m3-card p-4 sm:p-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <label
              id="language-select-label"
              className="text-sm font-semibold"
              htmlFor="language-select"
            >
              {t("settings.language.title", { fallback: "Language" })}
            </label>
            <M3Select
              id="language-select"
              aria-labelledby="language-select-label"
              containerClassName="mt-2"
              className="m3-field w-full px-3 py-2 text-sm"
              value={locale}
              onChange={(event) => setLocale(event.target.value)}
              disabled={isSingleLocale}
            >
              {orderedLanguages.map((entry: LanguageOption) => (
                <option key={entry.code} value={entry.code}>
                  {entry.label}
                </option>
              ))}
            </M3Select>
            <p className="mt-2 text-xs opacity-70">
              {t("settings.language.current", {
                fallback: "Current language: {language}",
                params: { language: currentLanguageLabel },
              })}
            </p>
          </div>

          <div>
            <label
              id="strictness-select-label"
              className="text-sm font-semibold"
              htmlFor="strictness-select"
            >
              {t("settings.strictness.title", {
                fallback: "Save Parse Strictness",
              })}
            </label>
            <p className="mt-1 text-xs opacity-75">
              {t("settings.strictness.description", {
                fallback:
                  "Controls how strictly the parser enforces save version checks when loading.",
              })}
            </p>
            <M3Select
              id="strictness-select"
              aria-labelledby="strictness-select-label"
              containerClassName="mt-2"
              className="m3-field w-full px-3 py-2 text-sm"
              value={parseStrictness}
              onChange={(event) => setParseStrictness(event.target.value)}
            >
              <option value="major">major (recommended)</option>
              <option value="minor">minor</option>
              <option value="none">none</option>
            </M3Select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-[var(--outline-faint)] pt-3 text-xs opacity-65">
          <p>
            {t("settings.i18n.namespaces", {
              fallback: "Loaded namespaces: common, oni",
            })}
          </p>
          <p>
            {t("settings.i18n.languages", {
              fallback: "Supported language packs: English only (for now).",
            })}
          </p>
        </div>
      </section>

      <section className="m3-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Advanced</h2>
            <p className="mt-1 text-sm opacity-70">
              Diagnostics and interface calibration tools for development.
            </p>
          </div>
          <M3OutlinedButton
            onClick={() => setDeveloperToolsVisible((visible) => !visible)}
            aria-expanded={developerToolsVisible}
            aria-controls="settings-developer-tools"
            className="px-4 py-2 text-sm"
          >
            {developerToolsVisible
              ? "Hide developer tools"
              : "Show developer tools"}
          </M3OutlinedButton>
        </div>
      </section>

      {developerToolsVisible ? (
        <div id="settings-developer-tools">
          <SettingsDevTools />
        </div>
      ) : null}
    </div>
  );
}
