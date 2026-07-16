"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { FaPaw, FaTriangleExclamation } from "react-icons/fa6";
import SaveRequiredPage from "@/components/save-required-page";
import M3TonalButton from "@/components/ui/m3-tonal-button";
import { NumberField } from "@/components/ui/numeric-fields";
import { useSaveSession } from "@/lib/save-session/save-session-context";
import {
  selectCreatureEditorModel,
  selectCreatures,
} from "@/lib/oni/save-selectors";

function CreatureEditorFallback() {
  return (
    <section className="m3-card p-5">
      <h2 className="text-2xl font-semibold">Creature Editor</h2>
      <p className="mt-2 text-sm opacity-80">Loading editor</p>
    </section>
  );
}

type CreatureTraitsEditorProps = {
  traits: string[];
  onCommit: (nextTraitIds: string[]) => void;
};

// Creatures have no trait catalog to pick from (unlike duplicants), so traits
// are shown by raw id: remove any, or add one by typing its trait id.
function CreatureTraitsEditor({ traits, onCommit }: CreatureTraitsEditorProps) {
  const [draft, setDraft] = useState("");
  const cleanDraft = draft.trim();
  const canAddTrait = Boolean(cleanDraft) && !traits.includes(cleanDraft);
  const orderedTraits = [...traits].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );

  const addTrait = () => {
    if (!canAddTrait) {
      return;
    }
    onCommit([...traits, cleanDraft]);
    setDraft("");
  };

  const removeTrait = (traitId: string) => {
    onCommit(traits.filter((current) => current !== traitId));
  };

  return (
    <section className="m3-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Traits</h2>
          <p className="mt-1 text-sm leading-relaxed opacity-70">
            Raw trait identifiers attached to this creature.
          </p>
        </div>
        <span className="m3-tag shrink-0">{orderedTraits.length} active</span>
      </div>

      {orderedTraits.length === 0 ? (
        <div className="m3-panel-inset mt-4 px-4 py-5">
          <p className="text-sm font-semibold">No traits assigned</p>
          <p className="mt-1 text-xs leading-relaxed opacity-70">
            Add a known ONI trait identifier below if this creature needs one.
          </p>
        </div>
      ) : (
        <ul className="mt-4 flex flex-wrap gap-2">
          {orderedTraits.map((traitId) => (
            <li
              key={traitId}
              className="flex max-w-full items-center gap-2 rounded-xl border border-[var(--outline-faint)] bg-[var(--surface-container-high)] py-1 pr-1 pl-3 text-sm"
            >
              <span className="truncate font-mono text-xs" title={traitId}>
                {traitId}
              </span>
              <button
                type="button"
                aria-label={`Remove ${traitId}`}
                onClick={() => removeTrait(traitId)}
                className="flex min-h-9 shrink-0 items-center justify-center rounded-lg bg-transparent px-3 text-xs text-[var(--foreground)] opacity-70 hover:bg-[var(--state-hover)] hover:opacity-100"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="m3-panel mt-4 p-3">
        <label htmlFor="creature-trait-id" className="m3-label">
          Add trait identifier
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="creature-trait-id"
            type="text"
            value={draft}
            placeholder="e.g. CritterMoodImprovement"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addTrait();
              }
            }}
            className="m3-field min-w-0 flex-1 px-3 py-2.5 text-sm"
          />
          <M3TonalButton
            className="inline-flex shrink-0 items-center justify-center px-5 py-2.5 text-sm"
            onClick={addTrait}
            disabled={!canAddTrait}
          >
            Add trait
          </M3TonalButton>
        </div>
      </div>
    </section>
  );
}

function CreatureEditorPageContent() {
  const searchParams = useSearchParams();
  const {
    saveGame,
    hasSave,
    selectedCreatureId,
    setSelectedCreatureId,
    modifyBehavior,
    updateCreaturePosition,
  } = useSaveSession();

  const creatures = useMemo(() => selectCreatures(saveGame), [saveGame]);
  const fallbackId = creatures[0]?.id ?? null;
  const requestedIdParam = searchParams.get("id");
  const requestedId =
    requestedIdParam === null ? null : Number(requestedIdParam);
  const hasValidRequestedId =
    requestedIdParam !== null && Number.isFinite(requestedId);
  const requestedExists =
    hasValidRequestedId &&
    creatures.some((creature) => creature.id === requestedId);

  const activeId = hasValidRequestedId
    ? requestedExists
      ? requestedId
      : null
    : Number.isFinite(selectedCreatureId) &&
        creatures.some((creature) => creature.id === selectedCreatureId)
      ? selectedCreatureId
      : fallbackId;

  useEffect(() => {
    if (
      hasValidRequestedId &&
      requestedExists &&
      selectedCreatureId !== requestedId
    ) {
      setSelectedCreatureId(requestedId);
      return;
    }

    if (
      requestedIdParam === null &&
      !Number.isFinite(selectedCreatureId) &&
      Number.isFinite(fallbackId)
    ) {
      setSelectedCreatureId(fallbackId);
    }
  }, [
    fallbackId,
    hasValidRequestedId,
    requestedExists,
    requestedId,
    requestedIdParam,
    selectedCreatureId,
    setSelectedCreatureId,
  ]);

  const model = useMemo(
    () => selectCreatureEditorModel(saveGame, activeId),
    [activeId, saveGame],
  );

  if (!hasSave) {
    return (
      <SaveRequiredPage
        title="Creature Editor"
        description="Load a save first to inspect a creature."
      />
    );
  }

  if (requestedIdParam !== null && !hasValidRequestedId) {
    return (
      <section className="m3-card p-5">
        <h2 className="text-2xl font-semibold">Creature Not Found</h2>
        <p className="mt-2 text-sm opacity-80">
          Invalid creature ID in route query: <code>{requestedIdParam}</code>
        </p>
        <p className="mt-3 text-sm opacity-70">
          Open{" "}
          <Link href="/creatures" className="underline">
            Creatures
          </Link>{" "}
          and select a valid entry.
        </p>
      </section>
    );
  }

  if (hasValidRequestedId && !requestedExists) {
    return (
      <section className="m3-card p-5">
        <h2 className="text-2xl font-semibold">Creature Not Found</h2>
        <p className="mt-2 text-sm opacity-80">
          No creature with Game Object ID <code>{requestedId}</code> exists in
          this save.
        </p>
        <p className="mt-3 text-sm opacity-70">
          Open{" "}
          <Link href="/creatures" className="underline">
            Creatures
          </Link>{" "}
          and select an existing creature.
        </p>
      </section>
    );
  }

  if (!model) {
    return (
      <section className="m3-card p-5">
        <h2 className="text-2xl font-semibold">Creature Editor</h2>
        <p className="mt-2 text-sm opacity-80">
          No creature data found in this save.
        </p>
      </section>
    );
  }

  const commitTraits = (nextTraitIds: string[]) => {
    modifyBehavior(model.id, "Klei.AI.Traits", "templateData", {
      TraitIds: nextTraitIds,
    });
  };

  return (
    <section className="m3-page m3-page-flow !max-w-6xl">
      <section className="m3-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[var(--outline)] bg-[var(--surface-container)] text-[var(--accent)]">
            <FaPaw aria-hidden="true" className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="m3-label">Selected creature</p>
            <h2 className="truncate text-xl font-semibold sm:text-2xl">
              {model.type}
            </h2>
            <p className="mt-1 text-sm opacity-70">
              Edit behavior traits and world coordinates.
            </p>
          </div>
          <dl className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:min-w-72">
            <div className="m3-panel-inset px-3 py-2.5">
              <dt className="m3-label">Game object ID</dt>
              <dd className="mt-1 font-mono text-sm font-semibold tabular-nums">
                {model.id}
              </dd>
            </div>
            <div className="m3-panel-inset px-3 py-2.5">
              <dt className="m3-label">Active traits</dt>
              <dd className="mt-1 text-sm font-semibold tabular-nums">
                {model.traits.length}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(21rem,0.65fr)]">
        <CreatureTraitsEditor traits={model.traits} onCommit={commitTraits} />

        <section className="m3-card p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Position</h2>
              <p className="mt-1 text-sm opacity-70">World coordinates</p>
            </div>
            <span className="m3-tag shrink-0">X · Y · Z</span>
          </div>

          <div className="m3-panel mt-4 grid gap-3 p-3 sm:grid-cols-3">
            {(["x", "y", "z"] as const).map((axis) => (
              <label key={axis} className="flex flex-col gap-1.5">
                <span className="m3-label">{axis} coordinate</span>
                <NumberField
                  value={model.position[axis]}
                  step="0.5"
                  onCommit={(next) =>
                    updateCreaturePosition(model.id, axis, next)
                  }
                  className="m3-field w-full px-3 py-2.5 text-base tabular-nums"
                />
              </label>
            ))}
          </div>

          <div className="m3-panel-inset mt-3 flex items-start gap-3 px-3 py-3">
            <FaTriangleExclamation
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]"
            />
            <p className="text-xs leading-relaxed opacity-75">
              Coordinates are not validated against terrain. Placing a creature
              inside solid tiles can trap it.
            </p>
          </div>
        </section>
      </div>
    </section>
  );
}

export default function CreatureEditorPage() {
  return (
    <Suspense fallback={<CreatureEditorFallback />}>
      <CreatureEditorPageContent />
    </Suspense>
  );
}
