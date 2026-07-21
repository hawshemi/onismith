"use client";

import { memo, useDeferredValue, useMemo, useState } from "react";
import { FaPaw } from "react-icons/fa6";
import BrowseListShell from "@/components/ui/browse-list-shell";
import M3OutlinedButton from "@/components/ui/m3-outlined-button";
import { useSaveSession } from "@/lib/save-session/save-session-context";
import {
  selectCreatures,
  type Creature,
  type CreaturePosition,
} from "@/lib/oni/save-selectors";

function formatPosition(position?: CreaturePosition | null): string {
  if (!position) {
    return "Unknown";
  }
  return `X ${position.x.toFixed(1)} · Y ${position.y.toFixed(1)} · Z ${position.z.toFixed(1)}`;
}

const MAX_VISIBLE_TRAITS = 4;

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
  const visibleTraits = orderedTraits.slice(0, MAX_VISIBLE_TRAITS);
  const remainingTraitCount = Math.max(
    0,
    orderedTraits.length - visibleTraits.length,
  );

  return (
    <article className="m3-card m3-card-hover flex h-full w-full flex-col p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--outline-faint)] bg-[var(--surface-container)] text-[var(--accent)]">
          <FaPaw aria-hidden="true" className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="m3-label">Creature</p>
          <h2 className="truncate text-lg font-semibold leading-tight">
            {creature.displayName}
          </h2>
          {creature.displayName !== creature.type ? (
            <code className="mt-1 block truncate text-xs opacity-60">
              {creature.type}
            </code>
          ) : null}
        </div>
        <M3OutlinedButton
          href={`/creatures-editor?id=${creature.id}`}
          onClick={() => onSelect(creature.id)}
          className="ml-auto inline-flex shrink-0 items-center gap-2 px-3 py-2 text-xs"
        >
          Edit
        </M3OutlinedButton>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2">
        <div className="m3-panel-inset min-w-0 px-3 py-2.5">
          <dt className="m3-label">Game object ID</dt>
          <dd className="mt-1 truncate font-mono text-sm font-semibold tabular-nums">
            {creature.id}
          </dd>
        </div>
        <div className="m3-panel-inset min-w-0 px-3 py-2.5">
          <dt className="m3-label">World position</dt>
          <dd
            className="mt-1 truncate text-sm font-semibold tabular-nums"
            title={formatPosition(creature.position)}
          >
            {formatPosition(creature.position)}
          </dd>
        </div>
      </dl>

      <section className="mt-4 flex flex-1 flex-col border-t border-[var(--outline-faint)] pt-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="m3-label">Traits</h3>
          <span className="m3-tag">{orderedTraits.length}</span>
        </div>
        <div className="mt-2 flex min-h-10 flex-wrap content-start items-start gap-1.5">
          {visibleTraits.length === 0 ? (
            <span className="m3-panel-inset w-full px-3 py-2 text-xs opacity-70">
              No traits found
            </span>
          ) : (
            visibleTraits.map((trait) => (
              <span key={trait} className="m3-tag max-w-full" title={trait}>
                <span className="truncate">{trait}</span>
              </span>
            ))
          )}
          {remainingTraitCount > 0 ? (
            <span
              className="m3-tag text-[var(--accent)]"
              title={`${remainingTraitCount} additional traits`}
            >
              +{remainingTraitCount} more
            </span>
          ) : null}
        </div>
      </section>
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
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("type-asc");
  // Defer filtering so typing stays smooth on colonies with many creatures.
  const deferredQuery = useDeferredValue(query);

  const visibleCreatures = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    const filtered = needle
      ? creatures.filter(
          (creature) =>
            creature.type.toLowerCase().includes(needle) ||
            creature.displayName.toLowerCase().includes(needle),
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
        placeholder: "Find a critter by type",
        ariaLabel: "Search creatures by type",
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
      <div className="grid w-full items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
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
