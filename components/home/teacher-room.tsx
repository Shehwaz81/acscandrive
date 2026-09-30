"use client";

import { useState } from "react";

/** Shows the homeroom teacher; a click swaps in the room code and back. */
export function TeacherRoom({ teacher, room }: { teacher: string; room: string }) {
  const [showRoom, setShowRoom] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setShowRoom((s) => !s)}
      aria-label={`${teacher}, homeroom ${room}`}
      title={`Homeroom ${room}`}
      className="cursor-pointer underline decoration-dotted underline-offset-2"
    >
      {showRoom ? `Rm ${room}` : teacher}
    </button>
  );
}
