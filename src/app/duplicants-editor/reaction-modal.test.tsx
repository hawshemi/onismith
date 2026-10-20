import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import ReactionModal from "./reaction-modal";

vi.mock("@/components/ui/m3-dialog", () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));

it.each(["DeeperDiversLungs", "DEEPERDIVERSLUNGS"])(
  "recognizes owned trait %s without offering reactions as traits",
  (traitId) => {
    const html = renderToStaticMarkup(
      createElement(ReactionModal, {
        kind: "add-traits",
        onClose: vi.fn(),
        traits: [traitId],
        addTraitCategory: "positive",
        onCategoryChange: vi.fn(),
        onAddTrait: vi.fn(),
        onSetCategoryTraits: vi.fn(),
        onApplyReaction: vi.fn(),
        isBionic: false,
      }),
    );
    const ownedButton = html
      .match(/<button\b[^>]*>[\s\S]*?<\/button>/g)
      ?.find((button) => button.includes("Deep Diver&#x27;s Lungs"));

    expect(ownedButton).toContain('disabled=""');
    expect(ownedButton).toContain("Owned");
    expect(html).toContain("1/47");
    expect(html).not.toContain("Super Productive");
    expect(html).not.toContain("Balloon Artist");
  },
);
