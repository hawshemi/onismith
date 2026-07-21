const CLUSTER_DISPLAY_NAMES: Record<string, string> = {
  "dlc2::clusters/CeresSpacedOutCluster": "The Frosty Planet",
  "expansion1::clusters/KleiFest2023Cluster": "The Lab",
};

const WORLD_DISPLAY_NAMES: Record<string, string> = {
  "dlc2::worlds/CeresSpacedOutAsteroid": "Ceres",
  "expansion1::worlds/StrangeAsteroidKleiFest2023Cluster": "The Lab",
};

function identifierFallback(value: string): string {
  const identifier = value.split("/").pop() || value;
  return identifier
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getClusterDisplayName(clusterId: string): string {
  return CLUSTER_DISPLAY_NAMES[clusterId] ?? identifierFallback(clusterId);
}

export function getWorldDisplayName(worldName: string): string {
  return WORLD_DISPLAY_NAMES[worldName] ?? identifierFallback(worldName);
}
