import { createHashedStringEnum, HashedString } from "../../data-types";

const MinionSkillGroupNames = [
  "Farming" as const,
  "Ranching" as const,
  "Mining" as const,
  "Cooking" as const,
  "Art" as const,
  "Building" as const,
  "Management" as const,
  "Research" as const,
  "Suits" as const,
  "Hauling" as const,
  "Technicals" as const,
  "MedicalAid" as const,
  "Basekeeping" as const,
];
export type MinionSkillGroup = HashedString;

export const MinionSkillGroup = createHashedStringEnum(MinionSkillGroupNames);
