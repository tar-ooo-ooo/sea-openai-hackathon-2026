import { applicationIntakeDataSchema } from "../../types/application-intake.ts";
import type { AdminCaseDetail } from "../../types/admin-case.ts";

const _roleLabels: Record<string, string> = {
  SELF: "本人", FAMILY_PROXY: "家屬代申請", PROFESSIONAL_PROXY: "專業人員代申請", OTHER_PROXY: "其他代理人",
};
const _situationLabels: Record<string, string> = {
  HOME: "居家", HOSPITAL_DISCHARGE: "出院準備", INSTITUTION: "機構", OTHER: "其他",
};

export function formatApplicationSections(input: unknown): NonNullable<AdminCaseDetail["intake"]>["sections"] {
  const data = applicationIntakeDataSchema.parse(input);
  const sections: Array<{ title: string; fields: Array<[string, string | boolean | string[] | undefined]> }> = [
    { title: "申請概況", fields: [
      ["申請縣市／轄區", data.jurisdiction],
      ["申請人身分", data.applicantRole ? _roleLabels[data.applicantRole] : undefined],
      ["目前情境", data.currentSituation ? _situationLabels[data.currentSituation] : undefined],
    ] },
    { title: "申請人資料", fields: [
      ["姓名", data.applicant?.name], ["身分證字號", data.applicant?.nationalId],
      ["聯絡電話", data.applicant?.phone], ["電子信箱", data.applicant?.email], ["與被照顧者關係", data.applicant?.relationship],
    ] },
    { title: "被照顧者資料", fields: [
      ["姓名", data.recipient?.name], ["身分證字號", data.recipient?.nationalId],
      ["出生日期", data.recipient?.birthDate], ["現居地址", data.recipient?.currentAddress], ["戶籍地址", data.recipient?.registeredAddress],
    ] },
    { title: "照顧狀況與需求", fields: [
      ["近期事件", data.careContext?.recentEvent], ["行動能力", data.careContext?.mobility],
      ["洗澡", data.careContext?.bathing], ["進食", data.careContext?.eating], ["如廁", data.careContext?.toileting],
      ["白天照顧人力", data.careContext?.daytimeCaregiverAvailability], ["主要照顧者", data.careContext?.primaryCaregiver],
      ["照顧者負荷", data.careContext?.caregiverBurden], ["環境風險", data.careContext?.environmentRisks],
      ["目前使用服務", data.careContext?.currentServices], ["期待協助／目標", data.careContext?.goal],
    ] },
    { title: "申請補充資料", fields: [
      ["性別", data.intake?.sex], ["慣用語言", data.intake?.language], ["居住安排", data.intake?.livingArrangement],
      ["是否聘僱照顧者", data.intake?.hiredCaregiver], ["近期住院情況", data.intake?.hospitalizedRecently],
      ["移位能力", data.intake?.transfers], ["穿衣能力", data.intake?.dressing],
      ["希望申請的服務", data.intake?.requestedServices], ["轉介來源", data.intake?.referralSource],
    ] },
    { title: "資格預檢（民眾填寫，非專員認定）", fields: [
      ["身心障礙", data.precheck?.disability], ["失智症", data.precheck?.dementia],
      ["原住民身分", data.precheck?.indigenous], ["急性後期照護（PAC）", data.precheck?.pac],
    ] },
    { title: "同意事項（不代表正式送出）", fields: [
      ["個資告知與同意", data.consent?.privacyAccepted], ["代理申請確認", data.consent?.proxyConfirmed],
    ] },
  ];
  return sections.map(({ title, fields }) => ({
    title,
    fields: fields.map(([label, value]) => ({
      label,
      value: typeof value === "boolean" ? (value ? "是" : "否")
        : Array.isArray(value) ? (value.join("、") || "尚未提供")
          : value?.trim() || "尚未提供",
    })),
  }));
}
