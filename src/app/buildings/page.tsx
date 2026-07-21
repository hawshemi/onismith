"use client";

import { memo, useDeferredValue, useMemo, useState } from "react";
import { FaBuilding } from "react-icons/fa6";
import BrowseListShell from "@/components/ui/browse-list-shell";
import M3Dialog from "@/components/ui/m3-dialog";
import M3OutlinedButton from "@/components/ui/m3-outlined-button";
import { NumberField } from "@/components/ui/numeric-fields";
import { useSaveSession } from "@/lib/save-session/save-session-context";
import { selectBuildings, type Building } from "@/lib/oni/save-selectors";

const SORT_OPTIONS = [
  { value: "name-asc", label: "Name A to Z" },
  { value: "name-desc", label: "Name Z to A" },
  { value: "id-asc", label: "ID ascending" },
  { value: "id-desc", label: "ID descending" },
];

function readableSavedName(value: string): string {
  const match = value.match(/^<link(?:="[^"]*")?>(.*)<\/link>$/i);
  return match?.[1] ?? value;
}

const BuildingCard = memo(function BuildingCard({
  building,
  onEdit,
}: {
  building: Building;
  onEdit: (buildingId: number) => void;
}) {
  const canEdit = building.customName !== null || building.priority !== null;
  const savedName = building.customName
    ? readableSavedName(building.customName)
    : null;
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
            title={savedName ?? building.displayName}
          >
            {savedName ?? building.displayName}
          </h2>
          {savedName && savedName !== building.displayName ? (
            <p
              className="truncate text-xs opacity-70"
              title={building.displayName}
            >
              {building.displayName}
            </p>
          ) : null}
          <code
            className="mt-1 block truncate text-xs opacity-60"
            title={building.type}
          >
            {building.type}
          </code>
        </div>
        <span className="m3-tag shrink-0">
          {canEdit ? "Safe edits" : "Read-only"}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
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
        <div className="m3-panel-inset min-w-0 px-3 py-2.5">
          <dt className="m3-label">Priority</dt>
          <dd className="mt-1 text-sm font-semibold tabular-nums">
            {building.priority ?? "n/a"}
          </dd>
        </div>
      </dl>

      {building.opaqueStateBytes > 0 ? (
        <p className="mt-3 text-xs opacity-65">
          {building.opaqueStateBytes.toLocaleString()} bytes of runtime state
          are preserved without editing.
        </p>
      ) : null}

      {canEdit ? (
        <M3OutlinedButton
          className="mt-4 self-start px-4 py-2 text-sm"
          onClick={() => onEdit(building.id)}
        >
          Edit safe fields
        </M3OutlinedButton>
      ) : null}
    </article>
  );
});

type BuildingEditorDialogProps = {
  building: Building | null;
  onClose: () => void;
  onNameChange: (buildingId: number, name: string) => void;
  onPriorityChange: (buildingId: number, priority: number) => void;
};

function BuildingEditorDialog({
  building,
  onClose,
  onNameChange,
  onPriorityChange,
}: BuildingEditorDialogProps) {
  const currentName = building?.customName
    ? readableSavedName(building.customName)
    : "";
  const [nameDraft, setNameDraft] = useState(currentName);

  if (!building) {
    return null;
  }

  const nextName = nameDraft.trim();
  return (
    <M3Dialog
      open
      onClose={onClose}
      labelledBy="building-editor-title"
      describedBy="building-editor-description"
      className="w-full max-w-lg p-5 sm:p-6"
    >
      <h2 id="building-editor-title" className="text-xl font-semibold">
        {building.displayName}
      </h2>
      <p
        id="building-editor-description"
        className="mt-2 text-sm leading-relaxed opacity-70"
      >
        Only fields with a confirmed independent save value are editable. Grid
        position, material, health, automation, storage, and runtime state stay
        read-only.
      </p>

      <div className="mt-5 grid gap-4">
        {building.priority !== null ? (
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Priority</span>
            <span className="text-xs opacity-65">
              Standard ONI building priority from 1 to 9.
            </span>
            <NumberField
              value={building.priority}
              min="1"
              max="9"
              step="1"
              aria-label="Building priority"
              className="m3-field w-28 px-3 py-2 text-sm tabular-nums"
              onCommit={(priority) => onPriorityChange(building.id, priority)}
            />
          </label>
        ) : null}

        {building.customName !== null ? (
          <form
            className="grid gap-1.5"
            onSubmit={(event) => {
              event.preventDefault();
              if (nextName && nextName !== currentName) {
                onNameChange(building.id, nextName);
              }
            }}
          >
            <label
              htmlFor="building-custom-name"
              className="text-sm font-medium"
            >
              Custom name
            </label>
            <span className="text-xs opacity-65">
              Available only when this building already supports naming.
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="building-custom-name"
                value={nameDraft}
                maxLength={64}
                onChange={(event) => setNameDraft(event.target.value)}
                className="m3-field min-w-0 flex-1 px-3 py-2 text-sm"
              />
              <M3OutlinedButton
                type="submit"
                disabled={!nextName || nextName === currentName}
                className="px-4 py-2 text-sm"
              >
                Apply name
              </M3OutlinedButton>
            </div>
          </form>
        ) : null}
      </div>

      <div className="mt-6 flex justify-end">
        <M3OutlinedButton className="px-4 py-2 text-sm" onClick={onClose}>
          Close
        </M3OutlinedButton>
      </div>
    </M3Dialog>
  );
}

export default function BuildingsPage() {
  const { saveGame, hasSave, updateBuildingName, updateBuildingPriority } =
    useSaveSession();
  const buildings = useMemo(() => selectBuildings(saveGame), [saveGame]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("name-asc");
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(
    null,
  );
  const deferredQuery = useDeferredValue(query);
  const selectedBuilding = useMemo(
    () =>
      selectedBuildingId === null
        ? null
        : (buildings.find((building) => building.id === selectedBuildingId) ??
          null),
    [buildings, selectedBuildingId],
  );

  const visibleBuildings = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    const filtered = needle
      ? buildings.filter(
          (building) =>
            building.type.toLowerCase().includes(needle) ||
            building.displayName.toLowerCase().includes(needle) ||
            building.customName?.toLowerCase().includes(needle) ||
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
      description="Edit confirmed independent fields and inspect the linked runtime state of completed buildings."
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
          <BuildingCard
            key={building.id}
            building={building}
            onEdit={setSelectedBuildingId}
          />
        ))}
      </div>
      <BuildingEditorDialog
        key={selectedBuilding?.id ?? "closed"}
        building={selectedBuilding}
        onClose={() => setSelectedBuildingId(null)}
        onNameChange={updateBuildingName}
        onPriorityChange={updateBuildingPriority}
      />
    </BrowseListShell>
  );
}
