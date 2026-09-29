import { formatCents } from "@/lib/volunteer/money";
import type { StudentTotals } from "@/lib/volunteer/types";
import { MONO_LABEL } from "@/lib/volunteer/ui";

/** Read-only. Totals are sums of the logs below; the only way to change them is to edit a log. */
export function TotalsStrip({ totals }: { totals: StudentTotals | undefined }) {
  const items = [
    { label: "Cans", value: totals ? String(totals.cans) : "–" },
    { label: "Cash", value: totals ? formatCents(totals.cashCents) : "–" },
    { label: "Counts as", value: totals ? String(totals.canEquivalents) : "–", unit: "can-eq." },
  ];
  return (
    <div>
      <dl className="grid grid-cols-3 border-y-2 border-ink">
        {items.map((it, i) => (
          <div key={it.label} className={`px-3 py-3 md:px-5 ${i > 0 ? "border-l border-rule" : ""}`}>
            <dt className={`${MONO_LABEL} text-muted`}>{it.label}</dt>
            <dd className="mt-1 flex items-baseline gap-1.5">
              <span className="font-display text-[30px] leading-none font-extrabold tabular-nums md:text-[36px]">
                {it.value}
              </span>
              {it.unit && <span className="text-[12.5px] text-muted">{it.unit}</span>}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[13px] text-muted">
        Totals add up from the logs below. Edit a log to change them. $1 counts as 1 can.
      </p>
    </div>
  );
}
