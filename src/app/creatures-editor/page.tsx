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
      <h2 className="text-2xl font-semibold">Creature editor</h2>
      <p className="mt-2 text-sm opacity-80">Loading editor</p>
    </section>
  );
}

type CreatureTraitsEditorProps = {
  traits: string[];
  knownTraits: string[];
  onCommit: (nextTraitIds: string[]) => void;
};

function CreatureTraitsEditor({
  traits,
  knownTraits,
  onCommit,
}: CreatureTraitsEditorProps) {
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
            Manage this creature&apos;s traits.
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
              <span className="break-all font-mono text-sm" title={traitId}>
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
          Add trait
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="creature-trait-id"
            list="creature-known-traits"
            aria-describedby="creature-trait-help"
            type="text"
            value={draft}
            placeholder="Find a trait or enter its ID"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addTrait();
              }
            }}
            className="m3-field min-w-0 flex-1 px-3 py-2.5 text-sm"
          />
          <datalist id="creature-known-traits">
            {knownTraits
              .filter((trait) => !traits.includes(trait))
              .map((trait) => (
                <option key={trait} value={trait} />
              ))}
          </datalist>
          <M3TonalButton
            className="inline-flex shrink-0 items-center justify-center px-5 py-2.5 text-sm"
            onClick={addTrait}
            disabled={!canAddTrait}
          >
            Add trait
          </M3TonalButton>
        </div>
        <p id="creature-trait-help" className="mt-2 text-sm opacity-75">
          Suggestions come from creatures in this save. Other traits require an
          exact game ID.
        </p>
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
        title="Creature editor"
        description="Load a save first to inspect a creature."
      />
    );
  }

  if (requestedIdParam !== null && !hasValidRequestedId) {
    return (
      <section className="m3-card p-5">
        <h2 className="text-2xl font-semibold">Creature not found</h2>
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
        <h2 className="text-2xl font-semibold">Creature not found</h2>
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
        <h2 className="text-2xl font-semibold">Creature editor</h2>
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
            <h2 className="break-words text-xl font-semibold sm:text-2xl">
              {model.displayName}
            </h2>
            {model.displayName !== model.type ? (
              <code className="mt-1 block truncate text-xs opacity-60">
                {model.type}
              </code>
            ) : null}
            <p className="mt-1 text-sm opacity-70">
              ID {model.id}, {model.traits.length} active traits
            </p>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(21rem,0.65fr)]">
        <CreatureTraitsEditor
          key={model.id}
          traits={model.traits}
          knownTraits={[
            ...new Set(creatures.flatMap((creature) => creature.traits)),
          ].sort()}
          onCommit={commitTraits}
        />

        <section className="m3-card p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Position</h2>
              <p className="mt-1 text-sm opacity-70">
                World coordinates apply when you leave a field or press Enter.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
