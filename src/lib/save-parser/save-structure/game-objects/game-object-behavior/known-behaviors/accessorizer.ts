import { Accessory } from "../../../const-data/accessories";

import { GameObjectBehavior } from "../game-object-behavior";

import { BehaviorName } from "./types";

const AccessorizerBehavior: BehaviorName<AccessorizerBehavior> = "Accessorizer";
interface AccessorizerBehavior extends GameObjectBehavior {
  name: "Accessorizer";
  templateData: {
    accessories: Accessory[];
  };
}
