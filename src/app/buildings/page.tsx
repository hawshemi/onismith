"use client";

import { memo, useDeferredValue, useMemo, useState } from "react";
import { FaBuilding } from "react-icons/fa6";
import BrowseListShell from "@/components/ui/browse-list-shell";
import M3Dialog from "@/components/ui/m3-dialog";
import M3OutlinedButton from "@/components/ui/m3-outlined-button";
import M3TonalButton from "@/components/ui/m3-tonal-button";
import { useSaveSession } from "@/lib/save-session/save-session-context";
import { selectBuildings, type Building } from "@/lib/oni/save-selectors";
import { useBrowseState } from "@/lib/use-browse-state";
import { NumberField } from "@/components/ui/numeric-fields";

const PAGE_SIZE = 100;

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
  const canEdit = building.customName !== null;
  const savedName = building.customName
    ? readableSavedName(building.customName)
    : null;
  return (
    <article className="min-w-0 border-b border-[var(--outline-faint)] px-4 py-3 last:border-b-0 sm:px-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-container)] text-[var(--muted)]">
          <FaBuilding aria-hidden="true" className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-base font-semibold leading-snug">
            {savedName ?? building.displayName}
          </h2>
          {savedName && savedName !== building.displayName ? (
            <p className="mt-1 break-words text-sm text-[var(--muted)]">
              {building.displayName}
            </p>
          ) : null}
          <p className="mt-1 text-sm text-[var(--muted)] tabular-nums">
            X {building.position.x.toFixed(1)}, Y{" "}
            {building.position.y.toFixed(1)}
          </p>
        </div>
        {canEdit ? (
          <M3OutlinedButton
            className="min-h-11 shrink-0 px-4 py-2 text-sm"
            onClick={() => onEdit(building.id)}
            aria-label={`Rename ${savedName ?? building.displayName}`}
          >
            Rename
          </M3OutlinedButton>
        ) : (
          <span className="shrink-0 text-sm text-[var(--muted)]">
            Read-only
          </span>
        )}
      </div>
      <details className="mt-1 sm:ml-[3.25rem]">
        <summary className="w-fit cursor-pointer py-2 text-sm text-[var(--muted)]">
          Technical details
        </summary>
        <p className="mt-1 break-all text-sm text-[var(--muted)]">
          ID {building.id} <code>{building.type}</code>
        </p>
        <p className="mt-2 text-sm text-[var(--muted)] tabular-nums">
          Z position {building.position.z.toFixed(1)}
        </p>
        {building.opaqueStateBytes > 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">
            {building.opaqueStateBytes.toLocaleString()} bytes of runtime state
            are preserved without editing.
          </p>
        ) : null}
      </details>
    </article>
  );
});

type BuildingEditorDialogProps = {
  building: Building | null;
  onClose: () => void;
  onNameChange: (buildingId: number, name: string) => void;
};

function BuildingEditorDialog({
  building,
  onClose,
  onNameChange,
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
        Change this building&apos;s name in your save.
      </p>

      <div className="mt-5">
        {building.customName !== null ? (
          <form
            className="grid gap-1.5"
            onSubmit={(event) => {
              event.preventDefault();
              if (nextName && nextName !== currentName) {
                onNameChange(building.id, nextName);
                onClose();
              }
            }}
          >
            <label
              htmlFor="building-custom-name"
              className="text-sm font-medium"
            >
              Custom name
            </label>
            <input
              id="building-custom-name"
              value={nameDraft}
              maxLength={64}
              onChange={(event) => setNameDraft(event.target.value)}
              className="m3-field min-h-11 w-full min-w-0 px-3 py-2 text-base"
            />
            <div className="sticky bottom-0 mt-4 flex flex-wrap justify-end gap-2 bg-[var(--surface-container)] py-2">
              <M3OutlinedButton
                className="min-h-11 px-4 py-2 text-sm"
                onClick={onClose}
              >
                Cancel
              </M3OutlinedButton>
              <M3TonalButton
                type="submit"
                disabled={!nextName || nextName === currentName}
                className="min-h-11 px-4 py-2 text-sm"
              >
                Apply name
              </M3TonalButton>
            </div>
          </form>
        ) : null}
      </div>
    </M3Dialog>
  );
}

export default function BuildingsPage() {
  const { saveGame, hasSave, updateBuildingName } = useSaveSession();
  const buildings = useMemo(() => selectBuildings(saveGame), [saveGame]);
  const { query, setQuery, sort, setSort, filter, setFilter, page, setPage } =
    useBrowseState("buildings", "name-asc");
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
    const typeNeedle = needle.replace(/\s+/g, "");
    const filtered = buildings.filter(
      (building) =>
        (filter !== "editable" || building.customName !== null) &&
        (!needle ||
          building.type.toLowerCase().includes(typeNeedle) ||
          building.displayName.toLowerCase().includes(needle) ||
          building.customName?.toLowerCase().includes(needle) ||
          String(building.id).includes(needle)),
    );
    return filtered.sort((a, b) => {
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
  }, [buildings, deferredQuery, sort, filter]);

  const pageCount = Math.max(1, Math.ceil(visibleBuildings.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const changePage = (nextPage: number) => {
    setPage(nextPage);
    document.getElementById("main-content")?.scrollTo({ top: 0 });
  };
  const pagination =
    pageCount > 1 ? (
      <nav
        aria-label="Building pages"
        className="flex flex-wrap items-center justify-end gap-3 text-sm"
      >
        <span className="mr-auto text-[var(--muted)]">
          {(pageStart + 1).toLocaleString()}–
          {Math.min(
            pageStart + PAGE_SIZE,
            visibleBuildings.length,
          ).toLocaleString()}{" "}
          of {visibleBuildings.length.toLocaleString()}
        </span>
        <M3OutlinedButton
          disabled={currentPage === 1}
          onClick={() => changePage(currentPage - 1)}
          className="min-h-11 px-3 py-2"
        >
          Previous
        </M3OutlinedButton>
        <label className="flex items-center gap-2">
          Page
          <NumberField
            aria-label="Building page"
            value={currentPage}
            min={1}
            max={pageCount}
            step={1}
            onCommit={(value) => changePage(Math.trunc(value))}
            className="m3-field min-h-11 w-20 px-2 py-2"
          />
          of {pageCount.toLocaleString()}
        </label>
        <M3OutlinedButton
          disabled={currentPage === pageCount}
          onClick={() => changePage(currentPage + 1)}
          className="min-h-11 px-3 py-2"
        >
          Next
        </M3OutlinedButton>
      </nav>
    ) : null;

  return (
    <BrowseListShell
      hasSave={hasSave}
      title="Buildings"
      description="Find completed buildings and rename those that support custom names."
      filters={
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={filter === "editable"}
            onChange={(event) =>
              setFilter(event.target.checked ? "editable" : "")
            }
            className="h-4 w-4 accent-[var(--accent)]"
          />
          Editable only
        </label>
      }
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
      {pagination}
      <div className="m3-card overflow-hidden">
        {visibleBuildings
          .slice(pageStart, pageStart + PAGE_SIZE)
          .map((building) => (
            <BuildingCard
              key={building.id}
              building={building}
              onEdit={setSelectedBuildingId}
            />
          ))}
      </div>
      {pagination}
      <BuildingEditorDialog
        key={selectedBuilding?.id ?? "closed"}
        building={selectedBuilding}
        onClose={() => setSelectedBuildingId(null)}
        onNameChange={updateBuildingName}
      />
    </BrowseListShell>
  );
}
