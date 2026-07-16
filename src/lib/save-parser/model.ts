// Lightweight UI-facing parser model. Keep this module free of parse/write
// entry points so importing constants or types does not pull the serializer
// and compression implementation into the main application bundle.
export type { SaveGame } from "./save-structure/save-game";
export type { QualityLevelSettings } from "./save-structure/game-data/game-data";
export type { GameObject } from "./save-structure/game-objects/game-object/game-object";
export type { GameObjectBehavior } from "./save-structure/game-objects/game-object-behavior/game-object-behavior";
export type { GameObjectGroup } from "./save-structure/game-objects/game-object-group/game-object-group";

export {
  SimHashes,
  SimHashNames,
} from "./save-structure/const-data/template-enumerations/sim-hashes";
export { SpaceDestinationTypeNames } from "./save-structure/const-data/space-destinations";
export {
  BIONIC_TRAITS,
  DUPE_OVERJOYED_REACTION_IDS,
  DUPE_STRESS_REACTION_IDS,
  DUPE_TRAITS,
} from "./save-structure/game-objects/game-object-behavior/known-behaviors/ai-traits";
