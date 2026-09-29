"use client";

import { memo, useDeferredValue, useMemo } from "react";
import BrowseListShell from "@/components/ui/browse-list-shell";
import M3Select from "@/components/ui/m3-select";
import { useSaveSession } from "@/lib/save-session/save-session-context";
import { useBrowseState } from "@/lib/use-browse-state";
import {
  selectWorldObjectGroups,
  type WorldObjectGroupSummary,
} from "@/lib/oni/save-selectors";

const SORT_OPTIONS = [
  { value: "category-asc", label: "Category then name" },
  { value: "name-asc", label: "Name A to Z" },
  { value: "name-desc", label: "Name Z to A" },
  { value: "count-desc", label: "Largest groups" },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const ObjectGroupCard = memo(function ObjectGroupCard({
  group,
}: {
  group: WorldObjectGroupSummary;
}) {
  return (
    <article
      className="min-w-0 border-b border-[var(--outline-faint)] px-4 py-3 last:border-b-0 sm:px-5"
      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 112px" }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-base font-semibold leading-snug">
            {group.displayName}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{group.category}</p>
        </div>
        <p className="shrink-0 text-sm tabular-nums">
          {group.count.toLocaleString()}{" "}
          <span className="text-[var(--muted)]">objects</span>
        </p>
      </div>
      <details className="mt-1">
        <summary className="w-fit cursor-pointer py-2 text-sm text-[var(--muted)]">
          Technical details
        </summary>
        <p className="mt-1 break-all text-sm">
          <code>{group.type}</code>
        </p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {formatBytes(group.opaqueStateBytes)} of runtime state preserved
          without editing.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {group.behaviorNames.map((behavior) => (
            <code key={behavior} className="m3-tag max-w-full break-all">
              {behavior}
            </code>
          ))}
        </div>
      </details>
    </article>
  );
});

export default function ObjectsPage() {
  const { saveGame, hasSave } = useSaveSession();
  const groups = useMemo(() => selectWorldObjectGroups(saveGame), [saveGame]);
  const { query, setQuery, sort, setSort, filter, setFilter } = useBrowseState(
    "objects",
    "category-asc",
  );
  const categories = useMemo(
    () => [...new Set(groups.map((group) => group.category))].sort(),
    [groups],
  );
  const deferredQuery = useDeferredValue(query);

  const visibleGroups = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    const filtered = groups.filter(
      (group) =>
        (!filter || group.category === filter) &&
        (!needle ||
          group.type.toLowerCase().includes(needle) ||
          group.displayName.toLowerCase().includes(needle) ||
          group.category.toLowerCase().includes(needle) ||
          group.behaviorNames.some((name) =>
            name.toLowerCase().includes(needle),
          )),
    );

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "name-asc":
          return a.displayName.localeCompare(b.displayName);
        case "name-desc":
          return b.displayName.localeCompare(a.displayName);
        case "count-desc":
          return (
            b.count - a.count || a.displayName.localeCompare(b.displayName)
          );
        case "category-asc":
        default:
          return (
            a.category.localeCompare(b.category) ||
            a.displayName.localeCompare(b.displayName)
          );
      }
    });
  }, [deferredQuery, groups, sort, filter]);

  return (
    <BrowseListShell
      hasSave={hasSave}
      title="Objects"
      description="Browse plants, world features, and other saved objects. This section is read-only."
      filters={
        <M3Select
          aria-label="Filter object category"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          containerClassName="min-w-0 max-w-full"
          className="min-h-11 px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </M3Select>
      }
      saveRequiredDescription="Load a save first to inspect serialized world objects."
      emptyMessage="No serialized object groups found in this save."
      search={{
        value: query,
        onChange: setQuery,
        placeholder: "Find an object, category, or behavior",
        ariaLabel: "Search serialized object groups",
      }}
      sort={{
        value: sort,
        onChange: setSort,
        options: SORT_OPTIONS,
        ariaLabel: "Sort serialized object groups",
      }}
      totalCount={groups.length}
      resultCount={visibleGroups.length}
      noMatchLabel="object groups"
      deferredQuery={deferredQuery}
    >
      <div className="m3-card overflow-hidden">
        {visibleGroups.map((group) => (
          <ObjectGroupCard key={group.type} group={group} />
        ))}
      </div>
    </BrowseListShell>
  );
}
