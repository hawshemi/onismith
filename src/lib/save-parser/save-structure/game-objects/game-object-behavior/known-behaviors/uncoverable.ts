import { BehaviorName } from "./types";
import { GameObjectBehavior } from "../game-object-behavior";

const UncoverableBehavior: BehaviorName<UncoverableBehavior> = "Uncoverable";
interface UncoverableBehavior extends GameObjectBehavior {
  name: "Uncoverable";
  templateData: {
    hasBeenUncovered: boolean;
  };
}
