"use client";

import Link from "next/link";
import { FaChevronRight, FaHouse } from "react-icons/fa6";

type TranslateFn = (key: string, options?: { fallback?: string }) => string;

type CrumbSpec = {
  href: string;
  i18nKey: string;
  fallback: string;
};

// Editor pages sit at the top level of the router but belong under their list
// page, so the trail is declared explicitly rather than split from the URL.
const CRUMB_CHAINS: Record<string, CrumbSpec[]> = {
  "/duplicants": [
    {
      href: "/duplicants",
      i18nKey: "duplicant.noun_titlecase_plural",
      fallback: "Duplicants",
    },
  ],
  "/duplicants-editor": [
    {
      href: "/duplicants",
      i18nKey: "duplicant.noun_titlecase_plural",
      fallback: "Duplicants",
    },
    {
      href: "/duplicants-editor",
      i18nKey: "app.page-title.duplicant-editor",
      fallback: "Duplicant Editor",
    },
  ],
  "/creatures": [
    {
      href: "/creatures",
      i18nKey: "creature.noun_titlecase_plural",
      fallback: "Creatures",
    },
  ],
  "/creatures-editor": [
    {
      href: "/creatures",
      i18nKey: "creature.noun_titlecase_plural",
      fallback: "Creatures",
    },
    {
      href: "/creatures-editor",
      i18nKey: "app.page-title.creature-editor",
      fallback: "Creature Editor",
    },
  ],
  "/geysers": [
    {
      href: "/geysers",
      i18nKey: "geyser.noun_titlecase_plural",
      fallback: "Geysers",
    },
  ],
  "/planets": [
    {
      href: "/planets",
      i18nKey: "planet.noun_titlecase_plural",
      fallback: "Planets",
    },
  ],
  "/materials": [
    {
      href: "/materials",
      i18nKey: "material.noun_titlecase_plural",
      fallback: "Materials",
    },
  ],
  "/raw": [
    {
      href: "/raw",
      i18nKey: "raw-editor-page.title",
      fallback: "Raw Editor",
    },
  ],
  "/settings": [
    {
      href: "/settings",
      i18nKey: "app.page-title.settings",
      fallback: "Settings",
    },
  ],
};

function resolveChain(normalizedPathname: string): CrumbSpec[] {
  if (normalizedPathname === "/") {
    return [];
  }
  const key = Object.keys(CRUMB_CHAINS).find(
    (prefix) =>
      normalizedPathname === prefix ||
      normalizedPathname.startsWith(`${prefix}/`),
  );
  return key ? CRUMB_CHAINS[key] : [];
}

type M3BreadcrumbsProps = {
  normalizedPathname: string;
  t: TranslateFn;
};

export default function M3Breadcrumbs({
  normalizedPathname,
  t,
}: M3BreadcrumbsProps) {
  const chain = resolveChain(normalizedPathname);
  const homeLabel = t("overview-page.title", { fallback: "Overview" });
  const isHome = chain.length === 0;

  return (
    <nav
      aria-label={t("app.breadcrumbs.label", { fallback: "Breadcrumb" })}
      className="min-w-0"
    >
      <ol className="m3-panel-inset flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 px-2.5 py-1 text-xs">
        <li className="flex min-w-0 items-center">
          {isHome ? (
            <span
              aria-current="page"
              className="flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-medium text-[var(--foreground)]"
            >
              <FaHouse aria-hidden="true" className="h-3 w-3 shrink-0" />
              <span className="truncate">{homeLabel}</span>
            </span>
          ) : (
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[var(--muted)] transition-colors hover:bg-[var(--state-hover)] hover:text-[var(--accent)]"
            >
              <FaHouse aria-hidden="true" className="h-3 w-3 shrink-0" />
              <span className="truncate">{homeLabel}</span>
            </Link>
          )}
        </li>
        {chain.map((crumb, index) => {
          const label = t(crumb.i18nKey, { fallback: crumb.fallback });
          const isLast = index === chain.length - 1;
          return (
            <li key={crumb.href} className="flex min-w-0 items-center gap-x-1">
              <FaChevronRight
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 text-[var(--muted)] opacity-60"
              />
              {isLast ? (
                <span
                  aria-current="page"
                  className="truncate rounded-md px-1.5 py-0.5 font-medium text-[var(--foreground)]"
                >
                  {label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="truncate rounded-md px-1.5 py-0.5 text-[var(--muted)] transition-colors hover:bg-[var(--state-hover)] hover:text-[var(--accent)]"
                >
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
