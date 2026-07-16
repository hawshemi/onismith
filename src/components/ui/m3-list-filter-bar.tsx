"use client";

import M3Select from "@/components/ui/m3-select";

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
}: M3ListFilterBarProps) {
  return (
    <div className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center gap-2.5 border-b border-[var(--outline-faint)] bg-[var(--surface-container)] px-4 py-2.5 sm:-mx-5 sm:px-5">
      <input
        type="search"
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchAriaLabel}
        className="m3-field min-w-48 flex-1 px-3 py-2 text-sm lg:max-w-2xl"
      />
      <label className="flex items-center gap-2 text-xs">
        <span className="opacity-75">Sort</span>
        <M3Select
          aria-label={sortAriaLabel}
          value={sortValue}
          onChange={(event) => onSortChange(event.target.value)}
          className="px-3 py-2 text-sm"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </M3Select>
      </label>
      <span className="m3-tag ml-auto" aria-live="polite">
        {resultCount} of {totalCount}
      </span>
    </div>
  );
}
