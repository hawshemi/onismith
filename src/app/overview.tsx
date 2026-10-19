"use client";

import {
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
} from "react";
import {
  useSaveSession,
  type SaveSessionValue,
} from "@/lib/save-session/save-session-context";
import { FaFileArrowUp } from "react-icons/fa6";
import M3Select from "@/components/ui/m3-select";
import M3ToggleField from "@/components/ui/m3-toggle-field";
import M3TonalButton from "@/components/ui/m3-tonal-button";
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
type GameInfo = {
  baseName?: string;
  numberOfCycles?: number;
  numberOfDuplicants?: number;
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
    <div className="min-w-0">
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
  const [error, setError] = useState("");

  useSyncOnChange([value], () => {
    setDraft(value);
    setError("");
  });

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setError("Enter a colony name.");
      return;
    }
    setError("");
    if (trimmed !== value) {
      onCommit(trimmed);
    } else {
      setDraft(value);
    }
  };

  return (
    <label className="block">
      <span className="m3-label">Colony name</span>
      <input
        type="text"
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          setError("");
        }}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "colony-name-error" : undefined}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        className="m3-field mt-1.5 w-full px-3 py-2 text-base font-semibold"
      />
      {error ? (
        <span
          id="colony-name-error"
          role="alert"
          className="mt-1 block text-sm text-[var(--error)]"
        >
          {error}
        </span>
      ) : null}
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
  const platform = useSyncExternalStore(
    () => () => {},
    () =>
      /Mac/i.test(navigator.userAgent)
        ? "mac"
        : /Linux/i.test(navigator.userAgent)
          ? "linux"
          : "windows",
    () => "windows",
  );
  const locations = [
    { id: "windows", label: "Windows", path: SAVE_PATHS.windows },
    { id: "mac", label: "macOS", path: SAVE_PATHS.mac },
    { id: "linux", label: "Linux", path: SAVE_PATHS.linux },
  ].sort((a, b) => Number(b.id === platform) - Number(a.id === platform));
  return (
    <section className="mx-auto w-full max-w-xl py-4 sm:py-8">
      <div className="m3-card overflow-hidden">
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--state-hover)] text-[var(--accent)]">
              <FaFileArrowUp aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">
                Oxygen Not Included save editor
              </h1>
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
                Open an ONI .sav file in your browser to edit Duplicants, colony
                settings, creatures, geysers, and worlds.
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-col items-start gap-3 rounded-lg border border-dashed border-[var(--outline-strong)] bg-[var(--surface-container-low)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Start with a save file</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Choose a <code>.sav</code> file or drop one here.
              </p>
            </div>
            <M3TonalButton
              onClick={onChooseSave}
              disabled={isBusy}
              className="w-full shrink-0 px-4 py-2 text-sm sm:w-auto"
            >
              Choose save file
            </M3TonalButton>
          </div>
          <p className="mt-3 text-xs text-[var(--muted)]">
            Your save is processed locally in your browser. Nothing is uploaded.
            Keep a backup, then save your changes or download a copy.
          </p>
        </div>
        <details className="border-t border-[var(--outline-faint)] px-5 py-3 sm:px-6">
          <summary className="cursor-pointer py-1 text-sm font-medium">
            Where is my save?
          </summary>
          <div className="mt-3 space-y-3 pb-2">
            {locations.map((location) => (
              <div key={location.id}>
                <p className="text-xs font-medium">{location.label}</p>
                <code className="mt-1 block break-all text-xs leading-relaxed text-[var(--muted)]">
                  {location.path}
                </code>
              </div>
            ))}
          </div>
        </details>
      </div>
    </section>
  );
}

type OverviewSummary = ReturnType<typeof makeOverviewSummary>;

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
  const isToggleOptions = (options: string[]) =>
    Array.isArray(options) &&
    options.length === 2 &&
    options.includes("Enabled") &&
    options.includes("Disabled");
  const valueSettings = settingOrder.filter(
    (name) => !isToggleOptions(difficultyOptions[name] ?? []),
  );
  const toggleSettings = settingOrder.filter((name) =>
    isToggleOptions(difficultyOptions[name] ?? []),
  );

  return (
    <div className="space-y-4">
      <section className="m3-card p-4" aria-label="Colony summary">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <ColonyNameField
            value={summary.colonyName}
            onCommit={onUpdateColonyName}
          />
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="m3-label">Cycle</span>
              <NumberField
                value={summary.cyclesValue}
                min={0}
                step={1}
                onCommit={onUpdateCycleCount}
                aria-label="Cycle"
                className="m3-field mt-1.5 w-full px-3 py-2 text-base font-semibold tabular-nums"
              />
            </label>
            <div>
              <p className="m3-label">Duplicants</p>
              <p className="mt-1.5 px-0 py-2 text-base font-semibold tabular-nums">
                {summary.duplicants}
              </p>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">{summary.cluster}</p>
      </section>
      <section className="m3-card p-4">
        <h2 className="text-base font-semibold">Game settings</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Edits stay in this session until you save or download a copy.
        </p>
        <div className="mt-4 grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {valueSettings.map((settingName) => {
            const options = difficultyOptions[settingName] || [];
            const selected = difficulty[settingName] ?? options[0] ?? "";
            const label = getDifficultySettingLabel(settingName);
            return (
              <label
                key={settingName}
                className="flex min-w-0 flex-col gap-1.5 text-sm"
              >
                <span id={`difficulty-${settingName}`} className="m3-label">
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
        {toggleSettings.length > 0 ? (
          <div className="mt-4 grid gap-3 border-t border-[var(--outline-faint)] pt-4 sm:grid-cols-2 xl:grid-cols-4">
            {toggleSettings.map((settingName) => (
              <M3ToggleField
                key={settingName}
                label={getDifficultySettingLabel(settingName)}
                checked={
                  (difficulty[settingName] ??
                    difficultyOptions[settingName][0]) === "Enabled"
                }
                onChange={(event) =>
                  onUpdateDifficulty(
                    settingName,
                    event.target.checked ? "Enabled" : "Disabled",
                  )
                }
              />
            ))}
          </div>
        ) : null}
      </section>
      <details className="m3-card p-4">
        <summary className="cursor-pointer text-base font-semibold">
          Save details
        </summary>
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile label="File" value={summary.fileName} mono />
          <StatTile label="Last saved size" value={summary.lastWrittenBytes} />
          <StatTile label="Autosave" value={summary.autoSave ? "Yes" : "No"} />
          <StatTile
            label="Developer tools used"
            value={summary.developerToolsUsed ? "Yes" : "No"}
          />
        </div>
        <div className="mt-4 grid gap-4 border-t border-[var(--outline-faint)] pt-4 sm:grid-cols-2">
          <section className="min-w-0" aria-labelledby="overview-dlc">
            <div className="flex items-center justify-between gap-3">
              <h2 id="overview-dlc" className="text-sm font-semibold">
                Downloadable content
              </h2>
              <span className="m3-tag shrink-0">
                {summary.dlcs.length} active
              </span>
            </div>
            <div className="mt-2 grid gap-1.5">
              {summary.dlcs.length === 0 ? (
                <p className="py-2 text-xs text-[var(--muted)]">
                  None detected
                </p>
              ) : (
                summary.dlcs.map((dlc) => (
                  <div key={dlc.id} className="py-1.5">
                    <p
                      className="truncate text-sm font-medium"
                      title={dlc.name}
                    >
                      {dlc.name}
                    </p>
                    <code
                      className="mt-0.5 block truncate text-xs text-[var(--muted)]"
                      title={dlc.id}
                    >
                      {dlc.id}
                    </code>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="min-w-0" aria-labelledby="overview-mods">
            <div className="flex items-center justify-between gap-3">
              <h2 id="overview-mods" className="text-sm font-semibold">
                Active mods
              </h2>
              <span className="m3-tag shrink-0">
                {summary.activeMods.length} active
              </span>
            </div>
            <div className="mt-2 grid gap-1.5">
              {summary.activeMods.length === 0 ? (
                <p className="py-2 text-xs text-[var(--muted)]">
                  None recorded
                </p>
              ) : (
                summary.activeMods.map((mod) => (
                  <div key={mod.id} className="py-1.5">
                    <p
                      className="truncate text-sm font-medium"
                      title={mod.title}
                    >
                      {mod.title}
                    </p>
                    <code
                      className="mt-0.5 block truncate text-xs text-[var(--muted)]"
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

        <section
          className="mt-4 border-t border-[var(--outline-faint)] pt-4"
          aria-labelledby="overview-fog"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 id="overview-fog" className="text-sm font-semibold">
              Fog and streamed grids
            </h2>
            <span className="m3-tag shrink-0">Read-only</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <p className="m3-label">World grid</p>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {summary.fog.width} × {summary.fog.height}
              </p>
            </div>
            <div>
              <p className="m3-label">Streamed data</p>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {formatBytes(summary.fog.totalBytes)}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="m3-label">Stored visible entries</p>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {summary.fog.visibleEntryCount === null
                  ? "Not recorded"
                  : summary.fog.visibleEntryCount.toLocaleString()}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">
            This is the non-zero entry count from ONI&apos;s opaque visibility
            stream, not a map-reveal percentage. Editing fog safely also
            requires synchronized grid, simulation, and object state.
          </p>
          {summary.fog.streams.length > 0 ? (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-medium">
                Stream details ({summary.fog.streams.length})
              </summary>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {summary.fog.streams.map((stream) => (
                  <div
                    key={stream.name}
                    className="flex min-w-0 items-center justify-between gap-3 border-b border-[var(--outline-faint)] py-2 text-xs"
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
          <details className="mt-4 border-t border-[var(--outline-faint)] pt-4">
            <summary className="cursor-pointer text-sm font-semibold">
              Saved DLC mixing choices ({summary.mixingSettings.length})
            </summary>
            <p className="mt-2 text-xs text-[var(--muted)]">
              Read-only world-generation settings. Changing them after the
              worlds exist would not regenerate the cluster.
            </p>
            <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {summary.mixingSettings.map((setting) => (
                <div
                  key={setting.id}
                  className="flex min-w-0 items-center justify-between gap-3 border-b border-[var(--outline-faint)] py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm" title={setting.label}>
                      {setting.label}
                    </p>
                    <code
                      className="block truncate text-xs text-[var(--muted)]"
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

        <p className="mt-3 text-xs text-[var(--muted)]">
          Parsed in {summary.parseTimeMs}
        </p>
      </details>
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
      {!session.hasSave ? (
        <NoSaveState onChooseSave={chooseSave} isBusy={session.isBusy} />
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept=".sav"
        className="hidden"
        onChange={onFileChange}
      />

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
