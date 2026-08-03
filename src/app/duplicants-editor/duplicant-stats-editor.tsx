"use client";

import { useState } from "react";
import type { DuplicantEditorModel } from "@/lib/oni/save-selectors";
import { useSaveSession } from "@/lib/save-session/save-session-context";
import { useSyncOnChange } from "@/lib/use-sync-on-change";
import M3Dialog from "@/components/ui/m3-dialog";
import M3OutlinedButton from "@/components/ui/m3-outlined-button";
import M3TonalButton from "@/components/ui/m3-tonal-button";
import { getEffectDefinition } from "@/lib/oni/effect-data";

const ATTRIBUTE_MIN_LEVEL = -20;
const ATTRIBUTE_MAX_LEVEL = 99;
const EXPERIENCE_MIN = 0;
const HEALTH_MIN = 0;

export default function DuplicantStatsEditor({
  model,
}: {
  model: DuplicantEditorModel;
}) {
  const {
    addDuplicantEffect,
    removeDuplicantEffect,
    setDuplicantAttributeLevels,
    setDuplicantSkillMastery,
    setDuplicantSkillsMastery,
    updateDuplicantAttributeLevel,
    updateDuplicantEffectCycles,
    updateDuplicantExperience,
    updateDuplicantHealthModifier,
  } = useSaveSession();
  const [attributeDrafts, setAttributeDrafts] = useState<
    Record<string, string>
  >({});
  const [attributeErrors, setAttributeErrors] = useState<
    Record<string, string>
  >({});
  const [healthDrafts, setHealthDrafts] = useState<Record<string, string>>({});
  const [healthErrors, setHealthErrors] = useState<Record<string, string>>({});
  const [experienceDraft, setExperienceDraft] = useState("0");
  const [experienceError, setExperienceError] = useState("");
  const [effectCycleDrafts, setEffectCycleDrafts] = useState<
    Record<string, string>
  >({});
  const [effectErrors, setEffectErrors] = useState<Record<string, string>>({});
  const [newEffectId, setNewEffectId] = useState("");
  const [newEffectCycles, setNewEffectCycles] = useState("5");
  const [newEffectError, setNewEffectError] = useState("");
  const [effectPickerOpen, setEffectPickerOpen] = useState(false);
  const [effectQuery, setEffectQuery] = useState("");
  const skillGroups = model.skills.groups
    .map((group) => ({
      ...group,
      skills: [...group.skills].sort((a, b) =>
        a.displayName.localeCompare(b.displayName, undefined, {
          sensitivity: "base",
        }),
      ),
    }))
    .sort(
      (a, b) =>
        a.displayName.localeCompare(b.displayName, undefined, {
          sensitivity: "base",
        }) ||
        (a.context || "").localeCompare(b.context || "", undefined, {
          sensitivity: "base",
        }),
    );
  const skills = skillGroups.flatMap((group) => group.skills);
  const orderedHealth = [...model.health].sort((a, b) =>
    a.modifier.localeCompare(b.modifier, undefined, { sensitivity: "base" }),
  );
  const orderedEffects = [...model.effects].sort((a, b) =>
    a.id.localeCompare(b.id, undefined, { sensitivity: "base" }),
  );
  const orderedAvailableEffects = [...model.availableEffects].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
  const normalizedEffectQuery = effectQuery.trim().toLocaleLowerCase();
  const filteredAvailableEffects = normalizedEffectQuery
    ? orderedAvailableEffects.filter((effectId) =>
        `${getEffectDefinition(effectId).name} ${getEffectDefinition(effectId).summary} ${effectId}`
          .toLocaleLowerCase()
          .includes(normalizedEffectQuery),
      )
    : orderedAvailableEffects;
  const skillIds = skills.map((skill) => skill.skillId);
  const selectedSkillCount = skills.filter((skill) => skill.mastered).length;
  const allSkillsSelected = skills.every((skill) => skill.mastered);
  const noSkillsSelected = skills.every((skill) => !skill.mastered);
  const attributeIds = model.attributes.map(
    (attribute) => attribute.attributeId,
  );
  const allAttributesAtMax =
    model.attributes.length > 0 &&
    model.attributes.every(
      (attribute) => attribute.level === ATTRIBUTE_MAX_LEVEL,
    );
  const allAttributesAtZero =
    model.attributes.length > 0 &&
    model.attributes.every((attribute) => attribute.level === 0);

  useSyncOnChange([model.attributes, model.id], () => {
    setAttributeDrafts(
      Object.fromEntries(
        model.attributes.map((attribute) => [
          attribute.attributeId,
          String(attribute.level),
        ]),
      ),
    );
    setAttributeErrors({});
  });

  useSyncOnChange([model.health, model.id], () => {
    setHealthDrafts(
      Object.fromEntries(
        model.health.map((item) => [item.modifier, String(item.value)]),
      ),
    );
    setHealthErrors({});
  });

  useSyncOnChange([model.skills.totalExperienceGained, model.id], () => {
    setExperienceDraft(String(model.skills.totalExperienceGained ?? 0));
    setExperienceError("");
  });

  useSyncOnChange([model.effects, model.availableEffects, model.id], () => {
    setEffectCycleDrafts(
      Object.fromEntries(
        model.effects.map((effect) => [
          effect.id,
          String(effect.cyclesRemaining),
        ]),
      ),
    );
    setEffectErrors({});
    setNewEffectId(orderedAvailableEffects[0] || "");
    setNewEffectCycles("5");
    setNewEffectError("");
    setEffectPickerOpen(false);
    setEffectQuery("");
  });

  const commitAttribute = (attributeId: string) => {
    const parsed = Number(attributeDrafts[attributeId]);
    if (!Number.isInteger(parsed)) {
      setAttributeErrors((previous) => ({
        ...previous,
        [attributeId]: "Use a whole number.",
      }));
      return;
    }
    if (parsed > ATTRIBUTE_MAX_LEVEL) {
      setAttributeDrafts((previous) => ({
        ...previous,
        [attributeId]: String(ATTRIBUTE_MAX_LEVEL),
      }));
      updateDuplicantAttributeLevel(model.id, attributeId, ATTRIBUTE_MAX_LEVEL);
      setAttributeErrors((previous) => ({ ...previous, [attributeId]: "" }));
      return;
    }
    if (parsed < ATTRIBUTE_MIN_LEVEL) {
      setAttributeErrors((previous) => ({
        ...previous,
        [attributeId]: `Level cannot be less than ${ATTRIBUTE_MIN_LEVEL}.`,
      }));
      return;
    }
    updateDuplicantAttributeLevel(model.id, attributeId, parsed);
    setAttributeErrors((previous) => ({ ...previous, [attributeId]: "" }));
  };

  const commitHealth = (modifier: string) => {
    const parsed = Number(healthDrafts[modifier]);
    if (!Number.isFinite(parsed) || parsed < HEALTH_MIN) {
      setHealthErrors((previous) => ({
        ...previous,
        [modifier]: Number.isFinite(parsed)
          ? "Value cannot be negative."
          : "Use a valid number.",
      }));
      return;
    }
    updateDuplicantHealthModifier(model.id, modifier, parsed);
    setHealthErrors((previous) => ({ ...previous, [modifier]: "" }));
  };

  const commitExperience = () => {
    const parsed = Number(experienceDraft);
    if (!Number.isFinite(parsed) || parsed < EXPERIENCE_MIN) {
      setExperienceError("Experience must be a non-negative number.");
      return;
    }
    updateDuplicantExperience(model.id, parsed);
    setExperienceError("");
  };

  const commitEffectCycles = (effectId: string) => {
    const parsed = Number(effectCycleDrafts[effectId]);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setEffectErrors((previous) => ({
        ...previous,
        [effectId]: "Cycles must be zero or greater.",
      }));
      return;
    }
    updateDuplicantEffectCycles(model.id, effectId, parsed);
    setEffectErrors((previous) => ({ ...previous, [effectId]: "" }));
  };

  const onAddEffect = () => {
    const parsed = Number(newEffectCycles);
    if (!newEffectId) {
      setNewEffectError("Select an effect.");
      return false;
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setNewEffectError("Cycles must be greater than 0.");
      return false;
    }
    addDuplicantEffect(model.id, newEffectId, parsed);
    setNewEffectError("");
    setEffectPickerOpen(false);
    setEffectQuery("");
    return true;
  };

  const openEffectPicker = () => {
    setEffectQuery("");
    setNewEffectId(orderedAvailableEffects[0] || "");
    setNewEffectCycles("5");
    setNewEffectError("");
    setEffectPickerOpen(true);
  };

  const closeEffectPicker = () => {
    setEffectPickerOpen(false);
    setEffectQuery("");
    setNewEffectError("");
  };

  return (
    <div className="grid items-start gap-4 xl:grid-cols-2">
      <div className="m3-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Attributes</h2>
            <p className="mt-1 text-xs opacity-70">
              Whole numbers from {ATTRIBUTE_MIN_LEVEL} to {ATTRIBUTE_MAX_LEVEL}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <M3OutlinedButton
              disabled={attributeIds.length === 0 || allAttributesAtMax}
              onClick={() =>
                setDuplicantAttributeLevels(
                  model.id,
                  attributeIds,
                  ATTRIBUTE_MAX_LEVEL,
                )
              }
              className="px-3 py-1.5 text-sm"
            >
              Set all to 99
            </M3OutlinedButton>
            <M3OutlinedButton
              disabled={attributeIds.length === 0 || allAttributesAtZero}
              onClick={() =>
                setDuplicantAttributeLevels(model.id, attributeIds, 0)
              }
              className="px-3 py-1.5 text-sm"
            >
              Set all to 0
            </M3OutlinedButton>
          </div>
        </div>
        <div className="m3-scrollbar m3-vertical-scroll mt-3 grid max-h-96 gap-2 pr-2 sm:grid-cols-2">
          {model.attributes.map((attribute) => (
            <div
              key={attribute.attributeId}
              className="grid min-h-14 grid-cols-[minmax(0,1fr)_6rem] items-center gap-x-3 gap-y-1 m3-panel px-3 py-2"
            >
              <label
                htmlFor={`attribute-${attribute.attributeId}`}
                className="min-w-0 break-words text-sm leading-snug opacity-80"
              >
                {attribute.displayName || attribute.attributeId}
              </label>
              <div className="min-w-0">
                <input
                  id={`attribute-${attribute.attributeId}`}
                  type="number"
                  step="1"
                  min={ATTRIBUTE_MIN_LEVEL}
                  max={ATTRIBUTE_MAX_LEVEL}
                  value={attributeDrafts[attribute.attributeId] ?? ""}
                  onChange={(event) => {
                    const nextDraft = event.target.value;
                    const parsed = Number(nextDraft);
                    setAttributeDrafts((prev) => ({
                      ...prev,
                      [attribute.attributeId]:
                        Number.isFinite(parsed) && parsed > ATTRIBUTE_MAX_LEVEL
                          ? String(ATTRIBUTE_MAX_LEVEL)
                          : nextDraft,
                    }));
                  }}
                  onBlur={() => commitAttribute(attribute.attributeId)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      commitAttribute(attribute.attributeId);
                    }
                  }}
                  className="w-full m3-field px-2 py-1.5 text-right text-sm tabular-nums"
                />
              </div>
              {attributeErrors[attribute.attributeId] ? (
                <p
                  role="alert"
                  className="col-span-2 text-right text-xs m3-error-text"
                >
                  {attributeErrors[attribute.attributeId]}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="m3-card p-4">
        <h2 className="text-lg font-semibold">Health</h2>
        <div className="m3-scrollbar m3-horizontal-scroll mt-3 grid snap-x grid-flow-col grid-rows-4 items-start gap-2 pb-2">
          {orderedHealth.map((entry) => (
            <div
              key={entry.modifier}
              className="m3-panel w-60 shrink-0 snap-start px-3 py-2"
            >
              <label
                htmlFor={`health-${entry.modifier}`}
                className="text-sm opacity-80"
              >
                {entry.modifier}
              </label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  id={`health-${entry.modifier}`}
                  type="number"
                  min={HEALTH_MIN}
                  max={entry.max}
                  value={healthDrafts[entry.modifier] ?? ""}
                  onChange={(event) =>
                    setHealthDrafts((prev) => ({
                      ...prev,
                      [entry.modifier]: event.target.value,
                    }))
                  }
                  onBlur={() => commitHealth(entry.modifier)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      commitHealth(entry.modifier);
                    }
                  }}
                  className="w-28 m3-field px-2 py-1 text-sm"
                />
                <span className="text-xs opacity-70">max {entry.max}</span>
              </div>
              {healthErrors[entry.modifier] ? (
                <p role="alert" className="mt-1 text-xs m3-error-text">
                  {healthErrors[entry.modifier]}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="m3-card p-4 xl:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Skills</h2>
            <p className="mt-0.5 text-xs opacity-65">
              {selectedSkillCount} of {skills.length} mastered
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <M3OutlinedButton
              onClick={() =>
                setDuplicantSkillsMastery(model.id, skillIds, true)
              }
              disabled={allSkillsSelected}
              className="px-3 py-1.5 text-sm"
            >
              Select all
            </M3OutlinedButton>
            <M3OutlinedButton
              onClick={() =>
                setDuplicantSkillsMastery(model.id, skillIds, false)
              }
              disabled={noSkillsSelected}
              className="px-3 py-1.5 text-sm"
            >
              Deselect all
            </M3OutlinedButton>
          </div>
        </div>
        <div className="mt-3 inline-flex max-w-full flex-wrap items-end gap-2 m3-panel p-3">
          <div>
            <label
              htmlFor="duplicant-experience"
              className="block text-xs font-medium opacity-70"
            >
              Total experience
            </label>
            <input
              id="duplicant-experience"
              type="number"
              min={EXPERIENCE_MIN}
              value={experienceDraft}
              onChange={(event) => setExperienceDraft(event.target.value)}
              onBlur={commitExperience}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  commitExperience();
                }
              }}
              aria-invalid={experienceError ? true : undefined}
              aria-describedby={
                experienceError ? "duplicant-experience-error" : undefined
              }
              className="mt-1 w-48 max-w-full m3-field px-3 py-2 text-sm"
            />
          </div>
          <M3OutlinedButton
            onClick={commitExperience}
            className="px-3 py-2 text-sm"
          >
            Apply
          </M3OutlinedButton>
          {experienceError ? (
            <p
              id="duplicant-experience-error"
              role="alert"
              className="w-full text-xs m3-error-text"
            >
              {experienceError}
            </p>
          ) : null}
        </div>
        <p className="mt-3 text-xs opacity-60">
          Only skills compatible with this save&apos;s game mode are shown.
        </p>
        <div className="m3-scrollbar m3-horizontal-scroll mt-3 grid grid-flow-col grid-rows-3 items-start gap-3 pb-2">
          {skillGroups.map((group) => {
            const groupSkillIds = group.skills.map((skill) => skill.skillId);
            const selectedInGroup = group.skills.filter(
              (skill) => skill.mastered,
            ).length;
            const groupIsSelected = selectedInGroup === group.skills.length;
            const groupIsEmpty = selectedInGroup === 0;

            return (
              <section
                key={group.groupId}
                className="w-80 min-w-0 m3-panel p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold">
                        {group.displayName}
                      </h3>
                      {group.context ? (
                        <span className="rounded-full border border-[var(--outline)] px-2 py-0.5 text-xs opacity-75">
                          {group.context}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs opacity-70">
                      {selectedInGroup}/{group.skills.length} mastered
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <M3OutlinedButton
                      disabled={groupIsSelected}
                      onClick={() =>
                        setDuplicantSkillsMastery(model.id, groupSkillIds, true)
                      }
                      className="min-w-12 px-2.5 py-1 text-xs leading-4"
                    >
                      All
                    </M3OutlinedButton>
                    <M3OutlinedButton
                      disabled={groupIsEmpty}
                      onClick={() =>
                        setDuplicantSkillsMastery(
                          model.id,
                          groupSkillIds,
                          false,
                        )
                      }
                      className="min-w-12 px-2.5 py-1 text-xs leading-4"
                    >
                      None
                    </M3OutlinedButton>
                  </div>
                </div>
                <div className="mt-2 space-y-1">
                  {group.skills.map((skill) => (
                    <label
                      key={skill.skillId}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                        skill.mastered
                          ? "bg-[var(--state-hover)]"
                          : "bg-[var(--surface-container-low)] hover:bg-[var(--surface-container)]"
                      }`}
                      title={skill.skillId}
                    >
                      <input
                        type="checkbox"
                        checked={skill.mastered}
                        onChange={(event) =>
                          setDuplicantSkillMastery(
                            model.id,
                            skill.skillId,
                            event.target.checked,
                          )
                        }
                        className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                      />
                      <span className="min-w-0 opacity-85">
                        {skill.displayName}
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <div className="m3-card p-4 xl:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Effects</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs tabular-nums opacity-60">
              {model.effects.length} active
            </span>
            {orderedAvailableEffects.length > 0 ? (
              <M3TonalButton
                onClick={openEffectPicker}
                className="px-4 py-2 text-sm"
              >
                Add effect
              </M3TonalButton>
            ) : null}
          </div>
        </div>

        {orderedEffects.length === 0 ? (
          <p className="mt-3 text-sm opacity-70">No active effects</p>
        ) : (
          <div className="m3-scrollbar m3-horizontal-scroll mt-3 grid grid-flow-col grid-rows-4 auto-cols-[minmax(22rem,1fr)] items-stretch gap-2 pb-2">
            {orderedEffects.map((effect) => (
              <div
                key={effect.id}
                className="m3-panel flex min-h-28 min-w-0 flex-col justify-between px-3 py-2.5"
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0" title={effect.id}>
                    <p className="truncate text-sm font-semibold opacity-90">
                      {getEffectDefinition(effect.id).name}
                    </p>
                    <p className="mt-1 text-xs leading-4 opacity-60">
                      {getEffectDefinition(effect.id).summary}
                    </p>
                  </div>
                  <M3OutlinedButton
                    onClick={() => removeDuplicantEffect(model.id, effect.id)}
                    className="shrink-0 px-2.5 py-1 text-xs"
                  >
                    Remove
                  </M3OutlinedButton>
                </div>
                <label className="mt-2 flex items-center justify-between gap-3 text-xs">
                  <span className="opacity-65">Duration</span>
                  <span className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      aria-label={`Cycles for ${effect.id}`}
                      value={effectCycleDrafts[effect.id] ?? ""}
                      onChange={(event) =>
                        setEffectCycleDrafts((prev) => ({
                          ...prev,
                          [effect.id]: event.target.value,
                        }))
                      }
                      onBlur={() => commitEffectCycles(effect.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          commitEffectCycles(effect.id);
                        }
                      }}
                      className="w-24 m3-field px-2 py-1 text-right text-sm tabular-nums"
                    />
                    <span className="opacity-65">cycles</span>
                  </span>
                </label>
                {effectErrors[effect.id] ? (
                  <p role="alert" className="mt-1 text-xs m3-error-text">
                    {effectErrors[effect.id]}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}

        <M3Dialog
          open={effectPickerOpen}
          onClose={closeEffectPicker}
          labelledBy="add-effect-title"
          className="flex max-h-[82vh] w-full max-w-2xl flex-col overflow-hidden p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 id="add-effect-title" className="text-xl font-semibold">
                Add effect
              </h3>
              <p className="mt-1 text-xs opacity-65">
                Choose an effect and set its duration
              </p>
            </div>
            <M3OutlinedButton
              onClick={closeEffectPicker}
              className="shrink-0 px-3 py-1.5 text-sm"
            >
              Close
            </M3OutlinedButton>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <label htmlFor="effect-search" className="sr-only">
              Search effects
            </label>
            <input
              id="effect-search"
              type="search"
              value={effectQuery}
              onChange={(event) => {
                const nextQuery = event.target.value;
                const normalized = nextQuery.trim().toLocaleLowerCase();
                const matches = normalized
                  ? orderedAvailableEffects.filter((effectId) =>
                      `${getEffectDefinition(effectId).name} ${getEffectDefinition(effectId).summary} ${effectId}`
                        .toLocaleLowerCase()
                        .includes(normalized),
                    )
                  : orderedAvailableEffects;
                setEffectQuery(nextQuery);
                if (!matches.includes(newEffectId)) {
                  setNewEffectId(matches[0] || "");
                }
              }}
              placeholder="Search effects"
              className="m3-field min-w-0 flex-1 px-3 py-2.5 text-sm"
            />
            <span className="shrink-0 text-xs tabular-nums opacity-60">
              {filteredAvailableEffects.length} results
            </span>
          </div>

          <div className="m3-scrollbar m3-vertical-scroll mt-3 min-h-0 flex-1 pr-2">
            {filteredAvailableEffects.length === 0 ? (
              <div className="m3-panel p-4 text-sm opacity-65">
                No matching effects
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {filteredAvailableEffects.map((effectId) => {
                  const isSelected = effectId === newEffectId;
                  return (
                    <button
                      key={effectId}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setNewEffectId(effectId)}
                      className={`min-h-16 rounded-xl border px-3 py-2.5 text-left opacity-100 transition-colors ${
                        isSelected
                          ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--on-accent)]"
                          : "border-[var(--outline-faint)] bg-[var(--surface-container-high)] text-[var(--foreground)] hover:border-[var(--outline-strong)] hover:bg-[var(--state-hover)]"
                      }`}
                      title={effectId}
                    >
                      <span className="block text-sm font-semibold">
                        {getEffectDefinition(effectId).name}
                      </span>
                      <span
                        className={`mt-1 block text-xs leading-4 ${
                          isSelected ? "opacity-75" : "opacity-60"
                        }`}
                      >
                        {getEffectDefinition(effectId).summary}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-[var(--outline-faint)] pt-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs opacity-60">Selected effect</p>
                <p className="mt-1 truncate text-sm font-semibold">
                  {newEffectId
                    ? getEffectDefinition(newEffectId).name
                    : "No effect selected"}
                </p>
              </div>
              <label className="flex flex-col gap-1 text-xs">
                <span className="opacity-65">Duration in cycles</span>
                <input
                  type="number"
                  min="1"
                  value={newEffectCycles}
                  onChange={(event) => setNewEffectCycles(event.target.value)}
                  className="w-28 m3-field px-3 py-2 text-right text-sm tabular-nums"
                />
              </label>
              <M3TonalButton
                onClick={onAddEffect}
                disabled={!newEffectId}
                className="px-4 py-2 text-sm"
              >
                Add effect
              </M3TonalButton>
            </div>
            {newEffectError ? (
              <p role="alert" className="mt-2 text-xs m3-error-text">
                {newEffectError}
              </p>
            ) : null}
          </div>
        </M3Dialog>
      </div>
    </div>
  );
}
