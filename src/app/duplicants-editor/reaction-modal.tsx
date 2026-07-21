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
  onApplyReaction: (kind: ReactionKind, traitId: string) => void;
  isBionic: boolean;
};

const ADD_TRAIT_CATEGORIES: Array<{
  id: TraitCategory;
  label: string;
  tabClass: string;
  activeTabClass: string;
  itemClass: string;
}> = [
  {
    id: "positive",
    label: "Positive",
    tabClass:
      "border-[var(--trait-positive-outline)] bg-[var(--trait-positive-surface)]",
    activeTabClass:
      "border-[var(--trait-positive-outline)] bg-[var(--trait-positive-surface-strong)]",
    itemClass:
      "border-[var(--trait-positive-outline)] bg-[var(--trait-positive-surface)]",
  },
  {
    id: "universal",
    label: "General",
    tabClass:
      "border-[var(--trait-general-outline)] bg-[var(--trait-general-surface)]",
    activeTabClass:
      "border-[var(--trait-general-outline)] bg-[var(--trait-general-surface-strong)]",
    itemClass:
      "border-[var(--trait-general-outline)] bg-[var(--trait-general-surface)]",
  },
  {
    id: "negative",
    label: "Negative",
    tabClass:
      "border-[var(--trait-negative-outline)] bg-[var(--trait-negative-surface)]",
    activeTabClass:
      "border-[var(--trait-negative-outline)] bg-[var(--trait-negative-surface-strong)]",
    itemClass:
      "border-[var(--trait-negative-outline)] bg-[var(--trait-negative-surface)]",
  },
];

export default function ReactionModal({
  kind,
  onClose,
  traits,
  addTraitCategory,
  onCategoryChange,
  onAddTrait,
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

  const categoryCounts = useMemo(() => {
    return Object.fromEntries(
      ADD_TRAIT_CATEGORIES.map((category) => [
        category.id,
        knownAddableTraits.filter((trait) => trait.category === category.id)
          .length,
      ]),
    ) as Record<TraitCategory, number>;
  }, [knownAddableTraits]);

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
  const closeModal = () => {
    setTraitQuery("");
    onClose();
  };

  return (
    <M3Dialog
      open
      onClose={closeModal}
      labelledBy="reaction-modal-title"
      className={`flex w-full flex-col overflow-hidden p-5 ${
        kind === "add-traits"
          ? "h-[90vh] max-h-[48rem] max-w-3xl"
          : "max-h-[88vh] max-w-xl"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 id="reaction-modal-title" className="text-xl font-semibold">
            {kind === "overjoyed"
              ? "Choose Overjoyed Response"
              : kind === "stress"
                ? "Choose Stress Reaction"
                : "Add trait"}
          </h3>
          <p className="mt-1 text-xs opacity-60">
            {kind === "add-traits"
              ? "Browse traits by category or search by name"
              : kind === "overjoyed"
                ? "Select this Duplicant's response to high morale"
                : "Select this Duplicant's reaction at maximum stress"}
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
        <div className="mt-4">
          <div
            role="group"
            aria-label="Trait category"
            className="grid grid-cols-3 gap-2"
          >
            {ADD_TRAIT_CATEGORIES.map((category) => {
              const isActive = addTraitCategory === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onCategoryChange(category.id)}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors ${
                    isActive ? category.activeTabClass : category.tabClass
                  }`}
                >
                  <span className="block">{category.label}</span>
                  <span className="mt-0.5 block text-xs font-normal opacity-70">
                    {categoryCounts[category.id]} traits
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
              className="min-w-0 flex-1 m3-field px-3 py-2 text-sm"
            />
            <span className="text-xs tabular-nums opacity-60">
              {options.length} results
            </span>
          </div>
        </div>
      ) : null}
      <div className="m3-scrollbar m3-vertical-scroll mt-4 min-h-0 flex-1 pr-2">
        <div
          className={
            kind === "add-traits"
              ? "grid gap-2 md:grid-cols-2"
              : "flex flex-col gap-2"
          }
        >
          {options.length === 0 ? (
            <div className="m3-panel p-4 text-sm opacity-65 md:col-span-2">
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
                  className={`min-h-24 w-full rounded-xl border px-4 py-3 text-left text-[var(--foreground)] transition-colors ${
                    trait.isOwned
                      ? "cursor-not-allowed border-[var(--outline)] bg-[var(--surface-container-high)] opacity-65"
                      : `${activeCategory.itemClass} hover:bg-[var(--state-hover)]`
                  }`}
                >
                  <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                    <span>{trait.name}</span>
                    {trait.isOwned ? (
                      <span className="text-xs font-bold">Owned</span>
                    ) : null}
                  </span>
                  {trait.description ? (
                    <span className="mt-1.5 block text-xs leading-5 opacity-65">
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
                className={`w-full rounded-xl border px-4 py-3 text-left text-[var(--foreground)] transition-colors disabled:opacity-100 ${
                  isSelected
                    ? "cursor-not-allowed border-[var(--trait-positive-outline)] bg-[var(--trait-positive-surface-strong)]"
                    : "border-[var(--trait-general-outline)] bg-[var(--trait-general-surface)] hover:bg-[var(--state-hover)]"
                }`}
              >
                <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                  <span>{trait.name}</span>
                  {isSelected ? (
                    <span className="text-xs font-bold">Current</span>
                  ) : null}
                </span>
                {trait.description ? (
                  <span className="mt-1.5 block text-xs leading-5 opacity-65">
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
