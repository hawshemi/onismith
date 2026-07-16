import Link from "next/link";

type SaveRequiredPageProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
};

// Rendered by feature pages when no save is loaded. Callers own the `hasSave`
// gate, so this component always shows the "load a save first" prompt.
export default function SaveRequiredPage({
  title,
  description,
}: SaveRequiredPageProps) {
  return (
    <section className="m3-card mx-auto max-w-xl p-6 text-center sm:p-8">
      <h2 className="text-2xl font-semibold">{title}</h2>
      {description ? (
        <p className="mt-2 text-sm opacity-80">{description}</p>
      ) : null}
      <p className="mt-4 text-sm opacity-70">
        Load a save first using <strong>Load</strong> in the top bar. You can
        return to{" "}
        <Link href="/" className="underline decoration-[var(--outline)]">
          Overview
        </Link>{" "}
        after loading.
      </p>
    </section>
  );
}
