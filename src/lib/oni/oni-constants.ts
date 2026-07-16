// Seconds per cycle used by the effect timer representation: effect
// timeRemaining (seconds) <-> cycles conversions in the selectors and reducer.
export const EFFECT_SECONDS_PER_CYCLE = 200;

export interface MinionSkillDefinition {
  skillId: string;
  displayName: string;
}

export interface MinionSkillGroupDefinition {
  groupId: string;
  displayName: string;
  context?: string;
  requiredDlc?: string;
  excludedDlc?: string;
  skills: readonly MinionSkillDefinition[];
}

// Skill IDs and names from ONI's Database.Skills registry. Some research and
// rocketry skills have separate IDs for the base game and Spaced Out!, so both
// variants are retained for save compatibility.
export const STANDARD_MINION_SKILL_GROUPS = [
  {
    groupId: "digging",
    displayName: "Digging",
    skills: [
      { skillId: "Mining1", displayName: "Hard Digging" },
      { skillId: "Mining2", displayName: "Superhard Digging" },
      { skillId: "Mining3", displayName: "Super-Duperhard Digging" },
      { skillId: "Mining4", displayName: "Hazmat Digging" },
    ],
  },
  {
    groupId: "building",
    displayName: "Building",
    skills: [
      { skillId: "Building1", displayName: "Improved Construction I" },
      { skillId: "Building2", displayName: "Improved Construction II" },
      { skillId: "Building3", displayName: "Demolition" },
    ],
  },
  {
    groupId: "farming",
    displayName: "Farming",
    skills: [
      { skillId: "Farming1", displayName: "Improved Farming I" },
      { skillId: "Farming2", displayName: "Crop Tending" },
      { skillId: "Farming3", displayName: "Improved Farming II" },
    ],
  },
  {
    groupId: "ranching",
    displayName: "Ranching",
    skills: [
      { skillId: "Ranching1", displayName: "Critter Ranching I" },
      { skillId: "Ranching2", displayName: "Critter Ranching II" },
    ],
  },
  {
    groupId: "researching",
    displayName: "Researching",
    skills: [
      { skillId: "Researching1", displayName: "Advanced Research" },
      { skillId: "Researching2", displayName: "Field Research" },
    ],
  },
  {
    groupId: "base-game-researching",
    displayName: "Researching",
    context: "Base game",
    excludedDlc: "EXPANSION1_ID",
    skills: [
      { skillId: "Researching3", displayName: "Astronomy" },
      {
        skillId: "Researching4",
        displayName: "Applied Sciences Research",
      },
    ],
  },
  {
    groupId: "spaced-out-researching",
    displayName: "Researching",
    context: "Spaced Out!",
    requiredDlc: "EXPANSION1_ID",
    skills: [
      { skillId: "Astronomy", displayName: "Astronomy" },
      {
        skillId: "AtomicResearch",
        displayName: "Applied Sciences Research",
      },
      {
        skillId: "SpaceResearch",
        displayName: "Data Analysis Researcher",
      },
    ],
  },
  {
    groupId: "cooking",
    displayName: "Cooking",
    skills: [
      { skillId: "Cooking1", displayName: "Grilling" },
      { skillId: "Cooking2", displayName: "Enhanced Seasoning" },
      { skillId: "Cooking3", displayName: "Fine Dining" },
    ],
  },
  {
    groupId: "decorating",
    displayName: "Decorating",
    skills: [
      { skillId: "Arting1", displayName: "Art Fundamentals" },
      { skillId: "Arting2", displayName: "Aesthetic Design" },
      { skillId: "Arting3", displayName: "Masterworks" },
    ],
  },
  {
    groupId: "supplying",
    displayName: "Supplying",
    skills: [
      { skillId: "Hauling1", displayName: "Improved Carrying I" },
      { skillId: "Hauling2", displayName: "Improved Carrying II" },
    ],
  },
  {
    groupId: "suit-wearing",
    displayName: "Suit Wearing",
    skills: [
      {
        skillId: "ThermalSuits",
        displayName: "Suit Sustainability Training",
      },
      { skillId: "Suits1", displayName: "Exosuit Training" },
    ],
  },
  {
    groupId: "operating",
    displayName: "Operating",
    skills: [
      { skillId: "Technicals1", displayName: "Improved Tinkering" },
      {
        skillId: "Technicals2",
        displayName: "Electrical Engineering",
      },
      {
        skillId: "Engineering1",
        displayName: "Mechatronics Engineering",
      },
    ],
  },
  {
    groupId: "tidying",
    displayName: "Tidying",
    skills: [
      { skillId: "Basekeeping1", displayName: "Improved Strength" },
      { skillId: "Basekeeping2", displayName: "Plumbing" },
      { skillId: "Pyrotechnics", displayName: "Pyrotechnics" },
    ],
  },
  {
    groupId: "base-game-rocketry",
    displayName: "Rocketry",
    context: "Base game",
    excludedDlc: "EXPANSION1_ID",
    skills: [
      { skillId: "Astronauting1", displayName: "Rocket Piloting" },
      { skillId: "Astronauting2", displayName: "Rocket Navigation" },
    ],
  },
  {
    groupId: "spaced-out-rocketry",
    displayName: "Rocketry",
    context: "Spaced Out!",
    requiredDlc: "EXPANSION1_ID",
    skills: [
      { skillId: "RocketPiloting1", displayName: "Rocket Piloting" },
      { skillId: "RocketPiloting2", displayName: "Rocket Piloting II" },
    ],
  },
  {
    groupId: "doctoring",
    displayName: "Doctoring",
    skills: [
      { skillId: "Medicine1", displayName: "Medicine Compounding" },
      { skillId: "Medicine2", displayName: "Bedside Manner" },
      { skillId: "Medicine3", displayName: "Advanced Medical Care" },
    ],
  },
  {
    groupId: "swimming",
    displayName: "Swimming",
    context: "Aquatic Planet",
    requiredDlc: "DLC5_ID",
    skills: [
      { skillId: "Swimming", displayName: "Basic Swimming" },
      { skillId: "Swimming2", displayName: "Divemaster" },
    ],
  },
] as const satisfies readonly MinionSkillGroupDefinition[];

export const BIONIC_MINION_SKILL_GROUPS = [
  {
    groupId: "bionic-processing",
    displayName: "Booster Processing",
    skills: [
      { skillId: "BionicsA1", displayName: "Booster Processing I" },
      { skillId: "BionicsA2", displayName: "Booster Processing II" },
      { skillId: "BionicsA3", displayName: "Complex Processing" },
    ],
  },
  {
    groupId: "bionic-gears",
    displayName: "Gears",
    skills: [
      { skillId: "BionicsB1", displayName: "Improved Gears I" },
      { skillId: "BionicsB2", displayName: "Improved Gears II" },
    ],
  },
  {
    groupId: "bionic-schematics",
    displayName: "Schematics",
    skills: [
      { skillId: "BionicsC1", displayName: "Schematics" },
      { skillId: "BionicsC2", displayName: "Advanced Schematics" },
      { skillId: "BionicsC3", displayName: "Top Gear" },
    ],
  },
  {
    groupId: "bionic-hardware",
    displayName: "Hardware",
    skills: [
      { skillId: "BionicsD1", displayName: "Improved Hardware" },
      { skillId: "BionicsD2", displayName: "Climate Control" },
    ],
  },
] as const satisfies readonly MinionSkillGroupDefinition[];

export const AI_EFFECT_IDS = [
  "UncomfortableSleep",
  "Sleep",
  "NarcolepticSleep",
  "RestfulSleep",
  "AnewHope",
  "Mourning",
  "DisturbedSleep",
  "NewCrewArrival",
  "UnderWater",
  "FullBladder",
  "StressfulyEmptyingBladder",
  "RedAlert",
  "MentalBreak",
  "CoolingDown",
  "WarmingUp",
  "Darkness",
  "SteppedInContaminatedWater",
  "WellFed",
  "StaleFood",
  "SmelledPutridOdour",
  "Vomiting",
  "DirtyHands",
  "Unclean",
  "LightWounds",
  "ModerateWounds",
  "SevereWounds",
  "WasAttacked",
  "SoreBack",
  "WarmAir",
  "ColdAir",
  "Hypothermia",
  "Hyperthermia",
  "CenterOfAttention",
];

// Internal GeyserGenericConfig id strings (the part after the "GeyserGeneric_"
// prefab prefix). The app hashes these to resolve a save's geyser type and uses
// them as the type dropdown options, so each must match the game exactly.
// Aquatic Planet Pack (DLC5): the Polluted Brine Vent is "murky_brine" (confirmed
// from a real save's GeyserGeneric_murky_brine group + matching typeId hash). Its
// other water features (Tidal Spring / Thermal Gas Fissure) are separate prefabs
// (SmallReefGeyser / UnderwaterVent) that lack the Geyser behavior, so they are
// not generic geysers and are neither listed nor editable here.
export const GEYSER_TYPE_NAMES = [
  "steam",
  "hot_steam",
  "hot_water",
  "slush_water",
  "filthy_water",
  "salt_water",
  "slush_salt_water",
  "murky_brine",
  "small_volcano",
  "big_volcano",
  "liquid_co2",
  "hot_co2",
  "hot_hydrogen",
  "hot_po2",
  "slimy_po2",
  "chlorine_gas",
  "chlorine_gas_cool",
  "methane",
  "molten_copper",
  "molten_iron",
  "molten_gold",
  "molten_aluminum",
  "molten_cobalt",
  "molten_niobium",
  "molten_tungsten",
  "liquid_sulfur",
  "oil_drip",
];

export interface DuplicantExportableBehavior {
  name: string;
  i18nKey: string;
  behavior: string;
}

export const DUPLICANT_EXPORTABLE_BEHAVIORS: DuplicantExportableBehavior[] = [
  {
    name: "Appearance",
    i18nKey: "duplicant_appearance.noun_titlecase",
    behavior: "Accessorizer",
  },
  {
    name: "Attributes",
    i18nKey: "duplicant_attribute.noun_titlecase_plural",
    behavior: "Klei.AI.AttributeLevels",
  },
  {
    name: "Traits",
    i18nKey: "duplicant_trait.noun_titlecase_plural",
    behavior: "Klei.AI.Traits",
  },
  {
    name: "Skills",
    i18nKey: "duplicant_skills.noun_titlecase_plural",
    behavior: "MinionResume",
  },
];

export const DUPLICANT_HEALTH_MODIFIERS = [
  "HitPoints",
  "Stamina",
  "Calories",
  "Breath",
  "Bladder",
  "Stress",
  "Decor",
  "ImmuneLevel",
  "Toxicity",
  "FoodPoisoning",
  "ColdBrain",
  "HeatRash",
  "SlimeLung",
  "Sunburn",
  "PutridOdour",
  "Spores",
];
