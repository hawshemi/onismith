import { Vector3, Quaternion } from "../../../save-structure/data-types";

import { GameObjectBehavior } from "../game-object-behavior";

export interface GameObject {
  readonly position: Vector3;
  readonly rotation: Quaternion;
  readonly scale: Vector3;

  /**
   * Number from 0 to 255.
   * This is used to look up the object's unity prefab.
   */
  readonly folder: number;

  /**
   * Behaviors for this game object. Order is preserved as read, since ONI's
   * SaveLoadRoot.LoadInternal appears to index behaviors positionally.
   */
  readonly behaviors: GameObjectBehavior[];
}
