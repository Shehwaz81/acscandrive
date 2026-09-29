import { MONO_LABEL } from "@/lib/volunteer/ui";

const KEYS: [string, string][] = [
  ["/", "Jump to search or amount"],
  ["↑ ↓", "Move through matches · step cans"],
  ["Enter", "Pick student · save · next student"],
  ["$  /  C", "Switch to cash / cans"],
  ["Esc", "Change student"],
  ["D  /  L", "Dashboard / Log donation"],
];

/** Laptop and tablet only; phones have no keyboard shortcuts. */
export function KeyboardHelp() {
  return (
    <section aria-labelledby="keys-title" className="hidden border-2 border-ink p-4 md:block">
      <h2 id="keys-title" className={MONO_LABEL}>
        Keyboard
      </h2>
      <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-[13.5px]">
        {KEYS.map(([k, v]) => (
          <div key={k} className="contents">
            <dt>
              <kbd className="border border-ink px-1.5 font-mono text-[12px] font-bold whitespace-pre">{k}</kbd>
            </dt>
            <dd className="text-body">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
