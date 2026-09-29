import Link from "next/link";
import type { Student } from "@/lib/volunteer/types";

/** A failed save must never look like a success, and must never clear the form. */
export function SaveFailedBanner({
  reason,
  amountText,
  student,
  onRetry,
}: {
  reason: "network" | "conflict";
  amountText: string;
  student: Student;
  onRetry: () => void;
}) {
  const name = `${student.firstName} ${student.lastName}`;
  return (
    <div role="alert" className="border-[3px] border-tomato bg-error-surface px-4 py-3.5 text-[15px] leading-snug">
      {reason === "network" ? (
        <p>
          <strong>Not saved — nothing was recorded.</strong> The connection dropped. {amountText} for {name} is
          still filled in. Try again, or keep it on paper if this repeats.
        </p>
      ) : (
        <p>
          <strong>Not saved.</strong> This entry may already have been recorded with a different amount.{" "}
          <Link href={`/volunteer?student=${student.id}`}>Check {student.firstName}’s logs</Link> before saving
          again.
        </p>
      )}
      {reason === "network" && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2.5 min-h-11 border-2 border-ink bg-field px-4 font-bold hover:bg-ink hover:text-paper"
        >
          Try again
        </button>
      )}
    </div>
  );
}
