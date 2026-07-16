import { HashedString } from "../../../data-types";

import { GameObjectBehavior } from "../game-object-behavior";

import { BehaviorName } from "./types";

const MinionIdentityBehavior: BehaviorName<MinionIdentityBehavior> =
  "MinionIdentity";
interface MinionIdentityBehavior extends GameObjectBehavior {
  name: "MinionIdentity";
  templateData: {
    name: string;
    nameStringKey: string;

    gender: MinionGender;
    genderStringKey: MinionGender;

    arrivalTime: number;

    voiceIdx: number;

    bodyData: BodyData;

    assignableProxy: {
      id: number;
    };
  };
}

interface BodyData {
  headShape: HashedString;
  mouth: HashedString;
  neck: HashedString;
  eyes: HashedString;
  hair: HashedString;
  body: HashedString;
  arms: HashedString;
  hat: HashedString;
}

type MinionGender = "MALE" | "FEMALE" | "NB";
