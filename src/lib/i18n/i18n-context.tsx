"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  translate,
} from "@/lib/i18n/catalog";

const STORAGE_KEY = "onismith.language";
const LANGUAGE_EVENT = "onismith:language-change";

const FALLBACK_LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
};

export type TranslateOptions = {
  fallback?: string;
  params?: Record<string, string | number>;
};

export type LanguageOption = {
  code: string;
  label: string;
};

export type I18nContextValue = {
  locale: string;
  setLocale: (nextLocale: string) => void;
  t: (key: string, options?: TranslateOptions) => string;
  languages: LanguageOption[];
  supportedLocales: string[];
};

const I18nContext = createContext<I18nContextValue | null>(null);

function normalizeLocale(value: unknown): string {
  if (typeof value !== "string") {
    return DEFAULT_LOCALE;
  }
  const base = value.toLowerCase().split("-")[0];
  return SUPPORTED_LOCALES.includes(base) ? base : DEFAULT_LOCALE;
}

// Locale is read from localStorage (with a navigator fallback) via
// useSyncExternalStore so the server/first-paint snapshot stays DEFAULT_LOCALE
// and the stored value is applied after hydration without a mismatch.
function readStoredLocale(): string {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return normalizeLocale(stored);
    }
  } catch {
    // Ignore storage read failures.
  }
  if (typeof navigator?.language === "string") {
    return normalizeLocale(navigator.language);
  }
  return DEFAULT_LOCALE;
}

function getServerLocale(): string {
  return DEFAULT_LOCALE;
}

function subscribeLocale(onChange: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      onChange();
    }
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(LANGUAGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(LANGUAGE_EVENT, onChange);
  };
}

function toDisplayName(localeCode: string, displayLocale: string): string {
  try {
    if (
      typeof Intl !== "undefined" &&
      typeof Intl.DisplayNames === "function"
    ) {
      const formatter = new Intl.DisplayNames([displayLocale], {
        type: "language",
      });
      const value = formatter.of(localeCode);
      if (value) {
        return value.charAt(0).toUpperCase() + value.slice(1);
      }
    }
  } catch {
    // Use fallback labels when Intl.DisplayNames is unavailable.
  }
  return FALLBACK_LANGUAGE_NAMES[localeCode] || localeCode;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(
    subscribeLocale,
    readStoredLocale,
    getServerLocale,
  );

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((nextLocale: string) => {
    const normalized = normalizeLocale(nextLocale);
    try {
      window.localStorage.setItem(STORAGE_KEY, normalized);
    } catch {
      // Ignore localStorage write failures.
    }
    window.dispatchEvent(new Event(LANGUAGE_EVENT));
  }, []);

  const t = useCallback(
    (key: string, options: TranslateOptions = {}) =>
      translate(locale, key, options),
    [locale],
  );

  const languages = useMemo<LanguageOption[]>(() => {
    return SUPPORTED_LOCALES.map((code: string) => ({
      code,
      label: toDisplayName(code, locale),
    })).sort((a: LanguageOption, b: LanguageOption) =>
      a.label.localeCompare(b.label, locale),
    );
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t,
      languages,
      supportedLocales: SUPPORTED_LOCALES,
    }),
    [locale, setLocale, t, languages],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}
