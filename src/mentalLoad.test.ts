import { describe, expect, it } from "vitest";
import {
  LOAD_ITEM_TYPES,
  RECOMMENDATIONS,
  classifyBrainDump,
  normalizeMentalLoad,
  type LoadItem,
} from "./mentalLoad";

const ADHD_DUMP = `ok brain dump time
- pay the electric bill, it's due today
- I'm really worried about the doctor appointment results
call mom back, haven't talked in weeks
should I switch jobs or not, keep going back and forth
groceries: milk eggs coffee
someday I want to learn the piano
build the new landing page for the app`;

describe("classifyBrainDump (deterministic fallback)", () => {
  it("splits a messy ADHD-style dump into multiple distinct items", () => {
    const { items } = classifyBrainDump(ADHD_DUMP);
    expect(items.length).toBeGreaterThanOrEqual(6);
  });

  it("gives every item a non-empty source quote (core trust invariant)", () => {
    const { items } = classifyBrainDump(ADHD_DUMP);
    for (const item of items) {
      expect(item.sourceQuote.trim().length).toBeGreaterThan(0);
    }
  });

  it("only ever emits types/recommendations that match the DB enums", () => {
    const { items } = classifyBrainDump(ADHD_DUMP);
    for (const item of items) {
      expect(LOAD_ITEM_TYPES).toContain(item.type);
      expect(RECOMMENDATIONS).toContain(item.recommendation);
      expect(item.emotionalWeight).toBeGreaterThanOrEqual(0);
      expect(item.emotionalWeight).toBeLessThanOrEqual(5);
    }
  });

  it("classifies a worry as type 'worry' → clarify, with heavier weight", () => {
    const worry = find(
      classifyBrainDump(ADHD_DUMP).items,
      /doctor appointment results/,
    );
    expect(worry.type).toBe("worry");
    expect(worry.recommendation).toBe("clarify");
    expect(worry.emotionalWeight).toBeGreaterThanOrEqual(3);
  });

  it("detects a finance item", () => {
    const bill = find(classifyBrainDump(ADHD_DUMP).items, /electric bill/);
    expect(bill.type).toBe("finance");
  });

  it("routes an urgent ('due today') item to do-now", () => {
    const bill = find(classifyBrainDump(ADHD_DUMP).items, /electric bill/);
    expect(bill.recommendation).toBe("do-now");
  });

  it("parks a 'someday' item", () => {
    const piano = find(classifyBrainDump(ADHD_DUMP).items, /piano/);
    expect(piano.type).toBe("someday");
    expect(piano.recommendation).toBe("park");
  });

  it("returns no items for empty or whitespace input", () => {
    expect(classifyBrainDump("").items).toHaveLength(0);
    expect(classifyBrainDump("   \n  \n ").items).toHaveLength(0);
  });

  it("truncates a very long line in the title but keeps the full source quote", () => {
    const long = "remember to ".concat("x".repeat(200));
    const { items } = classifyBrainDump(long);
    expect(items[0].title.length).toBeLessThanOrEqual(120);
    expect(items[0].sourceQuote.length).toBeGreaterThan(120);
  });
});

describe("normalizeMentalLoad (defensive AI-output parser)", () => {
  const validItem: LoadItem = {
    id: "load-1",
    title: "Pay electric bill",
    type: "finance",
    recommendation: "do-now",
    emotionalWeight: 2,
    sourceQuote: "pay the electric bill, it's due today",
  };

  it("accepts a well-formed result", () => {
    const out = normalizeMentalLoad({ items: [validItem] });
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.result.items).toHaveLength(1);
  });

  it("rejects a non-object or missing items array", () => {
    expect(normalizeMentalLoad(null).ok).toBe(false);
    expect(normalizeMentalLoad({}).ok).toBe(false);
    expect(normalizeMentalLoad({ items: "nope" }).ok).toBe(false);
  });

  it("rejects an item with an out-of-enum type", () => {
    const bad = { ...validItem, type: "made-up" };
    expect(normalizeMentalLoad({ items: [bad] }).ok).toBe(false);
  });

  it("rejects an item missing its source quote", () => {
    const bad = { ...validItem, sourceQuote: "" };
    expect(normalizeMentalLoad({ items: [bad] }).ok).toBe(false);
  });

  it("clamps emotional weight into 0–5", () => {
    const out = normalizeMentalLoad({
      items: [{ ...validItem, emotionalWeight: 99 }],
    });
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.result.items[0].emotionalWeight).toBe(5);
  });

  it("defaults a non-numeric weight to 0", () => {
    const out = normalizeMentalLoad({
      items: [{ ...validItem, emotionalWeight: "heavy" }],
    });
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.result.items[0].emotionalWeight).toBe(0);
  });
});

function find(items: LoadItem[], pattern: RegExp): LoadItem {
  const match = items.find((item) => pattern.test(item.sourceQuote));
  if (!match) {
    throw new Error(`No item matched ${pattern}`);
  }
  return match;
}
