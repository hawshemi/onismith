import { GameObjectBehavior } from "../game-object-behavior";
import { BehaviorName } from "./types";

const MinionAssignablesProxy: BehaviorName<MinionAssignablesProxy> =
  "MinionAssignablesProxy";
interface MinionAssignablesProxy extends GameObjectBehavior {
  target_instance_id: number;
}
