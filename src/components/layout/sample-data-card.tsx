"use client";

import { useActionState } from "react";
import { Database } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, Notice } from "@/components/ui/states";
import { loadSampleData } from "@/lib/actions/sample";
import type { SampleState } from "@/lib/actions/types";

/** Shown on an empty live workspace. */
export function SampleDataCard() {
  const [state, action, pending] = useActionState<SampleState>(loadSampleData, {});
  return (
    <Card className="mb-6">
      <EmptyState
        icon={<Database className="size-5" />}
        title="Your workspace is ready"
        description="Add your first purchase order, or load clearly labelled sample orders to explore every screen. Sample data can be deleted later."
        action={
          <form action={action} className="flex flex-wrap justify-center gap-2">
            <ButtonLink href="/orders/new" variant="secondary">Upload a buyer document</ButtonLink>
            <Button type="submit" loading={pending}>Load sample data</Button>
          </form>
        }
      />
      {state.error && <Notice tone="error" className="mx-6 mb-6">{state.error}</Notice>}
    </Card>
  );
}
