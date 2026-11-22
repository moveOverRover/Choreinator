// The chore lottery. Pure logic only: no I/O, so it can be tested and re-run.
//
// How it works (the rules the house agreed on):
//   1. Everyone picks one chore they absolutely cannot do (their "veto") and ranks
//      their top 3 chores.
//   2. Round 1: look at everyone's 1st choice. Starting with the most popular chore,
//      if more people want it than it has slots, draw winners at random. Losers stay
//      in the pool. Repeat for every chore that was someone's 1st choice.
//   3. Round 2 and 3: same thing with 2nd and then 3rd choices, for people who are
//      still unassigned and only for chores that still have open slots.
//   4. Anyone left over (lost every draw, or never submitted) is randomly given an
//      open chore that is NOT their veto. A veto is never broken by the lottery: if
//      the only slots left are someone's veto, they are reported as unassigned and an
//      admin fixes it by hand.

import { createRng } from "./rng";

export type AssignMethod = "choice1" | "choice2" | "choice3" | "random";

export interface LotteryChore {
  id: string;
  name: string;
  slots: number;
}

export interface LotteryParticipant {
  id: string;
  name: string;
  /** Chore id this person cannot do. */
  veto?: string;
  /** Up to 3 chore ids, best first. "" = no preference at that rank. */
  choices: string[];
}

export interface LotteryAssignment {
  participantId: string;
  choreId: string;
  method: AssignMethod;
}

export interface LotteryResult {
  seed: string;
  assignments: LotteryAssignment[];
  /** People who could not be placed (not enough slots, or only their veto left). */
  unassigned: string[];
  /** Human-readable, step-by-step record of the draw. */
  log: string[];
}

export function runLottery(
  chores: LotteryChore[],
  participants: LotteryParticipant[],
  seed: string,
): LotteryResult {
  const rng = createRng(seed);
  const log: string[] = [];
  const choreById = new Map(chores.map((c) => [c.id, c]));
  const nameOf = (pid: string) => participants.find((p) => p.id === pid)?.name ?? pid;
  const choreName = (cid: string) => choreById.get(cid)?.name ?? cid;

  const openSlots = new Map(chores.map((c) => [c.id, Math.max(0, c.slots)]));
  const assignments: LotteryAssignment[] = [];
  const assigned = new Set<string>();

  // Sanitize choices: blank out unknown chores, duplicates, and the person's own veto.
  // Positions are kept (a skipped 2nd choice stays empty) so that skipping a rank
  // never moves a later choice into an earlier, better round.
  const cleanChoices = new Map<string, string[]>();
  for (const p of participants) {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const c of p.choices.slice(0, 3)) {
      const ok = c && choreById.has(c) && c !== p.veto && !seen.has(c);
      if (ok) seen.add(c);
      list.push(ok ? c : "");
    }
    cleanChoices.set(p.id, list);
  }

  const totalSlots = [...openSlots.values()].reduce((a, b) => a + b, 0);
  log.push(
    `Lottery seed ${seed}. ${participants.length} people, ${chores.length} chores, ${totalSlots} slots.`,
  );
  if (totalSlots < participants.length) {
    log.push(
      `WARNING: only ${totalSlots} slots for ${participants.length} people. ${participants.length - totalSlots} will be unassigned.`,
    );
  }

  for (let rank = 0; rank < 3; rank++) {
    const method = `choice${rank + 1}` as AssignMethod;
    // Group still-unassigned people by their choice at this rank.
    const contenders = new Map<string, string[]>();
    for (const p of participants) {
      if (assigned.has(p.id)) continue;
      const choice = cleanChoices.get(p.id)?.[rank];
      if (!choice) continue;
      if (!contenders.has(choice)) contenders.set(choice, []);
      contenders.get(choice)!.push(p.id);
    }
    if (contenders.size === 0) continue;
    log.push(`--- Round ${rank + 1}: ${ordinal(rank + 1)} choices ---`);

    // Most popular first; ties broken randomly (shuffle, then stable sort).
    const order = rng
      .shuffle([...contenders.keys()])
      .sort((a, b) => contenders.get(b)!.length - contenders.get(a)!.length);

    for (const choreId of order) {
      const people = contenders.get(choreId)!;
      const free = openSlots.get(choreId) ?? 0;
      const names = people.map(nameOf).join(", ");
      if (free === 0) {
        log.push(`${choreName(choreId)}: wanted by ${names}, but it is already full.`);
        continue;
      }
      let winners: string[];
      if (people.length <= free) {
        winners = people;
        log.push(
          `${choreName(choreId)}: ${people.length} wanted it, ${free} slot(s) open. No draw needed: ${names}.`,
        );
      } else {
        winners = rng.shuffle(people).slice(0, free);
        log.push(
          `${choreName(choreId)}: ${people.length} wanted it (${names}), ${free} slot(s). Random draw winner(s): ${winners.map(nameOf).join(", ")}.`,
        );
      }
      for (const pid of winners) {
        assignments.push({ participantId: pid, choreId, method });
        assigned.add(pid);
      }
      openSlots.set(choreId, free - winners.length);
    }
  }

  // Leftovers: random open slot that isn't their veto, via bipartite matching so that
  // one person's veto can't strand them when a different arrangement would work.
  const leftovers = rng.shuffle(participants.filter((p) => !assigned.has(p.id)));
  const unassigned: string[] = [];
  if (leftovers.length > 0) {
    log.push(`--- Leftovers: ${leftovers.length} people get a random open chore (never their veto) ---`);
    const slotList: string[] = [];
    for (const c of chores) for (let i = 0; i < (openSlots.get(c.id) ?? 0); i++) slotList.push(c.id);
    const slotOwner: (number | undefined)[] = new Array(slotList.length).fill(undefined);
    const options = leftovers.map((p) =>
      rng.shuffle(slotList.map((_, i) => i).filter((i) => slotList[i] !== p.veto)),
    );

    const tryPlace = (pi: number, seen: Set<number>): boolean => {
      for (const si of options[pi]) {
        if (seen.has(si)) continue;
        seen.add(si);
        const owner = slotOwner[si];
        if (owner === undefined || tryPlace(owner, seen)) {
          slotOwner[si] = pi;
          return true;
        }
      }
      return false;
    };
    leftovers.forEach((_, pi) => tryPlace(pi, new Set()));

    const placed = new Map<number, string>();
    slotOwner.forEach((pi, si) => {
      if (pi !== undefined) placed.set(pi, slotList[si]);
    });
    leftovers.forEach((p, pi) => {
      const choreId = placed.get(pi);
      if (choreId) {
        assignments.push({ participantId: p.id, choreId, method: "random" });
        assigned.add(p.id);
        openSlots.set(choreId, (openSlots.get(choreId) ?? 1) - 1);
        log.push(`${p.name} -> ${choreName(choreId)} (random).`);
      } else {
        unassigned.push(p.id);
        log.push(`${p.name} could not be placed (no open slot that isn't their veto). Admin must assign by hand.`);
      }
    });
  }

  const emptySlots = [...openSlots.entries()].filter(([, n]) => n > 0);
  if (emptySlots.length > 0) {
    log.push(
      `Unfilled slots: ${emptySlots.map(([id, n]) => `${choreName(id)} x${n}`).join(", ")}.`,
    );
  }
  log.push("Done.");
  return { seed, assignments, unassigned, log };
}

function ordinal(n: number) {
  return n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;
}
