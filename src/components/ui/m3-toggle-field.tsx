"use client";

type M3ToggleFieldProps = {
  label?: React.ReactNode;
  checked?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  className?: string;
  inputClassName?: string;
};

export default function M3ToggleField({
  label,
  checked,
  onChange,
  className = "",
  inputClassName = "",
}: M3ToggleFieldProps) {
  return (
    <label
      className={`m3-field flex w-full items-center justify-between gap-3 px-3 py-2 text-sm ${className}`.trim()}
    >
      <span className="min-w-0 truncate opacity-90">{label}</span>
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={onChange}
        className={`ml-auto h-4 w-4 shrink-0 accent-[var(--accent)] ${inputClassName}`.trim()}
      />
    </label>
  );
}
