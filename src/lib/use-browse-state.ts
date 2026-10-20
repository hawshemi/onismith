"use client";

import { useEffect, useState } from "react";
import { useSaveSession } from "@/lib/save-session/save-session-context";
import { useSyncOnChange } from "@/lib/use-sync-on-change";

type BrowseState = {
  query: string;
  sort: string;
  filter: string;
  page: number;
};
const browseStates = new Map<string, BrowseState>();
const scrollPositions = new Map<string, number>();

export function useBrowseState(section: string, defaultSort: string) {
  const { fileName, parseTimeMs } = useSaveSession();
  const key = `${fileName ?? ""}:${parseTimeMs ?? ""}:${section}`;
  const [state, setState] = useState<BrowseState>(
    () =>
      browseStates.get(key) ?? {
        query: "",
        sort: defaultSort,
        filter: "",
        page: 1,
      },
  );

  useSyncOnChange([key], () => {
    setState(
      browseStates.get(key) ?? {
        query: "",
        sort: defaultSort,
        filter: "",
        page: 1,
      },
    );
  });

  useEffect(() => {
    browseStates.set(key, state);
  }, [key, state]);

  useEffect(() => {
    const main = document.getElementById("main-content");
    if (!main) return;
    const rememberScroll = () => scrollPositions.set(key, main.scrollTop);
    const frame = requestAnimationFrame(() => {
      main.scrollTop = scrollPositions.get(key) ?? 0;
      main.addEventListener("scroll", rememberScroll, { passive: true });
    });
    return () => {
      cancelAnimationFrame(frame);
      main.removeEventListener("scroll", rememberScroll);
    };
  }, [key]);

  return {
    ...state,
    setQuery: (query: string) =>
      setState((current) => ({ ...current, query, page: 1 })),
    setSort: (sort: string) =>
      setState((current) => ({ ...current, sort, page: 1 })),
    setFilter: (filter: string) =>
      setState((current) => ({ ...current, filter, page: 1 })),
    setPage: (page: number) => setState((current) => ({ ...current, page })),
  };
}
