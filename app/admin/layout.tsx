import { AdminProviders } from "./providers";

// The whole admin panel is an authenticated, per-request dashboard (Refine's
// router hooks read useSearchParams for filters/pagination/sorting), so
// static prerendering doesn't apply here — force dynamic rendering for all
// /admin/* pages instead of wrapping every page in a Suspense boundary.
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminProviders>{children}</AdminProviders>;
}
