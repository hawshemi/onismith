"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  useSaveSession,
  type SaveSessionValue,
} from "@/lib/save-session/save-session-context";
import { FaFileArrowUp } from "react-icons/fa6";
import M3Select from "@/components/ui/m3-select";
import M3ToggleField from "@/components/ui/m3-toggle-field";
import M3OutlinedButton from "@/components/ui/m3-outlined-button";
import { NumberField } from "@/components/ui/numeric-fields";
import { useSyncOnChange } from "@/lib/use-sync-on-change";
import { getDlcDisplayName } from "@/lib/oni/dlc";
import { getClusterDisplayName } from "@/lib/oni/world-names";
import {
  getDifficultySettingLabel,
  getDifficultyValueLabel,
  selectActiveMods,
  selectDifficultySettings,
  selectDlcMixingSettings,
  selectFogSummary,
} from "@/lib/oni/save-selectors";

const SAVE_PATHS = {
  windows:
    "C:\\Users\\<Your Username>\\Documents\\Klei\\OxygenNotIncluded\\save_files\\",
  mac: "~/Library/Application Support/unity.Klei.Oxygen Not Included/save_files/",
  linux: "~/.config/unity3d/Klei/Oxygen Not Included/save_files/",
};
const TOGGLE_SETTING_NAMES = new Set([
  "CarePackages",
  "SandboxMode",
  "FastWorkersMode",
  "Teleporters",
]);

type GameInfo = {
  baseName?: string;
  numberOfCycles?: number;
  numberOfDuplicants?: number;
  saveMajorVersion?: number;
  saveMinorVersion?: number;
  clusterId?: string;
  isAutoSave?: boolean;
  dlcIds?: string[];
};

type OverviewSession = {
  saveGame?: SaveSessionValue["saveGame"];
  fileName?: string | null;
  parseTimeMs?: number | string | null;
  lastWrittenBytes: number | null;
};

function formatBytes(bytes: number | null | undefined): string {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes < 0) {
    return "N/A";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatParseTime(value: number | string | null | undefined): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value.toFixed(0)} ms`;
  }
  if (typeof value === "string" && value && value !== "Unknown") {
    return value;
  }
  return "Unknown";
}

function makeOverviewSummary(session: OverviewSession) {
  const gameInfo: GameInfo = session.saveGame?.header?.gameInfo ?? {};
  const dlcIds = Array.isArray(gameInfo.dlcIds) ? gameInfo.dlcIds : [];
  const activeMods = selectActiveMods(session.saveGame ?? null);
  const mixingSettings = selectDlcMixingSettings(session.saveGame ?? null);
  const fog = selectFogSummary(session.saveGame ?? null);
  const clusterId = gameInfo.clusterId ?? "";
  return {
    fileName: session.fileName ?? "Unknown",
    parseTimeMs: formatParseTime(session.parseTimeMs),
    colonyName: gameInfo.baseName ?? "",
    cyclesValue: Number.isFinite(gameInfo.numberOfCycles)
      ? (gameInfo.numberOfCycles as number)
      : 0,
    duplicants: gameInfo.numberOfDuplicants ?? "Unknown",
    version: `${gameInfo.saveMajorVersion ?? "?"}.${gameInfo.saveMinorVersion ?? "?"}`,
    buildVersion: session.saveGame?.header?.buildVersion ?? "Unknown",
    cluster: clusterId ? getClusterDisplayName(clusterId) : "Unknown",
    developerToolsUsed: Boolean(session.saveGame?.gameData?.debugWasUsed),
    autoSave: Boolean(gameInfo.isAutoSave),
    dlcs: dlcIds
      .map((id) => ({ id, name: getDlcDisplayName(id) }))
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      ),
    activeMods,
    mixingSettings,
    fog,
    lastWrittenBytes: formatBytes(session.lastWrittenBytes),
  };
}

type StatTileProps = {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
};

function StatTile({ label, value, mono }: StatTileProps) {
  return (
    <div className="m3-panel px-3 py-2.5">
      <p className="m3-label">{label}</p>
      <p
        className={`mt-1 truncate text-sm font-semibold tabular-nums ${
          mono ? "font-mono" : ""
        }`}
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </p>
    </div>
  );
}

type ColonyNameFieldProps = {
  value: string;
  onCommit: (name: string) => void;
};

// Commit on blur/Enter (like NumberField) instead of per keystroke: each commit
// rebuilds the saveGame and re-derives the cards. Empty names are rejected.
function ColonyNameField({ value, onCommit }: ColonyNameFieldProps) {
  const [draft, setDraft] = useState(value);

  useSyncOnChange([value], () => {
    setDraft(value);
  });

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onCommit(trimmed);
    } else {
      setDraft(value);
    }
  };

  return (
    <label className="block">
      <span className="m3-label">Colony Name</span>
      <input
        type="text"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        className="m3-field mt-1 w-full px-3 py-2 text-2xl font-semibold"
      />
    </label>
  );
}

function NoSaveState({
  onChooseSave,
  isBusy,
}: {
  onChooseSave: () => void;
  isBusy: boolean;
}) {
  return (
    <section className="m3-card mx-auto max-w-3xl p-5 sm:p-6">
      <h2 className="text-xl font-semibold">No Save Loaded</h2>
      <p className="mt-2 text-sm opacity-80">
        Everything is parsed in your browser; nothing is uploaded.
      </p>

      <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-[var(--outline-strong)] bg-[var(--surface-container)] px-4 py-7 text-center">
        <FaFileArrowUp
          aria-hidden="true"
          className="h-7 w-7 text-[var(--accent)]"
        />
        <p className="text-base font-semibold">Drag and drop your save here</p>
        <p className="max-w-md text-sm opacity-75">
          Drop a <code>.sav</code> file anywhere on this page or choose one from
          your device.
        </p>
        <M3OutlinedButton
          onClick={onChooseSave}
          disabled={isBusy}
          className="mt-2 px-5 py-2.5 text-sm"
        >
          Choose save file
        </M3OutlinedButton>
      </div>

      <div className="mt-5">
        <p className="m3-label">Common save locations</p>
        <div className="mt-2 grid gap-2">
          <div className="m3-panel px-3 py-2">
            <p className="m3-label">Windows</p>
            <code className="mt-1 block break-all text-xs">
              {SAVE_PATHS.windows}
            </code>
          </div>
          <div className="m3-panel px-3 py-2">
            <p className="m3-label">macOS</p>
            <code className="mt-1 block break-all text-xs">
              {SAVE_PATHS.mac}
            </code>
          </div>
          <div className="m3-panel px-3 py-2">
            <p className="m3-label">Linux</p>
            <code className="mt-1 block break-all text-xs">
              {SAVE_PATHS.linux}
            </code>
          </div>
        </div>
      </div>
    </section>
  );
}

type OverviewSummary = ReturnType<typeof makeOverviewSummary>;

type SaveError = SaveSessionValue["error"];

type ErrorStateProps = {
  error?: SaveError | null;
  canForceLoad?: boolean;
  forceLoadPendingFile?: () => void;
  pendingFileName?: string;
};

function ErrorState({
  error,
  canForceLoad,
  forceLoadPendingFile,
  pendingFileName,
}: ErrorStateProps) {
  const isMajorMismatch = error?.code === "E_VERSION_MAJOR";
  const isMinorMismatch = error?.code === "E_VERSION_MINOR";

  return (
    <section
      role="alert"
      className="m3-card border-[color:var(--error)]/40 bg-[var(--error-surface)] p-5"
    >
      <h2 className="m3-error-text text-xl font-semibold">
        Failed To Load Save
      </h2>
      {pendingFileName ? (
        <p className="mt-2 text-xs opacity-75">
          File: <code>{pendingFileName}</code>
        </p>
      ) : null}
      <p className="m3-error-text mt-2 text-sm">
        {error?.message || "Unknown parsing error."}
      </p>
      {isMajorMismatch ? (
        <p className="mt-2 text-sm opacity-85">
          This save appears to use a different major ONI save format and is
          likely incompatible with the current parser.
        </p>
      ) : null}
      {isMinorMismatch ? (
        <p className="mt-2 text-sm opacity-85">
          Minor version mismatch detected. You can try force-loading with major
          strictness.
        </p>
      ) : null}
      {error?.code ? (
        <p className="mt-2 text-xs opacity-75">
          Error code: <code>{error.code}</code>
        </p>
      ) : null}
      {canForceLoad ? (
        <M3OutlinedButton
          onClick={forceLoadPendingFile}
          className="mt-4 px-3 py-2 text-sm"
        >
          Override safety check and load with major strictness
        </M3OutlinedButton>
      ) : null}
    </section>
  );
}

type ReadyStateProps = {
  summary: OverviewSummary;
  difficultyOptions: Record<string, string[]>;
  difficulty: Record<string, string>;
  difficultyOrder?: string[];
  onUpdateDifficulty: (settingName: string, value: string) => void;
  onUpdateColonyName: (name: string) => void;
  onUpdateCycleCount: (cycles: number) => void;
};

function ReadyState({
  summary,
  difficultyOptions,
  difficulty,
  difficultyOrder,
  onUpdateDifficulty,
  onUpdateColonyName,
  onUpdateCycleCount,
}: ReadyStateProps) {
  const settingOrder =
    Array.isArray(difficultyOrder) && difficultyOrder.length > 0
      ? difficultyOrder
      : Object.keys(difficultyOptions);
  const displaySettingOrder = useMemo(() => {
    const nonToggle = settingOrder.filter(
      (name) => !TOGGLE_SETTING_NAMES.has(name),
    );
    const toggle = settingOrder.filter((name) =>
      TOGGLE_SETTING_NAMES.has(name),
    );
    return [...nonToggle, ...toggle];
  }, [settingOrder]);

  const isToggleOptions = (options: string[]) =>
    Array.isArray(options) &&
    options.length === 2 &&
    options.includes("Enabled") &&
    options.includes("Disabled");

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(20rem,0.9fr)_minmax(28rem,1.1fr)] lg:items-start">
      <section className="m3-card p-4 sm:p-5">
        <ColonyNameField
          value={summary.colonyName}
          onCommit={onUpdateColonyName}
        />

        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <div className="m3-panel px-3 py-2.5">
            <label className="block">
              <span className="m3-label">Cycles</span>
              <NumberField
                value={summary.cyclesValue}
                min={0}
                step={1}
                onCommit={onUpdateCycleCount}
                aria-label="Cycles"
                className="m3-field mt-1 w-full px-2 py-1 text-sm font-semibold tabular-nums"
              />
            </label>
          </div>
          <StatTile label="Duplicants" value={summary.duplicants} />
          <StatTile label="Save Version" value={summary.version} />
          <StatTile label="Game Build" value={summary.buildVersion} />
          <StatTile label="Cluster" value={summary.cluster} />
          <StatTile
            label="Developer Tools Used"
            value={summary.developerToolsUsed ? "Yes" : "No"}
          />
          <StatTile label="File" value={summary.fileName} mono />
          <StatTile label="Last Saved Size" value={summary.lastWrittenBytes} />
          <StatTile label="Auto Save" value={summary.autoSave ? "Yes" : "No"} />
        </div>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          <section className="m3-panel p-3" aria-labelledby="overview-dlc">
            <div className="flex items-center justify-between gap-3">
              <h2 id="overview-dlc" className="m3-label">
                Downloadable content
              </h2>
              <span className="m3-tag shrink-0">
                {summary.dlcs.length} active
              </span>
            </div>
            <div className="mt-2 grid gap-1.5">
              {summary.dlcs.length === 0 ? (
                <p className="m3-panel-inset px-3 py-2 text-xs opacity-70">
                  None detected
                </p>
              ) : (
                summary.dlcs.map((dlc) => (
                  <div key={dlc.id} className="m3-panel-inset px-3 py-2">
                    <p
                      className="truncate text-sm font-medium"
                      title={dlc.name}
                    >
                      {dlc.name}
                    </p>
                    <code
                      className="mt-0.5 block truncate text-[0.6875rem] opacity-55"
                      title={dlc.id}
                    >
                      {dlc.id}
                    </code>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="m3-panel p-3" aria-labelledby="overview-mods">
            <div className="flex items-center justify-between gap-3">
              <h2 id="overview-mods" className="m3-label">
                Active mods
              </h2>
              <span className="m3-tag shrink-0">
                {summary.activeMods.length} active
              </span>
            </div>
            <div className="mt-2 grid gap-1.5">
              {summary.activeMods.length === 0 ? (
                <p className="m3-panel-inset px-3 py-2 text-xs opacity-70">
                  None recorded
                </p>
              ) : (
                summary.activeMods.map((mod) => (
                  <div key={mod.id} className="m3-panel-inset px-3 py-2">
                    <p
                      className="truncate text-sm font-medium"
                      title={mod.title}
                    >
                      {mod.title}
                    </p>
                    <code
                      className="mt-0.5 block truncate text-[0.6875rem] opacity-55"
                      title={mod.id}
                    >
                      {mod.id}
                    </code>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="m3-panel mt-3 p-3" aria-labelledby="overview-fog">
          <div className="flex items-center justify-between gap-3">
            <h2 id="overview-fog" className="m3-label">
              Fog and streamed grids
            </h2>
            <span className="m3-tag shrink-0">Read-only</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="m3-panel-inset px-3 py-2">
              <p className="m3-label">World grid</p>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {summary.fog.width} × {summary.fog.height}
              </p>
            </div>
            <div className="m3-panel-inset px-3 py-2">
              <p className="m3-label">Streamed data</p>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {formatBytes(summary.fog.totalBytes)}
              </p>
            </div>
            <div className="m3-panel-inset col-span-2 px-3 py-2">
              <p className="m3-label">Stored visible entries</p>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {summary.fog.visibleEntryCount === null
                  ? "Not recorded"
                  : summary.fog.visibleEntryCount.toLocaleString()}
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs leading-relaxed opacity-65">
            This is the non-zero entry count from ONI&apos;s opaque visibility
            stream, not a map-reveal percentage. Editing fog safely also
            requires synchronized grid, simulation, and object state.
          </p>
          {summary.fog.streams.length > 0 ? (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-medium">
                Stream details ({summary.fog.streams.length})
              </summary>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {summary.fog.streams.map((stream) => (
                  <div
                    key={stream.name}
                    className="m3-panel-inset flex items-center justify-between gap-3 px-3 py-2 text-xs"
                  >
                    <code className="truncate" title={stream.name}>
                      {stream.name}
                    </code>
                    <span className="shrink-0 tabular-nums opacity-70">
                      {formatBytes(stream.bytes)}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </section>

        {summary.mixingSettings.length > 0 ? (
          <details className="m3-panel mt-3 p-3">
            <summary className="cursor-pointer text-sm font-semibold">
              Saved DLC mixing choices ({summary.mixingSettings.length})
            </summary>
            <p className="mt-2 text-xs opacity-65">
              Read-only world-generation settings. Changing them after the
              worlds exist would not regenerate the cluster.
            </p>
            <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {summary.mixingSettings.map((setting) => (
                <div
                  key={setting.id}
                  className="m3-panel-inset flex items-center justify-between gap-3 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm" title={setting.label}>
                      {setting.label}
                    </p>
                    <code
                      className="block truncate text-[0.6875rem] opacity-55"
                      title={setting.id}
                    >
                      {setting.id}
                    </code>
                  </div>
                  <span className="m3-tag shrink-0">{setting.value}</span>
                </div>
              ))}
            </div>
          </details>
        ) : null}

        <p className="mt-3 text-xs opacity-60">
          Parsed in {summary.parseTimeMs}
        </p>
      </section>

      <section className="m3-card p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Difficulty & Game Settings</h2>
        <p className="mt-1 text-xs opacity-70">
          Changes apply to the loaded save and are written back when you save.
        </p>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {displaySettingOrder.map((settingName) => {
            const options = difficultyOptions[settingName] || [];
            const selected = difficulty[settingName] ?? options[0] ?? "";
            const label = getDifficultySettingLabel(settingName);
            if (isToggleOptions(options)) {
              return (
                <M3ToggleField
                  key={settingName}
                  label={label}
                  checked={selected === "Enabled"}
                  onChange={(event) =>
                    onUpdateDifficulty(
                      settingName,
                      event.target.checked ? "Enabled" : "Disabled",
                    )
                  }
                />
              );
            }
            return (
              <label key={settingName} className="flex flex-col gap-1 text-sm">
                <span id={`difficulty-${settingName}`} className="opacity-80">
                  {label}
                </span>
                {options.length > 0 ? (
                  <M3Select
                    aria-labelledby={`difficulty-${settingName}`}
                    value={selected}
                    onChange={(event) =>
                      onUpdateDifficulty(settingName, event.target.value)
                    }
                    className="px-3 py-2 text-sm"
                  >
                    {options.map((value) => (
                      <option key={value} value={value}>
                        {getDifficultyValueLabel(settingName, value)}
                      </option>
                    ))}
                  </M3Select>
                ) : (
                  <input
                    type="text"
                    value={selected}
                    onChange={(event) =>
                      onUpdateDifficulty(settingName, event.target.value)
                    }
                    className="m3-field px-3 py-2 text-sm"
                  />
                )}
              </label>
            );
          })}
        </div>
      </section>
    </div>
  );
}

type DifficultySettings = {
  optionsBySetting: Record<string, string[]>;
  selectedValues: Record<string, string>;
  settingOrder: string[];
};

export default function OverviewPage() {
  const session = useSaveSession();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const summary = useMemo(() => makeOverviewSummary(session), [session]);
  const { optionsBySetting, selectedValues, settingOrder } = useMemo(
    () => selectDifficultySettings(session.saveGame) as DifficultySettings,
    [session.saveGame],
  );

  const chooseSave = async () => {
    const usedEnhancedPicker = await session.loadSaveWithPicker({
      versionStrictness: session.parseStrictness,
    });
    if (!usedEnhancedPicker) {
      fileInputRef.current?.click();
    }
  };

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    await session.loadSaveFile(file, {
      versionStrictness: session.parseStrictness,
    });
  };

  return (
    <div className="m3-page m3-page-flow">
      {!session.hasSave && session.status !== "error" ? (
        <NoSaveState onChooseSave={chooseSave} isBusy={session.isBusy} />
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept=".sav"
        className="hidden"
        onChange={onFileChange}
      />

      {session.status === "error" ? (
        <ErrorState
          error={session.error}
          canForceLoad={session.canForceLoad}
          forceLoadPendingFile={session.forceLoadPendingFile}
          pendingFileName={session.pendingFile?.name}
        />
      ) : null}

      {session.hasSave ? (
        <ReadyState
          summary={summary}
          difficultyOptions={optionsBySetting}
          difficulty={selectedValues}
          difficultyOrder={settingOrder}
          onUpdateDifficulty={session.updateDifficultySetting}
          onUpdateColonyName={session.updateColonyName}
          onUpdateCycleCount={session.updateCycleCount}
        />
      ) : null}
    </div>
  );
}
