import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import type { SaveGame } from "@/lib/save-parser/model";
import BuildingsPage from "./page";

const session = vi.hoisted(() => ({ saveGame: null as SaveGame | null }));
vi.mock("@/lib/save-session/save-session-context", () => ({
  useSaveSession: () => ({ ...session, hasSave: true }),
}));

it.each([1001, 100001])(
  "bounds the mounted rows for %i buildings and keeps the full count",
  (count) => {
    session.saveGame = {
      gameObjects: [
        {
          name: "AirFilter",
          gameObjects: Array.from({ length: count }, (_, id) => ({
            behaviors: [
              { name: "KPrefabID", templateData: { InstanceID: id } },
              { name: "BuildingComplete", templateData: {} },
            ],
          })),
        },
      ],
    } as unknown as SaveGame;
    const html = renderToStaticMarkup(createElement(BuildingsPage));
    expect(html.match(/<article/g)).toHaveLength(100);
    expect(html).toContain(count.toLocaleString());
  },
);
