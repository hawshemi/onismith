import {
  parseSaveGame,
  progressReporter,
  writeSaveGame,
  type SaveGame,
} from "@/lib/save-parser";

interface WorkerRequestOptions {
  reportProgress?: boolean;
  versionStrictness?: "none" | "major" | "minor";
}

interface ParseRequestPayload {
  buffer: ArrayBuffer;
  options?: WorkerRequestOptions;
}

interface WriteRequestPayload {
  saveGame: SaveGame;
  options?: WorkerRequestOptions;
}

interface WorkerRequest {
  id?: number;
  type?: string;
  payload?: ParseRequestPayload | WriteRequestPayload;
}

interface SerializedError {
  message: string;
  code?: unknown;
  stack?: string;
}

// In a module worker `self` is a DedicatedWorkerGlobalScope, but the project
// compiles with the DOM lib only, so expose `postMessage` with the worker
// signature (message plus an optional transfer list) via a typed reference.
const postToClient = (
  self as unknown as {
    postMessage(message: unknown, transfer?: Transferable[]): void;
  }
).postMessage.bind(self);

self.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  if (!message || typeof message !== "object") {
    return;
  }

  const { id, type, payload } = message;
  if (!id || !type) {
    return;
  }

  try {
    if (type === "parse") {
      handleParse(id, payload as ParseRequestPayload);
      return;
    }
    if (type === "write") {
      handleWrite(id, payload as WriteRequestPayload);
      return;
    }
  } catch (error) {
    postToClient({ id, type: "error", error: serializeError(error) });
  }
});

function handleParse(id: number, payload: ParseRequestPayload): void {
  const options: WorkerRequestOptions = payload?.options || {};
  const interceptor = options.reportProgress
    ? progressReporter((message: string) => {
        postToClient({ id, type: "progress", message });
      })
    : undefined;

  const save = parseSaveGame(payload.buffer, {
    versionStrictness: options.versionStrictness || "major",
    interceptor,
  });

  // simData is the multi-MB bulk of a save. Transfer it (move, not copy) since
  // the worker discards `save` right after; the rest of the tree is small
  // enough that structured-clone overhead is negligible next to that buffer.
  const transfer: Transferable[] =
    save.simData instanceof ArrayBuffer ? [save.simData] : [];
  postToClient({ id, type: "result", payload: save }, transfer);
}

function handleWrite(id: number, payload: WriteRequestPayload): void {
  const options: WorkerRequestOptions = payload?.options || {};
  const interceptor = options.reportProgress
    ? progressReporter((message: string) => {
        postToClient({ id, type: "progress", message });
      })
    : undefined;

  const buffer = writeSaveGame(payload.saveGame, interceptor);
  postToClient({ id, type: "result", payload: buffer }, [buffer]);
}

function serializeError(error: unknown): SerializedError {
  if (!error || typeof error !== "object") {
    return { message: "Unknown error" };
  }
  const err = error as { message?: unknown; code?: unknown; stack?: unknown };
  return {
    message:
      (typeof err.message === "string" ? err.message : "") || "Unknown error",
    code: err.code,
    stack: typeof err.stack === "string" ? err.stack : undefined,
  };
}
