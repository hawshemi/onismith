function isIndexSegment(segment: string): boolean {
  return /^\d+$/.test(segment);
}

function asContainerForNext(
  segment: string,
): unknown[] | Record<string, unknown> {
  return isIndexSegment(segment) ? [] : {};
}

export function isObjectLike(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

export function getPathValue(root: unknown, path: unknown): unknown {
  if (!Array.isArray(path) || path.length === 0) {
    return root;
  }
  let cursor: unknown = root;
  for (const segment of path) {
    if (!isObjectLike(cursor)) {
      return undefined;
    }
    cursor = cursor[segment];
  }
  return cursor;
}

export function setPathValue(
  root: unknown,
  path: unknown,
  value: unknown,
): unknown {
  if (!Array.isArray(path) || path.length === 0) {
    return value;
  }

  const [head, ...tail] = path;
  const source = isObjectLike(root) ? root : asContainerForNext(head);
  const current = (source as Record<string, unknown>)[head];
  const next = setPathValue(current, tail, value);

  if (current === next) {
    return root;
  }

  if (Array.isArray(source)) {
    const clone = [...source];
    clone[Number(head)] = next;
    return clone;
  }

  return {
    ...source,
    [head]: next,
  };
}

export function getPrimitiveType(
  value: unknown,
): "string" | "number" | "boolean" | null {
  if (typeof value === "string") {
    return "string";
  }
  if (typeof value === "number") {
    return "number";
  }
  if (typeof value === "boolean") {
    return "boolean";
  }
  return null;
}

function isPathMatch(
  path: readonly (string | number)[],
  matcher: readonly string[],
): boolean {
  if (path.length !== matcher.length) {
    return false;
  }
  for (let index = 0; index < path.length; index += 1) {
    if (matcher[index] !== "*" && matcher[index] !== path[index]) {
      return false;
    }
  }
  return true;
}

export function getRawSegmentName(
  saveGame: unknown,
  path: readonly (string | number)[],
): string | number {
  const last = path[path.length - 1];
  if (!last) {
    return "root";
  }

  if (isPathMatch(path, ["gameObjects", "*"])) {
    const group = getPathValue(saveGame, path);
    if (isObjectLike(group) && typeof group.name === "string" && group.name) {
      return group.name;
    }
    return last;
  }

  if (
    isPathMatch(path, [
      "gameObjects",
      "*",
      "gameObjects",
      "*",
      "behaviors",
      "*",
    ])
  ) {
    const behavior = getPathValue(saveGame, path);
    if (
      isObjectLike(behavior) &&
      typeof behavior.name === "string" &&
      behavior.name
    ) {
      return behavior.name;
    }
    return last;
  }

  return last;
}
