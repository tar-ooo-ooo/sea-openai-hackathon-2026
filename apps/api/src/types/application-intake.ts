import { z } from "zod";

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

export const applicationIntakeDataSchema = z.object({
  jurisdiction: z.string().optional(),
  applicantRole: z
    .enum(["SELF", "FAMILY_PROXY", "PROFESSIONAL_PROXY", "OTHER_PROXY"])
    .optional(),
  currentSituation: z.enum(["HOME", "HOSPITAL_DISCHARGE", "INSTITUTION", "OTHER"]).optional(),
  applicant: z.object({
    name: z.string().optional(),
    nationalId: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    relationship: z.string().optional(),
  }).optional(),
  recipient: z.object({
    name: z.string().optional(),
    nationalId: z.string().optional(),
    birthDate: z.string().optional(),
    currentAddress: z.string().optional(),
    registeredAddress: z.string().optional(),
  }).optional(),
  careContext: z.object({
    recentEvent: z.string().optional(),
    mobility: z.string().optional(),
    bathing: z.string().optional(),
    eating: z.string().optional(),
    toileting: z.string().optional(),
    daytimeCaregiverAvailability: z.string().optional(),
    primaryCaregiver: z.string().optional(),
    caregiverBurden: z.string().optional(),
    environmentRisks: z.string().optional(),
    currentServices: z.string().optional(),
    goal: z.string().optional(),
  }).optional(),
  intake: z.object({
    sex: z.string().optional(),
    language: z.string().optional(),
    livingArrangement: z.string().optional(),
    hiredCaregiver: z.string().optional(),
    hospitalizedRecently: z.string().optional(),
    transfers: z.string().optional(),
    dressing: z.string().optional(),
    requestedServices: z.array(z.enum(applicationServiceOptions)).max(7).optional(),
    referralSource: z.string().optional(),
  }).optional(),
  consent: z.object({
    privacyAccepted: z.boolean().optional(),
    proxyConfirmed: z.boolean().optional(),
  }).optional(),
  precheck: z.object({
    disability: z.boolean().optional(),
    dementia: z.boolean().optional(),
    indigenous: z.boolean().optional(),
    pac: z.boolean().optional(),
  }).optional(),
});

export type ApplicationIntakeData = z.infer<typeof applicationIntakeDataSchema>;

export type ApplicationFormReview = {
  prefillFields: string[];
};

export type ApplicationIntakeProgress = {
  status: "collecting" | "ready" | "packaged";
  missingFields: string[];
  applicationPackageId?: string;
  formReview?: ApplicationFormReview;
};
