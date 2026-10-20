"use client";

import { memo, useDeferredValue, useMemo } from "react";
import BrowseListShell from "@/components/ui/browse-list-shell";
import M3Select from "@/components/ui/m3-select";
import { FractionField, NumberField } from "@/components/ui/numeric-fields";
import { GEYSER_TYPE_NAMES } from "@/lib/oni/oni-constants";
import { selectGeysers, type Geyser } from "@/lib/oni/save-selectors";
import { useSaveSession } from "@/lib/save-session/save-session-context";
import { useBrowseState } from "@/lib/use-browse-state";

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

  return humanized.charAt(0).toUpperCase() + humanized.slice(1);
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
    <article className="m3-card min-w-0 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="break-words text-lg font-semibold">
            {humanizeIdentifier(geyser.geyserType)}
          </h2>
          <p className="mt-1 text-sm tabular-nums opacity-75">
            ID {geyser.id}, X {geyser.position.x.toFixed(1)}, Y{" "}
            {geyser.position.y.toFixed(1)}
          </p>
        </div>
        {!geyser.isEditable ? <span className="m3-tag">Read-only</span> : null}
      </div>
      {geyser.isEditable ? (
        <details className="mt-3 border-t border-[var(--outline-faint)] pt-3">
          <summary className="cursor-pointer rounded-lg py-1 text-sm font-medium">
            Edit geyser
          </summary>
          <label className="mt-3 flex flex-col gap-2">
            <span className="m3-label">Geyser type</span>
            <M3Select
              aria-label={`Geyser type for #${geyser.id}`}
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
          <h3 className="mt-5 text-sm font-semibold">Generation rolls</h3>
          <p className="mt-1 text-sm leading-relaxed opacity-75">
            These are raw generator inputs, not output rates or durations.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {[
              {
                label: "Emission rate roll",
                parameter: "rateRoll",
                value: geyser.emitRate,
              },
              {
                label: "Lifecycle length roll",
                parameter: "yearLengthRoll",
                value: geyser.lifecycleLength,
              },
              {
                label: "Eruption cycle roll",
                parameter: "iterationLengthRoll",
                value: geyser.iterationLength,
              },
            ].map((field) => (
              <label
                key={field.parameter}
                className="flex min-w-0 flex-col gap-1.5"
              >
                <span className="m3-label">{field.label}</span>
                <NumberField
                  value={field.value}
                  step="0.01"
                  onCommit={(next) =>
                    onParameterChange(geyser.id, field.parameter, next)
                  }
                  className="m3-field w-full px-3 py-2.5 text-sm tabular-nums"
                />
              </label>
            ))}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <FractionField
              label="Active time roll"
              value={geyser.activeFraction}
              onChange={(value) =>
                onParameterChange(geyser.id, "yearPercentRoll", value)
              }
              labelClassName="m3-label"
            />
            <FractionField
              label="Emitting time roll"
              value={geyser.emissionFraction}
              onChange={(value) =>
                onParameterChange(geyser.id, "iterationPercentRoll", value)
              }
              labelClassName="m3-label"
            />
          </div>
        </details>
      ) : (
        <p className="mt-3 text-sm opacity-75">
          Editing this Aquatic feature is not supported yet.
        </p>
      )}
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
  const { query, setQuery, sort, setSort } = useBrowseState(
    "geysers",
    "type-asc",
  );
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
      description="Inspect every geyser and retune supported generic geysers."
      saveRequiredDescription="Load a save first to inspect geysers and edit supported parameters."
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
      <div className="grid items-start gap-3 xl:grid-cols-2">
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
