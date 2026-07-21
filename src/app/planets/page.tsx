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
  selectPlanetoids,
  selectPlanets,
  type Planet,
  type Planetoid,
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

const PlanetoidCard = memo(function PlanetoidCard({
  planetoid,
}: {
  planetoid: Planetoid;
}) {
  const location = planetoid.starmapLocation
    ? `Q ${planetoid.starmapLocation.q}, R ${planetoid.starmapLocation.r}`
    : "Unknown";

  return (
    <article className="m3-card m3-card-hover flex h-full flex-col p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="m3-label">Planetoid #{planetoid.id}</p>
          <h2 className="truncate text-lg font-semibold" title={planetoid.name}>
            {planetoid.name}
          </h2>
        </div>
        {planetoid.isStartWorld ? (
          <span className="m3-tag text-[var(--accent)]">Starting world</span>
        ) : null}
        <span className="m3-tag">
          {planetoid.isDiscovered ? "Discovered" : "Undiscovered"}
        </span>
      </div>

      <code
        className="mt-2 block truncate text-xs opacity-65"
        title={planetoid.worldName}
      >
        {planetoid.worldName}
      </code>

      <dl className="mt-4 grid grid-cols-2 gap-2">
        <div className="m3-panel-inset px-3 py-2.5">
          <dt className="m3-label">Starmap</dt>
          <dd className="mt-1 text-sm font-semibold tabular-nums">
            {location}
          </dd>
        </div>
        <div className="m3-panel-inset px-3 py-2.5">
          <dt className="m3-label">World size</dt>
          <dd className="mt-1 text-sm font-semibold tabular-nums">
            {planetoid.worldSize.x} × {planetoid.worldSize.y}
          </dd>
        </div>
        <div className="m3-panel-inset px-3 py-2.5">
          <dt className="m3-label">Visited</dt>
          <dd className="mt-1 text-sm font-semibold">
            {planetoid.isDupeVisited ? "Yes" : "No"}
          </dd>
        </div>
        <div className="m3-panel-inset px-3 py-2.5">
          <dt className="m3-label">Surface revealed</dt>
          <dd className="mt-1 text-sm font-semibold">
            {planetoid.isSurfaceRevealed ? "Yes" : "No"}
          </dd>
        </div>
      </dl>

      <section className="mt-4 flex-1 border-t border-[var(--outline-faint)] pt-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="m3-label">Biome zones</h3>
          <span className="m3-tag">{planetoid.biomes.length}</span>
        </div>
        {planetoid.biomes.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {planetoid.biomes.map((biome) => {
              const label =
                biome.names.length > 0
                  ? biome.names.join(" / ")
                  : `Zone ${biome.zoneType}`;
              return (
                <span
                  key={biome.zoneType}
                  className="m3-tag"
                  title={`Zone ${biome.zoneType}`}
                >
                  {label} · {biome.cellCount}
                </span>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 text-xs opacity-70">No biome metadata found.</p>
        )}
      </section>
    </article>
  );
});

const SORT_OPTIONS = [
  { value: "name-asc", label: "Type A to Z" },
  { value: "name-desc", label: "Type Z to A" },
  { value: "distance-asc", label: "Nearest first" },
  { value: "distance-desc", label: "Farthest first" },
];

const PLANETOID_SORT_OPTIONS = [
  { value: "name-asc", label: "Name A to Z" },
  { value: "name-desc", label: "Name Z to A" },
  { value: "id-asc", label: "ID ascending" },
  { value: "id-desc", label: "ID descending" },
];

export default function PlanetsPage() {
  const { hasSave, saveGame, updatePlanet } = useSaveSession();
  const planets = useMemo(() => selectPlanets(saveGame), [saveGame]);
  const planetoids = useMemo(() => selectPlanetoids(saveGame), [saveGame]);
  const hasPlanetoids = planetoids.length > 0;
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("name-asc");
  const deferredQuery = useDeferredValue(query);
  const sortOptions = hasPlanetoids ? PLANETOID_SORT_OPTIONS : SORT_OPTIONS;
  const activeSort = sortOptions.some((option) => option.value === sort)
    ? sort
    : "name-asc";

  const visiblePlanetoids = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    const filtered = needle
      ? planetoids.filter((planetoid) => {
          const biomeNames = planetoid.biomes.flatMap((biome) => biome.names);
          return [planetoid.name, planetoid.worldName, ...biomeNames].some(
            (value) => value.toLowerCase().includes(needle),
          );
        })
      : planetoids;
    return [...filtered].sort((a, b) => {
      switch (activeSort) {
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "id-desc":
          return b.id - a.id;
        case "id-asc":
          return a.id - b.id;
        case "name-asc":
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [planetoids, deferredQuery, activeSort]);

  const visiblePlanets = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    const filtered = needle
      ? planets.filter((planet) =>
          String(planet.type).toLowerCase().includes(needle),
        )
      : planets;
    return [...filtered].sort((a, b) => {
      switch (activeSort) {
        case "name-desc":
          return String(b.type).localeCompare(String(a.type));
        case "distance-asc":
          return a.distance - b.distance;
        case "distance-desc":
          return b.distance - a.distance;
        case "name-asc":
        default:
          return String(a.type).localeCompare(String(b.type));
      }
    });
  }, [planets, deferredQuery, activeSort]);

  const resultCount = hasPlanetoids
    ? visiblePlanetoids.length
    : visiblePlanets.length;
  const totalCount = hasPlanetoids ? planetoids.length : planets.length;

  return (
    <BrowseListShell
      hasSave={hasSave}
      title={hasPlanetoids ? "Planetoids" : "Planets"}
      description={
        hasPlanetoids
          ? "Browse Spaced Out worlds, starmap positions, discovery state, and biome zones."
          : "Reshape classic space destinations and their recoverable elements."
      }
      saveRequiredDescription="Load a save first to inspect worlds and space destinations."
      emptyMessage="No worlds or space destinations found in this save."
      search={{
        value: query,
        onChange: setQuery,
        placeholder: hasPlanetoids
          ? "Find a world or biome"
          : "Find a destination by type",
        ariaLabel: hasPlanetoids
          ? "Search planetoids and biomes"
          : "Search planets by type",
      }}
      sort={{
        value: activeSort,
        onChange: setSort,
        options: sortOptions,
        ariaLabel: hasPlanetoids ? "Sort planetoids" : "Sort planets",
      }}
      totalCount={totalCount}
      resultCount={resultCount}
      noMatchLabel={hasPlanetoids ? "planetoids" : "destinations"}
      deferredQuery={deferredQuery}
    >
      {hasPlanetoids ? (
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {visiblePlanetoids.map((planetoid) => (
            <PlanetoidCard key={planetoid.id} planetoid={planetoid} />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {visiblePlanets.map((planet) => (
            <PlanetCard
              key={planet.id}
              planet={planet}
              onUpdate={updatePlanet}
            />
          ))}
        </div>
      )}
    </BrowseListShell>
  );
}
