import type { Metadata } from "next";
import { ArrowRight, BellRing, Check, ClipboardList, FileSearch, Mail } from "lucide-react";
import { CONTACT_EMAIL } from "@/components/layout/site-header";
import { ContactForm } from "@/components/marketing/contact-form";
import { ProductPreview, ReviewPreview } from "@/components/marketing/product-preview";
import { ButtonLink } from "@/components/ui/button";
import { PLAN_ORDER, PLANS, formatBdt } from "@/lib/plans";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "GarmentFlow AI — Merchandising workspace for garment buying houses",
};

const steps = [
  { title: "Import", body: "Upload a buyer PO or tech pack, or paste the buyer email." },
  { title: "Review", body: "Check the fields AI extracted against the source and correct them." },
  { title: "Create the order", body: "Approve to save a structured purchase order with styles and quantities." },
  { title: "Track T&A", body: "Milestones from fit sample to shipment, each with an owner and a date." },
  { title: "Follow up", body: "See what is overdue, draft the follow-up email and share the report." },
];

const features = [
  {
    icon: FileSearch,
    ai: true,
    title: "AI document reading",
    body: "Extracts buyer, PO number, styles, fabric, GSM, quantities and dates from PDFs and emails. Missing values are shown as missing, never invented.",
  },
  {
    icon: ClipboardList,
    title: "Purchase order workspace",
    body: "One record per order: items, colour and size breakdown, documents, the responsible merchandiser and a history of changes.",
  },
  {
    icon: BellRing,
    title: "T&A tracking and delay alerts",
    body: "Alerts come from simple date rules, so they are predictable and explainable. An overdue task is flagged for you to judge, not assumed to delay shipment.",
  },
  {
    icon: Mail,
    ai: true,
    title: "Email drafts and reports",
    body: "Buyer and supplier follow-ups drafted from approved order data, plus order summaries for managers. You edit and send; nothing is sent automatically.",
  },
];

const kicker = "text-caption font-medium tracking-wide text-brand-strong uppercase";
const h2 = "mt-3 text-[28px] leading-tight font-semibold tracking-tight text-ink sm:text-[34px]";

export default function LandingPage() {
  return (
    <main id="main">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-bg">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_100%_at_50%_0%,#dbeafe_0%,transparent_70%)]" aria-hidden />
        <div className="relative mx-auto max-w-[1200px] px-4 pt-16 sm:px-6 sm:pt-24">
          <div className="mx-auto max-w-[760px] text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-caption font-medium text-secondary">
              <span className="size-1.5 rounded-full bg-ai" aria-hidden />
              For garment buying houses and merchandising teams
            </p>
            <h1 className="mt-6 text-[36px] leading-[1.08] font-semibold tracking-tight text-ink sm:text-[52px]">
              From buyer email to shipment, in one clear workspace.
            </h1>
            <p className="mx-auto mt-5 max-w-[600px] text-[16px] leading-relaxed text-secondary sm:text-[18px]">
              GarmentFlow AI reads purchase orders and tech packs, organises them into orders your team verifies, and tracks every T&amp;A deadline until the goods ship.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/#contact" className="h-11 px-5 text-[14px]">
                Book a demo <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
              {isSupabaseConfigured ? (
                <ButtonLink href="/signup" variant="secondary" className="h-11 px-5 text-[14px]">Create a workspace</ButtonLink>
              ) : (
                <ButtonLink href="/app/dashboard" variant="secondary" className="h-11 px-5 text-[14px]">Open sample workspace</ButtonLink>
              )}
            </div>
          </div>
          <div className="mx-auto mt-14 max-w-[1040px] translate-y-px">
            <ProductPreview />
          </div>
        </div>
      </section>

      {/* Product overview */}
      <section id="product" className="scroll-mt-20">
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
          <div className="min-w-0">
            <p className={kicker}>Product overview</p>
            <h2 className={h2}>AI does the reading. Your merchandiser makes the decision.</h2>
            <p className="mt-4 max-w-[520px] text-[15px] leading-relaxed text-secondary">
              Buyer requirements arrive as long emails, PDFs and tech packs. GarmentFlow turns them into structured fields and shows each one for review. Nothing becomes an order until a person approves it.
            </p>
            <ul className="mt-7 space-y-3 text-[14px] text-ink">
              {[
                "Purple always marks an AI suggestion; blue marks your saved records.",
                "Uncertain and missing values are flagged instead of guessed.",
                "Works alongside the Excel sheets and email you already use.",
              ].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-green" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="min-w-0"><ReviewPreview /></div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 border-y border-border bg-bg">
        <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:py-24">
          <p className={kicker}>How it works</p>
          <h2 className={h2}>Five steps from document to follow-up</h2>
          <ol className="mt-12 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((s, i) => (
              <li key={s.title} className="relative border-t-2 border-border pt-5 first:border-brand">
                <span className="text-caption font-semibold text-brand-strong tabular-nums">Step {i + 1}</span>
                <h3 className="mt-2 text-[15px] font-semibold text-ink">{s.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-secondary">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20">
        <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:py-28">
          <p className={kicker}>Features</p>
          <h2 className={h2}>Four tools that cover a merchandiser&apos;s day</h2>
          <div className="mt-12 grid overflow-hidden rounded-[14px] border border-border sm:grid-cols-2">
            {features.map(({ icon: Icon, title, body, ai }, i) => (
              <div key={title} className={`p-7 sm:p-9 ${i > 0 ? "border-t border-border" : ""} ${i === 1 ? "sm:border-t-0" : ""} ${i % 2 === 1 ? "sm:border-l" : ""}`}>
                <span className={`grid size-10 place-items-center rounded-control ${ai ? "bg-ai-light text-ai-strong" : "bg-brand-light text-brand-strong"}`}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-5 text-[17px] font-semibold text-ink">{title}</h3>
                <p className="mt-2 max-w-[440px] text-[14px] leading-relaxed text-secondary">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 border-y border-border bg-bg">
        <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:py-24">
          <p className={kicker}>Pricing</p>
          <h2 className={h2}>Plans sized for your team</h2>
          <p className="mt-3 max-w-[560px] text-[15px] leading-relaxed text-secondary">
            One price per company, not per user. All plans include the same tools; they differ in how many people, orders and AI requests they cover.
          </p>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {PLAN_ORDER.map((k) => {
              const p = PLANS[k];
              const featured = k === "starter";
              return (
                <div key={k} className={`flex flex-col rounded-card border bg-surface p-6 ${featured ? "border-brand ring-1 ring-brand" : "border-border"}`}>
                  <h3 className="text-[16px] font-semibold text-ink">{p.name}</h3>
                  <p className="mt-1 text-[13px] text-secondary">{p.who}</p>
                  <p className="mt-5 flex items-baseline gap-1.5">
                    <span className="text-[32px] leading-none font-semibold tracking-tight text-ink tabular-nums">{p.priceBdt ? formatBdt(p.priceBdt) : "Free"}</span>
                    {p.priceBdt > 0 && <span className="text-[13px] text-secondary">per month</span>}
                  </p>
                  <ul className="mt-6 flex-1 space-y-2.5 border-t border-border pt-5">
                    {[
                      `Up to ${p.seats} team members`,
                      `Up to ${p.activePos} active purchase orders`,
                      `${p.aiRequests.toLocaleString("en-US")} AI requests per month`,
                      "T&A tracking, delay alerts and reports",
                    ].map((pt) => (
                      <li key={pt} className="flex gap-2.5 text-[13px] text-secondary">
                        <Check className="mt-0.5 size-4 shrink-0 text-green" aria-hidden />
                        {pt}
                      </li>
                    ))}
                  </ul>
                  <ButtonLink href={isSupabaseConfigured ? "/signup" : "/#contact"} variant={featured ? "primary" : "secondary"} className="mt-7 w-full">
                    {p.priceBdt ? "Start free, upgrade later" : "Create a free workspace"}
                  </ButtonLink>
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-[13px] text-secondary">
            Every workspace starts on Free. Paid plans are billed monthly per company and paid by bKash from inside the app; a person verifies each payment before the plan changes. An AI request is one document import, email draft or report summary.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section id="contact" className="scroll-mt-20">
        <div className="mx-auto grid max-w-[1200px] items-start gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:py-28">
          <div className="lg:pt-6">
            <p className={kicker}>Book a demo</p>
            <h2 className={h2}>See it with documents like yours.</h2>
            <p className="mt-4 max-w-[480px] text-[15px] leading-relaxed text-secondary">
              Tell us about your team and we will walk you through the workflow, in English or Bangla, and set up a pilot workspace.
            </p>
            <p className="mt-6 text-[13px] text-secondary">
              Prefer email? <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-brand-strong hover:underline">{CONTACT_EMAIL}</a>
            </p>
          </div>
          <div className="rounded-[14px] border border-border bg-surface p-6 shadow-card sm:p-8">
            <ContactForm contactEmail={CONTACT_EMAIL} />
          </div>
        </div>
      </section>
    </main>
  );
}
