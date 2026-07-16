function joinClassNames(
  ...classNames: Array<string | false | null | undefined>
): string {
  return classNames.filter(Boolean).join(" ");
}

function normalizeTitle(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

type M3ChipProps = {
  as?: React.ElementType;
  label?: React.ReactNode;
  title?: string;
  className?: string;
  // Chips render as <button> (see actions panel), so allow button attributes
  // like `type` in addition to the generic HTML attributes.
} & React.ButtonHTMLAttributes<HTMLElement>;

export function M3Chip({
  as: Component = "span",
  label,
  title,
  className = "",
  ...props
}: M3ChipProps) {
  return (
    <Component
      title={normalizeTitle(title)}
      className={joinClassNames(
        "m3-chip inline-flex cursor-default items-center gap-1.5 !rounded-md px-2.5 py-1 text-xs transition-colors hover:bg-[var(--state-hover)]",
        className,
      )}
      {...props}
    >
      {label}
    </Component>
  );
}

type M3ChipsProps<T> = {
  items?: T[];
  getItemKey?: (item: T, index: number) => React.Key;
  getItemLabel?: (item: T, index: number) => React.ReactNode;
  getItemTitle?: (item: T, index: number) => string | undefined;
  className?: string;
  chipClassName?: string;
  emptyLabel?: React.ReactNode;
  emptyClassName?: string;
};

export default function M3Chips<T>({
  items = [],
  getItemKey,
  getItemLabel,
  getItemTitle,
  className = "",
  chipClassName = "",
  emptyLabel = null,
  emptyClassName = "",
}: M3ChipsProps<T>) {
  const list = Array.isArray(items) ? items : [];

  if (list.length === 0) {
    if (emptyLabel === null || emptyLabel === undefined) {
      return null;
    }
    return <span className={emptyClassName}>{emptyLabel}</span>;
  }

  return (
    <span className={className}>
      {list.map((item, index) => (
        <M3Chip
          key={
            typeof getItemKey === "function" ? getItemKey(item, index) : index
          }
          label={
            typeof getItemLabel === "function"
              ? getItemLabel(item, index)
              : String(item)
          }
          title={
            typeof getItemTitle === "function"
              ? getItemTitle(item, index)
              : undefined
          }
          className={chipClassName}
        />
      ))}
    </span>
  );
}
