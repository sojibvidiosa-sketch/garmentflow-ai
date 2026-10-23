import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4">
      <div className="w-full max-w-md rounded-card border border-border bg-surface">
        <EmptyState
          icon={<SearchX className="size-5" />}
          title="Page not found"
          description="This page does not exist, or you do not have access to it."
          action={<ButtonLink href="/dashboard">Go to dashboard</ButtonLink>}
        />
      </div>
    </main>
  );
}
