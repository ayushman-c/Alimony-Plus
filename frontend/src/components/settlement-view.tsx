"use client";
import { useEffect, useId, useState } from "react";
import { Copy, Download, Plus, Save, HeartHandshake } from "lucide-react";
import { useWorkspace } from "./workspace-provider";
import { Badge, CaseSelector, Empty, Modal, PageHeading } from "./ui";
import { dateLabel, downloadJson, money } from "@/lib/ledger";
import {
  buildMemorandum,
  compareOffers,
  latestOffers,
  memorandumText,
  sliderBounds,
  statusLabel,
  type TermComparison,
  type TermKey,
} from "@/lib/settlement";
import type { ChecklistStatus, SettlementOffer } from "@/lib/types";

type PositionTerm = { value: number; included: boolean };
type Position = {
  monthlyAmount: PositionTerm;
  lumpSum: PositionTerm;
  assetSplitPct: PositionTerm;
};

const termValue = (key: TermKey, offer?: SettlementOffer): string => {
  const v = offer?.[key] ?? null;
  if (v === null) return "Not in this offer";
  return key === "assetSplitPct" ? `${v}% share` : money(v);
};

const deltaText = (c: TermComparison) =>
  c.key === "assetSplitPct"
    ? `${Math.abs(c.delta ?? 0)} points apart`
    : `${money(Math.abs(c.delta ?? 0))} apart`;

export function SettlementView({
  onAddOffer,
  onAddTerm,
}: {
  onAddOffer: () => void;
  onAddTerm: () => void;
}) {
  const {
    data,
    demo,
    asOf,
    name,
    selectedCase,
    setSelectedCase,
    setData,
    setNotice,
  } = useWorkspace();
  const monthlyId = useId();
  const lumpId = useId();
  const assetId = useId();
  const [confirmExport, setConfirmExport] = useState(false);
  const [position, setPosition] = useState<Position>(() => ({
    monthlyAmount: {
      value: latestOffers(data.offers).applicant?.monthlyAmount ?? 15000,
      included:
        latestOffers(data.offers).applicant?.monthlyAmount !== null &&
        latestOffers(data.offers).applicant?.monthlyAmount !== undefined,
    },
    lumpSum: {
      value: latestOffers(data.offers).applicant?.lumpSum ?? 500000,
      included:
        latestOffers(data.offers).applicant?.lumpSum !== null &&
        latestOffers(data.offers).applicant?.lumpSum !== undefined,
    },
    assetSplitPct: {
      value: latestOffers(data.offers).applicant?.assetSplitPct ?? 50,
      included:
        latestOffers(data.offers).applicant?.assetSplitPct !== null &&
        latestOffers(data.offers).applicant?.assetSplitPct !== undefined,
    },
  }));

  const offers = data.offers.filter(
    (o) => !selectedCase || o.caseId === selectedCase,
  );
  const terms = data.terms.filter(
    (t) => !selectedCase || t.caseId === selectedCase,
  );
  const latest = latestOffers(offers);
  const comparisons = compareOffers(latest.applicant, latest.respondent);
  const caseRecord = data.cases.find(
    (c) => c.id === (selectedCase || offers[0]?.caseId),
  );
  const draft = buildMemorandum({
    caseTitle: caseRecord?.title || "Case not recorded",
    userName: demo ? "Meera" : name,
    asOf,
    terms,
  });

  // Follow the latest applicant offer so the sliders always start from the
  // committed position, including after a save or a case switch.
  const applicantOffer = latest.applicant;
  useEffect(() => {
    setPosition({
      monthlyAmount: {
        value: applicantOffer?.monthlyAmount ?? 15000,
        included: applicantOffer?.monthlyAmount != null,
      },
      lumpSum: {
        value: applicantOffer?.lumpSum ?? 500000,
        included: applicantOffer?.lumpSum != null,
      },
      assetSplitPct: {
        value: applicantOffer?.assetSplitPct ?? 50,
        included: applicantOffer?.assetSplitPct != null,
      },
    });
  }, [applicantOffer]);

  const positionValues = {
    monthlyAmount: position.monthlyAmount.included
      ? position.monthlyAmount.value
      : null,
    lumpSum: position.lumpSum.included ? position.lumpSum.value : null,
    assetSplitPct: position.assetSplitPct.included
      ? position.assetSplitPct.value
      : null,
  };

  function toggleTerm(key: keyof Position, on: boolean) {
    setPosition((p) => ({ ...p, [key]: { ...p[key], included: on } }));
  }
  function changeTerm(key: keyof Position, value: number) {
    setPosition((p) => ({ ...p, [key]: { ...p[key], value } }));
  }
  function savePosition() {
    if (
      positionValues.monthlyAmount === null &&
      positionValues.lumpSum === null &&
      positionValues.assetSplitPct === null
    ) {
      setNotice(
        "Include at least one term in your position before saving. A blank term is never read as zero.",
      );
      return;
    }
    const caseId = selectedCase || offers[0]?.caseId || data.cases[0]?.id || 0;
    setData((prev) => ({
      ...prev,
      offers: [
        ...prev.offers,
        {
          id: Date.now(),
          caseId,
          party: "applicant" as const,
          date: asOf,
          channel: "Working position" as const,
          monthlyAmount: positionValues.monthlyAmount,
          lumpSum: positionValues.lumpSum,
          assetSplitPct: positionValues.assetSplitPct,
          notes: "Saved from the negotiation sliders.",
        },
      ],
    }));
    setNotice(
      "Your working position is saved in this session. It is not sent to anyone.",
    );
  }
  function setStatus(id: number, status: ChecklistStatus) {
    setData((prev) => ({
      ...prev,
      terms: prev.terms.map((t) => (t.id === id ? { ...t, status } : t)),
    }));
  }
  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(memorandumText(draft));
      setNotice(
        "Draft copied. Review it with your advocate before sharing anything.",
      );
    } catch {
      setNotice(
        "Copying was blocked by your browser. Use Export MoU for a file instead.",
      );
    }
  }
  function exportData() {
    downloadJson("alimony-plus-settlement-mou.json", {
      schemaVersion: "1.0",
      synthetic: demo,
      asOf,
      case: caseRecord ? { id: caseRecord.id, title: caseRecord.title } : null,
      offers,
      agreedTerms: draft.agreed,
      unresolvedTerms: draft.unresolved,
      memorandumText: memorandumText(draft),
      eligibleForLegalRetrieval: false,
      limitations: [
        "Session-only negotiation records; not saved to a case service.",
        "Draft for advocate review; not legal advice and not a binding agreement.",
        "Figures are user-entered positions; absent terms are null, never zero.",
      ],
    });
    setConfirmExport(false);
  }
  function gapFor(key: TermKey, value: number | null): string {
    const r = latest.respondent?.[key] ?? null;
    if (value === null)
      return r === null
        ? "Neither side has offered this term"
        : "Respondent has offered this term";
    if (r === null)
      return latest.respondent
        ? "Respondent has not offered this term"
        : "No respondent offer to compare yet";
    if (value === r) return "Matches the respondent’s offer";
    const gap = Math.abs(value - r);
    return key === "assetSplitPct"
      ? `${gap} points from the respondent’s offer`
      : `${money(gap)} from the respondent’s offer`;
  }

  return (
    <>
      <PageHeading
        eyebrow="SETTLEMENT & MEDIATION"
        title="Compare, adjust, and prepare."
        description="Organise both sides’ positions, track what is agreed, and prepare a draft for your advocate."
      >
        <button className="button secondary" onClick={onAddTerm}>
          <Plus size={16} />
          Add term
        </button>
        <button className="button primary" onClick={onAddOffer}>
          <Plus size={16} />
          Record offer
        </button>
      </PageHeading>
      <div className="callout mb-6">
        <HeartHandshake size={18} />
        <span>
          This workspace records offers exchanged through your lawyer or a
          mediator. It never contacts the other party, and nothing here is sent
          anywhere. Settlement records live only in this session and clear on
          refresh.
        </span>
      </div>
      {!data.cases.length ? (
        <Empty title="Create a case first">
          Add a case before recording settlement positions.
        </Empty>
      ) : (
        <>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Latest positions, side by side</h2>
                <p>
                  The newest offer from each side. Absent terms are never
                  treated as zero.
                </p>
              </div>
              <CaseSelector
                selected={selectedCase}
                setSelected={setSelectedCase}
              />
            </div>
            <div className="split-panes">
              <div className="offer-pane pane-applicant">
                <div className="pane-head">
                  <strong>Your latest offer</strong>
                  <Badge>Applicant</Badge>
                </div>
                <p className="pane-meta">
                  {latest.applicant
                    ? `${dateLabel(latest.applicant.date)} · ${latest.applicant.channel}`
                    : "No offer recorded yet"}
                </p>
                <dl className="pane-terms">
                  {comparisons.map((c) => (
                    <div className="pane-term" key={c.key}>
                      <dt>{c.label}</dt>
                      <dd>{termValue(c.key, latest.applicant)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="offer-pane pane-respondent">
                <div className="pane-head">
                  <strong>Respondent’s latest offer</strong>
                  <Badge tone="neutral">Respondent</Badge>
                </div>
                <p className="pane-meta">
                  {latest.respondent
                    ? `${dateLabel(latest.respondent.date)} · ${latest.respondent.channel}`
                    : "No offer recorded yet"}
                </p>
                <dl className="pane-terms">
                  {comparisons.map((c) => (
                    <div className="pane-term" key={c.key}>
                      <dt>{c.label}</dt>
                      <dd>{termValue(c.key, latest.respondent)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
            <ul
              className="delta-summary"
              aria-label="Differences between the two latest offers"
            >
              {comparisons.map((c) => (
                <li key={c.key}>
                  <span>{c.label}:</span>
                  {c.state === "match" ? (
                    <Badge>Match</Badge>
                  ) : c.state === "apart" ? (
                    <Badge tone="amber">{deltaText(c)}</Badge>
                  ) : c.state === "applicant-only" ? (
                    <Badge tone="neutral">Only your offer</Badge>
                  ) : c.state === "respondent-only" ? (
                    <Badge tone="neutral">Only respondent’s offer</Badge>
                  ) : (
                    <Badge tone="neutral">Not addressed</Badge>
                  )}
                </li>
              ))}
            </ul>
          </section>
          <section className="panel mt-6">
            <div className="panel-heading">
              <div>
                <h2>Model your position</h2>
                <p>
                  Adjust each term and see the live gap with the respondent’s
                  latest offer.
                </p>
              </div>
            </div>
            <div className="slider-grid">
              <div className="slider-block">
                <div className="slider-head">
                  <label htmlFor={monthlyId}>Monthly alimony (₹)</label>
                  <output htmlFor={monthlyId} className="slider-readout">
                    {position.monthlyAmount.included
                      ? `${money(position.monthlyAmount.value)} / month`
                      : "Not in this offer"}
                  </output>
                </div>
                <input
                  id={monthlyId}
                  type="range"
                  className="negotiation-slider"
                  min={sliderBounds.monthlyAmount.min}
                  max={sliderBounds.monthlyAmount.max}
                  step={sliderBounds.monthlyAmount.step}
                  value={
                    position.monthlyAmount.included
                      ? position.monthlyAmount.value
                      : sliderBounds.monthlyAmount.min
                  }
                  disabled={!position.monthlyAmount.included}
                  aria-valuetext={
                    position.monthlyAmount.included
                      ? `${money(position.monthlyAmount.value)} per month`
                      : "Not part of this offer"
                  }
                  onChange={(e) =>
                    changeTerm("monthlyAmount", Number(e.currentTarget.value))
                  }
                />
                <div className="slider-foot">
                  <label className="slider-include">
                    <input
                      type="checkbox"
                      checked={position.monthlyAmount.included}
                      onChange={(e) =>
                        toggleTerm("monthlyAmount", e.currentTarget.checked)
                      }
                    />
                    Part of my position
                  </label>
                  <span className="slider-gap">
                    {gapFor("monthlyAmount", positionValues.monthlyAmount)}
                  </span>
                </div>
              </div>
              <div className="slider-block">
                <div className="slider-head">
                  <label htmlFor={lumpId}>Lump-sum settlement (₹)</label>
                  <output htmlFor={lumpId} className="slider-readout">
                    {position.lumpSum.included
                      ? `${money(position.lumpSum.value)} one-time`
                      : "Not in this offer"}
                  </output>
                </div>
                <input
                  id={lumpId}
                  type="range"
                  className="negotiation-slider"
                  min={sliderBounds.lumpSum.min}
                  max={sliderBounds.lumpSum.max}
                  step={sliderBounds.lumpSum.step}
                  value={
                    position.lumpSum.included
                      ? position.lumpSum.value
                      : sliderBounds.lumpSum.min
                  }
                  disabled={!position.lumpSum.included}
                  aria-valuetext={
                    position.lumpSum.included
                      ? `${money(position.lumpSum.value)} one time`
                      : "Not part of this offer"
                  }
                  onChange={(e) =>
                    changeTerm("lumpSum", Number(e.currentTarget.value))
                  }
                />
                <div className="slider-foot">
                  <label className="slider-include">
                    <input
                      type="checkbox"
                      checked={position.lumpSum.included}
                      onChange={(e) =>
                        toggleTerm("lumpSum", e.currentTarget.checked)
                      }
                    />
                    Part of my position
                  </label>
                  <span className="slider-gap">
                    {gapFor("lumpSum", positionValues.lumpSum)}
                  </span>
                </div>
              </div>
              <div className="slider-block">
                <div className="slider-head">
                  <label htmlFor={assetId}>Asset share (%)</label>
                  <output htmlFor={assetId} className="slider-readout">
                    {position.assetSplitPct.included
                      ? `${position.assetSplitPct.value}% of marital assets`
                      : "Not in this offer"}
                  </output>
                </div>
                <input
                  id={assetId}
                  type="range"
                  className="negotiation-slider"
                  min={sliderBounds.assetSplitPct.min}
                  max={sliderBounds.assetSplitPct.max}
                  step={sliderBounds.assetSplitPct.step}
                  value={
                    position.assetSplitPct.included
                      ? position.assetSplitPct.value
                      : sliderBounds.assetSplitPct.min
                  }
                  disabled={!position.assetSplitPct.included}
                  aria-valuetext={
                    position.assetSplitPct.included
                      ? `${position.assetSplitPct.value} percent of marital assets`
                      : "Not part of this offer"
                  }
                  onChange={(e) =>
                    changeTerm("assetSplitPct", Number(e.currentTarget.value))
                  }
                />
                <div className="slider-foot">
                  <label className="slider-include">
                    <input
                      type="checkbox"
                      checked={position.assetSplitPct.included}
                      onChange={(e) =>
                        toggleTerm("assetSplitPct", e.currentTarget.checked)
                      }
                    />
                    Part of my position
                  </label>
                  <span className="slider-gap">
                    {gapFor("assetSplitPct", positionValues.assetSplitPct)}
                  </span>
                </div>
              </div>
            </div>
            <div className="slider-footer">
              <p className="small muted">
                Saving stores your position as a new working offer in this
                session, dated {dateLabel(asOf)}. It is never sent to the
                respondent.
              </p>
              <button
                className="button primary"
                disabled={!data.cases.length}
                onClick={savePosition}
              >
                <Save size={16} />
                Save my position
              </button>
            </div>
          </section>
          <section className="panel mt-6">
            <div className="panel-heading">
              <div>
                <h2>Agreement checklist</h2>
                <p>
                  Mark each term as talks progress. This record stays with you.
                </p>
              </div>
              <button className="button secondary" onClick={onAddTerm}>
                <Plus size={16} />
                Add term
              </button>
            </div>
            {terms.length ? (
              <ul className="term-list">
                {terms.map((t) => (
                  <li className="term-item" key={t.id}>
                    <div className="term-text">
                      <strong>{t.title}</strong>
                      {t.detail && <p>{t.detail}</p>}
                    </div>
                    <div
                      className="status-toggle"
                      role="group"
                      aria-label={`Status for ${t.title}`}
                    >
                      {(["agreed", "disputed", "pending"] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          aria-pressed={t.status === s}
                          onClick={() => setStatus(t.id, s)}
                        >
                          {statusLabel(s)}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty
                title="No terms yet"
                action={
                  <button className="button primary" onClick={onAddTerm}>
                    <Plus size={16} />
                    Add term
                  </button>
                }
              >
                Add the points under discussion.
              </Empty>
            )}
          </section>
          {offers.length > 1 && (
            <section className="panel table-panel mt-6">
              <div className="panel-heading">
                <div>
                  <h2>Offer history</h2>
                  <p>
                    Each recorded round, newest first. A dash means the term is
                    not part of that offer.
                  </p>
                </div>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Party</th>
                      <th>Channel</th>
                      <th>Monthly</th>
                      <th>Lump sum</th>
                      <th>Assets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...offers]
                      .sort(
                        (a, b) => b.date.localeCompare(a.date) || b.id - a.id,
                      )
                      .map((o) => (
                        <tr key={o.id}>
                          <td>{dateLabel(o.date)}</td>
                          <td>
                            {o.party === "applicant"
                              ? "Applicant"
                              : "Respondent"}
                          </td>
                          <td>{o.channel}</td>
                          <td className="numeric">
                            {o.monthlyAmount === null
                              ? "—"
                              : money(o.monthlyAmount)}
                          </td>
                          <td className="numeric">
                            {o.lumpSum === null ? "—" : money(o.lumpSum)}
                          </td>
                          <td className="numeric">
                            {o.assetSplitPct === null
                              ? "—"
                              : `${o.assetSplitPct}%`}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          <section className="panel mt-6">
            <div className="panel-heading">
              <div>
                <h2>MoU draft preview</h2>
                <p>
                  Agreed points become draft clauses. Everything else stays
                  listed as unresolved.
                </p>
              </div>
            </div>
            <div className="mou-actions">
              <button className="button secondary" onClick={copyDraft}>
                <Copy size={16} />
                Copy draft
              </button>
              <button
                className="button secondary"
                disabled={!terms.length && !offers.length}
                onClick={() => setConfirmExport(true)}
              >
                <Download size={16} />
                Export MoU
              </button>
            </div>
            <div className="mou-document">
              <p className="mou-kicker">{draft.kicker}</p>
              <h3 className="mou-title">{draft.title}</h3>
              <p className="mou-meta">
                {draft.parties} · Case: {draft.caseTitle} · Prepared{" "}
                {dateLabel(draft.preparedOn)}
              </p>
              {draft.agreed.length ? (
                <ol className="mou-clauses">
                  {draft.agreed.map((t) => (
                    <li key={t.title}>
                      <strong>{t.title}</strong>
                      {t.detail && <p>{t.detail}</p>}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mou-empty">
                  No points are marked as agreed yet. Agreed checklist terms
                  appear here as draft clauses.
                </p>
              )}
              <h4 className="mou-subhead">Matters to be resolved</h4>
              {draft.unresolved.length ? (
                <ul className="mou-unresolved">
                  {draft.unresolved.map((t) => (
                    <li key={t.title}>
                      <strong>{t.title}</strong>
                      <span className="mou-status">
                        {statusLabel(t.status)}
                      </span>
                      {t.detail && <p>{t.detail}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mou-empty">
                  All recorded terms are marked as agreed.
                </p>
              )}
              <div className="mou-signatures">
                <div>
                  <span>Applicant</span>
                  <span className="mou-line" />
                  <small>Date</small>
                </div>
                <div>
                  <span>Respondent</span>
                  <span className="mou-line" />
                  <small>Date</small>
                </div>
                <div>
                  <span>Advocate / mediator</span>
                  <span className="mou-line" />
                  <small>Date</small>
                </div>
              </div>
              <p className="mou-disclaimer">{draft.disclaimer}</p>
            </div>
          </section>
          {confirmExport && (
            <Modal
              title="Export the MoU draft?"
              description="This creates a file on your device. Review it for personal information before sharing it with anyone."
              onClose={() => setConfirmExport(false)}
            >
              <p className="muted">
                {draft.agreed.length} agreed term(s) and{" "}
                {draft.unresolved.length} unresolved matter(s) will be exported
                with the offer history. The draft is not legal advice and is not
                sent to anyone.
              </p>
              <div className="modal-footer">
                <button
                  className="button secondary"
                  onClick={() => setConfirmExport(false)}
                >
                  Cancel
                </button>
                <button className="button primary" onClick={exportData}>
                  <Download size={16} />
                  Export draft
                </button>
              </div>
            </Modal>
          )}
        </>
      )}
    </>
  );
}
