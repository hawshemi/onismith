"use client";

import Link from "next/link";

export type M3ButtonProps = {
  variant: "hollow" | "outlined" | "tonal";
  href?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>;

export default function M3Button({
  variant,
  href,
  type = "button",
  disabled,
  className = "",
  children,
  ...props
}: M3ButtonProps) {
  const mergedClassName = `m3-button m3-button-${variant} ${className}`.trim();

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
