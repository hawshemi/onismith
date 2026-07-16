import { typedKeys } from "../../utils";

export enum SpaceDestinationTypeName {
  Satellite = "Satellite",
  MetallicAsteroid = "MetallicAsteroid",
  RockyAsteroid = "RockyAsteroid",
  CarbonaceousAsteroid = "CarbonaceousAsteroid",
  IcyDwarf = "IcyDwarf",
  OrganicDwarf = "OrganicDwarf",
  DustyMoon = "DustyMoon",
  TerraPlanet = "TerraPlanet",
  VolcanoPlanet = "VolcanoPlanet",
  GasGiant = "GasGiant",
  IceGiant = "IceGiant",
  SaltDwarf = "SaltDwarf",
  RustPlanet = "RustPlanet",
  ForestPlanet = "ForestPlanet",
  RedDwarf = "RedDwarf",
  GoldAsteroid = "GoldAsteroid",
  HydrogenGiant = "HydrogenGiant",
  OilyAsteroid = "OilyAsteroid",
  ShinyPlanet = "ShinyPlanet",
  ChlorinePlanet = "ChlorinePlanet",
  SaltDesertPlanet = "SaltDesertPlanet",
  Wormhole = "Wormhole",
  Earth = "Earth",
}
export const SpaceDestinationTypeNames = typedKeys(SpaceDestinationTypeName);
