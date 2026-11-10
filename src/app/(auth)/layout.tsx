import { FileLock2, ShieldCheck, UserCheck } from "lucide-react";
import { Logo } from "@/components/layout/logo";

const points = [
  { icon: ShieldCheck, title: "A separate workspace for every company", body: "Orders, documents and team members are isolated per buying house at the database level." },
  { icon: FileLock2, title: "Private document storage", body: "Buyer POs and tech packs are stored privately and opened only by your own team." },
  { icon: UserCheck, title: "People approve, AI assists", body: "AI suggestions never become an order or an email until someone on your team reviews them." },
];

/** Shared frame for sign-in, sign-up, recovery, verification and invitation screens. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="flex min-h-screen flex-col px-5 py-6 sm:px-10">
        <Logo />
        <main id="main" className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
          {children}
        </main>
        <p className="text-caption text-muted">© 2026 GarmentFlow AI</p>
      </div>
      <aside className="hidden border-l border-border bg-bg px-12 lg:flex lg:flex-col lg:justify-center xl:px-20">
        <p className="text-caption font-medium tracking-wide text-brand-strong uppercase">Merchandising workspace</p>
        <p className="mt-4 max-w-[440px] text-[30px] leading-[1.2] font-semibold tracking-tight text-ink">
          Buyer orders, deadlines and follow-ups in one clear place.
        </p>
        <ul className="mt-10 max-w-[440px] space-y-6">
          {points.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-control border border-border bg-surface text-brand-strong">
                <Icon className="size-[18px]" aria-hidden />
              </span>
              <span>
                <span className="block text-[14px] font-medium text-ink">{title}</span>
                <span className="mt-0.5 block text-[13px] leading-relaxed text-secondary">{body}</span>
              </span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
