"use client";

import { memo, useDeferredValue, useMemo } from "react";
import { FaPaw } from "react-icons/fa6";
import BrowseListShell from "@/components/ui/browse-list-shell";
import M3OutlinedButton from "@/components/ui/m3-outlined-button";
import { useSaveSession } from "@/lib/save-session/save-session-context";
import { useBrowseState } from "@/lib/use-browse-state";
import {
  selectCreatures,
  type Creature,
  type CreaturePosition,
} from "@/lib/oni/save-selectors";

function formatPosition(position?: CreaturePosition | null): string {
  if (!position) {
    return "Unknown";
  }
  return `X ${position.x.toFixed(1)}, Y ${position.y.toFixed(1)}, Z ${position.z.toFixed(1)}`;
}

type CreatureCardProps = {
  creature: Creature;
  onSelect: (id: Creature["id"]) => void;
};

const CreatureCard = memo(function CreatureCard({
  creature,
  onSelect,
}: CreatureCardProps) {
  const orderedTraits = [...creature.traits].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
  return (
    <article
      className="min-w-0 border-b border-[var(--outline-faint)] px-4 py-3 last:border-b-0 sm:px-5"
      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 112px" }}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-container)] text-[var(--muted)]">
          <FaPaw aria-hidden="true" className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-base font-semibold leading-snug">
            {creature.displayName}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)] tabular-nums">
            {formatPosition(creature.position)}
          </p>
        </div>
        <M3OutlinedButton
          href={`/creatures-editor?id=${creature.id}`}
          onClick={() => onSelect(creature.id)}
          aria-label={`Edit ${creature.displayName}, ID ${creature.id}`}
          className="inline-flex min-h-11 shrink-0 items-center px-4 py-2 text-sm"
        >
          Edit
        </M3OutlinedButton>
      </div>

      <details className="mt-1 sm:ml-[3.25rem]">
        <summary className="w-fit cursor-pointer py-2 text-sm text-[var(--muted)]">
          {orderedTraits.length} traits and details
        </summary>
        <p className="mt-1 break-words text-sm text-[var(--muted)]">
          ID {creature.id} <code>{creature.type}</code>
        </p>
        <div className="mt-2 flex flex-wrap gap-2 pb-1">
          {orderedTraits.length ? (
            orderedTraits.map((trait) => (
              <span key={trait} className="m3-tag break-all">
                {trait}
              </span>
            ))
          ) : (
            <p className="text-sm text-[var(--muted)]">No traits found.</p>
          )}
        </div>
      </details>
    </article>
  );
});

const SORT_OPTIONS = [
  { value: "type-asc", label: "Type A to Z" },
  { value: "type-desc", label: "Type Z to A" },
  { value: "id-asc", label: "ID ascending" },
  { value: "id-desc", label: "ID descending" },
];

export default function CreaturesPage() {
  const { saveGame, hasSave, setSelectedCreatureId } = useSaveSession();
  const creatures = useMemo(() => selectCreatures(saveGame), [saveGame]);
  const { query, setQuery, sort, setSort } = useBrowseState(
    "creatures",
    "type-asc",
  );
  // Defer filtering so typing stays smooth on colonies with many creatures.
  const deferredQuery = useDeferredValue(query);

  const visibleCreatures = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    const filtered = needle
      ? creatures.filter(
          (creature) =>
            creature.type.toLowerCase().includes(needle) ||
            creature.displayName.toLowerCase().includes(needle) ||
            String(creature.id).includes(needle),
        )
      : creatures;
    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "type-desc":
          return b.displayName.localeCompare(a.displayName);
        case "id-asc":
          return a.id - b.id;
        case "id-desc":
          return b.id - a.id;
        case "type-asc":
        default:
          return a.displayName.localeCompare(b.displayName);
      }
    });
  }, [creatures, deferredQuery, sort]);

  return (
    <BrowseListShell
      hasSave={hasSave}
      title="Creatures"
      description="Every critter in your colony. Open one to edit its traits and position."
      saveRequiredDescription="Load a save to view creatures."
      emptyMessage="No creature entities found in this save."
      search={{
        value: query,
        onChange: setQuery,
        placeholder: "Find a critter by type or ID",
        ariaLabel: "Search creatures by type or ID",
      }}
      sort={{
        value: sort,
        onChange: setSort,
        options: SORT_OPTIONS,
        ariaLabel: "Sort creatures",
      }}
      totalCount={creatures.length}
      resultCount={visibleCreatures.length}
      noMatchLabel="creatures"
      deferredQuery={deferredQuery}
    >
      <div className="m3-card overflow-hidden">
        {visibleCreatures.map((creature) => (
          <CreatureCard
            key={creature.id}
            creature={creature}
            onSelect={setSelectedCreatureId}
          />
        ))}
      </div>
    </BrowseListShell>
  );
}
