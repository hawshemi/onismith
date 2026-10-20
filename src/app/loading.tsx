import M3ExpressiveLoadingIndicator from "@/components/ui/m3-expressive-loading-indicator";

export default function Loading() {
  return (
    <div role="status" className="flex items-center gap-3 p-4 text-sm">
      <M3ExpressiveLoadingIndicator size={32} aria-hidden="true" />
      Loading section. Please wait.
    </div>
  );
}
