import { GameObjectBehavior } from "../game-object-behavior";
import { BehaviorName } from "./types";

const AIAttributeLevelsBehavior: BehaviorName<AIAttributeLevelsBehavior> =
  "Klei.AI.AttributeLevels";
interface AIAttributeLevelsBehavior extends GameObjectBehavior {
  name: "Klei.AI.AttributeLevels";
  templateData: {
    saveLoadLevels: AttributeLevel[];
  };
}
interface AttributeLevel {
  attributeId: string;
  experience: number;
  level: number;
}
