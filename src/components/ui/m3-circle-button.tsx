"use client";

import Link from "next/link";

const BASE_CLASS =
  "m3-circle-button inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full";

type M3CircleButtonProps = {
  href?: string;
  className?: string;
  type?: "button" | "submit" | "reset";
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>;

export default function M3CircleButton({
  href,
  className = "",
  type = "button",
  children,
  ...props
}: M3CircleButtonProps) {
  const mergedClassName = `${BASE_CLASS} ${className}`.trim();

  if (href) {
    return (
      <Link href={href} className={mergedClassName} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={mergedClassName} {...props}>
      {children}
    </button>
  );
}
