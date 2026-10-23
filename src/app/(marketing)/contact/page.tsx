import type { Metadata } from "next";
import { CONTACT_EMAIL } from "@/components/layout/site-header";
import { ContactForm } from "@/components/marketing/contact-form";

export const metadata: Metadata = { title: "Book a demo" };

export default function ContactPage() {
  return (
    <main className="mx-auto grid max-w-[1320px] items-start gap-10 px-4 py-12 sm:px-8 lg:grid-cols-[1fr_1.1fr] lg:py-20">
      <section className="lg:pt-16">
        <h1 className="text-[34px] leading-tight font-semibold tracking-tight sm:text-[44px]">See your orders in a clearer workspace.</h1>
        <p className="mt-5 max-w-[520px] text-[16px] leading-relaxed text-secondary">
          Share your sourcing workflow. We will show GarmentFlow with documents like yours and set up a pilot workspace for your team.
        </p>
        <ul className="mt-8 space-y-3 text-[14px] text-secondary">
          <li>30-minute online demo, in English or Bangla</li>
          <li>Pilot setup help and training for your merchandisers</li>
          <li>Your data stays in your own private workspace</li>
        </ul>
        <p className="mt-8 text-[13px] text-secondary">
          Prefer email? <span className="select-all font-semibold text-ink">{CONTACT_EMAIL}</span>
        </p>
      </section>
      <section className="rounded-card border border-border bg-surface p-6 sm:p-8">
        <ContactForm contactEmail={CONTACT_EMAIL} />
      </section>
    </main>
  );
}
