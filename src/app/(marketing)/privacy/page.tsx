import type { Metadata } from "next";
import { CONTACT_EMAIL } from "@/components/layout/site-header";

export const metadata: Metadata = { title: "Privacy notice" };

const LEGAL_NAME = process.env.NEXT_PUBLIC_LEGAL_NAME || "GarmentFlow AI";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-[760px] px-4 py-12 sm:px-8 sm:py-16">
      <article className="space-y-6 text-[15px] leading-relaxed text-ink [&_h2]:mt-10 [&_h2]:text-[20px] [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:text-secondary [&_ul]:space-y-2 [&_ul]:text-secondary">
        <h1 className="text-[32px] font-semibold tracking-tight">Privacy notice</h1>
        <p>This notice explains how {LEGAL_NAME} (&ldquo;we&rdquo;) handles information when buying houses use the GarmentFlow AI platform and website.</p>

        <h2>Who controls customer data</h2>
        <p>Each customer company controls the orders, documents and other business data its team enters. We process that data on the company&rsquo;s behalf to provide the service.</p>

        <h2>What we collect</h2>
        <ul>
          <li>Account details: name, work email, password (stored only as a secure hash by our authentication provider), role and company membership.</li>
          <li>Business data your team adds: purchase orders, styles, buyers, T&amp;A milestones, tasks, notes, email drafts and uploaded documents.</li>
          <li>Usage records: activity history inside your workspace, AI request counts, token usage and estimated cost.</li>
          <li>Website demo requests: name, email, company, phone and message you submit.</li>
        </ul>

        <h2>How we use it</h2>
        <ul>
          <li>To run the platform: show your orders, calculate deadlines and reports, and keep an activity history.</li>
          <li>To process documents and draft text with AI when your team asks for it.</li>
          <li>To provide support, secure the service, enforce plan limits and invoice customers.</li>
        </ul>
        <p>We do not sell personal data and we do not use your business data for advertising.</p>

        <h2>AI processing</h2>
        <p>
          When a user chooses to read a document or draft an email with AI, the relevant document or order facts are sent to OpenAI&rsquo;s API to produce the result, under OpenAI&rsquo;s API data-usage terms. AI suggestions are
          shown for human review and are not saved as orders until a team member approves them. Only documents your company is authorised to process should be uploaded.
        </p>

        <h2>Where data is stored and who can see it</h2>
        <ul>
          <li>Data is stored with our database and storage provider (Supabase) in the Southeast Asia (Singapore) region, and the application is hosted by Vercel.</li>
          <li>Each company has a separate workspace. Database-level access rules prevent one company from reading another company&rsquo;s data.</li>
          <li>Documents are stored privately and opened only through short-lived links for signed-in members of the same company.</li>
          <li>Our platform administrators see usage and billing information, not your orders or documents, unless you ask us for support access.</li>
        </ul>

        <h2>Retention and deletion</h2>
        <p>We keep workspace data while your company has an account. A Company Admin can delete orders, documents and team members at any time. When an account is closed we delete the workspace data within 90 days, except records we must keep by law.</p>

        <h2>Security</h2>
        <p>We use encrypted connections (HTTPS), role-based access, row-level security in the database, private file storage and audit history. No system is perfectly secure; please report any concern to us immediately.</p>

        <h2>Your rights and contact</h2>
        <p>
          You can ask to access, correct or delete your personal data. Contact us at <span className="select-all font-semibold text-ink">{CONTACT_EMAIL}</span>.
        </p>
        <p className="text-caption">Last updated: 23 October 2026</p>
      </article>
    </main>
  );
}
