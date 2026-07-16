"use client";

import Image from "next/image";
import {
  HAIR_ASSET_ORDINALS,
  HEAD_ASSET_ORDINALS,
  isAccessoryAssetAvailable,
} from "@/lib/oni/accessory-constraints";
import { NumberField } from "@/components/ui/numeric-fields";
import M3Dialog from "@/components/ui/m3-dialog";
import M3OutlinedButton from "@/components/ui/m3-outlined-button";
import { getAccessorySrc, getHairAdjustments } from "./appearance";

const APPEARANCE_MODAL_PREVIEW_SCALE = 0.65;
const APPEARANCE_MODAL_PREVIEW_OFFSET_Y = 25;
const APPEARANCE_MODAL_CARD_SCALE = 0.6;
const APPEARANCE_MODAL_CARD_OFFSET_Y = 22;
const HEAD_SHAPE_OPTIONS = HEAD_ASSET_ORDINALS;
const HAIR_STYLE_OPTIONS = HAIR_ASSET_ORDINALS;

type AppearanceModalProps = {
  open: boolean;
  onClose: () => void;
  modelId: number;
  headshapeOrdinal: number;
  hairOrdinal: number;
  eyesOrdinal: number;
  hairOffsets: Record<string, unknown>;
  tab: string;
  onTabChange: (tab: string) => void;
  onUpdateAppearance: (
    duplicantId: number,
    type: string,
    ordinal: number,
  ) => void;
};

export default function AppearanceModal({
  open,
  onClose,
  modelId,
  headshapeOrdinal,
  hairOrdinal,
  eyesOrdinal,
  hairOffsets,
  tab,
  onTabChange,
  onUpdateAppearance,
}: AppearanceModalProps) {
  const hasCurrentHairAsset = isAccessoryAssetAvailable("hair", hairOrdinal);
  const hasCurrentHeadAsset = isAccessoryAssetAvailable(
    "head",
    headshapeOrdinal,
  );
  const { rawOffsetX, rawOffsetY, rawScale } = getHairAdjustments(
    hairOrdinal,
    hairOffsets,
  );
  const modalPreviewHairOffsetX = rawOffsetX * APPEARANCE_MODAL_PREVIEW_SCALE;
  const modalPreviewHairOffsetY =
    rawOffsetY * APPEARANCE_MODAL_PREVIEW_SCALE +
    APPEARANCE_MODAL_PREVIEW_OFFSET_Y;
  const modalPreviewHairScale = APPEARANCE_MODAL_PREVIEW_SCALE * rawScale;
  const modalCardHairOffsetX = rawOffsetX * APPEARANCE_MODAL_CARD_SCALE;
  const modalCardHairOffsetY =
    rawOffsetY * APPEARANCE_MODAL_CARD_SCALE + APPEARANCE_MODAL_CARD_OFFSET_Y;
  const modalCardHairScale = APPEARANCE_MODAL_CARD_SCALE * rawScale;

  return (
    <M3Dialog
      open={open}
      onClose={onClose}
      labelledBy="appearance-modal-title"
      className="flex max-h-[85vh] w-full max-w-3xl flex-col p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 id="appearance-modal-title" className="text-xl font-semibold">
          Edit Appearance
        </h3>
        <M3OutlinedButton onClick={onClose} className="px-3 py-1 text-sm">
          Close
        </M3OutlinedButton>
      </div>

      <div className="mt-4 flex flex-col items-center gap-2">
        <div className="relative h-44 w-44 overflow-hidden rounded-lg border border-[var(--outline-faint)] bg-[var(--surface-container-low)]">
          <Image
            fill
            src={getAccessorySrc("head", headshapeOrdinal)}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-contain"
            style={{
              transform: `translateY(${APPEARANCE_MODAL_PREVIEW_OFFSET_Y}px) scale(${APPEARANCE_MODAL_PREVIEW_SCALE})`,
              transformOrigin: "center",
            }}
            draggable={false}
          />
          <Image
            fill
            src={getAccessorySrc("hair", hairOrdinal)}
            alt=""
            className="pointer-events-none absolute left-1/2 top-1/2 h-full w-full object-contain"
            style={{
              transform: `translate(calc(-50% + ${modalPreviewHairOffsetX}px), calc(-50% + ${modalPreviewHairOffsetY}px)) scale(${modalPreviewHairScale})`,
              transformOrigin: "center",
            }}
            draggable={false}
          />
        </div>
      </div>

      <div
        role="group"
        aria-label="Appearance category"
        className="mt-4 grid grid-cols-3 gap-2"
      >
        <button
          type="button"
          aria-pressed={tab === "head"}
          onClick={() => onTabChange("head")}
          className={`rounded-md px-3 py-2 text-sm font-semibold text-[var(--on-accent)] ${
            tab === "head"
              ? "bg-[var(--accent-hover)]"
              : "bg-[var(--accent)] hover:brightness-110"
          }`}
        >
          Head
        </button>
        <button
          type="button"
          aria-pressed={tab === "hair"}
          onClick={() => onTabChange("hair")}
          className={`rounded-md px-3 py-2 text-sm font-semibold text-[var(--on-accent)] ${
            tab === "hair"
              ? "bg-[var(--accent-hover)]"
              : "bg-[var(--accent)] hover:brightness-110"
          }`}
        >
          Hair
        </button>
        <button
          type="button"
          aria-pressed={tab === "eyes"}
          onClick={() => onTabChange("eyes")}
          className={`rounded-md px-3 py-2 text-sm font-semibold text-[var(--on-accent)] ${
            tab === "eyes"
              ? "bg-[var(--accent-hover)]"
              : "bg-[var(--accent)] hover:brightness-110"
          }`}
        >
          Eyes
        </button>
      </div>

      {tab === "head" ? (
        <div className="m3-scrollbar m3-vertical-scroll mt-4 min-h-0 flex-1 pr-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {HEAD_SHAPE_OPTIONS.map((headOrdinal) => {
              const isSelected = headOrdinal === headshapeOrdinal;
              return (
                <button
                  key={headOrdinal}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() =>
                    onUpdateAppearance(modelId, "headshape", headOrdinal)
                  }
                  className={`rounded-lg border p-2 text-left transition ${
                    isSelected
                      ? "border-transparent bg-[var(--accent-hover)] text-[var(--on-accent)]"
                      : "border-[var(--outline-faint)] bg-[var(--surface-container)] text-[var(--foreground)] hover:bg-[var(--state-hover)]"
                  }`}
                >
                  <div className="relative mx-auto h-28 w-28 overflow-hidden rounded-md border border-[var(--outline-faint)] bg-[var(--surface-container-low)]">
                    <Image
                      fill
                      src={getAccessorySrc("head", headOrdinal)}
                      alt=""
                      className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                      style={{
                        transform: `translateY(${APPEARANCE_MODAL_CARD_OFFSET_Y}px) scale(${APPEARANCE_MODAL_CARD_SCALE})`,
                        transformOrigin: "center",
                      }}
                      draggable={false}
                    />
                    <Image
                      fill
                      src={getAccessorySrc("hair", hairOrdinal)}
                      alt=""
                      className="pointer-events-none absolute left-1/2 top-1/2 h-full w-full object-contain"
                      style={{
                        transform: `translate(calc(-50% + ${modalCardHairOffsetX}px), calc(-50% + ${modalCardHairOffsetY}px)) scale(${modalCardHairScale})`,
                        transformOrigin: "center",
                      }}
                      draggable={false}
                    />
                  </div>
                  <p className="mt-2 text-center text-xs font-semibold">
                    Headshape {headOrdinal}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {tab === "hair" ? (
        <div className="m3-scrollbar m3-vertical-scroll mt-4 min-h-0 flex-1 pr-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {HAIR_STYLE_OPTIONS.map((hairOptionOrdinal) => {
              const isSelected = hairOptionOrdinal === hairOrdinal;
              const hairAdjustments = getHairAdjustments(
                hairOptionOrdinal,
                hairOffsets,
              );
              const optionHairOffsetX =
                hairAdjustments.rawOffsetX * APPEARANCE_MODAL_CARD_SCALE;
              const optionHairOffsetY =
                hairAdjustments.rawOffsetY * APPEARANCE_MODAL_CARD_SCALE +
                APPEARANCE_MODAL_CARD_OFFSET_Y;
              const optionHairScale =
                APPEARANCE_MODAL_CARD_SCALE * hairAdjustments.rawScale;

              return (
                <button
                  key={hairOptionOrdinal}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() =>
                    onUpdateAppearance(modelId, "hair", hairOptionOrdinal)
                  }
                  className={`rounded-lg border p-2 text-left transition ${
                    isSelected
                      ? "border-transparent bg-[var(--accent-hover)] text-[var(--on-accent)]"
                      : "border-[var(--outline-faint)] bg-[var(--surface-container)] text-[var(--foreground)] hover:bg-[var(--state-hover)]"
                  }`}
                >
                  <div className="relative mx-auto h-28 w-28 overflow-hidden rounded-md border border-[var(--outline-faint)] bg-[var(--surface-container-low)]">
                    <Image
                      fill
                      src={getAccessorySrc("head", headshapeOrdinal)}
                      alt=""
                      className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                      style={{
                        transform: `translateY(${APPEARANCE_MODAL_CARD_OFFSET_Y}px) scale(${APPEARANCE_MODAL_CARD_SCALE})`,
                        transformOrigin: "center",
                      }}
                      draggable={false}
                    />
                    <Image
                      fill
                      src={getAccessorySrc("hair", hairOptionOrdinal)}
                      alt=""
                      className="pointer-events-none absolute left-1/2 top-1/2 h-full w-full object-contain"
                      style={{
                        transform: `translate(calc(-50% + ${optionHairOffsetX}px), calc(-50% + ${optionHairOffsetY}px)) scale(${optionHairScale})`,
                        transformOrigin: "center",
                      }}
                      draggable={false}
                    />
                  </div>
                  <p className="mt-2 text-center text-xs font-semibold">
                    Hair {hairOptionOrdinal}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {tab === "eyes" ? (
        <div className="mt-4">
          <label className="flex max-w-xs flex-col gap-1 text-sm">
            <span className="opacity-75">Eyes ordinal</span>
            <NumberField
              value={eyesOrdinal}
              step="1"
              min="1"
              onCommit={(next) => onUpdateAppearance(modelId, "eyes", next)}
              className="m3-field px-3 py-1.5"
            />
          </label>
          <p className="mt-2 text-xs opacity-70">
            No eye sprites are bundled, so this sets the ordinal directly
            without a preview. Applies only if this duplicant already has an
            eyes accessory.
          </p>
        </div>
      ) : null}

      {!hasCurrentHeadAsset || !hasCurrentHairAsset ? (
        <p className="mt-1 text-xs opacity-60">
          Preview uses fallback assets when current ID has no local image.
        </p>
      ) : null}
    </M3Dialog>
  );
}
