import { describe, expect, it } from "vitest";
import {
  buildMemorandum,
  compareOffers,
  latestOffers,
  memorandumText,
  sliderBounds,
} from "../src/lib/settlement";
import { demoWorkspace } from "../src/lib/demo";
import type { SettlementOffer } from "../src/lib/types";

const applicant: SettlementOffer = {
  id: 1,
  caseId: 1,
  party: "applicant",
  date: "2026-09-28",
  channel: "Lawyer communication",
  monthlyAmount: 18000,
  lumpSum: null,
  assetSplitPct: 40,
};
const respondent: SettlementOffer = {
  id: 2,
  caseId: 1,
  party: "respondent",
  date: "2026-10-02",
  channel: "Mediation session",
  monthlyAmount: 12000,
  lumpSum: 500000,
  assetSplitPct: 25,
};

describe("settlement negotiation", () => {
  it("picks the latest offer for each party", () => {
    const older = { ...applicant, id: 0, date: "2026-09-01" };
    const newer = { ...applicant, id: 3, date: "2026-10-05" };
    const { applicant: a } = latestOffers([older, respondent, newer]);
    expect(a?.id).toBe(3);
  });

  it("breaks same-date ties by the newest record", () => {
    const { applicant: a } = latestOffers([applicant, { ...applicant, id: 9 }]);
    expect(a?.id).toBe(9);
  });

  it("keeps absent terms apart from known zeros", () => {
    const lump = compareOffers(applicant, respondent).find(
      (r) => r.key === "lumpSum",
    )!;
    expect(lump.applicant).toBeNull();
    expect(lump.respondent).toBe(500000);
    expect(lump.delta).toBeNull();
    expect(lump.state).toBe("respondent-only");
  });

  it("computes deltas only when both sides offered the term", () => {
    const rows = compareOffers(applicant, respondent);
    expect(rows.find((r) => r.key === "monthlyAmount")).toMatchObject({
      delta: 6000,
      state: "apart",
    });
    expect(rows.find((r) => r.key === "assetSplitPct")).toMatchObject({
      delta: 15,
      state: "apart",
    });
  });

  it("marks matching and unaddressed terms", () => {
    const rows = compareOffers(
      { monthlyAmount: 12000, lumpSum: null, assetSplitPct: null },
      { monthlyAmount: 12000, lumpSum: null, assetSplitPct: null },
    );
    expect(rows.find((r) => r.key === "monthlyAmount")?.state).toBe("match");
    expect(rows.find((r) => r.key === "assetSplitPct")?.state).toBe(
      "unaddressed",
    );
  });

  it("reconciles the demonstration positions", () => {
    const demo = demoWorkspace();
    const { applicant: a, respondent: r } = latestOffers(demo.offers);
    const rows = compareOffers(a, r);
    expect(rows.find((x) => x.key === "monthlyAmount")).toMatchObject({
      delta: 6000,
    });
    expect(rows.find((x) => x.key === "assetSplitPct")).toMatchObject({
      delta: 15,
    });
  });
});

describe("memorandum draft", () => {
  it("turns only agreed terms into clauses", () => {
    const draft = buildMemorandum({
      caseTitle: "Meera’s maintenance case",
      userName: "Meera",
      asOf: "2026-10-09",
      terms: demoWorkspace().terms,
    });
    expect(draft.agreed.map((t) => t.title)).toEqual([
      "Children’s education and medical costs",
      "Payment mode and timing",
    ]);
    expect(draft.unresolved.map((t) => t.title)).toEqual([
      "Monthly maintenance amount",
      "Lump-sum settlement",
      "Division of marital assets",
    ]);
  });

  it("keeps the draft framing and disclaimer without agreed terms", () => {
    const draft = buildMemorandum({
      caseTitle: "Case",
      userName: "Meera",
      asOf: "2026-10-09",
      terms: [],
    });
    expect(draft.kicker).toContain("NOT LEGAL ADVICE");
    expect(draft.disclaimer).toContain("not legal advice");
    expect(draft.agreed).toEqual([]);
  });

  it("renders a text draft with clauses and unresolved matters", () => {
    const draft = buildMemorandum({
      caseTitle: "Case",
      userName: "Meera",
      asOf: "2026-10-09",
      terms: demoWorkspace().terms,
    });
    const text = memorandumText(draft);
    expect(text).toContain("1. Children’s education and medical costs");
    expect(text).toContain("Matters to be resolved");
    expect(text).toContain("Disputed");
    expect(text).toContain("not legal advice");
  });

  it("keeps slider bounds within safe ranges", () => {
    expect(sliderBounds.assetSplitPct.max).toBe(100);
    expect(sliderBounds.monthlyAmount.step).toBeGreaterThan(0);
    expect(sliderBounds.lumpSum.step).toBeGreaterThan(0);
    expect(sliderBounds.monthlyAmount.min).toBe(0);
  });
});
