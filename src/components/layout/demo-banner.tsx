import { FlaskConical } from "lucide-react";

/**
 * Shown on every screen while the app runs on fictional demo data. Removed
 * automatically once DATA_SOURCE is no longer "demo" (Phase 2).
 */
export function DemoBanner({ today }: { today: string }) {
  return (
    <div className="no-print mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control border border-yellow/25 bg-yellow-light px-3.5 py-2.5 text-caption text-[#7d5210]">
      <FlaskConical className="size-4 shrink-0" aria-hidden />
      <p>
        <span className="font-semibold">Demo mode</span> — fictional sample data, nothing is saved. Deadline rules are evaluated as of{" "}
        <span className="font-semibold">{new Date(`${today}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })}</span>.
      </p>
    </div>
  );
}
