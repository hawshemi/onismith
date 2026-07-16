"use client";

import { useId, useState } from "react";
import { useSyncOnChange } from "@/lib/use-sync-on-change";
import { clampToRange } from "@/lib/oni/clamp";

type NumberFieldProps = {
  value: number;
  step?: string | number;
  min?: string | number;
  max?: string | number;
  className?: string;
  onCommit: (value: number) => void;
} & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  | "value"
  | "onChange"
  | "onBlur"
  | "onKeyDown"
  | "step"
  | "min"
  | "max"
  | "type"
>;

// Commit on release/blur rather than on every input event. Each committed
// change rebuilds the whole saveGame and re-derives the dependent cards, so
// firing per keystroke or per slider tick freezes the tab while dragging.
export function NumberField({
  value,
  step,
  min,
  max,
  className,
  onCommit,
  ...rest
}: NumberFieldProps) {
  const normalized = Number.isFinite(value) ? value : 0;
  const [draft, setDraft] = useState(String(normalized));

  useSyncOnChange([normalized], () => {
    setDraft(String(normalized));
  });

  const commit = () => {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(String(normalized));
      return;
    }
    const clamped = clampToRange(parsed, min, max);
    if (clamped !== parsed) {
      setDraft(String(clamped));
    }
    if (clamped !== normalized) {
      onCommit(clamped);
    }
  };

  return (
    <input
      type="number"
      step={step}
      min={min}
      max={max}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
      className={className}
      {...rest}
    />
  );
}

type FractionFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  className?: string;
  description?: string;
  displayAsPercentage?: boolean;
  labelClassName?: string;
};

export function FractionField({
  label,
  value,
  onChange,
  className,
  description,
  displayAsPercentage = false,
  labelClassName,
}: FractionFieldProps) {
  const normalized = Number.isFinite(value) ? value : 0;
  const [draft, setDraft] = useState(normalized);

  useSyncOnChange([normalized], () => {
    setDraft(normalized);
  });

  const commit = (next: string | number) => {
    const parsed = Number(next);
    if (!Number.isFinite(parsed)) {
      return;
    }
    const clamped = clampToRange(parsed, 0, 1);
    if (clamped !== normalized) {
      onChange(clamped);
    }
  };

  const labelId = useId();
  const displayedValue = displayAsPercentage ? draft * 100 : draft;

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className={`flex flex-col gap-1.5 text-xs ${className ?? ""}`}
    >
      <span id={labelId} className={labelClassName ?? "opacity-75"}>
        {label}
      </span>
      {description ? (
        <span className="leading-relaxed opacity-65">{description}</span>
      ) : null}
      <div className="flex items-center gap-2">
        <input
          type="range"
          aria-label={`${label} (slider)`}
          min="0"
          max="1"
          step="0.01"
          value={Number.isFinite(draft) ? draft : 0}
          onChange={(event) => setDraft(Number(event.target.value))}
          onPointerUp={(event) =>
            commit((event.target as HTMLInputElement).value)
          }
          onKeyUp={(event) => commit((event.target as HTMLInputElement).value)}
          className="w-full accent-[var(--accent)]"
        />
        <div className="relative shrink-0">
          <NumberField
            value={displayedValue}
            step={displayAsPercentage ? "1" : "0.01"}
            min="0"
            max={displayAsPercentage ? "100" : "1"}
            onCommit={(next) => commit(displayAsPercentage ? next / 100 : next)}
            aria-label={`${label} (${displayAsPercentage ? "percent" : "value"})`}
            className={`m3-field w-20 py-2 text-right text-sm tabular-nums ${
              displayAsPercentage ? "pr-6 pl-2" : "px-2"
            }`}
          />
          {displayAsPercentage ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs opacity-60"
            >
              %
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
