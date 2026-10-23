import { SiteHeader } from "@/components/layout/site-header";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-screen bg-bg">
      <SiteHeader />
      {children}
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-3 px-4 py-8 text-caption text-secondary sm:px-8">
          <p>© 2026 GarmentFlow AI · Built for garment buying houses in Bangladesh</p>
          <p>AI suggestions are always reviewed by a merchandiser before they become records.</p>
        </div>
      </footer>
    </div>
  );
}
