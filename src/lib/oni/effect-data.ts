export interface EffectDefinition {
  name: string;
  summary: string;
}

// Display names and concise summaries are based on ONI's English modifier
// strings. Summaries are paraphrased so they stay compact in the editor.
const EFFECT_DEFINITIONS: Readonly<Record<string, EffectDefinition>> = {
  AnewHope: {
    name: "New Hope",
    summary: "Feels optimistic about a new home",
  },
  CenterOfAttention: {
    name: "Center of Attention",
    summary: "Feels reassured while someone is watching over them",
  },
  ColdAir: {
    name: "Chilly Surroundings",
    summary: "Tires more quickly and loses body heat in a cold environment",
  },
  ContaminatedLungs: {
    name: "Yucky Lungs",
    summary: "Recently inhaled Polluted Oxygen",
  },
  CoolingDown: {
    name: "Cooling Down",
    summary: "Trying to return to a comfortable body temperature",
  },
  Darkness: {
    name: "Darkness",
    summary: "Feels uncomfortable while staying in the dark",
  },
  Decor2: {
    name: "Last Cycle's Decor: Average",
    summary: "Found the colony's overall Decor acceptable last cycle",
  },
  DirtyHands: {
    name: "Dirty Hands",
    summary: "Has unwashed hands that may carry germs",
  },
  DisturbedSleep: {
    name: "Disturbed Sleep",
    summary: "Sleep was interrupted and provided less rest",
  },
  EdibleMinus3: {
    name: "Grisly Meal",
    summary: "Ate a grisly meal and hopes the next one will be better",
  },
  FullBladder: {
    name: "Full Bladder",
    summary: "Needs access to a toilet soon",
  },
  Hyperthermia: {
    name: "Heat Stroke",
    summary: "Body temperature is dangerously high",
  },
  Hypothermia: {
    name: "Hypothermia",
    summary: "Body temperature is dangerously low",
  },
  LightWounds: {
    name: "Light Wounds",
    summary: "Minor injuries are causing some discomfort",
  },
  MentalBreak: {
    name: "Stress Reaction",
    summary: "Stress reached its limit and triggered a Stress Reaction",
  },
  ModerateWounds: {
    name: "Moderate Wounds",
    summary: "Injuries are affecting the ability to work",
  },
  Mourning: {
    name: "Mourning",
    summary: "Grieving the loss of a friend",
  },
  NarcolepticSleep: {
    name: "Narcoleptic Nap",
    summary: "Taking an involuntary short nap",
  },
  NewCrewArrival: {
    name: "New Friend",
    summary: "Happy to see a new face in the colony",
  },
  RecentlySocialized: {
    name: "Socialized",
    summary: "Recently spent free time with friends",
  },
  RedAlert: {
    name: "Red Alert!",
    summary: "The colony's Red Alert is increasing Stress",
  },
  RefreshingTouch: {
    name: "Heat Resistant",
    summary: "Temporarily immune to Toasty Surroundings after cooling down",
  },
  RestfulSleep: {
    name: "Sleeping Peacefully",
    summary: "Getting a good night's rest",
  },
  RoomBarracks: {
    name: "Barracks",
    summary: "Feels refreshed after sleeping in a Barracks",
  },
  RoomBathroom: {
    name: "Washroom",
    summary: "Recently used a Lavatory inside a Washroom",
  },
  RoomGreatHall: {
    name: "Great Hall",
    summary: "Recently ate a meal inside a Great Hall",
  },
  SevereWounds: {
    name: "Severe Wounds",
    summary: "Serious injuries are affecting work and wellbeing",
  },
  Showered: {
    name: "Showered",
    summary: "Recently showered and feels clean",
  },
  Sleep: {
    name: "Sleeping",
    summary: "Recovering Stamina while asleep",
  },
  SmelledPutridOdour: {
    name: "Smelled a Putrid Odor",
    summary: "Recently smelled something extremely foul",
  },
  SoreBack: {
    name: "Sore Back",
    summary: "Feels sore after sleeping on the floor",
  },
  StaleFood: {
    name: "Bad Leftovers",
    summary: "In a bad mood after eating stale Food",
  },
  SteppedInContaminatedWater: {
    name: "Stepped in Polluted Water",
    summary: "Recently stepped in something unpleasant",
  },
  StressfulyEmptyingBladder: {
    name: "Making a Mess",
    summary: "Could not reach a toilet before emptying their Bladder",
  },
  Unclean: {
    name: "Unclean",
    summary: "Poor hygiene is making this Duplicant uncomfortable",
  },
  UncomfortableSleep: {
    name: "Sleeping Uncomfortably",
    summary: "Collapsed on the floor from exhaustion",
  },
  UnderWater: {
    name: "Underwater",
    summary: "Movement is slowed while submerged",
  },
  Vomiting: {
    name: "Vomiting",
    summary: "Currently vomiting and creating a mess to clean",
  },
  WarmAir: {
    name: "Toasty Surroundings",
    summary: "The surrounding environment is uncomfortably warm",
  },
  WarmingUp: {
    name: "Warming Up",
    summary: "Trying to return to a comfortable body temperature",
  },
  WasAttacked: {
    name: "Recently Assailed",
    summary: "Feeling stressed after being attacked",
  },
  WellFed: {
    name: "Well Fed",
    summary: "Feels satisfied after eating a large meal",
  },
};

export function formatEffectId(effectId: string): string {
  return effectId
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .replace(/(\d)([A-Za-z])/g, "$1 $2")
    .replace(/^Anew Hope$/, "A New Hope");
}

export function getEffectDefinition(effectId: string): EffectDefinition {
  return (
    EFFECT_DEFINITIONS[effectId] ?? {
      name: formatEffectId(effectId),
      summary: "Timed Duplicant status saved by Oxygen Not Included",
    }
  );
}
