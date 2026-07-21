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
} & React.ButtonHTMLAttributes<HTMLElement>;

export default function M3Chip({
  as: Component = "span",
  label,
  title,
  className = "",
  ...props
}: M3ChipProps) {
  return (
    <Component
      title={normalizeTitle(title)}
      className={`m3-chip inline-flex cursor-default items-center gap-1.5 !rounded-md px-2.5 py-1 text-xs transition-colors hover:bg-[var(--state-hover)] ${className}`.trim()}
      {...props}
    >
      {label}
    </Component>
  );
}
