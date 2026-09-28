import { Hero } from "@/components/home/hero";
import { HowToGive } from "@/components/home/how-to-give";
import { Incentives } from "@/components/home/incentives";
import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";
import { Standings } from "@/components/home/standings";
import { TopDonors } from "@/components/home/top-donors";
import { ZoneMap } from "@/components/home/zone-map";

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
        <Standings />
        <TopDonors />
        <HowToGive />
        <ZoneMap />
      </main>
      <SiteFooter />
    </>
  );
}
