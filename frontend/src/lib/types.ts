export type CaseRecord = {
  id: number;
  title: string;
  status: string;
  createdAt: string;
  legalRoute?: string;
  description?: string;
};
export type Proceeding = {
  id: number;
  caseId: number;
  courtName?: string;
  caseNumber?: string;
  proceedingType?: string;
  filedAt?: string;
  status: string;
};
export type Order = {
  id: number;
  proceedingId: number;
  orderType?: string;
  orderDate?: string;
  amount: number;
  description?: string;
  effectiveDate?: string;
  dueDay?: number;
  endDate?: string;
};
export type Payment = {
  id: number;
  orderId: number;
  amount: number;
  paymentDate: string;
  status: "RECEIVED" | "PENDING" | "FAILED";
  period?: string;
  reference?: string;
  notes?: string;
};
export type Hearing = {
  id: number;
  caseId: number;
  date: string;
  title: string;
  location: string;
};
export type DocumentRecord = {
  id: number;
  caseId: number;
  originalName: string;
  documentType: string;
  fileSize: number;
  createdAt: string;
  file?: File;
};
export type SourceRecord = {
  id: number;
  title: string;
  kind: "Legal source" | "Financial fact";
  url: string;
  section: string;
  reviewedOn: string;
  effectiveFrom: string;
  status: "Needs review" | "Reviewed";
  value: string;
  frequency: "Monthly" | "Annual" | "One-time" | "Not applicable";
  certainty: "Known" | "Estimated" | "Unknown";
};
export type SettlementOffer = {
  id: number;
  caseId: number;
  party: "applicant" | "respondent";
  date: string;
  channel:
    | "Working position"
    | "Lawyer communication"
    | "Mediation session"
    | "Court-facilitated";
  monthlyAmount: number | null;
  lumpSum: number | null;
  assetSplitPct: number | null;
  notes?: string;
};
export type ChecklistStatus = "agreed" | "disputed" | "pending";
export type SettlementTerm = {
  id: number;
  caseId: number;
  title: string;
  detail: string;
  status: ChecklistStatus;
};
export type Workspace = {
  cases: CaseRecord[];
  proceedings: Proceeding[];
  orders: Order[];
  payments: Payment[];
  hearings: Hearing[];
  documents: DocumentRecord[];
  sources: SourceRecord[];
  offers: SettlementOffer[];
  terms: SettlementTerm[];
};
export type LedgerRow = {
  orderId: number;
  period: string;
  dueDate: string;
  expected: number;
  received: number;
  outstanding: number;
  status: "Paid" | "Overdue" | "Partially paid" | "Upcoming";
  credit: number;
};
