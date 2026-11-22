import type { Assignment, Chore, Db, Round, User } from "./types";

/** The round residents should be working with right now (newest that isn't published, else newest). */
export function currentRound(db: Db): Round | undefined {
  return db.rounds.find((r) => r.status !== "published") ?? db.rounds[0];
}

/** The newest published round: these are the chores people are doing now. */
export function activeRound(db: Db): Round | undefined {
  return db.rounds
    .filter((r) => r.status === "published")
    .sort((a, b) => (b.publishedAt || b.createdAt).localeCompare(a.publishedAt || a.createdAt))[0];
}

export function activeChores(db: Db): Chore[] {
  return db.chores.filter((c) => c.active && c.slots > 0);
}

export function lotteryPeople(db: Db): User[] {
  return db.users
    .filter((u) => u.status === "approved" && u.participates)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function assignmentFor(db: Db, roundId: string, email: string): Assignment | undefined {
  return db.assignments.find((a) => a.roundId === roundId && a.email === email.toLowerCase());
}

export function choreById(db: Db, id: string): Chore | undefined {
  return db.chores.find((c) => c.id === id);
}

export function userByEmail(db: Db, email: string): User | undefined {
  return db.users.find((u) => u.email === email.toLowerCase());
}

export const METHOD_LABEL: Record<string, string> = {
  choice1: "1st choice",
  choice2: "2nd choice",
  choice3: "3rd choice",
  random: "Random (leftover)",
  manual: "Set by admin",
};

export function today(): string {
  // House is in BC, Canada; use Pacific time for "today".
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.HOUSE_TIMEZONE || "America/Vancouver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
