"use client";

import { memo, useDeferredValue, useMemo, useState } from "react";
import { SpaceDestinationTypeNames } from "@/lib/save-parser/model";
import BrowseListShell from "@/components/ui/browse-list-shell";
import M3OutlinedButton from "@/components/ui/m3-outlined-button";
import M3Select from "@/components/ui/m3-select";
import { FractionField, NumberField } from "@/components/ui/numeric-fields";
import {
  getSimHashByElementName,
  RECOVERABLE_ELEMENT_NAMES,
  selectPlanets,
  type Planet,
} from "@/lib/oni/save-selectors";
import { useSaveSession } from "@/lib/save-session/save-session-context";

const DESTINATION_TYPE_NAMES = SpaceDestinationTypeNames.map(String).sort(
  (a, b) => a.localeCompare(b),
);

type PlanetCardProps = {
  planet: Planet;
  onUpdate: (planetId: number, patch: Record<string, unknown>) => void;
};

const PlanetCard = memo(function PlanetCard({
  planet,
  onUpdate,
}: PlanetCardProps) {
  const [elementDraft, setElementDraft] = useState("");
  const orderedRecoverableElements = useMemo(
    () =>
      [...planet.recoverableElements].sort((a, b) =>
        a.element.localeCompare(b.element, undefined, { sensitivity: "base" }),
      ),
    [planet.recoverableElements],
  );

  // The type select may hold a value not in the known enum (mods, newer DLC);
  // include it so the current value is never silently dropped.
  const typeOptions = useMemo(() => {
    if (planet.type && !DESTINATION_TYPE_NAMES.includes(planet.type)) {
      return [planet.type, ...DESTINATION_TYPE_NAMES].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" }),
      );
    }
    return DESTINATION_TYPE_NAMES;
  }, [planet.type]);

  // Elements not already on this planet, so the same element cannot be added
  // twice (the write path keys recoverable entries by hash).
  const addableElements = useMemo(() => {
    const present = new Set(
      planet.recoverableElements.map((entry) => entry.hash),
    );
    return RECOVERABLE_ELEMENT_NAMES.filter((name) => {
      const hash = getSimHashByElementName(name);
      return hash !== null && !present.has(hash);
    });
  }, [planet.recoverableElements]);

  const selectedToAdd = elementDraft || addableElements[0] || "";

  const commitRecoverable = (hash: number, fraction: number) => {
    const tuples = planet.recoverableElements.map((entry) => [
      entry.hash,
      entry.hash === hash ? fraction : entry.fraction,
    ]);
    onUpdate(planet.id, { recoverableElements: tuples });
  };

  const removeRecoverable = (hash: number) => {
    const tuples = planet.recoverableElements
      .filter((entry) => entry.hash !== hash)
      .map((entry) => [entry.hash, entry.fraction]);
    onUpdate(planet.id, { recoverableElements: tuples });
  };

  const addRecoverable = (elementName: string) => {
    const hash = getSimHashByElementName(elementName);
    if (hash === null) {
      return;
    }
    if (planet.recoverableElements.some((entry) => entry.hash === hash)) {
      return;
    }
    const tuples = [
      ...planet.recoverableElements.map((entry) => [
        entry.hash,
        entry.fraction,
      ]),
      [hash, 0],
    ];
    onUpdate(planet.id, { recoverableElements: tuples });
    setElementDraft("");
  };

  return (
    <article className="m3-card m3-card-hover p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold">Planet #{planet.id}</h2>
        <span className="m3-tag ml-auto">{planet.type}</span>
      </div>

      <label className="mt-3 flex flex-col gap-1 text-xs">
        <span className="opacity-75">Type</span>
        <M3Select
          aria-label={`Type for planet #${planet.id}`}
          value={planet.type}
          onChange={(event) =>
            onUpdate(planet.id, { type: event.target.value })
          }
          className="px-3 py-2 text-sm"
        >
          {typeOptions.map((typeName) => (
            <option key={typeName} value={typeName}>
              {typeName}
            </option>
          ))}
        </M3Select>
      </label>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="opacity-75">Distance</span>
          <NumberField
            value={planet.distance}
            step="1"
            onCommit={(next) => onUpdate(planet.id, { distance: next })}
            className="m3-field px-3 py-1.5 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs">
          <span className="opacity-75">Available Mass</span>
          <NumberField
            value={planet.availableMass}
            step="1"
            onCommit={(next) => onUpdate(planet.id, { availableMass: next })}
            className="m3-field px-3 py-1.5 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs">
          <span className="opacity-75">Active Period</span>
          <NumberField
            value={planet.activePeriod}
            step="1"
            onCommit={(next) => onUpdate(planet.id, { activePeriod: next })}
            className="m3-field px-3 py-1.5 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs">
          <span className="opacity-75">Inactive Period</span>
          <NumberField
            value={planet.inactivePeriod}
            step="1"
            onCommit={(next) => onUpdate(planet.id, { inactivePeriod: next })}
            className="m3-field px-3 py-1.5 text-sm"
          />
        </label>

        <FractionField
          label="Starting Orbit"
          value={planet.startingOrbitPercentage}
          onChange={(value) =>
            onUpdate(planet.id, { startingOrbitPercentage: value })
          }
        />
      </div>

      <div className="mt-3 border-t border-[var(--outline-faint)] pt-3">
        <h3 className="m3-label">Recoverable Elements</h3>
        {planet.recoverableElements.length > 0 ? (
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {orderedRecoverableElements.map((entry) => (
              <div key={entry.hash} className="flex items-end gap-2">
                <div className="flex-1">
                  <FractionField
                    label={entry.element}
                    value={entry.fraction}
                    onChange={(value) => commitRecoverable(entry.hash, value)}
                  />
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${entry.element}`}
                  onClick={() => removeRecoverable(entry.hash)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-transparent text-sm text-[var(--foreground)] opacity-70 hover:bg-[var(--state-hover)] hover:opacity-100"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs opacity-70">
            No recoverable elements on this destination.
          </p>
        )}

        {addableElements.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="flex flex-1 flex-col gap-1 text-xs">
              <span className="opacity-75">Add element</span>
              <M3Select
                aria-label={`Add recoverable element to planet #${planet.id}`}
                value={selectedToAdd}
                onChange={(event) => setElementDraft(event.target.value)}
                className="px-3 py-2 text-sm"
              >
                {addableElements.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </M3Select>
            </label>
            <M3OutlinedButton
              className="inline-flex items-center justify-center px-4 py-2 text-sm"
              onClick={() => addRecoverable(selectedToAdd)}
            >
              Add
            </M3OutlinedButton>
          </div>
        ) : null}
      </div>
    </article>
  );
});

const SORT_OPTIONS = [
  { value: "type-asc", label: "Type A to Z" },
  { value: "type-desc", label: "Type Z to A" },
  { value: "distance-asc", label: "Nearest first" },
  { value: "distance-desc", label: "Farthest first" },
];

export default function PlanetsPage() {
  const { hasSave, saveGame, updatePlanet } = useSaveSession();
  const planets = useMemo(() => selectPlanets(saveGame), [saveGame]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("type-asc");
  const deferredQuery = useDeferredValue(query);

  const visiblePlanets = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    const filtered = needle
      ? planets.filter((planet) =>
          String(planet.type).toLowerCase().includes(needle),
        )
      : planets;
    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "type-desc":
          return String(b.type).localeCompare(String(a.type));
        case "distance-asc":
          return a.distance - b.distance;
        case "distance-desc":
          return b.distance - a.distance;
        case "type-asc":
        default:
          return String(a.type).localeCompare(String(b.type));
      }
    });
  }, [planets, deferredQuery, sort]);

  return (
    <BrowseListShell
      hasSave={hasSave}
      title="Planets"
      description="Reshape space destinations and their recoverable elements."
      saveRequiredDescription="Load a save first to edit space destinations and recoverable elements."
      emptyMessage="No space destinations found in this save."
      search={{
        value: query,
        onChange: setQuery,
        placeholder: "Find a destination by type",
        ariaLabel: "Search planets by type",
      }}
      sort={{
        value: sort,
        onChange: setSort,
        options: SORT_OPTIONS,
        ariaLabel: "Sort planets",
      }}
      totalCount={planets.length}
      resultCount={visiblePlanets.length}
      noMatchLabel="destinations"
      deferredQuery={deferredQuery}
    >
      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {visiblePlanets.map((planet) => (
          <PlanetCard key={planet.id} planet={planet} onUpdate={updatePlanet} />
        ))}
      </div>
    </BrowseListShell>
  );
}
