import { GameObjectBehavior } from "../game-object-behavior";
import { BehaviorName } from "./types";

const AIEffectsBehavior: BehaviorName<AIEffectsBehavior> = "Klei.AI.Effects";
interface AIEffectsBehavior extends GameObjectBehavior {
  name: "Klei.AI.Effects";
  templateData: {
    saveLoadEffects: EffectInstance[];
  };
}
interface EffectInstance {
  id: string;
  timeRemaining: number;
}
