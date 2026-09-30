import type { TagTone } from "@/lib/grade-wars/view";

const TONES: Record<TagTone, string> = {
  winner: "bg-ink text-butter border-ink",
  leading: "bg-butter text-ink border-ink",
  "tied-lead": "bg-tomato text-white border-tomato",
  tied: "bg-kraft text-ink border-ink",
};

export function GradeTag({ label, tone, className = "" }: { label: string; tone: TagTone; className?: string }) {
  return (
    <span
      className={`inline-block border-[1.5px] px-1.5 py-0.5 font-mono text-[10.5px] leading-none font-bold tracking-[.1em] whitespace-nowrap uppercase ${TONES[tone]} ${className}`}
    >
      {label}
    </span>
  );
}
