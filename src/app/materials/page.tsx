"use client";

import {
  memo,
  useCallback,
  useDeferredValue,
  useId,
  useMemo,
  useState,
} from "react";
import BrowseListShell from "@/components/ui/browse-list-shell";
import M3OutlinedButton from "@/components/ui/m3-outlined-button";
import M3Dialog from "@/components/ui/m3-dialog";
import {
  selectLooseMaterials,
  type LooseMaterial,
} from "@/lib/oni/save-selectors";
import { useSaveSession } from "@/lib/save-session/save-session-context";
import { useBrowseState } from "@/lib/use-browse-state";

function formatMass(kg: number): string {
  if (!Number.isFinite(kg)) {
    return "0 kg";
  }
  if (kg >= 1000) {
    return `${(kg / 1000).toLocaleString(undefined, {
      maximumFractionDigits: 1,
    })} t`;
  }
  return `${kg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`;
}

function formatTemperature(kelvin: number): string {
  if (!Number.isFinite(kelvin) || kelvin === 0) {
    return "n/a";
  }
  return `${(kelvin - 273.15).toLocaleString(undefined, {
    maximumFractionDigits: 1,
  })} °C`;
}

type ConfirmButtonProps = {
  label: string;
  confirmLabel: string;
  description: string;
  onConfirm: () => void;
  disabled?: boolean;
};

function ConfirmButton({
  label,
  confirmLabel,
  description,
  onConfirm,
  disabled,
}: ConfirmButtonProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  if (disabled) {
    return null;
  }

  return (
    <>
      <M3OutlinedButton
        className="inline-flex shrink-0 items-center justify-center px-4 py-2 text-sm"
        onClick={() => setOpen(true)}
      >
        {label}
      </M3OutlinedButton>
      <M3Dialog
        open={open}
        onClose={() => setOpen(false)}
        role="alertdialog"
        labelledBy={titleId}
        describedBy={descriptionId}
        className="w-full max-w-md p-5"
      >
        <h2 id={titleId} className="text-lg font-semibold">
          {confirmLabel}?
        </h2>
        <p
          id={descriptionId}
          className="mt-3 text-sm leading-relaxed opacity-80"
        >
          {description}
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <M3OutlinedButton
            onClick={() => setOpen(false)}
            className="px-4 py-2 text-sm"
          >
            Cancel
          </M3OutlinedButton>
          <M3OutlinedButton
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
            className="border-[var(--error)] px-4 py-2 text-sm text-[var(--error)]"
          >
            {confirmLabel}
          </M3OutlinedButton>
        </div>
      </M3Dialog>
    </>
  );
}

type MaterialCardProps = {
  material: LooseMaterial;
  onDelete: (materialType: string) => void;
};

const MaterialCard = memo(function MaterialCard({
  material,
  onDelete,
}: MaterialCardProps) {
  return (
    <article className="flex min-w-0 items-center justify-between gap-3 border-b border-[var(--outline-faint)] px-1 py-3">
      <div className="min-w-0">
        <h2 className="break-words text-base font-semibold">
          {material.materialType}
        </h2>
        <p className="mt-1 text-xs opacity-75">
          {material.count.toLocaleString()} piles,{" "}
          {formatMass(material.totalMass)},{" "}
          {formatTemperature(material.averageTemperature)} avg
        </p>
      </div>
      <ConfirmButton
        label="Delete"
        confirmLabel={`Delete ${material.count.toLocaleString()} ${material.count === 1 ? "pile" : "piles"}`}
        description={`Remove all ${material.materialType} debris from this save, totaling ${formatMass(material.totalMass)}. Stored and built materials are unchanged. You can undo this change.`}
        onConfirm={() => onDelete(material.materialType)}
      />
    </article>
  );
});

const SORT_OPTIONS = [
  { value: "name-asc", label: "Name A to Z" },
  { value: "name-desc", label: "Name Z to A" },
  { value: "mass-desc", label: "Mass high to low" },
  { value: "piles-desc", label: "Piles high to low" },
];

export default function MaterialsPage() {
  const { hasSave, saveGame, deleteLooseMaterial } = useSaveSession();
  const materials = useMemo(() => selectLooseMaterials(saveGame), [saveGame]);
  const totalPiles = useMemo(
    () => materials.reduce((sum, material) => sum + material.count, 0),
    [materials],
  );
  const { query, setQuery, sort, setSort } = useBrowseState(
    "materials",
    "name-asc",
  );
  const deferredQuery = useDeferredValue(query);
  // Stable so the memoized cards aren't invalidated on filter/sort re-renders.
  const handleDeleteMaterial = useCallback(
    (materialType: string) => {
      void deleteLooseMaterial(materialType);
    },
    [deleteLooseMaterial],
  );

  const visibleMaterials = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    const filtered = needle
      ? materials.filter((material) =>
          material.materialType.toLowerCase().includes(needle),
        )
      : materials;
    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "name-desc":
          return b.materialType.localeCompare(a.materialType);
        case "mass-desc":
          return b.totalMass - a.totalMass;
        case "piles-desc":
          return b.count - a.count;
        case "name-asc":
        default:
          return a.materialType.localeCompare(b.materialType);
      }
    });
  }, [materials, deferredQuery, sort]);

  return (
    <BrowseListShell
      hasSave={hasSave}
      title="Loose materials"
      saveRequiredTitle="Materials"
      description={
        <>
          {materials.length} material type
          {materials.length === 1 ? "" : "s"}, {totalPiles.toLocaleString()}{" "}
          loose piles. Deleting removes debris piles lying on the ground. Stored
          and built materials are not affected.
        </>
      }
      headerActions={
        materials.length > 0 ? (
          <ConfirmButton
            label="Delete all loose materials"
            confirmLabel={`Delete all ${totalPiles.toLocaleString()} piles`}
            description="Remove every loose material pile in the save, including materials hidden by your search. Stored and built materials are unchanged. You can undo this change."
            onConfirm={() => {
              void deleteLooseMaterial();
            }}
          />
        ) : null
      }
      saveRequiredDescription="Load a save first to review and delete loose material debris."
      emptyMessage="No loose materials found in this save."
      search={{
        value: query,
        onChange: setQuery,
        placeholder: "Find a material by name",
        ariaLabel: "Search materials by name",
      }}
      sort={{
        value: sort,
        onChange: setSort,
        options: SORT_OPTIONS,
        ariaLabel: "Sort materials",
      }}
      totalCount={materials.length}
      resultCount={visibleMaterials.length}
      noMatchLabel="materials"
      deferredQuery={deferredQuery}
    >
      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {visibleMaterials.map((material) => (
          <MaterialCard
            key={material.materialType}
            material={material}
            onDelete={handleDeleteMaterial}
          />
        ))}
      </div>
    </BrowseListShell>
  );
}
