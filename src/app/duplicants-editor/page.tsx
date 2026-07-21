"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import SaveRequiredPage from "@/components/save-required-page";
import { useSaveSession } from "@/lib/save-session/save-session-context";
import {
  selectDuplicantEditorModel,
  selectDuplicants,
} from "@/lib/oni/save-selectors";
import type { DuplicantEditorModel } from "@/lib/oni/save-selectors";
import { readStoredHairOffsets } from "@/lib/oni/hair-offsets";
import { useSyncOnChange } from "@/lib/use-sync-on-change";
import M3Select from "@/components/ui/m3-select";
import M3TonalButton from "@/components/ui/m3-tonal-button";
import M3OutlinedButton from "@/components/ui/m3-outlined-button";
import { getSkillGroupDisplayName } from "@/lib/oni/minion-interests";
import {
  OVERJOYED_TRAIT_IDS,
  STRESS_REACTION_TRAIT_IDS,
  getTraitCategory,
  getTraitDisplayName,
  normalizeTraitId,
  splitTraitsByReaction,
} from "@/lib/oni/trait-names";
import AppearanceModal from "./appearance-modal";
import ReactionModal from "./reaction-modal";
import DuplicantStatsEditor from "./duplicant-stats-editor";
import DuplicantActionsPanel from "@/components/duplicant-actions-panel";
import type { ReactionKind } from "./reaction-modal";
import { getAccessorySrc, getHairAdjustments } from "./appearance";

const MAX_NAME_LENGTH = 64;
const OVERVIEW_PORTRAIT_SCALE = 0.65;
const OVERVIEW_PORTRAIT_OFFSET_Y = 24;

type TraitGroupCardProps = {
  label: string;
  traits: string[];
  tone: "positive" | "universal" | "negative";
  onRemove: (traitId: string) => void;
};

const TRAIT_TONE_STYLES = {
  positive: {
    card: "border-[var(--trait-positive-outline)] bg-[var(--trait-positive-surface)]",
    item: "border-[var(--trait-positive-outline)] bg-[var(--trait-positive-surface)]",
  },
  universal: {
    card: "border-[var(--trait-general-outline)] bg-[var(--trait-general-surface)]",
    item: "border-[var(--trait-general-outline)] bg-[var(--trait-general-surface)]",
  },
  negative: {
    card: "border-[var(--trait-negative-outline)] bg-[var(--trait-negative-surface)]",
    item: "border-[var(--trait-negative-outline)] bg-[var(--trait-negative-surface)]",
  },
} as const;

function TraitGroupCard({
  label,
  traits,
  tone,
  onRemove,
}: TraitGroupCardProps) {
  const sortedTraits = [...traits].sort((left, right) =>
    getTraitDisplayName(left).localeCompare(getTraitDisplayName(right)),
  );
  const toneStyles = TRAIT_TONE_STYLES[tone];

  return (
    <section
      className={`flex min-w-0 flex-col rounded-[0.875rem] border p-3 ${toneStyles.card}`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{label}</h3>
        <span className="text-xs tabular-nums opacity-70">
          {sortedTraits.length}
        </span>
      </div>
      <div className="m3-scrollbar m3-horizontal-scroll mt-3 pb-2">
        {sortedTraits.length === 0 ? (
          <p className="py-1 text-xs opacity-70">No traits in this category.</p>
        ) : (
          <div className="grid grid-flow-col grid-rows-4 items-start gap-2">
            {sortedTraits.map((trait) => {
              const displayName = getTraitDisplayName(trait);
              return (
                <M3OutlinedButton
                  key={trait}
                  onClick={() => onRemove(trait)}
                  className={`inline-flex w-max max-w-56 items-center gap-2 px-3 py-1.5 text-left text-xs ${toneStyles.item}`}
                  title={`Remove ${displayName}`}
                  aria-label={`Remove ${displayName}`}
                >
                  <span className="min-w-0 break-words">{displayName}</span>
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-sm opacity-65"
                  >
                    ×
                  </span>
                </M3OutlinedButton>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function DuplicantEditorFallback() {
  return (
    <section className="m3-card p-5">
      <h2 className="text-2xl font-semibold">Duplicant Editor</h2>
      <p className="mt-2 text-sm opacity-80">Loading editor</p>
    </section>
  );
}

function DuplicantEditorPageContent() {
  const searchParams = useSearchParams();
  const {
    saveGame,
    hasSave,
    selectedDuplicantId,
    setSelectedDuplicantId,
    modifyBehavior,
    updateDuplicantName,
    addDuplicantTrait,
    removeDuplicantTrait,
    addDuplicantInterest,
    removeDuplicantInterest,
    updateDuplicantAppearance,
    updateDuplicantGender,
  } = useSaveSession();

  const duplicants = useMemo(() => selectDuplicants(saveGame), [saveGame]);
  const fallbackId = duplicants[0]?.id ?? null;
  const requestedIdParam = searchParams.get("id");
  const requestedId =
    requestedIdParam === null ? null : Number(requestedIdParam);
  const hasValidRequestedId =
    requestedIdParam !== null && Number.isFinite(requestedId);
  const requestedExists =
    hasValidRequestedId && duplicants.some((dup) => dup.id === requestedId);

  const activeId = hasValidRequestedId
    ? requestedExists
      ? requestedId
      : null
    : Number.isFinite(selectedDuplicantId) &&
        duplicants.some((dup) => dup.id === selectedDuplicantId)
      ? selectedDuplicantId
      : fallbackId;

  useEffect(() => {
    if (
      hasValidRequestedId &&
      requestedExists &&
      selectedDuplicantId !== requestedId
    ) {
      setSelectedDuplicantId(requestedId);
      return;
    }
    if (
      requestedIdParam === null &&
      !Number.isFinite(selectedDuplicantId) &&
      Number.isFinite(fallbackId)
    ) {
      setSelectedDuplicantId(fallbackId);
    }
  }, [
    fallbackId,
    hasValidRequestedId,
    requestedExists,
    requestedId,
    requestedIdParam,
    selectedDuplicantId,
    setSelectedDuplicantId,
  ]);

  const model = useMemo<DuplicantEditorModel | null>(
    // activeId may be null; the selector guards non-finite ids and returns null,
    // matching the prior untyped behavior.
    () => selectDuplicantEditorModel(saveGame, activeId as number),
    [activeId, saveGame],
  );

  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState("");
  const [addTraitCategory, setAddTraitCategory] = useState("positive");
  const [interestToAdd, setInterestToAdd] = useState("");
  const [hairOffsets] = useState(readStoredHairOffsets);
  const [appearanceModalOpen, setAppearanceModalOpen] = useState(false);
  const [appearanceEditorTab, setAppearanceEditorTab] = useState("head");
  const [reactionModal, setReactionModal] = useState<ReactionKind | null>(null);

  useSyncOnChange([model?.name, model?.id], () => {
    setNameDraft(model?.name || "");
    setNameError("");
  });

  useSyncOnChange([model?.availableInterests, model?.id], () => {
    const firstAvailable = model?.availableInterests?.[0] || "";
    setInterestToAdd(firstAvailable);
  });

  const genderOptions = useMemo(
    () => [
      { value: "FEMALE", label: "Female" },
      { value: "MALE", label: "Male" },
      { value: "NB", label: "Non-binary" },
    ],
    [],
  );

  // Cheap derived filters over a small trait array, computed inline rather than
  // memoized (the manual useMemo tripped react-hooks/preserve-manual-memoization).
  const modelTraits = model?.traits?.length ? model.traits : [];

  const { overjoyedReactions, stressReactions, nonReactionTraits } =
    splitTraitsByReaction(modelTraits);
  const traitGroups = [
    {
      id: "positive",
      label: "Positive traits",
      tone: "positive" as const,
      traits: nonReactionTraits.filter(
        (trait) => getTraitCategory(trait) === "positive",
      ),
    },
    {
      id: "universal",
      label: "General traits",
      tone: "universal" as const,
      traits: nonReactionTraits.filter(
        (trait) => getTraitCategory(trait) === "universal",
      ),
    },
    {
      id: "negative",
      label: "Negative traits",
      tone: "negative" as const,
      traits: nonReactionTraits.filter(
        (trait) => getTraitCategory(trait) === "negative",
      ),
    },
  ];

  const applyReactionTrait = (kind: ReactionKind, traitId: string) => {
    if (!model?.id || typeof traitId !== "string") {
      return;
    }
    const normalizedSelected = normalizeTraitId(traitId);
    const reactionSet =
      kind === "overjoyed" ? OVERJOYED_TRAIT_IDS : STRESS_REACTION_TRAIT_IDS;
    if (!reactionSet.has(normalizedSelected)) {
      return;
    }
    const currentTraits = Array.isArray(model?.traits) ? model.traits : [];
    const filteredTraits = currentTraits.filter(
      (current) => !reactionSet.has(normalizeTraitId(current)),
    );
    const nextTraitIds = [...filteredTraits, normalizedSelected];
    modifyBehavior(model.id, "Klei.AI.Traits", "templateData", {
      TraitIds: nextTraitIds,
    });
    setReactionModal(null);
  };

  const openReactionModal = useCallback((kind: ReactionKind) => {
    setReactionModal(kind);
    if (kind === "add-traits") {
      setAddTraitCategory("positive");
    }
  }, []);

  const closeReactionModal = useCallback(() => {
    setReactionModal(null);
  }, []);

  const openAppearanceModal = useCallback(() => {
    setAppearanceEditorTab("head");
    setAppearanceModalOpen(true);
  }, []);

  const closeAppearanceModal = useCallback(() => {
    setAppearanceModalOpen(false);
  }, []);

  if (!hasSave) {
    return (
      <SaveRequiredPage
        title="Duplicant Editor"
        description="Load a save first to edit duplicants."
      />
    );
  }

  if (requestedIdParam !== null && !hasValidRequestedId) {
    return (
      <section className="m3-card p-5">
        <h2 className="text-2xl font-semibold">Duplicant Not Found</h2>
        <p className="mt-2 text-sm opacity-80">
          Invalid duplicant ID in route query: <code>{requestedIdParam}</code>
        </p>
        <p className="mt-3 text-sm opacity-70">
          Open{" "}
          <Link href="/duplicants" className="underline">
            Duplicants
          </Link>{" "}
          and select a valid entry.
        </p>
      </section>
    );
  }

  if (hasValidRequestedId && !requestedExists) {
    return (
      <section className="m3-card p-5">
        <h2 className="text-2xl font-semibold">Duplicant Not Found</h2>
        <p className="mt-2 text-sm opacity-80">
          No duplicant with Game Object ID <code>{requestedId}</code> exists in
          this save.
        </p>
        <p className="mt-3 text-sm opacity-70">
          Open{" "}
          <Link href="/duplicants" className="underline">
            Duplicants
          </Link>{" "}
          and select an existing duplicant.
        </p>
      </section>
    );
  }

  if (!model) {
    return (
      <section className="m3-card p-5">
        <h2 className="text-2xl font-semibold">Duplicant Editor</h2>
        <p className="mt-2 text-sm opacity-80">
          No duplicant data found in this save.
        </p>
      </section>
    );
  }

  const onApplyName = () => {
    const nextName = nameDraft.trim();
    if (!nextName) {
      setNameError("Name cannot be empty.");
      return;
    }
    if (nextName.length > MAX_NAME_LENGTH) {
      setNameError(`Name cannot exceed ${MAX_NAME_LENGTH} characters.`);
      return;
    }
    updateDuplicantName(model.id, nextName);
    setNameError("");
  };

  const headshapeOrdinal = model.appearance?.headOrdinal ?? 1;
  const hairOrdinal = model.appearance?.hairOrdinal ?? 1;
  const eyesOrdinal = model.appearance?.eyesOrdinal ?? 1;
  const { rawOffsetX, rawOffsetY, rawScale } = getHairAdjustments(
    hairOrdinal,
    hairOffsets,
  );
  const overviewHairOffsetX = rawOffsetX * OVERVIEW_PORTRAIT_SCALE;
  const overviewHairOffsetY =
    rawOffsetY * OVERVIEW_PORTRAIT_SCALE + OVERVIEW_PORTRAIT_OFFSET_Y;
  const overviewHairScale = OVERVIEW_PORTRAIT_SCALE * rawScale;
  const genderDisplayName =
    genderOptions.find((option) => option.value === model.gender)?.label ||
    "Unknown gender";

  return (
    <section className="m3-page m3-page-flow">
      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(260px,0.72fr)_minmax(0,1.5fr)]">
        <section className="m3-card flex min-w-0 flex-col p-4">
          <div className="flex flex-1 flex-col items-center justify-center rounded-xl bg-[var(--surface-container-low)] p-4 text-center">
            <div
              role="img"
              aria-label={`${model.name} portrait`}
              className="relative h-36 w-36 overflow-hidden rounded-2xl border border-[var(--outline-faint)] bg-[var(--surface-container)]"
            >
              <Image
                fill
                src={getAccessorySrc("head", headshapeOrdinal)}
                alt=""
                className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                style={{
                  transform: `translateY(${OVERVIEW_PORTRAIT_OFFSET_Y}px) scale(${OVERVIEW_PORTRAIT_SCALE})`,
                  transformOrigin: "center",
                }}
                draggable={false}
              />
              <Image
                fill
                src={getAccessorySrc("hair", hairOrdinal)}
                alt=""
                className="pointer-events-none absolute left-1/2 top-1/2 h-full w-full object-contain"
                style={{
                  transform: `translate(calc(-50% + ${overviewHairOffsetX}px), calc(-50% + ${overviewHairOffsetY}px)) scale(${overviewHairScale})`,
                  transformOrigin: "center",
                }}
                draggable={false}
              />
            </div>
            <h2 className="mt-3 max-w-full truncate text-xl font-semibold">
              {model.name}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs opacity-60">
              <span>{genderDisplayName}</span>
              <span className="tabular-nums">ID {model.id}</span>
            </div>
          </div>

          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-[var(--surface-container-low)] px-2 py-2.5">
              <dt className="text-xs opacity-70">Traits</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">
                {modelTraits.length}
              </dd>
            </div>
            <div className="rounded-xl bg-[var(--surface-container-low)] px-2 py-2.5">
              <dt className="text-xs opacity-70">Interests</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">
                {model.interests.length}
              </dd>
            </div>
            <div className="rounded-xl bg-[var(--surface-container-low)] px-2 py-2.5">
              <dt className="text-xs opacity-70">Attributes</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">
                {model.attributes.length}
              </dd>
            </div>
          </dl>
        </section>

        <section className="m3-card min-w-0 p-4">
          <h2 className="text-lg font-semibold">Identity</h2>
          <div className="mt-4 grid items-end gap-4 sm:grid-cols-2">
            <label className="flex min-w-0 flex-col gap-1.5 text-sm sm:col-span-2">
              <span className="opacity-80">Name</span>
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={nameDraft}
                  onChange={(event) => setNameDraft(event.target.value)}
                  maxLength={MAX_NAME_LENGTH}
                  className="m3-field min-w-0 flex-1 px-3 py-2.5 text-sm"
                />
                <M3TonalButton
                  onClick={onApplyName}
                  className="shrink-0 px-4 py-2.5 text-sm"
                >
                  Apply Name
                </M3TonalButton>
              </div>
              {nameError ? (
                <p role="alert" className="mt-1 text-xs m3-error-text">
                  {nameError}
                </p>
              ) : null}
            </label>
            <label className="flex min-w-0 flex-col gap-1.5 text-sm">
              <span id="duplicant-gender-label" className="opacity-80">
                Gender
              </span>
              <M3Select
                aria-labelledby="duplicant-gender-label"
                value={model.gender || "FEMALE"}
                onChange={(event) =>
                  updateDuplicantGender(model.id, event.target.value)
                }
                className="m3-field w-full px-3 py-2.5 text-sm"
              >
                {genderOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </M3Select>
            </label>
            <div className="flex min-w-0 flex-col gap-1.5 text-sm">
              <span className="opacity-80">Appearance</span>
              <M3TonalButton
                onClick={openAppearanceModal}
                className="w-full px-4 py-2.5 text-sm"
              >
                Edit Appearance
              </M3TonalButton>
            </div>
          </div>
        </section>
      </div>

      <AppearanceModal
        open={appearanceModalOpen}
        onClose={closeAppearanceModal}
        modelId={model.id}
        headshapeOrdinal={headshapeOrdinal}
        hairOrdinal={hairOrdinal}
        eyesOrdinal={eyesOrdinal}
        hairOffsets={hairOffsets}
        tab={appearanceEditorTab}
        onTabChange={setAppearanceEditorTab}
        onUpdateAppearance={updateDuplicantAppearance}
      />

      <section className="m3-card p-4">
        <div>
          <h2 className="text-lg font-semibold">Reactions</h2>
          <p className="mt-0.5 text-xs opacity-60">
            Duplicant behaviors triggered by high morale or maximum stress
          </p>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="flex min-w-0 flex-col rounded-xl border border-[var(--trait-positive-outline)] bg-[var(--trait-positive-surface)] p-4">
            <div>
              <h3 className="text-base font-semibold">Overjoyed Response</h3>
              <p className="mt-1 text-xs opacity-60">
                Triggered by high morale
              </p>
            </div>
            <div className="mt-3 flex flex-1 flex-col rounded-xl bg-[var(--surface-container-low)] p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold opacity-60">
                  Current response
                </span>
                <M3OutlinedButton
                  onClick={() => openReactionModal("overjoyed")}
                  className="shrink-0 px-3 py-1.5 text-xs"
                  aria-label="Change overjoyed response"
                >
                  Change
                </M3OutlinedButton>
              </div>
              <div className="m3-scrollbar m3-horizontal-scroll mt-2 pb-2">
                {overjoyedReactions.length === 0 ? (
                  <p className="text-sm opacity-70">No response selected</p>
                ) : (
                  <div className="flex flex-nowrap gap-2">
                    {overjoyedReactions.map((reaction) => (
                      <span
                        key={reaction}
                        className="shrink-0 rounded-lg border border-[var(--trait-positive-outline)] bg-[var(--trait-positive-surface)] px-2.5 py-1.5 text-sm font-semibold"
                      >
                        {getTraitDisplayName(reaction)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-col rounded-xl border border-[var(--trait-negative-outline)] bg-[var(--trait-negative-surface)] p-4">
            <div>
              <h3 className="text-base font-semibold">Stress Reaction</h3>
              <p className="mt-1 text-xs opacity-60">
                Triggered at maximum stress
              </p>
            </div>
            <div className="mt-3 flex flex-1 flex-col rounded-xl bg-[var(--surface-container-low)] p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold opacity-60">
                  Current reaction
                </span>
                <M3OutlinedButton
                  onClick={() => openReactionModal("stress")}
                  className="shrink-0 px-3 py-1.5 text-xs"
                  aria-label="Change stress reaction"
                >
                  Change
                </M3OutlinedButton>
              </div>
              <div className="m3-scrollbar m3-horizontal-scroll mt-2 pb-2">
                {stressReactions.length === 0 ? (
                  <p className="text-sm opacity-70">No reaction selected</p>
                ) : (
                  <div className="flex flex-nowrap gap-2">
                    {stressReactions.map((reaction) => (
                      <span
                        key={reaction}
                        className="shrink-0 rounded-lg border border-[var(--trait-negative-outline)] bg-[var(--trait-negative-surface)] px-2.5 py-1.5 text-sm font-semibold"
                      >
                        {getTraitDisplayName(reaction)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="m3-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Traits</h2>
            <p className="mt-0.5 text-xs opacity-65">
              {nonReactionTraits.length} active trait
              {nonReactionTraits.length === 1 ? "" : "s"}
            </p>
          </div>
          <M3TonalButton
            onClick={() => openReactionModal("add-traits")}
            className="px-4 py-2 text-sm"
          >
            Add trait
          </M3TonalButton>
        </div>

        <div className="mt-3 grid items-start gap-3 md:grid-cols-2 lg:grid-cols-3">
          {traitGroups.map((group) => (
            <TraitGroupCard
              key={`${model.id}-${group.id}`}
              label={group.label}
              traits={group.traits}
              tone={group.tone}
              onRemove={(traitId) => removeDuplicantTrait(model.id, traitId)}
            />
          ))}
        </div>
      </section>

      <ReactionModal
        kind={reactionModal}
        onClose={closeReactionModal}
        traits={modelTraits}
        addTraitCategory={addTraitCategory}
        onCategoryChange={setAddTraitCategory}
        onAddTrait={(traitId) => addDuplicantTrait(model.id, traitId)}
        onApplyReaction={applyReactionTrait}
      />

      <div className="m3-card p-4">
        <h2 className="text-lg font-semibold">Interests</h2>
        <div className="m3-scrollbar m3-horizontal-scroll mt-3 pb-2">
          <div className="grid grid-flow-col grid-rows-4 items-start gap-2">
            {model.interests.length === 0 ? (
              <span className="text-sm opacity-70">No interests</span>
            ) : (
              model.interests.map((interest) => (
                <M3OutlinedButton
                  key={interest}
                  onClick={() => removeDuplicantInterest(model.id, interest)}
                  className="w-max max-w-56 px-2 py-1 text-xs"
                  title="Remove interest"
                >
                  {getSkillGroupDisplayName(interest)} x
                </M3OutlinedButton>
              ))
            )}
          </div>
        </div>

        {model.unknownInterestHashes.length > 0 ? (
          <p className="m3-scrollbar m3-vertical-scroll mt-2 max-h-24 break-words pr-2 text-xs opacity-70">
            Unknown interest hashes preserved:{" "}
            {model.unknownInterestHashes.join(", ")}
          </p>
        ) : null}

        {model.availableInterests.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <M3Select
              aria-label="Interest to add"
              value={interestToAdd}
              onChange={(event) => setInterestToAdd(event.target.value)}
              className="m3-field px-3 py-2 text-sm"
            >
              {model.availableInterests.map((interest) => (
                <option key={interest} value={interest}>
                  {getSkillGroupDisplayName(interest)}
                </option>
              ))}
            </M3Select>
            <M3OutlinedButton
              onClick={() => {
                if (interestToAdd) {
                  addDuplicantInterest(model.id, interestToAdd);
                }
              }}
              className="px-3 py-2 text-sm"
            >
              Add Interest
            </M3OutlinedButton>
          </div>
        ) : (
          <p className="mt-3 text-xs opacity-70">
            All known interests already selected.
          </p>
        )}
      </div>

      <DuplicantActionsPanel
        key={model.id}
        duplicantId={model.id}
        duplicantName={model.name}
        canClone={!model.isBionic}
      />

      <DuplicantStatsEditor model={model} />
    </section>
  );
}

export default function DuplicantEditorPage() {
  return (
    <Suspense fallback={<DuplicantEditorFallback />}>
      <DuplicantEditorPageContent />
    </Suspense>
  );
}
