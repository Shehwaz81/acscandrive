import { parseDollarsToCents } from "./money";
import type { DonationLog, Grade, Student } from "./types";

/**
 * Fictional students and donations for the mock repository. No real roster
 * data belongs here. The near-duplicate sets are deliberate: they exercise
 * the similar-name warnings.
 */

const STUDENTS: [string, string, Grade, string][] = [
  // Near-duplicates
  ["Maya", "Rodriguez", 11, "11A"],
  ["Maya", "Rodrigues", 9, "9C"],
  ["Mya", "Rodriguez", 12, "12B"],
  ["Anna", "Nguyen", 10, "10C"],
  ["Anna", "Nguyen", 12, "12E"],
  ["Anh", "Nguyen", 9, "9A"],
  ["Daniel", "Kim", 10, "10B"],
  ["Danielle", "Kim", 11, "11D"],
  ["Liam", "O'Brien", 12, "12A"],
  ["Liam", "O'Brian", 9, "9B"],
  ["Olivia", "Chen", 11, "11C"],
  ["Olivia", "Cheng", 10, "10A"],
  ["Sofia", "Lopez", 9, "9D"],
  ["Sophia", "Lopes", 12, "12C"],
  ["Lucas", "Martin", 10, "10E"],
  ["Lucas", "Martins", 11, "11B"],
  // Everyone else
  ["Priya", "Singh", 11, "11A"],
  ["Noah", "Thompson", 9, "9A"],
  ["Ethan", "Patel", 12, "12D"],
  ["Chloé", "Tremblay", 10, "10D"],
  ["Omar", "Haddad", 11, "11E"],
  ["Grace", "Okafor", 9, "9E"],
  ["Mateo", "Rossi", 12, "12E"],
  ["Hannah", "Kowalski", 10, "10B"],
  ["Aiden", "MacDonald", 9, "9C"],
  ["Zara", "Ahmed", 11, "11C"],
  ["Jack", "Fitzgerald", 12, "12A"],
  ["Isabella", "Moreau", 10, "10C"],
  ["Samuel", "Osei", 9, "9B"],
  ["Nora", "Lindqvist", 11, "11D"],
];

export function seedStudents(): Student[] {
  return STUDENTS.map(([firstName, lastName, grade, homeroom], i) => ({
    id: `s${String(i + 1).padStart(2, "0")}`,
    firstName,
    lastName,
    grade,
    homeroom,
  }));
}

// [student index, days ago, minutes before now on that day, cans | "$dollars"]
const LOGS: [number, number, number, number | string][] = [
  // Today (15)
  [0, 0, 6, 12],
  [16, 0, 11, "$15.50"],
  [3, 0, 19, 8],
  [17, 0, 27, 24],
  [0, 0, 150, "$10.00"],
  [6, 0, 34, "$5.00"],
  [21, 0, 42, 6],
  [10, 0, 51, 15],
  [25, 0, 63, "$20.00"],
  [8, 0, 70, 4],
  [18, 0, 84, 30],
  [12, 0, 95, "$2.25"],
  [27, 0, 104, 9],
  [4, 0, 118, 11],
  [23, 0, 131, 3],
  // Earlier this week (25)
  [0, 3, 40, 24],
  [1, 1, 30, 7],
  [2, 2, 80, "$12.00"],
  [5, 1, 60, 10],
  [7, 2, 20, 18],
  [9, 4, 90, 5],
  [11, 3, 15, "$17.50"],
  [13, 5, 45, 14],
  [14, 6, 70, 20],
  [15, 1, 110, "$8.00"],
  [16, 2, 35, 12],
  [19, 3, 55, 6],
  [20, 4, 25, "$50.00"],
  [22, 5, 85, 9],
  [24, 6, 30, 16],
  [26, 1, 75, 22],
  [28, 2, 65, "$3.00"],
  [29, 3, 95, 13],
  [3, 4, 50, 5],
  [6, 5, 40, 11],
  [10, 6, 20, "$25.00"],
  [17, 1, 45, 8],
  [21, 2, 100, 120],
  [25, 4, 10, 7],
  [18, 6, 60, "$6.75"],
];

const DAY_MS = 86_400_000;

export function seedLogs(students: Student[], now: Date = new Date()): DonationLog[] {
  return LOGS.map(([studentIndex, daysAgo, minutesAgo, amount], i) => {
    const at = new Date(now.getTime() - daysAgo * DAY_MS - minutesAgo * 60_000).toISOString();
    const isCash = typeof amount === "string";
    return {
      id: `seed-${String(i + 1).padStart(3, "0")}`,
      studentId: students[studentIndex].id,
      method: isCash ? "cash" : "cans",
      cans: isCash ? null : amount,
      cashCents: isCash ? parseDollarsToCents(amount.slice(1)) : null,
      createdAt: at,
      updatedAt: at,
    };
  });
}
