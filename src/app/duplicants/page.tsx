"use client";

import { useDeferredValue, useMemo, useState } from "react";
import BrowseListShell from "@/components/ui/browse-list-shell";
import DuplicantCard from "@/components/duplicant-card";
import { useSaveSession } from "@/lib/save-session/save-session-context";
import { selectDuplicants } from "@/lib/oni/save-selectors";
import { readStoredHairOffsets } from "@/lib/oni/hair-offsets";
import { useBrowseState } from "@/lib/use-browse-state";

const SORT_OPTIONS = [
  { value: "name-asc", label: "Name A to Z" },
  { value: "name-desc", label: "Name Z to A" },
  { value: "id-asc", label: "ID ascending" },
  { value: "id-desc", label: "ID descending" },
];

export default function DuplicantsPage() {
  const { saveGame, hasSave, setSelectedDuplicantId } = useSaveSession();
  const duplicants = useMemo(() => selectDuplicants(saveGame), [saveGame]);
  const [hairOffsets] = useState(readStoredHairOffsets);
  const { query, setQuery, sort, setSort } = useBrowseState(
    "duplicants",
    "name-asc",
  );
  // Defer the filter input so typing stays smooth even when the grid re-renders
  // hundreds of cards.
  const deferredQuery = useDeferredValue(query);

  const visibleDuplicants = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    const filtered = needle
      ? duplicants.filter((duplicant) =>
          duplicant.name.toLowerCase().includes(needle),
        )
      : duplicants;
    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "id-asc":
          return a.id - b.id;
        case "id-desc":
          return b.id - a.id;
        case "name-asc":
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [duplicants, deferredQuery, sort]);

  return (
    <BrowseListShell
      hasSave={hasSave}
      title="Duplicants"
      description="Find a duplicant to edit appearance, traits, skills, and health."
      saveRequiredDescription="Load a save to view and edit duplicants."
      emptyMessage="No duplicants found in this save."
      search={{
        value: query,
        onChange: setQuery,
        placeholder: "Find a dupe by name",
        ariaLabel: "Search duplicants by name",
      }}
      sort={{
        value: sort,
        onChange: setSort,
        options: SORT_OPTIONS,
        ariaLabel: "Sort duplicants",
      }}
      totalCount={duplicants.length}
      resultCount={visibleDuplicants.length}
      noMatchLabel="duplicants"
      deferredQuery={deferredQuery}
    >
      <div className="@container w-full">
        <div className="grid items-stretch gap-3 @min-[34rem]:grid-cols-2 @min-[52rem]:grid-cols-3">
          {visibleDuplicants.map((duplicant) => (
            <DuplicantCard
              key={duplicant.id}
              duplicant={duplicant}
              onSelect={setSelectedDuplicantId}
              hairOffsets={hairOffsets}
            />
          ))}
        </div>
      </div>
    </BrowseListShell>
  );
}
