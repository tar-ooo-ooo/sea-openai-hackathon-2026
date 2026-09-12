import type { ApplicationIntakeData, ApplicationServiceOption } from "../../types/application-intake.ts";

const _hasText = (value: unknown) => typeof value === "string" && value.trim().length > 0;
const _hasNationalId = (value: unknown) =>
  typeof value === "string" && /^[A-Z](?:[0-9]{9}|[A-Z][0-9]{8})$/.test(value.toUpperCase());
const _hasPhone = (value: unknown) =>
  typeof value === "string" && /^0\d{8,9}$/.test(value.replace(/[\s()-]/g, ""));
const _hasBirthDate = (value: unknown) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value) && date <= new Date();
};

const _requiredFields: Array<[string, (data: ApplicationIntakeData) => unknown]> = [
  ["服務縣市", (data) => _hasText(data.jurisdiction)],
  ["申請人身分", (data) => _hasText(data.applicantRole)],
  ["目前居住情境", (data) => _hasText(data.currentSituation)],
  ["申請人姓名", (data) => _hasText(data.applicant?.name)],
  ["有效的申請人身分證字號或居留證號", (data) => _hasNationalId(data.applicant?.nationalId)],
  ["有效的申請人聯絡電話", (data) => _hasPhone(data.applicant?.phone)],
  ["被照顧者姓名", (data) => _hasText(data.recipient?.name)],
  ["有效的被照顧者身分證字號或居留證號", (data) =>
    _hasNationalId(data.recipient?.nationalId)],
  ["有效的被照顧者出生日期（YYYY-MM-DD）", (data) =>
    _hasBirthDate(data.recipient?.birthDate)],
  ["被照顧者目前居住地址", (data) => _hasText(data.recipient?.currentAddress)],
  ["疾病及近期身體狀況", (data) => _hasText(data.careContext?.recentEvent)],
  ["走動協助需求", (data) => _hasText(data.careContext?.mobility)],
  ["洗澡協助需求", (data) => _hasText(data.careContext?.bathing)],
  ["吃飯協助需求", (data) => _hasText(data.careContext?.eating)],
  ["白天照顧情形", (data) => _hasText(data.careContext?.daytimeCaregiverAvailability)],
  ["主要照顧者", (data) => _hasText(data.careContext?.primaryCaregiver)],
  ["申請原因及希望協助事項", (data) => _hasText(data.careContext?.goal)],
  ["欲申請的長照服務", (data) => data.intake?.requestedServices?.length],
  ["資料使用同意", (data) => data.consent?.privacyAccepted],
];

export const optionalApplicationFields = [
  "申請人電子郵件",
  "被照顧者戶籍地址",
  "性別",
  "主要語言",
  "同住情形",
  "是否聘有看護",
  "近期是否住院",
  "移位情形",
  "穿衣情形",
  "如廁協助需求",
  "照顧者需協助事項",
  "居家環境補充說明",
  "目前使用的照顧服務或補助",
  "身心障礙／失智／原住民／PAC 資格自述",
  "得知服務的管道",
] as const;

export function getMissingApplicationFields(data: ApplicationIntakeData): string[] {
  const missingFields = _requiredFields
    .filter(([, read]) => !read(data))
    .map(([label]) => label);

  if (data.applicantRole && data.applicantRole !== "SELF" && !data.applicant?.relationship) {
    missingFields.push("申請人與被照顧者的關係");
  }
  if (data.applicantRole && data.applicantRole !== "SELF" && !data.consent?.proxyConfirmed) {
    missingFields.push("代理申請同意");
  }
  if (data.applicant?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.applicant.email)) {
    missingFields.push("有效的申請人電子郵件");
  }
  return missingFields;
}

export function getServiceCategory(name: ApplicationServiceOption) {
  if (name === "交通接送") return "交通接送服務" as const;
  if (name === "輔具服務" || name === "居家無障礙環境改善") {
    return "輔具及居家無障礙環境改善" as const;
  }
  if (name === "喘息服務") return "喘息服務" as const;
  return "照顧及專業服務" as const;
}
