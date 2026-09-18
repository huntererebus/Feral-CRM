import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function MarketingHome() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div>
        <p className="font-mono text-xs uppercase tracking-wide text-neutral-500">Reel</p>
        <h1 className="mt-2 text-2xl font-semibold text-neutral-100">Client media, on rails.</h1>
        <p className="mt-2 max-w-md text-sm text-neutral-400">
          A white-label CRM and review portal for content-production agencies — upload, assign, review, and
          deliver, all under your own brand.
        </p>
      </div>
      <Link href="/login">
        <Button>Sign in</Button>
      </Link>
    </main>
  );
}
