// Starting chore list, taken from the house's "Chore Sign Up October 2026" doc.
// Only used to fill an empty Chores tab the first time the app runs; after that
// admins edit chores in the app (or directly in the sheet).

export const DEFAULT_CHORES: { name: string; formLabel: string; description: string }[] = [
  {
    name: "Kitchen",
    formLabel: "KITCHEN CLEANING",
    description:
      "Clean stove top & range hood/backsplash. Organize container cupboard as needed. Sanitize & wipe out under the sink and common cupboards (as needed). Wipe down kitchen counters. Clean the outside of the dishwasher and oven.",
  },
  {
    name: "Kitchen Prep",
    formLabel: "KITCHEN STOCKING AND PREP",
    description:
      "Organize the pots & pans cupboard and rack. Clean butcher block (wood island under the pot rack) and dispose of common food on it as needed (garlic, onions, common bread). Refill spices in spice rack. Clean ice machine.",
  },
  {
    name: "Kitchen Fridge",
    formLabel: "KITCHEN FRIDGE",
    description:
      "Remove all contents one shelf at a time. Empty anything expired, wash or dispose of empty containers. Make sure food is stored according to fridge policy. Consolidate & downsize containers. Wipe down inside, outer door and handle.",
  },
  {
    name: "Kitchen & Dining Room Floor",
    formLabel: "KITCHEN & DINING ROOM FLOOR",
    description:
      "Wipe down dining room tables & bar. Put personal items from the dining room in the lost & found. Sweep & mop the kitchen floor and dining room floor. Vacuum carpet in funk lounge.",
  },
  {
    name: "Pantry",
    formLabel: "PANTRY",
    description:
      "Clean out Sissy fridge and remove expired food. Wipe and tidy the shelves (as needed). Mop pantry floor (as needed). Tidy pantry and organize recycling area.",
  },
  {
    name: "Laundry Room / Dish Towels",
    formLabel: "LAUNDRY ROOM / DISH TOWELS",
    description:
      "Wash with sanitary setting with bleach. Keep the kitchen towel drawer stocked & neatly folded (wash whenever needed, not just once a week). Fold and separate kitchen, bathroom, microfiber and rags; keep towel shelf organized.",
  },
  {
    name: "Front Entrance",
    formLabel: "FRONT ENTRANCE",
    description:
      "Sweep & mop tile in front entrance. Sweep & mop front stoop as needed. Tidy front entrance & put personal items in the lost & found. Vacuum front stairway (every week). Empty vacuum.",
  },
  {
    name: "Funk Lounge",
    formLabel: "FUNK LOUNGE",
    description:
      "Tidy funk lounge (books, games, records, pillows, blankets, dishes). Wipe coffee & side tables, fold blankets. Vacuum couches as needed. Sweep & mop floors (weekly!). Put personal items in the lost & found.",
  },
  {
    name: "Corner Lounge",
    formLabel: "CORNER LOUNGE",
    description:
      "Tidy corner lounge (books, games, records, pillows, blankets, dishes). Wipe coffee & side tables, fold blankets. Vacuum couches as needed. Sweep & mop floors (weekly!). Put personal items in the lost & found.",
  },
  {
    name: "Coffee Nook & Hallways",
    formLabel: "COFFEE NOOK & HALLWAYS",
    description:
      "Wipe down the entire counter area (under machines) & sink. Dust and organize shelves as needed. Empty garbage. Tidy coat room & front tables. Sweep hallways weekly & mop hallways bi-weekly.",
  },
  {
    name: "Guest Washrooms",
    formLabel: "GUEST WASHROOMS",
    description:
      "Sweep & mop floors. Sanitize & wipe down sinks, counters, tub, shower, toilets & mirrors. Empty garbage. Keep soap & toilet paper stocked. Clean bathroom towels.",
  },
];
