import { HealthState } from "../../../const-data";

import { GameObjectBehavior } from "../game-object-behavior";
import { BehaviorName } from "./types";

const HealthBehavior: BehaviorName<HealthBehavior> = "Health";
interface HealthBehavior extends GameObjectBehavior {
  name: "Health";
  templateData: {
    CanBeIncapacitated: boolean;
    State: HealthState;
  };
}
