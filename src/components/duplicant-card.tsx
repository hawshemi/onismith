"use client";

import { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { FaChevronRight } from "react-icons/fa6";
import { getSafeAccessoryOrdinal } from "@/lib/oni/accessory-constraints";
import { HAIR_OFFSET_BASES } from "@/lib/oni/hair-offsets";

interface HairOffset {
  x?: number;
  y?: number;
  scale?: number;
}

type HairOffsets = Record<string, HairOffset>;

interface DuplicantAttribute {
  attributeId: string;
  displayName?: string;
  levelLabel?: string;
}

interface DuplicantAppearance {
  hairOrdinal?: number;
  headOrdinal?: number;
  eyesOrdinal?: number;
}

interface DuplicantView {
  id: number;
  name: string;
  isBionic?: boolean;
  gender?: string;
  traits?: string[];
  appearance?: DuplicantAppearance;
  attributes?: DuplicantAttribute[];
}

interface DuplicantCardProps {
  duplicant: DuplicantView;
  onSelect: (id: number) => void;
  hairOffsets?: HairOffsets;
}

const ACCESSORY_BASE_PATH = "/images/oni";
const PREVIEW_SIZE = 32;
const CARD_SIZE = 32;
const CARD_CONTENT_SCALE = 0.6;
const CARD_CONTENT_OFFSET_Y = 0;
const CARD_SCALE_RATIO = CARD_SIZE / PREVIEW_SIZE;

function formatGender(gender: string | undefined): string | null {
  const normalized = typeof gender === "string" ? gender.toUpperCase() : "";
  if (normalized.includes("FEMALE")) {
    return "Female";
  }
  if (normalized.includes("MALE")) {
    return "Male";
  }
  if (normalized === "NB" || normalized.includes("NONBINARY")) {
    return "Non-binary";
  }
  return null;
}

function formatAccessoryOrdinal(ordinal: number): string {
  const safe = Number.isFinite(ordinal) ? Math.max(1, Math.floor(ordinal)) : 1;
  return String(safe);
}

function getAccessorySrc(type: "hair" | "head", ordinal: number): string {
  const safeType = type === "hair" ? "hair" : "head";
  const safeOrdinal = getSafeAccessoryOrdinal(safeType, ordinal);
  const padded = formatAccessoryOrdinal(safeOrdinal);
  return `${ACCESSORY_BASE_PATH}/${type}/${type}_${padded}.png`;
}

function finiteOr(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? (value as number) : fallback;
}

function getHairPreviewTransform(
  hairOrdinal: number,
  hairOffsets?: HairOffsets,
) {
  const hairOffset =
    hairOffsets?.[String(hairOrdinal)] ?? hairOffsets?.[hairOrdinal];
  const baseOffset = (HAIR_OFFSET_BASES as HairOffsets)[hairOrdinal];
  const rawOffsetX = finiteOr(baseOffset?.x, 0) + finiteOr(hairOffset?.x, 0);
  const rawOffsetY = finiteOr(baseOffset?.y, 0) + finiteOr(hairOffset?.y, 0);
  const rawScale =
    finiteOr(baseOffset?.scale, 1) * finiteOr(hairOffset?.scale, 1);

  return {
    hairOffsetX: rawOffsetX * CARD_SCALE_RATIO * CARD_CONTENT_SCALE,
    hairOffsetY:
      rawOffsetY * CARD_SCALE_RATIO * CARD_CONTENT_SCALE +
      CARD_CONTENT_OFFSET_Y,
    hairScale: CARD_CONTENT_SCALE * (1 + (rawScale - 1) * CARD_SCALE_RATIO),
  };
}

function DuplicantCard({
  duplicant,
  onSelect,
  hairOffsets,
}: DuplicantCardProps) {
  const headshapeOrdinal = duplicant.appearance?.headOrdinal ?? 1;
  const hairOrdinal = duplicant.appearance?.hairOrdinal ?? 1;
  const traitIds = Array.isArray(duplicant.traits) ? duplicant.traits : [];
  const { hairOffsetX, hairOffsetY, hairScale } = getHairPreviewTransform(
    hairOrdinal,
    hairOffsets,
  );
  const attributeCount = Array.isArray(duplicant.attributes)
    ? duplicant.attributes.length
    : 0;
  const genderLabel = formatGender(duplicant.gender);

  return (
    <Link
      href={`/duplicants-editor?id=${duplicant.id}`}
      onClick={() => onSelect(duplicant.id)}
      aria-label={`Edit ${duplicant.name}`}
      className="m3-card m3-card-hover group flex h-full min-h-24 w-full items-center gap-3 p-3"
      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 96px" }}
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[var(--surface-container-high)]">
        <Image
          src={getAccessorySrc("head", headshapeOrdinal)}
          alt=""
          fill
          className="absolute inset-0 h-full w-full object-contain"
          style={{
            transform: `translateY(${CARD_CONTENT_OFFSET_Y}px) scale(${CARD_CONTENT_SCALE})`,
            transformOrigin: "50% 50%",
          }}
        />
        <Image
          src={getAccessorySrc("hair", hairOrdinal)}
          alt=""
          fill
          className="absolute inset-0 h-full w-full object-contain"
          style={{
            transform: `translate(${hairOffsetX}px, ${hairOffsetY}px) scale(${hairScale})`,
            transformOrigin: "50% 50%",
          }}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
        <div>
          <h2 className="break-words text-sm font-semibold leading-snug group-hover:text-[var(--accent)]">
            {duplicant.name}
          </h2>
          <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-[var(--muted)]">
            <span>ID {duplicant.id}</span>
            {genderLabel ? <span>{genderLabel}</span> : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-[var(--muted)]">
          {duplicant.isBionic ? (
            <span className="text-[var(--accent)]">Bionic</span>
          ) : null}
          {!duplicant.isBionic ? <span>{traitIds.length} traits</span> : null}
          <span>{attributeCount} attributes</span>
        </div>
      </div>
      <span
        className="flex shrink-0 items-center gap-1 text-xs font-medium text-[var(--accent)]"
        aria-hidden="true"
      >
        Edit
        <FaChevronRight className="h-2.5 w-2.5" />
      </span>
    </Link>
  );
}

// Memoized: on the browse grid the common re-render trigger is filter/sort
// state, not the card's own props. Skipping unchanged cards keeps typing smooth
// with hundreds of cards mounted.
export default memo(DuplicantCard);
