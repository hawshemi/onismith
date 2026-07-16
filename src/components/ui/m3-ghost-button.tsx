"use client";

export default function M3GhostButton({
  type = "button",
  className = "",
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`m3-button m3-button-ghost ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
