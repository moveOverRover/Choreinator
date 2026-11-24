// Shapes of the rows stored in the Choreinator Google Sheet (one tab per type).
// Every value is stored as text in Sheets; the store converts to these types.

export type UserStatus = "pending" | "approved" | "disabled";
export type UserRole = "resident" | "admin";

export interface User {
  email: string;
  name: string;
  status: UserStatus;
  role: UserRole;
  /** Name as this person types it in the Google Form (used to match submissions). */
  formName: string;
  /** Included in the lottery. Turn off for people who sit out a rotation. */
  participates: boolean;
  createdAt: string;
}

export interface Chore {
  id: string;
  name: string;
  description: string;
  /** How many people this chore takes. */
  slots: number;
  active: boolean;
  /** Label as it appears in the Google Form's "What is your chore?" answer. */
  formLabel: string;
  sortOrder: number;
}

/** open: residents can submit. closed: no more edits. drawn: lottery ran (admin can edit). published: visible to all. */
export type RoundStatus = "open" | "closed" | "drawn" | "published";

export interface Round {
  id: string;
  name: string;
  status: RoundStatus;
  createdAt: string;
  seed: string;
  drawnAt: string;
  publishedAt: string;
  /** First day (YYYY-MM-DD) the new chores start; tracking board counts weeks from here. */
  startsOn: string;
  /** How many times the lottery was run for this round (admin-only; residents never see it). */
  drawCount: number;
  /** When the "your chore" emails were last sent, and to how many people. */
  notifiedAt: string;
  notifiedCount: number;
}

export interface Preference {
  roundId: string;
  email: string;
  veto: string;
  choice1: string;
  choice2: string;
  choice3: string;
  updatedAt: string;
}

export type AssignmentMethod = "choice1" | "choice2" | "choice3" | "random" | "manual";

export interface Assignment {
  roundId: string;
  email: string;
  choreId: string;
  method: AssignmentMethod;
  note: string;
}

export interface LogLine {
  roundId: string;
  seq: number;
  text: string;
}

export interface MissedChore {
  weekStart: string;
  email: string;
  name: string;
  chore: string;
  loggedAt: string;
  loggedBy: string;
}

export interface Db {
  users: User[];
  chores: Chore[];
  rounds: Round[];
  preferences: Preference[];
  assignments: Assignment[];
  log: LogLine[];
  missed: MissedChore[];
}
