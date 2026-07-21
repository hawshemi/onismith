"use client";

import { useMemo, useRef, useState } from "react";
import { FaCheck, FaXmark } from "react-icons/fa6";
import M3Chip from "@/components/ui/m3-chip";
import M3CollapsibleSection from "@/components/ui/m3-collapsible-section";
import M3OutlinedButton from "@/components/ui/m3-outlined-button";
import { DUPLICANT_EXPORTABLE_BEHAVIORS } from "@/lib/oni/oni-constants";
import { useSaveSession } from "@/lib/save-session/save-session-context";

function normalizeName(value: unknown): string {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || "Duplicant";
}

type DuplicantActionsPanelProps = {
  duplicantId: number;
  duplicantName?: string;
  expandSignal?: number;
  onCopied?: () => void;
  containerClassName?: string;
  canClone?: boolean;
};

export default function DuplicantActionsPanel({
  duplicantId,
  duplicantName,
  expandSignal,
  onCopied,
  canClone = true,
  containerClassName = "rounded-2xl border border-[var(--outline)] bg-[var(--surface-container)] p-3",
}: DuplicantActionsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const {
    copyPasteData,
    copyDuplicantBehaviors,
    canPasteBehaviorsTo,
    pasteDuplicantBehaviors,
    exportDuplicantBehaviors,
    importDuplicantBehaviors,
    cloneDuplicant,
  } = useSaveSession();

  const orderedBehaviors = useMemo(
    () =>
      [...DUPLICANT_EXPORTABLE_BEHAVIORS].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      ),
    [],
  );
  const behaviorNames = useMemo(
    () => orderedBehaviors.map((entry) => entry.behavior),
    [orderedBehaviors],
  );

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(behaviorNames),
  );
  // Inline feedback next to the buttons, so import/export results are visible
  // here instead of only in the top-of-page banner (which can be off-screen).
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const selectedNames = useMemo(() => [...selected], [selected]);
  const canPaste = canPasteBehaviorsTo(duplicantId);
  const copiedCount = copyPasteData
    ? Object.keys(copyPasteData.behaviors || {}).length
    : 0;
  const bufferSourceLabel = useMemo(() => {
    if (!copyPasteData) {
      return null;
    }
    const sourceName =
      typeof copyPasteData.sourceName === "string" &&
      copyPasteData.sourceName.trim()
        ? copyPasteData.sourceName.trim()
        : null;
    const sourceId = Number.isFinite(copyPasteData.sourceId)
      ? copyPasteData.sourceId
      : null;
    if (sourceName && sourceId !== null) {
      return `${sourceName} (${sourceId})`;
    }
    if (sourceName) {
      return sourceName;
    }
    if (sourceId !== null) {
      return `Duplicant ${sourceId}`;
    }
    return null;
  }, [copyPasteData]);

  const toggleBehavior = (behaviorName: string) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(behaviorName)) {
        next.delete(behaviorName);
      } else {
        next.add(behaviorName);
      }
      return next;
    });
  };

  return (
    <M3CollapsibleSection
      title="More actions"
      defaultCollapsed={true}
      expandSignal={expandSignal}
      containerClassName={containerClassName}
      titleClassName="text-sm font-semibold"
      headerClassName="rounded-xl px-3 py-2.5"
      expandedMarginClassName="mt-3"
    >
      <p className="text-xs opacity-70">
        Buffer: {copiedCount} behavior{copiedCount === 1 ? "" : "s"}
        {bufferSourceLabel ? ` from ${bufferSourceLabel}` : ""}
      </p>
      <p className="mt-1 text-xs opacity-60">
        Target: {normalizeName(duplicantName)} ({duplicantId})
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {orderedBehaviors.map((entry) => {
          const isSelected = selected.has(entry.behavior);
          return (
            <M3Chip
              key={entry.behavior}
              as="button"
              type="button"
              aria-pressed={isSelected}
              onClick={() => toggleBehavior(entry.behavior)}
              label={
                <>
                  <span
                    className="inline-flex h-3.5 w-3.5 items-center justify-center"
                    aria-hidden="true"
                  >
                    {isSelected ? (
                      <FaCheck className="h-3 w-3 text-[var(--accent)]" />
                    ) : (
                      <FaXmark className="h-3 w-3 opacity-65" />
                    )}
                  </span>
                  <span>{entry.name}</span>
                </>
              }
              className={`min-h-9 w-full cursor-pointer justify-start bg-[var(--surface-container-high)] text-left transition hover:bg-[var(--state-hover)] ${
                isSelected
                  ? "border-[var(--outline-strong)] bg-[var(--state-hover)]"
                  : ""
              }`}
            />
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <M3OutlinedButton
          onClick={() => {
            copyDuplicantBehaviors(duplicantId, selectedNames);
            if (typeof onCopied === "function") {
              onCopied();
            }
            setFeedback({
              kind: "success",
              text: `Copied ${selectedNames.length} behavior${
                selectedNames.length === 1 ? "" : "s"
              } to the buffer.`,
            });
          }}
          disabled={selectedNames.length === 0}
          className="px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
        >
          Copy
        </M3OutlinedButton>
        <M3OutlinedButton
          onClick={() => {
            pasteDuplicantBehaviors(duplicantId, selectedNames);
            setFeedback({ kind: "success", text: "Behaviors pasted." });
          }}
          disabled={selectedNames.length === 0 || !canPaste}
          className="px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
        >
          Paste
        </M3OutlinedButton>
        <M3OutlinedButton
          onClick={async () => {
            await exportDuplicantBehaviors(duplicantId, selectedNames);
            setFeedback({ kind: "success", text: "Exported to a JSON file." });
          }}
          disabled={selectedNames.length === 0}
          className="px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
        >
          Export
        </M3OutlinedButton>
        <M3OutlinedButton
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1.5 text-xs font-semibold"
        >
          Import
        </M3OutlinedButton>
        <M3OutlinedButton
          onClick={() => {
            cloneDuplicant(duplicantId);
            setFeedback({ kind: "success", text: "Duplicant cloned." });
          }}
          disabled={!canClone}
          className="px-3 py-1.5 text-xs font-semibold"
        >
          Clone
        </M3OutlinedButton>
      </div>

      {!canPaste ? (
        <p className="mt-2 text-xs opacity-65">
          Paste disabled: copied behaviors are from a different object type.
        </p>
      ) : null}

      {!canClone ? (
        <p className="mt-2 text-xs opacity-65">
          Clone disabled: Bionic-specific state is preserved but not modeled.
        </p>
      ) : null}

      {feedback ? (
        <p
          role={feedback.kind === "error" ? "alert" : "status"}
          className={`mt-2 text-xs ${
            feedback.kind === "error"
              ? "m3-error-text"
              : "text-[var(--success)]"
          }`}
        >
          {feedback.text}
        </p>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) {
            return;
          }
          const result = await importDuplicantBehaviors(duplicantId, file);
          if (result === "applied") {
            setFeedback({ kind: "success", text: "Behaviors imported." });
          } else if (result === "error") {
            setFeedback({
              kind: "error",
              text: "Import failed. See the message at the top of the page.",
            });
          } else {
            setFeedback(null);
          }
        }}
      />
    </M3CollapsibleSection>
  );
}
