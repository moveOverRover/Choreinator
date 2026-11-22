import { describe, expect, it } from "vitest";
import { buildBoard, nameMatches, norm, parseDate, parseFormRows, weekStartOf, type BoardPerson } from "./tracking";

describe("tracking helpers", () => {
  it("normalizes chore labels", () => {
    expect(norm("Kitchen Stocking & Prep")).toBe(norm("KITCHEN STOCKING AND PREP"));
  });

  it("parses the form's date formats", () => {
    expect(parseDate("8/31/2026")).toBe("2026-08-31");
    expect(parseDate("9/4/2026 23:31:05")).toBe("2026-09-04");
    expect(parseDate("2026-02-01")).toBe("2026-02-01");
    expect(parseDate("nope")).toBeUndefined();
  });

  it("uses Sunday-start weeks like the Chore Tracking tab", () => {
    expect(weekStartOf("2026-02-01")).toBe("2026-02-01"); // Sunday
    expect(weekStartOf("2026-02-07")).toBe("2026-02-01"); // Saturday
    expect(weekStartOf("2026-02-08")).toBe("2026-02-08");
  });

  it("matches typed names loosely", () => {
    expect(nameMatches("kait", { name: "Kaitlyn Smith", formName: "" })).toBe(true);
    expect(nameMatches("Melissa", { name: "Melissa White", formName: "" })).toBe(true);
    expect(nameMatches("G", { name: "Gwen", formName: "G" })).toBe(true);
    expect(nameMatches("Gia", { name: "Gwen", formName: "G" })).toBe(false);
  });
});

describe("parseFormRows + buildBoard", () => {
  const rows = [
    [
      "Timestamp",
      "Score",
      "What is your name? ",
      "What is your chore?",
      "What day did you finish your chore?",
      "Upload a picture of your finished chore ",
      "Is there anything we should know about your chore this week?",
    ],
    ["8/31/2026 14:46:11", "", "Kait", "KITCHEN CLEANING", "8/31/2026", "x", ""],
    ["9/3/2026 18:15:59", "", "Melissa", "CORNER LOUNGE", "9/3/2026", "x", ""],
    ["9/10/2026 10:00:00", "", "Sam", "KITCHEN CLEANING", "9/10/2026", "x", ""],
  ];

  const people: BoardPerson[] = [
    { email: "k@x", name: "Kait", formName: "", choreName: "Kitchen", formLabel: "KITCHEN CLEANING", shared: false },
    { email: "m@x", name: "Melissa", formName: "", choreName: "Corner Lounge", formLabel: "CORNER LOUNGE", shared: false },
  ];

  it("finds the right columns and builds weekly done/missed", () => {
    const responses = parseFormRows(rows);
    expect(responses).toHaveLength(3);
    const weeks = buildBoard(people, responses, "2026-08-30", "2026-09-12");
    expect(weeks.map((w) => w.weekStart)).toEqual(["2026-08-30", "2026-09-06"]);
    expect(weeks[0].cells["k@x"].done).toBe(true);
    expect(weeks[0].cells["m@x"].done).toBe(true);
    // Week 2: someone submitted KITCHEN CLEANING; chore isn't shared so it counts for Kait.
    expect(weeks[1].cells["k@x"].done).toBe(true);
    expect(weeks[1].cells["m@x"].done).toBe(false);
  });

  it("requires a name match on shared chores", () => {
    const shared = people.map((p) => ({ ...p, shared: p.email === "k@x" }));
    const weeks = buildBoard(shared, parseFormRows(rows), "2026-09-06", "2026-09-12");
    expect(weeks[0].cells["k@x"].done).toBe(false); // "Sam" isn't Kait
  });
});
