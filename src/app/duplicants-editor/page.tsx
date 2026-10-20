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
import type {
  BionicSystemsModel,
  DuplicantEditorModel,
} from "@/lib/oni/save-selectors";
import { readStoredHairOffsets } from "@/lib/oni/hair-offsets";
import { useSyncOnChange } from "@/lib/use-sync-on-change";
import M3Select from "@/components/ui/m3-select";
import M3TonalButton from "@/components/ui/m3-tonal-button";
import M3OutlinedButton from "@/components/ui/m3-outlined-button";
import { getSkillGroupDisplayName } from "@/lib/oni/minion-interests";
import {
  OVERJOYED_TRAIT_IDS,
  STRESS_REACTION_TRAIT_IDS,
  getCanonicalTraitId,
  getTraitCategory,
  getTraitDisplayName,
  isBionicStarterBoosterTraitId,
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
const OVERVIEW_PORTRAIT_OFFSET_Y = 10;

type TraitGroupCardProps = {
  label: string;
  traits: string[];
  tone: "positive" | "universal" | "negative";
  onRemove: (traitId: string) => void;
};

const TRAIT_TONE_STYLES = {
  positive:
    "border-[var(--trait-positive-outline)] bg-[var(--trait-positive-surface)]",
  universal:
    "border-[var(--trait-general-outline)] bg-[var(--trait-general-surface)]",
  negative:
    "border-[var(--trait-negative-outline)] bg-[var(--trait-negative-surface)]",
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
    <section className="min-w-0 border-t border-[var(--outline-faint)] pt-3 first:border-0 first:pt-0">
      <div className="flex items-baseline gap-2">
        <h3 className="text-xs font-semibold">{label}</h3>
        <span className="text-xs tabular-nums text-[var(--muted)]">
          {sortedTraits.length || "None"}
        </span>
      </div>
      {sortedTraits.length > 0 ? (
        <div className="mt-2 min-w-0">
          <div className="flex flex-wrap items-start gap-1.5">
            {sortedTraits.map((trait) => {
              const displayName = getTraitDisplayName(trait);
              return (
                <M3OutlinedButton
                  key={trait}
                  onClick={() => onRemove(trait)}
                  className={`inline-flex max-w-full items-center gap-2 px-2.5 py-1 text-left text-xs ${toneStyles}`}
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
        </div>
      ) : null}
    </section>
  );
}

function formatBionicValue(value: number): string {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });
}

function formatBionicDraftValue(value: number): string {
  return String(Number(value.toFixed(3)));
}

function BionicSystemsPanel({
  duplicantId,
  systems,
}: {
  duplicantId: number;
  systems: BionicSystemsModel;
}) {
  const { updateDuplicantBionicPowerBankCharge, updateDuplicantBionicVital } =
    useSaveSession();
  const [vitalDrafts, setVitalDrafts] = useState<Record<string, string>>({});
  const [vitalErrors, setVitalErrors] = useState<Record<string, string>>({});
  const [bankDrafts, setBankDrafts] = useState<Record<string, string>>({});
  const [bankErrors, setBankErrors] = useState<Record<string, string>>({});

  useSyncOnChange([duplicantId, systems.vitals, systems.powerBanks], () => {
    setVitalDrafts(
      Object.fromEntries(
        systems.vitals.map((vital) => [
          vital.id,
          formatBionicDraftValue(vital.value),
        ]),
      ),
    );
    setBankDrafts(
      Object.fromEntries(
        systems.powerBanks.flatMap((bank) =>
          bank.id === null
            ? []
            : [
                [
                  String(bank.id),
                  formatBionicDraftValue(bank.chargeKilojoules),
                ],
              ],
        ),
      ),
    );
    setVitalErrors({});
    setBankErrors({});
  });

  const commitVital = (vital: BionicSystemsModel["vitals"][number]) => {
    if (!vital.editable || vital.max === null) {
      return;
    }
    const max = vital.max;
    const parsed = Number(vitalDrafts[vital.id]);
    if (
      vitalDrafts[vital.id]?.trim() &&
      parsed === Number(formatBionicDraftValue(vital.value))
    ) {
      setVitalErrors((previous) => ({ ...previous, [vital.id]: "" }));
      return;
    }
    if (
      !vitalDrafts[vital.id]?.trim() ||
      !Number.isFinite(parsed) ||
      parsed < 0 ||
      parsed > max
    ) {
      setVitalErrors((previous) => ({
        ...previous,
        [vital.id]: `Use a value from 0 to ${formatBionicValue(max)}.`,
      }));
      return;
    }
    updateDuplicantBionicVital(duplicantId, vital.id, parsed);
    setVitalErrors((previous) => ({ ...previous, [vital.id]: "" }));
  };

  const commitBank = (bank: BionicSystemsModel["powerBanks"][number]) => {
    if (
      !bank.editable ||
      bank.id === null ||
      bank.capacityKilojoules === null
    ) {
      return;
    }
    const key = String(bank.id);
    const capacityKilojoules = bank.capacityKilojoules;
    const parsed = Number(bankDrafts[key]);
    if (
      bankDrafts[key]?.trim() &&
      parsed === Number(formatBionicDraftValue(bank.chargeKilojoules))
    ) {
      setBankErrors((previous) => ({ ...previous, [key]: "" }));
      return;
    }
    if (
      !bankDrafts[key]?.trim() ||
      !Number.isFinite(parsed) ||
      parsed < 0 ||
      parsed > capacityKilojoules
    ) {
      setBankErrors((previous) => ({
        ...previous,
        [key]: `Use a value from 0 to ${formatBionicValue(capacityKilojoules)} kJ.`,
      }));
      return;
    }
    updateDuplicantBionicPowerBankCharge(duplicantId, bank.id, parsed);
    setBankErrors((previous) => ({ ...previous, [key]: "" }));
  };

  return (
    <section className="m3-card p-4">
      <div>
        <h2 className="text-base font-semibold">Bionic systems</h2>
        <p className="mt-0.5 text-xs opacity-65">
          Edit stored resources and power bank charge. Installed equipment is
          preserved.
        </p>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {systems.vitals.map((vital) => (
          <div key={vital.id} className="m3-panel-inset px-3 py-2.5">
            <label
              htmlFor={vital.editable ? `bionic-vital-${vital.id}` : undefined}
              className="m3-label"
            >
              {vital.displayName}
            </label>
            {vital.editable && vital.max !== null ? (
              <>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    id={`bionic-vital-${vital.id}`}
                    type="number"
                    min="0"
                    max={vital.max}
                    step="0.1"
                    value={vitalDrafts[vital.id] ?? ""}
                    onChange={(event) =>
                      setVitalDrafts((previous) => ({
                        ...previous,
                        [vital.id]: event.target.value,
                      }))
                    }
                    onBlur={() => commitVital(vital)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.currentTarget.blur();
                      } else if (event.key === "Escape") {
                        setVitalDrafts((prev) => ({
                          ...prev,
                          [vital.id]: formatBionicDraftValue(vital.value),
                        }));
                        setVitalErrors((prev) => ({ ...prev, [vital.id]: "" }));
                      }
                    }}
                    aria-invalid={vitalErrors[vital.id] ? true : undefined}
                    aria-describedby={
                      vitalErrors[vital.id]
                        ? `bionic-vital-error-${vital.id}`
                        : undefined
                    }
                    className="min-w-0 flex-1 m3-field px-2 py-1.5 text-right text-sm tabular-nums"
                  />
                  <span className="shrink-0 text-xs opacity-65">
                    {vital.unit} / {formatBionicValue(vital.max)}
                  </span>
                </div>
                {vitalErrors[vital.id] ? (
                  <p
                    id={`bionic-vital-error-${vital.id}`}
                    role="alert"
                    className="mt-1 text-xs m3-error-text"
                  >
                    {vitalErrors[vital.id]}
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <p className="mt-1 text-sm font-semibold tabular-nums">
                  {formatBionicValue(vital.value)} {vital.unit}
                  {vital.max !== null ? (
                    <span className="font-normal opacity-55">
                      {" "}
                      / {formatBionicValue(vital.max)} {vital.unit}
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-[0.6875rem] opacity-55">
                  Total from installed power banks
                </p>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 grid items-start gap-3 md:grid-cols-2">
        <section className="m3-panel p-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Installed boosters</h3>
            <span className="m3-tag shrink-0">{systems.boosters.length}</span>
          </div>
          <div className="mt-2 grid gap-1.5">
            {systems.boosters.length === 0 ? (
              <p className="m3-panel-inset px-3 py-2 text-xs opacity-70">
                No installed boosters found
              </p>
            ) : (
              systems.boosters.map((booster, index) => (
                <div
                  key={booster.id ?? `${booster.prefabId}-${index}`}
                  className="m3-panel-inset px-3 py-2"
                >
                  <p className="truncate text-sm font-medium">
                    {booster.displayName}
                  </p>
                  <code
                    className="mt-0.5 block truncate text-[0.6875rem] opacity-55"
                    title={booster.prefabId}
                  >
                    {booster.prefabId}
                  </code>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="m3-panel p-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Installed power banks</h3>
            <span className="m3-tag shrink-0">{systems.powerBanks.length}</span>
          </div>
          <div className="mt-2 grid gap-1.5">
            {systems.powerBanks.length === 0 ? (
              <p className="m3-panel-inset px-3 py-2 text-xs opacity-70">
                No installed power banks found
              </p>
            ) : (
              systems.powerBanks.map((bank, index) => (
                <div
                  key={bank.id ?? `${bank.prefabId}-${index}`}
                  className="m3-panel-inset px-3 py-2"
                  title={bank.prefabId}
                >
                  <div className="flex items-center justify-between gap-3">
                    <label
                      htmlFor={
                        bank.id === null ? undefined : `power-bank-${bank.id}`
                      }
                      className="min-w-0 truncate text-sm font-medium"
                    >
                      {bank.displayName}
                    </label>
                    {bank.editable &&
                    bank.id !== null &&
                    bank.capacityKilojoules !== null ? (
                      <span className="flex shrink-0 items-center gap-1.5">
                        <input
                          id={`power-bank-${bank.id}`}
                          type="number"
                          min="0"
                          max={bank.capacityKilojoules}
                          step="0.1"
                          value={bankDrafts[String(bank.id)] ?? ""}
                          onChange={(event) =>
                            setBankDrafts((previous) => ({
                              ...previous,
                              [String(bank.id)]: event.target.value,
                            }))
                          }
                          onBlur={() => commitBank(bank)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.currentTarget.blur();
                            } else if (event.key === "Escape") {
                              setBankDrafts((prev) => ({
                                ...prev,
                                [String(bank.id)]: formatBionicDraftValue(
                                  bank.chargeKilojoules,
                                ),
                              }));
                              setBankErrors((prev) => ({
                                ...prev,
                                [String(bank.id)]: "",
                              }));
                            }
                          }}
                          aria-invalid={
                            bankErrors[String(bank.id)] ? true : undefined
                          }
                          aria-describedby={
                            bankErrors[String(bank.id)]
                              ? `bionic-bank-error-${bank.id}`
                              : undefined
                          }
                          className="w-20 m3-field px-2 py-1 text-right text-xs tabular-nums"
                        />
                        <span className="text-xs opacity-65">
                          / {formatBionicValue(bank.capacityKilojoules)} kJ
                        </span>
                      </span>
                    ) : (
                      <p className="shrink-0 text-xs tabular-nums opacity-70">
                        {formatBionicValue(bank.chargeKilojoules)} kJ
                      </p>
                    )}
                  </div>
                  {bank.id !== null && bankErrors[String(bank.id)] ? (
                    <p
                      id={`bionic-bank-error-${bank.id}`}
                      role="alert"
                      className="mt-1 text-right text-xs m3-error-text"
                    >
                      {bankErrors[String(bank.id)]}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </section>
  );
}

function DuplicantEditorFallback() {
  return (
    <section className="m3-card p-5">
      <h2 className="text-base font-semibold">Duplicant editor</h2>
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
    setAllDuplicantInterests,
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
  const [hairOffsets] = useState(readStoredHairOffsets);
  const [appearanceModalOpen, setAppearanceModalOpen] = useState(false);
  const [appearanceEditorTab, setAppearanceEditorTab] = useState("head");
  const [reactionModal, setReactionModal] = useState<ReactionKind | null>(null);

  useSyncOnChange([model?.name, model?.id], () => {
    setNameDraft(model?.name || "");
    setNameError("");
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
  const editableNonReactionTraits = nonReactionTraits.filter(
    (trait) => !isBionicStarterBoosterTraitId(trait),
  );
  const traitGroups = [
    {
      id: "positive",
      label: "Positive traits",
      tone: "positive" as const,
      traits: editableNonReactionTraits.filter(
        (trait) => getTraitCategory(trait) === "positive",
      ),
    },
    {
      id: "universal",
      label: "General traits",
      tone: "universal" as const,
      traits: editableNonReactionTraits.filter(
        (trait) => getTraitCategory(trait) === "universal",
      ),
    },
    {
      id: "negative",
      label: "Negative traits",
      tone: "negative" as const,
      traits: editableNonReactionTraits.filter(
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
    const nextTraitIds = [...filteredTraits, getCanonicalTraitId(traitId)];
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

  const setCategoryTraits = (traitIds: string[], enabled: boolean) => {
    if (!model || traitIds.length === 0) {
      return;
    }
    const categoryTraitIds = new Set(traitIds.map(normalizeTraitId));
    const currentTraits = Array.isArray(model.traits) ? model.traits : [];
    const currentTraitIds = new Set(currentTraits.map(normalizeTraitId));
    const nextTraitIds = enabled
      ? [
          ...currentTraits,
          ...traitIds
            .filter(
              (traitId) => !currentTraitIds.has(normalizeTraitId(traitId)),
            )
            .map(getCanonicalTraitId),
        ]
      : currentTraits.filter(
          (traitId) => !categoryTraitIds.has(normalizeTraitId(traitId)),
        );

    if (
      nextTraitIds.length === currentTraits.length &&
      nextTraitIds.every((traitId, index) => traitId === currentTraits[index])
    ) {
      return;
    }
    modifyBehavior(model.id, "Klei.AI.Traits", "templateData", {
      TraitIds: nextTraitIds,
    });
  };

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
        title="Duplicant editor"
        description="Load a save first to edit duplicants."
      />
    );
  }

  if (requestedIdParam !== null && !hasValidRequestedId) {
    return (
      <section className="m3-card p-5">
        <h2 className="text-base font-semibold">Duplicant not found</h2>
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
        <h2 className="text-base font-semibold">Duplicant not found</h2>
        <p className="mt-2 text-sm opacity-80">
          No duplicant with game object ID <code>{requestedId}</code> exists in
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
        <h2 className="text-base font-semibold">Duplicant editor</h2>
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
    if (nextName !== model.name) updateDuplicantName(model.id, nextName);
    setNameDraft(nextName);
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
  const allInterestsSelected = model.availableInterests.length === 0;

  return (
    <section className="m3-page m3-page-flow">
      <section id="identity" className="m3-card scroll-mt-20 p-4">
        <div className="flex items-center gap-3">
          <div
            role="img"
            aria-label={`${model.name} portrait`}
            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[var(--outline-faint)] bg-[var(--surface-container)]"
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
          <div className="min-w-0">
            <h2 className="break-words text-xl font-semibold">{model.name}</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {genderDisplayName}, ID {model.id}
              {model.isBionic ? ", bionic" : ""}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">
          Edits apply when you leave a field or press Enter.
        </p>
        <div className="mt-3 grid grid-cols-2 items-end gap-3 md:grid-cols-3">
          <label className="col-span-2 flex min-w-0 flex-col gap-1.5 text-sm md:col-span-1">
            <span className="m3-label">Name</span>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                onBlur={onApplyName}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                  if (event.key === "Escape") {
                    setNameDraft(model.name);
                    setNameError("");
                  }
                }}
                aria-invalid={nameError ? true : undefined}
                aria-describedby={
                  nameError ? "duplicant-name-error" : undefined
                }
                maxLength={MAX_NAME_LENGTH}
                className="m3-field min-h-11 min-w-0 flex-1 px-3 py-2 text-sm"
              />
            </div>
            {nameError ? (
              <p
                id="duplicant-name-error"
                role="alert"
                className="mt-1 text-xs m3-error-text"
              >
                {nameError}
              </p>
            ) : null}
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-sm">
            <span id="duplicant-gender-label" className="m3-label">
              Gender
            </span>
            <M3Select
              aria-labelledby="duplicant-gender-label"
              value={model.gender || "FEMALE"}
              onChange={(event) =>
                updateDuplicantGender(model.id, event.target.value)
              }
              className="m3-field min-h-11 w-full px-3 py-2 text-sm"
            >
              {genderOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </M3Select>
          </label>
          <div className="flex min-w-0 flex-col gap-1.5 text-sm">
            <span className="m3-label">Appearance</span>
            <M3OutlinedButton
              onClick={openAppearanceModal}
              className="min-h-11 w-full px-3 py-2 text-sm"
            >
              Edit appearance
            </M3OutlinedButton>
          </div>
        </div>
      </section>

      <nav
        aria-label="Duplicant sections"
        className="m3-scrollbar sticky top-0 z-20 flex gap-1 overflow-x-auto border-b border-[var(--outline-faint)] bg-[var(--background)] py-2"
      >
        {[
          ["attributes", "Attributes"],
          ["health", "Health"],
          ["skills", "Skills"],
          ["effects", "Effects"],
          ["traits", "Traits"],
          ["reactions", "Reactions"],
          ...(!model.isBionic ? [["interests", "Interests"]] : []),
        ].map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="flex min-h-11 shrink-0 items-center rounded-lg px-3 py-2 text-sm hover:bg-[var(--state-hover)]"
          >
            {label}
          </a>
        ))}
      </nav>

      <DuplicantStatsEditor model={model} />

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

      {model.bionicSystems ? (
        <BionicSystemsPanel
          duplicantId={model.id}
          systems={model.bionicSystems}
        />
      ) : null}

      <section id="reactions" className="m3-card scroll-mt-20 p-4">
        <h2 className="text-base font-semibold">Reactions</h2>
        <div className="mt-3 grid gap-2 lg:grid-cols-2">
          {[
            {
              kind: "overjoyed" as const,
              label: "Overjoyed response",
              reactions: overjoyedReactions,
            },
            {
              kind: "stress" as const,
              label: "Stress reaction",
              reactions: stressReactions,
            },
          ].map(({ kind, label, reactions }) => (
            <div
              key={kind}
              className="m3-panel flex min-w-0 items-center justify-between gap-3 px-3 py-2.5"
            >
              <div className="min-w-0">
                <h3 className="text-xs text-[var(--muted)]">{label}</h3>
                <p className="mt-1 break-words text-sm font-medium">
                  {reactions.length
                    ? reactions.map(getTraitDisplayName).join(", ")
                    : "None selected"}
                </p>
              </div>
              <M3OutlinedButton
                onClick={() => openReactionModal(kind)}
                className="shrink-0 px-3 py-1 text-xs"
                aria-label={`Change ${label.toLowerCase()}`}
              >
                Change
              </M3OutlinedButton>
            </div>
          ))}
        </div>
      </section>

      <section id="traits" className="m3-card scroll-mt-20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">
              {model.isBionic ? "Bionic traits" : "Traits"}
            </h2>
            <p className="mt-0.5 text-xs opacity-65">
              {editableNonReactionTraits.length} active trait
              {editableNonReactionTraits.length === 1 ? "" : "s"}
            </p>
          </div>
          <M3TonalButton
            onClick={() => openReactionModal("add-traits")}
            className="px-4 py-2 text-sm"
          >
            Add trait
          </M3TonalButton>
        </div>

        <div className="mt-3 grid gap-3">
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
        onSetCategoryTraits={setCategoryTraits}
        onApplyReaction={applyReactionTrait}
        isBionic={model.isBionic}
      />

      {!model.isBionic ? (
        <div id="interests" className="m3-card scroll-mt-20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <h2 className="text-base font-semibold">Interests</h2>
              <span className="text-xs tabular-nums text-[var(--muted)]">
                {model.interests.length} selected
              </span>
            </div>
            <M3OutlinedButton
              onClick={() =>
                setAllDuplicantInterests(model.id, !allInterestsSelected)
              }
              className="shrink-0 px-3 py-1 text-xs"
              aria-label={
                allInterestsSelected
                  ? "Uncheck all interests"
                  : "Check all interests"
              }
            >
              {allInterestsSelected ? "Uncheck all" : "Check all"}
            </M3OutlinedButton>
          </div>
          <p id="interests-help" className="mt-1 text-xs text-[var(--muted)]">
            Check to add an interest. Uncheck to remove it.
          </p>
          <fieldset
            aria-describedby="interests-help"
            className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
          >
            <legend className="sr-only">Duplicant interests</legend>
            {[...model.interests, ...model.availableInterests]
              .sort((a, b) =>
                getSkillGroupDisplayName(a).localeCompare(
                  getSkillGroupDisplayName(b),
                ),
              )
              .map((interest) => {
                const selected = model.interests.includes(interest);
                return (
                  <label
                    key={interest}
                    className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-sm transition-colors sm:min-h-9 ${selected ? "border-[var(--trait-general-outline)] bg-[var(--state-hover)]" : "border-[var(--outline)] hover:bg-[var(--state-hover)]"}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(event) =>
                        event.target.checked
                          ? addDuplicantInterest(model.id, interest)
                          : removeDuplicantInterest(model.id, interest)
                      }
                      className="h-3.5 w-3.5 shrink-0 accent-[var(--accent)]"
                    />
                    <span className="min-w-0 break-words">
                      {getSkillGroupDisplayName(interest)}
                    </span>
                  </label>
                );
              })}
          </fieldset>

          {model.unknownInterestHashes.length > 0 ? (
            <p className="m3-scrollbar m3-vertical-scroll mt-2 max-h-24 break-words pr-2 text-xs opacity-70">
              Unknown interest hashes preserved:{" "}
              {model.unknownInterestHashes.join(", ")}
            </p>
          ) : null}
        </div>
      ) : null}

      <DuplicantActionsPanel
        key={model.id}
        duplicantId={model.id}
        duplicantName={model.name}
        canClone={!model.isBionic}
      />
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
