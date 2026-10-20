"use client";

import {
  Children,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { FaChevronDown } from "react-icons/fa6";

type M3SelectChangeEvent = {
  target: { value: string };
  currentTarget: { value: string };
};

type OptionElement = React.ReactElement<{
  value?: string | number;
  children?: React.ReactNode;
  disabled?: boolean;
}>;

type M3SelectOption = {
  value: string;
  label: React.ReactNode;
  text: string;
  disabled: boolean;
};

type MenuPosition = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
};

function getNodeText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(getNodeText).join(" ");
  }
  if (isValidElement<{ children?: React.ReactNode }>(node)) {
    return getNodeText(node.props.children);
  }
  return "";
}

type M3SelectProps = {
  className?: string;
  containerClassName?: string;
  scrollMode?: "auto" | "always" | "never";
  scrollThreshold?: number;
  children?: React.ReactNode;
  disabled?: boolean;
  id?: string;
  name?: string;
  value?: string | number | null;
  onChange?: (event: M3SelectChangeEvent) => void;
} & Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "value" | "onChange" | "children" | "disabled" | "id" | "name" | "type"
>;

const M3Select = forwardRef<HTMLButtonElement, M3SelectProps>(function M3Select(
  {
    className = "",
    containerClassName = "",
    scrollMode = "auto",
    scrollThreshold = 8,
    children,
    disabled,
    id,
    name,
    value,
    onChange,
    ...props
  },
  ref,
) {
  const [open, setOpen] = useState(false);
  const [menuAnimated, setMenuAnimated] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({
    left: 0,
    top: 0,
    width: 0,
    maxHeight: 256,
  });
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const typeaheadRef = useRef("");
  const typeaheadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const generatedId = useId();
  const listboxId = `${id ?? generatedId}-listbox`;
  const ariaLabelledby = props["aria-labelledby"];
  const ariaLabel = props["aria-label"];

  const options = useMemo<M3SelectOption[]>(
    () =>
      Children.toArray(children)
        .filter(
          (child): child is OptionElement =>
            isValidElement(child) && child.type === "option",
        )
        .map((child) => {
          const optionValue =
            child.props?.value !== undefined ? String(child.props.value) : "";
          return {
            value: optionValue,
            label: child.props?.children,
            text: getNodeText(child.props?.children).trim(),
            disabled: Boolean(child.props?.disabled),
          };
        }),
    [children],
  );

  const selectedIndex = useMemo(() => {
    const normalizedValue =
      value === undefined || value === null ? "" : String(value);
    return options.findIndex((option) => option.value === normalizedValue);
  }, [options, value]);

  const selectedOption =
    selectedIndex >= 0 ? options[selectedIndex] : options[0];
  const shouldScroll = useMemo(() => {
    if (scrollMode === "always") {
      return true;
    }
    if (scrollMode === "never") {
      return false;
    }
    return options.length > scrollThreshold;
  }, [options.length, scrollMode, scrollThreshold]);

  const emitChange = (nextValue: string) => {
    if (typeof onChange !== "function") {
      return;
    }
    onChange({
      target: { value: nextValue },
      currentTarget: { value: nextValue },
    });
  };

  const closeMenu = useCallback(() => {
    setOpen(false);
    setHighlightedIndex(-1);
    typeaheadRef.current = "";
  }, []);

  const openMenu = () => {
    if (disabled || options.length === 0) {
      return;
    }
    setOpen(true);
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
  };

  const moveHighlight = (direction: number) => {
    if (options.length === 0) {
      return;
    }
    let nextIndex = highlightedIndex;
    if (nextIndex < 0) {
      nextIndex = selectedIndex >= 0 ? selectedIndex : 0;
    }
    for (let attempts = 0; attempts < options.length; attempts += 1) {
      nextIndex = (nextIndex + direction + options.length) % options.length;
      if (!options[nextIndex].disabled) {
        setHighlightedIndex(nextIndex);
        return;
      }
    }
  };

  const updateMenuPosition = useCallback(() => {
    const trigger =
      rootRef.current?.querySelector<HTMLButtonElement>(".m3-select-trigger");
    if (!trigger) {
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 8;
    const gap = 4;
    const availableBelow = window.innerHeight - rect.bottom - viewportPadding;
    const availableAbove = rect.top - viewportPadding;
    const estimatedHeight = Math.min(256, Math.max(40, options.length * 37));
    const placeAbove =
      availableBelow < Math.min(estimatedHeight, 160) &&
      availableAbove > availableBelow;
    const available = placeAbove ? availableAbove : availableBelow;
    const maxHeight = Math.max(48, Math.min(256, available - gap));
    const renderedHeight = Math.min(estimatedHeight, maxHeight);
    const width = Math.max(
      0,
      Math.min(rect.width, window.innerWidth - viewportPadding * 2),
    );
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      Math.max(viewportPadding, window.innerWidth - width - viewportPadding),
    );
    const top = placeAbove
      ? Math.max(viewportPadding, rect.top - renderedHeight - gap)
      : rect.bottom + gap;
    setMenuPosition({ left, top, width, maxHeight });
  }, [options.length]);

  useEffect(() => {
    if (!open) {
      setMenuAnimated(false);
      return undefined;
    }
    const raf = requestAnimationFrame(() => setMenuAnimated(true));
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (
        !rootRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        closeMenu();
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [closeMenu, open]);

  useLayoutEffect(() => {
    if (!open) {
      return undefined;
    }
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open || highlightedIndex < 0) {
      return;
    }
    menuRef.current
      ?.querySelector<HTMLElement>(`[data-option-index="${highlightedIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex, open]);

  useEffect(
    () => () => {
      if (typeaheadTimeoutRef.current) {
        clearTimeout(typeaheadTimeoutRef.current);
      }
    },
    [],
  );

  const onTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) {
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      moveHighlight(1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      moveHighlight(-1);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      const option = options[highlightedIndex];
      if (option && !option.disabled) {
        emitChange(option.value);
      }
      closeMenu();
      return;
    }
    if (event.key === "Home" && open) {
      event.preventDefault();
      const firstEnabled = options.findIndex((option) => !option.disabled);
      if (firstEnabled >= 0) {
        setHighlightedIndex(firstEnabled);
      }
      return;
    }
    if (event.key === "End" && open) {
      event.preventDefault();
      for (let index = options.length - 1; index >= 0; index -= 1) {
        if (!options[index].disabled) {
          setHighlightedIndex(index);
          break;
        }
      }
      return;
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      closeMenu();
      return;
    }
    if (
      event.key.length === 1 &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      if (!open) {
        openMenu();
      }
      if (typeaheadTimeoutRef.current) {
        clearTimeout(typeaheadTimeoutRef.current);
      }
      const nextBuffer =
        `${typeaheadRef.current}${event.key}`.toLocaleLowerCase();
      typeaheadRef.current = nextBuffer;
      typeaheadTimeoutRef.current = setTimeout(() => {
        typeaheadRef.current = "";
        typeaheadTimeoutRef.current = null;
      }, 600);
      const start = highlightedIndex >= 0 ? highlightedIndex + 1 : 0;
      const findMatch = (needle: string) => {
        for (let offset = 0; offset < options.length; offset += 1) {
          const index = (start + offset) % options.length;
          const option = options[index];
          if (
            !option.disabled &&
            option.text.toLocaleLowerCase().startsWith(needle)
          ) {
            return index;
          }
        }
        return -1;
      };
      let match = findMatch(nextBuffer);
      if (match < 0 && nextBuffer.length > 1) {
        typeaheadRef.current = event.key.toLocaleLowerCase();
        match = findMatch(typeaheadRef.current);
      }
      if (match >= 0) {
        setHighlightedIndex(match);
      }
    }
  };

  // Close when focus leaves the control entirely (e.g. Tab away). Focus moving
  // to an option (mouse) stays within the root, so it doesn't close early.
  const onTriggerBlur = (event: React.FocusEvent<HTMLButtonElement>) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (
      !rootRef.current?.contains(nextTarget) &&
      !menuRef.current?.contains(nextTarget)
    ) {
      closeMenu();
    }
  };

  const menuNeedsScroll =
    shouldScroll || options.length * 37 > menuPosition.maxHeight;

  const menu = open ? (
    <div
      ref={menuRef}
      id={listboxId}
      role="listbox"
      aria-labelledby={ariaLabelledby}
      aria-label={ariaLabel}
      className={`m3-select-menu fixed z-[70] overflow-x-hidden rounded-xl border border-[var(--outline-strong)] bg-[var(--surface-container-highest)] p-0 opacity-100 shadow-lg ${
        menuNeedsScroll
          ? "m3-scrollbar m3-vertical-scroll"
          : "overflow-y-hidden"
      }`}
      style={{
        left: menuPosition.left,
        top: menuPosition.top,
        width: menuPosition.width,
        maxHeight: menuPosition.maxHeight,
      }}
    >
      {options.map((option, index) => {
        const isSelected = index === selectedIndex;
        const isHighlighted = index === highlightedIndex;
        return (
          <button
            key={`${option.value}-${index}`}
            id={`${listboxId}-opt-${index}`}
            data-option-index={index}
            type="button"
            role="option"
            tabIndex={-1}
            aria-selected={isSelected}
            disabled={option.disabled}
            onPointerDown={(event) => event.preventDefault()}
            onMouseEnter={() => setHighlightedIndex(index)}
            onClick={() => {
              if (option.disabled) {
                return;
              }
              emitChange(option.value);
              closeMenu();
            }}
            className={`m3-select-option flex w-full items-center rounded-none border-b border-[var(--outline-faint)] px-3 py-2 text-left text-sm font-normal transition last:border-b-0 ${
              option.disabled
                ? "cursor-not-allowed opacity-50"
                : isHighlighted || isSelected
                  ? "bg-[var(--accent)] text-[var(--on-accent)]"
                  : "bg-[var(--surface-container-highest)] text-[var(--foreground)] opacity-100 hover:bg-[var(--accent)] hover:text-[var(--on-accent)]"
            }`}
            style={{
              borderRadius: 0,
              animationName: menuAnimated ? "m3-select-cascade" : "none",
              animationDuration: "140ms",
              animationTimingFunction: "cubic-bezier(0.2, 0.7, 0.2, 1)",
              animationFillMode: "both",
              animationDelay: `${index * 5}ms`,
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <div
      ref={rootRef}
      className={`m3-select-wrap relative ${containerClassName}`}
    >
      <button
        ref={ref}
        type="button"
        id={id}
        name={name}
        role="combobox"
        aria-haspopup="listbox"
        aria-autocomplete="none"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={
          open && highlightedIndex >= 0
            ? `${listboxId}-opt-${highlightedIndex}`
            : undefined
        }
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={onTriggerKeyDown}
        onBlur={onTriggerBlur}
        disabled={disabled}
        {...props}
        className={`m3-select-trigger m3-field w-full pr-9 text-left focus-visible:outline-none ${className}`}
      >
        <span className="block truncate">
          {selectedOption?.label ?? <span className="opacity-60">Select</span>}
        </span>
      </button>
      {typeof document !== "undefined" && menu
        ? createPortal(menu, document.body)
        : null}
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
        <FaChevronDown
          aria-hidden="true"
          className={`h-3.5 w-3.5 text-[var(--accent)] transition-transform ${
            open ? "rotate-180" : ""
          } ${disabled ? "opacity-40" : "opacity-85"}`}
        />
      </span>
    </div>
  );
});

export default M3Select;
