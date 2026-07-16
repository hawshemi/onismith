export interface ParserInstruction {
  type: string;
  isMeta?: boolean;
}

export function isMetaInstruction(inst: ParserInstruction): boolean {
  return inst != null && typeof inst === "object" && !!inst.isMeta;
}
