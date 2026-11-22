import { describe, expect, it } from "vitest";
import { runLottery, type LotteryChore, type LotteryParticipant } from "./lottery";

const chore = (id: string, slots = 1): LotteryChore => ({ id, name: id, slots });
const person = (id: string, choices: string[], veto?: string): LotteryParticipant => ({
  id,
  name: id,
  choices,
  veto,
});

function byPerson(result: ReturnType<typeof runLottery>) {
  return Object.fromEntries(result.assignments.map((a) => [a.participantId, a]));
}

describe("runLottery", () => {
  it("gives everyone their first choice when there is no conflict", () => {
    const r = runLottery(
      [chore("A"), chore("B"), chore("C")],
      [person("p1", ["A", "B", "C"]), person("p2", ["B", "A", "C"]), person("p3", ["C", "A", "B"])],
      "seed",
    );
    const m = byPerson(r);
    expect(m.p1).toMatchObject({ choreId: "A", method: "choice1" });
    expect(m.p2).toMatchObject({ choreId: "B", method: "choice1" });
    expect(m.p3).toMatchObject({ choreId: "C", method: "choice1" });
    expect(r.unassigned).toEqual([]);
  });

  it("draws one winner for a contested first choice; losers fall to their 2nd choice", () => {
    const r = runLottery(
      [chore("A"), chore("B"), chore("C")],
      [person("p1", ["A", "B", "C"]), person("p2", ["A", "C", "B"]), person("p3", ["B", "C", "A"])],
      "seed",
    );
    const m = byPerson(r);
    const winner = m.p1.choreId === "A" ? "p1" : "p2";
    const loser = winner === "p1" ? "p2" : "p1";
    expect(m[winner]).toMatchObject({ choreId: "A", method: "choice1" });
    expect(m.p3).toMatchObject({ choreId: "B", method: "choice1" });
    // p1's 2nd choice is B (taken), p2's 2nd is C (free).
    if (loser === "p2") expect(m.p2).toMatchObject({ choreId: "C", method: "choice2" });
    else expect(m.p1).toMatchObject({ choreId: "C", method: "choice3" });
  });

  it("is reproducible from the seed", () => {
    const chores = [chore("A", 2), chore("B"), chore("C"), chore("D")];
    const people = ["a", "b", "c", "d", "e"].map((id) => person(id, ["A", "B", "C"]));
    const r1 = runLottery(chores, people, "same-seed");
    const r2 = runLottery(chores, people, "same-seed");
    expect(r1.assignments).toEqual(r2.assignments);
  });

  it("is fair: each contender wins a contested chore about equally often", () => {
    const wins: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 };
    for (let i = 0; i < 4000; i++) {
      const r = runLottery(
        [chore("A"), chore("B"), chore("C"), chore("D")],
        ["a", "b", "c", "d"].map((id) => person(id, ["A"])),
        `fair-${i}`,
      );
      const w = r.assignments.find((x) => x.choreId === "A" && x.method === "choice1")!;
      wins[w.participantId]++;
    }
    for (const n of Object.values(wins)) expect(n).toBeGreaterThan(850); // expected 1000
  });

  it("fills multi-slot chores with several winners", () => {
    const r = runLottery(
      [chore("Kitchen", 2), chore("B")],
      [person("p1", ["Kitchen"]), person("p2", ["Kitchen"]), person("p3", ["Kitchen"])],
      "x",
    );
    expect(r.assignments.filter((a) => a.choreId === "Kitchen" && a.method === "choice1")).toHaveLength(2);
    expect(r.assignments.find((a) => a.choreId === "B")?.method).toBe("random");
  });

  it("never assigns anyone their veto in the leftover phase, even via rearranging", () => {
    // Two leftovers, two open chores. p1 vetoes X, p2 can do anything.
    // A naive greedy that gives p2 'Y' first would strand p1; matching must avoid that.
    for (let i = 0; i < 200; i++) {
      const r = runLottery(
        [chore("X"), chore("Y")],
        [person("p1", [], "X"), person("p2", [])],
        `veto-${i}`,
      );
      const m = byPerson(r);
      expect(m.p1.choreId).toBe("Y");
      expect(m.p2.choreId).toBe("X");
      expect(r.unassigned).toEqual([]);
    }
  });

  it("ignores choices equal to the veto and duplicate choices", () => {
    const r = runLottery([chore("A"), chore("B")], [person("p1", ["A", "A", "B"], "A")], "s");
    expect(byPerson(r).p1).toMatchObject({ choreId: "B" });
  });

  it("reports people who cannot be placed when slots run out", () => {
    const r = runLottery([chore("A")], [person("p1", ["A"]), person("p2", ["A"])], "s");
    expect(r.assignments).toHaveLength(1);
    expect(r.unassigned).toHaveLength(1);
  });

  it("reports someone as unassigned rather than breaking their veto", () => {
    const r = runLottery([chore("A"), chore("B")], [person("p1", ["B"]), person("p2", ["B"], "A")], "s2");
    // Whoever loses B must take A; if p2 loses, they can't (veto) -> unassigned.
    const m = byPerson(r);
    if (m.p1.choreId === "B") {
      expect(r.unassigned).toEqual(["p2"]);
    } else {
      expect(m.p1.choreId).toBe("A");
    }
    for (const a of r.assignments) expect(!(a.participantId === "p2" && a.choreId === "A")).toBe(true);
  });

  it("handles 100 people efficiently and gives each at most one chore", () => {
    const chores = Array.from({ length: 12 }, (_, i) => chore(`c${i}`, 9));
    const people = Array.from({ length: 100 }, (_, i) =>
      person(`p${i}`, [`c${i % 3}`, `c${(i + 1) % 12}`, `c${(i + 5) % 12}`], `c${(i + 7) % 12}`),
    );
    const r = runLottery(chores, people, "big");
    const ids = r.assignments.map((a) => a.participantId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length + r.unassigned.length).toBe(100);
    for (const a of r.assignments) {
      expect(people.find((p) => p.id === a.participantId)!.veto).not.toBe(a.choreId);
    }
    const counts: Record<string, number> = {};
    for (const a of r.assignments) counts[a.choreId] = (counts[a.choreId] ?? 0) + 1;
    for (const n of Object.values(counts)) expect(n).toBeLessThanOrEqual(9);
  });
});
