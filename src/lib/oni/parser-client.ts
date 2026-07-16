"use client";

import type { SaveGame } from "@/lib/save-parser/model";

const WORKER_URL = "/generated/save-parser.worker.js";

interface ProgressResponse {
  type: "progress";
  id: number;
  message: string;
}

interface ResultResponse {
  type: "result";
  id: number;
  payload: unknown;
}

interface ErrorResponse {
  type: "error";
  id: number;
  error?: {
    message?: string;
    code?: string;
    stack?: string;
  };
}

type WorkerResponse = ProgressResponse | ResultResponse | ErrorResponse;

interface ParserClientError extends Error {
  code?: string;
}

export interface ParseSaveOptions {
  versionStrictness?: string;
  reportProgress?: boolean;
  onProgress?: (message: string) => void;
}

interface WorkerRequestOptions {
  transfer?: Transferable[];
  onProgress?: (message: string) => void;
}

interface PendingEntry {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
}

interface ParserClient {
  parseSave(
    buffer: ArrayBuffer | ArrayBufferView,
    options?: ParseSaveOptions,
  ): Promise<SaveGame>;
  writeSave(
    saveGame: SaveGame,
    options?: ParseSaveOptions,
  ): Promise<ArrayBuffer>;
  terminate(): void;
  isDead(): boolean;
}

let sharedClient: ParserClient | null = null;

function createWorker(): Worker {
  return new Worker(WORKER_URL, { type: "module" });
}

function normalizeBuffer(data: ArrayBuffer | ArrayBufferView): ArrayBuffer {
  if (data instanceof ArrayBuffer) {
    return data;
  }
  if (ArrayBuffer.isView(data)) {
    const start = data.byteOffset;
    const end = start + data.byteLength;
    return data.buffer.slice(start, end) as ArrayBuffer;
  }
  throw new Error("Expected ArrayBuffer or TypedArray.");
}

function createClient(): ParserClient {
  const worker = createWorker();
  let nextId = 1;
  let dead = false;
  const pending = new Map<number, PendingEntry>();
  const progressHandlers = new Map<number, (message: string) => void>();
  const timers = new Map<number, ReturnType<typeof setTimeout>>();

  // Reject a request if the worker goes silent for this long. Progress events
  // reset the timer, so a legitimately slow parse of a large save keeps it
  // alive; only a genuine stall (malformed input looping/allocating) trips it.
  const REQUEST_TIMEOUT_MS = 60000;

  function clearTimer(id: number): void {
    const timer = timers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.delete(id);
    }
  }

  function rejectAll(error: Error): void {
    dead = true;
    for (const [id, entry] of pending) {
      clearTimer(id);
      entry.reject(error);
    }
    pending.clear();
    progressHandlers.clear();
  }

  function armTimer(id: number): void {
    clearTimer(id);
    timers.set(
      id,
      setTimeout(() => {
        timers.delete(id);
        const error = new Error(
          "Parser worker timed out. The save file may be malformed.",
        ) as ParserClientError;
        error.code = "E_WORKER_TIMEOUT";
        // A stalled worker won't recover, so fail everything in flight and
        // terminate it; the next request spawns a fresh worker.
        rejectAll(error);
        worker.terminate();
      }, REQUEST_TIMEOUT_MS),
    );
  }

  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const message = event.data;
    if (!message || typeof message !== "object") {
      return;
    }

    if (message.type === "progress") {
      // Activity: reset the stall watchdog while work is still flowing.
      armTimer(message.id);
      const handler = progressHandlers.get(message.id);
      if (handler) {
        handler(message.message);
      }
      return;
    }

    const entry = pending.get(message.id);
    if (!entry) {
      return;
    }
    pending.delete(message.id);
    progressHandlers.delete(message.id);
    clearTimer(message.id);

    if (message.type === "error") {
      const err = new Error(
        message.error?.message || "Parser error",
      ) as ParserClientError;
      if (message.error?.code) {
        err.code = message.error.code;
      }
      if (message.error?.stack) {
        err.stack = message.error.stack;
      }
      entry.reject(err);
      return;
    }

    entry.resolve(message.payload);
  };

  worker.onerror = (event: ErrorEvent) => {
    // A worker-level error is fatal to this worker instance. Reject everything
    // in flight and mark the client dead so the next request spawns a fresh
    // worker instead of posting into a broken one.
    rejectAll(new Error(event?.message || "Worker error"));
  };

  worker.onmessageerror = () => {
    // A response that fails structured-clone deserialization poisons the
    // channel; treat it like a fatal worker error rather than hanging.
    rejectAll(new Error("Worker response could not be deserialized."));
  };

  function request(
    type: string,
    payload: unknown,
    options: WorkerRequestOptions = {},
  ): Promise<unknown> {
    const id = nextId++;
    return new Promise<unknown>((resolve, reject) => {
      pending.set(id, { resolve, reject });
      if (options.onProgress) {
        progressHandlers.set(id, options.onProgress);
      }
      worker.postMessage({ id, type, payload }, options.transfer || []);
      armTimer(id);
    });
  }

  function makeWorkerOptions(options: ParseSaveOptions = {}) {
    return {
      versionStrictness: options.versionStrictness,
      reportProgress: Boolean(options.reportProgress),
    };
  }

  return {
    parseSave(buffer, options = {}) {
      const data = normalizeBuffer(buffer);
      return request(
        "parse",
        { buffer: data, options: makeWorkerOptions(options) },
        {
          transfer: [data],
          onProgress: options.onProgress,
        },
      ) as Promise<SaveGame>;
    },
    writeSave(saveGame, options = {}) {
      return request(
        "write",
        { saveGame, options: makeWorkerOptions(options) },
        { onProgress: options.onProgress },
      ) as Promise<ArrayBuffer>;
    },
    terminate() {
      dead = true;
      worker.terminate();
    },
    isDead() {
      return dead;
    },
  };
}

function getParserClient(): ParserClient {
  if (!sharedClient || sharedClient.isDead()) {
    sharedClient = createClient();
  }
  return sharedClient;
}

export function parseSaveInWorker(
  buffer: ArrayBuffer | ArrayBufferView,
  options: ParseSaveOptions = {},
): Promise<SaveGame> {
  return getParserClient().parseSave(buffer, options);
}

export function writeSaveInWorker(
  saveGame: SaveGame,
  options: ParseSaveOptions = {},
): Promise<ArrayBuffer> {
  return getParserClient().writeSave(saveGame, options);
}
