import { Hero } from "@/components/home/hero";
import { HowToGive } from "@/components/home/how-to-give";
import { Incentives } from "@/components/home/incentives";
import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";
import { Standings } from "@/components/home/standings";
import { TopDonors } from "@/components/home/top-donors";
import { CollectionMap } from "@/components/home/collection-map";
import { getHomepageData } from "@/lib/homepage.server";

// Rebuild in the background at most once a minute; if a rebuild fails, the
// last good page keeps being served.
export const revalidate = 60;

export default async function Home() {
  const { goal, total, homerooms, topDonors } = await getHomepageData();
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 bg-ink px-4 py-3 font-semibold text-paper focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="overflow-x-clip outline-none">
        <Hero goal={goal} total={total} />
        <Incentives />
        <Standings homerooms={homerooms} />
        <TopDonors donors={topDonors} />
        <HowToGive />
        <CollectionMap />
      </main>
      <SiteFooter />
    </>
  );
}
