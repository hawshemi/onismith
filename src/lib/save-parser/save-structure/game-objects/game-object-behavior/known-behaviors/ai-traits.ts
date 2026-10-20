import { GameObjectBehavior } from "../game-object-behavior";
import { BehaviorName } from "./types";

const DupeTraitsBehavior: BehaviorName<DupeTraitsBehavior> = "Klei.AI.Traits";
interface DupeTraitsBehavior extends GameObjectBehavior {
  name: "Klei.AI.Traits";
  templateData: {
    TraitIds: string[];
  };
}

type TraitStatus =
  "positive" | "negative" | "universal" | "overjoyed" | "stress";

interface TraitDefinition {
  id: string;
  traits: string;
  desc: string;
  status: TraitStatus;
}

export const DUPE_TRAITS: TraitDefinition[] = [
  {
    id: "AncientKnowledge",
    traits: "Ancient Knowledge",
    desc: "This Duplicant has knowledge from the before times.",
    status: "positive",
  },
  {
    id: "RanchingUp",
    traits: "Animal Lover",
    desc: "The fuzzy snoots! The little claws! The chitinous exoskeletons! This Duplicant's never met a critter they didn't like.",
    status: "positive",
  },
  {
    id: "RockCrusher",
    traits: "Beefsteak",
    desc: "This Duplicant's got muscles on their muscles!",
    status: "positive",
  },
  {
    id: "StrongArm",
    traits: "Buff",
    desc: "This Duplicant has muscles on their muscles.",
    status: "positive",
  },
  {
    id: "BedsideManner",
    traits: "Caregiver",
    desc: "This Duplicant has good bedside manner and a healing touch.",
    status: "positive",
  },
  {
    id: "Chatty",
    traits: "Charismatic",
    desc: "This Duplicant's so charming, chatting with them is sometimes enough to trigger an Overjoyed response.",
    status: "positive",
  },
  {
    id: "DeeperDiversLungs",
    traits: "Deep Diver's Lungs",
    desc: "This Duplicant has a frankly impressive ability to hold their breath",
    status: "positive",
  },
  {
    id: "DiversLung",
    traits: "Diver's Lungs",
    desc: "This Duplicant could have been a talented opera singer in another life.",
    status: "positive",
  },
  {
    id: "Thriver",
    traits: "Duress to Impress",
    desc: "This Duplicant kicks into hyperdrive when the stress is on.",
    status: "positive",
  },
  {
    id: "EarlyBird",
    traits: "Early Bird",
    desc: "This Duplicant always wakes up feeling fresh and efficient!",
    status: "positive",
  },
  {
    id: "FrostProof",
    traits: "Frost Proof",
    desc: "This Duplicant is too cool to be bothered by the cold.",
    status: "positive",
  },
  {
    id: "StrongImmuneSystem",
    traits: "Germ Resistant",
    desc: "This Duplicant's immune system bounces back faster than most.",
    status: "positive",
  },
  {
    id: "GlowStick",
    traits: "Glow Stick",
    desc: "This Duplicant is positively glowing.",
    status: "positive",
  },
  {
    id: "Foodie",
    traits: "Gourmet",
    desc: "This Duplicant's refined palate demands only the most luxurious dishes the colony can offer.",
    status: "positive",
  },
  {
    id: "Greasemonkey",
    traits: "Grease Monkey",
    desc: "This Duplicant likes to throw a wrench into the colony's plans... in a good way.",
    status: "positive",
  },
  {
    id: "GreenThumb",
    traits: "Green Thumb",
    desc: "This Duplicant regards every plant as a potential friend.",
    status: "positive",
  },
  {
    id: "ConstructionUp",
    traits: "Handy",
    desc: "This Duplicant is a swift and skilled builder.",
    status: "positive",
  },
  {
    id: "DecorUp",
    traits: "Innately Stylish",
    desc: "This Duplicant's radiant self-confidence makes even the rattiest outfits look trendy.",
    status: "positive",
  },
  {
    id: "InteriorDecorator",
    traits: "Interior Decorator",
    desc: '"Move it a little to the left..."',
    status: "positive",
  },
  {
    id: "IronGut",
    traits: "Iron Gut",
    desc: "This Duplicant can eat just about anything without getting sick.",
    status: "positive",
  },
  {
    id: "Loner",
    traits: "Loner",
    desc: "This Duplicant prefers solitary pursuits.",
    status: "positive",
  },
  {
    id: "MoleHands",
    traits: "Mole Hands",
    desc: "They're great for tunneling, but finding good gloves is a nightmare.",
    status: "positive",
  },
  {
    id: "NightOwl",
    traits: "Night Owl",
    desc: "This Duplicant does their best work when they'd ought to be sleeping.",
    status: "positive",
  },
  {
    id: "FastLearner",
    traits: "Quick Learner",
    desc: "This Duplicant's sharp as a tack and learns new skills with amazing speed.",
    status: "positive",
  },
  {
    id: "RadiationEater",
    traits: "Radiation Eater",
    desc: "This Duplicant eats radiation for breakfast (and dinner).",
    status: "positive",
  },
  {
    id: "Regeneration",
    traits: "Regenerative",
    desc: "This robust Duplicant is constantly regenerating health",
    status: "positive",
  },
  {
    id: "Archaeologist",
    traits: "Relic Hunter",
    desc: "This Duplicant was never taught the phrase \\",
    status: "positive",
  },
  {
    id: "Meteorphile",
    traits: "Rock Fan",
    desc: "Meteor showers get this Duplicant really, really hyped.",
    status: "positive",
  },
  {
    id: "SimpleTastes",
    traits: "Shrivelled Tastebuds",
    desc: "This Duplicant could lick a Puft's backside and taste nothing.",
    status: "positive",
  },
  {
    id: "GrantSkill_Arting2",
    traits: "Skilled: Aesthetic Design",
    desc: "This Duplicant begins with a pre-learned Skill, but does not have increased Morale Requirements.",
    status: "positive",
  },
  {
    id: "GrantSkill_Arting1",
    traits: "Skilled: Art Fundamentals",
    desc: "This Duplicant begins with a pre-learned Skill, but does not have increased Morale Requirements.",
    status: "positive",
  },
  {
    id: "GrantSkill_Medicine2",
    traits: "Skilled: Bedside Manner",
    desc: "This Duplicant begins with a pre-learned Skill, but does not have increased Morale Requirements.",
    status: "positive",
  },
  {
    id: "GrantSkill_Ranching1",
    traits: "Skilled: Critter Ranching I",
    desc: "This Duplicant begins with a pre-learned Skill, but does not have increased Morale Requirements.",
    status: "positive",
  },
  {
    id: "GrantSkill_Farming2",
    traits: "Skilled: Crop Tending",
    desc: "This Duplicant begins with a pre-learned Skill, but does not have increased Morale Requirements.",
    status: "positive",
  },
  {
    id: "GrantSkill_Technicals2",
    traits: "Skilled: Electrical Engineering",
    desc: "This Duplicant begins with a pre-learned Skill, but does not have increased Morale Requirements.",
    status: "positive",
  },
  {
    id: "GrantSkill_Suits1",
    traits: "Skilled: Exosuit Training",
    desc: "This Duplicant begins with a pre-learned Skill, but does not have increased Morale Requirements.",
    status: "positive",
  },
  {
    id: "GrantSkill_Cooking1",
    traits: "Skilled: Grilling",
    desc: "This Duplicant begins with a pre-learned Skill, but does not have increased Morale Requirements.",
    status: "positive",
  },
  {
    id: "GrantSkill_Mining1",
    traits: "Skilled: Hard Digging",
    desc: "This Duplicant begins with a pre-learned Skill, but does not have increased Morale Requirements.",
    status: "positive",
  },
  {
    id: "GrantSkill_Arting3",
    traits: "Skilled: Masterworks",
    desc: "This Duplicant begins with a pre-learned Skill, but does not have increased Morale Requirements.",
    status: "positive",
  },
  {
    id: "GrantSkill_Engineering1",
    traits: "Skilled: Mechatronics Engineering",
    desc: "This Duplicant begins with a pre-learned Skill, but does not have increased Morale Requirements.",
    status: "positive",
  },
  {
    id: "GrantSkill_Basekeeping2",
    traits: "Skilled: Plumbing",
    desc: "This Duplicant begins with a pre-learned Skill, but does not have increased Morale Requirements.",
    status: "positive",
  },
  {
    id: "GrantSkill_Mining3",
    traits: "Skilled: Super-Duperhard Digging",
    desc: "This Duplicant begins with a pre-learned Skill, but does not have increased Morale Requirements.",
    status: "positive",
  },
  {
    id: "GrantSkill_Mining2",
    traits: "Skilled: Superhard Digging",
    desc: "This Duplicant begins with a pre-learned Skill, but does not have increased Morale Requirements.",
    status: "positive",
  },
  {
    id: "StarryEyed",
    traits: "Starry Eyed",
    desc: "This Duplicant loves being in space.",
    status: "positive",
  },
  {
    id: "SunnyDisposition",
    traits: "Sunny Disposition",
    desc: "This Duplicant has an unwaveringly positive outlook on life",
    status: "positive",
  },
  {
    id: "Twinkletoes",
    traits: "Twinkletoes",
    desc: "This Duplicant is light as a feather on their feet.",
    status: "positive",
  },
  {
    id: "Uncultured",
    traits: "Uncultured",
    desc: "This Duplicant has simply no appreciation for the arts.",
    status: "positive",
  },
  {
    id: "Allergies",
    traits: "Allergies",
    desc: "This Duplicant will sneeze uncontrollably when exposed to the pollen present in Floral Scent.",
    status: "negative",
  },
  {
    id: "Anemic",
    traits: "Anemic",
    desc: "This Duplicant has trouble keeping up with the others.",
    status: "negative",
  },
  {
    id: "Anxious",
    traits: "Anxious",
    desc: "This Duplicant collapses when put under too much pressure",
    status: "negative",
  },
  {
    id: "WeakImmuneSystem",
    traits: "Biohazardous",
    desc: "All the vitamin C in space couldn't stop this Duplicant from getting sick.",
    status: "negative",
  },
  {
    id: "CalorieBurner",
    traits: "Bottomless Stomach",
    desc: "This Duplicant might actually be several black holes in a trench coat.",
    status: "negative",
  },
  {
    id: "ConstructionDown",
    traits: "Building Impaired",
    desc: "This Duplicant has trouble constructing anything besides meaningful friendships.",
    status: "negative",
  },
  {
    id: "RanchingDown",
    traits: "Critter Aversion",
    desc: "This Duplicant just doesn't trust those beadly little eyes.",
    status: "negative",
  },
  {
    id: "Flatulence",
    traits: "Flatulent",
    desc: "Some Duplicants are just full of it.",
    status: "negative",
  },
  {
    id: "Fussy",
    traits: "Fussy",
    desc: "Nothing's ever quite good enough for this Duplicant",
    status: "negative",
  },
  {
    id: "CantCook",
    traits: "Gastrophobia",
    desc: "This Duplicant has a deep-seated distrust of the culinary arts",
    status: "negative",
  },
  {
    id: "IrritableBowel",
    traits: "Irritable Bowel",
    desc: 'This Duplicant needs a little extra time to "do their business".',
    status: "negative",
  },
  {
    id: "CookingDown",
    traits: "Kitchen Menace",
    desc: "This Duplicant could probably figure out a way to burn ice cream.",
    status: "negative",
  },
  {
    id: "Snorer",
    traits: "Loud Sleeper",
    desc: "In space, everyone can hear you snore.",
    status: "negative",
  },
  {
    id: "MachineryDown",
    traits: "Luddite",
    desc: "This Duplicant always invites friends over just to make them hook up their electronics.",
    status: "negative",
  },
  {
    id: "MouthBreather",
    traits: "Mouth Breather",
    desc: "This Duplicant sucks up way more than their fair share of Oxygen.",
    status: "negative",
  },
  {
    id: "Narcolepsy",
    traits: "Narcoleptic",
    desc: "This Duplicant can fall asleep anytime, anyplace.",
    status: "negative",
  },
  {
    id: "NoodleArms",
    traits: "Noodle Arms",
    desc: "This Duplicant's arms have all the tensile strength of overcooked linguine.",
    status: "negative",
  },
  {
    id: "NightLight",
    traits: "Nyctophobic",
    desc: "This Duplicant will imagine scary shapes in the dark all night if no one leaves a light on.",
    status: "negative",
  },
  {
    id: "ScaredyCat",
    traits: "Pacifist",
    desc: "This Duplicant abhors violence.",
    status: "negative",
  },
  {
    id: "BotanistDown",
    traits: "Plant Murderer",
    desc: "Never ask this Duplicant to watch your ferns when you go on vacation.",
    status: "negative",
  },
  {
    id: "DecorDown",
    traits: "Shabby Dresser",
    desc: "This Duplicant's clearly never heard of ironing.",
    status: "negative",
  },
  {
    id: "SlowLearner",
    traits: "Slow Learner",
    desc: "This Duplicant's a little slow on the uptake, but gosh do they try.",
    status: "negative",
  },
  {
    id: "SmallBladder",
    traits: "Small Bladder",
    desc: "This Duplicant has a tiny, pea-sized Bladder. Adorable!",
    status: "negative",
  },
  {
    id: "Hemophobia",
    traits: "Squeamish",
    desc: "This Duplicant is of delicate disposition and cannot tend to the sick.",
    status: "negative",
  },
  {
    id: "CantDig",
    traits: "Trypophobia",
    desc: "This Duplicant's fear of holes makes it impossible for them to dig.",
    status: "negative",
  },
  {
    id: "CantBuild",
    traits: "Unconstructive",
    desc: "This Duplicant is incapable of building even the most basic of structures.",
    status: "negative",
  },
  {
    id: "DiggingDown",
    traits: "Undigging",
    desc: "This Duplicant couldn't dig themselves out of a paper bag.",
    status: "negative",
  },
  {
    id: "CaringDown",
    traits: "Unempathetic",
    desc: "This Duplicant's lack of bedside manner makes it difficult for them to nurse peers back to health.",
    status: "negative",
  },
  {
    id: "ArtDown",
    traits: "Unpracticed Artist",
    desc: 'This Duplicant proudly proclaims they "can\'t even draw a stick figure".',
    status: "negative",
  },
  {
    id: "Workaholic",
    traits: "Workaholic",
    desc: "This Duplicant gets antsy when left idle",
    status: "negative",
  },
  {
    id: "CantResearch",
    traits: "Yokel",
    desc: "This Duplicant isn't the brightest star in the solar system.",
    status: "negative",
  },
  {
    id: "BalloonArtist",
    traits: "Balloon Artist",
    desc: "This Duplicant hands out balloons when they are ",
    status: "overjoyed",
  },
  {
    id: "SparkleStreaker",
    traits: "Sparkle Streaker",
    desc: "This Duplicant leaves a trail of happy sparkles when they are ",
    status: "overjoyed",
  },
  {
    id: "StickerBomber",
    traits: "Sticker Bomber",
    desc: "This Duplicant will spontaneously redecorate a room when they are ",
    status: "overjoyed",
  },
  {
    id: "SuperProductive",
    traits: "Super Productive",
    desc: "This Duplicant is super productive when they are ",
    status: "overjoyed",
  },
  {
    id: "HappySinger",
    traits: "Yodeler",
    desc: "This Duplicant belts out catchy tunes when they are ",
    status: "overjoyed",
  },
  {
    id: "Banshee",
    traits: "Banshee",
    desc: "This Duplicant wails uncontrollably when ",
    status: "stress",
  },
  {
    id: "BingeEater",
    traits: "Binge Eater",
    desc: "This Duplicant will dangerously overeat when ",
    status: "stress",
  },
  {
    id: "Aggressive",
    traits: "Destructive",
    desc: "This Duplicant handles stress by taking their frustrations out on defenseless machines",
    status: "stress",
  },
  {
    id: "UglyCrier",
    traits: "Ugly Crier",
    desc: "If this Duplicant gets too Stressed it won't be pretty",
    status: "stress",
  },
  {
    id: "StressVomiter",
    traits: "Vomiter",
    desc: "This Duplicant is liable to puke everywhere when ",
    status: "stress",
  },
  {
    id: "Claustrophobic",
    traits: "Claustrophobic",
    desc: "This Duplicant feels suffocated in spaces fewer than four tiles high or three tiles wide",
    status: "universal",
  },
  {
    id: "SensitiveFeet",
    traits: "Delicate Feetsies",
    desc: "This Duplicant is a sensitive sole and would rather walk on tile than raw bedrock",
    status: "universal",
  },
  {
    id: "Fashionable",
    traits: "Fashionista",
    desc: "This Duplicant dies a bit inside when forced to wear unstylish clothing",
    status: "universal",
  },
  {
    id: "PrefersColder",
    traits: "Pudgy",
    desc: "This Duplicant has some extra Insulation, so the room Temperature affects them a little less",
    status: "universal",
  },
  {
    id: "PrefersWarmer",
    traits: "Skinny",
    desc: "This Duplicant doesn't have much Insulation, so they are more Temperature sensitive than others",
    status: "universal",
  },
  {
    id: "SolitarySleeper",
    traits: "Solitary Sleeper",
    desc: "This Duplicant prefers to sleep alone",
    status: "universal",
  },
  {
    id: "Climacophobic",
    traits: "Vertigo Prone",
    desc: "Climbing ladders more than four tiles tall makes this Duplicant's stomach do flips",
    status: "universal",
  },
];

export const BIONIC_TRAITS: TraitDefinition[] = [
  {
    id: "BionicBug1",
    traits: "Bionic Bug: Rigid Thinking",
    desc: "This Duplicant's bionic systems are quite inflexible",
    status: "negative",
  },
  {
    id: "BionicBug2",
    traits: "Bionic Bug: Dissociative",
    desc: 'This Duplicant\'s bionic systems are built without "connector" parts',
    status: "negative",
  },
  {
    id: "BionicBug3",
    traits: "Bionic Bug: All Thumbs",
    desc: "This Duplicant's bionic systems aren't designed to operate other systems",
    status: "negative",
  },
  {
    id: "BionicBug4",
    traits: "Bionic Bug: Overengineered",
    desc: "This Duplicant's bionic systems rarely get past the processing stage",
    status: "negative",
  },
  {
    id: "BionicBug5",
    traits: "Bionic Bug: Late Bloomer",
    desc: "This Duplicant's bionic systems weren't built for speed",
    status: "negative",
  },
  {
    id: "BionicBug6",
    traits: "Bionic Bug: Urbanite",
    desc: "This Duplicant's bionic systems were designed by someone who'd never seen a plant in real life",
    status: "negative",
  },
  {
    id: "BionicBug7",
    traits: "Bionic Bug: Error Prone",
    desc: "This Duplicant's bionic systems err on the side of erring",
    status: "negative",
  },
  {
    id: "StressShocker",
    traits: "Stunner",
    desc: "This Duplicant emits electrical shocks when Stressed",
    status: "stress",
  },
  {
    id: "DataRainer",
    traits: "Rainmaker",
    desc: "This Duplicant distributes microchips when they are Overjoyed",
    status: "overjoyed",
  },
  {
    id: "RoboDancer",
    traits: "Flash Mobber",
    desc: "This Duplicant breaks into dance when they are Overjoyed",
    status: "overjoyed",
  },
];
