"use client";

import { memo, useDeferredValue, useMemo, useState } from "react";
import BrowseListShell from "@/components/ui/browse-list-shell";
import M3Select from "@/components/ui/m3-select";
import { FractionField, NumberField } from "@/components/ui/numeric-fields";
import { GEYSER_TYPE_NAMES } from "@/lib/oni/oni-constants";
import { selectGeysers, type Geyser } from "@/lib/oni/save-selectors";
import { useSaveSession } from "@/lib/save-session/save-session-context";

const ORDERED_GEYSER_TYPE_NAMES = [...GEYSER_TYPE_NAMES].sort((a, b) =>
  a.localeCompare(b, undefined, { sensitivity: "base" }),
);

function humanizeIdentifier(value: string): string {
  const humanized = value
    .replace(/^GeyserGeneric_/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!humanized) {
    return "Unknown";
  }

  return humanized.replace(/\b\w/g, (character) => character.toUpperCase());
}

type GeyserCardProps = {
  geyser: Geyser;
  onTypeChange: (id: number, geyserType: string) => void;
  onParameterChange: (id: number, parameter: string, value: number) => void;
};

const GeyserCard = memo(function GeyserCard({
  geyser,
  onTypeChange,
  onParameterChange,
}: GeyserCardProps) {
  return (
    <article className="m3-card m3-card-hover flex h-full flex-col p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="m3-label">Geyser</p>
          <h3 className="text-lg font-semibold">Geyser #{geyser.id}</h3>
          <p
            className="mt-1 truncate text-xs opacity-65"
            title={geyser.objectType}
          >
            Source: {humanizeIdentifier(geyser.objectType)}
          </p>
        </div>
        <span className="m3-tag max-w-full shrink-0">
          <span className="truncate">
            {humanizeIdentifier(geyser.geyserType)}
          </span>
        </span>
      </div>

      <div className="m3-panel mt-4 p-3">
        <label className="flex flex-col gap-2">
          <span className="m3-label">Geyser type</span>
          <M3Select
            aria-label={`Type for geyser #${geyser.id}`}
            value={geyser.geyserType}
            onChange={(event) => onTypeChange(geyser.id, event.target.value)}
            className="px-3 py-2.5 text-sm"
          >
            {ORDERED_GEYSER_TYPE_NAMES.map((typeName) => (
              <option key={typeName} value={typeName}>
                {humanizeIdentifier(typeName)}
              </option>
            ))}
          </M3Select>
        </label>
      </div>

      <div className="mt-4 flex items-start justify-between gap-3 border-t border-[var(--outline-faint)] pt-3">
        <div>
          <h4 className="text-sm font-semibold">Configuration</h4>
          <p className="mt-0.5 text-xs leading-relaxed opacity-65">
            Raw generated values stored directly in the save.
          </p>
        </div>
      </div>

      <section className="m3-panel-inset mt-3 p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h5 className="text-sm font-semibold">Roll values</h5>
          <span className="m3-tag shrink-0">Raw values</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className="m3-label">Emission rate</span>
            <NumberField
              value={geyser.emitRate}
              step="0.01"
              onCommit={(next) =>
                onParameterChange(geyser.id, "rateRoll", next)
              }
              className="m3-field w-full px-3 py-2.5 text-sm tabular-nums"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="m3-label">Lifecycle length</span>
            <NumberField
              value={geyser.lifecycleLength}
              step="0.01"
              onCommit={(next) =>
                onParameterChange(geyser.id, "yearLengthRoll", next)
              }
              className="m3-field w-full px-3 py-2.5 text-sm tabular-nums"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="m3-label">Eruption cycle</span>
            <NumberField
              value={geyser.iterationLength}
              step="0.01"
              onCommit={(next) =>
                onParameterChange(geyser.id, "iterationLengthRoll", next)
              }
              className="m3-field w-full px-3 py-2.5 text-sm tabular-nums"
            />
          </label>
        </div>
      </section>

      <section className="m3-panel-inset mt-2 flex-1 p-3">
        <div className="mb-3">
          <h5 className="text-sm font-semibold">Activity windows</h5>
          <p className="mt-0.5 text-xs opacity-65">
            Active lifecycle time and emitting eruption time.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FractionField
            label="Active time"
            value={geyser.activeFraction}
            onChange={(value) =>
              onParameterChange(geyser.id, "yearPercentRoll", value)
            }
            displayAsPercentage
            labelClassName="m3-label"
          />
          <FractionField
            label="Emitting time"
            value={geyser.emissionFraction}
            onChange={(value) =>
              onParameterChange(geyser.id, "iterationPercentRoll", value)
            }
            displayAsPercentage
            labelClassName="m3-label"
          />
        </div>
      </section>
    </article>
  );
});

const SORT_OPTIONS = [
  { value: "type-asc", label: "Type A to Z" },
  { value: "type-desc", label: "Type Z to A" },
  { value: "count-desc", label: "Most common type" },
];

export default function GeysersPage() {
  const { hasSave, saveGame, updateGeyserType, updateGeyserParameter } =
    useSaveSession();
  const geysers = useMemo(() => selectGeysers(saveGame), [saveGame]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("type-asc");
  const deferredQuery = useDeferredValue(query);

  const visibleGeysers = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    if (!needle) {
      return geysers;
    }
    return geysers.filter(
      (geyser) =>
        geyser.geyserType.toLowerCase().includes(needle) ||
        humanizeIdentifier(geyser.geyserType).toLowerCase().includes(needle) ||
        String(geyser.objectType).toLowerCase().includes(needle) ||
        humanizeIdentifier(geyser.objectType).toLowerCase().includes(needle) ||
        String(geyser.id).includes(needle),
    );
  }, [geysers, deferredQuery]);

  const sortedGeysers = useMemo(() => {
    const typeCounts = new Map<string, number>();
    for (const geyser of visibleGeysers) {
      typeCounts.set(
        geyser.geyserType,
        (typeCounts.get(geyser.geyserType) ?? 0) + 1,
      );
    }

    return [...visibleGeysers].sort((a, b) => {
      switch (sort) {
        case "type-desc":
          return b.geyserType.localeCompare(a.geyserType) || a.id - b.id;
        case "count-desc":
          return (
            (typeCounts.get(b.geyserType) ?? 0) -
              (typeCounts.get(a.geyserType) ?? 0) ||
            a.geyserType.localeCompare(b.geyserType) ||
            a.id - b.id
          );
        case "type-asc":
        default:
          return a.geyserType.localeCompare(b.geyserType) || a.id - b.id;
      }
    });
  }, [visibleGeysers, sort]);

  return (
    <BrowseListShell
      hasSave={hasSave}
      title="Geysers"
      description="Retune each geyser's type, output, and lifecycle timing."
      saveRequiredDescription="Load a save first to edit geyser type and lifecycle parameters."
      emptyMessage="No geysers found in this save."
      search={{
        value: query,
        onChange: setQuery,
        placeholder: "Find by type, source, or ID",
        ariaLabel: "Search geysers by type, source object, or ID",
      }}
      sort={{
        value: sort,
        onChange: setSort,
        options: SORT_OPTIONS,
        ariaLabel: "Sort geysers",
      }}
      totalCount={geysers.length}
      resultCount={visibleGeysers.length}
      noMatchLabel="geysers"
      deferredQuery={deferredQuery}
    >
      <div className="grid items-stretch gap-4 xl:grid-cols-2">
        {sortedGeysers.map((geyser) => (
          <GeyserCard
            key={geyser.id}
            geyser={geyser}
            onTypeChange={updateGeyserType}
            onParameterChange={updateGeyserParameter}
          />
        ))}
      </div>
    </BrowseListShell>
  );
}
