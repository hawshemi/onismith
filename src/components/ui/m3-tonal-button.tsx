"use client";

import Link from "next/link";

// Filled/tonal action button. Size and spacing come from the caller's className
// so the component stays a thin wrapper over the shared .m3-button styling.
const BASE_CLASS = "m3-button m3-button-tonal";

type M3TonalButtonProps = {
  href?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>;

export default function M3TonalButton({
  href,
  type = "button",
  disabled,
  className = "",
  children,
  ...props
}: M3TonalButtonProps) {
  const mergedClassName = `${BASE_CLASS} ${className}`.trim();

  if (href) {
    return (
      <Link href={href} className={mergedClassName} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      className={mergedClassName}
      {...props}
    >
      {children}
    </button>
  );
}
