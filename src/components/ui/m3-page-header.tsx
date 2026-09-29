import type { ReactNode } from "react";

type M3PageHeaderProps = {
  title?: ReactNode;
  description?: ReactNode;
  // Trailing controls (bulk actions, filters). Wrap flow-aligns them to the
  // title on wide viewports and stacks them below on narrow ones.
  actions?: ReactNode;
};

// Shared page intro used at the top of every feature page: a plain heading
// block (not a card) so the cards below read as content, not siblings of the
// title. The app-shell top bar carries the section name; the title here is the
// short page name and the description gives the one-line "what this page does".
export default function M3PageHeader({
  title,
  description,
  actions,
}: M3PageHeaderProps) {
  const hasTitle = title !== null && title !== undefined;

  return (
    <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        {hasTitle ? (
          <h2 className="text-xl font-semibold leading-tight text-balance sm:text-[1.375rem]">
            {title}
          </h2>
        ) : null}
        {description ? (
          <p
            className={`${hasTitle ? "mt-1" : ""} max-w-3xl text-sm leading-relaxed text-[var(--muted)]`}
          >
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
