"use client";

import M3Select from "@/components/ui/m3-select";
import type { ReactNode } from "react";

type SortOption = {
  value: string;
  label: string;
};

type M3ListFilterBarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  searchAriaLabel: string;
  sortValue: string;
  onSortChange: (value: string) => void;
  sortOptions: SortOption[];
  sortAriaLabel: string;
  // Filtered vs total, shown as "X of Y" so it's clear when a filter is hiding
  // entries. Callers compute both.
  resultCount: number;
  totalCount: number;
  filters?: ReactNode;
};

// Presentational filter/sort row for the browse-grid pages. The owning page
// keeps the filtering and sorting logic; this only renders the controls and the
// result count.
export default function M3ListFilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchAriaLabel,
  sortValue,
  onSortChange,
  sortOptions,
  sortAriaLabel,
  resultCount,
  totalCount,
  filters,
}: M3ListFilterBarProps) {
  return (
    <div className="sticky top-0 z-10 -mx-3 flex flex-wrap items-center gap-2.5 border-b border-[var(--outline-faint)] bg-[var(--surface)] px-3 py-2.5 sm:-mx-5 sm:px-5">
      <input
        type="search"
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchAriaLabel}
        className="m3-field min-h-11 min-w-0 basis-full px-3 py-2 text-base sm:min-h-10 sm:flex-1 sm:basis-48 sm:text-sm"
      />
      {filters}
      <label className="flex min-w-0 flex-1 items-center gap-2 text-sm sm:flex-none">
        <span className="text-[var(--muted)]">Sort</span>
        <M3Select
          aria-label={sortAriaLabel}
          value={sortValue}
          onChange={(event) => onSortChange(event.target.value)}
          containerClassName="min-w-0 flex-1 sm:w-40"
          className="min-h-11 px-3 py-2 text-sm sm:min-h-10"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </M3Select>
      </label>
      <span
        className="ml-auto whitespace-nowrap text-xs tabular-nums text-[var(--muted)]"
        role="status"
      >
        {resultCount.toLocaleString()} of {totalCount.toLocaleString()}
      </span>
    </div>
  );
}
