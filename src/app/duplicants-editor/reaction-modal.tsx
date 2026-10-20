"use client";

import { useMemo, useState } from "react";
import {
  OVERJOYED_TRAIT_IDS,
  STRESS_REACTION_TRAIT_IDS,
  getAllKnownTraits,
  getTraitDisplayName,
  getTraitDescription,
  normalizeTraitId,
  isBionicTraitId,
  splitTraitsByReaction,
} from "@/lib/oni/trait-names";
import type { TraitCategory } from "@/lib/oni/trait-names";
import M3Dialog from "@/components/ui/m3-dialog";
import M3OutlinedButton from "@/components/ui/m3-outlined-button";

export type ReactionKind = "overjoyed" | "stress" | "add-traits";

// Common shape rendered in the reaction/add-traits modal list. Reaction options
// carry only id/name/description; addable traits also carry isOwned.
type ReactionTraitOption = {
  id: string;
  name: string;
  description: string;
  isOwned?: boolean;
};

type ReactionModalProps = {
  kind: ReactionKind | null;
  onClose: () => void;
  traits: string[];
  addTraitCategory: string;
  onCategoryChange: (category: string) => void;
  onAddTrait: (traitId: string) => void;
  onSetCategoryTraits: (traitIds: string[], enabled: boolean) => void;
  onApplyReaction: (kind: ReactionKind, traitId: string) => void;
  isBionic: boolean;
};

const ADD_TRAIT_CATEGORIES: Array<{
  id: TraitCategory;
  label: string;
  outline: string;
  surface: string;
  activeSurface: string;
}> = [
  {
    id: "positive",
    label: "Positive",
    outline: "var(--trait-positive-outline)",
    surface: "var(--trait-positive-surface)",
    activeSurface: "var(--trait-positive-surface-strong)",
  },
  {
    id: "universal",
    label: "General",
    outline: "var(--trait-general-outline)",
    surface: "var(--trait-general-surface)",
    activeSurface: "var(--trait-general-surface-strong)",
  },
  {
    id: "negative",
    label: "Negative",
    outline: "var(--trait-negative-outline)",
    surface: "var(--trait-negative-surface)",
    activeSurface: "var(--trait-negative-surface-strong)",
  },
];

export default function ReactionModal({
  kind,
  onClose,
  traits,
  addTraitCategory,
  onCategoryChange,
  onAddTrait,
  onSetCategoryTraits,
  onApplyReaction,
  isBionic,
}: ReactionModalProps) {
  const [traitQuery, setTraitQuery] = useState("");
  const { overjoyedReactions, stressReactions } = splitTraitsByReaction(traits);
  const selectedOverjoyedId = normalizeTraitId(overjoyedReactions[0]);
  const selectedStressId = normalizeTraitId(stressReactions[0]);

  const eligibleOverjoyedTraits = useMemo(() => {
    return [...OVERJOYED_TRAIT_IDS]
      .filter((traitId) => isBionicTraitId(traitId) === isBionic)
      .map((traitId) => ({
        id: traitId,
        name: getTraitDisplayName(traitId),
        description: getTraitDescription(traitId),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [isBionic]);

  const eligibleStressTraits = useMemo(() => {
    return [...STRESS_REACTION_TRAIT_IDS]
      .filter((traitId) => isBionicTraitId(traitId) === isBionic)
      .map((traitId) => ({
        id: traitId,
        name: getTraitDisplayName(traitId),
        description: getTraitDescription(traitId),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [isBionic]);

  const knownAddableTraits = useMemo(
    () =>
      getAllKnownTraits()
        .filter((trait) => isBionicTraitId(trait.id) === isBionic)
        .filter(
          (trait) =>
            !OVERJOYED_TRAIT_IDS.has(trait.id) &&
            !STRESS_REACTION_TRAIT_IDS.has(trait.id),
        ),
    [isBionic],
  );

  const categoryStats = useMemo(() => {
    const ownedTraitIds = new Set(traits.map(normalizeTraitId));
    return Object.fromEntries(
      ADD_TRAIT_CATEGORIES.map((category) => {
        const traitIds = knownAddableTraits
          .filter((trait) => trait.category === category.id)
          .map((trait) => trait.id);
        return [
          category.id,
          {
            traitIds,
            ownedCount: traitIds.filter((id) => ownedTraitIds.has(id)).length,
          },
        ];
      }),
    ) as Record<TraitCategory, { traitIds: string[]; ownedCount: number }>;
  }, [knownAddableTraits, traits]);

  const addableTraits = useMemo(() => {
    const ownedTraitIds = new Set(traits.map(normalizeTraitId));
    const normalizedQuery = traitQuery.trim().toLocaleLowerCase();
    return knownAddableTraits
      .filter((trait) => trait.category === addTraitCategory)
      .filter(
        (trait) =>
          !normalizedQuery ||
          trait.name.toLocaleLowerCase().includes(normalizedQuery) ||
          trait.description.toLocaleLowerCase().includes(normalizedQuery),
      )
      .map((trait) => ({
        ...trait,
        isOwned: ownedTraitIds.has(trait.id),
      }));
  }, [addTraitCategory, knownAddableTraits, traitQuery, traits]);

  if (!kind) {
    return null;
  }

  const options: ReactionTraitOption[] =
    kind === "overjoyed"
      ? eligibleOverjoyedTraits
      : kind === "stress"
        ? eligibleStressTraits
        : addableTraits;
  const activeCategory =
    ADD_TRAIT_CATEGORIES.find((category) => category.id === addTraitCategory) ??
    ADD_TRAIT_CATEGORIES[0];
  const activeCategoryStats = categoryStats[activeCategory.id];
  const allCategoryTraitsOwned =
    activeCategoryStats.traitIds.length > 0 &&
    activeCategoryStats.ownedCount === activeCategoryStats.traitIds.length;
  const closeModal = () => {
    setTraitQuery("");
    onClose();
  };

  return (
    <M3Dialog
      open
      onClose={closeModal}
      labelledBy="reaction-modal-title"
      className={`flex w-full flex-col overflow-hidden p-4 ${
        kind === "add-traits"
          ? "h-[90vh] max-h-[48rem] max-w-4xl"
          : "max-h-[88vh] max-w-2xl"
      }`}
    >
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 id="reaction-modal-title" className="text-base font-semibold">
            {kind === "overjoyed"
              ? "Choose overjoyed response"
              : kind === "stress"
                ? "Choose stress reaction"
                : "Add trait"}
          </h3>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {kind === "add-traits"
              ? "Browse traits by category or search by name"
              : kind === "overjoyed"
                ? "Select this duplicant's response to high morale"
                : "Select this duplicant's reaction at maximum stress"}
          </p>
        </div>
        <M3OutlinedButton
          onClick={closeModal}
          className="shrink-0 px-3 py-1.5 text-sm"
        >
          Close
        </M3OutlinedButton>
      </div>
      {kind === "add-traits" ? (
        <div className="mt-3 shrink-0">
          <div
            role="group"
            aria-label="Trait category"
            className="grid grid-cols-3 gap-2"
          >
            {ADD_TRAIT_CATEGORIES.map((category) => {
              const isActive = addTraitCategory === category.id;
              const stats = categoryStats[category.id];
              return (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onCategoryChange(category.id)}
                  className="m3-button-outlined flex min-h-11 flex-wrap items-center justify-center gap-x-2 rounded-lg px-2 py-2 text-sm font-semibold transition-colors"
                  style={
                    isActive
                      ? {
                          background: category.activeSurface,
                          borderColor: category.outline,
                          boxShadow: "inset 0 -2px var(--accent)",
                        }
                      : undefined
                  }
                >
                  <span>{category.label}</span>
                  <span className="text-xs font-normal tabular-nums text-[var(--muted)]">
                    {stats.ownedCount}/{stats.traitIds.length}
                    <span className="sr-only"> owned</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label htmlFor="trait-search" className="sr-only">
              Search traits
            </label>
            <input
              id="trait-search"
              type="search"
              value={traitQuery}
              onChange={(event) => setTraitQuery(event.target.value)}
              placeholder="Search traits"
              className="min-w-0 basis-40 flex-1 m3-field px-3 py-2 text-sm"
            />
            <M3OutlinedButton
              disabled={activeCategoryStats.traitIds.length === 0}
              onClick={() =>
                onSetCategoryTraits(
                  activeCategoryStats.traitIds,
                  !allCategoryTraitsOwned,
                )
              }
              className="shrink-0 px-3 py-2 text-xs"
              aria-label={`${allCategoryTraitsOwned ? "Remove" : "Add"} all ${activeCategory.label.toLocaleLowerCase()} traits`}
            >
              {allCategoryTraitsOwned ? "Remove all" : "Add all"}{" "}
              {activeCategory.label.toLocaleLowerCase()}
            </M3OutlinedButton>
          </div>
          <p
            role="status"
            className="mt-2 text-xs tabular-nums text-[var(--muted)]"
          >
            {options.length} results
          </p>
        </div>
      ) : null}
      <div
        tabIndex={0}
        role="region"
        aria-label="Traits"
        className="m3-scrollbar m3-vertical-scroll mt-3 min-h-0 flex-1 pr-1"
      >
        <div
          className={
            kind === "add-traits"
              ? "grid items-start gap-2 sm:grid-cols-2 lg:grid-cols-3"
              : "grid items-start gap-2 sm:grid-cols-2"
          }
        >
          {options.length === 0 ? (
            <div className="m3-panel col-span-full p-3 text-sm text-[var(--muted)]">
              No matching traits
            </div>
          ) : null}
          {options.map((trait) => {
            if (kind === "add-traits") {
              return (
                <button
                  key={trait.id}
                  type="button"
                  onClick={() => onAddTrait(trait.id)}
                  disabled={trait.isOwned}
                  className="m3-button-outlined w-full rounded-lg px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed"
                  style={{
                    background: trait.isOwned
                      ? "var(--surface-container-low)"
                      : activeCategory.surface,
                    borderColor: trait.isOwned
                      ? "var(--outline)"
                      : activeCategory.outline,
                    opacity: 1,
                  }}
                >
                  <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                    <span>{trait.name}</span>
                    {trait.isOwned ? (
                      <span className="shrink-0 text-xs font-medium">
                        Owned
                      </span>
                    ) : null}
                  </span>
                  {trait.description ? (
                    <span className="mt-1 block text-xs leading-relaxed text-[var(--muted)]">
                      {trait.description}
                    </span>
                  ) : null}
                </button>
              );
            }
            const normalizedTraitId = normalizeTraitId(trait.id);
            const isSelected =
              (kind === "overjoyed"
                ? selectedOverjoyedId
                : selectedStressId) === normalizedTraitId;
            return (
              <button
                key={trait.id}
                type="button"
                disabled={isSelected}
                onClick={() => onApplyReaction(kind, trait.id)}
                className="m3-button-outlined w-full rounded-lg px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed"
                style={{
                  ...(isSelected
                    ? {
                        background: "var(--trait-positive-surface-strong)",
                        borderColor: "var(--trait-positive-outline)",
                      }
                    : {}),
                  opacity: 1,
                }}
              >
                <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                  <span>{trait.name}</span>
                  {isSelected ? (
                    <span className="shrink-0 text-xs font-medium">
                      Current
                    </span>
                  ) : null}
                </span>
                {trait.description ? (
                  <span className="mt-1 block text-xs leading-relaxed text-[var(--muted)]">
                    {trait.description}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </M3Dialog>
  );
}
