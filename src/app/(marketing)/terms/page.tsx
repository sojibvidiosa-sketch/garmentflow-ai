import type { Metadata } from "next";
import { CONTACT_EMAIL } from "@/components/layout/site-header";

export const metadata: Metadata = { title: "Terms of service" };

const LEGAL_NAME = process.env.NEXT_PUBLIC_LEGAL_NAME || "GarmentFlow AI";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-[760px] px-4 py-12 sm:px-8 sm:py-16">
      <article className="space-y-6 text-[15px] leading-relaxed text-ink [&_h2]:mt-10 [&_h2]:text-[20px] [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:text-secondary [&_ul]:space-y-2 [&_ul]:text-secondary">
        <h1 className="text-[32px] font-semibold tracking-tight">Terms of service</h1>
        <p>These terms apply to the use of GarmentFlow AI, provided by {LEGAL_NAME}. By creating a workspace or using the platform, your company agrees to them.</p>

        <h2>The service</h2>
        <p>GarmentFlow AI helps merchandising teams manage purchase orders, documents, T&amp;A milestones, deadline alerts, email drafts and reports. Features and limits depend on your plan.</p>

        <h2>Accounts and responsibilities</h2>
        <ul>
          <li>The person who creates a workspace becomes its Company Admin and is responsible for who is invited and which roles they have.</li>
          <li>Keep passwords private. You are responsible for activity under your team&rsquo;s accounts.</li>
          <li>Upload only documents and data your company is authorised to process.</li>
        </ul>

        <h2>AI features</h2>
        <p>
          AI suggestions (document extraction, email drafts, report summaries) can be incomplete or wrong. Your team must review them before relying on them. Purchase orders are only created from AI results after a team
          member approves them. We are not responsible for business decisions made without that review.
        </p>

        <h2>Deadline alerts</h2>
        <p>Alerts are calculated from the dates your team enters. An overdue milestone means follow-up is needed; it does not by itself mean a shipment will be late.</p>

        <h2>Fees and plans</h2>
        <p>Plan prices and limits are agreed in writing during onboarding. During the pilot, invoices are issued manually. We may suspend workspaces with overdue invoices after notice.</p>

        <h2>Acceptable use</h2>
        <p>Do not misuse the service: no attempts to access other companies&rsquo; data, to disrupt the platform, or to upload unlawful content.</p>

        <h2>Your data</h2>
        <p>Your company owns its business data. You can export reports as CSV at any time. Our handling of personal data is described in the privacy notice.</p>

        <h2>Availability and liability</h2>
        <p>
          We work to keep the service available and secure but provide it without guarantee of uninterrupted operation. To the extent permitted by law, our liability is limited to the fees paid for the service in the three months
          before the claim.
        </p>

        <h2>Changes and contact</h2>
        <p>
          We may update these terms and will notify Company Admins of material changes. Questions: <span className="select-all font-semibold text-ink">{CONTACT_EMAIL}</span>.
        </p>
        <p className="text-caption">Last updated: 23 October 2026</p>
      </article>
    </main>
  );
}
