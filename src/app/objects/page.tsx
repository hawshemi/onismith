"use client";

import { memo, useDeferredValue, useMemo, useState } from "react";
import BrowseListShell from "@/components/ui/browse-list-shell";
import { useSaveSession } from "@/lib/save-session/save-session-context";
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
  const visibleBehaviors = group.behaviorNames.slice(0, 6);
  const remainingBehaviors =
    group.behaviorNames.length - visibleBehaviors.length;

  return (
    <article className="m3-card m3-card-hover flex h-full flex-col p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="m3-label">{group.category}</p>
          <h2
            className="truncate text-lg font-semibold"
            title={group.displayName}
          >
            {group.displayName}
          </h2>
          <code
            className="mt-1 block truncate text-xs opacity-60"
            title={group.type}
          >
            {group.type}
          </code>
        </div>
        <span className="m3-tag shrink-0">Read-only</span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2">
        <div className="m3-panel-inset px-3 py-2.5">
          <dt className="m3-label">Objects</dt>
          <dd className="mt-1 text-sm font-semibold tabular-nums">
            {group.count.toLocaleString()}
          </dd>
        </div>
        <div className="m3-panel-inset px-3 py-2.5">
          <dt className="m3-label">Opaque state</dt>
          <dd className="mt-1 text-sm font-semibold tabular-nums">
            {formatBytes(group.opaqueStateBytes)}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {visibleBehaviors.map((behavior) => (
          <code key={behavior} className="m3-tag max-w-full truncate text-xs">
            {behavior}
          </code>
        ))}
        {remainingBehaviors > 0 ? (
          <span className="m3-tag text-xs">+{remainingBehaviors} more</span>
        ) : null}
      </div>
    </article>
  );
});

export default function ObjectsPage() {
  const { saveGame, hasSave } = useSaveSession();
  const groups = useMemo(() => selectWorldObjectGroups(saveGame), [saveGame]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("category-asc");
  const deferredQuery = useDeferredValue(query);

  const visibleGroups = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    const filtered = needle
      ? groups.filter(
          (group) =>
            group.type.toLowerCase().includes(needle) ||
            group.displayName.toLowerCase().includes(needle) ||
            group.category.toLowerCase().includes(needle) ||
            group.behaviorNames.some((name) =>
              name.toLowerCase().includes(needle),
            ),
        )
      : groups;

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
  }, [deferredQuery, groups, sort]);

  return (
    <BrowseListShell
      hasSave={hasSave}
      title="Objects"
      description="Inspect serialized object groups, including plants, world features, meteor showers, and DLC points of interest."
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
      <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleGroups.map((group) => (
          <ObjectGroupCard key={group.type} group={group} />
        ))}
      </div>
    </BrowseListShell>
  );
}
