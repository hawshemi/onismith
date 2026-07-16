"use client";

import type { ReactNode, Ref } from "react";
import type { IconType } from "react-icons";
import Link from "next/link";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

type NavItem = {
  href: string;
  i18nKey: string;
  fallback: string;
  saveRequired?: boolean;
  icon?: IconType;
};

type TranslateFn = (key: string, options?: { fallback?: string }) => string;

type M3NavigationDrawerProps = {
  appName?: string;
  navItems: NavItem[];
  itemBadges?: Record<string, number | undefined>;
  pathname: string;
  hasSave?: boolean;
  // Rendered pinned to the bottom of the drawer (status, metadata). The caller
  // owns its content and its own margin/spacing.
  bottomSlot?: ReactNode;
  // Mobile off-canvas state. On >=md the drawer is a static sidebar and these
  // are ignored; below md it slides in as an overlay when `open` is true.
  open?: boolean;
  onClose?: () => void;
  onNavigate?: () => void;
  id?: string;
  drawerRef?: Ref<HTMLElement>;
  t: TranslateFn;
};

export default function M3NavigationDrawer({
  appName = "Onismith",
  navItems,
  itemBadges,
  pathname,
  hasSave,
  bottomSlot,
  open = false,
  onClose,
  onNavigate,
  id,
  drawerRef,
  t,
}: M3NavigationDrawerProps) {
  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-40 bg-[var(--scrim-soft)] md:hidden"
          aria-hidden="true"
          onClick={onClose}
        />
      ) : null}
      <aside
        ref={drawerRef}
        id={id}
        className={`m3-surface m3-scrollbar m3-vertical-scroll m3-navigation-drawer fixed inset-y-0 left-0 z-50 flex w-64 flex-col p-4 transition-transform duration-200 md:static md:z-auto md:h-full md:visible md:translate-x-0 ${
          open ? "visible translate-x-0" : "invisible -translate-x-full"
        }`}
      >
        <div className="px-1">
          <p className="m3-brand text-lg font-semibold leading-tight">
            {appName}
          </p>
          <p className="text-xs uppercase tracking-[0.12em] opacity-70">
            {t("app.tagline", { fallback: "ONI Save Editor" })}
          </p>
        </div>
        <nav
          className="mt-5"
          aria-label={t("app.nav.label", { fallback: "Main navigation" })}
        >
          <ul className="space-y-1">
            {navItems.map((item) => {
              const disabled = Boolean(item.saveRequired) && !hasSave;
              const active = isActive(pathname, item.href);
              const badgeValue = itemBadges?.[item.href];
              const showBadge = Number.isFinite(badgeValue);
              const Icon = item.icon;

              if (disabled) {
                return (
                  <li key={item.href}>
                    <span
                      className="m3-navigation-drawer-item m3-navigation-drawer-item-disabled block w-full px-3 py-2 text-sm"
                      title={t("app.nav.load-save-first", {
                        fallback: "Load a save first.",
                      })}
                      aria-disabled="true"
                    >
                      <span className="flex items-center gap-2.5">
                        {Icon ? (
                          <Icon
                            aria-hidden="true"
                            className="h-4 w-4 shrink-0 opacity-70"
                          />
                        ) : null}
                        <span className="truncate">
                          {t(item.i18nKey, { fallback: item.fallback })}
                        </span>
                        {showBadge ? (
                          <span
                            className="m3-navigation-drawer-badge"
                            aria-hidden="true"
                          >
                            {badgeValue}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </li>
                );
              }

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={`m3-navigation-drawer-item block w-full px-3 py-2 text-sm ${
                      active ? "m3-navigation-drawer-item-active" : ""
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      {Icon ? (
                        <Icon
                          aria-hidden="true"
                          className="h-4 w-4 shrink-0 opacity-80"
                        />
                      ) : null}
                      <span className="truncate">
                        {t(item.i18nKey, { fallback: item.fallback })}
                      </span>
                      {showBadge ? (
                        <span
                          className="m3-navigation-drawer-badge"
                          aria-hidden="true"
                        >
                          {badgeValue}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        {bottomSlot}
      </aside>
    </>
  );
}
