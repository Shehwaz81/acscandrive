import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ElementType, ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Markdown, { type Components, type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";
import { WRAP } from "@/lib/site";

export const metadata: Metadata = {
  title: "Architecture · Can Drive",
  description: "Architecture and design decisions for the Can Drive site.",
  robots: { index: false },
};

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");

/** Markdown element styled with the site's tokens. Headings get ids for in-page links. */
function styled(Tag: ElementType, className: string, { anchor = false } = {}) {
  function Styled({ node, children, ...rest }: ExtraProps & { children?: ReactNode }) {
    void node; // react-markdown's AST node; must not reach the DOM.
    const id = anchor ? slug(String(children)) : undefined;
    return (
      <Tag id={id} className={className} {...rest}>
        {children}
      </Tag>
    );
  }
  return Styled;
}

const components: Components = {
  h1: styled("h1", "mb-6 font-display text-[clamp(3rem,10vw,5.5rem)] leading-[.84] font-black uppercase"),
  h2: styled(
    "h2",
    "mt-14 mb-4 scroll-mt-4 border-b-2 border-ink pb-2 font-display text-4xl leading-none font-black uppercase",
    { anchor: true },
  ),
  h3: styled("h3", "mt-8 mb-3 font-display text-2xl font-extrabold uppercase", { anchor: true }),
  p: styled("p", "my-4 leading-relaxed"),
  ul: styled("ul", "my-4 list-disc space-y-2 pl-6"),
  ol: styled("ol", "my-4 list-decimal space-y-2 pl-6"),
  a: styled("a", "font-semibold underline"),
  th: styled("th", "bg-ink px-3 py-2 font-mono text-xs tracking-[.08em] text-paper uppercase"),
  td: styled("td", "border-t border-ink/15 px-3 py-2 align-top"),
  pre: styled("pre", "my-6 overflow-x-auto bg-ink p-4 text-sm leading-relaxed text-paper"),
  table: ({ children }) => (
    <div className="my-6 overflow-x-auto border-2 border-ink">
      <table className="w-full border-collapse text-left text-[15px]">{children}</table>
    </div>
  ),
};

export default async function DocsPage() {
  // Read at build time; the route is statically prerendered.
  const source = await readFile(path.join(process.cwd(), "docs/architecture.md"), "utf8");
  return (
    <main className={`${WRAP} py-10 lg:py-16`}>
      <Link href="/" className="font-mono text-xs font-semibold tracking-[.14em] text-muted no-underline">
        ← CAN DRIVE
      </Link>
      <article className="mt-6 max-w-[860px] text-[17px] [&_code]:font-mono [&_code]:text-[.9em] [&_:not(pre)>code]:bg-kraft [&_:not(pre)>code]:px-1">
        <Markdown remarkPlugins={[remarkGfm]} components={components}>
          {source}
        </Markdown>
      </article>
    </main>
  );
}
