"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";

export default function WorkspaceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Card>
      <EmptyState
        icon={<TriangleAlert className="size-5" />}
        title="Something went wrong"
        description={`This page could not be loaded. Try again, or contact support${error.digest ? ` with reference ${error.digest}` : ""}.`}
        action={<Button onClick={reset} icon={<RotateCcw className="size-4" />}>Try again</Button>}
      />
    </Card>
  );
}
