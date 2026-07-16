"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FaChevronDown } from "react-icons/fa6";

function joinClassNames(
  ...classNames: Array<string | false | null | undefined>
): string {
  return classNames.filter(Boolean).join(" ");
}

type M3CollapsibleSectionProps = {
  title?: React.ReactNode;
  defaultCollapsed?: boolean;
  expandSignal?: unknown;
  containerClassName?: string;
  headerClassName?: string;
  titleClassName?: string;
  contentWrapperClassName?: string;
  contentClassName?: string;
  expandedMarginClassName?: string;
  children?: React.ReactNode;
};

export default function M3CollapsibleSection({
  title,
  defaultCollapsed = false,
  expandSignal,
  containerClassName = "",
  headerClassName = "",
  titleClassName = "text-xs font-semibold tracking-wide opacity-75",
  contentWrapperClassName = "",
  contentClassName = "",
  expandedMarginClassName = "mt-2",
  children,
}: M3CollapsibleSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(Boolean(defaultCollapsed));
  const lastExpandSignalRef = useRef(expandSignal);
  const contentId = useId();

  useEffect(() => {
    if (expandSignal === undefined) {
      return;
    }
    if (lastExpandSignalRef.current === expandSignal) {
      return;
    }
    lastExpandSignalRef.current = expandSignal;
    setIsCollapsed(false);
  }, [expandSignal]);

  return (
    <section className={containerClassName}>
      <h3 className={titleClassName}>
        <button
          type="button"
          aria-expanded={!isCollapsed}
          aria-controls={contentId}
          className={joinClassNames(
            "m3-button m3-button-ghost flex w-full cursor-pointer items-center gap-2 text-left",
            headerClassName,
          )}
          onClick={() => setIsCollapsed((current) => !current)}
        >
          <span>{title}</span>
          <FaChevronDown
            aria-hidden="true"
            className={`ml-auto h-3 w-3 opacity-75 transition-transform duration-200 ease-out ${
              isCollapsed ? "rotate-0" : "rotate-180"
            }`}
          />
        </button>
      </h3>

      <div
        id={contentId}
        inert={isCollapsed}
        className={joinClassNames(
          "grid overflow-hidden transition-[grid-template-rows,opacity,margin] duration-200 ease-out",
          isCollapsed
            ? "mt-0 grid-rows-[0fr] opacity-0"
            : `${expandedMarginClassName} grid-rows-[1fr] opacity-100`,
          contentWrapperClassName,
        )}
      >
        <div className={joinClassNames("min-h-0", contentClassName)}>
          {children}
        </div>
      </div>
    </section>
  );
}
