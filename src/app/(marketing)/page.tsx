import { ArrowRight, BellRing, Check, ClipboardList, FileSearch, ListChecks, Mail, PieChart } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { CONTACT_EMAIL } from "@/components/layout/site-header";

const steps = ["Import buyer brief", "Review extracted fields", "Create purchase order", "Track T&A", "Report & follow up"];

const features = [
  { icon: FileSearch, title: "Document reading", body: "Extract PO and tech pack details into structured fields — with the source line shown next to every value." },
  { icon: ClipboardList, title: "Purchase orders", body: "One source of order information: styles, colour and size breakdowns, documents and history." },
  { icon: ListChecks, title: "T&A planning", body: "Owner, deadline, status. From fit sample and lab dip to final inspection and shipment." },
  { icon: BellRing, title: "Deadline alerts", body: "Identify tasks needing attention before they become delays. Rule-based, predictable, explainable." },
  { icon: Mail, title: "AI email drafting", body: "Editable, professional buyer and supplier follow-ups written from approved order data." },
  { icon: PieChart, title: "Manager reports", body: "Order-level and team-level summaries with CSV and PDF export, calculated from your verified data." },
];

const plans = [
  { name: "Starter", price: "৳2,499", note: "3 users · 30 active POs" },
  { name: "Business", price: "৳5,999", note: "10 users · 150 active POs", featured: true },
  { name: "Enterprise", price: "Custom", note: "Custom security and integrations" },
];
const planFeatures = ["Purchase orders", "T&A tracking", "Human-verified AI extraction", "Email drafting & reports", "Setup assistance"];

const previewRows = [
  ["PO-2026-1058", "Lab dip approval", "28 Oct"],
  ["PO-2026-1059", "PP sample", "01 Nov"],
  ["PO-2026-1060", "Fabric arrival", "05 Nov"],
  ["PO-2026-1061", "Final inspection", "11 Nov"],
];

export default function LandingPage() {
  const demoHref = `mailto:${CONTACT_EMAIL}?subject=GarmentFlow%20AI%20demo%20request`;
  return (
    <main>
      {/* Screen 01 — hero */}
      <section className="mx-auto grid max-w-[1320px] items-center gap-12 px-4 py-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:py-24 xl:grid-cols-[minmax(0,1fr)_480px]">
        <div>
          <p className="text-caption font-bold tracking-wider text-violet">THE MERCHANDISING WORKSPACE</p>
          <h1 className="mt-6 text-[38px] leading-[1.08] font-semibold tracking-tight text-ink sm:text-[48px] xl:text-[54px]">
            Every order. Every deadline.
            <br />
            One clear place to work.
          </h1>
          <p className="mt-7 max-w-[600px] text-[17px] leading-relaxed text-secondary sm:text-[18px]">
            Turn buyer emails and tech packs into organized purchase orders. Track approvals, fabric and shipping with confidence.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <a href={demoHref} className="inline-flex h-11 items-center gap-2 rounded-control bg-dark px-5 text-[13px] font-semibold text-white hover:bg-dark-hover">
              Book a live demo <ArrowRight className="size-4" />
            </a>
            <ButtonLink href="/dashboard" variant="primary" className="h-11 px-5">
              Explore the demo workspace
            </ButtonLink>
          </div>
          <p className="mt-4 text-caption text-secondary">The demo workspace uses fictional sample data.</p>
        </div>

        <div className="rounded-card border border-border bg-surface p-5 shadow-pop" aria-label="Product preview (illustrative)">
          <p className="text-[20px] font-semibold">Order command center</p>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              ["Active orders", "128"],
              ["On-time", "92%"],
              ["Needs attention", "08"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-card border border-border p-3">
                <p className="text-[11px] font-medium text-secondary">{label}</p>
                <p className="mt-4 text-[26px] font-semibold tabular-nums sm:text-[29px]">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-card border border-border p-4">
            <p className="text-[17px] font-semibold">Shipment deadlines</p>
            <ul className="mt-3 space-y-1">
              {previewRows.map(([po, task, date], i) => (
                <li key={po} className={`flex justify-between rounded-lg px-2 py-3 text-caption font-medium ${i % 2 ? "bg-subtle" : ""}`}>
                  <span>
                    {po} · {task}
                  </span>
                  <span className="text-secondary">{date}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-3 text-[11px] text-muted">Illustrative preview</p>
        </div>
      </section>

      {/* Screen 02 content — how it works */}
      <section id="how-it-works" className="border-t border-border bg-surface">
        <div className="mx-auto max-w-[1320px] px-4 py-16 sm:px-8">
          <h2 className="text-[30px] font-semibold tracking-tight sm:text-[40px]">How GarmentFlow works</h2>
          <p className="mt-3 text-[15px] text-secondary">From document intake to follow-up, in five steps. A merchandiser approves every AI suggestion.</p>
          <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((step, i) => (
              <li key={step} className="rounded-card border border-border bg-bg p-4">
                <p className="text-caption font-semibold text-violet">0{i + 1}</p>
                <p className="mt-3 text-[13px] font-semibold">{step}</p>
              </li>
            ))}
          </ol>
          <div id="features" className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-card border border-border p-6">
                <div className="grid size-10 place-items-center rounded-control bg-violet-light text-violet">
                  <Icon className="size-5" aria-hidden />
                </div>
                <h3 className="mt-5 text-[18px] font-semibold">{title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-secondary">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Screen 03 content — pricing */}
      <section id="pricing" className="mx-auto max-w-[1320px] px-4 py-16 sm:px-8">
        <h2 className="text-[30px] font-semibold tracking-tight sm:text-[40px]">Simple pricing that grows with you</h2>
        <p className="mt-3 text-[13px] text-secondary">Pilot pricing shown for discussion. Final pricing is confirmed during onboarding.</p>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.name} className={`flex flex-col rounded-card border bg-surface p-6 ${plan.featured ? "border-violet shadow-pop" : "border-border"}`}>
              <p className="text-[20px] font-semibold">{plan.name}</p>
              <p className="mt-6 text-[40px] font-semibold tracking-tight">{plan.price}</p>
              <p className="text-caption text-secondary">{plan.price === "Custom" ? "Talk to us" : "per month"}</p>
              <p className="mt-6 text-[13px] font-medium">{plan.note}</p>
              <ul className="mt-6 flex-1 space-y-3">
                {planFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[13px] text-secondary">
                    <Check className="size-4 text-green" aria-hidden /> {f}
                  </li>
                ))}
              </ul>
              <a href={demoHref} className={`mt-8 inline-flex h-10 items-center justify-center rounded-control text-[13px] font-semibold ${plan.featured ? "bg-violet text-white hover:bg-violet-hover" : "border border-border hover:bg-subtle"}`}>
                Request demo
              </a>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
