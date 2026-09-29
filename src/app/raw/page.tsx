"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { SaveGame } from "@/lib/save-parser/model";
import { useSyncOnChange } from "@/lib/use-sync-on-change";
import { FaChevronDown, FaChevronRight } from "react-icons/fa6";
import M3GhostButton from "@/components/ui/m3-ghost-button";
import M3OutlinedButton from "@/components/ui/m3-outlined-button";
import M3PageHeader from "@/components/ui/m3-page-header";
import SaveRequiredPage from "@/components/save-required-page";
import { useSaveSession } from "@/lib/save-session/save-session-context";
import {
  getPathValue,
  getPrimitiveType,
  getRawSegmentName,
  isObjectLike,
} from "@/lib/oni/raw-path-utils";
import { getRawEditRestriction } from "@/lib/oni/raw-edit-restrictions";

const TREE_CHILD_SCAN_LIMIT = 5000;
const TREE_CHILD_INITIAL_RENDER = 50;
const TREE_CHILD_RENDER_BATCH = 50;
const PRIMITIVE_FIELD_SCAN_LIMIT = 5000;
const PRIMITIVE_FIELD_INITIAL_RENDER = 50;
const PRIMITIVE_FIELD_RENDER_BATCH = 50;
const MAX_STRING_EDITOR_LENGTH = 5000;

function pathId(path: string[]): string {
  if (!Array.isArray(path) || path.length === 0) {
    return "root";
  }
  return path.join(".");
}

function samePath(a: string[], b: string[]): boolean {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    return false;
  }
  return a.every((item, index) => item === b[index]);
}

function iterateOwnKeys(
  value: unknown,
  scanLimit: number,
  onKey: (key: string) => void,
): { scanTruncated: boolean; scanned: number } {
  if (!isObjectLike(value)) {
    return { scanTruncated: false, scanned: 0 };
  }

  let scanned = 0;
  if (Array.isArray(value)) {
    const max = Math.min(value.length, scanLimit);
    for (let index = 0; index < max; index += 1) {
      if (!(index in value)) {
        continue;
      }
      scanned += 1;
      onKey(String(index));
    }
    return {
      scanTruncated: value.length > scanLimit,
      scanned,
    };
  }

  for (const key in value as Record<string, unknown>) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      continue;
    }
    scanned += 1;
    if (scanned > scanLimit) {
      return { scanTruncated: true, scanned: scanned - 1 };
    }
    onKey(key);
  }

  return { scanTruncated: false, scanned };
}

function listObjectChildren(value: unknown): {
  children: string[];
  scanTruncated: boolean;
  totalObjectChildren: number;
} {
  if (!isObjectLike(value)) {
    return {
      children: [],
      scanTruncated: false,
      totalObjectChildren: 0,
    };
  }

  const children: string[] = [];
  let totalObjectChildren = 0;

  const { scanTruncated } = iterateOwnKeys(
    value,
    TREE_CHILD_SCAN_LIMIT,
    (key) => {
      if (!isObjectLike((value as Record<string, unknown>)[key])) {
        return;
      }
      totalObjectChildren += 1;
      children.push(key);
    },
  );

  if (!Array.isArray(value)) {
    children.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  return {
    children,
    scanTruncated,
    totalObjectChildren,
  };
}

function listPrimitiveFields(value: unknown): {
  fields: Array<{ key: string; type: string; value: unknown }>;
  scanTruncated: boolean;
  totalPrimitiveFields: number;
} {
  if (!isObjectLike(value)) {
    return {
      fields: [],
      scanTruncated: false,
      totalPrimitiveFields: 0,
    };
  }

  const fields: Array<{ key: string; type: string; value: unknown }> = [];
  let totalPrimitiveFields = 0;

  const { scanTruncated } = iterateOwnKeys(
    value,
    PRIMITIVE_FIELD_SCAN_LIMIT,
    (key) => {
      const type = getPrimitiveType((value as Record<string, unknown>)[key]);
      if (!type) {
        return;
      }
      totalPrimitiveFields += 1;
      fields.push({
        key,
        type,
        value: (value as Record<string, unknown>)[key],
      });
    },
  );

  if (!Array.isArray(value)) {
    fields.sort((a, b) =>
      a.key.localeCompare(b.key, undefined, { numeric: true }),
    );
  }

  return {
    fields,
    scanTruncated,
    totalPrimitiveFields,
  };
}

function getDraftValue(value: unknown, type: string | null): string {
  if (type !== "string") {
    return String(value ?? "");
  }
  if (typeof value !== "string") {
    return "";
  }
  if (value.length <= MAX_STRING_EDITOR_LENGTH) {
    return value;
  }
  return value.slice(0, MAX_STRING_EDITOR_LENGTH);
}

type PrimitiveValueEditorProps = {
  fieldPath: string[];
  fieldName: string;
  value: unknown;
  readOnlyReason?: string | null;
  onCommit: (path: string[], value: string | number | boolean) => void;
};

function PrimitiveValueEditor({
  fieldPath,
  fieldName,
  value,
  readOnlyReason,
  onCommit,
}: PrimitiveValueEditorProps) {
  const type = getPrimitiveType(value);
  const fieldId = useId();
  const [draft, setDraft] = useState(() => getDraftValue(value, type));
  const [error, setError] = useState("");
  const isLongString =
    type === "string" &&
    typeof value === "string" &&
    value.length > MAX_STRING_EDITOR_LENGTH;

  useSyncOnChange([type, value], () => {
    setDraft(getDraftValue(value, type));
    setError("");
  });

  if (!type) {
    return null;
  }

  const commitNumber = () => {
    const parsed = Number(draft);
    if (!draft.trim() || !Number.isFinite(parsed)) {
      setError("Enter a valid number.");
      return;
    }
    setError("");
    onCommit(fieldPath, parsed);
  };

  if (type === "boolean") {
    return (
      <label className="m3-panel flex items-center justify-between gap-3 px-3 py-2">
        <span className="text-sm opacity-80">{fieldName}</span>
        <input
          type="checkbox"
          checked={Boolean(value)}
          disabled={Boolean(readOnlyReason)}
          onChange={(event) => onCommit(fieldPath, event.target.checked)}
          className="h-4 w-4 accent-[var(--accent)] disabled:opacity-50"
        />
        {readOnlyReason ? (
          <span className="text-sm text-[var(--muted)]">Read-only</span>
        ) : null}
      </label>
    );
  }

  return (
    <div className="m3-panel px-3 py-2">
      <label htmlFor={fieldId} className="text-sm opacity-80">
        {fieldName}
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          id={fieldId}
          type={type === "number" ? "number" : "text"}
          value={draft}
          disabled={Boolean(readOnlyReason)}
          onChange={(event) => setDraft(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error
              ? `${fieldId}-error`
              : readOnlyReason
                ? `${fieldId}-reason`
                : undefined
          }
          onKeyDown={(event) => {
            if (event.key === "Enter" && !isLongString && !readOnlyReason) {
              if (type === "number") commitNumber();
              else onCommit(fieldPath, draft);
            }
          }}
          className="m3-field min-h-11 w-full min-w-0 flex-1 basis-40 px-3 py-2 text-base disabled:opacity-60"
        />
        <M3OutlinedButton
          disabled={isLongString || Boolean(readOnlyReason)}
          onClick={
            type === "number" ? commitNumber : () => onCommit(fieldPath, draft)
          }
          className="min-h-11 px-3 py-2 text-sm disabled:opacity-50"
        >
          Apply
        </M3OutlinedButton>
      </div>
      {isLongString ? (
        <p className="mt-2 text-xs text-[var(--warning)]">
          String too large to edit safely in UI. Showing first{" "}
          {MAX_STRING_EDITOR_LENGTH} characters.
        </p>
      ) : null}
      {readOnlyReason ? (
        <p
          id={`${fieldId}-reason`}
          className="mt-2 text-sm text-[var(--muted)]"
        >
          {readOnlyReason}
        </p>
      ) : null}
      {error ? (
        <p
          id={`${fieldId}-error`}
          role="alert"
          className="m3-error-text mt-2 text-sm"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

type RawTreeNodeProps = {
  saveGame: SaveGame;
  path: string[];
  selectedPath: string[];
  onSelect: (path: string[]) => void;
  scrollRootRef?: RefObject<HTMLDivElement | null>;
  defaultExpanded?: boolean;
};

function RawTreeNode({
  saveGame,
  path,
  selectedPath,
  onSelect,
  scrollRootRef,
  defaultExpanded = false,
}: RawTreeNodeProps) {
  const value = getPathValue(saveGame, path);
  const childInfo = useMemo(() => listObjectChildren(value), [value]);
  const children = childInfo.children;
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [renderedChildrenCount, setRenderedChildrenCount] = useState(
    TREE_CHILD_INITIAL_RENDER,
  );
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const childrenId = useId();
  const selected = samePath(path, selectedPath);
  const label = path.length === 0 ? "root" : getRawSegmentName(saveGame, path);
  const renderedChildren = useMemo(
    () => children.slice(0, renderedChildrenCount),
    [children, renderedChildrenCount],
  );
  const hasMoreChildren = renderedChildrenCount < children.length;

  useSyncOnChange([children.length], () => {
    setRenderedChildrenCount((prev) => {
      if (children.length === 0) {
        return TREE_CHILD_INITIAL_RENDER;
      }
      return Math.min(
        Math.max(prev, TREE_CHILD_INITIAL_RENDER),
        children.length,
      );
    });
  });

  const loadMoreChildren = useCallback(() => {
    setRenderedChildrenCount((prev) =>
      Math.min(prev + TREE_CHILD_RENDER_BATCH, children.length),
    );
  }, [children.length]);

  useEffect(() => {
    if (!expanded || !hasMoreChildren || !loadMoreRef.current) {
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMoreChildren();
        }
      },
      {
        root: scrollRootRef?.current || null,
        rootMargin: "120px 0px",
        threshold: 0,
      },
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [expanded, hasMoreChildren, loadMoreChildren, scrollRootRef]);

  return (
    <div className="pl-2">
      <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-1">
        {children.length > 0 ? (
          <M3GhostButton
            onClick={() => setExpanded((prev) => !prev)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full p-0 text-xs opacity-75 hover:opacity-100"
            aria-label={`${expanded ? "Collapse" : "Expand"} ${label}`}
            aria-expanded={expanded}
            aria-controls={childrenId}
          >
            {expanded ? (
              <FaChevronDown aria-hidden="true" className="h-2.5 w-2.5" />
            ) : (
              <FaChevronRight aria-hidden="true" className="h-2.5 w-2.5" />
            )}
          </M3GhostButton>
        ) : (
          <span className="h-11 w-11" aria-hidden="true" />
        )}
        <M3GhostButton
          onClick={() => onSelect(path)}
          className={`min-h-11 max-w-full justify-self-start break-all px-2 py-2 text-left text-sm ${
            selected ? "m3-button-ghost-selected" : ""
          }`}
          title={pathId(path)}
          aria-current={selected ? "true" : undefined}
        >
          {label}
        </M3GhostButton>
      </div>

      {expanded && children.length > 0 ? (
        <div
          id={childrenId}
          className="ml-[0.625rem] border-l border-[var(--outline-faint)] pl-[0.625rem]"
        >
          {renderedChildren.map((key) => (
            <RawTreeNode
              key={`${pathId(path)}.${key}`}
              saveGame={saveGame}
              path={[...path, key]}
              selectedPath={selectedPath}
              onSelect={onSelect}
              scrollRootRef={scrollRootRef}
            />
          ))}
          {hasMoreChildren ? (
            <div ref={loadMoreRef} className="h-1 w-full" aria-hidden="true" />
          ) : null}
          {hasMoreChildren || childInfo.scanTruncated ? (
            <p className="mt-1 pl-2 text-xs opacity-60">
              Loaded {renderedChildren.length} object children
              {childInfo.totalObjectChildren > 0
                ? ` of ${childInfo.totalObjectChildren}`
                : ""}
              .
              {childInfo.scanTruncated
                ? ` Scan capped at ${TREE_CHILD_SCAN_LIMIT} keys.`
                : ""}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function RawEditorPage() {
  const { hasSave, saveGame, updateRawValue } = useSaveSession();
  const [selectedPath, setSelectedPath] = useState<string[]>(["header"]);
  const [showTree, setShowTree] = useState(false);
  const fieldsHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const treeScrollRef = useRef<HTMLDivElement | null>(null);
  const primitiveScrollRef = useRef<HTMLDivElement | null>(null);
  const primitiveLoadMoreRef = useRef<HTMLDivElement | null>(null);

  const target = useMemo(
    () => getPathValue(saveGame, selectedPath),
    [saveGame, selectedPath],
  );

  const primitiveFieldInfo = useMemo(
    () => listPrimitiveFields(target),
    [target],
  );
  const primitiveFields = primitiveFieldInfo.fields;
  const [renderedPrimitiveCount, setRenderedPrimitiveCount] = useState(
    PRIMITIVE_FIELD_INITIAL_RENDER,
  );
  const renderedPrimitiveFields = useMemo(
    () => primitiveFields.slice(0, renderedPrimitiveCount),
    [primitiveFields, renderedPrimitiveCount],
  );
  const hasMorePrimitiveFields =
    renderedPrimitiveCount < primitiveFields.length;

  useSyncOnChange([primitiveFields.length, selectedPath], () => {
    setRenderedPrimitiveCount(
      Math.min(
        PRIMITIVE_FIELD_INITIAL_RENDER,
        primitiveFields.length || PRIMITIVE_FIELD_INITIAL_RENDER,
      ),
    );
  });

  const loadMorePrimitiveFields = useCallback(() => {
    setRenderedPrimitiveCount((prev) =>
      Math.min(prev + PRIMITIVE_FIELD_RENDER_BATCH, primitiveFields.length),
    );
  }, [primitiveFields.length]);

  useEffect(() => {
    if (!hasMorePrimitiveFields || !primitiveLoadMoreRef.current) {
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMorePrimitiveFields();
        }
      },
      {
        root: primitiveScrollRef.current,
        rootMargin: "120px 0px",
        threshold: 0,
      },
    );
    observer.observe(primitiveLoadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMorePrimitiveFields, loadMorePrimitiveFields]);

  if (!hasSave || !saveGame) {
    return (
      <SaveRequiredPage
        title="Raw Editor"
        description="Load a save first to edit raw object data."
      />
    );
  }

  return (
    <section className="m3-page flex min-h-0 flex-col gap-3 lg:h-full">
      <div className="shrink-0">
        <M3PageHeader
          title={null}
          description="Browse and edit raw save data. Advanced edits can affect save compatibility."
        />
      </div>
      <nav
        aria-label="Selected object path"
        className="min-w-0 shrink-0 break-all text-sm"
      >
        <M3GhostButton
          onClick={() => setSelectedPath([])}
          className="px-2 py-1"
        >
          root
        </M3GhostButton>
        {selectedPath.map((segment, index) => {
          const segmentPath = selectedPath.slice(0, index + 1);
          const label = getRawSegmentName(saveGame, segmentPath) || segment;
          return (
            <span key={`${segment}-${index}`}>
              <span className="px-1 opacity-50">/</span>
              <M3GhostButton
                onClick={() => setSelectedPath(segmentPath)}
                className="px-2 py-1"
              >
                {label}
              </M3GhostButton>
            </span>
          );
        })}
      </nav>

      <M3OutlinedButton
        onClick={() => setShowTree((visible) => !visible)}
        aria-expanded={showTree}
        aria-controls="raw-tree-panel"
        className="min-h-11 self-start px-4 py-2 text-sm lg:hidden"
      >
        {showTree ? "Hide save tree" : "Browse save tree"}
      </M3OutlinedButton>

      <div className="grid min-h-0 grid-cols-1 gap-3 lg:flex-1 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside
          id="raw-tree-panel"
          aria-label="Save tree"
          ref={treeScrollRef}
          className={`m3-card m3-scrollbar max-h-80 overflow-auto p-3 lg:block lg:h-full lg:max-h-none lg:min-h-0 ${showTree ? "block" : "hidden"}`}
        >
          <RawTreeNode
            saveGame={saveGame}
            path={[]}
            selectedPath={selectedPath}
            onSelect={(path) => {
              setSelectedPath(path);
              setShowTree(false);
              fieldsHeadingRef.current?.focus({ preventScroll: true });
            }}
            scrollRootRef={treeScrollRef}
            defaultExpanded
          />
        </aside>

        <section className="m3-card flex min-h-96 min-w-0 flex-col p-3 sm:p-4 lg:h-full lg:min-h-0">
          <h2
            ref={fieldsHeadingRef}
            tabIndex={-1}
            className="break-words text-lg font-semibold"
          >
            {getRawSegmentName(saveGame, selectedPath) || "Root"} fields
          </h2>
          <div
            ref={primitiveScrollRef}
            className="m3-scrollbar mt-3 min-h-0 flex-1 overflow-auto pr-1"
          >
            {!isObjectLike(target) ? (
              <p className="text-sm opacity-80">
                Selected value is not an object. Navigate to an object node to
                edit fields.
              </p>
            ) : primitiveFields.length === 0 ? (
              <p className="text-sm opacity-80">
                No primitive fields on this node.
              </p>
            ) : (
              <div className="space-y-2">
                {renderedPrimitiveFields.map((field) => (
                  <PrimitiveValueEditor
                    key={field.key}
                    fieldPath={[...selectedPath, field.key]}
                    fieldName={field.key}
                    value={field.value}
                    readOnlyReason={getRawEditRestriction(saveGame, [
                      ...selectedPath,
                      field.key,
                    ])}
                    onCommit={updateRawValue}
                  />
                ))}
                {hasMorePrimitiveFields ? (
                  <div
                    ref={primitiveLoadMoreRef}
                    className="h-1 w-full"
                    aria-hidden="true"
                  />
                ) : null}
                {hasMorePrimitiveFields || primitiveFieldInfo.scanTruncated ? (
                  <p className="mt-2 text-xs opacity-65">
                    Loaded {renderedPrimitiveFields.length} primitive fields
                    {primitiveFieldInfo.totalPrimitiveFields > 0
                      ? ` of ${primitiveFieldInfo.totalPrimitiveFields}`
                      : ""}
                    .
                    {primitiveFieldInfo.scanTruncated
                      ? ` Scan capped at ${PRIMITIVE_FIELD_SCAN_LIMIT} keys.`
                      : ""}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
