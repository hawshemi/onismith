// Display names for the Oxygen Not Included DLC ids carried in a save header,
// keyed by the internal dlcId string. Single source of truth for both the
// sidebar DLC readout and the colony overview. Unknown ids fall back to the raw
// id so a newer DLC degrades gracefully until it gets an entry here.
const DLC_DISPLAY_NAMES: Record<string, string> = {
  EXPANSION1_ID: "Spaced Out!",
  DLC2_ID: "The Frosty Planet",
  DLC3_ID: "The Bionic Booster",
  DLC4_ID: "The Prehistoric Planet",
  DLC5_ID: "The Aquatic Planet",
};

export function getDlcDisplayName(dlcId: string): string {
  return DLC_DISPLAY_NAMES[dlcId] ?? dlcId;
}
