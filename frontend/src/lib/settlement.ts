import type { ChecklistStatus, SettlementOffer, SettlementTerm } from "./types";

export const sliderBounds = {
  monthlyAmount: { min: 0, max: 200000, step: 500 },
  lumpSum: { min: 0, max: 10000000, step: 10000 },
  assetSplitPct: { min: 0, max: 100, step: 1 },
} as const;

export type OfferValues = Pick<
  SettlementOffer,
  "monthlyAmount" | "lumpSum" | "assetSplitPct"
>;

export function latestOffers(offers: SettlementOffer[]): {
  applicant?: SettlementOffer;
  respondent?: SettlementOffer;
} {
  const latest = (party: SettlementOffer["party"]) =>
    offers
      .filter((o) => o.party === party)
      .sort((a, b) =>
        a.date === b.date ? b.id - a.id : b.date.localeCompare(a.date),
      )[0];
  return {
    applicant: latest("applicant"),
    respondent: latest("respondent"),
  };
}

export type TermKey = "monthlyAmount" | "lumpSum" | "assetSplitPct";

export type TermComparison = {
  key: TermKey;
  label: string;
  applicant: number | null;
  respondent: number | null;
  delta: number | null;
  state:
    "match" | "apart" | "applicant-only" | "respondent-only" | "unaddressed";
};

// A term left out of an offer stays null. Absence is never read as a known
// zero and never produces a gap, so a missing reply cannot look like agreement.
export function compareOffers(
  applicant?: OfferValues,
  respondent?: OfferValues,
): TermComparison[] {
  const terms: [TermKey, string][] = [
    ["monthlyAmount", "Monthly alimony"],
    ["lumpSum", "Lump-sum settlement"],
    ["assetSplitPct", "Asset share"],
  ];
  return terms.map(([key, label]) => {
    const a = applicant?.[key] ?? null;
    const r = respondent?.[key] ?? null;
    const state: TermComparison["state"] =
      a === null && r === null
        ? "unaddressed"
        : r === null
          ? "applicant-only"
          : a === null
            ? "respondent-only"
            : a === r
              ? "match"
              : "apart";
    return {
      key,
      label,
      applicant: a,
      respondent: r,
      delta: a !== null && r !== null ? a - r : null,
      state,
    };
  });
}

export function statusLabel(status: ChecklistStatus): string {
  return status === "agreed"
    ? "Agreed"
    : status === "disputed"
      ? "Disputed"
      : "Pending review";
}

export type MemorandumDraft = {
  title: string;
  kicker: string;
  parties: string;
  caseTitle: string;
  preparedOn: string;
  agreed: { title: string; detail: string }[];
  unresolved: { title: string; detail: string; status: ChecklistStatus }[];
  disclaimer: string;
};

// Only terms the user marked as agreed become draft clauses. Disputed and
// pending terms stay listed as open matters instead of being merged into text.
export function buildMemorandum(input: {
  caseTitle: string;
  userName: string;
  asOf: string;
  terms: SettlementTerm[];
}): MemorandumDraft {
  const agreed = input.terms.filter((t) => t.status === "agreed");
  const unresolved = input.terms.filter((t) => t.status !== "agreed");
  return {
    title: "Memorandum of Understanding",
    kicker: "DRAFT FOR REVIEW — NOT LEGAL ADVICE",
    parties: `Between ${input.userName} (applicant) and the respondent`,
    caseTitle: input.caseTitle,
    preparedOn: input.asOf,
    agreed: agreed.map((t) => ({ title: t.title, detail: t.detail })),
    unresolved: unresolved.map((t) => ({
      title: t.title,
      detail: t.detail,
      status: t.status,
    })),
    disclaimer:
      "This draft was generated from session records as a preparation aid. It is not legal advice, has no legal effect, and must be reviewed, settled and signed under the guidance of a qualified advocate before any reliance.",
  };
}

export function memorandumText(draft: MemorandumDraft): string {
  const lines: string[] = [
    draft.kicker,
    draft.title,
    draft.parties,
    `Case: ${draft.caseTitle}`,
    `Prepared: ${draft.preparedOn}`,
    "",
  ];
  if (draft.agreed.length) {
    lines.push("Agreed points");
    draft.agreed.forEach((t, i) =>
      lines.push(`${i + 1}. ${t.title}${t.detail ? ` — ${t.detail}` : ""}`),
    );
  } else lines.push("No points are marked as agreed yet.");
  lines.push("");
  if (draft.unresolved.length) {
    lines.push("Matters to be resolved");
    draft.unresolved.forEach((t) =>
      lines.push(
        `- ${t.title} (${statusLabel(t.status)})${t.detail ? ` — ${t.detail}` : ""}`,
      ),
    );
  }
  lines.push("", draft.disclaimer);
  return lines.join("\n");
}
