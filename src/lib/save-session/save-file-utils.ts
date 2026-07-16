import type { SaveGame } from "@/lib/save-parser/model";

// File-name, download, and hashing helpers for the save session. Pure (or
// browser-IO) utilities with no dependency on the session state or reducer.

export function hasSavExtension(fileName: string): boolean {
  return (
    typeof fileName === "string" &&
    fileName.trim().toLowerCase().endsWith(".sav")
  );
}

function ensureSavExtension(fileName: unknown): string {
  const raw = typeof fileName === "string" ? fileName.trim() : "";
  if (!raw) {
    return "onismith-save.sav";
  }
  if (raw.toLowerCase().endsWith(".sav")) {
    return raw;
  }
  const withoutExtension = raw.replace(/\.[^./\\]+$/, "");
  const base = withoutExtension || raw;
  return `${base}.sav`;
}

function formatBackupTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}-${hour}${minute}${second}`;
}

export function deriveBackupName(fileName: string | null | undefined): string {
  const baseName = ensureSavExtension(fileName || "onismith-save.sav");
  return baseName.replace(
    /\.sav$/i,
    `.backup-${formatBackupTimestamp(new Date())}.sav`,
  );
}

export function deriveOutputName(
  fileName: string | null | undefined,
  saveGame: SaveGame | null,
): string {
  if (typeof fileName === "string" && fileName.trim().length > 0) {
    return ensureSavExtension(fileName);
  }
  const colonyName = saveGame?.header?.gameInfo?.baseName;
  if (colonyName) {
    return ensureSavExtension(colonyName);
  }
  return "onismith-save.sav";
}

export function downloadArrayBuffer(data: ArrayBuffer, fileName: string): void {
  const blob = new Blob([data], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function writeToFileHandle(
  fileHandle: FileSystemFileHandle,
  data: ArrayBuffer,
): Promise<void> {
  if (!fileHandle || typeof fileHandle.createWritable !== "function") {
    throw new Error("Writable file handle is not available.");
  }
  const writable = await fileHandle.createWritable();
  await writable.write(data);
  await writable.close();
}

export function downloadText(content: string, fileName: string): void {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

// Deterministic serialization (sorted keys, undefined dropped) so a save's SHA-1
// is stable regardless of key order.
function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value
      .map((entry) => (entry === undefined ? "null" : stableSerialize(entry)))
      .join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort();
    const keyValues = keys.map(
      (key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`,
    );
    return `{${keyValues.join(",")}}`;
  }
  return JSON.stringify(value);
}

async function sha1HexFromString(text: string): Promise<string | null> {
  if (!globalThis.crypto?.subtle) {
    return null;
  }
  const data = new TextEncoder().encode(text);
  const digest = await globalThis.crypto.subtle.digest("SHA-1", data);
  const bytes = new Uint8Array(digest);
  return [...bytes].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export async function hashObjectSha1(value: unknown): Promise<string | null> {
  const serialized = stableSerialize(value);
  return sha1HexFromString(serialized);
}
