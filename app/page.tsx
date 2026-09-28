import { Hero } from "@/components/home/hero";
import { Incentives } from "@/components/home/incentives";
import { SiteHeader } from "@/components/home/site-header";

export default function Home() {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 bg-ink px-4 py-3 font-semibold text-paper focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="outline-none">
        <Hero />
        <Incentives />
      </main>
    </>
  );
}
