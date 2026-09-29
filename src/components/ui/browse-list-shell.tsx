"use client";

import type { ReactNode } from "react";
import SaveRequiredPage from "@/components/save-required-page";
import M3PageHeader from "@/components/ui/m3-page-header";
import M3ListFilterBar from "@/components/ui/m3-list-filter-bar";

type SortOption = { value: string; label: string };

type BrowseListShellProps = {
  hasSave: boolean;
  title: string;
  description: ReactNode;
  headerActions?: ReactNode;
  filters?: ReactNode;
  // Defaults to `title`; only needed when the "load a save" prompt uses a
  // different name than the page heading.
  saveRequiredTitle?: string;
  saveRequiredDescription: ReactNode;
  // Shown when nothing exists at all (before any filtering).
  emptyMessage: ReactNode;
  search: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    ariaLabel: string;
  };
  sort: {
    value: string;
    onChange: (value: string) => void;
    options: SortOption[];
    ariaLabel: string;
  };
  totalCount: number;
  resultCount: number;
  // Plural noun for the "No <label> match ..." message (e.g. "duplicants").
  noMatchLabel: string;
  deferredQuery: string;
  children: ReactNode;
};

// Shared scaffolding for the browse pages: the load-a-save gate, page header,
// search/sort bar, and the empty / no-match panels. Each page still owns its own
// filter and sort logic and passes the rendered result grid as `children`.
export default function BrowseListShell({
  hasSave,
  title,
  description,
  headerActions,
  filters,
  saveRequiredTitle,
  saveRequiredDescription,
  emptyMessage,
  search,
  sort,
  totalCount,
  resultCount,
  noMatchLabel,
  deferredQuery,
  children,
}: BrowseListShellProps) {
  if (!hasSave) {
    return (
      <SaveRequiredPage
        title={saveRequiredTitle ?? title}
        description={saveRequiredDescription}
      />
    );
  }

  return (
    <section className="m3-page m3-page-flow">
      <M3PageHeader
        title={null}
        description={description}
        actions={headerActions}
      />
      {totalCount === 0 ? (
        <p className="m3-panel px-4 py-3 text-sm opacity-75">{emptyMessage}</p>
      ) : (
        <>
          <M3ListFilterBar
            searchValue={search.value}
            onSearchChange={search.onChange}
            searchPlaceholder={search.placeholder}
            searchAriaLabel={search.ariaLabel}
            sortValue={sort.value}
            onSortChange={sort.onChange}
            sortOptions={sort.options}
            sortAriaLabel={sort.ariaLabel}
            resultCount={resultCount}
            totalCount={totalCount}
            filters={filters}
          />
          {resultCount === 0 ? (
            <p className="m3-panel px-4 py-3 text-sm opacity-75">
              No {noMatchLabel} match
              {deferredQuery.trim() ? (
                <>
                  {" "}
                  <code>{deferredQuery.trim()}</code>
                </>
              ) : (
                " these filters"
              )}
              .
            </p>
          ) : (
            children
          )}
        </>
      )}
    </section>
  );
}
