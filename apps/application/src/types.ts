export type CaseStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "NEEDS_MORE_INFORMATION"
  | "ASSESSMENT_SCHEDULED"
  | "ASSESSMENT_COMPLETED"
  | "PROFESSIONAL_REVIEW"
  | "SERVICE_COORDINATION"
  | "ACTIVE"
  | "CLOSED"
  | "RETURNED";
export type DraftStage =
  | "DRAFT"
  | "ROUTED"
  | "PRECHECK_COMPLETE"
  | "WAITING_CONSENT"
  | "PROFILE_INCOMPLETE"
  | "READY_TO_REVIEW"
  | "READY_TO_SUBMIT";
export type GovernmentCommand =
  | "CASE_ACCEPTED"
  | "REQUEST_MORE_INFORMATION"
  | "SCHEDULE_ASSESSMENT"
  | "COMPLETE_ASSESSMENT"
  | "REQUIRE_PROFESSIONAL_REVIEW"
  | "COORDINATE_SERVICES"
  | "ACTIVATE_SERVICES"
  | "CLOSE_CASE"
  | "RETURN_APPLICATION";
export interface Applicant {
  name: string;
  nationalId: string;
  phone: string;
  email: string;
  relationship: string;
}
export interface Recipient {
  name: string;
  nationalId: string;
  birthDate: string;
  currentAddress: string;
  registeredAddress: string;
}
export interface CareContext {
  recentEvent: string;
  mobility: string;
  bathing: string;
  eating: string;
  toileting: string;
  daytimeCaregiverAvailability: string;
  primaryCaregiver: string;
  caregiverBurden: string;
  environmentRisks: string;
  currentServices: string;
  goal: string;
}
export interface Consent {
  privacyAccepted: boolean;
  proxyConfirmed: boolean;
  finalSubmissionApproved: boolean;
  approvedRevision: number | null;
}
/** Additional public-form fields; optional for compatibility with existing v1 drafts. */
export interface GovernmentIntake {
  sex: string;
  language: string;
  livingArrangement: string;
  hiredCaregiver: string;
  hospitalizedRecently: string;
  transfers: string;
  dressing: string;
  requestedServices: string[];
  referralSource: string;
}
export interface CaseEvent {
  id: string;
  type: string;
  label: string;
  detail: string;
  at: string;
}
export interface MissingItem {
  field: string;
  label: string;
  reason: string;
}
export interface SandboxCase {
  schemaVersion: 1;
  id: string;
  version: number;
  dataRevision: number;
  jurisdiction: string;
  applicantRole: string;
  currentSituation: string;
  applicant: Applicant;
  recipient: Recipient;
  careContext: CareContext;
  intake?: GovernmentIntake;
  consent: Consent;
  precheck: {
    status: "NOT_CHECKED" | "POTENTIALLY_ELIGIBLE" | "REQUIRES_REVIEW";
    notes: string;
    disability: boolean;
    dementia: boolean;
    indigenous: boolean;
    pac: boolean;
  };
  draftStage: DraftStage;
  application: {
    status: CaseStatus;
    submittedAt: string | null;
    missingFields: MissingItem[];
    amendment: Record<string, string>;
  };
  assessment: { scheduledAt: string | null; summary: string };
  timelineEvents: CaseEvent[];
  createdAt: string;
  updatedAt: string;
}
export interface CasePatch {
  jurisdiction?: string;
  applicantRole?: string;
  currentSituation?: string;
  applicant?: Partial<Applicant>;
  recipient?: Partial<Recipient>;
  careContext?: Partial<CareContext>;
  intake?: Partial<GovernmentIntake>;
  precheck?: Partial<SandboxCase["precheck"]>;
}
export interface CaseState {
  schemaVersion: 1;
  caseId: string;
  version: number;
  state: CaseStatus | DraftStage;
  missingFields: MissingItem[];
  allowedActions: string[];
  events: CaseEvent[];
}
export interface GovernmentPayload {
  field?: string;
  label?: string;
  reason?: string;
  scheduledAt?: string;
  summary?: string;
}
