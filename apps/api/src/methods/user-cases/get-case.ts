import { listUserCaseRows, findCaseCareData } from "../../services/user-cases.ts";
import type { ApplicationIntakeData } from "../../types/application-intake.ts";
import { listUserCases } from "./list-cases.ts";

export async function getUserCase(userId: string, id: string, kind: "case" | "draft", read: typeof listUserCaseRows = listUserCaseRows, readCare = findCaseCareData) {
  const rows = await read(userId, id);
  const data = await listUserCases(userId, async () => rows);
  const item = kind === "draft"
    ? data.drafts.find((item) => item.id === id) ?? null
    : data.cases.find((item) => item.id === id) ?? null;
  if (!item) return null;
  const care = kind === "draft" ? rows.drafts.find((draft) => draft.id === id)?.data : await readCare(userId, id);
  return { ...item, careOverview: _careOverview(care) };
}

function _careOverview(data?: ApplicationIntakeData) {
  if (!data) return [];
  // 僅輸出已保存的照顧需求白名單，不展開身分證、生日、地址或聯絡資料。
  const groups: Array<{ title: string; fields: Array<[string, unknown]> }> = [
    { title: "照顧情境", fields: [["服務縣市", data.jurisdiction], ["近期狀況", data.careContext?.recentEvent], ["希望獲得的協助", data.careContext?.goal]] },
    { title: "日常生活協助", fields: [["走動", data.careContext?.mobility], ["移位", data.intake?.transfers], ["洗澡", data.careContext?.bathing], ["吃飯", data.careContext?.eating], ["穿衣", data.intake?.dressing], ["如廁", data.careContext?.toileting]] },
    { title: "照顧支持與環境", fields: [["主要照顧者", data.careContext?.primaryCaregiver], ["白天照顧安排", data.careContext?.daytimeCaregiverAvailability], ["同住情形", data.intake?.livingArrangement], ["看護安排", data.intake?.hiredCaregiver], ["照顧者需要的支持", data.careContext?.caregiverBurden], ["居家環境", data.careContext?.environmentRisks], ["目前使用的服務", data.careContext?.currentServices]] },
  ];
  return groups.map(({ title, fields }) => ({ title, items: fields.map(([label, value]) => ({ label, value: typeof value === "string" && value.trim() ? value : null })) }));
}
