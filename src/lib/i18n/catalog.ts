import enCommon from "@/translations/en/common.json";
import enOni from "@/translations/en/oni.json";

export const SUPPORTED_LOCALES = ["en"];
export const DEFAULT_LOCALE = "en";

const CATALOG: Record<string, Record<string, unknown>> = {
  en: {
    common: enCommon,
    oni: enOni,
  },
};

function getByPath(value: unknown, path: unknown): unknown {
  if (!value || typeof path !== "string" || path.length === 0) {
    return undefined;
  }
  return path.split(".").reduce<unknown>((acc, segment) => {
    const record = acc as Record<string, unknown> | null | undefined;
    return record && record[segment] !== undefined
      ? record[segment]
      : undefined;
  }, value);
}

function formatTemplate(
  template: string,
  params: Record<string, unknown> | undefined,
): string {
  if (!params || typeof params !== "object") {
    return template;
  }
  return template.replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}|\{([a-zA-Z0-9_]+)\}/g,
    (
      match: string,
      mustacheKey: string | undefined,
      braceKey: string | undefined,
    ) => {
      const key = mustacheKey || braceKey;
      if (
        key !== undefined &&
        Object.prototype.hasOwnProperty.call(params, key)
      ) {
        return String(params[key]);
      }
      return match;
    },
  );
}

function resolveMessage(
  locale: string,
  namespace: string,
  key: string,
): string | undefined {
  const localeBundle = CATALOG[locale] || CATALOG[DEFAULT_LOCALE];
  const fallbackBundle = CATALOG[DEFAULT_LOCALE];
  const value = getByPath(localeBundle?.[namespace], key);
  if (typeof value === "string") {
    return value;
  }
  const fallbackValue = getByPath(fallbackBundle?.[namespace], key);
  if (typeof fallbackValue === "string") {
    return fallbackValue;
  }
  return undefined;
}

export interface TranslateOptions {
  ns?: string;
  params?: Record<string, unknown>;
  fallback?: string;
}

export function translate(
  locale: string,
  key: string,
  options: TranslateOptions = {},
): string {
  const { ns = "common", params, fallback } = options;
  if (typeof key !== "string" || key.length === 0) {
    return typeof fallback === "string" ? fallback : "";
  }

  let namespace = ns;
  let lookupKey = key;
  const prefixed = key.match(/^([a-zA-Z0-9_-]+):(.*)$/);
  if (prefixed) {
    namespace = prefixed[1];
    lookupKey = prefixed[2];
  }

  const resolved = resolveMessage(locale, namespace, lookupKey);
  if (typeof resolved === "string") {
    return formatTemplate(resolved, params);
  }
  if (typeof fallback === "string") {
    return formatTemplate(fallback, params);
  }
  return formatTemplate(key, params);
}
