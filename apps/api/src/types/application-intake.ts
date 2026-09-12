export const applicationServiceOptions = [
  "照顧服務",
  "專業服務／復能",
  "交通接送",
  "輔具服務",
  "居家無障礙環境改善",
  "喘息服務",
  "尚不確定，請協助評估",
] as const;

export type ApplicationServiceOption = (typeof applicationServiceOptions)[number];

export type ApplicationIntakeData = {
  jurisdiction?: string;
  applicantRole?: "SELF" | "FAMILY_PROXY" | "PROFESSIONAL_PROXY" | "OTHER_PROXY";
  currentSituation?: "HOME" | "HOSPITAL_DISCHARGE" | "INSTITUTION" | "OTHER";
  applicant?: {
    name?: string;
    nationalId?: string;
    phone?: string;
    email?: string;
    relationship?: string;
  };
  recipient?: {
    name?: string;
    nationalId?: string;
    birthDate?: string;
    currentAddress?: string;
    registeredAddress?: string;
  };
  careContext?: {
    recentEvent?: string;
    mobility?: string;
    bathing?: string;
    eating?: string;
    toileting?: string;
    daytimeCaregiverAvailability?: string;
    primaryCaregiver?: string;
    caregiverBurden?: string;
    environmentRisks?: string;
    currentServices?: string;
    goal?: string;
  };
  intake?: {
    sex?: string;
    language?: string;
    livingArrangement?: string;
    hiredCaregiver?: string;
    hospitalizedRecently?: string;
    transfers?: string;
    dressing?: string;
    requestedServices?: ApplicationServiceOption[];
    referralSource?: string;
  };
  consent?: {
    privacyAccepted?: boolean;
    proxyConfirmed?: boolean;
  };
  precheck?: {
    disability?: boolean;
    dementia?: boolean;
    indigenous?: boolean;
    pac?: boolean;
  };
};

export type ApplicationIntakeProgress = {
  status: "collecting" | "ready" | "packaged";
  missingFields: string[];
  applicationPackageId?: string;
};
