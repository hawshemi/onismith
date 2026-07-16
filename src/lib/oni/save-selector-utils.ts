import type { GameObject, GameObjectBehavior } from "@/lib/save-parser/model";

export function getBehavior(
  gameObject: GameObject | null | undefined,
  behaviorName: string,
): GameObjectBehavior | null {
  if (!gameObject || !Array.isArray(gameObject.behaviors)) return null;
  return (
    gameObject.behaviors.find((behavior) => behavior?.name === behaviorName) ||
    null
  );
}

export function getBehaviorAny(
  gameObject: GameObject | null | undefined,
  behaviorNames: string[],
): GameObjectBehavior | null {
  for (const behaviorName of behaviorNames) {
    const behavior = getBehavior(gameObject, behaviorName);
    if (behavior) return behavior;
  }
  return null;
}

export function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function levelWithSign(level: unknown): string {
  if (typeof level !== "number" || !Number.isFinite(level)) return "?";
  return level > 0 ? `+${level}` : String(level);
}

export function getGameObjectId(
  gameObject: GameObject | null | undefined,
): number | null {
  const value = getBehavior(gameObject, "KPrefabID")?.templateData?.InstanceID;
  return Number.isFinite(value) ? value : null;
}
