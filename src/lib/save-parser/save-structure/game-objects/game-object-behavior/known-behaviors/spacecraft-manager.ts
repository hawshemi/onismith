import { SimHashes, SpaceDestinationTypeName } from "../../../const-data";

import { BehaviorName } from "./types";

const SpacecraftManagerBehavior: BehaviorName<SpacecraftManagerBehavior> =
  "SpacecraftManager";
interface SpacecraftManagerBehavior {
  name: "SpacecraftManager";
  templateData: {
    spacecraft: any[];
    analyzeDestinationID: number;
    destinationAnalysisScores: [number, number][];
    destinations: SpaceDestination[];
    savedSpacecraftDestinations: [number, number][];
    nextSpacecraftID: number;
    destinationsGenerated: boolean;
  };
}

interface SpaceDestination {
  id: number;
  type: SpaceDestinationTypeName;
  distance: number;
  startingOrbitPercentage: number;
  availableMass: number;
  activePeriod: number;
  inactivePeriod: number;
  /**
   * All elements recoverable by missions to this destination.
   * An array of tuples.  First tuple item is the sim hash
   * of the element, the second tuple item is a value 0 to 1 representing
   * the random factor for how much of this element to recover.
   */
  recoverableElements: [SimHashes, number][];
  researchOpportunities: SpacecraftResearchOpportunity[];
}
interface SpacecraftResearchOpportunity {
  description: string;
  dataValue: number;
  completed: boolean;
  discoveredRareResource: SimHashes;
  discoveredRareItem: string;
}
