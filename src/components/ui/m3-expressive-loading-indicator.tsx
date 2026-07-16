"use client";

import styles from "@/components/ui/m3-expressive-loading-indicator.module.css";

type LoadingStyle = React.CSSProperties & Record<`--${string}`, string>;

type M3ExpressiveLoadingIndicatorProps = {
  size?: number | string;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
} & React.HTMLAttributes<HTMLSpanElement>;

export default function M3ExpressiveLoadingIndicator({
  size = 56,
  color = "var(--accent)",
  className = "",
  style,
  ...props
}: M3ExpressiveLoadingIndicatorProps) {
  const parsedSize = Number(size);
  const clampedSize = Number.isFinite(parsedSize)
    ? Math.max(24, parsedSize)
    : 56;

  const mergedStyle: LoadingStyle = {
    ...style,
    "--m3e-loading-size": `${clampedSize}px`,
    "--m3e-loading-color": color,
  };

  return (
    <span
      className={`${styles.root} ${className}`.trim()}
      style={mergedStyle}
      {...props}
    >
      <span className={styles.spinner} />
    </span>
  );
}
