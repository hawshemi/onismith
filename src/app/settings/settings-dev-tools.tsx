"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { useSyncOnChange } from "@/lib/use-sync-on-change";
import { useI18n } from "@/lib/i18n/i18n-context";
import { useSaveSession } from "@/lib/save-session/save-session-context";
import { probeSaveGame } from "@/lib/oni/save-probe";
import {
  HAIR_OFFSET_BASES,
  HAIR_OFFSETS_STORAGE_KEY,
  readStoredHairOffsets,
} from "@/lib/oni/hair-offsets";
import M3ExpressiveLoadingIndicator from "@/components/ui/m3-expressive-loading-indicator";
import M3Dialog from "@/components/ui/m3-dialog";
import M3TonalButton from "@/components/ui/m3-tonal-button";
import M3OutlinedButton from "@/components/ui/m3-outlined-button";

interface HairOffset {
  x?: number;
  y?: number;
  scale?: number;
}

type HairOffsets = Record<string, HairOffset>;

interface HairDragState {
  hairId: string;
  startX: number;
  startY: number;
  baseX: number;
  baseY: number;
}

type ModalPreview = "loading" | "saving" | "import-warning" | "backup-prompt";

interface ProbeReport {
  scan: {
    scannedNodes: number;
    maxNodes: number;
    truncated: boolean;
    maxMatchesPerTerm: number;
  };
  terms: { id: string; label: string; count: number }[];
  appearance?: {
    hair?: { unique?: number; total?: number };
    headshape?: { unique?: number; total?: number };
    eyes?: { unique?: number; total?: number };
  } | null;
}

function finiteOr(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? (value as number) : fallback;
}

export default function SettingsDevTools() {
  const { t } = useI18n();
  const { saveGame, fileName, hasSave } = useSaveSession();
  const [probe, setProbe] = useState<ProbeReport | null>(null);
  const [probeError, setProbeError] = useState("");
  const [hairOffsets, setHairOffsets] = useState<HairOffsets>(
    readStoredHairOffsets,
  );
  const [hairOffsetHairId, setHairOffsetHairId] = useState("1");
  const [hairOffsetX, setHairOffsetX] = useState("0");
  const [hairOffsetY, setHairOffsetY] = useState("0");
  const [hairOffsetScale, setHairOffsetScale] = useState("1");
  const [hairOffsetError, setHairOffsetError] = useState("");
  const [hairOffsetJson, setHairOffsetJson] = useState("");
  const [modalPreview, setModalPreview] = useState<ModalPreview | null>(null);
  const dragRef = useRef<HairDragState | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      HAIR_OFFSETS_STORAGE_KEY,
      JSON.stringify(hairOffsets),
    );
  }, [hairOffsets]);

  useSyncOnChange([hairOffsetHairId, hairOffsets], () => {
    const parsedHairId = Number(hairOffsetHairId);
    if (!Number.isFinite(parsedHairId)) {
      return;
    }
    const entry = hairOffsets[String(parsedHairId)];
    if (entry && Number.isFinite(entry.x) && Number.isFinite(entry.y)) {
      setHairOffsetX(String(entry.x));
      setHairOffsetY(String(entry.y));
      setHairOffsetScale(
        Number.isFinite(entry.scale) ? String(entry.scale) : "1",
      );
      return;
    }
    setHairOffsetX("0");
    setHairOffsetY("0");
    setHairOffsetScale("1");
  });

  const hairOffsetEntries = useMemo(() => {
    return Object.entries(hairOffsets)
      .map(([key, value]) => ({
        hairId: String(key),
        x: Number(value?.x ?? 0),
        y: Number(value?.y ?? 0),
        scale: Number(value?.scale ?? 1),
      }))
      .sort((a, b) => Number(a.hairId) - Number(b.hairId));
  }, [hairOffsets]);

  const saveHairOffset = useCallback(() => {
    const parsedHairId = Number(hairOffsetHairId);
    if (
      !Number.isFinite(parsedHairId) ||
      parsedHairId < 1 ||
      parsedHairId > 99
    ) {
      setHairOffsetError("Hair ID must be between 1 and 99.");
      return;
    }
    const parsedX = Number(hairOffsetX);
    const parsedY = Number(hairOffsetY);
    const parsedScale = Number(hairOffsetScale);
    if (
      !Number.isFinite(parsedX) ||
      !Number.isFinite(parsedY) ||
      !Number.isFinite(parsedScale)
    ) {
      setHairOffsetError("Offsets must be valid numbers.");
      return;
    }
    if (parsedScale < 0.5 || parsedScale > 2) {
      setHairOffsetError("Scale must be between 0.5 and 2.");
      return;
    }
    setHairOffsets((prev) => ({
      ...prev,
      [String(parsedHairId)]: {
        x: Math.trunc(parsedX),
        y: Math.trunc(parsedY),
        scale: Number(parsedScale.toFixed(2)),
      },
    }));
    setHairOffsetError("");
  }, [hairOffsetHairId, hairOffsetScale, hairOffsetX, hairOffsetY]);

  const removeHairOffset = useCallback((hairId: string) => {
    setHairOffsets((prev) => {
      const next = { ...prev };
      delete next[hairId];
      return next;
    });
  }, []);

  const applyHairOffsetJson = useCallback(() => {
    if (!hairOffsetJson.trim()) {
      setHairOffsetError("Paste a JSON object first.");
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(hairOffsetJson);
    } catch {
      setHairOffsetError("Invalid JSON.");
      return;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      setHairOffsetError("JSON must be an object keyed by hair id.");
      return;
    }
    // Sanitize each entry with the same rules as the single-offset form so
    // pasted JSON can't persist out-of-range ids/scales or non-numeric offsets
    // to localStorage. Invalid entries are dropped rather than failing the whole
    // paste.
    const sanitized: Record<string, { x: number; y: number; scale: number }> =
      {};
    let skipped = 0;
    for (const [key, value] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      const hairId = Number(key);
      const offset = value as { x?: unknown; y?: unknown; scale?: unknown };
      const x = Number(offset?.x);
      const y = Number(offset?.y);
      const scale = Number(offset?.scale);
      if (
        !Number.isInteger(hairId) ||
        hairId < 1 ||
        hairId > 99 ||
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        !Number.isFinite(scale) ||
        scale < 0.5 ||
        scale > 2
      ) {
        skipped += 1;
        continue;
      }
      sanitized[String(hairId)] = {
        x: Math.trunc(x),
        y: Math.trunc(y),
        scale: Number(scale.toFixed(2)),
      };
    }
    if (Object.keys(sanitized).length === 0) {
      setHairOffsetError("No valid hair offsets found in the JSON.");
      return;
    }
    setHairOffsets(sanitized);
    setHairOffsetError(
      skipped > 0
        ? `Applied. Skipped ${skipped} invalid ${skipped === 1 ? "entry" : "entries"}.`
        : "",
    );
  }, [hairOffsetJson]);

  const downloadJson = useCallback((payload: unknown, name: string) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, []);

  const exportHairOffsets = useCallback(() => {
    downloadJson(hairOffsets, "onismith-hair-offsets.json");
  }, [downloadJson, hairOffsets]);

  const previewHairId = useMemo(() => {
    const parsed = Number(hairOffsetHairId);
    if (!Number.isFinite(parsed)) {
      return 1;
    }
    return Math.min(99, Math.max(1, Math.floor(parsed)));
  }, [hairOffsetHairId]);

  const previewOffset = useMemo(() => {
    const base = (HAIR_OFFSET_BASES as HairOffsets)[previewHairId];
    const deltaX = Number(hairOffsetX) || 0;
    const deltaY = Number(hairOffsetY) || 0;
    const deltaScale = Number(hairOffsetScale) || 1;
    return {
      baseX: finiteOr(base?.x, 0),
      baseY: finiteOr(base?.y, 0),
      baseScale: finiteOr(base?.scale, 1),
      deltaX,
      deltaY,
      deltaScale,
      x: finiteOr(base?.x, 0) + deltaX,
      y: finiteOr(base?.y, 0) + deltaY,
      scale: finiteOr(base?.scale, 1) * deltaScale,
    };
  }, [hairOffsetScale, hairOffsetX, hairOffsetY, previewHairId]);

  const onHairDragStart = useCallback(
    (event: React.PointerEvent<HTMLImageElement>) => {
      event.preventDefault();
      const baseX = Number.isFinite(previewOffset.x) ? previewOffset.x : 0;
      const baseY = Number.isFinite(previewOffset.y) ? previewOffset.y : 0;
      dragRef.current = {
        hairId: String(previewHairId),
        startX: event.clientX,
        startY: event.clientY,
        baseX,
        baseY,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [previewHairId, previewOffset.x, previewOffset.y],
  );

  const onHairDragMove = useCallback(
    (event: React.PointerEvent<HTMLImageElement>) => {
      const drag = dragRef.current;
      if (!drag) {
        return;
      }
      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;
      const nextEffectiveX = Math.trunc(drag.baseX + deltaX);
      const nextEffectiveY = Math.trunc(drag.baseY + deltaY);
      const nextDeltaX = Math.trunc(nextEffectiveX - previewOffset.baseX);
      const nextDeltaY = Math.trunc(nextEffectiveY - previewOffset.baseY);
      setHairOffsetX(String(nextDeltaX));
      setHairOffsetY(String(nextDeltaY));
      setHairOffsets((prev) => ({
        ...prev,
        [drag.hairId]: {
          x: nextDeltaX,
          y: nextDeltaY,
          scale: Number(hairOffsetScale) || 1,
        },
      }));
    },
    [hairOffsetScale, previewOffset.baseX, previewOffset.baseY, setHairOffsets],
  );

  const onHairDragEnd = useCallback(
    (event: React.PointerEvent<HTMLImageElement>) => {
      const drag = dragRef.current;
      if (!drag) {
        return;
      }
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      dragRef.current = null;
    },
    [],
  );

  const runProbe = useCallback(() => {
    if (!saveGame) {
      setProbeError("Load a save file to generate a probe report.");
      return null;
    }
    try {
      const nextProbe = probeSaveGame(saveGame, { fileName });
      setProbe(nextProbe);
      setProbeError("");
      return nextProbe;
    } catch (error) {
      setProbeError(
        (error as { message?: string })?.message ||
          "Failed to generate probe report.",
      );
      return null;
    }
  }, [fileName, saveGame]);

  const onDownloadProbe = useCallback(() => {
    const result = probe || runProbe();
    if (!result) {
      return;
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputName = `onismith-probe-${timestamp}.json`;
    downloadJson(result, outputName);
  }, [downloadJson, probe, runProbe]);

  return (
    <>
      <section className="m3-card p-4 sm:p-5">
        <h2 className="text-xl font-semibold">Developer tools</h2>

        <div className="mt-4 m3-panel p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">
                {t("settings.probe.title", { fallback: "Save Schema Probe" })}
              </h3>
              <p className="mt-1 text-xs opacity-75">
                {t("settings.probe.description", {
                  fallback:
                    "Scans the loaded save file for settings like disease, morale, radiation, stress, and other game rules.",
                })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <M3OutlinedButton
                onClick={runProbe}
                disabled={!hasSave}
                className="px-3 py-2 text-xs"
              >
                {t("settings.probe.generate", { fallback: "Generate Probe" })}
              </M3OutlinedButton>
              <M3TonalButton
                onClick={onDownloadProbe}
                disabled={!hasSave}
                className="px-3 py-2 text-xs"
              >
                {t("settings.probe.download", { fallback: "Download JSON" })}
              </M3TonalButton>
            </div>
          </div>

          {probeError ? (
            <p role="alert" className="mt-3 text-xs m3-error-text">
              {probeError}
            </p>
          ) : null}

          {probe ? (
            <div className="mt-4 grid gap-2 text-xs opacity-85">
              <p>
                Scan: {probe.scan.scannedNodes} nodes
                {probe.scan.truncated
                  ? ` (truncated at ${probe.scan.maxNodes})`
                  : ""}
              </p>
              <p>Matches per term (max {probe.scan.maxMatchesPerTerm}):</p>
              <div className="grid gap-1">
                {probe.terms.map((term) => (
                  <p key={term.id}>
                    {term.label}: {term.count}
                  </p>
                ))}
              </div>
              {probe.appearance ? (
                <div className="mt-2 grid gap-1">
                  <p>Appearance (hair/headshape/eyes):</p>
                  <p>
                    Hair: {probe.appearance.hair?.unique ?? 0} unique /{" "}
                    {probe.appearance.hair?.total ?? 0} total
                  </p>
                  <p>
                    Headshape: {probe.appearance.headshape?.unique ?? 0} unique
                    / {probe.appearance.headshape?.total ?? 0} total
                  </p>
                  <p>
                    Eyes: {probe.appearance.eyes?.unique ?? 0} unique /{" "}
                    {probe.appearance.eyes?.total ?? 0} total
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-4 m3-panel p-4">
          <h3 className="text-sm font-semibold">Hair Overlay Offsets (px)</h3>
          <p className="mt-1 text-xs opacity-75">
            Set per-hair offsets relative to the baked defaults.
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_260px]">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="m3-panel-inset flex flex-col items-center gap-2 px-4 py-3">
                  <span className="m3-label">Preview</span>
                  <div className="relative h-32 w-32 overflow-hidden rounded-md border border-[var(--outline-faint)] bg-[var(--foreground)]">
                    <Image
                      src="/images/oni/head/head_1.png"
                      alt="Head base"
                      fill
                      className="absolute inset-0 h-full w-full object-contain"
                      draggable="false"
                    />
                    <Image
                      src={`/images/oni/hair/hair_${previewHairId}.png`}
                      alt={`Hair ${previewHairId}`}
                      fill
                      className="absolute inset-0 h-full w-full cursor-move object-contain"
                      style={{
                        transform: `translate(${previewOffset.x}px, ${previewOffset.y}px) scale(${previewOffset.scale})`,
                        transformOrigin: "50% 50%",
                      }}
                      onPointerDown={onHairDragStart}
                      onPointerMove={onHairDragMove}
                      onPointerUp={onHairDragEnd}
                      onPointerCancel={onHairDragEnd}
                      draggable="false"
                    />
                  </div>
                  <span className="text-xs opacity-70">
                    Drag hair to reposition (delta applied on top of baked base)
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-xs opacity-80">
                  <span>Hair ID</span>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    step="1"
                    value={hairOffsetHairId}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      setHairOffsetHairId(event.target.value)
                    }
                    className="w-20 m3-field px-2 py-1 text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs opacity-80">
                  <span>X</span>
                  <input
                    type="number"
                    step="1"
                    value={hairOffsetX}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      setHairOffsetX(event.target.value)
                    }
                    onKeyDown={(
                      event: React.KeyboardEvent<HTMLInputElement>,
                    ) => {
                      if (event.key === "Enter") {
                        saveHairOffset();
                      }
                    }}
                    className="w-20 m3-field px-2 py-1 text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs opacity-80">
                  <span>Y</span>
                  <input
                    type="number"
                    step="1"
                    value={hairOffsetY}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      setHairOffsetY(event.target.value)
                    }
                    onKeyDown={(
                      event: React.KeyboardEvent<HTMLInputElement>,
                    ) => {
                      if (event.key === "Enter") {
                        saveHairOffset();
                      }
                    }}
                    className="w-20 m3-field px-2 py-1 text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs opacity-80">
                  <span>Scale</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.5"
                    max="2"
                    value={hairOffsetScale}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      setHairOffsetScale(event.target.value)
                    }
                    onKeyDown={(
                      event: React.KeyboardEvent<HTMLInputElement>,
                    ) => {
                      if (event.key === "Enter") {
                        saveHairOffset();
                      }
                    }}
                    className="w-20 m3-field px-2 py-1 text-sm"
                  />
                </label>
                <M3TonalButton
                  onClick={saveHairOffset}
                  className="px-3 py-2 text-xs"
                >
                  Save Offset
                </M3TonalButton>
                <M3OutlinedButton
                  onClick={() => {
                    setHairOffsetHairId("1");
                    setHairOffsetX("0");
                    setHairOffsetY("0");
                    setHairOffsetScale("1");
                  }}
                  className="px-3 py-2 text-xs"
                >
                  Reset Fields
                </M3OutlinedButton>
                <M3OutlinedButton
                  onClick={() => setHairOffsets({})}
                  className="px-3 py-2 text-xs"
                >
                  Clear All
                </M3OutlinedButton>
              </div>
              {hairOffsetError ? (
                <p role="alert" className="text-xs m3-error-text">
                  {hairOffsetError}
                </p>
              ) : null}

              <div>
                <label
                  htmlFor="hair-offset-json"
                  className="text-sm font-semibold text-[var(--muted)]"
                >
                  Paste JSON
                </label>
                <textarea
                  id="hair-offset-json"
                  value={hairOffsetJson}
                  onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setHairOffsetJson(event.target.value)
                  }
                  placeholder='{"1":{"x":0,"y":0},"2":{"x":2,"y":-1}}'
                  className="m3-field mt-2 h-28 w-full p-2 text-xs"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <M3OutlinedButton
                    onClick={applyHairOffsetJson}
                    className="px-3 py-2 text-xs"
                  >
                    Apply JSON
                  </M3OutlinedButton>
                  <M3OutlinedButton
                    onClick={() =>
                      setHairOffsetJson(JSON.stringify(hairOffsets, null, 2))
                    }
                    className="px-3 py-2 text-xs"
                  >
                    Load Current JSON
                  </M3OutlinedButton>
                </div>
              </div>
            </div>

            <aside className="m3-panel-inset p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">Adjusted Hairs</span>
                <M3OutlinedButton
                  onClick={exportHairOffsets}
                  className="px-2 py-1 text-xs"
                >
                  Export All
                </M3OutlinedButton>
              </div>
              {hairOffsetEntries.length > 0 ? (
                <div className="mt-3 grid gap-2">
                  {hairOffsetEntries.map((entry) => (
                    <button
                      key={entry.hairId}
                      type="button"
                      onClick={() => {
                        setHairOffsetHairId(entry.hairId);
                        setHairOffsetX(String(entry.x));
                        setHairOffsetY(String(entry.y));
                        setHairOffsetScale(
                          Number.isFinite(entry.scale)
                            ? String(entry.scale)
                            : "1",
                        );
                      }}
                      className="flex min-h-9 w-full items-center justify-between rounded-md border border-[var(--outline-faint)] bg-transparent px-2 py-1 text-left text-[var(--foreground)] hover:bg-[var(--state-hover)]"
                    >
                      <span className="font-semibold">hair_{entry.hairId}</span>
                      <span className="opacity-70">
                        dx {entry.x}, dy {entry.y}, ds{" "}
                        {Number.isFinite(entry.scale) ? entry.scale : 1}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-3 opacity-70">No hair offsets saved yet.</p>
              )}
              {hairOffsetEntries.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <M3OutlinedButton
                    onClick={() => removeHairOffset(hairOffsetHairId)}
                    className="px-2 py-1 text-xs"
                  >
                    Remove Selected
                  </M3OutlinedButton>
                </div>
              ) : null}
            </aside>
          </div>
        </div>

        <div className="mt-4 m3-panel p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Modal Playground</h3>
              <p className="mt-1 text-xs opacity-75">
                Open each app modal to validate layout, copy, and controls.
              </p>
            </div>
            {modalPreview ? (
              <M3OutlinedButton
                onClick={() => setModalPreview(null)}
                className="px-3 py-2 text-xs"
              >
                Close Preview
              </M3OutlinedButton>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <M3OutlinedButton
              onClick={() => setModalPreview("loading")}
              className="px-3 py-2 text-xs"
            >
              Loading Modal
            </M3OutlinedButton>
            <M3OutlinedButton
              onClick={() => setModalPreview("saving")}
              className="px-3 py-2 text-xs"
            >
              Saving Modal
            </M3OutlinedButton>
            <M3OutlinedButton
              onClick={() => setModalPreview("import-warning")}
              className="px-3 py-2 text-xs"
            >
              Import Warning Modal
            </M3OutlinedButton>
            <M3OutlinedButton
              onClick={() => setModalPreview("backup-prompt")}
              className="px-3 py-2 text-xs"
            >
              Backup Prompt Modal
            </M3OutlinedButton>
          </div>
        </div>
      </section>

      <M3Dialog
        open={modalPreview === "loading" || modalPreview === "saving"}
        onClose={() => setModalPreview(null)}
        labelledBy="modal-preview-title"
        className="w-full max-w-md p-5"
      >
        <h3 id="modal-preview-title" className="text-xl font-semibold">
          {modalPreview === "saving"
            ? t("save-file.conditions.saving", { fallback: "Saving" })
            : t("save-file.conditions.loading", { fallback: "Loading" })}
        </h3>
        <p className="mt-1 text-xs opacity-70">
          {t("app.file-label", { fallback: "File" })}:{" "}
          <code>{fileName || "example_save.sav"}</code>
        </p>
        <div className="mt-4 flex items-center gap-3">
          <M3ExpressiveLoadingIndicator size={64} aria-hidden="true" />
          <p className="min-w-0 truncate text-sm opacity-85">
            {modalPreview === "saving"
              ? t("app.progress.writing", { fallback: "Writing save data" })
              : t("app.progress.reading", { fallback: "Reading save data" })}
          </p>
        </div>
        <div className="mt-4">
          <M3TonalButton
            onClick={() => setModalPreview(null)}
            className="px-3 py-2 text-sm"
          >
            Close
          </M3TonalButton>
        </div>
      </M3Dialog>

      <M3Dialog
        open={modalPreview === "import-warning"}
        onClose={() => setModalPreview(null)}
        role="alertdialog"
        labelledBy="modal-preview-title"
        className="w-full max-w-lg p-5"
      >
        <h3 id="modal-preview-title" className="text-xl font-semibold">
          {t("app.import-warning.title", { fallback: "Checksum Warning" })}
        </h3>
        <p className="mt-2 text-sm opacity-85">
          {t("app.import-warning.detail", {
            fallback:
              "Import file checksum does not match the payload. Data may have been modified.",
          })}
        </p>
        <p className="mt-2 text-xs opacity-75">
          {t("app.file-label", { fallback: "File" })}: <code>import.json</code>
        </p>
        <p className="mt-1 text-xs opacity-75">
          {t("app.expected", { fallback: "Expected" })}: <code>abc123</code>
        </p>
        <p className="mt-1 text-xs opacity-75">
          {t("app.actual", { fallback: "Actual" })}: <code>def456</code>
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <M3OutlinedButton
            onClick={() => setModalPreview(null)}
            className="px-3 py-2 text-sm"
          >
            {t("dialog.verbs.cancel_titlecase", { fallback: "Cancel" })}
          </M3OutlinedButton>
          <M3TonalButton
            onClick={() => setModalPreview(null)}
            className="px-3 py-2 text-sm"
          >
            {t("app.import-warning.import-anyway", {
              fallback: "Import Anyway",
            })}
          </M3TonalButton>
        </div>
      </M3Dialog>

      <M3Dialog
        open={modalPreview === "backup-prompt"}
        onClose={() => setModalPreview(null)}
        role="alertdialog"
        labelledBy="modal-preview-title"
        className="w-full max-w-lg p-5"
      >
        <h3 id="modal-preview-title" className="text-xl font-semibold">
          {t("app.backup.title", {
            fallback: "Download Backup Save File?",
          })}
        </h3>
        <p className="mt-2 text-sm opacity-85">
          {t("app.backup.detail", {
            fallback:
              "You're about to overwrite the current save file. Do you want to download a backup first?",
          })}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <M3OutlinedButton
            onClick={() => setModalPreview(null)}
            className="px-3 py-2 text-sm"
          >
            {t("dialog.verbs.cancel_titlecase", { fallback: "Cancel" })}
          </M3OutlinedButton>
          <M3OutlinedButton
            onClick={() => setModalPreview(null)}
            className="px-3 py-2 text-sm"
          >
            {t("app.backup.skip", { fallback: "Skip Backup" })}
          </M3OutlinedButton>
          <M3TonalButton
            onClick={() => setModalPreview(null)}
            className="px-3 py-2 text-sm"
          >
            {t("app.backup.confirm", {
              fallback: "Download Backup & Save",
            })}
          </M3TonalButton>
        </div>
      </M3Dialog>
    </>
  );
}
