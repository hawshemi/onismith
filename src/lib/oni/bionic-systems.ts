export const BIONIC_VITAL_DEFINITIONS = [
  {
    id: "BionicOil",
    displayName: "Gear Oil",
    max: 200,
    divisor: 1,
    unit: "kg",
    editable: true,
  },
  {
    id: "BionicGunk",
    displayName: "Gunk",
    max: 100,
    divisor: 1,
    unit: "%",
    editable: true,
  },
  {
    id: "BionicInternalBattery",
    displayName: "Stored Power",
    max: null,
    divisor: 1000,
    unit: "kJ",
    editable: false,
  },
  {
    id: "BionicOxygenTank",
    displayName: "Oxygen Tank",
    max: 240,
    divisor: 1,
    unit: "kg",
    editable: true,
  },
] as const;

export type BionicVitalId = (typeof BIONIC_VITAL_DEFINITIONS)[number]["id"];

export function getBionicVitalDefinition(id: string) {
  return BIONIC_VITAL_DEFINITIONS.find((definition) => definition.id === id);
}

const BIONIC_POWER_BANK_CAPACITY_KJ: Record<string, number> = {
  DisposableElectrobank_RawMetal: 120,
};

export function getBionicPowerBankCapacityKilojoules(
  prefabId: string,
): number | null {
  return BIONIC_POWER_BANK_CAPACITY_KJ[prefabId] ?? null;
}
