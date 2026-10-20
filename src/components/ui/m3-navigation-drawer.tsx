"use client";

import { Fragment, type ReactNode, type Ref } from "react";
import type { IconType } from "react-icons";
import Image from "next/image";
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
  group?: string;
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
  onNavigate?: (href: string) => void;
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
          data-dialog-backdrop
          className="fixed inset-0 z-40 bg-[var(--scrim-soft)] md:hidden"
          aria-hidden="true"
          onClick={onClose}
        />
      ) : null}
      <aside
        ref={drawerRef}
        id={id}
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        aria-label={open ? "Navigation" : undefined}
        className={`m3-scrollbar m3-vertical-scroll m3-navigation-drawer fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col p-3 transition-transform duration-200 md:static md:z-auto md:h-full md:w-52 md:visible md:translate-x-0 ${
          open ? "visible translate-x-0" : "invisible -translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-2 px-2 py-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--state-hover)] text-[var(--accent)]">
              <Image
                src="/brand/onismith-mark.svg"
                alt=""
                width={36}
                height={36}
                aria-hidden="true"
              />
            </span>
            <div>
              <p className="m3-brand text-lg font-semibold leading-tight">
                {appName}
              </p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                ONI save editor
              </p>
            </div>
          </div>
          {open ? (
            <button
              type="button"
              onClick={onClose}
              className="m3-button m3-button-hollow px-2 text-sm md:hidden"
              aria-label="Close navigation"
            >
              Close
            </button>
          ) : null}
        </div>
        <nav
          className="mt-4"
          aria-label={t("app.nav.label", { fallback: "Main navigation" })}
        >
          <ul className="space-y-0.5">
            {navItems
              .filter((item) => hasSave || !item.saveRequired)
              .map((item, index, items) => {
                const active = isActive(
                  pathname.replace(/-editor\/?$/, ""),
                  item.href,
                );
                const badgeValue = itemBadges?.[item.href];
                const showBadge = Number.isFinite(badgeValue);
                const Icon = item.icon;

                return (
                  <Fragment key={item.href}>
                    {item.group && item.group !== items[index - 1]?.group ? (
                      <li className="px-3 pt-4 pb-1.5 text-xs font-medium text-[var(--muted)]">
                        {item.group}
                      </li>
                    ) : null}
                    <li>
                      <Link
                        href={item.href}
                        onNavigate={
                          onNavigate
                            ? (event) => {
                                event.preventDefault();
                                onNavigate(item.href);
                              }
                            : undefined
                        }
                        aria-current={active ? "page" : undefined}
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
                  </Fragment>
                );
              })}
          </ul>
        </nav>
        {bottomSlot}
      </aside>
    </>
  );
}
