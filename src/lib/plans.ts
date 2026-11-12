/**
 * Public plans and prices (BDT per month), as confirmed by the founder on 2026-11-10.
 * The database table `public.plans` is what actually enforces limits and sets the
 * amount to pay; a test checks that the two always match.
 */
export type PlanKey = "free" | "starter" | "business";

export interface Plan {
  key: PlanKey;
  name: string;
  priceBdt: number;
  who: string;
  seats: number;
  activePos: number;
  aiRequests: number;
}

export const PLANS: Record<PlanKey, Plan> = {
  free: { key: "free", name: "Free", priceBdt: 0, who: "Try the workflow with a few orders", seats: 2, activePos: 10, aiRequests: 20 },
  starter: { key: "starter", name: "Starter", priceBdt: 2999, who: "For small merchandising teams", seats: 5, activePos: 60, aiRequests: 300 },
  business: { key: "business", name: "Business", priceBdt: 6999, who: "For growing buying houses", seats: 15, activePos: 300, aiRequests: 1500 },
};

export const PLAN_ORDER: PlanKey[] = ["free", "starter", "business"];

/** Display names for every plan a subscription can hold, including ones set only by platform staff. */
export const PLAN_NAME: Record<string, string> = { free: "Free", starter: "Starter", business: "Business", pilot: "Pilot", enterprise: "Enterprise" };

export function formatBdt(amount: number): string {
  return `৳${amount.toLocaleString("en-US")}`;
}

/** bKash number that receives manual plan payments. Empty until configured. */
export const BKASH_NUMBER = process.env.NEXT_PUBLIC_BKASH_NUMBER || "";
