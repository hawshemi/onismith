import { GameObjectBehavior } from "../game-object-behavior";
import { BehaviorName } from "./types";

const KPrefabIDBehavior: BehaviorName<KPrefabIDBehavior> = "KPrefabID";
interface KPrefabIDBehavior extends GameObjectBehavior {
  name: "KPrefabID";
  templateData: {
    InstanceID: KPrefabID;
  };
}

type KPrefabID = number;
