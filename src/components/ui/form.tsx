import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Figma "GF / Text input": 40px, 9px radius, 1px border, 12–13px text. */
const control =
  "w-full rounded-control border border-border bg-surface px-3 text-[13px] text-ink placeholder:text-muted " +
  "transition-colors hover:border-[#cfd5d8] focus:border-violet focus:ring-2 focus:ring-violet/15 focus:outline-none " +
  "disabled:cursor-not-allowed disabled:bg-subtle disabled:text-secondary aria-invalid:border-red aria-invalid:ring-red/15";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-24 py-2.5 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        control,
        "h-10 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 fill=%22none%22 stroke=%22%23555f69%22 stroke-width=%221.6%22><path d=%22M3 4.5l3 3 3-3%22/></svg>')] bg-[right_12px_center] bg-no-repeat pr-9",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  aside,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  /** Shown at the right of the label row, e.g. a confidence badge. */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex min-h-6 items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="text-caption font-medium text-secondary">
          {label}
          {required && <span className="text-red"> *</span>}
        </label>
        {aside}
      </div>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-caption text-red" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-caption text-secondary">{hint}</p>
      )}
    </div>
  );
}
