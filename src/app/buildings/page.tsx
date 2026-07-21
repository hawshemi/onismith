"use client";

import { memo, useDeferredValue, useMemo, useState } from "react";
import { FaBuilding } from "react-icons/fa6";
import BrowseListShell from "@/components/ui/browse-list-shell";
import { useSaveSession } from "@/lib/save-session/save-session-context";
import { selectBuildings, type Building } from "@/lib/oni/save-selectors";

const SORT_OPTIONS = [
  { value: "name-asc", label: "Name A to Z" },
  { value: "name-desc", label: "Name Z to A" },
  { value: "id-asc", label: "ID ascending" },
  { value: "id-desc", label: "ID descending" },
];

const BuildingCard = memo(function BuildingCard({
  building,
}: {
  building: Building;
}) {
  return (
    <article className="m3-card m3-card-hover flex h-full flex-col p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--outline-faint)] bg-[var(--surface-container)] text-[var(--accent)]">
          <FaBuilding aria-hidden="true" className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="m3-label">Building</p>
          <h2
            className="truncate text-lg font-semibold leading-tight"
            title={building.displayName}
          >
            {building.displayName}
          </h2>
          <code
            className="mt-1 block truncate text-xs opacity-60"
            title={building.type}
          >
            {building.type}
          </code>
        </div>
        <span className="m3-tag shrink-0">Read-only</span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2">
        <div className="m3-panel-inset min-w-0 px-3 py-2.5">
          <dt className="m3-label">Game object ID</dt>
          <dd className="mt-1 truncate font-mono text-sm font-semibold tabular-nums">
            {building.id}
          </dd>
        </div>
        <div className="m3-panel-inset min-w-0 px-3 py-2.5">
          <dt className="m3-label">World position</dt>
          <dd className="mt-1 truncate text-sm font-semibold tabular-nums">
            X {building.position.x.toFixed(1)} · Y{" "}
            {building.position.y.toFixed(1)} · Z{" "}
            {building.position.z.toFixed(1)}
          </dd>
        </div>
      </dl>

      {building.opaqueStateBytes > 0 ? (
        <p className="mt-3 text-xs opacity-65">
          {building.opaqueStateBytes.toLocaleString()} bytes of runtime state
          are preserved without editing.
        </p>
      ) : null}
    </article>
  );
});

export default function BuildingsPage() {
  const { saveGame, hasSave } = useSaveSession();
  const buildings = useMemo(() => selectBuildings(saveGame), [saveGame]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("name-asc");
  const deferredQuery = useDeferredValue(query);

  const visibleBuildings = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    const filtered = needle
      ? buildings.filter(
          (building) =>
            building.type.toLowerCase().includes(needle) ||
            building.displayName.toLowerCase().includes(needle) ||
            String(building.id).includes(needle),
        )
      : buildings;
    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "name-desc":
          return b.displayName.localeCompare(a.displayName) || b.id - a.id;
        case "id-asc":
          return a.id - b.id;
        case "id-desc":
          return b.id - a.id;
        case "name-asc":
        default:
          return a.displayName.localeCompare(b.displayName) || a.id - b.id;
      }
    });
  }, [buildings, deferredQuery, sort]);

  return (
    <BrowseListShell
      hasSave={hasSave}
      title="Buildings"
      description="Inspect completed buildings while preserving linked and opaque runtime state."
      saveRequiredDescription="Load a save first to inspect completed buildings."
      emptyMessage="No completed buildings found in this save."
      search={{
        value: query,
        onChange: setQuery,
        placeholder: "Find a building by name or ID",
        ariaLabel: "Search buildings by name or ID",
      }}
      sort={{
        value: sort,
        onChange: setSort,
        options: SORT_OPTIONS,
        ariaLabel: "Sort buildings",
      }}
      totalCount={buildings.length}
      resultCount={visibleBuildings.length}
      noMatchLabel="buildings"
      deferredQuery={deferredQuery}
    >
      <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleBuildings.map((building) => (
          <BuildingCard key={building.id} building={building} />
        ))}
      </div>
    </BrowseListShell>
  );
}
